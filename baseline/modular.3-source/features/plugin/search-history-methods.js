// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeModalSearchQuery, normalizeModalViewportAnchor } from "../../core/session-values.js";
import { FilterState } from "../filters/filter-state.js";
import { normalizeSortDirection, normalizeSortField } from "../sort/sort-model.js";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_search_history_methods = {


    recoverSearchSession(key, session) {
        const recovery = this.settings.createSessionRecovery?.[key]?.session;
        return recovery && (!session || (recovery.capturedAt || 0) >= (session.capturedAt || 0)) ? recovery : session;
    },


    rememberCreateSession(key, kind, session, { persist = true } = {}) {
        if (!key || this._unloaded) return false;
        const recovery = this.settings.createSessionRecovery || {};
        const next = session?.create?.title?.trim() ? { kind, session } : null;
        // Capture time arbitrates native layout vs shutdown recovery; it is not a reason to write twice.
        const comparable = value => value ? { kind: value.kind, session: { ...value.session, capturedAt: 0 } } : null;
        if (JSON.stringify(comparable(recovery[key])) === JSON.stringify(comparable(next))) return false;
        this.settings.createSessionRecovery = { ...recovery };
        if (next) this.settings.createSessionRecovery[key] = next;
        else delete this.settings.createSessionRecovery[key];
        if (persist) void this.saveSettings();
        return true;
    },


    settleCreateSession(key, submitted) {
        if (!key) return;
        const same = session => JSON.stringify(session?.create) === JSON.stringify(submitted);
        const recovery = this.settings.createSessionRecovery?.[key];
        if (recovery && same(recovery.session)) this.rememberCreateSession(key, recovery.kind, null);
        for (const state of this._closedSearchViewStates.values()) {
            if (state.sessionKey === key && same(state.session)) state.session.create = null;
        }
        // A user can reopen the host before an accepted write finishes. Clear only that exact draft.
        for (const core of this.activeSearchCores) {
            if (core.sessionKey !== key || !same(core.captureSession())) continue;
            core.createFlow.quickCreateTitle = "";
            core.searchInput.value = "";
            core.createFlow.syncInputModeView();
            core.createFlow._refreshCreatePreview();
            core._notifyStateChange();
        }
    },


    _normalizeSearchQueries(entries, limit = Infinity) {
        const seen = new Set();
        const normalized = [];
        const source = Array.isArray(entries) ? entries : [];

        for (const entry of source) {
            const query = String(entry || "").trim();
            if (!query) continue;

            const key = query.toLocaleLowerCase("zh-CN");
            if (seen.has(key)) continue;

            seen.add(key);
            normalized.push(query);
            if (normalized.length >= limit) break;
        }

        return normalized;
    },


    _normalizeSearchHistory(entries) {
        return this._normalizeSearchQueries(entries, 20);
    },


    _normalizeFavoriteSearches(entries) {
        return this._normalizeSearchQueries(entries);
    },


    _sameSearchQuery(a, b) {
        return String(a || "").trim().toLocaleLowerCase("zh-CN")
            === String(b || "").trim().toLocaleLowerCase("zh-CN");
    },


    _setSearchHistory(entries) {
        const favorites = this.settings.favoriteSearches || [];
        const next = this._normalizeSearchHistory(entries)
            .filter(query =>
                !favorites.some(favorite =>
                    this._sameSearchQuery(favorite, query)
                )
            );

        const current = this.settings.searchHistory || [];
        const unchanged =
            next.length === current.length
            && next.every((value, index) =>
                value === current[index]
            );

        if (unchanged) return false;
        this.settings.searchHistory = next;
        this._throttleSaveActivity();
        return true;
    },


    _setFavoriteSearches(entries) {
        const next = this._normalizeFavoriteSearches(entries);
        const current = this.settings.favoriteSearches || [];
        const unchanged =
            next.length === current.length
            && next.every((value, index) =>
                value === current[index]
            );

        if (unchanged) return false;

        this.settings.favoriteSearches = next;
        this.settings.searchHistory = this._normalizeSearchHistory(
            (this.settings.searchHistory || []).filter(query =>
                !next.some(favorite =>
                    this._sameSearchQuery(favorite, query)
                )
            )
        );

        void this.saveSettings();
        return true;
    },


    rememberModalSearchSession(session = {}, { persist = true } = {}) {
        const source = session && typeof session === "object" ? session : {};
        const nextFilter = FilterState.normalizeSnapshot(source.filterSnapshot);
        const currentFilter = FilterState.normalizeSnapshot(
            this.settings.modalFilterSnapshot
        );
        const nextQuery = normalizeModalSearchQuery(source.query);
        const currentQuery = normalizeModalSearchQuery(
            this.settings.modalSearchQuery
        );
        const hasQuery = Boolean(nextQuery.trim());
        const nextSortField = normalizeSortField(
            source.sortField,
            hasQuery,
            this.settings
        );
        const nextSortDirection = normalizeSortDirection(source.sortDirection);
        const currentSortField = normalizeSortField(
            this.settings.modalSortField,
            Boolean(currentQuery.trim()),
            this.settings
        );
        const currentSortDirection = normalizeSortDirection(
            this.settings.modalSortDirection
        );
        const nextAnchor = normalizeModalViewportAnchor(source.viewportAnchor);
        const currentAnchor = normalizeModalViewportAnchor(
            this.settings.modalViewportAnchor
        );

        if (
            JSON.stringify(nextFilter) === JSON.stringify(currentFilter)
            && nextQuery === currentQuery
            && nextSortField === currentSortField
            && nextSortDirection === currentSortDirection
            && JSON.stringify(nextAnchor) === JSON.stringify(currentAnchor)
        ) {
            return false;
        }

        this.settings.modalFilterSnapshot = nextFilter;
        this.settings.modalSearchQuery = nextQuery;
        this.settings.modalSortField = nextSortField;
        this.settings.modalSortDirection = nextSortDirection;
        this.settings.modalViewportAnchor = nextAnchor;
        if (persist) void this.saveSettings();
        return true;
    },


    recordSearchHistory(query) {
        const q = String(query || "").trim();
        if (!q) return false;

        if (
            (this.settings.favoriteSearches || []).some(favorite =>
                this._sameSearchQuery(favorite, q)
            )
        ) {
            return false;
        }

        return this._setSearchHistory([
            q,
            ...(this.settings.searchHistory || [])
                .filter(item => !this._sameSearchQuery(item, q))
        ]);
    },


    favoriteSearchQuery(query) {
        const q = String(query || "").trim();
        if (!q) return false;

        return this._setFavoriteSearches([
            q,
            ...(this.settings.favoriteSearches || [])
                .filter(item => !this._sameSearchQuery(item, q))
        ]);
    },


    unfavoriteSearchQuery(query) {
        const q = String(query || "").trim();
        if (!q) return false;

        const changed = this._setFavoriteSearches(
            (this.settings.favoriteSearches || [])
                .filter(item => !this._sameSearchQuery(item, q))
        );

        this._setSearchHistory([
            q,
            ...(this.settings.searchHistory || [])
                .filter(item => !this._sameSearchQuery(item, q))
        ]);

        return changed;
    },


    deleteSearchQuery(query, { favorite = false } = {}) {
        const q = String(query || "").trim();
        if (!q) return false;

        return favorite
            ? this._setFavoriteSearches(
                (this.settings.favoriteSearches || [])
                    .filter(item => !this._sameSearchQuery(item, q))
            )
            : this._setSearchHistory(
                (this.settings.searchHistory || [])
                    .filter(item => !this._sameSearchQuery(item, q))
            );
    },
};

