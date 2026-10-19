// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { registerPickerCleanup } from "../../core/picker-cleanup.js";
import { orderFolderSelectionsForPicker } from "../../data/folders/folder-tree.js";
import { fileTypeFilterDisplay } from "../../data/formats/file-types.js";
import { collectPropertyKeys, orderPropertySelectionsForPicker, orderPropertyValuesForPicker } from "../../data/properties/property-catalog.js";
import { metadataPropertySample, parseMetadataPropertyInput } from "../../data/properties/property-types.js";
import { PRESENT_PROPERTY_VALUE, buildPropertyUsageStats, isSpecialPropertyValue, propertyFilterChipValueDisplay, propertySpecialInlineDisplay, propertyValueDisplay, propertyValueKey, propertyValuePlainDisplay, propertyValuesFromRaw } from "../../data/properties/property-values.js";
import { orderTagSelectionsForPicker } from "../../data/tags/tag-tree.js";
import { NO_TAGS_FILTER_VALUE } from "../../data/tags/tag-values.js";
import { PointerSortCoordinator } from "../../interactions/PointerSortCoordinator.js";
import { rerenderPickerListPreservingScroll, revealScrollableKey } from "../../interactions/scroll-anchor.js";
import { createSearchButton } from "../../ui/components/input-controls.js";
import { appendPropertySpecialStateInlineGroup } from "../../ui/components/property-state.js";
import { createDialogSubmission } from "../../ui/dialogs/submission.js";
import { attachFacetPickerOverflow, attachPickerHeaderModes } from "../../ui/pickers/header-modes.js";
import { PROPERTY_SHORTCUT_DEFAULT_ICON } from "../../ui/pickers/icon-catalog.js";
import { openFilterToolbarIconPicker } from "../../ui/pickers/icon-picker.js";
import { configureSharedPickerHeader } from "../../ui/pickers/picker-header.js";
import { activatePickerSearch, createPickerAutoLocateScheduler, createSharedPickerTreeShell } from "../../ui/pickers/picker-shell.js";
import { createFacetPickerSelectionMode, deactivateConflictingFacetPickerModes } from "../../ui/pickers/selection-mode.js";
import { createSharedPickerSelectionStrip } from "../../ui/pickers/selection-strip.js";
import { attachFacetPickerSortModeToggle } from "../../ui/pickers/sort-mode.js";
import { createPickerRowAction, createSharedPickerTreeRow, syncSharedPickerTreeRowAvailability } from "../../ui/pickers/tree-row.js";
import { sortByPreferredOrder } from "../../utils/preferred-order.js";
import { filterDateRangeDisplay } from "../filters/filter-state.js";
import { filterPoolId } from "../filters/pool-config.js";
import { propertyPoolEntry } from "../filters/pool-values.js";
import { Notice } from "obsidian";
// Instance method owner. `this` is the unchanged SearchFacetController instance. No additional state store.
export const SearchFacetController_property_picker_methods = {


    openPropertyPicker(initialKey = "", anchor, options = {}) {
        const core = this.owner;
        const poolMode = options?.mode === "pool";
        const quickValueMode = !poolMode && options?.mode === "quick-value";
        const quickKey = quickValueMode
            ? String(initialKey || "").trim()
            : "";
        const createContext = !poolMode
            && Boolean(core.createFlow?.isCreateView?.());
        const createMode = createContext && !quickValueMode;
        const poolId = poolMode
            ? String(options.poolId || filterPoolId("property"))
            : "";
        let maintenanceMode = "";
        if (anchor === undefined) anchor = core.propertyFilterBtn;
        if (createContext) return core.createFlow.openMetadataPicker(anchor, "property", quickKey);
        const panel = poolMode
            ? core.dropdown.openChild(anchor, "属性筛选池")
            : core.dropdown.open(
                anchor,
                quickValueMode
                    ? (quickKey || "属性值")
                    : (createMode ? "新建 · 属性" : "属性筛选")
            );
        if (!panel) return;
        panel.addClass(
            "local-search-folder-dropdown",
            "local-search-property-dropdown",
            "local-search-picker-dropdown",
            "local-search-facet-picker"
        );
        if (createMode) panel.addClass("is-create-metadata-picker");
        if (poolMode) panel.addClass(
            "local-search-filter-pool-config-picker",
            "is-persistent-toggle"
        );
        if (quickValueMode) panel.addClass("is-quick-property-value-picker");

        let propertyUniverse = [];
        let allPropertyKeyUniverse = [];
        let propertyKeyUniverse = [];
        let resultPropertyKeyUniverse = new Set();
        let propertyValueUniverse = new Map();
        const refreshSource = () => {
            // 固定入口属于全库属性键配置，不受当前搜索词或项目结果范围限制。
            // 仅进入 Pin 模式时直接读取已有索引，不创建影子索引或重复监听。
            propertyUniverse = poolMode
                ? (core.resultControls?._filterPoolUniverse?.() || [])
                : maintenanceMode
                    ? core._navigationCandidates().all
                    : core._navigationCandidates().scope;

            // 固定属性入口只锁定一个已知 key：不为单键 Picker 扫描 / 构建
            // 全部属性键和值目录，保持 quick-value 真正轻量。
            if (quickValueMode) {
                const excluded = new Set(core.plugin.settings.excludedKeys || []);
                const available = Boolean(quickKey) && !excluded.has(quickKey);
                allPropertyKeyUniverse = available ? [quickKey] : [];
                propertyKeyUniverse = [...allPropertyKeyUniverse];
                resultPropertyKeyUniverse = new Set(allPropertyKeyUniverse);
                propertyValueUniverse = new Map();
                if (available) {
                    propertyValueUniverse.set(
                        quickKey,
                        buildPropertyUsageStats(
                            propertyUniverse,
                            quickKey,
                            core.filterState.properties.get(quickKey),
                            core.filterState.folders.size ? [] : core.plugin.propertyCatalogValues(quickKey)
                        ).values
                    );
                }
                return;
            }

            allPropertyKeyUniverse = core.filterState.folders.size && !maintenanceMode && !poolMode
                ? collectPropertyKeys(propertyUniverse, [])
                : core.plugin.propertyCatalogKeys(collectPropertyKeys(propertyUniverse, []));
            const excluded = new Set(core.plugin.settings.excludedKeys || []);
            propertyKeyUniverse = allPropertyKeyUniverse.filter(
                key => !excluded.has(key)
            );
            if (poolMode || maintenanceMode === "pin") {
                // Pin 只显示键，不必计算每个键的属性值候选和结果数量。
                resultPropertyKeyUniverse = new Set();
                propertyValueUniverse = new Map();
                return;
            }
            resultPropertyKeyUniverse = new Set(
                allPropertyKeyUniverse.filter(key =>
                    propertyUniverse.some(meta =>
                        propertyValuesFromRaw(meta.properties?.[key]).length > 0
                    )
                )
            );
            propertyValueUniverse = new Map();
            for (const key of allPropertyKeyUniverse) {
                const values = buildPropertyUsageStats(
                    propertyUniverse,
                    key,
                    core.filterState.properties.get(key),
                    core.filterState.folders.size && !maintenanceMode ? [] : core.plugin.propertyCatalogValues(key)
                ).values;
                propertyValueUniverse.set(
                    key,
                    createMode
                        ? values.filter(value =>
                            value !== PRESENT_PROPERTY_VALUE
                            && !isSpecialPropertyValue(value)
                        )
                        : values
                );
            }
        };
        refreshSource();

        const propertyTypeForKey = key => core.plugin.propertyCatalogType(key, metadataPropertySample(propertyUniverse, key));

        const valuePool = () => core.resultControls?._filterPoolById?.("property");
        const isPinned = key => propertyPoolEntry(valuePool(), key).pinnedRight;
        const savePinned = (key, changes) => {
            const save = core.resultControls?._updatePropertyPoolEntry(
                "property", key, current => ({ ...current, ...changes })
            );
            return Promise.resolve(save).then(result => {
                if (panel.isConnected) rerenderPickerListPreservingScroll(list, () => render(false));
                return result;
            }).catch(error => {
                console.warn("属性固定入口保存失败", error);
                new Notice("属性固定入口保存失败，请重试");
                return false;
            });
        };
        const orderedPropertyKeys = () => {
            const source = maintenanceMode === "exclude"
                ? allPropertyKeyUniverse
                : maintenanceMode === "result"
                    ? allPropertyKeyUniverse.filter(key =>
                        resultPropertyKeyUniverse.has(key)
                    )
                    : propertyKeyUniverse;
            return sortByPreferredOrder(source, core.plugin.settings.pickerPropertyOrder, key => key);
        };
        const orderedPropertyValues = key => {
            const values = orderPropertyValuesForPicker(
                propertyValueUniverse.get(key) || [],
                core.plugin.settings.pickerPropertyValueOrder?.[key] || []
            );
            return values;
        };
        const propertyKeySortId = key =>
            `property-key:${encodeURIComponent(key)}`;
        const propertyValueSortId = (key, valueId) =>
            `property-value:${encodeURIComponent(key)}:${encodeURIComponent(valueId)}`;
        const parsePropertySortId = id => {
            const source = String(id || "");
            if (source.startsWith("property-key:")) {
                return {
                    kind: "key",
                    key: decodeURIComponent(source.slice("property-key:".length))
                };
            }
            if (!source.startsWith("property-value:")) return null;
            const rest = source.slice("property-value:".length);
            const split = rest.indexOf(":");
            if (split < 0) return null;
            return {
                kind: "value",
                key: decodeURIComponent(rest.slice(0, split)),
                valueId: decodeURIComponent(rest.slice(split + 1))
            };
        };

        const expanded = new Set();
        if (!poolMode) {
            for (const [key, values] of core.filterState.properties.entries()) {
                const hasConcreteSelection = [...values].some(
                    value => propertyValueKey(value)
                        !== propertyValueKey(PRESENT_PROPERTY_VALUE)
                );
                if (hasConcreteSelection) expanded.add(key);
            }
            if (initialKey) expanded.add(initialKey);
        }

        const currentPropertySelectionCount = () => propertyUniverse.length;
        let render = () => {};
        let sortToggle = null;
        let coordinator = null;
        let selectionMode = null;
        const activeFilterState = () =>
            selectionMode?.isActive() && selectionMode.draft
                ? selectionMode.draft
                : core.filterState;
        const header = configureSharedPickerHeader(panel, {
            headingText: quickValueMode
                ? (quickKey || "属性值")
                : (poolMode ? "属性 · 筛选池" : (createMode ? "新建 · 属性" : "属性筛选")),
            countText: poolMode ? null : currentPropertySelectionCount(),
            // 范围数不同于已应用属性筛选后的结果数量；不改变可见 Header 结构。
            countAriaLabel: `当前文件范围总数 ${currentPropertySelectionCount()}`,
            icon: quickValueMode ? null : "list-filter"
        });
        const syncHeading = () => {
            if (poolMode) return;
            this._syncHeaderCount(header, currentPropertySelectionCount);
            header.count?.setAttribute("aria-label", `当前文件范围总数 ${currentPropertySelectionCount()}`);
        };
        if (poolMode) core.resultControls?._attachFilterPoolSelectionModeControl?.(panel, poolId);
        const current = (poolMode || quickValueMode)
            ? null
            : createSharedPickerSelectionStrip(panel, {
                canEdit: () => !maintenanceMode && !sortToggle?.active,
                onClear: () => {
                    activeFilterState().properties.clear();
                    if (selectionMode?.isActive()) return selectionMode.refresh();
                    core._onFilterChanged();
                    propertyFacetStatsCache.clear();
                    syncHeading();
                    renderCurrentSelection();
                    rerenderPickerListPreservingScroll(list, () => render(false));
                }
            });
        const { search, list } = createSharedPickerTreeShell(panel, {
            placeholder: quickValueMode
                ? `搜索${quickKey || "属性"}值…`
                : "搜索属性或属性值…",
            rootClasses: "local-search-property-root",
            treeClasses: "local-search-property-tree",
            showRoot: false
        });
        const queueAutoLocate = createPickerAutoLocateScheduler(panel, list);
        const maintenanceActions = (poolMode || createMode || quickValueMode)
            ? null
            : attachPickerHeaderModes(header, {
                modes: this.sidebarMaintenanceModes("property-key"),
                onChange: (mode, { suppressIntermediateRender = false } = {}) => {
                    maintenanceMode = mode;
                    if (mode) deactivateConflictingFacetPickerModes({
                        selectionMode, sortToggle, suppressIntermediateRender: true
                    });
                    // Sort is available only in the native property catalog, not maintenance modes.
                    if (sortToggle?.button) sortToggle.button.hidden = Boolean(mode);
                    if (header?.heading) {
                        header.heading.textContent = mode === "pin"
                            ? "固定属性到右侧"
                            : mode === "exclude"
                            ? "属性排除"
                            : mode === "result"
                                ? "结果卡属性"
                                : "属性筛选";
                    }
                    search.placeholder = mode === "pin"
                        ? "搜索要固定的属性键…"
                        : mode === "exclude"
                        ? "搜索要排除的属性…"
                        : mode === "result"
                            ? "搜索结果卡属性…"
                            : "搜索属性或属性值…";
                    refreshSource();
                    propertyFacetStatsCache.clear();
                    syncHeading();
                    if (!suppressIntermediateRender) {
                        rerenderPickerListPreservingScroll(list, () => render(false));
                    }
                }
            });

        selectionMode = poolMode
            ? null
            : createFacetPickerSelectionMode(panel, header, {
                core,
                kind: "property",
                onCommit: options.onCommit,
                title: quickValueMode ? `${quickKey || "属性"}多选` : "属性多选",
                onBeforeEnter: () => deactivateConflictingFacetPickerModes({
                    maintenanceMode: maintenanceActions, sortToggle,
                    suppressIntermediateRender: true
                }),
                onStateChange: ({ suppressIntermediateRender = false } = {}) => {
                    // Draft 是多选期间唯一计数投影源。
                    // 一次 Draft 变化只失效一次属性统计缓存，再统一刷新
                    // Header / Key / Value，确认前不触碰正式 FilterState。
                    propertyFacetStatsCache.clear();
                    syncHeading();
                    renderCurrentSelection();
                    if (!suppressIntermediateRender) {
                        rerenderPickerListPreservingScroll(list, () => render(false));
                    }
                }
            });

        const poolKeyVisible = key => Boolean(
            core.resultControls?._isPropertyPoolKeyVisible?.(poolId, key)
        );
        const rerenderPoolMode = action => {
            if (!action?.then) return;
            rerenderPickerListPreservingScroll(list, () => render(false));
            void action.catch(error => console.warn("属性筛选池保存失败", error));
        };
        const togglePoolKey = key => rerenderPoolMode(
            core.resultControls?._togglePropertyPoolKeyVisibility?.(poolId, key)
        );

        const propertyFacetStatsCache = new Map();
        const propertyFacetStats = key => {
            if (!propertyFacetStatsCache.has(key)) {
                const state = activeFilterState();
                const candidates = propertyUniverse;
                propertyFacetStatsCache.set(
                    key,
                    buildPropertyUsageStats(
                        candidates,
                        key,
                        poolMode ? [] : state.properties.get(key),
                        poolMode ? [] : (propertyValueUniverse.get(key) || [])
                    )
                );
            }
            return propertyFacetStatsCache.get(key);
        };
        // Picker 每行始终显示当前文件范围里的真实文件数，与 Navigator 同口径。
        // projectedCounts / projectedKeyCount 仍由 buildPropertyUsageStats 计算，
        // 但不得复用为“项目有多少文件”：普通点击是 replace，多选 Draft 才是 OR。
        const keyCount = key => propertyFacetStats(key).present;
        const valueCount = (key, value) =>
            propertyFacetStats(key).counts.get(
                propertyValueKey(value)
            ) || 0;

        const renderCurrentSelection = () => {
            if (!current) return;
            const entries = [];
            const orderedSelections = orderPropertySelectionsForPicker(
                activeFilterState().properties,
                core.plugin.settings.pickerPropertyOrder,
                core.plugin.settings.pickerPropertyValueOrder
            );
            for (const [key, orderedValues] of orderedSelections) {
                for (const value of orderedValues) {
                    const display = value === PRESENT_PROPERTY_VALUE
                        ? "含有此属性"
                        : propertySpecialInlineDisplay(value);
                    const label = isSpecialPropertyValue(value)
                        ? display
                        : propertyValueDisplay(value);
                    entries.push({
                        key: `${key}:${propertyValueKey(value)}`,
                        text: `${key}: ${label}`,
                        title: createMode
                            ? `移除新建属性 ${key}: ${label}`
                            : `取消属性筛选 ${key}: ${label}`,
                        onRemove: () => {
                            const state = activeFilterState();
                            core._applyFacetSelectionToState(
                                state,
                                "property",
                                value,
                                { key, mode: "remove" }
                            );
                            if (selectionMode?.isActive()) {
                                selectionMode.refresh();
                                return;
                            }
                            core._onFilterChanged();
                            propertyFacetStatsCache.clear();
                            syncHeading();
                            renderCurrentSelection();
                            rerenderPickerListPreservingScroll(
                                list,
                                () => render(false)
                            );
                        }
                    });
                }
            }
            current.render(entries);
        };

        const refreshPropertyFacet = () => {
            if (!poolMode) {
                core._onFilterChanged();
                syncHeading();
                renderCurrentSelection();
            }
            propertyFacetStatsCache.clear();
            rerenderPickerListPreservingScroll(list, () => render(false));
        };
        const choosePropertyValue = (key, value) => {
            if (sortToggle?.active) return;
            expanded.add(key);
            if (selectionMode?.isActive() && selectionMode.draft) {
                const draftValues = selectionMode.draft.properties.get(key)
                    || new Set();
                const selected = [...draftValues].some(item =>
                    propertyValueKey(item) === propertyValueKey(value)
                );
                const mode = createContext
                    && propertyTypeForKey(key) !== "multitext"
                        ? (selected ? "remove" : "replace")
                        : "toggle";
                core._applyFacetSelectionToState(
                    selectionMode.draft,
                    "property",
                    value,
                    { key, mode }
                );
                selectionMode.refresh();
                return;
            }

            const currentValues = activeFilterState().properties.get(key)
                || new Set();
            const selected = [...currentValues].some(item =>
                propertyValueKey(item) === propertyValueKey(value)
            );
            if (!createContext) core.filterState.propertyMatchMode = "all";
            const singleToggleOff = !quickValueMode
                && !createContext
                && selected
                && currentValues.size === 1;
            core._applyFacetSelection(
                "property",
                value,
                {
                    key,
                    mode: quickValueMode && selected
                        ? "remove"
                        : singleToggleOff
                            ? "remove"
                            : "replace"
                }
            );
            if (createContext) core.dropdown.close(false);
            core._onFilterChanged();
            if (!createContext && core.dropdown.close() !== false) options.onCommit?.();
        };
        const refreshAfterRename = () => {
            refreshSource();
            propertyFacetStatsCache.clear();
            syncHeading();
            renderCurrentSelection();
            rerenderPickerListPreservingScroll(list, () => render(false));
        };
        let catalogError = "";
        const catalogSubmission = createDialogSubmission(panel,
            () => !core._destroyed && panel.isConnected && core.dropdown.isActivePanel(panel),
            () => {},
            error => {
                catalogError = error?.message || "属性值保存失败，请重试";
                rerenderPickerListPreservingScroll(list, () => render(false));
            });
        panel._lsSubmission = catalogSubmission;
        const appendCatalogCreationRow = key => {
            const raw = search.value.trim();
            if (!raw || poolMode || maintenanceMode || sortToggle?.active
                || core.plugin.isVirtualPropertyKey(key)) return false;
            let value;
            try { value = parseMetadataPropertyInput(raw, propertyTypeForKey(key)); }
            catch (error) {
                list.createDiv({ text: error?.message || "请输入有效的属性值", cls: "local-search-empty-hint" });
                return true;
            }
            const exact = orderedPropertyValues(key).some(item =>
                propertyValueKey(item) === propertyValueKey(value));
            if (exact) return false;
            const row = createSharedPickerTreeRow(list, {
                rowClasses: "local-search-property-create-value-row is-action-row",
                icon: "plus", name: `创建并选择 ${propertyValueDisplay(value)}`,
                itemTitle: `创建并选择属性值 ${key}：${propertyValueDisplay(value)}`,
                restoreFocus: false,
                onClick: async () => {
                    catalogError = "";
                    let savedValue;
                    const ok = await catalogSubmission.submit(async () => {
                        const selected = await core.plugin.addPropertyCatalogValues([{ key,
                            propertyType: propertyTypeForKey(key), addValues: [value] }]);
                        savedValue = selected[0]?.values?.[0];
                        return savedValue !== undefined;
                    }, [search, row.button].filter(Boolean),
                    "属性值保存失败，请重试", undefined, { closeOnSuccess: false });
                    if (!ok || core._destroyed || !panel.isConnected) return;
                    refreshSource();
                    propertyFacetStatsCache.clear();
                    choosePropertyValue(key, savedValue);
                }
            });
            if (catalogError) list.createDiv({ text: catalogError, cls: "local-search-empty-hint", attr: { role: "alert" } });
            return true;
        };
        const refreshPropertyMaintenance = detail => {
            if (detail?.newKey) {
                if (expanded.delete(detail.oldKey)) expanded.add(detail.newKey);
                if (initialKey === detail.oldKey) initialKey = detail.newKey;
            } else if (detail?.deleted && detail.value === undefined) {
                expanded.delete(detail.key);
                if (initialKey === detail.key) initialKey = "";
            }
            refreshAfterRename();
        };
        const keyAction = (mode, key) => this.runSidebarMaintenance("property-key", mode, { key }, anchor, { onChange: refreshPropertyMaintenance });
        const valueAction = (mode, key, value) => this.runSidebarMaintenance("property-value", mode, { key, value }, anchor, { onChange: refreshPropertyMaintenance });
        const renamePropertyKey = key => keyAction("rename", key);
        const renamePropertyValue = (key, value) => valueAction("rename", key, value);
        const deletePropertyKey = key => keyAction("delete", key);
        const deletePropertyValue = (key, value) => valueAction("delete", key, value);
        const toggleExcludedProperty = key => keyAction("exclude", key);
        const toggleResultProperty = key => keyAction("result", key);

        // 属性值 Row 只有一套实现；固定入口的 quick-value 只改变导航层级。
        const appendNormalPropertyValueRow = (key, value, {
            depth = 1,
            selectedValueKeys = new Set()
        } = {}) => {
            const valueId = propertyValueKey(value);
            const selected = selectedValueKeys.has(valueId);
            const currentValueCount = valueCount(key, value);
            const unavailable = currentValueCount <= 0 && !selected && !core.plugin.hasPropertyCatalogValue(key, value);
            const valueView = createSharedPickerTreeRow(list, {
                depth,
                rowClasses: "local-search-property-tree-value-row",
                active: selected,
                itemTitle: `${key}：${propertyValueDisplay(value)}`,
                icon: "tag",
                name: propertyValueDisplay(value),
                count: currentValueCount,
                countClasses: "local-search-property-count",
                countPlacement: "row-end",
                onClick: maintenanceMode
                    ? (this.canSidebarMaintenance("property-value", maintenanceMode, { key, value })
                        ? () => valueAction(maintenanceMode, key, value) : null)
                    : unavailable ? null : () => choosePropertyValue(key, value),
                sortKey: quickValueMode ? "" : propertyValueSortId(key, valueId),
                sortParent: quickValueMode ? "" : propertyKeySortId(key),
                sortName: propertyValueDisplay(value),
                sortDisabled: quickValueMode,
                renderTrailing: !quickValueMode && maintenanceMode
                    && this.canSidebarMaintenance("property-value", maintenanceMode, { key, value })
                    ? row => createPickerRowAction(row, maintenanceMode === "delete"
                        ? {
                            icon: "trash-2",
                            danger: true,
                            label: `删除属性值 ${key}: ${propertyValueDisplay(value)}`,
                            onClick: () => deletePropertyValue(key, value)
                        }
                        : {
                            icon: "pencil",
                            label: `重命名属性值 ${key}: ${propertyValueDisplay(value)}`,
                            onClick: () => renamePropertyValue(key, value)
                        })
                    : null
            });
            syncSharedPickerTreeRowAvailability(
                valueView.row,
                unavailable
            );
            return valueView;
        };

        render = (autoLocate = false) => {
            list.empty();
            const q = search.value.trim().toLowerCase();
            let visibleRows = 0;

            if (poolMode) {
                const keys = orderedPropertyKeys().filter(key =>
                    !q || key.toLocaleLowerCase("zh-CN").includes(q));
                for (const key of keys) {
                    const shown = poolKeyVisible(key);
                    createSharedPickerTreeRow(list, {
                        depth: 0,
                        rowClasses: "local-search-property-tree-key-row",
                        active: shown,
                        hasChildren: false,
                        icon: "list-tree",
                        name: key,
                        count: keyCount(key),
                        countClasses: "local-search-property-count",
                        countPlacement: "row-end",
                        itemTitle: `${shown ? "从左侧筛选池隐藏" : "在左侧筛选池显示"} ${key}`,
                        onClick: () => togglePoolKey(key),
                        renderTrailing: row => createPickerRowAction(row, {
                            icon: shown ? "eye" : "eye-off", interaction: "choice",
                            label: `${shown ? "隐藏" : "显示"}左侧属性键 ${key}`,
                            onClick: () => togglePoolKey(key)
                        })
                    });
                    visibleRows++;
                }
                if (!visibleRows) list.createDiv({
                    text: "没有匹配的属性键", cls: "local-search-empty-hint"
                });
                return;
            }

            if (quickValueMode) {
                const key = quickKey;
                const selectedValues = activeFilterState().properties.get(key) || new Set();
                const selectedValueKeys = new Set(
                    [...selectedValues].map(propertyValueKey)
                );
                const values = orderedPropertyValues(key)
                    .filter(value =>
                        !createContext
                        || (
                            value !== PRESENT_PROPERTY_VALUE
                            && !isSpecialPropertyValue(value)
                        )
                    )
                    .filter(value => !isSpecialPropertyValue(value))
                    .filter(value => !q || propertyValueDisplay(value)
                        .toLocaleLowerCase("zh-CN")
                        .includes(q));

                if (appendCatalogCreationRow(key)) visibleRows++;
                for (const value of values) {
                    appendNormalPropertyValueRow(key, value, {
                        depth: 0,
                        selectedValueKeys
                    });
                    visibleRows++;
                }

                if (!visibleRows) {
                    list.createDiv({
                        text: q
                            ? "没有匹配的属性值"
                            : "当前属性没有可用值",
                        cls: "local-search-empty-hint"
                    });
                }
                return;
            }

            for (const node of this._buildPropertyTreeModel(
                q,
                orderedPropertyKeys(),
                orderedPropertyValues
            )) {
                const { key, visibleValues, forceExpanded } = node;
                const keyOnlyMode = maintenanceMode === "pin"
                    || maintenanceMode === "exclude"
                    || maintenanceMode === "result";
                const isExpanded = !keyOnlyMode
                    && (forceExpanded || expanded.has(key));
                const excluded = new Set(core.plugin.settings.excludedKeys || []);
                const hiddenResult = new Set(
                    core.plugin.settings.hiddenResultPropertyKeys || []
                );
                const isExcluded = excluded.has(key);
                const isResultHidden = hiddenResult.has(key);
                const selectedValues = activeFilterState().properties.get(key) || new Set();
                const selectedValueKeys = new Set(
                    [...selectedValues].map(propertyValueKey)
                );
                const pinned = isPinned(key);
                const togglePinned = () => savePinned(key, { pinnedRight: !isPinned(key) });
                const flip = () => {
                    if (expanded.has(key)) expanded.delete(key);
                    else expanded.add(key);
                    rerenderPickerListPreservingScroll(list, () => render(false));
                };
                const currentKeyCount = maintenanceMode === "pin" ? null : keyCount(key);
                const keyView = createSharedPickerTreeRow(list, {
                    depth: 0,
                    rowClasses: [
                        "local-search-property-tree-key-row",
                        selectedValues.size > 0
                            ? "has-applied-filter"
                            : ""
                    ].filter(Boolean).join(" "),
                    active: maintenanceMode === "pin" && pinned,
                    hasChildren: !keyOnlyMode,
                    expanded: isExpanded,
                    toggleTitle: keyOnlyMode
                        ? ""
                        : (isExpanded ? "折叠属性值" : "展开属性值"),
                    itemTitle: maintenanceMode === "pin"
                        ? `${pinned ? "取消固定" : "固定"} ${key} 到右侧`
                        : maintenanceMode === "exclude"
                                ? (isExcluded ? `恢复显示属性 ${key}` : `隐藏属性 ${key}`)
                                : maintenanceMode === "result"
                                    ? (isResultHidden ? `在结果卡显示 ${key}` : `从结果卡隐藏 ${key}`)
                                    : key,
                    // The actionable pin lives at row end; the leading icon identifies a property.
                    icon: isExpanded ? "list-collapse" : "list-tree",
                    name: key,
                    count: currentKeyCount,
                    countClasses: "local-search-property-count",
                    countPlacement: "row-end",
                    onToggle: keyOnlyMode ? null : flip,
                    onClick: maintenanceMode === "pin"
                        ? togglePinned
                        : maintenanceMode === "exclude"
                            ? () => { void toggleExcludedProperty(key); }
                            : maintenanceMode === "result"
                                ? () => { void toggleResultProperty(key); }
                                : maintenanceMode === "rename" || maintenanceMode === "delete"
                                    ? (this.canSidebarMaintenance("property-key", maintenanceMode, { key })
                                        ? () => keyAction(maintenanceMode, key) : null)
                                : flip,
                    sortKey: keyOnlyMode ? "" : propertyKeySortId(key),
                    sortName: key,
                    sortDisabled: keyOnlyMode,
                    renderTrailing: maintenanceMode ? row => {
                            if (maintenanceMode === "pin") {
                                // Show the optional icon editor before the fixed-position pin.
                                // Pin remains the rightmost action whether the key is pinned or not.
                                if (pinned) createPickerRowAction(row, {
                                    icon: propertyPoolEntry(valuePool(), key).shortcutIcon,
                                    label: `修改 ${key} 的固定入口图标`,
                                    onClick: button => openFilterToolbarIconPicker(core, {
                                        anchor: button, propertyKey: key,
                                        currentIcon: propertyPoolEntry(valuePool(), key).shortcutIcon,
                                        defaultIcon: PROPERTY_SHORTCUT_DEFAULT_ICON,
                                        onSelect: shortcutIcon => savePinned(key, { shortcutIcon })
                                    })
                                });
                                createPickerRowAction(row, {
                                    icon: pinned ? "pin-off" : "pin",
                                    interaction: "choice",
                                    label: `${pinned ? "取消固定" : "固定"} ${key} 到右侧`,
                                    onClick: togglePinned
                                });
                                return;
                            }
                            if (maintenanceMode === "exclude") {
                                createPickerRowAction(row, {
                                    icon: isExcluded ? "eye-off" : "eye",
                                    label: isExcluded
                                        ? `恢复显示属性 ${key}`
                                        : `隐藏属性 ${key}`,
                                    onClick: () => { void toggleExcludedProperty(key); }
                                });
                                return;
                            }
                            if (maintenanceMode === "result") {
                                createPickerRowAction(row, {
                                    icon: isResultHidden ? "eye-off" : "eye",
                                    label: isResultHidden
                                        ? `在结果卡显示 ${key}`
                                        : `从结果卡隐藏 ${key}`,
                                    onClick: () => { void toggleResultProperty(key); }
                                });
                                return;
                            }
                            // Provider-backed keys are readonly in GLS. Never offer a
                            // misleading file-based rename/delete action for them.
                            if (core.plugin.isVirtualPropertyKey(key)) return;
                            createPickerRowAction(row, maintenanceMode === "delete"
                                ? {
                                    icon: "trash-2",
                                    danger: true,
                                    label: `删除属性键 ${key}`,
                                    onClick: () => deletePropertyKey(key)
                                }
                                : {
                                    icon: "pencil",
                                    label: `重命名属性键 ${key}`,
                                    onClick: () => renamePropertyKey(key)
                                });
                        }
                        : null
                });
                keyView.row.dataset.propertyKey = key;
                visibleRows++;

                if (keyOnlyMode || !isExpanded) continue;

                if (!visibleValues.length) {
                    const empty = createSharedPickerTreeRow(list, {
                        depth: 1,
                        rowClasses: "local-search-property-tree-value-row",
                        icon: "minus",
                        name: "当前属性没有可用值"
                    });
                    empty.row.addClass("is-noninteractive");
                    visibleRows++;
                    continue;
                }

                const normalValues = visibleValues.filter(
                    value => !isSpecialPropertyValue(value)
                );
                const specialValues = visibleValues.filter(isSpecialPropertyValue);

                for (const value of normalValues) {
                    appendNormalPropertyValueRow(key, value, {
                        depth: 1,
                        selectedValueKeys
                    });
                    visibleRows++;
                }

                if (specialValues.length && !maintenanceMode) {
                    appendPropertySpecialStateInlineGroup(list, {
                        key,
                        values: specialValues,
                        selectedValueKeys,
                        valueCount: value => valueCount(key, value),
                        onToggle: value => choosePropertyValue(key, value)
                    });
                    visibleRows++;
                }
            }

            if (!visibleRows) {
                list.createDiv({
                    text: "没有匹配的属性或属性值",
                    cls: "local-search-empty-hint"
                });
            }

            if (autoLocate) {
                queueAutoLocate(() => {
                    if (!panel.isConnected || !core.dropdown.isActivePanel(panel) || search.value.trim()) return;
                    const initialKeyRow = initialKey
                        ? [...list.querySelectorAll(
                            ".local-search-property-tree-key-row[data-property-key]"
                        )].find(row => row.dataset.propertyKey === initialKey)
                            ?.querySelector(".local-search-move-tree-folder")
                        : null;
                    const activeValue = list.querySelector(
                        ".local-search-property-tree-value-row.is-selected .local-search-move-tree-folder"
                    );
                    const activeKey = list.querySelector(
                        ".local-search-property-tree-key-row.has-applied-filter .local-search-move-tree-folder"
                    );
                    const row = (initialKeyRow || activeValue || activeKey)?.closest("[data-picker-key]");
                    if (row?.dataset.pickerKey) revealScrollableKey(list, row.dataset.pickerKey);
                });
            }
        };

        coordinator = (createMode || poolMode || quickValueMode) ? null : new PointerSortCoordinator({
            list,
            hierarchical: false,
            canStart: row => Boolean(row?.dataset?.sortKey),
            onCommit: async ({ key: sortId, beforeKey }) => {
                const source = parsePropertySortId(sortId);
                if (!source) return;
                const before = parsePropertySortId(beforeKey);

                if (source.kind === "key") {
                    await core.plugin.setPickerSiblingOrder(
                        "property-key",
                        orderedPropertyKeys(),
                        source.key,
                        before?.kind === "key" ? before.key : null
                    );
                    rerenderPickerListPreservingScroll(list, () => render(false));
                    return;
                }

                const siblings = orderedPropertyValues(source.key)
                    .filter(value => !isSpecialPropertyValue(value))
                    .map(propertyValueKey);
                await core.plugin.setPickerSiblingOrder(
                    "property-value",
                    siblings,
                    source.valueId,
                    before?.kind === "value" && before.key === source.key
                        ? before.valueId
                        : null,
                    source.key
                );
                rerenderPickerListPreservingScroll(list, () => render(false));
            }
        });

        sortToggle = (createMode || poolMode || quickValueMode) ? null : attachFacetPickerSortModeToggle(header, {
            label: "属性",
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
            onInput: () => { catalogError = ""; render(false); },
            initialRender: () => {
                renderCurrentSelection();
                render(true);
            },
        });
    },



    renderPinnedPropertyFilters() {
        const core = this.owner;
        if (!core.propertyFilterRow || !core.activeFilterWrap) return;

        // 只刷新当前条件容器；数量统计已固定在批量操作栏，不属于本行。
        core.activeFilterWrap.empty();

        const runFilterMutation = mutate => {
            mutate();
            core._onFilterChanged();
        };

        const addClearableChip = (text, clear) => {
            const chip = createSearchButton(core.activeFilterWrap, "choice", {
                text,
                cls: "local-search-condition-chip local-search-active-filter-chip is-applied",
                attr: {
                    "aria-label": `清除筛选条件 ${text}`
                }
            });
            chip.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                runFilterMutation(clear);
            });
        };

        // 当前条件的复合筛选只保留这一套 Condition Group Primitive：
        // 外层 Group 唯一拥有 Applied Surface；组名负责清整组，值按钮只移除自身。
        // 标签与属性共享同一 DOM / 视觉 / 命中规则，不再分别维护两套交互。
        const addConditionGroup = ({
            groupLabel,
            ariaLabel,
            orderedValues,
            valueText,
            valueAria,
            clearGroup,
            removeValue
        }) => {
            if (!groupLabel || !orderedValues?.length) return;

            const group = core.activeFilterWrap.createSpan({
                cls: "local-search-condition-chip local-search-active-condition-group is-applied",
                attr: {
                    role: "group",
                    "aria-label": ariaLabel || groupLabel
                }
            });

            const keyButton = createSearchButton(group, "quiet", {
                text: `${groupLabel}：`,
                cls: "local-search-active-condition-key",
                attr: {
                    "aria-label": `清除整个${ariaLabel || groupLabel}`
                }
            });
            keyButton.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                runFilterMutation(clearGroup);
            });

            for (const value of orderedValues) {
                const label = valueText(value);
                const valueButton = createSearchButton(group, "quiet", {
                    text: label,
                    cls: "local-search-active-condition-value",
                    attr: {
                        "aria-label": valueAria(value)
                    }
                });
                valueButton.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    runFilterMutation(() => removeValue(value));
                });
            }
        };

        // 当前条件按稳定的信息层级显示：文件类型 → 文件夹 → 标签 → 属性 → 时间。
        // 大类顺序不跟随点击先后变化，避免 Chip 在交互中跳位。
        // 创建类型由 Composer 的“类型”字段表达，不伪装成可删除的搜索条件。
        if (core.filterState.fileTypes.size && !core.createFlow?.isCreateView?.()) {
            const orderedFileTypes = [...core.filterState.fileTypes];
            addConditionGroup({
                groupLabel: "文件类型",
                ariaLabel: "文件类型筛选",
                orderedValues: orderedFileTypes,
                valueText: value => `[${fileTypeFilterDisplay(value)}]`,
                valueAria: value => `移除文件类型筛选 ${fileTypeFilterDisplay(value)}`,
                clearGroup: () => core._applyFacetSelection("fileType", "", { mode: "clear" }),
                removeValue: value => core._applyFacetSelection("fileType", value, { mode: "remove" })
            });
        }
        if (core.filterState.folders.size) {
            const orderedFolders = orderFolderSelectionsForPicker(
                core.plugin,
                core.filterState.folders
            );
            addClearableChip(
                `文件夹：${orderedFolders.map(v => `[${v}]`).join(" ")}`,
                () => core._applyFacetSelection("folder", "", { mode: "clear" })
            );
        }
        if (core.filterState.tags.size) {
            const orderedTags = orderTagSelectionsForPicker(
                core.filterState.tags,
                core.plugin.settings.pickerTagOrder
            );
            addConditionGroup({
                groupLabel: "标签",
                ariaLabel: "标签筛选",
                orderedValues: orderedTags,
                valueText: value => value === NO_TAGS_FILTER_VALUE
                    ? "[没有标签]"
                    : `[${value}]`,
                valueAria: value => `移除标签筛选 ${
                    value === NO_TAGS_FILTER_VALUE ? "没有标签" : value
                }`,
                clearGroup: () =>
                    core._applyFacetSelection("tag", "", { mode: "clear" }),
                removeValue: value =>
                    core._applyFacetSelection("tag", value, { mode: "remove" })
            });
        }
        const orderedPropertySelections = orderPropertySelectionsForPicker(
            core.filterState.properties,
            core.plugin.settings.pickerPropertyOrder,
            core.plugin.settings.pickerPropertyValueOrder
        );
        for (const [key, orderedValues] of orderedPropertySelections) {
            addConditionGroup({
                groupLabel: key,
                ariaLabel: `属性筛选 ${key}`,
                orderedValues,
                valueText: propertyFilterChipValueDisplay,
                valueAria: value =>
                    `移除属性筛选 ${key}：${propertyValuePlainDisplay(value)}`,
                clearGroup: () =>
                    core._applyFacetSelection("property", "", {
                        key,
                        mode: "clear"
                    }),
                removeValue: value =>
                    core._applyFacetSelection("property", value, {
                        key,
                        mode: "remove"
                    })
            });
        }

        if (core.filterState.dateRange && !core.createFlow?.isCreateView?.()) {
            addClearableChip(filterDateRangeDisplay(core.filterState.dateRange), () => {
                core.filterState.dateRange = null;
            });
        }

        // 状态行只在频道或真实筛选条件存在时显示；无内容不保留空占位。
        core._syncResultStateRow?.();
    },
};

