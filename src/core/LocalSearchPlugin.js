// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { BodyIndex } from "../data/index/BodyIndex.js";
import { CREATE_TYPE_IDS, normalizeCreateMetadataMemory } from "../features/create/create-model.js";
import { LocalSearchPlugin_content_cache_methods } from "../features/plugin/content-cache-methods.js";
import { LocalSearchPlugin_external_properties_methods } from "../features/plugin/external-properties-methods.js";
import { LocalSearchPlugin_external_search_methods } from "../features/plugin/external-search-methods.js";
import { LocalSearchPlugin_file_command_actions_methods } from "../features/plugin/file-command-actions-methods.js";
import { LocalSearchPlugin_file_index_methods } from "../features/plugin/file-index-methods.js";
import { LocalSearchPlugin_index_queue_methods } from "../features/plugin/index-queue-methods.js";
import { LocalSearchPlugin_index_storage_methods } from "../features/plugin/index-storage-methods.js";
import { LocalSearchPlugin_markdown_write_tracking_methods } from "../features/plugin/markdown-write-tracking-methods.js";
import { LocalSearchPlugin_metadata_directory_methods } from "../features/plugin/metadata-directory-methods.js";
import { LocalSearchPlugin_non_markdown_metadata_methods } from "../features/plugin/non-markdown-metadata-methods.js";
import { LocalSearchPlugin_notifications_methods } from "../features/plugin/notifications-methods.js";
import { LocalSearchPlugin_path_lifecycle_methods } from "../features/plugin/path-lifecycle-methods.js";
import { LocalSearchPlugin_property_catalog_methods } from "../features/plugin/property-catalog-methods.js";
import { LocalSearchPlugin_property_maintenance_methods } from "../features/plugin/property-maintenance-methods.js";
import { LocalSearchPlugin_recent_history_state_methods, LocalSearchPlugin_recent_history_storage_methods } from "../features/plugin/recent-history-state-methods.js";
import { LocalSearchPlugin_search_history_methods } from "../features/plugin/search-history-methods.js";
import { LocalSearchPlugin_settings_storage_methods } from "../features/plugin/settings-storage-methods.js";
import { LocalSearchPlugin_time_cache_methods } from "../features/plugin/time-cache-methods.js";
import { LocalSearchPlugin_tree_maintenance_methods } from "../features/plugin/tree-maintenance-methods.js";
import { LocalSearchPlugin_view_preferences_methods } from "../features/plugin/view-preferences-methods.js";
import { LocalSearchPlugin_workspace_entry_methods } from "../features/plugin/workspace-entry-methods.js";
import { EXTERNAL_SEARCH_API_CAPABILITIES, EXTERNAL_SEARCH_API_VERSION } from "../integrations/public-contract.js";
import { installPluginHoverHintSuppression } from "../interactions/hover-hints.js";
import { LocalSearchSwipeBackPrimitive } from "../interactions/swipe-back.js";
import { BatchMetadataService } from "../services/BatchMetadataService.js";
import { FileOperationService } from "../services/FileOperationService.js";
import { mountMobileFrame } from "../ui/mobile/mobile-frame.js";
import { LocalSearchSettingTab } from "../ui/settings/LocalSearchSettingTab.js";
import { SearchView } from "../ui/views/SearchView.js";
import { normalizeUniqueStringList } from "../utils/normalization.js";
import { SharedSearchStateCoordinator } from "./SharedSearchStateCoordinator.js";
import { composeClassMethods } from "./compose-class-methods.js";
import { TAB_VIEW_TYPE, VIEW_TYPE } from "./view-types.js";
import { Notice, Plugin, TFile, TFolder } from "obsidian";


// 主插件类
export class LocalSearchPlugin extends Plugin {

    constructor() {
        super(...arguments);
        this.fileMetaCache = new Map();
        this._residentSearchResults = new Map();
        this._residentSearchResultRows = 0;
        // Dynamic projection only: never stored in index-cache, YAML or GLS data.json.
        this._externalPropertyProviders = new Map();
        this._externalMetaProjectionCache = new Map();
        this._externalFolderPickers = new Set();
        this._externalPropertyPickers = new Set();
        this.searchSession = null;
        this.bodyIndex = null;
        this._indexBuildPromise = null;
        this._indexCacheRestored = false;
        this._initialIndexReady = false;
        this._indexQueue = new Set();
        // Bounded transient NAS/IO recovery; no secondary source of index data.
        this._indexRetryAttempts = new Map();
        this._indexRetryPending = new Set();
        this._indexRetryTimer = null;
        this._indexFlushPromise = null;
        this._indexRefreshTimer = null;
        this._persistTimer = null;
        this._activitySaveTimer = null;
        this._contentTimePersistTimer = null;
        this._contentTimePersistDirty = false;
        this._persistWriteChain = Promise.resolve();
        this._indexCacheSaveGeneration = 0; // transient cancellation only; never serialized
        this._settingsWriteChain = Promise.resolve();
        this._contentTimeWriteChain = Promise.resolve();
        this._metadataHistoryWriteChain = Promise.resolve();
        this._metadataHistorySaveTimer = null;
        this._recentOpenedSaveWarned = false;
        this._recentOpenedLocal = [];
        this._recentOpenedHistory = [];
        this._timeHistorySubscribers = new Set();
        this._indexChangeSubscribers = new Set();
        this._sidecarReloadPromise = null;
        this._sidecarReloadPending = false;
        this._nonMarkdownLocal = new Map();
        this._nonMarkdownRecords = new Map();
        this._nonMarkdownSaveTimer = null;
        this._nonMarkdownWriteChain = Promise.resolve();
        this._ownedFileCreations = new Map();
        this._metadataDirectorySafe = true;
        this._markdownStampTasks = new Map();
        this._timeWriteDisposers = [];
        // Obsidian appId 优先：不同设备拥有独立文件，不争抢同一 NAS JSON。
        // 未提供 appId 时用进程级临时名避免覆盖（会增加历史分片，但不会冲突）。
        this._metadataWriterId = String(this.app?.appId || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`)
            .replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 72);
        this.contentTimeCache = new Map();
        this.globalContentCache = new Map();
        this.activeSearchCores = new Set();
        this.sharedSearchState = new SharedSearchStateCoordinator(this);
        this._embeddedSearchSessions = new Map();
        this._externalMobileFrames = new Set();
        this._workspaceOpenTasks = new Map();
        this._closedSearchViewStates = new Map();
        this._resultRowHeightByView = new Map();
        this._renameSettles = new Map();
        this._unloaded = false;
        this._recentOpenedTrackingReady = false;
        this.fileOperations = null;
        this._currentFileOperationOverlay = null;
        this._commandSelectionDeletePending = false;
        this._hoverHintObserver = null;
        this.swipeBack = new LocalSearchSwipeBackPrimitive();

        // 稳定公共边界：后续内部重构不得要求调用方理解 SearchCore / SearchWindowSession / Host。
        this.externalSearchApiVersion = EXTERNAL_SEARCH_API_VERSION;
        this.externalSearchApi = Object.freeze({
            version: EXTERNAL_SEARCH_API_VERSION,
            capabilities: EXTERNAL_SEARCH_API_CAPABILITIES,
            open: (request = {}) => this.openExternalSearch(request),
            mount: (host, request = {}) => this.mountExternalSearch(host, request),
            getRecentOpened: (limit = 100) => this.getRecentOpenedHistory(limit),
            subscribeRecentOpened: (listener) => this.subscribeRecentOpened(listener),
            getFileTime: (path) => this.getAuthoritativeFileTime(path),
            markOpened: (path) => this.markOpenedFromExternal(path),
            registerVirtualProperties: (provider) => this.registerVirtualProperties(provider),
            pickFolder: (request) => this.openExternalFolderPicker(request),
            editProperty: (request) => this.openExternalPropertyEditor(request),
            mountMobileFrame: (root, options) => {
                if (this._unloaded || !root?.isConnected) return null;
                const frame = mountMobileFrame(root, options, () => this._externalMobileFrames.delete(frame));
                if (frame) this._externalMobileFrames.add(frame);
                return frame;
            },
            moveFiles: (request) => this.moveExternalFiles(request),
            listIndexedFiles: () => this.getIndexedFiles(),
            getFileProperties: path => this.getIndexedFileProperties(path),
            getPropertyCatalog: () => this.getIndexedPropertyCatalog(),
            addPropertyValues: (operations) => this.addPropertyCatalogValues(operations),
            renamePropertyValue: ({ key, oldValue, newValue, propertyType = "multitext" }) =>
                this.renameVaultPropertyValue(key, oldValue, newValue, propertyType),
            deletePropertyValue: ({ key, value, propertyType = "multitext" }) =>
                this.deleteVaultPropertyValue(key, value, propertyType),
            patchProperties: (request) => this.patchExternalProperties(request),
            subscribeIndexChanges: (listener) => this.subscribeIndexChanges(listener)
        });
    }


    async onload() {
        this._unloaded = false;
        this._hoverHintObserver =
            installPluginHoverHintSuppression();

        await this.loadSettings();
        if (this._unloaded) return;
        try { await this._assertMetadataDirectoryDedicated(this._metadataDirectory()); }
        catch (error) {
            if (this._unloaded) return;
            this._metadataDirectorySafe = false;
            console.warn("GLS 元数据目录与普通文件冲突，已禁止向该目录写入，请修改设置", error);
            new Notice("GLS 元数据目录包含普通文件，请在设置中更换为专用目录");
        }
        if (this._unloaded) return;

        // 正式时间独立于“索引持久化”设置长期保存；索引快照只负责恢复搜索工作集。
        this._installTimeWriteCapture();
        await this.loadContentTimeCache();
        if (this._unloaded) return;
        await this.loadRecentOpenedHistory();
        if (this._unloaded) return;
        await this.loadNonMarkdownTimes();
        if (this._unloaded) return;

        this.fileOperations = new FileOperationService(this.app, this);
        this.bodyIndex = new BodyIndex(this.settings.contentSegmentMaxLen);
        this.batchMetadataService = new BatchMetadataService(this.app, this);
        this.app.workspace.trigger("gls:external-api-ready");
        this.addSettingTab(new LocalSearchSettingTab(this.app, this));

        for (const type of [VIEW_TYPE, TAB_VIEW_TYPE]) {
            this.registerView(type, leaf => new SearchView(leaf, this, type));
        }
        // Dida Master v1.1：样式环境只有一个插件级事件源。
        // Style Settings / Theme / Snippet 变化后，各活动 SearchCore 只比较真实结果几何；
        // 需要重建时复用同一 80ms Geometry Settle，不创建每实例 MutationObserver。
        this.registerEvent(this.app.workspace.on("css-change", () => {
            this._forEachActiveSearchCore(core => {
                core.resultRenderer?.handleStyleEnvironmentChange?.();
            });
        }));
        this.addCommand({
            id: "open-local-search-tab",
            name: "在标签页打开搜索",
            callback: () => this.activateView(TAB_VIEW_TYPE)
        });

        // 一级搜索入口是正式 Toggle：已打开只关闭，未打开才创建。
        // 外部 API 的会话替换继续走 _openSearchSession，不与用户 Toggle 混用；外部会话固定使用 Modal Host。
        this.addRibbonIcon("search", "本地笔记搜索", () => this.toggleSearchModal());
        this.addCommand({ id: "open-local-search", name: "打开本地笔记搜索", callback: () => this.toggleSearchModal() });
        this.addCommand({
            id: "move-current-file",
            name: "移动当前文件到…",
            callback: () => {
                const file = this.app.workspace.getActiveFile();
                if (!(file instanceof TFile)) {
                    new Notice("当前没有可移动的活动文件");
                    return;
                }
                this._openCurrentFileOperation("move", file);
            }
        });
        this.addCommand({
            id: "delete-current-file",
            name: "删除当前文件",
            callback: () => this._deleteFromCommand()
        });

        // 批量修改笔记属性
        this.addCommand({ id: "batch-edit-properties", name: "打开搜索以批量修改属性", callback: () => {
            this.openSearchModal();
        }});

        // 侧边栏搜索
        this.addCommand({ id: "open-local-search-sidebar", name: "打开 GLS 搜索侧边栏", callback: () => this.activateView() });

        // 搜索结果视图：保留原命令 id，避免用户已有快捷键失效。
        // 行为升级为“详细 → 标准 → 精简”循环切换。
        this.addCommand({
            id: "toggle-local-search-density",
            name: "切换搜索结果视图",
            callback: () => this.cycleActiveResultView()
        });

        // 布局就绪后才允许记录“最近打开”，隔离启动期 workspace / leaf 恢复事件。
        // 标志必须在任何 await 之前置位，避免索引构建耗时影响用户正常打开文件的记录。
        this.app.workspace.onLayoutReady(async () => {
            if (this._unloaded) return;
            this._recentOpenedTrackingReady = true;
            // 历史 Sidecar 在 onload 中预读，但文件存在性必须等布局与 Vault 恢复后再校验。
            // 同步完成后通知所有已订阅的工作台；不能启动时把旧历史误过滤为空。
            this._mergeRecentOpenedHistory();
            for (const type of [VIEW_TYPE, TAB_VIEW_TYPE]) this._enforceWorkspaceSingleton(type);
            try {

                this.globalContentCache.clear();
                const restored = await this.loadIndexCache();
                if (this._unloaded) return;

                if (restored) await this.fullRebuildMetaCache();
                else await this.buildMetaCache();
                if (this._unloaded) return;

                this._initialIndexReady = true;
                this._publishIndexChanges(new Set(), { refreshPools: false });
                // 缓存恢复和索引提交各自发布真实变化；不再额外全量重画所有宿主。
                const cleanedRecent = this._normalizeRecentOpened(this.settings.recentOpened || []);
                const currentRecent = this.settings.recentOpened || [];
                if (cleanedRecent.length !== currentRecent.length ||
                    cleanedRecent.some((p, i) => p !== currentRecent[i])) {
                    this.settings.recentOpened = cleanedRecent;
                    this._throttleSaveActivity();
                }
            } catch (error) {
                if (!this._unloaded) {
                    console.error("本地搜索索引初始化失败", error);
                }
            }
        });
        
        // MetadataCache.changed 仍接入同一队列，用于元数据异步重解析后的增量更新；
        // Vault create/modify 同时覆盖 Markdown，避免依赖该通知才能识别 YAML。
        this.registerEvent(this.app.metadataCache.on("changed", (file) => {
            if (this._unloaded) return;
            if (!(file instanceof TFile) || file.extension.toLowerCase() !== "md") return;
            this._queueFileIndex(file.path);
        }));

        this.registerEvent(this.app.vault.on("create", (file) => {
            if (this._unloaded || !(file instanceof TFile)) return;
            if (this._isRemoteTimeSidecar(file.path)) { void this._reloadTimeSidecars(); return; }
            if (this.isPathExcluded(file.path)) return;
            // create 也会在启动/同步时发出：只排入索引，不据此生成任何时间。
            // 新建 Markdown 也必须立即索引（滴答新建绑定笔记可能先于 MetadataCache.changed）。
            this._queueFileIndex(file.path);
            // 新同步来的路径可能已经有另一设备的访问历史；复用创建事件触发消费端刷新。
            if (this._recentOpenedHistory.some(item => item.path === file.path)) this._notifyRecentOpened();
        }));

        this.registerEvent(this.app.vault.on("modify", (file) => {
            if (this._unloaded) return;
            if (!(file instanceof TFile)) return;
            if (this._isRemoteTimeSidecar(file.path)) { void this._reloadTimeSidecars(); return; }
            // YAML-only edits and third-party MD writes use the same incremental queue.
            this._queueFileIndex(file.path);
        }));

        this.registerEvent(this.app.vault.on("delete", (file) => {
            if (this._unloaded) return;

            if (file instanceof TFolder) {
                this._handleFolderDelete(file.path);
                return;
            }
            if (!(file instanceof TFile)) return;
            if (this._isRemoteTimeSidecar(file.path)) { void this._reloadTimeSidecars(); return; }

            this._removeRecentOpenedPath(file.path);
            this._removeContentTimePath(file.path);
            this._deleteNonMarkdownTimes(file.path);
            this._ownedFileCreations.delete(file.path);
            this._forEachActiveSearchCore(core => {
                core.createFlow?.remapTemplatePaths?.(file.path, "");
            });
            const createMemoryCurrent = normalizeCreateMetadataMemory(
                this.settings.createMetadataMemory
            );
            const createMemoryNext = JSON.parse(JSON.stringify(createMemoryCurrent));
            let createSettingsChanged = this._remapStoredSearchPaths(value => value === file.path ? "" : value);
            for (const type of CREATE_TYPE_IDS) {
                if (createMemoryNext[type].template.path === file.path) {
                    createMemoryNext[type].template = { enabled: false, path: "" };
                    createSettingsChanged = true;
                }
            }
            const favoriteTemplates = normalizeUniqueStringList(
                this.settings.favoriteTemplatePaths
            );
            const nextFavorites = favoriteTemplates.filter(path => path !== file.path);
            if (nextFavorites.length !== favoriteTemplates.length) {
                this.settings.favoriteTemplatePaths = nextFavorites;
                createSettingsChanged = true;
            }
            if (createSettingsChanged) {
                this.settings.createMetadataMemory = normalizeCreateMetadataMemory(
                    createMemoryNext
                );
                void this.saveSettings();
            }
            this._queueFileIndex(file.path);
        }));

        // 重命名只迁移路径并重新判定文件类型；正文修改时间跟随路径迁移，不因重命名本身更新。
        this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
            if (this._unloaded) return;

            if (!(file instanceof TFile || file instanceof TFolder)) return;

            // 外部重命名与插件内部 rename/move 统一进入同一 settle 入口。
            void this._settleRename(file, oldPath);
        }));

        // 最近打开唯一入口：布局恢复完成后，Obsidian 正式发出的 file-open 即视为打开记录。
        // 不再使用 getActiveFile() 做同步瞬时校验，避免移动端 / Leaf 切换时事件先于 activeFile 更新而漏记。
        this.registerEvent(this.app.workspace.on("file-open", (file) => {
            if (this._unloaded) return;
            if (!(file instanceof TFile)) return;

            if (!this._recentOpenedTrackingReady) return;
            this._touchRecentOpened(file.path);
        }));
    }
    

    onunload() {
        // 卸载也是关闭路径：若主搜索仍打开，先冻结并排队保存当前完整视图。
        // 必须发生在 _unloaded=true 之前，否则 saveSettings() 会拒绝新写入。
        this.searchSession?._finalizeSearchSessionClose?.();
        let recoveryChanged = false;
        for (const core of this.activeSearchCores) recoveryChanged = core.checkpointCreateSession({ persist: false }) || recoveryChanged;
        if (recoveryChanged) void this.saveSettings();
        for (const type of [VIEW_TYPE, TAB_VIEW_TYPE]) {
            for (const leaf of this.app.workspace.getLeavesOfType(type)) {
                if (leaf.view instanceof SearchView && leaf.view.plugin === this) leaf.view.onClose();
            }
        }

        // 搜索记录 / 最近打开若仍在 2 秒活动防抖中，卸载前先冻结当前 settings 快照。
        // saveSettings() 会同步清掉 timer 并把快照放入唯一写链；随后再切断新任务。
        if (this._activitySaveTimer) void this.saveSettings();

        // 正式时间是独立长期状态；在切断新任务前冻结最后一份快照。
        this._flushContentTimeCacheSave();
        if (this._metadataHistorySaveTimer) void this.saveRecentOpenedHistory();
        if (this._nonMarkdownSaveTimer || this._nonMarkdownLocal.size) void this.saveNonMarkdownTimes();

        // 从这里开始切断所有未来异步 continuation。
        this._unloaded = true;
        this.app.workspace.trigger("gls:external-api-ready");
        for (const frame of [...this._externalMobileFrames]) frame.destroy();
        for (const dispose of this._timeWriteDisposers.splice(0)) dispose();
        this._recentOpenedTrackingReady = false;
        for (const picker of [...this._externalFolderPickers]) picker.close();
        this._externalFolderPickers.clear();
        for (const picker of [...this._externalPropertyPickers]) picker.close({ force: true });
        this._externalPropertyPickers.clear();
        this._externalPropertyProviders.clear();
        this._externalMetaProjectionCache.clear();

        this._hoverHintObserver?.disconnect();
        this._hoverHintObserver = null;
        this.swipeBack?.dispose();

        if (this.searchSession) this.searchSession.close();
        this.searchSession = null;
        for (const session of [...this._embeddedSearchSessions.values()]) session.destroy();
        this._embeddedSearchSessions.clear();

        if (this._currentFileOperationOverlay) this._currentFileOperationOverlay.close();
        this._currentFileOperationOverlay = null;

        for (const core of [...this.activeSearchCores]) {
            try {
                core?.destroy?.();
            } catch (error) {
                console.warn("SearchCore 卸载清理失败", error);
            }
        }

        clearTimeout(this._indexRefreshTimer);
        clearTimeout(this._indexRetryTimer);
        this._indexRetryTimer = null;
        this._indexRetryAttempts.clear();
        this._indexRetryPending.clear();
        clearTimeout(this._persistTimer);
        clearTimeout(this._activitySaveTimer);
        clearTimeout(this._contentTimePersistTimer);
        clearTimeout(this._metadataHistorySaveTimer);
        clearTimeout(this._nonMarkdownSaveTimer);
        this._nonMarkdownSaveTimer = null;
        this._metadataHistorySaveTimer = null;
        this._timeHistorySubscribers.clear();
        this._indexChangeSubscribers.clear();
        this._indexRefreshTimer = null;
        this._persistTimer = null;
        this._activitySaveTimer = null;
        this._contentTimePersistTimer = null;
        // onunload 同步清理，不启动无法 await 的缓存写入，避免与随后 clear() 竞争写出空缓存。
        this.fileMetaCache.clear();
        this._clearResidentSearchResults();
        this.bodyIndex?.clear(); // onload 早期失败时 bodyIndex 可能还是 null
        this._indexQueue.clear();
        this.contentTimeCache.clear();
        this._nonMarkdownLocal.clear();
        this._nonMarkdownRecords.clear();
        this._ownedFileCreations.clear();
        this._markdownStampTasks.clear();
        this.globalContentCache.clear();
        this.activeSearchCores.clear();
        this._workspaceOpenTasks.clear();
        this._closedSearchViewStates.clear();
        this._renameSettles.clear();
        this.sharedSearchState?.destroy();
    }
}

composeClassMethods(LocalSearchPlugin, [LocalSearchPlugin_tree_maintenance_methods, LocalSearchPlugin_property_maintenance_methods, LocalSearchPlugin_file_command_actions_methods, LocalSearchPlugin_workspace_entry_methods, LocalSearchPlugin_search_history_methods, LocalSearchPlugin_recent_history_state_methods, LocalSearchPlugin_path_lifecycle_methods, LocalSearchPlugin_notifications_methods, LocalSearchPlugin_property_catalog_methods, LocalSearchPlugin_index_queue_methods, LocalSearchPlugin_time_cache_methods, LocalSearchPlugin_metadata_directory_methods, LocalSearchPlugin_markdown_write_tracking_methods, LocalSearchPlugin_non_markdown_metadata_methods, LocalSearchPlugin_external_properties_methods, LocalSearchPlugin_recent_history_storage_methods, LocalSearchPlugin_content_cache_methods, LocalSearchPlugin_file_index_methods, LocalSearchPlugin_view_preferences_methods, LocalSearchPlugin_external_search_methods, LocalSearchPlugin_settings_storage_methods, LocalSearchPlugin_index_storage_methods], ["setPickerSiblingOrder","moveFolderTreeNode","_tagPathMatchesPrefix","_remapTagPath","_rewriteInlineTagPositions","_materializeTagPickerOrder","_materializePropertyPickerOrders","_mutatePropertyFilterPoolEntries","migrateVaultTagTreePrefix","deleteVaultTagTreePrefix","_withPropertyCatalogMutation","_propertyMaintenanceSettingsSnapshot","_invalidatePropertyCatalogViews","_savePropertyMaintenanceSettings","renameVaultPropertyKey","_renameVaultPropertyKey","deleteVaultPropertyKey","_deleteVaultPropertyKey","deleteVaultPropertyValue","_deleteVaultPropertyValue","moveVaultPropertyValueToKey","_moveVaultPropertyValueToKey","renameVaultPropertyValue","_renameVaultPropertyValue","_commandSearchSelectionCore","_deleteFromCommand","_openCurrentFileOperation","onload","_enforceWorkspaceSingleton","_latestCreateRecovery","activateView","_activateWorkspaceView","recoverSearchSession","rememberCreateSession","settleCreateSession","_normalizeSearchQueries","_normalizeSearchHistory","_normalizeFavoriteSearches","_sameSearchQuery","_setSearchHistory","_setFavoriteSearches","rememberModalSearchSession","recordSearchHistory","favoriteSearchQuery","unfavoriteSearchQuery","deleteSearchQuery","_normalizeRecentOpened","_setRecentOpened","_touchRecentOpened","_removeRecentOpenedPath","_remapRecentOpenedHistory","_replacePathPrefix","_migrateCorePathState","_transformSearchFilters","_remapStoredSearchPaths","_migrateRenameSettings","_settleRename","_clearIndexPathPrefix","_handleFolderDelete","_handleFolderRename","_handleFileRename","_throttleSaveActivity","_activeCoreFilterStates","_settleCoreFilterMutation","_forEachActiveSearchCore","_refreshSearchCoreResultCards","_refreshActiveResultCards","_refreshPickerOrderConsumers","_publishIndexChanges","_publishPropertyCatalogChanges","subscribeIndexChanges","_propertyValueCatalog","propertyCatalogType","propertyCatalogValues","hasPropertyCatalogValue","propertyCatalogKeys","addPropertyCatalogValues","_addPropertyCatalogValues","_remapPropertyValueCatalog","getIndexedFiles","getIndexedFileProperties","getIndexedPropertyCatalog","patchExternalProperties","_queueFileIndex","_flushIndexQueueNow","_flushIndexQueue","_readFileProperties","_setContentTimeEntry","_removeContentTimePath","_removeContentTimePathPrefix","_migrateContentTimePath","_markContentTimeCacheDirty","_flushContentTimeCacheSave","_pluginDirectory","_metadataDirectory","_metadataHistoryFilename","_metadataContentFilename","_metadataNonMarkdownFilename","_assertMetadataDirectoryDedicated","_ensureMetadataDirectory","_metadataSidecarFiles","changeMetadataDirectory","_markdownTimeFromFile","_markdownEditorViews","_editMarkdownFrontmatter","_scheduleMarkdownStamp","_timePayload","_recordFileWrite","_installTimeWriteCapture","_noteOwnedCreation","_timeRecordValid","_nonMarkdownPropertyRecord","_nonMarkdownProperties","_editNonMarkdownProperties","_reloadTimeSidecars","_isRemoteTimeSidecar","loadNonMarkdownTimes","_resolveNonMarkdownTimes","_scheduleNonMarkdownSave","saveNonMarkdownTimes","_remapNonMarkdownTimes","_deleteNonMarkdownTimes","registerVirtualProperties","isVirtualPropertyKey","_searchMeta","_invalidateVirtualProperties","openExternalFolderPicker","openExternalPropertyEditor","moveExternalFiles","markOpenedFromExternal","getAuthoritativeFileTime","subscribeRecentOpened","_notifyRecentOpened","getRecentOpenedHistory","_mergeRecentOpenedHistory","loadRecentOpenedHistory","_throttleSaveRecentOpenedHistory","saveRecentOpenedHistory","_writablePluginDirectory","saveContentTimeCache","loadContentTimeCache","getFileFullContent","_evictIndexedPath","throttleSaveCache","_updateSingleFile","isPathExcluded","isResultPathExcluded","isResultAttachmentTypeExcluded","buildMetaCache","_indexValidationStamp","_needsIndexRefresh","fullRebuildMetaCache","_captureActiveResultViewAnchors","_refreshActiveResultViewCores","_refreshFolderStateCores","setExcludedFolders","setResultExcludedFolders","setResultExcludedAttachmentTypes","_refreshFilterPoolCores","setFilterPoolSelectionMode","setFilterPools","_refreshResultSortCores","setResultSortPreferences","setActiveResultView","updateActiveResultViewConfig","resetActiveResultView","cycleActiveResultView","_normalizeExternalSearchRequest","_openSearchSession","_externalSearchOptions","openExternalSearch","mountExternalSearch","openSearchModal","toggleSearchModal","_normalizeSettingsInPlace","loadSettings","_queueSettingsSnapshot","saveSettings","_clearResidentSearchResults","_getResidentSearchSnapshot","_getResidentSearchResults","_rememberSearchResults","_rememberSearchSnapshot","saveIndexCache","loadIndexCache","onunload"]);

