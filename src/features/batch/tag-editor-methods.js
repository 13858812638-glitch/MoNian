// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { editableTagError, normalizeEditableTagValue } from "../../data/properties/property-types.js";
import { buildTagTreeModel, flattenTagTreePaths } from "../../data/tags/tag-tree.js";
import { composeHierarchicalTag, tagHierarchyDrillPath, tagHierarchyBreadcrumbs, tagHierarchyVisibleRoots, findTagHierarchyNode } from "./tag-hierarchy-compose.js";
import { buildHierarchicalTagUsageCounts, tagIdentityKey } from "../../data/tags/tag-values.js";
import { captureScrollableAnchor, restoreScrollableAnchor } from "../../interactions/scroll-anchor.js";
import { configureSharedPickerHeader } from "../../ui/pickers/picker-header.js";
import { activatePickerSearch, createPickerAutoLocateScheduler, createSharedPickerTreeShell } from "../../ui/pickers/picker-shell.js";
import { createSearchButton } from "../../ui/components/input-controls.js";
import { createSharedPickerSelectionStrip } from "../../ui/pickers/selection-strip.js";
import { createSharedPickerTreeRow, createPickerRowAction } from "../../ui/pickers/tree-row.js";
import { setIcon } from "obsidian";
import { treeNodeMatches } from "../../utils/tree-match.js";
// Instance method owner. `this` is the unchanged BatchMetadataController instance. No additional state store.
export const BatchMetadataController_tag_editor_methods = {


    _renderTagPicker(session) {
        const summary = this._summary(session);
        const universe = this._metadataUniverse(session);
        const selectedTags = (summary.tags?.values || []).map(entry => entry.value);
        // Draft-only names remain selectable on reopen; usage counts still come
        // solely from the real index, never from a pretend file.
        const tagCandidates = session.metadataTarget
            ? [...universe, { tags: selectedTags }]
            : universe;
        const existingTags = this._batchExistingTags(tagCandidates);
        const actualTags = new Map(
            existingTags.map(tag => [tagIdentityKey(tag), tag])
        );
        const baseline = new Map(
            (summary.tags?.values || []).map(entry => [
                tagIdentityKey(entry.value),
                entry
            ])
        );
        let roots = buildTagTreeModel(tagCandidates, this.plugin.settings.pickerTagOrder);
        const usage = buildHierarchicalTagUsageCounts(universe);
        const tagDisplayOrder = new Map(
            flattenTagTreePaths(roots).map((path, index) => [
                tagIdentityKey(path),
                index
            ])
        );
        const orderTagEntries = entries => [...entries].sort((a, b) => {
            const ai = tagDisplayOrder.has(a.key)
                ? tagDisplayOrder.get(a.key)
                : Number.MAX_SAFE_INTEGER;
            const bi = tagDisplayOrder.has(b.key)
                ? tagDisplayOrder.get(b.key)
                : Number.MAX_SAFE_INTEGER;
            if (ai !== bi) return ai - bi;
            return String(a.text || "").localeCompare(
                String(b.text || ""),
                "zh-Hans-CN",
                { numeric: true }
            );
        });
        const state = session.state = {
            add: new Map(),
            remove: new Map(),
            expanded: new Set(),
            parentPath: (session.initialTagParentPath && !editableTagError(session.initialTagParentPath))
                ? normalizeEditableTagValue(session.initialTagParentPath) : "",
            query: ""
        };

        configureSharedPickerHeader(session.panel, {
            headingText: "新增标签",
            countText: session.targetCount,
            countAriaLabel: session.metadataTarget?.label || `当前 ${session.targetCount} 个文件`,
            icon: "tags"
        });
        const current = createSharedPickerSelectionStrip(session.panel, {
            onClear: () => {
                state.add.clear();
                state.remove = new Map(baseline);
                renderAll({ preserveScroll: true });
            }
        });
        const { search, list } = createSharedPickerTreeShell(session.panel, {
            placeholder: "搜索已有标签或输入新标签…",
            treeClasses: "local-search-tag-tree",
            showRoot: false
        });
        // A single compact hierarchy rail belongs to this Picker session only.
        // No secondary dialog, independent tag catalog, or additional persistence.
        const hierarchy = session.panel.createDiv({
            cls: "local-search-tag-hierarchy-bar",
            attr: { role: "navigation", "aria-label": "新建标签的父级路径" }
        });
        session.panel.insertBefore(hierarchy, search.closest(".local-search-move-search-wrap"));
        const queueBreadcrumbReveal = createPickerAutoLocateScheduler(session.panel, hierarchy);
        let projectedTagPaths = "";
        const refreshRoots = () => {
            const draftPaths = [...state.add.values(), state.parentPath].filter(Boolean);
            const signature = JSON.stringify(draftPaths);
            if (signature === projectedTagPaths || (signature === "[]" && !projectedTagPaths)) return;
            projectedTagPaths = signature;
            roots = buildTagTreeModel(
                draftPaths.length ? [...tagCandidates, { tags: draftPaths }] : tagCandidates,
                this.plugin.settings.pickerTagOrder
            );
        };
        const focusSearch = () => {
            if (session.panel.isConnected) search.focus({ preventScroll: true });
        };
        const enterParent = path => {
            const normalized = normalizeEditableTagValue(path);
            if (normalized && editableTagError(normalized)) return;
            // Prefer the actual spelling of existing tag paths.
            state.parentPath = findTagHierarchyNode(roots, normalized)?.path || normalized;
            search.value = "";
            state.query = "";
            renderAll();
            focusSearch();
        };
        const renderHierarchy = () => {
            hierarchy.empty();
            const crumbs = hierarchy.createDiv({ cls: "local-search-tag-hierarchy-crumbs" });
            const path = tagHierarchyBreadcrumbs(state.parentPath);
            for (let index = 0; index < path.length; index++) {
                const crumb = path[index];
                if (index) {
                    const separator = crumbs.createSpan({ cls: "local-search-tag-hierarchy-separator", attr: { "aria-hidden": "true" } });
                    setIcon(separator, "chevron-right");
                }
                const isCurrent = index === path.length - 1;
                const button = createSearchButton(crumbs, "action", {
                    text: crumb.name,
                    cls: `local-search-tag-hierarchy-crumb${isCurrent ? " is-current" : ""}`,
                    attr: {
                        type: "button",
                        "data-ls-no-drag": "true",
                        "aria-label": isCurrent ? `当前层级：${crumb.path || "全部标签"}` : `返回层级：${crumb.path || "全部标签"}`,
                        "aria-current": isCurrent ? "location" : "false"
                    }
                });
                button.title = crumb.path || "全部标签";
                if (isCurrent) button.disabled = true;
                else button.addEventListener("click", () => enterParent(crumb.path));
            }
            if (!state.parentPath) {
                hierarchy.createSpan({ text: "点 + 创建子级", cls: "local-search-tag-hierarchy-hint" });
            }
            // Reveal the last crumb using real post-layout geometry. On the
            // desktop host, accessible label helpers can change measured width
            // after children are appended, so a raw scrollWidth assignment can
            // leave the final segment partially clipped.
            crumbs.scrollLeft = crumbs.scrollWidth;
            if (path.length > 3) queueBreadcrumbReveal(() => {
                const rail = hierarchy.querySelector(".local-search-tag-hierarchy-crumbs");
                rail?.lastElementChild?.scrollIntoView?.({ block: "nearest", inline: "end", behavior: "instant" });
            });
        };

        const changeCount = () => state.add.size + state.remove.size;
        const footer = this._createDraftFooter(session.panel, {
            getChangeCount: changeCount,
            onConfirm: () => this._runMutation(session, {
                action: "更新标签",
                errorText: "更新标签失败",
                operation: () => {
                    const draft = {
                        addTags: [...state.add.values()],
                        removeTags: [...state.remove.values()].map(entry => entry.value)
                    };
                    return session.metadataTarget
                        ? session.metadataTarget.commit(draft)
                        : this.plugin.batchMetadataService.applyMetadataDraft(session.targetPaths, draft);
                }
            })
        });

        const renderCurrent = () => {
            const entries = [];
            for (const [key, entry] of baseline) {
                if (state.remove.has(key) && !state.add.has(key)) continue;
                entries.push({
                    key,
                    text: entry.value,
                    title: `移除标签 ${entry.value}`,
                    onRemove: () => {
                        state.add.delete(key);
                        state.remove.set(key, entry);
                        renderAll({ preserveScroll: true });
                    }
                });
            }
            for (const [key, value] of state.add) {
                if (baseline.has(key)) continue;
                entries.push({
                    key,
                    text: value,
                    title: `取消新增标签 ${value}`,
                    onRemove: () => {
                        state.add.delete(key);
                        renderAll({ preserveScroll: true });
                    }
                });
            }
            current.render(orderTagEntries(entries));
        };

        const toggleAdd = (tag, { resetSearch = false } = {}) => {
            const normalized = normalizeEditableTagValue(tag);
            if (!normalized) return;
            const key = tagIdentityKey(normalized);
            if (state.remove.has(key)) {
                state.remove.delete(key);
                state.add.delete(key);
            } else if (state.add.has(key)) {
                state.add.delete(key);
            } else if (baseline.get(key)?.count >= session.targetCount) {
                state.remove.set(key, baseline.get(key));
            } else {
                state.add.set(key, actualTags.get(key) || normalized);
            }
            if (resetSearch) search.value = "";
            renderAll({ preserveScroll: !resetSearch });
            if (resetSearch) focusSearch();
        };

        const renderNodes = (nodes, depth, query) => {
            for (const node of nodes) {
                if (query && !treeNodeMatches(node, query)) continue;
                const hasChildren = node.children.length > 0;
                const forceExpanded = Boolean(query)
                    && hasChildren
                    && node.children.some(child => treeNodeMatches(child, query));
                const expanded = forceExpanded || state.expanded.has(node.path);
                const key = tagIdentityKey(node.path);
                const actual = actualTags.get(key);
                const baselineEntry = baseline.get(key);
                const fullyPresent = baselineEntry?.count >= session.targetCount;
                const pendingAdd = state.add.has(key);
                createSharedPickerTreeRow(list, {
                    depth,
                    rowClasses: "local-search-tag-tree-row",
                    active: pendingAdd || (fullyPresent && !state.remove.has(key)),
                    hasChildren,
                    expanded,
                    toggleTitle: expanded ? "折叠标签" : "展开标签",
                    icon: hasChildren ? "tags" : "tag",
                    name: node.name,
                    itemTitle: actual
                        ? `给当前文件添加标签 ${actual}`
                        : `标签层级 ${node.path}`,
                    count: usage.counts.get(key) || 0,
                    countClasses: "local-search-tag-count",
                    countPlacement: "row-end",
                    onToggle: hasChildren
                        ? () => {
                            if (state.expanded.has(node.path)) state.expanded.delete(node.path);
                            else state.expanded.add(node.path);
                            renderAll({ preserveScroll: true });
                        }
                        : null,
                    onClick: (actual || pendingAdd)
                        ? () => toggleAdd(actual || node.path)
                        : (hasChildren ? () => {
                            if (state.expanded.has(node.path)) state.expanded.delete(node.path);
                            else state.expanded.add(node.path);
                            renderAll({ preserveScroll: true });
                        } : null),
                    renderTrailing: row => createPickerRowAction(row, {
                        icon: "plus",
                        label: `在 ${node.path} 下创建子标签`,
                        onClick: () => enterParent(node.path)
                    })
                });
                if (hasChildren && expanded) {
                    renderNodes(node.children, depth + 1, query);
                }
            }
        };

        const renderList = ({ preserveScroll = false } = {}) => {
            const scrollAnchor = preserveScroll
                ? captureScrollableAnchor(list)
                : null;
            list.empty();
            const rawQuery = String(search.value || "");
            state.query = rawQuery;
            const query = rawQuery.trim().toLocaleLowerCase("zh-CN");
            const draft = composeHierarchicalTag(rawQuery, state.parentPath);
            const draftKey = tagIdentityKey(draft.path);
            const exact = draft.path ? actualTags.get(draftKey) : null;
            const createError = draft.error;

            if (draft.path && !exact && !state.add.has(draftKey) && !createError) {
                createSharedPickerTreeRow(list, {
                    depth: 0,
                    rowClasses: "local-search-tag-tree-row local-search-batch-create-tag-row is-action-row",
                    icon: "plus",
                    name: `创建并添加 ${draft.path}`,
                    itemTitle: `创建并添加标签 ${draft.path}`,
                    onClick: () => toggleAdd(draft.path, { resetSearch: true }),
                    renderTrailing: row => createPickerRowAction(row, {
                        icon: "corner-down-right",
                        label: `进入 ${draft.path} 下一级（不添加父标签）`,
                        onClick: () => enterParent(draft.path)
                    })
                });
            }

            renderNodes(tagHierarchyVisibleRoots(roots, state.parentPath), 0, query);
            if (createError) {
                list.createDiv({ text: createError, cls: "local-search-empty-hint" });
            } else if (!list.children.length) {
                list.createDiv({
                    text: query
                        ? "没有匹配的已有标签"
                        : (state.parentPath
                            ? `在「${state.parentPath}」下输入新标签名称，或返回上一级`
                            : "当前仓库没有已有标签，可直接输入新标签创建"),
                    cls: "local-search-empty-hint"
                });
            }
            if (scrollAnchor) {
                restoreScrollableAnchor(list, scrollAnchor);
            } else {
                list.scrollTop = 0;
            }
        };

        const renderAll = ({ preserveScroll = false } = {}) => {
            refreshRoots();
            renderHierarchy();
            renderCurrent();
            renderList({ preserveScroll });
            footer.sync();
        };

        let composing = false;
        const handleSearchInput = () => {
            if (composing || search.isComposing) return;
            const nextParent = tagHierarchyDrillPath(search.value, state.parentPath);
            if (nextParent) {
                enterParent(nextParent);
                return;
            }
            renderList();
        };
        search.addEventListener("compositionstart", () => { composing = true; });
        search.addEventListener("compositionend", () => { composing = false; handleSearchInput(); });
        search.addEventListener("keydown", event => {
            if (composing || event.isComposing || event.keyCode === 229) return;
            if (event.key === "Backspace" && !search.value && state.parentPath) {
                event.preventDefault();
                const ancestors = tagHierarchyBreadcrumbs(state.parentPath);
                enterParent(ancestors[ancestors.length - 2]?.path || "");
                return;
            }
            if (event.key !== "Enter") return;
            const draft = composeHierarchicalTag(search.value, state.parentPath);
            if (!draft.path || draft.error) return;
            event.preventDefault();
            event.stopPropagation();
            const key = tagIdentityKey(draft.path);
            // Typing an already selected label must never silently remove it;
            // removal remains an explicit action on its chip/tree row.
            if ((baseline.get(key)?.count >= session.targetCount || state.add.has(key))
                && !state.remove.has(key)) {
                search.value = "";
                renderList();
                focusSearch();
                return;
            }
            toggleAdd(actualTags.get(key) || draft.path, { resetSearch: true });
        });
        activatePickerSearch(search, { onInput: handleSearchInput, initialRender: renderAll });
    },
};

