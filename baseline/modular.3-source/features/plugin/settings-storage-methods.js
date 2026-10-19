// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { DEFAULT_SETTINGS } from "../../core/default-settings.js";
import { normalizeModalSearchQuery, normalizeModalViewportAnchor } from "../../core/session-values.js";
import { normalizeExcludedAttachmentTypes } from "../../data/formats/file-types.js";
import { normalizePropertyValueCatalog } from "../../data/properties/property-types.js";
import { GLS_METADATA_DEFAULT_DIRECTORY, normalizeGLSMetadataDirectory } from "../../data/time/time-values.js";
import { normalizeRecentIconIds } from "../../ui/pickers/icon-catalog.js";
import { normalizeIntegerSetting, normalizeStringListMap, normalizeUniqueStringList } from "../../utils/normalization.js";
import { normalizeVaultFolderPath } from "../../utils/vault-paths.js";
import { CREATE_TYPE_IDS, normalizeCreateMetadataMemory, normalizeCreateType } from "../create/create-model.js";
import { normalizeLegacyFilterPoolSnapshot } from "../filters/filter-state.js";
import { normalizeFilterPools } from "../filters/pool-config.js";
import { normalizeExcludedFolders } from "../folders/exclusions.js";
import { normalizeResultFolderColors } from "../folders/folder-colors.js";
import { normalizeNavigatorCustomization } from "../navigator/customization-model.js";
import { normalizeNavigatorTimeField, normalizeNavigatorToolbars, normalizeNavigatorVisibleSections } from "../navigator/toolbar-config.js";
import { DEFAULT_RESULT_VIEWS, normalizeResultViewId, normalizeResultViews } from "../results/view-config.js";
import { migrateLegacySortState, normalizeHiddenSortFields, normalizeSortDirection, normalizeSortField, normalizeSortFieldOrder } from "../sort/sort-model.js";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_settings_storage_methods = {


    // Settings 只有这一条正式规范化链：load / save / geometry / setting-tab 写入都复用。
    // 迁移只负责把旧字段转成当前 schema；进入 this.settings 后不再维护第二套 normalize。
    _normalizeSettingsInPlace() {
        const settings = this.settings;
        if (!settings) return;
        settings.propertyValueCatalog = normalizePropertyValueCatalog(settings.propertyValueCatalog);
        if (!settings.createSessionRecovery || typeof settings.createSessionRecovery !== "object" || Array.isArray(settings.createSessionRecovery)) {
            settings.createSessionRecovery = {};
        }

        settings.favoriteSearches = this._normalizeFavoriteSearches(
            settings.favoriteSearches
        );
        settings.searchHistory = this._normalizeSearchHistory(
            settings.searchHistory
        ).filter(query =>
            !settings.favoriteSearches.some(favorite =>
                this._sameSearchQuery(favorite, query)
            )
        );

        settings.excludedFolders = normalizeExcludedFolders(
            settings.excludedFolders
        );
        settings.resultExcludedFolders = normalizeExcludedFolders(
            settings.resultExcludedFolders
        );
        settings.resultExcludedAttachmentTypes = normalizeExcludedAttachmentTypes(
            settings.resultExcludedAttachmentTypes
        );
        settings.excludedKeys = normalizeUniqueStringList(
            settings.excludedKeys
        ).sort((a, b) =>
            a.localeCompare(b, "zh-Hans-CN", { numeric: true })
        );
        settings.hiddenResultPropertyKeys = normalizeUniqueStringList(
            settings.hiddenResultPropertyKeys
        );
        settings.favoriteTemplatePaths = normalizeUniqueStringList(
            settings.favoriteTemplatePaths
        );
        settings.resultFolderColors = normalizeResultFolderColors(
            settings.resultFolderColors
        );

        settings.createLastType = normalizeCreateType(
            settings.createLastType,
            "md"
        );
        settings.createMetadataMemory = normalizeCreateMetadataMemory(
            settings.createMetadataMemory
        );

        settings.metadataDirectory = normalizeGLSMetadataDirectory(settings.metadataDirectory)
            || GLS_METADATA_DEFAULT_DIRECTORY;
        delete settings.writeMarkdownTimesOnLocalEdit; // 旧开关退役：正式时间记录始终维护。
        settings.activeResultView = normalizeResultViewId(
            settings.activeResultView
        );
        settings.resultViews = normalizeResultViews(settings.resultViews);
        settings.filterPools = normalizeFilterPools(settings.filterPools);
        settings.modalFilterSnapshot = normalizeLegacyFilterPoolSnapshot(
            settings.modalFilterSnapshot,
            settings.filterPools
        );
        settings.modalSearchQuery = normalizeModalSearchQuery(
            settings.modalSearchQuery
        );
        settings.modalViewportAnchor = normalizeModalViewportAnchor(
            settings.modalViewportAnchor
        );
        settings.confirmBeforeDelete = settings.confirmBeforeDelete !== false;
        settings.keepSearchResultsInMemory = settings.keepSearchResultsInMemory !== false;
        settings.resultSortOrder = normalizeSortFieldOrder(
            settings.resultSortOrder
        );
        settings.hiddenResultSortFields = normalizeHiddenSortFields(
            settings.hiddenResultSortFields,
            settings.resultSortOrder
        );
        settings.modalSortField = normalizeSortField(
            settings.modalSortField,
            Boolean(settings.modalSearchQuery.trim()),
            settings
        );
        settings.modalSortDirection = normalizeSortDirection(
            settings.modalSortDirection
        );
        settings.pickerFolderOrder = normalizeUniqueStringList(
            settings.pickerFolderOrder
        );
        settings.pickerTagOrder = normalizeUniqueStringList(
            settings.pickerTagOrder
        );
        settings.pickerPropertyOrder = normalizeUniqueStringList(
            settings.pickerPropertyOrder
        );
        settings.pickerPropertyValueOrder = normalizeStringListMap(
            settings.pickerPropertyValueOrder
        );
        settings.navigatorToolbars = normalizeNavigatorToolbars(settings.navigatorToolbars);
        settings.recentIconIds = normalizeRecentIconIds(settings.recentIconIds);
        settings.navigatorVisibleSections = normalizeNavigatorVisibleSections(settings.navigatorVisibleSections);
        settings.navigatorTimeField = normalizeNavigatorTimeField(settings.navigatorTimeField);
        settings.navigatorCustomization = normalizeNavigatorCustomization(settings.navigatorCustomization);

        for (const key of [
            "ioConcurrentLimit",
            "snippetReadLimit",
            "snippetMaxLen",
            "contentSegmentMaxLen"
        ]) {
            settings[key] = normalizeIntegerSetting(
                settings[key],
                DEFAULT_SETTINGS[key]
            );
        }

    },


    async loadSettings() {
        const saved = await this.loadData() || {};
        if (this._unloaded) return;

        const migrated = { ...saved };
        let needsSettingsWriteback = false;

        // V112：旧“新建默认文件夹 / 模板”一次性并入按类型 Create Metadata Memory。
        // 旧版创建预设仅迁移保存；当前创建流程不再自动读取这些历史元数据。
        const hasStoredCreateMemory = Object.prototype.hasOwnProperty.call(
            migrated,
            "createMetadataMemory"
        );
        const legacyCreateKeys = [
            "defaultFolder",
            "defaultFolderMd",
            "defaultFolderCanvas",
            "defaultFolderExcalidraw",
            "useTemplate",
            "templatePath",
            "useTemplateMd",
            "templatePathMd",
            "useTemplateCanvas",
            "templatePathCanvas",
            "useTemplateExcalidraw",
            "templatePathExcalidraw"
        ];
        const hasLegacyCreateState = legacyCreateKeys.some(key =>
            Object.prototype.hasOwnProperty.call(migrated, key)
        );
        const existingCreateMemory = migrated.createMetadataMemory
            && typeof migrated.createMetadataMemory === "object"
                ? migrated.createMetadataMemory
                : {};
        const legacyFolderFallback = normalizeVaultFolderPath(
            migrated.defaultFolder || ""
        );
        const legacyDefs = {
            md: {
                folder: migrated.defaultFolderMd,
                enabled: migrated.useTemplateMd ?? migrated.useTemplate,
                path: migrated.templatePathMd ?? migrated.templatePath
            },
            canvas: {
                folder: migrated.defaultFolderCanvas,
                enabled: migrated.useTemplateCanvas,
                path: migrated.templatePathCanvas
            },
            excalidraw: {
                folder: migrated.defaultFolderExcalidraw,
                enabled: migrated.useTemplateExcalidraw,
                path: migrated.templatePathExcalidraw
            }
        };
        const mergedCreateMemory = {};
        for (const type of CREATE_TYPE_IDS) {
            const existing = existingCreateMemory[type]
                && typeof existingCreateMemory[type] === "object"
                    ? existingCreateMemory[type]
                    : {};
            const legacy = legacyDefs[type];
            const existingTemplate = existing.template
                && typeof existing.template === "object"
                    ? existing.template
                    : null;
            const legacyPath = String(legacy.path || "");
            mergedCreateMemory[type] = {
                folder: Object.prototype.hasOwnProperty.call(existing, "folder")
                    ? existing.folder
                    : (normalizeVaultFolderPath(legacy.folder || "") || legacyFolderFallback),
                tags: existing.tags || [],
                properties: existing.properties || [],
                template: existingTemplate || {
                    enabled: !!legacy.enabled && !!legacyPath,
                    path: legacyPath
                }
            };
        }
        if (hasStoredCreateMemory || hasLegacyCreateState) {
            const normalizedCreateMemory = normalizeCreateMetadataMemory(
                mergedCreateMemory
            );
            if (
                JSON.stringify(migrated.createMetadataMemory)
                !== JSON.stringify(normalizedCreateMemory)
            ) {
                migrated.createMetadataMemory = normalizedCreateMemory;
                needsSettingsWriteback = true;
            }
        }
        if (!Object.prototype.hasOwnProperty.call(migrated, "createLastType")) {
            migrated.createLastType = "md";
            needsSettingsWriteback = true;
        }
        for (const legacyKey of legacyCreateKeys) {
            if (Object.prototype.hasOwnProperty.call(migrated, legacyKey)) {
                delete migrated[legacyKey];
                needsSettingsWriteback = true;
            }
        }

        // 结果标题 / 摘要字号完全归 Style Settings CSS Token；
        // 删除旧 JSON 状态，避免 JS inline style 与 Style Settings 双重权威源。
        for (const legacyKey of [
            "resultTitleFontSize",
            "resultSnippetFontSize",
            "resultTagPreviewLimit",
            "resultPropertyPreviewLimit",
            "resultPropertyOrder",
            "virtualPageSize",
            "maxGlobalContentCache",
            "enableIndexPersist"
        ]) {
            if (Object.prototype.hasOwnProperty.call(migrated, legacyKey)) {
                delete migrated[legacyKey];
                needsSettingsWriteback = true;
            }
        }


        // V4.6.41：旧版摘要行数属于全局设置。
        // 首次升级到三视图结构时，只把旧值迁移到“标准”视图，
        // 其余视图采用各自默认值；迁移后正式运行不再读取旧 snippetLines。
        if (
            !Object.prototype.hasOwnProperty.call(migrated, "resultViews")
        ) {
            const migratedViews = normalizeResultViews(
                DEFAULT_RESULT_VIEWS
            );
            if (
                Object.prototype.hasOwnProperty.call(
                    migrated,
                    "snippetLines"
                )
            ) {
                migratedViews.standard.snippetLines = Math.min(
                    3,
                    normalizeIntegerSetting(
                        migrated.snippetLines,
                        DEFAULT_RESULT_VIEWS.standard.snippetLines,
                        { allowZero: true }
                    )
                );
            }
            migrated.resultViews = migratedViews;
            migrated.activeResultView = "standard";
            needsSettingsWriteback = true;
        }

        // V138：新增“文件修改”排序维度，但升级不能擅自改变用户已有快捷循环成员。
        // 旧设置没有该字段时，只把它加入 View Composer 顺序并默认 eye-off；
        // 用户之后显式调整 eye / 顺序后，正式运行完全由 resultSortOrder / hiddenResultSortFields 驱动。
        if (
            Array.isArray(migrated.resultSortOrder)
            && !migrated.resultSortOrder.includes("fileModified")
        ) {
            const nextOrder = [...migrated.resultSortOrder];
            const contentIndex = nextOrder.indexOf("contentModified");
            nextOrder.splice(
                contentIndex >= 0 ? contentIndex + 1 : nextOrder.length,
                0,
                "fileModified"
            );
            migrated.resultSortOrder = nextOrder;
            migrated.hiddenResultSortFields = normalizeUniqueStringList([
                ...(Array.isArray(migrated.hiddenResultSortFields)
                    ? migrated.hiddenResultSortFields
                    : []),
                "fileModified"
            ]);
            needsSettingsWriteback = true;
        }

        // V5.4.2：一级主弹窗不再随软键盘改变外框高度；键盘只影响内部滚动可见区。
        if (
            !Object.prototype.hasOwnProperty.call(migrated, "modalSortField")
            && Object.prototype.hasOwnProperty.call(migrated, "modalFilenameSortMode")
        ) {
            const legacy = migrateLegacySortState(
                migrated.modalFilenameSortMode,
                Boolean(normalizeModalSearchQuery(migrated.modalSearchQuery).trim())
            );
            migrated.modalSortField = legacy.field;
            migrated.modalSortDirection = legacy.direction;
            needsSettingsWriteback = true;
        }

        if (
            !Object.prototype.hasOwnProperty.call(migrated, "modalViewportAnchor")
            && Object.prototype.hasOwnProperty.call(migrated, "modalScrollTop")
        ) {
            migrated.modalViewportAnchor = normalizeModalViewportAnchor(
                null,
                migrated.modalScrollTop
            );
            needsSettingsWriteback = true;
        }


        const current = Object.fromEntries(
            Object.keys(DEFAULT_SETTINGS)
                .filter(key =>
                    Object.prototype.hasOwnProperty.call(
                        migrated,
                        key
                    )
                )
                .map(key => [key, migrated[key]])
        );

        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            current
        );

        const preNormalizeSnapshot = JSON.stringify(this.settings);
        this._normalizeSettingsInPlace();
        if (JSON.stringify(this.settings) !== preNormalizeSnapshot) {
            needsSettingsWriteback = true;
        }

        // loadSettings 已完成完整规范化；迁移写回直接冻结当前快照，
        // 不再进入 saveSettings() 重跑整套 normalize。
        if (needsSettingsWriteback) {
            await this._queueSettingsSnapshot();
        }
    },


    _queueSettingsSnapshot() {
        if (this._unloaded) return Promise.resolve(false);
        const snapshot = JSON.parse(JSON.stringify(this.settings));
        const writeTask = async () => {
            try {
                if (!await this._writablePluginDirectory()) return false;
                await this.saveData(snapshot);
                return true;
            } catch (error) {
                console.warn("插件设置保存失败", error);
                return false;
            }
        };
        this._settingsWriteChain = this._settingsWriteChain.then(
            writeTask,
            writeTask
        );
        return this._settingsWriteChain;
    },


    async saveSettings() {
        if (this._unloaded) return;
        if (this.settings.keepSearchResultsInMemory === false) this._clearResidentSearchResults();
        if (this._activitySaveTimer) {
            clearTimeout(this._activitySaveTimer);
            this._activitySaveTimer = null;
        }
        this._normalizeSettingsInPlace();
        return this._queueSettingsSnapshot();
    },
};

