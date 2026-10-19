// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { validateEditablePropertyKey } from "../data/properties/property-types.js";
import { normalizeUniqueTagList } from "../data/tags/tag-values.js";
import { fastContentFingerprint, indexedFileProperties, markdownBodyFingerprint, stableTimeProperties } from "../data/time/time-values.js";
import { isSameOrDescendantVaultPath, normalizeVaultFolderPath } from "../utils/vault-paths.js";
import { Notice, TFile, TFolder } from "obsidian";


// ========== 文件操作服务：搜索结果与独立 Command 共用同一底层实现 ==========
export class FileOperationService {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this._targetLeases = new Set();
        // Runtime object identity only; recovery metadata remains in CreateDraft.
        this._pendingCreationFiles = new Map();
    }

    assertCurrent(file) {
        if (this.plugin._unloaded) throw new Error("插件已停用，未继续写入");
        if (!(file instanceof TFile || file instanceof TFolder)
            || this.app.vault.getAbstractFileByPath(file.path) !== file) {
            throw new Error("目标文件已删除或被替换，请重新选择");
        }
    }

    async withTargets(files, operation, destinations = []) {
        if (this.plugin._unloaded) throw new Error("插件已停用，未继续写入");
        const targets = [...new Set(files || [])];
        for (const file of targets) this.assertCurrent(file);
        const paths = [...new Set([...targets.map(file => file.path), ...destinations])];
        for (const lease of this._targetLeases) {
            if (paths.some(path => lease.some(active =>
                isSameOrDescendantVaultPath(path, active)
                || isSameOrDescendantVaultPath(active, path)
            ))) throw new Error("目标文件或目录正在处理，请稍后重试");
        }
        // 占用范围包括重命名的两端及目录子树；其它文件仍可同时操作。
        // 仅活跃调用持有，成功、异常均释放；不排队重放旧用户意图。
        this._targetLeases.add(paths);
        try {
            return await operation();
        } finally {
            this._targetLeases.delete(paths);
        }
    }

    createFolder(rawPath, { allowExisting = false } = {}) {
        const path = normalizeVaultFolderPath(rawPath);
        if (!path || /[<>:"|?*\x00-\x1f]/.test(path)) {
            throw new Error("请输入有效的文件夹名称，不能包含 .、.. 或特殊路径字符");
        }
        return this.withTargets([], async () => {
            const existing = this.app.vault.getAbstractFileByPath(path);
            if (existing) {
                if (allowExisting && existing instanceof TFolder) return existing;
                throw new Error(`目标路径已存在：${path}`);
            }
            let current = "";
            let folder;
            for (const part of path.split("/")) {
                current = current ? `${current}/${part}` : part;
                const item = this.app.vault.getAbstractFileByPath(current);
                if (item && !(item instanceof TFolder)) {
                    throw new Error(`目标路径不是文件夹：${current}`);
                }
                folder = item || await this.app.vault.createFolder(current);
            }
            return folder;
        }, [path]);
    }

    createFile(path, content, metadata = null) {
        return this.withTargets([], async () => {
            if (metadata) metadata = { ...metadata,
                properties: (metadata.properties || []).map(([key, value]) => [validateEditablePropertyKey(key), value]),
                tags: normalizeUniqueTagList(metadata.tags || []) };

            if (this.app.vault.getAbstractFileByPath(path)) {
                throw new Error(`目标路径已存在：${path}`);
            }
            const file = await this.app.vault.create(path, content);
            const createdAt = Date.now();
            try {
                this.plugin._noteOwnedCreation(file, createdAt);
                await this._writeCreatedMetadata(file, content, metadata, createdAt);
            } catch (cause) {
                this._pendingCreationFiles.set(file.path, file);
                let currentContent = content;
                try { currentContent = await this.app.vault.read(file); } catch (_) {}
                const error = new Error(`文件已创建，但属性尚未完成：${cause?.message || cause}`);
                error.pendingCreation = {
                    path: file.path,
                    createdAt,
                    ctime: Number(file.stat?.ctime) || 0,
                    contentFingerprint: fastContentFingerprint(currentContent),
                    propertyFingerprint: file.extension.toLowerCase() === "md" ? null
                        : fastContentFingerprint(stableTimeProperties(this.plugin._nonMarkdownProperties(file.path))),
                    metadata: JSON.parse(JSON.stringify(metadata || { tags: [], properties: [] }))
                };
                error.createdFile = file;
                throw error;
            }
            return file;
        }, [path]);
    }

    async _writeCreatedMetadata(file, content, metadata, createdAt, propertyFingerprint = null) {
        this.assertCurrent(file);
        if (file.extension.toLowerCase() === "md") {
            await this.app.fileManager.processFrontMatter(file, fm => {
                    this.assertCurrent(file);
                    // 明确新建才生成新创建时间；模板的内部时间不属于这个新文件。
                    fm.gls_created_at = new Date(createdAt).toISOString();
                    fm.gls_created_source = "gls-created";
                    fm.gls_body_modified_at = new Date(createdAt).toISOString();
                    fm.gls_body_fingerprint = markdownBodyFingerprint(content);
                    if (metadata?.tags?.length) {
                        const existing = Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : [];
                        fm.tags = [...new Set([
                            ...existing.map(tag => String(tag).replace(/^#/, "")),
                            ...metadata.tags
                        ])];
                    }
                    for (const [key, value] of metadata?.properties || []) {
                        if (value === undefined) delete fm[key];
                        else fm[key] = value;
                    }
                    fm.gls_file_modified_at = new Date(createdAt).toISOString();
                    fm.gls_file_fingerprint = fastContentFingerprint(
                        fm.gls_body_fingerprint + "\n" + stableTimeProperties(indexedFileProperties(fm)));
            });
        } else if (metadata && (metadata.tags?.length || metadata.properties?.length)) {
            await this.plugin._editNonMarkdownProperties(file, data => {
                    this.assertCurrent(file);
                    if (propertyFingerprint !== null
                        && fastContentFingerprint(stableTimeProperties(data)) !== propertyFingerprint) {
                        throw new Error("已创建文件的属性已发生变化，请打开文件检查，或保留文件并返回");
                    }
                    if (metadata.tags?.length) data.tags = [...new Set([...(Array.isArray(data.tags) ? data.tags : []), ...metadata.tags])];
                    for (const [key, value] of metadata.properties || []) {
                        if (value === undefined) delete data[key];
                        else data[key] = value;
                    }
                    return "changed";
            });
        }
    }

    resumeCreationMetadata(pending) {
        const file = this.app.vault.getAbstractFileByPath(pending?.path || "");
        if (!(file instanceof TFile)) throw new Error("已创建文件已不存在，请保留当前状态并返回检查");
        const original = this._pendingCreationFiles.get(pending.path);
        if (original && original !== file) throw new Error("已创建文件已被替换，请打开文件检查");
        return this.withTargets([file], async () => {
            const content = await this.app.vault.read(file);
            this.assertCurrent(file);
            if (!pending.contentFingerprint || fastContentFingerprint(content) !== pending.contentFingerprint
                || (pending.ctime && Number(file.stat?.ctime) !== pending.ctime)) {
                throw new Error("已创建文件已发生变化，请打开文件检查，或保留文件并返回");
            }
            if (file.extension.toLowerCase() !== "md"
                && (typeof pending.propertyFingerprint !== "string"
                    || fastContentFingerprint(stableTimeProperties(this.plugin._nonMarkdownProperties(file.path))) !== pending.propertyFingerprint)) {
                throw new Error("已创建文件的属性已发生变化，请打开文件检查，或保留文件并返回");
            }
            try {
                await this._writeCreatedMetadata(file, content, pending.metadata, pending.createdAt, pending.propertyFingerprint);
            } catch (cause) {
                let currentContent = content;
                try { currentContent = await this.app.vault.read(file); } catch (_) {}
                const error = new Error(`文件已创建，但属性尚未完成：${cause?.message || cause}`);
                error.pendingCreation = { ...pending, contentFingerprint: fastContentFingerprint(currentContent) };
                error.createdFile = file;
                throw error;
            }
            this._pendingCreationFiles.delete(pending.path);
            return file;
        });
    }

    forgetPendingCreation(path) {
        this._pendingCreationFiles.delete(path);
    }

    _availablePath(file, targetFolder) {
        const prefix = targetFolder ? `${targetFolder}/` : "";
        const originalPath = `${prefix}${file.name}`;
        if (originalPath === file.path || !this.app.vault.getAbstractFileByPath(originalPath)) {
            return originalPath;
        }
        const extension = file.extension ? `.${file.extension}` : "";
        const basename = file.name.slice(0, file.name.length - extension.length);
        let suffix = 1;
        let candidate;
        do {
            const marker = suffix === 1 ? "-文件重名" : `-文件重名-${suffix}`;
            candidate = `${prefix}${basename}${marker}${extension}`;
            suffix++;
        } while (this.app.vault.getAbstractFileByPath(candidate));
        return candidate;
    }

    renameFile(file, newPath) {
        return this.withTargets([file], async () => {
            const oldPath = file.path;
            if (newPath === oldPath) return false;
            if (file instanceof TFolder) {
                if (file === this.app.vault.getRoot()) throw new Error("不能重命名或移动仓库根目录");
                if (isSameOrDescendantVaultPath(newPath, oldPath)) {
                    throw new Error("不能把文件夹移入自身或其子文件夹");
                }
            }
            const conflict = this.app.vault.getAbstractFileByPath(newPath);
            if (conflict && conflict !== file) throw new Error(`目标路径已被占用：${newPath}`);
            await this.app.fileManager.renameFile(file, newPath);
            if (!await this.plugin._settleRename(file, oldPath)) {
                new Notice("路径已更新，但搜索状态同步失败，请重新打开搜索");
            }
            return true;
        }, [newPath]);
    }

    async moveFiles(files, targetFolder) {
        const moved = [], failed = [];
        for (const file of new Set(files || [])) {
            const oldPath = file?.path || "";
            try {
                this.assertCurrent(file);
                const newPath = this._availablePath(file, targetFolder);
                if (await this.renameFile(file, newPath)) moved.push({ oldPath, newPath: file.path });
            } catch (error) {
                failed.push({ path: oldPath, reason: error?.message || String(error) });
            }
        }
        if (moved.length) {
            new Notice(`已移动 ${moved.length} 个文件到「${targetFolder || "仓库根目录"}」`);
        }
        return { moved, failed };
    }

    deleteFolder(folder) {
        return this.withTargets([folder], async () => {
            if (!(folder instanceof TFolder) || folder === this.app.vault.getRoot()) {
                throw new Error("不能删除仓库根目录");
            }
            if (typeof this.app.fileManager?.trashFile === "function") {
                await this.app.fileManager.trashFile(folder);
            } else {
                await this.app.vault.trash(folder, true);
            }
        });
    }

    async deleteFiles(files) {
        const processedPaths = [], failed = [];
        for (const file of new Set(files || [])) {
            const path = file?.path || "";
            try {
                await this.withTargets([file], async () => {
                    if (!(file instanceof TFile)) throw new Error("请选择文件");
                    if (typeof this.app.fileManager?.trashFile === "function") {
                        await this.app.fileManager.trashFile(file);
                    } else {
                        await this.app.vault.trash(file, true);
                    }
                    processedPaths.push(path);
                    this.plugin._queueFileIndex(path);
                });
            } catch (error) {
                failed.push({ path, reason: error?.message || String(error) });
            }
        }
        if (processedPaths.length) {
            try {
                await this.plugin._flushIndexQueueNow();
            } catch (error) {
                console.error("删除后的索引刷新失败", error);
                new Notice("文件已处理，但搜索索引刷新失败");
            }
        }
        return { processedPaths, failed };
    }
}
