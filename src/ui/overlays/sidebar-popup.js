import { Platform } from "obsidian";
import { resolveOverlayBounds } from "./geometry.js";

// Opt-in by the owning core, never by the active workspace leaf or a body class.
export function resolveSidebarPopupBounds(core, inset = 8) {
    if (Platform.isMobile || core?.hostKind !== "sidebar" || !core.containerEl?.isConnected) return null;
    return resolveOverlayBounds(core.containerEl, core.containerEl.ownerDocument.defaultView, inset);
}

// Retain the shared viewport portal/focus/submission owners. Only the desktop
// sidebar's dialog geometry and backdrop region follow its native leaf.
export function bindSidebarDialogPosition(core, dialog, backdrop) {
    if (!resolveSidebarPopupBounds(core)) return null;
    const root = core.containerEl, doc = root.ownerDocument, win = doc.defaultView;
    let frame = null, disposed = false;
    dialog.dataset.lsSidebarDialog = "true";
    backdrop.dataset.lsSidebarBackdrop = "true";
    const write = (node, key, value) => {
        if (node.style.getPropertyValue(key) !== value) node.style.setProperty(key, value);
    };
    const sync = () => {
        frame = null;
        if (disposed || core._destroyed) return;
        const bounds = resolveSidebarPopupBounds(core);
        const visible = bounds && bounds.owner.width > 0 && bounds.owner.height > 0;
        write(dialog, "visibility", visible ? "" : "hidden");
        write(backdrop, "visibility", visible ? "" : "hidden");
        if (!visible) return;
        const ratio = Math.min(0.8, Math.max(0.2,
            (Number.parseFloat(win.getComputedStyle(dialog).getPropertyValue("--ls-dialog-position-y")) || 44) / 100));
        const centerY = bounds.top + bounds.height * ratio;
        write(dialog, "--ls-sidebar-dialog-x", `${bounds.left + bounds.width / 2}px`);
        write(dialog, "--ls-sidebar-dialog-y", `${centerY}px`);
        write(dialog, "--ls-sidebar-dialog-width", `${bounds.width}px`);
        write(dialog, "--ls-sidebar-dialog-height", `${2 * Math.min(centerY - bounds.top, bounds.bottom - centerY)}px`);
        const cover = resolveSidebarPopupBounds(core, 0);
        for (const key of ["left", "top", "width", "height"]) write(backdrop, key, `${cover[key]}px`);
    };
    const queue = () => {
        if (!disposed && frame === null) frame = win.requestAnimationFrame(sync);
    };
    // Dialogs are centered on the leaf, not its scrolling descendants.
    const scroll = event => { if (event.target === doc || event.target?.contains?.(root)) queue(); };
    const observer = new win.ResizeObserver(queue);
    observer.observe(root);
    win.addEventListener("resize", queue);
    doc.addEventListener("scroll", scroll, true);
    sync();
    return () => {
        disposed = true;
        if (frame !== null) win.cancelAnimationFrame(frame);
        observer.disconnect();
        win.removeEventListener("resize", queue);
        doc.removeEventListener("scroll", scroll, true);
    };
}
