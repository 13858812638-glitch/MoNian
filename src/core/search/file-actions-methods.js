// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { createSharedFolderCountProvider, sharedFolderAncestors } from "../../data/folders/folder-tree.js";
import { displayBasename, drawingBasenameSuffix } from "../../data/formats/file-types.js";
import { createDialogSession, openSearchRenameDialog } from "../../ui/dialogs/dialog-session.js";
import { createSharedDialogSurface } from "../../ui/dialogs/dialog-surface.js";
import { renderSharedFolderTreePicker } from "../../ui/pickers/folder-picker.js";
import { registerPickerCleanup } from "../picker-cleanup.js";
import { Notice, TFile } from "obsidian";
// Instance method owner. `this` is the unchanged SearchCore instance. No additional state store.
export const SearchCore_file_actions_methods = {


    _findCurrentResult(path) {
        if (!path) return { index: -1, result: null };
        const index = this.fullResults.findIndex(result => result.path === path);
        return {
            index,
            result: index >= 0 ? this.fullResults[index] : null
        };
    },


    _beginTitleRenameByPath(path) {
        if (!path || this._confirmSession) return false;

        const { index, result } = this._findCurrentResult(path);
        if (index < 0 || !result) return false;

        const visiblePosition = this.resultRenderer._displayPositionForActualIndex(index);
        if (visiblePosition < 0) return false;
        if (
            visiblePosition < this.resultRenderer.windowStart
            || visiblePosition >= this.resultRenderer.windowEnd
        ) {
            this.resultRenderer.renderPage({
                targetPosition: visiblePosition,
                syncControls: false
            });
        }

        const itemEl = this.resultsContainer.querySelector(
            `.local-search-item[data-path="${CSS.escape(path)}"]`
        );
        if (!itemEl?.isConnected || !result.file) return false;
        return this._startTitleRename(itemEl, result);
    },


    _startTitleRename(itemEl, result) {
        if (!itemEl?.isConnected || !result?.file || this._confirmSession || this._destroyed) return false;
        const file = result.file;
        const drawingSuffix = drawingBasenameSuffix(file, result.extension);
        const original = displayBasename(file, result.extension);
        const session = openSearchRenameDialog(this, {
            ownerPanel: null,
            kind: "rename-file",
            title: "重命名文件",
            fieldLabel: "文件名称",
            initialValue: original,
            errorText: "重命名失败",
            onFinish: () => itemEl.classList.remove("is-renaming"),
            onSubmit: async base => {
                if (/[\\/:*?"<>|]/.test(base) || base === "." || base === "..")
                    throw new Error("文件名包含非法字符");
                const slash = file.path.lastIndexOf("/");
                const dir = slash >= 0 ? file.path.slice(0, slash) : "";
                const ext = drawingSuffix ? `${drawingSuffix}.md` : (file.extension ? `.${file.extension}` : "");
                // 若重命名框里手动输入“_绘图”，也只保留一个物理后缀。
                const pureBase = drawingSuffix && base.endsWith(drawingSuffix)
                    ? base.slice(0, -drawingSuffix.length) : base;
                if (!pureBase.trim()) throw new Error("文件名不能为空");
                const newPath = `${dir ? dir + "/" : ""}${pureBase}${ext}`;
                const conflict = this.app.vault.getAbstractFileByPath(newPath);
                if (conflict && conflict !== file) throw new Error(`已存在同名文件：${newPath}`);
                const selection = this.selection;
                if (!selection?.beginMutation("renaming")) return false;
                try { return await this.plugin.fileOperations.renameFile(file, newPath); }
                finally { selection.endMutation("renaming"); }
            }
        });
        if (!session) return false;
        itemEl.classList.add("is-renaming");
        return true;
    },


    _filesFromPaths(paths) {
        const files = [];
        const seen = new Set();
        for (const path of paths || []) {
            if (!path || seen.has(path)) continue;
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                files.push(file);
                seen.add(path);
            }
        }
        return files;
    },


    showMovePickerForFiles(files, anchor) {
        const targets = (files || []).filter(file => file instanceof TFile);
        if (!targets.length) {
            new Notice("没有可移动的文件");
            return;
        }

        const selectedParentCount = new Map();
        for (const file of targets) {
            const parentPath = file.parent?.path || "";
            selectedParentCount.set(
                parentPath,
                (selectedParentCount.get(parentPath) || 0) + 1
            );
        }

        const dropdownAnchor = anchor?.isConnected
            ? anchor
            : (this.selection.moveFilesBtn?.isConnected ? this.selection.moveFilesBtn : this.selection.toolbar);
        const panel = this.dropdown.open(
            dropdownAnchor,
            targets.length > 1 ? `移动 ${targets.length} 个文件` : `移动「${targets[0].basename || targets[0].name}」`
        );
        panel.addClass("local-search-move-dropdown", "local-search-picker-dropdown");

        const expanded = new Set();
        for (const parentPath of selectedParentCount.keys()) {
            for (const path of sharedFolderAncestors(parentPath)) expanded.add(path);
        }

        const countInFolder = createSharedFolderCountProvider(
            this._facetCandidates("folder")
        );
        const selectedPath = selectedParentCount.size === 1
            ? selectedParentCount.keys().next().value
            : null;

        let picked = false;
        renderSharedFolderTreePicker({
            app: this.app,
            plugin: this.plugin,
            panel,
            expanded,
            selectedPath,
            rootPath: "",
            badgeFor: countInFolder,
            onChoose: path => {
                if (picked) return;
                picked = true;
                this.dropdown.close();
                void this.moveFiles(targets, path).catch(error => {
                    if (!this._destroyed) {
                        console.error("文件移动流程失败", error);
                        new Notice("文件移动失败");
                    }
                });
            },
        });
    },


    async moveFiles(files, targetFolder) {
        const targets = (files || []).filter(file => file instanceof TFile);
        if (!targets.length) return false;
        const selection = this.selection;
        if (!selection?.beginMutation("moving")) return false;

        try {
            const result = await this.plugin.fileOperations.moveFiles(targets, targetFolder);
            selection.removePaths(result.moved.map(({ oldPath }) => oldPath));

            if (result.moved.length) {
                // 文件移动会改变文件夹筛选是否仍匹配；
                // Result Owner 在最终 settle 时一次性提交结果与 Controls。
                this._refreshCurrentResultsAfterMutation({
                    preserveSelection: true,
                    refreshPools: true
                });
            }

            if (result.failed.length) new Notice(`移动失败 ${result.failed.length} 个文件`);
            return result.failed.length === 0;
        } finally {
            selection.endMutation("moving");
        }
    },


    _confirmAction({
        title,
        message = "",
        detail = "",
        confirmText = "确认",
        danger = false,
        allowDontAskAgain = false
    } = {}) {
        return new Promise(resolve => {
            let dontAskAgain = false;
            const session = createDialogSession(this, {
                onFinish: confirmed => resolve({ confirmed, dontAskAgain })
            });
            if (!session) {
                resolve({ confirmed: false, dontAskAgain: false });
                return;
            }

            const surface = createSharedDialogSurface(session.host, {
                title,
                message,
                detail,
                confirmText,
                danger,
                closeable: true,
                optionLabel: allowDontAskAgain ? "不再询问" : "",
                onFinish: (value, controls) => {
                    dontAskAgain = Boolean(controls.optionInput?.checked);
                    session.finish(value);
                }
            });
            surface.dialog.addClass("local-search-file-delete-dialog", "local-search-file-operation-dialog");
            session.setDialog(surface.dialog);
            surface.dialog.addEventListener("pointerdown", event => event.stopPropagation());
            surface.dialog.addEventListener("click", event => event.stopPropagation());
            surface.cancelButton.focus({ preventScroll: true });
        });
    },


    async handleSwipeAction(action, path, anchor = null) {
        if (this._destroyed || this.selection?.busy) return false;
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) return false;
        if (action === "rename") {
            if (!this._beginTitleRenameByPath(path)) return false;
            await this._confirmSession?.finished;
            return true;
        }
        if (action === "move") {
            this.showMovePickerForFiles([file], anchor);
            const panel = this.dropdown.panel;
            if (panel) await new Promise(resolve => registerPickerCleanup(panel, resolve));
            return true;
        }
        if (action === "add-tag" || action === "add-property") {
            const session = this.batchMetadata.open(anchor, {
                initialAction: action === "add-tag" ? "tag" : "property",
                paths: new Set([path])
            });
            if (session?.panel) await new Promise(resolve => registerPickerCleanup(session.panel, resolve));
            return true;
        }
        if (action === "delete") {
            return this.deleteFiles([file]);
        }
        return false;
    },


    async deleteFiles(files) {
        const targets = (files || []).filter(file => file instanceof TFile);
        if (!targets.length) return false;

        const deletePrompt = targets.length > 1
            ? `你确定要删除选中的 ${targets.length} 个文件吗？`
            : `你确定要删除“${targets[0].basename || targets[0].name}”吗？`;
        if (this.plugin.settings.confirmBeforeDelete !== false) {
            const decision = await this._confirmAction({
                title: "删除文件",
                message: deletePrompt,
                detail: "将按照 Obsidian 当前删除设置处理。",
                confirmText: "删除",
                danger: true,
                allowDontAskAgain: true
            });
            if (!decision.confirmed) return false;
            if (decision.dontAskAgain) {
                this.plugin.settings.confirmBeforeDelete = false;
                await this.plugin.saveSettings();
            }
        }
        const selection = this.selection;
        if (!selection?.beginMutation("deleting")) return false;

        try {
            const result = await this.plugin.fileOperations.deleteFiles(targets);
            selection.removePaths(result.processedPaths);

            if (result.processedPaths.length) {
                // Index flush 在 Mutation 期间只更新数据；删除完成后由 Result Owner 一次性提交结果与 Controls。
                // 排除已删除路径作为 viewport anchor，避免锚点落在刚被移除的卡片上。
                this._refreshCurrentResultsAfterMutation({
                    preserveSelection: true,
                    excludedPaths: result.processedPaths,
                    refreshPools: true
                });
            }

            if (result.failed.length) new Notice(`删除失败 ${result.failed.length} 个文件`);
            return result.failed.length === 0;
        } finally {
            selection.endMutation("deleting");
        }
    },
};


// Instance method owner. `this` is the unchanged SearchCore instance. No additional state store.
export const SearchCore_open_selection_methods = {


    // DOM 位置仅用于键盘游标；文件按 path、历史按原文解析当前结果。
_resolveResultElement(el) {
    if (!el?.dataset.path) return null;

    return this.fullResults.find(
        r => r.path === el.dataset.path
    ) || null;
},


    async _chooseExternalFile(file) {
        if (!this.externalPickHandler || !(file instanceof TFile)) return false;
        try {
            const result = await Promise.resolve(this.externalPickHandler(file));
            if (result === false) return true;
            if (this.closeOnExternalPick) this.close();
            return true;
        } catch (error) {
            console.error("外部选择文件失败", error);
            new Notice("选择文件失败");
            return false;
        }
    },


    async openSelectedNote(newTab = false) {
        if (this.selectedIndex < 0 || this.selectedIndex >= this.resultEls.length) return;
        const el = this.resultEls[this.selectedIndex];
        const target = this._resolveResultElement(el);
        if (!target) return;
        if (this.externalPickHandler) {
            return this._chooseExternalFile(target.file);
        }
        return this._openResultFromSearch(target.file, {
            newTab,
            excludedPath: target.path
        });
    },


    // 键盘结果游标的 active 样式清理由 SearchCore 保留，
    // 结果列表本身仍由 SearchResultRendererController 唯一渲染。
    clearSelected() {
        for (const el of this.resultEls) el.classList.remove("is-current");
    },
};

