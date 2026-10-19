// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { orderSelectedPropertyValues } from "../../data/properties/property-catalog.js";
import { PROPERTY_TYPE_OPTIONS, metadataPropertyValuePlaceholder, normalizeMetadataPropertyType, parseMetadataPropertyInput, validateEditablePropertyKey } from "../../data/properties/property-types.js";
import { MISSING_PROPERTY_VALUE, isSpecialPropertyValue, propertyValueDisplay, propertyValueKey } from "../../data/properties/property-values.js";
import { captureScrollableAnchor, restoreScrollableAnchor, revealScrollableKey } from "../../interactions/scroll-anchor.js";
import { createSearchButton, createSearchInput } from "../../ui/components/input-controls.js";
import { configureSharedPickerHeader } from "../../ui/pickers/picker-header.js";
import { createSharedPickerTreeShell } from "../../ui/pickers/picker-shell.js";
import { createSharedPickerSelectionStrip } from "../../ui/pickers/selection-strip.js";
import { createSharedPickerTreeRow, createTreeActionButton, syncSharedPickerTreeRowAvailability } from "../../ui/pickers/tree-row.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { sortByPreferredOrder } from "../../utils/preferred-order.js";
import { Notice, setIcon } from "obsidian";
// Instance method owner. `this` is the unchanged BatchMetadataController instance. No additional state store.
export const BatchMetadataController_property_editor_methods = {


    _renderPropertyPicker(session) {
        const target = session.propertyTarget;
        const fixedKey = session.propertyKey || "";
        const entries = values => normalizeUniqueStringList(values).map(value => ({ value, rawSample: value, count: 1 }));
        const summary = target ? { rows: [{ key: fixedKey, present: 1,
            values: new Map(entries(target.values).map(entry => [propertyValueKey(entry.value), entry])) }] } : this._summary(session);
        let catalog = target ? [{ key: fixedKey, propertyType: "multitext", count: 1,
            values: entries([...target.catalog, ...target.values]) }]
            : this._batchExistingPropertyCatalog(this._metadataUniverse(session));
        if (session.metadataTarget) {
            for (const row of summary.rows || []) {
                let property = catalog.find(item => item.key === row.key);
                if (!property) {
                    property = { key: row.key, count: 0, values: [], propertyType: "text" };
                    catalog.push(property);
                }
                property.propertyType = session.metadataTarget.propertyTypes?.get(row.key)
                    || property.propertyType;
                for (const entry of row.values.values()) {
                    if (!property.values.some(value => propertyValueKey(value.value) === propertyValueKey(entry.value))) {
                        property.values.push({ ...entry, count: 0 });
                    }
                }
            }
        }
        if (fixedKey) {
            catalog = catalog.filter(property => property.key === fixedKey);
            if (!catalog.length) catalog.push({ key: fixedKey, propertyType: this.plugin.propertyCatalogType(fixedKey), values: [], count: 0 });
        }
        const catalogMap = new Map(catalog.map(property => [property.key, property]));
        const baselineRows = new Map((summary.rows || []).map(row => [row.key, row]));
        const state = session.state = {
            add: new Map(),
            remove: new Map(),
            custom: new Map(),
            expanded: new Set(),
            valueEditorKey: ""
        };

        if (fixedKey) state.expanded.add(fixedKey);
        configureSharedPickerHeader(session.panel, {
            headingText: session.metadataTarget?.headingText || fixedKey || "新增属性",
            countText: session.metadataTarget?.catalog ? null : session.targetCount,
            countAriaLabel: target?.label || session.metadataTarget?.label || `当前 ${session.targetCount} 个文件`,
            icon: "list-tree"
        });
        const current = createSharedPickerSelectionStrip(session.panel, {
            onClear: () => {
                state.add.clear();
                state.remove.clear();
                for (const key of allKeys()) {
                    const values = baselineValueMap(key);
                    if (values.size) state.remove.set(key, values);
                }
                renderAll({ preserveScroll: true });
            }
        });
        const { search, list } = createSharedPickerTreeShell(session.panel, {
            placeholder: fixedKey ? `搜索${fixedKey}，输入新名字可创建…` : "搜索属性键或值，输入新键名可创建…",
            treeClasses: "local-search-property-tree",
            showRoot: false
        });

        const mapFor = (container, key) => {
            let map = container.get(key);
            if (!map) {
                map = new Map();
                container.set(key, map);
            }
            return map;
        };
        const baselineValueMap = key => {
            const row = baselineRows.get(key);
            return new Map(
                [...(row?.values?.values?.() || [])]
                    .filter(entry => entry.value !== MISSING_PROPERTY_VALUE)
                    .map(entry => [propertyValueKey(entry.value), entry])
            );
        };
        const propertyFor = key => state.custom.get(key) || catalogMap.get(key) || null;
        const propertyTypeFor = key => normalizeMetadataPropertyType(
            propertyFor(key)?.propertyType || "text"
        );
        // 标量属性不做隐式覆盖：只有目标文件存在缺失键，或用户先在“当前已有”中
        // 明确删除了旧值时，下面的新值才有真实写入槽位。列表属性始终可以追加。
        const canAddPropertyValue = key => {
            if (propertyTypeFor(key) === "multitext" || state.custom.has(key)) {
                return true;
            }
            const baselineRow = baselineRows.get(key);
            if ((baselineRow?.present || 0) < session.targetCount) return true;
            return (state.remove.get(key)?.size || 0) > 0;
        };
        const allKeys = () => sortByPreferredOrder(
            [...new Set([
                ...catalog.map(property => property.key),
                ...state.custom.keys()
            ])],
            this.plugin.settings.pickerPropertyOrder,
            key => key
        );
        const orderedDraftValueEntries = (key, map) => {
            const source = map instanceof Map ? map : new Map();
            const orderedValues = orderSelectedPropertyValues(
                [...source.values()].map(entry => entry.value),
                this.plugin.settings.pickerPropertyValueOrder?.[key] || []
            );
            return orderedValues
                .map(value => {
                    const id = propertyValueKey(value);
                    return [id, source.get(id)];
                })
                .filter(([, entry]) => Boolean(entry));
        };
        // 属性树只保留一个值数据源：仓库已有值 + 本次 Draft 待新增值。
        // 勾选新值后立即回到所属属性键下面成为正式 Selected Row；
        // 真正写盘仍只发生在底部“确定”，取消编辑器不会进入这里。
        const visiblePropertyValueEntries = key => {
            const source = new Map(
                (propertyFor(key)?.values || []).map(entry => [
                    propertyValueKey(entry.value),
                    entry
                ])
            );
            for (const [valueId, entry] of state.add.get(key) || []) {
                source.set(valueId, entry);
            }

            // 用户在本次 Picker 会话内确认创建的新值，是“候选目录”的一部分，
            // 不等于当前 Draft 是否仍选中。即使后续在标量属性上改选其它值，
            // 候选也必须继续留在所属属性键下，直到整个 Picker 取消/关闭。
            // 新建候选固定置顶；仓库已有值继续消费 pickerPropertyValueOrder。
            const staged = [...source.entries()]
                .filter(([, entry]) => Boolean(entry?.isSessionCreated));
            const stagedKeys = new Set(staged.map(([valueId]) => valueId));
            const existing = new Map(
                [...source.entries()].filter(([valueId]) => !stagedKeys.has(valueId))
            );
            return [
                ...staged.map(([, entry]) => entry),
                ...orderedDraftValueEntries(key, existing)
                    .map(([, entry]) => entry)
            ];
        };
        const changeCount = () => {
            let count = 0;
            for (const map of state.add.values()) count += map.size;
            for (const map of state.remove.values()) count += map.size;
            return count;
        };
        const createdTypes = () => new Map([
            ...[...state.custom].map(([key, property]) => [key, property.propertyType]),
            ...(fixedKey ? [[fixedKey, propertyTypeFor(fixedKey)]] : [])
        ]);

        const footer = this._createDraftFooter(session.panel, {
            getChangeCount: changeCount,
            onConfirm: () => {
                const propertyOps = allKeys().map(key => {
                    const property = propertyFor(key);
                    const add = [...(state.add.get(key)?.values() || [])];
                    const remove = [...(state.remove.get(key)?.values() || [])]
                        .map(entry => entry.value);
                    if (!add.length && !remove.length) return null;
                    return {
                        key,
                        propertyType: propertyTypeFor(key),
                        isNewKey: state.custom.has(key) || !!(fixedKey && !this._propertyExistsInVault(key)),
                        addValues: add.map(entry => entry.rawSample ?? entry.value),
                        removeValues: remove
                    };
                }).filter(Boolean);
                void this._runMutation(session, {
                    action: "更新属性",
                    errorText: "更新属性失败",
                    operation: async () => {
                        if (session.metadataTarget) {
                            return session.metadataTarget.commit({ properties: propertyOps });
                        }
                        if (target) {
                            const operation = propertyOps.find(item => item.key === fixedKey);
                            const result = await target.commit({ addValues: operation?.addValues || [], removeValues: operation?.removeValues || [] });
                            return result === false ? false : { changed: 1, failed: 0, conflict: 0 };
                        }
                        const stats = await this.plugin.batchMetadataService.applyMetadataDraft(
                            session.targetPaths,
                            { properties: propertyOps }
                        );
                        return this._syncCreatedPropertyTypes(
                            createdTypes(),
                            stats
                        );
                    }
                });
            }
        });

        const renderCurrent = () => {
            const entries = [];
            for (const key of allKeys()) {
                const baseline = baselineValueMap(key);
                const removed = state.remove.get(key) || new Map();
                const added = state.add.get(key) || new Map();
                for (const [valueId, entry] of orderedDraftValueEntries(key, baseline)) {
                    if (removed.has(valueId) && !added.has(valueId)) continue;
                    const display = propertyValueDisplay(entry.value);
                    entries.push({
                        key: `${key}:${valueId}`,
                        text: `${key}: ${display}`,
                        title: `移除 ${key}: ${display}`,
                        onRemove: () => {
                            added.delete(valueId);
                            mapFor(state.remove, key).set(valueId, entry);
                            renderAll({ preserveScroll: true });
                        }
                    });
                }
                for (const [valueId, entry] of orderedDraftValueEntries(key, added)) {
                    if (baseline.has(valueId)) continue;
                    const display = propertyValueDisplay(entry.value);
                    entries.push({
                        key: `${key}:${valueId}`,
                        text: `${key}: ${display}`,
                        title: `取消新增 ${key}: ${display}`,
                        onRemove: () => {
                            added.delete(valueId);
                            renderAll({ preserveScroll: true });
                        }
                    });
                }
            }
            current.render(entries);
        };

        const updateDraftAddValue = (key, entry) => {
            const valueId = propertyValueKey(entry.value);
            const removed = state.remove.get(key);
            const added = mapFor(state.add, key);
            if (removed?.has(valueId)) {
                removed.delete(valueId);
                added.delete(valueId);
            } else if (added.has(valueId)) {
                added.delete(valueId);
            } else if (baselineValueMap(key).get(valueId)?.count >= session.targetCount) {
                mapFor(state.remove, key).set(valueId, baselineValueMap(key).get(valueId));
            } else {
                const type = propertyTypeFor(key);
                if (type !== "multitext") added.clear();
                added.set(valueId, entry);
            }
        };

        const stageNewPropertyValue = (key, entry) => {
            const property = propertyFor(key);
            if (!property) return null;
            const valueId = propertyValueKey(entry.value);
            const values = Array.isArray(property.values)
                ? property.values
                : (property.values = []);
            const existing = values.find(candidate =>
                propertyValueKey(candidate.value) === valueId
            );
            const stagedEntry = existing || {
                ...entry,
                isCustom: true,
                isSessionCreated: true
            };
            if (!existing) values.unshift(stagedEntry);
            updateDraftAddValue(key, stagedEntry);
            return stagedEntry;
        };

        // 新属性的“类型”与“会话候选 / Draft”必须始终一致。
        // 切换类型时只在现有 session.state 内规范化：
        // - 候选值按新类型重新解析；非法候选直接移除；
        // - List 保留全部已选值；标量只保留最近一次已选值；
        // - 不创建第二套类型 Draft，也不提前写入 Frontmatter。
        const normalizeCustomPropertyTypeDraft = (key, nextType) => {
            const property = state.custom.get(key);
            if (!property) return { invalid: 0, reduced: 0 };

            const normalizedType = normalizeMetadataPropertyType(nextType);
            const sourceValues = Array.isArray(property.values)
                ? property.values
                : [];
            const selectedBefore = state.add.get(key) || new Map();
            const remapped = new Map();
            const nextValues = [];
            const valueById = new Map();
            let invalid = 0;

            for (const entry of sourceValues) {
                const oldId = propertyValueKey(entry?.value);
                try {
                    const parsed = parseMetadataPropertyInput(
                        entry?.rawSample ?? entry?.value,
                        normalizedType
                    );
                    const newId = propertyValueKey(parsed);
                    let normalizedEntry = valueById.get(newId);
                    if (!normalizedEntry) {
                        normalizedEntry = {
                            ...entry,
                            value: parsed,
                            rawSample: parsed,
                            isCustom: true,
                            isSessionCreated: true
                        };
                        valueById.set(newId, normalizedEntry);
                        nextValues.push(normalizedEntry);
                    }
                    remapped.set(oldId, [newId, normalizedEntry]);
                } catch (_) {
                    invalid++;
                }
            }

            property.propertyType = normalizedType;
            property.values = nextValues;

            const selected = [];
            const selectedIds = new Set();
            for (const [oldId] of selectedBefore) {
                const mapped = remapped.get(oldId);
                if (!mapped || selectedIds.has(mapped[0])) continue;
                selectedIds.add(mapped[0]);
                selected.push(mapped);
            }

            const kept = normalizedType === "multitext"
                ? selected
                : selected.slice(-1);
            const reduced = Math.max(0, selected.length - kept.length);
            if (kept.length) {
                state.add.set(key, new Map(kept));
            } else {
                state.add.delete(key);
            }
            state.remove.delete(key);

            return { invalid, reduced };
        };

        const focusValueEditor = key => {
            revealScrollableKey(list, `属性值编辑 ${key}`);
            const input = [...list.querySelectorAll(
                ".local-search-property-new-value-input"
            )].find(element => element.dataset.propertyKey === key);
            input?.focus({ preventScroll: true });
        };

        const openValueEditor = key => {
            state.expanded.add(key);
            state.valueEditorKey = key;
            renderAll({ preserveScroll: true });
            focusValueEditor(key);
        };

        const renderValueEditor = key => {
            const property = propertyFor(key);
            if (!property || state.valueEditorKey !== key) return;
            const row = list.createDiv({
                cls: "local-search-move-tree-row local-search-property-new-value-row",
                attr: {
                    "data-ls-no-drag": "true",
                    "data-picker-key": `属性值编辑 ${key}`
                }
            });
            row.style.setProperty("--ls-move-depth", "1");

            // 编辑态直接消费普通属性值 Row 的 toggle / icon / name 几何。
            // 唯一差异：name 槽由 input 接管，icon 使用 Created 状态色；
            // 不再维护任何独立缩进、图标占位或文字起点。
            const toggle = createSearchButton(row, "tree-toggle", {
                cls: "local-search-move-tree-toggle is-placeholder local-search-row-hit-target",
                attr: {
                    tabindex: "-1",
                    "aria-hidden": "true",
                    "data-ls-no-drag": "true"
                }
            });
            toggle.disabled = true;
            const field = row.createDiv({
                cls: "local-search-move-tree-folder local-search-property-new-value-field"
            });
            const iconEl = field.createSpan({
                cls: "local-search-move-tree-folder-icon local-search-property-new-value-icon",
                attr: { "aria-hidden": "true" }
            });
            setIcon(iconEl, "tag");
            const input = createSearchInput(field, {
                type: "text",
                cls: "local-search-move-tree-name local-search-property-new-value-input",
                placeholder: metadataPropertyValuePlaceholder(propertyTypeFor(key)),
                attr: { "data-property-key": key, "data-ls-no-drag": "true" }
            });
            if (state.custom.has(key)) {
                const currentTypeOption = () =>
                    PROPERTY_TYPE_OPTIONS.find(option =>
                        option.value === normalizeMetadataPropertyType(property.propertyType)
                    ) || PROPERTY_TYPE_OPTIONS[0];
                const typeButton = createSearchButton(field, "action", {
                    text: currentTypeOption().label,
                    cls: "local-search-action-btn local-search-property-new-value-inline-action",
                    attr: {
                        "aria-label": "选择属性类型",
                        "aria-haspopup": "dialog",
                        "data-ls-no-drag": "true"
                    }
                });

                typeButton.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();

                    // 类型选择继续复用同一个 Dropdown Controller / Tree Row Primitive。
                    // 父 Property Picker 只暂存，不销毁 Draft；子 Picker 关闭后原位返回。
                    // 定位锚点使用父 Picker 的稳定外部入口，避免 openChild 隐藏父 Surface 后
                    // 内联按钮几何变为 0 导致桌面端定位漂移。
                    const stableAnchor = this.owner?.dropdown?.anchor?.isConnected
                        ? this.owner.dropdown.anchor
                        : (this.owner?.propertyFilterBtn?.isConnected
                            ? this.owner.propertyFilterBtn
                            : typeButton);
                    const panel = this.owner?.dropdown?.openChild(
                        stableAnchor,
                        `属性类型 · ${key}`
                    );
                    if (!panel) return;

                    panel.addClass("local-search-picker-dropdown");
                    configureSharedPickerHeader(panel, {
                        headingText: "属性类型",
                        icon: "list-tree"
                    });
                    const typeList = panel.createDiv({
                        cls: "local-search-move-tree"
                    });
                    const typeIcons = {
                        text: "type",
                        multitext: "list",
                        number: "hash",
                        checkbox: "square-check",
                        date: "calendar",
                        datetime: "calendar-clock"
                    };
                    const currentType = normalizeMetadataPropertyType(
                        property.propertyType
                    );

                    for (const option of PROPERTY_TYPE_OPTIONS) {
                        createSharedPickerTreeRow(typeList, {
                            depth: 0,
                            active: option.value === currentType,
                            icon: typeIcons[option.value] || "list-tree",
                            name: option.label,
                            itemTitle: `属性类型：${option.label}`,
                            restoreFocus: false,
                            onClick: () => {
                                const editorValue = input.value;
                                const normalized = normalizeCustomPropertyTypeDraft(
                                    key,
                                    option.value
                                );
                                this.owner.dropdown.close(false);
                                renderAll({ preserveScroll: true });
                                const nextInput = [...list.querySelectorAll(
                                    ".local-search-property-new-value-input"
                                )].find(element =>
                                    element.dataset.propertyKey === key
                                );
                                if (nextInput) {
                                    nextInput.value = editorValue;
                                    nextInput.focus({ preventScroll: true });
                                }
                                if (normalized.invalid) {
                                    new Notice(
                                        `已移除 ${normalized.invalid} 个不符合${option.label}类型的待新增值`
                                    );
                                } else if (normalized.reduced) {
                                    new Notice("单值属性仅保留最近一次选择");
                                }
                            }
                        });
                    }
                });
            }
            const actions = row.createDiv({
                cls: "local-search-property-new-value-actions",
                attr: { "data-ls-no-drag": "true" }
            });
            const cancel = createSearchButton(actions, "action", {
                text: "取消",
                cls: "local-search-action-btn local-search-property-new-value-inline-action",
                attr: {
                    "aria-label": "取消新增属性值",
                    "data-ls-no-drag": "true"
                }
            });
            const add = createSearchButton(actions, "action", {
                text: "确认",
                cls: "local-search-action-btn local-search-action-primary local-search-property-new-value-inline-action",
                attr: {
                    "aria-label": "确认新增属性值",
                    "data-ls-no-drag": "true"
                }
            });

            const commit = () => {
                try {
                    const type = propertyTypeFor(key);
                    const value = parseMetadataPropertyInput(input.value, type);
                    stageNewPropertyValue(key, {
                        value,
                        rawSample: value,
                        count: 0,
                        isCustom: true
                    });
                    state.valueEditorKey = "";
                    renderAll({ preserveScroll: true });
                } catch (error) {
                    new Notice(error?.message || "请输入有效属性值");
                }
            };
            add.addEventListener("click", commit);
            cancel.addEventListener("click", () => {
                state.valueEditorKey = "";
                renderAll({ preserveScroll: true });
            });
            input.addEventListener("keydown", event => {
                if (event.isComposing || event.keyCode === 229) return;
                if (event.key === "Escape") {
                    event.preventDefault();
                    state.valueEditorKey = "";
                    renderAll({ preserveScroll: true });
                    return;
                }
                if (event.key !== "Enter") return;
                event.preventDefault();
                commit();
            });
        };

        const renderList = ({ preserveScroll = false, revealKey = "" } = {}) => {
            const scrollAnchor = preserveScroll
                ? captureScrollableAnchor(list)
                : null;
            list.empty();
            const rawQuery = String(search.value || "").trim();
            const query = rawQuery.toLocaleLowerCase("zh-CN");
            const exactKey = rawQuery
                ? allKeys().find(key => key.toLocaleLowerCase("zh-CN") === query)
                : null;

            if (fixedKey && rawQuery && !visiblePropertyValueEntries(fixedKey).some(entry =>
                propertyValueDisplay(entry.value).toLocaleLowerCase("zh-CN") === query)) {
                createSharedPickerTreeRow(list, {
                    depth: 0, rowClasses: "local-search-batch-create-property-row is-action-row",
                    icon: "plus", name: `创建并添加「${rawQuery}」`,
                    itemTitle: `创建并添加 ${fixedKey}: ${rawQuery}`,
                    onClick: () => {
                        stageNewPropertyValue(fixedKey, { value: rawQuery, rawSample: rawQuery, count: 0 });
                        search.value = "";
                        renderAll({ preserveScroll: true });
                    }
                });
            }
            if (!fixedKey && rawQuery && !exactKey) {
                let validKey = "";
                let error = "";
                try {
                    validKey = validateEditablePropertyKey(
                        rawQuery,
                        this.plugin.settings.excludedKeys
                    );
                    if (this._propertyExistsInVault(validKey)) validKey = "";
                } catch (reason) {
                    error = reason?.message || "";
                }
                if (validKey) {
                    createSharedPickerTreeRow(list, {
                        depth: 0,
                        rowClasses: "local-search-property-tree-key-row local-search-batch-create-property-row is-action-row",
                        icon: "plus",
                        name: `新建属性键「${validKey}」`,
                        itemTitle: `新建属性键 ${validKey}`,
                        onClick: () => {
                            state.custom.set(validKey, {
                                key: validKey,
                                count: 0,
                                sample: "",
                                propertyType: "text",
                                values: []
                            });
                            state.expanded.add(validKey);
                            state.valueEditorKey = validKey;
                            search.value = "";
                            renderAll({
                                revealKey: `属性值编辑 ${validKey}`
                            });
                            focusValueEditor(validKey);
                        }
                    });
                } else if (error) {
                    list.createDiv({ text: error, cls: "local-search-empty-hint" });
                }
            }

            let visible = 0;
            for (const key of allKeys()) {
                const property = propertyFor(key);
                const values = visiblePropertyValueEntries(key);
                const keyMatch = !query || key.toLocaleLowerCase("zh-CN").includes(query);
                const matchingValues = query
                    ? values.filter(entry =>
                        propertyValueDisplay(entry.value)
                            .toLocaleLowerCase("zh-CN")
                            .includes(query)
                    )
                    : values;
                if (query && !keyMatch && !matchingValues.length) continue;

                const forceExpanded = Boolean(query && matchingValues.length);
                const expanded = forceExpanded || state.expanded.has(key);
                createSharedPickerTreeRow(list, {
                    depth: 0,
                    rowClasses: "local-search-property-tree-key-row",
                    hasChildren: true,
                    expanded,
                    toggleTitle: expanded ? "折叠属性值" : "展开属性值",
                    icon: expanded ? "list-collapse" : "list-tree",
                    name: key,
                    itemTitle: `属性 ${key}`,
                    count: property?.count || 0,
                    countClasses: "local-search-property-count",
                    countPlacement: "row-end",
                    onToggle: () => {
                        if (state.expanded.has(key)) state.expanded.delete(key);
                        else state.expanded.add(key);
                        renderAll({ preserveScroll: true });
                    },
                    onClick: () => {
                        if (state.expanded.has(key)) state.expanded.delete(key);
                        else state.expanded.add(key);
                        renderAll({ preserveScroll: true });
                    },
                    renderTrailing: row => {
                        const add = createTreeActionButton(row, {
                            icon: "plus",
                            title: `给「${key}」新增属性值`
                        });
                        add.addClass("local-search-property-value-add-action");
                        add.setAttribute("data-ls-no-drag", "true");
                        add.addEventListener("click", event => {
                            event.preventDefault();
                            event.stopPropagation();
                            openValueEditor(key);
                        });
                    }
                });
                visible++;
                if (!expanded) continue;

                renderValueEditor(key);
                for (const entry of matchingValues) {
                    if (isSpecialPropertyValue(entry.value)) continue;
                    const valueId = propertyValueKey(entry.value);
                    const pendingAdd = Boolean(state.add.get(key)?.has(valueId));
                    const baseline = baselineValueMap(key).get(valueId);
                    const fullyPresent = baseline?.count >= session.targetCount;
                    const selected = pendingAdd || (fullyPresent && !state.remove.get(key)?.has(valueId));
                    const unavailable = !selected && !canAddPropertyValue(key);
                    const sessionCreated = Boolean(entry?.isSessionCreated);
                    const view = createSharedPickerTreeRow(list, {
                        depth: 1,
                        rowClasses: `local-search-property-tree-value-row${sessionCreated ? " is-session-created" : ""}`,
                        active: selected,
                        icon: "tag",
                        name: propertyValueDisplay(entry.value),
                        itemTitle: `给${target?.label || session.metadataTarget?.label || "当前文件"}添加 ${key}: ${propertyValueDisplay(entry.value)}`,
                        count: entry.count,
                        countClasses: "local-search-property-count",
                        countPlacement: "row-end",
                        onClick: unavailable
                            ? null
                            : () => {
                                updateDraftAddValue(key, entry);
                                renderAll({ preserveScroll: true });
                            }
                    });
                    syncSharedPickerTreeRowAvailability(view.row, unavailable);
                    visible++;
                }
            }

            if (!visible && !list.children.length) {
                list.createDiv({
                    text: query
                        ? "没有匹配的属性键或属性值"
                        : "当前仓库没有已有属性；输入属性键名称即可创建",
                    cls: "local-search-empty-hint"
                });
            }
            if (scrollAnchor) {
                restoreScrollableAnchor(list, scrollAnchor);
            } else {
                list.scrollTop = 0;
            }
            if (revealKey) {
                revealScrollableKey(list, revealKey);
            }
        };

        const renderAll = ({ preserveScroll = false, revealKey = "" } = {}) => {
            renderCurrent();
            renderList({ preserveScroll, revealKey });
            footer.sync();
        };

        this._activateBatchPickerSearch(session, search, renderList, renderAll);
    },


    open(anchor, { initialAction = "tag", paths = null, propertyKey = "", propertyTarget = null, metadataTarget = null, asChild = false, initialTagParentPath = "" } = {}) {
        const selectedPaths = paths instanceof Set
            ? new Set(paths)
            : Array.isArray(paths)
                ? new Set(paths)
                : this.owner?.selection?.selectedPaths;
        if (!propertyTarget && !metadataTarget && !selectedPaths?.size) {
            new Notice("请先选择文件");
            return null;
        }

        const targetPaths = Object.freeze(propertyTarget || metadataTarget ? [] : [...this.editablePaths(selectedPaths)]);
        if (!propertyTarget && !metadataTarget && !targetPaths.length) {
            new Notice("当前选择中没有可编辑属性的文件");
            return null;
        }

        const kind = initialAction === "property" ? "property" : "tag";
        const label = kind === "property" ? propertyKey || "新增属性" : "新增标签";
        const panel = asChild ? this.owner.dropdown.openChild(anchor, label) : this.owner.dropdown.open(anchor, label);
        if (!panel) return null;
        panel.addClass(
            "local-search-picker-dropdown",
            "local-search-metadata-panel",
            "local-search-facet-picker",
            "is-persistent-toggle"
        );
        panel.setAttribute(
            "aria-label",
            propertyTarget || metadataTarget ? `${label}：${propertyTarget?.label || metadataTarget.label}` : `${label}：${targetPaths.length} 个可编辑文件`
        );

        const session = {
            panel, propertyKey, propertyTarget, metadataTarget, initialTagParentPath,
            targetPaths,
            targetCount: propertyTarget || metadataTarget ? 1 : targetPaths.length,
            summary: null,
            metadataUniverse: null,
            state: null
        };
        this.owner.dropdown.setBackHandler(panel, null);
        if (kind === "property") this._renderPropertyPicker(session);
        else this._renderTagPicker(session);
        this.owner.dropdown.reposition();
        return session;
    },
};

