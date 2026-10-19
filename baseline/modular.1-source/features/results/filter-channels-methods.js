// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { collectPropertyKeys } from "../../data/properties/property-catalog.js";
import { setIndicatorLabel } from "../../ui/components/indicator-label.js";
import { bindInputFocusGuard, createSearchButton } from "../../ui/components/input-controls.js";
import { sortByPreferredOrder } from "../../utils/preferred-order.js";
import { normalizePropertyPoolEntries } from "../filters/pool-config.js";
import { filterPoolLabel, filterPoolValueKey, filterPoolValueVisible, propertyPoolKeyVisible } from "../filters/pool-values.js";
import { setIcon } from "obsidian";
// Instance method owner. `this` is the unchanged SearchResultRendererController instance. No additional state store.
export const SearchResultRendererController_filter_channels_methods = {


    _renderFilterPoolHeader() {
        const core = this.owner;
        const host = core?.filterPoolHost;
        const values = core?.filterPoolValues;
        const shortcuts = core?.filterPoolShortcuts;
        if (!host?.isConnected || !values?.isConnected || !shortcuts?.isConnected) return;
        // CreateDraft's own metadata form is the destination authority. Search
        // pool candidates can name another folder and must not look like a second
        // creation destination. Keep the configured pool intact for search exit.
        if (core.createFlow?.isCreateView?.()) {
            host.hidden = true;
            host.setAttribute("aria-hidden", "true");
            return;
        }

        const valuesLeft = values.scrollLeft;
        const shortcutsLeft = shortcuts.scrollLeft;
        const poolSettings = core.resultControls.filterPools();
        // Catalog 与结果共用同一个有界缓存；命中时不再等待整库标签/目录统计。
        const catalog = core.resultControls._filterPoolHeaderCatalog(poolSettings);
        const visibleGroups = this._syncFilterPoolGroups(values, [], poolSettings, catalog);
        const shortcutCounts = this._syncFilterToolbarEntries(values, shortcuts, [], poolSettings);

        values.hidden = visibleGroups + shortcutCounts.left === 0;
        shortcuts.hidden = shortcutCounts.right === 0;
        host.hidden = values.hidden && shortcuts.hidden;
        host.setAttribute("aria-hidden", String(host.hidden));

        if (values.scrollLeft !== valuesLeft) values.scrollLeft = valuesLeft;
        if (shortcuts.scrollLeft !== shortcutsLeft) shortcuts.scrollLeft = shortcutsLeft;
    },


    refreshResultChannels() {
        const core = this.owner;
        if (!core || core._destroyed) return;
        this._renderStateChannels(!core.createFlow?.isCreateView?.());
    },


    _renderStateChannels(visible = true) {
        const core = this.owner;
        const host = core.resultChannelHost;
        if (!host) return;
        host.empty();
        if (visible) this._appendChannelGroup(host);
        core._syncResultStateRow?.();
    },


    _appendChannelGroup(target) {
        const core = this.owner;
        if (!target) return false;

        const channelActive = Boolean(
            core.queryState.raw.trim()
            && this._usesChannels()
        );
        if (!channelActive) return false;

        const bodyCount = core.bodyResultCount || 0;
        const bestCount = core.bestResultCount || 0;
        if (bestCount <= 0 && bodyCount <= 0) return false;

        const channelGroup = target.createSpan({
            cls: "local-search-result-channel-group"
        });

        if (bestCount > 0) {
            const bestToggle = createSearchButton(channelGroup, "choice", {
                cls: `local-search-result-channel${!core.bodyExpanded ? " is-selected" : ""}`,
                attr: {
                    "aria-pressed": String(!core.bodyExpanded),
                    "aria-label": `查看标题匹配 ${bestCount} 个结果`
                }
            });
            setIndicatorLabel(bestToggle, `标题 · ${bestCount}`);
            bestToggle.addEventListener("click", () => {
                if (!core.bodyExpanded) return;
                if (core.selection.selectedPaths.size) core.selection.clearState();
                core.bodyExpanded = false;
                this.resetViewport();
                this.refreshResultChannels();
                this.renderPage();
                core._notifyStateChange();
            });
        }

        if (bodyCount > 0 && bestCount > 0) {
            channelGroup.createSpan({
                cls: "local-search-result-channel-separator",
                attr: { "aria-hidden": "true" }
            });
        }

        if (bodyCount > 0) {
            const bodyToggle = createSearchButton(channelGroup, "choice", {
                cls: `local-search-result-channel${core.bodyExpanded ? " is-selected" : ""}`,
                attr: {
                    "aria-pressed": String(core.bodyExpanded),
                    "aria-label": `查看正文 ${bodyCount} 个结果`
                }
            });
            setIndicatorLabel(bodyToggle, `正文 · ${bodyCount}`);
            bodyToggle.addEventListener("click", () => {
                if (core.bodyExpanded) return;
                if (core.selection.selectedPaths.size) core.selection.clearState();
                core.bodyExpanded = true;
                this.resetViewport();
                this.refreshResultChannels();
                this.renderPage();
                core._notifyStateChange();
            });
        }

        return true;
    },


    _ensureFilterPoolGroup(values, groupKey, labelText = "", ariaLabel = "") {
        let ref = this._filterPoolGroupRefs.get(groupKey);
        if (!ref) {
            const group = values.ownerDocument.createElement("span");
            group.className = "local-search-filter-pool-group";
            group.setAttribute("role", "group");
            const label = group.createSpan({ cls: "local-search-filter-pool-label" });
            ref = { group, label, buttons: new Map() };
            this._filterPoolGroupRefs.set(groupKey, ref);
        }
        ref.group.setAttribute("aria-label", ariaLabel || labelText || "筛选池");
        ref.label.textContent = labelText;
        ref.label.hidden = !labelText;
        return ref;
    },


    _syncFilterPoolButton(ref, cursor, entryKey, { label, ariaLabel, active, action }) {
        const core = this.owner;
        let button = ref.buttons.get(entryKey);
        if (!button) {
            button = createSearchButton(ref.group, "text", {
                cls: "local-search-filter-pool-chip"
            });
            bindInputFocusGuard(button, () => core.searchInput);
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                if (!button.disabled) button._lsPoolAction?.(button);
            });
            ref.buttons.set(entryKey, button);
        }
        button._lsPoolAction = action;
        if (button.textContent !== label) button.textContent = label;
        button.classList.toggle("is-selected", active);
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute("aria-label", ariaLabel);
        if (button !== cursor) ref.group.insertBefore(button, cursor);
        return button.nextElementSibling;
    },


    _syncFilterPoolGroups(values, source, poolSettings, catalog = null) {
        const core = this.owner;
        const pools = poolSettings.filter(pool => pool.visible !== false);
        const visibleGroupKeys = new Set();
        let cursor = values.firstElementChild;
        let visibleCount = 0;

        for (const pool of pools) {
            if (pool.kind === "property") {
                const excluded = new Set(core.plugin.settings.excludedKeys || []);
                const keys = sortByPreferredOrder(
                    (catalog ? (catalog.get(pool.id) || []).map(entry => entry.key) : collectPropertyKeys(source, [])).filter(key =>
                        !excluded.has(key) && propertyPoolKeyVisible(pool, key)),
                    core.plugin.settings.pickerPropertyOrder, key => key
                );
                for (const key of keys) {
                    const groupKey = `${pool.id}\0${key}`;
                    visibleGroupKeys.add(groupKey);
                    visibleCount++;
                    const ref = this._ensureFilterPoolGroup(values, groupKey, "", key);
                    if (ref.group !== cursor) values.insertBefore(ref.group, cursor);
                    cursor = ref.group.nextElementSibling;
                    const active = Boolean(core.filterState?.properties?.get(key)?.size);
                    this._syncFilterPoolButton(ref, ref.label.nextElementSibling, key, {
                        label: key, ariaLabel: `筛选属性 ${key}`,
                        active,
                        action: anchor => core.facets.openPropertyPicker(key, anchor, { mode: "quick-value" })
                    });
                    for (const [oldKey, button] of [...ref.buttons]) if (oldKey !== key) {
                        button._lsPoolAction = null; button.remove(); ref.buttons.delete(oldKey);
                    }
                }
                continue;
            }

            const entries = (catalog ? catalog.get(pool.id) || [] : core.resultControls._filterPoolDisplayEntries(pool, source))
                .filter(entry => filterPoolValueVisible(pool, entry.key));
            if (!entries.length) continue;

            const groupKey = pool.id;
            visibleGroupKeys.add(groupKey);
            visibleCount++;
            const labelText = filterPoolLabel(pool);
            const ref = this._ensureFilterPoolGroup(values, groupKey, labelText, labelText);
            if (ref.group !== cursor) values.insertBefore(ref.group, cursor);
            cursor = ref.group.nextElementSibling;

            const visibleButtons = new Set();
            let buttonCursor = ref.label.nextElementSibling;
            for (const entry of entries) {
                const entryKey = String(entry.key || filterPoolValueKey(pool, entry.value));
                visibleButtons.add(entryKey);
                const active = core.resultControls._isFilterPoolValueActive(pool, entry.value);
                buttonCursor = this._syncFilterPoolButton(ref, buttonCursor, entryKey, {
                    label: entry.label,
                    ariaLabel: `${labelText}：${entry.label}${entry.count ? `，${entry.count} 项` : ""}`,
                    active,
                    action: () => core.resultControls._toggleFilterPoolValue(pool, entry.value)
                });
            }
            for (const [key, button] of [...ref.buttons]) {
                if (visibleButtons.has(key)) continue;
                button._lsPoolAction = null;
                button.remove();
                ref.buttons.delete(key);
            }
        }

        for (const [key, ref] of [...this._filterPoolGroupRefs]) {
            if (visibleGroupKeys.has(key)) continue;
            for (const button of ref.buttons.values()) button._lsPoolAction = null;
            ref.group.remove();
            this._filterPoolGroupRefs.delete(key);
        }
        return visibleCount;
    },


    // Pinned keys are rendered from the same propertyEntries that controls the Picker's pin mode.
    // No generic Pool shortcut, left/right layout state, or secondary registry.
    _syncFilterToolbarEntries(valuesHost, shortcutsHost, source, poolSettings) {
        const core = this.owner;
        const propertyPool = poolSettings.find(pool => pool.kind === "property");
        const entries = normalizePropertyPoolEntries(propertyPool?.propertyEntries);
        const excluded = new Set(core.plugin.settings.excludedKeys || []);
        // The native Property Picker is the only property-key order owner.
        // Filtering its ordered catalog must not fall back to configuration insertion order.
        const pinned = sortByPreferredOrder(
            Object.entries(entries).filter(([key, entry]) =>
                entry.pinnedRight && !excluded.has(key)),
            core.plugin.settings.pickerPropertyOrder,
            ([key]) => key
        );
        const visibleIds = new Set();
        let cursor = shortcutsHost.firstElementChild;
        for (const [key, entry] of pinned) {
            const id = `property:${key}`;
            visibleIds.add(id);
            let button = this._filterToolbarButtonRefs.get(id);
            if (!button) {
                button = createSearchButton(shortcutsHost, "chrome", {
                    cls: "local-search-status-filter-action local-search-status-popup-trigger local-search-filter-toolbar-shortcut",
                    attr: { "aria-haspopup": "dialog", "aria-expanded": "false" }
                });
                button.addEventListener("click", event => {
                    event.preventDefault(); event.stopPropagation();
                    if (core.dropdown.closeIfSameAnchor(button)) return;
                    core.facets.openPropertyPicker(key, button, { mode: "quick-value" });
                });
                this._filterToolbarButtonRefs.set(id, button);
            }
            if (button.dataset.lsIcon !== entry.shortcutIcon) {
                button.replaceChildren(); setIcon(button, entry.shortcutIcon);
                button.dataset.lsIcon = entry.shortcutIcon;
            }
            button.dataset.lsFilterShortcut = id;
            const applied = Boolean(core.filterState?.properties?.get(key)?.size);
            button.classList.toggle("is-applied", applied);
            button.setAttribute("aria-pressed", String(applied));
            button.setAttribute("aria-label", `筛选属性 ${key}`);
            button.title = key;
            if (button !== cursor || button.parentElement !== shortcutsHost) {
                shortcutsHost.insertBefore(button, cursor);
            }
            cursor = button.nextElementSibling;
        }
        for (const [id, button] of [...this._filterToolbarButtonRefs]) {
            if (visibleIds.has(id)) continue;
            button.remove(); this._filterToolbarButtonRefs.delete(id);
        }
        return { left: 0, right: pinned.length };
    },
};

