// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { BatchMetadataController } from "../features/batch/BatchMetadataController.js";
import { SearchCreateController } from "../features/create/SearchCreateController.js";
import { CREATE_TYPE_IDS } from "../features/create/create-model.js";
import { SearchFacetController } from "../features/facets/SearchFacetController.js";
import { FilterState } from "../features/filters/filter-state.js";
import { SearchResultControlsController } from "../features/result-controls/SearchResultControlsController.js";
import { SearchResultRendererController } from "../features/results/SearchResultRendererController.js";
import { QueryState } from "../features/search/QueryState.js";
import { SearchSelectionController } from "../features/selection/SearchSelectionController.js";
import { SearchSortController } from "../features/sort/SearchSortController.js";
import { normalizeSortDirection, normalizeSortField } from "../features/sort/sort-model.js";
import { SwipeActionCoordinator } from "../interactions/SwipeActionCoordinator.js";
import { IoPool } from "../services/IoPool.js";
import { SearchDropdownController } from "../ui/overlays/SearchDropdownController.js";
import { normalizeUniqueStringList } from "../utils/normalization.js";
import { normalizeVaultFolderPath } from "../utils/vault-paths.js";
import { composeClassMethods } from "./compose-class-methods.js";
import { SearchCore_file_actions_methods, SearchCore_open_selection_methods } from "./search/file-actions-methods.js";
import { SearchCore_input_and_filters_methods } from "./search/input-and-filters-methods.js";
import { SearchCore_result_menu_events_methods } from "./search/result-menu-events-methods.js";
import { SearchCore_search_and_ranking_methods } from "./search/search-and-ranking-methods.js";
import { SearchCore_session_methods } from "./search/session-methods.js";
import { SearchCore_shell_methods } from "./search/shell-methods.js";
import { normalizeModalSearchQuery, normalizeModalViewportAnchor } from "./session-values.js";
import { Notice } from "obsidian";


// SearchCore owns exactly one list of references it clears on destroy.
export const SEARCH_CORE_UI_REF_KEYS = Object.freeze("searchInput resultsShell resultsContainer resultsRail typeButtonEls folderBtn clearFiltersBtn filterPoolHost filterPoolValues filterPoolShortcuts propertyFilterRow resultChannelHost activeFilterWrap".split(" "));


export class SearchCore {

    constructor(app, plugin, containerEl, options = {}) {
        this.app = app;
        this.plugin = plugin;
        this.containerEl = containerEl;
        this.hostKind = options.hostKind || "window";
        this.sharedSearchState = this.hostKind !== "embedded" && options.sharedSearchState !== false;
        this.workbenchPresentation = this.hostKind === "embedded" && options.presentation === "workbench";
        this.workbenchToolsExpanded = false;
        this.workbenchToolbarHost = this.workbenchPresentation && options.toolbarHost?.nodeType === 1
            && options.toolbarHost.ownerDocument === containerEl.ownerDocument ? options.toolbarHost : null;
        this.isWorkspaceHost = this.hostKind !== "window";
        this.sessionKey = String(options.sessionKey || "");
        this.onStateChange = options.onStateChange || null;
        this.onFileOpened = typeof options.onFileOpened === "function" ? options.onFileOpened : null;
        this.onCloseRequest = options.onCloseRequest || (() => {});
        this.closeAfterFileOpen = options.closeAfterFileOpen !== false;

        // 外部调用只通过这一组会话参数进入 SearchCore：
        // 结果范围、选择语义、标题文案与是否允许创建都由同一实例状态控制，
        // 不复制第二套搜索/筛选/结果交互。
        this.persistModalSession = options.persistModalSession !== false;
        this.externalPathScope = Array.isArray(options.allowedPaths)
            ? new Set(normalizeUniqueStringList(options.allowedPaths))
            : null;
        this.ignoreResultExclusions = Boolean(options.ignoreResultExclusions);
        this.externalPickHandler =
            typeof options.onPickFile === "function"
                ? options.onPickFile
                : null;
        this.closeOnExternalPick = options.closeOnPick !== false;
        this.externalOpenFileHandler = typeof options.onOpenFile === "function" ? options.onOpenFile : null;

        const externalSelection =
            options.externalSelectionAction
            && typeof options.externalSelectionAction === "object"
                ? options.externalSelectionAction
                : null;
        this.externalSelectionHandler =
            typeof externalSelection?.onSubmitFiles === "function"
                ? externalSelection.onSubmitFiles
                : null;
        // V5: 默认仍为“进入即多选”，兼容已有 Picker 工作流；调用方可显式
        // 以普通浏览启动，之后进入原生 Batch ToolBar 进行批量关联。
        this.externalSelectionStartInBatchMode = Boolean(
            externalSelection && externalSelection?.startInBatchMode !== false
        );
        this.externalSelectionActionLabel = String(
            externalSelection?.label || "确认选择"
        ).trim() || "确认选择";
        this.closeOnExternalSelectionSubmit =
            externalSelection?.closeOnSubmit !== false;

        this.allowCreate = options.allowCreate !== false;
        this.externalCreateFolder = normalizeVaultFolderPath(String(options.createFolder || ""));
        this.externalCreateProperties = Array.isArray(options.createProperties) ? options.createProperties : [];
        this.externalCreateType = CREATE_TYPE_IDS.includes(options.createType) ? options.createType : "";
        this.initialCreate = options.initialCreate === true;
        this.onExternalCreated = typeof options.onCreated === "function" ? options.onCreated : null;
        this.headingTitleText = String(options.headingTitle || "本地搜索");
        this.headingCaptionText = String(options.headingCaption || "你的知识，触手可及");

        this.queryState = new QueryState(
            normalizeModalSearchQuery(options.initialQuery)
        );
        this.filterState = FilterState.fromSnapshot(
            options.initialFilterSnapshot
        );
        this.bodyExpanded = false;
        this.fullResults = [];
        this.renderedResults = [];
        this.searchTimer = null;
        this.resultEls = [];
        const hasInitialQuery = Boolean(this.queryState.active);
        // SearchCore 唯一查询排序规则：空查询沿用浏览排序；有搜索词默认最佳匹配。
        // 保存一份进入查询前的浏览排序，仅用于清空后恢复；不建立宿主专用开关。
        this._browseSortField = normalizeSortField(options.initialSortField, false, plugin.settings);
        this.sortField = hasInitialQuery ? "relevance" : this._browseSortField;
        this.sortDirection = normalizeSortDirection(options.initialSortDirection);
        this._initialViewportAnchor = normalizeModalViewportAnchor(options.initialViewportAnchor);
        this._resultGeneration = 0;
        this._pendingResultUpdate = null;
        this._resultUpdateQueued = false;
        this.selectedIndex = -1;
        this.loadedPaths = new Set();
        // SearchCore 内所有摘要读取共享一个 I/O 池，避免搜索切换 / 分页时并发倍增。
        this._snippetIoPool = new IoPool(
            plugin.settings.ioConcurrentLimit
        );
        this._confirmSession = null;
        this._destroyed = false; // SearchCore 生命周期：销毁后禁止异步回调继续操作 DOM
        this.selection = new SearchSelectionController(this);
        this.dropdown = new SearchDropdownController(this);
        this.sorting = new SearchSortController(this);
        this.resultControls = new SearchResultControlsController(this);
        this.swipe = new SwipeActionCoordinator(this);
        this.resultRenderer = new SearchResultRendererController(this);
        this.facets = new SearchFacetController(this);
        this.batchMetadata = new BatchMetadataController(this);
        this.createFlow = new SearchCreateController(this);
        this._clearUiRefs();
    }


    _clearUiRefs() {
        for (const key of SEARCH_CORE_UI_REF_KEYS) this[key] = null;
    }


    destroy() {
        if (this._destroyed) return;
        this.plugin.sharedSearchState?.detach(this);
        this.checkpointCreateSession();
        this._destroyed = true;
        this._confirmSession?.finish(false, { force: true, restoreFocus: false });
        this.onStateChange = null;
        this._pendingResultUpdate = null;
        this.plugin._hoverHintObserver?.forgetRoot(this.containerEl);
        this._resultGeneration++;
        this.navigator?.destroy();
        this.navigator = null;
        this.createFlow?.destroy();
        this.createFlow = null;
        this.batchMetadata?.destroy();
        this.batchMetadata = null;
        // Dropdown 关闭时可能触发结果控件同步；先让它完成，再断开 Result Controls / Facet owner。
        this.dropdown.destroy();
        this.sorting?.destroy();
        this.sorting = null;
        this._workbenchToolbar?.remove();
        this._workbenchToolbar = null;
        this.workbenchToolbarHost = null;
        this.workbenchToolsButton = null;
        this.containerEl?.removeClass("has-workbench-toolbar");
        this.resultControls?.destroy();
        this.resultControls = null;
        this.swipe?.destroy();
        this.swipe = null;
        this.resultRenderer?.destroy();
        this.resultRenderer = null;
        this.facets?.destroy();
        this.facets = null;
        this.selection?.destroy();
        this.selection = null;
        this.plugin.activeSearchCores.delete(this);
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
        }
        this.plugin._hoverHintObserver?.forgetRoot(this._popupHost);
        this._popupHost?.remove();
        this._popupHost = null;
        this._initialViewportAnchor = null;
        this.fullResults = [];
        this.renderedResults = [];
        this.resultEls = [];
        this.selectedIndex = -1;
        this.loadedPaths.clear();
        this._clearUiRefs();

        // 外部会话回调只属于当前 SearchCore；销毁后立即断开引用，
        // 避免调用方对象被已关闭搜索会话继续持有。
        this.externalPickHandler = null;
        this.externalOpenFileHandler = null;
        this.externalSelectionHandler = null;
        this.onExternalCreated = null;
        this.externalPathScope = null;
        this.closeAfterFileOpen = null;
        this.onCloseRequest = null;
    }


    close(options = {}) {
        if (this.selection?.busy || this._confirmSession?.busy) {
            new Notice("操作正在执行，请稍候");
            return false;
        }
        if (this._destroyed) return false;
        return this.onCloseRequest(
            options && typeof options === "object" ? options : {}
        );
    }
}

composeClassMethods(SearchCore, [SearchCore_shell_methods, SearchCore_result_menu_events_methods, SearchCore_input_and_filters_methods, SearchCore_file_actions_methods, SearchCore_session_methods, SearchCore_search_and_ranking_methods, SearchCore_open_selection_methods], ["_clearUiRefs","popupSurfaceHost","mountShell","startResults","init","_releaseSearchFocusForControl","_buildSearchHeader","_syncSearchHeaderControls","_syncWorkbenchPresentation","_buildFilterBar","_buildResultShell","_clearSearchContext","_syncResultStateRow","_buildWorkspaceLayout","_getResultFileMenuContext","_openFilesInNewTabs","_buildResultFileMenu","_extendResultFileMenu","_showResultFileMenu","_bindResultEvents","_initializeResultState","_commitSearchInputValue","_bindSearchInput","_applyResultQuickFilter","_applyFacetSelectionToState","_applyFacetSelection","_normalizeTagSelection","_prepareResultVisibility","_isResultMetaVisible","_visibleVaultFileCount","_navigationCandidates","_selectBrowseFolder","_facetUniverse","_facetCandidates","_onFilterChanged","_findCurrentResult","_beginTitleRenameByPath","_startTitleRename","_filesFromPaths","showMovePickerForFiles","moveFiles","_confirmAction","handleSwipeAction","deleteFiles","destroy","close","_captureCurrentModalSession","captureSession","restoreSession","checkpointCreateSession","_notifyStateChange","suspendInteractions","_persistModalSessionSnapshot","_persistCurrentModalView","_shouldCloseAfterFileOpen","_openResultFromSearch","_openedRankMap","_compareResults","_matchCandidate","_rankCandidates","_recomputeCurrentResults","_residentResultKey","_residentResultScope","_refreshCurrentResultsAfterMutation","_queueResultIndexChanges","_scheduleResultIndexUpdate","_commitResultIndexChanges","performSearch","_resolveResultElement","_chooseExternalFile","openSelectedNote","clearSelected"]);

