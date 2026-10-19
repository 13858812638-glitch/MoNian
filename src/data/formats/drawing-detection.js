// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { TFile } from "obsidian";


// 文件物理后缀只由创建 / 重命名写链决定，Excalidraw 的真实类型仍以绘图 YAML 标记为准。
export const EXCALIDRAW_DRAWING_SUFFIX = "_绘图";


export function hasExcalidrawFrontmatter(frontmatter) {
    return !!frontmatter && typeof frontmatter === "object"
        && Object.prototype.hasOwnProperty.call(frontmatter, "excalidraw-plugin");
}


export function isExcalidrawMeta(file, cache) {
    if (!(file instanceof TFile) || file.extension.toLowerCase() !== "md") return false;
    // 保留已有 .excalidraw.md 的兼容入口，不把普通 *_绘图.md 单凭文件名误判为绘图。
    if (file.name.toLowerCase().endsWith(".excalidraw.md")) return true;
    return hasExcalidrawFrontmatter(cache?.frontmatter);
}
