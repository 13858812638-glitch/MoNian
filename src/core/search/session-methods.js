// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { FilterState, normalizeLegacyFilterPoolSnapshot } from "../../features/filters/filter-state.js";
import { normalizeSortDirection, normalizeSortField } from "../../features/sort/sort-model.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { normalizeModalSearchQuery, normalizeModalViewportAnchor } from "../session-values.js";
// Instance method owner. `this` is the unchanged SearchCore instance. No additional state store.
export const SearchCore_session_methods = {


    _captureCurrentModalSession({ excludedPaths = null } = {}) {
        if (this.isWorkspaceHost || this._destroyed || !this.persistModalSession) return null;
        return this.captureSession({ excludedPaths });
    },


    captureSession({ excludedPaths = null } = {}) {
        if (this._destroyed) return null;

        // 搜索输入有 150ms debounce。关闭时必须直接读取输入框实时值，
        // 否则“刚输入完就关闭”会把上一轮 queryState.raw 保存下来。
        const liveQuery = normalizeModalSearchQuery(
            this.createFlow?.isCreateMode?.()
                ? this.queryState.raw
                : (this.searchInput?.value ?? this.queryState.raw)
        );

        const sessionFilter = this.createFlow?.isCreateMode?.()
            && this.createFlow.searchFilterState instanceof FilterState
                ? this.createFlow.searchFilterState
                : (this.createFlow?.searchResultFilterState?.() || this.filterState);
        const sessionQuery = this.createFlow?.isCreateMode?.()
            ? this.createFlow.searchQuery
            : liveQuery;

        return {
            capturedAt: Date.now(),
            filterSnapshot: sessionFilter.toSnapshot(),
            query: sessionQuery,
            viewportAnchor: this.resultRenderer.captureViewportAnchor(
                null,
                excludedPaths
            ),
            sortField: this.sortField,
            sortDirection: this.sortDirection,
            browseSortField: this._browseSortField,
            bodyExpanded: this.bodyExpanded,
            toolsExpanded: this.workbenchToolsExpanded === true,
            navigator: this.navigator?.capture() || null,
            selection: {
                batchMode: this.selection.batchMode,
                paths: [...this.selection.selectedPaths],
                anchorPath: this.selection.anchorPath
            },
            create: this.createFlow?.captureDraft() || null
        };
    },


    restoreSession(session) {
        if (!session || typeof session !== "object" || this._destroyed) return;
        this._restoringSharedSearchState = true;
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = null;
        if (this._resultGeneration) this.suspendInteractions();
        this.queryState.set(normalizeModalSearchQuery(session.query));
        this.filterState = FilterState.fromSnapshot(
            normalizeLegacyFilterPoolSnapshot(
                session.filterSnapshot,
                this.plugin.settings.filterPools
            )
        );
        this.sortField = normalizeSortField(session.sortField, this.queryState.active, this.plugin.settings);
        this.sortDirection = normalizeSortDirection(session.sortDirection);
        this._browseSortField = normalizeSortField(session.browseSortField
            ?? (session.sortField !== "relevance" ? session.sortField : this._browseSortField), false, this.plugin.settings);
        this.bodyExpanded = !!session.bodyExpanded;
        this.workbenchToolsExpanded = session.toolsExpanded === true;
        this._initialViewportAnchor = normalizeModalViewportAnchor(session.viewportAnchor);
        this.navigator?.restore(session.navigator, this._initialViewportAnchor);
        if (this.searchInput) this.searchInput.value = this.queryState.raw;
        this.createFlow.restoreDraft(session.create);
        this.selection.batchMode = !session.create && !!session.selection?.batchMode;
        this.selection.selectedPaths = new Set(this.selection.batchMode ? normalizeUniqueStringList(session.selection?.paths) : []);
        this.selection.anchorPath = this.selection.selectedPaths.has(session.selection?.anchorPath) ? session.selection.anchorPath : null;
        this.selection.resetShiftRange();
        this.facets.syncFilterButtons();
        this._restoringSharedSearchState = false;
        this.plugin.sharedSearchState?.restored(this);
    },


    checkpointCreateSession({ persist = true } = {}) {
        if (!this.sessionKey || this._destroyed) return false;
        return this.plugin.rememberCreateSession(this.sessionKey, this.hostKind, this.captureSession(), { persist });
    },


    _notifyStateChange() {
        if (!this._destroyed) {
            this.plugin.sharedSearchState?.publish(this);
            this.navigator?.sync();
            this.onStateChange?.();
        }
    },


    suspendInteractions() {
        if (this._destroyed) return;
        this._confirmSession?.finish(false, { force: true, restoreFocus: false });
        this.dropdown.close(false, { returnToParent: false, force: true });
        this.swipe.closeAll({ immediate: true });
    },


    _persistModalSessionSnapshot(session, { persist = true } = {}) {
        if (!session || this.isWorkspaceHost || this._destroyed || !this.persistModalSession) {
            return false;
        }
        return this.plugin.rememberModalSearchSession(session, { persist });
    },


    _persistCurrentModalView(options = {}) {
        const session = this._captureCurrentModalSession(options);
        return this._persistModalSessionSnapshot(session);
    },
};

