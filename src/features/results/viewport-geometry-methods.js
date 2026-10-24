// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeModalViewportAnchor } from "../../core/session-values.js";
import { RESULT_SWIPE_INTENT_SLOP_PX } from "../../interactions/SwipeActionCoordinator.js";
import { hostWindow, isDomHTMLElement } from "../../utils/dom.js";
import { RESULT_GEOMETRY_CSS_TOKENS } from "./virtualization-config.js";
// Instance method owner. `this` is the unchanged SearchResultRendererController instance. No additional state store.
export const SearchResultRendererController_viewport_geometry_methods = {


    getScrollTop() {
        const value = Number(this.owner?.resultsContainer?.scrollTop || 0);
        return Number.isFinite(value)
            ? Math.max(0, Math.round(value))
            : 0;
    },


    _setScrollTop(value) {
        const list = this.owner?.resultsContainer;
        if (!isDomHTMLElement(list)) return 0;
        const requested = Math.max(0, Number(value) || 0);
        // Origin is valid for every scroll extent, including an empty/hidden
        // list. Only positive targets require measuring the live upper bound.
        const next = requested === 0 ? 0
            : Math.min(requested, Math.max(0, list.scrollHeight - list.clientHeight));
        const current = Number(list.scrollTop) || 0;
        if (Math.abs(current - next) <= 0.25) return current;
        this._programmaticScrollTop = next;
        list.scrollTop = next;
        return list.scrollTop;
    },


    attachViewport(container = this.owner?.resultsContainer) {
        if (!isDomHTMLElement(container)) return false;
        this._viewportResizeObserver?.disconnect();
        this._syncViewportInsets();
        this._viewportWidth = this._measureRailContentWidth();
        this._viewportHeight = Math.max(0, Number(container.clientHeight) || 0);
        this._geometryStyleSignature = this._readGeometryStyleSignature();
        this._viewportResizeObserver?.observe(container);
        this._viewportInputCleanup?.();
        this._scrollTouch = null;
        const start = event => {
            const touch = event.touches?.length === 1 ? event.touches[0] : null;
            this._scrollTouch = touch ? { id: touch.identifier, x: touch.clientX, y: touch.clientY } : null;
            if (!touch) this.yieldSwipeReveal();
        };
        const move = event => {
            const origin = this._scrollTouch, touch = event.touches?.[0];
            if (!origin || !touch || touch.identifier !== origin.id) return;
            // 只观察纵向意图，不 preventDefault、不接管横滑；横向一旦成立不二次判向。
            if (this.owner?.swipe?.gestureWrapper?.classList.contains("is-swiping")) return;
            const dy = Math.abs(touch.clientY - origin.y), dx = Math.abs(touch.clientX - origin.x);
            if (dy >= RESULT_SWIPE_INTENT_SLOP_PX && dy >= dx) {
                this.yieldSwipeReveal();
                this._markNativeScroll();
            }
        };
        const end = event => {
            if (event.type !== "touchcancel" && event.touches?.length) return;
            this._scrollTouch = null;
            // touchend 不是惯性滚动结束；等待最后一个真实 scroll 后再提交后台结果/几何。
            this._markNativeScroll();
        };
        const takeOver = () => {
            this.yieldSwipeReveal();
            this._markNativeScroll();
        };
        const wheel = event => { if (event.deltaY) takeOver(); };
        // Mouse presses and control activation are not scroll intent. Scrollbar
        // dragging and keyboard scrolling enter through handleScrollLoad only
        // when the viewport actually moves; ordinary clicks must not defer data
        // updates or arm a later scroll-save transaction.
        const handlers = [["touchstart", start], ["touchmove", move], ["touchend", end],
            ["touchcancel", end], ["wheel", wheel]];
        for (const [type, fn] of handlers) container.addEventListener(type, fn, { capture: true, passive: true });
        this._viewportInputCleanup = () => {
            for (const [type, fn] of handlers) container.removeEventListener(type, fn, true);
        };
        return true;
    },


    _isOverscrolling() {
        const list = this.owner?.resultsContainer;
        if (!isDomHTMLElement(list)) return false;
        const top = Number(list.scrollTop) || 0;
        // max is always >= 0: the origin cannot be beyond the bottom. Avoid
        // a forced layout while fresh result cards are being inserted there.
        if (top < -0.5) return true;
        if (top <= 0.5) return false;
        const max = Math.max(0, list.scrollHeight - list.clientHeight);
        return top > max + 0.5;
    },


    isNativeScrolling() {
        return Boolean(
            this._scrollTouch
            || this._scrollSettleTimer !== null
            || this._isOverscrolling()
        );
    },


    _markNativeScroll() {
        this._pendingViewportMeasurement = null;
        const core = this.owner;
        const list = core?.resultsContainer;
        if (!core || core._destroyed || !isDomHTMLElement(list)) return false;
        const win = hostWindow(list);
        if (this._scrollSettleTimer !== null) win.clearTimeout(this._scrollSettleTimer);
        // 与 Dida Master 一致：一个可取消的静止检测；无轮询、无逐帧 settle timer。
        this._scrollSettleTimer = win.setTimeout(() => {
            this._scrollSettleTimer = null;
            if (!this.owner || this.owner._destroyed || this._scrollTouch) return;
            if (this._isOverscrolling()) {
                // iOS 弹性区不回写 scrollTop；后续真实 scroll/touchend 会重新建立 settle。
                return;
            }
            this._settleNativeScroll();
        }, 180);
        return true;
    },


    _settleNativeScroll() {
        const core = this.owner;
        const list = core?.resultsContainer;
        if (!core || core._destroyed || !isDomHTMLElement(list)) return false;

        // 原生滚动期间，行高修正只进入 scrollOffset + before spacer，绝不追写手指/惯性位置。
        // 停稳后同一 JS task 归零临时差值并一次性恢复真实逻辑 scrollTop，不产生旧锚点回放。
        if (Math.abs(this._scrollOffset) > 0.25) {
            const target = (Number(list.scrollTop) || 0) + this._scrollOffset;
            this._scrollOffset = 0;
            this._syncSpacerHeights();
            this._setScrollTop(target);
        } else if (this._scrollOffset) {
            this._scrollOffset = 0;
            this._syncSpacerHeights();
        }

        const pendingGeometry = this._pendingGeometryRefresh;
        this._pendingGeometryRefresh = null;
        if (pendingGeometry) {
            this._scheduleGeometryRefresh(pendingGeometry);
        }
        core._scheduleResultIndexUpdate?.();
        // Scroll is host-local presentation. Resume deferred index/shared work
        // above, then save the viewport without republishing unchanged query
        // state or projecting the unrelated navigation tree.
        core.onStateChange?.();
        return true;
    },


    _geometryAnchor(index = this._ensureHeightIndex()) {
        const list = this.owner?.resultsContainer;
        if (!isDomHTMLElement(list) || !index?.size) return null;
        const logicalScrollTop = Math.max(0, (Number(list.scrollTop) || 0) + this._scrollOffset);
        const contentTop = Math.max(0, logicalScrollTop - this._viewportPadTop);
        const position = Math.max(0, index.positionAt(contentTop));
        return {
            position,
            offset: this._viewportPadTop + index.prefix(position) - logicalScrollTop,
            logicalScrollTop
        };
    },


    _restoreGeometryAnchor(anchor, index = this._ensureHeightIndex()) {
        const list = this.owner?.resultsContainer;
        if (!anchor || !isDomHTMLElement(list) || !index?.size) return false;
        const position = Math.max(0, Math.min(index.size - 1, Number(anchor.position) || 0));
        const target = Math.max(0, this._viewportPadTop + index.prefix(position) - (Number(anchor.offset) || 0));
        const currentLogical = Math.max(0, (Number(list.scrollTop) || 0) + this._scrollOffset);
        const delta = target - currentLogical;
        if (Math.abs(delta) <= 0.25) return false;
        if (this.isNativeScrolling()) {
            this._scrollOffset += delta;
            return true;
        }
        this._setScrollTop(target);
        return true;
    },


    _readGeometryStyleSignature() {
        const host = this.owner?.containerEl;
        if (!isDomHTMLElement(host) || !host.isConnected) return "";
        const style = hostWindow(host).getComputedStyle(host);
        const font = [
            style.fontFamily,
            style.fontSize,
            style.fontWeight,
            style.letterSpacing,
            style.lineHeight
        ].join(":");
        return [
            `font:${font}`,
            ...RESULT_GEOMETRY_CSS_TOKENS
                .map(token => `${token}:${style.getPropertyValue(token).trim()}`)
        ].join("|");
    },


    _syncViewportInsets() {
        const rail = this.owner?.resultsRail;
        if (!isDomHTMLElement(rail) || !rail.isConnected) {
            this._viewportPadTop = 0;
            return 0;
        }
        const top = Number.parseFloat(hostWindow(rail).getComputedStyle(rail).paddingTop);
        this._viewportPadTop = Number.isFinite(top) ? Math.max(0, top) : 0;
        return this._viewportPadTop;
    },


    _measureRailContentWidth(entry = null) {
        const rail = this.owner?.resultsRail;
        if (!isDomHTMLElement(rail) || !rail.isConnected) return 0;
        const box = Array.isArray(entry?.contentBoxSize)
            ? entry.contentBoxSize[0]
            : entry?.contentBoxSize;
        const observed = Number(box?.inlineSize);
        if (Number.isFinite(observed) && observed > 0) return observed;
        const style = hostWindow(rail).getComputedStyle(rail);
        const left = Number.parseFloat(style.paddingLeft) || 0;
        const right = Number.parseFloat(style.paddingRight) || 0;
        return Math.max(0, (Number(rail.clientWidth) || 0) - left - right);
    },


    captureMountedViewportAnchor(preferredPaths = null, excludedPaths = null) {
        const core = this.owner;
        const hiddenAnchor = core?.navigator?.hiddenResultAnchor();
        if (hiddenAnchor) return hiddenAnchor;
        const list = core?.resultsContainer;
        const scrollTop = Math.max(0, this.getScrollTop() + this._scrollOffset);
        if (!isDomHTMLElement(list) || !list.isConnected) {
            return normalizeModalViewportAnchor({ scrollTop });
        }

        const preferred = preferredPaths instanceof Set
            ? preferredPaths
            : new Set(Array.isArray(preferredPaths) ? preferredPaths : []);
        const excluded = excludedPaths instanceof Set
            ? excludedPaths
            : new Set(Array.isArray(excludedPaths) ? excludedPaths : []);
        const bounds = list.getBoundingClientRect();
        const visible = [...list.querySelectorAll(".local-search-item[data-path]")]
            .map(element => {
                const rect = element.getBoundingClientRect();
                return {
                    path: element.dataset.path || "",
                    offset: rect.top - bounds.top,
                    visible: rect.bottom > bounds.top + 1
                        && rect.top < bounds.bottom - 1
                };
            })
            .filter(entry => entry.path && entry.visible);
        const eligible = visible.filter(entry => !excluded.has(entry.path));
        const primary = eligible.find(entry => preferred.has(entry.path))
            || eligible[0]
            || visible[0]
            || null;
        const fallback = eligible.find(entry => entry.path !== primary?.path)
            || visible.find(entry => entry.path !== primary?.path)
            || primary;

        return normalizeModalViewportAnchor({
            path: primary?.path || "",
            offset: primary?.offset || 0,
            fallbackPath: fallback?.path || "",
            fallbackOffset: fallback?.offset ?? primary?.offset ?? 0,
            scrollTop
        });
    },


    invalidateGeometry({ clearEstimate = false } = {}) {
        const core = this.owner;
        if (!core) return this._geometryRevision;
        this._geometryRevision++;
        this._heightIndexGeometryRevision = -1;
        this._syncViewportInsets();
        this._geometryStyleSignature = this._readGeometryStyleSignature();
        if (clearEstimate === "all") {
            // 窗口宽度 / 全局 Style Token 会影响所有视图未来的起始行高估算。
            core.plugin?._resultRowHeightByView?.clear?.();
        } else if (clearEstimate) {
            core.plugin?._resultRowHeightByView?.delete?.(
                this._rowEstimateCacheKey()
            );
        }
        return this._geometryRevision;
    },


    rerenderForGeometryChange({
        viewportAnchor = null,
        clearEstimate = false
    } = {}) {
        const core = this.owner;
        if (!core || core._destroyed || !core.containerEl?.isConnected) return false;
        if (this.isNativeScrolling()) {
            // Theme / Style / View 几何切换不得在触摸或惯性滚动中重建窗口。
            // 只保存“需要全清估算”这一语义，停稳后从当时真实视口重新取锚点。
            const next = { clearEstimate: clearEstimate === "all" ? "all" : Boolean(clearEstimate) };
            const current = this._pendingGeometryRefresh;
            if (!current || next.clearEstimate === "all" || (next.clearEstimate && !current.clearEstimate)) {
                this._pendingGeometryRefresh = next;
            }
            return true;
        }
        if (this._geometrySettleTimer) {
            hostWindow(core.resultsContainer).clearTimeout(this._geometrySettleTimer);
            this._geometrySettleTimer = null;
            // 宽度已经变化但 debounce 尚未提交；本次其它几何刷新直接接管该失效。
            clearEstimate = "all";
        }
        const anchor = viewportAnchor || this.captureMountedViewportAnchor();
        this.invalidateGeometry({ clearEstimate });
        this.renderInitialPage(anchor);
        return true;
    },


    _scheduleGeometryRefresh({ clearEstimate = "all" } = {}) {
        const core = this.owner;
        const list = core?.resultsContainer;
        if (!core || core._destroyed || !isDomHTMLElement(list)) return false;
        if (this.isNativeScrolling()) {
            const next = { clearEstimate: clearEstimate === "all" ? "all" : Boolean(clearEstimate) };
            const current = this._pendingGeometryRefresh;
            if (!current || next.clearEstimate === "all" || (next.clearEstimate && !current.clearEstimate)) {
                this._pendingGeometryRefresh = next;
            }
            return true;
        }
        if (this._geometrySettleTimer) {
            hostWindow(list).clearTimeout(this._geometrySettleTimer);
        }
        this._geometrySettleTimer = hostWindow(list).setTimeout(() => {
            this._geometrySettleTimer = null;
            if (!this.owner || this.owner._destroyed) return;
            this.rerenderForGeometryChange({
                viewportAnchor: this.captureMountedViewportAnchor(),
                clearEstimate
            });
        }, 80);
        return true;
    },


    handleStyleEnvironmentChange() {
        const core = this.owner;
        const list = core?.resultsContainer;
        const rail = core?.resultsRail;
        if (!core || core._destroyed || !isDomHTMLElement(list) || !isDomHTMLElement(rail)) return false;

        const previousSignature = this._geometryStyleSignature;
        const previousWidth = this._viewportWidth;
        const previousPadTop = this._viewportPadTop;
        const nextSignature = this._readGeometryStyleSignature();
        const nextWidth = this._measureRailContentWidth();
        this._syncViewportInsets();
        this._geometryStyleSignature = nextSignature;
        if (nextWidth > 0) this._viewportWidth = nextWidth;

        const geometryChanged = Boolean(
            previousSignature
            && nextSignature
            && nextSignature !== previousSignature
        );
        const widthChanged = previousWidth > 0
            && nextWidth > 0
            && Math.abs(nextWidth - previousWidth) > 1;
        if (geometryChanged || widthChanged) {
            return this._scheduleGeometryRefresh({ clearEstimate: "all" });
        }

        // 顶部 / 底部 Tail Token 不属于行高；只同步坐标 / scroll window，
        // 不清空已测量 HeightIndex。Scrollbar inset 若卡片宽度未变也同样零重建。
        if (Math.abs(this._viewportPadTop - previousPadTop) > 0.25) {
            this._syncWindowToViewport(list);
        }
        return true;
    },


    rerenderPreservingScrollTop() {
        const core = this.owner;
        if (!core || core._destroyed || !core.containerEl?.isConnected) return false;
        const scrollTop = this.getScrollTop();
        this.renderPage();
        this._setScrollTop(scrollTop);
        return true;
    },


    _handleViewportResize(entries = []) {
        const core = this.owner;
        const list = core?.resultsContainer;
        if (!core || core._destroyed || !isDomHTMLElement(list) || !entries.length) return;

        const entry = entries.find(item => item?.target === list) || entries[0];
        if (entry?.target !== list) return;
        const box = Array.isArray(entry?.borderBoxSize)
            ? entry.borderBoxSize[0]
            : entry?.borderBoxSize;
        const width = this._measureRailContentWidth();
        const height = Math.max(0,
            Number(box?.blockSize)
            || Number(entry?.contentRect?.height)
            || list.clientHeight
            || 0
        );

        if (core.isWorkspaceHost && (!width || !height)) return;
        const hadViewport = this._viewportWidth > 0 || this._viewportHeight > 0;
        const widthChanged = hadViewport && Math.abs(width - this._viewportWidth) > 1;
        const heightChanged = hadViewport && Math.abs(height - this._viewportHeight) > 1;
        this._viewportWidth = width;
        this._viewportHeight = height;

        if (!hadViewport) {
            this._syncViewportInsets();
            return;
        }
        if (core._isRendering) return;
        if (widthChanged) {
            // 只按结果卡真实 content width 判断；Scrollbar inset 自身不会触发无效 HeightIndex 重建。
            this._scheduleGeometryRefresh({ clearEstimate: "all" });
            return;
        }
        if (heightChanged) {
            this._syncWindowToViewport(list);
        }
    },
};

