// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { GLS_METADATA_HISTORY_VERSION, parseGLSDate } from "../../data/time/time-values.js";
import { Notice, TFile } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_recent_history_storage_methods = {


    // 外部插件仅能通过 GLS 公共边界提交一次用户明确的文件打开动作；
    // 不允许外部设置时间值，时钟唯一 Owner 始终是 GLS。
    markOpenedFromExternal(path) {
        const file = this.app.vault.getAbstractFileByPath(String(path || ""));
        if (this._unloaded || !this._recentOpenedTrackingReady || !(file instanceof TFile)) return false;
        return this._touchRecentOpened(file.path);
    },


    getAuthoritativeFileTime(path) {
        const meta = this.fileMetaCache.get(String(path || ""));
        if (!meta) return null;
        return Object.freeze({ path: meta.path,
            createdAt: Number(meta.ctime) || 0,
            createdSource: meta.timeCreatedSource || "initial-value",
            contentModifiedAt: Number(meta.contentModifiedAt) || 0,
            contentSource: meta.timeContentSource || "initial-value",
            fileModifiedAt: parseGLSDate(meta.fileModifiedAt),
            fileSource: meta.timeFileSource || "initial-value" });
    },


    subscribeRecentOpened(listener) {
        if (typeof listener !== "function" || this._unloaded) return () => {};
        this._timeHistorySubscribers.add(listener);
        return () => this._timeHistorySubscribers.delete(listener);
    },


    _notifyRecentOpened() {
        for (const listener of [...this._timeHistorySubscribers]) {
            try { listener(); } catch (error) { console.warn("历史订阅回调失败", error); }
        }
    },


    getRecentOpenedHistory(limit = 100) {
        const bound = Math.max(0, Math.min(100, Math.trunc(Number(limit) || 0)));
        // NAS 可能晚于布局恢复同步文件；未到达的路径保留历史但暂时不展示。
        return this._recentOpenedHistory.filter(item =>
            this.app.vault.getAbstractFileByPath(item.path) instanceof TFile
            && !this.isPathExcluded(item.path)
        ).slice(0, bound).map(item => ({ ...item }));
    },


    _mergeRecentOpenedHistory() {
        const highest = new Map();
        // settings.recentOpened 仅在升级时兜底，时间未知保持 null 而非伪造时钟。
        for (const path of this.settings.recentOpened || []) {
            if (!highest.has(path)) highest.set(path, { path, openedAt: null });
        }
        for (const item of [...this._recentOpenedHistory, ...this._recentOpenedLocal]) {
            if (!item?.path || this.isPathExcluded(item.path)) continue;
            const at = Number(item.openedAt) || 0;
            const prev = highest.get(item.path);
            if (!prev || at > (Number(prev.openedAt) || 0)) {
                highest.set(item.path, { path: item.path, openedAt: at || null });
            }
        }
        this._recentOpenedHistory = [...highest.values()]
            .filter(item => !this.isPathExcluded(item.path))
            .sort((a, b) => (Number(b.openedAt) || 0) - (Number(a.openedAt) || 0))
            .slice(0, 100);
        // 只作为 V237 UI 排序所需镜像，唯一带时间记录在元数据目录。
        this.settings.recentOpened = this._recentOpenedHistory.map(item => item.path);
        this._notifyRecentOpened();
    },


    async loadRecentOpenedHistory({ preserveLocal = false } = {}) {
        const directory = this._metadataDirectory();
        const adapter = this.app.vault.adapter;
        const history = [];
        let local = preserveLocal ? this._recentOpenedLocal : [];
        let paths = [];
        try { paths = await this._metadataSidecarFiles(directory); }
        catch (error) { console.warn("GLS 历史目录不可读取，保留已有历史", error); return false; }
        for (const path of paths) {
            if (!/(?:^|\/)recent-opened-[a-zA-Z0-9_-]+\.json$/.test(path)) continue;
            try {
                const dump = JSON.parse(await adapter.read(path));
                if (dump?.version !== GLS_METADATA_HISTORY_VERSION || !Array.isArray(dump.entries)) continue;
                const entries = dump.entries.slice(0, 100).filter(item => item && typeof item.path === "string"
                    && Number.isFinite(Number(item.openedAt)) && Number(item.openedAt) > 0)
                    .map(item => ({ path: item.path, openedAt: Number(item.openedAt) }));
                history.push(...entries);
                if (!preserveLocal && path.endsWith(`/${this._metadataHistoryFilename()}`)) local = entries;
            } catch (error) { console.warn("读取设备最近打开历史失败", path, error); }
        }
        // 此阶段仅保留文件字节来源的历史。Vault/Workspace 尚未完全恢复，
        // 不能通过 getAbstractFileByPath 验证并删除合法历史；onLayoutReady 统一合并。
        if (this._unloaded) return false;
        this._recentOpenedLocal = preserveLocal ? this._recentOpenedLocal : local;
        this._recentOpenedHistory = preserveLocal ? [...this._recentOpenedHistory, ...history] : history;
        return true;
    },


    _throttleSaveRecentOpenedHistory() {
        if (this._metadataHistorySaveTimer) clearTimeout(this._metadataHistorySaveTimer);
        this._metadataHistorySaveTimer = setTimeout(() => {
            this._metadataHistorySaveTimer = null;
            void this.saveRecentOpenedHistory();
        }, 1200);
    },


    async saveRecentOpenedHistory() {
        if (this._metadataHistorySaveTimer) {
            clearTimeout(this._metadataHistorySaveTimer);
            this._metadataHistorySaveTimer = null;
        }
        const directory = this._metadataDirectory();
        const path = `${directory}/${this._metadataHistoryFilename()}`;
        const snapshot = JSON.stringify({ version: GLS_METADATA_HISTORY_VERSION, writerId: this._metadataWriterId,
            entries: this._recentOpenedLocal.slice(0, 100) });
        const write = async () => {
            try {
                await this._ensureMetadataDirectory(directory);
                await this.app.vault.adapter.write(path, snapshot);
                this._recentOpenedSaveWarned = false;
                return true;
            } catch (error) {
                console.warn("GLS 最近打开历史保存失败", error);
                if (!this._unloaded && !this._recentOpenedSaveWarned) {
                    this._recentOpenedSaveWarned = true;
                    new Notice("GLS 最近访问记录未写入元数据目录，请检查目录及 NAS 同步权限", 8000);
                }
                return false;
            }
        };
        this._metadataHistoryWriteChain = this._metadataHistoryWriteChain.then(write, write);
        return this._metadataHistoryWriteChain;
    },
};

