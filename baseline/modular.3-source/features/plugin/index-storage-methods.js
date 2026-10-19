// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { INDEX_CACHE_VERSION } from "../../data/index/index-version.js";
import { parseGLSDate } from "../../data/time/time-values.js";
import { TFile } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_index_storage_methods = {


    _clearResidentSearchResults() {
        this._residentSearchResults.clear();
        this._residentSearchResultRows = 0;
    },


    _getResidentSearchSnapshot(key) {
        if (this.settings.keepSearchResultsInMemory === false || this._unloaded) return null;
        const entry = this._residentSearchResults.get(key);
        if (!entry) return null;
        this._residentSearchResults.delete(key);
        this._residentSearchResults.set(key, entry);
        return entry;
    },


    _getResidentSearchResults(key) {
        const entry = this._getResidentSearchSnapshot(key);
        if (!entry) return null;
        // 摘要由当前 SearchCore 异步填写；命中查询也不能共享可变 Result 对象。
        const rows = values => entry.active ? values.map(row => ({ ...row })) : values.slice();
        return { best: rows(entry.best), body: rows(entry.body), bestCount: entry.bestCount, bodyCount: entry.bodyCount };
    },


    _rememberSearchResults(key, ranked, active) {
        const size = ranked.best.length + ranked.body.length;
        if (this.settings.keepSearchResultsInMemory === false || this._unloaded || size > 20000 || key.length > 65536) return;
        const rows = values => active ? values.map(row => ({ ...row })) : values.slice();
        this._rememberSearchSnapshot(key, { best: rows(ranked.best), body: rows(ranked.body),
            bestCount: ranked.bestCount, bodyCount: ranked.bodyCount, active, size });
    },


    _rememberSearchSnapshot(key, entry) {
        if (this.settings.keepSearchResultsInMemory === false || this._unloaded) return;
        const size = entry.size;
        if (size > 20000 || key.length > 65536) return;
        const old = this._residentSearchResults.get(key);
        if (old) { this._residentSearchResultRows -= old.size; this._residentSearchResults.delete(key); }
        while (this._residentSearchResults.size >= 3 || this._residentSearchResultRows + size > 20000) {
            const oldest = this._residentSearchResults.keys().next().value;
            const removed = this._residentSearchResults.get(oldest);
            if (!removed) break;
            this._residentSearchResults.delete(oldest);
            this._residentSearchResultRows -= removed.size;
        }
        this._residentSearchResults.set(key, entry);
        this._residentSearchResultRows += size;
    },


    async saveIndexCache() {
        if (this._unloaded) return;

        // 在第一次 await 前冻结当前索引快照。
        // 实际写盘严格进入同一串行链，避免旧快照晚写覆盖新快照。
        const dump = {
            version: INDEX_CACHE_VERSION,
            contentSegmentMaxLen: this.settings.contentSegmentMaxLen,
            snippetMaxLen: this.settings.snippetMaxLen,
            meta: Array.from(this.fileMetaCache.values()).map(m => ({
                path: m.path, name: m.name, nameLower: m.nameLower, tags: m.tags, inlineTags: m.inlineTags || [],
                properties: m.properties || {},
                mtime: m.mtime, ctime: m.ctime,
                statSize: m.statSize, validationStamp: m.validationStamp,
                fileModifiedAt: m.fileModifiedAt || 0,
                timeFileSource: m.timeFileSource || "",
                timeFileFingerprint: m.timeFileFingerprint || "",
                timeFingerprint: m.timeFingerprint || "",
                timeCreatedSource: m.timeCreatedSource || "initial-value",
                timeContentSource: m.timeContentSource || "initial-value",
                contentModifiedAt: parseGLSDate(m.contentModifiedAt),
                extension: m.extension, snippet: m.snippet || "",
                textCount: Number.isFinite(Number(m.textCount))
                    ? Math.max(0, Math.trunc(Number(m.textCount)))
                    : 0,
                canvasNodeCount: Number.isFinite(Number(m.canvasNodeCount))
                    ? Math.max(0, Math.trunc(Number(m.canvasNodeCount)))
                    : 0,
                excalidrawElementCount: m.excalidrawElementCount != null
                    && Number.isFinite(Number(m.excalidrawElementCount))
                    ? Math.max(0, Math.trunc(Number(m.excalidrawElementCount)))
                    : null
            })),
            indexData: this.bodyIndex.serialize()
        };
        const jsonStr = JSON.stringify(dump);
        const writeTask = async () => {
            if (this._unloaded) return false;

            try {
                const directory = await this._writablePluginDirectory();
                if (!directory || this._unloaded) return false;
                await this.app.vault.adapter.write(`${directory}/index-cache.json`, jsonStr);
                return true;
            } catch (e) {
                console.warn("索引缓存保存失败", e);
                return false;
            }
        };

        this._persistWriteChain = this._persistWriteChain.then(
            writeTask,
            writeTask
        );
        return this._persistWriteChain;
    },


    async loadIndexCache() {
        if (this._unloaded) return false;

        const cacheRelPath = `${this._pluginDirectory()}/index-cache.json`;
        try {
            if (!await this.app.vault.adapter.exists(cacheRelPath)) return false;
            if (this._unloaded) return false;

            const rawText = await this.app.vault.adapter.read(cacheRelPath);
            if (this._unloaded) return false;

            const dump = JSON.parse(rawText);
            if (
                dump?.version !== INDEX_CACHE_VERSION
                || dump.contentSegmentMaxLen
                    !== this.settings.contentSegmentMaxLen
                || dump.snippetMaxLen
                    !== this.settings.snippetMaxLen
            ) {
                return false;
            }
            if (
                !Array.isArray(dump.meta)
                || !dump.indexData
                || !dump.indexData.documents
                || typeof dump.indexData.documents !== "object"
                || Array.isArray(dump.indexData.documents)
            ) {
                return false;
            }
            this.fileMetaCache.clear();
            this._clearResidentSearchResults();
            this.bodyIndex.deserialize(dump.indexData);
            const valid = new Set();
            for (const meta of dump.meta) {
                if (!meta || typeof meta.path !== "string" || this.isPathExcluded(meta.path)) continue;
                const file = this.app.vault.getAbstractFileByPath(meta.path);
                if (!(file instanceof TFile)) continue;
                // 首屏直接消费缓存，损坏条目交给后续逐文件校验，不能进入结果 Owner。
                if (typeof meta.name !== "string" || typeof meta.nameLower !== "string"
                    || !Array.isArray(meta.tags) || !meta.tags.every(tag => typeof tag === "string")
                    || !meta.properties || typeof meta.properties !== "object" || Array.isArray(meta.properties)
                    || typeof meta.extension !== "string" || !Number.isFinite(meta.mtime) || !Number.isFinite(meta.ctime)
                    || (meta.extension === "md" && typeof this.bodyIndex.documents.get(meta.path) !== "string")) continue;
                // 缓存只服务首屏；不以新 stat 覆盖已有创建历史。
                this.fileMetaCache.set(file.path, { ...meta, file,
                    fileModifiedAt: parseGLSDate(meta.fileModifiedAt) || parseGLSDate(meta.mtime) });
                valid.add(file.path);
            }
            for (const path of [...this.bodyIndex.documents.keys()]) {
                if (!valid.has(path)) this.bodyIndex.removeFile(path);
            }
            // 只恢复已验证格式的快照。正文/指纹校验归 fullRebuildMetaCache 的增量路径。
            // 即使没有后续文件变动，也必须让工作台丢弃启动早期读到的空项目快照。
            this._indexCacheRestored = true;
            this._publishIndexChanges();
            return true;
        } catch (e) { 
            console.warn("索引缓存加载失败，将重新构建", e);
            return false;
        }
    },
};

