// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { collectPropertyKeys } from "../../data/properties/property-catalog.js";
import { PRESENT_PROPERTY_VALUE, buildPropertyUsageStats, isSpecialPropertyValue, propertyValueDisplay } from "../../data/properties/property-values.js";
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
        const scope = candidates ?? core._facetCandidates("property", key);
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
            core._facetCandidates("properties"),
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

