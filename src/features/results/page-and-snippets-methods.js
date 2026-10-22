// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { logicalFileType } from "../../data/formats/file-types.js";
import { isDomHTMLElement, reconcileDomChildren } from "../../utils/dom.js";
import { cleanMarkdownForSnippet } from "../../utils/markdown-text.js";
import { buildSnippetWindow, matchReadableText } from "../../utils/search-text.js";
import { QueryState } from "../search/QueryState.js";
import { beginBrowseCardReuse } from "./browse-card-reuse.js";
// Instance method owner. `this` is the unchanged SearchResultRendererController instance. No additional state store.
export const SearchResultRendererController_page_and_snippets_methods = {


    renderCurrentView() {
        const core = this.owner;
        return core.performSearch(core.queryState.raw, true);
    },

    
    queueLazySnippetFill(fromIdx = 0, generation = this.owner?._resultGeneration) {
        const core = this.owner;
        if (core.resultControls.activeViewConfig().snippetLines === 0)
            return;
        // 无搜索词时摘要已经来自 fileMetaCache；禁止每次打开再并发读取首屏文件。
        if (!core.queryState.raw.trim()) return;
        void this._lazyFillSnippet(fromIdx, generation).catch(error => {
            if (!core._destroyed) {
                console.error("异步摘要回填失败", error);
            }
        });
    },

    
    async _lazyFillSnippet(fromIdx = 0, generation = this.owner?._resultGeneration) {
        const core = this.owner;
        if (core._destroyed)
            return;
        const pool = core._snippetIoPool;
        const tasks = [];
        const scheduledPaths = [];
        const updatedPaths = new Set();
        const targetKw = core.queryState.raw.trim();
        const targetQuery = new QueryState(targetKw);
        // 有搜索词时严格读取与 BodyIndex 相同的“净化后正文范围”，保证匹配 offset 一致。
        // 无搜索词时才使用独立的摘要读取上限。
        const readLimit = targetKw
            ? (core.plugin.settings.contentSegmentMaxLen || 8000)
            : (core.plugin.settings.snippetReadLimit || 5000);
        for (let i = fromIdx; i < core.renderedResults.length; i++) {
            const item = core.renderedResults[i];
            // 同一结果代内每个 path 最多读取一次正文；窗口来回平移不得重复触发 I/O。
            // performSearch/resetViewport 会在查询或筛选变化时清空 loadedPaths。
            if (core.loadedPaths.has(item.path)) continue;
            core.loadedPaths.add(item.path);
            this._snippetInFlight.set(item.path, generation);
            scheduledPaths.push(item.path);
            tasks.push(pool.run(async () => {
                if (core._destroyed
                    || generation !== core._resultGeneration
                    || core.queryState.raw.trim() !== targetKw) {
                    return;
                }
                let nextSnippet = "";
                let nextSnippetRanges = [];
                try {
                    if (logicalFileType(item) === "note" && item.file) {
                        const fullText = await core.plugin.getFileFullContent(item.file);
                        if (fullText) {
                            const readableText = cleanMarkdownForSnippet(fullText).slice(0, readLimit);
                            const snipLen = core.plugin.settings.snippetMaxLen || 200;
                            if (targetKw) {
                                const textMatch = item.bodyOnly && Array.isArray(item.bodyMatchRanges) && item.bodyMatchRanges.length
                                    ? { ranges: item.bodyMatchRanges }
                                    : matchReadableText(readableText.toLowerCase(), targetQuery);
                                const snippet = buildSnippetWindow(readableText, textMatch?.ranges || [], snipLen);
                                nextSnippet = snippet.text;
                                nextSnippetRanges = snippet.ranges;
                            }
                            else {
                                const snippet = buildSnippetWindow(readableText, [], snipLen);
                                nextSnippet = snippet.text;
                            }
                        }
                    }
                }
                catch (error) {
                    // 读取失败不能永久占用 loadedPaths，否则无查询预览后续不会重试。
                    if (!core._destroyed
                        && generation === core._resultGeneration
                        && core.queryState.raw.trim() === targetKw) {
                        core.loadedPaths.delete(item.path);
                    }
                    console.warn(`结果摘要读取失败：${item.path}`, error);
                    return;
                }
                // 文件读取可能跨越搜索切换或 SearchCore 销毁。
                // 先验证 generation，再允许写回共享 result/meta 对象。
                if (core._destroyed
                    || generation !== core._resultGeneration
                    || core.queryState.raw.trim() !== targetKw) {
                    return;
                }
                item.snippet = nextSnippet;
                item.snippetMatchRanges = nextSnippetRanges;
                updatedPaths.add(item.path);
            }));
        }
        if (!tasks.length) return;
        try {
            await Promise.all(tasks);
            if (core._destroyed
                || generation !== core._resultGeneration
                || core.queryState.raw.trim() !== targetKw
                || !core.resultsContainer?.isConnected) {
                return;
            }
            // 仅写回本代本批真正完成的路径；无关摘要不可重复触碰 DOM。
            for (let i = fromIdx; i < core.renderedResults.length; i++) {
                const row = core.renderedResults[i];
                if (updatedPaths.has(row.path)) this._updateSnippetInPlace(row);
            }
        } finally {
            // loadedPaths 在提交完成之前包含“已读但未绘制”的路径；
            // 维持 batch 在途所有权直到 DOM 提交完，避免增量索引恰好打断时漏绘。
            for (const path of scheduledPaths) {
                if (this._snippetInFlight.get(path) === generation) {
                    this._snippetInFlight.delete(path);
                }
            }
        }
        // 高度变化由 ResizeObserver 异步写入 HeightIndex；禁止在滚动链同步强制布局。
    },

    
    renderPage({
        targetPosition = null,
        preserveScrollTop = null,
        syncControls = true
    } = {}) {
        const core = this.owner;
        const list = core.resultsContainer;
        const rail = core.resultsRail;
        if (!isDomHTMLElement(list) || !isDomHTMLElement(rail)) return false;
        if (core._confirmSession?.kind === "rename-file" && !core._confirmSession.busy) {
            core._confirmSession.finish(false, { restoreFocus: false });
        }

        // One result commit: build all DOM offscreen before touching the visible
        // rail, observers or swipe ownership. A failed card must never blank the
        // old list (or destroy its measured heights and scroll anchor).
        const before = {
            children: [...rail.childNodes],
            resultEls: core.resultEls,
            renderedResults: core.renderedResults,
            selectedIndex: core.selectedIndex,
            windowStart: this.windowStart,
            windowEnd: this.windowEnd,
            beforeSpacer: this._beforeSpacer,
            afterSpacer: this._afterSpacer,
            scrollTop: list.scrollTop,
            height: {
                size: this._heightIndex.size,
                estimate: this._heightIndex.estimate,
                tree: this._heightIndex.tree,
                measured: this._heightIndex.measured,
                generation: this._heightIndexGeneration,
                geometryRevision: this._heightIndexGeometryRevision,
                viewKey: this._heightIndexViewKey
            }
        };
        const staging = rail.ownerDocument.createElement("div");
        let committed = false;
        let nextStart = 0, nextEnd = 0;
        let nextBeforeSpacer = null, nextAfterSpacer = null;
        let hasResults = false;
        let cardReuse = null;
        core._isRendering = true;
        try {
            // _buildResultItem pushes the staged cards into resultEls. Keep the
            // previous array intact for a precise rollback if a builder throws.
            core.resultEls = [];
            core.selectedIndex = -1;
            core.createFlow?.syncDerivedCreateViewState?.();
            cardReuse = beginBrowseCardReuse(this);
            if (core.createFlow?.isCreateView?.()) {
                core.createFlow.renderQuickCreatePreview(staging, core.createFlow.currentCreateTitle());
            } else {
                const total = this.visibleResultCount();
                if (!total) {
                    const emptyWrap = staging.createDiv({ cls: "local-search-empty", attr: {
                        role: "status", "aria-live": "polite"
                    } });
                    if (core.queryState.raw.trim()) {
                        emptyWrap.createEl("div", { text: `未找到「${core.queryState.raw}」`, cls: "local-search-empty-title" });
                        emptyWrap.createEl("div", { text: "当前会话仅用于查找和整理已有文件", cls: "local-search-empty-hint" });
                    } else if (core.filterState?.active) {
                        emptyWrap.createEl("div", { text: "筛选结果 · 0", cls: "local-search-empty-title" });
                        emptyWrap.createEl("div", { text: "没有符合当前筛选条件的文件", cls: "local-search-empty-hint" });
                    } else {
                        emptyWrap.createEl("div", { text: "输入关键词开始搜索", cls: "local-search-empty-title" });
                        emptyWrap.createEl("div", { text: `${core.plugin.fileMetaCache.size} 个文件已索引`, cls: "local-search-empty-hint" });
                    }
                } else {
                    const heightIndex = this._ensureHeightIndex(total);
                    const desiredPosition = Number.isFinite(targetPosition)
                        ? Number(targetPosition) : this.windowStart;
                    nextStart = this._windowStartForPosition(desiredPosition, total);
                    nextEnd = Math.min(total, nextStart + this._windowSize(total));
                    const beforeHeight = heightIndex.prefix(nextStart);
                    const afterHeight = Math.max(0, heightIndex.total() - heightIndex.prefix(nextEnd));
                    const fragment = rail.ownerDocument.createDocumentFragment();
                    nextBeforeSpacer = this._spacer(beforeHeight);
                    nextAfterSpacer = this._spacer(afterHeight, "is-after");
                    fragment.appendChild(nextBeforeSpacer);
                    this._appendPositionRange(fragment, nextStart, nextEnd, cardReuse);
                    fragment.appendChild(nextAfterSpacer);
                    staging.appendChild(fragment);
                    hasResults = true;
                }
            }

            // All builders succeeded. Commit the ordered node references once;
            // retained cards stay attached rather than travelling via staging.
            core.swipe?.resetForRender();
            this._rowResizeObserver?.disconnect();
            if (cardReuse) {
                // From here rollback must restore live nodes as well as new DOM.
                committed = true;
                cardReuse.commit();
            }
            const nextChildren = hasResults
                ? [nextBeforeSpacer, ...core.resultEls.map(item => item._lsSwipeShell), nextAfterSpacer]
                : [...staging.childNodes];
            committed = true;
            reconcileDomChildren(rail, nextChildren);
            this.windowStart = nextStart;
            this.windowEnd = nextEnd;
            this._beforeSpacer = nextBeforeSpacer;
            this._afterSpacer = nextAfterSpacer;
            if (hasResults) {
                for (const shell of rail.querySelectorAll(":scope > .local-search-swipe-shell")) {
                    this._observeShell(shell, Number.parseInt(shell.dataset.virtualPosition || "", 10));
                }
                this._syncMountedState();
                if (Number.isFinite(preserveScrollTop)) {
                    this._setScrollTop(Number(preserveScrollTop));
                } else if (Number.isFinite(targetPosition) && nextStart > 0) {
                    this._setScrollTop(this._viewportPadTop + this._heightIndex.prefix(nextStart));
                }
            } else {
                core.renderedResults = [];
                // The preview only updates its live controls when connected;
                // staging cannot be used as a second, hidden DOM owner.
                rail.querySelector(".local-search-quick-create-preview")?._lsRefreshMetadata?.();
            }
            if (syncControls) core.selection.syncControls();
            if (hasResults) this.queueLazySnippetFill(0, core._resultGeneration);
            cardReuse?.finish();
        } catch (error) {
            cardReuse?.rollback();
            // Roll back even after a post-commit UI/observer exception. An
            // unsuccessful update retains exactly the old visible children.
            if (committed) {
                this._rowResizeObserver?.disconnect();
                reconcileDomChildren(rail, before.children);
                for (const shell of rail.querySelectorAll(":scope > .local-search-swipe-shell")) {
                    this._observeShell(shell, Number.parseInt(shell.dataset.virtualPosition || "", 10));
                }
                list.scrollTop = before.scrollTop;
            }
            core.resultEls = before.resultEls;
            core.renderedResults = before.renderedResults;
            core.selectedIndex = before.selectedIndex;
            this.windowStart = before.windowStart;
            this.windowEnd = before.windowEnd;
            this._beforeSpacer = before.beforeSpacer;
            this._afterSpacer = before.afterSpacer;
            Object.assign(this._heightIndex, {
                size: before.height.size,
                estimate: before.height.estimate,
                tree: before.height.tree,
                measured: before.height.measured
            });
            this._heightIndexGeneration = before.height.generation;
            this._heightIndexGeometryRevision = before.height.geometryRevision;
            this._heightIndexViewKey = before.height.viewKey;
            console.error("结果页面构建失败，已保留上次完整画面", error);
            throw error;
        } finally {
            core._isRendering = false;
        }

    },
};

