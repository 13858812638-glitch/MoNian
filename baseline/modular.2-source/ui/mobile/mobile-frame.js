// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { Platform } from "obsidian";


// Shared mobile frame: CSS owns geometry; this controller owns only a measured
// pre-keyboard frame and extra scroll room only when an input is occluded.
// Hosts own disposal. The provider also releases frames borrowed through its API
// on unload. Embedded cores inherit their host and never bind twice.
export const MOBILE_FRAME_OWNER = Symbol.for("integrated-ui.mobile-frame");

export class MobileFrameController {
    constructor(root, options = {}, onDispose = null) {
        root[MOBILE_FRAME_OWNER]?.destroy();
        this.root = root;
        this.onDispose = onDispose;
        this.win = root.ownerDocument.defaultView;
        this.options = options;
        this.cleanups = [];
        this.frame = 0;
        this.disposed = false;
        this.nativeHeight = 0;
        this.nativeOpen = false;
        this.frameHeight = 0;
        this.restingBottom = this.visualBottom();
        this.restingHeight = this.win.innerHeight;
        this.scrollport = null;
        root[MOBILE_FRAME_OWNER] = this;
        root.classList.add("ui-mobile-frame");
        const listen = (node, type, handler, capture = false) => {
            if (!node) return;
            node.addEventListener(type, handler, capture);
            this.cleanups.push(() => node.removeEventListener(type, handler, capture));
        };
        listen(root, "focusin", event => {
            if (!this.ownsFocus(event.target)) return;
            this.lock(); this.refresh();
        }, true);
        listen(root, "focusout", () => this.refresh(), true);
        listen(root, "input", event => {
            if (this.root.classList.contains("is-ui-keyboard-open") && this.ownsFocus(event.target)) this.refresh();
        }, true);
        const show = event => {
            if (!this.ownsFocus(root.ownerDocument.activeElement)) return;
            this.lock(); this.nativeOpen = true;
            const height = Number(event.keyboardHeight ?? event.detail?.keyboardHeight);
            if (Number.isFinite(height) && height > 0) this.nativeHeight = height;
            this.refresh();
        };
        for (const type of ["keyboardWillShow", "keyboardDidShow"]) listen(this.win, type, show);
        // Keep the frame and inset until the keyboard has actually finished hiding.
        listen(this.win, "keyboardDidHide", () => {
            this.nativeOpen = false; this.nativeHeight = 0; this.refresh();
        });
        for (const type of ["resize", "scroll"]) listen(this.win.visualViewport, type, () => this.refresh());
        listen(this.win, "resize", () => this.refresh());
        listen(this.win, "orientationchange", () => {
            this.unlock(); this.restingBottom = this.visualBottom();
            this.restingHeight = this.win.innerHeight;
            options.onOrientation?.(); this.refresh();
        });
        this.refresh();
    }
    ownsFocus(target) {
        return this.root.contains(target) && target.closest?.(".ui-mobile-frame") === this.root && this.isTextEntry(target);
    }
    isTextEntry(target) {
        return !!target?.matches?.('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="range"]), textarea, select, [contenteditable="true"], [contenteditable=""]');
    }
    visualBottom() {
        const viewport = this.win.visualViewport;
        return viewport ? viewport.offsetTop + viewport.height : this.win.innerHeight;
    }
    get locked() { return this.frameHeight > 0; }
    lock() {
        if (this.disposed || this.locked || !this.root.isConnected) return;
        const rect = this.root.getBoundingClientRect();
        if (rect.height <= 0) return;
        this.frameHeight = rect.height;
        // Native leaves already resize with their host. Keep the editing
        // session/inset bookkeeping, but never freeze a second height over it.
        // Viewport popups still retain their measured frame while editing.
        if (this.options.preserveFrame === false) return;
        this.root.style.setProperty("--ui-mobile-frame-height", `${rect.height}px`);
        this.root.classList.add("is-ui-frame-locked");
    }
    clearScrollport() {
        if (!this.scrollport) return;
        this.scrollport.classList.remove("ui-mobile-keyboard-scrollport");
        for (const name of ["--ui-mobile-scroll-height", "--ui-mobile-scroll-padding", "--ui-mobile-scroll-reserve"]) this.scrollport.style.removeProperty(name);
        this.scrollport = null;
    }
    unlock() {
        this.clearScrollport();
        this.frameHeight = 0;
        this.root.classList.remove("is-ui-frame-locked", "is-ui-keyboard-open");
        this.root.style.removeProperty("--ui-mobile-frame-height");
        this.root.style.removeProperty("--ui-mobile-keyboard-inset");
    }
    refresh() {
        if (this.disposed || this.frame) return;
        this.frame = this.win.requestAnimationFrame(() => {
            this.frame = 0;
            if (this.disposed || !this.root.isConnected) return;
            const active = this.root.ownerDocument.activeElement;
            const editing = this.ownsFocus(active);
            const bottom = this.visualBottom();
            // Obsidian iOS publishes the keyboard inset as a CSS variable; Capacitor
            // hosts may also include it in the native event. Neither moves the frame.
            const nativeHeight = this.nativeOpen ? Math.max(this.nativeHeight,
                Number.parseFloat(this.win.getComputedStyle(this.root.ownerDocument.documentElement).getPropertyValue("--keyboard-height")) || 0) : 0;
            const visibleBottom = nativeHeight > 0 ? Math.min(bottom, this.restingHeight - nativeHeight) : bottom;
            const inset = Math.max(0, this.root.getBoundingClientRect().bottom - visibleBottom);
            const keyboardOpen = this.nativeOpen || (this.locked && bottom < this.restingBottom - 1);
            this.root.classList.toggle("is-ui-keyboard-open", keyboardOpen);
            const nextInset = `${keyboardOpen ? inset : 0}px`;
            if (this.root.style.getPropertyValue("--ui-mobile-keyboard-inset") !== nextInset)
                this.root.style.setProperty("--ui-mobile-keyboard-inset", nextInset);
            if (!keyboardOpen) this.clearScrollport();
            if (this.locked && !editing && !keyboardOpen) {
                this.unlock(); this.options.onSettled?.();
            }
            if (!this.locked && !keyboardOpen) {
                this.restingBottom = bottom; this.restingHeight = this.win.innerHeight;
            }
            if (!editing) return;
            if (!this.locked) this.lock();
            let scroller = active.parentElement;
            while (scroller && scroller !== this.root) {
                if (/(auto|scroll)/.test(this.win.getComputedStyle(scroller).overflowY)) break;
                scroller = scroller.parentElement;
            }
            // A header input must never resize an unrelated results list. Only
            // the ancestor containing the active input can consume keyboard room.
            if (!scroller || scroller === this.root) return;
            const scrollRect = scroller.getBoundingClientRect();
            const controlRect = active.getBoundingClientRect();
            const gap = Number.parseFloat(this.win.getComputedStyle(this.root).getPropertyValue("--ui-mobile-focus-gap")) || 0;
            if (this.scrollport && this.scrollport !== scroller) this.clearScrollport();
            if (keyboardOpen && (this.scrollport === scroller || controlRect.bottom > visibleBottom - gap)) {
                if (!this.scrollport) {
                    this.scrollport = scroller;
                    scroller.style.setProperty("--ui-mobile-scroll-height", `${scrollRect.height}px`);
                    scroller.style.setProperty("--ui-mobile-scroll-padding", this.win.getComputedStyle(scroller).paddingBottom);
                    scroller.classList.add("ui-mobile-keyboard-scrollport");
                }
                // Add reachable space below the last field; preserve the scrollport,
                // footer and outer frame. No keyboard-height cap or upward reflow.
                scroller.style.setProperty("--ui-mobile-scroll-reserve", `${Math.max(0, scrollRect.bottom - visibleBottom + gap)}px`);
            }
            if (this.options.revealFocusedControl?.(active) === true) return;
            const control = active.getBoundingClientRect(), rect = scroller.getBoundingClientRect();
            const top = Math.max(rect.top, this.win.visualViewport?.offsetTop || 0) + gap;
            const end = Math.min(rect.bottom, visibleBottom) - gap;
            if (end <= top) return;
            const delta = control.height > end - top
                ? (control.top >= end ? control.top - top : control.bottom <= top ? control.bottom - end : 0)
                : control.bottom > end ? control.bottom - end : control.top < top ? control.top - top : 0;
            if (delta) scroller.scrollTop += delta;
        });
    }
    destroy() {
        if (this.disposed) return;
        this.disposed = true;
        if (this.frame) this.win.cancelAnimationFrame(this.frame);
        this.frame = 0;
        for (const cleanup of this.cleanups.splice(0)) cleanup();
        this.unlock(); this.root.classList.remove("ui-mobile-frame");
        if (this.root[MOBILE_FRAME_OWNER] === this) delete this.root[MOBILE_FRAME_OWNER];
        this.onDispose?.(); this.onDispose = null;
    }
}

export function mountMobileFrame(root, options = {}, onDispose = null) {
    return Platform.isMobile && root?.ownerDocument?.defaultView ? new MobileFrameController(root, options, onDispose) : null;
}
