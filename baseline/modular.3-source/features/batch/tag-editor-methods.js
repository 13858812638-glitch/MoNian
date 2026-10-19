// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { editableTagError, normalizeEditableTagValue } from "../../data/properties/property-types.js";
import { buildTagTreeModel, flattenTagTreePaths } from "../../data/tags/tag-tree.js";
import { buildHierarchicalTagUsageCounts, tagIdentityKey } from "../../data/tags/tag-values.js";
import { captureScrollableAnchor, restoreScrollableAnchor } from "../../interactions/scroll-anchor.js";
import { configureSharedPickerHeader } from "../../ui/pickers/picker-header.js";
import { createSharedPickerTreeShell } from "../../ui/pickers/picker-shell.js";
import { createSharedPickerSelectionStrip } from "../../ui/pickers/selection-strip.js";
import { createSharedPickerTreeRow } from "../../ui/pickers/tree-row.js";
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
        const roots = buildTagTreeModel(
            tagCandidates,
            this.plugin.settings.pickerTagOrder
        );
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

        const toggleAdd = tag => {
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
            renderAll({ preserveScroll: true });
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
                const view = createSharedPickerTreeRow(list, {
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
                    onClick: actual
                        ? () => toggleAdd(actual)
                        : (hasChildren ? () => {
                            if (state.expanded.has(node.path)) state.expanded.delete(node.path);
                            else state.expanded.add(node.path);
                            renderAll({ preserveScroll: true });
                        } : null)
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
            const draftTag = normalizeEditableTagValue(rawQuery);
            const draftKey = tagIdentityKey(draftTag);
            const exact = draftTag ? actualTags.get(draftKey) : null;
            const createError = editableTagError(draftTag);

            if (draftTag && !exact && !createError) {
                createSharedPickerTreeRow(list, {
                    depth: 0,
                    rowClasses: "local-search-tag-tree-row local-search-batch-create-tag-row is-action-row",
                    active: state.add.has(draftKey),
                    icon: "plus",
                    name: `创建并添加 ${draftTag}`,
                    itemTitle: `创建并添加标签 ${draftTag}`,
                    onClick: () => toggleAdd(draftTag)
                });
            }

            renderNodes(roots, 0, query);
            if (createError) {
                list.createDiv({ text: createError, cls: "local-search-empty-hint" });
            } else if (!list.children.length) {
                list.createDiv({
                    text: query
                        ? "没有匹配的已有标签"
                        : "当前仓库没有已有标签，可直接输入新标签创建",
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
            renderCurrent();
            renderList({ preserveScroll });
            footer.sync();
        };

        this._activateBatchPickerSearch(session, search, renderList, renderAll);
    },
};

