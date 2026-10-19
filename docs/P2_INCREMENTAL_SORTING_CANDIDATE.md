# P2 单文件增量排序合并 v1 · 候选工程说明

- 状态：开发测试候选，承接 P1；未得到用户授权晋级正式冻结基线。唯一正式冻结基线仍是 GLS v5.2「同词无变化通知收口 v1」（2026-10-18）。
- 唯一业务源码变更：`src/core/search/search-and-ranking-methods.js`。
- 改造：索引变更指定有限路径、已生成过结果时，不再将全部保留行二次排序；使用原 `_rankCandidates` 计算变化行的匹配、筛选、频道、排序，然后用原 `_compareResults` 合并到有序结果。1–8 个新增结果使用二分插入，大批量使用线性合并；超过 64 路径、首次结果、空/未知路径、整体查询和排序变化均仍走原来的完整排序。
- 保持：`fullResults` 的 path 顺序、最佳匹配/正文频道边界、频道计数、已选路径、摘要失效代际、渲染触发、滚动锚点、缓存、搜索/排序接口、用户设置/文件/NAS 时间所有权。
- 测试：`tests/incremental-result-ranking.test.mjs`（字段/方向/筛选/插入/删除/连续 200 批差分、全量 fallback、局部 DOM 更新）；`scripts/benchmark-incremental-ranking.mjs` 可在父 P1 与本候选 Source 根目录分别运行，避免捏造真实 UI 帧耗时。
- 持久化：沿用 P1 的 `index-cache.json` 序列化，未新增字段或文件。
- iOS 限制：Chromium 模拟和 Node 单元测试不能替代真实 iPhone Obsidian/WebKit 验收。
- 使用：复制本候选运行包仅替换 `main.js` 与 `styles.css`；保留原 `manifest.json`、`data.json`、仓库元数据；安装测试前做好备份。
