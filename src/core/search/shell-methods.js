// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { SearchNavigatorController } from "../../features/navigator/SearchNavigatorController.js";
import { setSearchAttribute } from "../../interactions/hover-hints.js";
import { setIndicatorLabel } from "../../ui/components/indicator-label.js";
import { createSearchButton, createSearchTextField, createSearchWindowAction } from "../../ui/components/input-controls.js";
import { isDomInput, setDomProperty } from "../../utils/dom.js";
// Instance method owner. `this` is the unchanged SearchCore instance. No additional state store.
export const SearchCore_shell_methods = {


    // Every Search host uses the same portal boundary. A native modal retains
    // its keyboard/focus scope; workspace and embedded hosts use their own document.
    // Never mount viewport surfaces inside a content/size/scroll container.
    popupSurfaceHost() {
        if (!this._popupHost?.isConnected) {
            const host = this.containerEl.closest(".modal-container") || this.containerEl.ownerDocument.body;
            this._popupHost = host.createDiv({ cls: "local-search-content ui-popup-portal" });
            this.plugin._hoverHintObserver?.observeRoot(this._popupHost);
        }
        return this._popupHost;
    },


    async mountShell() {
        this.plugin.activeSearchCores.add(this);
        if (this._destroyed || !this.containerEl) {
            this.plugin.activeSearchCores.delete(this);
            return false;
        }

        this.containerEl.empty();
        this.containerEl.addClass("local-search-content");

        // 主搜索容器作为筛选完成后的稳定焦点锚点。
        this.containerEl.setAttribute("tabindex", "-1");
        if (this.isWorkspaceHost) this.containerEl.addClass("local-search-workspace-host");

        this._buildSearchHeader();
        this._buildFilterBar();
        this.resultControls.buildToolbar();
        this._buildResultShell();
        this._buildWorkspaceLayout();
        this.facets.syncFilterButtons();
        this._bindResultEvents();
        this._bindSearchInput();
        this._syncWorkbenchPresentation();
        this.plugin._hoverHintObserver?.observeRoot(this.containerEl);
        // An explicit create entry owns the first shell frame and its input focus.
        // It must not wait for the file index or first search results.
        if (this.initialCreate) {
            this.initialCreate = false;
            this.createFlow.enterCreateMode();
        }
        return true;
    },


    async startResults() {
        if (this._destroyed || !this.containerEl) return false;
        this.plugin.sharedSearchState?.attach(this);
        // 有可用快照时先显示；后台校验通过原索引通知更新同一个结果 Owner。
        if (this.plugin._indexBuildPromise && !this.plugin._indexCacheRestored
            && !this.plugin.fileMetaCache.size) {
            try {
                await this.plugin._indexBuildPromise;
            } catch (error) {
                console.warn("搜索核心等待索引初始化失败", error);
                this.destroy();
                return false;
            }
        }
        if (this._destroyed || !this.containerEl) return false;
        try {
            this.plugin.sharedSearchState?.consume(this);
            this._initializeResultState();
            return true;
        } catch (error) {
            console.warn("搜索核心结果初始化失败", error);
            this.destroy();
            return false;
        }
    },


    async init() {
        if (!await this.mountShell()) return false;
        return this.startResults();
    },



    // Explicitly finish editing (for example the search eraser). Ordinary
    // Picker, sorting and metadata actions must not call this method. Native
    // input-to-input focus transfer is owned by the browser, not this helper.
    _releaseSearchFocusForControl() {
        if (!this.searchInput?.isConnected) return false;

        const isFocused =
            this.searchInput.ownerDocument.activeElement === this.searchInput
            || this.searchInput.matches?.(":focus");
        if (!isFocused) return false;

        this.searchInput.blur();
        return true;
    },


    _buildSearchHeader() {
        const header = this.containerEl.createDiv({
            cls: "local-search-header"
        });

        const heading = header.createDiv({ cls: "local-search-heading" });
        heading.createEl("h2", {
            text: this.headingTitleText,
            cls: "local-search-heading-title"
        });

        if (this.headingCaptionText) {
            heading.createEl("span", { text: this.headingCaptionText, cls: "local-search-heading-caption" });
        }

        // 一级 Modal 与 Dida Bridge 共用同一关闭语义：标题仅负责标题，X 是唯一 Header 关闭入口。
        // X、ESC、右滑、外部窗口交接最终都调用同一个 onCloseRequest → SearchWindowSession.close()。
        if (!this.isWorkspaceHost) {
            const closeBtn = createSearchWindowAction(heading, "x", "关闭");
            closeBtn.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                this.onCloseRequest();
            });
        }

        // 搜索头部只保留一个输入框；创建模式 / 搜索记录 / 视图或清空
        // 全部由 SearchResultControlsController 挂在右侧统一动作区。
        const searchWrap = header.createDiv({
            cls: "local-search-input-wrap"
        });

        const { input: searchInput } = createSearchTextField(searchWrap, {
            fieldClass: "local-search-main-search-field",
            inputClass: "local-search-input",
            type: "text",
            placeholder: "搜索文件、标签或正文…",
            attr: {
                "aria-label": "搜索文件、标签或正文",
                autocomplete: "off",
                autocapitalize: "off",
                spellcheck: "false"
            }
        });
        this.searchInput = searchInput;
        this.searchInput.value = this.queryState.raw;

        this.resultControls.buildHost(searchWrap);

        this._syncSearchHeaderControls();
    },


    _syncSearchHeaderControls() {
        this.resultControls?.syncInputActions?.();
    },




    _syncWorkbenchPresentation() {
        const compact = this.workbenchPresentation;
        this.containerEl.classList.toggle("local-search-workbench", compact);
        if (!compact) return;
        const expanded = this.workbenchToolsExpanded || this.createFlow?.isCreateView?.();
        this.containerEl.classList.toggle("is-workbench-expanded", Boolean(expanded));
        if (this.workbenchToolsButton) {
            const label = expanded ? "收起筛选工具" : "展开筛选工具";
            setSearchAttribute(this.workbenchToolsButton, "aria-label", label);
            setSearchAttribute(this.workbenchToolsButton, "title", label);
            this.workbenchToolsButton.classList.toggle("is-selected", Boolean(expanded));
            setSearchAttribute(this.workbenchToolsButton, "aria-expanded", String(Boolean(expanded)));
            setDomProperty(this.workbenchToolsButton, "disabled", Boolean(this.createFlow?.isCreateView?.()));
        }
    },

    _buildFilterBar() {
        const filterRow = this.containerEl.createDiv({ cls:"local-search-filter-row"});
        
        // Query 与筛选平级；标题优先是搜索引擎固定规则。
        const row1 = filterRow.createDiv({ cls:"local-search-filter-top"});
        const leftWrap = row1.createDiv({ cls:"local-search-filter-left"});

        // 文件类型筛选与排序控件；常态选择操作放在独立批量工具栏。

        this.folderBtn = createSearchButton(leftWrap, "chrome", {
            cls: "local-search-type-btn",
            attr: { "aria-haspopup": "dialog", "aria-expanded": "false" }
        });
        this.tagFilterBtn = createSearchButton(leftWrap, "chrome", {
            cls: "local-search-type-btn",
            attr: { "aria-haspopup": "dialog", "aria-expanded": "false" }
        });
        this.propertyFilterBtn = createSearchButton(leftWrap, "chrome", {
            cls: "local-search-type-btn",
            attr: { "aria-haspopup": "dialog", "aria-expanded": "false" }
        });
        setIndicatorLabel(this.folderBtn, "文件夹");
        setIndicatorLabel(this.tagFilterBtn, "标签");
        setIndicatorLabel(this.propertyFilterBtn, "属性");
this.tagFilterBtn.addEventListener("click", () => {
    if (this.dropdown.closeIfSameAnchor(this.tagFilterBtn)) return;
    this.facets.openTagPicker();
});

this.propertyFilterBtn.addEventListener("click", () => {
    if (this.dropdown.closeIfSameAnchor(this.propertyFilterBtn)) return;
    this.facets.openPropertyPicker();
});

        // 文件类型筛选移入结果状态栏右侧，以图标按钮呈现；
        // 第一行只保留文件夹 / 标签 / 属性和排序，结构与 Dida Bridge 筛选行一致。

        // 排序固定为一个双区控件：左侧字段循环，右侧箭头只切升 / 降序。
        // 排序按钮只消费“结果视图 → 排序”的启用项与拖拽顺序；相关度仅在有搜索词时参与循环。
        const sortSlot = row1.createDiv({
            cls: "local-search-filter-sort-slot"
        });
        let sortParent = sortSlot;
        if (this.workbenchToolbarHost?.isConnected) {
            this._workbenchToolbar?.remove();
            sortParent = this._workbenchToolbar = this.workbenchToolbarHost.createDiv({
                cls: "local-search-content local-search-workbench-toolbar",
                attr: { "aria-label": "资料排序" }
            });
            this.containerEl.addClass("has-workbench-toolbar");
        }
        this.sorting.build(sortParent);

        // 返回箭头用于撤销当前筛选。
        // 文件夹按钮由正式 FilterState 驱动。
this.folderBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (this.dropdown.closeIfSameAnchor(this.folderBtn)) return;
    this.facets.showFolderDropdown();
});

        this.facets.updateFolderButton();

    },


    _buildResultShell() {
        this.selection.buildToolbar();

        // Dida Master v1.1：Filter Pool 是独立稳定 Rail。
        // 左侧常驻值与右侧快捷入口各自原生横向滚动；无额外 Dock / Separator DOM。
        this.filterPoolHost = this.containerEl.createDiv({
            cls: "local-search-filter-pool-rail",
            attr: { role: "group", "aria-label": "快捷筛选池", "aria-hidden": "true" }
        });
        this.filterPoolValues = this.filterPoolHost.createDiv({
            cls: "local-search-filter-pool-values"
        });
        this.filterPoolShortcuts = this.filterPoolHost.createDiv({
            cls: "local-search-filter-pool-shortcuts",
            attr: { role: "group", "aria-label": "固定筛选入口" }
        });
        this.filterPoolHost.hidden = true;
        this.filterPoolValues.hidden = true;
        this.filterPoolShortcuts.hidden = true;

        // 状态行固定占位：结果频道组作为可选前缀，后接当前筛选条件，右侧只负责清空。
        this.propertyFilterRow = this.containerEl.createDiv({ cls:"local-search-condition-bar"});
        const conditionWrap = this.propertyFilterRow.createDiv({ cls: "local-search-condition-wrap" });
        this.resultChannelHost = conditionWrap.createSpan({
            cls: "local-search-result-channel-host"
        });
        this.resultStateSeparator = conditionWrap.createSpan({
            cls: "local-search-result-state-separator",
            attr: { "aria-hidden": "true" }
        });
        this.resultStateSeparator.hidden = true;
        this.activeFilterWrap = conditionWrap.createDiv({ cls:"local-search-active-filter-wrap"});

        this.clearFiltersBtn = createSearchButton(this.propertyFilterRow, "action", {
            text: "清空",
            cls: "local-search-condition-chip local-search-condition-clear",
            attr: {
                "aria-label": "清空搜索词和筛选条件"
            }
        });
        this.clearFiltersBtn.hidden = true;
        this.clearFiltersBtn.addEventListener("click", () => {
            if (this.createFlow?.isCreateMode?.()) {
                this.createFlow.clearCreateConditions();
                return;
            }
            this._clearSearchContext();
        });

        // 初始筛选状态只由 init() 里的 facets.syncFilterButtons() 统一渲染一次。

        // 结果区只保留系统滚动能力；插件的 scroll 热路径仅负责虚拟窗口同步。
        this.resultsShell = this.containerEl.createDiv({ cls: "local-search-results-shell" });
        this.resultsContainer = this.resultsShell.createDiv({ cls:"local-search-results"});
        // Dida Master v1.1：Scroller 与内容 Rail 分离。
        // Scroller 只拥有真实纵向滚动与滚动条位置；Rail 唯一拥有内容 padding、虚拟 spacer 与结果卡。
        this.resultsRail = this.resultsContainer.createDiv({ cls: "local-search-results-inner" });
        // 视口恢复不再隐藏整个结果区等待两帧。
        // 首屏排序完成后直接准备正确页并同步恢复锚点，避免打开时“空一拍 → 再出现结果”。
        this.resultsContainer.addEventListener("scroll", e => {
            if (this._destroyed) return;
            this.resultRenderer.handleScrollLoad(e.currentTarget);
        }, { passive: true });
        this.resultRenderer.attachViewport(this.resultsContainer);

        return true;
    },


    _clearSearchContext() {
        if (this.createFlow?.isCreateMode?.()) return false;
        // 零命中只是搜索派生出的创建预览。先恢复唯一搜索 FilterState，
        // 再清空；不能清了 Draft 又被冻结的旧条件或必需创建类型补回来。
        this.createFlow?._leaveDerivedCreateView();

        const input = this.searchInput;
        const hasQuery = Boolean(
            this.queryState.active || String(input?.value || "").trim()
        );
        const hasFilters = this.filterState.active;
        if (!hasQuery && !hasFilters) return false;

        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
        }
        this.dropdown.close(false);

        if (isDomInput(input)) input.value = "";
        this.filterState.clear();
        this._syncSearchHeaderControls();

        // “清空”与逐个删除当前条件必须进入同一 Filter Mutation 提交链。
        // Filter Pool 的 Selected 背景由 refreshFilterPoolHeader 唯一同步；
        // 禁止在这里手动拆出 syncFilterButtons / performSearch 第二条路径。
        this._onFilterChanged("");
        return true;
    },


    _syncResultStateRow() {
        this._syncWorkbenchPresentation();
        const createMode = Boolean(this.createFlow?.isCreateView?.());
        const explicitCreate = Boolean(this.createFlow?.isCreateMode?.());
        const hasChannels = Boolean(this.resultChannelHost?.childElementCount);
        const hasFilters = Boolean(this.activeFilterWrap?.childElementCount);

        // “当前条件”属于活动 FilterState，而不是结果列表专属 UI。
        // 进入创建模式后 core.filterState 已切到 CreateDraft，因此同一组 Chip
        // 可选字段直接编辑 Draft；类型由 Composer 唯一表达。
        // 自动创建预览仍是“清空搜索”；主动创建只清 Draft 条件，保留标题与模式。
        const navigationOnly = this.navigator?.layout === "mobile"
            && this.navigator.page === "filters";
        const channelsVisible = !createMode && !navigationOnly && hasChannels;
        // Query text belongs to the input and its eraser, not the condition
        // rail. The default create type is not a removable condition either.
        // A channels-only rail is useful only for an actual result switch.
        const clearable = hasFilters;
        const visible = hasFilters || channelsVisible;

        if (this.resultChannelHost) {
            setDomProperty(this.resultChannelHost, "hidden", !channelsVisible);
            setSearchAttribute(this.resultChannelHost, "aria-hidden", String(!channelsVisible));
        }
        if (this.resultStateSeparator) {
            const separatorVisible = channelsVisible && hasFilters;
            setDomProperty(this.resultStateSeparator, "hidden", !separatorVisible);
            setSearchAttribute(this.resultStateSeparator, "aria-hidden", String(!separatorVisible));
        }
        if (this.clearFiltersBtn) {
            setDomProperty(this.clearFiltersBtn, "disabled", explicitCreate && Boolean(this.createFlow?._createInFlight));
            const hidden = !clearable;
            setDomProperty(this.clearFiltersBtn, "hidden", hidden);
            setSearchAttribute(this.clearFiltersBtn, "aria-hidden", String(hidden));
            setSearchAttribute(this.clearFiltersBtn,
                "aria-label",
                explicitCreate
                    ? "清空创建条件，类型恢复为笔记，保留创建标题"
                    : "清空搜索词和筛选条件"
            );
        }
        if (this.propertyFilterRow) {
            setDomProperty(this.propertyFilterRow, "hidden", !visible);
            setSearchAttribute(this.propertyFilterRow, "aria-hidden", String(!visible));
        }
    },


    _buildWorkspaceLayout() {
        const workspace = this.containerEl.createDiv({ cls: "local-search-workspace" });
        const facets = workspace.createDiv({ cls: "local-search-facets" });
        facets.setAttribute("aria-label", "搜索筛选");
        const main = workspace.createDiv({ cls: "local-search-main-pane" });
        facets.appendChild(this.containerEl.querySelector(".local-search-filter-row"));
        // 固定顶部信息流：结果计数/动作 → 结果频道/筛选池 → 当前条件 → 结果列表。
        // 当前条件是已应用状态，不应位于筛选池入口之前。
        main.append(this.selection.toolbar, this.filterPoolHost, this.propertyFilterRow, this.resultsShell);
        if (this.hostKind === "sidebar") this.navigator = new SearchNavigatorController(this, workspace, facets, main);
    },
};

