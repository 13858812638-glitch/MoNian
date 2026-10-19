// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { createSearchButton } from "../../ui/components/input-controls.js";
import { Notice, TFile, setIcon } from "obsidian";


export const SEARCH_SELECTION_UI_REF_KEYS = Object.freeze("toolbar normalPanel batchPanel batchEntryBtn batchSelectToggleBtn expandActionsBtn externalSubmitBtn tagMetadataBtn propertyMetadataBtn moveFilesBtn deleteFilesBtn exitBatchBtn normalCurrentEl normalTotalEl batchSelectedEl batchResultEl".split(" "));


// ========== SearchSelectionController：选择状态 / 查看已选 / 批量互斥锁唯一实现 ==========
export class SearchSelectionController {
    constructor(owner) {
        this.owner = owner;
        this.selectedPaths = new Set();
        this.anchorPath = null;
        this.shiftBasePaths = null;
        this.mutationState = "idle";
        this.batchMode = Boolean(owner?.externalSelectionStartInBatchMode);
        for (const key of SEARCH_SELECTION_UI_REF_KEYS) this[key] = null;
    }

    get busy() {
        return this.mutationState !== "idle";
    }

    resetShiftRange() {
        this.shiftBasePaths = null;
    }

    _iconButton(parent, icon, label, className = "", interaction = "chrome", role = "selection") {
        const baseClass = role === "entry"
            ? "local-search-batch-mode-toggle"
            : "local-search-selection-icon-action";
        const button = createSearchButton(parent, interaction, {
            cls: [baseClass, className].filter(Boolean).join(" "),
            attr: { title: label, "aria-label": label }
        });
        setIcon(button, icon);
        button.dataset.lsIcon = icon;
        return button;
    }

    _statItem(parent, label, value = 0) {
        const item = parent.createSpan({ cls: "local-search-stats-item" });
        const indicator = item.createSpan({ cls: "local-search-stats-indicator" });
        indicator.createSpan({ text: label, cls: "local-search-stats-label" });
        indicator.createSpan({
            text: "·",
            cls: "local-search-stats-dot",
            attr: { "aria-hidden": "true" }
        });
        return indicator.createSpan({
            text: String(value),
            cls: "local-search-stats-value"
        });
    }

    buildToolbar() {
        const core = this.owner;
        if (!core?.containerEl) return null;

        this.toolbar = core.containerEl.createDiv({
            cls: "local-search-results-header"
        });

        this.normalPanel = this.toolbar.createDiv({
            cls: "local-search-status-summary"
        });
        const normalStats = this.normalPanel.createDiv({
            cls: "local-search-status-items",
            attr: { role: "status", "aria-live": "polite", "aria-atomic": "true" }
        });
        this.normalCurrentEl = this._statItem(normalStats, "结果", 0);
        normalStats.createSpan({ cls: "local-search-stats-separator", attr: { "aria-hidden": "true" } });
        this.normalTotalEl = this._statItem(normalStats, "全部", 0);
        const normalActions = this.normalPanel.createDiv({ cls: "local-search-status-action-rail", attr: { "aria-label": "结果筛选与批量入口" } });
        core.facets?.buildTypeActions?.(normalActions);
        this.batchEntryBtn = this._iconButton(
            normalActions,
            "list-checks",
            "进入批量操作",
            "",
            "choice",
            "entry"
        );
        this.batchEntryBtn.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (this.batchMode) this.exitBatchMode(); else this.enterBatchMode();
        });

        this.batchPanel = this.toolbar.createDiv({
            cls: "local-search-status-summary local-search-batch-summary"
        });
        const selectedStatus = this.batchPanel.createDiv({
            cls: "local-search-batch-selected",
            attr: { role: "status", "aria-live": "polite", "aria-atomic": "true" }
        });
        this.batchSelectedEl = this._statItem(selectedStatus, "已选", 0);
        selectedStatus.createSpan({
            cls: "local-search-stats-separator",
            attr: { "aria-hidden": "true" }
        });
        this.batchResultEl = this._statItem(selectedStatus, "结果", 0);

        // 单层 Batch Action Rail：未固定动作可滚动，固定动作留在右侧；
        // 两组都是第三行直接子项，视觉间距只由 --ls-action-rail-gap 唯一负责。
        const actions = this.batchPanel.createDiv({ cls: "local-search-batch-actions", attr: { "aria-label": "批量操作" } });
        const controls = this.batchPanel.createDiv({ cls: "local-search-status-action-rail", attr: { "aria-label": "批量选择" } });
        if (core.externalSelectionHandler) {
            this.externalSubmitBtn = this._iconButton(
                actions,
                "check",
                core.externalSelectionActionLabel,
                "",
                "action"
            );
            this.externalSubmitBtn.addEventListener("click", () => void this.submitExternalSelection());
        }

        this.tagMetadataBtn = this._iconButton(actions, "tags", "标签");
        this.propertyMetadataBtn = this._iconButton(actions, "list-filter", "属性");
        this.moveFilesBtn = this._iconButton(actions, "folder-input", "移动到");
        this.deleteFilesBtn = this._iconButton(actions, "trash-2", "删除文件", "is-danger-action");
        this.batchSelectToggleBtn = this._iconButton(controls, "list-checks", "全选当前结果", "", "choice");
        this.batchSelectToggleBtn.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            this.toggleSelectAll();
        });
        this.expandActionsBtn = this._iconButton(controls, "panel-bottom-open", "展开全部左滑按钮", "", "choice");
        this.expandActionsBtn.addEventListener("click", event => {
            event.preventDefault(); event.stopPropagation();
            if (!this.batchMode || this.expandActionsBtn.disabled) return;
            core.swipe?.setAllExpanded(!core.swipe.allExpanded);
            this.syncControls();
        });
        this.exitBatchBtn = this._iconButton(controls, "x", "退出批量操作", "is-exit", "choice");

        this.tagMetadataBtn.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (this.tagMetadataBtn.disabled) return;
            core.batchMetadata.open(this.tagMetadataBtn, { initialAction: "tag" });
        });
        this.propertyMetadataBtn.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (this.propertyMetadataBtn.disabled) return;
            core.batchMetadata.open(this.propertyMetadataBtn, { initialAction: "property" });
        });
        this.moveFilesBtn.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (this.moveFilesBtn.disabled) return;
            const files = core._filesFromPaths(this.selectedPaths);
            if (files.length) core.showMovePickerForFiles(files, this.moveFilesBtn);
        });
        this.deleteFilesBtn.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (this.deleteFilesBtn.disabled) return;
            const files = core._filesFromPaths(this.selectedPaths);
            void core.deleteFiles(files).catch(error => {
                if (!core._destroyed) {
                    console.error("批量删除流程失败", error);
                    new Notice("批量删除失败");
                }
            });
        });
        this.exitBatchBtn.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            this.exitBatchMode();
        });

        if (core.externalPickHandler) {
            this.toolbar.hidden = true;
            this.toolbar.setAttribute("aria-hidden", "true");
        }

        // Shell 阶段只建立稳定几何，不扫描结果集 / Vault。
        // 第一轮正式结果完成后 renderPage() 会进入 syncControls()，一次性写入真实统计与可用状态。
        core.containerEl.classList.toggle("is-batch-mode", this.batchMode);
        this.normalPanel?.toggleAttribute("hidden", this.batchMode);
        this.batchPanel?.toggleAttribute("hidden", !this.batchMode);
        for (const button of [
            this.batchEntryBtn,
            this.batchSelectToggleBtn,
            this.expandActionsBtn,
            this.externalSubmitBtn,
            this.tagMetadataBtn,
            this.propertyMetadataBtn,
            this.moveFilesBtn,
            this.deleteFilesBtn,
            this.exitBatchBtn
        ]) {
            if (button) button.disabled = true;
        }
        return this.toolbar;
    }

    updateStats() {
        const core = this.owner;
        if (!core) return;
        const selectedCount = this.selectedPaths.size;
        const currentCount = core.resultRenderer?.visibleResultCount?.() ?? core.fullResults.filter(result => result?.file).length;
        const totalCount = core._visibleVaultFileCount();
        if (this.normalCurrentEl) this.normalCurrentEl.textContent = String(currentCount);
        if (this.normalTotalEl) this.normalTotalEl.textContent = String(totalCount);
        if (this.batchSelectedEl) this.batchSelectedEl.textContent = String(selectedCount);
        if (this.batchResultEl) this.batchResultEl.textContent = String(currentCount);
        this.normalPanel?.querySelector(".local-search-status-items")?.setAttribute(
            "aria-label",
            `当前结果 ${currentCount}，全部文件 ${totalCount}`
        );
        this.batchPanel?.querySelector(".local-search-batch-selected")?.setAttribute(
            "aria-label",
            `已选 ${selectedCount} 个文件，当前结果 ${currentCount}`
        );
    }

    getSelectableResults() {
        const core = this.owner;
        return core.resultRenderer.getVisibleResultIndices()
            .map(index => core.fullResults[index])
            .filter(result => result?.file);
    }

    enterBatchMode() {
        const core = this.owner;
        if (!core || this.batchMode) return false;
        core.dropdown.close(false);
        core.swipe?.closeAll?.({ immediate: true });
        this.batchMode = true;
        this.syncUI();
        return true;
    }

    exitBatchMode() {
        const core = this.owner;
        if (!core) return false;
        this.batchMode = false;
        this.selectedPaths.clear();
        this.anchorPath = null;
        this.resetShiftRange();
        this.syncUI();
        return true;
    }

    externalSelectedFiles() {
        const core = this.owner;
        if (!core?.externalSelectionHandler || !this.selectedPaths.size) return [];
        const files = [];
        for (const path of this.selectedPaths) {
            const file = core.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) files.push(file);
        }
        return files;
    }

    async submitExternalSelection() {
        const core = this.owner;
        if (!core?.externalSelectionHandler || core._destroyed) return false;
        const files = this.externalSelectedFiles();
        if (!files.length) {
            new Notice("请先选择文件");
            return false;
        }
        if (!this.beginMutation("external-submit")) return false;
        let shouldClose = false;
        try {
            const result = await core.externalSelectionHandler(files);
            shouldClose = result !== false && core.closeOnExternalSelectionSubmit;
            return result !== false;
        } catch (error) {
            console.error("外部多选提交失败", error);
            new Notice(error?.message || `${core.externalSelectionActionLabel}失败`);
            return false;
        } finally {
            this.endMutation("external-submit");
            if (shouldClose && !core._destroyed) core.close();
        }
    }

    beginMutation(kind) {
        const core = this.owner;
        if (!core || core._destroyed) return false;
        if (this.busy) {
            new Notice("已有操作正在执行");
            return false;
        }
        this.mutationState = String(kind || "working");
        return true;
    }

    endMutation(kind) {
        if (kind && this.mutationState !== kind) return;
        this.mutationState = "idle";
        this.owner?._scheduleResultIndexUpdate?.();
    }

    clearState() {
        this.selectedPaths.clear();
        this.anchorPath = null;
        this.resetShiftRange();
    }

    clear() {
        this.selectedPaths.clear();
        this.anchorPath = null;
        this.resetShiftRange();
        this.syncUI();
    }

    selectAll() {
        if (!this.batchMode) return;
        this.selectedPaths = new Set(this.getSelectableResults().map(result => result.path));
        this.anchorPath = null;
        this.resetShiftRange();
        this.syncUI();
    }

    toggleSelectAll() {
        if (!this.batchMode) return;
        const selectable = this.getSelectableResults();
        const allSelected = selectable.length > 0
            && selectable.every(result => this.selectedPaths.has(result.path));
        if (allSelected) {
            this.selectedPaths.clear();
            this.anchorPath = null;
            this.resetShiftRange();
            this.syncUI();
        } else {
            this.selectAll();
        }
    }

    togglePath(path) {
        const core = this.owner;
        if (!core || !path || !this.batchMode) return;
        if (this.selectedPaths.has(path)) this.selectedPaths.delete(path);
        else this.selectedPaths.add(path);
        this.anchorPath = path;
        this.resetShiftRange();
        this.syncControls();
        this.syncRenderedItem(path);
    }

    selectRangeTo(index) {
        const core = this.owner;
        if (!core || !this.batchMode) return;

        const target = core.fullResults[index];
        if (!target?.path) return;

        const paths = this.getSelectableResults().map(result => result.path);
        const end = paths.indexOf(target.path);
        if (end < 0) return;

        const anchor = paths.indexOf(this.anchorPath);

        // 没有有效 Anchor 时，第一次 Shift 点击只建立 Anchor / 单选目标。
        if (anchor < 0) {
            this.selectedPaths.add(target.path);
            this.anchorPath = target.path;
            this.resetShiftRange();
            this.syncUI();
            return;
        }

        // 第一次 Shift 冻结“范围操作开始前”的选择集。
        // Anchor 在这份快照中的状态就是本次 Shift 会话的目标状态：
        // 普通点击后 Anchor 为选中 => Shift 批量选中；
        // 普通点击后 Anchor 为取消 => Shift 批量取消。
        if (!(this.shiftBasePaths instanceof Set)) {
            this.shiftBasePaths = new Set(this.selectedPaths);
        }

        const shouldSelect = this.shiftBasePaths.has(this.anchorPath);
        const nextSelected = new Set(this.shiftBasePaths);
        for (let i = Math.min(anchor, end); i <= Math.max(anchor, end); i++) {
            const path = paths[i];
            if (shouldSelect) nextSelected.add(path);
            else nextSelected.delete(path);
        }

        this.selectedPaths = nextSelected;
        // Anchor 只由普通点击重新建立；Shift 本身不漂移 Anchor。
        this.syncUI();
    }

    retainPaths(validPaths) {
        const valid = validPaths instanceof Set ? validPaths : new Set(validPaths || []);
        this.selectedPaths = new Set([...this.selectedPaths].filter(path => valid.has(path)));
        if (this.anchorPath && !valid.has(this.anchorPath)) this.anchorPath = null;
        this.resetShiftRange();
    }

    removePaths(paths) {
        const removing = paths instanceof Set ? paths : new Set(paths || []);
        for (const path of removing) this.selectedPaths.delete(path);
        if (this.anchorPath && !this.selectedPaths.has(this.anchorPath)) this.anchorPath = null;
        this.resetShiftRange();
    }

    remapPathState(oldPath, newPath, { descendants = false } = {}) {
        const core = this.owner;
        if (!core || !oldPath || !newPath) return;
        const replace = path => core.plugin._replacePathPrefix(path, oldPath, newPath, { descendants });
        this.selectedPaths = new Set([...this.selectedPaths].map(replace));
        if (this.anchorPath) this.anchorPath = replace(this.anchorPath);
        this.resetShiftRange();
    }

    removePathPrefix(path) {
        if (!path) return;
        const prefix = path + "/";
        this.selectedPaths = new Set(
            [...this.selectedPaths].filter(item => item !== path && !item.startsWith(prefix))
        );
        if (this.anchorPath && (this.anchorPath === path || this.anchorPath.startsWith(prefix))) {
            this.anchorPath = null;
        }
        this.resetShiftRange();
    }

    syncControls() {
        const core = this.owner;
        if (!core) return;
        const count = this.selectedPaths.size;
        const selectableCount = core.resultRenderer.visibleResultCount();
        const editableCount = count > 0 ? core.batchMetadata.editablePaths().size : 0;
        // 高频控件同步只比较数量；完整结果数组仅在真正“全选 / 范围选择”时构造。
        const allSelected = selectableCount > 0 && count === selectableCount;

        core.containerEl.classList.toggle("is-batch-mode", this.batchMode);
        const active = this.toolbar?.ownerDocument?.activeElement || null;
        const changingPanel = Boolean(this.normalPanel && this.batchPanel)
            && this.normalPanel.hidden !== this.batchMode;
        const restoreToolbarFocus = changingPanel && Boolean(active && this.toolbar?.contains(active));
        if (changingPanel) {
            this.normalPanel.hidden = this.batchMode;
            this.batchPanel.hidden = !this.batchMode;
        }
        this.updateStats();

        // disabled 只表达业务本身是否可用；Mutation Gate 不参与视觉或普通交互状态。
        if (this.batchEntryBtn) {
            this.batchEntryBtn.disabled = !this.batchMode && selectableCount === 0;
            this.batchEntryBtn.classList.toggle("is-selected", this.batchMode);
            this.batchEntryBtn.setAttribute("aria-pressed", String(this.batchMode));
            this.batchEntryBtn.setAttribute("aria-label", this.batchMode ? "退出批量操作" : "进入批量操作");
        }
        if (this.batchSelectToggleBtn) {
            this.batchSelectToggleBtn.disabled = selectableCount === 0;
            const label = allSelected ? "清空当前选择" : `全选当前结果，共 ${selectableCount} 个文件`;
            this.batchSelectToggleBtn.setAttribute("aria-label", label);
            this.batchSelectToggleBtn.setAttribute("title", label);
            const nextIcon = allSelected ? "eraser" : "list-checks";
            if (this.batchSelectToggleBtn.dataset.lsIcon !== nextIcon) {
                this.batchSelectToggleBtn.empty();
                setIcon(this.batchSelectToggleBtn, nextIcon);
                this.batchSelectToggleBtn.dataset.lsIcon = nextIcon;
            }
        }
        if (this.externalSubmitBtn) this.externalSubmitBtn.disabled = count === 0;
        if (this.tagMetadataBtn) this.tagMetadataBtn.disabled = editableCount === 0;
        if (this.propertyMetadataBtn) this.propertyMetadataBtn.disabled = editableCount === 0;
        if (this.moveFilesBtn) this.moveFilesBtn.disabled = count === 0;
        if (this.deleteFilesBtn) this.deleteFilesBtn.disabled = count === 0;
        if (this.exitBatchBtn) this.exitBatchBtn.disabled = false;
        if (this.expandActionsBtn) {
            const expanded = Boolean(core.swipe?.allExpanded);
            const label = expanded ? "收起全部左滑按钮" : "展开全部左滑按钮";
            this.expandActionsBtn.disabled = selectableCount === 0 || Boolean(core.externalPickHandler);
            this.expandActionsBtn.setAttribute("aria-pressed", String(expanded));
            this.expandActionsBtn.setAttribute("aria-label", label);
            this.expandActionsBtn.setAttribute("title", label);
        }

        if (restoreToolbarFocus) {
            const target = this.batchMode
                ? (this.batchSelectToggleBtn?.disabled ? this.exitBatchBtn : this.batchSelectToggleBtn)
                : this.batchEntryBtn;
            target?.focus?.({ preventScroll: true });
        }

        core.swipe?.setEnabled?.(!core.externalPickHandler);
    }

    syncElement(el, path) {
        if (!el || !path) return;
        const selecting = this.batchMode;
        const selected = selecting && this.selectedPaths.has(path);
        el.classList.toggle("is-selected", selected);
        // Dida Result Row：普通态与批量态都进入原生 Tab 顺序；业务语义只切 role / aria-checked。
        el.tabIndex = 0;
        el.removeAttribute("aria-selected");
        if (selecting) {
            el.setAttribute("role", "checkbox");
            el.setAttribute("aria-checked", String(selected));
        } else {
            el.setAttribute("role", "group");
            el.removeAttribute("aria-checked");
        }
        if (el._lsSelecting !== selecting) {
            el._lsSelecting = selecting;
            for (const control of el.querySelectorAll("button, .local-search-result-metadata-flow")) {
                if (selecting && !control.matches(".local-search-batch-title-open, .local-search-card-more")) control.tabIndex = -1;
                else control.removeAttribute("tabindex");
            }
        }
    }

    syncRenderedItem(path) {
        const core = this.owner;
        const el = core?.resultsContainer?.querySelector(
            `.local-search-item[data-path="${CSS.escape(path)}"]`
        );
        if (el) this.syncElement(el, path);
    }

    syncUI() {
        const core = this.owner;
        if (!core) return;
        this.syncControls();
        core._notifyStateChange();
        for (const el of core.resultsContainer?.querySelectorAll(".local-search-item[data-path]") || []) {
            this.syncElement(el, el.dataset.path || "");
        }
    }

    destroy() {
        this.selectedPaths.clear();
        this.anchorPath = null;
        this.resetShiftRange();
        this.mutationState = "idle";
        this.batchMode = false;
        for (const key of SEARCH_SELECTION_UI_REF_KEYS) this[key] = null;
        this.owner = null;
    }
}
