// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { binaryTimeFingerprint, fastContentFingerprint, indexedFileProperties, markdownTimePayload, parseGLSDate, resolveTrackedModification, stableTimeProperties } from "../../data/time/time-values.js";
import { NO_FRONTMATTER_WRITE } from "../../services/BatchMetadataService.js";
import { IoPool } from "../../services/IoPool.js";
import { MarkdownView, TFile, parseYaml, stringifyYaml } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_markdown_write_tracking_methods = {


    // 唯一 Markdown 时间解析：先算最终值，再一并提交 tracker/索引。
    // 创建时间仅在缺失时初始化；普通修改不再从变化的 stat 重新生成。

    _markdownTimeFromFile(file, frontmatter = {}, fingerprint = "", fallback = 0,
        olderTracker = this.contentTimeCache.get(file.path), localAt = 0, fileFingerprint = "", metadataOnly = false) {
        const fm = frontmatter || {};
        const indexed = this.fileMetaCache.get(file.path);
        const prior = olderTracker || (indexed ? {
            createdAt: indexed.ctime, createdSource: indexed.timeCreatedSource,
            fingerprint: indexed.timeFingerprint, contentModifiedAt: indexed.contentModifiedAt,
            contentSource: indexed.timeContentSource, fileModifiedAt: indexed.fileModifiedAt || indexed.mtime,
            fileFingerprint: indexed.timeFileFingerprint, fileSource: indexed.timeFileSource
        } : {});
        const yamlCreated = parseGLSDate(fm.gls_created_at);
        const knownCreated = parseGLSDate(prior.createdAt);
        const legacyCreated = parseGLSDate(fm.created_at) || parseGLSDate(fm.created);
        const createdAt = (prior.creationLocked && knownCreated) || yamlCreated || knownCreated
            || legacyCreated || parseGLSDate(file.stat?.ctime);
        const createdSource = prior.creationLocked && knownCreated ? prior.createdSource
            : yamlCreated ? fm.gls_created_source || "file-yaml"
                : knownCreated ? prior.createdSource || "stored-history"
                    : legacyCreated ? "existing-property" : "initial-value";
        const previousFileFingerprint = prior.fileFingerprint || (indexed?.timeFingerprint
            ? fastContentFingerprint(indexed.timeFingerprint + "\n" + stableTimeProperties(indexed.properties || {})) : "");
        const body = resolveTrackedModification({ fingerprint, previousFingerprint: prior.fingerprint,
            previousAt: prior.contentModifiedAt, previousSource: prior.contentSource,
            storedFingerprint: fm.gls_body_fingerprint, storedAt: fm.gls_body_modified_at, localAt: metadataOnly ? 0 : localAt,
            initialAt: parseGLSDate(fm.updated) || parseGLSDate(fm.updated_at) || parseGLSDate(fm.modified)
                || parseGLSDate(fm.modified_at) || parseGLSDate(fallback) || createdAt });
        const whole = resolveTrackedModification({ fingerprint: fileFingerprint, previousFingerprint: previousFileFingerprint,
            previousAt: prior.fileModifiedAt, previousSource: prior.fileSource,
            storedFingerprint: fm.gls_file_fingerprint, storedAt: fm.gls_file_modified_at, localAt,
            initialAt: parseGLSDate(fallback) || createdAt });
        const unverified = (fp, before, stored, at, pending, provenAt = localAt) => Boolean(!provenAt
            && !(stored === fp && parseGLSDate(at)) && (pending || (before && fp && before !== fp)));
        return { createdAt, createdSource, fingerprint, fileFingerprint,
            contentModifiedAt: body.at, contentSource: body.source,
            fileModifiedAt: whole.at, fileSource: whole.source,
            bodyUnverified: unverified(fingerprint, prior.fingerprint, fm.gls_body_fingerprint, fm.gls_body_modified_at, prior.bodyUnverified, metadataOnly ? 0 : localAt),
            fileUnverified: unverified(fileFingerprint, previousFileFingerprint, fm.gls_file_fingerprint, fm.gls_file_modified_at, prior.fileUnverified) };
    },



    _markdownEditorViews(file) {
        const workspace = this.app.workspace;
        const active = MarkdownView && workspace.getActiveViewOfType?.(MarkdownView);
        const views = [active, ...(workspace.getLeavesOfType?.("markdown") || []).map(leaf => leaf.view)];
        return [...new Set(views)].filter(view => view?.file === file && view.editor
            && typeof view.editor.getValue === "function" && typeof view.editor.replaceRange === "function"
            && (typeof view.getMode !== "function" || view.getMode() === "source"));
    },


    async _editMarkdownFrontmatter(file, transform, acceptRaw = null) {
        // 打开的 source buffer 拥有写入权；和 Dida 绑定笔记一样，用最小 editor patch，
        // 再交给宿主 save。不能在用户的 buffer 背后 processFrontMatter 写盘制造外部合并。
        const views = this._markdownEditorViews(file);
        if (!views.length) {
            const editorOpened = Symbol("editor-opened");
            try {
                return await this.app.fileManager.processFrontMatter(file, fm => {
                    if (this._markdownEditorViews(file).length) throw editorOpened;
                    transform(fm);
                });
            } catch (error) {
                if (error !== editorOpened) throw error;
                return this._editMarkdownFrontmatter(file, transform, acceptRaw);
            }
        }
        const view = views[0], raw = view.editor.getValue();
        if (typeof view.save !== "function") throw new Error("当前编辑器不支持安全保存，已保留原文");
        if (views.some(other => other.editor.getValue() !== raw))
            throw new Error("同一文件存在未合并的编辑，属性未写入");
        if (acceptRaw && !acceptRaw(raw)) throw NO_FRONTMATTER_WRITE;
        const bom = raw.startsWith("\uFEFF") ? "\uFEFF" : "";
        const text = raw.slice(bom.length), eol = text.includes("\r\n") ? "\r\n" : "\n";
        const header = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?=\r?\n|$)/.exec(text);
        if (!header && /^---[ \t]*(?:\r?\n|$)/.test(text)) throw new Error("YAML 属性区未闭合，已保留原文");
        const fm = header ? parseYaml(header[1] || "") ?? {} : {};
        if (!fm || typeof fm !== "object" || Array.isArray(fm)) throw new Error("YAML 属性区必须是对象");
        transform(fm);
        const yaml = stringifyYaml(fm).replace(/\r?\n/g, eol);
        const next = bom + "---" + eol + yaml + (yaml.endsWith(eol) ? "" : eol) + "---"
            + (header ? text.slice(header[0].length) : eol + text);
        if (next === raw) return;
        if (this._unloaded || this.app.vault.getAbstractFileByPath(file.path) !== file) throw NO_FRONTMATTER_WRITE;
        let start = 0, end = raw.length, nextEnd = next.length;
        while (start < Math.min(end, nextEnd) && raw[start] === next[start]) start++;
        while (end > start && nextEnd > start && raw[end - 1] === next[nextEnd - 1]) { end--; nextEnd--; }
        const position = offset => {
            const lines = raw.slice(0, offset).split("\n");
            return { line: lines.length - 1, ch: lines[lines.length - 1].length };
        };
        for (const target of views) {
            // 同文件的宿主编辑器可能共享文档；已同步到 next 的实例不重复提交。
            if (target.editor.getValue() === next) continue;
            target.editor.replaceRange(next.slice(start, nextEnd), position(start), position(end));
        }
        await view.save();
    },


    _scheduleMarkdownStamp(file) {
        const path = file.path;
        if (this._unloaded || this._markdownStampTasks.has(path)) return;
        this._markdownTimeWritePool ||= new IoPool(Math.min(4, this.settings.ioConcurrentLimit || 4));
        let attemptedRecord = null;
        const stamp = this._markdownTimeWritePool.run(async () => {
            try {
                if (this._unloaded || this.app.vault.getAbstractFileByPath(path) !== file) return;
                const record = this.contentTimeCache.get(path);
                attemptedRecord = record;
                if (!record) return;
                const raw = await this.app.vault.read(file);
                const payload = markdownTimePayload(raw);
                if (payload.fingerprint !== record.fingerprint || payload.fileFingerprint !== record.fileFingerprint) return;
                const expectedMtime = file.stat.mtime;
                await this._editMarkdownFrontmatter(file, fm => {
                    if (this._unloaded || this.app.vault.getAbstractFileByPath(path) !== file
                        || file.stat.mtime !== expectedMtime || this.contentTimeCache.get(path) !== record) throw NO_FRONTMATTER_WRITE;
                    let changed = false;
                    const assign = (key, value) => { if (fm[key] !== value) { fm[key] = value; changed = true; } };
                    if (record.createdAt) {
                        assign("gls_created_at", new Date(record.createdAt).toISOString());
                        assign("gls_created_source", record.createdSource);
                    }
                    if (!record.bodyUnverified && record.contentModifiedAt) {
                        assign("gls_body_modified_at", new Date(record.contentModifiedAt).toISOString());
                        assign("gls_body_fingerprint", record.fingerprint);
                    }
                    if (!record.fileUnverified && record.fileModifiedAt) {
                        assign("gls_file_modified_at", new Date(record.fileModifiedAt).toISOString());
                        assign("gls_file_fingerprint", record.fileFingerprint);
                    }
                    if (!changed) throw NO_FRONTMATTER_WRITE;
                }, current => {
                    const value = markdownTimePayload(current);
                    return value.fingerprint === record.fingerprint && value.fileFingerprint === record.fileFingerprint;
                });
                this._queueFileIndex(path);
            } catch (error) {
                if (error !== NO_FRONTMATTER_WRITE && !this._unloaded) console.warn("GLS 时间写入失败，固定记录保留在元数据目录", path, error);
            }
        });
        this._markdownStampTasks.set(path, stamp);
        void stamp.finally(() => {
            if (this._markdownStampTasks.get(path) === stamp) this._markdownStampTasks.delete(path);
            // 等待写入期间的新记录需要再走一次索引；失败的同一记录不无限重试。
            if (!this._unloaded && attemptedRecord && this.contentTimeCache.get(path) !== attemptedRecord
                && this.app.vault.getAbstractFileByPath(path) === file) this._queueFileIndex(path);
        });
    },



    _timePayload(file, data) {
        if (file.extension.toLowerCase() === "md") return markdownTimePayload(data);
        const textFile = ["canvas", "base"].includes(file.extension.toLowerCase());
        const fingerprint = textFile
            ? fastContentFingerprint(typeof data === "string" ? data : new TextDecoder().decode(data))
            : binaryTimeFingerprint(typeof data === "string" ? new TextEncoder().encode(data).buffer : data);
        return { fingerprint, fileFingerprint: fingerprint };
    },


    _recordFileWrite(file, before, after, at, initialStats = file.stat, metadataOnly = false) {
        if (this._unloaded || this.app.vault.getAbstractFileByPath(file.path) !== file || this.isPathExcluded(file.path)
            || !before || !after || before.fileFingerprint === after.fileFingerprint) return;
        if (file.extension.toLowerCase() === "md") {
            let prior = this.contentTimeCache.get(file.path);
            if (!prior?.fingerprint || !prior?.fileFingerprint) {
                prior = this._markdownTimeFromFile({ path: file.path, stat: initialStats }, before.frontmatter,
                    before.fingerprint, initialStats.mtime, prior, 0, before.fileFingerprint);
            }
            const next = this._markdownTimeFromFile(file, after.frontmatter, after.fingerprint,
                initialStats.mtime, prior, at, after.fileFingerprint, metadataOnly);
            this._setContentTimeEntry(file.path, next);
        } else {
            if (!this._nonMarkdownLocal.get(file.path)?.fingerprint) {
                this._resolveNonMarkdownTimes(file, before.fingerprint, 0, initialStats);
            }
            this._resolveNonMarkdownTimes(file, after.fingerprint, at, initialStats);
        }
        this.globalContentCache.delete(file.path);
        this._queueFileIndex(file.path);
    },


    _installTimeWriteCapture() {
        // 只有成功执行的宿主写 API 才是本机写入证据；vault.modify 通知也可能来自同步。
        // 只观察参数/结果，不改宿主写入内容；卸载时归还原方法。
        const plugin = this;
        const wrap = (owner, name, kind) => {
            const original = owner?.[name];
            if (typeof original !== "function") return;
            let enabled = true;
            const wrapped = async function(file, value, ...rest) {
                if (!enabled || plugin._unloaded || !(file instanceof TFile) || plugin.isPathExcluded(file.path)) {
                    return original.call(this, file, value, ...rest);
                }
                const stats = { ...file.stat };
                let before = null, after = null;
                let argument = value;
                try {
                    if (kind === "process") {
                        argument = data => {
                            const next = value(data);
                            try { before = plugin._timePayload(file, data); after = plugin._timePayload(file, next); }
                            catch (error) { console.warn("GLS 未采纳不可解析的写入时间", error); }
                            return next;
                        };
                    } else {
                        const data = kind === "binary" ? await plugin.app.vault.readBinary(file) : await plugin.app.vault.read(file);
                        before = plugin._timePayload(file, data);
                        if (kind === "frontmatter") {
                            argument = fm => {
                                value(fm);
                                try {
                                    const fingerprint = before.fingerprint;
                                    after = { frontmatter: { ...fm }, fingerprint,
                                        fileFingerprint: fastContentFingerprint(fingerprint + "\n" + stableTimeProperties(indexedFileProperties(fm))) };
                                } catch (error) { after = null; console.warn("GLS 未采纳不可解析的属性写入时间", error); }
                            };
                        } else after = plugin._timePayload(file, value);
                    }
                } catch (error) { console.warn("GLS 写入前时间读取失败，宿主操作继续", error); }
                const result = await original.call(this, file, argument, ...rest);
                const at = Date.now();
                try {
                    if (kind === "frontmatter" && before && after && before.fileFingerprint !== after.fileFingerprint) {
                        // 属性写入期间正文可能已被另一笔保存更新；只确认本次属性，绝不借此推进正文时间。
                        const actual = markdownTimePayload(await plugin.app.vault.read(file));
                        if (stableTimeProperties(indexedFileProperties(actual.frontmatter))
                            !== stableTimeProperties(indexedFileProperties(after.frontmatter))) {
                            plugin._queueFileIndex(file.path);
                            return result;
                        }
                        after = actual;
                    }
                    plugin._recordFileWrite(file, before, after, at, stats, kind === "frontmatter");
                }
                catch (error) { console.warn("GLS 写入时间记录失败", error); }
                return result;
            };
            owner[name] = wrapped;
            this._timeWriteDisposers.push(() => {
                enabled = false;
                if (owner[name] === wrapped) owner[name] = original;
            });
        };
        wrap(this.app.vault, "modify", "text");
        wrap(this.app.vault, "modifyBinary", "binary");
        wrap(this.app.vault, "process", "process");
        wrap(this.app.fileManager, "processFrontMatter", "frontmatter");
        for (const name of ["create", "createBinary", "copy"]) {
            const vault = this.app.vault, original = vault[name];
            if (typeof original !== "function") continue;
            let enabled = true;
            const wrapped = async function(...args) {
                const file = await original.apply(this, args);
                if (!enabled || plugin._unloaded || !(file instanceof TFile) || plugin.isPathExcluded(file.path)) return file;
                try {
                    if (file.extension.toLowerCase() === "md") {
                        const payload = markdownTimePayload(await vault.read(file));
                        const fm = payload.frontmatter;
                        // 携带完整 GLS 记录的传入文件按已有记录读取；明确复制命令生成新身份。
                        const imported = name !== "copy" && parseGLSDate(fm.gls_created_at)
                            && fm.gls_body_fingerprint === payload.fingerprint
                            && fm.gls_file_fingerprint === payload.fileFingerprint;
                        if (!imported) {
                            const at = Date.now();
                            plugin._noteOwnedCreation(file, at);
                            plugin._setContentTimeEntry(file.path, { createdAt: at, createdSource: "local-create",
                                fingerprint: payload.fingerprint, contentModifiedAt: at, contentSource: "local-edit",
                                fileFingerprint: payload.fileFingerprint, fileModifiedAt: at, fileSource: "local-edit" });
                        }
                    } else plugin._noteOwnedCreation(file, Date.now());
                    plugin._queueFileIndex(file.path);
                } catch (error) { console.warn("GLS 新建时间记录暂不可读，等待索引", error); }
                return file;
            };
            vault[name] = wrapped;
            this._timeWriteDisposers.push(() => { enabled = false; if (vault[name] === wrapped) vault[name] = original; });
        }
    },


    _noteOwnedCreation(file, at = Date.now()) {
        if (!(file instanceof TFile)) return;
        this.contentTimeCache.delete(file.path);
        this.fileMetaCache.delete(file.path);
        this._clearResidentSearchResults();
        this.globalContentCache.delete(file.path);
        if (file.extension.toLowerCase() !== "md") {
            this._nonMarkdownLocal.delete(file.path);
            this._nonMarkdownRecords.delete(file.path);
            this._ownedFileCreations.set(file.path, at);
        }
    },


    _timeRecordValid(entry) {
        return !!entry && typeof entry.path === "string" && entry.path.length > 0
            && Number.isFinite(Number(entry.createdAt)) && Number(entry.createdAt) > 0;
    },
};

