// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { GLS_METADATA_DEFAULT_DIRECTORY, isGLSTimeSidecarPath, normalizeGLSMetadataDirectory } from "../../data/time/time-values.js";
import { isSameOrDescendantVaultPath } from "../../utils/vault-paths.js";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_metadata_directory_methods = {


    _pluginDirectory() {
        return this.manifest.dir || `${this.app.vault.configDir}/plugins/${this.manifest.id}`;
    },


    _metadataDirectory() {
        return normalizeGLSMetadataDirectory(this.settings.metadataDirectory)
            || GLS_METADATA_DEFAULT_DIRECTORY;
    },


    _metadataHistoryFilename(writer = this._metadataWriterId) {
        return `recent-opened-${writer}.json`;
    },


    _metadataContentFilename(writer = this._metadataWriterId) {
        return `content-times-${writer}.json`;
    },


    _metadataNonMarkdownFilename(writer = this._metadataWriterId) {
        return `file-times-${writer}.json`;
    },


    async _assertMetadataDirectoryDedicated(directory) {
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(directory)) return true;
        const found = await adapter.list(directory);
        const unexpected = [...(found?.files || []), ...(found?.folders || [])]
            .filter(path => !isGLSTimeSidecarPath(path) && path !== `${directory}/content-time-cache.json`);
        if (unexpected.length) throw new Error("目录包含普通文件或子文件夹，不能作为 GLS 元数据目录");
        return true;
    },


    async _ensureMetadataDirectory(directory = this._metadataDirectory()) {
        if (!normalizeGLSMetadataDirectory(directory) || directory === this._pluginDirectory()) {
            throw new Error("元数据目录必须位于仓库内且不能是插件配置目录");
        }
        const adapter = this.app.vault.adapter;
        const parts = directory.split("/");
        let partial = "";
        for (const part of parts) {
            partial = partial ? `${partial}/${part}` : part;
            if (!await adapter.exists(partial)) await adapter.mkdir(partial);
            const node = await adapter.stat(partial);
            if (node?.type !== "folder") throw new Error(`目录路径被文件占用：${partial}`);
        }
        await this._assertMetadataDirectoryDedicated(directory);
        return directory;
    },


    async _metadataSidecarFiles(directory = this._metadataDirectory()) {
        const adapter = this.app.vault.adapter;
        if (!await adapter.exists(directory)) return [];
        const listing = await adapter.list(directory);
        return (listing?.files || []).filter(path => /(?:^|\/)(?:recent-opened-|content-times-|file-times-)[a-zA-Z0-9_-]+\.json$/.test(path)
            || path === `${directory}/content-time-cache.json`);
    },


    // 修改目录先等正在写的快照结束；冲突绝不覆盖，所有复制逐文件核验。
    // 无论成功与否均保留旧目录，只有全部成功才切换设置。
    async changeMetadataDirectory(rawPath) {
        const target = normalizeGLSMetadataDirectory(rawPath);
        if (!target) throw new Error("只支持仓库内相对目录，不能是 .obsidian、绝对路径或 ..");
        const source = this._metadataDirectory();
        if (target === source) return false;
        if (isSameOrDescendantVaultPath(target, source)
            || isSameOrDescendantVaultPath(source, target)) {
            throw new Error("新旧元数据目录不能相互嵌套");
        }
        await this._contentTimeWriteChain;
        await this._metadataHistoryWriteChain;
        await this._nonMarkdownWriteChain;
        await this._ensureMetadataDirectory(target);
        const adapter = this.app.vault.adapter;
        // 元数据目录不能复用普通笔记目录：否则 GLS 会把里面的笔记误当作元数据排除。
        const existing = await adapter.list(target);
        const expected = new Set(await this._metadataSidecarFiles(target));
        const foreign = [...(existing?.files || []), ...(existing?.folders || [])]
            .filter(path => !expected.has(path));
        if (foreign.length) throw new Error("目标目录已有普通文件或子目录，请选择专用空目录");
        for (const oldPath of await this._metadataSidecarFiles(source)) {
            const nextPath = `${target}/${oldPath.slice(source.length + 1)}`;
            const sourceText = await adapter.read(oldPath);
            if (await adapter.exists(nextPath)) {
                if (sourceText !== await adapter.read(nextPath)) {
                    throw new Error(`新目录中已有不同内容的 ${nextPath.split("/").pop()}，已停止覆盖`);
                }
            } else {
                await adapter.write(nextPath, sourceText);
                if (await adapter.read(nextPath) !== sourceText) {
                    throw new Error(`复制校验失败：${nextPath}`);
                }
            }
        }
        // 本机当前记录也要保存到目标目录：不能依赖旧目录一定已有快照。
        this.settings.metadataDirectory = target;
        try {
            const results = await Promise.all([this.saveContentTimeCache(), this.saveRecentOpenedHistory(), this.saveNonMarkdownTimes()]);
            if (results.some(result => result !== true)) throw new Error("时间快照保存失败");
            if (await this.saveSettings() === false) throw new Error("插件设置保存失败");
        } catch (error) {
            this.settings.metadataDirectory = source;
            throw error;
        }
        this._metadataDirectorySafe = true;
        return true;
    },
};

