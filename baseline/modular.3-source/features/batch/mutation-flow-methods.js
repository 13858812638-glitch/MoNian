// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { collectPropertyKeys } from "../../data/properties/property-catalog.js";
import { normalizeMetadataPropertyType } from "../../data/properties/property-types.js";
import { isSpecialPropertyValue, propertyValueKey, propertyValuesFromRaw, rawSampleForPropertyValue } from "../../data/properties/property-values.js";
import { normalizeUniqueTagList } from "../../data/tags/tag-values.js";
import { createSearchButton } from "../../ui/components/input-controls.js";
import { activatePickerSearch, createSharedPickerFooter } from "../../ui/pickers/picker-shell.js";
import { sortByPreferredOrder } from "../../utils/preferred-order.js";
import { Notice } from "obsidian";
// Instance method owner. `this` is the unchanged BatchMetadataController instance. No additional state store.
export const BatchMetadataController_mutation_flow_methods = {


    editablePaths(paths = this.owner?.selection?.selectedPaths || []) {
        return new Set(
            this.plugin.batchMetadataService
                .metadataFiles(paths)
                .map(file => file.path)
        );
    },


    _summary(session, { refresh = false } = {}) {
        if (!session) return { tags: { present: 0, values: [] }, rows: [] };
        if (refresh || !session.summary) {
            session.summary = session.metadataTarget
                ? session.metadataTarget.summary()
                : this.plugin.batchMetadataService.summarize(session.targetPaths);
        }
        return session.summary;
    },


    _metadataUniverse(session, { refresh = false } = {}) {
        if (!session) return [];
        if (refresh || !Array.isArray(session.metadataUniverse)) {
            session.metadataUniverse = Array.from(this.plugin.fileMetaCache.values())
                .filter(meta => !this.plugin.isPathExcluded(meta.path));
        }
        return session.metadataUniverse;
    },


    _invalidateMetadata(session) {
        if (!session) return;
        session.summary = null;
        session.metadataUniverse = null;
    },


    _batchExistingTags(candidates) {
        return normalizeUniqueTagList(
            (Array.isArray(candidates) ? candidates : [])
                .flatMap(meta => meta.tags || [])
        ).sort((a, b) =>
            a.localeCompare(b, "zh-Hans-CN", { numeric: true })
        );
    },


    _batchExistingPropertyCatalog(candidates) {
        const source = Array.isArray(candidates) ? candidates : [];
        const keys = sortByPreferredOrder(
            this.plugin.propertyCatalogKeys(collectPropertyKeys(
                source, this.plugin.settings.excludedKeys
            ), this.plugin.settings.excludedKeys),
            this.plugin.settings.pickerPropertyOrder,
            key => key
        );
        return keys.map(key => {
            let count = 0;
            let sample;
            const values = new Map();
            for (const meta of source) {
                const properties = meta.properties || {};
                if (!Object.prototype.hasOwnProperty.call(properties, key)) continue;
                count++;
                const rawValue = properties[key];
                if (sample === undefined) sample = rawValue;
                for (const value of propertyValuesFromRaw(rawValue)) {
                    if (isSpecialPropertyValue(value)) continue;
                    const id = propertyValueKey(value);
                    const existing = values.get(id);
                    values.set(id, {
                        value,
                        rawSample: existing?.rawSample
                            ?? rawSampleForPropertyValue(rawValue, value),
                        count: (existing?.count || 0) + 1
                    });
                }
            }
            for (const value of this.plugin.propertyCatalogValues(key)) {
                if (![...values.values()].some(item => String(item.value).toLocaleLowerCase() === String(value).toLocaleLowerCase()))
                    values.set(propertyValueKey(value), { value, rawSample: value, count: 0 });
            }
            return {
                key,
                count,
                sample,
                propertyType: this.plugin.propertyCatalogType(key, sample),
                values: sortByPreferredOrder(
                    [...values.values()],
                    this.plugin.settings.pickerPropertyValueOrder?.[key] || [],
                    entry => propertyValueKey(entry.value)
                )
            };
        });
    },


    _propertyExistsInVault(key) {
        const wanted = String(key || "").trim();
        if (!wanted) return false;
        for (const meta of this.plugin.fileMetaCache.values()) {
            if (Object.prototype.hasOwnProperty.call(meta.properties || {}, wanted)) return true;
        }
        return false;
    },


    async _syncCreatedPropertyTypes(propertyTypes, stats) {
        if (!stats || stats.changed <= 0) return stats;
        const createdKeys = new Set(
            Array.isArray(stats.createdPropertyKeys)
                ? stats.createdPropertyKeys
                : []
        );
        if (!createdKeys.size) return stats;
        const manager = this.app.metadataTypeManager;
        if (typeof manager?.setType !== "function") {
            stats.typeSyncFailed = true;
            return stats;
        }
        try {
            for (const key of createdKeys) {
                await manager.setType(
                    key,
                    normalizeMetadataPropertyType(propertyTypes.get(key) || "text")
                );
            }
        } catch (error) {
            console.error("创建属性后的类型同步失败", error);
            stats.typeSyncFailed = true;
        }
        return stats;
    },


    _isActive(session) {
        return !this._destroyed && session?.panel?.isConnected
            && this.owner.dropdown.isActivePanel(session.panel)
            && (!session.metadataTarget?.isActive || session.metadataTarget.isActive());
    },


    _finishMutation(session, stats, action) {
        if (!this._isActive(session) || stats === false) return false;
        // The shared Picker can edit an uncreated draft. Its target owns the
        // draft refresh; a result/index mutation must never run for that target.
        if (session.metadataTarget) return true;
        // BatchMetadataService already publishes the index once after writing.
        // This layer owns only the active Picker's result refresh and feedback.
        if (stats.changed > 0) {
            try {
                this._invalidateMetadata(session);
                this.owner._refreshCurrentResultsAfterMutation({
                    preserveSelection: true,
                    preferredPaths: session.targetPaths,
                    refreshPools: true
                });
            } catch (error) {
                if (this._isActive(session)) {
                    console.error("元数据修改后的结果刷新失败", error);
                    new Notice("元数据已修改，但结果刷新失败");
                }
            }
        }
        if (!this._isActive(session)) return false;
        if (stats.failed > 0) new Notice(`${action}失败 ${stats.failed} 个文件`);
        if (stats.conflict > 0) new Notice(`${action}跳过 ${stats.conflict} 个冲突`);
        if (stats.typeSyncFailed) new Notice(`${action}已写入，但 Obsidian 属性类型同步失败`);
        // Partial success keeps the same draft available for correction/retry.
        return !(stats.failed > 0 || stats.conflict > 0);
    },


    async _runMutation(session, { action, errorText, operation }) {
        if (!this._isActive(session) || this.owner.selection?.busy) return false;
        const selection = this.owner.selection;
        const submission = this.owner.dropdown.submissionFor(session.panel);
        if (!submission) return false;
        const controls = [...session.panel.querySelectorAll("input, textarea, select, .local-search-metadata-actions button")];
        return submission.submit(async () => {
            if (session.metadataTarget) {
                return this._finishMutation(session, await operation(), action);
            }
            if (!selection.beginMutation("editing-metadata")) return false;
            try {
                return this._finishMutation(session, await operation(), action);
            } finally {
                // Release the business lease before the shared UI owner closes.
                selection.endMutation("editing-metadata");
            }
        }, controls, errorText || `${action}失败`);
    },


    _createDraftFooter(panel, { getChangeCount, onConfirm }) {
        const actions = createSharedPickerFooter(panel);
        // 这是带左侧状态文字的 Picker Footer，不再同时伪装成第二种 Picker Actions 身份。
        // Rail 几何由 Footer 唯一拥有；本组件只补充动作间距。
        actions.addClass("local-search-metadata-actions");
        const status = actions.createSpan({
            cls: "local-search-batch-selection-status",
            attr: { role: "status", "aria-live": "polite" }
        });
        const cancel = createSearchButton(actions, "action", {
            text: "取消",
            cls: "local-search-action-btn"
        });
        const confirm = createSearchButton(actions, "action", {
            text: "确定",
            cls: "local-search-action-btn local-search-action-primary"
        });
        const sync = () => {
            const count = Math.max(0, Number(getChangeCount?.()) || 0);
            status.textContent = count ? `待保存 ${count} 项变更` : "没有待保存变更";
            confirm.disabled = count <= 0;
        };
        cancel.addEventListener("click", () => this.owner.dropdown.close(false));
        confirm.addEventListener("click", () => onConfirm?.(confirm, cancel));
        sync();
        return { status, cancel, confirm, sync };
    },


    _activateBatchPickerSearch(session, search, renderList, renderAll) {
        activatePickerSearch(search, {
            onInput: () => renderList(),
            initialRender: renderAll,
        });
    },
};

