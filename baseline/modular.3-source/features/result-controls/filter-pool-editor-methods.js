// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { registerPickerCleanup } from "../../core/picker-cleanup.js";
import { createSharedFolderCountProvider, sharedFolderChildren } from "../../data/folders/folder-tree.js";
import { RESULT_FILE_TYPE_ACTIONS, logicalFileType, resultFileTypeAction } from "../../data/formats/file-types.js";
import { collectPropertyKeys } from "../../data/properties/property-catalog.js";
import { propertyValueKey } from "../../data/properties/property-values.js";
import { buildTagTreeModel, flattenTagTreePaths } from "../../data/tags/tag-tree.js";
import { NO_TAGS_FILTER_VALUE, buildHierarchicalTagUsageCounts, tagIdentityKey } from "../../data/tags/tag-values.js";
import { rerenderPickerListPreservingScroll } from "../../interactions/scroll-anchor.js";
import { createSearchButton } from "../../ui/components/input-controls.js";
import { createViewComposerChoice, syncViewComposerChoiceSelection } from "../../ui/components/view-composer.js";
import { configureSharedPickerHeader } from "../../ui/pickers/picker-header.js";
import { activatePickerSearch, createSharedPickerTreeShell } from "../../ui/pickers/picker-shell.js";
import { createFacetPickerSelectionMode } from "../../ui/pickers/selection-mode.js";
import { createPickerRowAction, createSharedPickerTreeRow } from "../../ui/pickers/tree-row.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { normalizeFileTypeFilterValue } from "../filters/filter-state.js";
import { normalizeFilterPoolSelectionMode, normalizeFilterPools, normalizePropertyPoolEntries, normalizePropertyPoolEntry, propertyPoolEntryHasState } from "../filters/pool-config.js";
import { filterPoolValueDisplay, filterPoolValueKey, filterPoolValueVisible, propertyPoolEntry, propertyPoolKeyVisible } from "../filters/pool-values.js";
// Instance method owner. `this` is the unchanged SearchResultControlsController instance. No additional state store.
export const SearchResultControlsController_filter_pool_editor_methods = {


    filterPools() {
        return normalizeFilterPools(
            this.owner?.plugin?.settings?.filterPools
        );
    },


    _filterPoolUniverse() {
        const core = this.owner;
        const visibility = core._prepareResultVisibility();
        return Array.from(core.plugin.fileMetaCache.values())
            .filter(meta => core._isResultMetaVisible(meta, false, visibility))
            .map(meta => core.createFlow?.isCreateView?.() ? meta : core.plugin._searchMeta(meta));
    },


    _filterPoolHeaderCatalog(pools) {
        const core = this.owner, plugin = core.plugin, settings = plugin.settings;
        if (!pools.some(pool => pool.visible !== false)) return new Map();
        const key = JSON.stringify(["pools", ...core._residentResultScope(), pools, settings.excludedKeys,
            settings.pickerTagOrder, settings.pickerFolderOrder, Boolean(core.createFlow?.isCreateView?.())]);
        const cached = plugin._getResidentSearchSnapshot(key);
        if (cached) return cached.catalog;
        const source = this._filterPoolUniverse(), catalog = new Map();
        let size = 0;
        for (const pool of pools) {
            if (pool.visible === false) continue;
            const entries = this._filterPoolDisplayEntries(pool, source);
            catalog.set(pool.id, entries);
            size += entries.length;
        }
        plugin._rememberSearchSnapshot(key, { catalog, size });
        return catalog;
    },


    _filterPoolEntries(pool, source = this._filterPoolUniverse()) {
        const core = this.owner;
        if (!pool) return [];
        let entries = [];

        if (pool.kind === "property") {
            entries = collectPropertyKeys(source, []).filter(key =>
                !(core.plugin.settings.excludedKeys || []).includes(key)
                && propertyPoolKeyVisible(pool, key)).map(key => ({
                    key, value: key, label: key, count: 0
                }));
        } else if (pool.kind === "tag") {
            const usage = buildHierarchicalTagUsageCounts(source);
            const roots = buildTagTreeModel(
                source,
                core.plugin.settings.pickerTagOrder
            );
            const orderedTags = flattenTagTreePaths(roots);
            entries = [
                {
                    key: NO_TAGS_FILTER_VALUE,
                    value: NO_TAGS_FILTER_VALUE,
                    label: "没有标签",
                    count: usage.noTags
                },
                ...orderedTags.map(tag => ({
                    key: tagIdentityKey(tag),
                    value: tag,
                    label: tag,
                    count: usage.counts.get(tagIdentityKey(tag)) || 0
                }))
            ];
        } else if (pool.kind === "folder") {
            const paths = new Set();
            for (const meta of source) {
                const filePath = String(meta?.path || "");
                const slash = filePath.lastIndexOf("/");
                let current = slash >= 0 ? filePath.slice(0, slash) : "";
                if (!current) paths.add("/");
                while (current) {
                    paths.add(current);
                    const parentSlash = current.lastIndexOf("/");
                    current = parentSlash >= 0
                        ? current.slice(0, parentSlash)
                        : "";
                }
            }
            const orderedPaths = [];
            if (paths.has("/")) orderedPaths.push("/");
            const visit = folder => {
                for (const child of sharedFolderChildren(
                    core.app,
                    core.plugin,
                    folder
                )) {
                    if (paths.has(child.path)) orderedPaths.push(child.path);
                    visit(child);
                }
            };
            visit(core.app.vault.getRoot());
            const included = new Set(orderedPaths);
            for (const path of [...paths].sort((a, b) =>
                a.localeCompare(
                    b,
                    "zh-Hans-CN",
                    { numeric: true }
                )
            )) {
                if (!included.has(path)) orderedPaths.push(path);
            }

            const countFor = createSharedFolderCountProvider(source);
            entries = orderedPaths.map(path => ({
                key: path,
                value: path,
                label: filterPoolValueDisplay(pool, path),
                count: countFor(path)
            }));
        } else if (pool.kind === "fileType") {
            const counts = new Map();
            for (const meta of source) {
                const kind = logicalFileType(meta);
                counts.set(kind, (counts.get(kind) || 0) + 1);
            }
            entries = RESULT_FILE_TYPE_ACTIONS.map(def => ({
                key: def.value,
                value: def.value,
                label: def.label,
                count: counts.get(def.value) || 0
            }));
        }

        return entries;
    },


    _filterPoolDisplayEntries(pool, source) {
        const entries = this._filterPoolEntries(pool, source);
        if (!this.owner?.createFlow?.isCreateView?.()) return entries;

        // 创建模式复用同一筛选池，只投影可以真正写入 CreateDraft 的值。
        // 查询结构态继续只属于搜索模式，不能通过快捷池混入新文件元数据。
        if (pool?.kind === "tag") {
            return entries.filter(entry => entry.value !== NO_TAGS_FILTER_VALUE);
        }
        if (pool?.kind === "fileType") {
            return entries.filter(entry =>
                ["note", "canvas", "excalidraw"].includes(entry.value)
            );
        }
        return entries;
    },


    _filterPoolById(poolId) {
        const id = String(poolId || "");
        if (!id) return null;
        return this.filterPools().find(pool => pool.id === id) || null;
    },


    _isFilterPoolValueVisible(poolId, value) {
        const pool = this._filterPoolById(poolId);
        if (!pool || pool.kind === "property") return false;
        return filterPoolValueVisible(
            pool,
            filterPoolValueKey(pool, value)
        );
    },


    async _toggleFilterPoolValueVisibility(poolId, value) {
        const pool = this._filterPoolById(poolId);
        if (!pool || pool.kind === "property") return null;
        const valueKey = filterPoolValueKey(pool, value);
        if (!valueKey) return pool;

        const next = this.filterPools().map(item => {
            if (item.id !== pool.id) return item;
            if (item.showAllValues) {
                const hidden = new Set(item.hiddenValueKeys || []);
                if (hidden.has(valueKey)) hidden.delete(valueKey);
                else hidden.add(valueKey);
                return {
                    ...item,
                    hiddenValueKeys: [...hidden]
                };
            }

            const visible = new Set(item.visibleValueKeys || []);
            if (visible.has(valueKey)) visible.delete(valueKey);
            else visible.add(valueKey);
            return {
                ...item,
                visibleValueKeys: [...visible]
            };
        });

        await this.owner.plugin.setFilterPools(next);
        return this._filterPoolById(pool.id);
    },


    // Candidate catalog is shared by bulk mutations and the state-derived one-button action.
    // No second list/cache may decide what “all selected” means.
    _filterPoolCandidateKeys(pool) {
        if (!pool) return [];
        const source = this._filterPoolUniverse();
        return normalizeUniqueStringList(pool.kind === "property"
            ? collectPropertyKeys(source, []).filter(key =>
                !(this.owner.plugin.settings.excludedKeys || []).includes(key))
            : this._filterPoolEntries(pool, source).map(entry => entry.key));
    },


    _filterPoolCandidateBulkAction(poolId) {
        const pool = this._filterPoolById(poolId);
        if (!pool) return { action: "all", count: 0 };
        const candidates = this._filterPoolCandidateKeys(pool);
        const visible = key => pool.kind === "property"
            ? propertyPoolKeyVisible(pool, key)
            : filterPoolValueVisible(pool, key);
        return {
            action: candidates.length && candidates.every(visible) ? "clear" : "all",
            count: candidates.length
        };
    },


    // All/clear/automatic only manage visible keys or values, never the applied FilterState.
    async _setFilterPoolCandidateVisibility(poolId, action) {
        const pool = this._filterPoolById(poolId);
        if (!pool || !["all", "clear", "automatic"].includes(action)) return null;
        const keys = this._filterPoolCandidateKeys(pool);
        const next = this.filterPools().map(item => {
            if (item.id !== poolId) return item;
            if (item.kind === "property") {
                const currentVisible = keys.filter(key => propertyPoolKeyVisible(item, key));
                if (action === "automatic") {
                    if (!item.autoIncludeKeys) return {
                        ...item, autoIncludeKeys: true,
                        hiddenKeyNames: item.hiddenKeyNames || []
                    };
                    const entries = { ...normalizePropertyPoolEntries(item.propertyEntries) };
                    for (const key of keys) entries[key] = {
                        ...propertyPoolEntry(item, key), showKey: currentVisible.includes(key)
                    };
                    return { ...item, autoIncludeKeys: false, hiddenKeyNames: [], propertyEntries: entries };
                }
                if (item.autoIncludeKeys) {
                    const hidden = new Set(item.hiddenKeyNames || []);
                    for (const key of keys) action === "all" ? hidden.delete(key) : hidden.add(key);
                    return { ...item, hiddenKeyNames: [...hidden] };
                }
                const entries = { ...normalizePropertyPoolEntries(item.propertyEntries) };
                for (const key of keys) entries[key] = {
                    ...propertyPoolEntry(item, key), showKey: action === "all"
                };
                return { ...item, propertyEntries: entries };
            }
            const currentVisible = keys.filter(key => filterPoolValueVisible(item, key));
            if (action === "automatic") return item.showAllValues
                ? { ...item, showAllValues: false, visibleValueKeys: currentVisible, hiddenValueKeys: [] }
                : { ...item, showAllValues: true, hiddenValueKeys: item.hiddenValueKeys || [] };
            if (item.showAllValues) {
                const hidden = new Set(item.hiddenValueKeys || []);
                for (const key of keys) action === "all" ? hidden.delete(key) : hidden.add(key);
                return { ...item, hiddenValueKeys: [...hidden] };
            }
            const shown = new Set(item.visibleValueKeys || []);
            for (const key of keys) action === "all" ? shown.add(key) : shown.delete(key);
            return { ...item, visibleValueKeys: [...shown] };
        });
        await this.owner.plugin.setFilterPools(next);
        return this._filterPoolById(poolId);
    },


    _isPropertyPoolKeyVisible(poolId, key) {
        const pool = this._filterPoolById(poolId);
        return propertyPoolKeyVisible(pool, key);
    },


    async _updatePropertyPoolEntry(poolId, key, updater) {
        const propertyKey = String(key || "").trim();
        const pool = this._filterPoolById(poolId);
        if (!propertyKey || !pool || pool.kind !== "property") return null;

        const previousEntry = propertyPoolEntry(pool, propertyKey);
        const nextEntry = normalizePropertyPoolEntry(
            typeof updater === "function"
                ? updater(previousEntry)
                : previousEntry
        );
        if (JSON.stringify(previousEntry) === JSON.stringify(nextEntry)) return pool;

        const next = this.filterPools().map(item => {
            if (item.id !== pool.id) return item;
            const propertyEntries = {
                ...normalizePropertyPoolEntries(item.propertyEntries)
            };
            if (propertyPoolEntryHasState(nextEntry)) {
                propertyEntries[propertyKey] = nextEntry;
            } else {
                delete propertyEntries[propertyKey];
            }
            return {
                ...item,
                propertyEntries
            };
        });

        if (await this.owner.plugin.setFilterPools(next) === false) return false;
        return this._filterPoolById(pool.id);
    },


    async _togglePropertyPoolKeyVisibility(poolId, key) {
        const pool = this._filterPoolById(poolId);
        if (pool?.autoIncludeKeys) {
            const hidden = new Set(pool.hiddenKeyNames || []);
            if (hidden.has(key)) hidden.delete(key);
            else hidden.add(key);
            await this.owner.plugin.setFilterPools(this.filterPools().map(item =>
                item.id === poolId ? { ...item, hiddenKeyNames: [...hidden] } : item
            ));
            return this._filterPoolById(poolId);
        }
        return this._updatePropertyPoolEntry(poolId, key, current => ({
            ...current, showKey: !current.showKey
        }));
    },


    _openFilterPoolEditor(pool) {
        const core = this.owner;
        if (!pool || !core || core._destroyed) return;
        // View Composer 子 Picker 统一锚定结果视图按钮。父 Composer 打开子层时会被暂存隐藏，
        // 因此不能使用父 Panel 内部 Row 作为几何锚点，也不再分别跳到四种顶部筛选按钮。
        const childAnchor = this.resultViewBtn?.isConnected
            ? this.resultViewBtn
            : null;

        if (pool.kind === "tag") {
            core.facets.openTagPicker({
                mode: "pool",
                poolId: pool.id,
                anchor: childAnchor || core.tagFilterBtn
            });
            return;
        }

        if (pool.kind === "property") {
            core.facets.openPropertyPicker(
                "",
                childAnchor || core.propertyFilterBtn,
                {
                    mode: "pool",
                    poolId: pool.id
                }
            );
            return;
        }

        if (pool.kind === "folder") {
            core.facets.showFolderDropdown({
                mode: "pool",
                poolId: pool.id,
                anchor: childAnchor || core.folderBtn
            });
            return;
        }

        if (pool.kind === "fileType") {
            this._openFileTypeFilterPoolPicker(
                pool.id,
                childAnchor || core.typeButtonEls?.[0]
            );
        }
    },


    // Fixed "file type" toolbar button opens a real selection picker, not the
    // Filter Pool visibility editor. The value action is the same FilterState path
    // used by ordinary type chips and result-card type shortcuts.
    _openFileTypeChoicePicker(anchor, options = {}) {
        const core = this.owner;
        if (!core || core._destroyed || !anchor?.isConnected) return;
        const createMode = Boolean(core.createFlow?.isCreateView?.());
        const panel = core.dropdown.open(anchor, "文件类型筛选");
        if (!panel) return;
        panel.addClass("local-search-folder-dropdown", "local-search-picker-dropdown", "local-search-facet-picker");
        const header = configureSharedPickerHeader(panel, { headingText: "文件类型", icon: "files" });
        const { search, list } = createSharedPickerTreeShell(panel, {
            placeholder: "搜索文件类型…", showRoot: false
        });
        const pool = this._filterPoolById("fileType");
        // Reuse the ordinary facet draft and Done owner, including cancel
        // semantics. Creation still selects a single supported draft type.
        const entries = this._filterPoolDisplayEntries(pool, this._filterPoolUniverse());
        let selectionMode = null;
        const render = () => {
            list.empty();
            const query = search.value.trim().toLocaleLowerCase("zh-CN");
            const state = selectionMode?.isActive() ? selectionMode.draft : core.filterState;
            let visible = 0;
            for (const entry of entries) {
                if (query && !entry.label.toLocaleLowerCase("zh-CN").includes(query)) continue;
                visible++;
                const active = state.fileTypes.has(entry.value);
                createSharedPickerTreeRow(list, {
                    depth: 0,
                    active,
                    itemTitle: `筛选文件类型 ${entry.label}`,
                    icon: resultFileTypeAction(entry.value).icon,
                    name: entry.label,
                    count: entry.count,
                    countClasses: "local-search-folder-count",
                    countPlacement: "row-end",
                    onClick: () => {
                        if (selectionMode?.isActive() && selectionMode.draft) {
                            core._applyFacetSelectionToState(selectionMode.draft, "fileType", entry.value, { mode: "toggle" });
                            selectionMode.refresh();
                            return;
                        }
                        const mode = !createMode && active && core.filterState.fileTypes.size === 1 ? "clear" : "replace";
                        core._applyFacetSelection("fileType", entry.value, { mode });
                        core._onFilterChanged();
                        if (core.dropdown.close() !== false && !createMode) options.onCommit?.();
                    }
                });
            }
            if (!visible) list.createDiv({
                cls: "local-search-empty-hint", text: "没有匹配的文件类型"
            });
        };
        if (!createMode) selectionMode = createFacetPickerSelectionMode(panel, header, {
            core, kind: "fileType", title: "文件类型多选", onCommit: options.onCommit,
            onStateChange: () => rerenderPickerListPreservingScroll(list, render)
        });
        activatePickerSearch(search, { onInput: render, initialRender: render });
        if (pool?.selectionMode === "multi") selectionMode?.setActive(true);
    },


    _openFileTypeFilterPoolPicker(poolId, preferredAnchor = null) {
        const core = this.owner;
        const anchor = preferredAnchor?.isConnected
            ? preferredAnchor
            : (this.resultViewBtn || core.typeButtonEls?.[0]);
        if (!anchor) return;

        const panel = core.dropdown.openChild(
            anchor,
            "文件类型筛选池"
        );
        panel.addClass(
            "local-search-folder-dropdown",
            "local-search-picker-dropdown",
            "local-search-facet-picker",
            "local-search-filter-pool-config-picker",
            "is-persistent-toggle"
        );

        configureSharedPickerHeader(panel, {
            headingText: "文件类型 · 筛选池",
            icon: "files"
        });
        this._attachFilterPoolSelectionModeControl(panel, poolId);

        const { search, list } = createSharedPickerTreeShell(panel, {
            placeholder: "搜索要显示的文件类型…",
            treeClasses: "local-search-folder-tree",
            showRoot: false
        });

        const render = () => {
            list.empty();
            const query = search.value.trim().toLowerCase();
            const pool = this._filterPoolById(poolId);
            if (!pool) {
                list.createDiv({
                    cls: "local-search-empty-hint",
                    text: "筛选池已不存在"
                });
                return;
            }

            const entries = this._filterPoolEntries(pool)
                .filter(entry =>
                    !query
                    || entry.label.toLowerCase().includes(query)
                );
            for (const entry of entries) {
                const visible = filterPoolValueVisible(
                    pool,
                    entry.key
                );
                const toggle = () => {
                    const pending = this._toggleFilterPoolValueVisibility(pool.id, entry.value);
                    render();
                    void pending.catch(error => console.warn("文件类型筛选池保存失败", error));
                };
                createSharedPickerTreeRow(list, {
                    depth: 0,
                    active: visible,
                    itemTitle: `${visible ? "从筛选池隐藏" : "在筛选池显示"} ${entry.label}`,
                    icon: resultFileTypeAction(entry.value).icon,
                    name: entry.label,
                    count: entry.count,
                    countClasses: "local-search-folder-count",
                    countPlacement: "row-end",
                    onClick: toggle,
                    renderTrailing: row => createPickerRowAction(row, {
                        icon: visible ? "eye" : "eye-off",
                        interaction: "choice",
                        label: `${visible ? "隐藏" : "显示"}文件类型 ${entry.label}`,
                        onClick: toggle
                    })
                });
            }

            if (!entries.length) {
                list.createDiv({
                    cls: "local-search-empty-hint",
                    text: "没有匹配的文件类型"
                });
            }
        };

        panel._lsPoolVisibilityRefresh = render;
        search.addEventListener("input", render);
        render();
    },


    _filterPoolSelectionMode(pool) {
        return normalizeFilterPoolSelectionMode(pool?.selectionMode);
    },


    _migrateFilterPoolSelectionMode(poolId, nextMode) {
        const core = this.owner;
        if (!core || core._destroyed || core.createFlow?.isCreateView?.()) return false;
        const pool = this._filterPoolById(poolId);
        if (!pool) return false;
        const mode = normalizeFilterPoolSelectionMode(nextMode);
        const state = core.filterState;
        let changed = false;

        if (pool.kind === "tag") {
            // Mode 设置本身只迁移选择数量；查询匹配语义由真正发生选择的入口拥有。
            if (mode === "single" && state.tags.size > 1) {
                const first = state.tags.values().next().value;
                state.tags.clear();
                if (first !== undefined) state.tags.add(first);
                changed = true;
            }
        } else if (pool.kind === "property") {
            // Single applies to values inside each key. Different keys remain AND
            // conditions, regardless of single/multi choice within a key.
            if (mode === "single") {
                for (const [key, values] of state.properties) {
                    if ((values?.size || 0) <= 1) continue;
                    state.properties.set(key, new Set([values.values().next().value]));
                    changed = true;
                }
            }
            if (state.propertyMatchMode !== "all") {
                state.propertyMatchMode = "all";
                changed = true;
            }
        } else if (mode === "single" && pool.kind === "folder" && state.folders.size > 1) {
            const first = state.folders.values().next().value;
            state.folders.clear();
            if (first !== undefined) state.folders.add(first);
            changed = true;
        } else if (mode === "single" && pool.kind === "fileType" && state.fileTypes.size > 1) {
            const first = state.fileTypes.values().next().value;
            state.fileTypes.clear();
            if (first !== undefined) state.fileTypes.add(first);
            changed = true;
        }
        return changed;
    },


    _attachFilterPoolSelectionModeControl(panel, poolId) {
        const core = this.owner;
        if (!panel || !poolId || !core) return null;
        if (this._filterPoolById(poolId)?.kind === "property") {
            const controls = panel.createDiv({ cls: "local-search-filter-pool-selection-controls is-key-only" });
            const automatic = createSearchButton(controls, "choice", {
                cls: "local-search-filter-pool-auto", attr: { type: "button", role: "switch" }
            });
            automatic.createSpan({ text: "自动显示新属性键" });
            automatic.createSpan({ cls: "local-search-filter-pool-auto-mark", attr: { "aria-hidden": "true" } });
            const bulkAction = createSearchButton(controls, "action", {
                cls: "local-search-filter-pool-text-action", text: "全选"
            });
            const sync = () => {
                const pool = this._filterPoolById(poolId);
                if (!pool) return;
                automatic.setAttribute("aria-checked", String(pool.autoIncludeKeys));
                automatic.setAttribute("aria-label", `自动显示新属性键：${pool.autoIncludeKeys ? "开启" : "关闭"}`);
                const bulk = this._filterPoolCandidateBulkAction(poolId);
                bulkAction.setText(bulk.action === "all" ? "全选" : "清空");
                bulkAction.disabled = bulk.count === 0;
            };
            const apply = action => async event => {
                event.preventDefault(); event.stopPropagation();
                await this._setFilterPoolCandidateVisibility(poolId, action);
                if (panel.isConnected) { sync(); panel._lsPoolVisibilityRefresh?.(); }
            };
            automatic.addEventListener("click", apply("automatic"));
            bulkAction.addEventListener("click", event => {
                void apply(this._filterPoolCandidateBulkAction(poolId).action)(event);
            });
            panel._lsPoolSelectionModeRefresh = sync;
            registerPickerCleanup(panel, () => {
                delete panel._lsPoolSelectionModeRefresh;
                delete panel._lsPoolVisibilityRefresh;
            });
            sync();
            return { controls, automatic, bulkAction, sync };
        }
        const controls = panel.createDiv({ cls: "local-search-filter-pool-selection-controls" });
        const segment = controls.createDiv({
            cls: "local-search-view-mode-grid local-search-filter-pool-selection-mode",
            attr: { role: "group", "aria-label": "筛选池点击方式" }
        });
        const single = createViewComposerChoice(segment, { text: "单选" });
        const multi = createViewComposerChoice(segment, { text: "多选" });
        controls.createSpan({ cls: "local-search-filter-pool-controls-divider", attr: { "aria-hidden": "true" } });
        const automatic = createSearchButton(controls, "choice", {
            cls: "local-search-filter-pool-auto",
            attr: { type: "button", role: "switch", "aria-checked": "false" }
        });
        automatic.createSpan({ text: "自动包含新值" });
        automatic.createSpan({ cls: "local-search-filter-pool-auto-mark", attr: { "aria-hidden": "true" } });
        const bulkAction = createSearchButton(controls, "action", {
            cls: "local-search-filter-pool-text-action", text: "全选"
        });

        const sync = () => {
            const pool = this._filterPoolById(poolId);
            if (!pool) return;
            const mode = this._filterPoolSelectionMode(pool);
            syncViewComposerChoiceSelection(single, mode === "single");
            syncViewComposerChoiceSelection(multi, mode === "multi");
            const on = pool.kind === "property" ? pool.autoIncludeKeys : pool.showAllValues;
            automatic.setAttribute("aria-checked", String(Boolean(on)));
            automatic.setAttribute("aria-label", `自动包含新${pool.kind === "property" ? "属性键" : "值"}：${on ? "开启" : "关闭"}`);
            const bulk = this._filterPoolCandidateBulkAction(poolId);
            bulkAction.setText(bulk.action === "all" ? "全选" : "清空");
            bulkAction.setAttribute("aria-label", bulk.action === "all" ? "显示所有候选项" : "隐藏所有候选项");
            bulkAction.disabled = bulk.count === 0;
        };
        const choose = mode => async event => {
            event.preventDefault(); event.stopPropagation();
            await core.plugin.setFilterPoolSelectionMode(poolId, mode);
            if (panel.isConnected) sync();
        };
        const applyVisibility = action => async event => {
            event.preventDefault(); event.stopPropagation();
            await this._setFilterPoolCandidateVisibility(poolId, action);
            if (panel.isConnected) { sync(); panel._lsPoolVisibilityRefresh?.(); }
        };
        single.addEventListener("click", choose("single"));
        multi.addEventListener("click", choose("multi"));
        automatic.addEventListener("click", applyVisibility("automatic"));
        bulkAction.addEventListener("click", event => {
            const action = this._filterPoolCandidateBulkAction(poolId).action;
            void applyVisibility(action)(event);
        });
        panel._lsPoolSelectionModeRefresh = sync;
        registerPickerCleanup(panel, () => {
            delete panel._lsPoolSelectionModeRefresh;
            delete panel._lsPoolVisibilityRefresh;
        });
        sync();
        return { controls, segment, single, multi, automatic, bulkAction, sync };
    },


    _isFilterPoolValueActive(pool, value, propertyKey = "") {
        const core = this.owner;
        if (pool.kind === "property") {
            const selected = core.filterState.properties.get(propertyKey) || new Set();
            const wanted = propertyValueKey(value);
            return [...selected].some(item => propertyValueKey(item) === wanted);
        }
        if (pool.kind === "tag") {
            if (value === NO_TAGS_FILTER_VALUE) return core.filterState.tags.has(NO_TAGS_FILTER_VALUE);
            const wanted = tagIdentityKey(value);
            return [...core.filterState.tags].some(item =>
                item !== NO_TAGS_FILTER_VALUE
                && tagIdentityKey(item) === wanted
            );
        }
        if (pool.kind === "folder") return core.filterState.folders.has(value);
        if (pool.kind === "fileType") return core.filterState.fileTypes.has(normalizeFileTypeFilterValue(value));
        return false;
    },


    _toggleFilterPoolValue(pool, value, propertyKey = "") {
        const core = this.owner;
        const createMode = Boolean(core.createFlow?.isCreateView?.());
        const selectionMode = this._filterPoolSelectionMode(pool);

        if (pool.kind === "property") {
            if (!propertyKey) return;
            if (!createMode) core.filterState.propertyMatchMode = "all";
            if (createMode) {
                const active = this._isFilterPoolValueActive(pool, value, propertyKey);
                const propertyType = core.createFlow?._propertyTypeForKey?.(propertyKey) || "text";
                core._applyFacetSelection("property", value, {
                    key: propertyKey,
                    mode: propertyType === "multitext" ? "toggle" : (active ? "remove" : "replace")
                });
            } else if (selectionMode === "multi") {
                core._applyFacetSelection("property", value, { key: propertyKey, mode: "toggle" });
            } else {
                const active = this._isFilterPoolValueActive(pool, value, propertyKey);
                const onlyCurrent = active && (core.filterState.properties.get(propertyKey)?.size || 0) === 1;
                if (onlyCurrent) core.filterState.properties.delete(propertyKey);
                else core._applyFacetSelection("property", value, { key: propertyKey, mode: "replace" });
            }
        } else if (pool.kind === "tag") {
            if (!createMode) core.filterState.tagMatchMode = selectionMode === "multi" ? "any" : "all";
            if (createMode || selectionMode === "multi") {
                core._applyFacetSelection("tag", value, { mode: "toggle" });
            } else {
                const active = this._isFilterPoolValueActive(pool, value);
                const onlyCurrent = active && core.filterState.tags.size === 1;
                core.filterState.tags.clear();
                if (!onlyCurrent) core._applyFacetSelection("tag", value, { mode: "replace" });
            }
        } else if (pool.kind === "folder") {
            if (createMode) {
                const active = this._isFilterPoolValueActive(pool, value);
                core._applyFacetSelection("folder", value, { mode: active || value === "/" ? "clear" : "replace" });
            } else if (selectionMode === "multi") {
                core._applyFacetSelection("folder", value, { mode: "toggle" });
            } else {
                const active = this._isFilterPoolValueActive(pool, value);
                const onlyCurrent = active && core.filterState.folders.size === 1;
                core.filterState.folders.clear();
                if (!onlyCurrent) core._applyFacetSelection("folder", value, { mode: "replace" });
            }
        } else if (pool.kind === "fileType") {
            if (createMode) {
                core._applyFacetSelection("fileType", value, { mode: "replace" });
            } else if (selectionMode === "multi") {
                core._applyFacetSelection("fileType", value, { mode: "toggle" });
            } else {
                const normalized = normalizeFileTypeFilterValue(value);
                const active = core.filterState.fileTypes.has(normalized);
                const onlyCurrent = active && core.filterState.fileTypes.size === 1;
                core.filterState.fileTypes.clear();
                if (!onlyCurrent && normalized) core.filterState.fileTypes.add(normalized);
            }
        }
        core._onFilterChanged();
    },
};

