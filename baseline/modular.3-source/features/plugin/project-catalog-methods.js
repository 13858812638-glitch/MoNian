// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { metadataPropertySample, normalizePropertyValueCatalog, parseMetadataPropertyInput, resolveMetadataPropertyType, validateEditablePropertyKey } from "../../data/properties/property-types.js";
import { isExclusivePropertySelectionValue, isSpecialPropertyValue, propertyValueKey } from "../../data/properties/property-values.js";
import { GLS_MANAGED_TIME_KEYS, indexedFileProperties } from "../../data/time/time-values.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { TFile } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_project_catalog_methods = {


    _publishIndexChanges(paths = null, { refreshPools = true, projectChanged = false } = {}) {
        if (this._unloaded) return;
        this._clearResidentSearchResults();
        this._forEachActiveSearchCore(core => core._queueResultIndexChanges(paths, { refreshPools }));
        if (projectChanged || paths === null) this._publishProjectChanges(paths);
    },


    _publishProjectChanges(paths = null) {
        this._projectGroupSnapshot = null;
        for (const listener of this._projectPropertySubscribers) {
            try { listener(paths === null ? null : [...paths]); }
            catch (error) { console.error("GLS 项目属性订阅失败", error); }
        }
    },


    subscribeProjectPropertyChanges(listener) {
        if (this._unloaded || typeof listener !== "function") return () => {};
        this._projectPropertySubscribers.add(listener);
        return () => this._projectPropertySubscribers.delete(listener);
    },


    _connectDidaProjectCatalog(providedOwner = null) {
        if (this._unloaded) return;
        const plugins = this.app.plugins;
        const owner = providedOwner || plugins?.getPlugin?.("dida-bridge") || plugins?.plugins?.["dida-bridge"] || this._didaProjectOwner;
        const candidate = owner?.getWorkbenchApi?.();
        const api = typeof candidate?.listProjectSources === "function" ? candidate : null;
        this._didaProjectOwner = api ? owner : null;
        if (this._didaProjectApi !== api) {
            this._didaProjectUnsubscribe?.();
            this._didaProjectApi = api;
            this._didaProjectUnsubscribe = api?.subscribe?.(() => this._refreshDidaProjectCatalog());
        }
        this._refreshDidaProjectCatalog();
    },


    _refreshDidaProjectCatalog() {
        if (this._unloaded) return;
        const rows = this._didaProjectApi?.listProjectSources() || null;
        // An in-flight tag rename is not deletion. Retain the last confirmed
        // catalog until the owner publishes a valid snapshot (including []).
        if (this._didaProjectApi && rows === null) return;
        if (rows === this._didaProjectRows) return;
        this._didaProjectRows = rows;
        // Tag catalog changes refresh only catalog consumers, never re-index files.
        this._projectGroupSnapshot = null;
        this._publishIndexChanges(null, { refreshPools: true, projectChanged: true });
    },


    _propertyValueCatalog() {
        const source = this.settings.propertyValueCatalog;
        if (this._propertyValueCatalogSource !== source) {
            this._propertyValueCatalogSource = source;
            this._propertyValueCatalogMap = new Map(normalizePropertyValueCatalog(source).map(row => [row.key, row]));
        }
        return this._propertyValueCatalogMap || new Map();
    },


    propertyCatalogType(key, sample) {
        return resolveMetadataPropertyType(this.app, key, sample, this._propertyValueCatalog().get(key)?.propertyType);
    },


    propertyCatalogValues(key) {
        const values = new Map();
        for (const value of this._propertyValueCatalog().get(key)?.values || []) values.set(propertyValueKey(value), value);
        if (key === "所属项目") for (const group of this.getIndexedProjectGroups()) {
            if (!values.has(propertyValueKey(group.name))) values.set(propertyValueKey(group.name), group.name);
        }
        return [...values.values()];
    },


    hasPropertyCatalogValue(key, value) {
        return Boolean(this._propertyValueCatalog().get(key)?.values.some(item => propertyValueKey(item) === propertyValueKey(value)));
    },


    propertyCatalogKeys(keys = [], excluded = []) {
        const result = new Set([...keys, ...this._propertyValueCatalog().keys()]);
        if (this.getIndexedProjectGroups().length) result.add("所属项目");
        return [...result].filter(key => !excluded.includes(key));
    },


    async addPropertyCatalogValues(operations = []) {
        return this._withPropertyCatalogMutation(() => this._addPropertyCatalogValues(operations));
    },


    async _addPropertyCatalogValues(operations = []) {
        const before = normalizePropertyValueCatalog(this.settings.propertyValueCatalog);
        const next = new Map(before.map(row => [row.key, { ...row, values: [...row.values] }]));
        const selected = [];
        for (const operation of operations) {
            const key = validateEditablePropertyKey(operation?.key, this.settings.excludedKeys);
            if (this.isVirtualPropertyKey(key)) throw new Error("此属性由外部插件管理");
            const sample = metadataPropertySample(this.fileMetaCache.values(), key);
            const known = sample !== undefined || next.has(key);
            const propertyType = known ? this.propertyCatalogType(key, sample)
                : resolveMetadataPropertyType(this.app, key, undefined, operation.propertyType);
            const values = new Map((next.get(key)?.values || []).map(value => [propertyValueKey(value), value]));
            const additions = [];
            for (const raw of (operation.addValues || []).flat(Infinity)) {
                if (isExclusivePropertySelectionValue(raw)) throw new Error("筛选状态不能作为属性值新增");
                const value = parseMetadataPropertyInput(raw, propertyType);
                values.set(propertyValueKey(value), value);
                additions.push(value);
            }
            if (values.size) next.set(key, { key, propertyType, values: [...values.values()] });
            if (additions.length) selected.push({ key, propertyType, values: additions });
        }
        const committed = normalizePropertyValueCatalog([...next.values()]);
        if (JSON.stringify(before) !== JSON.stringify(committed)) {
            this.settings.propertyValueCatalog = committed;
            try {
                if (await this.saveSettings() === false) throw new Error("属性值保存失败");
            } catch (error) {
                if (JSON.stringify(normalizePropertyValueCatalog(this.settings.propertyValueCatalog)) === JSON.stringify(committed)) {
                    this.settings.propertyValueCatalog = before;
                }
                this._invalidatePropertyCatalogViews();
                if (!this._unloaded) {
                    try { await this.saveSettings(); } catch (_) { /* Preserve the original failure. */ }
                }
                throw error;
            }
            this._propertyCatalogRevision = (this._propertyCatalogRevision || 0) + 1;
            this._publishIndexChanges(null, { refreshPools: true, projectChanged: selected.some(row => row.key === "所属项目") });
        }
        return selected;
    },


    _remapPropertyValueCatalog({ key, nextKey, oldValue, newValue, removeKey = false, removeValue = false }) {
        const rows = new Map(normalizePropertyValueCatalog(this.settings.propertyValueCatalog).map(row => [row.key, row]));
        const row = rows.get(key);
        if (!row) return false;
        if (removeKey) rows.delete(key);
        else if (nextKey) {
            if (rows.has(nextKey)) throw new Error(`属性「${nextKey}」已存在于可选值中`);
            rows.delete(key); rows.set(nextKey, { ...row, key: nextKey });
        } else {
            row.propertyType = this.propertyCatalogType(key, metadataPropertySample(this.fileMetaCache.values(), key));
            const oldId = propertyValueKey(oldValue);
            row.values = row.values.flatMap(value => propertyValueKey(value) !== oldId ? [value]
                : removeValue ? [] : [parseMetadataPropertyInput(newValue, row.propertyType)]);
            if (!row.values.length) rows.delete(key);
        }
        const next = normalizePropertyValueCatalog([...rows.values()]);
        const changed = JSON.stringify(next) !== JSON.stringify(this.settings.propertyValueCatalog);
        this.settings.propertyValueCatalog = next;
        if (changed) {
            this._propertyCatalogRevision = (this._propertyCatalogRevision || 0) + 1;
            this._projectGroupSnapshot = null;
            this._clearResidentSearchResults();
        }
        return changed;
    },


    getIndexedProjectGroups() {
        this._connectDidaProjectCatalog();
        if (this._projectGroupSnapshot) return this._projectGroupSnapshot;
        const groups = new Map();
        const values = value => [...new Set((Array.isArray(value) ? value : [value])
            .map(item => String(item ?? "").trim()).filter(Boolean))];
        for (const meta of this.fileMetaCache.values()) {
            const names = values(meta.properties?.["所属项目"]);
            if (!names.length) continue;
            for (const name of names) {
                const key = name.toLocaleLowerCase();
                if (!groups.has(key)) groups.set(key, { name, paths: new Set(), createdAt: Infinity });
                const group = groups.get(key);
                if (name.localeCompare(group.name, "en", { caseFirst: "upper" }) < 0) group.name = name;
                group.paths.add(meta.path);
                group.createdAt = Math.min(group.createdAt, Number(meta.ctime) || Infinity);
            }
        }
        // A Dida-only project needs no placeholder Markdown file. File counts stay truthful.
        for (const source of this._didaProjectRows || []) {
            const name = String(source.name || "").trim(), key = name.toLocaleLowerCase();
            if (name && !groups.has(key)) groups.set(key, { name, paths: new Set(), createdAt: Infinity });
        }
        for (const value of this._propertyValueCatalog().get("所属项目")?.values || []) {
            const name = String(value).trim(), key = name.toLocaleLowerCase();
            if (name && !groups.has(key)) groups.set(key, { name, paths: new Set(), createdAt: Infinity });
        }
        const snapshot = [...groups.values()].map(group => Object.freeze({
            name: group.name,
            paths: Object.freeze([...group.paths].sort()),
            createdAt: Number.isFinite(group.createdAt) ? group.createdAt : 0
        })).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
        this._projectGroupSnapshot = Object.freeze(snapshot);
        return this._projectGroupSnapshot;
    },


    // Migration-only read. Live project catalogs never infer owners from files.
    // Null means the initial authoritative index is not yet safe to migrate.
    getProjectOwnerMigration() {
        if (this._unloaded || !this._initialIndexReady) return null;
        if (this.app.vault.getFiles().some(file => !this.isPathExcluded(file.path)
            && !this.fileMetaCache.has(file.path))) return null;
        return this.getIndexedProjectGroups().map(group => ({ name: group.name,
            owners: normalizeUniqueStringList(group.paths.flatMap(path => {
                const value = this.fileMetaCache.get(path)?.properties?.["项目负责人"];
                return Array.isArray(value) ? value : value == null ? [] : [String(value)];
            })) }));
    },


    getIndexedFileProperties(path) {
        const key = String(path || "");
        const meta = this.fileMetaCache.get(key), file = this.app.vault.getAbstractFileByPath(key);
        if (this._unloaded || !(file instanceof TFile) || this.isPathExcluded(key)
            || (meta?.file && meta.file !== file)) return null;
        return meta?.properties ? JSON.parse(JSON.stringify(indexedFileProperties(meta.properties))) : null;
    },


    getIndexedPropertyCatalog() {
        if (this._unloaded || !this.batchMetadataService) return [];
        const summary = this.batchMetadataService.summarize([...this.fileMetaCache.keys()]);
        const rows = summary.rows.filter(row => !GLS_MANAGED_TIME_KEYS.has(row.key)
            && !["__proto__", "constructor", "prototype"].includes(row.key)
            && !/[\x00-\x1f\x7f]/.test(row.key)).map(row => ({
            key: row.key,
            propertyType: resolveMetadataPropertyType(this.app, row.key, row.rawSample),
            values: [...row.values.values()].filter(item => !isSpecialPropertyValue(item.value)).map(item => item.value)
        }));
        if (summary.tags.present) rows.push({ key: "tags", propertyType: "multitext",
            values: summary.tags.values.map(item => item.value) });
        for (const entry of this._propertyValueCatalog().values()) {
            const row = rows.find(item => item.key === entry.key);
            if (row) {
                row.propertyType = this.propertyCatalogType(entry.key, metadataPropertySample(this.fileMetaCache.values(), entry.key));
                const values = new Map(row.values.map(value => [propertyValueKey(value), value]));
                for (const value of entry.values) if (!values.has(propertyValueKey(value))) values.set(propertyValueKey(value), value);
                row.values = [...values.values()];
            } else rows.push({ key: entry.key, propertyType: this.propertyCatalogType(entry.key), values: [...entry.values] });
        }
        const projects = this.propertyCatalogValues("所属项目");
        if (projects.length) {
            const row = rows.find(item => item.key === "所属项目");
            if (row) row.values = projects;
            else rows.push({ key: "所属项目", propertyType: "multitext", values: projects });
        }
        return rows.sort((a, b) => a.key.localeCompare(b.key, "zh-Hans-CN"));
    },


    async patchExternalProperties({ paths = [], properties = [], addTags = [], removeTags = [] } = {}) {
        if (!this.batchMetadataService) throw new Error("GLS 属性模块尚未就绪");
        return this.batchMetadataService.applyMetadataDraft(paths, { properties, addTags, removeTags });
    },
};

