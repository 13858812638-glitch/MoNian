// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeFilterPools } from "../features/filters/pool-config.js";
import { normalizeUniqueStringList } from "./normalization.js";


export function moveOrderedKey(order, key, beforeKey = null) {
    const source = normalizeUniqueStringList(order);
    if (!key || !source.includes(key)) return source;
    const next = source.filter(item => item !== key);
    const beforeIndex = beforeKey ? next.indexOf(beforeKey) : -1;
    if (beforeIndex >= 0) next.splice(beforeIndex, 0, key);
    else next.push(key);
    return next;
}



export function sortByPreferredOrder(items, preferredOrder, getKey = item => item?.path || "") {
    const order = new Map(
        normalizeUniqueStringList(preferredOrder)
            .map((key, index) => [key, index])
    );
    return [...items].sort((a, b) => {
        const aKey = getKey(a);
        const bKey = getKey(b);
        const ai = order.has(aKey) ? order.get(aKey) : Number.MAX_SAFE_INTEGER;
        const bi = order.has(bKey) ? order.get(bKey) : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return String(aKey).localeCompare(String(bKey), "zh-Hans-CN", { numeric: true });
    });
}


export function updatePreferredSiblingOrder(existingOrder, siblingKeys, draggedKey, beforeKey = null) {
    const siblings = normalizeUniqueStringList(siblingKeys);
    if (!siblings.includes(draggedKey)) return normalizeUniqueStringList(existingOrder);

    const nextSiblings = siblings.filter(key => key !== draggedKey);
    const beforeIndex = beforeKey ? nextSiblings.indexOf(beforeKey) : -1;
    if (beforeIndex >= 0) nextSiblings.splice(beforeIndex, 0, draggedKey);
    else nextSiblings.push(draggedKey);

    const siblingSet = new Set(siblings);
    const untouched = normalizeUniqueStringList(existingOrder)
        .filter(key => !siblingSet.has(key));
    return [...untouched, ...nextSiblings];
}


export function remapPreferredPathOrder(order, oldPath, newPath) {
    if (!oldPath || oldPath === newPath) return normalizeUniqueStringList(order);
    return normalizeUniqueStringList(normalizeUniqueStringList(order).map(path => {
        if (path === oldPath) return newPath;
        if (path.startsWith(oldPath + "/")) {
            return newPath ? newPath + path.slice(oldPath.length) : "";
        }
        return path;
    }));
}


export function remapFilterPoolStoredKeys(pools, kind, remapKey) {
    if (typeof remapKey !== "function") return normalizeFilterPools(pools);
    return normalizeFilterPools(pools).map(pool => {
        if (pool.kind !== kind) return pool;
        return {
            ...pool,
            hiddenValueKeys: normalizeUniqueStringList(
                (pool.hiddenValueKeys || []).map(remapKey)
            ),
            visibleValueKeys: normalizeUniqueStringList(
                (pool.visibleValueKeys || []).map(remapKey)
            )
        };
    });
}
