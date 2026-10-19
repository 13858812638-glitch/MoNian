// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { supportsPluginFineHover } from "../../interactions/hover-hints.js";
import { createSearchButton } from "../../ui/components/input-controls.js";
import { configureSharedPickerHeader } from "../../ui/pickers/picker-header.js";
import { createSharedPickerTreeShell } from "../../ui/pickers/picker-shell.js";
import { createPickerRowAction } from "../../ui/pickers/tree-row.js";
import { isDomInput } from "../../utils/dom.js";
import { setIcon } from "obsidian";
// Instance method owner. `this` is the unchanged SearchResultControlsController instance. No additional state store.
export const SearchResultControlsController_search_history_methods = {

    
    openHistoryDropdown(anchorEl) {
        const core = this.owner;
        if (core.dropdown.closeIfSameAnchor(anchorEl)) {
            this.sync();
            return;
        }
        const panel = core.dropdown.open(anchorEl, "搜索记录");
        if (!panel) return;
        panel.addClass(
            "local-search-picker-dropdown",
            "local-search-facet-picker"
        );
        const header = configureSharedPickerHeader(panel, {
            headingText: "搜索记录",
            icon: "history",
            countText: (core.plugin.settings.favoriteSearches || []).length
                + (core.plugin.settings.searchHistory || []).length
        });
        const clearRecent = createSearchButton(header?.actions || panel, "text", {
            text: "清空最近",
            cls: "local-search-picker-header-text-action",
            attr: {
                "aria-label": "清空最近搜索，收藏保留"
            }
        });
        const { search, list } = createSharedPickerTreeShell(panel, {
            placeholder: "搜索记录…",
            treeClasses: "local-search-history-dropdown-list",
            showRoot: false
        });
        const render = (options = {}) => {
            const count = this._renderHistoryList(list, search.value, render, options);
            if (header?.count) {
                header.count.textContent = String(count);
                header.count.setAttribute("aria-label", `当前显示 ${count} 条搜索记录`);
            }
            clearRecent.disabled = !(core.plugin.settings.searchHistory || []).length;
        };
        search.addEventListener("input", () => render());
        clearRecent.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (!core.plugin._setSearchHistory([])) return;
            render();
            core.dropdown.reposition();
            if (event.detail === 0 && search.isConnected) search.focus({ preventScroll: true });
        });
        render();
        this.sync();
    },


    _renderHistoryList(listEl, rawQuery = "", onRefresh = null, {
        focusQuery = "",
        focusAction = "",
        fallbackIndex = 0
    } = {}) {
        const core = this.owner;
        const oldScroll = listEl.scrollTop;
        listEl.empty();
        const queryText = String(rawQuery || "").trim().toLocaleLowerCase("zh-CN");
        const keyOf = value => String(value || "").trim().toLocaleLowerCase("zh-CN");
        const match = value => !queryText || keyOf(value).includes(queryText);
        const favorites = (core.plugin.settings.favoriteSearches || []).filter(match);
        const recent = (core.plugin.settings.searchHistory || []).filter(match);
        let visibleCount = 0;

        const refreshAfterAction = (event, action, query, row, mutate) => {
            const rows = [...listEl.querySelectorAll(".local-search-history-row")];
            const index = rows.indexOf(row);
            if (!mutate()) return;
            const options = event?.detail === 0
                ? { focusQuery: query, focusAction: action, fallbackIndex: Math.max(0, index) }
                : {};
            if (typeof onRefresh === "function") onRefresh(options);
            else this._renderHistoryList(listEl, rawQuery, null, options);
            core.dropdown.reposition();
        };

        const renderSection = ({ title, queries, favorite }) => {
            if (!queries.length) return;
            const section = listEl.createDiv({ cls: "local-search-history-section" });
            section.createDiv({ cls: "local-search-history-section-title", text: title });
            for (const query of queries) {
                const applied = !core.createFlow?.isCreateMode?.()
                    && core.queryState.raw.trim() === query.trim();
                const row = section.createDiv({ cls: "local-search-picker-action-row local-search-history-row" });
                row.dataset.lsHistoryQueryKey = keyOf(query);
                row.classList.toggle("is-applied", applied);

                const hit = createSearchButton(row, "tree-hit", {
                    cls: "local-search-history-hit",
                    attr: {
                        "aria-label": `搜索：${query}`,
                        "aria-current": applied ? "true" : "false"
                    }
                });
                const icon = hit.createSpan({ cls: "local-search-history-icon", attr: { "aria-hidden": "true" } });
                setIcon(icon, applied ? "check" : (favorite ? "star" : "history"));
                hit.createSpan({ cls: "local-search-history-label", text: query });
                hit.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    core.dropdown.close(false);
                    this.sync();
                    this._applyHistoryQuery(query, {
                        focus: event.detail === 0 || supportsPluginFineHover(row)
                    });
                });

                const actions = row.createDiv({ cls: "local-search-picker-row-actions" });
                const favoriteAction = createPickerRowAction(actions, {
                    icon: favorite ? "star-off" : "star",
                    label: favorite ? `取消收藏 ${query}` : `收藏 ${query}`,
                    onClick: (_button, event) => refreshAfterAction(
                        event,
                        "favorite",
                        query,
                        row,
                        () => favorite
                            ? core.plugin.unfavoriteSearchQuery(query)
                            : core.plugin.favoriteSearchQuery(query)
                    )
                });
                favoriteAction.dataset.lsHistoryAction = "favorite";
                const deleteAction = createPickerRowAction(actions, {
                    icon: "trash-2",
                    label: `删除搜索记录 ${query}`,
                    danger: true,
                    onClick: (_button, event) => refreshAfterAction(
                        event,
                        "delete",
                        query,
                        row,
                        () => core.plugin.deleteSearchQuery(query, { favorite })
                    )
                });
                deleteAction.dataset.lsHistoryAction = "delete";
                visibleCount++;
            }
        };

        renderSection({ title: "收藏", queries: favorites, favorite: true });
        renderSection({ title: "最近", queries: recent, favorite: false });
        if (!visibleCount) {
            listEl.createDiv({
                text: queryText ? "没有匹配的搜索记录" : "暂无搜索记录",
                cls: "local-search-history-dropdown-empty"
            });
        }
        listEl.scrollTop = oldScroll;

        if (focusQuery) {
            const rows = [...listEl.querySelectorAll(".local-search-history-row")];
            const row = rows.find(item => item.dataset.lsHistoryQueryKey === keyOf(focusQuery))
                || rows[Math.min(Math.max(0, fallbackIndex), Math.max(0, rows.length - 1))];
            const target = row?.querySelector(`[data-ls-history-action="${focusAction}"]`)
                || listEl.closest(".local-search-picker-dropdown")?.querySelector(".local-search-picker-search");
            target?.focus({ preventScroll: true });
        }
        return visibleCount;
    },


    _applyHistoryQuery(q, { focus = true } = {}) {
        const core = this.owner;
        const value = String(q || "").trim();
        if (!value || !isDomInput(core.searchInput)) return false;

        // 创建态应用历史查询必须一次完成“退出创建 + 新查询”，禁止先恢复旧查询再立即推翻。
        if (core.createFlow?.isCreateMode?.()) {
            if (!core.createFlow.toggleInputMode({
                focusInput: false,
                searchQueryOnExit: value
            })) return false;
        } else {
            core.searchInput.value = value;
            core._commitSearchInputValue();
        }
        core.createFlow?.syncInputModeView?.();
        if (core.navigator?.layout === "mobile") {
            // A discrete history choice commits immediately; the typing debounce
            // must not briefly expose the previous result scope after navigation.
            core.navigator.showResults();
            return true;
        }
        if (focus && core.searchInput.isConnected && core.searchInput.ownerDocument.activeElement !== core.searchInput) {
            core.searchInput.focus({ preventScroll: true });
        }
        return true;
    },
};

