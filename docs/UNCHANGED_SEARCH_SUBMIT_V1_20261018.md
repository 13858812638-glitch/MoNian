# GLS v5.2 · 同词无变化提交收口 v1（开发候选，未冻结）

## 唯一正式基线

GLS v5.2「Navigator 行尾按压反馈 v1」于 2026-10-18 正式冻结，完整 Source SHA-256 `9f153179859a59103f3a9cfa5758db64b8e80cb9083d91d483f6e7779ebf5ea8`，本候选从该 ZIP 全新解压派生。正式 Source 未修改。

## 变更

1. `src/core/search/input-and-filters-methods.js`：`_commitSearchInputValue()` 仍执行既有清理旧搜索计时器、状态通知、搜索控件同步、IME 阻断与创建态处理；只有当 **原始文本精确等于已提交的 `queryState.raw`**、结果曾正式渲染、无待处理索引更新/首次锚点、当前不是创建态时才停止后续 150ms 搜索或空串搜索。不改变 `performSearch()`，也不跳过真正新输入。
2. `src/features/sort/SearchSortController.js`：`applyField()` 先保留时间依据保存及控件同步、关闭滑动项，在确认排序字段未变且没有时间依据、创建态、索引、未提交输入/IME、初始结果等变化后，跳过重复 `performSearch()`。`cycleField()` 不再提前覆盖 `core.sortField`，由 `applyField()` 比较旧/新字段，保持循环切换真实执行。

## 不变

筛选 OR/AND、多选、结果缓存、异步摘要代次、虚拟滚动、后台索引更新、创建态、其他 Picker、Navigator、iOS 触控及 CSS 均不改。**程序性直接调用 `performSearch(query)` 仍执行完整搜索**，本候选专门收口两个可确定无变化的 UI 提交入口。

## 测试

`python scripts/unchanged_submit_acceptance.py --source . --output reports/unchanged-submit.json --files 300 --mode both --strict`

`python scripts/unchanged_submit_benchmark.py --source . --output reports/unchanged-submit-bench.json --files 300 3000`

Python 脚本依赖 Playwright Chromium 和既有 `tests/host.js`、`tests/generated/subject.cjs`。本工程 Node 测试依旧 `npm run check && npm run build && npm test`。外部依赖文件 `manifest.json` 没有随 Source 提供；实际用户插件 ID 不在本轮校验范围。

## 已知限制

自动化为 Chromium 假 Obsidian 宿主，不是真实 iPhone Obsidian/WebKit、真实 NAS 仓库或生产性能数据；旧版全局 A/B 的文件夹候选计数口径历史差异仍存在，不能据此归因本轮。正式冻结需要用户另行明确确认。
