import { setSearchAttribute } from "../../interactions/hover-hints.js";
// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { createSearchButton } from "../../ui/components/input-controls.js";
import { configureSharedPickerHeader } from "../../ui/pickers/picker-header.js";
import { createSharedPickerTreeRow } from "../../ui/pickers/tree-row.js";
import { FILTER_TIME_FIELDS, filterDateRangeDisplay, normalizeFilterDateRange, recentFilterDateRange } from "../filters/filter-state.js";
import { navigatorToolbarIcon, normalizeNavigatorTimeField } from "../navigator/toolbar-config.js";
import { SORT_FIELD_DEFS, normalizeSortDirection, normalizeSortField, selectableSortFieldsForQuery, sortFieldsForQuery } from "./sort-model.js";
import { Notice, setIcon } from "obsidian";


// ========== Search Sort：排序字段 / 方向唯一状态源 ==========
export class SearchSortController {
    constructor(owner) {
        this.owner = owner;
        this.views = [];
        this.host = null;
        this.pickerBtn = null;
        this.fieldBtn = null;
        this.fieldLabel = null;
        this.directionBtn = null;
        this.directionIcon = null;
        this.cycleCursorField = null;
    }

    destroy() {
        this.views.length = 0;
        this.host = null;
        this.pickerBtn = null;
        this.fieldBtn = null;
        this.fieldLabel = null;
        this.directionBtn = null;
        this.directionIcon = null;
        this.cycleCursorField = null;
        this.owner = null;
    }

    allowedFields(view = null) {
        const core = this.owner;
        return sortFieldsForQuery(
            Boolean(core?.queryState?.active),
            core?.plugin?.settings
        );
    }

    ensureCycleCursor(fields = this.allowedFields()) {
        const core = this.owner;
        if (!core || !fields.length) {
            this.cycleCursorField = null;
            return null;
        }
        if (!fields.includes(this.cycleCursorField)) {
            this.cycleCursorField = fields.includes(core.sortField)
                ? core.sortField
                : fields[0];
        }
        return this.cycleCursorField;
    }

    normalize() {
        const core = this.owner;
        if (!core) return;
        const hasQuery = Boolean(core.queryState?.active);
        core.sortField = normalizeSortField(
            core.sortField,
            hasQuery,
            core.plugin?.settings
        );
        core.sortDirection = normalizeSortDirection(core.sortDirection);
    }

    fieldFor(view = null) {
        return this.owner?.sortField;
    }

    timeField() {
        const core = this.owner;
        const state = core?.createFlow?.searchResultFilterState?.() || core?.filterState;
        return normalizeNavigatorTimeField(state?.dateRange?.field || core?.plugin?.settings?.navigatorTimeField);
    }

    _isCreateVisible() {
        const core = this.owner;
        return Boolean(core?.createFlow?.isCreateView?.()
            && (core.createFlow.isCreateMode?.() || core.navigator?.page !== "filters"));
    }

    _prepareSearchAction() {
        const core = this.owner;
        if (!core || core._destroyed || this._isCreateVisible()) return false;
        // A zero-result draft can be held behind the filter tree. Restore the
        // search owner before mutating it; performSearch restores too late.
        if (core.createFlow?.isDerivedCreateView?.()) {
            if (core.navigator?.prepareSearch) return core.navigator.prepareSearch();
            core.createFlow.prepareSearchEvaluation();
        }
        return true;
    }

    applyField(field, view = null) {
        const core = this.owner;
        // 零命中派生 Create 的恢复本身属于真实状态变化，不能当作重复排序。
        const restoringSearch = Boolean(core?.createFlow?.isDerivedCreateView?.());
        if (!this._prepareSearchAction()) return;
        const sameField = core.sortField === field;
        const basis = ({ created: "created", contentModified: "modified", fileModified: "fileModified" })[field];
        const timeBasisChanged = Boolean(basis && (core.plugin.settings.navigatorTimeField !== basis
            || (core.filterState.dateRange && core.filterState.dateRange.field !== basis)));
        if (basis) {
            const changed = core.plugin.settings.navigatorTimeField !== basis;
            core.plugin.settings.navigatorTimeField = basis;
            if (core.filterState.dateRange) core.filterState.dateRange = { ...core.filterState.dateRange, field: basis };
            if (changed) void core.plugin.saveSettings().then(saved => {
                if (saved === false) new Notice("时间依据未能保存，请重试");
            }).catch(error => new Notice(error?.message || "时间依据未能保存"));
            core.navigator?.refreshPreferences();
            if (changed) core.plugin._forEachActiveSearchCore?.(other => {
                if (other === core || other._destroyed) return;
                other.sorting?.sync();
                other.navigator?.refreshPreferences();
            });
        }
        core.sortField = field;
        this.sync();
        core.swipe?.closeAll?.({ immediate: true });
        // Picker 再次选择当前字段不应重置滚动、焦点及整窗 DOM；
        // 但有未提交索引、时间依据变化、创建态退出或待输入时仍须正常重算。
        if (sameField && !timeBasisChanged && !restoringSearch
            && core._resultGeneration > 0
            && !core._pendingResultUpdate && !core._initialViewportAnchor
            && !core.searchTimer && !core._inputComposing
            && core.searchInput?.value === core.queryState.raw
            && !core.createFlow?.isCreateView?.()) return;
        core.performSearch(core.queryState.raw, true);
    }

    cycleField(view = null) {
        const core = this.owner;
        if (!this._prepareSearchAction()) return;
        this.normalize();
        const fields = this.allowedFields();
        const cursor = this.ensureCycleCursor(fields);
        if (!cursor) return;

        // 让 applyField 自己比较旧、新字段。提前写入 core.sortField
        // 会让真正切换字段的循环排序被误判为“同字段重复点击”。
        let nextField = cursor;
        if (core.sortField === cursor) {
            const index = fields.indexOf(cursor);
            this.cycleCursorField = fields[(index + 1) % fields.length];
            nextField = this.cycleCursorField;
        }

        this.applyField(nextField, view);
    }

    openPicker(view = this.views[0]) {
        const core = this.owner;
        const anchor = view?.pickerBtn || this.pickerBtn;
        if (!anchor || !this._prepareSearchAction()) return;
        if (core.dropdown.closeIfSameAnchor(anchor)) {
            this.sync();
            return;
        }

        const navigator = core.navigator;
        const fromBottomCommand = navigator?.layout === "mobile"
            && navigator.mobileToolbar?.contains(anchor);
        const onCommit = view?.onCommit || (fromBottomCommand
            ? () => { if (!core._destroyed) navigator.showResults(false); }
            : null);
        this.normalize();
        const title = "排序与时间";
        const panel = core.dropdown.open(anchor, title);
        if (!panel) return;
        panel.dataset.lsDropdownSize = "compact-view";
        panel.addClass(
            "local-search-picker-dropdown",
            "local-search-sort-picker"
        );
        configureSharedPickerHeader(panel, {
            headingText: title,
            icon: "arrow-up-down"
        });

        const list = panel.createDiv({
            cls: "local-search-move-tree"
        });
        createSharedPickerTreeRow(list, {
                name: core.sortDirection === "desc" ? "降序 · 点击切换为升序" : "升序 · 点击切换为降序",
                icon: core.sortDirection === "desc" ? "arrow-down" : "arrow-up",
                onClick: () => {
                    if (core.dropdown.close(false) === false) return;
                    this.toggleDirection(view); onCommit?.();
                }
        });
        const fields = selectableSortFieldsForQuery(
            Boolean(core.queryState?.active),
            core.plugin?.settings
        );
        for (const id of fields) {
            const def = SORT_FIELD_DEFS[id];
            if (!def) continue;
            createSharedPickerTreeRow(list, {
                active: id === this.fieldFor(view),
                icon: def.icon || "arrow-up-down",
                name: def.label,
                itemTitle: `排序：${def.label}`,
                onClick: () => {
                    if (core.dropdown.close(false) === false) return;
                    this.applyField(id, view);
                    onCommit?.();
                },
                restoreFocus: false
            });
        }
        const range = normalizeFilterDateRange(core.filterState.dateRange);
        const basis = this.timeField();
        list.createDiv({
            cls: "local-search-list-section-label",
            text: `时间范围 · ${FILTER_TIME_FIELDS[basis].label}`
        });
        createSharedPickerTreeRow(list, {
            active: !range,
            icon: "calendar-off",
            name: "不限时间",
            onClick: () => this.applyTimeRange(0, onCommit),
            restoreFocus: false
        });
        for (const [label, days] of [["今天", 1], ["近3天", 3], ["近7天", 7], ["近30天", 30]]) {
            const preset = recentFilterDateRange(basis, days);
            createSharedPickerTreeRow(list, {
                active: Boolean(range && range.field === preset.field
                    && range.from === preset.from && range.to === preset.to),
                icon: "calendar-days",
                name: label,
                itemTitle: `${FILTER_TIME_FIELDS[basis].label} · ${label}`,
                onClick: () => this.applyTimeRange(days, onCommit),
                restoreFocus: false
            });
        }
        this.sync();
        return panel;
    }

    applyTimeRange(days, onCommit = null) {
        const core = this.owner;
        if (!this._prepareSearchAction()) return;
        const range = days ? recentFilterDateRange(this.timeField(), days) : null;
        if (core.dropdown.close(false) === false) return;
        core.filterState.dateRange = range;
        this.sync();
        core._onFilterChanged();
        onCommit?.();
    }

    toggleDirection(view = null) {
        const core = this.owner;
        if (!this._prepareSearchAction()) return;
        core.sortDirection = normalizeSortDirection(core.sortDirection) === "desc"
            ? "asc"
            : "desc";
        this.sync();
        core.swipe?.closeAll?.({ immediate: true });
        core.performSearch(core.queryState.raw, true);
    }

    build(parentEl, { context = "results" } = {}) {
        if (!parentEl) return null;
        const core = this.owner;
        const host = parentEl.createDiv({
            cls: "local-search-sort-control",
            attr: { role: "group", "aria-label": "结果排序" }
        });
        host.dataset.sortContext = context;
        const view = { host, context };
        this.views.push(view);

        view.fieldBtn = createSearchButton(host, "choice", {
            cls: "local-search-sort-field-btn"
        });
        view.fieldLabel = view.fieldBtn.createSpan({ cls: "local-search-sort-trigger-label" });
        view.fieldBtn.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            this.cycleField(view);
        });

        view.pickerBtn = createSearchButton(host, "action", {
            cls: "local-search-sort-picker-btn",
            attr: {
                "aria-label": "选择排序与时间范围",
                "aria-haspopup": "dialog",
                "aria-expanded": "false"
            }
        });
        view.pickerBtn.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            this.openPicker(view);
        });

        view.directionBtn = createSearchButton(host, "choice", {
            cls: "local-search-sort-direction-btn"
        });
        view.directionIcon = view.directionBtn.createSpan({
            cls: "local-search-sort-direction-icon",
            attr: { "aria-hidden": "true" }
        });
        view.directionBtn.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            this.toggleDirection(view);
        });

        if (this.views.length === 1) Object.assign(this, view);

        this.sync();
        return host;
    }

    sync() {
        const core = this.owner;
        if (!core) return;
        this.normalize();
        const creating = this._isCreateVisible();
        for (const view of this.views) {
        const currentField = this.fieldFor(view);
        for (const button of [view.fieldBtn, view.pickerBtn, view.directionBtn]) {
            if (button && button.disabled !== creating) button.disabled = creating;
        }
        view.host?.setAttribute("aria-label", creating
            ? "搜索排序（创建期间保留，返回搜索后可调整）" : view.context === "time" ? "时间依据与排序" : "结果排序");
        const def = SORT_FIELD_DEFS[currentField] || SORT_FIELD_DEFS.opened;
        const direction = normalizeSortDirection(core.sortDirection);
        const fieldLabel = def.label;
        if (view.pickerBtn) {
            const open = Boolean(core.dropdown.isOpenFor(view.pickerBtn));
            view.pickerBtn.setAttribute("aria-expanded", String(open));
            setSearchAttribute(view.pickerBtn, "aria-label", `排序与时间；当前：${fieldLabel}${core.filterState.dateRange ? `；${filterDateRangeDisplay(core.filterState.dateRange)}` : ""}`);
            view.pickerBtn.classList.toggle("has-time-filter", Boolean(core.filterState.dateRange));
            const iconName = view.pickerBtn === this.pickerBtn
                ? navigatorToolbarIcon(core, "sort", def.icon || "arrow-up-down")
                : def.icon || "arrow-up-down";
            if (view.pickerBtn.dataset.lsIcon !== iconName) {
                view.pickerBtn.replaceChildren();
                setIcon(view.pickerBtn, iconName);
                view.pickerBtn.dataset.lsIcon = iconName;
            }
        }
        if (view.fieldBtn) {
            if (view.fieldLabel?.textContent !== fieldLabel) view.fieldLabel.textContent = fieldLabel;
            const fields = this.allowedFields(view);
            const cursor = view.context === "time" ? currentField : this.ensureCycleCursor(fields);
            let targetField = cursor;
            if (cursor && currentField === cursor) {
                const cursorIndex = fields.indexOf(cursor);
                targetField = fields[(cursorIndex + 1) % fields.length];
            }
            const targetLabel = SORT_FIELD_DEFS[targetField]?.label || "排序";
            const action = cursor && currentField !== cursor
                ? `点击返回快捷排序：${targetLabel}`
                : `点击切换为${targetLabel}`;
            const label = `排序：${fieldLabel}；${action}`;
            setSearchAttribute(view.fieldBtn, "aria-label", label);
        }
        if (view.directionBtn) {
            const isDesc = direction === "desc";
            const iconName = isDesc ? "arrow-down" : "arrow-up";
            if (view.directionIcon?.dataset.lsIcon !== iconName) {
                view.directionIcon?.replaceChildren();
                if (view.directionIcon) {
                    setIcon(view.directionIcon, iconName);
                    view.directionIcon.dataset.lsIcon = iconName;
                }
            }
            const human = currentField === "relevance"
                ? (isDesc ? "最佳匹配优先" : "低匹配优先")
                : currentField === "opened"
                    ? (isDesc ? "最近打开优先" : "最久打开优先")
                    : currentField === "created"
                        ? (isDesc ? "最新创建优先" : "最早创建优先")
                        : currentField === "contentModified"
                            ? (isDesc ? "最近正文修改优先" : "最早正文修改优先")
                            : currentField === "fileModified"
                                ? (isDesc ? "最近文件修改优先" : "最早文件修改优先")
                                : (isDesc ? "Z → A" : "A → Z");
            const next = isDesc ? "升序" : "降序";
            const label = `${fieldLabel}：${human}；点击切换为${next}`;
            setSearchAttribute(view.directionBtn, "aria-label", label);
            view.directionBtn.setAttribute("aria-pressed", String(!isDesc));
        }
        }
    }
}
