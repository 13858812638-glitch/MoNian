// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeIntegerSetting, normalizeUniqueStringList } from "../../utils/normalization.js";



export const RESULT_VIEW_IDS = ["detailed", "standard", "compact"];


export const RESULT_VIEW_LABELS = {
    detailed: "详细",
    standard: "标准",
    compact: "精简"
};


// View Composer：结果卡“显示什么 / 按什么顺序显示”的唯一注册表。
// UI 与渲染层都引用同一份 id / flag，避免出现第二套顺序或显隐逻辑。
export const RESULT_CONTENT_DEFS = Object.freeze([
    Object.freeze({ id: "tags", label: "标签", flag: "showTags", kind: "block", icon: "tags" }),
    Object.freeze({ id: "properties", label: "属性", flag: "showProperties", kind: "block", icon: "list-tree" }),
    Object.freeze({ id: "folder", label: "文件夹", flag: "showFolder", kind: "meta", icon: "folder" }),
    Object.freeze({ id: "createdTime", label: "创建时间", flag: "showCreatedTime", kind: "meta", icon: "calendar-plus" }),
    Object.freeze({ id: "contentModifiedTime", label: "正文修改", flag: "showContentModifiedTime", kind: "meta", icon: "file-clock" }),
    Object.freeze({ id: "modifiedTime", label: "文件修改", flag: "showModifiedTime", kind: "meta", icon: "clock-3" })
]);

export const RESULT_CONTENT_IDS = RESULT_CONTENT_DEFS.map(def => def.id);

export const RESULT_CONTENT_DEF_MAP = new Map(RESULT_CONTENT_DEFS.map(def => [def.id, def]));

export const VIEW_COMPOSER_SECTION_IDS = Object.freeze([
    "view",
    "snippet",
    "content",
    "sort",
    "filterPools",
    "sidebar",
    "toolbars",
    "exclusion"
]);


export function normalizeResultContentOrder(value, fallback = RESULT_CONTENT_IDS) {
    const source = normalizeUniqueStringList(Array.isArray(value) ? value : []);
    const allowed = new Set(RESULT_CONTENT_IDS);
    const next = source.filter(id => allowed.has(id));
    const seen = new Set(next);
    for (const id of Array.isArray(fallback) ? fallback : RESULT_CONTENT_IDS) {
        if (allowed.has(id) && !seen.has(id)) {
            seen.add(id);
            next.push(id);
        }
    }
    for (const id of RESULT_CONTENT_IDS) {
        if (!seen.has(id)) next.push(id);
    }
    return next;
}


export const DEFAULT_RESULT_VIEWS = {
    detailed: {
        snippetLines: 3,
        showTags: true,
        showProperties: true,
        showFolder: true,
        showContentModifiedTime: true,
        showModifiedTime: false,
        showCreatedTime: true,
        contentOrder: [...RESULT_CONTENT_IDS]
    },
    standard: {
        snippetLines: 2,
        showTags: true,
        showProperties: true,
        showFolder: true,
        showContentModifiedTime: true,
        showModifiedTime: false,
        showCreatedTime: false,
        contentOrder: [...RESULT_CONTENT_IDS]
    },
    compact: {
        snippetLines: 0,
        showTags: false,
        showProperties: false,
        showFolder: true,
        showContentModifiedTime: true,
        showModifiedTime: false,
        showCreatedTime: false,
        contentOrder: [...RESULT_CONTENT_IDS]
    }
};


export function normalizeResultViewId(value) {
    const id = String(value || "").toLowerCase();
    return RESULT_VIEW_IDS.includes(id) ? id : "standard";
}


export function normalizeResultViewConfig(value, fallback) {
    const source = value && typeof value === "object" ? value : {};
    const base = fallback && typeof fallback === "object"
        ? fallback
        : DEFAULT_RESULT_VIEWS.standard;

    return {
        snippetLines: Math.min(
            3,
            normalizeIntegerSetting(
                source.snippetLines,
                base.snippetLines,
                { allowZero: true }
            )
        ),
        showTags: typeof source.showTags === "boolean"
            ? source.showTags
            : base.showTags,
        showProperties: typeof source.showProperties === "boolean"
            ? source.showProperties
            : base.showProperties,
        showFolder: typeof source.showFolder === "boolean"
            ? source.showFolder
            : base.showFolder,

        // V5.0.28 前 showModifiedTime 表示唯一的“修改时间”。
        // 首次迁移时把用户原来的显示意图转移到“正文修改”，
        // 新增的“文件修改”默认关闭，避免升级后结果卡突然多出一份重复时间。
        showContentModifiedTime:
            typeof source.showContentModifiedTime === "boolean"
                ? source.showContentModifiedTime
                : typeof source.showModifiedTime === "boolean"
                    ? source.showModifiedTime
                    : base.showContentModifiedTime,
        showModifiedTime:
            typeof source.showContentModifiedTime === "boolean"
                ? (
                    typeof source.showModifiedTime === "boolean"
                        ? source.showModifiedTime
                        : base.showModifiedTime
                )
                : false,
        showCreatedTime: typeof source.showCreatedTime === "boolean"
            ? source.showCreatedTime
            : base.showCreatedTime,
        contentOrder: normalizeResultContentOrder(
            source.contentOrder,
            base.contentOrder || RESULT_CONTENT_IDS
        )
    };
}


export function normalizeResultViews(value) {
    const source = value && typeof value === "object" ? value : {};
    return Object.fromEntries(
        RESULT_VIEW_IDS.map(id => [
            id,
            normalizeResultViewConfig(
                source[id],
                DEFAULT_RESULT_VIEWS[id]
            )
        ])
    );
}
