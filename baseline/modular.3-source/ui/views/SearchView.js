// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { SearchCore } from "../../core/SearchCore.js";
import { TAB_VIEW_TYPE, VIEW_TYPE } from "../../core/view-types.js";
import { SearchWorkspaceCapabilities } from "../../integrations/SearchWorkspaceCapabilities.js";
import { ItemView, Notice, Platform } from "obsidian";


// Native ItemView hosts one SearchCore. Both existing sidebar and new tab use this implementation.
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
            if (roots.includes(node)) { node.collapse?.(); return true; }
            node = node.parent;
        }
        const root = this.leaf?.getRoot?.();
        if (roots.includes(root)) { root.collapse?.(); return true; }
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
                core._releaseSearchFocusForControl();
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
                core.sessionKey = this._sessionKey;
                core.restoreSession(this.plugin.recoverSearchSession(this._sessionKey, this._state.session));

                // Dida Bridge 3.0.53：Native Tab 自身就是一级导航宿主。
                // 必须把 Tab Surface 注册到同一个 SwipeBack Primitive，back 直接交给 WorkspaceLeaf.detach()；
                // data-ignore-swipe 只隔离 Obsidian 工作区原生侧栏手势，不拦截本插件内部 Result/Picker 手势。
                if (this.viewType === TAB_VIEW_TYPE || this.viewType === VIEW_TYPE) {
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
                    if (leaf !== this.leaf) core.suspendInteractions();
                    else { this.capabilities?.resize(); core.dropdown._queueReposition(); }
                });
                return await core.startResults() || fail();
            } catch (error) {
                return fail(error);
            }
        })();
        await this._ready;
    }

    onResize() {
        this.capabilities?.resize();
        this.core?.navigator?.resize();
        if (!this.contentEl.classList.contains("is-ui-frame-locked")) {
            this.core?.dropdown?._queueReposition();
        }
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
