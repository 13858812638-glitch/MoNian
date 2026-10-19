// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { createPickerRowAction } from "../../ui/pickers/tree-row.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { isSameOrDescendantVaultPath, normalizeVaultFolderPath } from "../../utils/vault-paths.js";
import { Notice } from "obsidian";


export function normalizeExcludedFolders(values) {
    const normalized = normalizeUniqueStringList(values)
        .map(normalizeVaultFolderPath)
        .filter(Boolean)
        .sort((a, b) =>
            a.localeCompare(b, "zh-Hans-CN", { numeric: true })
        );

    const result = [];
    for (const path of normalized) {
        if (result.some(parent =>
            isSameOrDescendantVaultPath(path, parent)
        )) {
            continue;
        }
        result.push(path);
    }
    return result;
}


export function isFolderExclusionInherited(path, selectedPaths) {
    const selected = selectedPaths instanceof Set
        ? selectedPaths
        : new Set(normalizeExcludedFolders(selectedPaths));
    let current = String(path || "");

    while (current.includes("/")) {
        current = current.slice(0, current.lastIndexOf("/"));
        if (selected.has(current)) return true;
    }
    return false;
}


export function toggleFolderExclusionSelection(selectedPaths, folderPath) {
    const selected = normalizeExcludedFolders([...selectedPaths]);
    const path = normalizeVaultFolderPath(folderPath);
    if (!path || isFolderExclusionInherited(path, selected)) return selected;
    return normalizeExcludedFolders(selected.includes(path)
        ? selected.filter(value => value !== path)
        : [...selected, path]);
}



// One folder-exclusion behavior; the caller supplies its authoritative setting.
// The controller owns no copied selection and never writes another caller's scope.
export function createFolderExclusionController({ read, write, isLive = () => true, onChange = () => {}, excludeLabel = "排除文件夹", restoreLabel = "恢复显示" }) {
    let pending = false;
    const paths = () => normalizeExcludedFolders(read());
    const state = path => {
        const current = new Set(paths());
        const explicit = !!path && path !== "/" && current.has(path);
        const inherited = !!path && path !== "/" && isFolderExclusionInherited(path, current);
        return { explicit, inherited, hidden: explicit || inherited };
    };
    const commit = async next => {
        if (pending || !isLive()) return false;
        pending = true;
        try { await write(normalizeExcludedFolders(next)); return true; }
        catch (error) { if (isLive()) new Notice(`排除设置保存失败：${error?.message || error}`); return false; }
        finally { pending = false; if (isLive()) onChange(); }
    };
    const toggle = path => !path || path === "/" || state(path).inherited
        ? Promise.resolve(false) : commit(toggleFolderExclusionSelection(paths(), path));
    return {
        paths, state, toggle,
        clear: () => commit([]), remove: path => commit(paths().filter(value => value !== path)),
        renderAction(row, path) {
            if (!path || path === "/") return;
            const value = state(path), name = path.split("/").pop() || path;
            const action = createPickerRowAction(row, {
                icon: value.hidden ? "eye-off" : "eye",
                label: value.inherited ? `${name} 随上级排除` : `${value.explicit ? restoreLabel : excludeLabel} ${name}`,
                onClick: () => { void toggle(path); }
            });
            action.disabled = value.inherited;
        }
    };
}
