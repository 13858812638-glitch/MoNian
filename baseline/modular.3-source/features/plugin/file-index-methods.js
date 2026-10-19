// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { canvasNodeCountFromContent, excalidrawElementCountFromContent } from "../../data/formats/drawing-content.js";
import { hasExcalidrawFrontmatter, isExcalidrawMeta } from "../../data/formats/drawing-detection.js";
import { attachmentExtension, displayBasename, logicalFileType } from "../../data/formats/file-types.js";
import { normalizeUniqueTagList } from "../../data/tags/tag-values.js";
import { binaryTimeFingerprint, fastContentFingerprint, indexedFileProperties, isGLSTimeSidecarPath, markdownTimePayload, parseGLSDate, stableTimeProperties } from "../../data/time/time-values.js";
import { IoPool } from "../../services/IoPool.js";
import { cleanMarkdownForSnippet, extractCountableTextFromMarkdown, readableTokenCountFromText } from "../../utils/markdown-text.js";
import { isSameOrDescendantVaultPath } from "../../utils/vault-paths.js";
import { TFile } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_file_index_methods = {


    async _updateSingleFile(file) {
        if (this._unloaded) return false;
        if (!(file instanceof TFile)) return false;

        try {
            const expectedPath = file.path;
            const expectedMtime = file.stat.mtime;
            const expectedSize = file.stat.size;

            // 被排除的文件不入缓存，已存在的清掉。
            if (this.isPathExcluded(expectedPath)) {
                this._evictIndexedPath(expectedPath);
                return true;
            }

            const cache = this.app.metadataCache.getFileCache(file);
            let inlineTags = normalizeUniqueTagList(
                cache?.tags?.map(entry => entry?.tag) || []
            );
            const frontTagsRaw = cache?.frontmatter?.tags || [];
            const frontTags = normalizeUniqueTagList(
                Array.isArray(frontTagsRaw)
                    ? frontTagsRaw
                    : [frontTagsRaw]
            );
            // 索引保存标签的原始大小写；比较 / 去重才使用 tagIdentityKey。
            const allTags = normalizeUniqueTagList([
                ...frontTags,
                ...inlineTags
            ]);
            let properties = indexedFileProperties(file.extension.toLowerCase() === "md"
                ? cache?.frontmatter
                : this._nonMarkdownProperties(expectedPath));
            if (file.extension.toLowerCase() !== "md") {
                // 非 Markdown 的标签与普通属性同属 JSON，宿主缓存不作为第二来源。
                allTags.splice(0, allTags.length, ...normalizeUniqueTagList(
                    Array.isArray(properties.tags) ? properties.tags : properties.tags ? [properties.tags] : []
                ));
            }
            let ext = file.extension.toLowerCase();
            let content = "";
            let readableText = "";
            let snippet = "";
            let textCount = 0;
            let canvasNodeCount = 0;
            let excalidrawElementCount = null;
            let nonMarkdownFingerprint = "";
            // Excalidraw.md 共享 Markdown YAML 时间来源，但不改变原有绘图全文索引范围。
            let markdownTrackingContent = "";
            let markdownContentReady = false;
            let indexedMarkdownFingerprint = "";

            // Markdown 已需读取一次以建立正文与真实时间索引；直接使用内容 YAML
            // 判定 Excalidraw，避免新建 *_绘图.md 后 MetadataCache 尚未就绪时误归为笔记。
            // 同一份原文用于类型识别、元素计数与时间指纹，不产生第二份写入状态。
            let markdownPayload = null;
            if (ext === "md") {
                try {
                    markdownTrackingContent = await this.getFileFullContent(file, { retain: false });
                    markdownContentReady = true;
                    markdownPayload = markdownTimePayload(markdownTrackingContent);
                } catch (error) {
                    console.warn(`索引 Markdown 失败：${file.path}`, error);
                    return false;
                }
            }
            const isMarkdownExcalidraw = ext === "md" && (
                isExcalidrawMeta(file, cache)
                || hasExcalidrawFrontmatter(markdownPayload?.frontmatter)
            );

            // Excalidraw 直接解析文件本身，不依赖 Excalidraw 插件是否启用、
            // 是否已初始化或当前是否打开绘图视图。支持 json / compressed-json。
            if (isMarkdownExcalidraw || ext === "excalidraw") {
                ext = "excalidraw";
                try {
                    const raw = markdownContentReady
                        ? markdownTrackingContent
                        : await this.getFileFullContent(file, { retain: false });
                    excalidrawElementCount = excalidrawElementCountFromContent(raw);
                } catch (_) {
                    // 未能可靠解析时保留 null；结果卡不伪装成“0 个元素”。
                    return false;
                }
            } else if (ext === "md") {
                content = markdownTrackingContent;
                readableText = cleanMarkdownForSnippet(content);
                const snippetMaxLen = this.settings.snippetMaxLen || 200;
                snippet = readableText.length > snippetMaxLen
                    ? readableText.slice(0, snippetMaxLen) + "…"
                    : readableText;

                const countableText = extractCountableTextFromMarkdown(content);
                textCount = readableTokenCountFromText(countableText);
                // 正文指纹会在文件路径 / mtime 二次稳定性校验通过后再提交，
                // 避免读取期间再次保存时把旧正文误写进 tracker。
            } else if (ext === "canvas" || ext === "base") {
                // Canvas/Base 原始文件用于指纹，不把它们加入 Markdown 全文索引。
                // Canvas 节点数只在索引阶段读取一次。
                // 解析失败仅回退 0，不阻断文件索引，也不把 Canvas 正文加入全文缓存。
                try {
                    const raw = await this.getFileFullContent(file, { retain: false });
                    // Base 只供时间指纹，不悄悄改变原有全文检索范围。
                    if (ext === "canvas") {
                        content = raw;
                        canvasNodeCount = canvasNodeCountFromContent(raw);
                    }
                    nonMarkdownFingerprint = fastContentFingerprint(raw);
                } catch (_) {
                    if (ext === "canvas") canvasNodeCount = 0;
                }
            }

            // 小型 PDF/其它二进制可以核对真实字节指纹；大文件不额外读取以免拖慢索引。
            // 大文件读取已有记录；缺值只初始化一次，成功的本机写 API 仍会维护其时间。
            if (ext !== "md" && !nonMarkdownFingerprint && file.extension.toLowerCase() !== "md"
                && Number(file.stat?.size) <= 2 * 1024 * 1024 && typeof this.app.vault.readBinary === "function") {
                try {
                    nonMarkdownFingerprint = binaryTimeFingerprint(await this.app.vault.readBinary(file));
                } catch (_) { /* 不影响正文索引 */ }
            }

            if (this._unloaded) return false;

            const liveFile =
                this.app.vault.getAbstractFileByPath(expectedPath);

            if (
                liveFile !== file
                || file.path !== expectedPath
                || file.stat.mtime !== expectedMtime
                || file.stat.size !== expectedSize
            ) {
                this._evictIndexedPath(expectedPath);
                if (!this._unloaded && file.path) {
                    const current =
                        this.app.vault.getAbstractFileByPath(file.path);
                    if (current === file) {
                        this._queueFileIndex(file.path);
                    }
                }
                return false;
            }

            if (this.isPathExcluded(expectedPath)) {
                this._evictIndexedPath(expectedPath);
                return true;
            }

            // 当前文件的 YAML 始终从已经读取的 Markdown 内容解析，不采用可能
            // 滞后的 MetadataCache Frontmatter；这保证只改 YAML / 新建空正文亦能识别。
            const liveMarkdownFrontmatter = markdownPayload?.frontmatter;
            if (liveMarkdownFrontmatter) {
                inlineTags = normalizeUniqueTagList((cache?.tags || []).filter(entry => {
                    const start = entry?.position?.start?.offset, end = entry?.position?.end?.offset;
                    return Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start
                        && markdownTrackingContent.slice(start, end) === entry.tag;
                }).map(entry => entry.tag));
                properties = indexedFileProperties(liveMarkdownFrontmatter);
                const rawTags = liveMarkdownFrontmatter.tags;
                const currentFrontTags = normalizeUniqueTagList(Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : []);
                allTags.splice(0, allTags.length, ...normalizeUniqueTagList([...currentFrontTags, ...inlineTags]));
            }

            // 正式时间与索引一次提交；系统 mtime 仅保留为缓存失效信号。
            let markdownTimes = null;
            if (file.extension.toLowerCase() === "md" && markdownContentReady) {
                const payload = markdownPayload;
                indexedMarkdownFingerprint = payload.fingerprint;
                markdownTimes = this._markdownTimeFromFile(file, payload.frontmatter, payload.fingerprint,
                    expectedMtime, this.contentTimeCache.get(expectedPath), 0, payload.fileFingerprint);
                this._setContentTimeEntry(expectedPath, markdownTimes);
                const fm = payload.frontmatter;
                const needsStamp = parseGLSDate(fm.gls_created_at) !== markdownTimes.createdAt
                    || (!markdownTimes.bodyUnverified && (parseGLSDate(fm.gls_body_modified_at) !== markdownTimes.contentModifiedAt
                        || fm.gls_body_fingerprint !== payload.fingerprint))
                    || (!markdownTimes.fileUnverified && (parseGLSDate(fm.gls_file_modified_at) !== markdownTimes.fileModifiedAt
                        || fm.gls_file_fingerprint !== payload.fileFingerprint));
                if (needsStamp) this._scheduleMarkdownStamp(file);
            }
            const fileTime = file.extension.toLowerCase() === "md" ? null
                : this._resolveNonMarkdownTimes(file, nonMarkdownFingerprint);
            const recordedTimes = markdownTimes || fileTime;

            const displayName = displayBasename(file, ext);
            const meta = {
                file,
                path: expectedPath,
                name: displayName,
                nameLower: displayName.toLowerCase(),
                tags: allTags,
                inlineTags,
                properties,
                mtime: expectedMtime,
                statSize: expectedSize,
                validationStamp: this._indexValidationStamp(file, liveMarkdownFrontmatter),
                ctime: recordedTimes?.createdAt || 0,
                fileModifiedAt: recordedTimes?.fileModifiedAt || 0,
                contentModifiedAt: recordedTimes?.contentModifiedAt || 0,
                timeCreatedSource: recordedTimes?.createdSource || "initial-value",
                timeContentSource: recordedTimes?.contentSource || "initial-value",
                timeFileSource: recordedTimes?.fileSource || "initial-value",
                timeFileFingerprint: recordedTimes?.fileFingerprint || "",
                // Sidecar 可在下次启动索引缓存恢复后按内容指纹重新合并 NAS 多端时间。
                timeFingerprint: fileTime?.fingerprint || indexedMarkdownFingerprint,
                extension: ext,
                snippet,
                textCount,
                canvasNodeCount,
                excalidrawElementCount
            };

            this.fileMetaCache.set(expectedPath, meta);
            this._clearResidentSearchResults();
            this.bodyIndex.removeFile(expectedPath);
            this.bodyIndex.addFile(meta, content, readableText);
            return true;
        } catch (error) {
            console.warn(`单文件索引失败：${file.path}`, error);
            return false;
        }
    },


    // 判断路径是否落在任一被全局排除的文件夹内（前缀匹配，子文件夹自动覆盖）。
    // 全局排除会影响索引与共享文件夹 Picker，是插件工作范围边界。
    isPathExcluded(path) {
        return isGLSTimeSidecarPath(path)
            || (this._metadataDirectorySafe !== false
                && isSameOrDescendantVaultPath(path, this._metadataDirectory()))
            || (this.settings.excludedFolders || []).some(folder =>
                isSameOrDescendantVaultPath(path, folder)
            );
    },


    // 结果视图排除只是一层“工作区可见性”偏好：
    // 文件仍保留在索引中，也仍可作为创建 / 移动 / 模板等操作目标。
    isResultPathExcluded(path) {
        return (this.settings.resultExcludedFolders || []).some(folder =>
            isSameOrDescendantVaultPath(path, folder)
        );
    },


    isResultAttachmentTypeExcluded(meta) {
        const excluded = this.settings.resultExcludedAttachmentTypes;
        return Boolean(excluded?.length) && logicalFileType(meta) === "attachment"
            && excluded.includes(attachmentExtension(meta));
    },


    async buildMetaCache() {
        if (this._unloaded) return;
        if (this._indexBuildPromise) return this._indexBuildPromise;

        this._indexBuildPromise = (async () => {
            const activeFlush = this._indexFlushPromise;
            if (activeFlush) {
                await activeFlush;
            }
            if (this._unloaded) return;

            const files = this.app.vault.getFiles().filter(file => !this.isPathExcluded(file.path));
            this.fileMetaCache.clear();
            this._clearResidentSearchResults();
            this.bodyIndex.clear();
            this.globalContentCache.clear();

            const pool = new IoPool(this.settings.ioConcurrentLimit);
            await pool.forEach(files, file => this._updateSingleFile(file), () => !this._unloaded);

            if (this._unloaded) return;
            this._publishIndexChanges();
            this.throttleSaveCache();
        })();

        try {
            await this._indexBuildPromise;
        } finally {
            this._indexBuildPromise = null;
        }
    },


    _indexValidationStamp(file, parsedFrontmatter = undefined) {
        // stat 只判缓存是否需要重读，绝不用于生成插件时间。
        // 同步可能保留 stat；同时比较宿主已解析 YAML 与本插件 JSON 的内容快照。
        if (file.extension.toLowerCase() === "md") {
            const host = this.app.metadataCache.getFileCache(file);
            if (!host && parsedFrontmatter === undefined) return null;
            const properties = { ...(parsedFrontmatter ?? host?.frontmatter ?? {}) };
            delete properties.position;
            return stableTimeProperties([properties, host?.tags || [], this.contentTimeCache.get(file.path) || null]);
        }
        return stableTimeProperties(this._nonMarkdownRecords.get(file.path) || []);
    },


    _needsIndexRefresh(file, cached = this.fileMetaCache.get(file.path)) {
        if (!cached || cached.mtime !== file.stat.mtime || !Number.isFinite(cached.statSize)
            || cached.statSize !== file.stat.size || typeof cached.validationStamp !== "string") return true;
        try {
            const stamp = this._indexValidationStamp(file);
            return stamp === null || stamp !== cached.validationStamp;
        } catch (_) {
            // 单份宿主元数据异常不能中止其他文件的校验；真实读盘仍走逐文件隔离。
            return true;
        }
    },


    async fullRebuildMetaCache() {
        if (this._unloaded) return;
        if (this._indexBuildPromise) {
            return this._indexBuildPromise;
        }

        this._indexBuildPromise = (async () => {
            const activeFlush = this._indexFlushPromise;
            if (activeFlush) {
                await activeFlush;
            }
            if (this._unloaded) return;

            const allFiles = this.app.vault.getFiles();
            const vaultPaths = new Set(
                allFiles.map(file => file.path)
            );
            const indexableFiles = allFiles.filter(
                file => !this.isPathExcluded(file.path)
            );

            let hasChange = false;
            const toUpdate = [];

            for (const file of indexableFiles) {
                if (this._needsIndexRefresh(file)) toUpdate.push(file);
            }

            if (toUpdate.length > 0) {
                const pool = new IoPool(
                    this.settings.ioConcurrentLimit
                );
                let failedCount = 0;
                await pool.forEach(toUpdate, async file => {
                    if (await this._updateSingleFile(file)) hasChange = true;
                    else failedCount++;
                }, () => !this._unloaded);
                if (this._unloaded) return;

                if (failedCount) {
                    console.warn(
                        `完整索引校验有 ${failedCount} 个文件未能更新，将保留可用旧缓存或等待后续事件重试`
                    );
                }
            }

            for (const path of [
                ...this.fileMetaCache.keys()
            ]) {
                if (
                    !vaultPaths.has(path)
                    || this.isPathExcluded(path)
                ) {
                    this._evictIndexedPath(path);
                    hasChange = true;
                }
            }

            if (this._unloaded) return;

            if (hasChange) {
                this._publishIndexChanges();
                this.throttleSaveCache();
            }
        })();

        try {
            await this._indexBuildPromise;
        } finally {
            this._indexBuildPromise = null;
        }
    },
};

