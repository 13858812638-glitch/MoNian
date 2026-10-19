// Desktop-only geometry for the existing Navigator facets/results panes.
// SearchNavigatorController retains the session; no plugin settings or second view.
export function createDesktopNavigatorPane(nav) {
    const win = nav.root.ownerDocument.defaultView;
    // The existing resize marker also gives this gesture priority over the
    // document's shared swipe-back recognizer (including other plugin leases).
    const divider = nav.workspace.createDiv({ cls: "local-search-nav-divider local-search-resize-handle", attr: {
        role: "separator", tabindex: "0", "aria-orientation": "vertical",
        "aria-label": "调整导航面板宽度", "data-ls-no-drag": "true"
    } });
    nav.workspace.insertBefore(divider, nav.main);
    let drag = null, frame = null;
    const limits = () => {
        const resultMin = Number.parseFloat(win.getComputedStyle(nav.root)
            .getPropertyValue("--ls-nav-result-min-width")) || 320;
        return { min: 180, max: Math.max(180, nav.width - resultMin) };
    };
    const sync = () => {
        divider.hidden = nav.layout !== "split";
        if (divider.hidden && drag) finish(false);
        if (divider.hidden) return;
        const { min, max } = limits();
        divider.setAttribute("aria-valuemin", String(min));
        divider.setAttribute("aria-valuemax", String(Math.floor(max)));
        // Read actual width only for host resize / settled input, never per row.
        divider.setAttribute("aria-valuenow", String(Math.round(nav.facets.getBoundingClientRect().width)));
    };
    const apply = width => {
        const { min, max } = drag || limits();
        nav._desktopPaneWidth = Math.round(Math.max(min, Math.min(max, width)));
        nav.root.style.setProperty("--ls-nav-pane-width", `${nav._desktopPaneWidth}px`);
        divider.setAttribute("aria-valuenow", String(nav._desktopPaneWidth));
    };
    const flush = () => {
        frame = null;
        if (drag) apply(drag.width + (drag.x - drag.startX) * drag.direction);
    };
    const move = event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        drag.x = event.clientX;
        if (frame === null) frame = win.requestAnimationFrame(flush);
    };
    const finish = commit => {
        if (!drag) return;
        if (frame !== null) { win.cancelAnimationFrame(frame); frame = null; }
        const previous = drag;
        if (commit) flush();
        else {
            nav._desktopPaneWidth = previous.saved;
            if (previous.saved == null) nav.root.style.removeProperty("--ls-nav-pane-width");
            else nav.root.style.setProperty("--ls-nav-pane-width", `${previous.saved}px`);
        }
        drag = null;
        win.removeEventListener("pointermove", move);
        win.removeEventListener("pointerup", up);
        win.removeEventListener("pointercancel", cancel);
        win.removeEventListener("blur", cancel);
        nav.root.classList.remove("is-nav-resizing");
        if (divider.hasPointerCapture?.(previous.pointerId)) divider.releasePointerCapture(previous.pointerId);
        if (commit) { nav.core?.onStateChange?.(); nav.core?.dropdown?._queueReposition(); }
    };
    const up = event => {
        if (event.pointerId !== drag?.pointerId) return;
        drag.x = event.clientX;
        finish(true);
    };
    const cancel = () => finish(false);
    const down = event => {
        if (event.button !== 0 || event.isPrimary === false || nav.layout !== "split") return;
        event.preventDefault(); event.stopPropagation();
        if (drag) finish(false);
        drag = { ...limits(), pointerId: event.pointerId, startX: event.clientX, x: event.clientX,
            width: nav.facets.getBoundingClientRect().width, saved: nav._desktopPaneWidth,
            direction: win.getComputedStyle(nav.workspace).direction === "rtl" ? -1 : 1 };
        divider.focus({ preventScroll: true });
        divider.setPointerCapture?.(event.pointerId);
        nav.root.classList.add("is-nav-resizing");
        win.addEventListener("pointermove", move);
        win.addEventListener("pointerup", up);
        win.addEventListener("pointercancel", cancel);
        win.addEventListener("blur", cancel);
    };
    const key = event => {
        if (event.key === "Escape" && drag) { event.preventDefault(); event.stopPropagation(); finish(false); return; }
        if (nav.layout !== "split" || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        const { min, max } = limits();
        const direction = win.getComputedStyle(nav.workspace).direction === "rtl" ? -1 : 1;
        const delta = (event.shiftKey ? 40 : 10) * direction * (event.key === "ArrowLeft" ? -1 : 1);
        apply(event.key === "Home" ? min : event.key === "End" ? max
            : nav.facets.getBoundingClientRect().width + delta);
        nav.core?.onStateChange?.(); nav.core?.dropdown?._queueReposition();
    };
    const reset = () => {
        if (drag) finish(false);
        nav._desktopPaneWidth = null;
        nav.root.style.removeProperty("--ls-nav-pane-width");
        sync(); nav.core?.onStateChange?.();
    };
    divider.addEventListener("pointerdown", down);
    divider.addEventListener("lostpointercapture", cancel);
    divider.addEventListener("keydown", key);
    divider.addEventListener("dblclick", reset);
    return {
        sync,
        restore(width) {
            if (drag) finish(false);
            nav._desktopPaneWidth = typeof width === "number" && Number.isFinite(width) && width > 0
                ? Math.max(180, Math.round(width)) : null;
            if (nav._desktopPaneWidth == null) nav.root.style.removeProperty("--ls-nav-pane-width");
            else nav.root.style.setProperty("--ls-nav-pane-width", `${nav._desktopPaneWidth}px`);
            sync();
        },
        destroy() {
            finish(false);
            divider.removeEventListener("pointerdown", down);
            divider.removeEventListener("lostpointercapture", cancel);
            divider.removeEventListener("keydown", key);
            divider.removeEventListener("dblclick", reset);
            divider.remove(); nav.root.style.removeProperty("--ls-nav-pane-width");
        }
    };
}
