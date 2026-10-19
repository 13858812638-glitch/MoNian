// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { metadataPropertySample, normalizeMetadataPropertyType, parseMetadataPropertyInput, validateEditablePropertyKey } from "../../data/properties/property-types.js";
import { isSpecialPropertyValue, normalizePropertySelection, propertyValueKey } from "../../data/properties/property-values.js";
import { assertVaultPropertyMutationSucceeded } from "../../services/BatchMetadataService.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { CREATE_TYPE_IDS, normalizeCreateMetadataMemory } from "../create/create-model.js";
import { FilterState } from "../filters/filter-state.js";
import { normalizeFilterPools } from "../filters/pool-config.js";
import { remapNavigatorCustomization } from "../navigator/customization-model.js";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_property_maintenance_methods = {



    async _withPropertyCatalogMutation(operation) {
        if (this._unloaded) throw new Error("插件已停用");
        if (this._propertyCatalogWriting) throw new Error("属性值正在保存，请稍后重试");
        this._propertyCatalogWriting = true;
        try { return await operation(); }
        finally { this._propertyCatalogWriting = false; }
    },


    _propertyMaintenanceSettingsSnapshot(stats = null) {
        if (stats && this._unloaded) throw new Error(stats.changed > 0
            ? `已修改 ${stats.changed} 个文件，但插件已停用，目录变更尚未保存`
            : "插件已停用，未应用目录变更");
        const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
        const filters = new Map();
        for (const core of this.activeSearchCores || []) {
            if (core._destroyed) continue;
            for (const state of this._activeCoreFilterStates(core)) filters.set(state, state.toSnapshot());
        }
        const holders = new Map();
        for (const value of this._closedSearchViewStates?.values?.() || []) {
            for (const holder of [value.session, value.session?.create]) {
                if (holder?.filterSnapshot) holders.set(holder, clone(holder.filterSnapshot));
            }
        }
        const shared = this.sharedSearchState;
        return { settings: Object.fromEntries([
            "propertyValueCatalog", "pickerPropertyOrder", "pickerPropertyValueOrder",
            "hiddenResultPropertyKeys", "excludedKeys", "filterPools",
            "createMetadataMemory", "navigatorCustomization", "navigatorToolbars", "modalFilterSnapshot",
            "createSessionRecovery", "sharedSearchState"
        ].map(key => [key, clone(this.settings[key])])), filters, holders,
            sharedFilter: clone(shared?.state?.filterSnapshot || this.settings.sharedSearchState?.state?.filterSnapshot),
            observed: new Map([...(shared?.members?.values?.() || [])]
                .map(member => [member, clone(member.observed?.filterSnapshot)])) };
    },


    _invalidatePropertyCatalogViews() {
        this._propertyCatalogRevision = (this._propertyCatalogRevision || 0) + 1;
        this._projectGroupSnapshot = null;
        this._clearResidentSearchResults();
        this._publishIndexChanges(null, { refreshPools: true, projectChanged: true });
    },


    async _savePropertyMaintenanceSettings(before, stats, action) {
        const attempted = this._propertyMaintenanceSettingsSnapshot();
        let saved = false;
        try { saved = !this._unloaded && await this.saveSettings() !== false; }
        catch (error) { console.warn(`${action}后的设置保存失败`, error); }
        if (saved) return null;
        if (stats.changed > 0) {
            // File edits are already committed by BatchMetadataService. Keep the
            // matching in-memory directory and let the caller refresh real state.
            return new Error(`已修改 ${stats.changed} 个文件，但${action}的目录设置保存失败。文件修改已保留，请检查存储后重试保存设置。`);
        }
        for (const key of Object.keys(before.settings)) {
            // Do not roll back another settings editor's intervening change.
            if (JSON.stringify(this.settings[key]) === JSON.stringify(attempted.settings[key])) this.settings[key] = before.settings[key];
        }
        const restoreProperties = (current, previous, changed) => {
            if (current && previous && changed && JSON.stringify(current.properties) === JSON.stringify(changed.properties)) {
                current.properties = JSON.parse(JSON.stringify(previous.properties));
            }
        };
        restoreProperties(this.settings.modalFilterSnapshot, before.settings.modalFilterSnapshot, attempted.settings.modalFilterSnapshot);
        for (const [key, value] of Object.entries(before.settings.createSessionRecovery || {})) {
            const current = this.settings.createSessionRecovery?.[key]?.session;
            const changed = attempted.settings.createSessionRecovery?.[key]?.session;
            restoreProperties(current?.filterSnapshot, value?.session?.filterSnapshot, changed?.filterSnapshot);
            restoreProperties(current?.create?.filterSnapshot, value?.session?.create?.filterSnapshot, changed?.create?.filterSnapshot);
        }
        for (const [state, snapshot] of before.filters) {
            if (JSON.stringify(state.toSnapshot().properties) === JSON.stringify(attempted.filters.get(state)?.properties)) {
                state.properties = FilterState.fromSnapshot(snapshot).properties;
            }
        }
        for (const [holder, snapshot] of before.holders) {
            restoreProperties(holder.filterSnapshot, snapshot, attempted.holders.get(holder));
        }
        const shared = this.sharedSearchState;
        if (shared?.state && JSON.stringify(shared.state.filterSnapshot?.properties) === JSON.stringify(attempted.sharedFilter?.properties)) {
            restoreProperties(shared.state.filterSnapshot, before.sharedFilter, attempted.sharedFilter);
            shared.revision++;
            if (!this._unloaded) shared._remember();
        }
        for (const [member, snapshot] of before.observed) {
            restoreProperties(member.observed?.filterSnapshot, snapshot, attempted.observed.get(member));
        }
        this._invalidatePropertyCatalogViews();
        if (!this._unloaded) this._forEachActiveSearchCore(core => this._settleCoreFilterMutation(core));
        // An unrelated settings save may already have captured the attempted
        // values. Append the rollback to the same write queue, never a new writer.
        if (!this._unloaded) {
            try { await this.saveSettings(); } catch (_) { /* Original failure stays visible. */ }
        }
        throw new Error(`${action}的设置保存失败，未应用本次目录变更`);
    },


    async renameVaultPropertyKey(...args) {
        return this._withPropertyCatalogMutation(() => this._renameVaultPropertyKey(...args));
    },


    async _renameVaultPropertyKey(oldKey, newKey, retry = {}) {
        const source = String(oldKey || "").trim();
        const target = validateEditablePropertyKey(
            newKey,
            this.settings.excludedKeys
        );
        if (!source) throw new Error("原属性键无效");
        if (source === target) return false;
        if (this._propertyValueCatalog().has(target)) throw new Error(`属性「${target}」已存在于可选值中`);
        if (retry.completed?.size && (retry.source !== source || retry.target !== target)) {
            throw new Error(`上次已部分重命名为「${retry.target}」，请保持该名称完成重试`);
        }
        if (retry.source !== source || retry.target !== target) {
            retry.source = source;
            retry.target = target;
            retry.completed = new Map();
        }
        const pickerOrderBefore = this._materializePropertyPickerOrders();

        // 全库维护和批量写入共用目标解析；排除文件不属于本次操作，不能误计为失败。
        const files = this.batchMetadataService.metadataFiles();
        for (const file of files) {
            const properties = await this._readFileProperties(file);
            if (properties && Object.prototype.hasOwnProperty.call(properties, target)) {
                const completedHere = retry.completed.has(file)
                    && !Object.prototype.hasOwnProperty.call(properties, source)
                    && JSON.stringify(properties[target]) === retry.completed.get(file);
                if (completedHere) continue;
                throw new Error(`属性「${target}」已存在，请使用其它属性名`);
            }
        }

        const manager = this.app.metadataTypeManager;
        let assignedType = "";
        try {
            if (typeof manager?.getAssignedWidget === "function") {
                const rawAssignedType = manager.getAssignedWidget(source);
                assignedType = rawAssignedType
                    ? normalizeMetadataPropertyType(rawAssignedType)
                    : "";
            }
        } catch (_) {}

        const stats = await this.batchMetadataService.renameKey(
            files.map(file => file.path),
            source,
            target,
            retry.completed
        );
        assertVaultPropertyMutationSucceeded(stats, "重命名属性");
        const settingsBefore = this._propertyMaintenanceSettingsSnapshot(stats);
        const catalogChanged = this._remapPropertyValueCatalog({ key: source, nextKey: target });

        this.settings.pickerPropertyOrder = normalizeUniqueStringList(
            pickerOrderBefore.keys.map(key =>
                key === source ? target : key
            )
        );
        const valueOrders = {
            ...(this.settings.pickerPropertyValueOrder || {})
        };
        const sourceValueOrder = normalizeUniqueStringList([
            ...(valueOrders[target] || []),
            ...(pickerOrderBefore.values[source] || valueOrders[source] || [])
        ]);
        delete valueOrders[source];
        if (sourceValueOrder.length) valueOrders[target] = sourceValueOrder;
        else delete valueOrders[target];
        this.settings.pickerPropertyValueOrder = valueOrders;
        this.settings.hiddenResultPropertyKeys = normalizeUniqueStringList(
            (this.settings.hiddenResultPropertyKeys || []).map(key =>
                key === source ? target : key
            )
        );

        this._mutatePropertyFilterPoolEntries(entries => {
            if (!Object.prototype.hasOwnProperty.call(entries, source)) return;
            entries[target] = entries[source];
            delete entries[source];
        });
        // 左侧属性键的自动显示排除项随真实属性键重命名，不遗留旧名称。
        this.settings.filterPools = normalizeFilterPools(this.settings.filterPools).map(pool =>
            pool.kind === "property"
                ? { ...pool, hiddenKeyNames: normalizeUniqueStringList(
                    (pool.hiddenKeyNames || []).map(key => key === source ? target : key)
                ) }
                : pool
        );

        const createMemory = normalizeCreateMetadataMemory(
            this.settings.createMetadataMemory
        );
        for (const type of CREATE_TYPE_IDS) {
            const state = FilterState.fromSnapshot({
                properties: createMemory[type].properties
            });
            const values = state.properties.get(source);
            if (values) {
                state.properties.delete(source);
                state.properties.set(target, new Set(values));
            }
            createMemory[type].properties = state.toSnapshot().properties;
            createMemory[type].propertyTypes = createMemory[type].propertyTypes.map(([key, value]) => [key === source ? target : key, value]);
        }
        this.settings.createMetadataMemory = createMemory;

        remapNavigatorCustomization(this.settings, { kind: "property-key", from: source, to: target });
        this._transformSearchFilters(state => {
            const values = state.properties.get(source);
            if (!values) return;
            state.properties.delete(source);
            const merged = normalizePropertySelection([...(state.properties.get(target) || []), ...values]);
            if (merged.size) state.properties.set(target, merged);
            else state.properties.delete(target);
        });
        const settingsError = await this._savePropertyMaintenanceSettings(settingsBefore, stats, "重命名属性");
        if (this._unloaded) { if (settingsError) throw settingsError; return stats.changed > 0 || catalogChanged; }

        if (assignedType && typeof manager?.setType === "function") {
            try {
                await manager.setType(target, assignedType);
                if (typeof manager?.unsetType === "function") {
                    await manager.unsetType(source);
                }
            } catch (error) {
                console.warn("属性重命名后的类型同步失败", error);
            }
        }

        await this._flushIndexQueueNow();
        this._refreshFilterPoolCores();
        if (catalogChanged) this._publishIndexChanges(null, { refreshPools: true });
        if (settingsError) throw settingsError;
        return stats.changed > 0 || catalogChanged;
    },


    async deleteVaultPropertyKey(...args) {
        return this._withPropertyCatalogMutation(() => this._deleteVaultPropertyKey(...args));
    },


    async _deleteVaultPropertyKey(key) {
        const propertyKey = String(key || "").trim();
        if (!propertyKey) throw new Error("属性键无效");
        const pickerOrderBefore = this._materializePropertyPickerOrders();

        const paths = this.batchMetadataService.metadataFiles().map(file => file.path);
        const stats = await this.batchMetadataService.transformValue(
            paths,
            propertyKey,
            () => undefined
        );
        assertVaultPropertyMutationSucceeded(stats, "删除属性");
        const settingsBefore = this._propertyMaintenanceSettingsSnapshot(stats);
        const catalogChanged = this._remapPropertyValueCatalog({ key: propertyKey, removeKey: true });

        this.settings.pickerPropertyOrder = normalizeUniqueStringList(
            pickerOrderBefore.keys.filter(
                current => current !== propertyKey
            )
        );
        const valueOrders = {
            ...(this.settings.pickerPropertyValueOrder || {})
        };
        delete valueOrders[propertyKey];
        this.settings.pickerPropertyValueOrder = valueOrders;
        this.settings.hiddenResultPropertyKeys = normalizeUniqueStringList(
            (this.settings.hiddenResultPropertyKeys || []).filter(
                key => key !== propertyKey
            )
        );
        this.settings.excludedKeys = normalizeUniqueStringList(
            (this.settings.excludedKeys || []).filter(
                key => key !== propertyKey
            )
        );

        this._mutatePropertyFilterPoolEntries(entries => {
            delete entries[propertyKey];
        });
        this.settings.filterPools = normalizeFilterPools(this.settings.filterPools).map(pool =>
            pool.kind === "property"
                ? { ...pool, hiddenKeyNames: (pool.hiddenKeyNames || []).filter(key => key !== propertyKey) }
                : pool
        );

        const createMemory = normalizeCreateMetadataMemory(
            this.settings.createMetadataMemory
        );
        for (const type of CREATE_TYPE_IDS) {
            const state = FilterState.fromSnapshot({
                properties: createMemory[type].properties
            });
            state.properties.delete(propertyKey);
            createMemory[type].properties = state.toSnapshot().properties;
            createMemory[type].propertyTypes = createMemory[type].propertyTypes.filter(([key]) => key !== propertyKey);
        }
        this.settings.createMetadataMemory = createMemory;

        remapNavigatorCustomization(this.settings, { kind: "property-key", from: propertyKey, to: null });
        this._transformSearchFilters(state => { state.properties.delete(propertyKey); });
        const settingsError = await this._savePropertyMaintenanceSettings(settingsBefore, stats, "删除属性");
        if (this._unloaded) { if (settingsError) throw settingsError; return stats.changed > 0 || catalogChanged; }

        const manager = this.app.metadataTypeManager;
        if (typeof manager?.unsetType === "function") {
            try {
                await manager.unsetType(propertyKey);
            } catch (error) {
                console.warn("删除属性后的类型清理失败", error);
            }
        }

        await this._flushIndexQueueNow();
        this._refreshFilterPoolCores();
        if (catalogChanged) this._publishIndexChanges(null, { refreshPools: true });
        if (settingsError) throw settingsError;
        return stats.changed > 0 || catalogChanged;
    },


    async deleteVaultPropertyValue(...args) {
        return this._withPropertyCatalogMutation(() => this._deleteVaultPropertyValue(...args));
    },


    async _deleteVaultPropertyValue(
        key,
        value,
        propertyType = "text"
    ) {
        const propertyKey = String(key || "").trim();
        if (!propertyKey || isSpecialPropertyValue(value)) {
            throw new Error("属性值无效");
        }

        const valueId = propertyValueKey(value);
        const pickerOrderBefore = this._materializePropertyPickerOrders();
        const paths = this.batchMetadataService.metadataFiles().map(file => file.path);
        const stats = await this.batchMetadataService.applyMetadataDraft(paths, {
            properties: [{
                key: propertyKey,
                propertyType: normalizeMetadataPropertyType(propertyType),
                removeValues: [value],
                addValues: []
            }]
        });
        assertVaultPropertyMutationSucceeded(stats, "删除属性值");
        const settingsBefore = this._propertyMaintenanceSettingsSnapshot(stats);
        const catalogChanged = this._remapPropertyValueCatalog({ key: propertyKey, oldValue: value, removeValue: true });

        const valueOrders = {
            ...(this.settings.pickerPropertyValueOrder || {})
        };
        const nextOrder = normalizeUniqueStringList(
            (pickerOrderBefore.values[propertyKey] || valueOrders[propertyKey] || [])
                .filter(id => id !== valueId)
        );
        if (nextOrder.length) valueOrders[propertyKey] = nextOrder;
        else delete valueOrders[propertyKey];
        this.settings.pickerPropertyValueOrder = valueOrders;

        const createMemory = normalizeCreateMetadataMemory(
            this.settings.createMetadataMemory
        );
        for (const type of CREATE_TYPE_IDS) {
            const state = FilterState.fromSnapshot({
                properties: createMemory[type].properties
            });
            const values = state.properties.get(propertyKey);
            if (values) {
                const next = new Set(
                    [...values].filter(current =>
                        propertyValueKey(current) !== valueId
                    )
                );
                if (next.size) state.properties.set(propertyKey, next);
                else state.properties.delete(propertyKey);
            }
            createMemory[type].properties = state.toSnapshot().properties;
        }
        this.settings.createMetadataMemory = createMemory;

        remapNavigatorCustomization(this.settings, { kind: "property-value", key: propertyKey, from: value, to: null });
        this._transformSearchFilters(state => {
            const values = state.properties.get(propertyKey);
            if (!values) return;
            const next = new Set([...values].filter(value => propertyValueKey(value) !== valueId));
            if (next.size) state.properties.set(propertyKey, next);
            else state.properties.delete(propertyKey);
        });
        const settingsError = await this._savePropertyMaintenanceSettings(settingsBefore, stats, "删除属性值");
        if (this._unloaded) { if (settingsError) throw settingsError; return stats.changed > 0 || catalogChanged; }

        await this._flushIndexQueueNow();
        this._refreshFilterPoolCores();

        if (catalogChanged) this._publishIndexChanges(null, { refreshPools: true });
        if (settingsError) throw settingsError;
        return stats.changed > 0 || catalogChanged;
    },


    async renameVaultPropertyValue(...args) {
        return this._withPropertyCatalogMutation(() => this._renameVaultPropertyValue(...args));
    },


    async _renameVaultPropertyValue(
        key,
        oldValue,
        newValue,
        propertyType = "text"
    ) {
        const propertyKey = String(key || "").trim();
        if (!propertyKey) throw new Error("属性键无效");
        if (this._propertyValueCatalog().has(propertyKey)) {
            propertyType = this.propertyCatalogType(propertyKey, metadataPropertySample(this.fileMetaCache.values(), propertyKey));
            newValue = parseMetadataPropertyInput(newValue, propertyType);
        }
        const oldId = propertyValueKey(oldValue);
        const newId = propertyValueKey(newValue);
        if (oldId === newId) return false;
        const pickerOrderBefore = this._materializePropertyPickerOrders();

        const stats = await this.batchMetadataService.migrateValue(
            this.batchMetadataService.metadataFiles().map(file => file.path),
            propertyKey,
            oldValue,
            newValue,
            normalizeMetadataPropertyType(propertyType)
        );
        assertVaultPropertyMutationSucceeded(stats, "重命名属性值");
        const settingsBefore = this._propertyMaintenanceSettingsSnapshot(stats);
        const catalogChanged = this._remapPropertyValueCatalog({ key: propertyKey, oldValue, newValue });

        const valueOrders = {
            ...(this.settings.pickerPropertyValueOrder || {})
        };
        valueOrders[propertyKey] = normalizeUniqueStringList(
            (pickerOrderBefore.values[propertyKey] || valueOrders[propertyKey] || [])
                .map(valueId => valueId === oldId ? newId : valueId)
        );
        this.settings.pickerPropertyValueOrder = valueOrders;
        const createMemory = normalizeCreateMetadataMemory(
            this.settings.createMetadataMemory
        );
        for (const type of CREATE_TYPE_IDS) {
            const state = FilterState.fromSnapshot({
                properties: createMemory[type].properties
            });
            const values = state.properties.get(propertyKey);
            if (values) {
                const next = new Set(
                    [...values].map(current =>
                        propertyValueKey(current) === oldId ? newValue : current
                    )
                );
                state.properties.set(
                    propertyKey,
                    normalizePropertySelection(next)
                );
            }
            createMemory[type].properties = state.toSnapshot().properties;
        }
        this.settings.createMetadataMemory = createMemory;

        remapNavigatorCustomization(this.settings, { kind: "property-value", key: propertyKey, from: oldValue, to: newValue });
        this._transformSearchFilters(state => {
            const values = state.properties.get(propertyKey);
            if (!values) return;
            const next = normalizePropertySelection([...values].map(value =>
                propertyValueKey(value) === oldId ? newValue : value));
            if (next.size) state.properties.set(propertyKey, next);
            else state.properties.delete(propertyKey);
        });
        const settingsError = await this._savePropertyMaintenanceSettings(settingsBefore, stats, "重命名属性值");
        if (this._unloaded) { if (settingsError) throw settingsError; return stats.changed > 0 || catalogChanged; }
        await this._flushIndexQueueNow();
        this._refreshFilterPoolCores();

        if (catalogChanged) this._publishIndexChanges(null, { refreshPools: true });
        if (settingsError) throw settingsError;
        return stats.changed > 0 || catalogChanged;
    },
};

