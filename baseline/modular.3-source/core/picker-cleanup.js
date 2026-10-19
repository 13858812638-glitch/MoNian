// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



export function disposePickerCleanup(panel) {
    const cleanup = panel?._lsCleanup;
    if (panel) panel._lsCleanup = null;
    try { cleanup?.(); } catch (error) { console.warn("Picker cleanup failed", error); }
}


export function registerPickerCleanup(panel, cleanup) {
    if (!panel || typeof cleanup !== "function") return;
    const previous = panel._lsCleanup;
    panel._lsCleanup = () => {
        try { previous?.(); } catch (error) { console.warn("Picker cleanup failed", error); }
        try { cleanup(); } catch (error) { console.warn("Picker cleanup failed", error); }
    };
}
