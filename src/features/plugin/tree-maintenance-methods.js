// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { materializePropertyPickerOrders, materializeTagPickerOrder } from "../../data/properties/property-catalog.js";
import { propertyValueKey } from "../../data/properties/property-values.js";
import { NO_TAGS_FILTER_VALUE, normalizeFilterTagSelection, normalizeTagValue, normalizeUniqueTagList, tagIdentityKey } from "../../data/tags/tag-values.js";
import { normalizeStringListMap, normalizeUniqueStringList } from "../../utils/normalization.js";
import { remapFilterPoolStoredKeys, remapPreferredPathOrder, sortByPreferredOrder, updatePreferredSiblingOrder } from "../../utils/preferred-order.js";
import { isSameOrDescendantVaultPath, normalizeVaultFolderPath } from "../../utils/vault-paths.js";
import { CREATE_TYPE_IDS, normalizeCreateMetadataMemory } from "../create/create-model.js";
import { normalizeFilterPools, normalizePropertyPoolEntries } from "../filters/pool-config.js";
import { remapNavigatorCustomization } from "../navigator/customization-model.js";
import { TFile, TFolder } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_tree_maintenance_methods = {

    
    async setPickerSiblingOrder(kind, siblingKeys, draggedKey, beforeKey = null, scopeKey = "", { persist = true } = {}) {
        if (kind === "property-value") {
            const propertyKey = String(scopeKey || "").trim();
            if (!propertyKey) return false;
            const currentMap = normalizeStringListMap(
                this.settings?.pickerPropertyValueOrder
            );
            const current = normalizeUniqueStringList(currentMap[propertyKey]);
            const next = updatePreferredSiblingOrder(
                current,
                siblingKeys,
                draggedKey,
                beforeKey
            );
            if (JSON.stringify(current) === JSON.stringify(next)) return false;
            const nextMap = { ...currentMap };
            if (next.length) nextMap[propertyKey] = next;
            else delete nextMap[propertyKey];
            this.settings.pickerPropertyValueOrder = nextMap;
            this._refreshPickerOrderConsumers("property-value");
            if (persist && await this.saveSettings() === false) throw new Error("排序设置保存失败");
            return true;
        }

        const settingKey = ({
            tag: "pickerTagOrder",
            folder: "pickerFolderOrder",
            "property-key": "pickerPropertyOrder"
        })[kind];
        if (!settingKey) return false;

        const current = normalizeUniqueStringList(this.settings?.[settingKey]);
        const next = updatePreferredSiblingOrder(
            current,
            siblingKeys,
            draggedKey,
            beforeKey
        );
        if (JSON.stringify(current) === JSON.stringify(next)) return false;
        this.settings[settingKey] = next;
        this._refreshPickerOrderConsumers(kind);
        if (persist && await this.saveSettings() === false) throw new Error("排序设置保存失败");
        return true;
    },


    async moveFolderTreeNode(sourcePath, targetParentPath = "") {
        const source = this.app.vault.getAbstractFileByPath(sourcePath);
        if (!(source instanceof TFolder)) throw new Error("源文件夹不存在");
        if (source === this.app.vault.getRoot()) throw new Error("不能移动仓库根目录");

        const parentPath = normalizeVaultFolderPath(targetParentPath);
        if (isSameOrDescendantVaultPath(parentPath, source.path)) {
            throw new Error("不能把文件夹移入自身或其子文件夹");
        }
        const currentParent = normalizeVaultFolderPath(source.parent?.path || "");
        if (currentParent === parentPath) return source.path;

        if (parentPath) {
            const parent = this.app.vault.getAbstractFileByPath(parentPath);
            if (!(parent instanceof TFolder)) throw new Error("目标文件夹不存在");
        }

        const newPath = parentPath ? `${parentPath}/${source.name}` : source.name;
        const conflict = this.app.vault.getAbstractFileByPath(newPath);
        if (conflict && conflict !== source) {
            throw new Error(`目标位置已存在同名文件夹：${newPath}`);
        }

        await this.fileOperations.renameFile(source, newPath);
        return source.path;
    },


    _tagPathMatchesPrefix(value, prefix) {
        const tag = normalizeTagValue(value);
        const source = normalizeTagValue(prefix);
        if (!tag || !source) return false;
        const sourceKey = tagIdentityKey(source);
        const tagKey = tagIdentityKey(tag);
        return tagKey === sourceKey || tagKey.startsWith(sourceKey + "/");
    },


    _remapTagPath(value, oldPrefix, newPrefix) {
        const tag = normalizeTagValue(value);
        if (!tag) return tag;
        const oldKey = tagIdentityKey(oldPrefix);
        const tagKey = tagIdentityKey(tag);
        if (tagKey === oldKey) return newPrefix;
        if (tagKey.startsWith(oldKey + "/")) {
            return newPrefix + tag.slice(oldPrefix.length);
        }
        return tag;
    },


    _rewriteInlineTagPositions(content, cache, oldPrefix, newPrefix, {
        removeTree = false
    } = {}) {
        const entries = (cache?.tags || [])
            .map(entry => {
                const originalTag = normalizeTagValue(entry?.tag);
                const matches = this._tagPathMatchesPrefix(originalTag, oldPrefix);
                const remapped = removeTree && matches
                    ? ""
                    : this._remapTagPath(originalTag, oldPrefix, newPrefix);
                const start = Number(entry?.position?.start?.offset);
                const end = Number(entry?.position?.end?.offset);
                return { entry, originalTag, remapped, matches, start, end };
            })
            .filter(item =>
                item.originalTag
                && (removeTree ? item.matches : (item.remapped && item.remapped !== item.originalTag))
            )
            .sort((a, b) => b.start - a.start);

        let next = content;
        for (const item of entries) {
            if (!Number.isInteger(item.start) || !Number.isInteger(item.end)
                || item.start < 0 || item.end <= item.start || item.end > content.length) {
                throw new Error("标签位置索引无效，请等待笔记索引更新后重试");
            }
            const raw = next.slice(item.start, item.end);
            if (raw !== item.entry.tag) {
                throw new Error("标签位置索引已过期，未覆盖当前正文");
            }
            const replacement = removeTree
                ? ""
                : raw.startsWith("#")
                    ? `#${item.remapped}`
                    : item.remapped;
            next = next.slice(0, item.start) + replacement + next.slice(item.end);
        }
        return next;
    },


    _materializeTagPickerOrder() {
        return materializeTagPickerOrder(
            [...this.fileMetaCache.values()],
            this.settings.pickerTagOrder
        );
    },


    _materializePropertyPickerOrders() {
        const materialized = materializePropertyPickerOrders(
            [...this.fileMetaCache.values()],
            this.settings.excludedKeys,
            this.settings.pickerPropertyOrder,
            this.settings.pickerPropertyValueOrder
        );
        materialized.keys = sortByPreferredOrder(
            this.propertyCatalogKeys(materialized.keys, this.settings.excludedKeys),
            this.settings.pickerPropertyOrder, key => key
        );
        for (const key of materialized.keys) {
            materialized.values[key] = sortByPreferredOrder(
                [...new Set([...(materialized.values[key] || []), ...this.propertyCatalogValues(key).map(propertyValueKey)])],
                this.settings.pickerPropertyValueOrder?.[key] || [], value => value
            );
        }
        return materialized;
    },


    _mutatePropertyFilterPoolEntries(mutator) {
        if (typeof mutator !== "function") return;
        this.settings.filterPools = normalizeFilterPools(
            this.settings.filterPools
        ).map(pool => {
            if (pool.kind !== "property") return pool;
            const entries = normalizePropertyPoolEntries(pool.propertyEntries);
            mutator(entries);
            return { ...pool, propertyEntries: entries };
        });
    },


    async migrateVaultTagTreePrefix(oldPrefix, newPrefix, {
        removeTree = false, mergeExisting = false
    } = {}) {
        const source = normalizeTagValue(oldPrefix);
        const target = normalizeTagValue(newPrefix);
        if (!source || (!removeTree && !target)) throw new Error("标签路径无效");
        if (!removeTree && tagIdentityKey(source) === tagIdentityKey(target)) return false;
        if (
            !removeTree
            && tagIdentityKey(target).startsWith(tagIdentityKey(source) + "/")
        ) {
            throw new Error("不能把标签移入自身或其子标签");
        }

        const sourceKey = tagIdentityKey(source);
        const targetKey = tagIdentityKey(target);
        const pickerOrderBefore = this._materializeTagPickerOrder();

        // 标签层级迁移是 Vault 级真实数据操作，不能只依赖搜索索引。
        // 即使某些文件被搜索插件排除，也必须与真实标签层级保持一致。
        const filesInScope = this.app.vault.getFiles().filter(file => file instanceof TFile
            && (file.extension.toLowerCase() === "md" || !this.isPathExcluded(file.path)));
        const fileTags = new Map();
        const allTags = new Set();
        for (const file of filesInScope) {
            const properties = await this._readFileProperties(file);
            const inline = file.extension.toLowerCase() === "md"
                ? this.app.metadataCache.getFileCache(file)?.tags?.map(entry => entry.tag) || [] : [];
            const raw = properties.tags;
            const tags = normalizeUniqueTagList([...(Array.isArray(raw) ? raw : raw == null ? [] : [raw]), ...inline]);
            fileTags.set(file.path, tags);
            for (const tag of tags) allTags.add(tagIdentityKey(tag));
        }
        if (!removeTree && !mergeExisting) {
            for (const key of allTags) {
                if (key !== targetKey && !key.startsWith(targetKey + "/")) continue;
                if (key === sourceKey || key.startsWith(sourceKey + "/")) continue;
                throw new Error(`目标标签层级已存在：${target}`);
            }
        }

        const files = filesInScope.filter(file =>
            (fileTags.get(file.path) || []).some(tag => {
                const key = tagIdentityKey(tag);
                return key === sourceKey || key.startsWith(sourceKey + "/");
            })
        );
        if (!files.length) return false;

        return this.fileOperations.withTargets(files, async () => {
            const touched = new Set();
            try {
                for (const file of files) {
                    this.fileOperations.assertCurrent(file);
                    const cache = this.app.metadataCache.getFileCache(file);
                    if (file.extension.toLowerCase() === "md"
                        && (cache?.tags || []).some(entry => this._tagPathMatchesPrefix(entry.tag, source))) {
                        const original = await this.app.vault.read(file);
                        const inlineNext = this._rewriteInlineTagPositions(
                            original, cache, source, target, { removeTree }
                        );
                        if (inlineNext !== original) {
                            await this.app.vault.process(file, current => {
                                this.fileOperations.assertCurrent(file);
                                if (current !== original) throw new Error("正文已被其它操作修改，未覆盖新内容");
                                return inlineNext;
                            });
                            touched.add(file);
                        }
                    }
                    const status = await this.batchMetadataService._editFrontmatter(file, fm => {
                        const raw = fm.tags;
                        const before = this.batchMetadataService._frontmatterTagList(raw);
                        const after = normalizeUniqueTagList(removeTree
                            ? before.filter(tag => !this._tagPathMatchesPrefix(tag, source))
                            : before.map(tag => this._remapTagPath(tag, source, target)));
                        if (JSON.stringify(before) === JSON.stringify(after)) return "unchanged";
                        if (!after.length) delete fm.tags;
                        else fm.tags = Array.isArray(raw) || after.length > 1 ? after : after[0];
                        return "changed";
                    });
                    if (status === "changed") touched.add(file);
                }
            } catch (error) {
                // 多文件没有宿主原子事务。失败时停止并回读真实数据；禁止用旧整篇快照回滚，
                // 否则可能抹掉用户在操作期间输入的新正文或其它元数据。
                if (!this._unloaded) {
                    try { await this.fullRebuildMetaCache(); }
                    catch (refreshError) { console.error("标签处理停止后的索引回读失败", refreshError); }
                }
                throw new Error(`标签处理已停止，已确认修改 ${touched.size} 个文件；未用旧快照回滚。${error?.message || error}`);
            }

            this.settings.pickerTagOrder = removeTree
                ? normalizeUniqueStringList(
                    pickerOrderBefore.filter(path =>
                        !this._tagPathMatchesPrefix(path, source)
                    )
                )
                : remapPreferredPathOrder(
                    pickerOrderBefore,
                    source,
                    target
                );
            this.settings.filterPools = remapFilterPoolStoredKeys(
                this.settings.filterPools,
                "tag",
                key => {
                    if (removeTree) {
                        return this._tagPathMatchesPrefix(key, source) ? "" : key;
                    }
                    if (key === sourceKey) return targetKey;
                    if (key.startsWith(sourceKey + "/")) {
                        return targetKey + key.slice(sourceKey.length);
                    }
                    return key;
                }
            );
            const createMemory = normalizeCreateMetadataMemory(
                this.settings.createMetadataMemory
            );
            for (const type of CREATE_TYPE_IDS) {
                createMemory[type].tags = normalizeFilterTagSelection(
                    createMemory[type].tags.flatMap(tag => {
                        if (tag === NO_TAGS_FILTER_VALUE) return [];
                        if (removeTree && this._tagPathMatchesPrefix(tag, source)) return [];
                        return [this._remapTagPath(tag, source, target)];
                    })
                ).filter(tag => tag !== NO_TAGS_FILTER_VALUE);
            }
            this.settings.createMetadataMemory = createMemory;
            await this._flushIndexQueueNow();
            this._refreshFilterPoolCores();

            this._transformSearchFilters(state => {
                state.tags = new Set(normalizeFilterTagSelection([...state.tags].flatMap(tag => {
                    if (tag === NO_TAGS_FILTER_VALUE) return [tag];
                    if (removeTree && this._tagPathMatchesPrefix(tag, source)) return [];
                    return [this._remapTagPath(tag, source, target)];
                })));
            });
            remapNavigatorCustomization(this.settings, { kind: "tag", from: source, to: removeTree ? null : target });
            await this.saveSettings();
            return true;
        });
    },


    async deleteVaultTagTreePrefix(prefix) {
        return this.migrateVaultTagTreePrefix(prefix, "", {
            removeTree: true
        });
    },
};

