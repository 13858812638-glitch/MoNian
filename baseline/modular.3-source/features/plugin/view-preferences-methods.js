// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeExcludedAttachmentTypes } from "../../data/formats/file-types.js";
import { isSameOrDescendantVaultPath } from "../../utils/vault-paths.js";
import { normalizeFilterPoolSelectionMode, normalizeFilterPools } from "../filters/pool-config.js";
import { normalizeExcludedFolders } from "../folders/exclusions.js";
import { DEFAULT_RESULT_VIEWS, RESULT_VIEW_IDS, normalizeResultViewConfig, normalizeResultViewId, normalizeResultViews } from "../results/view-config.js";
import { normalizeHiddenSortFields, normalizeSortFieldOrder } from "../sort/sort-model.js";
import { Notice } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_view_preferences_methods = {


    _captureActiveResultViewAnchors() {
        const anchors = new Map();
        this._forEachActiveSearchCore(core => {
            anchors.set(
                core,
                core.resultRenderer?.captureMountedViewportAnchor?.()
                    || core.resultRenderer?.captureViewportAnchor?.()
                    || null
            );
        });
        return anchors;
    },


    _refreshActiveResultViewCores({
        rerender = true,
        anchors = null,
        clearEstimate = false
    } = {}) {
        this._forEachActiveSearchCore(core => {
            core.resultControls.applyViewSettings({
                rerender,
                viewportAnchor: anchors instanceof Map
                    ? anchors.get(core) || null
                    : null,
                clearEstimate
            });
        });
    },


    _refreshFolderStateCores(change = null) {
        this._forEachActiveSearchCore(core => {
            core._refreshCurrentResultsAfterMutation({
                preserveSelection: true,
                scrollTop: core.resultsContainer?.scrollTop || 0
            });
            // 可见范围与路径变更共用一次刷新；仍打开的 Picker 原位更新。
            core.resultControls?.refreshFilterPoolHeader?.();
            core.dropdown?.refresh(change);
        });
    },


    async setExcludedFolders(paths) {
        const next = normalizeExcludedFolders(paths);
        const current = normalizeExcludedFolders(this.settings.excludedFolders);
        const changed = JSON.stringify(next) !== JSON.stringify(current);
        this.settings.excludedFolders = next;

        if (changed) {
            // 仅处理跨越全局排除边界的文件。恢复必须等索引提交后刷新仍打开的
            // Picker，不能把主动点击交给会被 Dropdown 挡住的后台通知。
            for (const file of this.app.vault.getFiles()) {
                const wasExcluded = current.some(folder =>
                    isSameOrDescendantVaultPath(file.path, folder));
                const excluded = this.isPathExcluded(file.path);
                if (excluded) this._evictIndexedPath(file.path);
                if (wasExcluded && !excluded) this._indexQueue.add(file.path);
            }
            this._refreshFolderStateCores();
            try {
                await Promise.all([this.saveSettings(), this._flushIndexQueueNow()]);
            } finally {
                if (!this._unloaded) {
                    this._refreshFolderStateCores();
                    this.throttleSaveCache();
                }
            }
        }
        return next;
    },


    async setResultExcludedFolders(paths) {
        const next = normalizeExcludedFolders(paths);
        const current = normalizeExcludedFolders(this.settings.resultExcludedFolders);
        const changed = JSON.stringify(next) !== JSON.stringify(current);
        this.settings.resultExcludedFolders = next;

        if (changed) {
            // 结果排除不退出索引；用户主动点击必须立即更新当前结果与 Facet，不等待 Dropdown 关闭。
            this._refreshFolderStateCores();
            await this.saveSettings();
        }
        return next;
    },


    async setResultExcludedAttachmentTypes(extensions) {
        const next = normalizeExcludedAttachmentTypes(extensions);
        if (JSON.stringify(next) === JSON.stringify(this.settings.resultExcludedAttachmentTypes)) return next;
        this.settings.resultExcludedAttachmentTypes = next;
        // 和文件夹结果排除一样，只刷新当前结果、Facet 和仍打开的 Picker；不重建索引。
        this._refreshFolderStateCores();
        await this.saveSettings();
        return next;
    },


    _refreshFilterPoolCores() {
        this._forEachActiveSearchCore(core => {
            core.resultControls?.refreshFilterPoolHeader?.();
        });
    },


    async setFilterPoolSelectionMode(poolId, mode) {
        const id = String(poolId || "");
        const nextMode = normalizeFilterPoolSelectionMode(mode);
        const current = normalizeFilterPools(this.settings.filterPools);
        const target = current.find(pool => pool.id === id);
        if (!target || target.selectionMode === nextMode) return current;
        const next = normalizeFilterPools(current.map(pool =>
            pool.id === id ? { ...pool, selectionMode: nextMode } : pool
        ));
        this.settings.filterPools = next;
        this._forEachActiveSearchCore(core => {
            const changed = core.resultControls?._migrateFilterPoolSelectionMode?.(id, nextMode);
            core.dropdown?.panel?._lsPoolSelectionModeRefresh?.();
            if (changed) core._onFilterChanged();
            else core.resultControls?.refreshFilterPoolHeader?.();
        });
        await this.saveSettings();
        return next;
    },


    async setFilterPools(pools) {
        const next = normalizeFilterPools(pools);
        const current = normalizeFilterPools(
            this.settings.filterPools
        );
        const changed =
            JSON.stringify(next) !== JSON.stringify(current);

        this.settings.filterPools = next;
        this._refreshFilterPoolCores();

        if (changed) {
            let saved = false;
            try { saved = await this.saveSettings(); }
            catch (error) { console.warn("筛选池设置保存失败", error); }
            if (saved === false) {
                if (JSON.stringify(this.settings.filterPools) === JSON.stringify(next)) this.settings.filterPools = current;
                this._refreshFilterPoolCores();
                new Notice("筛选设置保存失败，已恢复原设置");
                return false;
            }
        }
        return next;
    },


    _refreshResultSortCores() {
        this._forEachActiveSearchCore(core => {
            const previousField = core.sortField;
            core.sorting?.normalize();
            core.sorting?.sync();
            if (core.sortField !== previousField) {
                core.performSearch(core.queryState.raw, true);
            }
        });
    },


    async setResultSortPreferences({ order, hidden } = {}) {
        const nextOrder = normalizeSortFieldOrder(
            order ?? this.settings.resultSortOrder
        );
        const nextHidden = normalizeHiddenSortFields(
            hidden ?? this.settings.hiddenResultSortFields,
            nextOrder
        );
        const currentOrder = normalizeSortFieldOrder(
            this.settings.resultSortOrder
        );
        const currentHidden = normalizeHiddenSortFields(
            this.settings.hiddenResultSortFields,
            currentOrder
        );
        const changed =
            JSON.stringify(nextOrder) !== JSON.stringify(currentOrder)
            || JSON.stringify(nextHidden) !== JSON.stringify(currentHidden);

        this.settings.resultSortOrder = nextOrder;
        this.settings.hiddenResultSortFields = nextHidden;
        this._refreshResultSortCores();
        if (changed) await this.saveSettings();
        return { order: nextOrder, hidden: nextHidden };
    },


    async setActiveResultView(viewId) {
        const next = normalizeResultViewId(viewId);
        const anchors = this._captureActiveResultViewAnchors();
        const changed = this.settings.activeResultView !== next;
        this.settings.activeResultView = next;

        // 视图之间复用各自已学习的平均行高，但当前 HeightIndex 必须进入新 geometryRevision。
        this._refreshActiveResultViewCores({
            rerender: true,
            anchors,
            clearEstimate: false
        });
        if (changed) await this.saveSettings();
        return next;
    },


    async updateActiveResultViewConfig(patch = {}) {
        const id = normalizeResultViewId(
            this.settings.activeResultView
        );
        const current = normalizeResultViewConfig(
            this.settings.resultViews?.[id],
            DEFAULT_RESULT_VIEWS[id]
        );
        const next = normalizeResultViewConfig(
            { ...current, ...patch },
            DEFAULT_RESULT_VIEWS[id]
        );
        const anchors = this._captureActiveResultViewAnchors();

        this.settings.resultViews = {
            ...normalizeResultViews(this.settings.resultViews),
            [id]: next
        };

        // 同一视图内部摘要行数 / 内容显隐 / 顺序变化会改变行高；
        // 当前视图平均值与所有离屏 measured 高度必须一起失效。
        this._refreshActiveResultViewCores({
            rerender: true,
            anchors,
            clearEstimate: true
        });
        await this.saveSettings();
        return next;
    },


    async resetActiveResultView() {
        const id = normalizeResultViewId(
            this.settings.activeResultView
        );
        const anchors = this._captureActiveResultViewAnchors();
        this.settings.resultViews = {
            ...normalizeResultViews(this.settings.resultViews),
            [id]: normalizeResultViewConfig(
                DEFAULT_RESULT_VIEWS[id],
                DEFAULT_RESULT_VIEWS[id]
            )
        };
        this._refreshActiveResultViewCores({
            rerender: true,
            anchors,
            clearEstimate: true
        });
        await this.saveSettings();
    },


    async cycleActiveResultView() {
        const current = normalizeResultViewId(
            this.settings.activeResultView
        );
        const index = RESULT_VIEW_IDS.indexOf(current);
        const next = RESULT_VIEW_IDS[
            (index + 1) % RESULT_VIEW_IDS.length
        ];
        await this.setActiveResultView(next);

        if (![...this.activeSearchCores].some(
            core => core && !core._destroyed
        )) {
            this.openSearchModal();
        }
    },
};

