// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



/*
 * ===== Master Template Boundary =====
 * Foundation：纯函数、状态 Primitive、Picker / Dialog / Sort / Swipe / Virtual List、
 * 生命周期与设置规范化。Foundation 不读取具体搜索视图的局部 DOM 状态。
 * Search Domain：Query / Filter / Facet / Result / Create / Selection，只组合 Foundation；
 * 同一能力不得在业务 Controller 内复制第二套实现。单文件只是交付形态。
 */

// 结果列表采用“可见区 + 缓冲区”的动态窗口化 DOM。
// 挂载数量只由 viewport / 当前行高估算决定，不再固定 16 张；
// 极端超高视口优先保证完整覆盖可见区，安全上限只约束额外缓冲。
export const RESULT_WINDOW_MOUNT_MIN = 12;

export const RESULT_WINDOW_MOUNT_MAX = 64;

export const RESULT_WINDOW_BUFFER_MIN = 6;

export const RESULT_ROW_HEIGHT_ESTIMATE = 112;


// 完整 Markdown 正文只服务当前可见结果的摘要回填，不再承担索引缓存职责。
// 两个最大虚拟窗口覆盖常见双宿主工作集；其它视图按同一 LRU 上限淘汰；
// BodyIndex 继续保存搜索所需的净化正文，避免全库完整正文常驻内存。
export const FULL_CONTENT_CACHE_LIMIT = RESULT_WINDOW_MOUNT_MAX * 2;


// 这些 Token 会改变结果卡真实高度。Style Settings 修改后，当前挂载行的
// ResizeObserver 会检测 signature 变化并一次性推进 geometryRevision。
export const RESULT_GEOMETRY_CSS_TOKENS = Object.freeze([
    "--ls-result-card-pad-x",
    "--ls-item-pad-y",
    "--ls-result-title-gap",
    "--ls-result-type-icon-size",
    "--ls-selection-action-size",
    "--ls-item-title-size",
    "--ls-result-snippet-margin-top",
    "--ls-item-snippet-size",
    "--ls-item-meta-size",
    "--ls-item-path-size",
    "--ls-result-meta-margin-top",
    "--ls-result-meta-pad-y",
    "--ls-result-meta-cell-height",
    "--ls-result-meta-icon-size",
    "--ls-meta-group-gap",
    "--ls-meta-group-max"
]);
