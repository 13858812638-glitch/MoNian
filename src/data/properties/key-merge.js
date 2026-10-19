// One-off Vault property-key migration helper. Does not own persistence or a second catalog.
// Unsafe typed conflicts stop before any file is rewritten; identical values dedupe.
export function mergePropertyKeyValues(existing, incoming, type = "text") {
    if (JSON.stringify(existing) === JSON.stringify(incoming)) return existing;
    const empty = value => value == null || value === "" || (Array.isArray(value) && value.length === 0);
    if (empty(existing)) return incoming;
    if (empty(incoming)) return existing;
    const kind = String(type || "text").toLowerCase();
    if (kind !== "text" && kind !== "multitext") {
        throw new Error(`目标属性已有不同的${kind}类型值，不能自动合并；请先手动确认，未覆盖原值`);
    }
    const values = [...(Array.isArray(existing) ? existing : [existing]),
        ...(Array.isArray(incoming) ? incoming : [incoming])];
    if (values.some(item => typeof item !== "string" && typeof item !== "number")) {
        throw new Error("属性包含非文本值，不能安全自动合并；未覆盖原值");
    }
    const uniques = new Map();
    for (const item of values) uniques.set(`${typeof item}:${item}`, item);
    return [...uniques.values()];
}
