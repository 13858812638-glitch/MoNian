// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { fastContentFingerprint, indexedFileProperties, isGLSTimeSidecarPath, parseGLSDate, resolveTrackedModification, stableTimeProperties } from "../../data/time/time-values.js";
import { TFile } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_non_markdown_metadata_methods = {


    // Ordinary non-Markdown attributes belong to the existing per-device file-times sidecars.
    // Compare a monotonic edit clock and writer id so NAS snapshot arrival order is irrelevant.
    _nonMarkdownPropertyRecord(path, { activeOnly = false } = {}) {
        const candidates = this._nonMarkdownRecords.get(path) || [];
        const generation = candidates.reduce((at, entry) => Math.max(at, parseGLSDate(entry.creationRevision)), 0);
        let winner = null;
        for (const entry of candidates) {
            if (parseGLSDate(entry.creationRevision) !== generation || (activeOnly && entry.deleted)) continue;
            if (!(Number(entry.propertyUpdatedAt) > 0)) continue;
            if (!winner || Number(entry.propertyUpdatedAt) > Number(winner.propertyUpdatedAt)
                || (Number(entry.propertyUpdatedAt) === Number(winner.propertyUpdatedAt)
                    && String(entry.propertyWriterId || "") > String(winner.propertyWriterId || ""))) winner = entry;
        }
        return winner;
    },


    _nonMarkdownProperties(path) {
        const winner = this._nonMarkdownPropertyRecord(path);
        return !winner?.deleted && winner?.properties && typeof winner.properties === "object"
            && !Array.isArray(winner.properties) ? JSON.parse(JSON.stringify(indexedFileProperties(winner.properties))) : {};
    },


    async _editNonMarkdownProperties(file, transform) {
        this.fileOperations?.assertCurrent(file);
        if (!(file instanceof TFile) || this.app.vault.getAbstractFileByPath(file.path) !== file
            || this.isPathExcluded(file.path)) throw new Error("文件已移动或不在 GLS 索引范围内");
        const path = file.path;
        const next = this._nonMarkdownProperties(path);
        const before = stableTimeProperties(next);
        const outcome = transform(next);
        if (outcome !== "changed") return outcome;
        if (before === stableTimeProperties(next)) return "unchanged";
        const previous = this._nonMarkdownLocal.get(path) || this._resolveNonMarkdownTimes(file);
        const latest = Number(this._nonMarkdownPropertyRecord(path)?.propertyUpdatedAt) || 0;
        const entry = { ...previous, properties: next, deleted: false,
            propertyUpdatedAt: Math.max(Date.now(), latest + 1), propertyWriterId: this._metadataWriterId,
            fileModifiedAt: Date.now(), fileSource: "local-edit" };
        // 候选不进入实时索引；串行持久化成功后才提交正式记录。
        if (await this.saveNonMarkdownTimes({ mutation: { file, path, before, entry } }) !== true) {
            throw new Error("仓库元数据写入失败或文件已变化，未提交属性");
        }
        this._queueFileIndex(path);
        return "changed";
    },


    async _reloadTimeSidecars() {
        if (this._unloaded) return;
        this._sidecarReloadPending = true;
        if (this._sidecarReloadPromise) return this._sidecarReloadPromise;
        const snapshot = () => new Map([...new Set([...this.contentTimeCache.keys(), ...this._nonMarkdownRecords.keys()])]
            .map(path => [path, JSON.stringify([this.contentTimeCache.get(path), this._nonMarkdownRecords.get(path)])]));
        this._sidecarReloadPromise = (async () => {
            do {
                this._sidecarReloadPending = false;
                const before = snapshot();
                const historyBefore = JSON.stringify(this._recentOpenedHistory);
                await Promise.all([this.loadContentTimeCache(), this.loadNonMarkdownTimes({ preserveLocal: true }),
                    this.loadRecentOpenedHistory({ preserveLocal: true })]);
                if (this._unloaded) return;
                const after = snapshot();
                for (const path of new Set([...before.keys(), ...after.keys()])) {
                    if (before.get(path) !== after.get(path)
                        && this.app.vault.getAbstractFileByPath(path) instanceof TFile) this._queueFileIndex(path);
                }
                this._mergeRecentOpenedHistory();
                if (historyBefore !== JSON.stringify(this._recentOpenedHistory)) {
                    this._forEachActiveSearchCore(core => {
                        if (core.sortField === "opened") core._queueResultIndexChanges(null);
                    });
                }
            } while (this._sidecarReloadPending && !this._unloaded);
        })().finally(() => {
            this._sidecarReloadPromise = null;
            if (this._sidecarReloadPending && !this._unloaded) return this._reloadTimeSidecars();
        });
        return this._sidecarReloadPromise;
    },


    _isRemoteTimeSidecar(path) {
        if (!String(path || "").startsWith(this._metadataDirectory() + "/") || !isGLSTimeSidecarPath(path)) return false;
        return ![this._metadataContentFilename(), this._metadataHistoryFilename(), this._metadataNonMarkdownFilename()]
            .some(name => path.endsWith("/" + name));
    },


    async loadNonMarkdownTimes({ preserveLocal = false } = {}) {
        // 远端快照在临时 Map 中组装；读取期间继续使用完整旧状态。
        // 本设备分片只在启动时加载，运行中的本地内存和写入队列始终是它的 Owner。
        const records = new Map(), local = new Map();
        let files;
        try { files = await this._metadataSidecarFiles(); }
        catch (error) {
            console.warn("非 Markdown 时间目录不可读取，保留已有记录", error);
            return false;
        }
        for (const path of files) {
            if (!/(?:^|\/)file-times-[a-zA-Z0-9_-]+\.json$/.test(path)) continue;
            const ownFile = path.endsWith(`/${this._metadataNonMarkdownFilename()}`);
            if (preserveLocal && ownFile) continue;
            try {
                const raw = JSON.parse(await this.app.vault.adapter.read(path));
                if (raw?.version !== 1 || !Array.isArray(raw.entries)) throw new Error("无效的文件时间分片");
                for (const item of raw.entries) {
                    if (!this._timeRecordValid(item)) continue;
                    const entry = {
                        path: item.path,
                        createdAt: parseGLSDate(item.createdAt), createdSource: item.createdSource || "initial-value",
                        creationRevision: parseGLSDate(item.creationRevision), creationLocked: true,
                        ...(item.deleted === true ? { deleted: true } : {}),
                        contentModifiedAt: parseGLSDate(item.contentModifiedAt), contentSource: item.contentSource || "stored-history",
                        fingerprint: String(item.fingerprint || ""),
                        fileModifiedAt: parseGLSDate(item.fileModifiedAt), fileSource: item.fileSource || "stored-history",
                        fileFingerprint: String(item.fileFingerprint || ""),
                        ...(Number(item.propertyUpdatedAt) > 0 ? {
                            propertyUpdatedAt: Number(item.propertyUpdatedAt),
                            propertyWriterId: String(item.propertyWriterId || raw.writerId || ""),
                            properties: item.properties && typeof item.properties === "object" && !Array.isArray(item.properties)
                                ? item.properties : {}
                        } : {})
                    };
                    const entries = records.get(entry.path) || [];
                    entries.push(entry);
                    records.set(entry.path, entries);
                    if (ownFile) local.set(entry.path, entry);
                }
            } catch (error) {
                console.warn("读取非 Markdown 文件时间记录失败", path, error);
                // NAS 正在替换分片时不提交半份快照；下一次事件会重新读取。
                if (preserveLocal) return false;
            }
        }
        if (this._unloaded) return false;
        if (preserveLocal) {
            for (const [path, entry] of this._nonMarkdownLocal) {
                records.set(path, [...(records.get(path) || []), entry]);
            }
        } else this._nonMarkdownLocal = local;
        this._nonMarkdownRecords = records;
        return true;
    },



    _resolveNonMarkdownTimes(file, fingerprint = "", localAt = 0, initialStats = file.stat) {
        const path = file.path;
        const others = this._nonMarkdownRecords.get(path) || [];
        const owned = this._ownedFileCreations.get(path);
        this._ownedFileCreations.delete(path);
        const previous = this._nonMarkdownLocal.get(path);
        const indexed = !previous && !others.length ? this.fileMetaCache.get(path) : null;
        const remembered = previous || (indexed ? {
            createdAt: parseGLSDate(indexed.ctime), createdSource: indexed.timeCreatedSource || "stored-history",
            fingerprint: indexed.timeFingerprint || "", contentModifiedAt: parseGLSDate(indexed.contentModifiedAt),
            contentSource: indexed.timeContentSource || "stored-history",
            fileModifiedAt: parseGLSDate(indexed.fileModifiedAt) || parseGLSDate(indexed.mtime),
            fileFingerprint: indexed.timeFileFingerprint || "", fileSource: indexed.timeFileSource || "stored-history"
        } : null);
        const generation = others.reduce((best, item) => (parseGLSDate(item.creationRevision) > parseGLSDate(best?.creationRevision) ? item : best), null);
        const prior = !owned && generation && parseGLSDate(generation.creationRevision) > parseGLSDate(remembered?.creationRevision)
            ? generation : remembered;
        const first = prior || others.find(entry => entry.createdSource === "gls-created") || others[0];
        const createdAt = parseGLSDate(owned) || parseGLSDate(first?.createdAt) || parseGLSDate(initialStats?.ctime);
        const createdSource = owned ? "gls-created" : first?.createdSource || "initial-value";
        const creationRevision = parseGLSDate(owned) || parseGLSDate(first?.creationRevision);
        const propertyRecord = this._nonMarkdownPropertyRecord(path);
        const properties = this._nonMarkdownProperties(path);
        const actualFingerprint = fingerprint || prior?.fingerprint || "";
        const fileFingerprint = actualFingerprint
            ? fastContentFingerprint(actualFingerprint + "\n" + stableTimeProperties(properties)) : prior?.fileFingerprint || "";
        const compatible = others.filter(entry => parseGLSDate(entry.creationRevision) === creationRevision);
        const matching = (key, fp, clock) => compatible.filter(entry => fp && entry[key] === fp && parseGLSDate(entry[clock]))
            .reduce((best, item) => !best || item[clock] > best[clock] ? item : best, null);
        const bodyMatch = matching("fingerprint", actualFingerprint, "contentModifiedAt");
        const fileMatch = matching("fileFingerprint", fileFingerprint, "fileModifiedAt");
        const body = resolveTrackedModification({ fingerprint: actualFingerprint, previousFingerprint: prior?.fingerprint,
            previousAt: owned ? 0 : prior?.contentModifiedAt, previousSource: prior?.contentSource,
            storedFingerprint: owned ? "" : bodyMatch?.fingerprint, storedAt: owned ? 0 : bodyMatch?.contentModifiedAt,
            localAt, initialAt: owned || parseGLSDate(initialStats?.mtime) || createdAt });
        const whole = resolveTrackedModification({ fingerprint: fileFingerprint, previousFingerprint: prior?.fileFingerprint,
            previousAt: owned ? 0 : prior?.fileModifiedAt, previousSource: prior?.fileSource,
            storedFingerprint: owned ? "" : fileMatch?.fileFingerprint, storedAt: owned ? 0 : fileMatch?.fileModifiedAt,
            localAt, initialAt: owned || parseGLSDate(initialStats?.mtime) || createdAt });
        const entry = { path, createdAt, createdSource, creationRevision, creationLocked: true,
            fingerprint: actualFingerprint, contentModifiedAt: body.at,
            contentSource: body.source === "file-yaml" ? "file-json" : body.source,
            fileFingerprint, fileModifiedAt: whole.at, fileSource: whole.source === "file-yaml" ? "file-json" : whole.source,
            ...(parseGLSDate(propertyRecord?.propertyUpdatedAt) ? {
                propertyUpdatedAt: propertyRecord.propertyUpdatedAt, propertyWriterId: propertyRecord.propertyWriterId,
                properties, ...(propertyRecord.deleted ? { deleted: true } : {})
            } : {}) };
        if (!previous || JSON.stringify(previous) !== JSON.stringify(entry)) {
            this._nonMarkdownLocal.set(path, entry);
            this._nonMarkdownRecords.set(path, [...others.filter(item => item !== previous), entry]);
            this._scheduleNonMarkdownSave();
        }
        return entry;
    },


    _scheduleNonMarkdownSave() {
        if (this._nonMarkdownSaveTimer) return;
        this._nonMarkdownSaveTimer = setTimeout(() => {
            this._nonMarkdownSaveTimer = null;
            void this.saveNonMarkdownTimes();
        }, 1600);
    },


    async saveNonMarkdownTimes({ mutation = null } = {}) {
        if (this._nonMarkdownSaveTimer) {
            clearTimeout(this._nonMarkdownSaveTimer);
            this._nonMarkdownSaveTimer = null;
        }
        const directory = this._metadataDirectory();
        const path = `${directory}/${this._metadataNonMarkdownFilename()}`;
        const isCurrent = () => !this._unloaded && mutation.file.path === mutation.path
            && this.app.vault.getAbstractFileByPath(mutation.path) === mutation.file;
        const merge = () => {
            const live = this._nonMarkdownLocal.get(mutation.path) || mutation.entry;
            const entry = { ...live, properties: mutation.entry.properties, deleted: false,
                propertyUpdatedAt: mutation.entry.propertyUpdatedAt, propertyWriterId: mutation.entry.propertyWriterId };
            if ((live.fileModifiedAt || 0) <= mutation.entry.fileModifiedAt) {
                entry.fileModifiedAt = mutation.entry.fileModifiedAt;
                entry.fileSource = mutation.entry.fileSource;
            }
            entry.fileFingerprint = entry.fingerprint
                ? fastContentFingerprint(entry.fingerprint + "\n" + stableTimeProperties(entry.properties)) : "";
            return entry;
        };
        const serialize = records => JSON.stringify({ version: 1, writerId: this._metadataWriterId, entries: [...records.values()] });
        const frozen = new Map(this._nonMarkdownLocal);
        const write = async () => {
            try {
                if (mutation && (!isCurrent() || stableTimeProperties(this._nonMarkdownProperties(mutation.path)) !== mutation.before)) return false;
                const committedBeforeWrite = new Map(this._unloaded ? frozen : this._nonMarkdownLocal);
                const records = new Map(committedBeforeWrite);
                const candidate = mutation ? merge() : null;
                if (candidate) records.set(mutation.path, candidate);
                await this._ensureMetadataDirectory(directory);
                await this.app.vault.adapter.write(path, serialize(records));
                if (mutation) {
                    if (!isCurrent()) {
                        // 外部删除/移动发生在写盘期间：同一写链补存当前路径状态，不复活旧路径。
                        await this.app.vault.adapter.write(path, serialize(this._unloaded ? committedBeforeWrite : this._nonMarkdownLocal));
                        return false;
                    }
                    const previous = this._nonMarkdownLocal.get(mutation.path);
                    const committed = merge();
                    this._nonMarkdownLocal.set(mutation.path, committed);
                    this._nonMarkdownRecords.set(mutation.path, [
                        ...(this._nonMarkdownRecords.get(mutation.path) || []).filter(item => item !== previous), committed
                    ]);
                    if (JSON.stringify(committed) !== JSON.stringify(candidate)) this._scheduleNonMarkdownSave();
                }
                return true;
            } catch (error) { console.warn("GLS 非 Markdown 元数据保存失败", error); return false; }
        };
        this._nonMarkdownWriteChain = this._nonMarkdownWriteChain.then(write, write);
        return this._nonMarkdownWriteChain;
    },


    _remapNonMarkdownTimes(oldPath, newPath, descendants = false) {
        const update = key => key === oldPath ? newPath
            : descendants && key.startsWith(oldPath + "/")
                ? (newPath ? newPath + key.slice(oldPath.length) : "") : key;
        const paths = new Set([...this._nonMarkdownRecords.keys(), ...this._nonMarkdownLocal.keys(), ...this._ownedFileCreations.keys()]);
        let changed = false;
        for (const path of paths) {
            const next = update(path);
            if (next === path) continue;
            const owned = this._ownedFileCreations.get(path);
            this._ownedFileCreations.delete(path);
            if (next && owned) this._ownedFileCreations.set(next, owned);
            const records = this._nonMarkdownRecords.get(path) || [];
            const local = this._nonMarkdownLocal.get(path);
            const generation = records.reduce((at, record) => Math.max(at, parseGLSDate(record.creationRevision)),
                parseGLSDate(local?.creationRevision));
            const currentLocal = local && parseGLSDate(local.creationRevision) === generation ? local : null;
            const active = records.filter(record => !record.deleted && parseGLSDate(record.creationRevision) === generation);
            const source = currentLocal && !currentLocal.deleted ? currentLocal : active[0];
            const sourceWinner = this._nonMarkdownPropertyRecord(path, { activeOnly: true });
            const barrier = this._nonMarkdownPropertyRecord(path);
            this._nonMarkdownLocal.delete(path);
            this._nonMarkdownRecords.delete(path);
            if (next) {
                const destination = this._nonMarkdownLocal.get(next);
                const priorDestination = this._nonMarkdownPropertyRecord(next);
                const existing = this._nonMarkdownRecords.get(next) || [];
                const inherited = active.map(record => ({ ...record, path: next }));
                const moved = { ...(source || destination || existing.find(record => !record.deleted)), path: next };
                if (sourceWinner) Object.assign(moved, {
                    propertyUpdatedAt: sourceWinner.propertyUpdatedAt, propertyWriterId: sourceWinner.propertyWriterId,
                    properties: JSON.parse(JSON.stringify(sourceWinner.properties || {}))
                });
                if (parseGLSDate(moved.createdAt)) {
                    if (priorDestination?.deleted && source) {
                        // 真正移入一个曾被删除的目标路径：新路径代次隔离旧文件分片，创建时间原样保留。
                        moved.creationRevision = Math.max(Date.now(), parseGLSDate(priorDestination.creationRevision) + 1,
                            parseGLSDate(source.creationRevision));
                        for (const record of inherited) record.creationRevision = moved.creationRevision;
                    }
                    delete moved.deleted;
                    this._nonMarkdownRecords.set(next, [...existing, ...inherited, moved]);
                    const winner = this._nonMarkdownPropertyRecord(next, { activeOnly: true });
                    if (winner) Object.assign(moved, { propertyUpdatedAt: winner.propertyUpdatedAt,
                        propertyWriterId: winner.propertyWriterId, properties: JSON.parse(JSON.stringify(winner.properties || {})) });
                    this._nonMarkdownLocal.set(next, moved);
                }
            }
            const base = currentLocal || source || records.find(record => parseGLSDate(record.creationRevision) === generation);
            if (base && parseGLSDate(base.createdAt)) {
                const tombstone = { ...base, path, properties: {}, deleted: true,
                    propertyUpdatedAt: Math.max(Date.now(), Number(barrier?.propertyUpdatedAt || 0) + 1),
                    propertyWriterId: this._metadataWriterId };
                this._nonMarkdownLocal.set(path, tombstone);
                this._nonMarkdownRecords.set(path, [...records, tombstone]);
            }
            changed = true;
        }
        if (changed) this._scheduleNonMarkdownSave();
        return changed;
    },


    _deleteNonMarkdownTimes(path, descendants = false) {
        return this._remapNonMarkdownTimes(path, "", descendants);
    },
};

