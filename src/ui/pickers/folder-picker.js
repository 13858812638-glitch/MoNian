// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { sharedFolderAncestors, sharedFolderChildren, sharedFolderDisplayIcon } from "../../data/folders/folder-tree.js";
import { captureScrollableAnchor, rerenderPickerListPreservingScroll, restoreScrollableAnchor, revealScrollableKey, syncSharedPickerTreeRowSelection } from "../../interactions/scroll-anchor.js";
import { remapPreferredPathOrder } from "../../utils/preferred-order.js";
import { createPickerAutoLocateScheduler, createSharedPickerTreeShell } from "./picker-shell.js";
import { createSharedPickerTreeRow } from "./tree-row.js";
import { TFolder } from "obsidian";


export function renderSharedFolderTreePicker({
    app,
    plugin,
    panel,
    searchPlaceholder = "搜索文件夹…",
    expanded = new Set(),
    selectedPath = "",
    selectedPaths = null,
    rootPath = "",
    rootLabel = "仓库根目录",
    rootIcon = "vault",
    badgeFor = () => "",
    isActivePath = null,
    iconForPath = null,
    onChoose,
    onToggleChoose = null,
    renderTrailingForPath = null,
    includeExcluded = false,
    rootInTree = false,
    autoLocate = false
}) {
    const root = app.vault.getRoot();
    const { search, rootHost, list } = createSharedPickerTreeShell(panel, {
        placeholder: searchPlaceholder,
        rootClasses: "local-search-folder-root",
        treeClasses: "local-search-folder-tree",
        showRoot: !rootInTree
    });

    const queueAutoLocate = createPickerAutoLocateScheduler(panel, list);
    const selectedSet = selectedPaths instanceof Set
        ? selectedPaths
        : new Set(selectedPath ? [selectedPath] : []);
    const activeForPath = path => typeof isActivePath === "function"
        ? Boolean(isActivePath(path))
        : selectedSet.has(path);

    const includeExcludedFolders = () =>
        typeof includeExcluded === "function"
            ? Boolean(includeExcluded())
            : Boolean(includeExcluded);
    const folderChildren = folder => sharedFolderChildren(
        app,
        plugin,
        folder,
        { includeExcluded: includeExcludedFolders() }
    );

    const matches = (folder, q) => !q
        || folder.path.toLowerCase().includes(q)
        || folder.name.toLowerCase().includes(q);

    const hasMatchingDescendant = (folder, q) => {
        if (!q) return false;
        const stack = [...folderChildren(folder)];
        while (stack.length) {
            const child = stack.pop();
            if (matches(child, q)) return true;
            stack.push(...folderChildren(child));
        }
        return false;
    };

    const addRow = (host, folder, depth, forceExpanded = false, isRoot = false) => {
        const children = isRoot ? [] : folderChildren(folder);
        const hasChildren = children.length > 0;
        const path = isRoot ? rootPath : folder.path;
        const isExpanded = forceExpanded || expanded.has(folder.path);
        const active = activeForPath(path);
        const parentPath = !isRoot && folder?.parent instanceof TFolder
            ? folder.parent.path
            : "";
        const grandParentPath = !isRoot && folder?.parent?.parent instanceof TFolder
            ? folder.parent.parent.path
            : "";
        const defaultIcon = isRoot
            ? rootIcon
            :sharedFolderDisplayIcon(hasChildren, isExpanded);
        const icon = typeof iconForPath === "function"
            ? (iconForPath({
                path,
                folder,
                isRoot,
                active,
                hasChildren,
                expanded: isExpanded,
                defaultIcon
            }) || defaultIcon)
            : defaultIcon;
        const rendered = createSharedPickerTreeRow(host, {
            depth,
            rowClasses: "",
            sortKey: isRoot ? "" : folder.path,
            sortParent: parentPath,
            sortPromoteParent: grandParentPath,
            sortName: isRoot ? rootLabel : folder.name,
            sortDisabled: isRoot,
            active,
            hasChildren,
            expanded: isExpanded,
            toggleTitle: hasChildren ? "展开/折叠" : "",
            itemTitle: isRoot ? rootLabel : folder.path,
            icon,
            name: isRoot ? rootLabel : folder.name,
            count: badgeFor(path),
            countClasses: "local-search-folder-count",
            countPlacement: "row-end",
            onToggle: () => {
                expanded.has(folder.path)
                    ? expanded.delete(folder.path)
                    : expanded.add(folder.path);
                rerenderPickerListPreservingScroll(list, render);
            },
            onIconClick: typeof onToggleChoose === "function"
                ? () => onToggleChoose(path)
                : null,
            onClick: () => onChoose(path),
            renderTrailing: typeof renderTrailingForPath === "function"
                ? row => renderTrailingForPath(row, {
                    path,
                    folder,
                    isRoot,
                    active
                })
                : null
        });
        rendered.row.dataset.pickerValue = path;
        return rendered;
    };

    const renderBranch = (folder, depth, q) => {
        for (const child of folderChildren(folder)) {
            const descMatch = hasMatchingDescendant(child, q);
            const selfMatch = matches(child, q);
            if (q && !selfMatch && !descMatch) continue;
            const forceExpanded = !!q && descMatch;
            addRow(list, child, depth, forceExpanded);
            if (folderChildren(child).length && (q ? forceExpanded : expanded.has(child.path))) {
                renderBranch(child, depth + 1, q);
            }
        }
    };

    const render = (locate = false) => {
        rootHost?.empty();
        list.empty();

        const q = search.value.trim().toLowerCase();
        if (rootInTree) {
            addRow(list, root, 0, false, true);
        } else if (rootHost) {
            addRow(rootHost, root, 0, false, true);
        }

        renderBranch(root, 0, q);

        if (
            locate && autoLocate
            && !q
            && (
                selectedPath
                || selectedSet.size > 0
            )
        ) {
            queueAutoLocate(() => {
                if (!panel.isConnected || search.value.trim()) return;
                const row = list.querySelector(".is-selected[data-picker-key]");
                if (row?.dataset.pickerKey) revealScrollableKey(list, row.dataset.pickerKey);
            });
        }
    };

    search.addEventListener("input", () => render());
    render(true);
    const rerender = (change = null) => {
        const anchor = captureScrollableAnchor(list);
        if (change?.oldPath) {
            const { oldPath, newPath } = change;
            for (const paths of [expanded, selectedSet]) {
                const next = remapPreferredPathOrder([...paths], oldPath, newPath);
                paths.clear();
                next.forEach(path => paths.add(path));
            }
            if (newPath) {
                for (const ancestor of sharedFolderAncestors(newPath)) expanded.add(ancestor);
            }
            if (anchor?.key) {
                anchor.key = remapPreferredPathOrder([anchor.key], oldPath, newPath)[0] || "";
            }
        }
        render();
        restoreScrollableAnchor(list, anchor);
    };
    const syncSelection = () => {
        const hosts = [rootHost, list].filter(Boolean);
        for (const host of hosts) {
            for (const row of host.querySelectorAll(".local-search-move-tree-row[data-picker-value]")) {
                syncSharedPickerTreeRowSelection(
                    row,
                    activeForPath(row.dataset.pickerValue || "")
                );
            }
        }
    };
    return { search, rootHost, list, render, rerender, syncSelection };
}
