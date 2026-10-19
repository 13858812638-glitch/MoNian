// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.


export function observePickerCountRail(panel, list, property) {
    const view = panel.ownerDocument.defaultView;
    let active = true;
    const sync = () => {
        if (active && panel.isConnected && list.isConnected)
            panel.style.setProperty(property, `${Math.max(0, list.offsetWidth - list.clientWidth)}px`);
    };
    const observer = new view.ResizeObserver(sync);
    observer.observe(list);
    let frame = view.requestAnimationFrame(() => { frame = null; sync(); });
    return () => {
        active = false;
        observer.disconnect();
        if (frame !== null) view.cancelAnimationFrame(frame);
        frame = null;
    };
}
