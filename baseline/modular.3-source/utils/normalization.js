// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



export function normalizeIntegerSetting(value, fallback, { allowZero = false } = {}) {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) return fallback;
    const minimum = allowZero ? 0 : 1;
    return Math.max(minimum, parsed);
}


export function normalizeUniqueStringList(values) {
    const source = Array.isArray(values) ? values : [];
    const seen = new Set();
    const result = [];

    for (const value of source) {
        const key = String(value || "").trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        result.push(key);
    }

    return result;
}


export function normalizeStringListMap(value) {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    const result = {};

    for (const [rawKey, rawList] of Object.entries(source)) {
        const key = String(rawKey || "").trim();
        if (!key) continue;
        const list = normalizeUniqueStringList(rawList);
        if (list.length) result[key] = list;
    }

    return result;
}
