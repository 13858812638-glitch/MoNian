// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { FILTER_TOOLBAR_ICON_PRESETS, PROPERTY_SHORTCUT_DEFAULT_ICON, filterToolbarIconCatalog, normalizeRecentIconIds, rememberPickerIcon, resolvePickerIcon } from "./icon-catalog.js";
import { configureSharedPickerHeader, createPickerHeaderIconAction } from "./picker-header.js";
import { activatePickerSearch, createSharedPickerTreeShell } from "./picker-shell.js";
import { createSharedPickerTreeRow } from "./tree-row.js";


export function openFilterToolbarIconPicker(core, {
    anchor,
    propertyKey = "",
    currentIcon = PROPERTY_SHORTCUT_DEFAULT_ICON,
    defaultIcon = PROPERTY_SHORTCUT_DEFAULT_ICON,
    preserveAnchor = false,
    heading = "",
    onSelect = null
} = {}) {
    const key = String(propertyKey || "").trim();
    if (!core || !anchor || !key) return null;
    const fromComposer = Boolean(anchor.closest?.(
        ".local-search-view-composer, .local-search-filter-pool-config-picker"
    ));
    const stableAnchor = preserveAnchor ? anchor : (fromComposer && core.resultControls?.resultViewBtn?.isConnected)
        ? core.resultControls.resultViewBtn
        : (core.propertyFilterBtn?.isConnected ? core.propertyFilterBtn : anchor);
    const panel = core.dropdown.openChild(stableAnchor, `图标 · ${key}`);
    if (!panel) return null;
    panel.addClass("local-search-folder-dropdown", "local-search-picker-dropdown", "local-search-facet-picker");
    panel.dataset.lsIconPicker = "true";
    const catalog = filterToolbarIconCatalog();
    const catalogSet = core.plugin._pickerIconIds = new Set(catalog);
    currentIcon = resolvePickerIcon(core.plugin, currentIcon, defaultIcon);
    const header = configureSharedPickerHeader(panel, {
        headingText: heading || `筛选图标 · ${key}`,
        icon: currentIcon || PROPERTY_SHORTCUT_DEFAULT_ICON
    });
    const { search, list } = createSharedPickerTreeShell(panel, {
        placeholder: "搜索图标名称…", showRoot: false
    });
    const presetSet = new Set(FILTER_TOOLBAR_ICON_PRESETS);
    const submission = core.dropdown.submissionFor(panel);
    const select = (icon, remember = true) => submission.submit(async () => {
        const accepted = await onSelect?.(icon);
        if (accepted === false) return false;
        if (remember) rememberPickerIcon(core.plugin, icon);
        return true;
    }, [...panel.querySelectorAll("button, input")], "图标保存失败，请重试");
    const reset = createPickerHeaderIconAction(header.actions, {
        icon: "rotate-ccw", label: "恢复默认图标", onClick: () => { void select(defaultIcon, false); }
    });
    reset.disabled = currentIcon === defaultIcon;
    const render = () => {
        list.empty();
        const query = search.value.trim().toLowerCase();
        const recent = normalizeRecentIconIds(core.plugin.settings.recentIconIds).filter(id => catalogSet.has(id));
        const groups = query
            ? [{ ids: catalog.filter(id => String(id).toLowerCase().includes(query)), label: "" }]
            : [{ ids: recent, label: "最近使用" }, {
                ids: normalizeUniqueStringList([currentIcon, defaultIcon, ...catalog.filter(id => presetSet.has(id))])
                    .filter(id => !recent.includes(id)), label: recent.length ? "常用图标" : ""
            }];
        let shown = 0;
        for (const group of groups) {
            const visible = group.ids.slice(0, Math.max(0, 96 - shown));
            if (group.label && visible.length) list.createDiv({ cls: "local-search-picker-section-label", text: group.label });
            for (const iconId of visible) {
                createSharedPickerTreeRow(list, {
                    depth: 0, active: iconId === currentIcon,
                    itemTitle: `使用图标 ${iconId}`, icon: iconId, name: iconId,
                    onClick: () => { void select(iconId); }
                });
            }
            shown += visible.length;
        }
        const count = groups.reduce((sum, group) => sum + group.ids.length, 0);
        if (!shown) list.createDiv({ cls: "local-search-empty-hint", text: "没有匹配的图标" });
        else if (count > shown) list.createDiv({ cls: "local-search-empty-hint", text: `继续输入以缩小范围 · ${count} 个匹配` });
    };
    activatePickerSearch(search, { onInput: render, initialRender: render });
    return panel;
}
