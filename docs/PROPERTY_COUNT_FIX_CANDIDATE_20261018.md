# GLS v5.2 · 后台摘要精准刷新 v1 + 属性计数语义统一 v1 · 开发候选说明

> **未冻结**；唯一正式代码基线：GLS v5.2「关键词匹配按需计算 v1」（2026-10-18）。
> 正式基线 ZIP SHA-256：`c3f4a5530994fc1dfef37364d4fa73da531232ad751e275853666ee6c404ac8b`。

## 问题根因与修复边界

- 当前属性 Picker 的 `valueCount()` 错将 `buildPropertyUsageStats().projectedCounts`（同键多选 OR 投影）当作属性值本身真实文件数显示。
- 正常 Picker 单击其他属性值实际为 **replace 单选**，而显式多选 Draft 才用 OR；故选中命中 1 个文件的项目后，其余项目错误 `+1`。
- 另有属性键行 `projectedKeyCount` 把 62 个有项目属性的文件显示成 1。
- 修改 `src/features/facets/property-picker-methods.js`：值行取 `stats.counts`，键行取 `stats.present`，与现有导航树同口径。保留原有 OR 投影纯算法及状态、事件、可用性契约，前端单击、显式多选、滚动/输入均不改动。
- 顶部范围数字原样显示，辅助标签明确为“当前文件范围总数”，避免与筛选结果数混淆；该标签在桌面可由 aria-labelledby 所属隐藏文本实现。

## 相对正式基线的运行源码差异

- `src/features/facets/property-picker-methods.js`
- `src/features/results/page-and-snippets-methods.js`
- `src/features/results/SearchResultRendererController.js`
- `src/core/search/search-and-ranking-methods.js`

包含上一轮后台摘要候选 v1 的 3 处既有修改；本次计数修复仅新增 property-picker-methods.js 的变更。整合候选并不是新的正式基线。

## 证据与回归

- 163 个模拟文件、真实构建的 Picker：正式版移动/桌面各 **22/32**，当前计数修复版移动/桌面各 **32/32**。
- 单选、重开、高亮、清空、快捷入口、显式多选 OR、含两个 YAML 值文件去重、已知零文件项目、文件夹范围、导航计数一致性均覆盖。
- Node **138/138**；桌面+移动浏览器业务 **40/40**。
- 整合包专项执行搜索条件、侧栏和索引恢复的结果见单独日志和最终交付报告。
- 全部是 Chromium 模拟 Obsidian 数据；**不等于真实 iPhone WebKit/iOS 原生验收**。
- 未修改真实 `manifest.json` 或 `data.json`；未取得 manifest，不能校验真实插件 ID 是否与用户当前安装一致，覆盖前保留其原文件。
- 历史 `picker_portal_chromium_retest.py` 另一个脚本有空面板访问而失败；正确的 `picker_portal_audit.py` 限定 Chromium 时 48/48 通过，未将前者算作通过。

## 安装

备份当前 main.js/styles.css，保留原 `manifest.json` 和 `data.json`。将完整 main.js.txt 重命名为 main.js，与 CSS 覆盖既有插件目录，然后重启 Obsidian。回退使用现有正式基线的两运行文件。

## 自动复验

`npm run check && npm run build && npm test`

`python3 scripts/property_count_acceptance.py --subject current --profile mobile`

`python3 scripts/property_count_acceptance.py --subject current --profile desktop`
