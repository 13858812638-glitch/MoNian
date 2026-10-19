// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { IoPool } from "../../services/IoPool.js";
import { TFile } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_index_queue_methods = {


    _queueFileIndex(path) {
        if (this._unloaded || !path) return;
        this.globalContentCache.delete(path);
        this._indexQueue.add(path);

        if (this._indexRefreshTimer) clearTimeout(this._indexRefreshTimer);
        this._indexRefreshTimer = setTimeout(() => {
            this._indexRefreshTimer = null;
            if (this._unloaded) return;
            void this._flushIndexQueue().catch(error => {
                if (!this._unloaded) console.error("增量索引刷新失败", error);
            });
        }, 120);
    },


    async _flushIndexQueueNow() {
        if (this._unloaded) return;

        if (this._indexRefreshTimer) {
            clearTimeout(this._indexRefreshTimer);
            this._indexRefreshTimer = null;
        }
        await this._flushIndexQueue();
    },


    async _flushIndexQueue() {
        if (this._unloaded) return;

        if (this._indexFlushPromise) {
            await this._indexFlushPromise;
            if (this._unloaded) return;
            return this._indexQueue.size
                ? this._flushIndexQueue()
                : undefined;
        }
        if (!this._indexQueue.size) return;

        this._indexFlushPromise = (async () => {
            if (this._indexBuildPromise) {
                await this._indexBuildPromise;
            }
            if (this._unloaded) return;

            // 一轮索引批次只发布一次，结果按当前查询增量重判成员与排序。
            const changedPaths = new Set();
            let refreshPools = false;
            let projectChanged = false;
            const facetKey = meta => meta ? JSON.stringify([meta.folder, meta.extension, meta.tags, meta.properties]) : null;
            const projectKey = meta => meta ? JSON.stringify([meta.properties?.["所属项目"], meta.ctime]) : "";
            const pool = new IoPool(this.settings.ioConcurrentLimit);
            while (!this._unloaded && this._indexQueue.size) {
                const paths = [...this._indexQueue];
                this._indexQueue.clear();

                await pool.forEach(paths, async path => {
                    if (this._unloaded) return;
                    changedPaths.add(path);

                    const previousFacet = facetKey(this.fileMetaCache.get(path));
                    const previousProject = projectKey(this.fileMetaCache.get(path));
                    const file = this.app.vault.getAbstractFileByPath(path);
                    if (file instanceof TFile) await this._updateSingleFile(file);
                    else {
                        this._evictIndexedPath(path);
                        this._removeContentTimePath(path);
                    }
                    refreshPools ||= previousFacet !== facetKey(this.fileMetaCache.get(path));
                    projectChanged ||= previousProject !== projectKey(this.fileMetaCache.get(path));
                }, () => !this._unloaded);
            }

            if (this._unloaded) return;
            this._publishIndexChanges(changedPaths, { refreshPools, projectChanged });
            this.throttleSaveCache();
        })();

        try {
            await this._indexFlushPromise;
        } finally {
            this._indexFlushPromise = null;
        }

        return this._indexQueue.size ? this._flushIndexQueue() : undefined;
    },
};

