// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { registerPickerCleanup } from "../../core/picker-cleanup.js";
import { normalizeModalViewportAnchor } from "../../core/session-values.js";
import { createSharedFolderCountProvider, sharedFolderChildren } from "../../data/folders/folder-tree.js";
import { RESULT_FILE_TYPE_ACTIONS } from "../../data/formats/file-types.js";
import { collectPropertyKeys } from "../../data/properties/property-catalog.js";
import { PRESENT_PROPERTY_VALUE, buildPropertyUsageStats, isSpecialPropertyValue, metaHasProperty, propertyValueDisplay, propertyValueKey } from "../../data/properties/property-values.js";
import { buildTagTreeModel } from "../../data/tags/tag-tree.js";
import { NO_TAGS_FILTER_VALUE, buildHierarchicalTagUsageCounts, tagIdentityKey } from "../../data/tags/tag-values.js";
import { captureScrollableAnchor, restoreScrollableAnchor } from "../../interactions/scroll-anchor.js";
import { createSearchWindowAction } from "../../ui/components/input-controls.js";
import { observePickerCountRail } from "../../ui/pickers/count-rail.js";
import { configureSharedPickerHeader } from "../../ui/pickers/picker-header.js";
import { createSharedPickerTreeRow } from "../../ui/pickers/tree-row.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { SORT_FIELD_DEFS } from "../sort/sort-model.js";
import { NavigatorCustomization } from "./NavigatorCustomization.js";
import { navigatorItemId } from "./customization-model.js";
import { navigatorToolbarActionAvailable, navigatorToolbarCatalog, navigatorToolbarIcon, normalizeNavigatorToolbars } from "./toolbar-config.js";
import { Notice, Platform, setIcon } from "obsidian";



export class SearchNavigatorController {
    constructor(core, workspace, facets, main) {
        this.core = core;
        this.root = core.containerEl;
        this.workspace = workspace;
        this.facets = facets;
        this.main = main;
        this.page = "filters";
        this.layout = "stack";
        this.expanded = new Set();
        this.collapsed = new Set(Platform.isMobile ? ["folder"] : ["properties", "owner"]);
        this.sections = new Map();
        this.cleanups = [];
        this.renderRevision = -1;
        this.searchVisible = false;
        this._projectionCache = new Map();
        this.root.addClass("local-search-navigator");
        this.root.setAttribute("data-ignore-swipe", "true");
        this.header = this.root.querySelector(".local-search-header");
        facets.prepend(this.header);
        const heading = this.header.querySelector(".local-search-heading");
        this.headingTitle = heading.querySelector(".local-search-heading-title");
        this.headingTitle.textContent = "GLS Navigator";
        this.backButton = createSearchWindowAction(heading, "arrow-left", "返回筛选");
        this.backButton.addClass("local-search-nav-back");
        heading.prepend(this.backButton);
        this.backButton.addEventListener("click", () => this.back());
        core.searchInput.placeholder = "搜索文件、内容、标签、属性…";
        core.searchInput.setAttribute("aria-label", "搜索文件、内容、标签、属性");
        this.scroll = facets.createDiv({ cls: "local-search-nav-scroll", attr: { "aria-label": "筛选导航" } });
        this.customization = new NavigatorCustomization(core, { scroll: this.scroll, onChanged: event => {
            if (event?.modeOnly && !event.projection) this._syncMobileTools();
            else this.refreshPreferences();
        } });
        this.footer = facets.createDiv({ cls: "local-search-nav-footer" });
        this.resultsButton = createSearchWindowAction(this.footer, "eye", "查看结果");
        this.resultsButton.addClass("local-search-nav-show-results");
        this.resultsButton.addEventListener("click", () => { if (this.prepareSearch()) this.showResults(); });
        this.resultHeading = main.createDiv({ cls: "local-search-nav-result-heading" });
        main.prepend(this.resultHeading);
        this.resultTitle = this.resultHeading.createDiv({ cls: "local-search-nav-result-title", text: "全部文件" });
        this.resultHeading.append(this.root.querySelector(".local-search-filter-sort-slot"));
        this._buildMobileToolbar();
        this._listen(core.searchInput, "keydown", event => {
            if (event.key !== "Enter" || event.isComposing || event.keyCode === 229 || core.createFlow?.isCreateMode()) return;
            if (this.page !== "filters") return;
            event.preventDefault();
            event.stopImmediatePropagation();
            core.performSearch(core.searchInput.value);
            this.showResults(false);
        }, true);
        this._listen(this.root, "keydown", event => {
            if (event.key !== "Escape" || core.dropdown.isOpen || core._confirmSession || event.isComposing) return;
            if (this.page === "filters" && (this.customization.sortMode || this.customization.maintenanceMode)) {
                event.preventDefault(); event.stopImmediatePropagation(); this.clearSidebarMode(); return;
            }
            if (this.layout === "mobile" && this.page === "results") {
                event.preventDefault(); event.stopImmediatePropagation(); this.back();
            }
        }, true);
        this._listen(this.scroll, "scroll", () => core.onStateChange?.(), { passive: true });
        const win = this.root.ownerDocument.defaultView;
        this.observer = new win.ResizeObserver(() => this.resize());
        this.observer.observe(this.root);
        this.resize();
        this.sync();
    }

    _listen(node, type, fn, options) {
        node.addEventListener(type, fn, options);
        this.cleanups.push(() => node.removeEventListener(type, fn, options));
    }

    _buildMobileToolbar() {
        const core = this.core;
        this.mobileToolbar = this.root.createDiv({ cls: "local-search-nav-mobile-toolbar", attr: { role: "toolbar", "aria-label": "导航操作" } });
        this.tools = new Map();
        this.movedTools = [];
        const slot = (id, button) => {
            const host = this.mobileToolbar.createDiv({ cls: "local-search-nav-tool-slot" });
            host.dataset.navAction = id;
            button.addClass("local-search-nav-tool");
            this.tools.set(id, { host, button });
            return host;
        };
        const action = (id, icon, label, run) => {
            const button = createSearchWindowAction(this.mobileToolbar, icon, label);
            slot(id, button).append(button);
            button.addEventListener("click", event => {
                if (id !== "search") core._releaseSearchFocusForControl();
                run(button, event);
            });
        };
        this._addToolbarAction = action;
        const move = (id, button) => {
            const marker = this.root.ownerDocument.createComment(`navigator-${id}`);
            button.before(marker);
            this.movedTools.push({ button, marker, host: slot(id, button) });
        };
        action("search", "search", "搜索文件", () => {
            core._releaseSearchFocusForControl();
            if (this.page === "filters") {
                if (!this.prepareSearch()) return;
                this.searchVisible = true;
                this.showResults(false);
            } else {
                this.searchVisible = !this.searchVisible;
                this.syncPage();
                core.onStateChange?.();
            }
        });
        action("collapse", "chevrons-down-up", "折叠全部导航", () => {
            if (!this.prepareSearch()) return;
            this.setPage("filters");
            const ids = this._definitions().map(([id]) => id);
            const allCollapsed = ids.every(id => this.collapsed.has(id));
            for (const id of ids) allCollapsed ? this.collapsed.delete(id) : this.collapsed.add(id);
            if (!allCollapsed) this.expanded.clear();
            this.renderRevision = -1; this.sync(); core._notifyStateChange();
        });
        move("results", this.resultsButton);
        action("filters", "list-filter", "返回筛选导航", () => {
            if (!this.prepareSearch()) return;
            if (core.selection.batchMode) core.selection.exitBatchMode();
            this.setPage("filters");
        });
        action("sort-navigation", "list-tree", "侧栏工具", button => {
            if (!this.prepareSearch()) return;
            this.setPage("filters"); this.openSidebarTools(button);
        });
        move("sort", core.sorting.pickerBtn);
        action("view", "sliders-horizontal", "视图设置", button => {
            if (!core.dropdown.closeIfSameAnchor(button)) core.resultControls.openViewDropdown(button);
        });
        move("history", core.resultControls.historyBtn);
        move("batch", core.selection.batchEntryBtn);
        this._listen(core.selection.batchEntryBtn, "click", event => {
            if (this.layout !== "mobile") return;
            if (core.createFlow?.isCreateView?.() && !this.prepareSearch()) {
                event.preventDefault(); event.stopImmediatePropagation();
                return;
            }
            if (this.page === "filters") this.showResults(false);
        }, true);
        move("create", core.resultControls.createNoteBtn);
        this._listen(core.searchInput, "input", () => this._syncMobileTools());
        this._listen(core.searchInput, "focus", () => {
            this.searchVisible = true; this._syncMobileTools();
        });
    }

    _placeMobileTools(mobile) {
        for (const { button, marker, host } of this.movedTools) {
            if (mobile && button.parentElement !== host) host.append(button);
            else if (!mobile && button.parentNode !== marker.parentNode) marker.after(button);
        }
        this.mobileToolbar.hidden = !mobile;
    }

    _syncMobileTools() {
        if (!this.tools) return;
        const core = this.core;
        const create = this.page === "results" && Boolean(core.createFlow?.isCreateView?.());
        const filters = this.page === "filters";
        const state = filters ? core.createFlow?.searchResultFilterState?.() || core.filterState : core.filterState;
        const context = create ? "create" : filters ? "filters" : "results";
        const preferences = normalizeNavigatorToolbars(core.plugin.settings.navigatorToolbars)[context];
        const catalog = navigatorToolbarCatalog(core.plugin);
        const configured = new Set(Object.values(normalizeNavigatorToolbars(core.plugin.settings.navigatorToolbars)).flatMap(value => value.order));
        for (const [id, tool] of this.tools) if ((id.startsWith("pool:") || id.startsWith("property:") || id === "filter-pools") && !configured.has(id)) {
            if (!this._releaseToolbarAnchor(tool)) continue;
            tool.host.remove(); this.tools.delete(id);
        }
        for (const id of preferences.order) {
            const definition = catalog.get(id);
            if (!definition || this.tools.has(id)) continue;
            this._addToolbarAction(id, definition.icon, definition.label, button => this._runAdditionalToolbarAction(id, button));
        }
        const hidden = new Set(preferences.hidden);
        const visible = new Set(preferences.order.filter(id => !hidden.has(id) && catalog.has(id) && this.tools.has(id)));
        if (!core.allowCreate) visible.delete("create");
        const order = [...preferences.order, ...this.tools.keys()].filter((id, index, all) => all.indexOf(id) === index);
        const orderKey = JSON.stringify(order);
        if (orderKey !== this._toolbarOrderKey) {
            this._toolbarOrderKey = orderKey;
            let cursor = this.mobileToolbar.firstElementChild;
            for (const id of order) {
                const host = this.tools.get(id)?.host;
                if (!host) continue;
                if (host !== cursor) this.mobileToolbar.insertBefore(host, cursor);
                cursor = host.nextElementSibling;
            }
        }
        for (const [id, tool] of this.tools) {
            if (!visible.has(id) && !this._releaseToolbarAnchor(tool)) visible.add(id);
            tool.host.hidden = !visible.has(id);
        }
        for (const id of visible) {
            const definition = catalog.get(id), tool = this.tools.get(id);
            if (definition?.kind === "property" || definition?.kind === "pool") {
                const icon = navigatorToolbarIcon(core, id, definition.icon, preferences);
                if (tool.button.dataset.lsIcon !== icon) {
                    setIcon(tool.button, icon); tool.button.dataset.lsIcon = icon;
                }
                tool.button.setAttribute("aria-label", definition.label);
                const applied = definition.kind === "property" ? Boolean(state.properties.get(definition.propertyKey)?.size)
                    : definition.poolKind === "folder" ? state.folders.size > 0
                    : definition.poolKind === "tag" ? state.tags.size > 0
                    : definition.poolKind === "property" ? state.properties.size > 0
                    : state.fileTypes.size > 0;
                tool.button.setAttribute("aria-pressed", String(applied));
                tool.button.setAttribute("aria-expanded", String(core.dropdown.isOpenFor(tool.button)));
            }
        }
        this.mobileToolbar.hidden = this.layout !== "mobile" || visible.size === 0;
        const timeTool = this.tools.get("time")?.button;
        if (timeTool) timeTool.disabled = !navigatorToolbarActionAvailable("time", context);
        const sidebarTool = this.tools.get("sort-navigation")?.button;
        const maintenance = this.customization?.maintenanceMode;
        const maintenanceDefinition = maintenance && core.facets.sidebarMaintenanceModes?.(maintenance.kind)?.find(item => item.id === maintenance.id);
        const modeLabel = this.customization?.sortMode ? "拖拽排序" : maintenanceDefinition?.title || "";
        sidebarTool?.setAttribute("aria-pressed", String(Boolean(modeLabel)));
        sidebarTool?.setAttribute("aria-label", modeLabel ? `侧栏工具 · ${modeLabel}` : "侧栏工具");
        sidebarTool?.setAttribute("title", modeLabel ? `侧栏工具 · ${modeLabel}` : "侧栏工具");
        const ids = this._definitions().map(([id]) => id);
        const allCollapsed = ids.every(id => this.collapsed.has(id));
        this.tools.get("collapse").button.setAttribute("aria-label", allCollapsed ? "展开全部导航" : "折叠全部导航");
        this.tools.get("search").button.setAttribute("aria-pressed", String(!filters && (this.searchVisible || create)));
        // Search belongs to results/create. A retained query must never re-open
        // the filter page's header or summon the keyboard during navigation.
        this.root.classList.toggle("is-nav-search-visible", !filters && (this.searchVisible || create));
        this.root.classList.toggle("has-nav-query", Boolean(core.searchInput?.value));
        const title = create ? "创建文件" : this._scopeTitle();
        this.headingTitle.textContent = this.layout === "mobile" ? `${title}${create ? "" : ` · ${core.fullResults.length}`}` : "GLS Navigator";
        this.headingTitle.title = title;
        // Only the presentation icon is overridden. Labels, disabled/pressed
        // state and behavior still belong to each original command controller.
        for (const [id, tool] of this.tools) {
            const fallback = id === "sort"
                ? (SORT_FIELD_DEFS[core.sorting.fieldFor(core.sorting)]?.icon || "arrow-up-down")
                : catalog.get(id)?.icon;
            if (!fallback) continue;
            const icon = navigatorToolbarIcon(core, id, fallback, preferences);
            if (tool.button.dataset.lsIcon !== icon) {
                tool.button.replaceChildren(); setIcon(tool.button, icon); tool.button.dataset.lsIcon = icon;
            }
        }
        this.mobileToolbar.setAttribute("aria-label", filters ? "导航操作" : create ? "创建操作" : "结果操作");
    }

    _releaseToolbarAnchor(tool) {
        const dropdown = this.core.dropdown;
        // Desktop uses the original result-control location. A hidden mobile
        // slot does not own that native anchor or its active Picker.
        if (!tool.host.contains(tool.button)) return true;
        if (!dropdown.isOpenFor(tool.button)) return true;
        const settingsPanel = [dropdown.panel, ...(dropdown._panelStack || []).map(frame => frame.panel)]
            .find(panel => panel?.classList?.contains("local-search-view-composer"));
        if (!settingsPanel && dropdown.close(false, { returnToParent: false }) !== false) return true;
        // A saving Picker owns its anchor until it settles. Use that existing
        // lifecycle to apply the pending toolbar removal instead of detaching it.
        const panel = settingsPanel || dropdown.panel;
        if (panel && this._pendingToolbarSyncPanel !== panel) {
            this._pendingToolbarSyncPanel = panel;
            registerPickerCleanup(panel, () => queueMicrotask(() => {
                if (this._pendingToolbarSyncPanel === panel) this._pendingToolbarSyncPanel = null;
                if (this.core && !this.core._destroyed) this._syncMobileTools();
            }));
        }
        return false;
    }

    _runAdditionalToolbarAction(id, anchor) {
        const core = this.core;
        if (!core || core._destroyed || core.dropdown.closeIfSameAnchor(anchor)) return;
        if (this.page === "filters" && !this.prepareSearch()) return;
        const definition = navigatorToolbarCatalog(core.plugin).get(id);
        // Navigation is the intent of a confirmed bottom command, not a side
        // effect of closing or changing a Picker. Cancel and maintenance stay
        // on their origin page; creation keeps its existing metadata workflow.
        const onCommit = () => {
            if (this.core && !core._destroyed && !core.createFlow?.isCreateMode?.()) this.showResults(false);
        };
        if (id === "time") core.sorting.openPicker({ pickerBtn: anchor, context: "time", onCommit });
        else if (id === "filter-pools") core.resultControls.openViewDropdown(anchor, { section: "filterPools" });
        else if (definition?.kind === "property") core.facets.openPropertyPicker(definition.propertyKey, anchor, { mode: "quick-value", onCommit });
        else if (definition?.poolKind === "folder") core.facets.showFolderDropdown({ anchor, onCommit });
        else if (definition?.poolKind === "tag") core.facets.openTagPicker({ anchor, onCommit });
        else if (definition?.poolKind === "property") core.facets.openPropertyPicker("", anchor, { onCommit });
        else if (definition?.poolKind === "fileType") core.resultControls._openFileTypeChoicePicker(anchor, { onCommit });
    }

    _scopeTitle() {
        const core = this.core;
        const state = core.createFlow?.searchResultFilterState?.() || core.filterState;
        const scopes = [];
        if (state.folders.size) scopes.push(`文件夹 / ${[...state.folders].map(x => x === "/" ? "根目录" : x).join("、")}`);
        if (state.tags.size) scopes.push(`标签 / ${[...state.tags].map(x => x === NO_TAGS_FILTER_VALUE ? "无标签" : x).join("、")}`);
        for (const [key, values] of state.properties) scopes.push(`${key} / ${[...values].map(propertyValueDisplay).join("、")}`);
        if (state.dateRange) scopes.push("时间筛选");
        if (state.fileTypes.size) scopes.push([...state.fileTypes].map(value => RESULT_FILE_TYPE_ACTIONS.find(def => def.value === value)?.label || value).join("、"));
        if (!scopes.length) return core.queryState.raw.trim() ? "搜索结果" : "全部文件";
        return scopes.length === 1 ? scopes[0] : `${scopes[0]} +${scopes.length - 1}`;
    }

    openSidebarTools(anchor) {
        const core = this.core;
        if (core.dropdown.closeIfSameAnchor(anchor)) return;
        const panel = core.dropdown.open(anchor, "侧栏工具");
        if (!panel) return;
        panel.addClass("local-search-picker-dropdown", "local-search-nav-tools-picker");
        configureSharedPickerHeader(panel, { headingText: "侧栏工具", icon: "list-tree" });
        const list = panel.createDiv({ cls: "local-search-move-tree" });
        const choose = action => {
            if (core.dropdown.close(false, { returnToParent: false }) !== false) action();
        };
        const add = ({ id, title, icon, active = false, danger = false, onClick }) => {
            const row = createSharedPickerTreeRow(list, { name: title, icon, active,
                rowClasses: danger ? "is-danger-action" : "", onClick: () => choose(onClick) });
            row.button.dataset.sidebarTool = id;
        };
        if (this.customization.sortMode || this.customization.maintenanceMode) add({ id: "finish", title: "退出当前操作", icon: "check",
            onClick: () => this.clearSidebarMode() });
        add({ id: "sort", title: "拖拽排序", icon: "grip-vertical", active: this.customization.sortMode,
            onClick: () => this.setSortMode(!this.customization.sortMode) });
        const scopes = [["folder", "文件夹", "folder"], ["tag", "标签", "tags"], ["property-key", "属性", "list"], ["property-value", "属性值", "equal"]];
        for (const [kind, label, section] of scopes) {
            if (!this._definitions().some(([id]) => id === (kind.startsWith("property") ? "properties" : section))) continue;
            const modes = core.facets.sidebarMaintenanceModes?.(kind) || [];
            if (!modes.length) continue;
            list.createDiv({ cls: "local-search-list-section-label", text: label });
            for (const mode of modes) add({ id: `${kind}:${mode.id}`, title: mode.title, icon: mode.icon, danger: mode.danger,
                active: this.customization.maintenanceMode?.kind === kind && this.customization.maintenanceMode?.id === mode.id,
                onClick: () => {
                    const active = this.customization.maintenanceMode?.kind === kind && this.customization.maintenanceMode?.id === mode.id;
                    this.customization.setMaintenanceMode(active ? "" : kind, active ? "" : mode.id);
                    if (!active) this.collapsed.delete(kind.startsWith("property") ? "properties" : section);
                    this.renderRevision = -1; this.sync(); core._notifyStateChange();
                } });
        }
        registerPickerCleanup(panel, observePickerCountRail(panel, list, "--ls-picker-scrollbar-reserve"));
        return panel;
    }

    clearSidebarMode() {
        this.customization.setMaintenanceMode();
        this.setSortMode(false);
    }

    _definitions() {
        const definitions = [["folder", "文件夹", "folder"], ["tags", "标签", "tags"], ["properties", "属性", "list"]];
        if (this.layout !== "mobile") definitions.push(["project", "所属项目", "layers"], ["owner", "负责人", "user"]);
        const visible = this.core.plugin.settings.navigatorVisibleSections;
        return Array.isArray(visible) ? definitions.filter(([id]) => visible.includes(id)) : definitions;
    }

    capture() {
        return { navigationVersion: 2, page: this.page, searchVisible: this.searchVisible,
            expanded: [...this.expanded], collapsed: [...this.collapsed],
            scrollTop: this.facets.hidden ? this._filterScrollTop || 0 : this.scroll.scrollTop };
    }

    hiddenResultAnchor() {
        return this.main.hidden
            ? normalizeModalViewportAnchor(this.resultAnchor || this.core._initialViewportAnchor || { scrollTop: 0 })
            : null;
    }

    restore(state, resultAnchor = null) {
        if (!state || typeof state !== "object") return;
        this._restoringPage = true;
        this.resultAnchor = normalizeModalViewportAnchor(resultAnchor);
        // The old detail page is now an ordinary file-open action, never a blank pane.
        this.page = state.page === "results" || state.page === "detail" ? "results" : "filters";
        this.searchVisible = state.navigationVersion === 2 ? Boolean(state.searchVisible) : this.page === "results";
        this.expanded = new Set(normalizeUniqueStringList(state.expanded).slice(0, 500));
        if (state.navigationVersion === 2 || !Platform.isMobile) this.collapsed = new Set(normalizeUniqueStringList(state.collapsed));
        this._restoreScrollTop = Math.max(0, Number(state.scrollTop) || 0);
        this._filterScrollTop = this._restoreScrollTop;
        this.resize();
        this.renderRevision = -1;
        this.sync();
        this._restoringPage = false;
    }

    resize() {
        if (!this.core || this.core._destroyed) return;
        const width = this.root.getBoundingClientRect().width;
        if (!width) return;
        this.width = width;
        const next = Platform.isMobile ? "mobile" : width >= 650 ? "split" : "stack";
        const changed = next !== this.layout;
        this.layout = next;
        this.root.dataset.navLayout = next;
        // One live input is moved, never cloned or replaced. An active IME stays attached.
        const parent = next === "mobile" ? this.root : this.facets;
        if (this.header.parentElement !== parent) parent.prepend(this.header);
        this._placeMobileTools(next === "mobile");
        this.syncPage();
        if (changed) { this.renderRevision = -1; this.sync(); }
        this.core.dropdown?._queueReposition();
    }

    refreshPreferences() {
        if (!this.core || this.core._destroyed) return;
        this._projectionCache.clear();
        this._cacheRevision = -1;
        this.renderRevision = -1;
        for (const ref of this.sections.values()) ref.signature = null;
        this._syncMobileTools();
        this.sync();
    }

    _refreshAfterMaintenance(kind, detail = {}) {
        const prefix = kind === "folder" ? "folder:" : kind === "tag" ? "tag:" : kind === "property-key" ? "properties:" : "";
        const from = detail.oldPath ?? detail.oldKey ?? (detail.deleted ? detail.path ?? detail.key : null);
        const to = detail.newPath ?? detail.newKey;
        if (prefix && from) {
            const source = `${prefix}${from}`;
            this.expanded = new Set([...this.expanded].flatMap(key => {
                const related = key === source || (kind !== "property-key" && key.startsWith(source + "/"));
                if (!related) return [key];
                return to ? [`${prefix}${to}${key.slice(source.length)}`] : detail.deleted ? [] : [key];
            }));
        }
        this.refreshPreferences();
    }

    setSortMode(enabled) {
        this.core._releaseSearchFocusForControl();
        this.customization?.setSortMode(Boolean(enabled));
        this._syncMobileTools();
        this.core.onStateChange?.();
    }

    syncPage() {
        const hideResults = this.layout === "mobile" && this.page !== "results";
        const wasHidden = this.main.hidden;
        const hideFacets = this.layout === "mobile" && this.page !== "filters";
        const facetsWereHidden = this.facets.hidden;
        if (!this._restoringPage) {
            if (!facetsWereHidden && hideFacets) this._filterScrollTop = this.scroll.scrollTop;
        }
        // display:none reports scrollTop=0. Save the semantic result anchor while
        // the result pane is still measurable, independently of the shared query.
        if (!wasHidden && hideResults && !this._restoringPage && this.core._resultGeneration) {
            this.resultAnchor = this.core.resultRenderer.captureViewportAnchor();
        }
        this.root.dataset.navPage = this.page;
        this.backButton.hidden = this.layout !== "mobile" || this.page === "filters";
        this.backButton.setAttribute("aria-label", "返回导航");
        this.footer.hidden = true;
        // hidden removes inactive pages from accessibility and keyboard navigation as well as layout.
        this.facets.hidden = hideFacets;
        this.main.hidden = hideResults;
        const conditions = this.core.propertyFilterRow;
        const conditionParent = this.layout === "mobile" ? this.root : this.main;
        if (conditions && conditions.parentElement !== conditionParent) {
            conditionParent.insertBefore(conditions, this.layout === "mobile" ? this.mobileToolbar : null);
        }
        if (facetsWereHidden && !hideFacets) this.scroll.scrollTop = this._filterScrollTop || 0;
        // An empty result set has no row anchor, but still needs one render on
        // reveal so its query can enter the composer in the now-visible pane.
        if (wasHidden && !hideResults && !this._restoringPage && this.core._resultGeneration) {
            const anchor = this.resultAnchor;
            this.resultAnchor = null;
            this.core.resultRenderer.renderInitialPage(anchor);
        }
        this._syncMobileTools();
    }

    setPage(page, notify = true) {
        if (page === "filters" && this.core.selection?.batchMode) this.core.selection.exitBatchMode();
        this.page = page;
        this.syncPage();
        if (page === "filters") this.sync();
        // Native sidebar / SwipeBack already owns transitions. Never animate a
        // second translucent, transformed layer around a live virtual scroller.
        if (notify) this.core._notifyStateChange();
    }

    showResults(commitInput = true) {
        if (commitInput && !this.core.createFlow?.isCreateMode() && this.core.searchInput.value !== this.core.queryState.raw) {
            this.core.performSearch(this.core.searchInput.value);
        }
        const query = this.core.queryState.raw.trim();
        if (query) this.core.plugin.recordSearchHistory(query);
        this.core._releaseSearchFocusForControl();
        if (this.page !== "results") this.searchVisible = true;
        this.setPage("results");
    }

    back() {
        if (this.core.dropdown.isOpen) { this.core.dropdown._navigateBack(this.core.dropdown.panel); return true; }
        if (this.core._confirmSession) { this.core._confirmSession.finish(false); return true; }
        if (this.layout === "mobile" && this.page === "results") {
            if (this.core.selection.batchMode) { this.core.selection.exitBatchMode(); return true; }
            const wasCreateMode = this.core.createFlow.isCreateMode();
            if (this.core.createFlow.isCreateView() && !this.prepareSearch()) return true;
            if (wasCreateMode) return true;
            this.core._releaseSearchFocusForControl();
            this.searchVisible = false;
            this.setPage("filters");
            this.resultsButton.focus({ preventScroll: true });
            return true;
        }
        return false;
    }

    prepareSearch() {
        const flow = this.core.createFlow;
        if (flow._createInFlight) {
            new Notice("正在创建文件，请稍候");
            return false;
        }
        if (flow.createDraft?.pendingCreation) {
            new Notice("文件已创建，属性尚未完成。可补写属性，或选择“保留文件并返回”");
            return false;
        }
        if (flow.isCreateMode()) return flow.toggleInputMode({ focusInput: false }) !== false;
        flow.prepareSearchEvaluation();
        return true;
    }

    select(kind, value, key = "") {
        if (!this.prepareSearch()) return;
        const state = this.core.filterState;
        if (kind === "tag") state.tagMatchMode = "all";
        if (kind === "property") state.propertyMatchMode = "all";
        // A navigation row enters its scope, including when it is already selected.
        // Removing a condition remains the shared condition chip / Picker's action.
        this.core._applyFacetSelection(kind, value, { key, mode: "replace" });
        this.core._onFilterChanged();
        if (this.layout === "mobile") this.showResults(false);
    }

    openSection(kind, anchor) {
        if (!this.prepareSearch()) return;
        if (kind === "time") {
            return this.core.sorting.openPicker({ pickerBtn: anchor, context: "time" });
        }
        const before = JSON.stringify(this.core.filterState.toSnapshot());
        const core = this.core;
        if (kind === "folder") core.facets.showFolderDropdown({ anchor });
        else if (kind === "tags") core.facets.openTagPicker({ anchor });
        else if (kind === "properties") core.facets.openPropertyPicker("", anchor);
        else if (kind === "project") core.facets.openPropertyPicker("所属项目", anchor, { mode: "quick-value" });
        else if (kind === "owner") core.facets.openPropertyPicker("项目负责人", anchor, { mode: "quick-value" });
        this._trackPicker(before);
    }

    _openProperty(key, anchor) {
        if (!this.prepareSearch()) return;
        const before = JSON.stringify(this.core.filterState.toSnapshot());
        this.core.facets.openPropertyPicker(key, anchor, { mode: "quick-value" });
        this._trackPicker(before);
    }

    _trackPicker(before) {
        const core = this.core;
        const panel = core.dropdown.panel;
        if (!panel) return;
        this.pickerFlow = { panel, before, page: this.page };
    }

    didClosePicker() {
        const flow = this.pickerFlow;
        if (!flow || flow.panel.isConnected) return;
        this.pickerFlow = null;
        // Management is a child of the originating page. A filter mutation is
        // not a navigation command: Back never implies "show results".
    }

    _section(id, title, icon) {
        let ref = this.sections.get(id);
        if (!ref) {
            const section = this.scroll.createDiv({ cls: "local-search-nav-section" });
            section.dataset.navSection = id;
            const expand = () => {
                if (this.collapsed.has(id)) this.collapsed.delete(id); else this.collapsed.add(id);
                this.renderRevision = -1; this.sync(); this.core._notifyStateChange();
            };
            const tree = createSharedPickerTreeRow(section, { name: title, icon,
                rowClasses: "local-search-nav-section-heading local-search-nav-group-row",
                itemClasses: "local-search-nav-section-toggle", hasChildren: true,
                onClick: expand, onToggle: expand });
            const heading = tree.row;
            const summary = heading.createSpan({ cls: "local-search-nav-count" });
            const manage = createSearchWindowAction(heading, "ellipsis", `选择和管理${title}`);
            manage.addClass("local-search-nav-manage");
            manage.addEventListener("click", () => this.openSection(id, manage));
            const content = section.createDiv({ cls: "local-search-nav-section-content" });
            ref = { section, heading, toggle: tree.button, summary, content, manage, chevron: tree.toggle };
            this.sections.set(id, ref);
        }
        ref.content.hidden = this.collapsed.has(id);
        ref.manage.hidden = this.layout === "mobile";
        ref.toggle.setAttribute("aria-expanded", String(!ref.content.hidden));
        setIcon(ref.chevron, ref.content.hidden ? "chevron-right" : "chevron-down");
        ref.chevron.setAttribute("aria-expanded", String(!ref.content.hidden));
        ref.chevron.setAttribute("aria-label", `${ref.content.hidden ? "展开" : "折叠"} ${title}`);
        return ref;
    }

    _row(ref, options) {
        const depth = (options.depth || 0) + (this.layout === "mobile" ? 1 : 0);
        const id = options.navDescriptor ? this.customization.descriptor(options.navDescriptor).id
            : options.rowKey || `more:${options.itemTitle || options.name}`;
        ref.rows ||= new Map();
        let tree = ref.rows.get(id);
        if (tree && Number(tree.row.dataset.treeDepth) !== depth) {
            if (ref.rowCursor === tree.row) ref.rowCursor = tree.row.nextElementSibling;
            tree.row.remove(); ref.rows.delete(id); tree = null;
        }
        if (!tree) {
            tree = createSharedPickerTreeRow(ref.content, { ...options, depth,
                // Install stable hit-target callbacks once. Later projections
                // update their data instead of replacing the focused DOM row.
                hasChildren: true,
                rowClasses: `local-search-nav-row ${options.rowClasses || ""}`,
                onClick: () => tree._navOptions?.onClick?.(),
                onToggle: () => tree._navOptions?.onToggle?.() });
            ref.rows.set(id, tree);
        }
        tree._navOptions = options;
        tree.row.dataset.navRowKey = id;
        tree.row.dataset.pickerKey = options.itemTitle || options.name || "";
        tree.row.classList.toggle("is-selected", Boolean(options.active));
        tree.button.setAttribute("aria-pressed", String(Boolean(options.active)));
        tree.button.setAttribute("aria-label", options.itemTitle || options.name || "");
        tree.button.disabled = !options.onClick;
        const name = tree.button.querySelector(".local-search-move-tree-name");
        if (name && name.textContent !== String(options.name || "")) name.textContent = options.name || "";
        const hasChildren = Boolean(options.hasChildren);
        tree.toggle.classList.toggle("is-placeholder", !hasChildren);
        tree.toggle.disabled = !hasChildren;
        tree.toggle.tabIndex = hasChildren ? 0 : -1;
        if (hasChildren) {
            tree.toggle.removeAttribute("aria-hidden");
            tree.toggle.setAttribute("aria-expanded", String(Boolean(options.expanded)));
            tree.toggle.setAttribute("aria-label", `${options.expanded ? "折叠" : "展开"} ${options.name || ""}`);
            const toggleIcon = options.expanded ? "chevron-down" : "chevron-right";
            if (tree.toggle.dataset.navIcon !== toggleIcon) { setIcon(tree.toggle, toggleIcon); tree.toggle.dataset.navIcon = toggleIcon; }
        } else {
            tree.toggle.setAttribute("aria-hidden", "true");
            tree.toggle.removeAttribute("aria-expanded");
        }
        let badge = tree.row.querySelector(":scope > .local-search-move-current-badge");
        const hasCount = options.count !== null && options.count !== undefined && options.count !== "";
        if (!badge && hasCount) badge = tree.row.createSpan({ cls: "local-search-move-current-badge" });
        if (badge) { badge.hidden = !hasCount; if (hasCount && badge.textContent !== String(options.count)) badge.textContent = String(options.count); }
        if (options.icon && tree.iconEl.dataset.navIcon !== options.icon && !options.navDescriptor) {
            setIcon(tree.iconEl, options.icon); tree.iconEl.dataset.navIcon = options.icon;
        }
        if (options.navDescriptor) this.customization.decorate(tree.row, { ...options.navDescriptor,
            depth });
        this._placeProjectionRow(ref, id, tree.row);
        return tree;
    }

    _placeProjectionRow(ref, id, row) {
        ref.usedRows?.add(id);
        if (row !== ref.rowCursor) ref.content.insertBefore(row, ref.rowCursor || null);
        ref.rowCursor = row.nextElementSibling;
    }

    _separator(ref, descriptor, depth = 0) {
        ref.rows ||= new Map();
        const signature = JSON.stringify([descriptor, depth, this.layout]);
        let tree = ref.rows.get(descriptor.id);
        if (!tree || tree.separatorSignature !== signature) {
            if (ref.rowCursor === tree?.row) ref.rowCursor = tree.row.nextElementSibling;
            tree?.row.remove();
            tree = this.customization.renderSeparator(ref.content, descriptor, depth + (this.layout === "mobile" ? 1 : 0));
            tree.separatorSignature = signature;
            ref.rows.set(descriptor.id, tree);
        }
        this._placeProjectionRow(ref, descriptor.id, tree.row);
        return tree;
    }

    _finishProjectionRows(ref) {
        for (const [id, tree] of ref.rows || []) if (!ref.usedRows.has(id)) { tree.row.remove(); ref.rows.delete(id); }
        ref.usedRows = null;
        ref.rowCursor = null;
    }

    _more(ref, kind, text = "显示全部…") {
        const row = this._row(ref, { rowKey: `more:${kind}`, name: text, icon: "ellipsis", itemClasses: "local-search-nav-more",
            onClick: () => this.openSection(kind, row.button) });
    }

    _cached(key, build) {
        if (!this._projectionCache.has(key)) this._projectionCache.set(key, build());
        return this._projectionCache.get(key);
    }

    _propertyKeys(universe) {
        const showExcluded = this.customization.maintenanceMode?.kind === "property-key" && this.customization.maintenanceMode.id === "exclude";
        const excluded = showExcluded ? [] : this.core.plugin.settings.excludedKeys;
        return this._cached("property-keys", () => this.core.plugin.propertyCatalogKeys(collectPropertyKeys(universe, excluded), excluded));
    }

    _propertyStats(key, universe, state) {
        return this._cached(`property:${key}`, () => {
            const selected = state.properties.get(key);
            const known = buildPropertyUsageStats(universe, key, selected, this.core.plugin.propertyCatalogValues(key)).values;
            return buildPropertyUsageStats(this.core._facetCandidates("property", key, universe), key, selected, known);
        });
    }

    _tree(ref, roots, keyPrefix, row, kind, fixed = null) {
        let count = 0, truncated = false;
        const visit = (nodes, depth, parentId) => {
            const descriptors = nodes.map(node => ({ kind: keyPrefix, key: node.path, label: node.name,
                icon: keyPrefix === "folder" ? "folder" : "tag", node }));
            if (depth === 0 && fixed) descriptors.unshift(fixed);
            for (const descriptor of this.customization.order(parentId, descriptors)) {
                if (descriptor.kind === "separator") { this._separator(ref, descriptor, depth); continue; }
                if (descriptor.fixedOptions) { this._row(ref, { ...descriptor.fixedOptions, navDescriptor: descriptor }); continue; }
                if (count >= 70) { truncated = true; return; }
                count++;
                const node = descriptor.node;
                const key = `${keyPrefix}:${node.path}`;
                const expanded = this.expanded.has(key);
                const children = node.children || [];
                this._row(ref, { depth, navDescriptor: descriptor, hasChildren: children.length > 0, expanded,
                    toggleTitle: expanded ? "折叠" : "展开", ...row(node),
                    onToggle: () => { if (expanded) this.expanded.delete(key); else this.expanded.add(key);
                        this.renderRevision = -1; this.sync(); this.core._notifyStateChange(); } });
                if (expanded && children.length) visit(children, depth + 1, descriptor.id);
            }
        };
        visit(roots, 0, navigatorItemId("group", kind));
        if (truncated) this._more(ref, kind);
    }

    sync() {
        const core = this.core;
        if (!core || core._destroyed) return;
        if (core.createFlow?.isCreateMode?.() && this.page !== "results") this.setPage("results", false);
        const n = core.fullResults.length;
        this.resultsButton.setAttribute("aria-label", `查看结果 · ${n}`);
        this.resultsButton.setAttribute("title", `查看结果 · ${n}`);
        this.resultTitle.textContent = this._scopeTitle();
        this.resultTitle.title = this.resultTitle.textContent;
        this._syncMobileTools();
        // A hidden tree has no work to paint. Rebuild only on returning to it.
        if (this.layout === "mobile" && this.page !== "filters") return;
        if (this.renderRevision === core._resultGeneration) return;
        // Result cards commit first. Navigation projection is one cancellable
        // follow-up task and always consumes the latest query/generation.
        if (this._projectionTimer != null) return;
        this._projectionTimer = this.root.ownerDocument.defaultView.setTimeout(() => {
            this._projectionTimer = null;
            if (this.core === core && !core._destroyed) this._renderProjection();
        }, 0);
    }

    _renderProjection() {
        const core = this.core;
        if (!core || core._destroyed || this.renderRevision === core._resultGeneration) return;
        if (this.layout === "mobile" && this.page !== "filters") return;
        if (this.customization.coordinator.session || this.customization.coordinator._committing) return;
        this.customization.beginRender();
        const doc = this.root.ownerDocument;
        const focused = doc.activeElement;
        const focusedRow = focused?.closest?.("[data-nav-id]");
        let focusReturn = null;
        if (focusedRow && this.scroll.contains(focusedRow)) {
            const section = [...this.sections].find(([, ref]) => ref.section.contains(focusedRow));
            focusReturn = { section: section?.[0], key: focusedRow.dataset.pickerKey, navId: focusedRow.dataset.navId,
                selector: focused.closest(".local-search-nav-sort-grip") ? ".local-search-nav-sort-grip"
                    : focused.closest(".local-search-move-tree-toggle") ? ".local-search-move-tree-toggle"
                    : focused.closest(".is-interactive") ? ".is-interactive" : ".local-search-move-tree-folder" };
        }
        const state = core.createFlow?.searchResultFilterState?.() || core.filterState;
        this.renderRevision = core._resultGeneration;
        // Batch one projection per open section; no file reads and no per-row vault scans.
        const scroll = this._restoreScrollTop ?? (this.facets.hidden ? this._filterScrollTop || 0 : this.scroll.scrollTop);
        const anchorOptions = { selector: "[data-nav-id]", keyFrom: row => row.dataset.navId };
        const scrollAnchor = this._restoreScrollTop == null ? captureScrollableAnchor(this.scroll, anchorOptions) : null;
        const scrollBounds = this.scroll.getBoundingClientRect();
        const oldAnchors = scrollAnchor ? [...this.scroll.querySelectorAll("[data-nav-id]")].flatMap(row => {
            const rect = row.getBoundingClientRect();
            return rect.height ? [{ key: row.dataset.navId, offset: rect.top - scrollBounds.top, scrollTop: scroll }] : [];
        }) : [];
        if (this._cacheRevision !== core._resultGeneration) {
            this._cacheRevision = core._resultGeneration;
            this._projectionCache.clear();
        }
        const universe = this._cached("universe", () => core._facetUniverse());
        const definitions = this._definitions();
        for (const [id, ref] of this.sections) ref.section.hidden = !definitions.some(def => def[0] === id);
        this._groupSeparators ||= new Map();
        const activeGroupSeparators = new Set();
        const groups = this.customization.order("groups", definitions.map(([key, label, icon]) => ({ kind: "group", key, label, icon, depth: 0 })));
        let nextGroupNode = this.scroll.firstElementChild;
        const placeGroup = node => {
            if (node !== nextGroupNode) this.scroll.insertBefore(node, nextGroupNode);
            nextGroupNode = node.nextElementSibling;
        };
        for (const group of groups) {
            if (group.kind === "separator") {
                activeGroupSeparators.add(group.id);
                const signature = JSON.stringify(group);
                let entry = this._groupSeparators.get(group.id);
                if (!entry || entry.signature !== signature) {
                    if (entry?.row === nextGroupNode) nextGroupNode = entry.row.nextElementSibling;
                    entry?.row.remove();
                    entry = { ...this.customization.renderSeparator(this.scroll, group), signature };
                    this._groupSeparators.set(group.id, entry);
                }
                placeGroup(entry.row); continue;
            }
            const { key: id, label: title, icon } = group;
            const ref = this._section(id, title, icon);
            placeGroup(ref.section);
            this.customization.decorate(ref.heading, group);
            // Expanding one branch does not rebuild unrelated sections or scan the vault.
            const prefix = id === "tags" ? "tag:" : `${id}:`;
            const signature = JSON.stringify([core._resultGeneration, this.layout, [...this.expanded].filter(key => key.startsWith(prefix))]);
            let count = 0, selected = false;
            if (id === "folder") {
                count = this._cached("folder-candidates", () => core._facetCandidates("folder", "", universe)).length;
                selected = state.folders.size > 0;
            } else if (id === "tags") {
                count = this._cached("tag-candidates", () => core._facetCandidates("tags", "", universe)).length;
                selected = state.tags.size > 0;
            } else if (id === "properties") {
                const candidates = this._cached("property-candidates", () => core._facetCandidates("properties", "", universe));
                const keys = this._propertyKeys(universe);
                count = this._cached("property-present-count", () => candidates.filter(meta => keys.some(key => metaHasProperty(meta, key))).length);
                selected = state.properties.size > 0;
            } else {
                const key = id === "project" ? "所属项目" : "项目负责人";
                count = this._propertyStats(key, universe, state).present;
                selected = Boolean(state.properties.get(key)?.size);
            }
            ref.summary.textContent = String(count);
            ref.summary.hidden = false;
            ref.summary.setAttribute("aria-label", `${count} 个文件`);
            ref.heading.classList.toggle("is-selected", selected);
            if (ref.content.hidden || ref.signature === signature) continue;
            ref.signature = signature;
            ref.usedRows = new Set();
            ref.rowCursor = ref.content.firstElementChild;
            if (id === "folder") {
                const counts = this._cached("folder-counts", () => createSharedFolderCountProvider(this._cached("folder-candidates", () => core._facetCandidates("folder", "", universe))));
                const makeNodes = folder => sharedFolderChildren(core.app, core.plugin, folder).map(child => ({
                    path: child.path, name: child.name, get children() { return makeNodes(child); }
                }));
                this._tree(ref, makeNodes(core.app.vault.getRoot()), "folder", node => ({
                    name: node.name, itemTitle: node.path, icon: "folder", count: counts(node.path),
                    active: state.folders.has(node.path), onClick: () => this.select("folder", node.path)
                }), id, { kind: "folder", key: "/", label: "根目录", icon: "folder-root", sortable: false,
                    fixedOptions: { name: "根目录", icon: "folder-root", count: counts("/"), active: state.folders.has("/"), onClick: () => this.select("folder", "/") } });
            } else if (id === "tags") {
                const candidates = this._cached("tag-candidates", () => core._facetCandidates("tags", "", universe));
                const counts = this._cached("tag-counts", () => buildHierarchicalTagUsageCounts(candidates));
                this._tree(ref, this._cached("tag-tree", () => buildTagTreeModel(universe, core.plugin.settings.pickerTagOrder)), "tag", node => ({
                    name: node.name, itemTitle: node.path, icon: "tag", count: counts.counts.get(tagIdentityKey(node.path)) || 0,
                    active: [...state.tags].some(tag => tagIdentityKey(tag) === tagIdentityKey(node.path)), onClick: () => this.select("tag", node.path)
                }), id, { kind: "tag", key: NO_TAGS_FILTER_VALUE, label: "无标签", icon: "tag", sortable: false,
                    fixedOptions: { name: "无标签", icon: "tag", count: counts.noTags, active: state.tags.has(NO_TAGS_FILTER_VALUE), onClick: () => this.select("tag", NO_TAGS_FILTER_VALUE) } });
            } else if (id === "properties") {
                const keys = this._propertyKeys(universe);
                const properties = this.customization.order(group.id, keys.map(key => ({ kind: "property-key", key, label: key, icon: "list" })));
                let displayedKeys = 0;
                for (const descriptor of properties) {
                    if (descriptor.kind === "separator") { this._separator(ref, descriptor); continue; }
                    if (++displayedKeys > 40) break;
                    const key = descriptor.key;
                    const stats = this._propertyStats(key, universe, state);
                    if (this.layout !== "mobile") {
                        const row = this._row(ref, { name: key, icon: "list", navDescriptor: descriptor, count: stats.present, active: state.properties.has(key), onClick: () => this._openProperty(key, row.button) });
                        continue;
                    }
                    const expansion = `properties:${key}`;
                    const expanded = this.expanded.has(expansion);
                    const toggle = () => {
                        expanded ? this.expanded.delete(expansion) : this.expanded.add(expansion);
                        this.renderRevision = -1; this.sync(); core._notifyStateChange();
                    };
                    const keyRow = this._row(ref, { name: key, itemTitle: key, icon: "list", navDescriptor: descriptor, rowClasses: "local-search-nav-property-key",
                        hasChildren: true, expanded, count: stats.present, toggleTitle: expanded ? "折叠" : "展开",
                        active: state.properties.has(key), onClick: toggle, onToggle: toggle });
                    keyRow.row.dataset.propertyKey = key;
                    if (!expanded) continue;
                    const values = stats.values.filter(value => !isSpecialPropertyValue(value) && value !== PRESENT_PROPERTY_VALUE);
                    let displayedValues = 0;
                    for (const valueDescriptor of this.customization.order(descriptor.id, values.map(value => ({ kind: "property-value", key, value, label: propertyValueDisplay(value), icon: "equal" })))) {
                        if (valueDescriptor.kind === "separator") { this._separator(ref, valueDescriptor, 1); continue; }
                        if (++displayedValues > 60) break;
                        const value = valueDescriptor.value;
                        this._row(ref, { depth: 1, navDescriptor: valueDescriptor, name: propertyValueDisplay(value), icon: "equal",
                        count: stats.counts.get(propertyValueKey(value)) || 0,
                        active: [...(state.properties.get(key) || [])].some(v => propertyValueKey(v) === propertyValueKey(value)),
                        onClick: () => this.select("property", value, key) });
                    }
                    if (values.length > 60) {
                        const more = this._row(ref, { depth: 1, rowKey: `more-property:${key}`, name: `显示全部 ${values.length} 个值`, icon: "ellipsis",
                            onClick: () => this._openProperty(key, more.button) });
                    }
                }
                if (keys.length > 40) this._more(ref, id);
            } else if (id === "project" || id === "owner") {
                const key = id === "project" ? "所属项目" : "项目负责人";
                const stats = this._propertyStats(key, universe, state);
                const values = stats.values.filter(v => !isSpecialPropertyValue(v) && v !== PRESENT_PROPERTY_VALUE);
                let displayedValues = 0;
                for (const descriptor of this.customization.order(group.id, values.map(value => ({ kind: "property-value", key, value, label: propertyValueDisplay(value), icon, groupId: group.id })))) {
                    if (descriptor.kind === "separator") { this._separator(ref, descriptor); continue; }
                    if (++displayedValues > 60) break;
                    const value = descriptor.value;
                    this._row(ref, { navDescriptor: descriptor, name: propertyValueDisplay(value), icon,
                    count: stats.counts.get(propertyValueKey(value)) || 0,
                    active: [...(state.properties.get(key) || [])].some(v => propertyValueKey(v) === propertyValueKey(value)),
                    onClick: () => this.select("property", value, key) });
                }
                if (values.length > 60) this._more(ref, id, `显示全部 ${values.length} 个值`);

            }
            this._finishProjectionRows(ref);
        }
        for (const [id, entry] of this._groupSeparators) if (!activeGroupSeparators.has(id)) { entry.row.remove(); this._groupSeparators.delete(id); }
        this.customization.finishRender();
        if (scrollAnchor) {
            const remaining = new Set([...this.scroll.querySelectorAll("[data-nav-id]")].filter(row => row.getClientRects().length).map(row => row.dataset.navId));
            const nearest = remaining.has(scrollAnchor.key) ? scrollAnchor
                : oldAnchors.filter(anchor => remaining.has(anchor.key)).sort((a, b) => Math.abs(a.offset - scrollAnchor.offset) - Math.abs(b.offset - scrollAnchor.offset))[0];
            restoreScrollableAnchor(this.scroll, nearest || scrollAnchor, anchorOptions);
        } else this.scroll.scrollTop = scroll;
        this._filterScrollTop = this.scroll.scrollTop;
        this._restoreScrollTop = null;
        this.syncPage();
        // Deferred projection replaces rows after the shared Tree Primitive's
        // synchronous action has returned. Restore only a removed owned focus;
        // an input/Picker that has since taken focus must remain untouched.
        if (focusReturn && doc.activeElement !== focused && !this.facets.hidden
            && (doc.activeElement === doc.body || doc.activeElement === doc.documentElement)) {
            const ref = this.sections.get(focusReturn.section);
            const row = [...(ref?.section || this.scroll).querySelectorAll("[data-nav-id]")].find(node => node.dataset.navId === focusReturn.navId);
            const target = row?.querySelector(focusReturn.selector);
            if (target?.getClientRects().length && !target.disabled) target.focus({ preventScroll: true });
        }
    }

    destroy() {
        if (this._projectionTimer != null) this.root.ownerDocument.defaultView.clearTimeout(this._projectionTimer);
        this._projectionTimer = null;
        this.observer?.disconnect();
        this.customization?.destroy();
        for (const cleanup of this.cleanups.splice(0)) cleanup();
        this.root.removeClass("local-search-navigator", "is-nav-search-visible", "has-nav-query");
        for (const key of ["navLayout", "navPage"]) delete this.root.dataset[key];
        this.root.removeAttribute("data-ignore-swipe");
        this.core = null;
    }
}
