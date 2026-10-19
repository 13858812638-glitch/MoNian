// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { getIconIds } from "obsidian";


// 固定属性入口仅是 Filter Pool 属性键配置的展示位置；筛选由 FilterState 独占。
export const PROPERTY_SHORTCUT_DEFAULT_ICON = "list-filter";

// Rail placement is presentation only: applied filters remain owned by FilterState.
// The only right-side presentation is a pin selected in the native Property Picker.
export const FILTER_TOOLBAR_ICON_PRESETS = Object.freeze([
    "folder-kanban", "briefcase-business", "user-round", "users-round",
    "circle-check", "circle-dot", "flag", "tags", "bookmark", "star",
    "calendar-days", "clock-3", "milestone", "target", "layers-3",
    "list-todo", "list-filter", "hash", "link", "package", "building-2",
    "map-pin", "wallet-cards", "badge-check", "chart-no-axes-column"
]);


// One recent history for every consumer of the shared icon library.
export function normalizeRecentIconIds(value) {
    return normalizeUniqueStringList(value).filter(id => /^[a-z0-9][a-z0-9-]{0,79}$/i.test(id)).slice(0, 24);
}


export function resolvePickerIcon(plugin, icon, fallback) {
    if (!icon || !plugin) return fallback;
    // Obsidian's registry includes externally registered addIcon IDs. Refresh
    // on library open, retain unavailable stored IDs, and render a safe default.
    if (!plugin._pickerIconIds) plugin._pickerIconIds = new Set(filterToolbarIconCatalog());
    return plugin._pickerIconIds.has(icon) ? icon : fallback;
}


export function rememberPickerIcon(plugin, icon) {
    if (!plugin?.settings || !icon) return;
    plugin.settings.recentIconIds = normalizeRecentIconIds([icon, ...normalizeRecentIconIds(plugin.settings.recentIconIds)]);
    plugin._throttleSaveActivity?.();
}


export function filterToolbarIconCatalog() {
    let ids = [];
    try {
        ids = typeof getIconIds === "function" ? getIconIds() : [];
    } catch (_) {}
    return normalizeUniqueStringList([
        ...FILTER_TOOLBAR_ICON_PRESETS,
        ...(Array.isArray(ids) ? ids : [])
    ]);
}
