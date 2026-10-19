// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { TAB_VIEW_TYPE, VIEW_TYPE } from "../../core/view-types.js";
import { OperationOverlayController } from "../../ui/overlays/OperationOverlayController.js";
import { Notice, TFile } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_file_command_actions_methods = {


    // 命令栏与 GLS 批量选择共用原有 SearchCore.deleteFiles()，
    // 不新增第二套删除确认或独立的选中路径仓库。
    // 只读取前台 Search Modal / Floating 或当前活动 Search Tab / Sidebar。
    _commandSearchSelectionCore() {
        const alive = core => core && !core._destroyed
            && core.containerEl?.isConnected && this.activeSearchCores.has(core);
        const session = this.searchSession;
        if (session?.modalEl?.isConnected && !session._closing) {
            return alive(session.core) ? session.core : null;
        }
        const leaf = this.app.workspace.activeLeaf;
        const view = leaf?.view;
        const viewType = view?.getViewType?.();
        if ((viewType === TAB_VIEW_TYPE || viewType === VIEW_TYPE) && alive(view.core)) {
            return view.core;
        }
        // 侧栏或嵌入式搜索只在它确实持有当前输入焦点时接管命令，
        // 不会误取已隐藏搜索实例中残留的选中状态。
        const focused = [...this.activeSearchCores].filter(core => alive(core)
            && core.containerEl.contains(core.containerEl.ownerDocument.activeElement));
        return focused.length === 1 ? focused[0] : null;
    },


    _deleteFromCommand() {
        if (this._commandSelectionDeletePending) return false;
        const core = this._commandSearchSelectionCore();
        if (core?.externalPickHandler || core?.externalSelectionHandler) {
            new Notice("当前文件选择界面不支持删除");
            return false;
        }
        if (core?.selection?.batchMode) {
            const selection = core.selection;
            if (selection.busy || core._confirmSession) return false;
            if (!selection.selectedPaths.size) {
                new Notice("请先选择要删除的文件");
                return false;
            }
            // 路径在命令触发当下从 Vault 重新解析，避免删除已重命名或已失效文件。
            const files = core._filesFromPaths(selection.selectedPaths);
            if (!files.length) {
                new Notice("选中的文件已不存在");
                return false;
            }
            this._commandSelectionDeletePending = true;
            void core.deleteFiles(files).catch(error => {
                if (!this._unloaded) {
                    console.error("命令删除选中文件失败", error);
                    new Notice(error?.message || "删除选中文件失败");
                }
            }).finally(() => { this._commandSelectionDeletePending = false; });
            return true;
        }

        // 保留原命令语义：未进入 GLS 批量模式时仅删除当前活动文件。
        const file = this.app.workspace.getActiveFile();
        if (!(file instanceof TFile)) {
            new Notice("当前没有可删除的活动文件");
            return false;
        }
        this._openCurrentFileOperation("delete", file);
        return true;
    },


    _openCurrentFileOperation(kind, file) {
        const existing = this._currentFileOperationOverlay;
        if (existing && !existing._closed) {
            const directDelete = kind === "delete"
                && this.settings.confirmBeforeDelete === false;
            if (existing.kind === kind && !directDelete) {
                existing.close();
                return null;
            }
            existing.close();
        }

        if (kind === "delete" && this.settings.confirmBeforeDelete === false) {
            void this.fileOperations.deleteFiles([file]).then(result => {
                if (result.failed.length) new Notice("文件删除失败");
            });
            return null;
        }

        const overlay = new OperationOverlayController(this.app, this, file, kind);
        this._currentFileOperationOverlay = overlay;
        overlay.open();
        return overlay;
    },
};

