// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeMetadataPropertyType, validateEditablePropertyKey } from "../data/properties/property-types.js";
import { EMPTY_PROPERTY_VALUE, MISSING_PROPERTY_VALUE, PRESENT_PROPERTY_VALUE, flattenPropertyListStructure, frontmatterPropertyStateEqual, normalizePropertyValues, propertyValueDisplay, propertyValueKey, propertyValueSortRank, propertyValuesFromRaw, rawSampleForPropertyValue } from "../data/properties/property-values.js";
import { removeRawPropertyValues, renameRawPropertyValue } from "../data/properties/raw-mutations.js";
import { mergePropertyKeyValues } from "../data/properties/key-merge.js";
import { transferTextPropertyValue } from "../data/properties/cross-key-transfer.js";
import { normalizeUniqueTagList, tagIdentityKey } from "../data/tags/tag-values.js";
import { TFile } from "obsidian";


export const NO_FRONTMATTER_WRITE = Symbol("local-search-no-frontmatter-write");


export function assertVaultPropertyMutationSucceeded(stats, action) {
    if (!stats.failed && !stats.conflict) return;
    const parts = [`${action}未全部完成`, `本次已修改 ${stats.changed} 个文件`];
    if (stats.failed) parts.push(`失败 ${stats.failed} 个文件`);
    if (stats.conflict) parts.push(`冲突 ${stats.conflict} 个文件，目标属性已存在`);
    if (stats.firstError) parts.push(`${stats.firstError.path}：${stats.firstError.message}`);
    if (stats.firstConflict) parts.push(`冲突文件：${stats.firstConflict}`);
    throw new Error(parts.join("；") + "。已完成的修改保留，未覆盖冲突内容。");
}


export class BatchMetadataService {
    constructor(app, plugin) { this.app = app; this.plugin = plugin; }

    // All file types share the same metadata mutation target resolver.
    metadataFiles(paths = this.app.vault.getFiles().map(file => file.path)) {
        return [...new Set(paths)]
            .map(path => this.app.vault.getAbstractFileByPath(path))
            .filter(file => file instanceof TFile && !this.plugin.isPathExcluded(file.path));
    }


    _normalizeTagList(values) {
        return normalizeUniqueTagList(values);
    }

    _frontmatterTagList(rawValue) {
        const source = Array.isArray(rawValue)
            ? rawValue
            : (
                rawValue === undefined
                || rawValue === null
                || rawValue === ""
                    ? []
                    : [rawValue]
            );
        return this._normalizeTagList(source);
    }

    summarize(paths) {
        const files = this.metadataFiles(paths);
        const out = new Map();
        const excluded = new Set(this.plugin.settings.excludedKeys || []);

        // tags 是 Obsidian 的特殊 Frontmatter 属性；标签增删与普通属性分开统计。
        // 这里只统计 Frontmatter tags；正文 inline #tag 不进入这条 processFrontMatter 编辑链。
        const tagSummary = {
            present: 0,
            values: new Map()
        };

        const addValue = (row, rawValue, normalizedValue = null) => {
            const values = normalizedValue === null
                ? propertyValuesFromRaw(rawValue)
                : [normalizedValue];
            for (const value of values) {
                const id = propertyValueKey(value);
                const existing = row.values.get(id);
                const rawSample = rawSampleForPropertyValue(rawValue, value);
                row.values.set(id, {
                    value,
                    rawSample: existing?.rawSample ?? rawSample,
                    count: (existing?.count || 0) + 1
                });
            }
        };

        for (const file of files) {
            // 与搜索和属性目录共用已提交的原始属性索引；不读延迟的宿主缓存或虚拟投影。
            const fm = this.plugin.fileMetaCache.get(file.path)?.properties || {};

            const frontmatterTags = this._frontmatterTagList(fm.tags);
            if (frontmatterTags.length) tagSummary.present++;
            for (const tag of frontmatterTags) {
                const tagKey = tagIdentityKey(tag);
                const existing = tagSummary.values.get(tagKey);
                tagSummary.values.set(tagKey, {
                    value: existing?.value || tag,
                    count: (existing?.count || 0) + 1
                });
            }

            for (const [key, rawValue] of Object.entries(fm)) {
                if (key === "position" || key === "tags" || excluded.has(key)) continue;
                if (!out.has(key)) out.set(key, { key, present: 0, values: new Map(), rawSample: rawValue });
                const row = out.get(key);
                row.present++;
                if (row.rawSample === undefined) row.rawSample = rawValue;
                addValue(row, rawValue);
            }
        }

        // 特殊状态是统一值模型的一部分：
        // [没有此属性]、[有属性但无值] 固定排在真实值之前，
        // 让批量增删时优先识别异常 / 待补全状态。
        for (const row of out.values()) {
            const missing = files.length - row.present;
            if (missing > 0) {
                row.values.set(propertyValueKey(MISSING_PROPERTY_VALUE), {
                    value: MISSING_PROPERTY_VALUE,
                    rawSample: undefined,
                    count: missing
                });
            }

            row.values = new Map(
                [...row.values.entries()].sort(([, a], [, b]) =>
                    (
                        propertyValueSortRank(a.value)
                        - propertyValueSortRank(b.value)
                    )
                    || propertyValueDisplay(a.value).localeCompare(
                        propertyValueDisplay(b.value),
                        "zh-Hans-CN",
                        { numeric: true }
                    )
                )
            );
        }

        return {
            files,
            tags: {
                present: tagSummary.present,
                values: [...tagSummary.values.values()].sort((a, b) =>
                    a.value.localeCompare(
                        b.value,
                        "zh-Hans-CN",
                        { numeric: true }
                    )
                )
            },
            rows: [...out.values()].sort((a, b) =>
                a.key.localeCompare(b.key, "zh-Hans-CN")
            )
        };
    }
    _mutateFiles(paths, operation) {
        if (!Array.isArray(paths) || paths.some(path => typeof path !== "string" || !path.trim())) {
            throw new Error("属性操作需要有效文件路径列表");
        }
        const unique = [...new Set(paths)];
        const files = this.metadataFiles(unique);
        return this.plugin.fileOperations.withTargets(files, async () => {
            const stats = await this._applyMutation(files, operation);
            stats.failed += unique.length - files.length;
            return stats;
        });
    }

    async _editFrontmatter(file, transform) {
        let outcome = "unchanged";
        if (file.extension.toLowerCase() !== "md") {
            outcome = await this.plugin._editNonMarkdownProperties(file, transform);
        } else {
            try {
                await this.plugin._editMarkdownFrontmatter(file, data => {
                    this.plugin.fileOperations.assertCurrent(file);
                    outcome = transform(data);
                    // Host 的原子回调抛出时不会写盘；真实 no-op / 冲突不重排 YAML、不改 mtime。
                    if (outcome !== "changed") throw NO_FRONTMATTER_WRITE;
                });
            } catch (error) {
                if (error !== NO_FRONTMATTER_WRITE) throw error;
            }
        }
        // 索引直接回读文件；所有属性写入共用这一出口，不再等待 MetadataCache.changed。
        if (outcome === "changed") this.plugin._queueFileIndex(file.path);
        return outcome;
    }

    async _applyMutation(files, operation) {
        const stats = { failed: 0, conflict: 0, changed: 0, unchanged: 0 };
        for (const file of files) {
            try {
                this.plugin.fileOperations.assertCurrent(file);
                const result = await operation(file);
                const status = typeof result === "string"
                    ? result : String(result?.status || "unchanged");
                const conflicts = typeof result === "object" && result
                    ? Math.max(0, Number(result.conflict) || 0)
                    : (status === "conflict" ? 1 : 0);
                stats.conflict += conflicts;
                if (conflicts && !stats.firstConflict) stats.firstConflict = file.path;
                if (status === "failed") stats.failed++;
                else if (status === "changed") stats.changed++;
                else if (status !== "conflict") stats.unchanged++;
            } catch (error) {
                stats.failed++;
                stats.firstError ||= { path: file.path, message: error?.message || String(error) };
            }
        }
        // 正式写入后的回读/发布只有这一出口；部分成功也必须发布实际结果。
        if (stats.changed) await this.plugin._flushIndexQueueNow();
        return stats;
    }

    transformValue(paths, key, transform) {
        key = validateEditablePropertyKey(key);
        return this._mutateFiles(paths, file =>
            this._editFrontmatter(file, data => {
                const beforePresent = Object.prototype.hasOwnProperty.call(data, key);
                const before = data[key];
                const after = transform(before);
                const afterPresent = after !== undefined;
                if (frontmatterPropertyStateEqual(beforePresent, before, afterPresent, after)) {
                    return "unchanged";
                }
                if (!afterPresent) delete data[key];
                else data[key] = after;
                return "changed";
            })
        );
    }

    applyMetadataDraft(paths, {
        addTags = [],
        removeTags = [],
        properties = []
    } = {}) {
        const wantedAddTags = this._normalizeTagList(addTags);
        const wantedRemoveTagKeys = new Set(
            this._normalizeTagList(removeTags).map(tagIdentityKey)
        );
        const propertyOps = (Array.isArray(properties) ? properties : [])
            .map(operation => {
                const key = validateEditablePropertyKey(operation?.key);
                return {
                    key,
                    propertyType: normalizeMetadataPropertyType(operation?.propertyType),
                    isNewKey: Boolean(operation?.isNewKey),
                    removeValues: Array.isArray(operation?.removeValues)
                        ? operation.removeValues
                        : [],
                    addValues: Array.isArray(operation?.addValues)
                        ? operation.addValues
                        : []
                };
            })
            .filter(Boolean);

        const createdPropertyKeys = new Set();
        const valueKeySet = values => new Set(
            (Array.isArray(values) ? values : [])
                .filter(value => value !== MISSING_PROPERTY_VALUE)
                .map(propertyValueKey)
        );
        const normalizeAddSamples = values => {
            const result = [];
            const seen = new Set();
            for (const raw of Array.isArray(values) ? values : []) {
                for (const normalized of normalizePropertyValues(raw)) {
                    if (
                        normalized === MISSING_PROPERTY_VALUE
                        || normalized === PRESENT_PROPERTY_VALUE
                        || normalized === EMPTY_PROPERTY_VALUE
                    ) continue;
                    const id = propertyValueKey(normalized);
                    if (seen.has(id)) continue;
                    const sample = rawSampleForPropertyValue(raw, normalized);
                    if (sample === undefined) continue;
                    seen.add(id);
                    result.push(sample);
                }
            }
            return result;
        };
        const addPropertyValues = (current, addSamples, propertyType) => {
            if (!addSamples.length) return current;
            const listType = propertyType === "multitext" || Array.isArray(current);
            if (current === undefined) {
                return listType ? [...addSamples] : addSamples[0];
            }
            if (!listType) return current;

            const next = flattenPropertyListStructure(current);
            const existing = new Set(
                next.flatMap(item => normalizePropertyValues(item))
                    .map(propertyValueKey)
            );
            let changed = false;
            for (const sample of addSamples) {
                const normalized = normalizePropertyValues(sample)[0];
                if (normalized === undefined) continue;
                const id = propertyValueKey(normalized);
                if (existing.has(id)) continue;
                existing.add(id);
                next.push(sample);
                changed = true;
            }
            return changed ? next : current;
        };
        const equalValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

        const inspect = frontmatter => {
            const draft = { ...frontmatter };
            const rawTags = draft.tags;
            const beforeTags = this._frontmatterTagList(rawTags);
            const afterTags = beforeTags.filter(tag => !wantedRemoveTagKeys.has(tagIdentityKey(tag)));
            const tagKeys = new Set(afterTags.map(tagIdentityKey));
            for (const tag of wantedAddTags) {
                if (!tagKeys.has(tagIdentityKey(tag))) { afterTags.push(tag); tagKeys.add(tagIdentityKey(tag)); }
            }
            if (JSON.stringify(beforeTags) !== JSON.stringify(afterTags)) {
                if (!afterTags.length) delete draft.tags;
                else draft.tags = Array.isArray(rawTags) || afterTags.length > 1 ? afterTags : afterTags[0];
            }
            for (const operation of propertyOps) {
                const next = addPropertyValues(
                    removeRawPropertyValues(draft[operation.key], valueKeySet(operation.removeValues)),
                    normalizeAddSamples(operation.addValues), operation.propertyType);
                if (next === undefined) delete draft[operation.key];
                else draft[operation.key] = next;
            }
            return [...new Set(["tags", ...propertyOps.map(operation => operation.key)])].flatMap(key => {
                const before = Object.prototype.hasOwnProperty.call(frontmatter, key);
                const present = Object.prototype.hasOwnProperty.call(draft, key);
                return before === present && equalValue(frontmatter[key], draft[key]) ? []
                    : [{ key, present, value: draft[key], created: !before && present
                        && propertyOps.some(operation => operation.key === key && operation.isNewKey) }];
            });
        };

        return this._mutateFiles(paths, async file => {
            let updates = [];
            const status = await this._editFrontmatter(file, data => {
                updates = inspect(data);
                if (!updates.length) return "unchanged";
                for (const update of updates) {
                    if (!update.present) delete data[update.key];
                    else data[update.key] = update.value;
                }
                return "changed";
            });
            if (status === "changed") for (const update of updates) {
                if (update.created) createdPropertyKeys.add(update.key);
            }
            return status;
        }
        ).then(stats => {
            stats.createdPropertyKeys = [...createdPropertyKeys];
            return stats;
        });
    }

    async moveValueToKey(paths, sourceKey, sourceValue, targetKey, sourceType, targetType) {
        const source = validateEditablePropertyKey(sourceKey);
        const target = validateEditablePropertyKey(targetKey);
        if (source === target) return { changed: 0, unchanged: 0, failed: 0, conflict: 0 };
        const files = this.metadataFiles(paths);
        return this.plugin.fileOperations.withTargets(files, async () => {
            // One vault-wide preflight before the first write. A conflicting
            // destination anywhere blocks the whole operation, not just one note.
            let affected = 0;
            for (const file of files) {
                this.plugin.fileOperations.assertCurrent(file);
                const raw = await this.plugin._readFileProperties(file);
                try {
                    if (transferTextPropertyValue(raw || {}, source, sourceValue, target, sourceType, targetType).changed) affected++;
                } catch (error) {
                    throw new Error(`${file.path}：${error?.message || error}；尚未修改任何文件`);
                }
            }
            if (!affected) return { changed: 0, unchanged: files.length, failed: 0, conflict: 0 };
            // Every file is checked again against its *current* YAML in the
            // editor transaction. Never write a stale preflight snapshot.
            return this._applyMutation(files, file => this._editFrontmatter(file, fm => {
                const next = transferTextPropertyValue(fm, source, sourceValue, target, sourceType, targetType);
                if (!next.changed) return 'unchanged';
                if (next.nextSource === undefined) delete fm[source];
                else fm[source] = next.nextSource;
                fm[target] = next.nextTarget;
                return 'changed';
            }));
        });
    }

    migrateValue(paths, key, normalizedOldValue, newValue, propertyType = "text") {
        return this.transformValue(paths, key, current =>
            renameRawPropertyValue(
                current,
                normalizedOldValue,
                newValue,
                propertyType
            )
        );
    }

    renameKey(paths, oldKey, newKey, completed = null, { mergeExisting = false, propertyType = "text" } = {}) {
        oldKey = validateEditablePropertyKey(oldKey);
        newKey = validateEditablePropertyKey(newKey);
        return this._mutateFiles(paths, async file => {
            let renamedValue;
            const status = await this._editFrontmatter(file, data => {
                if (!Object.prototype.hasOwnProperty.call(data, oldKey) || oldKey === newKey) {
                    return "unchanged";
                }
                const present = Object.prototype.hasOwnProperty.call(data, newKey);
                if (present && !mergeExisting) return "conflict";
                data[newKey] = present
                    ? mergePropertyKeyValues(data[newKey], data[oldKey], propertyType)
                    : data[oldKey];
                renamedValue = JSON.stringify(data[newKey]);
                delete data[oldKey];
                return "changed";
            });
            // 仅记录本次真正提交的文件和值；重试凭据归发起弹窗，不持久化为元数据。
            if (status === "changed") completed?.set(file, renamedValue);
            return status;
        });
    }
}
