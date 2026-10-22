import { setSearchAttribute } from "../../interactions/hover-hints.js";
// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { registerPickerCleanup } from "../../core/picker-cleanup.js";
import { createSharedFolderCountProvider, orderFolderSelectionsForPicker, sharedFolderAncestors, sharedFolderChildren } from "../../data/folders/folder-tree.js";
import { PointerSortCoordinator } from "../../interactions/PointerSortCoordinator.js";
import { setIndicatorLabel } from "../../ui/components/indicator-label.js";
import { renderSharedFolderTreePicker } from "../../ui/pickers/folder-picker.js";
import { attachFacetPickerOverflow, attachPickerHeaderModes } from "../../ui/pickers/header-modes.js";
import { configureSharedPickerHeader, createPickerHeaderIconAction } from "../../ui/pickers/picker-header.js";
import { createFacetPickerSelectionMode, deactivateConflictingFacetPickerModes } from "../../ui/pickers/selection-mode.js";
import { createSharedPickerSelectionStrip } from "../../ui/pickers/selection-strip.js";
import { attachFacetPickerSortModeToggle } from "../../ui/pickers/sort-mode.js";
import { createPickerRowAction, syncSharedPickerTreeRowAvailability } from "../../ui/pickers/tree-row.js";
import { remapPreferredPathOrder } from "../../utils/preferred-order.js";
import { createFolderExclusionController, normalizeExcludedFolders } from "../folders/exclusions.js";
import { Notice, TFolder } from "obsidian";
// Instance method owner. `this` is the unchanged SearchFacetController instance. No additional state store.
export const SearchFacetController_folder_picker_methods = {


    _showManagedFolderDropdown(options = {}) {
        const core = this.owner;
        if (String(options?.mode || "") !== "global-exclude") return null;

        const anchor = options?.anchor || core.folderBtn;
        if (!anchor?.isConnected) return null;

        const panel = core.dropdown.openChild(anchor, "全局排除文件夹");
        if (!panel) return null;
        panel.addClass(
            "local-search-folder-dropdown",
            "local-search-picker-dropdown",
            "local-search-facet-picker"
        );

        const header = configureSharedPickerHeader(panel, {
            headingText: "全局排除文件夹",
            countText: normalizeExcludedFolders(core.plugin.settings.excludedFolders).length,
            icon: "folder"
        });

        const expanded = new Set();
        let picker = null;
        const exclusion = createFolderExclusionController({
            read: () => core.plugin.settings.excludedFolders,
            write: paths => core.plugin.setExcludedFolders(paths),
            isLive: () => !core._destroyed && panel.isConnected,
            excludeLabel: "全局排除文件夹", restoreLabel: "恢复全局索引"
        });
        for (const path of exclusion.paths()) {
            for (const ancestor of sharedFolderAncestors(path)) expanded.add(ancestor);
        }

        picker = renderSharedFolderTreePicker({
            app: core.app,
            plugin: core.plugin,
            panel,
            searchPlaceholder: "搜索要全局排除的文件夹…",
            expanded,
            isActivePath: () => false,
            rootPath: "/",
            rootLabel: "仓库根目录",
            badgeFor: () => "",
            onChoose: path => {
                void exclusion.toggle(path);
            },
            renderTrailingForPath: (row, { path }) => {
                this._applyResultFolderPickerColor(row, path);
                exclusion.renderAction(row, path);
            },
            // 管理全局排除时必须能看到已经排除的目录本身。
            includeExcluded: true,
            rootInTree: true,
            autoLocate: false,
        });

        this._syncHeaderCount(header, () => exclusion.paths().length);
        core.dropdown.setRefreshHandler(panel, change => {
            this._syncHeaderCount(header, () => exclusion.paths().length);
            picker.rerender(change);
            options?.onChange?.();
        });
        return picker;
    },


    showFolderDropdown(options = {}) {
        const managedMode = String(options?.mode || "") === "global-exclude";
        if (managedMode) {
            return this._showManagedFolderDropdown(options);
        }

        const core = this.owner;
        const poolMode = options?.mode === "pool";
        const createMode = !poolMode && Boolean(core.createFlow?.isCreateView?.());
        const poolId = poolMode ? String(options.poolId || "folder") : "";
        const anchor = options?.anchor || core.folderBtn;
        const panel = poolMode
            ? core.dropdown.openChild(anchor, "文件夹筛选池")
            : core.dropdown.open(anchor, createMode ? "新建 · 文件夹" : "文件夹筛选");
        panel.addClass(
            "local-search-folder-dropdown",
            "local-search-picker-dropdown",
            "local-search-facet-picker"
        );
        if (createMode) panel.addClass("is-create-metadata-picker");
        if (poolMode) panel.addClass(
            "local-search-filter-pool-config-picker",
            "is-persistent-toggle"
        );

        let folderUniverse;
        let folderScopeCount = 0;
        let countInFolder;
        const refreshCounts = () => {
            if (poolMode) {
                folderUniverse = core.resultControls?._filterPoolUniverse?.() || [];
                folderScopeCount = folderUniverse.length;
            } else {
                const candidates = core._navigationCandidates();
                folderUniverse = candidates.all;
                folderScopeCount = candidates.scope.length;
            }
            countInFolder = createSharedFolderCountProvider(folderUniverse);
        };
        refreshCounts();
        const expanded = new Set();
        if (!poolMode) {
            for (const folder of core.filterState.folders) {
                const source = folder === "/" ? "" : folder;
                for (const ancestor of sharedFolderAncestors(source)) {
                    expanded.add(ancestor);
                }
            }
        }

        let picker = null;
        let selectionMode = null;
        let folderModes = null;
        let sortToggle = null;
        const activeFilterState = () =>
            selectionMode?.isActive() && selectionMode.draft
                ? selectionMode.draft
                : core.filterState;
        const poolVisible = path => Boolean(
            core.resultControls?._isFilterPoolValueVisible?.(
                poolId,
                path
            )
        );
        const togglePoolPath = path => {
            const action = core.resultControls?._toggleFilterPoolValueVisibility?.(
                poolId,
                path
            );
            if (!action?.then) return;
            picker?.rerender?.();
            void action.catch(error => console.warn("文件夹筛选池保存失败", error));
        };
        const exclusion = createFolderExclusionController({
            read: () => core.plugin.settings.resultExcludedFolders,
            write: paths => core.plugin.setResultExcludedFolders(paths),
            isLive: () => !core._destroyed && panel.isConnected,
            excludeLabel: "从结果中隐藏文件夹", restoreLabel: "恢复结果显示"
        });

        const folderAction = (mode, path) => this.runSidebarMaintenance("folder", mode, { path }, anchor, { onChange: () => picker?.rerender?.() });
        const renameFolder = path => folderAction("rename", path);
        const deleteFolder = path => folderAction("delete", path);

        const chooseFolderPath = path => {
            if (sortToggle?.active) return;
            if (poolMode) {
                togglePoolPath(path);
                return;
            }
            if (options?.mode === "pool-filter") {
                const fixedPool = core.resultControls?._filterPoolById(options.poolId || "folder");
                if (!fixedPool) return;
                core.resultControls._toggleFilterPoolValue(fixedPool, path);
                if (fixedPool.selectionMode !== "multi") {
                    core.dropdown.close();
                } else {
                    renderCurrentSelection();
                    picker?.syncSelection?.();
                }
                return;
            }

            if (createMode) {
                core.dropdown.close(false);
                core._applyFacetSelection("folder", path, { mode: "replace" });
                core._onFilterChanged();
                return;
            }

            if (folderModes?.isActive("delete")) {
                deleteFolder(path);
                return;
            }

            if (folderModes?.isActive("result-exclude")) { void folderAction("result-exclude", path); return; }
            if (folderModes?.isActive("rename")) { renameFolder(path); return; }
            if (folderModes?.isActive("color")) { folderAction("color", path); return; }

            if (selectionMode?.isActive() && selectionMode.draft) {
                core._applyFacetSelectionToState(
                    selectionMode.draft,
                    "folder",
                    path,
                    { mode: "toggle" }
                );
                const source = path === "/" ? "" : path;
                for (const ancestor of sharedFolderAncestors(source)) {
                    expanded.add(ancestor);
                }
                selectionMode.refresh();
                return;
            }

            core._selectBrowseFolder(path);
            core._onFilterChanged();
            if (core.dropdown.close() !== false) options.onCommit?.();
        };

        const header = configureSharedPickerHeader(panel, {
            headingText: poolMode ? "文件夹 · 筛选池" : (createMode ? "新建 · 文件夹" : "文件夹筛选"),
            countText: poolMode
                ? null
                : folderScopeCount,
            icon: "folder"
        });
        if (poolMode) core.resultControls?._attachFilterPoolSelectionModeControl?.(panel, poolId);
        const current = poolMode
            ? null
            : createSharedPickerSelectionStrip(panel, {
                canEdit: () => !folderModes?.activeId && !sortToggle?.active,
                onClear: () => {
                    activeFilterState().folders.clear();
                    if (selectionMode?.isActive()) return selectionMode.refresh();
                    core._onFilterChanged();
                    syncHeading();
                    renderCurrentSelection();
                    picker?.syncSelection?.();
                }
            });
        const renderCurrentSelection = () => {
            if (!current) return;
            const orderedFolders = orderFolderSelectionsForPicker(
                core.plugin,
                activeFilterState().folders
            );
            current.render(orderedFolders.map(path => ({
                key: path,
                text: path === "/" ? "仓库根目录" : path,
                title: createMode
                    ? `移除新建文件夹 ${path === "/" ? "仓库根目录" : path}`
                    : `取消文件夹筛选 ${path === "/" ? "仓库根目录" : path}`,
                onRemove: () => {
                    const state = activeFilterState();
                    core._applyFacetSelectionToState(
                        state,
                        "folder",
                        path,
                        { mode: "remove" }
                    );
                    if (selectionMode?.isActive()) {
                        selectionMode.refresh();
                        return;
                    }
                    core._onFilterChanged();
                    syncHeading();
                    renderCurrentSelection();
                    picker?.syncSelection?.();
                }
            })));
        };
        const syncHeading = () => {
            if (!poolMode) {
                this._syncHeaderCount(
                    header,
                    () => folderScopeCount
                );
            }
        };

        renderCurrentSelection();
        picker = renderSharedFolderTreePicker({
            app: core.app,
            plugin: core.plugin,
            panel,
            searchPlaceholder: poolMode
                ? "搜索要显示的文件夹…"
                : "搜索文件夹…",
            expanded,
            selectedPaths: null,
            isActivePath: poolMode
                ? path => poolVisible(path)
                : path => !folderModes?.activeId
                    && activeFilterState().folders.has(path),
            iconForPath: null,
            rootPath: "/",
            badgeFor: path => countInFolder(path),
            onChoose: chooseFolderPath,
            onToggleChoose: null,
            renderTrailingForPath: (row, { path }) => {
                    if (poolMode) {
                        const visible = poolVisible(path);
                        createPickerRowAction(row, {
                            icon: visible ? "eye" : "eye-off",
                            interaction: "choice",
                            label: `${visible ? "隐藏" : "显示"}文件夹 ${path || "根目录"}`,
                            onClick: () => togglePoolPath(path)
                        });
                        return;
                    }
                    this._applyResultFolderPickerColor(row, path);
                    if (createMode) return;

                    const name = path === "/"
                        ? "仓库根目录"
                        : (String(path).split("/").filter(Boolean).pop() || path);

                    if (folderModes?.isActive("delete")) {
                        if (path === "/") {
                            syncSharedPickerTreeRowAvailability(row, true);
                            return;
                        }
                        createPickerRowAction(row, {
                            icon: "trash-2",
                            label: `删除文件夹 ${path}`,
                            danger: true,
                            onClick: () => deleteFolder(path)
                        });
                        return;
                    }

                    if (folderModes?.isActive("color")) {
                        createPickerRowAction(row, {
                            icon: "palette", label: `设置 ${name} 的文件夹颜色`,
                            onClick: () => folderAction("color", path)
                        });
                        return;
                    }
                    if (folderModes?.isActive("rename")) {
                        if (path !== "/") createPickerRowAction(row, {
                            icon: "pencil", label: `重命名文件夹 ${path}`,
                            onClick: () => renameFolder(path)
                        });
                        return;
                    }

                    if (!folderModes?.isActive("result-exclude") || path === "/") return;
                    exclusion.renderAction(row, path);
                },
            includeExcluded: false,
            rootInTree: false,
            autoLocate: !poolMode,
        });

        if (!poolMode) createPickerHeaderIconAction(header.actions, {
            icon: "plus",
            label: "新建文件夹",
            onClick: () => {
                const folders = [...activeFilterState().folders];
                const parentPath = folders.length === 1 && folders[0] !== "/" ? folders[0] : "";
                this.openFolderCreateDialog({
                    ownerPanel: panel,
                    parentPath,
                    onCreated: folder => {
                        if (panel.isConnected) {
                            for (const ancestor of sharedFolderAncestors(folder.path)) expanded.add(ancestor);
                            picker.search.value = "";
                            core.dropdown.refresh();
                        }
                    }
                });
            }
        });

        folderModes = (poolMode || createMode || options?.mode === "pool-filter")
            ? null
            : attachPickerHeaderModes(header, {
                modes: this.sidebarMaintenanceModes("folder"),
                onChange: mode => {
                    if (mode) deactivateConflictingFacetPickerModes({
                        selectionMode, sortToggle
                    });
                    const deleteActive = mode === "delete";
                    const renameActive = mode === "rename";
                    const colorActive = mode === "color";
                    const excludeActive = mode === "result-exclude";
                    panel.classList.toggle(
                        "is-folder-color-mode",
                        colorActive
                    );
                    panel.classList.toggle(
                        "is-folder-exclude-mode",
                        excludeActive
                    );
                    if (header?.heading) {
                        header.heading.textContent = deleteActive
                            ? "删除文件夹"
                            : renameActive ? "重命名文件夹"
                            : colorActive
                            ? "文件夹调色"
                            : excludeActive
                                ? "结果排除文件夹"
                                : "文件夹筛选";
                    }
                    if (picker?.search) {
                        picker.search.placeholder = deleteActive
                            ? "搜索要删除的文件夹…"
                            : renameActive ? "搜索要重命名的文件夹…"
                            : colorActive
                            ? "搜索要设置颜色的文件夹…"
                            : excludeActive
                                ? "搜索要从结果中排除的文件夹…"
                                : "搜索文件夹…";
                    }
                    picker?.rerender?.();
                }
            });

        selectionMode = (poolMode || createMode || options?.mode === "pool-filter")
            ? null
            : createFacetPickerSelectionMode(panel, header, {
                core,
                kind: "folder",
                onCommit: options.onCommit,
                title: "文件夹多选",
                onBeforeEnter: () => deactivateConflictingFacetPickerModes({
                    maintenanceMode: folderModes, sortToggle
                }),
                onStateChange: () => {
                    renderCurrentSelection();
                    picker?.syncSelection?.();
                }
            });

        const coordinator = (createMode || poolMode) ? null : new PointerSortCoordinator({
            list: picker.list,
            hierarchical: true,
            canStart: row => Boolean(row?.dataset?.sortKey),
            canNest: (source, target) => {
                if (!source?.key || !target?.key) return false;
                return source.key !== target.key
                    && !target.key.startsWith(source.key + "/");
            },
            onCommit: async ({ key, mode, beforeKey, parentKey }) => {
                const source = core.app.vault.getAbstractFileByPath(key);
                if (!(source instanceof TFolder)) return;
                if (mode === "reorder") {
                    const parent = source.parent instanceof TFolder
                        ? source.parent
                        : core.app.vault.getRoot();
                    const siblings = sharedFolderChildren(
                        core.app,
                        core.plugin,
                        parent
                    ).map(folder => folder.path);
                    await core.plugin.setPickerSiblingOrder(
                        "folder",
                        siblings,
                        source.path,
                        beforeKey
                    );
                    if (panel.isConnected) picker.rerender();
                    return;
                }

                // Vault 路径提交后由统一的文件夹刷新入口原位迁移 Picker 状态。
                // 保留同一面板、搜索词、滚动锚点与排序模式，可连续调整层级。
                await core.plugin.moveFolderTreeNode(source.path, parentKey || "");
            }
        });

        sortToggle = (createMode || poolMode) ? null : attachFacetPickerSortModeToggle(header, {
            label: "文件夹",
            selectionMode,
            maintenanceMode: folderModes,
            maintenanceFirst: true,
            coordinator,
            onEnter: () => picker.render(),
            onRefreshSelection: renderCurrentSelection
        });
        registerPickerCleanup(panel, () => {
            folderModes?.setActive("");
            sortToggle?.destroy?.();
            coordinator?.destroy?.();
        });
        if (poolMode) panel._lsPoolVisibilityRefresh = () => picker?.rerender?.();
        attachFacetPickerOverflow(core, panel, header);
        core.dropdown.setRefreshHandler(panel, change => {
            if (change?.oldPath && selectionMode?.draft) {
                selectionMode.draft.folders = new Set(remapPreferredPathOrder(
                    [...selectionMode.draft.folders], change.oldPath, change.newPath
                ));
            }
            refreshCounts();
            syncHeading();
            renderCurrentSelection();
            picker.rerender(change);
        });
    },


    updateFolderButton() {
        const core = this.owner;
        if (!core.folderBtn) return;

        setIndicatorLabel(core.folderBtn, "文件夹");
        const applied = core.filterState.folders.size > 0;
        core.folderBtn.classList.toggle("is-applied", applied);
        setSearchAttribute(core.folderBtn, "aria-pressed", String(applied));
    },
};

