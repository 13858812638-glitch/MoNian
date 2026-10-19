// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { mountMobileFrame } from "../ui/mobile/mobile-frame.js";
import { Platform } from "obsidian";


// Workspace 能力层：原生 Leaf 几何、软键盘与手势边界；无全局触摸拦截。
export class SearchWorkspaceCapabilities {
    constructor(core) {
        this.core = core;
        this.root = core.containerEl;
        this.win = this.root.ownerDocument.defaultView;
        this.cleanups = [];
        if (!Platform.isMobile) return;
        const listen = (node, type, handler, options) => {
            node.addEventListener(type, handler, options);
            this.cleanups.push(() => node.removeEventListener(type, handler, options));
        };
        // The native mobile sidebar owns its dock as part of the Obsidian leaf.
        // Do not subscribe this sidebar to keyboard/VisualViewport frame updates:
        // the bottom command rail must never be lifted by a keyboard inset.
        // Keep the existing controller for native search tabs; independent
        // Picker/modal surfaces retain their own mobile frame lifecycle.
        this.mobileFrame = core.hostKind === "sidebar" ? null : mountMobileFrame(this.root, {
            preserveFrame: false,
            onSettled: () => core.dropdown?._queueReposition(),
            onOrientation: () => core.dropdown?.invalidateFrame()
        });
        const internal = target => target?.closest?.(".local-search-swipe-shell.has-swipe-actions, .local-search-dropdown, .local-search-dialog-surface, .local-search-filter-pool-rail");
        const contain = event => {
            if (internal(event.target)) event.stopPropagation();
            // Never preventDefault here: the existing Swipe / Tree primitive owns intent;
            // native vertical scrolling and editable controls retain their default behavior.
        };
        for (const type of ["touchstart", "touchmove", "touchend", "touchcancel", "pointerdown", "pointermove", "pointerup", "pointercancel"]) {
            listen(this.root, type, contain, { passive: true });
        }
        this.mobileFrame?.refresh();
    }
    resize() { this.mobileFrame?.refresh(); }
    destroy() {
        for (const cleanup of this.cleanups.splice(0)) cleanup();
        this.mobileFrame?.destroy();
        this.mobileFrame = null;
        this.core = null;
    }
}
