// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { logicalFileType } from "../../data/formats/file-types.js";
import { isDomHTMLElement } from "../../utils/dom.js";
import { cleanMarkdownForSnippet } from "../../utils/markdown-text.js";
import { buildSnippetWindow, matchReadableText } from "../../utils/search-text.js";
import { QueryState } from "../search/QueryState.js";
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
            }));
        }
        await Promise.all(tasks);
        if (core._destroyed
            || generation !== core._resultGeneration
            || core.queryState.raw.trim() !== targetKw
            || !core.resultsContainer?.isConnected) {
            return;
        }
        for (let i = fromIdx; i < core.renderedResults.length; i++) {
            this._updateSnippetInPlace(core.renderedResults[i]);
        }
        // 高度变化由 ResizeObserver 异步写入 HeightIndex；禁止在滚动链同步强制布局。
    },

    
    renderPage({
        targetPosition = null,
        preserveScrollTop = null,
        syncControls = true
    } = {}) {
        const core = this.owner;
        if (core._confirmSession?.kind === "rename-file" && !core._confirmSession.busy) {
            core._confirmSession.finish(false, { restoreFocus: false });
        }
        core._isRendering = true;
        try {
            core.swipe?.resetForRender();
            const list = core.resultsContainer;
            const rail = core.resultsRail;
            if (!isDomHTMLElement(list) || !isDomHTMLElement(rail)) return false;
            this._rowResizeObserver?.disconnect();
            this._beforeSpacer = null;
            this._afterSpacer = null;
            rail.empty();
            core.resultEls = [];
            core.selectedIndex = -1;

            // Dida Master：搜索 0 命中是 Search State 派生出的 Create View，
            // 不先经过“未找到 → 新建”中间态，也不切换 inputMode。
            core.createFlow?.syncDerivedCreateViewState?.();
            if (core.createFlow?.isCreateView?.()) {
                this.windowStart = 0;
                this.windowEnd = 0;
                core.renderedResults = [];
                core.createFlow.renderQuickCreatePreview(
                    rail,
                    core.createFlow.currentCreateTitle()
                );
                if (syncControls) core.selection.syncControls();
                return;
            }

            const total = this.visibleResultCount();
            if (!total) {
                this.windowStart = 0;
                this.windowEnd = 0;
                core.renderedResults = [];
                const emptyWrap = rail.ownerDocument.createElement("div");
                emptyWrap.className = "local-search-empty";
                emptyWrap.setAttribute("role", "status");
                emptyWrap.setAttribute("aria-live", "polite");
                if (core.queryState.raw.trim()) {
                    emptyWrap.createEl("div", {
                        text: `未找到「${core.queryState.raw}」`,
                        cls: "local-search-empty-title"
                    });
                    emptyWrap.createEl("div", {
                        text: "当前会话仅用于查找和整理已有文件",
                        cls: "local-search-empty-hint"
                    });
                } else if (core.filterState?.active) {
                    emptyWrap.createEl("div", { text: "筛选结果 · 0", cls: "local-search-empty-title" });
                    emptyWrap.createEl("div", { text: "没有符合当前筛选条件的文件", cls: "local-search-empty-hint" });
                } else {
                    emptyWrap.createEl("div", { text: "输入关键词开始搜索", cls: "local-search-empty-title" });
                    emptyWrap.createEl("div", { text: `${core.plugin.fileMetaCache.size} 个文件已索引`, cls: "local-search-empty-hint" });
                }
                rail.appendChild(emptyWrap);
                if (syncControls) core.selection.syncControls();
                return;
            }

            const heightIndex = this._ensureHeightIndex(total);
            const desiredPosition = Number.isFinite(targetPosition)
                ? Number(targetPosition)
                : this.windowStart;
            const start = this._windowStartForPosition(desiredPosition, total);
            const end = Math.min(total, start + this._windowSize(total));
            this.windowStart = start;
            this.windowEnd = end;

            const beforeHeight = heightIndex.prefix(start);
            const afterHeight = Math.max(0, heightIndex.total() - heightIndex.prefix(end));
            const frag = rail.ownerDocument.createDocumentFragment();
            this._beforeSpacer = this._spacer(beforeHeight);
            this._afterSpacer = this._spacer(afterHeight, "is-after");
            frag.appendChild(this._beforeSpacer);
            this._appendPositionRange(frag, start, end);
            frag.appendChild(this._afterSpacer);
            rail.appendChild(frag);

            this._syncMountedState();
            if (Number.isFinite(preserveScrollTop)) {
                this._setScrollTop(Number(preserveScrollTop));
            } else if (Number.isFinite(targetPosition) && start > 0) {
                this._setScrollTop(this._viewportPadTop + beforeHeight);
            }
            if (syncControls) core.selection.syncControls();
            this.queueLazySnippetFill(0, core._resultGeneration);
        } finally {
            core._isRendering = false;
        }
    },
};

