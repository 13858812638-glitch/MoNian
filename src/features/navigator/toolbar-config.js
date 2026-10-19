// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { PROPERTY_SHORTCUT_DEFAULT_ICON, resolvePickerIcon } from "../../ui/pickers/icon-catalog.js";
import { sortByPreferredOrder } from "../../utils/preferred-order.js";
import { FILTER_POOL_FIXED_DEFS, FILTER_POOL_KINDS, normalizeFilterPools, normalizePropertyPoolEntries } from "../filters/pool-config.js";


// Toolbar IDs are presentation preferences only. Version 2 keeps an explicit
// membership/order and a separate hidden list: remove, hide and add are distinct.
export const NAVIGATOR_TOOLBAR_CONTEXTS = Object.freeze({
    filters: { label: "筛选导航", order: ["collapse", "results", "view", "history", "create", "sort-navigation"], hidden: ["sort-navigation"] },
    results: { label: "搜索结果", order: ["search", "filters", "sort", "view", "batch", "create"], hidden: [] },
    create: { label: "创建文件", order: ["search", "filters", "create"], hidden: [] }
});

export const NAVIGATOR_TOOLBAR_ACTIONS = Object.freeze({
    collapse: { label: "折叠 / 展开导航", icon: "chevrons-down-up" },
    results: { label: "查看结果", icon: "eye" },
    history: { label: "搜索历史", icon: "history" },
    create: { label: "创建 / 退出创建", icon: "file-plus" },
    "sort-navigation": { label: "侧栏工具", icon: "list-tree" },
    search: { label: "显示 / 收起搜索框", icon: "search" },
    filters: { label: "返回筛选导航", icon: "list-filter" },
    sort: { label: "结果排序", icon: "arrow-down-wide-narrow" },
    view: { label: "视图设置", icon: "sliders-horizontal" },
    time: { label: "时间范围", icon: "calendar-range" },
    "filter-pools": { label: "筛选池设置", icon: "list-filter" },
    batch: { label: "批量操作", icon: "list-checks" }
});

export function navigatorToolbarActionIdIsValid(id) {
    return typeof id === "string" && (Object.hasOwn(NAVIGATOR_TOOLBAR_ACTIONS, id)
        || (id.startsWith("pool:") && FILTER_POOL_KINDS.includes(id.slice(5)))
        || (id.startsWith("property:") && id.slice(9).trim() === id.slice(9) && id.length > 9));
}

export function navigatorToolbarActionAvailable(id, context) {
    // Search-only controls have no draft-creation equivalent. Retain an older
    // configuration, but do not offer a new command that cannot act on this page.
    return context !== "create" || !["time", "sort"].includes(id);
}

export function navigatorToolbarCatalog(plugin, { propertyKeys = [] } = {}) {
    const catalog = new Map(Object.entries(NAVIGATOR_TOOLBAR_ACTIONS));
    for (const def of FILTER_POOL_FIXED_DEFS) catalog.set(`pool:${def.kind}`, {
        label: `${def.label}筛选`, icon: def.icon, kind: "pool", poolKind: def.kind
    });
    const settings = plugin?.settings || {};
    const propertyPool = normalizeFilterPools(settings.filterPools).find(pool => pool.kind === "property");
    const entries = normalizePropertyPoolEntries(propertyPool?.propertyEntries);
    const excluded = new Set(settings.excludedKeys || []);
    // The existing property Picker owns keys/icons. A configured bottom shortcut
    // remains usable after its independent right-hand pin is removed.
    const storedKeys = Object.values(settings.navigatorToolbars || {}).flatMap(config =>
        Array.isArray(config?.order) ? config.order.filter(id => typeof id === "string" && id.startsWith("property:")).map(id => id.slice(9)) : []);
    const keys = sortByPreferredOrder([...new Set([
        ...Object.entries(entries).filter(([, entry]) => entry.pinnedRight).map(([key]) => key),
        ...propertyKeys,
        ...storedKeys
    ])].filter(key => key && !excluded.has(key)), settings.pickerPropertyOrder, key => key);
    for (const key of keys) catalog.set(`property:${key}`, {
        label: key, icon: entries[key]?.shortcutIcon || PROPERTY_SHORTCUT_DEFAULT_ICON,
        kind: "property", propertyKey: key
    });
    return catalog;
}

export function normalizeNavigatorToolbars(raw) {
    const result = {};
    for (const [context, defaults] of Object.entries(NAVIGATOR_TOOLBAR_CONTEXTS)) {
        const input = raw && typeof raw === "object" && !Array.isArray(raw)
            && raw[context] && typeof raw[context] === "object" && !Array.isArray(raw[context])
            ? raw[context] : {};
        const hasOrder = Array.isArray(input.order);
        const storedOrder = hasOrder ? input.order.map(id => id === "manage" ? "view" : id).filter(navigatorToolbarActionIdIsValid) : [];
        const order = [...new Set(input.version === 2 && hasOrder
            ? storedOrder : [...storedOrder, ...defaults.order])];
        const valid = new Set(order);
        const hidden = new Set((Array.isArray(input.hidden) ? input.hidden : defaults.hidden)
            .map(id => id === "manage" ? "view" : id).filter(id => valid.has(id)));
        // Two formerly separate entries may map to View settings. Keep the
        // merged entry visible if either configured launch action was visible.
        if (hasOrder && input.order.includes("manage") && input.order.includes("view")) {
            const originalHidden = new Set(Array.isArray(input.hidden) ? input.hidden : defaults.hidden);
            if (!originalHidden.has("manage") || !originalHidden.has("view")) hidden.delete("view");
        }
        // Newly introduced optional actions stay opt-in when older preferences
        // did not know them. Explicitly visible known actions remain visible.
        if (input.version !== 2) for (const id of defaults.hidden) if (!storedOrder.includes(id)) hidden.add(id);
        const storedIcons = input.icons && typeof input.icons === "object" && !Array.isArray(input.icons) ? input.icons : {};
        const icons = {};
        for (const id of order) {
            const icon = storedIcons[id] || (id === "view" ? storedIcons.manage : "");
            if (typeof icon === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/i.test(icon)) icons[id] = icon;
        }
        result[context] = { version: 2, order, hidden: order.filter(id => hidden.has(id)), icons };
    }
    return result;
}

export function navigatorToolbarIcon(core, id, fallback, preferences = null) {
    const nav = core?.navigator;
    if (!nav || nav.layout !== "mobile") return fallback;
    const context = nav.page === "filters" ? "filters" : core.createFlow?.isCreateView?.() ? "create" : "results";
    const config = preferences || normalizeNavigatorToolbars(core.plugin.settings.navigatorToolbars)[context];
    return resolvePickerIcon(core.plugin, config.icons[id], fallback);
}


export const NAVIGATOR_VISIBLE_SECTION_DEFS = Object.freeze([
    { id: "folder", label: "文件夹", icon: "folder" },
    { id: "tags", label: "标签", icon: "tags" },
    { id: "properties", label: "属性", icon: "list-tree" },
    // Person/team ownership belongs to ordinary metadata properties, not a built-in section.
]);

export function normalizeNavigatorVisibleSections(value) {
    const allowed = new Set(NAVIGATOR_VISIBLE_SECTION_DEFS.map(def => def.id));
    return Array.isArray(value)
        ? [...new Set(value.filter(id => allowed.has(id)))]
        : [...allowed];
}


export function normalizeNavigatorTimeField(field) {
    return ["created", "modified", "fileModified"].includes(field) ? field : "created";
}
