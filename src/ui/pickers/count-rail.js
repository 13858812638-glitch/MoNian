// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.


export function observePickerCountRail(panel, list, property) {
    const view = panel.ownerDocument.defaultView;
    let active = true;
    const sync = () => {
        if (!active || !panel.isConnected || !list.isConnected) return;
        const reserve = `${Math.max(0, list.offsetWidth - list.clientWidth)}px`;
        if (panel.style.getPropertyValue(property) !== reserve)
            panel.style.setProperty(property, reserve);
    };
    // ResizeObserver owns both the first connected layout and later changes.
    // A parallel animation frame repeats that initial measurement and write.
    const observer = new view.ResizeObserver(sync);
    observer.observe(list);
    return () => {
        active = false;
        observer.disconnect();
    };
}
