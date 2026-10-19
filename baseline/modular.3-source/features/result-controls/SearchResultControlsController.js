// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { composeClassMethods } from "../../core/compose-class-methods.js";
import { VIEW_COMPOSER_SECTION_IDS } from "../results/view-config.js";
import { SearchResultControlsController_filter_pool_editor_methods } from "./filter-pool-editor-methods.js";
import { SearchResultControlsController_search_history_methods } from "./search-history-methods.js";
import { SearchResultControlsController_toolbar_methods } from "./toolbar-methods.js";
import { SearchResultControlsController_view_composer_methods } from "./view-composer-methods.js";


// ========== Result Controls：排序 / 搜索记录 / 结果视图 UI 唯一实现 ==========
export class SearchResultControlsController {

    constructor(owner) {
        this.owner = owner;
        this.createNoteBtn = null;
        this.historyBtn = null;
        this.resultViewBtn = null;
        this.searchResultControlsHost = null;
        this.viewComposerCollapsed = new Set(VIEW_COMPOSER_SECTION_IDS);
    }


    destroy() {
        this.createNoteBtn = null;
        this.historyBtn = null;
        this.resultViewBtn = null;
        this.searchResultControlsHost = null;
        this.viewComposerCollapsed.clear();
        this.owner = null;
    }
}

composeClassMethods(SearchResultControlsController, [SearchResultControlsController_toolbar_methods, SearchResultControlsController_filter_pool_editor_methods, SearchResultControlsController_view_composer_methods, SearchResultControlsController_search_history_methods], ["destroy","ownsAnchor","buildHost","_createInputAction","buildToolbar","activeViewId","activeViewConfig","filterPools","_filterPoolUniverse","_filterPoolHeaderCatalog","_filterPoolEntries","_filterPoolDisplayEntries","_filterPoolById","_isFilterPoolValueVisible","_toggleFilterPoolValueVisibility","_filterPoolCandidateKeys","_filterPoolCandidateBulkAction","_setFilterPoolCandidateVisibility","_isPropertyPoolKeyVisible","_updatePropertyPoolEntry","_togglePropertyPoolKeyVisibility","_openFilterPoolEditor","_openFileTypeChoicePicker","_openFileTypeFilterPoolPicker","_filterPoolSelectionMode","_migrateFilterPoolSelectionMode","_attachFilterPoolSelectionModeControl","_isFilterPoolValueActive","_toggleFilterPoolValue","refreshFilterPoolHeader","syncViewMode","syncInputActions","_openNavigatorToolbarPicker","_renderNavigatorPresentationSettings","openViewDropdown","openGlobalExcludedFolderPicker","applyViewSettings","sync","openHistoryDropdown","_renderHistoryList","_applyHistoryQuery"]);

