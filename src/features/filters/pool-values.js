// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { RESULT_FILE_TYPE_ACTIONS } from "../../data/formats/file-types.js";
import { propertyValueKey, propertyValuePlainDisplay } from "../../data/properties/property-values.js";
import { NO_TAGS_FILTER_VALUE, tagIdentityKey } from "../../data/tags/tag-values.js";
import { normalizeVaultFolderPath } from "../../utils/vault-paths.js";
import { FILTER_POOL_FIXED_DEFS, normalizePropertyPoolEntry } from "./pool-config.js";


export function filterPoolLabel(pool) {
    if (!pool) return "筛选池";
    return FILTER_POOL_FIXED_DEFS.find(def => def.kind === pool.kind)?.label || "筛选池";
}


export function filterPoolIcon(pool) {
    return pool?.icon || FILTER_POOL_FIXED_DEFS.find(def => def.kind === pool?.kind)?.icon || "filter";
}


export function filterPoolValueKey(pool, value) {
    if (!pool) return "";
    if (pool.kind === "property") return propertyValueKey(value);
    if (pool.kind === "tag") {
        return value === NO_TAGS_FILTER_VALUE
            ? NO_TAGS_FILTER_VALUE
            : tagIdentityKey(value);
    }
    if (pool.kind === "folder") {
        const raw = String(value || "").trim();
        return raw === "/" ? "/" : normalizeVaultFolderPath(raw);
    }
    return String(value || "").trim().toLowerCase();
}


export function filterPoolValueDisplay(pool, value) {
    if (!pool) return String(value || "");
    if (pool.kind === "property") return propertyValuePlainDisplay(value);
    if (pool.kind === "tag") {
        return value === NO_TAGS_FILTER_VALUE ? "没有标签" : String(value || "");
    }
    if (pool.kind === "folder") {
        return value === "/" ? "根目录" : String(value || "");
    }
    const def = RESULT_FILE_TYPE_ACTIONS.find(item => item.value === value);
    return def?.label || String(value || "");
}


export function filterPoolValueVisible(pool, key) {
    if (pool?.kind === "property") return false;
    const valueKey = String(key || "");
    if (!valueKey) return false;
    if (pool?.showAllValues) {
        return !(pool.hiddenValueKeys || []).includes(valueKey);
    }
    return (pool?.visibleValueKeys || []).includes(valueKey);
}


export function propertyPoolEntry(pool, key) {
    const propertyKey = String(key || "").trim();
    if (!propertyKey || pool?.kind !== "property") {
        return normalizePropertyPoolEntry();
    }
    return normalizePropertyPoolEntry(
        pool.propertyEntries?.[propertyKey]
    );
}


export function propertyPoolKeyVisible(pool, key) {
    if (pool?.autoIncludeKeys) return !(pool.hiddenKeyNames || []).includes(key);
    return propertyPoolEntry(pool, key).showKey;
}
