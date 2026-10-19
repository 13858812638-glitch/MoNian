// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { composeClassMethods } from "../../core/compose-class-methods.js";
import { collectPropertyKeys } from "../../data/properties/property-catalog.js";
import { PRESENT_PROPERTY_VALUE, buildPropertyUsageStats, isSpecialPropertyValue, propertyValueDisplay } from "../../data/properties/property-values.js";
import { SearchFacetController_folder_colors_methods } from "./folder-colors-methods.js";
import { SearchFacetController_folder_picker_methods } from "./folder-picker-methods.js";
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


// Both method groups remain distinct exports, composed in their original order.
// Instance method owner. `this` is the unchanged SearchFacetController instance. No additional state store.
export const SearchFacetController_picker_model_methods = {


    _syncHeaderCount(header, countProvider) {
        const countEl = header?.count;
        if (!countEl) return;
        const count = typeof countProvider === "function"
            ? countProvider()
            : Number(countProvider) || 0;
        countEl.textContent = String(count);
        countEl.setAttribute("aria-label", `当前文件数 ${count}`);
    },


    _expandTreeAncestors(expanded, path, separator = "/") {
        let current = path;
        while (current) {
            const idx = current.lastIndexOf(separator);
            current = idx >= 0 ? current.slice(0, idx) : "";
            if (current) expanded.add(current);
        }
    },


    _propertyValues(key, candidates = null) {
        const core = this.owner;
        const scope = candidates ?? (core.createFlow?.isCreateView?.()
            ? core._facetCandidates("property", key) : core._navigationCandidates().scope);
        const values = buildPropertyUsageStats(
            scope,
            key,
            core.filterState.properties.get(key),
            core.plugin.propertyCatalogValues(key)
        ).values;
        if (!core.createFlow?.isCreateView?.()) return values;
        return values.filter(value =>
            value !== PRESENT_PROPERTY_VALUE
            && !isSpecialPropertyValue(value)
        );
    },


    _buildPropertyTreeModel(query = "", keys = null, valueProvider = null) {
        const core = this.owner;
        const resolvedKeys = keys ?? core.plugin.propertyCatalogKeys(collectPropertyKeys(
            core.createFlow?.isCreateView?.()
                ? core._facetCandidates("properties") : core._navigationCandidates().scope,
            core.plugin.settings.excludedKeys
        ), core.plugin.settings.excludedKeys);
        const provideValues = valueProvider ?? (key => this._propertyValues(key));

        return resolvedKeys.flatMap(key => {
            const values = provideValues(key);
            const keyMatch = !query || key.toLowerCase().includes(query);
            const matchingValues = query
                ? values.filter(value => propertyValueDisplay(value).toLowerCase().includes(query))
                : values;
            if (query && !keyMatch && !matchingValues.length) return [];
            return [{
                key,
                values,
                visibleValues: query && !keyMatch ? matchingValues : values,
                keyMatch,
                forceExpanded: !!query && (keyMatch || matchingValues.length > 0)
            }];
        });
    },
};


composeClassMethods(SearchFacetController, [SearchFacetController_sidebar_maintenance_methods, SearchFacetController_picker_model_methods, SearchFacetController_tag_picker_methods, SearchFacetController_property_picker_methods, SearchFacetController_type_picker_methods, SearchFacetController_folder_colors_methods, SearchFacetController_folder_picker_methods], ["destroy","openFolderCreateDialog","sidebarMaintenanceModes","canSidebarMaintenance","sidebarMaintenancePresentation","runSidebarMaintenance","_syncHeaderCount","_expandTreeAncestors","_propertyValues","_buildPropertyTreeModel","openTimePicker","openTagPicker","openPropertyPicker","renderPinnedPropertyFilters","openAttachmentTypePicker","buildTypeActions","syncTypeButtons","syncFilterButtons","_resultFolderDefaultColor","_resultFolderColorMap","_refreshResultFolderColorViews","_applyResultFolderPickerColor","_setResultFolderThemeColor","_resetResultFolderColors","_openFolderColorEditor","_showManagedFolderDropdown","showFolderDropdown","updateFolderButton"]);

