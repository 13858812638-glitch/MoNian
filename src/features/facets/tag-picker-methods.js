// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { registerPickerCleanup } from "../../core/picker-cleanup.js";
import { buildTagTreeModel, orderTagSelectionsForPicker } from "../../data/tags/tag-tree.js";
import { NO_TAGS_FILTER_VALUE, buildHierarchicalTagUsageCounts, normalizeTagValue, tagIdentityKey } from "../../data/tags/tag-values.js";
import { PointerSortCoordinator } from "../../interactions/PointerSortCoordinator.js";
import { rerenderPickerListPreservingScroll, revealScrollableKey } from "../../interactions/scroll-anchor.js";
import { attachFacetPickerOverflow, attachPickerHeaderModes } from "../../ui/pickers/header-modes.js";
import { configureSharedPickerHeader } from "../../ui/pickers/picker-header.js";
import { activatePickerSearch, createPickerAutoLocateScheduler, createSharedPickerTreeShell } from "../../ui/pickers/picker-shell.js";
import { createFacetPickerSelectionMode, deactivateConflictingFacetPickerModes } from "../../ui/pickers/selection-mode.js";
import { createSharedPickerSelectionStrip } from "../../ui/pickers/selection-strip.js";
import { attachFacetPickerSortModeToggle } from "../../ui/pickers/sort-mode.js";
import { createPickerRowAction, createSharedPickerTreeRow, syncSharedPickerTreeRowAvailability } from "../../ui/pickers/tree-row.js";
import { treeNodeMatches } from "../../utils/tree-match.js";
// Instance method owner. `this` is the unchanged SearchFacetController instance. No additional state store.
export const SearchFacetController_tag_picker_methods = {


    openTimePicker(anchor = this.owner?.sorting?.pickerBtn) {
        // Compatibility entry for commands: all date choices belong to sorting.
        return this.owner?.sorting?.openPicker({ pickerBtn: anchor, context: "time" });
    },


    openTagPicker(options = {}) {
        const core = this.owner;
        const poolMode = options?.mode === "pool";
        const createMode = !poolMode && Boolean(core.createFlow?.isCreateView?.());
        const poolId = poolMode ? String(options.poolId || "tag") : "";
        const anchor = options?.anchor || core.tagFilterBtn;
        if (createMode) return core.createFlow.openMetadataPicker(anchor, "tag");
        const panel = poolMode
            ? core.dropdown.openChild(anchor, "标签筛选池")
            : core.dropdown.open(anchor, createMode ? "新建 · 标签" : "标签筛选");
        if (!panel) return;
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

        let render = () => {};
        let sortToggle = null;
        let coordinator = null;
        let selectionMode = null;
        let maintenanceMode = "";
        const activeFilterState = () =>
            selectionMode?.isActive() && selectionMode.draft
                ? selectionMode.draft
                : core.filterState;

        let tagUniverse = [];
        let tagFacetScope = [];
        let roots = [];
        let baseTagUsage = { counts: new Map(), noTags: 0 };
        let tagUsage = { counts: new Map(), noTags: 0 };
        let tagSelectionCount = 0;

        // Tag candidates/counts are stable within the current folder, not the
        // current text query nor any already-applied tag/property refinements.
        const refreshTagUsage = () => {
            tagUsage = baseTagUsage;
            tagSelectionCount = tagFacetScope.length;
        };

        const refreshSource = () => {
            tagUniverse = poolMode
                ? (core.resultControls?._filterPoolUniverse?.() || [])
                : maintenanceMode ? core._navigationCandidates().all
                : core._navigationCandidates().scope;
            tagFacetScope = tagUniverse;
            roots = buildTagTreeModel(tagFacetScope, core.plugin.settings.pickerTagOrder);
            baseTagUsage = buildHierarchicalTagUsageCounts(tagFacetScope);
            refreshTagUsage();
        };
        refreshSource();

        const countFor = tagPath =>
            tagUsage.counts.get(tagIdentityKey(tagPath)) || 0;
        const noTagsCount = () => baseTagUsage.noTags;
        const currentTagSelectionCount = () => tagSelectionCount;

        const expanded = new Set();
        if (!poolMode) {
            for (const selected of core.filterState.tags) {
                if (selected === NO_TAGS_FILTER_VALUE) continue;
                expanded.add(selected);
                this._expandTreeAncestors(expanded, selected);
            }
        }

        const header = configureSharedPickerHeader(panel, {
            headingText: poolMode ? "标签 · 筛选池" : (createMode ? "新建 · 标签" : "标签筛选"),
            countText: poolMode ? null : currentTagSelectionCount(),
            icon: "tags"
        });
        const syncHeading = () => {
            if (!poolMode) this._syncHeaderCount(header, currentTagSelectionCount);
        };
        if (poolMode) core.resultControls?._attachFilterPoolSelectionModeControl?.(panel, poolId);

        const current = poolMode
            ? null
            : createSharedPickerSelectionStrip(panel, {
                canEdit: () => !maintenanceMode && !sortToggle?.active,
                onClear: () => {
                    activeFilterState().tags.clear();
                    if (selectionMode?.isActive()) return selectionMode.refresh();
                    core._onFilterChanged();
                    refreshTagUsage();
                    syncHeading();
                    renderCurrentSelection();
                    rerenderPickerListPreservingScroll(list, () => render(false));
                }
            });
        const { search, rootHost, list } = createSharedPickerTreeShell(panel, {
            placeholder: poolMode ? "搜索要显示的标签…" : "搜索标签…",
            rootClasses: "local-search-folder-root local-search-tag-root",
            treeClasses: "local-search-folder-tree local-search-tag-tree",
            showRoot: !createMode
        });

        const queueAutoLocate = createPickerAutoLocateScheduler(panel, list);
        const maintenanceActions = (poolMode || createMode || options?.mode === "pool-filter")
            ? null
            : attachPickerHeaderModes(header, {
                modes: this.sidebarMaintenanceModes("tag"),
                onChange: (mode, { suppressIntermediateRender = false } = {}) => {
                    maintenanceMode = mode;
                    if (mode) deactivateConflictingFacetPickerModes({
                        selectionMode, sortToggle, suppressIntermediateRender: true
                    });
                    refreshSource();
                    if (!suppressIntermediateRender) {
                        rerenderPickerListPreservingScroll(list, () => render(false));
                    }
                }
            });

        selectionMode = (poolMode || options?.mode === "pool-filter")
            ? null
            : createFacetPickerSelectionMode(panel, header, {
                core,
                kind: "tag",
                onCommit: options.onCommit,
                title: "标签多选",
                onBeforeEnter: () => deactivateConflictingFacetPickerModes({
                    maintenanceMode: maintenanceActions, sortToggle,
                    suppressIntermediateRender: true
                }),
                onStateChange: ({ suppressIntermediateRender = false } = {}) => {
                    refreshTagUsage();
                    syncHeading();
                    renderCurrentSelection();
                    if (!suppressIntermediateRender) {
                        rerenderPickerListPreservingScroll(list, () => render(false));
                    }
                }
            });

        const poolVisible = value => Boolean(
            core.resultControls?._isFilterPoolValueVisible?.(poolId, value)
        );
        const togglePoolValue = value => {
            const action = core.resultControls?._toggleFilterPoolValueVisibility?.(
                poolId,
                value
            );
            if (!action?.then) return;
            rerenderPickerListPreservingScroll(list, () => render(false));
            void action.catch(error => console.warn("筛选池保存失败", error));
        };

        const renderCurrentSelection = () => {
            if (!current) return;
            const selected = orderTagSelectionsForPicker(
                activeFilterState().tags,
                core.plugin.settings.pickerTagOrder
            );
            current.render(selected.map(value => {
                const label = value === NO_TAGS_FILTER_VALUE
                    ? "[没有标签]"
                    : value;
                return {
                    key: value,
                    text: label,
                    title: createMode ? `移除新建标签 ${label}` : `取消标签筛选 ${label}`,
                    onRemove: () => {
                        const state = activeFilterState();
                        core._applyFacetSelectionToState(
                            state,
                            "tag",
                            value,
                            { mode: "remove" }
                        );
                        if (selectionMode?.isActive()) {
                            selectionMode.refresh();
                            return;
                        }
                        core._onFilterChanged();
                        refreshTagUsage();
                        syncHeading();
                        renderCurrentSelection();
                        rerenderPickerListPreservingScroll(
                            list,
                            () => render(false)
                        );
                    }
                };
            }));
        };

        const chooseTagSelection = tagPath => {
            if (sortToggle?.active) return;
            if (poolMode) {
                togglePoolValue(tagPath);
                return;
            }
            if (options?.mode === "pool-filter") {
                const fixedPool = core.resultControls?._filterPoolById(options.poolId || "tag");
                if (!fixedPool) return;
                core.resultControls._toggleFilterPoolValue(fixedPool, tagPath);
                if (fixedPool.selectionMode !== "multi") {
                    core.dropdown.close();
                    return;
                }
                refreshTagUsage();
                syncHeading();
                renderCurrentSelection();
                rerenderPickerListPreservingScroll(list, () => render(false));
                return;
            }

            if (selectionMode?.isActive() && selectionMode.draft) {
                core._applyFacetSelectionToState(
                    selectionMode.draft,
                    "tag",
                    tagPath,
                    { mode: "toggle" }
                );
                if (tagPath !== NO_TAGS_FILTER_VALUE) {
                    this._expandTreeAncestors(expanded, tagPath);
                }
                selectionMode.refresh();
                return;
            }

            if (!createMode) {
                core.filterState.tagMatchMode = "all";
                const normalized = tagPath === NO_TAGS_FILTER_VALUE
                    ? NO_TAGS_FILTER_VALUE
                    : normalizeTagValue(tagPath);
                const soleActive = core.filterState.tags.size === 1
                    && [...core.filterState.tags].some(selected =>
                        normalized === NO_TAGS_FILTER_VALUE
                            ? selected === NO_TAGS_FILTER_VALUE
                            : selected !== NO_TAGS_FILTER_VALUE
                                && tagIdentityKey(selected) === tagIdentityKey(normalized)
                    );
                core._applyFacetSelection(
                    "tag",
                    tagPath,
                    { mode: soleActive ? "clear" : "replace" }
                );
            } else {
                core._applyFacetSelection("tag", tagPath, { mode: "replace" });
                core.dropdown.close(false);
            }
            core._onFilterChanged();
            if (!createMode && core.dropdown.close() !== false) options.onCommit?.();
        };

        const findNode = (nodes, key) => {
            const wanted = tagIdentityKey(key);
            const stack = [...nodes];
            while (stack.length) {
                const node = stack.shift();
                if (tagIdentityKey(node.path) === wanted) return node;
                stack.unshift(...(node.children || []));
            }
            return null;
        };

        const siblingsFor = node => {
            if (!node?.parentPath) return roots;
            return findNode(roots, node.parentPath)?.children || [];
        };

        const remapExpanded = (oldPrefix, newPrefix) => {
            const next = [];
            for (const path of expanded) {
                const key = tagIdentityKey(path);
                const oldKey = tagIdentityKey(oldPrefix);
                if (key === oldKey) next.push(newPrefix);
                else if (key.startsWith(oldKey + "/")) {
                    next.push(newPrefix + path.slice(oldPrefix.length));
                } else next.push(path);
            }
            expanded.clear();
            for (const path of next) expanded.add(path);
        };

        const refreshTagMaintenance = detail => {
            if (detail?.newPath) remapExpanded(detail.oldPath, detail.newPath);
            else if (detail?.deleted) {
                const sourceKey = tagIdentityKey(detail.oldPath);
                for (const path of [...expanded]) {
                    const key = tagIdentityKey(path);
                    if (key === sourceKey || key.startsWith(sourceKey + "/")) expanded.delete(path);
                }
            }
            refreshSource(); syncHeading(); renderCurrentSelection();
            rerenderPickerListPreservingScroll(list, () => render(false));
        };
        const renameTag = node => this.runSidebarMaintenance("tag", "rename", node, anchor, { onChange: refreshTagMaintenance });
        const deleteTag = node => this.runSidebarMaintenance("tag", "delete", node, anchor, { onChange: refreshTagMaintenance });

        const makeRow = (node, depth, forceExpanded = false) => {
            const hasChildren = node.children.length > 0;
            const isExpanded = forceExpanded || expanded.has(node.path);
            const parentParts = String(node.parentPath || "").split("/").filter(Boolean);
            const promoteParent = depth >= 2
                ? ""
                : parentParts.slice(0, -1).join("/");
            const active = poolMode
                ? poolVisible(node.path)
                : (() => {
                    const tags = activeFilterState().tags;
                    if (node.path === NO_TAGS_FILTER_VALUE) {
                        return tags.has(NO_TAGS_FILTER_VALUE);
                    }
                    const key = tagIdentityKey(node.path);
                    return [...tags].some(selected =>
                        selected !== NO_TAGS_FILTER_VALUE
                        && tagIdentityKey(selected) === key
                    );
                })();
            const projectedCount = countFor(node.path);
            // 只有显式标签多选才是“在现有 AND 条件上继续追加”。
            // 因此 0 投影只在这个场景禁选；普通单选是替换语义，创建模式是元数据编辑，均不得套用此限制。
            const unavailable = Boolean(
                !createMode
                && !poolMode
                && selectionMode?.isActive()
                && !active
                && projectedCount === 0
            );
            const rendered = createSharedPickerTreeRow(list, {
                depth,
                rowClasses: "local-search-tag-tree-row",
                sortKey: poolMode ? "" : node.path,
                sortParent: poolMode ? "" : (node.parentPath || ""),
                sortPromoteParent: poolMode ? "" : promoteParent,
                sortName: node.name,
                active,
                hasChildren,
                expanded: isExpanded,
                toggleTitle: hasChildren ? "展开或折叠标签" : "",
                itemClasses: "local-search-tag-tree-item",
                itemTitle: poolMode
                    ? `${active ? "从筛选池隐藏" : "在筛选池显示"}标签 ${node.path}`
                    : `标签 ${node.path}`,
                icon: hasChildren ? "tags" : "tag",
                name: node.name,
                count: projectedCount,
                countClasses: "local-search-folder-count local-search-tag-count",
                countPlacement: "row-end",
                onToggle: () => {
                    expanded.has(node.path)
                        ? expanded.delete(node.path)
                        : expanded.add(node.path);
                    rerenderPickerListPreservingScroll(list, () => render(false));
                },
                onClick: maintenanceMode === "delete"
                    ? () => deleteTag(node)
                    : maintenanceMode === "rename"
                        ? () => renameTag(node)
                        : () => chooseTagSelection(node.path),
                renderTrailing: poolMode
                    ? row => createPickerRowAction(row, {
                        icon: active ? "eye" : "eye-off",
                        interaction: "choice",
                        label: `${active ? "隐藏" : "显示"}标签 ${node.path}`,
                        onClick: () => chooseTagSelection(node.path)
                    })
                    : maintenanceMode
                    ? row => createPickerRowAction(row, maintenanceMode === "delete"
                        ? {
                            icon: "trash-2",
                            danger: true,
                            label: `删除标签 ${node.path}`,
                            onClick: () => deleteTag(node)
                        }
                        : {
                            icon: "pencil",
                            label: `重命名标签 ${node.path}`,
                            onClick: () => renameTag(node)
                        })
                    : null
            });
            syncSharedPickerTreeRowAvailability(rendered.row, unavailable);
        };

        const renderNodes = (nodes, depth, q) => {
            for (const node of nodes) {
                if (q && !treeNodeMatches(node, q)) continue;
                const forceExpanded = Boolean(q)
                    && node.children.some(child => treeNodeMatches(child, q));
                makeRow(node, depth, forceExpanded);
                if (node.children.length && (q ? forceExpanded : expanded.has(node.path))) {
                    renderNodes(node.children, depth + 1, q);
                }
            }
        };

        render = (autoLocate = false) => {
            list.empty();
            const q = search.value.trim().toLowerCase();
            rootHost?.empty();
            const noTagsLabel = "没有标签";
            const showNoTags = Boolean(rootHost);

            if (showNoTags) {
                const active = poolMode
                    ? poolVisible(NO_TAGS_FILTER_VALUE)
                    : activeFilterState().tags.has(NO_TAGS_FILTER_VALUE);
                const projectedCount = noTagsCount();
                const unavailable = Boolean(
                    !createMode
                    && !poolMode
                    && selectionMode?.isActive()
                    && !active
                    && projectedCount === 0
                );
                const rendered = createSharedPickerTreeRow(rootHost, {
                    depth: 0,
                    rowClasses: "local-search-tag-tree-row is-no-sort",
                    sortDisabled: true,
                    active,
                    itemClasses: "local-search-tag-tree-item",
                    itemTitle: poolMode
                        ? `${active ? "从筛选池隐藏" : "在筛选池显示"}没有标签`
                        : "没有标签",
                    icon: "tag",
                    name: noTagsLabel,
                    count: projectedCount,
                    countClasses: "local-search-folder-count local-search-tag-count",
                    countPlacement: "row-end",
                    onClick: maintenanceMode ? null : () => chooseTagSelection(NO_TAGS_FILTER_VALUE),
                    renderTrailing: poolMode ? row => createPickerRowAction(row, {
                        icon: active ? "eye" : "eye-off",
                        interaction: "choice",
                        label: `${active ? "隐藏" : "显示"}没有标签`,
                        onClick: () => chooseTagSelection(NO_TAGS_FILTER_VALUE)
                    }) : null
                });
                syncSharedPickerTreeRowAvailability(rendered.row, unavailable);
            }

            renderNodes(roots, 0, q);
            if (!list.children.length && q) {
                list.createDiv({ text: "没有匹配的标签", cls: "local-search-empty-hint" });
            }
            if (
                !poolMode
                && autoLocate
                && activeFilterState().tags.size
                && !activeFilterState().tags.has(NO_TAGS_FILTER_VALUE)
            ) {
                queueAutoLocate(() => {
                    if (!panel.isConnected || !core.dropdown.isActivePanel(panel) || search.value.trim()) return;
                    const row = list.querySelector(".local-search-tag-tree-row.is-selected[data-picker-key]");
                    if (row?.dataset.pickerKey) revealScrollableKey(list, row.dataset.pickerKey);
                });
            }
        };

        coordinator = (createMode || poolMode) ? null : new PointerSortCoordinator({
            list,
            hierarchical: true,
            canStart: row => Boolean(row?.dataset?.sortKey),
            canNest: (source, target) => {
                if (!source?.key || !target?.key) return false;
                const sourceKey = tagIdentityKey(source.key);
                const targetKey = tagIdentityKey(target.key);
                return sourceKey !== targetKey
                    && !targetKey.startsWith(sourceKey + "/");
            },
            onCommit: async ({ key, mode, beforeKey, parentKey }) => {
                const node = findNode(roots, key);
                if (!node) return;
                if (mode === "reorder") {
                    const siblings = siblingsFor(node).map(item => item.path);
                    await core.plugin.setPickerSiblingOrder(
                        "tag",
                        siblings,
                        node.path,
                        beforeKey
                    );
                    refreshSource();
                    rerenderPickerListPreservingScroll(list, () => render(false));
                    return;
                }

                const leaf = String(node.path).split("/").filter(Boolean).pop();
                if (!leaf) return;
                const nextPrefix = parentKey ? `${parentKey}/${leaf}` : leaf;
                if (tagIdentityKey(nextPrefix) === tagIdentityKey(node.path)) return;
                await core.plugin.migrateVaultTagTreePrefix(node.path, nextPrefix);
                remapExpanded(node.path, nextPrefix);
                refreshSource();
                renderCurrentSelection();
                rerenderPickerListPreservingScroll(list, () => render(false));
            }
        });

        sortToggle = (createMode || poolMode) ? null : attachFacetPickerSortModeToggle(header, {
            label: "标签",
            selectionMode,
            maintenanceMode: maintenanceActions,
            coordinator,
            suppressIntermediateRender: true,
            onEnter: () => render(false),
            onRefreshSelection: renderCurrentSelection
        });
        registerPickerCleanup(panel, () => {
            sortToggle?.destroy?.();
            coordinator?.destroy?.();
        });
        if (poolMode) panel._lsPoolVisibilityRefresh = () =>
            rerenderPickerListPreservingScroll(list, () => render(false));
        attachFacetPickerOverflow(core, panel, header);

        activatePickerSearch(search, {
            onInput: () => render(false),
            initialRender: () => {
                renderCurrentSelection();
                render(true);
            },
        });
    },
};

