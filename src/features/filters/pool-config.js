// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { PROPERTY_SHORTCUT_DEFAULT_ICON } from "../../ui/pickers/icon-catalog.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";


// 筛选池固定为四类：共享设置只存顺序、点击模式、展示偏好与候选显隐。
// 候选本体、层级与排序全部复用正式 Facet Picker；新值实时来自 Metadata，不维护第二套树或排序。
// 属性永远只有一个 Pool；属性键与属性值只是该 Pool 内的两级显示偏好。
export const FILTER_POOL_KINDS = Object.freeze(["fileType", "tag", "folder", "property"]);


export const FILTER_POOL_FIXED_DEFS = Object.freeze([
    Object.freeze({ kind: "fileType", label: "文件类型", icon: "files", defaultShowAll: true }),
    Object.freeze({ kind: "tag", label: "标签", icon: "tags", defaultShowAll: false }),
    Object.freeze({ kind: "folder", label: "文件夹", icon: "folder", defaultShowAll: false }),
    Object.freeze({ kind: "property", label: "属性", icon: "list-tree", defaultShowAll: false })
]);


export function normalizeFilterPoolSelectionMode(value) {
    return value === "multi" ? "multi" : "single";
}


export function normalizePropertyPoolEntry(value = {}) {
    const source = value && typeof value === "object" ? value : {};
    return {
        showKey: source.showKey === true,
        pinnedRight: source.pinnedRight === true,
        shortcutIcon: String(source.shortcutIcon || PROPERTY_SHORTCUT_DEFAULT_ICON).trim()
            || PROPERTY_SHORTCUT_DEFAULT_ICON
    };
}


export function normalizePropertyPoolEntries(value) {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    const result = {};
    for (const [rawKey, rawConfig] of Object.entries(source)) {
        const key = String(rawKey || "").trim();
        if (!key) continue;
        result[key] = normalizePropertyPoolEntry(rawConfig);
    }
    return result;
}


export function propertyPoolEntryHasState(entry) {
    return Boolean(entry?.showKey || entry?.pinnedRight);
}


export function filterPoolId(kind) {
    return FILTER_POOL_KINDS.includes(kind) ? kind : "";
}


export function normalizeFilterPoolConfig(value) {
    const source = value && typeof value === "object" ? value : {};
    const kind = FILTER_POOL_KINDS.includes(source.kind) ? source.kind : "";
    const id = filterPoolId(kind);
    if (!id) return null;

    if (kind === "property") {
        return {
            id, kind, key: "", visible: source.visible !== false,
            autoIncludeKeys: source.autoIncludeKeys === true,
            hiddenKeyNames: normalizeUniqueStringList(source.hiddenKeyNames),
            propertyEntries: normalizePropertyPoolEntries(source.propertyEntries)
        };
    }

    const fixed = FILTER_POOL_FIXED_DEFS.find(def => def.kind === kind);
    return {
        id,
        kind,
        key: "",
        visible: source.visible !== false,
        selectionMode: normalizeFilterPoolSelectionMode(source.selectionMode),
        showAllValues: typeof source.showAllValues === "boolean"
            ? source.showAllValues
            : Boolean(fixed?.defaultShowAll),
        hiddenValueKeys: normalizeUniqueStringList(source.hiddenValueKeys),
        visibleValueKeys: normalizeUniqueStringList(source.visibleValueKeys)
    };
}


export function normalizeFilterPools(value) {
    const source = Array.isArray(value) ? value : [];
    const seen = new Set();
    const result = [];

    for (const raw of source) {
        const pool = normalizeFilterPoolConfig(raw);
        if (!pool) continue;

        if (seen.has(pool.id)) continue;
        seen.add(pool.id);
        result.push(pool);
    }

    // 四类筛选池固定存在；缺失项只补成关闭状态。
    // 这样“eye = 开/关”就是唯一生命周期，不再需要添加 / 删除。
    for (const def of FILTER_POOL_FIXED_DEFS) {
        const id = filterPoolId(def.kind);
        if (!id || seen.has(id)) continue;
        const pool = normalizeFilterPoolConfig({
            kind: def.kind,
            visible: false
        });
        if (!pool) continue;
        seen.add(id);
        result.push(pool);
    }

    return result;
}
