// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { EXCALIDRAW_DRAWING_SUFFIX, isExcalidrawMeta } from "../../data/formats/drawing-detection.js";
import { isDomInput } from "../../utils/dom.js";
import { Notice, TFile } from "obsidian";
// Instance method owner. `this` is the unchanged SearchCreateController instance. No additional state store.
export const SearchCreateController_create_file_methods = {


    async createNewNote(createType, explicitTitle = "") {
        const core = this.owner;
        if (!this.isCreateView()) return false;
        if (!core || this._createInFlight || core._destroyed) return;

        const rawTitle = String(
            explicitTitle || this.currentCreateTitle()
        ).trim();
        if (!rawTitle) return;

        const title = this._sanitizeTitle(rawTitle);
        if (!title) return;

        // A zero-result composer becomes an explicit draft during an accepted
        // write. An index event for the just-created file must not discard its
        // metadata recovery state while creation is still pending.
        if (this.isDerivedCreateView()) {
            this.inputMode = "create";
            this.quickCreateTitle = rawTitle;
            this.syncInputModeView();
        }

        const type = createType || this._currentCreateType();
        const submittedDraft = this._draft();
        const pendingCreation = submittedDraft.pendingCreation;
        const createFilterState = this._effectiveCreateFilterState();
        // 写入事务只消费提交瞬间的值与类型，不依赖可能被关闭/销毁的创建界面。
        let metadata;
        try { metadata = pendingCreation?.metadata || this._createMetadataSnapshot(createFilterState); }
        catch (error) { new Notice(`创建属性无效：${error.message}`); return false; }
        const createdPropertyTypes = [...this._draft().propertyTypes]
            .filter(([key]) => createFilterState.properties.has(key)
                && ![...core.plugin.fileMetaCache.values()].some(meta =>
                    Object.prototype.hasOwnProperty.call(meta.properties || {}, key)));
        const explicitCreateMode = this.isCreateMode();
        const submittedInputValue = String(core.searchInput?.value || "");
        const submitted = explicitCreateMode ? this.captureDraft() : null;
        const submittedSession = core.captureSession?.() || null;
        const sessionKey = core.sessionKey;
        const onCreated = core.onExternalCreated;
        this._createInFlight = true;
        this.syncInputModeView();
        if (explicitCreateMode) core.checkpointCreateSession();
        this._refreshCreatePreview();

        let savedFile = null;
        try {
            let file;
            if (pendingCreation) {
                file = await core.plugin.fileOperations.resumeCreationMetadata(pendingCreation);
            } else {
            const folder = this._effectiveFolder(type);
            const { extension, content } = await this._buildPayload(type, title);
            if (core.plugin._unloaded) return;
            const physicalTitle = type === "excalidraw"
                ? (title.endsWith(EXCALIDRAW_DRAWING_SUFFIX)
                    && title.length > EXCALIDRAW_DRAWING_SUFFIX.length
                    ? title : title + EXCALIDRAW_DRAWING_SUFFIX)
                : title;
            const path = await this._resolvePath(core, folder, physicalTitle, extension);
            if (core.plugin._unloaded) return;

            const existing = core.app.vault.getAbstractFileByPath(path);
            if (existing) {
                // 旧版 Excalidraw 曾写成与普通笔记相同的 .md，用户在结果卡看到的是
                // "Excalidraw" 而非 "笔记"。不能因为逻辑类型不同就覆盖真实同一路径。
                if (
                    type === "md"
                    && existing instanceof TFile
                    && isExcalidrawMeta(existing, core.app.metadataCache.getFileCache(existing))
                ) {
                    const drawingPath = folder
                        ? `${folder}/${title}${EXCALIDRAW_DRAWING_SUFFIX}.md`
                        : `${title}${EXCALIDRAW_DRAWING_SUFFIX}.md`;
                    throw new Error(
                        `同名 Excalidraw 绘图占用了 ${path}；请先将绘图重命名为 ${drawingPath}，再创建笔记`
                    );
                }
                // Create 只负责创建，不再把“路径已存在”降级成打开已有文件。
                throw new Error(`目标路径已存在：${path}`);
            }

            file = await core.plugin.fileOperations.createFile(
                path, content, metadata
            );
            }
            savedFile = file;
            // Type registration is a consequence of a successful file creation,
            // never of opening/confirming/cancelling a metadata draft Picker.
            if (createdPropertyTypes.length && !core.plugin._unloaded) {
                try {
                    const manager = core.app.metadataTypeManager;
                    if (typeof manager?.setType !== "function") throw new Error("属性类型管理器不可用");
                    for (const [key, propertyType] of createdPropertyTypes) {
                        await manager.setType(key, propertyType);
                    }
                } catch (error) {
                    console.warn("文件已创建，但新属性类型同步失败", error);
                    new Notice("文件已创建，但 Obsidian 属性类型同步失败");
                }
            }
            if (explicitCreateMode) core.plugin.settleCreateSession(sessionKey, submitted);
            submittedDraft.pendingCreation = null;
            if (core.plugin._unloaded) return;

            try {
                core.plugin._queueFileIndex(file.path);
                await core.plugin._flushIndexQueueNow();
            } catch (error) {
                console.warn("文件已创建，但索引刷新失败", error);
                new Notice("文件及属性已保存，但搜索索引刷新失败；可稍后重新打开搜索");
            }

            // 创建成功后通知外部项目 Owner。回调失败不能误报文件创建失败，
            // 否则用户可能误以为需要再次创建同名文件。
            if (typeof onCreated === "function") {
                try { await onCreated(file); }
                catch (error) {
                    console.warn("外部项目关联失败（文件已创建）", error);
                    new Notice(`文件已创建，但项目关联失败：${error?.message || error}`, 5500);
                }
            }

            if (!core._destroyed) {
                if (explicitCreateMode) {
                    // 成功后退出显式创建，回到结果列表。保留进入创建前的搜索条件；
                    // settleCreateSession 可能已经清空已提交标题，也可能因为没有会话 key 而不清空。
                    // 用户在异步写入期间修改了新的创建草稿时，不能覆盖其后续输入/元数据。
                    const liveDraft = this.captureDraft();
                    const sameSubmission = liveDraft && submitted
                        && (liveDraft.title === submitted.title || liveDraft.title === "")
                        && liveDraft.type === submitted.type
                        && JSON.stringify(liveDraft.filterSnapshot) === JSON.stringify(submitted.filterSnapshot)
                        && JSON.stringify(liveDraft.propertyTypes) === JSON.stringify(submitted.propertyTypes)
                        && JSON.stringify(liveDraft.templates) === JSON.stringify(submitted.templates);
                    if (sameSubmission && this.toggleInputMode({
                        focusInput: false,
                        refreshResultsOnExit: true
                    })) {
                        // 如果原搜索词仍然零命中，结果渲染会自动派生 Create View。
                        // 创建成功后不能再次留在创建页，此时退到空关键词下的正常结果列表。
                        if (this.isDerivedCreateView()) {
                            if (isDomInput(core.searchInput)) core.searchInput.value = "";
                            core.performSearch("");
                            this.syncInputModeView();
                            core.facets?.syncFilterButtons?.();
                            core.resultControls?.refreshFilterPoolHeader?.();
                            core._syncResultStateRow?.();
                        }
                    } else if (this.isCreateMode()) {
                        // 正在修改下一份草稿，或切换被其他文件操作保护：不销毁新输入。
                        this.syncInputModeView();
                        this._refreshCreatePreview();
                    }
                } else if (
                    !this.isCreateMode()
                    && isDomInput(core.searchInput)
                    && core.searchInput.value === submittedInputValue
                ) {
                    // Search 0-result 派生创建：成功后清本次搜索词并回结果列表。
                    // 索引发布可能已把零命中更新为结果；只要用户没有改输入或主动
                    // 切入创建，仍完成本次返回。performSearch 负责恢复搜索 FilterState。
                    core.searchInput.value = "";
                    core.performSearch("");
                    this.syncInputModeView();
                    core.facets?.syncFilterButtons?.();
                    core.resultControls?.refreshFilterPoolHeader?.();
                    core._syncResultStateRow?.();
                }
                new Notice(`已创建${this._createTypeOption(type).label}：${title}`);
            }
        } catch (err) {
            const pending = this._pendingCreationSnapshot(err.pendingCreation);
            if (pending) {
                submittedDraft.pendingCreation = pending;
                const recovery = submitted && { ...submitted, pendingCreation: pending };
                if (!core._destroyed && this.createDraft === submittedDraft) {
                    this.inputMode = "create";
                    this.syncInputModeView();
                    core.checkpointCreateSession();
                } else if (recovery && submittedSession && !core.plugin._unloaded) {
                    // Accepted creation can outlive its host. Update only the
                    // identical recovered draft; never replace a newer draft.
                    const same = value => JSON.stringify(value) === JSON.stringify(submitted);
                    let restored = false;
                    for (const active of core.plugin.activeSearchCores || []) {
                        if (active.sessionKey !== sessionKey || !same(active.createFlow?.captureDraft())) continue;
                        active.createFlow.createDraft.pendingCreation = pending;
                        active.createFlow.syncInputModeView();
                        active.createFlow._refreshCreatePreview();
                        active.checkpointCreateSession();
                        restored = true;
                    }
                    const saved = core.plugin.settings.createSessionRecovery?.[sessionKey];
                    if (!restored && (!saved || same(saved.session?.create))) {
                        core.plugin.rememberCreateSession(sessionKey, core.hostKind, {
                            ...submittedSession, capturedAt: Date.now(), create: recovery
                        });
                    }
                }
                console.warn("文件已创建，等待补写属性", err);
                new Notice(`已创建 ${pending.path}，但属性尚未完成。点击“补写未完成的属性”重试，或打开文件检查。`, 8000);
            } else if (savedFile) {
                submittedDraft.pendingCreation = null;
                console.error("文件及属性已保存，但创建后的界面刷新失败", err);
                new Notice(`文件及属性已保存：${savedFile.path}。界面刷新失败，请重新打开搜索。`, 8000);
            } else if (pendingCreation) {
                console.warn("已创建文件的属性补写失败", err);
                new Notice(`属性补写未完成：${err.message}`, 8000);
            } else {
                console.error("创建笔记失败:", err);
                new Notice(`创建失败: ${err.message}`);
            }
        } finally {
            this._createInFlight = false;
            if (!core._destroyed) {
                this.syncInputModeView();
                this._refreshCreatePreview();
                core._scheduleResultIndexUpdate();
            }
        }
    },
};

