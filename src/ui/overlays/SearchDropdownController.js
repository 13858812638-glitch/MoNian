// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { disposePickerCleanup, registerPickerCleanup } from "../../core/picker-cleanup.js";
import { createDialogSubmission } from "../dialogs/submission.js";
import { MOBILE_FRAME_OWNER, mountMobileFrame } from "../mobile/mobile-frame.js";
import { configureSharedPickerHeader } from "../pickers/picker-header.js";
import { resolveDropdownViewportBounds } from "./geometry.js";
import { resolveSidebarPopupBounds } from "./sidebar-popup.js";
import { markSearchPopupActive, topSearchPopupSurface } from "./popup-order.js";
import { readCssNumber } from "../../utils/dom.js";
import { Notice, Platform } from "obsidian";

// ========== SearchCore Dropdown：唯一 Surface / 监听 / 定位 / Escape 生命周期 ==========
export class SearchDropdownController {
    constructor(owner) {
        this.owner = owner;
        this.panel = null;
        this.anchor = null;
        this.anchorWasCurrent = false;
        this.suppressClickUntil = 0;
        this._outsideHandler = e => this._handleOutside(e);
        this._keyHandler = e => this.handleEscape(e);
        this._contextHandler = e => this._handleContextMenu(e);
        this._clickGuardHandler = e => this._handleClickGuard(e);
        this._positionHandler = () => this._queueReposition();
        this._positionFrame = 0;
        this._listenersCleanup = null;
        this._resizeObserver = null;
        this._backHandler = null;
        // 子 Picker 只暂存父 Surface，不销毁父 DOM。关闭子 Picker 时原位返回，
        // 保留结果视图的滚动位置、折叠状态与已构建 Row，避免重复重建。
        this._panelStack = [];
        this._frameLock = null;
        this._refreshHandlers = new Map();
    }

    get isOpen() {
        return Boolean(this.panel);
    }

    get busy() {
        return Boolean(this.panel?._lsSubmission?.busy || this.owner?._confirmSession?.busy);
    }

    submissionFor(panel) {
        if (!panel || !panel.isConnected || !this.isActivePanel(panel) || this.owner?._destroyed) return null;
        if (!panel._lsSubmission) {
            panel._lsSubmission = createDialogSubmission(panel,
                () => !this.owner?._destroyed && panel.isConnected && this.isActivePanel(panel),
                () => this.close(false),
                (error, message) => new Notice(error?.message || message));
            registerPickerCleanup(panel, () => { delete panel._lsSubmission; });
        }
        return panel._lsSubmission;
    }

    isOpenFor(anchor) {
        return Boolean(
            (this.panel && this.anchor === anchor)
            || this._panelStack.some(frame => frame.anchor === anchor)
        );
    }

    isActivePanel(panel) {
        return Boolean(panel && this.panel === panel);
    }

    setRefreshHandler(panel, handler) {
        this._refreshHandlers.set(panel, handler);
        registerPickerCleanup(panel, () => this._refreshHandlers.delete(panel));
    }

    refresh(change = null) {
        for (const [panel, handler] of this._refreshHandlers) {
            if (panel.isConnected) handler(change);
        }
    }

    closeIfSameAnchor(anchor) {
        if (!this.panel || this.anchor !== anchor) return false;
        this.close();
        return true;
    }

    _disposePanelFrame(panel, anchor, anchorWasCurrent) {
        const portal = panel?.parentElement;
        anchor?.setAttribute("aria-expanded", "false");
        if (anchor && !anchorWasCurrent) {
            anchor.classList.remove("is-current");
        }
        disposePickerCleanup(panel);
        panel?.remove();
        // Match the working mobile Picker lifecycle: a completed workflow
        // releases its empty portal. A hidden parent or another surface keeps
        // the portal alive; native editing nodes are never moved/recreated.
        if (Platform.isMobile && portal === this.owner?._popupHost
            && portal && !portal.childElementCount) {
            this.owner.plugin._hoverHintObserver?.forgetRoot(portal);
            portal.remove();
            this.owner._popupHost = null;
        }
    }

    close(restoreFocus = true, { returnToParent = true, force = false } = {}) {
        if (!force && !this.owner?._destroyed && this.busy) return false;
        const panel = this.panel;
        const anchor = this.anchor;
        const anchorWasCurrent = this.anchorWasCurrent;
        const containedFocus = panel?.contains(panel.ownerDocument.activeElement);
        const owner = this.owner;

        if (panel && owner?._confirmSession?.ownerPanel === panel) {
            const session = owner._confirmSession;
            session.finish(false, { force: force || Boolean(owner._destroyed), restoreFocus: false });
            if (!session.settled) return false;
        }

        this.panel = null;
        this.anchor = null;
        this.suppressClickUntil = 0;
        this._backHandler = null;
        this.anchorWasCurrent = false;
        this._frameLock = null;
        // close() 允许在“当前没有活动 Panel、但 ResizeObserver 已创建”的状态下重复调用。
        // ResizeObserver.unobserve(null) 会直接抛 DOM TypeError，并中断 SearchWindowSession.onClose，
        // 因而必须只对真实 Element 解除观察。
        if (panel) this._resizeObserver?.unobserve?.(panel);
        this._disposePanelFrame(panel, anchor, anchorWasCurrent);

        if (
            returnToParent
            && this._panelStack.length
            && owner
            && !owner._destroyed
        ) {
            const frame = this._panelStack.pop();
            this.panel = frame.panel;
            this.anchor = frame.anchor;
            this.anchorWasCurrent = frame.anchorWasCurrent;
            this._backHandler = frame.backHandler;
            this._frameLock = frame.frameLock || null;
            frame.panel.hidden = false;
            frame.panel[MOBILE_FRAME_OWNER]?.refresh();
            markSearchPopupActive(frame.panel);
            frame.anchor?.classList.add("is-current");
            frame.anchor?.setAttribute("aria-expanded", "true");
            this._resizeObserver?.observe(frame.panel);
            this._positionHandler();

            const returnFocusEl = frame.returnFocusEl?.isConnected
                ? frame.returnFocusEl
                : frame.panel._lsKeyboardOpened ? frame.panel : null;
            if (
                returnFocusEl?.isConnected
                && frame.panel.contains(returnFocusEl)
                && (containedFocus || frame.panel.ownerDocument.activeElement === frame.panel.ownerDocument.body)
                && returnFocusEl.ownerDocument.activeElement !== returnFocusEl
            ) {
                returnFocusEl.focus({ preventScroll: true });
            }

            if (owner?.resultControls?.ownsAnchor(anchor)) {
                owner.resultControls.sync();
            }
            if (owner?.resultControls?.ownsAnchor(frame.anchor)) {
                owner.resultControls.sync();
            }
            return;
        }

        // 关闭整个 Dropdown 工作流时，一次性清理所有暂存父 Surface。
        while (this._panelStack.length) {
            const frame = this._panelStack.pop();
            this._resizeObserver?.unobserve?.(frame.panel);
            this._disposePanelFrame(
                frame.panel,
                frame.anchor,
                frame.anchorWasCurrent
            );
        }

        this._listenersCleanup?.();
        this._listenersCleanup = null;
        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
        this._frameLock = null;

        if (owner?.resultControls?.ownsAnchor(anchor)) {
            owner.resultControls.sync();
        }
        if (restoreFocus && containedFocus && anchor?.isConnected) {
            anchor.focus({ preventScroll: true });
        }
        owner?._scheduleResultIndexUpdate?.();
        owner?.navigator?.didClosePicker();
    }

    destroy() {
        this.close(false, { returnToParent: false, force: true });
        this._panelStack.length = 0;
        this.owner = null;
    }

    _cssMetric(name, style) {
        const host = this.owner?.containerEl?.isConnected
            ? this.owner.containerEl : this.owner?.modalEl;
        return readCssNumber(host, name, style);
    }

    _captureFrame(panel) {
        if (!panel?.isConnected) return null;
        const rect = panel.getBoundingClientRect();
        const width = Math.max(0, Math.round(rect.width || panel.offsetWidth || 0));
        const height = Math.max(0, Math.round(rect.height || panel.offsetHeight || 0));
        if (!width || !height) return null;
        return {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width,
            height
        };
    }

    _applyFrameLock(panel, frame) {
        if (!panel?.isConnected || !frame) return false;
        const bounds = resolveSidebarPopupBounds(this.owner);
        if (bounds) {
            const width = Math.min(frame.width, bounds.width), height = Math.min(frame.height, bounds.height);
            frame = { width, height,
                left: Math.max(bounds.left, Math.min(frame.left, bounds.right - width)),
                top: Math.max(bounds.top, Math.min(frame.top, bounds.bottom - height)) };
        }
        const sizes = {
            "--ls-dropdown-width": `${frame.width}px`,
            "--ls-dropdown-height": `${frame.height}px`,
            "--ls-dropdown-live-width": `${frame.width}px`,
            "--ls-dropdown-fixed-height": "var(--ls-dropdown-height)"
        };
        for (const [name, value] of Object.entries(sizes)) {
            if (panel.style.getPropertyValue(name) !== value) panel.style.setProperty(name, value);
        }
        panel.style.left = `${frame.left}px`;
        panel.style.top = `${frame.top}px`;
        return true;
    }

    _sizeContract(panel, style = null) {
        const metric = name => this._cssMetric(name, style);
        const size = panel?.dataset?.lsDropdownSize || "default";
        if (panel?.classList?.contains("local-search-facet-picker")) {
            const createMetadata = panel.classList.contains(
                "is-create-metadata-picker"
            );
            return {
                mobileWidth: metric("--ls-dropdown-default-mobile-width"),
                desktopWidth: null,
                maxHeight: metric("--ls-filter-picker-max-height"),
                // 创建模式五类元数据 Picker 在移动端属于同一编辑 Surface：
                // 不允许因标签/属性入口位于顶部、文件夹/类型/模板入口位于摘要区
                // 而产生两套 Y 坐标。Anchor 仍保留 aria / Current / 焦点恢复职责；
                // 桌面端 reposition() 继续沿用原 Anchor 定位。
                placement: createMetadata ? "create-metadata" : "anchor",
                anchorAlign: "start",
                anchorGap: metric("--ls-filter-picker-anchor-gap"),
                fixedHeight: true
            };
        }
        if (size === "view-composer") {
            const width = metric("--ls-view-composer-width");
            return {
                mobileWidth: width,
                desktopWidth: width,
                maxHeight: metric("--ls-view-composer-max-height"),
                placement: "anchor",
                fixedHeight: true
            };
        }
        if (size === "navigator-actions") {
            return {
                mobileWidth: metric("--ls-dropdown-default-mobile-width"),
                desktopWidth: metric("--ls-nav-action-desktop-width"),
                maxHeight: metric("--ls-nav-action-max-height"),
                placement: Platform.isMobile ? "center" : "anchor",
                fixedHeight: true
            };
        }
        if (size === "compact-view") {
            return {
                mobileWidth: metric("--ls-compact-view-mobile-width"),
                desktopWidth: metric("--ls-compact-view-desktop-width"),
                maxHeight: metric("--ls-compact-view-max-height"),
                placement: "anchor"
            };
        }
        if (size === "compact-create") {
            return {
                mobileWidth: metric("--ls-compact-create-width"),
                desktopWidth: metric("--ls-compact-create-width"),
                maxHeight: metric("--ls-compact-create-max-height"),
                placement: Platform.isMobile ? "upper-center" : "anchor"
            };
        }
        return {
            mobileWidth: metric("--ls-dropdown-default-mobile-width"),
            desktopWidth: null,
            maxHeight: metric("--ls-dropdown-default-max-height"),
            fixedHeight: Platform.isMobile,
            placement: "center"
        };
    }

    _queueReposition() {
        if (this._positionFrame || !this.panel?.isConnected) return;
        const win = this.panel.ownerDocument.defaultView;
        this._positionFrame = win.requestAnimationFrame(() => {
            this._positionFrame = 0;
            this.reposition();
        });
    }

    _revealPanel(panel) {
        if (panel.style.visibility) panel.style.removeProperty("visibility");
        // Bind once, after the final CSS surface is visible. Repositioning an
        // already visible panel must not restart its keyboard/frame lifecycle.
        if (Platform.isMobile && !panel[MOBILE_FRAME_OWNER]) {
            const mobileFrame = mountMobileFrame(panel, { onOrientation: () => this.invalidateFrame() });
            if (mobileFrame) registerPickerCleanup(panel, () => mobileFrame.destroy());
        }
        if (!Object.prototype.hasOwnProperty.call(panel, "_lsInitialFocus")) return;
        const expected = panel._lsInitialFocus;
        delete panel._lsInitialFocus;
        const active = panel.ownerDocument.activeElement;
        // Only keyboard navigation transfers focus to dialog chrome. Touch
        // opening never performs a delayed focus handoff while iOS is closing
        // its keyboard; the next native input tap starts its own edit session.
        if (!Platform.isMobile && panel._lsKeyboardOpened && this.isActivePanel(panel) && panel.isConnected
            && (active === expected || active === panel.ownerDocument.body)) {
            panel.focus({ preventScroll: true });
        }
    }

    reposition() {
        const owner = this.owner;
        const panel = this.panel;
        const anchor = this.anchor;
        if (!owner || !panel?.isConnected || !anchor?.isConnected) return;
        if (!Platform.isMobile && owner.hostKind === "sidebar" && !owner.containerEl.getClientRects().length) {
            panel.style.visibility = "hidden";
            return;
        }
        // 子 Picker 继承父 Frame；移动端固定尺寸 Picker 首次定位后也保留
        // 同一 Frame，后续 focus / resize / 标题模式更新不再二次计算几何。
        if (!Platform.isMobile && this._frameLock && this._applyFrameLock(panel, this._frameLock)) {
            this._revealPanel(panel);
            return;
        }

        const mobile = Platform.isMobile;
        const metricHost = owner.containerEl?.isConnected ? owner.containerEl : owner.modalEl;
        const style = metricHost?.ownerDocument.defaultView.getComputedStyle(metricHost);
        const metric = name => this._cssMetric(name, style);
        const contract = this._sizeContract(panel, style);
        // Large mobile pickers share one CSS frame regardless of entry point.
        // Anchor geometry remains a desktop/compact-menu concern only.
        const sheet = mobile && !["compact-view", "compact-create"].includes(panel.dataset.lsDropdownSize);
        if (panel.classList.contains("ui-mobile-picker-sheet") !== sheet) panel.classList.toggle("ui-mobile-picker-sheet", sheet);
        if (sheet) {
            this._frameLock = null;
            for (const key of ["left", "top", "--ls-dropdown-width", "--ls-dropdown-height", "--ls-dropdown-live-width", "--ls-dropdown-fixed-height"])
                if (panel.style.getPropertyValue(key)) panel.style.removeProperty(key);
            this._revealPanel(panel);
            return;
        }
        const bounds = resolveDropdownViewportBounds(owner.containerEl, metric(
            mobile ? "--ls-dropdown-mobile-viewport-inset" : "--ls-dropdown-desktop-viewport-inset",
            mobile ? 16 : 8
        ));
        const widthLimit = mobile ? Math.min(contract.mobileWidth, bounds.width) : bounds.width;
        const requestedWidth = mobile ? widthLimit
            : contract.desktopWidth == null ? null : Math.min(contract.desktopWidth, widthLimit);
        const preferredHeight = mobile ? bounds.height * metric("--ls-dropdown-mobile-height-ratio") : bounds.height;
        const heightLimit = Math.max(0, Math.min(contract.maxHeight, bounds.height, Math.max(metric("--ls-dropdown-min-height"), preferredHeight)));

        // 只发布测量后的尺寸 Token；CSS 是 width / height / max-size 的唯一消费出口。
        // 无固定宽高的类型移除覆盖，回到原组件合同；不再另写同义 style.width/height。
        const sizes = {
            "--ls-dropdown-width": `${Math.round(widthLimit)}px`,
            "--ls-dropdown-height": `${Math.floor(heightLimit)}px`,
            "--ls-dropdown-live-width": requestedWidth == null ? "" : `${Math.round(requestedWidth)}px`,
            "--ls-dropdown-fixed-height": contract.fixedHeight ? "var(--ls-dropdown-height)" : ""
        };
        for (const [name, value] of Object.entries(sizes)) {
            if (panel.style.getPropertyValue(name) === value) continue;
            if (value) panel.style.setProperty(name, value);
            else panel.style.removeProperty(name);
        }

        const width = Math.min(panel.offsetWidth || widthLimit, widthLimit);
        const height = Math.min(panel.offsetHeight || heightLimit, heightLimit);
        const anchorRect = anchor.getBoundingClientRect();
        let left;
        let top;
        if (!mobile || contract.placement === "anchor") {
            const gap = Number.isFinite(contract.anchorGap) ? contract.anchorGap : metric("--ls-dropdown-anchor-gap");
            const requestedLeft = !mobile || contract.anchorAlign === "start"
                ? anchorRect.left : anchorRect.right - width;
            left = Math.max(bounds.left, Math.min(requestedLeft, bounds.right - width));
            const below = bounds.bottom - anchorRect.bottom - gap;
            const above = anchorRect.top - bounds.top - gap;
            const requestedTop = below >= height || below >= above
                ? anchorRect.bottom + gap : anchorRect.top - height - gap;
            top = Math.max(bounds.top, Math.min(requestedTop, bounds.bottom - height));
        } else {
            left = bounds.left + Math.max(0, (bounds.width - width) / 2);
            const freeHeight = Math.max(0, bounds.height - height);
            if (contract.placement === "create-metadata") top = bounds.top;
            else if (contract.placement === "upper-center") {
                top = bounds.top + Math.min(freeHeight, Math.min(metric("--ls-dropdown-upper-offset-max"), Math.max(metric("--ls-dropdown-upper-offset-min"), freeHeight * metric("--ls-dropdown-upper-offset-ratio"))));
            } else top = bounds.top + freeHeight / 2;
        }
        panel.style.left = `${Math.round(left)}px`;
        panel.style.top = `${Math.round(top)}px`;
        // 首次已完成完整 DOM 构建后锁定：只针对移动端已有 fixedHeight 合同，
        // 不能把内容随时长高的紧凑 Picker 锁死。
        if (mobile && contract.fixedHeight) {
            this._frameLock = {
                left: Math.round(left), top: Math.round(top),
                width: Math.round(width), height: Math.round(height)
            };
        }
        this._revealPanel(panel);
    }

    invalidateFrame() {
        this._frameLock = null;
        for (const frame of this._panelStack) frame.frameLock = null;
        this._queueReposition();
    }

    setBackHandler(panel, handler) {
        if (!this.isActivePanel(panel)) return;
        this._backHandler = typeof handler === "function" ? handler : null;
    }

    _navigateBack(panel) {
        if (!this.isActivePanel(panel) || this.busy) return;
        if (this._backHandler) {
            this._backHandler();
            return;
        }
        this.close(false);
    }

    _bindSwipeBack(panel) {
        const cleanup = this.owner?.plugin?.swipeBack?.register(panel, {
            canGoBack: () => this.isActivePanel(panel),
            back: () => this._navigateBack(panel)
        }) ?? (() => {});
        registerPickerCleanup(panel, cleanup);
    }

    _mountPanel(anchor, title, { bindGlobalListeners = true, frameLock = null, keyboardOpened = null } = {}) {
        const owner = this.owner;
        if (!owner || !anchor) return null;

        const panel = owner.popupSurfaceHost().createDiv({
            cls: "local-search-dropdown",
            attr: { role: "dialog", "aria-label": title,
                ...(!Platform.isMobile ? { tabindex: "-1" } : {}) }
        });
        // 默认 top/left 为 auto：不能在第一轮 rAF 定位前露出临时静态位置。
        // visibility:hidden 仍参与尺寸测量；第一次成功定位才显示。
        panel.style.visibility = "hidden";
        panel.createDiv({ cls: "local-search-dropdown-title", text: title });
        panel._lsInitialFocus = panel.ownerDocument.activeElement;
        // :focus-visible on an input does not distinguish a finger tap from
        // keyboard navigation. Mobile chrome must not become a competing
        // focus target before the next native input tap (including child return).
        panel._lsKeyboardOpened = !Platform.isMobile && (keyboardOpened ?? true);
        markSearchPopupActive(panel);
        panel._lsNavigateBack = () => this._navigateBack(panel);
        configureSharedPickerHeader(panel, { headingText: title });
        registerPickerCleanup(panel, () => {
            delete panel._lsInitialFocus;
            delete panel._lsKeyboardOpened;
            delete panel._lsNavigateBack;
        });

        this.panel = panel;
        this.anchor = anchor;
        this._frameLock = frameLock;
        this.anchorWasCurrent = anchor.classList.contains("is-current");
        anchor.classList.add("is-current");
        anchor.setAttribute("aria-expanded", "true");
        anchor.setAttribute("aria-haspopup", "dialog");

        this._bindSwipeBack(panel);
        panel.addEventListener("contextmenu", this._contextHandler);
        panel.addEventListener("click", this._clickGuardHandler, true);

        const doc = panel.ownerDocument;
        const win = doc.defaultView;
        if (bindGlobalListeners) {
            const sidebar = !Platform.isMobile && owner.hostKind === "sidebar";
            const sidebarScroll = event => {
                const target = event.target;
                // Only scrolls that can move the leaf or an owning anchor
                // change this popup's geometry. The other pane is independent.
                if (target === doc || target?.contains?.(owner.containerEl)
                    || (owner.containerEl?.contains(target)
                        && [this.anchor, ...(this._panelStack || []).map(frame => frame.anchor)]
                            .some(anchor => anchor && target.contains(anchor)))) this._queueReposition();
            };
            if (sidebar) doc.addEventListener("scroll", sidebarScroll, true);
            doc.addEventListener("click", this._outsideHandler, true);
            // The parent input outlives this Picker: gate edits without changing
            // its readonly state, which would otherwise survive a forced close.
            const input = owner.searchInput;
            const guardInput = event => { if (this.busy) event.preventDefault(); };
            input?.addEventListener("beforeinput", guardInput);
            // One keyboard owner follows the popup lifecycle. Touch does not
            // need artificial surface focus merely to make Escape reach it.
            // handleEscape still rejects events owned by another core/dialog.
            doc.addEventListener("keydown", this._keyHandler, true);
            // Dida Master v1.1.0：移动 Picker 打开后锁定 Layout Frame。
            // 软键盘的 visualViewport / resize 动画只影响内部可见高度，
            // 不再让 Dropdown Controller 重复排队 reposition。桌面仍实时跟随窗口几何。
            if (!Platform.isMobile) {
                win.addEventListener("resize", this._positionHandler);
                win.visualViewport?.addEventListener("resize", this._positionHandler);
                win.visualViewport?.addEventListener("scroll", this._positionHandler);
            }
            // 清理捕获注册时的文档/窗口，不能在关闭时改去主窗口解绑。
            this._listenersCleanup = () => {
                if (sidebar) doc.removeEventListener("scroll", sidebarScroll, true);
                doc.removeEventListener("click", this._outsideHandler, true);
                input?.removeEventListener("beforeinput", guardInput);
                doc.removeEventListener("keydown", this._keyHandler, true);
                if (!Platform.isMobile) {
                    win.removeEventListener("resize", this._positionHandler);
                    win.visualViewport?.removeEventListener("resize", this._positionHandler);
                    win.visualViewport?.removeEventListener("scroll", this._positionHandler);
                }
                if (this._positionFrame) win.cancelAnimationFrame(this._positionFrame);
                this._positionFrame = 0;
            };
        }

        if (!Platform.isMobile) {
            this._resizeObserver ??= new win.ResizeObserver(this._positionHandler);
            this._resizeObserver.observe(panel);
            if (owner.hostKind === "sidebar") this._resizeObserver.observe(owner.containerEl);
        }
        this._positionHandler();
        return panel;
    }

    open(anchor, title) {
        const owner = this.owner;
        if (!owner || !anchor || this.busy) return null;

        if (this.close(false, { returnToParent: false }) === false) return null;
        this._frameLock = null;
        return this._mountPanel(anchor, title, { bindGlobalListeners: true, frameLock: null });
    }

    // 子 Picker 复用同一个 Dropdown Controller，但只暂存父 Surface。
    // 父结果视图不销毁、不重建；关闭子 Picker 后原位恢复。
    openChild(anchor, title) {
        const owner = this.owner;
        if (!owner || !anchor || this.busy) return null;
        if (!this.panel) return this.open(anchor, title);

        const childFrame = this._captureFrame(this.panel);
        const parentDocument = this.panel.ownerDocument;
        const active = parentDocument.activeElement;
        const returnFocusEl = this.panel.contains(active)
            && active?.matches?.(":focus-visible")
            // Text inputs match :focus-visible after a finger tap as well.
            // Refocusing one on a later child close cannot restore the iOS
            // keyboard's native edit session and must be left to a real tap.
            && (!Platform.isMobile || !this._isEditableTarget(active))
                ? active
                : null;
        const parent = {
            panel: this.panel,
            anchor: this.anchor,
            anchorWasCurrent: this.anchorWasCurrent,
            backHandler: this._backHandler,
            frameLock: this._frameLock,
            returnFocusEl
        };
        parent.panel.hidden = true;
        this._resizeObserver?.unobserve?.(parent.panel);
        this._panelStack.push(parent);

        this.panel = null;
        this.anchor = null;
        this.anchorWasCurrent = false;
        this._backHandler = null;
        this._frameLock = null;
        this.suppressClickUntil = 0;

        return this._mountPanel(
            anchor,
            title,
            { bindGlobalListeners: false, frameLock: childFrame,
                // Hiding the parent already released its DOM focus. Carry
                // keyboard intent across that transition instead of inferring
                // it afterwards from BODY or a hidden anchor.
                keyboardOpened: !Platform.isMobile || Boolean(returnFocusEl) }
        );
    }

    _handleOutside(event) {
        const owner = this.owner;
        const panel = this.panel;
        const anchor = this.anchor;
        if (!owner || !panel || !anchor) return;
        if (panel.contains(event.target) || anchor.contains(event.target)) return;

        if (!owner.containerEl.contains(event.target)) {
            // Another host owns this interaction. Never swallow its click or close its children.
            if (!event.target?.closest?.(".local-search-content, .dida-bridge-task-center")) this.close(false);
            return;
        }
        const target = event.target?.nodeType === 1 ? event.target : null;
        if (target?.closest(".local-search-dialog-backdrop, .local-search-dialog-surface")) {
            return;
        }

        if (this.busy) {
            event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
            return;
        }
        const interactive = target?.closest(
            'button, [role="button"], a[href], input, textarea, select'
        );
        const isOwnedInteractive = Boolean(
            interactive
            && owner.containerEl?.contains(interactive)
        );

        // Picker 切换只走 click capture：同一次 click 中先同步关闭旧 Surface，
        // 随后目标按钮自己的 click handler 立即打开新 Surface。浏览器在本次事件返回前不会绘制，
        // 因此不存在“pointerdown 先关闭、pointerup/click 再打开”的空白闪帧。
        if (isOwnedInteractive) {
            this.close(false, { returnToParent: false });
            return;
        }

        // 点击真正的非交互空白区域只负责关闭当前 Picker，避免事件穿透到底层结果卡。
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.close(false);
    }

    _handleContextMenu(event) {
        if (!this.panel?.contains(event.target)) return;
        // Native text selection/caret menus belong to the editable control.
        // Suppressing them also suppresses WebKit's subsequent caret click.
        if (this._isEditableTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (Platform.isMobile) {
            this.suppressClickUntil = performance.now() + 800;
            return;
        }
        this.close(false);
    }

    _handleClickGuard(event) {
        if (!this.busy && (!Platform.isMobile || performance.now() > this.suppressClickUntil)) return;
        if (!this.busy && this._isEditableTarget(event.target)) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    _isEditableTarget(target) {
        const element = target?.nodeType === 1 ? target : target?.parentElement;
        const editable = element?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
        return Boolean(editable && this.panel?.contains(editable));
    }

    handleEscape(event) {
        const owner = this.owner;
        if (!owner || !this.panel || event.defaultPrevented) return false;
        const target = event.target?.nodeType === 1 ? event.target : this.panel.ownerDocument.activeElement;
        const insidePanel = this.panel.contains(target);
        const doc = this.panel.ownerDocument;
        const unfocusedEscape = event.key === "Escape" && (target === doc.body || target === doc.documentElement);
        if (unfocusedEscape) {
            if (topSearchPopupSurface(doc) !== this.panel) return false;
        } else if (!insidePanel && !owner.containerEl?.contains(target)) return false;
        const targetPicker = target?.closest?.(".local-search-dropdown");
        if (targetPicker && targetPicker !== this.panel) return false;
        const targetCore = target?.closest?.(".local-search-content");
        if (!insidePanel && targetCore && targetCore !== owner.containerEl) return false;
        if (target?.closest(".local-search-dialog-surface, .dida-bridge-task-center")) return false;
        if (this.panel._lsSubmission?.busy && !["Escape", "Tab"].includes(event.key)) {
            event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
            return true;
        }
        if (event.isComposing || event.keyCode === 229 || event.key !== "Escape") return false;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        this._navigateBack(this.panel);
        return true;
    }
}
