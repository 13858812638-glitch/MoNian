// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeModalViewportAnchor } from "../../core/session-values.js";
import { hostWindow, isDomHTMLElement } from "../../utils/dom.js";
import { RESULT_ROW_HEIGHT_ESTIMATE } from "./virtualization-config.js";
// Instance method owner. `this` is the unchanged SearchResultRendererController instance. No additional state store.
export const SearchResultRendererController_viewport_anchors_methods = {



    captureViewportAnchor(preferredPaths = null, excludedPaths = null) {
        const core = this.owner;
        const hiddenAnchor = core?.navigator?.hiddenResultAnchor();
        if (hiddenAnchor) return hiddenAnchor;
        const list = core?.resultsContainer;
        const scrollTop = Math.max(0, this.getScrollTop() + this._scrollOffset);
        if (!isDomHTMLElement(list) || !list.isConnected) {
            return normalizeModalViewportAnchor({ scrollTop });
        }

        const total = this.visibleResultCount();
        if (!total) return normalizeModalViewportAnchor({ scrollTop });

        const preferred = preferredPaths instanceof Set
            ? preferredPaths
            : new Set(Array.isArray(preferredPaths) ? preferredPaths : []);
        const excluded = excludedPaths instanceof Set
            ? excludedPaths
            : new Set(Array.isArray(excludedPaths) ? excludedPaths : []);
        const index = this._ensureHeightIndex(total);
        const contentScrollTop = Math.max(0, scrollTop - this._viewportPadTop);
        const viewportHeight = Math.max(
            1,
            Number(list.clientHeight) || Number(this._viewportHeight) || 1
        );

        // Session 锚点统一由 HeightIndex 计算：普通关闭、点击结果时排除当前项、
        // 数据刷新时 preferredPaths 都不读取 DOM 布局。真实 DOM 采样只保留给
        // 几何变化校准，因为那一类路径需要捕获 Resize / CSS 变化后的真实偏移。
        let firstPosition = Math.max(0, index.positionAt(contentScrollTop));
        if (this.windowEnd > this.windowStart) {
            firstPosition = Math.max(
                this.windowStart,
                Math.min(this.windowEnd - 1, firstPosition)
            );
        }
        const visibleBottom = Math.max(
            contentScrollTop,
            contentScrollTop + viewportHeight - 1
        );
        let lastPosition = Math.max(
            firstPosition,
            index.positionAt(visibleBottom)
        );
        if (this.windowEnd > this.windowStart) {
            lastPosition = Math.min(this.windowEnd - 1, lastPosition);
        }
        lastPosition = Math.max(
            firstPosition,
            Math.min(total - 1, lastPosition)
        );

        const visible = [];
        for (let position = firstPosition; position <= lastPosition; position++) {
            const actualIndex = this._actualIndexAtDisplayPosition(position);
            const path = core.fullResults[actualIndex]?.path || "";
            if (!path) continue;
            visible.push({
                path,
                offset: this._viewportPadTop + index.prefix(position) - scrollTop
            });
        }

        if (!visible.length) {
            return normalizeModalViewportAnchor({ scrollTop });
        }

        const eligible = visible.filter(entry => !excluded.has(entry.path));
        const primary = eligible.find(entry => preferred.has(entry.path))
            || eligible[0]
            || visible[0];
        const fallback = eligible.find(entry => entry.path !== primary.path)
            || visible.find(entry => entry.path !== primary.path)
            || primary;

        return normalizeModalViewportAnchor({
            path: primary.path,
            offset: primary.offset,
            fallbackPath: fallback.path,
            fallbackOffset: fallback.offset,
            scrollTop
        });
    },


    _displayPositionForActualIndex(actualIndex) {
        const core = this.owner;
        if (!Number.isInteger(actualIndex) || actualIndex < 0) return -1;
        if (!this._usesChannels()) return actualIndex < core.fullResults.length ? actualIndex : -1;
        const bestCount = core.bestResultCount || 0;
        const bodyCount = core.bodyResultCount || 0;
        // 频道互斥：正文选中时，仅将正文结果映射到可视索引。
        if (core.bodyExpanded) return actualIndex >= bestCount && actualIndex < bestCount + bodyCount
            ? actualIndex - bestCount : -1;
        return actualIndex < bestCount ? actualIndex : -1;
    },


    _actualIndexAtDisplayPosition(position) {
        const core = this.owner;
        const pos = Number(position);
        if (!Number.isInteger(pos) || pos < 0) return -1;
        if (!this._usesChannels()) return pos < core.fullResults.length ? pos : -1;
        const bestCount = core.bestResultCount || 0;
        const bodyCount = core.bodyResultCount || 0;
        if (core.bodyExpanded) return pos < bodyCount ? bestCount + pos : -1;
        return pos < bestCount ? pos : -1;
    },


    _displayPositionForPath(path) {
        if (!path) return -1;
        const core = this.owner;
        const actualIndex = core.fullResults.findIndex(row => row?.path === path);
        return this._displayPositionForActualIndex(actualIndex);
    },


    _rowEstimateCacheKey(viewId = null) {
        const surface = this.owner?.hostKind || "window";
        const view = String(
            viewId || this.owner?.resultControls?.activeViewId?.() || "standard"
        );
        return `${surface}:${view}${this.owner?.swipe?.allExpanded ? ":actions" : ""}`;
    },


    _syncRowEstimate() {
        const core = this.owner;
        const key = this._rowEstimateCacheKey();
        const cached = Number(core?.plugin?._resultRowHeightByView?.get?.(key));
        if (Number.isFinite(cached) && cached > 0) return cached;
        if (core?.swipe?.allExpanded) {
            const base = Number(core.plugin?._resultRowHeightByView?.get?.(key.replace(/:actions$/, ""))) || RESULT_ROW_HEIGHT_ESTIMATE;
            const style = hostWindow(core.containerEl).getComputedStyle(core.containerEl);
            return base + (parseFloat(style.getPropertyValue("--ls-swipe-action-height")) || 0)
                + (parseFloat(style.getPropertyValue("--ls-swipe-shelf-gap")) || 0);
        }
        return RESULT_ROW_HEIGHT_ESTIMATE;
    },


    _ensureHeightIndex(total = this.visibleResultCount()) {
        const core = this.owner;
        const size = Math.max(0, Number(total) || 0);
        const viewKey = this._rowEstimateCacheKey();
        if (
            this._heightIndexGeneration !== core._resultGeneration
            || this._heightIndexGeometryRevision !== this._geometryRevision
            || this._heightIndexViewKey !== viewKey
            || this._heightIndex.size !== size
        ) {
            this._heightIndexGeneration = core._resultGeneration;
            this._heightIndexGeometryRevision = this._geometryRevision;
            this._heightIndexViewKey = viewKey;
            this._heightIndex.reset(size, this._syncRowEstimate());
        }
        return this._heightIndex;
    },


    beginSwipeReveal(shell) {
        if (this._swipeReveal?.shell === shell) return;
        this.cancelSwipeReveal();
        const list = this.owner?.resultsContainer;
        const rail = this.owner?.resultsRail;
        const item = shell?.querySelector(":scope > .local-search-item");
        if (!list?.isConnected || !rail?.isConnected || !item?.isConnected) return;
        const style = shell.ownerDocument.defaultView.getComputedStyle(shell);
        const required = Math.max(0, parseFloat(style.getPropertyValue("--ls-swipe-action-height")) || 0)
            + Math.max(0, parseFloat(style.getPropertyValue("--ls-swipe-shelf-gap")) || 0);
        // Dida Master：末端可见性只认真实 Scroller + Content Rail 的正式尾距。
        // Shelf 展开本身仍由 Row border-box 进入 HeightIndex，不创建第二个 reveal spacer。
        const win = list.ownerDocument.defaultView;
        const bottomInset = Math.max(0, parseFloat(win.getComputedStyle(list).paddingBottom) || 0)
            + Math.max(0, parseFloat(win.getComputedStyle(rail).paddingBottom) || 0);
        const viewportBottom = list.getBoundingClientRect().top + list.clientTop + list.clientHeight - bottomInset;
        const free = Math.max(0, viewportBottom - item.getBoundingClientRect().bottom);
        if (free >= required) return;
        this._swipeReveal = { shell, free, base: list.scrollTop, last: list.scrollTop, yielded: false };
    },


    yieldSwipeReveal() {
        if (this._swipeReveal) this._swipeReveal.yielded = true;
    },


    cancelSwipeReveal(shell = null) {
        if (shell && this._swipeReveal?.shell !== shell) return;
        this._swipeReveal = null;
    },


    _sampleSwipeReveal(shell, height, itemHeight, trailing, expanded) {
        const session = this._swipeReveal;
        const list = this.owner?.resultsContainer;
        const extra = Math.max(0, height - itemHeight - trailing);
        if (session?.shell === shell && list?.isConnected) {
            if (!session.yielded) {
                const max = Math.max(0, list.scrollHeight - list.clientHeight);
                const expected = Math.min(session.last, max);
                // 未经过本会话的滚动（滚动条/外部定位）也交还用户，不追赶旧位置。
                if (Math.abs(list.scrollTop - expected) > 1.5) session.yielded = true;
                else {
                    const target = session.base + Math.max(0, extra - session.free);
                    if (Math.abs(list.scrollTop - Math.min(target, max)) > 0.25) this._setScrollTop(target);
                    session.last = list.scrollTop;
                }
            }
            if (!expanded && extra <= 1) this.cancelSwipeReveal(shell);
        }
        if (!expanded && extra <= 1 && this.owner?.swipe?.closingWrapper === shell) {
            this.owner.swipe.closingWrapper = null;
            this.owner._scheduleResultIndexUpdate?.();
        }
    },


    _handleRowResize(entries = []) {
        const core = this.owner;
        if (!core || core._destroyed || !entries.length) return;

        // Style Settings 改动只要真正影响当前卡片高度，就会触发 Row ResizeObserver。
        // signature 一旦变化，离屏旧高度整代失效；不逐行修补历史 measured map。
        const signature = this._readGeometryStyleSignature();
        if (
            this._geometryStyleSignature
            && signature
            && signature !== this._geometryStyleSignature
        ) {
            const anchor = this.captureMountedViewportAnchor();
            this._geometryStyleSignature = signature;
            this.rerenderForGeometryChange({
                viewportAnchor: anchor,
                clearEstimate: "all"
            });
            return;
        }
        if (!this._geometryStyleSignature) this._geometryStyleSignature = signature;

        const index = this._ensureHeightIndex();
        const retainMotion = Boolean(
            this._swipeReveal
            || core.swipe?.gestureWrapper
            || core.swipe?.openWrapper
            || core.swipe?.closingWrapper
        );
        const restoredAnchor = this._pendingViewportMeasurement?.generation === core._resultGeneration
            ? this.prepareViewportAnchor(this._pendingViewportMeasurement) : null;
        const geometryAnchor = retainMotion ? null
            : restoredAnchor?.position >= 0 ? restoredAnchor : this._geometryAnchor(index);
        let sampleTotal = 0;
        let sampleCount = 0;
        let measuredCount = 0;
        let geometryChanged = false;

        for (const entry of entries) {
            const shell = entry?.target;
            if (!isDomHTMLElement(shell) || !shell.isConnected) continue;
            const position = Number.parseInt(shell.dataset.virtualPosition || "", 10);
            if (!Number.isInteger(position) || position < 0 || position >= index.size) continue;

            const box = Array.isArray(entry.borderBoxSize)
                ? entry.borderBoxSize[0]
                : entry.borderBoxSize;
            const height = Number(box?.blockSize) || shell.getBoundingClientRect().height;
            if (!(height > 0)) continue;

            geometryChanged = index.set(position, height) || geometryChanged;
            measuredCount++;

            // Shelf 实际展开高度计入当前行几何，但不参与稳定行高学习。
            // 所有行都由同一 border-box 测量，纵向让位只消费这一帧实际 padding。
            const transientSwipe = shell.classList.contains("is-swiping")
                || shell.classList.contains("is-swipe-open")
                || shell.classList.contains("is-swipe-trigger-open");
            const normalTrailing = 0; // 连续列表无卡间距，分割线不占布局高度。
            // 普通行直接消费 RO 的 border-box；动作栏过渡才单独测 body。
            const movingShelf = transientSwipe || shell.matches(".is-swipe-left, .is-swipe-right")
                || core.swipe?.allExpanded || core.swipe?.closingWrapper === shell;
            const item = movingShelf ? shell.querySelector(":scope > .local-search-item") : null;
            const itemHeight = movingShelf
                ? (isDomHTMLElement(item) ? item.getBoundingClientRect().height : 0)
                : Math.max(0, height - normalTrailing);
            this._sampleSwipeReveal(shell, height, itemHeight, normalTrailing, transientSwipe);
            // 关闭过渡仍高于结果正文，不能作为稳定样本。
            const transientLayout = itemHeight > 0
                && height > itemHeight + normalTrailing + 1.5;
            const stableActions = core.swipe?.allExpanded && shell.classList.contains("is-swipe-open")
                && !shell.classList.contains("is-swiping");
            const sampleEligible = (stableActions || (!core.swipe?.allExpanded && !transientSwipe && !transientLayout))
                && (!shell.classList.contains("is-last-result") || index.size === 1);
            if (sampleEligible) {
                sampleTotal += height;
                sampleCount++;
            }
        }

        if (!measuredCount) return;
        this._pendingViewportMeasurement = null;
        if (sampleCount) {
            // 持续学习同 Surface / View 的起始估算；首屏首次样本允许同步校准当前 baseline。
            const sample = Math.max(44, Math.min(320, sampleTotal / sampleCount));
            const key = this._rowEstimateCacheKey();
            const previous = Number(core.plugin?._resultRowHeightByView?.get?.(key));
            const hadCachedEstimate = Number.isFinite(previous) && previous > 0;
            const next = hadCachedEstimate
                ? previous * 0.8 + sample * 0.2
                : sample;
            core.plugin?._resultRowHeightByView?.set?.(key, next);

            // 当前 Surface / View 首次从列表顶部建立高度样本时，直接把本代未测量行基准
            // 校准到首屏真实平均值；已测量行仍保留各自实际高度。
            if (!hadCachedEstimate && this.windowStart === 0) {
                geometryChanged = index.rebaseEstimate(sample) || geometryChanged;
            }
        }

        // ResizeObserver 是结果行真实高度的唯一写入源。Gap 与 Swipe Shelf 都已经进入
        // shell border-box，不再由 JS 额外加 margin / slot，避免两套几何。
        if (geometryChanged) {
            if (geometryAnchor) this._restoreGeometryAnchor(geometryAnchor, index);
            this._syncSpacerHeights(index.size);
            this._syncWindowToViewport(core.resultsContainer);
        }
    },


    _observeShell(shell, position) {
        if (!isDomHTMLElement(shell)) return;
        if (Number.isInteger(position) && position >= 0) {
            shell.dataset.virtualPosition = String(position);
        }
        // 行间距及 Shelf 占位属于 padding；必须观察 border-box，而非默认 content-box。
        this._rowResizeObserver?.observe(shell, { box: "border-box" });
    },


    _unobserveShell(shell) {
        if (!isDomHTMLElement(shell)) return;
        this.cancelSwipeReveal(shell);
        if (this.owner?.swipe?.closingWrapper === shell) {
            this.owner.swipe.closingWrapper = null;
            this.owner._scheduleResultIndexUpdate?.();
        }
        this._rowResizeObserver?.unobserve(shell);
    },


    prepareViewportAnchor(anchor) {
        if (!anchor) return null;
        let path = anchor.path || "";
        let offset = Number(anchor.offset) || 0;
        let position = this._displayPositionForPath(path);
        if (position < 0 && anchor.fallbackPath) {
            path = anchor.fallbackPath;
            offset = Number(anchor.fallbackOffset) || 0;
            position = this._displayPositionForPath(path);
        }
        return { ...anchor, path: position >= 0 ? path : "", offset, position };
    },


    restoreViewportAnchor(anchor) {
        const core = this.owner;
        const list = core?.resultsContainer;
        if (!isDomHTMLElement(list) || !list.isConnected || !anchor) return false;
        let target = Math.max(0, Number(anchor.scrollTop) || 0);
        let restored = false;
        if (anchor.path) {
            const item = list.querySelector(`.local-search-item[data-path="${CSS.escape(anchor.path)}"]`);
            if (isDomHTMLElement(item)) {
                const bounds = list.getBoundingClientRect();
                const rect = item.getBoundingClientRect();
                target = list.scrollTop
                    + rect.top
                    - bounds.top
                    - (Number(anchor.offset) || 0);
                restored = true;
            }
        }
        this._setScrollTop(target);
        return restored;
    },
};

