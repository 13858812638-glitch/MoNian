// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



export function normalizeModalSearchQuery(value) {
    return String(value ?? "");
}


export function normalizeModalViewportAnchor(value, legacyScrollTop = 0) {
    const source = value && typeof value === "object" ? value : {};
    const path = String(source.path || "").trim();
    const fallbackPath = String(source.fallbackPath || "").trim();
    const rawOffset = Number(source.offset);
    const rawFallbackOffset = Number(source.fallbackOffset);
    const scrollTop = Math.max(
        0,
        Math.round(Number(source.scrollTop ?? legacyScrollTop) || 0)
    );

    const anchor = {
        path,
        offset: Number.isFinite(rawOffset) ? rawOffset : 0,
        fallbackPath,
        fallbackOffset: Number.isFinite(rawFallbackOffset)
            ? rawFallbackOffset
            : 0,
        scrollTop
    };

    return anchor.path || anchor.fallbackPath || anchor.scrollTop > 0
        ? anchor
        : null;
}
