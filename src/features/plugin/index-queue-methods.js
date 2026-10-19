// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { IoPool } from "../../services/IoPool.js";
import { TFile } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_index_queue_methods = {


    _queueFileIndex(path) {
        if (this._unloaded || !path) return;
        this.globalContentCache.delete(path);
        // A fresh file event takes precedence over any stale timed retry.
        this._indexRetryAttempts.delete(path);
        this._indexRetryPending.delete(path);
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
            const facetKey = meta => meta ? JSON.stringify([meta.folder, meta.extension, meta.tags, meta.properties]) : null;
            const pool = new IoPool(this.settings.ioConcurrentLimit);
            while (!this._unloaded && this._indexQueue.size) {
                const paths = [...this._indexQueue];
                this._indexQueue.clear();

                await pool.forEach(paths, async path => {
                    if (this._unloaded) return;
                    changedPaths.add(path);

                    const previousFacet = facetKey(this.fileMetaCache.get(path));
                    const file = this.app.vault.getAbstractFileByPath(path);
                    if (file instanceof TFile) {
                        let indexed = false;
                        try { indexed = await this._updateSingleFile(file) === true; }
                        catch (error) {
                            // Per-file exceptions must not abort or lose the
                            // other paths in the current concurrent batch.
                            console.warn(`增量索引失败，等待重试：${path}`, error);
                        }
                        if (indexed) {
                            this._indexRetryAttempts.delete(path);
                            this._indexRetryPending.delete(path);
                        } else {
                            const attempts = (this._indexRetryAttempts.get(path) || 0) + 1;
                            this._indexRetryAttempts.set(path, attempts);
                            if (attempts <= 4) this._indexRetryPending.add(path);
                            else console.warn(`增量索引重试达到上限（${attempts} 次）：${path}`);
                        }
                    } else {
                        this._indexRetryAttempts.delete(path);
                        this._indexRetryPending.delete(path);
                        this._evictIndexedPath(path);
                        this._removeContentTimePath(path);
                    }
                    refreshPools ||= previousFacet !== facetKey(this.fileMetaCache.get(path));
                }, () => !this._unloaded);
            }

            if (this._unloaded) return;
            this._publishIndexChanges(changedPaths, { refreshPools });
            this.throttleSaveCache();
        })();

        try {
            await this._indexFlushPromise;
        } finally {
            this._indexFlushPromise = null;
        }

        // A failed read used to disappear from _indexQueue permanently. Retry
        // after successful batch publication without spinning in the same
        // while-loop. New filesystem events still use the normal debounce.
        if (!this._unloaded && this._indexRetryPending.size && !this._indexRetryTimer) {
            const maxAttempts = Math.max(...[...this._indexRetryPending].map(path => this._indexRetryAttempts.get(path) || 1));
            const delay = Math.min(3000, 250 * 2 ** Math.max(0, maxAttempts - 1));
            this._indexRetryTimer = setTimeout(() => {
                this._indexRetryTimer = null;
                if (this._unloaded) return;
                for (const path of this._indexRetryPending) {
                    if (this._indexRetryAttempts.has(path)) this._indexQueue.add(path);
                }
                this._indexRetryPending.clear();
                if (this._indexQueue.size) void this._flushIndexQueue().catch(error => {
                    if (!this._unloaded) console.error("增量索引重试失败", error);
                });
            }, delay);
        }
        return this._indexQueue.size ? this._flushIndexQueue() : undefined;
    },
};

