// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { SearchCore } from "../../core/SearchCore.js";
import { activeWorkspaceDocument, hostDocument, hostWindow, isDomElement } from "../../utils/dom.js";
import { mountMobileFrame } from "../mobile/mobile-frame.js";
import { SearchModalHost, stripObsidianModalChrome } from "./modal-host.js";
import { Notice, Platform } from "obsidian";


// 搜索窗口
// ========== SearchWindowSession：搜索业务唯一会话；主窗始终由 Modal Host 拥有 ==========
export class SearchWindowSession {
    constructor(app, plugin, options = {}) {
        this.app = app;
        this.plugin = plugin;
        this.options = options && typeof options === "object" ? options : {};
        this.host = null;
        this.modalEl = null;
        this.contentEl = null;
        this.core = null;
        this._geometrySaveTimer = null;
        this._desktopBounds = null;
        this._dragCleanup = null;
        this._resizeCleanup = null;
        this._activeDragCleanup = null;
        this._activeResizeCleanup = null;
        this._windowResizeCleanup = null;

        // 一级主窗口只保留一个正式关闭生命周期；所有关闭入口最终都进入 close()。
        this._searchSessionCloseHandled = false;
        this._closing = false;
        this._mobileBackdropCleanup = null;
        this._swipeBackCleanup = null;
        this._startupTimer = null;
        this._autofocusFrame = 0;
        this._mobileFrame = null;
        this._contextMenuCloseHandler = null;

    }


    _attachHost(host, modalEl, contentEl) {
        this.host = host;
        this.modalEl = modalEl;
        this.contentEl = contentEl;
    }

    _hostDocument() {
        return this.modalEl?.ownerDocument
            || this.contentEl?.ownerDocument
            || activeWorkspaceDocument(this.app);
    }

    _hostWindow() {
        return hostWindow(this._hostDocument());
    }

    _handleEscapeEvent(event) {
        if (!event) return false;
        // Modal Scope 按 Escape 路由；兼容 Scope 回调未暴露 event.key 的宿主版本。
        if (event.key && event.key !== "Escape") return false;
        if (event.isComposing || event.keyCode === 229) return false;

        event.preventDefault?.();
        event.stopPropagation?.();
        event.stopImmediatePropagation?.();

        const core = this.core;
        if (core?._confirmSession) core._confirmSession.finish(false);
        else if (core?.dropdown?.isOpen) core.dropdown.handleEscape(event);
        else this.close();
        return true;
    }

    open() {
        if (this._closing) return false;
        if (this.host?.isOpen?.()) return true;

        const host = new SearchModalHost(this.app, this);
        this.host = host;
        host.open();
        return true;
    }

    _focusSearchInput(core, expectedFocus) {
        if (this._closing || this.core !== core || core?._destroyed) return;
        if (core.dropdown?.isOpen || core._confirmSession) return;
        if (this.options.externalSession && this.options.focusInputOnOpen !== true) return;
        if (Platform.isMobile && !this.options.focusInputOnOpen && !this.plugin.settings.focusSearchOnMobileOpen) return;
        const input = core?.searchInput;
        if (!input?.isConnected) return;
        const doc = input.ownerDocument;
        const active = doc.activeElement;
        if (active === input || (active !== expectedFocus && active !== doc.body)) return;

        input.focus({ preventScroll: true });
        const end = input.value.length;
        try {
            input.setSelectionRange(end, end);
        } catch (_) {}
    }

    _desktopViewport() {
        const win = hostWindow(this.modalEl);
        const vv = win.visualViewport;
        return {
            width: Math.max(1, Math.round(vv?.width || win.innerWidth)),
            height: Math.max(1, Math.round(vv?.height || win.innerHeight))
        };
    }

    _desktopMetrics() {
        const style = this._hostWindow().getComputedStyle(this.modalEl);
        const value = name => Math.max(0, Number.parseFloat(style.getPropertyValue(name)) || 0);
        return {
            edge: value("--ls-desktop-window-edge"),
            minWidth: value("--ls-desktop-window-min-width"),
            minHeight: value("--ls-desktop-window-min-height"),
            width: value("--ls-desktop-window-default-width"),
            height: value("--ls-desktop-window-default-height")
        };
    }

    _clampDesktopBounds(bounds, metrics = this._desktopMetrics(), keepOrigin = false) {
        const { width: vw, height: vh } = this._desktopViewport();
        const edge = Math.min(metrics.edge, Math.max(0, (Math.min(vw, vh) - 1) / 2));
        const left = Math.min(Math.max(Number(bounds?.x) || 0, edge), vw - edge - 1);
        const top = Math.min(Math.max(Number(bounds?.y) || 0, edge), vh - edge - 1);
        const maxW = Math.max(1, vw - (keepOrigin ? left : edge) - edge);
        const maxH = Math.max(1, vh - (keepOrigin ? top : edge) - edge);
        const requestedWidth = Number(bounds?.width);
        const requestedHeight = Number(bounds?.height);
        const width = Math.min(Math.max(Number.isFinite(requestedWidth) ? requestedWidth : metrics.width || maxW, Math.min(metrics.minWidth, maxW)), maxW);
        const height = Math.min(Math.max(Number.isFinite(requestedHeight) ? requestedHeight : metrics.height || maxH, Math.min(metrics.minHeight, maxH)), maxH);
        const x = keepOrigin ? left : Number.isFinite(Number(bounds?.x))
            ? Math.min(Math.max(Number(bounds.x), edge), vw - width - edge) : (vw - width) / 2;
        const y = keepOrigin ? top : Number.isFinite(Number(bounds?.y))
            ? Math.min(Math.max(Number(bounds.y), edge), vh - height - edge) : (vh - height) / 2;
        return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
    }

    _applyDesktopBounds(bounds, metrics = null, keepOrigin = false) {
        if (!this.modalEl || Platform.isMobile) return null;
        const next = this._clampDesktopBounds(bounds, metrics || this._desktopMetrics(), keepOrigin);
        const previous = this._desktopBounds;
        this._desktopBounds = next;
        // 固定外框样式由 CSS 接管；运行时只写四个真实几何量，拖动/缩放共用同一出口。
        for (const [key, property] of [["x", "left"], ["y", "top"], ["width", "width"], ["height", "height"]]) {
            if (!previous || previous[key] !== next[key]) this.modalEl.style[property] = `${next[key]}px`;
        }
        return next;
    }

    _queueGeometrySave(bounds, { immediate = false } = {}) {
        if (
            Platform.isMobile
            || !bounds
            || this.plugin._unloaded
        ) return;

        const exact = this._clampDesktopBounds(bounds);
        this._desktopBounds = exact;

        // Update in-memory state immediately. Reopening before disk I/O finishes
        // still gets the newest position/size.
        this.plugin.settings.modalBoundsV3 = { ...exact };

        const enqueue = () => {
            if (this.plugin._unloaded) return;

            // modalBoundsV3 已在内存中更新；只使用插件的 settings write chain。
            void this.plugin.saveSettings();
        };

        if (this._geometrySaveTimer) {
            this._hostWindow().clearTimeout(this._geometrySaveTimer);
            this._geometrySaveTimer = null;
        }

        if (immediate) enqueue();
        else this._geometrySaveTimer = this._hostWindow().setTimeout(() => {
            this._geometrySaveTimer = null;
            enqueue();
        }, 120);
    }

    _prepareDesktopWindowGeometry() {
        if (Platform.isMobile || !this.modalEl) return;
        this.modalEl.addClass("local-search-modal-resizable");
        // 首帧前只写最终窗口几何；拖拽 / Resize 监听等交互等 Shell 建立后再绑定。
        this._applyDesktopBounds(this.plugin.settings.modalBoundsV3);
    }

    _setupDesktopWindowGeometry() {
        if (Platform.isMobile || !this.modalEl) return;
        if (!this._desktopBounds) this._prepareDesktopWindowGeometry();

        // 首帧几何已在挂载前写入；静态外框由 CSS 固定，不再下一帧抢写一次。
        const win = this.modalEl.ownerDocument.defaultView;

        // ----- Drag: header empty area only; size never changes. -----
        const dragHandle = this.contentEl.querySelector(".local-search-header");
        if (dragHandle) {
            dragHandle.addClass("local-search-drag-handle");

            const onPointerDown = (e) => {
                if (e.button !== 0) return;
                if (e.target.closest("input, textarea, button, a, select, [contenteditable='true']")) return;

                e.preventDefault();
                this._activeResizeCleanup?.();
                this._activeDragCleanup?.();
                const metrics = this._desktopMetrics();

                const start = { ...(this._desktopBounds || this._applyDesktopBounds(this.plugin.settings.modalBoundsV3)) };
                const startX = e.clientX;
                const startY = e.clientY;

                const onMove = (ev) => {
                    if (ev.pointerId !== e.pointerId) return;
                    ev.preventDefault();
                    this._applyDesktopBounds({
                        x: start.x + ev.clientX - startX,
                        y: start.y + ev.clientY - startY,
                        width: start.width,
                        height: start.height
                    }, metrics);
                };

                const cleanupActiveDrag = () => {
                    win.removeEventListener("pointermove", onMove, true);
                    win.removeEventListener("pointerup", finish, true);
                    win.removeEventListener("pointercancel", finish, true);
                    if (this._activeDragCleanup === cleanupActiveDrag) {
                        this._activeDragCleanup = null;
                    }
                };

                const finish = event => {
                    if (event && event.pointerId !== e.pointerId) return;
                    cleanupActiveDrag();
                    if (this._desktopBounds) {
                        this._queueGeometrySave(
                            this._desktopBounds,
                            { immediate: true }
                        );
                    }
                };

                this._activeDragCleanup = cleanupActiveDrag;
                win.addEventListener("pointermove", onMove, true);
                win.addEventListener("pointerup", finish, true);
                win.addEventListener("pointercancel", finish, true);
            };

            dragHandle.addEventListener("pointerdown", onPointerDown);
            this._dragCleanup = () => {
                dragHandle.removeEventListener("pointerdown", onPointerDown);
                this._activeDragCleanup?.();
                this._activeDragCleanup = null;
            };
        }

        // ----- Resize: handle MUST be inside modal-content. -----
        // A direct modal child is intentionally hidden elsewhere by CSS.
        const resizeHandle = this.contentEl.createDiv({
 cls:"local-search-resize-handle",
            attr: {
                role: "separator",
                "aria-label": "调整搜索窗口大小"
            }
        });

        const onResizeDown = (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            this._activeDragCleanup?.();
            this._activeResizeCleanup?.();
            const metrics = this._desktopMetrics();

            const start = { ...(this._desktopBounds || this._applyDesktopBounds(this.plugin.settings.modalBoundsV3)) };
            const startX = e.clientX;
            const startY = e.clientY;

            const onMove = (ev) => {
                if (ev.pointerId !== e.pointerId) return;
                ev.preventDefault();
                // 同一 clamp 只改变右下角；不再复制 min/max/边缘合同。
                this._applyDesktopBounds({
                    x: start.x,
                    y: start.y,
                    width: start.width + ev.clientX - startX,
                    height: start.height + ev.clientY - startY
                }, metrics, true);
            };

            const cleanupActiveResize = () => {
                win.removeEventListener("pointermove", onMove, true);
                win.removeEventListener("pointerup", finish, true);
                win.removeEventListener("pointercancel", finish, true);
                if (this._activeResizeCleanup === cleanupActiveResize) {
                    this._activeResizeCleanup = null;
                }
            };

            const finish = event => {
                if (event && event.pointerId !== e.pointerId) return;
                cleanupActiveResize();
                if (this._desktopBounds) {
                    this._queueGeometrySave(
                        this._desktopBounds,
                        { immediate: true }
                    );
                }
            };

            this._activeResizeCleanup = cleanupActiveResize;
            win.addEventListener("pointermove", onMove, true);
            win.addEventListener("pointerup", finish, true);
            win.addEventListener("pointercancel", finish, true);
        };

        resizeHandle.addEventListener("pointerdown", onResizeDown);
        this._resizeCleanup = () => {
            resizeHandle.removeEventListener("pointerdown", onResizeDown);
            this._activeResizeCleanup?.();
            this._activeResizeCleanup = null;
        };

        // Viewport change: clamp the existing state, don't re-measure the DOM.
        const onWindowResize = () => {
            if (!this.modalEl?.isConnected || !this._desktopBounds) return;
            const next = this._applyDesktopBounds(this._desktopBounds);
            if (next) this._queueGeometrySave(next);
        };
        win.addEventListener("resize", onWindowResize);
        this._windowResizeCleanup = () => win.removeEventListener("resize", onWindowResize);
    }

    _setupMobileBackdropGuard() {
        if (!Platform.isMobile) return;
        this._teardownMobileBackdropGuard();

        const container = this.modalEl?.closest(".modal-container");
        if (!container) return;
        const eventRoot = hostDocument(container);
        const backdropEvents = typeof hostWindow(container).PointerEvent === "function"
            ? ["pointerdown", "click"]
            : ["touchstart", "mousedown", "click"];

        const blockBackdropDismiss = event => {
            const target = event.target;
            if (!isDomElement(target) || !container.contains(target)) return;
            const onBackdrop = target === container || Boolean(target.closest(".modal-bg"));
            if (!onBackdrop || this.modalEl.contains(target)) return;

            const clientY = Number(event.clientY);
            const modalBottom = this.modalEl.getBoundingClientRect().bottom;
            // 与 Dida Bridge 一致：一级窗下方命令坞是真正穿透区，其余背景不允许误关。
            if (Number.isFinite(clientY) && clientY > modalBottom) return;

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        };

        const closeAfterCommandDockClick = event => {
            if (this._closing || !this.modalEl?.isConnected) return;
            const target = isDomElement(event.target) ? event.target : null;
            if (target && (this.modalEl.contains(target) || this.core?._popupHost?.contains(target))) return;

            const clientY = Number(event.clientY);
            if (!Number.isFinite(clientY)) return;
            const modalBottom = this.modalEl.getBoundingClientRect().bottom;
            if (clientY <= modalBottom) return;

            queueMicrotask(() => {
                if (this.modalEl?.isConnected && !this._closing) this.close();
            });
        };

        for (const type of backdropEvents)
            eventRoot.addEventListener(type, blockBackdropDismiss, true);
        eventRoot.addEventListener("click", closeAfterCommandDockClick, true);

        this._mobileBackdropCleanup = () => {
            for (const type of backdropEvents)
                eventRoot.removeEventListener(type, blockBackdropDismiss, true);
            eventRoot.removeEventListener("click", closeAfterCommandDockClick, true);
        };
    }

    _teardownMobileBackdropGuard() {
        this._mobileBackdropCleanup?.();
        this._mobileBackdropCleanup = null;
    }

    _setupMobileViewportGeometry() {
        this._teardownMobileViewportGeometry();
        this._mobileFrame = mountMobileFrame(this.modalEl, {
            onOrientation: () => this.core?.dropdown?.invalidateFrame()
        });
    }

    _teardownMobileViewportGeometry() {
        this._mobileFrame?.destroy(); this._mobileFrame = null;
        if (this._autofocusFrame) this._hostWindow().cancelAnimationFrame(this._autofocusFrame);
        this._autofocusFrame = 0;
    }

    _installWindowInteractions(core) {
        if (!core || core._destroyed || !this.modalEl?.isConnected) return;

        if (!Platform.isMobile) {
            this._setupDesktopWindowGeometry();
        }

        if (Platform.isMobile) {
            this._setupMobileViewportGeometry();

            // 移动端自动聚焦只允许由这一处入口触发，并严格受设置开关控制。
            if (this.options.focusInputOnOpen === true || !this.options.externalSession && this.plugin.settings.focusSearchOnMobileOpen) {
                const expectedFocus = this.contentEl.ownerDocument.activeElement;
                const win = this._hostWindow();
                this._autofocusFrame = win.requestAnimationFrame(() => {
                    this._autofocusFrame = win.requestAnimationFrame(() => {
                        this._autofocusFrame = 0;
                        this._focusSearchInput(core, expectedFocus);
                    });
                });
            }
        }

        // Dida Master 3.0.53：一级窗口与桌面鼠标/移动触控共用同一 Swipe-Back Primitive。
        // Picker / Child Dialog / Overlay 作为后注册的更高导航层优先接管；结果卡 Swipe、横向滚动、排序与编辑区自动让位。
        this._swipeBackCleanup?.();
        this._swipeBackCleanup = this.plugin.swipeBack.register(this.modalEl, {
            canGoBack: () => !this._closing && this.modalEl?.isConnected,
            back: () => this.close()
        });

        this._contextMenuCloseHandler = e => {
            const target = isDomElement(e.target) ? e.target : null;
            if (!target) return;
            if (
                target.closest(".local-search-item")
                || target.closest("input, textarea, button, a, select, [contenteditable='true']")
            ) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            this.close();
        };
        this.modalEl.addEventListener("contextmenu", this._contextMenuCloseHandler);
    }

    async _mountSearchCore(externalSession) {
        if (this._closing || !this.modalEl?.isConnected) return false;

        const core = new SearchCore(this.app, this.plugin, this.contentEl, {
            hostKind: "window",
            sharedSearchState: !externalSession,
            sessionKey: externalSession ? "" : "window",
            initialFilterSnapshot: externalSession
                ? this.options.initialFilterSnapshot
                : this.plugin.settings.modalFilterSnapshot,
            initialQuery: externalSession
                ? this.options.initialQuery
                : this.plugin.settings.modalSearchQuery,
            initialSortField: externalSession
                ? this.options.initialSortField
                : this.plugin.settings.modalSortField,
            initialSortDirection: externalSession
                ? this.options.initialSortDirection
                : this.plugin.settings.modalSortDirection,
            initialViewportAnchor: externalSession
                ? null
                : this.plugin.settings.modalViewportAnchor,
            persistModalSession: !externalSession,
            allowedPaths: externalSession ? this.options.allowedPaths : null,
            ignoreResultExclusions: externalSession
                ? this.options.ignoreResultExclusions
                : false,
            onPickFile: externalSession ? this.options.onPickFile : null,
            onOpenFile: externalSession ? this.options.onOpenFile : null,
            closeOnPick: externalSession ? this.options.closeOnPick : true,
            externalSelectionAction: externalSession
                ? this.options.externalSelectionAction
                : null,
            allowCreate: externalSession ? this.options.allowCreate : true,
            createFolder: externalSession ? this.options.createFolder : "",
            createProperties: externalSession ? this.options.createProperties : [],
            createType: externalSession ? this.options.createType : "",
            initialCreate: externalSession && this.options.initialCreate === true,
            onCreated: externalSession ? this.options.onCreated : null,
            headingTitle: externalSession ? this.options.headingTitle : "本地搜索",
            headingCaption: externalSession ? this.options.headingCaption : "你的知识，触手可及",
            // 快捷搜索 Modal 打开文件后退出；外部选择模式继续由 closeOnPick 控制。
            closeAfterFileOpen: true,
            onCloseRequest: closeOptions => this.close(closeOptions)
        });
        this.core = core;

        const initialized = await core.mountShell();
        if (
            !initialized
            || this.core !== core
            || core._destroyed
            || !this.modalEl?.isConnected
        ) {
            if (this.core === core && this.modalEl?.isConnected) this.close();
            return false;
        }

        if (!externalSession) core.restoreSession(this.plugin.settings.createSessionRecovery?.window?.session);
        this._installWindowInteractions(core);

        // Shell 已稳定；结果扫描 / 排序 / 首批虚拟卡片继续进入下一启动任务。
        const expectedFocus = this.contentEl.ownerDocument.activeElement;
        this._startupTimer = this._hostWindow().setTimeout(() => {
            this._startupTimer = null;
            if (this.core !== core || core._destroyed || !this.modalEl?.isConnected) return;
            void core.startResults().then(started => {
                if (this.core !== core || core._destroyed || !this.modalEl?.isConnected) return;
                if (!started) {
                    this.close();
                    return;
                }
                if (!Platform.isMobile) this._focusSearchInput(core, expectedFocus);
            });
        }, 0);
        return true;
    }

    onOpen() {
        // 命令首帧只负责宿主 Modal 外框与固定几何。
        // SearchCore 构造、Shell DOM、状态同步、结果计算全部退出“命令 → 外框出现”同步热路径。
        this.contentEl.empty();
        this.contentEl.addClass("local-search-content");
        this.modalEl.addClass("local-search-modal");
        this.modalEl.closest(".modal-container")?.addClass("local-search-modal-container");
        stripObsidianModalChrome(this.modalEl, this.contentEl);
        this._setupMobileBackdropGuard();

        const externalSession = this.options.externalSession === true;
        if (!Platform.isMobile) this._prepareDesktopWindowGeometry();

        this._startupTimer = this._hostWindow().setTimeout(() => {
            this._startupTimer = null;
            if (this._closing || !this.modalEl?.isConnected) return;
            void this._mountSearchCore(externalSession);
        }, 0);
    }

    _finalizeSearchSessionClose() {
        if (this._searchSessionCloseHandled) return;
        this._searchSessionCloseHandled = true;

        if (this.options.externalSession === true) return;

        const core = this.core;
        if (!core || core._destroyed) return;

        core._persistCurrentModalView();
    }

    /**
     * 一级主窗口唯一关闭入口。
     * X / ESC / 右滑 / 空白右键 / 外部窗口交接全部进入这里；
     * 移动端与 Dida Bridge 一致：同步隐藏并摘除当前 modal-container，避免跨插件切窗叠层残留。
     */
    close(options = {}) {
        if (this._closing) return false;
        if (
            (this.core?.selection?.busy || this.core?._confirmSession?.busy)
            && !this.plugin?._unloaded
        ) {
            new Notice("操作正在执行，请稍候");
            return false;
        }

        const closeOptions = options && typeof options === "object"
            ? options
            : {};
        const core = this.core;
        let persistAfterClose = false;

        if (this.options.externalSession !== true && core && !core._destroyed) {
            // 打开结果可直接把“打开前”的正式锚点交进来；普通 X / ESC 则现场捕获一次。
            // 关闭全过程只规范化 / 比较一次 Session。
            const session = closeOptions.sessionSnapshot
                || core._captureCurrentModalSession();
            persistAfterClose = core._persistModalSessionSnapshot(session, {
                persist: false
            });
            this._searchSessionCloseHandled = true;
        }

        // Geometry 每次变化时已经同步写入 settings 内存；若 120ms 防抖尚未落盘，
        // 关闭时只取消 timer，并并入同一次 settings 写入。
        if (this._geometrySaveTimer) {
            this._hostWindow().clearTimeout(this._geometrySaveTimer);
            this._geometrySaveTimer = null;
            persistAfterClose = true;
        }

        const container = this.modalEl?.closest(".modal-container");
        this._closing = true;
        if (Platform.isMobile && container) container.style.display = "none";
        try {
            this.host?._closeDirect?.();
        } finally {
            if (Platform.isMobile) container?.remove?.();
        }

        if (persistAfterClose && !this.plugin?._unloaded) {
            // UI / Host 已结束，立即冻结快照并交给唯一写链；不再用可被紧随的 unload 丢弃的 timer。
            // 写盘仍是异步，不等待磁盘，不在下一会话改动后才采集这次关闭状态。
            void this.plugin.saveSettings();
        }
        return true;
    }

    onClose() {
        this._closing = true;
        // 防御性兜底：宿主若绕过 close() 直接进入生命周期，仍走同一保存与清理路径。
        this._finalizeSearchSessionClose();
        this._teardownMobileBackdropGuard();
        this._swipeBackCleanup?.();
        this._swipeBackCleanup = null;

        if (this._contextMenuCloseHandler) {
            this.modalEl.removeEventListener(
                "contextmenu",
                this._contextMenuCloseHandler
            );
            this._contextMenuCloseHandler = null;
        }

        if (this._geometrySaveTimer) {
            this._hostWindow().clearTimeout(this._geometrySaveTimer);
            this._geometrySaveTimer = null;
        }
        this._dragCleanup?.();
        this._dragCleanup = null;
        this._resizeCleanup?.();
        this._resizeCleanup = null;

        this._windowResizeCleanup?.();
        this._windowResizeCleanup = null;
        if (this._startupTimer !== null) {
            this._hostWindow().clearTimeout(this._startupTimer);
            this._startupTimer = null;
        }
        const core = this.core;
        this.core = null;
        core?.destroy();

        this._teardownMobileViewportGeometry();
        const modalContainer = this.modalEl?.closest(".modal-container");
        modalContainer?.classList.remove("local-search-modal-container");
        this.host = null;
        // 只清理当前实例引用，避免旧实例的 onClose 影响已打开的新实例。
        if (this.plugin.searchSession === this) this.plugin.searchSession = null;

        const onExternalClose = this.options.onExternalClose;
        this.options.onExternalClose = null;

        // 关闭后清掉外部会话携带的大对象/回调引用。
        this.options.onPickFile = null;
        this.options.onOpenFile = null;
        this.options.externalSelectionAction = null;
        this.options.allowedPaths = null;

        if (typeof onExternalClose === "function") {
            try {
                const result = onExternalClose();
                if (result && typeof result.then === "function") {
                    result.catch(error => {
                        console.warn("外部搜索关闭回调失败", error);
                    });
                }
            } catch (error) {
                console.warn("外部搜索关闭回调失败", error);
            }
        }
    }
}
