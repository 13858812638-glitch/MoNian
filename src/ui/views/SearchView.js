// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { SearchCore } from "../../core/SearchCore.js";
import { TAB_VIEW_TYPE, VIEW_TYPE } from "../../core/view-types.js";
import { SearchWorkspaceCapabilities } from "../../integrations/SearchWorkspaceCapabilities.js";
import { ItemView, Notice, Platform } from "obsidian";


// Native ItemView hosts one SearchCore. Both existing sidebar and new tab use this implementation.
// Never apply a persistent body theme: only the currently owned mobile drawer
// should adopt GLS's painted surface and release it when its view closes.
const mobileDrawerOwners = new WeakMap();
function syncMobileSidebarSurface(view, active) {
    if (active && !view._closed && Platform.isMobile && view.viewType === VIEW_TYPE) {
        // A sidebar ItemView may stay mounted when Obsidian collapses its split.
        // Never paint the global iOS safe-area cover for a hidden GLS drawer.
        const splits = [view.app.workspace.leftSplit, view.app.workspace.rightSplit];
        let owner = view.leaf;
        while (owner && !splits.includes(owner)) owner = owner.parent;
        owner ||= view.leaf?.getRoot?.();
        if (owner?.collapsed === true) active = false;
    }
    const previous = view._mobileDrawer;
    const drawer = active ? view.contentEl?.closest?.(".workspace-drawer") : null;
    // Focus and resize may generate repeated active-leaf notifications: no
    // unnecessary class mutation or background repaint on the same drawer.
    if (drawer && drawer === previous && mobileDrawerOwners.get(drawer) === view) return;
    if (previous && mobileDrawerOwners.get(previous) === view) {
        previous.classList.remove("gls-mobile-sidebar-active");
        mobileDrawerOwners.delete(previous);
    }
    view._mobileDrawer = null;
    if (!drawer || view._closed || !Platform.isMobile || view.viewType !== VIEW_TYPE) return;
    drawer.classList.add("gls-mobile-sidebar-active");
    mobileDrawerOwners.set(drawer, view);
    view._mobileDrawer = drawer;
}
export class SearchView extends ItemView {
    constructor(leaf, plugin, viewType = VIEW_TYPE) {
        super(leaf);
        this.plugin = plugin;
        this.viewType = viewType;
        this._state = {};
        this._closed = false;
        this.core = null;
        this._ready = null;
        this.capabilities = null;
        this._activeLeafRef = null;
        this._swipeBackCleanup = null;
        this._mobileDrawer = null;
        this._sessionKey = `workspace:${viewType}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }

    getViewType() { return this.viewType; }
    getDisplayText() { return this.viewType === VIEW_TYPE ? "GLS Navigator" : "本地搜索"; }
    getIcon() { return "search"; }

    _collapseMobileSidebar() {
        if (!Platform.isMobile || this.viewType !== VIEW_TYPE) return false;
        const workspace = this.app.workspace;
        const roots = [workspace.leftSplit, workspace.rightSplit].filter(Boolean);
        let node = this.leaf;
        while (node) {
            if (roots.includes(node)) {
                node.collapse?.();
                syncMobileSidebarSurface(this, false);
                return true;
            }
            node = node.parent;
        }
        const root = this.leaf?.getRoot?.();
        if (roots.includes(root)) {
            root.collapse?.();
            syncMobileSidebarSurface(this, false);
            return true;
        }
        return false;
    }

    getState() {
        return { sessionKey: this._sessionKey, session: this.core?.captureSession() || this._state.session || null };
    }

    async setState(state, result) {
        this._state = state && typeof state === "object" ? state : {};
        if (typeof this._state.sessionKey === "string" && this._state.sessionKey.startsWith(`workspace:${this.viewType}:`)) {
            const claimed = [...this.plugin.activeSearchCores].some(core => core !== this.core && core.sessionKey === this._state.sessionKey);
            if (!claimed) this._sessionKey = this._state.sessionKey;
        }
        if (this.core && !this.core._destroyed) {
            this.core.sessionKey = this._sessionKey;
            const session = this.plugin.recoverSearchSession(this._sessionKey, this._state.session);
            if (session) {
                this.core.restoreSession(session);
                if (this.core._resultGeneration) this.core._initializeResultState();
            }
        }
        await super.setState(state, result);
    }

    async onOpen() {
        if (this._closed || this.plugin._unloaded) return;
        const core = new SearchCore(this.app, this.plugin, this.contentEl, {
            hostKind: this.viewType === TAB_VIEW_TYPE ? "tab" : "sidebar",
            persistModalSession: false,
            sessionKey: this._sessionKey,
            onStateChange: () => this.app.workspace.requestSaveLayout?.(),
            onFileOpened: (_file, options) => {
                if (!options.newTab && !options.forceKeepOpen) this._collapseMobileSidebar();
            },
            onCloseRequest: () => { // Escape only leaves input; native tab chrome owns closing.
                this.contentEl.focus({ preventScroll: true });
                return false;
            }
        });
        this.core = core;
        this._ready = (async () => {
            const fail = error => {
                if (this._closed || this.plugin._unloaded) return false;
                if (error) console.error("搜索工作区初始化失败", error);
                new Notice("本地搜索初始化失败，请重新打开");
                this.leaf?.detach();
                return false;
            };
            try {
                if (!await core.mountShell()) return fail();
                if (this._closed || this.plugin._unloaded) return false;
                syncMobileSidebarSurface(this, true);
                core.sessionKey = this._sessionKey;
                core.restoreSession(this.plugin.recoverSearchSession(this._sessionKey, this._state.session));

                // Tabs and mobile drawers own swipe-back navigation. A desktop
                // sidebar is persistent mouse UI: registering its whole surface
                // makes ordinary clicks scan ancestor geometry, and a small
                // horizontal pointer drift suppresses the eventual click.
                // Child Pickers keep their own independent navigation leases.
                if (this.viewType === TAB_VIEW_TYPE || (Platform.isMobile && this.viewType === VIEW_TYPE)) {
                    this.contentEl.setAttribute("data-ignore-swipe", "true");
                    this._swipeBackCleanup?.();
                    this._swipeBackCleanup = this.plugin.swipeBack.register(this.contentEl, {
                        canGoBack: () => !this._closed && this.contentEl?.isConnected && Boolean(this.leaf),
                        back: () => { if (!core.navigator?.back(false) && !this._collapseMobileSidebar()) this.leaf?.detach(); }
                    });
                }

                this.capabilities = new SearchWorkspaceCapabilities(core);
                this._activeLeafRef = this.app.workspace.on("active-leaf-change", leaf => {
                    if (this._closed || core._destroyed) return;
                    if (leaf !== this.leaf) {
                        core.suspendInteractions();
                        // Switching to another tab *inside the same native drawer*
                        // releases GLS's surface. Main editor focus does not
                        // imply that the visible sidebar itself was replaced.
                        const otherDrawer = leaf?.view?.contentEl?.closest?.(".workspace-drawer");
                        if (otherDrawer && otherDrawer === this._mobileDrawer) syncMobileSidebarSurface(this, false);
                    } else {
                        syncMobileSidebarSurface(this, true);
                        this.capabilities?.resize(); core.dropdown._queueReposition();
                    }
                });
                return await core.startResults() || fail();
            } catch (error) {
                return fail(error);
            }
        })();
        await this._ready;
    }

    onResize() {
        if (Platform.isMobile && this.viewType === VIEW_TYPE && !this._closed) syncMobileSidebarSurface(this, true);
        this.capabilities?.resize();
        this.core?.navigator?.resize();
        // Mobile width/layout invalidation is already owned by Navigator;
        // orientation is owned by the shared frame. Raw host height callbacks
        // must not relayout a live input (native leaves use preserveFrame:false).
        if (!Platform.isMobile) this.core?.dropdown?._queueReposition();
    }

    focusSearchInput() {
        // The tab command never raises a mobile keyboard, even if modal autofocus is enabled.
        if (Platform.isMobile && (this.viewType === TAB_VIEW_TYPE || this.viewType === VIEW_TYPE || !this.plugin.settings.focusSearchOnMobileOpen)) return false;
        const input = this.core?.searchInput;
        if (!input?.isConnected) return false;
        input.focus({ preventScroll: true });
        try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {}
        return true;
    }

    onClose() {
        if (this._closed) return;
        this._closed = true;
        this._state = this.getState();
        this.plugin._closedSearchViewStates.set(this.viewType, this._state);
        syncMobileSidebarSurface(this, false);
        this._swipeBackCleanup?.();
        this._swipeBackCleanup = null;
        this.contentEl.removeAttribute("data-ignore-swipe");
        this.capabilities?.destroy();
        this.capabilities = null;
        if (this._activeLeafRef) this.app.workspace.offref(this._activeLeafRef);
        this._activeLeafRef = null;
        this.core?.destroy();
        this.core = null;
        this.contentEl.empty();
        this.contentEl.removeClass("local-search-content", "local-search-workspace-host");
    }
}
