// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { composeClassMethods } from "../../core/compose-class-methods.js";
import { hostWindow } from "../../utils/dom.js";
import { SparseHeightIndex } from "./SparseHeightIndex.js";
import { SearchResultRendererController_card_metadata_methods } from "./card-metadata-methods.js";
import { SearchResultRendererController_filter_channels_methods } from "./filter-channels-methods.js";
import { SearchResultRendererController_page_and_snippets_methods } from "./page-and-snippets-methods.js";
import { SearchResultRendererController_result_card_methods } from "./result-card-methods.js";
import { SearchResultRendererController_viewport_anchors_methods } from "./viewport-anchors-methods.js";
import { SearchResultRendererController_viewport_geometry_methods } from "./viewport-geometry-methods.js";
import { SearchResultRendererController_virtual_window_methods } from "./virtual-window-methods.js";
import { RESULT_ROW_HEIGHT_ESTIMATE } from "./virtualization-config.js";


export class SearchResultRendererController {

    constructor(owner) {
        this.owner = owner;
        this.windowStart = 0;
        this.windowEnd = 0;
        this._scrollFrame = 0;
        this._programmaticScrollTop = null;

        // Result data 与 Result geometry 分代：搜索 / 排序 / 筛选改变数据代，
        // 视图配置 / 宽度 / 高度相关 Style Token 改变几何代。两者任一变化才重建 HeightIndex。
        this._geometryRevision = 0;
        this._heightIndex = new SparseHeightIndex();
        this._heightIndexGeneration = -1;
        this._heightIndexGeometryRevision = -1;
        this._heightIndexViewKey = "";
        this._beforeSpacer = null;
        this._afterSpacer = null;

        this._geometryStyleSignature = "";
        this._viewportWidth = 0;
        this._viewportHeight = 0;
        this._viewportPadTop = 0;
        this._geometrySettleTimer = null;
        this._pendingGeometryRefresh = null;
        this._swipeReveal = null;
        this._scrollTouch = null;
        this._scrollSettleTimer = null;
        this._scrollOffset = 0;
        this._viewportInputCleanup = null;

        // Dida Master Filter Pool Rail：稳定复用 Group / Chip / Shortcut DOM。
        // 刷新只更新文本、状态与顺序，不再 empty() 后整行重建。
        this._filterPoolGroupRefs = new Map();
        this._filterToolbarButtonRefs = new Map();
        const win = hostWindow(owner?.containerEl);
        const ResizeObserverCtor = win?.ResizeObserver;
        this._rowResizeObserver = typeof ResizeObserverCtor === "function"
            ? new ResizeObserverCtor(entries => this._handleRowResize(entries))
            : null;
        this._viewportResizeObserver = typeof ResizeObserverCtor === "function"
            ? new ResizeObserverCtor(entries => this._handleViewportResize(entries))
            : null;
    }


    destroy() {
        if (this._scrollFrame) hostWindow(this.owner?.resultsContainer).cancelAnimationFrame(this._scrollFrame);
        this._scrollFrame = 0;
        this._programmaticScrollTop = null;
        this.cancelSwipeReveal();
        this._viewportInputCleanup?.();
        this._viewportInputCleanup = null;
        this._scrollTouch = null;
        this._rowResizeObserver?.disconnect();
        this._rowResizeObserver = null;
        this._viewportResizeObserver?.disconnect();
        this._viewportResizeObserver = null;
        if (this._geometrySettleTimer) hostWindow(this.owner?.resultsContainer).clearTimeout(this._geometrySettleTimer);
        this._geometrySettleTimer = null;
        this._pendingGeometryRefresh = null;
        if (this._scrollSettleTimer) hostWindow(this.owner?.resultsContainer).clearTimeout(this._scrollSettleTimer);
        this._scrollSettleTimer = null;
        this._scrollOffset = 0;
        this._beforeSpacer = null;
        this._afterSpacer = null;
        for (const ref of this._filterPoolGroupRefs.values()) {
            for (const button of ref.buttons?.values?.() || []) button._lsPoolAction = null;
        }
        this._filterPoolGroupRefs.clear();
        this._filterToolbarButtonRefs.clear();
        this._heightIndex.reset(0, RESULT_ROW_HEIGHT_ESTIMATE);
        this._pendingViewportMeasurement = null;
        this.owner = null;
    }
}

composeClassMethods(SearchResultRendererController, [SearchResultRendererController_viewport_geometry_methods, SearchResultRendererController_viewport_anchors_methods, SearchResultRendererController_virtual_window_methods, SearchResultRendererController_page_and_snippets_methods, SearchResultRendererController_filter_channels_methods, SearchResultRendererController_card_metadata_methods, SearchResultRendererController_result_card_methods], ["destroy","getScrollTop","_setScrollTop","attachViewport","_isOverscrolling","isNativeScrolling","_markNativeScroll","_settleNativeScroll","_geometryAnchor","_restoreGeometryAnchor","_readGeometryStyleSignature","_syncViewportInsets","_measureRailContentWidth","captureMountedViewportAnchor","invalidateGeometry","rerenderForGeometryChange","_scheduleGeometryRefresh","handleStyleEnvironmentChange","rerenderPreservingScrollTop","_handleViewportResize","captureViewportAnchor","_displayPositionForActualIndex","_actualIndexAtDisplayPosition","_displayPositionForPath","_rowEstimateCacheKey","_syncRowEstimate","_ensureHeightIndex","beginSwipeReveal","yieldSwipeReveal","cancelSwipeReveal","_sampleSwipeReveal","_handleRowResize","_observeShell","_unobserveShell","prepareViewportAnchor","restoreViewportAnchor","renderInitialPage","_usesChannels","visibleResultCount","getVisibleResultIndices","resetViewport","_windowSize","_windowStartForPosition","_windowRangeForViewport","_spacer","_mountedShells","refreshActionShelfLayout","_syncMountedState","_syncSpacerHeights","_shiftWindowRange","_syncWindowToViewport","handleScrollLoad","_appendPositionRange","refreshChangedRows","renderCurrentView","queueLazySnippetFill","_lazyFillSnippet","renderPage","_renderFilterPoolHeader","refreshResultChannels","_renderStateChannels","_appendChannelGroup","_ensureFilterPoolGroup","_syncFilterPoolButton","_syncFilterPoolGroups","_syncFilterToolbarEntries","_appendHighlightedTitle","_buildTitleRow","_createFilterChip","_createResultMetadataRow","_appendTags","_visibleProperties","_createPropertyKeyButton","_appendProperties","_timeFormatters","_formatTime","_formatCardMetaTime","_appendMetaFields","_buildResultItem","_fillSnippet","_updateSnippetInPlace","navigateResults"]);

