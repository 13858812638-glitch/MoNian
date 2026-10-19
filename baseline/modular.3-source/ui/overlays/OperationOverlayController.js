// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { disposePickerCleanup } from "../../core/picker-cleanup.js";
import { createSharedFolderCountProvider, sharedFolderAncestors } from "../../data/folders/folder-tree.js";
import { activeWorkspaceDocument } from "../../utils/dom.js";
import { createSharedDialogSurface } from "../dialogs/dialog-surface.js";
import { createDialogSubmission } from "../dialogs/submission.js";
import { renderSharedFolderTreePicker } from "../pickers/folder-picker.js";
import { LocalSearchOverlayHost } from "./LocalSearchOverlayHost.js";
import { Notice, TFile } from "obsidian";


export class OperationOverlayController {
    constructor(app, plugin, file, kind) {
        this.app = app;
        this.plugin = plugin;
        this.file = file;
        this.kind = kind;
        this._closed = false;
        this._dialogSubmission = null;
        this._picked = false;
        this.overlayEl = null;
        this.surfaceEl = null;
        this._overlayHost = null;
    }

    open() {
        if (this._closed || this.overlayEl?.isConnected) return this;
        const current = this.app.vault.getAbstractFileByPath(this.file.path);
        if (!(current instanceof TFile)) {
            new Notice("当前文件已不存在");
            this.close();
            return this;
        }

        this._overlayHost = new LocalSearchOverlayHost({
            className: "local-search-command-overlay",
            ownerDocument: activeWorkspaceDocument(this.app),
            swipeBack: this.plugin.swipeBack,
            canClose: () => !this._dialogSubmission?.busy,
            onClose: () => {
                disposePickerCleanup(this.surfaceEl);
                this.plugin._hoverHintObserver?.forgetRoot(this.overlayEl);
                this._closed = true;
                this._dialogSubmission = null;
                this.overlayEl = null;
                this.surfaceEl = null;
                this._overlayHost = null;
                if (this.plugin?._currentFileOperationOverlay === this) {
                    this.plugin._currentFileOperationOverlay = null;
                }
            }
        });
        const overlay = this._overlayHost.open();
        this.overlayEl = overlay;

        if (this.kind === "delete") this._renderDelete(current);
        else this._renderMove(current);
        this.plugin._hoverHintObserver?.observeRoot(overlay);
        return this;
    }

    _createCloseButton(surface) {
        return this._overlayHost?.createCloseButton(surface, { positioned: true });
    }

    _renderMove(current) {
        const surface = this.overlayEl.createDiv({
            cls: "local-search-dropdown local-search-move-dropdown local-search-picker-dropdown local-search-centered-picker-surface local-search-command-shared-picker"
        });
        this.surfaceEl = surface;
        surface.createDiv({
            cls: "local-search-dropdown-title",
            text: `移动「${current.basename || current.name}」`
        });
        this._createCloseButton(surface);

        const expanded = new Set(sharedFolderAncestors(current.parent?.path || ""));
        const countInFolder = createSharedFolderCountProvider(
            Array.from(this.plugin.fileMetaCache.values())
        );
        renderSharedFolderTreePicker({
            app: this.app,
            plugin: this.plugin,
            panel: surface,
            expanded,
            selectedPath: current.parent?.path || "",
            rootPath: "",
            badgeFor: countInFolder,
            autoLocate: true,
            onChoose: async path => {
                if (this._picked || this._closed) return;
                this._picked = true;
                const latest = this.app.vault.getAbstractFileByPath(this.file.path);
                if (!(latest instanceof TFile)) {
                    new Notice("当前文件已不存在");
                    this.close();
                    return;
                }
                const result = await this.plugin.fileOperations.moveFiles([latest], path);
                if (result.failed.length) new Notice("文件移动失败");
                this.close();
            }
        });
    }

    _renderDelete(current) {
        const host = this.overlayEl.createDiv({ cls: "local-search-command-shared-confirm-host" });
        this.surfaceEl = host;
        const surface = createSharedDialogSurface(host, {
            title: "删除文件",
            message: `你确定要删除 “${current.basename || current.name}” 吗？`,
            detail: "将按照 Obsidian 当前删除设置处理。",
            confirmText: "删除",
            danger: true,
            closeable: true,
            optionLabel: "不再询问",
            onFinish: (confirmed, controls) => {
                if (!confirmed) { this.close(); return; }
                if (this._closed || this._dialogSubmission?.busy) return;
                void this._dialogSubmission?.submit(async () => {
                    if (controls.optionInput?.checked) {
                        this.plugin.settings.confirmBeforeDelete = false;
                        await this.plugin.saveSettings();
                    }
                    const latest = this.app.vault.getAbstractFileByPath(this.file.path);
                    if (!(latest instanceof TFile)) throw new Error("当前文件已不存在");
                    const result = await this.plugin.fileOperations.deleteFiles([latest]);
                    if (result.failed.length) throw new Error("文件删除失败");
                }, [controls.cancelButton, controls.confirmButton, controls.optionInput, controls.closeButton]
                    .filter(Boolean), "文件删除失败");
            }
        });
        surface.dialog.addClass("local-search-command-shared-confirm", "local-search-file-delete-dialog", "local-search-file-operation-dialog");
        this._dialogSubmission = createDialogSubmission(surface.dialog,
            () => !this._closed && surface.dialog.isConnected,
            () => this.close(),
            (error, fallback) => new Notice(error?.message || fallback));
        surface.cancelButton.focus({ preventScroll: true });
    }

    close() {
        if (this._closed) return;
        if (this._overlayHost?.close() === false) return false;
        this._closed = true;
        this.overlayEl = null;
        this.surfaceEl = null;
        this._overlayHost = null;
        if (this.plugin?._currentFileOperationOverlay === this) {
            this.plugin._currentFileOperationOverlay = null;
        }
    }
}
