// One desktop separator for both adaptive axes; Navigator owns session sizes.
const PANE_AXES = {
    split: { size: "width", point: "clientX", state: "_desktopPaneWidth", orientation: "vertical",
        label: "调整导航面板宽度", previous: "ArrowLeft", next: "ArrowRight" },
    stack: { size: "height", point: "clientY", state: "_desktopPaneHeight", orientation: "horizontal",
        label: "调整导航面板高度", previous: "ArrowUp", next: "ArrowDown" }
};

export function createDesktopNavigatorPane(nav) {
    const win = nav.root.ownerDocument.defaultView;
    // This shared resize marker excludes the gesture from swipe recognizers.
    const divider = nav.workspace.createDiv({ cls: "local-search-nav-divider local-search-resize-handle", attr: {
        role: "separator", tabindex: "0", "data-ls-no-drag": "true"
    } });
    nav.workspace.insertBefore(divider, nav.main);
    let drag = null, frame = null;
    const axis = () => PANE_AXES[nav.layout];
    const limits = a => {
        const style = win.getComputedStyle(nav.root);
        const total = nav.workspace.getBoundingClientRect()[a.size];
        const minimum = Number.parseFloat(style.getPropertyValue(`--ls-nav-pane-min-${a.size}`));
        const result = Number.parseFloat(style.getPropertyValue(`--ls-nav-result-min-${a.size}`));
        // Small stacked hosts share the space rather than clipping either pane.
        const min = a.size === "height" ? Math.min(minimum, total / 2) : minimum;
        return { min, max: Math.max(min, total - result) };
    };
    const write = (a, value) => {
        nav[a.state] = value;
        const token = `--ls-nav-pane-${a.size}`;
        if (value == null) nav.root.style.removeProperty(token);
        else nav.root.style.setProperty(token, `${value}px`);
    };
    const sync = () => {
        if (drag) { finish(false); return; }
        const a = axis();
        divider.hidden = !a;
        if (!a) return;
        const { min, max } = limits(a);
        divider.setAttribute("aria-orientation", a.orientation);
        divider.setAttribute("aria-label", a.label);
        divider.setAttribute("aria-valuemin", String(Math.ceil(min)));
        divider.setAttribute("aria-valuemax", String(Math.floor(max)));
        divider.setAttribute("aria-valuenow", String(Math.round(nav.facets.getBoundingClientRect()[a.size])));
    };
    const apply = (a, value, bounds = limits(a)) => {
        const size = Math.round(Math.max(bounds.min, Math.min(bounds.max, value)));
        if (nav[a.state] !== size) write(a, size);
        divider.setAttribute("aria-valuenow", String(size));
    };
    const flush = () => {
        frame = null;
        if (drag) apply(drag.axis, drag.size + (drag.point - drag.start) * drag.direction, drag);
    };
    const move = event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        drag.point = event[drag.axis.point];
        if (frame === null) frame = win.requestAnimationFrame(flush);
    };
    const finish = commit => {
        if (!drag) return;
        if (frame !== null) { win.cancelAnimationFrame(frame); frame = null; }
        const previous = drag;
        if (commit) flush();
        else write(previous.axis, previous.saved);
        drag = null;
        win.removeEventListener("pointermove", move);
        win.removeEventListener("pointerup", up);
        win.removeEventListener("pointercancel", cancel);
        win.removeEventListener("blur", cancel);
        nav.root.classList.remove("is-nav-resizing");
        if (divider.hasPointerCapture?.(previous.pointerId)) divider.releasePointerCapture(previous.pointerId);
        sync();
        if (commit) { nav.core?.onStateChange?.(); nav.core?.dropdown?._queueReposition(); }
    };
    const up = event => {
        if (event.pointerId !== drag?.pointerId) return;
        drag.point = event[drag.axis.point];
        finish(true);
    };
    const cancel = () => finish(false);
    const direction = a => a.size === "width" && win.getComputedStyle(nav.workspace).direction === "rtl" ? -1 : 1;
    const down = event => {
        const a = axis();
        if (event.button !== 0 || event.isPrimary === false || !a) return;
        event.preventDefault(); event.stopPropagation();
        if (drag) finish(false);
        drag = { ...limits(a), axis: a, pointerId: event.pointerId,
            start: event[a.point], point: event[a.point], size: nav.facets.getBoundingClientRect()[a.size],
            saved: nav[a.state], direction: direction(a) };
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
        const a = axis();
        if (!a || ![a.previous, a.next, "Home", "End"].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        if (drag) finish(false);
        const bounds = limits(a);
        const delta = (event.shiftKey ? 40 : 10) * direction(a) * (event.key === a.previous ? -1 : 1);
        apply(a, event.key === "Home" ? bounds.min : event.key === "End" ? bounds.max
            : nav.facets.getBoundingClientRect()[a.size] + delta, bounds);
        sync(); nav.core?.onStateChange?.(); nav.core?.dropdown?._queueReposition();
    };
    const reset = () => {
        if (drag) finish(false);
        const a = axis();
        if (!a) return;
        write(a, null);
        sync(); nav.core?.onStateChange?.(); nav.core?.dropdown?._queueReposition();
    };
    divider.addEventListener("pointerdown", down);
    divider.addEventListener("lostpointercapture", cancel);
    divider.addEventListener("keydown", key);
    divider.addEventListener("dblclick", reset);
    return {
        sync,
        restore(width, height) {
            if (drag) finish(false);
            for (const [a, value] of [[PANE_AXES.split, width], [PANE_AXES.stack, height]]) {
                write(a, typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : null);
            }
            sync();
        },
        destroy() {
            finish(false);
            divider.removeEventListener("pointerdown", down);
            divider.removeEventListener("lostpointercapture", cancel);
            divider.removeEventListener("keydown", key);
            divider.removeEventListener("dblclick", reset);
            divider.remove();
            for (const a of Object.values(PANE_AXES)) nav.root.style.removeProperty(`--ls-nav-pane-${a.size}`);
        }
    };
}
