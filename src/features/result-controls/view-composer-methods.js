import { setSearchAttribute } from "../../interactions/hover-hints.js";
// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { registerPickerCleanup } from "../../core/picker-cleanup.js";
import { collectPropertyKeys } from "../../data/properties/property-catalog.js";
import { PointerSortCoordinator } from "../../interactions/PointerSortCoordinator.js";
import { createSearchButton } from "../../ui/components/input-controls.js";
import { createViewComposerActionRow, createViewComposerChoice, createViewComposerRemoveButton, createViewComposerSection, syncViewComposerChoiceSelection } from "../../ui/components/view-composer.js";
import { resolvePickerIcon } from "../../ui/pickers/icon-catalog.js";
import { openFilterToolbarIconPicker } from "../../ui/pickers/icon-picker.js";
import { configureSharedPickerHeader, createPickerHeaderIconAction } from "../../ui/pickers/picker-header.js";
import { activatePickerSearch, createSharedPickerTreeShell } from "../../ui/pickers/picker-shell.js";
import { attachPickerSortModeToggle } from "../../ui/pickers/sort-mode.js";
import { createPickerRowAction, createSharedPickerTreeRow } from "../../ui/pickers/tree-row.js";
import { hostWindow, setDomProperty } from "../../utils/dom.js";
import { moveOrderedKey } from "../../utils/preferred-order.js";
import { filterPoolIcon, filterPoolLabel } from "../filters/pool-values.js";
import { normalizeExcludedFolders } from "../folders/exclusions.js";
import { NAVIGATOR_TOOLBAR_CONTEXTS, NAVIGATOR_VISIBLE_SECTION_DEFS, navigatorToolbarActionAvailable, navigatorToolbarCatalog, normalizeNavigatorToolbars, normalizeNavigatorVisibleSections } from "../navigator/toolbar-config.js";
import { RESULT_CONTENT_DEFS, RESULT_CONTENT_DEF_MAP, RESULT_VIEW_IDS, RESULT_VIEW_LABELS, VIEW_COMPOSER_SECTION_IDS, normalizeResultContentOrder } from "../results/view-config.js";
import { SORT_FIELD_DEFS, SORT_FIELD_IDS, normalizeHiddenSortFields, normalizeSortFieldOrder } from "../sort/sort-model.js";
import { Notice, setIcon } from "obsidian";
// Instance method owner. `this` is the unchanged SearchResultControlsController instance. No additional state store.
export const SearchResultControlsController_view_composer_methods = {


    refreshFilterPoolHeader() {
        const core = this.owner;
        if (core?._destroyed || !core?.filterPoolHost?.isConnected) return;
        core.resultRenderer?._renderFilterPoolHeader?.();
    },

    
    syncViewMode() {
        const core = this.owner;
        const id = this.activeViewId();
        core.containerEl.classList.toggle("local-search-density-detailed", id === "detailed");
        core.containerEl.classList.toggle("local-search-density-compact", id === "compact");
        this.syncInputActions();
    },


    syncInputActions() {
        const core = this.owner;
        const createMode = Boolean(core.createFlow?.isCreateMode?.());
        const value = String(core.searchInput?.value || "");
        const hasValue = Boolean(value.trim());

        if (this.createNoteBtn) {
            setDomProperty(this.createNoteBtn, "hidden", !core.allowCreate);
            setSearchAttribute(this.createNoteBtn, "aria-hidden", String(!core.allowCreate));
            this.createNoteBtn.classList.toggle("is-selected", createMode);
            setSearchAttribute(this.createNoteBtn, "aria-pressed", String(createMode));
            const label = createMode ? "退出创建笔记" : "创建笔记";
            setSearchAttribute(this.createNoteBtn, "aria-label", label);
        }

        if (!this.resultViewBtn) return;
        // Create-submit or partial creation has no valid clear action. Do not
        // let a native button click blur the search field during this lock.
        setDomProperty(this.resultViewBtn, "disabled", Boolean((createMode || hasValue)
            && (core.createFlow?._createInFlight || core.createFlow?.createDraft?.pendingCreation)));
        const activeId = this.activeViewId();
        const viewLabel = RESULT_VIEW_LABELS[activeId];
        const viewIcon = activeId === "detailed"
            ? "list-tree"
            : activeId === "compact"
                ? "align-justify"
                : "list";
        const mode = createMode
            ? "clear-title"
            : (hasValue ? "clear-input" : "result-view");
        if (this.resultViewBtn.dataset.lsInputAction !== mode) {
            this.resultViewBtn.dataset.lsInputAction = mode;
        }
        this.resultViewBtn.classList.toggle(
            "is-clear-input",
            createMode || hasValue
        );
        const iconName = createMode
            ? "eraser"
            : (hasValue ? "eraser" : viewIcon);
        if (this.resultViewBtn.dataset.lsInputIcon !== iconName) {
            this.resultViewBtn.dataset.lsInputIcon = iconName;
            this.resultViewBtn.replaceChildren();
            setIcon(this.resultViewBtn, iconName);
        }
        const label = createMode
            ? "清空创建标题"
            : (hasValue ? "清空搜索" : `结果视图：${viewLabel}`);
        setSearchAttribute(this.resultViewBtn, "aria-label", label);
        if (createMode || hasValue) {
            setSearchAttribute(this.resultViewBtn, "aria-expanded", "false");
        } else {
            const open = Boolean(core.dropdown.isOpenFor(this.resultViewBtn));
            setSearchAttribute(this.resultViewBtn, "aria-expanded", String(open));
        }
    },

    
    _openNavigatorToolbarPicker(context, anchor, onAdd) {
        const core = this.owner;
        // Parent settings remain mounted. The external launch control stays
        // visible while the parent surface is hidden by the shared child stack.
        const panel = core.dropdown.openChild(core.dropdown.anchor || anchor, "新增底部按钮");
        if (!panel) return;
        panel.addClass("local-search-picker-dropdown", "local-search-facet-picker");
        const header = configureSharedPickerHeader(panel, {
            headingText: "新增底部按钮", icon: "plus", countText: "0", countAriaLabel: "可添加功能数"
        });
        const { search, list } = createSharedPickerTreeShell(panel, {
            placeholder: "搜索功能或属性…", showRoot: false
        });
        // Discover choices once when opening the editor from the existing
        // metadata/catalog owners. Ordinary toolbar sync still resolves only
        // configured IDs and never scans the vault on focus or scroll.
        const propertyKeys = core.plugin.propertyCatalogKeys(collectPropertyKeys(
            Array.from(core.plugin.fileMetaCache.values(), meta => core.plugin._searchMeta(meta)),
            core.plugin.settings.excludedKeys
        ), core.plugin.settings.excludedKeys);
        const render = () => {
            list.empty();
            const current = new Set(normalizeNavigatorToolbars(core.plugin.settings.navigatorToolbars)[context].order);
            const query = search.value.trim().toLowerCase();
            const choices = [...navigatorToolbarCatalog(core.plugin, { propertyKeys })].filter(([id, def]) =>
                navigatorToolbarActionAvailable(id, context) && !current.has(id)
                && !(context === "create" && def.kind === "property" && core.plugin.isVirtualPropertyKey(def.propertyKey))
                && (!query || `${def.label} ${id}`.toLowerCase().includes(query)));
            header.count.textContent = String(choices.length);
            for (const [id, def] of choices) createSharedPickerTreeRow(list, {
                icon: def.icon, name: def.label, itemTitle: `添加${def.label}`,
                onClick: () => {
                    onAdd(id);
                    core.dropdown.close(false);
                }
            });
            if (!choices.length) list.createDiv({ cls: "local-search-empty-hint",
                text: query ? "没有匹配的功能或属性" : "可用功能和属性入口均已添加" });
        };
        activatePickerSearch(search, { onInput: render, initialRender: render });
    },


    _renderNavigatorPresentationSettings(scroll, panel, wireSection, cleanupFns) {
        const core = this.owner;
        const save = async () => {
            let saved = false;
            try {
                saved = await core.plugin.saveSettings();
            } catch (error) {
                console.warn("导航设置保存失败", error);
            }
            try {
                core.plugin._forEachActiveSearchCore(other => {
                    if (!other.navigator || other._destroyed) return;
                    other.navigator.refreshPreferences();
                });
            } catch (error) {
                console.warn("导航设置刷新失败", error);
                new Notice("导航显示未能刷新，请重新打开视图");
            }
            if (saved === false) new Notice("导航设置尚未写入，请重试；当前界面已应用");
            return saved;
        };
        const sidebarSection = createViewComposerSection(scroll, {
            id: "sidebar", title: "侧栏显示内容", collapsed: true
        });
        wireSection(sidebarSection, "sidebar");
        const sidebarList = sidebarSection.body.createDiv({
            cls: "local-search-view-content-list local-search-view-sort-list"
        });
        const sidebarRows = new Map();
        const syncSidebar = () => {
            if (!panel.isConnected) return;
            const visible = new Set(normalizeNavigatorVisibleSections(core.plugin.settings.navigatorVisibleSections));
            sidebarSection.count.textContent = `${visible.size} / ${NAVIGATOR_VISIBLE_SECTION_DEFS.length}`;
            for (const [id, row] of sidebarRows) {
                const enabled = visible.has(id), def = NAVIGATOR_VISIBLE_SECTION_DEFS.find(item => item.id === id);
                const label = `${enabled ? "隐藏" : "显示"}侧栏${def.label}`;
                row.visibility.replaceChildren();
                setIcon(row.visibility, enabled ? "eye" : "eye-off");
                row.visibility.classList.toggle("is-hidden-state", !enabled);
                setSearchAttribute(row.visibility, "aria-label", label);
                row.visibility.setAttribute("aria-pressed", String(enabled));
                row.visibility.title = label;
            }
        };
        for (const def of NAVIGATOR_VISIBLE_SECTION_DEFS) {
            let visibility;
            const rendered = createSharedPickerTreeRow(sidebarList, {
                rowClasses: "local-search-nav-section-setting-row is-noninteractive",
                icon: def.icon, name: def.label, itemTitle: def.label,
                staticItem: true, sortKey: def.id, restoreFocus: false,
                renderTrailing: row => {
                    visibility = createPickerRowAction(row, {
                        icon: "eye", label: `隐藏侧栏${def.label}`, interaction: "choice",
                        onClick: () => {
                            const visible = new Set(normalizeNavigatorVisibleSections(core.plugin.settings.navigatorVisibleSections));
                            if (visible.has(def.id)) visible.delete(def.id); else visible.add(def.id);
                            core.plugin.settings.navigatorVisibleSections = [...visible];
                            syncSidebar();
                            void save();
                        }
                    });
                }
            });
            sidebarRows.set(def.id, { ...rendered, visibility });
        }
        syncSidebar();
        const toolbarsSection = createViewComposerSection(scroll, {
            id: "toolbars", title: "底部菜单栏", collapsed: true
        });
        wireSection(toolbarsSection, "toolbars");
        for (const [context, defaults] of Object.entries(NAVIGATOR_TOOLBAR_CONTEXTS)) {
            const section = createViewComposerSection(toolbarsSection.body, {
                id: `navigator-toolbar-${context}`, title: defaults.label, collapsed: context !== "filters"
            });
            section.section.addClass("local-search-nav-toolbar-settings");
            section.section.dataset.toolbarContext = context;
            let collapsed = context !== "filters";
            section.toggle.addEventListener("click", () => {
                collapsed = !collapsed;
                section.setCollapsed(collapsed);
            });
            const list = section.body.createDiv({ cls: "local-search-view-content-list local-search-view-sort-list" });
            const rows = new Map();
            const scrollContainer = scroll;
            const read = () => normalizeNavigatorToolbars(core.plugin.settings.navigatorToolbars)[context];
            const commit = async (config, { rollbackOnFailure = false } = {}) => {
                const current = normalizeNavigatorToolbars(core.plugin.settings.navigatorToolbars);
                const next = normalizeNavigatorToolbars({ ...current, [context]: { ...config, version: 2 } });
                core.plugin.settings.navigatorToolbars = next;
                sync();
                const saved = await save();
                if (saved === false && rollbackOnFailure) {
                    const live = normalizeNavigatorToolbars(core.plugin.settings.navigatorToolbars);
                    if (JSON.stringify(live[context]) === JSON.stringify(next[context])) {
                        core.plugin.settings.navigatorToolbars = { ...live, [context]: current[context] };
                        sync();
                        core.plugin._forEachActiveSearchCore(other => other.navigator?.refreshPreferences());
                    }
                }
                return saved;
            };
            const ensureRow = (id, def) => {
                if (rows.has(id)) return rows.get(id);
                const buttons = {};
                const view = createSharedPickerTreeRow(list, {
                    rowClasses: "local-search-nav-toolbar-setting-row is-noninteractive",
                    icon: read().icons[id] || def.icon, name: def.label, itemTitle: def.label,
                    staticItem: true, sortKey: id, sortName: def.label, restoreFocus: false,
                    onIconClick: () => {
                        const currentDef = navigatorToolbarCatalog(core.plugin).get(id) || def;
                        return openFilterToolbarIconPicker(core, {
                            anchor: core.dropdown.anchor || view.iconEl, preserveAnchor: true,
                            propertyKey: currentDef.label, heading: `底栏图标 · ${currentDef.label}`,
                            currentIcon: read().icons[id] || currentDef.icon, defaultIcon: currentDef.icon,
                            onSelect: icon => {
                                const config = read(), icons = { ...config.icons };
                                if (icon === currentDef.icon) delete icons[id]; else icons[id] = icon;
                                return commit({ ...config, icons }, { rollbackOnFailure: true });
                            }
                        });
                    },
                    renderTrailing: row => {
                        buttons.visibility = createPickerRowAction(row, {
                            icon: "eye", label: `隐藏${def.label}`, interaction: "choice",
                            onClick: () => {
                                const config = read(), hidden = new Set(config.hidden);
                                if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
                                void commit({ ...config, hidden: [...hidden] });
                            }
                        });
                        buttons.remove = createPickerRowAction(row, {
                            icon: "minus", label: `移除${def.label}`,
                            onClick: () => {
                                const config = read();
                                void commit({ ...config, order: config.order.filter(value => value !== id),
                                    hidden: config.hidden.filter(value => value !== id) });
                            }
                        });
                    }
                });
                setSearchAttribute(view.iconEl, "aria-label", `修改${def.label}图标`);
                view.iconEl.setAttribute("title", `修改${def.label}图标`);
                view.iconEl.removeAttribute("aria-pressed");
                const rendered = { ...view, ...buttons };
                rows.set(id, rendered);
                return rendered;
            };
            const sync = () => {
                if (!section.section.isConnected) return;
                const config = read(), hidden = new Set(config.hidden);
                section.count.textContent = `${config.order.length - hidden.size} / ${config.order.length}`;
                const focused = list.contains(list.ownerDocument.activeElement) ? list.ownerDocument.activeElement : null;
                // Preserve every actual settings scroll owner. Native mobile
                // settings can wrap vertical-tab-content with another scroller.
                const scrollPositions = [];
                for (let node = list; node; node = node.parentElement) {
                    if (node.scrollHeight > node.clientHeight || node.scrollTop) scrollPositions.push([node, node.scrollTop]);
                }
                const catalog = navigatorToolbarCatalog(core.plugin);
                const liveIds = new Set(config.order);
                let cursor = list.firstElementChild;
                for (const id of config.order) {
                    const def = catalog.get(id) || { label: id.startsWith("property:") ? id.slice(9) : id, icon: "list-filter" };
                    const row = ensureRow(id, def);
                    const icon = resolvePickerIcon(core.plugin, config.icons[id], def.icon);
                    if (row.iconEl.dataset.lsIcon !== icon) {
                        row.iconEl.replaceChildren(); setIcon(row.iconEl, icon); row.iconEl.dataset.lsIcon = icon;
                    }
                    if (row.row !== cursor) list.insertBefore(row.row, cursor);
                    cursor = row.row.nextElementSibling;
                    const visible = !hidden.has(id), label = `${visible ? "隐藏" : "显示"}${def.label}`;
                    if (row.visibility.getAttribute("aria-pressed") !== String(visible)) {
                        row.visibility.replaceChildren();
                        setIcon(row.visibility, visible ? "eye" : "eye-off");
                    }
                    row.visibility.classList.toggle("is-hidden-state", !visible);
                    setSearchAttribute(row.visibility, "aria-label", label);
                    row.visibility.setAttribute("aria-pressed", String(visible));
                    row.visibility.title = label;
                }
                for (const [id, row] of rows) if (!liveIds.has(id)) {
                    row.row.remove(); rows.delete(id);
                }
                if (focused?.isConnected && focused !== list.ownerDocument.activeElement) focused.focus({ preventScroll: true });
                else if (focused && !focused.isConnected) addButton?.focus({ preventScroll: true });
                for (const [node, top] of scrollPositions) if (node.isConnected) node.scrollTop = top;
            };
            const sort = new PointerSortCoordinator({
                list,
                scrollContainer,
                rowSelector: ".local-search-nav-toolbar-setting-row[data-sort-key]",
                hierarchical: false,
                canStart: row => Boolean(row?.dataset?.sortKey),
                onCommit: async ({ key, beforeKey }) => {
                    const config = read();
                    await commit({ ...config, order: moveOrderedKey(config.order, key, beforeKey) });
                }
            });
            const sortToggle = attachPickerSortModeToggle(section, {
                label: `${defaults.label}底栏`,
                onChange: active => {
                    if (active) { collapsed = false; section.setCollapsed(false); }
                    sort.setEnabled(active);
                }
            });
            const addButton = createPickerHeaderIconAction(section.actions, {
                icon: "plus", label: `新增${defaults.label}底栏按钮`,
                onClick: button => this._openNavigatorToolbarPicker(context, button, id => {
                    const config = read();
                    if (config.order.includes(id)) return;
                    collapsed = false; section.setCollapsed(false);
                    void commit({ ...config, order: [...config.order, id], hidden: config.hidden.filter(value => value !== id) });
                })
            });
            createPickerHeaderIconAction(section.actions, {
                icon: "rotate-ccw", label: `重置${defaults.label}底栏`,
                onClick: () => {
                    sortToggle?.setActive(false);
                    void commit(normalizeNavigatorToolbars(null)[context]);
                }
            });
            cleanupFns.push(() => { sortToggle?.destroy(); sort.destroy(); });
            sync();
        }
        return { sidebar: sidebarSection, toolbars: toolbarsSection };
    },


    openViewDropdown(anchor, { section = "" } = {}) {
        const core = this.owner;
        const panel = core.dropdown.open(anchor, "视图设置");
        if (!panel) return;
        panel.addClass("local-search-view-dropdown", "local-search-view-composer");
        panel.dataset.lsDropdownSize = "view-composer";
        configureSharedPickerHeader(panel, {
            headingText: "视图设置",
            icon: "sliders-horizontal"
        });

        // 每次重新打开都从“全部折叠”开始；子 Picker 返回父级时父 DOM 原位保留，
        // 不会因为二级设置往返而丢失本次展开状态。
        this.viewComposerCollapsed = new Set(VIEW_COMPOSER_SECTION_IDS);
        if (VIEW_COMPOSER_SECTION_IDS.includes(section)) this.viewComposerCollapsed.delete(section);

        const scroll = panel.createDiv({
            cls: "local-search-view-scroll local-search-view-composer-scroll"
        });
        const cleanupFns = [];
        registerPickerCleanup(panel, () => {
            for (const cleanup of cleanupFns.splice(0)) {
                try { cleanup(); } catch (error) { console.warn("View Composer cleanup failed", error); }
            }
        });

        const wireSection = (view, id) => {
            const sync = () => view.setCollapsed(this.viewComposerCollapsed.has(id));
            view.toggle.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                if (this.viewComposerCollapsed.has(id)) this.viewComposerCollapsed.delete(id);
                else this.viewComposerCollapsed.add(id);
                sync();
            });
            sync();
        };

        const syncVisibilityAction = (button, visible, label) => {
            if (!button) return;
            const nextIcon = visible ? "eye" : "eye-off";
            button.replaceChildren();
            setIcon(button, nextIcon);
            button.classList.toggle("is-hidden-state", !visible);
            const actionLabel = visible ? `隐藏${label}` : `显示${label}`;
            setSearchAttribute(button, "aria-label", actionLabel);
            button.setAttribute("aria-pressed", String(visible));
            button.title = actionLabel;
        };

        // A Composer row is stable across setting changes; update its leading icon
        // in place rather than rebuilding the row or retaining a stale preview.
        const syncToolbarRowIcon = (rendered, icon) => {
            const element = rendered?.iconEl;
            if (!element || element.dataset.lsToolbarIcon === icon) return;
            element.replaceChildren();
            setIcon(element, icon);
            element.dataset.lsToolbarIcon = icon;
        };

        // Visibility changes keep every row mounted in place. Reorder only
        // changed positions; moving a focused node with insertBefore can blur
        // it on WebKit/Chromium, so restore that same live control without scroll.
        const syncComposerRowOrder = (list, rows) => {
            const next = rows.filter(Boolean);
            if (next.every((row, index) => list.children[index] === row)
                && list.children.length === next.length) return;
            const doc = list.ownerDocument;
            const focused = list.contains(doc.activeElement) ? doc.activeElement : null;
            const top = scroll.scrollTop, left = scroll.scrollLeft;
            next.forEach((row, index) => {
                if (list.children[index] !== row) list.insertBefore(row, list.children[index] || null);
            });
            if (focused?.isConnected && panel.isConnected && !panel.hidden
                && doc.activeElement === doc.body && !focused.disabled) {
                focused.focus({ preventScroll: true });
            }
            scroll.scrollTop = Math.min(top, Math.max(0, scroll.scrollHeight - scroll.clientHeight));
            scroll.scrollLeft = left;
        };

        const attachSectionSort = (section, coordinator, label, onChange = null) => {
            const toggle = attachPickerSortModeToggle(section, {
                label,
                onChange: active => {
                    coordinator.setEnabled(active);
                    onChange?.(active);
                }
            });
            coordinator.setEnabled(false);
            cleanupFns.push(() => {
                toggle?.destroy?.();
                coordinator.destroy();
            });
            return toggle;
        };

        // 视图 ---------------------------------------------------------------
        const viewSection = createViewComposerSection(scroll, {
            id: "view",
            title: "视图",
            collapsed: true
        });
        wireSection(viewSection, "view");
        const modeGrid = viewSection.body.createDiv({ cls: "local-search-view-mode-grid" });
        const modeButtons = new Map();
        for (const id of RESULT_VIEW_IDS) {
            const button = createViewComposerChoice(modeGrid, {
                text: RESULT_VIEW_LABELS[id],
                buttonClass: "local-search-view-mode-option"
            });
            modeButtons.set(id, button);
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                void core.plugin.setActiveResultView(id);
                syncControls();
            });
        }

        // 摘要 ---------------------------------------------------------------
        const snippetSection = createViewComposerSection(scroll, {
            id: "snippet",
            title: "摘要",
            collapsed: true
        });
        wireSection(snippetSection, "snippet");
        const snippetGrid = snippetSection.body.createDiv({ cls: "local-search-view-snippet-grid" });
        const snippetButtons = new Map();
        for (const option of [
            { value: 0, label: "不显示" },
            { value: 1, label: "1 行" },
            { value: 2, label: "2 行" },
            { value: 3, label: "3 行" }
        ]) {
            const button = createViewComposerChoice(snippetGrid, {
                text: option.label,
                buttonClass: "local-search-view-option"
            });
            snippetButtons.set(option.value, button);
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                void core.plugin.updateActiveResultViewConfig({
                    snippetLines: option.value
                });
                syncControls();
            });
        }

        // 显示内容：左侧语义图标 + 最右侧显隐；Header 统一进入拖拽模式。 ----
        const contentSection = createViewComposerSection(scroll, {
            id: "content",
            title: "显示内容",
            collapsed: true
        });
        wireSection(contentSection, "content");
        const contentList = contentSection.body.createDiv({
            cls: "local-search-view-content-list local-search-view-sort-list"
        });
        const contentRows = new Map();
        for (const def of RESULT_CONTENT_DEFS) {
            let visibilityAction = null;
            const toggleVisibility = () => {
                const current = this.activeViewConfig();
                void core.plugin.updateActiveResultViewConfig({
                    [def.flag]: !current[def.flag]
                }).then(() => syncContentRows());
            };
            const rendered = createSharedPickerTreeRow(contentList, {
                rowClasses: "local-search-view-content-order-row is-noninteractive",
                active: false,
                icon: def.icon,
                name: def.label,
                itemTitle: def.label,
                staticItem: true,
                sortKey: def.id,
                sortName: def.label,
                renderTrailing: row => {
                    visibilityAction = createPickerRowAction(row, {
                        icon: "eye",
                        label: `隐藏${def.label}`,
                        interaction: "choice",
                        onClick: toggleVisibility
                    });
                },
                restoreFocus: false
            });
            contentRows.set(def.id, { ...rendered, visibilityAction });
        }
        const syncContentRows = () => {
            if (!panel.isConnected) return;
            const config = this.activeViewConfig();
            const order = normalizeResultContentOrder(config.contentOrder);
            for (const id of order) {
                const def = RESULT_CONTENT_DEF_MAP.get(id);
                const rendered = contentRows.get(id);
                if (!def || !rendered) continue;
                const visible = Boolean(config[def.flag]);
                syncVisibilityAction(rendered.visibilityAction, visible, def.label);
            }

            syncComposerRowOrder(contentList, order.map(id => contentRows.get(id)?.row));
        };
        const contentSort = new PointerSortCoordinator({
            list: contentList,
            scrollContainer: scroll,
            rowSelector: ".local-search-view-content-order-row[data-sort-key]",
            hierarchical: false,
            canStart: row => Boolean(row?.dataset?.sortKey),
            onCommit: async ({ key, beforeKey }) => {
                const current = this.activeViewConfig();
                const order = normalizeResultContentOrder(current.contentOrder);
                await core.plugin.updateActiveResultViewConfig({
                    contentOrder: moveOrderedKey(order, key, beforeKey)
                });
                syncContentRows();
            }
        });
        attachSectionSort(
            contentSection,
            contentSort,
            "显示内容顺序"
        );

        // 排序字段：左侧字段图标 + 最右侧显隐；Header 统一进入拖拽模式。 ----
        const sortSection = createViewComposerSection(scroll, {
            id: "sort",
            title: "排序",
            collapsed: true
        });
        wireSection(sortSection, "sort");
        const sortList = sortSection.body.createDiv({
            cls: "local-search-view-sort-field-list local-search-view-sort-list"
        });
        const sortRows = new Map();
        for (const id of SORT_FIELD_IDS) {
            const def = SORT_FIELD_DEFS[id];
            let visibilityAction = null;
            const toggleVisibility = () => {
                const order = normalizeSortFieldOrder(core.plugin.settings.resultSortOrder);
                const hidden = new Set(
                    normalizeHiddenSortFields(core.plugin.settings.hiddenResultSortFields, order)
                );
                if (hidden.has(id)) {
                    hidden.delete(id);
                } else {
                    const enabledNonQuery = order.filter(field =>
                        field !== "relevance" && !hidden.has(field)
                    );
                    if (id !== "relevance" && enabledNonQuery.length <= 1) {
                        new Notice("至少保留一个排序字段");
                        return;
                    }
                    hidden.add(id);
                }
                void core.plugin.setResultSortPreferences({
                    hidden: [...hidden]
                }).then(() => syncSortRows());
            };
            const rendered = createSharedPickerTreeRow(sortList, {
                rowClasses: "local-search-view-sort-field-row is-noninteractive",
                active: false,
                icon: def.icon || "arrow-up-down",
                name: def.label,
                itemTitle: def.label,
                staticItem: true,
                sortKey: id,
                sortName: def.label,
                renderTrailing: row => {
                    visibilityAction = createPickerRowAction(row, {
                        icon: "eye",
                        label: `关闭排序字段 ${def.label}`,
                        interaction: "choice",
                        onClick: toggleVisibility
                    });
                },
                restoreFocus: false
            });
            sortRows.set(id, { ...rendered, visibilityAction });
        }

        const syncSortRows = () => {
            if (!panel.isConnected) return;
            const order = normalizeSortFieldOrder(core.plugin.settings.resultSortOrder);
            const hidden = new Set(
                normalizeHiddenSortFields(core.plugin.settings.hiddenResultSortFields, order)
            );
            for (const id of order) {
                const rendered = sortRows.get(id);
                if (!rendered) continue;
                const enabled = !hidden.has(id);
                syncVisibilityAction(
                    rendered.visibilityAction,
                    enabled,
                    `排序字段 ${SORT_FIELD_DEFS[id].label}`
                );
            }

            syncComposerRowOrder(sortList, order.map(id => sortRows.get(id)?.row));
        };

        const sortFieldSort = new PointerSortCoordinator({
            list: sortList,
            scrollContainer: scroll,
            rowSelector: ".local-search-view-sort-field-row[data-sort-key]",
            hierarchical: false,
            canStart: row => Boolean(row?.dataset?.sortKey),
            onCommit: async ({ key, beforeKey }) => {
                const order = normalizeSortFieldOrder(core.plugin.settings.resultSortOrder);
                await core.plugin.setResultSortPreferences({
                    order: moveOrderedKey(order, key, beforeKey)
                });
                syncSortRows();
            }
        });
        attachSectionSort(
            sortSection,
            sortFieldSort,
            "排序字段顺序"
        );

        // 筛选池：固定四类直接平铺；eye=开启/关闭，Header 只负责拖拽排序。 ----
        const poolSection = createViewComposerSection(scroll, {
            id: "filterPools",
            title: "筛选池",
            collapsed: true
        });
        wireSection(poolSection, "filterPools");
        const poolList = poolSection.body.createDiv({
            cls: "local-search-view-filter-pool-list local-search-view-sort-list"
        });

        const poolRows = new Map();

        const ensurePoolRow = pool => {
            let rendered = poolRows.get(pool.id);
            if (rendered) return rendered;
            const label = filterPoolLabel(pool);
            let visibilityAction = null;
            const rowView = createSharedPickerTreeRow(poolList, {
                rowClasses: "local-search-view-filter-pool-row",
                active: false,
                icon: filterPoolIcon(pool),
                name: label,
                itemTitle: `配置筛选池 ${label}`,
                sortKey: pool.id,
                sortName: label,
                onClick: () => {
                    const livePool = this._filterPoolById(pool.id);
                    if (livePool) this._openFilterPoolEditor(livePool);
                },
                renderTrailing: row => {
                    visibilityAction = createPickerRowAction(row, {
                        icon: "eye", label: `显示筛选池 ${label}`,
                        interaction: "choice",
                        onClick: () => {
                            const current = this._filterPoolById(pool.id);
                            if (!current) return;
                            void persistPools(this.filterPools().map(item =>
                                item.id === pool.id ? { ...item, visible: current.visible === false } : item
                            )).catch(error => console.warn("筛选池显隐保存失败", error));
                        }
                    });
                },
                restoreFocus: false
            });
            rendered = { ...rowView, visibilityAction };
            poolRows.set(pool.id, rendered);
            return rendered;
        };
        const syncPoolRows = (sourcePools = this.filterPools()) => {
            if (!panel.isConnected) return;
            const pools = Array.isArray(sourcePools) ? sourcePools : [];
            const liveIds = new Set(pools.map(pool => pool.id));
            for (const [id, rendered] of [...poolRows]) {
                if (liveIds.has(id)) continue;
                rendered.row?.remove?.(); poolRows.delete(id);
            }
            for (const pool of pools) {
                const rendered = ensurePoolRow(pool);
                const label = filterPoolLabel(pool);
                syncVisibilityAction(rendered.visibilityAction, pool.visible !== false, `筛选池 ${label}`);
                syncToolbarRowIcon(rendered, filterPoolIcon(pool));
            }
            syncComposerRowOrder(poolList, pools.map(pool => poolRows.get(pool.id)?.row));
            poolSection.count.textContent = "";
        };

        const persistPools = pools => {
            syncPoolRows(pools);
            return Promise.resolve(core.plugin.setFilterPools(pools)).then(() => {
                syncPoolRows();
            });
        };

        const poolSort = new PointerSortCoordinator({
            list: poolList,
            scrollContainer: scroll,
            rowSelector: ".local-search-view-filter-pool-row[data-sort-key]",
            hierarchical: false,
            canStart: row => Boolean(row?.dataset?.sortKey),
            onCommit: async ({ key, beforeKey }) => {
                const pools = this.filterPools();
                const order = moveOrderedKey(
                    pools.map(pool => pool.id),
                    key,
                    beforeKey
                );
                const map = new Map(
                    pools.map(pool => [pool.id, pool])
                );
                await persistPools(
                    order.map(id => map.get(id)).filter(Boolean)
                );
            }
        });

        attachSectionSort(
            poolSection,
            poolSort,
            "筛选池顺序"
        );

        const navigatorSections = this._renderNavigatorPresentationSettings(scroll, panel, wireSection, cleanupFns);

        // 结果视图仅设置左侧可见项；右侧固定由原生属性 Picker 管理。

        // 全局排除文件夹 -----------------------------------------------------
        // 这里只管理插件的全局索引边界；“结果排除”已归到顶部文件夹 Picker。
        const exclusionSection = createViewComposerSection(scroll, {
            id: "exclusion",
            title: "全局排除文件夹",
            collapsed: true
        });
        wireSection(exclusionSection, "exclusion");

        const exclusionList = exclusionSection.body.createDiv({
            cls: "local-search-view-excluded-folder-list local-search-view-sort-list"
        });
        createViewComposerActionRow(exclusionList, {
            icon: "plus",
            name: "添加全局排除文件夹",
            label: "添加全局排除文件夹",
            onClick: () => {
                this.openGlobalExcludedFolderPicker(
                    this.resultViewBtn || anchor,
                    syncExclusion
                );
            }
        });
        const excludedFolderRows = exclusionList.createDiv({
            cls: "local-search-view-excluded-folder-rows local-search-view-sort-list"
        });

        const syncExclusion = () => {
            if (!panel.isConnected) return;
            const excludedFolders = normalizeExcludedFolders(
                core.plugin.settings.excludedFolders
            );
            exclusionSection.count.textContent = excludedFolders.length
                ? String(excludedFolders.length)
                : "";

            excludedFolderRows.empty();
            for (const folderPath of excludedFolders) {
                createSharedPickerTreeRow(excludedFolderRows, {
                    rowClasses: "local-search-view-excluded-folder-row",
                    icon: "folder",
                    name: folderPath,
                    itemTitle: `管理全局排除 ${folderPath}`,
                    onClick: () => {
                        this.openGlobalExcludedFolderPicker(
                            this.resultViewBtn || anchor,
                            syncExclusion
                        );
                    },
                    renderTrailing: row => {
                        createViewComposerRemoveButton(row, {
                            label: `取消全局排除 ${folderPath}`,
                            onClick: () => {
                                void core.plugin.setExcludedFolders(
                                    excludedFolders.filter(path => path !== folderPath)
                                ).then(() => syncExclusion());
                            }
                        });
                    },
                    restoreFocus: false
                });
            }
        };

        // 恢复默认 -----------------------------------------------------------
        const footer = scroll.createDiv({ cls: "local-search-view-footer" });
        const reset = createSearchButton(footer, "action", {
            cls: "local-search-view-reset"
        });
        reset.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            void core.plugin.resetActiveResultView();
            syncControls();
        });

        const syncControls = () => {
            if (!panel.isConnected) return;
            const activeId = this.activeViewId();
            const config = this.activeViewConfig();
            for (const [id, button] of modeButtons) {
                syncViewComposerChoiceSelection(button, id === activeId);
            }
            for (const [lines, button] of snippetButtons) {
                syncViewComposerChoiceSelection(button, config.snippetLines === lines);
            }
            syncContentRows();
            syncSortRows();
            syncPoolRows();
            reset.textContent = `恢复${RESULT_VIEW_LABELS[activeId]}默认`;
        };

        syncPoolRows();
        syncExclusion();
        syncControls();
        const requestedSection = section === "filterPools" ? poolSection : navigatorSections[section];
        if (requestedSection) {
            const frame = hostWindow(panel).requestAnimationFrame(() => {
                if (core.dropdown.isActivePanel(panel) && panel.isConnected)
                    scroll.scrollTop = Math.max(0, requestedSection.section.offsetTop - scroll.offsetTop);
            });
            registerPickerCleanup(panel, () => hostWindow(panel).cancelAnimationFrame(frame));
        }
    },


    openGlobalExcludedFolderPicker(anchor, onChange = null) {
        const core = this.owner;
        const targetAnchor = anchor || this.resultViewBtn;
        if (!targetAnchor?.isConnected) return;

        core.facets.showFolderDropdown({
            mode: "global-exclude",
            anchor: targetAnchor,
            onChange
        });
    },


    applyViewSettings({
        rerender = true,
        viewportAnchor = null,
        clearEstimate = false
    } = {}) {
        const core = this.owner;
        if (core._destroyed || !core.containerEl?.isConnected) return;
        this.syncViewMode();
        if (!rerender) return;

        // 视图变化只改变结果卡几何，不改变结果数据。
        // 一律通过 path + viewport offset 锚点重建，禁止跨密度复用裸 scrollTop。
        core.resultRenderer.rerenderForGeometryChange({
            viewportAnchor,
            clearEstimate
        });
    },

    
    sync() {
        const core = this.owner;
        core.sorting?.sync();
        if (this.historyBtn) {
            const open = Boolean(core.dropdown.isOpenFor(this.historyBtn));
            this.historyBtn.setAttribute("aria-expanded", String(open));
        }
        this.syncInputActions();
    },
};

