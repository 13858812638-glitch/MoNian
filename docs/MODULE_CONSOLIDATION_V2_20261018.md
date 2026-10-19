> **最新权威冻结声明（2026-10-18）：GLS v5.2「模块归一 v2」已由用户正式确认为唯一开发基线。**本包所有运行源码、dist JS/CSS 与 v2 候选字节一致。以前任何“候选”“独立浮窗退役仍为正式基线”表述均为当时历史状态，不能覆盖本次冻结。后续仅从本包 `src/` 派生候选，历史 `baseline/` 只供回退对照。详见 `docs/FORMAL_BASELINE_MODULE_CONSOLIDATION_V2_20261018.md`。

---

# GLS v5.2 · 模块归一 v2 候选（2026-10-18）

## 范围与原则

基于上一轮「模块归一 v1」146 模块候选源码；正式冻结起点仍为 GLS v5.2「独立浮窗退役」。这一轮聚焦 **Picker 多选/排序/维护模式互斥规则收口**及 `project-catalog-methods.js` 遗留命名，不删除任何仍承担独立业务/宿主所有权的模块。当前 146 模块数量不变。

### 运行源码变化

1. `ui/pickers/selection-mode.js` 新增纯函数 `deactivateConflictingFacetPickerModes()`：集中维护维护模式 `setActive("")`、多选模式 `setActive(false)`、排序模式 `setActive(false)` 的退出顺序。此函数**无新状态、监听器、计时器**，并保留文件夹排序“维护先退”、标签/属性排序“多选先退”的历史顺序。
2. `ui/pickers/sort-mode.js` 新增 `attachFacetPickerSortModeToggle()`：继续复用原有 `attachPickerSortModeToggle()`，把三个 Picker 重复的排序启动、互斥退出、拖拽使能与选择行同步回调收进同一个职责 Owner。`PointerSortCoordinator` 以及具体拖拽提交仍归各 Picker；结果视图排序不变。
3. `features/facets/{folder,tag,property}-picker-methods.js` 改为调用上述原语。保留创建模式、筛选池模式、普通筛选、属性快速值模式的全部限制与原来触发的刷新。
4. `features/plugin/project-catalog-methods.js` **改名**为 `property-catalog-methods.js`，内部方法组常量改名，`LocalSearchPlugin` 引用同步更新。属性目录数据模型与公开方法名、调用参数、写入路径全部不变。旧目录名字仅留在冻结 `baseline/` 和溯源记录；运行 `src/` 不再有这个文件。
5. `docs/APPROVED_CHANGES.json` 与 `scripts/check-change-scope.mjs`、`scripts/check.mjs` 为源文件改名增加**精确路径和 SHA-256 门禁**，不放开任意新增/删除文件。当前模块索引、历史方法索引同步更新。

### 刻意不做的合并

- 标签是层级路径，属性值有 typed/special values，文件夹存在真实 `TFolder` 及文件迁移：三种 `onCommit` 语义不同，不能共享。
- 拖拽树形校验、属性排序 ID 解析和实际目录文件操作不合并，也没有为了减少 146 这个数字强制移动代码。
- 不修改 `styles.css`、默认设置、Plugin ID、命令、对外 API、筛选应用规则、Dialog/Portal、iOS 输入法、渲染或同步策略。

## 验证

- **先红后绿**：新增 6 项专项断言，原始 v1 0/6、v2 6/6。
- **Node**：134/134；`check`、`build` 通过，0 未解析依赖/循环。
- **浏览器 A/B**：桌面/手机 × 深/浅色四组，三个 Picker，每个 8 次真实按钮模式切换（共 12 条序列），A/B 状态快照一致。冻结 v1 可复跑快照位于 `tests/reference/module-unification-v1-subject.cjs`。
- **移动侧栏**：96/96；**导航**：76/76；**索引恢复**：7/7；**Picker 光标**：36/36；**Portal Chromium**：48 个检查通过；**搜索条件**：B 144/144 通过。
- **源代码与 Style Settings**：CSS 完全继承 v5.2 正式版；143 项设置不变。原始 WebKit/iPhone/Android 宿主实机未测试。

## 风险与推广条件

此次为**结构性归一，不承诺性能提升**。共享模式切换仅改变实现所在位置、不改变刷新次数或事件发射次数；进一步减少渲染次数需单独追踪用户可见状态与 iOS 时序，不能顺手调整。通过 Chromium 不能代替 iPhone WebKit 实际验收。v5.2 冻结包保持不变，本版为候选。
