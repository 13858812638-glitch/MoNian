// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { registerPickerCleanup } from "../../core/picker-cleanup.js";
import { hostDocument } from "../../utils/dom.js";
import { createSearchButton } from "../components/input-controls.js";
import { MOBILE_FRAME_OWNER, mountMobileFrame } from "../mobile/mobile-frame.js";
import { markSearchPopupActive, topSearchPopupSurface } from "./popup-order.js";
import { Platform, setIcon } from "obsidian";


// 设置面板

/**
 * 顶层 Overlay 的唯一生命周期宿主。
 * 只负责：挂载 / 背景点击 / ESC / 关闭按钮 / 销毁。
 * 业务层只负责向 overlayEl 中渲染自己的 Surface。
 */
export class LocalSearchOverlayHost {
    constructor({ className = "", onClose = null, canClose = null, closeOnContextmenu = false, ownerDocument = null, ownerElement = null, swipeBack = null } = {}) {
        this.className = className;
        this.onClose = onClose;
        this.canClose = canClose;
        this.closeOnContextmenu = closeOnContextmenu;
        this.ownerDocument = ownerDocument;
        this.ownerElement = ownerElement;
        this.swipeBack = swipeBack;
        this.overlayEl = null;
        this._closed = true;
        this._keydownHandler = null;
        this._swipeCleanup = null;
    }

    open() {
        if (this.overlayEl?.isConnected) return this.overlayEl;
        this._closed = false;

        const doc = hostDocument(this.ownerDocument);
        this.ownerDocument = doc;
        // Match SearchCore's native Modal portal boundary. Mounting outside the
        // owning modal loses its focus scope; mounting in the transformed inner
        // .modal would create a different fixed-position coordinate system.
        const owner = this.ownerElement?.isConnected && this.ownerElement.ownerDocument === doc
            ? this.ownerElement : null;
        const mount = owner?.closest(".modal-container") || doc.body;
        const overlay = mount.createDiv({
            cls: `local-search-overlay-host${this.className ? ` ${this.className}` : ""}`,
            attr: { role: "presentation" }
        });
        markSearchPopupActive(overlay);
        overlay.addEventListener("click", event => {
            if (event.target === overlay || event.target === overlay.querySelector(":scope > .local-search-overlay-picker-backdrop")) this.close();
        });
        if (this.closeOnContextmenu) {
            overlay.addEventListener("contextmenu", event => {
                if (event.target !== overlay && event.target !== overlay.querySelector(":scope > .local-search-overlay-picker-backdrop")) return;
                event.preventDefault();
                this.close();
            });
        }
        this._swipeCleanup = this.swipeBack?.register(overlay, {
            canGoBack: () => !this._closed && overlay.isConnected,
            back: () => this.close()
        }) ?? null;

        this._keydownHandler = event => {
            if (event.key !== "Escape" || event.isComposing || event.keyCode === 229) return;
            const target = event.target?.nodeType === 1 ? event.target : doc.activeElement;
            if (!overlay.contains(target)) {
                if ((target !== doc.body && target !== doc.documentElement)
                    || topSearchPopupSurface(doc) !== overlay) return;
            }
            // A nested Dropdown/Dialog retains its own back/transaction owner.
            if (target.closest?.(".local-search-dialog-surface")) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const picker = target.closest?.(".local-search-dropdown");
            if (typeof picker?._lsNavigateBack === "function") picker._lsNavigateBack();
            else this.close();
        };
        doc.addEventListener("keydown", this._keydownHandler, true);

        this.overlayEl = overlay;
        return overlay;
    }

    createCloseButton(surface, { title = "关闭", positioned = false } = {}) {
        const standalonePicker = surface.classList.contains("local-search-command-shared-picker");
        if (standalonePicker && this.overlayEl && !this.overlayEl.querySelector(":scope > .local-search-overlay-picker-backdrop")) {
            // iOS uses the same paint-free host as ordinary Pickers. A sibling
            // backdrop retains outside-click dismissal without wrapping input.
            const backdrop = this.overlayEl.createDiv({ cls: "local-search-overlay-picker-backdrop", attr: { "aria-hidden": "true" } });
            this.overlayEl.prepend(backdrop);
            this.overlayEl.style.setProperty("--ls-overlay-open-order", String(this.overlayEl._lsOpenedOrder));
        }
        if (Platform.isMobile && !surface[MOBILE_FRAME_OWNER]) {
            const frame = mountMobileFrame(surface);
            if (frame) registerPickerCleanup(surface, () => frame.destroy());
        }
        const controls = surface.querySelector(":scope > .local-search-dropdown-title .local-search-picker-title-controls");
        const button = createSearchButton(controls || surface, "action", {
            cls: `local-search-overlay-close${positioned && !controls ? " is-positioned" : ""}`,
            attr: { "aria-label": title }
        });
        setIcon(button, "x");
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            this.close();
        });
        if (!surface.contains(surface.ownerDocument.activeElement)
            && (!Platform.isMobile || (!standalonePicker && this.ownerElement?.matches?.(":focus-visible")))) {
            surface.tabIndex = -1;
            surface.focus({ preventScroll: true });
        }
        return button;
    }

    close({ force = false } = {}) {
        if (this._closed && !this.overlayEl) return;
        if (!force && this.canClose?.() === false) return false;
        const doc = this.ownerDocument;
        const restoreFocus = this.ownerElement?.isConnected
            && (this.overlayEl?.contains(doc?.activeElement) || doc?.activeElement === doc?.body);
        this._closed = true;
        if (this._keydownHandler) {
            this.ownerDocument?.removeEventListener("keydown", this._keydownHandler, true);
            this._keydownHandler = null;
        }
        this._swipeCleanup?.();
        this._swipeCleanup = null;
        this.overlayEl?.remove();
        this.overlayEl = null;
        this.onClose?.();
        if (restoreFocus && this.ownerElement?.isConnected && doc?.activeElement === doc?.body
            && !this.ownerElement.closest("[hidden], [inert]")) {
            this.ownerElement.focus({ preventScroll: true });
        }
    }
}
