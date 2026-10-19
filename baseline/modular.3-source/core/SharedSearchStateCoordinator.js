// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { FilterState } from "../features/filters/filter-state.js";
import { normalizeSortDirection, normalizeSortField } from "../features/sort/sort-model.js";
import { normalizeModalSearchQuery } from "./session-values.js";


// Normal search hosts share only the query model. Each host still owns its viewport,
// selection, draft and navigation presentation; external pickers remain isolated.
export class SharedSearchStateCoordinator {
    constructor(plugin) {
        this.plugin = plugin;
        this.state = null;
        this.revision = 0;
        this.members = new Map();
    }

    _normalize(source) {
        const settings = this.plugin.settings;
        const query = normalizeModalSearchQuery(source?.query);
        return {
            query,
            filterSnapshot: FilterState.normalizeSnapshot(source?.filterSnapshot),
            sortField: normalizeSortField(source?.sortField, Boolean(query.trim()), settings),
            sortDirection: normalizeSortDirection(source?.sortDirection),
            browseSortField: normalizeSortField(source?.browseSortField, false, settings),
            bodyExpanded: source?.bodyExpanded === true
        };
    }

    _capture(core) {
        const creating = core.createFlow?.isCreateView?.();
        const filter = creating && core.createFlow.searchFilterState instanceof FilterState
            ? core.createFlow.searchFilterState : core.filterState;
        return this._normalize({
            query: core.queryState.raw,
            filterSnapshot: filter.toSnapshot(),
            sortField: core.sortField,
            sortDirection: core.sortDirection,
            browseSortField: core._browseSortField,
            bodyExpanded: core.bodyExpanded
        });
    }

    _same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

    // Vault maintenance changes identities even while every search host is closed.
    // Transform the committed model and each member's comparison baseline together;
    // pending local queries and independent CreateDrafts remain with their owners.
    transformFilters(transform) {
        if (typeof transform !== "function" || !this.plugin) return false;
        const convert = snapshot => {
            const state = FilterState.fromSnapshot(snapshot);
            transform(state);
            return state.toSnapshot();
        };
        for (const member of this.members.values()) {
            member.observed.filterSnapshot = convert(member.observed.filterSnapshot);
        }
        const saved = this.plugin.settings.sharedSearchState;
        const source = this.state || (saved?.version === 1 ? saved.state : null);
        if (!source) return false;
        const next = this._normalize(source);
        next.filterSnapshot = convert(next.filterSnapshot);
        if (this._same(next.filterSnapshot, this._normalize(source).filterSnapshot)) return false;
        this.state = next;
        this.revision = Math.max(this.revision, Number(saved?.revision) || 0) + 1;
        this._remember();
        for (const core of this.members.keys()) this.schedule(core);
        return true;
    }

    attach(core) {
        if (!core.sharedSearchState || core._destroyed || this.members.has(core)) return;
        const saved = this.plugin.settings.sharedSearchState;
        if (!this.state && saved?.version === 1 && saved.state && typeof saved.state === "object") {
            this.state = this._normalize(saved.state);
            this.revision = Math.max(1, Number(saved.revision) || 1);
        }
        const observed = this._capture(core);
        this.members.set(core, { observed, applied: 0, queued: false, applying: false });
        if (!this.state) {
            this.state = observed;
            this.revision = 1;
            this._remember();
        }
        this.consume(core);
    }

    _remember() {
        this.plugin.settings.sharedSearchState = {
            version: 1, revision: this.revision,
            state: JSON.parse(JSON.stringify(this.state))
        };
        this.plugin._throttleSaveActivity();
    }

    // A stale Picker may commit one dimension while another host changed the query.
    // Merge only fields actually changed by this host, never republish its stale snapshot.
    publish(core, { closing = false } = {}) {
        const member = this.members.get(core);
        if (!member || member.applying || core._restoringSharedSearchState || core._destroyed
            || core._inputComposing || core.createFlow?.isCreateMode?.()) return false;
        const current = this._capture(core);
        if (closing && core.searchInput && !core.createFlow?.isCreateMode?.()) {
            const live = normalizeModalSearchQuery(core.searchInput.value);
            if (live !== current.query) {
                const wasActive = Boolean(current.query.trim());
                const active = Boolean(live.trim());
                if (active !== wasActive) {
                    if (active) { current.browseSortField = current.sortField; current.sortField = "relevance"; }
                    else current.sortField = current.browseSortField;
                }
                current.query = live;
                current.bodyExpanded = false;
            }
        }
        const previous = member.observed;
        const next = JSON.parse(JSON.stringify(this.state));
        for (const key of ["query", "sortField", "sortDirection", "browseSortField", "bodyExpanded"]) {
            if (!this._same(current[key], previous[key])) next[key] = current[key];
        }
        for (const key of ["tags", "folders", "properties", "fileTypes", "dateRange", "tagMatchMode", "propertyMatchMode"]) {
            if (!this._same(current.filterSnapshot[key], previous.filterSnapshot[key])) {
                next.filterSnapshot[key] = current.filterSnapshot[key];
            }
        }
        member.observed = current;
        const normalized = this._normalize(next);
        if (this._same(normalized, this.state)) {
            if (!closing) this.schedule(core);
            return false;
        }
        this.state = normalized;
        this.revision++;
        this._remember();
        for (const target of this.members.keys()) if (!closing || target !== core) this.schedule(target);
        return true;
    }

    _blocked(core) {
        return core._inputComposing || core.searchTimer || core._restoringSharedSearchState
            || core.dropdown?.isOpen || core._confirmSession || core.selection?.busy
            || core.createFlow?.isCreateMode?.() || core.createFlow?._createInFlight
            || core.swipe?.activeCancel || core.swipe?.openWrapper || core.swipe?.closingWrapper
            || core.resultRenderer?.isNativeScrolling?.()
            || (core.searchInput && !core.createFlow?.isCreateMode?.()
                && normalizeModalSearchQuery(core.searchInput.value) !== core.queryState.raw);
    }

    schedule(core) {
        const member = this.members.get(core);
        if (!member || member.queued || member.applying || member.applied === this.revision) return;
        member.queued = true;
        queueMicrotask(() => {
            member.queued = false;
            if (this.members.get(core) === member) this.consume(core);
        });
    }

    consume(core) {
        const member = this.members.get(core);
        if (!member || member.applying || core._destroyed || member.applied === this.revision
            || this._blocked(core)) return false;
        const target = this.state;
        member.applying = true;
        try {
            const before = this._capture(core);
            if (!this._same(before, target)) {
                // Restore the search-side FilterState before updating a zero-hit create preview.
                core.createFlow?.prepareSearchEvaluation?.();
                core.queryState.set(target.query);
                core.filterState = FilterState.fromSnapshot(target.filterSnapshot);
                core.sortField = target.sortField;
                core.sortDirection = target.sortDirection;
                core._browseSortField = target.browseSortField;
                core.bodyExpanded = target.bodyExpanded;
                if (core.searchInput) core.searchInput.value = target.query;
                core.sorting?.sync();
                core.facets?.syncFilterButtons();
                if (core._resultGeneration) {
                    core._refreshCurrentResultsAfterMutation({ preserveSelection: true, refreshPools: true });
                }
                core._syncSearchHeaderControls?.();
                core._notifyStateChange();
            }
            member.applied = this.revision;
            member.observed = this._capture(core);
            return true;
        } finally { member.applying = false; }
    }

    restored(core) {
        const member = this.members.get(core);
        if (!member) return;
        member.observed = this._capture(core);
        member.applied = 0;
        this.consume(core);
    }

    detach(core) {
        this.publish(core, { closing: true });
        this.members.delete(core);
    }

    destroy() { this.members.clear(); this.plugin = null; }
}
