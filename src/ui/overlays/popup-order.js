// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



// Popup keyboard routing follows visible ownership, not artificial focus.
// Dropdown and standalone overlays share the same order; a native modal above
// them keeps its own Escape handling even if the active element is BODY.
export let searchPopupOpenOrder = 0;

export function markSearchPopupActive(surface) {
    surface._lsOpenedOrder = ++searchPopupOpenOrder;
}

export function topSearchPopupSurface(doc) {
    const surfaces = [...doc.querySelectorAll(".local-search-dropdown, .local-search-overlay-host")]
        .filter(surface => surface._lsOpenedOrder && !surface.closest("[hidden], [inert]"));
    const top = surfaces.reduce((current, surface) => surface._lsOpenedOrder > (current?._lsOpenedOrder || 0)
        ? surface : current, null);
    if (!top) return null;
    const modal = [...doc.querySelectorAll(".modal-container")]
        .filter(surface => !surface.closest("[hidden], [inert]") && surface.getClientRects().length)
        .at(-1);
    return modal && !modal.contains(top) ? null : top;
}
