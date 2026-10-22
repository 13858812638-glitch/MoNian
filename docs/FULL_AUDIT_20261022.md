# 全源审计与共享渲染生命周期候选 · 2026-10-22

唯一开发起点：当前会话刚交付的 `90711546f2f12b8972d22cec63c9482f9b8471dd`。没有从最初上传 ZIP、冻结版本或其他候选回填运行代码。

**结论：还有优化空间，不能称为“完美产品”或“最丝滑”。** 本轮完成全源静态清点、下列相关交互/状态链审查和自动化回归，并修正了已复现的生命周期与无变化刷新问题。全源扫描不等于逐个功能在原生 Obsidian 上全部验收；也不等于已经满足本轮新提出的所有归一标准。尚未闭环项在文末明确列出。

## 审计范围与权威职责

全源清点包括 153 个 JS 模块、1 个生产 CSS；文件逐项 SHA256、行数、事件/监听/定时器引用、CSS 解析结果、重复选择器候选、Style Settings 参数消费见 `reports/current/full-source-style-audit.json`。模块图由真实 import 生成，无孤立运行模块、循环或未解析标识符。未据静态引用数删除动态装配方法。

| 链路 | 已检查的实现/边界 | 审查结论 |
|---|---|---|
| 宿主生命周期 | SearchView → SearchCore → SearchWorkspaceCapabilities；SearchWindowSession；LocalSearchPlugin 卸载 | 每宿主一个 Core；监听、Frame、手势租约随宿主释放。真实原生叶视图仍需实机确认。 |
| 文件夹/标签/属性选择 | Navigator.select → FilterState → _onFilterChanged → performSearch → renderer；Navigator 投影与计数 | FilterState 是条件源；展开属于 Navigator，不应驱动搜索。全局目录与当前范围计数是派生数据；桌面/移动的目录策略仍有差异，见未闭环项。 |
| 搜索/索引/缓存 | QueryState、FilterEngine、ResultRanker、index-queue、file-index、通知链、正文回填 generation、导航派生缓存 | 搜索/筛选/排序职责分离；异步摘要代际保护；卡片缓存有上限与内容校验。缓存不是另一份可编辑索引。 |
| 卡片/虚拟列表/高度 | result-card、browse-card-reuse、page-and-snippets、virtual-window、viewport-anchors/geometry、SparseHeightIndex | 确认离屏观察后断开重绑、失败数组污染、重复区间遍历与重复配置归一；本轮修正。 |
| 设置与同步 | view-preferences、settings-storage、SharedSearchStateCoordinator | 确认相同设置仍刷新；发布者确认自身状态只给桌面 sidebar 的限制没有业务必要；本轮修正。保存失败的筛选池回滚继续保留。 |
| 弹窗定位/提交 | SearchDropdownController、sidebar-popup、geometry、dialog-session、dialog-surface、submission、OverlayHost | Sidebar 定位依据发起 Core 的宿主，未改全局弹窗；共享 Dialog Surface 与提交锁。移动/桌面几何适配保留原所有权。 |
| 输入/焦点/键盘 | input-controls、picker-shell、folder-picker、create/input-mode、mobile-frame、宿主聚焦路径 | 原生 input 是焦点源；Focus Guard 共用；未添加 blur→延迟 focus 或假光标。现有键盘临时锁框与新增标准存在参数缺口，见下。 |
| 手势/拖拽/键盘命令 | SwipeActionCoordinator、swipe-back、PointerSortCoordinator、NavigatorCustomization、desktop-pane、Selection | 各行为有自己的所有者和销毁出口；桌面 sidebar 根已不注册返回手势，子 Picker 仍拥有返回租约。没有为了减少代码删除有实际语义的取消/回滚。 |
| DOM/样式/组件 | 共享 Search Text Field、Tree Row、Dialog Surface、输入 Primitive、Picker Header、Style Settings、全部 inline-style 引用 | 组件源存在并被复用；已检查 64 处 `.style` 等引用，大多是运行时坐标、树深、用户颜色、拖动/键盘测量；不能把它们统一当静态样式删除。 |
| Style Settings / CSS Snippet | 723 条 CSS 规则；28 个 heading、143 个参数；仓库 CSS 文件清单 | 无 CSS 解析错误、重复 setting ID、同名 Section 根或无消费者参数候选。用户说明默认主题、无关 CSS 片段；本轮没有用户 Vault/实际片段可读取，不能替其验证宿主注入后的最终设置树。 |

CSS 重复候选已分类：两段 `:root`、两段 `body.is-mobile` 分别定义不同参数；导航滚动容器两段分别是布局和分隔线参数，不是竞争写同一属性。`overflow: hidden; overflow: clip` 是 CSS 支持回退，不按“重复行”机械删除。

## 已复现并修正

1. **卡片构建阶段提前注册 ResizeObserver。** 页面提交随后断开并重新观察，失败还需要清理离屏观察对象。现在 `_buildResultItem` 仅构建；页面、滚动窗口、单行替换成功挂载后，经同一个 `_observeShell` 注册。删除构建失败后“修补离屏监听”的多余逻辑。
2. **虚拟滚动构建污染现有数组。** `previousItems` 原来与构建写入的 `core.resultEls` 是同一数组；第三张新卡抛错时，恢复引用仍夹带前两张离屏卡。现在临时数组与已提交数组分离，失败时原 DOM 和原数组均保持。
3. **缓存页绕开正式区间遍历。** 删除 `browse-card-reuse.append` 的第二份循环；所有页面调用 `_appendPositionRange`。事务只负责单卡暂存/复用/提交/回滚；不再自己映射位置到结果索引。
4. **卡片配置多次归一。** `activeViewConfig` 已归一内容顺序；卡片不再重新归一该顺序，摘要消费本次已取得的行数；未引入第二份持久配置缓存。
5. **五类无变化设置仍做工作。** 已选视图、空配置 patch、默认状态再重置、相同筛选池、相同排序偏好，在测量锚点、投影、写盘前退出。重置复用配置更新路径，保留原返回值和真实变化刷新。
6. **共享状态发布者重复自消费。** 已提交且与合并结果一致的发布者，各宿主统一确认 revision；仍有待合并字段的旧宿主继续受编辑/滚动/Picker 门禁约束，不跳过真实同步。

没有修改 CSS、弹窗坐标、移动焦点、手势或存储结构；本轮渲染生命周期改动由桌面和移动共用，没有添加桌面专用实现。既有桌面卡片缓存的启用范围仍未扩大。

## 复现与验证

修改前先保留失败证据：生命周期 14 项中 13 项失败、1 项通过；设置 6 项中 5 项失败、1 项通过。修正后生命周期 14/14、设置与共享同步专项 9/9。完整回归、构建与最终下载校验结果见 `reports/unified-audit-validation.json`、`reports/unified-audit-delivery.json`。

本轮有效证据是“少做了什么”：全页每张新卡高度观察由两次降到一次；构建失败不获取高度监听；每次区间遍历走一处；相同设置的测量/刷新/保存均为零。不能把这些次数直接换算为原生帧率、输入延迟或总体提速百分比。

## 连续切换的对照测量

在 Chromium 模拟宿主中，以 4 倍 CPU 降速，按“基线 → 候选 → 候选 → 基线”分别执行 40 次展开/折叠、50 次文件夹点击。所有点击到达、末次状态、滚动覆盖和单箭头检查通过。这里仅统计同步 `Navigator.select`，不是输入到绘制完成时间。

| 数据量 | 基线两轮平均耗时 | 候选两轮平均耗时 | 结论 |
|---|---:|---:|---|
| 161 文件 | 19.96 ms | 20.08 ms | 没有可认定的改善 |
| 2400 文件 | 21.41 ms | 20.52 ms | 均值略降，但尾部耗时没有同步改善，不能认定稳定提速 |

完整逐轮均值、P95、最大值见 `reports/unified-audit-benchmark.json`。候选第二轮 `renderPage` 平均约 11–12 ms，仍是同步选择的主要耗时部分；全页提交中的节点替换值得继续检查。当前证据只足以确认冗余减少与失败安全修正，不足以宣称用户反馈的卡顿已经消失。

## 仍未闭环，不能宣称达到新标准

- **平台策略仍需统一。** Navigator 的稳定目录、缓存分代和投影调度仍有 `desktopSidebar` 分支；普通浏览卡缓存仍只在桌面 sidebar 启用。这并非两套完整 Core，但部分差异也不只是输入能力，尚未达到“仅允许真实输入能力差异”的严格标准。不能为了形式一致，把桌面策略直接复制到已流畅的移动端。
- **属性写入 Primitive 有重复。** Navigator 和 Filter Rail 各自保存辅助标签意图并抑制相同写入，而 Hover Hint Owner 又转换 aria-label。需要把标签意图与无障碍转换归入共享 Primitive/Owner，不能再加第三个局部 helper；这轮未将其冒险合并进焦点/无障碍链。
- **键盘参数缺口。** 已有 `--ui-mobile-modal-height:83.5dvh`、安全区顶部定位和临时锁框；没有 `--ui-mobile-keyboard-height:min(520px,55vh)`。当前内部避让由真实宿主键盘信号和可见区域测量驱动。没有只声明一个无消费者 token 假装达标；新高度规则需要接入内部滚动容器，并验证连续输入、父子 Picker 和原生键盘。
- **全部同类弹窗的外框稳定性未全平台证明。** 自动化覆盖既有窗口、Picker、Dialog 的代表场景；不足以证明所有内容长度、语言、CSS 设置和移动键盘组合下尺寸完全稳定。
- **原生性能与集成证据缺失。** 当前可运行的是 Chromium + 模拟 Obsidian API。没有用户真实 Vault、原生桌面性能录制、iOS/Android 真机或当前三方插件源码。浏览器基准不能替代这些验收。

这些是本轮明确留下的审计事项，不作为已修复或已通过项目统计。本包是可复验候选，不是冻结正式版。
