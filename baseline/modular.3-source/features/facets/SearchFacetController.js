// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { composeClassMethods } from "../../core/compose-class-methods.js";
import { SearchFacetController_folder_colors_methods } from "./folder-colors-methods.js";
import { SearchFacetController_folder_picker_methods } from "./folder-picker-methods.js";
import { SearchFacetController_picker_model_methods } from "./picker-model-methods.js";
import { SearchFacetController_property_picker_methods } from "./property-picker-methods.js";
import { SearchFacetController_sidebar_maintenance_methods } from "./sidebar-maintenance-methods.js";
import { SearchFacetController_tag_picker_methods } from "./tag-picker-methods.js";
import { SearchFacetController_type_picker_methods } from "./type-picker-methods.js";



// ========== SearchFacetController：筛选 Picker / 筛选按钮 UI 的唯一工作流 ==========
export class SearchFacetController {

    constructor(owner) {
        this.owner = owner;
    }


    destroy() {
        this.owner = null;
    }
}

composeClassMethods(SearchFacetController, [SearchFacetController_sidebar_maintenance_methods, SearchFacetController_picker_model_methods, SearchFacetController_tag_picker_methods, SearchFacetController_property_picker_methods, SearchFacetController_type_picker_methods, SearchFacetController_folder_colors_methods, SearchFacetController_folder_picker_methods], ["destroy","sidebarMaintenanceModes","canSidebarMaintenance","sidebarMaintenancePresentation","runSidebarMaintenance","_syncHeaderCount","_expandTreeAncestors","_propertyValues","_buildPropertyTreeModel","openTimePicker","openTagPicker","openPropertyPicker","renderPinnedPropertyFilters","openAttachmentTypePicker","buildTypeActions","syncTypeButtons","syncFilterButtons","_resultFolderDefaultColor","_resultFolderColorMap","_refreshResultFolderColorViews","_applyResultFolderPickerColor","_setResultFolderThemeColor","_resetResultFolderColors","_openFolderColorEditor","_showManagedFolderDropdown","showFolderDropdown","updateFolderButton"]);

