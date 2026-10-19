// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeUniqueStringList } from "../../utils/normalization.js";


export const SORT_FIELD_DEFS = Object.freeze({
    relevance: { label: "最佳匹配", icon: "sparkles" },
    opened: { label: "最近打开", icon: "history" },
    created: { label: "创建时间", icon: "calendar-plus" },
    contentModified: { label: "正文修改", icon: "file-clock" },
    fileModified: { label: "文件修改", icon: "clock-3" },
    name: { label: "文件名称", icon: "type" }
});

export const SORT_FIELD_IDS = Object.freeze(Object.keys(SORT_FIELD_DEFS));

export const DEFAULT_SORT_FIELD_ORDER = Object.freeze([
    "relevance",
    "opened",
    "created",
    "contentModified",
    "fileModified",
    "name"
]);


export function normalizeSortFieldOrder(value) {
    const allowed = new Set(SORT_FIELD_IDS);
    const ordered = normalizeUniqueStringList(value)
        .filter(id => allowed.has(id));
    const seen = new Set(ordered);
    for (const id of DEFAULT_SORT_FIELD_ORDER) {
        if (!seen.has(id)) {
            seen.add(id);
            ordered.push(id);
        }
    }
    return ordered;
}


export function normalizeHiddenSortFields(value, order = DEFAULT_SORT_FIELD_ORDER) {
    const allowed = new Set(SORT_FIELD_IDS);
    const hidden = new Set(
        normalizeUniqueStringList(value).filter(id => allowed.has(id))
    );

    // 空搜索至少保留一个真实排序字段；避免用户把全部字段关闭后形成无排序状态。
    const nonQueryFields = normalizeSortFieldOrder(order)
        .filter(id => id !== "relevance");
    if (nonQueryFields.length && nonQueryFields.every(id => hidden.has(id))) {
        hidden.delete(nonQueryFields[0]);
    }
    return [...hidden];
}


export function selectableSortFieldsForQuery(hasQuery, settings = null) {
    return normalizeSortFieldOrder(settings?.resultSortOrder)
        .filter(id => Boolean(hasQuery) || id !== "relevance");
}


// 快捷循环只消费 View Composer 中 eye 开启的字段；
// 全量 Picker 仍可直接选择 eye 关闭的字段，因此“当前字段有效性”不能再由循环成员决定。
export function sortFieldsForQuery(hasQuery, settings = null) {
    const order = normalizeSortFieldOrder(settings?.resultSortOrder);
    const hidden = new Set(
        normalizeHiddenSortFields(
            settings?.hiddenResultSortFields,
            order
        )
    );
    return order.filter(id =>
        !hidden.has(id)
        && (Boolean(hasQuery) || id !== "relevance")
    );
}


export function normalizeSortDirection(value) {
    return value === "asc" ? "asc" : "desc";
}


export function defaultSortField(hasQuery, settings = null) {
    return sortFieldsForQuery(Boolean(hasQuery), settings)[0]
        || (hasQuery ? "relevance" : "opened");
}


export function normalizeSortField(value, hasQuery, settings = null) {
    const fields = selectableSortFieldsForQuery(Boolean(hasQuery), settings);
    return fields.includes(value)
        ? value
        : defaultSortField(Boolean(hasQuery), settings);
}


export function migrateLegacySortState(value, hasQuery = false) {
    if (value === "name-asc") return { field: "name", direction: "asc" };
    if (value === "name-desc") return { field: "name", direction: "desc" };
    if (value === "opened") return { field: "opened", direction: "desc" };
    if (value === "modified") return { field: "contentModified", direction: "desc" };
    return { field: defaultSortField(Boolean(hasQuery)), direction: "desc" };
}
