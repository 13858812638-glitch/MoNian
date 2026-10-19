// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { isExcalidrawMeta } from "../../data/formats/drawing-detection.js";
import { isDomHTMLElement } from "../../utils/dom.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { configureSharedPickerHeader } from "./picker-header.js";
import { createSharedPickerTreeShell } from "./picker-shell.js";
import { createPickerRowAction, createSharedPickerTreeRow } from "./tree-row.js";


export function createTemplateFilesForType(app, type) {
    const allFiles = app?.vault?.getFiles?.() || [];
    if (type === "canvas") {
        return allFiles.filter(file => file.extension.toLowerCase() === "canvas");
    }
    if (type === "excalidraw") {
        return allFiles.filter(file =>
            isExcalidrawMeta(file, app.metadataCache.getFileCache(file))
        );
    }
    return allFiles.filter(file =>
        file.extension.toLowerCase() === "md"
        && !isExcalidrawMeta(file, app.metadataCache.getFileCache(file))
    );
}


export function orderTemplateFilesForPicker(files, favoritePaths) {
    const favorites = new Set(normalizeUniqueStringList(favoritePaths));
    return [...files].sort((a, b) => {
        const af = favorites.has(a.path);
        const bf = favorites.has(b.path);
        if (af !== bf) return af ? -1 : 1;
        return a.path.localeCompare(b.path, "zh-Hans-CN", { numeric: true });
    });
}


export function openTemplateFilePicker(core, {
    anchor,
    type,
    label,
    icon,
    title = `${label} 模板`,
    child = false,
    panelClasses = "",
    getSelection = () => ({ enabled: false, path: "" }),
    onSelect = null
} = {}) {
    if (!core?.dropdown || !isDomHTMLElement(anchor)) return null;
    const panel = child
        ? core.dropdown.openChild(anchor, title)
        : core.dropdown.open(anchor, title);
    if (!panel) return null;

    panel.addClass(
        "local-search-picker-dropdown",
        "local-search-facet-picker"
    );
    for (const cls of String(panelClasses || "").split(/\s+/).filter(Boolean)) {
        panel.addClass(cls);
    }

    configureSharedPickerHeader(panel, {
        headingText: title,
        icon
    });
    const { search, list } = createSharedPickerTreeShell(panel, {
        placeholder: "搜索模板文件…",
        showRoot: false
    });

    // Vault 扫描只在 Picker 打开时执行一次；搜索只过滤内存数组，收藏变化时才重排一次。
    const files = createTemplateFilesForType(core.app, type);
    let orderedFiles = [];
    const refreshOrder = () => {
        orderedFiles = orderTemplateFilesForPicker(
            files,
            core.plugin.settings.favoriteTemplatePaths
        );
    };
    refreshOrder();

    const choose = async selection => {
        core.dropdown.close(false);
        await onSelect?.({
            enabled: !!selection?.enabled,
            path: selection?.enabled ? String(selection?.path || "") : ""
        });
    };

    const render = () => {
        list.empty();
        const query = search.value.trim().toLocaleLowerCase("zh-CN");
        const selection = getSelection?.() || { enabled: false, path: "" };
        const currentPath = String(selection.path || "");
        const favorites = normalizeUniqueStringList(
            core.plugin.settings.favoriteTemplatePaths
        );
        const favoriteSet = new Set(favorites);

        if (!query || "不使用模板".includes(query)) {
            createSharedPickerTreeRow(list, {
                active: !selection.enabled,
                icon: "ban",
                name: "不使用模板",
                itemTitle: child
                    ? `新建 ${label} 时不使用模板`
                    : `本次新建 ${label} 不使用模板`,
                onClick: () => void choose({ enabled: false, path: "" }),
                restoreFocus: false
            });
        }

        const rows = orderedFiles.filter(file =>
            !query
            || file.name.toLocaleLowerCase("zh-CN").includes(query)
            || file.path.toLocaleLowerCase("zh-CN").includes(query)
        );

        for (const file of rows) {
            const favorite = favoriteSet.has(file.path);
            createSharedPickerTreeRow(list, {
                active: !!selection.enabled && currentPath === file.path,
                icon,
                name: file.basename || file.name,
                itemTitle: file.path,
                onClick: () => void choose({ enabled: true, path: file.path }),
                renderTrailing: row => {
                    const favoriteAction = createPickerRowAction(row, {
                        icon: "star",
                        label: favorite
                            ? `取消收藏模板 ${file.basename || file.name}`
                            : `收藏模板 ${file.basename || file.name}`,
                        onClick: () => {
                            const current = normalizeUniqueStringList(
                                core.plugin.settings.favoriteTemplatePaths
                            );
                            core.plugin.settings.favoriteTemplatePaths = favorite
                                ? current.filter(path => path !== file.path)
                                : normalizeUniqueStringList([...current, file.path]);
                            void core.plugin.saveSettings();
                            refreshOrder();
                            render();
                            core.dropdown.reposition();
                        }
                    });
                    favoriteAction.classList.add("is-template-favorite-action");
                    favoriteAction.classList.toggle("is-selected", favorite);
                    favoriteAction.setAttribute("aria-pressed", String(favorite));
                },
                restoreFocus: false
            });
        }

        if (!rows.length && query) {
            list.createDiv({
                cls: "local-search-empty-hint",
                text: "没有匹配的模板文件"
            });
        }
    };

    search.addEventListener("input", render);
    render();
    return panel;
}
