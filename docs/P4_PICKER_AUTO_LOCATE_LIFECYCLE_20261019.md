# GLS v5.2 · P4 Picker 定位帧生命周期收口 v1（开发测试候选）

**日期：2026-10-19。** 本版本只从 P1+P2+P3 完整模块化 Source 派生，不涉及 2026-10-18 唯一正式冻结基线的晋升或覆盖。

## 根因和收口范围

原实现：`folder-picker`、`tag-picker`、`property-picker` 内部的 `autoLocate` 直接调用 `requestAnimationFrame`。连续重绘会让多个已经过时的定位回调排队；关闭 Picker 后已排队帧仍会执行回调（原内部连接性检查会阻止后续滚动），是一种可避免的异步资源浪费。

候选实现：在现有 `ui/pickers/picker-shell.js` 定义 `createPickerAutoLocateScheduler(panel,list)`，仅在上述三种使用自动定位的 Picker 初始化时创建。每个 Surface 在一帧之前只保留最后一次定位任务，更新时取消旧帧，关闭时使用既有 `registerPickerCleanup` 取消剩余任务。不新增长期持久化字段、全局时钟、第二份状态和额外事件源。

四个运行 JS 模块：
- `src/ui/pickers/picker-shell.js`
- `src/ui/pickers/folder-picker.js`
- `src/features/facets/tag-picker-methods.js`
- `src/features/facets/property-picker-methods.js`

所有现有定位策略（已选行、查询为空、Panel 仍是活动页、滚动边界）都在原回调中继续处理。无焦点操作、键盘操作或 CSS 改动。`src/styles/styles.css` 与 P1+P2+P3 字节一致。

## 为什么不继续大规模去重

静态资源审计显示关键生命周期 Owner（SearchCore、SearchWindowSession、Dropdown、Renderer、Navigator）已经有明确的 destroy / close 路径；不能仅因为 `addEventListener` 的源码次数多于 `removeEventListener` 就当作泄漏（挂在临时 DOM 上的监听随节点生命周期释放）。没有可重现故障证据的不动，保留已有窗口化、增量索引、排序、焦点与原生滚动实现。

## 验证

- `npm run check && npm run build && npm test`
- `node --test tests/p4-picker-auto-locate.test.mjs`
- `node scripts/p4_auto_locate_benchmark.mjs`
- `python3 scripts/p4_resource_owner_audit.py`
- `CHROMIUM_PATH=/usr/bin/chromium python3 scripts/p4_picker_auto_locate_browser.py`
- 既有 Navigator / mobile sidebar / Picker caret / Portal 回归。

合成帧队列基准并不等于整页 FPS 或真实 iOS 卡顿数据；Chromium 模拟宿主不构成 iPhone/WebKit 验收。发布前须用户自行实机验证和授权晋升正式冻结基线。

## 测试工程并行写盘竞态修复（仅测试代码）

首次独立解压运行 `npm test` 时发现 Node 测试文件并行启动，每个进程均可能重新生成共享 `tests/generated/subject.cjs` / `baseline-subject.cjs`，原测试工具直接覆盖写入；读取进程可能遇到不完整 JavaScript，导致 `Unexpected end of input`。修复 `tests/harness.mjs`：按进程生成临时文件，再以 `renameSync` 原子替换共享产物；新增 `tests/p4-test-harness-atomic.test.mjs` 两项测试。此变更不是插件运行源码。最新 Node 完整回归 209/209 通过。

本说明中的清单和合成测试均不等于用户 Obsidian 真机验收。

另修复 `tests/incremental-result-ranking.test.mjs` 原先隐式依赖其他测试先构建 `subject.cjs` 的冷启动问题：其 before 钩子显式调用 `prepareSubjects()`。两项均只修改测试工程。
