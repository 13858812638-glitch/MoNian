// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeFileTypeFilterValue } from "../../features/filters/filter-state.js";
import { EXCALIDRAW_DRAWING_SUFFIX } from "./drawing-detection.js";


export function attachmentExtension(meta) {
    return String(meta?.extension || "").trim().toLowerCase();
}


export function normalizeExcludedAttachmentTypes(values) {
    return [...new Set((Array.isArray(values) ? values : [])
        .map(value => String(value || "").trim().toLowerCase())
        .filter(value => /^[a-z0-9][a-z0-9._+-]*$/.test(value)))].sort();
}


// 文件类型图标只有一个正式视觉源：结果卡、顶部类型按钮、创建元数据与创建默认设置共用。
// 按钮顺序由 RESULT_FILE_TYPE_ACTIONS 单独定义；视觉映射不再在各模块重复维护。
export const FILE_TYPE_ICONS = Object.freeze({
    note: "file-text",
    canvas: "layout-dashboard",
    excalidraw: "pencil-ruler",
    attachment: "paperclip"
});


export const RESULT_FILE_TYPE_ACTIONS = Object.freeze([
    Object.freeze({ value: "note", label: "笔记", icon: FILE_TYPE_ICONS.note }),
    Object.freeze({ value: "canvas", label: "Canvas", icon: FILE_TYPE_ICONS.canvas }),
    Object.freeze({ value: "excalidraw", label: "Excalidraw", icon: FILE_TYPE_ICONS.excalidraw }),
    Object.freeze({ value: "attachment", label: "其他文件", icon: FILE_TYPE_ICONS.attachment })
]);


export function resultFileTypeAction(kind) {
    return RESULT_FILE_TYPE_ACTIONS.find(def => def.value === kind)
        || RESULT_FILE_TYPE_ACTIONS[RESULT_FILE_TYPE_ACTIONS.length - 1];
}


export function fileTypeFilterDisplay(value) {
    const normalized = normalizeFileTypeFilterValue(value);
    if (!normalized) return "全部";
    if (normalized === "attachment") return "全部附件";
    if (normalized.startsWith("ext:")) return normalized.slice(4).toUpperCase();
    return resultFileTypeAction(normalized).label;
}


export function logicalFileType(meta) {
    const extension = attachmentExtension(meta);
    if (extension === "excalidraw") return "excalidraw";
    if (extension === "canvas") return "canvas";
    if (extension === "md") return "note";
    return "attachment";
}


export function resultFileTypeLabel(meta) {
    const kind = logicalFileType(meta);
    if (kind !== "attachment") return resultFileTypeAction(kind).label;
    const extension = attachmentExtension(meta);
    return extension ? extension.toUpperCase() : "文件";
}


export function resultFileTypeIcon(meta) {
    return resultFileTypeAction(logicalFileType(meta)).icon;
}


export function resultFileTypeDisplay(meta) {
    const label = resultFileTypeLabel(meta);
    const kind = logicalFileType(meta);
    const rawCount = kind === "note"
        ? meta?.textCount
        : kind === "canvas"
            ? meta?.canvasNodeCount
            : kind === "excalidraw"
                ? meta?.excalidrawElementCount
                : null;
    if (rawCount == null) return label;

    const count = Number(rawCount);
    const safeCount = Number.isFinite(count)
        ? Math.max(0, Math.trunc(count))
        : 0;
    return `${label}丨${safeCount}`;
}


export function resultFileTypeFilterValue(meta) {
    const kind = logicalFileType(meta);
    if (kind !== "attachment") return kind;

    const extension = attachmentExtension(meta);
    return extension ? `ext:${extension}` : "attachment";
}


// 结果卡 / 搜索索引 / 工作台共享的纯标题规则；旧版绘图继续兼容原物理路径。
export function drawingBasenameSuffix(file, logicalExtension) {
    if (logicalExtension !== "excalidraw" || file.extension.toLowerCase() !== "md") return "";
    if (file.basename.toLowerCase().endsWith(".excalidraw")) return ".excalidraw";
    if (file.basename.endsWith(EXCALIDRAW_DRAWING_SUFFIX)) return EXCALIDRAW_DRAWING_SUFFIX;
    return "";
}


export function displayBasename(file, logicalExtension) {
    const suffix = drawingBasenameSuffix(file, logicalExtension);
    return suffix && file.basename.length > suffix.length
        ? file.basename.slice(0, -suffix.length) : file.basename;
}
