// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeModalViewportAnchor } from "../../core/session-values.js";
import { hostDocument, hostWindow, isDomHTMLElement } from "../../utils/dom.js";
import { RESULT_WINDOW_BUFFER_MIN, RESULT_WINDOW_MOUNT_MAX, RESULT_WINDOW_MOUNT_MIN } from "./virtualization-config.js";
// Instance method owner. `this` is the unchanged SearchResultRendererController instance. No additional state store.
export const SearchResultRendererController_virtual_window_methods = {


    renderInitialPage(anchor, { syncControls = true } = {}) {
        const normalized = normalizeModalViewportAnchor(anchor);
        if (normalized && this.owner?.navigator?.main.hidden) this.owner.navigator.resultAnchor = normalized;
        if (!normalized) {
            this.renderPage({ syncControls });
            return false;
        }

        const prepared = this.prepareViewportAnchor(normalized);
        if (prepared?.position >= 0) {
            // 直接首挂目标附近窗口，再用真实 DOM 对齐同一张锚点卡；不再先渲染顶部再二次重建。
            this.renderPage({
                targetPosition: prepared.position,
                syncControls
            });
            // DOM alignment already restores the real card offset. The first RO
            // must reuse that semantic anchor, not infer a second position from
            // the still-estimated HeightIndex and compensate the scroll twice.
            this._pendingViewportMeasurement = { ...prepared, generation: this.owner._resultGeneration };
            this.restoreViewportAnchor(prepared);
            return true;
        }

        const scrollTop = Math.max(0, Number(normalized.scrollTop) || 0);
        if (scrollTop > 0) {
            const index = this._ensureHeightIndex();
            this.renderPage({
                targetPosition: Math.max(
                    0,
                    index.positionAt(Math.max(0, scrollTop - this._viewportPadTop))
                ),
                preserveScrollTop: scrollTop,
                syncControls
            });
            return true;
        }

        this.renderPage({ syncControls });
        return false;
    },


    _usesChannels() {
        // 相关性独占“标题 / 正文”频道。时间 / 名称排序必须让所有命中的文件
        // 进入同一全局序列，否则频道切分会永久遮蔽较新的正文匹配结果。
        return Boolean(this.owner.queryState?.active && this.owner.sortField === "relevance");
    },


    visibleResultCount() {
        const core = this.owner;
        if (!this._usesChannels()) return core.fullResults.length;
        const bestCount = core.bestResultCount || 0;
        const bodyCount = core.bodyResultCount || 0;
        return core.bodyExpanded ? bodyCount : bestCount;
    },


    getVisibleResultIndices() {
        const total = this.visibleResultCount();
        const indices = [];
        for (let position = 0; position < total; position++) {
            const actualIndex = this._actualIndexAtDisplayPosition(position);
            if (actualIndex >= 0) indices.push(actualIndex);
        }
        return indices;
    },


    resetViewport() {
        this._pendingViewportMeasurement = null;
        if (this.owner?.navigator) this.owner.navigator.resultAnchor = { scrollTop: 0 };
        const core = this.owner;
        this.windowStart = 0;
        this.windowEnd = 0;
        core.loadedPaths.clear();
        const list = core.resultsContainer;
        if (this._scrollSettleTimer !== null && isDomHTMLElement(list)) {
            hostWindow(list).clearTimeout(this._scrollSettleTimer);
        }
        this._scrollSettleTimer = null;
        this._scrollTouch = null;
        this._scrollOffset = 0;
        const pendingGeometry = this._pendingGeometryRefresh;
        this._pendingGeometryRefresh = null;
        // 显式查询 / 频道切换本来就会立即重建结果；若此前原生滚动暂缓了样式几何，
        // 在这次正式重建前直接吸收 generation / estimate 失效，不再额外排一次延迟重绘。
        if (pendingGeometry) this.invalidateGeometry(pendingGeometry);
        if (list) this._setScrollTop(0);
    },


    _windowSize(total = this.visibleResultCount()) {
        const count = Math.max(0, Number(total) || 0);
        if (!count) return 0;

        const list = this.owner?.resultsContainer;
        const viewportHeight = Math.max(0, Number(list?.clientHeight) || this._viewportHeight || 0);
        const estimate = Math.max(44, Number(this._heightIndex?.estimate) || this._syncRowEstimate());
        // 使用完整 scrollport 高度做保守覆盖；顶部 padding 只参与坐标换算，
        // 不缩小挂载窗口，避免高窗口 / 精简视图出现可见区 DOM 不足。
        const visibleRows = viewportHeight > 0
            ? Math.max(1, Math.ceil(viewportHeight / estimate) + 1)
            : RESULT_WINDOW_MOUNT_MIN;
        // The same viewport-driven budget applies to every input/host. Buffer
        // depends on actual visible rows, never a desktop/mobile business fork.
        const bufferRows = Math.max(Math.ceil(RESULT_WINDOW_BUFFER_MIN / 2), Math.ceil(visibleRows / 2));
        const desired = visibleRows + bufferRows * 2;
        const bounded = Math.max(
            RESULT_WINDOW_MOUNT_MIN,
            Math.min(RESULT_WINDOW_MOUNT_MAX, desired)
        );
        // MAX 只限制额外预挂载；极端高视口自身若已超过 MAX，
        // 仍必须至少覆盖估算出的全部可见行，不能让 spacer 进入 viewport。
        return Math.min(count, Math.max(visibleRows, bounded));
    },


    _windowStartForPosition(position, total) {
        const size = this._windowSize(total);
        if (!size) return 0;
        const pos = Math.max(0, Math.min(Math.max(0, total - 1), Number(position) || 0));
        const leading = Math.max(2, Math.floor(size / 3));
        return Math.max(0, Math.min(Math.max(0, total - size), Math.floor(pos) - leading));
    },


    _windowRangeForViewport(firstVisible, lastVisible, total) {
        const count = Math.max(0, Number(total) || 0);
        if (!count) return { start: 0, end: 0, size: 0 };

        const first = Math.max(0, Math.min(count - 1, Number(firstVisible) || 0));
        const last = Math.max(first, Math.min(count - 1, Number(lastVisible) || first));
        const visibleSpan = last - first + 1;
        // 正确性优先：安全上限只限制额外 buffer；如果极端视口本身超过上限，
        // 仍必须挂满整个可见区，绝不允许 spacer 暴露在 viewport 内。
        const size = Math.min(
            count,
            Math.max(visibleSpan, this._windowSize(count))
        );
        const slack = Math.max(0, size - visibleSpan);
        let start = first - Math.floor(slack / 2);
        start = Math.max(0, Math.min(Math.max(0, count - size), start));
        return { start, end: Math.min(count, start + size), size };
    },


    _spacer(height, cls = "") {
        const spacer = hostDocument(this.owner?.resultsRail).createElement("div");
        spacer.className = ["local-search-result-spacer", cls].filter(Boolean).join(" ");
        spacer.setAttribute("aria-hidden", "true");
        spacer.style.height = `${Math.max(0, Math.round(height))}px`;
        return spacer;
    },


    _mountedShells() {
        const rail = this.owner?.resultsRail;
        if (!isDomHTMLElement(rail)) return [];
        return [...rail.children].filter(
            child => isDomHTMLElement(child)
                && child.classList.contains("local-search-swipe-shell")
        );
    },


    refreshActionShelfLayout(anchor) {
        // Bulk shelf toggles change height, not row identity. Retain mounted cards and the existing scroll anchor.
        const index = this._ensureHeightIndex();
        this._syncSpacerHeights(index.size);
        this._restoreGeometryAnchor(anchor, index);
        this._syncSpacerHeights(index.size);
        this._syncWindowToViewport(this.owner?.resultsContainer);
    },


    _syncMountedState() {
        const core = this.owner;
        if (!core) return;
        const shells = this._mountedShells();
        core.resultEls = shells
            .map(shell => shell.querySelector(":scope > .local-search-item"))
            .filter(item => isDomHTMLElement(item));
        core.renderedResults = [];
        for (const shell of shells) {
            shell._lsResultBinding?.syncAllExpanded();
            const position = Number.parseInt(shell.dataset.virtualPosition || "", 10);
            const actualIndex = this._actualIndexAtDisplayPosition(position);
            if (actualIndex >= 0) core.renderedResults.push(core.fullResults[actualIndex]);
        }
        core.selectedIndex = core.resultEls.findIndex(
            item => item.classList.contains("is-current")
        );
    },


    _syncSpacerHeights(total = this.visibleResultCount()) {
        if (!isDomHTMLElement(this._beforeSpacer)
            || !isDomHTMLElement(this._afterSpacer)) return;
        const index = this._ensureHeightIndex(total);
        const before = index.prefix(this.windowStart) - this._scrollOffset;
        const after = Math.max(0, index.total() - index.prefix(this.windowEnd));
        this._beforeSpacer.style.marginTop = `${Math.min(0, Math.round(before))}px`;
        this._beforeSpacer.style.height = `${Math.max(0, Math.round(before))}px`;
        this._afterSpacer.style.height = `${Math.max(0, Math.round(after))}px`;
    },


    _shiftWindowRange(start, end, total = this.visibleResultCount()) {
        const core = this.owner;
        const list = core?.resultsContainer;
        const rail = core?.resultsRail;
        if (!isDomHTMLElement(list) || !isDomHTMLElement(rail) || !total) return false;
        if (!isDomHTMLElement(this._beforeSpacer)
            || !isDomHTMLElement(this._afterSpacer)
            || !this._beforeSpacer.isConnected
            || !this._afterSpacer.isConnected) return false;

        const oldStart = this.windowStart;
        const oldEnd = this.windowEnd;
        const newStart = Math.max(0, Math.min(total - 1, Math.floor(Number(start) || 0)));
        const newEnd = Math.max(
            newStart + 1,
            Math.min(total, Math.floor(Number(end) || total))
        );
        if (newStart === oldStart && newEnd === oldEnd) return false;

        const openWrapper = core.swipe?.openWrapper;
        if (isDomHTMLElement(openWrapper)) {
            const openPosition = Number.parseInt(openWrapper.dataset.virtualPosition || "", 10);
            if (!Number.isInteger(openPosition)
                || openPosition < newStart
                || openPosition >= newEnd) {
                core.swipe.closeAll({ immediate: true });
                // 即将卸载的 Swipe 行不会再等到下一轮 ResizeObserver。
                // closeAll(immediate) 后低频读取一次正常 border-box，防止 HeightIndex 留下展开高度。
                if (Number.isInteger(openPosition) && openPosition >= 0 && openPosition < total) {
                    const normalHeight = openWrapper.getBoundingClientRect().height;
                    if (normalHeight > 0) {
                        this._ensureHeightIndex(total).set(openPosition, normalHeight);
                    }
                }
            }
        }

        const overlap = newStart < oldEnd && newEnd > oldStart;
        // Prebuild the entire incoming window before removing any mounted row.
        // Virtual scrolling must have the same failure safety as renderPage:
        // a thrown card builder must not expose a spacer or the note beneath.
        const previousItems = core.resultEls;
        core.resultEls = [];
        const prepare = (from, to) => {
            const frag = rail.ownerDocument.createDocumentFragment();
            this._appendPositionRange(frag, from, to);
            return frag;
        };
        let full = null, leading = null, trailing = null;
        try {
            if (!overlap) full = prepare(newStart, newEnd);
            else {
                if (newStart < oldStart) {
                    const addEnd = Math.min(oldStart, newEnd);
                    if (newStart < addEnd) leading = prepare(newStart, addEnd);
                }
                if (newEnd > oldEnd) {
                    const addStart = Math.max(oldEnd, newStart);
                    if (addStart < newEnd) trailing = prepare(addStart, newEnd);
                }
            }
        } catch (error) {
            core.resultEls = previousItems;
            // A subsequent scroll event may retry; do not add a timer or
            // clear any existing result DOM to recover from this failure.
            console.error('虚拟窗口补充卡片失败，已保留原列表', error);
            return false;
        }

        if (!overlap) {
            for (const shell of this._mountedShells()) {
                this._unobserveShell(shell);
                shell.remove();
            }
            rail.insertBefore(full, this._afterSpacer);
        } else {
            for (const shell of this._mountedShells()) {
                const position = Number.parseInt(shell.dataset.virtualPosition || '', 10);
                if (Number.isInteger(position)
                    && (position < newStart || position >= newEnd)) {
                    this._unobserveShell(shell);
                    shell.remove();
                }
            }
            if (leading) rail.insertBefore(leading, this._mountedShells()[0] || this._afterSpacer);
            if (trailing) rail.insertBefore(trailing, this._afterSpacer);
        }

        this.windowStart = newStart;
        this.windowEnd = newEnd;
        for (const item of core.resultEls) {
            const shell = item._lsSwipeShell;
            this._observeShell(shell, Number.parseInt(shell.dataset.virtualPosition, 10));
        }
        this._syncSpacerHeights(total);
        this._syncMountedState();
        this.queueLazySnippetFill(0, core._resultGeneration);
        return true;
    },


    _syncWindowToViewport(container = this.owner?.resultsContainer) {
        const core = this.owner;
        if (
            !core
            || core._destroyed
            || core._isRendering
            || !isDomHTMLElement(container)
            || !container.isConnected
            || core.navigator?.main?.hidden
            || container.clientHeight <= 0
            || container.clientWidth <= 0
        ) return false;

        const total = this.visibleResultCount();
        if (!total || this.windowEnd <= this.windowStart) return false;

        const heightIndex = this._ensureHeightIndex(total);
        const scrollTop = Math.max(0, (Number(container.scrollTop) || 0) + this._scrollOffset);
        const viewportHeight = Math.max(0, Number(container.clientHeight) || 0);
        const top = Math.max(0, scrollTop - this._viewportPadTop);
        const bottom = Math.max(
            top,
            scrollTop + Math.max(0, viewportHeight - 1) - this._viewportPadTop
        );
        const firstVisible = Math.max(0, heightIndex.positionAt(top));
        const lastVisible = Math.max(firstVisible, heightIndex.positionAt(bottom));
        const desired = this._windowRangeForViewport(
            firstVisible,
            lastVisible,
            total
        );
        if (!desired.size) return false;

        const currentSize = this.windowEnd - this.windowStart;
        const visibleSpan = lastVisible - firstVisible + 1;
        const spare = Math.max(0, desired.size - visibleSpan);
        const edgeBuffer = Math.max(2, Math.floor(spare / 4));
        const coversVisible = firstVisible >= this.windowStart
            && lastVisible < this.windowEnd;
        const hasLeadingBuffer = this.windowStart === 0
            || firstVisible - this.windowStart >= edgeBuffer;
        const hasTrailingBuffer = this.windowEnd === total
            || (this.windowEnd - 1) - lastVisible >= edgeBuffer;

        if (
            currentSize === desired.size
            && coversVisible
            && hasLeadingBuffer
            && hasTrailingBuffer
        ) return false;

        return this._shiftWindowRange(
            desired.start,
            desired.end,
            total
        );
    },


    handleScrollLoad(scrollContainer = this.owner?.resultsContainer) {
        const core = this.owner;
        if (!core || core._destroyed || core._isRendering || core.navigator?.main?.hidden) return;
        const container = scrollContainer || core.resultsContainer;
        if (!container?.isConnected || container.clientHeight <= 0 || container.clientWidth <= 0) return;
        const reveal = this._swipeReveal;
        if (reveal && !reveal.yielded) {
            const expected = Math.min(reveal.last, Math.max(0, container.scrollHeight - container.clientHeight));
            if (Math.abs(container.scrollTop - expected) > 1.5) this.yieldSwipeReveal();
        }

        // render / restore 写入的 scrollTop 只负责定位，不进入用户滚动热路径。
        if (this._programmaticScrollTop !== null) {
            const expected = this._programmaticScrollTop;
            this._programmaticScrollTop = null;
            if (Math.abs(container.scrollTop - expected) <= 1.5) return;
        }

        this._markNativeScroll();
        if (this._scrollFrame) return;
        this._scrollFrame = hostWindow(container).requestAnimationFrame(() => {
            this._scrollFrame = 0;
            this._syncWindowToViewport(container);
        });
    },


    _appendPositionRange(frag, start, end, reuse = null) {
        for (let position = start; position < end; position++) {
            const actualIndex = this._actualIndexAtDisplayPosition(position);
            if (actualIndex < 0) continue;
            if (reuse) reuse.appendItem(actualIndex, frag, position);
            else this._buildResultItem(actualIndex, frag, position);
        }
    },


    refreshChangedRows(paths) {
        const core = this.owner, list = core.resultsContainer;
        // The order is unchanged: each mounted shell already knows its display
        // position. Resolve the current row from that position instead of
        // allocating a Map for *every* result on a one-file background edit.
        // Invalid/stale positions retain the original path-lookup semantics.
        const mounted = new Map();
        let fallback = null;
        const resolve = (path, position) => {
            const index = this._actualIndexAtDisplayPosition(position);
            if (index >= 0 && core.fullResults[index]?.path === path) {
                return { row: core.fullResults[index], index };
            }
            // Exceptional stale/invalid positions use the previous full-path
            // lookup only once, rather than doing one full scan per mounted row.
            fallback ||= new Map(core.fullResults.map((row, index) => [row.path, { row, index }]));
            return fallback.get(path) || null;
        };
        // 排列未变，保留已测量几何；内容变化由同一个 border-box Observer 修正。
        this._heightIndexGeneration = core._resultGeneration;
        for (const item of [...list.querySelectorAll(".local-search-item[data-path]")]) {
            const path = item.dataset.path;
            const oldShell = item.closest(".local-search-swipe-shell");
            if (!oldShell) continue;
            const position = Number.parseInt(oldShell.dataset.virtualPosition, 10);
            const current = resolve(path, position);
            if (!current) continue;
            mounted.set(path, current.row);
            if (paths && !paths.has(path)) continue;
            const slot = core.resultEls.indexOf(item);
            const fragment = list.ownerDocument.createDocumentFragment();
            const replacement = this._buildResultItem(current.index, fragment, position);
            core.resultEls.pop();
            if (slot >= 0) core.resultEls[slot] = replacement;
            this._unobserveShell(oldShell);
            oldShell.replaceWith(replacement._lsSwipeShell);
            this._observeShell(replacement._lsSwipeShell, position);
            replacement._lsSwipeShell._lsResultBinding?.syncAllExpanded();
        }
        core.renderedResults = core.renderedResults.map(row => mounted.get(row.path)
            || resolve(row.path, -1)?.row || row);
        this.queueLazySnippetFill(0, core._resultGeneration);
        core.selection.syncControls();
    },
};

