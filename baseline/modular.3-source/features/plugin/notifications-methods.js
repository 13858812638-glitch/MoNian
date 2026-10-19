// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { FilterState } from "../filters/filter-state.js";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_notifications_methods = {


    // 搜索记录 / 最近打开属于同一类高频活动状态：2 秒内只写一次 data.json。
    // 内存值立即更新，打开文件热路径不再同步 clone 整套 settings。
    _throttleSaveActivity() {
        if (this._unloaded) return;
        if (this._activitySaveTimer) clearTimeout(this._activitySaveTimer);
        this._activitySaveTimer = setTimeout(() => {
            this._activitySaveTimer = null;
            if (this._unloaded) return;
            void this.saveSettings();
        }, 2000);
    },



    _activeCoreFilterStates(core) {
        const states = [];
        const add = state => {
            if (!(state instanceof FilterState) || states.includes(state)) return;
            states.push(state);
        };
        add(core?.filterState);
        if (core?.createFlow?.isCreateView?.()) {
            add(core.createFlow.searchFilterState);
        }
        return states;
    },


    _settleCoreFilterMutation(core) {
        if (!core || core._destroyed) return;
        core.facets?.syncFilterButtons?.();
        if (core.createFlow?.isCreateView?.()) {
            // CreateDraft 的持久记忆已由对应元数据操作 / 全局迁移链更新；
            // 这里仅刷新活动会话，避免维护动作反向把冻结搜索条件写成新的创建记忆。
            core.createFlow._refreshCreatePreview?.({ refreshPools: true });
            core._syncResultStateRow?.();
            return;
        }
        core._queueResultIndexChanges(null, { refreshPools: true });
    },


    _forEachActiveSearchCore(callback) {
        if (typeof callback !== "function") return 0;
        let count = 0;
        for (const core of [...this.activeSearchCores]) {
            if (!core || core._destroyed) {
                this.activeSearchCores.delete(core);
                continue;
            }
            callback(core);
            count++;
        }
        return count;
    },


    _refreshSearchCoreResultCards(core, { geometryChanged = false } = {}) {
        if (!core || core._destroyed) return false;
        if (geometryChanged) {
            core.resultRenderer?.rerenderForGeometryChange?.({
                viewportAnchor: core.resultRenderer?.captureMountedViewportAnchor?.(),
                clearEstimate: true
            });
            return true;
        }

        // 纯视觉 / 同高内容刷新继续复用当前 scrollTop，不推进 geometryRevision。
        return Boolean(core.resultRenderer?.rerenderPreservingScrollTop?.());
    },


    _refreshActiveResultCards(options = {}) {
        return this._forEachActiveSearchCore(core => {
            this._refreshSearchCoreResultCards(core, options);
        });
    },


    // Picker 拖拽顺序的唯一刷新出口。
    // 不重搜、不重建索引：只更新真正消费 picker*Order 的可见 UI。
    _refreshPickerOrderConsumers(kind) {
        const metadataOrderChanged = kind === "tag"
            || kind === "property-key"
            || kind === "property-value";

        return this._forEachActiveSearchCore(core => {
            // “当前条件”始终直接消费 Picker 顺序。
            core.facets?.renderPinnedPropertyFilters?.();

            if (!metadataOrderChanged) {
                // 文件夹顺序不会改变结果卡内容，只重绘 Header 中的筛选池。
                core.resultControls?.refreshFilterPoolHeader?.();
                return;
            }

            // 标签 / 属性顺序会同时影响筛选池 Header、结果卡与创建摘要。
            // Header 与 Result / Create 已解耦，因此分别提交各自真正需要的刷新。
            core.resultControls?.refreshFilterPoolHeader?.();
            if (core.createFlow?.isCreateView?.()) {
                core.createFlow._refreshCreatePreview?.();
            } else {
                this._refreshSearchCoreResultCards(core);
            }
        });
    },
};

