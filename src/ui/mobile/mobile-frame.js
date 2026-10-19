// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { Platform } from "obsidian";

// One keyboard/viewport environment per document; per-surface frames consume it.
// Focus is native. Neither the environment nor a frame calls focus()/blur().
// Hosts still own frame disposal; the last frame releases all global listeners.
export const MOBILE_FRAME_OWNER = Symbol.for("integrated-ui.mobile-frame");
const mobileViewports = new WeakMap();
const textEntry = target => !!target?.matches?.('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="range"]), textarea, select, [contenteditable="true"], [contenteditable=""]');
const viewportBottom = win => win.visualViewport ? win.visualViewport.offsetTop + win.visualViewport.height : win.innerHeight;

class MobileViewportState {
    constructor(doc) {
        this.doc = doc;
        this.win = doc.defaultView;
        this.frames = new Set();
        this.cleanups = [];
        this.nativeOpen = false;
        this.nativeHeight = 0;
        this.restingHeight = this.win.innerHeight;
        const listen = (target, type, handler) => {
            if (!target) return;
            target.addEventListener(type, handler);
            this.cleanups.push(() => target.removeEventListener(type, handler));
        };
        const refresh = () => { for (const frame of this.frames) frame.refresh(); };
        const show = event => {
            this.nativeOpen = true;
            const height = Number(event.keyboardHeight ?? event.detail?.keyboardHeight);
            if (Number.isFinite(height) && height > 0) this.nativeHeight = height;
            refresh();
        };
        for (const type of ["keyboardWillShow", "keyboardDidShow"]) listen(this.win, type, show);
        listen(this.win, "keyboardDidHide", () => {
            this.nativeOpen = false; this.nativeHeight = 0; refresh();
        });
        for (const type of ["resize", "scroll"]) listen(this.win.visualViewport, type, refresh);
        listen(this.win, "resize", refresh);
        listen(this.win, "orientationchange", () => {
            this.restingHeight = this.win.innerHeight;
            for (const frame of this.frames) {
                frame.unlock(); frame.baseHeight = 0;
                frame.options.onOrientation?.(); frame.refresh();
            }
        });
    }
    snapshot() {
        const bottom = viewportBottom(this.win);
        // The host CSS inset is a present-time signal, NOT conditional on this
        // particular surface receiving a keyboardWillShow edge.
        const cssHeight = Math.max(0, Number.parseFloat(this.win.getComputedStyle(this.doc.documentElement).getPropertyValue("--keyboard-height")) || 0);
        const height = Math.max(cssHeight, this.nativeOpen ? this.nativeHeight : 0);
        // Geometry is not an OS keyboard signal. Browser chrome, native leaf
        // resize, pinch and subpixel rounding must never enter/retain keyboard
        // mode. Keep host signals; remove the viewport guess and open-state latch.
        const open = this.nativeOpen || height > 0;
        if (!open) this.restingHeight = this.win.innerHeight;
        return { open, bottom: height > 0 ? Math.min(bottom, this.restingHeight - height) : bottom };
    }
    release(frame) {
        this.frames.delete(frame);
        if (this.frames.size) return;
        for (const cleanup of this.cleanups.splice(0)) cleanup();
        mobileViewports.delete(this.doc);
    }
}

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
        this.frameHeight = 0;
        this.baseHeight = 0;
        this.scrollport = null;
        const doc = root.ownerDocument;
        this.viewport = mobileViewports.get(doc);
        if (!this.viewport) mobileViewports.set(doc, this.viewport = new MobileViewportState(doc));
        this.viewport.frames.add(this);
        root[MOBILE_FRAME_OWNER] = this;
        root.classList.add("ui-mobile-frame");
        const listen = (type, handler) => {
            root.addEventListener(type, handler, true);
            this.cleanups.push(() => root.removeEventListener(type, handler, true));
        };
        listen("focusin", event => {
            if (!this.ownsFocus(event.target)) return;
            // Read the base before the keyboard animation, without changing a
            // focused element's ancestors. Hardware-keyboard focus needs no lock.
            if (!this.locked) this.baseHeight = root.getBoundingClientRect().height;
            this.refresh();
        });
        listen("focusout", () => this.refresh());
        listen("input", event => {
            if (this.root.classList.contains("is-ui-keyboard-open") && this.ownsFocus(event.target)) this.refresh();
        });
        this.refresh();
    }
    ownsFocus(target) {
        return this.root.contains(target) && target.closest?.(".ui-mobile-frame") === this.root && this.isTextEntry(target);
    }
    isTextEntry(target) { return textEntry(target); }
    visualBottom() { return viewportBottom(this.win); }
    get locked() { return this.frameHeight > 0; }
    lock() {
        if (this.disposed || this.locked || !this.root.isConnected) return;
        const height = this.baseHeight || this.root.getBoundingClientRect().height;
        if (height <= 0) return;
        this.frameHeight = height;
        // Native leaves already resize with their host; never give them a second
        // fixed outer height. CSS popups retain the measured pre-keyboard frame.
        if (this.options.preserveFrame === false) return;
        this.root.style.setProperty("--ui-mobile-frame-height", `${height}px`);
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
            if (this.disposed || !this.root.isConnected || this.root.hidden || this.root.style.visibility === "hidden") return;
            const active = this.root.ownerDocument.activeElement;
            const editing = this.ownsFocus(active);
            const state = this.viewport.snapshot();
            if (!state.open) {
                const wasLocked = this.locked;
                if (wasLocked || this.scrollport) this.unlock();
                this.baseHeight = this.root.getBoundingClientRect().height;
                if (wasLocked) this.options.onSettled?.();
                return;
            }
            // Native workspaces use the host's leaf and must never lock on a
            // foreign input. However a newly opened Picker owns a preserved
            // popup frame and *must* see an already-open OS keyboard before its
            // input receives focus (the native caret handoff path).
            if (!editing && this.options.preserveFrame === false) {
                if (this.locked || this.scrollport || this.root.classList.contains("is-ui-keyboard-open")) this.unlock();
                return;
            }
            if (!this.locked) this.lock();
            if (!this.locked) return;
            const visibleBottom = state.bottom;
            const inset = Math.max(0, this.root.getBoundingClientRect().bottom - visibleBottom);
            if (!this.root.classList.contains("is-ui-keyboard-open")) this.root.classList.add("is-ui-keyboard-open");
            const nextInset = `${inset}px`;
            if (this.root.style.getPropertyValue("--ui-mobile-keyboard-inset") !== nextInset)
                this.root.style.setProperty("--ui-mobile-keyboard-inset", nextInset);
            let scroller = active.parentElement;
            while (scroller && scroller !== this.root) {
                if (/(auto|scroll)/.test(this.win.getComputedStyle(scroller).overflowY)) break;
                scroller = scroller.parentElement;
            }
            // A header input never resizes an unrelated results list.
            if (!scroller || scroller === this.root) return;
            const scrollRect = scroller.getBoundingClientRect();
            const controlRect = active.getBoundingClientRect();
            const gap = Number.parseFloat(this.win.getComputedStyle(this.root).getPropertyValue("--ui-mobile-focus-gap")) || 0;
            if (this.scrollport && this.scrollport !== scroller) this.clearScrollport();
            if (this.scrollport === scroller || controlRect.bottom > visibleBottom - gap) {
                if (!this.scrollport) {
                    this.scrollport = scroller;
                    scroller.style.setProperty("--ui-mobile-scroll-height", `${scrollRect.height}px`);
                    scroller.style.setProperty("--ui-mobile-scroll-padding", this.win.getComputedStyle(scroller).paddingBottom);
                    scroller.classList.add("ui-mobile-keyboard-scrollport");
                }
                const reserve = `${Math.max(0, scrollRect.bottom - visibleBottom + gap)}px`;
                if (scroller.style.getPropertyValue("--ui-mobile-scroll-reserve") !== reserve)
                    scroller.style.setProperty("--ui-mobile-scroll-reserve", reserve);
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
        this.viewport.release(this);
        this.unlock(); this.root.classList.remove("ui-mobile-frame");
        if (this.root[MOBILE_FRAME_OWNER] === this) delete this.root[MOBILE_FRAME_OWNER];
        this.onDispose?.(); this.onDispose = null;
    }
}

export function mountMobileFrame(root, options = {}, onDispose = null) {
    return Platform.isMobile && root?.ownerDocument?.defaultView ? new MobileFrameController(root, options, onDispose) : null;
}
