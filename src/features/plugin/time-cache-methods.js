// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { indexedFileProperties, markdownTimePayload, parseGLSDate } from "../../data/time/time-values.js";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_time_cache_methods = {



    async _readFileProperties(file) {
        this.fileOperations.assertCurrent(file);
        if (file.extension.toLowerCase() !== "md") return this._nonMarkdownProperties(file.path);
        return indexedFileProperties(markdownTimePayload(await this.app.vault.read(file)).frontmatter);
    },


    _setContentTimeEntry(path, entry) {
        if (!path || !entry) return false;
        const current = this.contentTimeCache.get(path);
        const next = {
            createdAt: parseGLSDate(entry.createdAt) || parseGLSDate(current?.createdAt),
            createdSource: entry.createdSource || current?.createdSource || "initial-value",
            creationLocked: true,
            fingerprint: String(entry.fingerprint || ""),
            contentModifiedAt: parseGLSDate(entry.contentModifiedAt),
            contentSource: entry.contentSource || "initial-value",
            fileFingerprint: String(entry.fileFingerprint || ""),
            fileModifiedAt: parseGLSDate(entry.fileModifiedAt),
            fileSource: entry.fileSource || "initial-value",
            bodyUnverified: Boolean(entry.bodyUnverified),
            fileUnverified: Boolean(entry.fileUnverified)
        };
        if (!next.createdAt && !next.contentModifiedAt && !next.fileModifiedAt) return false;
        if (JSON.stringify(current) === JSON.stringify(next)) return false;
        this.contentTimeCache.set(path, next);
        this._markContentTimeCacheDirty();
        return true;
    },


    _removeContentTimePath(path) {
        if (!path || !this.contentTimeCache.delete(path)) return false;
        this._markContentTimeCacheDirty();
        return true;
    },


    _removeContentTimePathPrefix(path) {
        if (!path) return false;
        const prefix = path + "/";
        let changed = false;

        for (const cachedPath of [...this.contentTimeCache.keys()]) {
            if (
                cachedPath === path
                || cachedPath.startsWith(prefix)
            ) {
                this.contentTimeCache.delete(cachedPath);
                changed = true;
            }
        }

        if (changed) this._markContentTimeCacheDirty();
        return changed;
    },


    _migrateContentTimePath(oldPath, newPath, { descendants = false } = {}) {
        if (!oldPath || !newPath || oldPath === newPath) return false;

        const prefix = oldPath + "/";
        const moves = [];

        for (const [cachedPath, entry] of this.contentTimeCache) {
            if (cachedPath === oldPath) {
                moves.push([cachedPath, newPath, entry]);
                continue;
            }
            if (descendants && cachedPath.startsWith(prefix)) {
                moves.push([
                    cachedPath,
                    newPath + cachedPath.slice(oldPath.length),
                    entry
                ]);
            }
        }

        if (!moves.length) return false;

        for (const [from, to, entry] of moves) {
            this.contentTimeCache.delete(from);
            this.contentTimeCache.set(to, entry);
        }

        this._markContentTimeCacheDirty();
        return true;
    },


    _markContentTimeCacheDirty() {
        if (this._unloaded) return;
        this._contentTimePersistDirty = true;

        if (this._contentTimePersistTimer) {
            clearTimeout(this._contentTimePersistTimer);
        }

        this._contentTimePersistTimer = setTimeout(async () => {
            this._contentTimePersistTimer = null;
            if (this._unloaded || !this._contentTimePersistDirty) return;

            try {
                // 首次建库 / 批量元数据修改时等待当前索引事务稳定，
                // 避免连续写出多份中间 tracker。
                const activeBuild = this._indexBuildPromise;
                if (activeBuild) await activeBuild;
                if (this._unloaded) return;

                const activeFlush = this._indexFlushPromise;
                if (activeFlush) await activeFlush;
                if (this._unloaded || !this._contentTimePersistDirty) return;

                this._contentTimePersistDirty = false;
                await this.saveContentTimeCache();
            } catch (error) {
                if (!this._unloaded) {
                    console.warn("GLS 时间记录延迟保存失败", error);
                }
            }
        }, 1200);
    },


    _flushContentTimeCacheSave() {
        if (this._contentTimePersistTimer) {
            clearTimeout(this._contentTimePersistTimer);
            this._contentTimePersistTimer = null;
        }
        if (!this._contentTimePersistDirty || this._unloaded) return;

        this._contentTimePersistDirty = false;
        void this.saveContentTimeCache();
    },
};

