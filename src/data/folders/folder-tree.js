// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { isSameOrDescendantVaultPath } from "../../utils/vault-paths.js";
import { sortByPreferredOrder } from "../../utils/preferred-order.js";
import { TFolder } from "obsidian";



// ========== 共享文件夹 Picker：搜索弹窗与当前文件命令使用同一 DOM / 行模型 ==========
export function sharedFolderChildren(app, plugin, folder, {
    includeExcluded = false,
    showProtectedMetadata = false
} = {}) {
    const metadataPath = showProtectedMetadata ? plugin?._metadataDirectory?.() || "" : "";
    const excludedByUser = path => (plugin?.settings?.excludedFolders || []).some(
        excluded => isSameOrDescendantVaultPath(path, excluded)
    );
    const children = (folder?.children || [])
        .filter(child => {
            if (!(child instanceof TFolder)) return false;
            if (includeExcluded) return true;
            // The private GLS metadata directory is not an index source, but
            // it is a real Vault folder and must stay visible in navigation.
            // Explicit user-wide exclusions still own their complete subtree.
            if (showProtectedMetadata && metadataPath
                && isSameOrDescendantVaultPath(child.path, metadataPath)
                && !excludedByUser(child.path)) return true;
            return !plugin.isPathExcluded(child.path);
        });
    return sortByPreferredOrder(
        children,
        plugin?.settings?.pickerFolderOrder || [],
        child => child.path
    );
}


export function comparePickerTreePaths(a, b, order = new Map()) {
    const aPath = String(a || "");
    const bPath = String(b || "");
    if (aPath === bPath) return 0;
    if (aPath === "/") return -1;
    if (bPath === "/") return 1;
    const aParts = aPath.split("/").filter(Boolean);
    const bParts = bPath.split("/").filter(Boolean);
    const depth = Math.min(aParts.length, bParts.length);
    let aPrefix = "";
    let bPrefix = "";

    for (let index = 0; index < depth; index++) {
        aPrefix = aPrefix ? `${aPrefix}/${aParts[index]}` : aParts[index];
        bPrefix = bPrefix ? `${bPrefix}/${bParts[index]}` : bParts[index];
        if (aPrefix === bPrefix) continue;

        const ai = order.has(aPrefix)
            ? order.get(aPrefix)
            : Number.MAX_SAFE_INTEGER;
        const bi = order.has(bPrefix)
            ? order.get(bPrefix)
            : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;

        const siblingCompare = String(aParts[index]).localeCompare(
            String(bParts[index]),
            "zh-Hans-CN",
            { numeric: true }
        );
        if (siblingCompare) return siblingCompare;

        const pathCompare = aPrefix.localeCompare(
            bPrefix,
            "zh-Hans-CN",
            { numeric: true }
        );
        if (pathCompare) return pathCompare;
    }

    // 同一路径前缀下，父节点在其后代之前，保持 Picker 的深度优先顺序。
    if (aParts.length !== bParts.length) {
        return aParts.length - bParts.length;
    }
    return aPath.localeCompare(bPath, "zh-Hans-CN", { numeric: true });
}


export function orderFolderSelectionsForPicker(plugin, paths = []) {
    const selected = normalizeUniqueStringList([...(paths || [])]);
    if (!selected.length) return [];

    // 只对“已选路径”做层级比较，不再为几个 Chip 遍历整个 Vault 文件夹树。
    // 比较器直接复用 pickerFolderOrder 的 sibling 优先级 + 路径层级，
    // 因而与共享文件夹 Picker 的深度优先显示顺序保持一致。
    const order = new Map(
        normalizeUniqueStringList(plugin?.settings?.pickerFolderOrder)
            .map((key, index) => [key, index])
    );
    return selected.sort((a, b) => comparePickerTreePaths(a, b, order));
}


export function sharedFolderAncestors(path) {
    const paths = [];
    let current = path || "";
    while (current) {
        paths.push(current);
        const idx = current.lastIndexOf("/");
        current = idx >= 0 ? current.slice(0, idx) : "";
    }
    return paths;
}


export function createSharedFolderCountProvider(candidates) {
    const source = Array.isArray(candidates) ? candidates : [];
    const counts = new Map();
    let rootCount = 0;

    for (const meta of source) {
        const path = meta?.path || "";
        if (!path) continue;
        const slash = path.lastIndexOf("/");
        if (slash < 0) {
            rootCount++;
            continue;
        }
        let folder = path.slice(0, slash);
        while (folder) {
            counts.set(folder, (counts.get(folder) || 0) + 1);
            const parentSlash = folder.lastIndexOf("/");
            folder = parentSlash >= 0 ? folder.slice(0, parentSlash) : "";
        }
    }

    return path => {
        if (!path) return source.length;
        if (path === "/") return rootCount;
        return counts.get(path) || 0;
    };
}


// Folder navigation is a structural browser: use the actual Vault file tree,
// never a filtered result/facet set. A single provider owns the two counts.
// Caller may exclude explicit global-disabled branches; result-only exclusions
// must not remove physical folders or alter the navigation figures.
export function createSharedFolderDirectAndRecursiveCounts(files = []) {
    const direct = new Map();
    const recursive = new Map();
    let rootDirect = 0;
    let rootTotal = 0;
    for (const file of files) {
        const path = String(file?.path || "");
        if (!path) continue;
        rootTotal++;
        const slash = path.lastIndexOf("/");
        if (slash < 0) { rootDirect++; continue; }
        let folder = path.slice(0, slash);
        direct.set(folder, (direct.get(folder) || 0) + 1);
        while (folder) {
            recursive.set(folder, (recursive.get(folder) || 0) + 1);
            const last = folder.lastIndexOf("/");
            folder = last < 0 ? "" : folder.slice(0, last);
        }
    }
    return path => path === "/" || !path
        ? { direct: rootDirect, total: rootTotal }
        : { direct: direct.get(path) || 0, total: recursive.get(path) || 0 };
}

export function formatSharedFolderDirectAndRecursiveCount(count = {}) {
    const direct = Math.max(0, Number(count.direct) || 0);
    const total = Math.max(0, Number(count.total) || 0);
    return direct === total ? String(total) : `${direct} · ${total}`;
}

// Also used by the existing folder Picker: a collapsed folder cannot have an
// open-folder glyph merely because it is a folder.
export function sharedFolderDisplayIcon(hasChildren, expanded) {
    return hasChildren && expanded ? "folder-open" : "folder-closed";
}
