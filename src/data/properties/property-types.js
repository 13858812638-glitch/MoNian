// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { GLS_MANAGED_TIME_KEYS } from "../time/time-values.js";
import { normalizeTagValue } from "../tags/tag-values.js";
import { isExclusivePropertySelectionValue, propertyValueKey } from "./property-values.js";
 // Excalidraw _绘图.md 命名与类型识别统一，重建旧显示名称缓存。

// Obsidian 标准属性类型；新增属性时统一从这里生成类型选择。
export const PROPERTY_TYPE_OPTIONS = Object.freeze([
    { value: "text", label: "文本" },
    { value: "multitext", label: "列表" },
    { value: "number", label: "数字" },
    { value: "checkbox", label: "复选框" },
    { value: "date", label: "日期" },
    { value: "datetime", label: "日期和时间" }
]);



export function normalizeMetadataPropertyType(type) {
    const value = String(type || "").toLowerCase();
    if (["multitext", "list", "tags", "aliases"].includes(value)) return "multitext";
    if (value === "number") return "number";
    if (value === "checkbox" || value === "boolean") return "checkbox";
    if (value === "date") return "date";
    if (value === "datetime" || value === "date-time") return "datetime";
    return "text";
}


export function metadataPropertySample(source, key) {
    for (const meta of source || []) {
        if (!Object.prototype.hasOwnProperty.call(meta?.properties || {}, key)) continue;
        return meta.properties[key];
    }
    return undefined;
}


export function resolveMetadataPropertyType(app, key, sample, fallbackType = "") {
    const manager = app?.metadataTypeManager;
    try {
        const info = typeof manager?.getPropertyInfo === "function"
            ? manager.getPropertyInfo(key)
            : null;
        const registered = info?.widget || info?.type;
        if (registered) return normalizeMetadataPropertyType(registered);

        const assigned = typeof manager?.getAssignedWidget === "function"
            ? manager.getAssignedWidget(key)
            : null;
        if (assigned) return normalizeMetadataPropertyType(assigned);
    } catch (_) {}

    if (fallbackType) return normalizeMetadataPropertyType(fallbackType);
    if (Array.isArray(sample)) return "multitext";
    if (typeof sample === "number") return "number";
    if (typeof sample === "boolean") return "checkbox";
    return "text";
}


export function metadataPropertyValuePlaceholder(type) {
    const normalized = normalizeMetadataPropertyType(type);
    if (normalized === "number") return "输入数字";
    if (normalized === "checkbox") return "输入 true 或 false";
    if (normalized === "date") return "输入日期（YYYY-MM-DD）";
    if (normalized === "datetime") return "输入日期和时间";
    return normalized === "multitext" ? "输入列表值" : "输入文本";
}


export function parseMetadataPropertyInput(rawValue, type = "text") {
    const normalized = normalizeMetadataPropertyType(type);
    const input = String(rawValue ?? "").trim();
    if (!input) throw new Error("请输入新的属性值");
    if (normalized === "number") {
        const value = Number(input);
        if (!Number.isFinite(value)) throw new Error("请输入有效数字");
        return value;
    }
    if (normalized === "checkbox") {
        if (!/^(true|false)$/i.test(input)) {
            throw new Error("复选框值只能是 true 或 false");
        }
        return input.toLowerCase() === "true";
    }
    return input;
}


// Only explicitly added standalone options live here. Indexed file properties
// remain authoritative and are never copied into this settings catalog.
export function normalizePropertyValueCatalog(value) {
    const rows = new Map();
    for (const entry of Array.isArray(value) ? value : []) {
        try {
            const key = validateEditablePropertyKey(entry?.key);
            const propertyType = normalizeMetadataPropertyType(entry.propertyType);
            const values = new Map();
            for (const raw of (Array.isArray(entry.values) ? entry.values : []).flat(Infinity)) {
                try {
                    if (raw === null || raw === undefined || typeof raw === "object" || isExclusivePropertySelectionValue(raw)) continue;
                    const parsed = parseMetadataPropertyInput(raw, propertyType);
                    const id = propertyValueKey(parsed);
                    if (!values.has(id)) values.set(id, parsed);
                } catch (_) { /* Invalid recovered options are not selectable. */ }
            }
            if (values.size) rows.set(key, { key, propertyType, values: [...values.values()] });
        } catch (_) { /* Reject reserved/managed keys at the catalog boundary. */ }
    }
    return [...rows.values()].sort((a, b) => a.key.localeCompare(b.key, "zh-Hans-CN", { numeric: true }));
}


export function validateEditablePropertyKey(value, excludedKeys = []) {
    const key = String(value || "").trim();
    if (!key || /[\x00-\x1f\x7f]/.test(key) || ["__proto__", "constructor", "prototype"].includes(key)) {
        throw new Error("请输入有效属性名");
    }
    if (GLS_MANAGED_TIME_KEYS.has(key)) throw new Error("此属性由 GLS 时间记录维护，不能作为普通属性修改");
    if (key.toLocaleLowerCase("zh-CN") === "tags") {
        throw new Error("标签已独立管理，请使用标签入口");
    }
    if (key === "position" || (excludedKeys || []).includes(key)) {
        throw new Error("请输入有效属性名");
    }
    return key;
}


export function normalizeEditableTagValue(value) {
    return normalizeTagValue(value);
}


export function editableTagError(value) {
    const tag = normalizeEditableTagValue(value);
    if (!tag) return "";
    if (/\s/.test(tag)) return "标签不能包含空格";
    if (tag.includes("#")) return "标签中不能包含 #";
    if (tag.startsWith("/") || tag.endsWith("/") || tag.includes("//")) {
        return "标签层级路径无效";
    }
    return "";
}
