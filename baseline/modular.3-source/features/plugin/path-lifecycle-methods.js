// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { remapFilterPoolStoredKeys, remapPreferredPathOrder } from "../../utils/preferred-order.js";
import { isSameOrDescendantVaultPath } from "../../utils/vault-paths.js";
import { CREATE_TYPE_IDS, normalizeCreateMetadataMemory } from "../create/create-model.js";
import { FilterState } from "../filters/filter-state.js";
import { normalizeExcludedFolders } from "../folders/exclusions.js";
import { normalizeResultFolderColors } from "../folders/folder-colors.js";
import { remapNavigatorCustomization } from "../navigator/customization-model.js";
import { Notice, TFile, TFolder } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_path_lifecycle_methods = {


    _replacePathPrefix(path, oldPath, newPath, { descendants = false } = {}) {
        if (!path || !oldPath || !newPath) return path;
        if (path === oldPath) return newPath;
        if (descendants && path.startsWith(oldPath + "/")) {
            return newPath + path.slice(oldPath.length);
        }
        return path;
    },


    _migrateCorePathState(oldPath, newPath, { descendants = false } = {}) {
        const remapSet = source => {
            if (!source?.size) return source;
            return new Set([...source].map(path =>
                this._replacePathPrefix(path, oldPath, newPath, { descendants })
            ));
        };

        this._forEachActiveSearchCore(core => {
            core.selection?.remapPathState(oldPath, newPath, { descendants });
            core.createFlow?.remapTemplatePaths?.(oldPath, newPath, { descendants });
            core.loadedPaths = remapSet(core.loadedPaths);

            const remapRows = rows => {
                if (!Array.isArray(rows) || !rows.length) return rows;
                return rows.map(row => {
                    if (!row?.path) return row;
                    const path = this._replacePathPrefix(
                        row.path,
                        oldPath,
                        newPath,
                        { descendants }
                    );
                    return path === row.path ? row : { ...row, path };
                });
            };
            core.fullResults = remapRows(core.fullResults);
            core.renderedResults = remapRows(core.renderedResults);

            if (core.resultsContainer?.isConnected) {
                for (const item of core.resultsContainer.querySelectorAll(
                    '.local-search-item[data-path]'
                )) {
                    const path = item.dataset.path || "";
                    const nextPath = this._replacePathPrefix(
                        path,
                        oldPath,
                        newPath,
                        { descendants }
                    );
                    if (nextPath !== path) item.dataset.path = nextPath;
                }
            }

            let folderStateChanged = false;
            if (descendants) {
                for (const state of this._activeCoreFilterStates(core)) {
                    if (!state.folders?.size) continue;
                    const before = [...state.folders];
                    const next = new Set(
                        before.map(folder =>
                            this._replacePathPrefix(
                                folder,
                                oldPath,
                                newPath,
                                { descendants: true }
                            )
                        )
                    );
                    if (JSON.stringify([...next]) !== JSON.stringify(before)) {
                        state.folders = next;
                        folderStateChanged = true;
                    }
                }
            }
            if (folderStateChanged) {
                core.facets?.syncFilterButtons?.();
                if (core.createFlow?.isCreateView?.()) {
                    core.createFlow._refreshCreatePreview?.({ refreshPools: true });
                    core._syncResultStateRow?.();
                }
            }
            core._notifyStateChange();
        });
    },


    _transformSearchFilters(transform, { includeLive = true } = {}) {
        if (typeof transform !== "function") return false;
        if (includeLive) this._forEachActiveSearchCore(core => {
            let changed = false;
            for (const state of this._activeCoreFilterStates(core)) {
                const before = JSON.stringify(state.toSnapshot());
                transform(state);
                changed ||= JSON.stringify(state.toSnapshot()) !== before;
            }
            if (changed) this._settleCoreFilterMutation(core);
        });
        let changed = false;
        const convert = (holder, key) => {
            if (!holder?.[key]) return false;
            const before = JSON.stringify(holder[key]);
            const state = FilterState.fromSnapshot(holder[key]);
            transform(state);
            const snapshot = state.toSnapshot();
            if (JSON.stringify(snapshot) === before) return false;
            holder[key] = snapshot;
            return true;
        };
        changed = convert(this.settings, "modalFilterSnapshot") || changed;
        const saved = new Set(Object.values(this.settings.createSessionRecovery || {})
            .map(value => value?.session).filter(Boolean));
        const sessions = new Set([...saved, ...[...this._closedSearchViewStates.values()]
            .map(value => value.session).filter(Boolean)]);
        for (const session of sessions) {
            // Search and creation snapshots are transformed independently; neither
            // can replace the other or publish draft metadata as search filters.
            const searchChanged = convert(session, "filterSnapshot");
            const draftChanged = convert(session.create, "filterSnapshot");
            if (searchChanged || draftChanged) {
                session.capturedAt = Date.now();
                changed ||= saved.has(session);
            }
        }
        return this.sharedSearchState.transformFilters(transform) || changed;
    },


    _remapStoredSearchPaths(remap, { folders = false } = {}) {
        const saved = new Set(Object.values(this.settings.createSessionRecovery || {}).map(value => value?.session).filter(Boolean));
        const sessions = new Set([...saved, ...[...this._closedSearchViewStates.values()].map(value => value.session).filter(Boolean)]);
        let persistedChanged = folders && this._transformSearchFilters(state => {
            state.folders = new Set(normalizeUniqueStringList([...state.folders].map(remap)));
        }, { includeLive: false });
        for (const session of sessions) {
            const before = JSON.stringify(session);
            const path = (holder, key) => {
                if (typeof holder?.[key] === "string") holder[key] = remap(holder[key]);
            };
            const paths = (holder, key) => {
                if (Array.isArray(holder?.[key])) holder[key] = normalizeUniqueStringList(holder[key].map(remap));
            };
            for (const template of Object.values(session.create?.templates || {})) {
                path(template, "path");
                if (!template.path) template.enabled = false;
            }
            paths(session.selection, "paths");
            path(session.selection, "anchorPath");
            path(session.viewportAnchor, "path");
            path(session.viewportAnchor, "fallbackPath");
            if (JSON.stringify(session) !== before) {
                session.capturedAt = Date.now();
                persistedChanged ||= saved.has(session);
            }
        }
        return persistedChanged;
    },


    _migrateRenameSettings(oldPath, newPath, {
        descendants = false,
        folderRename = false
    } = {}) {
        let changed = false;
        const remap = path => this._replacePathPrefix(
            path,
            oldPath,
            newPath,
            { descendants }
        );

        changed = this._remapStoredSearchPaths(remap, { folders: folderRename });
        const recentCurrent = this.settings.recentOpened || [];
        const recentNext = this._normalizeRecentOpened(
            recentCurrent.map(remap),
            { validateExists: false }
        );
        if (
            recentNext.length !== recentCurrent.length
            || recentNext.some((path, index) => path !== recentCurrent[index])
        ) {
            this.settings.recentOpened = recentNext;
            changed = true;
        }

        const createMemoryCurrent = normalizeCreateMetadataMemory(
            this.settings.createMetadataMemory
        );
        const createMemoryNext = JSON.parse(JSON.stringify(createMemoryCurrent));
        for (const type of CREATE_TYPE_IDS) {
            const currentPath = createMemoryNext[type].template.path || "";
            createMemoryNext[type].template.path = remap(currentPath);
            if (!createMemoryNext[type].template.path) {
                createMemoryNext[type].template.enabled = false;
            }
            if (folderRename) {
                const currentFolder = createMemoryNext[type].folder || "";
                createMemoryNext[type].folder = remap(currentFolder);
            }
        }
        if (JSON.stringify(createMemoryNext) !== JSON.stringify(createMemoryCurrent)) {
            this.settings.createMetadataMemory = normalizeCreateMetadataMemory(
                createMemoryNext
            );
            changed = true;
        }

        const favoriteTemplatesCurrent = normalizeUniqueStringList(
            this.settings.favoriteTemplatePaths
        );
        const favoriteTemplatesNext = normalizeUniqueStringList(
            favoriteTemplatesCurrent.map(remap)
        );
        if (
            favoriteTemplatesNext.length !== favoriteTemplatesCurrent.length
            || favoriteTemplatesNext.some((path, index) => path !== favoriteTemplatesCurrent[index])
        ) {
            this.settings.favoriteTemplatePaths = favoriteTemplatesNext;
            changed = true;
        }

        if (folderRename) {
            changed = remapNavigatorCustomization(this.settings, {
                kind: "folder", from: oldPath, to: newPath
            }) || changed;
            const order = remapPreferredPathOrder(this.settings.pickerFolderOrder, oldPath, newPath);
            const pools = remapFilterPoolStoredKeys(this.settings.filterPools, "folder", remap);
            for (const [key, next] of [["pickerFolderOrder", order], ["filterPools", pools]]) {
                if (JSON.stringify(this.settings[key]) !== JSON.stringify(next)) {
                    this.settings[key] = next;
                    changed = true;
                }
            }

            const excludedCurrent = this.settings.excludedFolders || [];
            const excludedNext = normalizeExcludedFolders(
                excludedCurrent.map(remap)
            );
            if (
                JSON.stringify(excludedNext)
                !== JSON.stringify(excludedCurrent)
            ) {
                this.settings.excludedFolders = excludedNext;
                changed = true;
            }

            const resultExcludedCurrent =
                this.settings.resultExcludedFolders || [];
            const resultExcludedNext = normalizeExcludedFolders(
                resultExcludedCurrent.map(remap)
            );
            if (
                JSON.stringify(resultExcludedNext)
                !== JSON.stringify(resultExcludedCurrent)
            ) {
                this.settings.resultExcludedFolders =
                    resultExcludedNext;
                changed = true;
            }

            const folderColorsCurrent =
                normalizeResultFolderColors(
                    this.settings.resultFolderColors
                );
            const folderColorsNext = {};

            for (const [path, config] of Object.entries(
                folderColorsCurrent
            )) {
                const nextPath = path === "/"
                    ? "/"
                    : remap(path);
                folderColorsNext[nextPath] = config;
            }

            if (
                JSON.stringify(folderColorsNext)
                !== JSON.stringify(folderColorsCurrent)
            ) {
                this.settings.resultFolderColors =
                    folderColorsNext;
                changed = true;
            }
        }

        return changed;
    },


    _settleRename(file, oldPath) {
        if (
            this._unloaded
            || !(file instanceof TFile || file instanceof TFolder)
            || !oldPath
            || !file.path
            || oldPath === file.path
        ) {
            return Promise.resolve(false);
        }

        const key = `${oldPath}→${file.path}`;
        const existing = this._renameSettles.get(key);
        if (existing) return existing;

        const settle = file instanceof TFolder
            ? this._handleFolderRename(file, oldPath)
            : this._handleFileRename(file, oldPath);
        const task = settle.then(() => true)
            .catch(error => {
                if (!this._unloaded) {
                    console.error(
                        `文件重命名后的索引同步失败：${oldPath} → ${file.path}`,
                        error
                    );
                }
                return false;
            })
            .finally(() => {
                if (this._renameSettles.get(key) === task) {
                    this._renameSettles.delete(key);
                }
            });

        this._renameSettles.set(key, task);
        return task;
    },


    _clearIndexPathPrefix(path) {
        if (!path) return;
        const paths = new Set([...this.fileMetaCache.keys(), ...this.bodyIndex.documents.keys(),
            ...this.globalContentCache.keys(), ...this._externalMetaProjectionCache.keys(), ...this._indexQueue]);
        for (const key of paths) if (isSameOrDescendantVaultPath(key, path)) {
            this._evictIndexedPath(key);
            this._indexQueue.delete(key);
        }
    },


    _handleFolderDelete(path) {
        if (this._unloaded || !path || path === "/") return false;
        const prefix = path + "/";

        this._clearIndexPathPrefix(path);
        this._removeContentTimePathPrefix(path);
        this._deleteNonMarkdownTimes(path, true);
        this._remapRecentOpenedHistory(path, "", true);

        const currentRecent = this.settings.recentOpened || [];
        const nextRecent = currentRecent.filter(
            item =>
                item !== path
                && !item.startsWith(prefix)
        );
        if (nextRecent.length !== currentRecent.length) {
            this.settings.recentOpened = nextRecent;
            this._throttleSaveActivity();
        }

        this._forEachActiveSearchCore(core => {
            core.selection?.removePathPrefix(path);
            core.loadedPaths = new Set(
                [...core.loadedPaths].filter(
                    item => item !== path && !item.startsWith(prefix)
                )
            );

            let folderFilterChanged = false;
            for (const state of this._activeCoreFilterStates(core)) {
                if (!state.folders?.size) continue;
                const beforeSize = state.folders.size;
                state.folders = new Set(
                    [...state.folders].filter(folder =>
                        folder !== path && !folder.startsWith(prefix)
                    )
                );
                if (state.folders.size !== beforeSize) folderFilterChanged = true;
            }
            core.createFlow?.remapTemplatePaths?.(
                path,
                "",
                { descendants: true }
            );
            if (folderFilterChanged) {
                this._settleCoreFilterMutation(core);
            }

            const removedPaths = core.fullResults
                .map(row => row.path)
                .filter(item => item === path || item.startsWith(prefix));
            core._queueResultIndexChanges(new Set(removedPaths), { refreshPools: true });
        });

        const resultExcludedCurrent =
            normalizeExcludedFolders(
                this.settings.resultExcludedFolders
            );
        const resultExcludedNext =
            resultExcludedCurrent.filter(
                folderPath =>
                    folderPath !== path
                    && !folderPath.startsWith(prefix)
            );
        const prune = value => isSameOrDescendantVaultPath(value, path) ? "" : value;
        let settingsChanged = this._remapStoredSearchPaths(prune, { folders: true });
        settingsChanged = remapNavigatorCustomization(this.settings, {
            kind: "folder", from: path, to: null
        }) || settingsChanged;
        const excluded = normalizeExcludedFolders((this.settings.excludedFolders || []).map(prune));
        const order = remapPreferredPathOrder(this.settings.pickerFolderOrder, path, "");
        const pools = remapFilterPoolStoredKeys(this.settings.filterPools, "folder", prune);
        for (const [key, next] of [
            ["excludedFolders", excluded], ["pickerFolderOrder", order], ["filterPools", pools]
        ]) {
            if (JSON.stringify(this.settings[key]) !== JSON.stringify(next)) {
                this.settings[key] = next;
                settingsChanged = true;
            }
        }

        const createMemoryCurrent = normalizeCreateMetadataMemory(
            this.settings.createMetadataMemory
        );
        const createMemoryNext = JSON.parse(JSON.stringify(createMemoryCurrent));
        for (const type of CREATE_TYPE_IDS) {
            const rememberedFolder = createMemoryNext[type].folder || "";
            if (
                rememberedFolder === path
                || rememberedFolder.startsWith(prefix)
            ) {
                createMemoryNext[type].folder = "";
            }
            const templatePath = createMemoryNext[type].template.path || "";
            if (templatePath === path || templatePath.startsWith(prefix)) {
                createMemoryNext[type].template = { enabled: false, path: "" };
            }
        }
        if (JSON.stringify(createMemoryNext) !== JSON.stringify(createMemoryCurrent)) {
            this.settings.createMetadataMemory = normalizeCreateMetadataMemory(
                createMemoryNext
            );
            settingsChanged = true;
        }
        const favoriteTemplatesCurrent = normalizeUniqueStringList(
            this.settings.favoriteTemplatePaths
        );
        const favoriteTemplatesNext = favoriteTemplatesCurrent.filter(
            templatePath => templatePath !== path && !templatePath.startsWith(prefix)
        );
        if (
            favoriteTemplatesNext.length !== favoriteTemplatesCurrent.length
        ) {
            this.settings.favoriteTemplatePaths = favoriteTemplatesNext;
            settingsChanged = true;
        }

        if (
            JSON.stringify(resultExcludedNext)
            !== JSON.stringify(resultExcludedCurrent)
        ) {
            this.settings.resultExcludedFolders =
                resultExcludedNext;
            settingsChanged = true;
        }

        const folderColorsCurrent =
            normalizeResultFolderColors(
                this.settings.resultFolderColors
            );
        const folderColorsNext = Object.fromEntries(
            Object.entries(folderColorsCurrent).filter(
                ([folderPath]) =>
                    folderPath !== path
                    && !folderPath.startsWith(prefix)
            )
        );

        if (
            JSON.stringify(folderColorsNext)
            !== JSON.stringify(folderColorsCurrent)
        ) {
            this.settings.resultFolderColors = folderColorsNext;
            settingsChanged = true;
        }

        if (settingsChanged) {
            void this.saveSettings().catch(error => {
                console.error("文件夹删除后的设置保存失败", error);
                new Notice("文件夹已删除，但相关设置保存失败");
            });
        }

        this._refreshFolderStateCores({ oldPath: path, newPath: "" });
        this._publishIndexChanges(null, { projectChanged: true });
        this.throttleSaveCache();
        return true;
    },


    async _handleFolderRename(folder, oldPath) {
        if (
            this._unloaded
            || !(folder instanceof TFolder)
            || !oldPath
            || !folder.path
            || oldPath === folder.path
        ) {
            return false;
        }

        const newPath = folder.path;
        const settingsChanged = this._migrateRenameSettings(
            oldPath,
            newPath,
            { descendants: true, folderRename: true }
        );
        this._migrateCorePathState(
            oldPath,
            newPath,
            { descendants: true }
        );
        this._migrateContentTimePath(
            oldPath,
            newPath,
            { descendants: true }
        );
        this._remapNonMarkdownTimes(oldPath, newPath, true);
        this._remapRecentOpenedHistory(oldPath, newPath, true);

        // 各缓存的数据域并不保证始终完全同构；
        // 文件夹路径结构变化时按前缀分别清理，不能只依赖 fileMetaCache 的 key 集合。
        this._clearIndexPathPrefix(oldPath);

        if (this._unloaded) return false;

        const pending = [folder];
        while (pending.length) {
            const item = pending.pop();
            if (item instanceof TFolder) pending.push(...item.children);
            else if (item instanceof TFile) this._indexQueue.add(item.path);
        }
        await this._flushIndexQueueNow();
        if (this._unloaded) return false;
        this._refreshFolderStateCores({ oldPath, newPath });
        this._publishIndexChanges(new Set([oldPath, newPath]), { projectChanged: true });
        this.throttleSaveCache();
        if (settingsChanged) await this.saveSettings();
        return true;
    },


    async _handleFileRename(file, oldPath) {
        if (this._unloaded) return;

        const newPath = file.path;
        if (!(file instanceof TFile) || !oldPath || !newPath || oldPath === newPath) return;
        if (this._isRemoteTimeSidecar(oldPath) || this._isRemoteTimeSidecar(newPath)) {
            void this._reloadTimeSidecars();
            return;
        }

        this.bodyIndex.moveFile(oldPath, newPath);
        this._evictIndexedPath(oldPath);
        this._indexQueue.delete(oldPath);
        this._indexQueue.delete(newPath);

        const settingsChanged = this._migrateRenameSettings(
            oldPath,
            newPath
        );
        this._migrateCorePathState(oldPath, newPath);
        this._migrateContentTimePath(oldPath, newPath);
        this._remapNonMarkdownTimes(oldPath, newPath);
        this._remapRecentOpenedHistory(oldPath, newPath);
        if (settingsChanged) void this.saveSettings();

        if (this.isPathExcluded(newPath)) {
            this._evictIndexedPath(newPath);
        } else {
            // 文件名本身参与 Excalidraw 类型识别；重命名后必须重新判定一次类型。
            // Excalidraw / Canvas 不会因此读取正文；普通 Markdown 才按原规则读取正文。
            await this._updateSingleFile(file);
        }

        if (this._unloaded) return;

        // 路径迁移与普通索引变化共用一个提交入口；交互期间仅合并旧/新路径。
        this._publishIndexChanges(new Set([oldPath, newPath]), { projectChanged: true });
        this.throttleSaveCache();
    },
};

