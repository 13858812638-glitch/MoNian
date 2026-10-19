// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { CONTENT_TIME_CACHE_VERSION, parseGLSDate } from "../../data/time/time-values.js";
import { FULL_CONTENT_CACHE_LIMIT } from "../results/virtualization-config.js";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_content_cache_methods = {



    async _writablePluginDirectory() {
        // 只在实际写入时检查加载目录，不扫描、不猜测改名后的路径。
        // 检查入口文件而不是目录：旧目录可能已经被其他写入留下的 JSON 重建。
        const directory = this._pluginDirectory();
        if (
            !await this.app.vault.adapter.exists(`${directory}/main.js`)
            || directory !== this._pluginDirectory()
        ) {
            console.warn("插件目录已变化或缺少 main.js，已跳过保存；请重新启动 Obsidian。");
            return null;
        }
        return directory;
    },


    async saveContentTimeCache() {
        if (this._unloaded) return false;

        const dump = {
            version: CONTENT_TIME_CACHE_VERSION,
            entries: Array.from(
                this.contentTimeCache,
                ([path, entry]) => ({
                    path, ...entry
                })
            )
        };
        const jsonStr = JSON.stringify(dump);
        const snapshotDirectory = this._metadataDirectory();
        const writeTask = async () => {
            // 旧目录写入在迁移前会被等待；冻结目录防止热切换时错写。
            try {
                const directory = await this._ensureMetadataDirectory(snapshotDirectory);
                await this.app.vault.adapter.write(
                    `${directory}/${this._metadataContentFilename()}`,
                    jsonStr
                );
                return true;
            } catch (error) {
                console.warn("GLS 时间记录保存失败", error);
                return false;
            }
        };

        this._contentTimeWriteChain =
            this._contentTimeWriteChain.then(
                writeTask,
                writeTask
            );
        return this._contentTimeWriteChain;
    },



    async loadContentTimeCache() {
        if (this._unloaded) return false;
        try {
            const adapter = this.app.vault.adapter;
            const candidates = (await this._metadataSidecarFiles(this._metadataDirectory()))
                .filter(path => /(?:^|\/)(?:content-times-[a-zA-Z0-9_-]+|content-time-cache)\.json$/.test(path));
            const legacy = `${this._pluginDirectory()}/content-time-cache.json`;
            if (await adapter.exists(legacy)) candidates.push(legacy);
            const incoming = [];
            for (const path of candidates) {
                try {
                    const dump = JSON.parse(await adapter.read(path));
                    if (![1, 2, CONTENT_TIME_CACHE_VERSION].includes(dump?.version) || !Array.isArray(dump.entries)) continue;
                    for (const item of dump.entries) {
                        if (typeof item?.path !== "string" || !item.path.toLowerCase().endsWith(".md")) continue;
                        const entry = { createdAt: parseGLSDate(item.createdAt), createdSource: item.createdSource || "stored-history",
                            creationLocked: item.creationLocked === true,
                            fingerprint: String(item.fingerprint || ""), contentModifiedAt: parseGLSDate(item.contentModifiedAt),
                            contentSource: item.contentSource || "", fileModifiedAt: parseGLSDate(item.fileModifiedAt),
                            fileFingerprint: String(item.fileFingerprint || ""), fileSource: item.fileSource || "",
                            bodyUnverified: Boolean(item.bodyUnverified), fileUnverified: Boolean(item.fileUnverified) };
                        if (entry.createdAt || entry.contentModifiedAt || entry.fileModifiedAt) incoming.push({ path: item.path, entry, legacy: path === legacy });
                    }
                } catch (error) { console.warn("时间快照暂不可读，保留已有记录", path, error); }
            }
            if (this._unloaded) return false;
            // 迟到文件仍保留记录；已有创建值一经锁定不参与 min/max 竞争。
            for (const { path, entry, legacy: old } of incoming) {
                const prior = this.contentTimeCache.get(path);
                if (old && prior) continue;
                const next = !prior || Math.max(entry.fileModifiedAt, entry.contentModifiedAt)
                    > Math.max(prior.fileModifiedAt || 0, prior.contentModifiedAt || 0) ? { ...entry } : { ...prior };
                if (prior) {
                    // 正文和文件修改是独立字段；较新的标签时间不能遮掉另一分片的正文记录。
                    const body = entry.contentModifiedAt > (prior.contentModifiedAt || 0) ? entry : prior;
                    const whole = entry.fileModifiedAt > (prior.fileModifiedAt || 0) ? entry : prior;
                    for (const key of ["fingerprint", "contentModifiedAt", "contentSource", "bodyUnverified"]) next[key] = body[key];
                    for (const key of ["fileFingerprint", "fileModifiedAt", "fileSource", "fileUnverified"]) next[key] = whole[key];
                }
                if (prior?.creationLocked && parseGLSDate(prior.createdAt)) Object.assign(next, {
                    createdAt: prior.createdAt, createdSource: prior.createdSource, creationLocked: true
                });
                else if (!next.createdAt && prior?.createdAt) Object.assign(next, {
                    createdAt: prior.createdAt, createdSource: prior.createdSource, creationLocked: prior.creationLocked
                });
                this.contentTimeCache.set(path, next);
            }
            return incoming.length > 0;
        } catch (error) {
            console.warn("时间目录暂不可读，保留已有记录", error);
            return false;
        }
    },


    async getFileFullContent(file, { retain = true } = {}) {
        if (this._unloaded) return "";

        const filePath = file.path;
        const modifyTime = file.stat.mtime;
        const cacheItem = this.globalContentCache.get(filePath);
        if (retain && cacheItem && cacheItem.mtime === modifyTime) {
            // 只有真正作为 UI 工作集复用时才推进 LRU；索引读取不会扩大全文缓存。
            this.globalContentCache.delete(filePath);
            this.globalContentCache.set(filePath, cacheItem);
            return cacheItem.content;
        }

        if (cacheItem) this.globalContentCache.delete(filePath);
        const fullText = await (retain ? this.app.vault.cachedRead(file) : this.app.vault.read(file));
        if (this._unloaded) return fullText;

        if (
            this.app.vault.getAbstractFileByPath(filePath) !== file
            || file.path !== filePath
            || file.stat.mtime !== modifyTime
        ) {
            return fullText;
        }

        if (!retain) return fullText;

        while (this.globalContentCache.size >= FULL_CONTENT_CACHE_LIMIT) {
            const oldestKey = this.globalContentCache.keys().next().value;
            if (oldestKey === undefined) break;
            this.globalContentCache.delete(oldestKey);
        }
        this.globalContentCache.set(filePath, { content: fullText, mtime: modifyTime });
        return fullText;
    },


    // 索引缓存删除只有这一条正式路径；业务调用方只决定“何时淘汰”，
    // 不再分别维护 meta / body / full-content 三份缓存的清理顺序。
    _evictIndexedPath(path) {
        if (!path) return;
        this.fileMetaCache.delete(path);
        this._clearResidentSearchResults();
        this._externalMetaProjectionCache.delete(path);
        this.bodyIndex?.removeFile(path);
        this.globalContentCache.delete(path);
    },


    throttleSaveCache() {
        if (this._unloaded) return;
        if (this._persistTimer) clearTimeout(this._persistTimer);

        this._persistTimer = setTimeout(async () => {
            this._persistTimer = null;
            if (this._unloaded) return;

            try {
                // 定时持久化只能读取稳定索引快照，不能落在新 build / flush 中间。
                const activeBuild = this._indexBuildPromise;
                if (activeBuild) await activeBuild;
                if (this._unloaded) return;

                const activeFlush = this._indexFlushPromise;
                if (activeFlush) await activeFlush;
                if (this._unloaded) return;

                await this.saveIndexCache();
            } catch (error) {
                if (!this._unloaded) console.warn("索引缓存延迟保存失败", error);
            }
        }, 2000);
    },
};

