// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { isDomButton, isDomHTMLElement, isDomInput } from "../../utils/dom.js";
import { FilterState } from "../filters/filter-state.js";
import { Notice } from "obsidian";
// Instance method owner. `this` is the unchanged SearchCreateController instance. No additional state store.
export const SearchCreateController_input_mode_methods = {


    _refreshCreatePreview({ refreshPools = false } = {}) {
        const core = this.owner;
        if (!core || core._destroyed || !this.isCreateView()) return;

        const rail = core.resultsRail;
        const preview = isDomHTMLElement(rail)
            ? rail.querySelector(":scope > .local-search-quick-create-preview")
            : null;
        if (preview && typeof preview._lsRefreshMetadata === "function") {
            preview._lsRefreshMetadata();
            this._syncCreateTitlePreview();
        } else {
            // Composer 结构始终唯一；空标题也保留同一 Preview，只把主按钮 disabled。
            core.resultRenderer?.renderPage?.({ syncControls: false });
        }
        if (refreshPools) core.resultControls?.refreshFilterPoolHeader?.();
    },


    _syncQuickCreateButton(button, rawTitle = this.currentCreateTitle()) {
        if (!isDomButton(button)) return;
        const title = String(rawTitle || "").replace(/\s+/g, " ").trim();
        const typeOption = this._createTypeOption();
        const submitting = this._createInFlight;
        const pending = this.createDraft?.pendingCreation;
        const label = pending ? (submitting ? "补写中…" : "补写未完成的属性") : submitting
            ? "创建中…"
            : (title ? `＋ 创建“${title}”` : `＋ 创建${typeOption.label}`);
        if (button.textContent !== label) button.textContent = label;
        const accessibleLabel = pending ? label : submitting
            ? `正在创建${typeOption.label} ${title}`
            : (title ? `创建${typeOption.label} ${title}` : `输入名称后创建${typeOption.label}`);
        if (button.getAttribute("aria-label") !== accessibleLabel) {
            button.setAttribute("aria-label", accessibleLabel);
        }
        const disabled = submitting || !title;
        if (button.disabled !== disabled) button.disabled = disabled;
        if (button.getAttribute("aria-busy") !== String(submitting)) {
            button.setAttribute("aria-busy", String(submitting));
        }
    },


    _syncCreateTitlePreview() {
        const core = this.owner;
        const rail = core?.resultsRail;
        if (!core || core._destroyed || !this.isCreateView() || !isDomHTMLElement(rail)) return;

        const preview = rail.querySelector(":scope > .local-search-quick-create-preview");
        if (!preview) {
            core.resultRenderer?.renderPage?.({ syncControls: false });
            return;
        }
        this._syncQuickCreateButton(
            preview.querySelector(".local-search-quick-create-primary"),
            this.currentCreateTitle()
        );
    },


    isCreateMode() {
        return this.inputMode === "create";
    },


    isDerivedCreateView() {
        return !this.isCreateMode() && this.searchFilterState instanceof FilterState;
    },


    isCreateView() {
        return this.isCreateMode() || this.isDerivedCreateView();
    },


    currentCreateTitle() {
        const core = this.owner;
        const raw = this.isCreateMode()
            ? this.quickCreateTitle
            : (this.isDerivedCreateView() ? core?.queryState?.raw : "");
        return String(raw || "").replace(/\s+/g, " ").trim();
    },


    searchResultFilterState() {
        if (this.isDerivedCreateView()) return this.searchFilterState;
        return this.owner?.filterState;
    },


    _leaveDerivedCreateView({ resetDraft = true } = {}) {
        const core = this.owner;
        if (!this.isDerivedCreateView()) return false;
        if (core && this.searchFilterState instanceof FilterState) {
            core.filterState = this.searchFilterState;
        }
        this.searchFilterState = null;
        this.searchQuery = "";
        this.quickCreateTitle = "";
        if (resetDraft) this.createDraft = this._makeCreateDraft();
        this.syncInputModeView();
        // The state-pointer handoff and its projections have one owner. Every
        // exit (erase, new query, back, clear) must discard Draft-only chips,
        // type highlights and pool visibility together with the Draft itself.
        core.facets?.syncFilterButtons?.();
        core.resultControls?.refreshFilterPoolHeader?.();
        return true;
    },


    prepareSearchEvaluation() {
        if (this.isCreateMode()) return false;
        return this._leaveDerivedCreateView();
    },


    syncDerivedCreateViewState() {
        const core = this.owner;
        if (!core || core._destroyed || this.isCreateMode()) return false;
        // A hidden results pane may still refresh after indexing/filter changes.
        // It must not turn the visible navigation page into a create draft or
        // re-open its search header. Enter the composer when results are shown.
        const showingResults = !core.navigator || core.navigator.layout !== "mobile"
            || core.navigator.page === "results";
        const shouldCreate = Boolean(
            showingResults && core.allowCreate
            && core.queryState?.active
            && core.fullResults?.length === 0
        );

        if (!shouldCreate) {
            this._leaveDerivedCreateView();
            return false;
        }

        const entering = !this.isDerivedCreateView();
        if (entering) {
            this.searchFilterState = core.filterState;
            this.searchQuery = String(core.queryState.raw || "");
            this.createDraft = this._makeCreateDraft(this.searchFilterState);
            core.filterState = this.createDraft.filterState;
        }
        this.quickCreateTitle = String(core.queryState.raw || "");
        this.syncInputModeView();
        if (entering) {
            core.facets?.syncFilterButtons?.();
            core.resultControls?.refreshFilterPoolHeader?.();
            core._syncResultStateRow?.();
        }
        return true;
    },


    activeInputHasValue() {
        const core = this.owner;
        return Boolean(String(core?.searchInput?.value || "").trim());
    },


    syncInputModeView() {
        const core = this.owner;
        const input = core?.searchInput;
        if (!isDomInput(input)) return;

        const createMode = this.isCreateMode();
        const createView = this.isCreateView();
        input.readOnly = Boolean(createView && (this._createInFlight || this.createDraft?.pendingCreation));
        if (createMode && input.value !== this.quickCreateTitle) {
            input.value = this.quickCreateTitle;
        }
        const createType = this._createTypeOption();
        const placeholder = createMode
            ? `创建${createType.label}…`
            : "搜索文件、标签或正文…";
        const ariaLabel = createMode
            ? `创建${createType.label}`
            : "搜索文件、标签或正文";
        // 与 Picker Search 一致：输入期间不反复改写 input attributes。
        // 只有真实模式/类型导致文本发生变化时才更新；不设置 enterkeyhint/inputmode，
        // 避免 WebKit 把同一个文本框重新解释成另一种输入控件。
        if (input.placeholder !== placeholder) input.placeholder = placeholder;
        if (input.getAttribute("aria-label") !== ariaLabel) input.setAttribute("aria-label", ariaLabel);
        core.containerEl?.classList.toggle("is-create-input-mode", createView);
        core.resultControls?.syncInputActions?.();
        core.sorting?.sync();
    },


    enterCreateMode() {
        if (this.isCreateMode()) return true;
        return this.toggleInputMode();
    },


    toggleInputMode({ focusInput = true, searchQueryOnExit = null, refreshResultsOnExit = false } = {}) {
        const core = this.owner;
        const input = core?.searchInput;
        if (!core || core._destroyed || !core.allowCreate || !isDomInput(input) || core.selection?.busy) {
            return false;
        }

        const enteringCreate = !this.isCreateMode();
        if (!enteringCreate && this.createDraft?.pendingCreation) {
            new Notice("文件已创建，属性尚未完成。可补写属性，或选择“保留文件并返回”");
            return false;
        }
        // 模式按钮双向保持既有输入会话；只有明确要求结束输入的入口才释放焦点。
        if (!enteringCreate && !focusInput && input.ownerDocument.activeElement === input) input.blur();
        if (core.searchTimer) {
            clearTimeout(core.searchTimer);
            core.searchTimer = null;
        }
        core.dropdown.close(false);
        core.swipe?.closeAll?.({ immediate: true });
        if (core.selection?.batchMode) core.selection.exitBatchMode();
        else if (core.selection?.selectedPaths?.size) core.selection.clear();

        if (enteringCreate) {
            // 搜索 0 命中的派生 Create View 已经持有同一个 CreateDraft；
            // 显式进入创建只提升 inputMode，不复制 Draft，也不覆盖冻结的搜索 FilterState。
            if (this.isDerivedCreateView()) {
                this.inputMode = "create";
                this.quickCreateTitle = String(core.searchInput?.value ?? core.queryState.raw);
            } else {
                // 只在进入瞬间快照一次。之后顶部 Picker 只编辑 CreateDraft，
                // 搜索 FilterState / Query 被完整冻结，退出时原样恢复。
                this.searchFilterState = core.filterState;
                this.searchQuery = String(core.searchInput?.value ?? core.queryState.raw);
                this.quickCreateTitle = this.searchQuery;
                this.createDraft = this._makeCreateDraft(this.searchFilterState);
                core.filterState = this.createDraft.filterState;
                this.inputMode = "create";
            }
            // 搜索 Query / Results / Sort 全部冻结，不做一次无意义的重搜。
            // Create Composer 只替换结果区视图与 FilterState 指针。
            core.resultRenderer?.renderPage?.();
            if (input.isConnected) input.value = this.quickCreateTitle;
        } else {
            const restoreFilter = this.searchFilterState instanceof FilterState
                ? this.searchFilterState
                : new FilterState();
            const restoreQuery = typeof searchQueryOnExit === "string" ? searchQueryOnExit : this.searchQuery;
            this.inputMode = "search";
            core.filterState = restoreFilter;
            this.searchFilterState = null;
            this.searchQuery = "";
            this.createDraft = this._makeCreateDraft();
            if (input.isConnected) input.value = restoreQuery;
            this.quickCreateTitle = "";

            if (refreshResultsOnExit || core.queryState.raw !== restoreQuery) {
                // 创建成功后的返回必须读取最新索引，而不是继续显示进入创建前冻结的结果。
                // 普通手动切换仍可直接复用原有 Search Snapshot。
                core.performSearch(restoreQuery);
            } else {
                core.resultRenderer?.renderPage?.();
            }
        }

        this.syncInputModeView();
        core._notifyStateChange();
        core.facets?.syncFilterButtons?.();
        // 模式切换会改变 Filter Pool 的可用值投影与 Result Channel 可见性；
        // 这是 Header 自身的正式刷新入口，而不是依赖 Result Window 顺带重绘。
        core.resultRenderer?.refreshResultChannels?.();
        core.resultRenderer?._renderFilterPoolHeader?.();
        // 模式切换也是状态行可见性的正式输入：Create 隐藏结果频道但保留清空，
        // Search 按 Query / FilterState 重新决定是否显示。
        // 不依赖后续筛选或结果渲染“顺带”刷新，避免旧按钮残留。
        core._syncResultStateRow?.();

        // 进入创建时按需聚焦；从模式按钮退出时若 input 原本已聚焦则自然保持，
        // 不制造 blur → focus 补救链。搜索记录等入口仍可显式决定是否重新聚焦。
        if (enteringCreate && focusInput && input.ownerDocument.activeElement !== input && input.isConnected) {
            input.focus({ preventScroll: true });
        }
        return true;
    },


    clearActiveInput({ keepFocus = true } = {}) {
        const core = this.owner;
        const input = core?.searchInput;
        if (
            !core
            || core._destroyed
            || !isDomInput(input)
            || !input.value
            || this._createInFlight
            || this.createDraft?.pendingCreation
        ) {
            return false;
        }

        if (core.searchTimer) {
            clearTimeout(core.searchTimer);
            core.searchTimer = null;
        }
        core.dropdown.close(false);
        input.value = "";
        // performSearch / handleInput already publish the input action state;
        // a second sync here can repaint the same control during iOS blur.
        if (this.isCreateMode()) this.handleInput("");
        else core.performSearch("");

        if (keepFocus && input.isConnected && input.ownerDocument.activeElement !== input) {
            input.focus({ preventScroll: true });
        }
        return true;
    },


    handleInput(value) {
        if (!this.isCreateMode()) return false;
        if (this._createInFlight || this.createDraft?.pendingCreation) return true;
        this.quickCreateTitle = String(value || "");
        // 输入热路径只更新标题拥有的 DOM；不触碰 Header、Facet、Selection 或整块 Composer。
        this._syncCreateTitlePreview();
        this.owner?._notifyStateChange();
        return true;
    },


    async submitCreateView() {
        if (!this.isCreateView() || this._createInFlight) return false;
        const title = this.currentCreateTitle();
        if (!title) return false;
        // 标题校验只由 createNewNote() 的正式创建链执行一次，避免模式入口维护第二套校验。
        await this.createNewNote(this._currentCreateType(), title);
        return true;
    },
};

