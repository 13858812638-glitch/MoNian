// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { registerPickerCleanup } from "../../core/picker-cleanup.js";
import { propertyValueKey } from "../../data/properties/property-values.js";
import { metadataPropertySample, parseMetadataPropertyInput } from "../../data/properties/property-types.js";
import { NO_TAGS_FILTER_VALUE } from "../../data/tags/tag-values.js";
import { openSearchRenameDialog } from "../../ui/dialogs/dialog-session.js";
import { tagIdentityKey } from "../../data/tags/tag-values.js";
import { PointerSortCoordinator } from "../../interactions/PointerSortCoordinator.js";
import { createSearchButton, createSearchInput } from "../../ui/components/input-controls.js";
import { createDialogSession } from "../../ui/dialogs/dialog-session.js";
import { observePickerCountRail } from "../../ui/pickers/count-rail.js";
import { openFilterToolbarIconPicker } from "../../ui/pickers/icon-picker.js";
import { configureSharedPickerHeader, createPickerHeaderIconAction } from "../../ui/pickers/picker-header.js";
import { createPickerRowAction, createSharedPickerTreeRow } from "../../ui/pickers/tree-row.js";
import { sortByPreferredOrder } from "../../utils/preferred-order.js";
import { normalizeHexColor, normalizeResultFolderColors, resultFolderColorConfig } from "../folders/folder-colors.js";
import { setNavigatorIcon } from "./navigation-icon.js";
import { navigatorItemId, normalizeNavigatorCustomization, parseNavigatorItemId } from "./customization-model.js";
import { Notice } from "obsidian";


export class NavigatorCustomization {
    constructor(core, { scroll, onChanged = null } = {}) {
        this.core = core;
        this.scroll = scroll;
        this.onChanged = onChanged;
        this.sortMode = false;
        this.sortScope = null;
        this.maintenanceMode = null;
        this.rows = new Map();
        this.lists = new Map();
        this._writes = Promise.resolve();
        this._destroyed = false;
        this._contextMenu = event => {
            const row = event.target?.closest?.("[data-nav-id]");
            const descriptor = this.rows.get(row);
            if (!descriptor || !this.scroll.contains(row)) return;
            event.preventDefault(); event.stopPropagation();
            // iOS may dispatch native contextmenu BEFORE our chosen long-press
            // delay. Suppress that native menu without stealing the pending
            // pointer timer; the user-configured threshold remains authoritative.
            if (this._hold?.row === row) return;
            if (this._actionPanel?.isConnected && this._actionPanel.dataset.navItemId === descriptor.id) return;
            this._clearHold();
            this.openMenu(event, descriptor, row);
        };
        this.scroll.addEventListener("contextmenu", this._contextMenu);
        // Mobile long-press is Navigator-local: no Pointer capture, no native
        // scrolling/Picker focus ownership. Desktop right-click stays native.
        this._hold = null;
        this._suppressRowClick = null;
        this._clearHold = () => {
            const hold = this._hold;
            if (hold?.timer != null) this.scroll.ownerDocument.defaultView.clearTimeout(hold.timer);
            this._hold = null;
        };
        this._holdDown = event => {
            if (event.pointerType !== "touch" || event.button !== 0 || this.core?.navigator?.layout !== "mobile"
                || this.maintenanceMode || this._destroyed) return;
            if (event.target?.closest?.(".local-search-move-tree-toggle, .local-search-nav-sort-grip, .local-search-nav-maintenance-action, .local-search-nav-separator-remove")) return;
            const row = event.target?.closest?.("[data-nav-id]");
            if (!row || !this.scroll.contains(row) || !this.rows.has(row)) return;
            this._clearHold();
            const descriptor = this.rows.get(row);
            const win = this.scroll.ownerDocument.defaultView;
            const requested = Number(this.core?.plugin?.settings?.navigatorLongPressMs);
            const delay = Number.isFinite(requested) ? Math.max(180, Math.min(700, requested)) : 300;
            const hold = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, row, timer: null };
            hold.timer = win.setTimeout(() => {
                if (this._hold !== hold || !row.isConnected || this._destroyed) return;
                this._hold = null;
                this._suppressRowClick = { row, until: Date.now() + 900 };
                this.openMenu(null, descriptor, row);
            }, delay);
            this._hold = hold;
        };
        this._holdMove = event => {
            const hold = this._hold;
            if (hold?.pointerId === event.pointerId
                && (Math.abs(event.clientX - hold.x) > 8 || Math.abs(event.clientY - hold.y) > 8)) this._clearHold();
        };
        this._holdEnd = event => { if (this._hold?.pointerId === event.pointerId) this._clearHold(); };
        this._holdScroll = () => this._clearHold();
        this._holdClickGuard = event => {
            const current = this._suppressRowClick;
            if (!current) return;
            if (Date.now() > current.until || !current.row.isConnected) { this._suppressRowClick = null; return; }
            if (event.target?.closest?.("[data-nav-id]") !== current.row) return;
            this._suppressRowClick = null;
            event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        };
        this.scroll.addEventListener("pointerdown", this._holdDown, { passive: true });
        this.scroll.addEventListener("pointermove", this._holdMove, { passive: true });
        this.scroll.addEventListener("pointerup", this._holdEnd, { passive: true });
        this.scroll.addEventListener("pointercancel", this._holdEnd, { passive: true });
        this.scroll.addEventListener("scroll", this._holdScroll, { passive: true });
        this.scroll.addEventListener("click", this._holdClickGuard, true);
        this._actionAnchorClick = event => {
            const panel = this._actionPanel;
            if (!panel?.isConnected || !this.core?.dropdown?.isActivePanel(panel)) return;
            const row = event.target?.closest?.("[data-nav-id]");
            if (!row || row.dataset.navId !== panel.dataset.navItemId) return;
            // A native contextmenu can be followed by a click on its source
            // row. While the shared action Picker owns that row, the click
            // must not also select a scope or reopen the separator controls.
            event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        };
        this.scroll.addEventListener("click", this._actionAnchorClick, true);
        this._maintenanceClick = event => {
            const item = event.target?.closest?.(".local-search-move-tree-folder");
            const row = item?.closest?.("[data-nav-id]");
            const descriptor = this.rows.get(row);
            if (!descriptor || !this.scroll.contains(row) || (!this.sortMode && !this.maintenanceMode)) return;
            event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
            if (this._maintenanceDefinition(descriptor)) this._runMaintenance(descriptor, item);
            else {
                // A tool changes the row's purpose. Unsupported rows may still
                // disclose children, but never unexpectedly open results.
                const toggle = row.querySelector(":scope > .local-search-move-tree-toggle");
                if (toggle && !toggle.disabled) toggle.click();
            }
        };
        this.scroll.addEventListener("click", this._maintenanceClick, true);
        this.coordinator = new PointerSortCoordinator({
            list: scroll, scrollContainer: scroll,
            rowSelector: "[data-nav-id][data-sort-key]",
            hierarchical: true,
            getMeta: row => {
                const item = this.rows.get(row);
                const path = String(item?.key || "");
                const segments = path.split("/").filter(Boolean);
                const parentPath = segments.slice(0, -1).join("/");
                const grandparentPath = segments.slice(0, -2).join("/");
                return { key: item?.id || "", kind: item?.kind, name: item?.label,
                    itemKey: item?.key, value: item?.value,
                    depth: Number(row?.dataset.sortDepth || 0), parentKey: item?.parentId || "",
                    promoteParentKey: segments.length > 2
                        ? navigatorItemId(item.kind, grandparentPath)
                        : navigatorItemId("group", item?.kind === "folder" ? "folder" : "tags") };
            },
            canStart: (row, event) => Boolean(event.target?.closest?.(".local-search-nav-sort-grip")
                && this._canSort(this.rows.get(row))),
            canNest: (source, target) => this._canNest(source, target),
            canPromote: source => ["folder", "tag"].includes(source.kind)
                && String(source.itemKey || "").split("/").filter(Boolean).length > 1,
            onCommit: operation => this.commitSort({ ...operation, visibleBoundary: true }),
            onSettled: () => {
                if (!this._destroyed && !this.core?._destroyed) this.core?.navigator?.sync();
            }
        });
    }

    _canSort(item) {
        if (!this.sortMode || !item || item.sortable === false || item.protectedMetadata) return false;
        if (item.kind === "property-value" && this.sortScope === "property-value") return true;
        return item.kind === this.sortScope && item.kind !== "separator";
    }

    _canNest(source, target) {
        if (!source || !target || source.key === target.key) return false;
        const from = this.rowsForKey(source.key);
        const to = this.rowsForKey(target.key);
        if (!from || !to || to.protectedMetadata) return false;
        if (source.kind === "property-value") {
            return this.sortScope === "property-value" && to.kind === "property-key"
                && from.key !== to.key;
        }
        if (!["folder", "tag"].includes(source.kind) || source.kind !== target.kind
            || this.sortScope !== source.kind || !from.key || !to.key) return false;
        return !String(to.key).startsWith(String(from.key) + "/");
    }

    rowsForKey(id) {
        for (const [row, descriptor] of this.rows) if (row.isConnected && descriptor.id === id) return descriptor;
        return null;
    }

    _syncSortControls() {
        this.coordinator.setEnabled(this.sortMode);
        for (const [row, descriptor] of this.rows) {
            if (!row.isConnected) continue;
            const grip = row.querySelector(":scope > .local-search-nav-sort-grip");
            if (grip) {
                const shown = this._canSort(descriptor);
                grip.hidden = !shown;
                grip.tabIndex = shown ? 0 : -1;
            }
            const remove = row.querySelector(":scope > .local-search-nav-separator-remove");
            if (remove) { remove.hidden = !this.sortMode || this.sortScope !== "group";
                remove.tabIndex = remove.hidden ? -1 : 0; }
        }
    }

    get state() {
        const raw = this.core?.plugin?.settings?.navigatorCustomization;
        if (this._stateSource !== raw || !this._normalizedState) {
            this._stateSource = raw;
            this._normalizedState = normalizeNavigatorCustomization(raw);
        }
        return this._normalizedState;
    }

    _folderColors() {
        const raw = this.core?.plugin?.settings?.resultFolderColors;
        if (this._folderColorSource !== raw || !this._normalizedFolderColors) {
            this._folderColorSource = raw;
            this._normalizedFolderColors = normalizeResultFolderColors(raw);
        }
        return this._normalizedFolderColors;
    }

    descriptor(value, parentId = value?.parentId || "") {
        const kind = value.kind === "property" ? "property-key" : value.kind === "value" ? "property-value" : value.kind;
        const id = value.id || navigatorItemId(kind, value.key, value.value);
        const orderKey = value.orderKey ?? (kind === "property-value" ? propertyValueKey(value.value) : String(value.key ?? ""));
        return { ...value, id, kind, parentId, orderKey,
            sortable: kind === "time" ? false : value.sortable,
            label: String(value.label ?? value.name ?? value.key ?? "") };
    }

    beginRender() {
        // Unchanged cached sections keep their live descriptors. Prune detached
        // rows rather than discarding registrations for sections not rebuilt.
        for (const row of this.rows.keys()) if (!row.isConnected) this.rows.delete(row);
    }

    order(parentId, values) {
        const source = values.map(value => this.descriptor(value, parentId)).filter(value => value.id);
        let ordered = source;
        const settings = this.core.plugin.settings;
        const kind = source.find(value => value.sortable !== false)?.kind;
        const order = kind === "group" ? this.state.groupOrder
            : kind === "folder" ? settings.pickerFolderOrder
            : kind === "tag" ? settings.pickerTagOrder
            : kind === "property-key" ? settings.pickerPropertyOrder
            : kind === "property-value" ? settings.pickerPropertyValueOrder?.[source.find(value => value.kind === kind)?.key]
            : [];
        // Fixed virtual entries retain their original slots; they do not get
        // dragged into the order of real folders/tags/property values.
        const candidates = source.filter(value => value.sortable !== false);
        const groupRanks = new Map((order || []).map((id, index) => [id, index]));
        const tagRanks = new Map((order || []).map((id, index) => [tagIdentityKey(id), index]));
        const sortable = kind === "group"
            ? [...candidates].sort((a, b) => (groupRanks.get(a.id) ?? Infinity) - (groupRanks.get(b.id) ?? Infinity))
            : kind === "tag" ? [...candidates].sort((a, b) => {
                const rank = (tagRanks.get(tagIdentityKey(a.orderKey)) ?? Infinity) - (tagRanks.get(tagIdentityKey(b.orderKey)) ?? Infinity);
                return Number.isNaN(rank) || rank === 0
                    ? a.orderKey.localeCompare(b.orderKey, "zh-Hans-CN", { numeric: true }) : rank;
            })
            : sortByPreferredOrder(candidates, order || [], value => value.orderKey);
        let index = 0;
        ordered = source.map(value => value.sortable === false ? value : sortable[index++]);
        const separators = Object.entries(this.state.separators)
            .filter(([, config]) => config.parentId === parentId)
            .sort((a, b) => a[1].rank - b[1].rank || a[0].localeCompare(b[0]));
        const result = [];
        const addBefore = id => {
            for (const [separatorId, config] of separators) {
                if (config.beforeId === id) result.push({ id: separatorId, kind: "separator", parentId,
                    label: "分割线", icon: "minus", ...config });
            }
        };
        for (const value of ordered) { addBefore(value.id); result.push(value); }
        if (ordered.length) addBefore(null);
        this.lists.set(parentId, result);
        return result;
    }

    _inheritance(descriptor) {
        const ids = [descriptor.id];
        const { kind, key } = descriptor;
        if (kind === "property-value") ids.push(navigatorItemId("property-key", key));
        if (kind === "folder" || kind === "tag") {
            const parts = String(key).split("/").filter(Boolean);
            while (parts.length > 1) { parts.pop(); ids.push(navigatorItemId(kind, parts.join("/"))); }
        }
        const group = kind === "folder" ? "folder" : kind === "tag" ? "tags"
            : kind.startsWith("property-") ? "properties" : kind === "time" ? "time" : "";
        if (descriptor.groupId && parseNavigatorItemId(descriptor.groupId)?.kind === "group") ids.push(descriptor.groupId);
        else if (group) ids.push(navigatorItemId("group", group));
        return ids;
    }

    resolvedAppearance(descriptor) {
        const state = this.state;
        const own = state.appearance[descriptor.id] || {};
        const result = { icon: own.icon || descriptor.icon || "", color: { light: "", dark: "" }, background: { light: "", dark: "" } };
        for (const id of this._inheritance(descriptor)) {
            const parsed = parseNavigatorItemId(id);
            const style = state.appearance[id] || {};
            const foreground = parsed?.kind === "folder"
                ? this._folderColors()[parsed.key] || {} : style.color || {};
            for (const theme of ["light", "dark"]) {
                if (!result.color[theme] && foreground[theme]) result.color[theme] = foreground[theme];
                if (!result.background[theme] && style.background?.[theme]) result.background[theme] = style.background[theme];
            }
        }
        return result;
    }

    decorate(row, value) {
        const descriptor = this.descriptor(value);
        if (!row || !descriptor.id) return row;
        this.rows.set(row, descriptor);
        row.dataset.navId = descriptor.id;
        row.dataset.sortKey = descriptor.id;
        row.dataset.sortParent = descriptor.parentId;
        row.dataset.sortDepth = String(descriptor.depth ?? row.dataset.treeDepth ?? 0);
        row.dataset.sortName = descriptor.label || "分割线";
        row.classList.toggle("is-no-sort", descriptor.sortable === false);
        if (descriptor.kind !== "separator") {
            const appearance = this.resolvedAppearance(descriptor);
            const icon = row.querySelector(".local-search-move-tree-folder-icon");
            if (icon && appearance.icon && icon.dataset.navIcon !== appearance.icon) {
                setNavigatorIcon(icon, appearance.icon); icon.dataset.navIcon = appearance.icon;
            }
            for (const field of ["color", "background"]) for (const theme of ["light", "dark"]) {
                const color = appearance[field][theme];
                row.classList.toggle(`has-nav-${field}-${theme}`, Boolean(color));
                if (color) row.style.setProperty(`--ls-nav-item-${field}-${theme}`, color);
                else row.style.removeProperty(`--ls-nav-item-${field}-${theme}`);
            }
        }
        let grip = row.querySelector(":scope > .local-search-nav-sort-grip");
        if (!grip && descriptor.sortable !== false) {
            grip = createSearchButton(row, "chrome", { cls: "local-search-nav-sort-grip",
                attr: { "aria-label": `拖动排序 ${descriptor.label || "分割线"}`, title: "拖动排序；键盘 Alt + 上下箭头移动" } });
            setNavigatorIcon(grip, "grip-vertical");
            grip.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); });
            grip.addEventListener("keydown", event => {
                if (!this._canSort(this.rows.get(row)) || !event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
                const current = this.rows.get(row);
                const siblings = this.lists.get(current?.parentId) || [];
                const sourceIndex = siblings.findIndex(item => item.id === current?.id);
                const destination = sourceIndex + (event.key === "ArrowUp" ? -1 : 1);
                if (sourceIndex < 0 || destination < 0 || destination >= siblings.length) return;
                event.preventDefault(); event.stopPropagation();
                const beforeKey = event.key === "ArrowUp" ? siblings[destination].id : siblings[destination + 1]?.id || null;
                void this.commitSort({ key: current.id, meta: { parentKey: current.parentId }, mode: "reorder", beforeKey, parentKey: current.parentId })
                    .catch(error => new Notice(error?.message || "排序保存失败"));
            });
        }
        if (grip) { const shown = this._canSort(descriptor); grip.hidden = !shown; grip.tabIndex = shown ? 0 : -1; }
        this._decorateMaintenance(row, descriptor);
        return row;
    }

    _maintenanceDefinition(descriptor) {
        const mode = this.maintenanceMode;
        if (!mode || descriptor.protectedMetadata || descriptor.kind !== mode.kind) return null;
        if (!this.core?.facets?.canSidebarMaintenance?.(descriptor.kind, mode.id, this._maintenanceTarget(descriptor))) return null;
        return this.core?.facets?.sidebarMaintenanceModes?.(mode.kind)?.find(item => item.id === mode.id) || null;
    }

    _maintenanceTarget(descriptor) {
        const key = String(descriptor.key || "");
        const parts = key.split("/").filter(Boolean);
        return { ...descriptor, path: key, name: parts.at(-1) || key, parentPath: parts.slice(0, -1).join("/") };
    }

    _runMaintenance(descriptor, anchor) {
        const mode = this._maintenanceDefinition(descriptor);
        if (!mode || this._destroyed || this.core?._destroyed || this.core?._confirmSession) return;
        const target = this._maintenanceTarget(descriptor);
        if (this.core.facets.sidebarMaintenancePresentation?.(descriptor.kind, mode.id, target)?.disabled) return;
        // Keep dialog/input creation on the trusted row gesture. Defer only
        // asynchronous error reporting, never the native focus handoff.
        try {
            Promise.resolve(this.core.facets.runSidebarMaintenance(descriptor.kind, mode.id, target, anchor, {
                onChange: detail => this.core?.navigator?._refreshAfterMaintenance(descriptor.kind, detail)
            })).catch(error => { if (!this._destroyed) new Notice(error?.message || "操作失败，请重试"); });
        } catch (error) { if (!this._destroyed) new Notice(error?.message || "操作失败，请重试"); }
    }

    _decorateMaintenance(row, descriptor) {
        const definition = this._maintenanceDefinition(descriptor);
        let action = row.querySelector(":scope > .local-search-nav-maintenance-action");
        const signature = definition ? `${descriptor.kind}:${definition.id}` : "";
        if (action && action.dataset.navMaintenance !== signature) { action.remove(); action = null; }
        if (!definition) return;
        const presentation = this.core.facets.sidebarMaintenancePresentation?.(descriptor.kind, definition.id, this._maintenanceTarget(descriptor))
            || { icon: definition.icon, label: `${definition.title} · ${descriptor.label}`, danger: definition.danger };
        if (!action) {
            action = createPickerRowAction(row, { ...presentation,
                onClick: button => this._runMaintenance(this.rows.get(row) || descriptor, button) });
            action.addClass("local-search-nav-maintenance-action");
            action.dataset.navMaintenance = signature;
        }
        setNavigatorIcon(action, presentation.icon);
        action.setAttribute("aria-label", presentation.label);
        action.title = presentation.label;
        action.disabled = Boolean(presentation.disabled);
        if (typeof presentation.pressed === "boolean") action.setAttribute("aria-pressed", String(presentation.pressed));
        else action.removeAttribute("aria-pressed");
    }

    setMaintenanceMode(kind = "", id = "") {
        const prior = this.maintenanceMode;
        const valid = this.core?.facets?.sidebarMaintenanceModes?.(kind)?.some(item => item.id === id);
        this.maintenanceMode = valid ? { kind, id } : null;
        if (this.maintenanceMode) this.setSortMode(false);
        for (const [row, descriptor] of this.rows) if (row.isConnected) this._decorateMaintenance(row, descriptor);
        this.onChanged?.({ modeOnly: true, projection: prior?.id === "exclude" || id === "exclude" });
    }

    renderSeparator(parent, descriptor, depth = 0) {
        const tree = createSharedPickerTreeRow(parent, { depth,
            rowClasses: "local-search-nav-row local-search-nav-separator", name: "", icon: "minus",
            onClick: () => this.openMenu(null, this.rows.get(tree.row) || descriptor, tree.row) });
        tree.button.replaceChildren();
        tree.button.setAttribute("aria-label", "管理分割线");
        tree.button.createSpan({ cls: "local-search-nav-separator-label", text: "分割线", attr: { "aria-hidden": "true" } });
        tree.button.createSpan({ cls: "local-search-nav-separator-line", attr: { "aria-hidden": "true" } });
        tree.row.setAttribute("role", "group");
        tree.row.setAttribute("aria-label", "自定义分割线");
        tree.row.style.setProperty("--ls-nav-separator-space", `${descriptor.space || 12}px`);
        const separatorStyle = ["solid", "dashed", "dotted"].includes(descriptor.style) ? descriptor.style : "solid";
        tree.row.dataset.navSeparatorStyle = separatorStyle;
        tree.row.style.setProperty("--ls-nav-separator-style", separatorStyle);
        for (const theme of ["light", "dark"]) {
            const value = normalizeHexColor(descriptor.color?.[theme]);
            tree.row.classList.toggle(`has-nav-separator-color-${theme}`, Boolean(value));
            if (value) tree.row.style.setProperty(`--ls-nav-separator-color-${theme}`, value);
        }
        this.decorate(tree.row, { ...descriptor, depth });
        const remove = createPickerRowAction(tree.row, { icon: "trash-2", label: "删除分割线", danger: true,
            onClick: button => this._run(async () => {
                if (button.disabled) return;
                button.disabled = true;
                try { await this.removeSeparator(descriptor.id); }
                finally { if (button.isConnected) button.disabled = false; }
            }) });
        remove.addClass("local-search-nav-separator-remove");
        remove.hidden = !this.sortMode || this.sortScope !== "group";
        remove.tabIndex = remove.hidden ? -1 : 0;
        return tree;
    }

    finishRender() {
        for (const row of this.rows.keys()) if (!row.isConnected) this.rows.delete(row);
        // Desktop rows are decorated when created/changed; setSortMode owns
        // updates to retained grips. Do not restamp the whole tree per branch.
        if (!this.core?.navigator?.desktopSidebar) this._syncSortControls();
    }

    setSortMode(value, scope = null) {
        const priorMaintenance = this.maintenanceMode;
        const previousDesktopValueDrag = this.sortMode && this.sortScope === "property-value";
        const requested = typeof scope === "string" ? scope : this.sortScope;
        const allowed = new Set(["group", "folder", "tag", "property-key", "property-value"]);
        this.sortMode = Boolean(value) && allowed.has(requested);
        this.sortScope = this.sortMode ? requested : null;
        if (this.sortMode && this.maintenanceMode) {
            this.maintenanceMode = null;
            for (const [row, descriptor] of this.rows) if (row.isConnected) this._decorateMaintenance(row, descriptor);
        }
        this._syncSortControls();
        this.onChanged?.({ modeOnly: true, projection: this.sortMode && priorMaintenance?.id === "exclude" });
        // Desktop ordinarily opens a property Picker on click. Only the
        // explicit property-value drag mode owns nested Navigator value rows.
        const nowDesktopValueDrag = this.sortMode && this.sortScope === "property-value";
        if (previousDesktopValueDrag !== nowDesktopValueDrag && this.core?.navigator?.layout !== "mobile")
            this.core?.navigator?.refreshPreferences?.();
    }

    _notify() {
        if (this._destroyed) return;
        this.onChanged?.();
        // Refresh live presentation consumers without advancing result indexes.
        this.core.plugin._forEachActiveSearchCore?.(other => {
            if (other === this.core || !other.navigator) return;
            other.navigator.renderRevision = -1;
            for (const ref of other.navigator.sections?.values?.() || []) ref.signature = "";
            other.navigator._projectionCache?.clear();
            other.navigator.sync();
        });
    }

    _write(change) {
        const run = async () => {
            if (this._destroyed || this.core?._destroyed) return false;
            const plugin = this.core.plugin;
            const keys = ["navigatorCustomization", "resultFolderColors", "pickerFolderOrder", "pickerTagOrder", "pickerPropertyOrder", "pickerPropertyValueOrder"];
            const prior = Object.fromEntries(keys.map(key => [key, plugin.settings[key]]));
            const next = normalizeNavigatorCustomization(this.state);
            let written = null;
            try {
                await change(next, plugin);
                plugin.settings.navigatorCustomization = normalizeNavigatorCustomization(next);
                written = Object.fromEntries(keys.map(key => [key, JSON.stringify(plugin.settings[key])]));
                if (await plugin.saveSettings() === false) throw new Error("设置未能写入，请重试");
            } catch (error) {
                // saveSettings normalizes/replaces object identities. Compare the
                // actual values so a rejected write still restores the UI.
                for (const key of keys) if (!written || JSON.stringify(plugin.settings[key]) === written[key]) plugin.settings[key] = prior[key];
                plugin._refreshPickerOrderConsumers?.("property-key");
                plugin._refreshActiveResultCards?.();
                this._notify(); throw error;
            }
            this._notify(); return true;
        };
        const queue = this.core?.plugin?._navigatorCustomizationWrites || this._writes;
        const promise = queue.then(run, run);
        this._writes = promise.catch(() => {});
        if (this.core?.plugin) this.core.plugin._navigatorCustomizationWrites = this._writes;
        return promise;
    }

    setAppearance(id, patch) {
        const parsed = parseNavigatorItemId(id);
        if (!parsed || parsed.kind === "separator") return Promise.resolve(false);
        return this._write((state, plugin) => {
            const entry = { ...(state.appearance[id] || {}) };
            for (const field of ["icon", "color", "background"]) {
                if (!(field in patch)) continue;
                if (field === "color" && parsed.kind === "folder") {
                    const colors = normalizeResultFolderColors(plugin.settings.resultFolderColors);
                    if (patch.color?.light || patch.color?.dark) colors[parsed.key] = patch.color;
                    else delete colors[parsed.key];
                    plugin.settings.resultFolderColors = normalizeResultFolderColors(colors);
                    plugin._refreshActiveResultCards?.();
                } else entry[field] = patch[field];
            }
            state.appearance[id] = entry;
        });
    }

    addSeparator(value, placement = "after") {
        const descriptor = this.descriptor(value);
        const siblings = this.lists.get(descriptor.parentId) || [];
        const index = siblings.findIndex(item => item.id === descriptor.id);
        const next = placement === "before" ? descriptor.id
            : siblings.slice(index + 1).find(item => item.kind !== "separator")?.id || null;
        return this._write(state => {
            if (Object.keys(state.separators).length >= 300) throw new Error("分割线最多 300 条，请先移除不需要的分割线");
            const token = this.scroll.ownerDocument.defaultView.crypto?.randomUUID?.()
                || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
            const id = navigatorItemId("separator", token);
            const rank = Math.max(0, ...Object.values(state.separators).map(item => item.rank)) + 1;
            state.separators[id] = { parentId: descriptor.parentId, beforeId: next, rank,
                style: "solid", color: { light: "", dark: "" }, space: 12 };
        });
    }

    updateSeparator(id, patch) {
        return this._write(state => {
            if (state.separators[id]) state.separators[id] = { ...state.separators[id], ...patch };
        });
    }

    removeSeparator(id) { return this._write(state => { delete state.separators[id]; }); }

    async commitSort({ key, meta = {}, mode = "reorder", beforeKey = null, parentKey = meta.parentKey || "", visibleBoundary = false }) {
        if (this._destroyed || !this.sortMode) return false;
        const sourceItem = this.rowsForKey(key);
        if (!sourceItem || !this._canSort(sourceItem)) return false;
        if (mode === "nest" || mode === "promote") {
            const targetItem = mode === "nest" ? this.rowsForKey(parentKey) : null;
            const sourceKind = sourceItem.kind;
            if (mode === "nest" && !this._canNest(meta, { key: parentKey, kind: targetItem?.kind })) return false;
            if (mode === "promote" && (!["folder", "tag"].includes(sourceKind)
                || String(sourceItem.key).split("/").filter(Boolean).length < 2)) return false;
            const sourcePath = String(sourceItem.key || "");
            const parts = sourcePath.split("/").filter(Boolean);
            const targetPath = mode === "promote" ? parts.slice(0, -2).join("/") : String(targetItem?.key || "");
            const plugin = this.core.plugin;
            let detail;
            if (sourceKind === "folder") {
                if (sourceItem.protectedMetadata || targetItem?.protectedMetadata) return false;
                const newPath = await plugin.moveFolderTreeNode(sourcePath, targetPath);
                detail = { oldPath: sourcePath, newPath };
            } else if (sourceKind === "tag") {
                if (sourcePath === NO_TAGS_FILTER_VALUE || targetPath === NO_TAGS_FILTER_VALUE) return false;
                const newPath = targetPath ? `${targetPath}/${parts.at(-1)}` : parts.at(-1);
                if (tagIdentityKey(newPath) === tagIdentityKey(sourcePath)) return false;
                await plugin.migrateVaultTagTreePrefix(sourcePath, newPath);
                detail = { oldPath: sourcePath, newPath };
            } else if (sourceKind === "property-value" && mode === "nest" && targetItem?.kind === "property-key") {
                if (plugin.isVirtualPropertyKey(sourceItem.key) || plugin.isVirtualPropertyKey(targetItem.key)) return false;
                const changed = await plugin.moveVaultPropertyValueToKey(sourceItem.key, sourceItem.value, targetItem.key);
                if (!changed) return false;
                detail = { oldKey: sourceItem.key, newKey: targetItem.key, value: sourceItem.value };
            } else return false;
            this.core.navigator?._refreshAfterMaintenance?.(sourceKind, detail);
            return true;
        }
        if (mode !== "reorder") return false;
        const current = this.lists.get(parentKey) || [];
        const source = current.find(item => item.id === key);
        if (!source || source.sortable === false || (beforeKey && !current.some(item => item.id === beforeKey))) return false;
        if (visibleBoundary && !beforeKey) {
            const visible = this.coordinator._rows().filter(row => row.dataset.sortParent === parentKey && row.dataset.sortKey !== key);
            const last = visible[visible.length - 1]?.dataset.sortKey;
            const lastIndex = current.findIndex(item => item.id === last);
            // An abbreviated tree is still a projection of all siblings. A
            // drop below its last displayed row means just below that row,
            // never an invisible jump behind hundreds of unmounted siblings.
            if (lastIndex >= 0) beforeKey = current.slice(lastIndex + 1).find(item => item.id !== key)?.id || null;
        }
        const reordered = current.filter(item => item.id !== key);
        const targetIndex = beforeKey ? reordered.findIndex(item => item.id === beforeKey) : reordered.length;
        reordered.splice(Math.max(0, targetIndex), 0, source);
        if (JSON.stringify(current.map(item => item.id)) === JSON.stringify(reordered.map(item => item.id))) return false;
        return this._write(async (state, plugin) => {
            const real = reordered.filter(item => item.kind !== "separator" && item.sortable !== false);
            if (source.kind === "group") {
                const changed = real.map(item => item.id);
                state.groupOrder = [...changed, ...state.groupOrder.filter(id => !changed.includes(id))];
            } else if (["folder", "tag", "property-key", "property-value"].includes(source.kind)) {
                const sourceIndex = real.findIndex(item => item.id === source.id);
                const before = real[sourceIndex + 1]?.orderKey || null;
                await plugin.setPickerSiblingOrder(source.kind, real.map(item => item.orderKey), source.orderKey, before,
                    source.kind === "property-value" ? source.key : "", { persist: false });
            }
            for (let index = 0; index < reordered.length; index++) {
                const descriptor = reordered[index];
                if (descriptor.kind !== "separator" || !state.separators[descriptor.id]) continue;
                state.separators[descriptor.id].beforeId = reordered.slice(index + 1).find(item => item.kind !== "separator")?.id || null;
                state.separators[descriptor.id].rank = index;
            }
        });
    }

    _run(action) {
        Promise.resolve().then(action).catch(error => { if (!this._destroyed) new Notice(error?.message || "导航设置保存失败"); });
    }

    openMenu(event, value, row) {
        const core = this.core;
        if (this._destroyed || !core || core._destroyed || this.coordinator.session || core._confirmSession) return null;
        const descriptor = this.descriptor(value);
        const anchor = row?.querySelector(".local-search-move-tree-folder") || row;
        if (!anchor?.isConnected) return null;
        event?.preventDefault?.();
        event?.stopPropagation?.();
        const panel = core.dropdown.open(anchor, descriptor.kind === "separator" ? "分割线设置" : `${descriptor.label || "导航"} · 设置`);
        if (!panel) return null;
        panel.addClass("local-search-picker-dropdown", "local-search-nav-actions-picker");
        panel.dataset.lsDropdownSize = "navigator-actions";
        panel.dataset.navItemId = descriptor.id;
        this._actionPanel = panel;
        registerPickerCleanup(panel, () => { if (this._actionPanel === panel) this._actionPanel = null; });
        const header = configureSharedPickerHeader(panel, {
            headingText: descriptor.kind === "separator" ? "分割线设置" : descriptor.label || "导航设置",
            icon: descriptor.kind === "separator" ? "separator-horizontal" : this.resolvedAppearance(descriptor).icon || "sliders-horizontal"
        });
        createPickerHeaderIconAction(header.actions, { icon: "x", label: "关闭导航设置",
            onClick: () => core.dropdown.close(false) });
        const list = panel.createDiv({ cls: "local-search-move-tree" });
        const group = label => {
            const section = list.createDiv({ cls: "local-search-nav-action-group" });
            section.createDiv({ cls: "local-search-nav-action-group-label", text: label });
            return section;
        };
        let targetGroup = group("当前对象");
        const add = (id, title, icon, action, { active = false, danger = false } = {}) => {
            const item = createSharedPickerTreeRow(targetGroup, { name: title, icon, active,
                rowClasses: danger ? "is-danger-action" : "", onClick: () => {
                    if (!core.dropdown.isActivePanel(panel)) return;
                    // Capture the navigation position before the shared Picker
                    // closes: focus restoration must not become our scroll anchor.
                    const navScrollBeforeDismiss = core.navigator?.scroll?.scrollTop;
                    // All actions leave through the shared dismissal owner.
                    // Close before a write replaces its original navigation row
                    // or a subsequent shared Picker/Dialog takes ownership.
                    if (core.dropdown.close(false, { returnToParent: false }) === false) return;
                    // Dialogs must be opened synchronously from the trusted
                    // click, preserving iOS native input focus/caret ownership.
                    try { Promise.resolve(action(navScrollBeforeDismiss)).catch(error => {
                        if (!this._destroyed) new Notice(error?.message || "操作失败，请重试");
                    }); } catch (error) { if (!this._destroyed) new Notice(error?.message || "操作失败，请重试"); }
                } });
            item.button.dataset.navAction = id;
            return item;
        };
        if (core.navigator?.desktopSidebar && descriptor.kind === "group"
            && ["folder", "tags", "properties"].includes(descriptor.key)) {
            add("manage-group", `选择和管理${descriptor.label}`, "list-filter",
                () => core.navigator.openSection(descriptor.key, anchor));
        }
        if (descriptor.kind !== "separator") {
            const target = { ...this._maintenanceTarget(descriptor), mergeExisting: true };
            const facets = core.facets;
            const modes = facets?.sidebarMaintenanceModes?.(descriptor.kind) || [];
            const run = mode => facets?.runSidebarMaintenance?.(descriptor.kind, mode, target, anchor, {
                onChange: detail => core?.navigator?._refreshAfterMaintenance?.(descriptor.kind, detail)
            });
            const renderMode = id => {
                const mode = modes.find(item => item.id === id);
                if (!mode || !facets?.canSidebarMaintenance?.(descriptor.kind, id, target)) return;
                const presentation = facets.sidebarMaintenancePresentation?.(descriptor.kind, id, target);
                if (presentation?.disabled) return;
                // The existing facet maintenance owner owns all real writes,
                // validation, settings propagation and error surfaces.
                const label = id === "pin" ? (presentation?.pressed ? "取消固定属性" : "固定属性到右侧")
                    : id === "exclude" ? (presentation?.pressed ? "恢复属性显示" : "隐藏属性")
                    : id === "result" ? (presentation?.pressed ? "在结果卡显示属性" : "从结果卡隐藏属性")
                    : id === "result-exclude" ? (presentation?.pressed ? "恢复文件夹结果显示" : "从结果中隐藏文件夹")
                    : mode.title;
                add(`item-${id}`, label,
                    presentation?.icon || mode.icon, scrollBeforeDismiss => {
                        if (id !== "rename" || !core.navigator) return run(id);
                        const snapshot = { scrollTop: scrollBeforeDismiss ?? core.navigator.scroll.scrollTop };
                        core.navigator._maintenanceScrollSnapshot = snapshot;
                        const session = run(id);
                        // A cancelled/unchanged rename must not leave a stale
                        // scroll position to be applied to an unrelated action.
                        if (session?.finished) void session.finished.finally(() => {
                            if (core.navigator?._maintenanceScrollSnapshot === snapshot)
                                core.navigator._maintenanceScrollSnapshot = null;
                        });
                        else if (core.navigator?._maintenanceScrollSnapshot === snapshot)
                            core.navigator._maintenanceScrollSnapshot = null;
                        return session;
                    },
                    { active: presentation?.pressed === true, danger: mode.danger });
            };
            renderMode("rename");
            if (descriptor.kind === "folder") {
                const isRoot = descriptor.key === "/";
                add(isRoot ? "create-root-folder" : "create-child-folder",
                    isRoot ? "新建文件夹" : "新建子文件夹", "folder-plus", () => facets.openFolderCreateDialog({
                        parentPath: isRoot ? "" : descriptor.key,
                        onCreated: () => core?.navigator?.refreshPreferences?.()
                    }));
            }
            if (descriptor.kind === "tag" && descriptor.key !== NO_TAGS_FILTER_VALUE) {
                const parts = String(descriptor.key).split("/").filter(Boolean);
                const parentPath = parts.slice(0, -1).join("/");
                add("create-sibling-tag", "新建同级标签", "tag", () => this.openTagCreator(parentPath, anchor));
                add("create-child-tag", "新建子标签", "tags", () => this.openTagCreator(descriptor.key, anchor));
            }
            if (descriptor.kind === "property-key") {
                add("create-property-value", "新建属性值", "plus", () => this.openPropertyValueCreator(descriptor.key));
                const movingValues = this.sortMode && this.sortScope === "property-value";
                add("sort-property-values", movingValues ? "完成属性值迁移" : "移动该键的属性值",
                    movingValues ? "check" : "grip-vertical", () => {
                        if (!movingValues) core.navigator?.expanded?.add(`properties:${descriptor.key}`);
                        this.setSortMode(!movingValues, "property-value");
                    });
                for (const id of ["pin", "exclude", "result"]) renderMode(id);
            }
            if (descriptor.kind === "folder") renderMode("result-exclude");
            renderMode("delete");
            targetGroup = group("外观与导航");
        }
        if (descriptor.kind === "separator") {
            const current = this.state.separators[descriptor.id];
            if (!current) { core.dropdown.close(false); return null; }
            for (const [style, title] of [["solid", "实线"], ["dashed", "虚线"], ["dotted", "点线"]])
                add(`separator-style-${style}`, title, "minus", () => this.updateSeparator(descriptor.id, { style }), { active: current.style === style });
            for (const [space, title] of [[8, "紧凑间距"], [12, "标准间距"], [20, "宽松间距"]])
                add(`separator-space-${space}`, title, "space", () => this.updateSeparator(descriptor.id, { space }), { active: current.space === space });
            add("separator-color", "更改分割线颜色", "palette", () => this.openColorEditor(descriptor, "separator"));
            add("separator-remove", "删除分割线", "trash-2", () => this.removeSeparator(descriptor.id), { danger: true });
        } else {
            add("icon", "更改图标", "image", () => {
                const current = this.resolvedAppearance(descriptor);
                openFilterToolbarIconPicker(core, { anchor, propertyKey: descriptor.label || "导航",
                    currentIcon: current.icon, defaultIcon: descriptor.icon || "list", preserveAnchor: true,
                    heading: `图标 · ${descriptor.label || "导航"}`,
                    onSelect: icon => this.setAppearance(descriptor.id, { icon: icon === descriptor.icon ? "" : icon }) });
            });
            add("color", "更改颜色", "palette", () => this.openColorEditor(descriptor, "color"));
            add("background", "更改背景", "paint-bucket", () => this.openColorEditor(descriptor, "background"));
            add("appearance-reset", "恢复默认外观", "rotate-ccw", () => this.setAppearance(descriptor.id, { icon: "", color: {}, background: {} }));
            add("separator-before", "在上方添加分割线", "separator-horizontal", () => this.addSeparator(descriptor, "before"));
            add("separator-after", "在下方添加分割线", "separator-horizontal", () => this.addSeparator(descriptor, "after"));
        }
        if (!targetGroup.querySelector(".local-search-move-tree-row")) targetGroup.remove();
        targetGroup = group("排列");
        if (["group", "folder", "tag", "property-key", "property-value"].includes(descriptor.kind)) {
            const ownScopeActive = this.sortMode && this.sortScope === descriptor.kind;
            add("sort-navigation", ownScopeActive ? "完成当前类别拖拽" : "调整当前类别导航顺序",
                ownScopeActive ? "check" : "grip-vertical",
                () => this.setSortMode(!ownScopeActive, descriptor.kind));
        }
        registerPickerCleanup(panel, observePickerCountRail(panel, list, "--ls-picker-scrollbar-reserve"));
        return panel;
    }

    openTagCreator(parentPath, anchor) {
        const core = this.core;
        if (!core || core._destroyed) return null;
        // Tags only exist on actual files in Obsidian: do not invent a second
        // global tag catalog or silently modify unrelated vault files.
        const selected = [...(core.selection?.selectedPaths || [])];
        const active = core.app.workspace?.getActiveFile?.();
        const paths = selected.length ? selected : active ? [active.path] : [];
        if (!paths.length) {
            new Notice("请先打开或选择需要添加标签的文件，再新建同级或子级标签");
            return null;
        }
        return core.batchMetadata?.open(anchor, {
            initialAction: "tag", paths, initialTagParentPath: parentPath
        });
    }

    openPropertyValueCreator(key) {
        const core = this.core;
        if (!core || core._destroyed || core.plugin.isVirtualPropertyKey(key)) return null;
        const type = core.plugin.propertyCatalogType(key,
            metadataPropertySample(core.plugin.fileMetaCache.values(), key));
        return openSearchRenameDialog(core, {
            kind: "create-property-value", title: `新建属性值 · ${key}`,
            message: `属性键：${key}（${type === "multitext" ? "列表" : type === "text" ? "文本" : type}）`,
            fieldLabel: "属性值", placeholder: "输入新属性值", confirmText: "创建",
            errorText: "创建属性值失败",
            onSubmit: async raw => {
                const value = parseMetadataPropertyInput(raw, type);
                await core.plugin.addPropertyCatalogValues([{
                    key, propertyType: type, addValues: [value]
                }]);
                if (!core._destroyed) core.navigator?.refreshPreferences?.();
                new Notice(`已创建属性值：${key} / ${value}`);
                return true;
            }
        });
    }

    openColorEditor(descriptor, field) {
        const core = this.core;
        if (!core || core._destroyed) return;
        const title = `${field === "background" ? "背景" : field === "separator" ? "分割线颜色" : "颜色"} · ${descriptor.label || "导航"}`;
        const session = createDialogSession(core, { backdropClass: "local-search-picker-dialog-backdrop", kind: "navigator-appearance" });
        if (!session) return;
        const panel = session.setDialog(session.host.createDiv({
            cls: "local-search-confirm-dialog local-search-picker-dialog local-search-picker-dropdown local-search-folder-color-editor-picker local-search-dialog-surface",
            attr: { role: "dialog", "aria-modal": "true", "aria-label": title }
        }));
        panel.createDiv({ cls: "local-search-dropdown-title" });
        panel.addEventListener("pointerdown", event => event.stopPropagation());
        panel.addEventListener("click", event => event.stopPropagation());
        const header = configureSharedPickerHeader(panel, { headingText: title, icon: field === "background" ? "paint-bucket" : "palette" });
        const own = () => field === "separator" ? this.state.separators[descriptor.id]?.color || {}
            : field === "color" && descriptor.kind === "folder" ? resultFolderColorConfig(core.plugin.settings, descriptor.key) || {}
            : this.state.appearance[descriptor.id]?.[field] || {};
        const update = colors => field === "separator" ? this.updateSeparator(descriptor.id, { color: colors })
            : this.setAppearance(descriptor.id, { [field]: colors });
        const reset = createPickerHeaderIconAction(header?.actions, { icon: "rotate-ccw", label: "恢复默认",
            onClick: () => this._run(async () => { await update({}); if (!session.settled) render(); }) });
        const close = createPickerHeaderIconAction(header?.actions, { icon: "x", label: "关闭调色", onClick: () => session.finish(false) });
        const body = panel.createDiv({ cls: "local-search-folder-color-editor" });
        const render = () => {
            body.replaceChildren();
            const current = own();
            if (reset) reset.disabled = !current.light && !current.dark;
            for (const [theme, label] of [["light", "浅色模式"], ["dark", "深色模式"]]) {
                const inherited = field === "separator" ? "" : this.resolvedAppearance(descriptor)[field]?.[theme];
                const fallback = field === "background" ? theme === "light" ? "#E7EFED" : "#30413D"
                    : theme === "light" ? "#42796E" : "#9BBFB4";
                const shown = current[theme] || inherited || fallback;
                const row = body.createDiv({ cls: "local-search-folder-color-editor-row" });
                const copy = row.createDiv({ cls: "local-search-folder-color-editor-copy" });
                copy.createDiv({ cls: "local-search-folder-color-editor-label", text: label });
                const value = copy.createDiv({ cls: "local-search-folder-color-editor-value", text: current[theme] || "跟随默认" });
                const control = row.createEl("label", { cls: "local-search-folder-color-editor-control" });
                control.style.setProperty("--ls-folder-color-swatch", shown);
                control.createSpan({ cls: "local-search-folder-color-editor-swatch", attr: { "aria-hidden": "true" } });
                const input = createSearchInput(control, { type: "color", cls: "local-search-folder-color-editor-input",
                    attr: { "aria-label": `${title} · ${label}`, value: shown } });
                input.value = shown;
                const preview = () => {
                    const color = normalizeHexColor(input.value);
                    if (color) { value.textContent = color; control.style.setProperty("--ls-folder-color-swatch", color); }
                    return color;
                };
                input.addEventListener("input", preview);
                // Preserve the exact native iOS color input while it owns focus.
                input.addEventListener("change", () => {
                    const color = preview();
                    if (!color) return;
                    this._run(async () => { await update({ ...own(), [theme]: color }); if (!session.settled && reset) reset.disabled = false; });
                });
            }
        };
        render(); close?.focus({ preventScroll: true });
    }

    destroy() {
        this._destroyed = true;
        this.coordinator.destroy();
        this._clearHold();
        this._suppressRowClick = null;
        for (const [type, fn] of [["pointerdown", this._holdDown], ["pointermove", this._holdMove],
            ["pointerup", this._holdEnd], ["pointercancel", this._holdEnd], ["scroll", this._holdScroll]])
            this.scroll.removeEventListener(type, fn);
        this.scroll.removeEventListener("click", this._holdClickGuard, true);
        this.scroll.removeEventListener("contextmenu", this._contextMenu);
        this.scroll.removeEventListener("click", this._actionAnchorClick, true);
        this.scroll.removeEventListener("click", this._maintenanceClick, true);
        this._actionPanel = null;
        this.rows.clear(); this.lists.clear();
        this.core = null;
    }
}
