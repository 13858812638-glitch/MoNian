// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



// 结果名称与路径共用同一排序合同；不在 O(N log N) 比较热路径反复建立 locale/options。
export const RESULT_TEXT_COLLATOR = new Intl.Collator("zh-Hans-CN", {
    numeric: true,
    sensitivity: "base"
});
