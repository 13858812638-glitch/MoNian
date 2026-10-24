> **2026-10-24 结果滚动职责精简（未冻结）**：以 `b2dee87` 为唯一开发基线。结果区普通鼠标/控件键盘动作不再预先启动滚动事务；停稳仅保存宿主位置，待处理索引与共享查询仍由原调度器兑现。见 [实现与验证](RESULT_SCROLL_OWNER_20261024.md)。下文保留历史记录。

> **2026-10-24 桌面结果行交互（未冻结）**：唯一开发基线 `9fa2631`。移除桌面结果侧滑生命周期和悬浮“…”专用路径；桌面结果行共用导航行悬浮/选中样式。移动侧滑保留。见 [实现与验证](DESKTOP_RESULT_SURFACE_20261024.md)。下文保留历史记录。

> **2026-10-23 输入与 Picker 重复工作精简（未冻结）**：唯一开发基线 `90f1ade`。待提交输入只保存编辑缓冲，输入显隐不遍历工具栏；页面同值属性不重复写入，Picker 初始测量统一由 ResizeObserver 负责。见 [实现、测量与边界](INTERACTION_EFFICIENCY_20261023.md)。下文保留历史记录。

> **2026-10-23 Owner 与提交链修复（未冻结）**：唯一开发基线 `d26f42a`。修复审计七项：导航提交去重、同值排序失效、通道节点与焦点、排除索引刷新、页面展示与结果提交、共享状态异常重试、CSS 默认值归属。见 [实现、验收与边界](OWNERSHIP_REPAIR_20261023.md)。下文保留历史记录。

> **2026-10-23 滚动测量精简（未冻结）**：唯一开发基线 `176d307`。共享滚动归零省去上界测量与重复位置读取；CSS 试验因收益不稳已撤回。没有新增缓存、延迟提交或第二套组件。见 [实现与测量](SMOOTH_LAYOUT_20261023.md)。下文保留历史记录。

> **2026-10-23 自适应上下分栏调高（未冻结）**：唯一开发基线 `aed6f38`。现有分隔条按布局统一切换横纵轴；上下布局可拖动调高，宽高分别随会话保存。高度变化只同步分隔边界，不触发导航投影或搜索。见 [实现与验证](STACK_PANE_HEIGHT_20261023.md)。下文保留历史记录。

> **2026-10-23 工具栏与状态同步优化（未冻结）**：以 `1ab2cd7` 为唯一开发基线。桌面左侧顶部命令栏右对齐，共用右侧动作栏的尺寸 Primitive / Token；统计与条件状态复用共享同值更新函数。153 个 JS 模块、664 条静态依赖；本轮修改 2 个 JS 模块及 CSS。见 [实现、测量与边界](TOOLBAR_PERFORMANCE_20261023.md)。下文保留历史记录。

> **2026-10-23 筛选提交优化（未冻结）**：从 `e38dea9` 唯一基线实施审计结论。共享条件组件保留节点、焦点与实时动作；筛选先复位滚动再写控件，结果提交共用一次窗口预算和已构建节点序列。153 个 JS 模块、661 条静态依赖；CSS 不变。见 [本轮实现与验证](FILTER_COMMIT_20261023.md)。下文保留历史记录。

> **当前审计：2026-10-22 交互热路径优化。** 基线 `48269f9`，153 个 JS 模块、659 条静态依赖。本轮减少共享控件无变化 DOM 写入、筛选条同步布局读取及未启用条件的计算，不新增状态或另一套组件。见 [完整审计与验证边界](INTERACTION_PERFORMANCE_20261022.md)。

> **当前整合：2026-10-22 归一版本。** 唯一开发基线 `7fd3f53`，153 个 JS 模块、656 条静态依赖。FilterState / QueryState / Navigator / Renderer / Hover Owner / MobileViewportState 各守原职责；取消平台专属数据缓存、重复标签意图状态和第二条导航提交路径。详见 [整合审计与验证](INTEGRATED_UNIFICATION_20261022.md)。下文保留历史溯源。

> **当前审计：2026-10-22 共享渲染生命周期候选。** 153 个 JS 模块、650 条静态依赖。卡片构建不注册高度监听；提交负责挂载及观察；普通页与缓存页共享区间遍历。当前覆盖与未闭环项见 [全源审计](FULL_AUDIT_20261022.md)。下列旧版本计数与合同按当时背景保留。

# picker-ios-portal.1 当前维护说明

用户 iPhone 确认 diagnostic.caret.2 的 E 阶段出现原生光标。当前版本将该条件落实在共享 Portal CSS：仅 iOS 搜索 Picker 存在、且没有独立同级 Dialog 时使用 display:contents；Portal 的 DOM 与所有权不变。独立 Dialog 保留原有 stacking context。详见 PICKER_IOS_PORTAL_FIX.md。

诊断函数、onload 注册和第九个命令已移除；153 个 JS 模块、641 条静态依赖。主搜索、原生输入和焦点路径不变。永久构建尚未在真机复验。

下文 caret.1 与 modular.4 说明为历史基线；caret.1 已被用户真机反馈否定，不能作为成功修复记录。

# picker-ios-caret.1 当前维护说明

本次上传组合为 modular.4 JS + modular.6 CSS。仅修改 SearchDropdownController 与共享 Picker 输入 CSS；细节及验证边界见 [PICKER_IOS_CARET_REPAIR.md](PICKER_IOS_CARET_REPAIR.md)。下文 modular.4 说明属于历史基线。

# modular.4 当前变更索引

唯一基线为 modular.3，生产目录仍为 153 个 JavaScript 模块 / 641 条静态依赖。本轮完整处理见 FOCUS_REPAIR_MODULAR4.md；下方 modular.3 部分为既有架构背景，以本节的状态/焦点合同为准。

- `core/search/shell-methods.js`：失焦 helper 限定为显式结束编辑，方法 ABI 保留。
- `features/facets/type-picker-methods.js`、`features/navigator/SearchNavigatorController.js`、`features/result-controls/toolbar-methods.js`、`features/sort/SearchSortController.js`：删除普通控制动作对输入的主动失焦；清空和显式返回保留业务与返回行为。
- `ui/components/input-controls.js`：同一编辑会话的按钮 Focus Guard，所有 pointer type 共享；原生文本与拖拽不拦截。
- `ui/pickers/picker-shell.js`：所有共享树形 Picker 在该单一组件绑定/释放同一 Guard，不产生第二套搜索状态。
- `ui/overlays/SearchDropdownController.js`：普通 open/openChild 无前置 blur；首次显示时挂载移动 Frame，重复定位不重新刷新 Frame。父子 DOM、返回栈、提交事务不变。
- `ui/mobile/mobile-frame.js`：删除视口推断和 open 自保持。宿主键盘事件/CSS 提供状态，可见视口只提供几何。公开接口和内部滚动补偿保留。
- `ui/views/SearchView.js`：原生移动侧栏不再根据永不设置的外框 class 决定重排；实际宽度和方向仍走既有 Owner。

本轮 CSS、设置默认值、数据结构、命令、ViewType、公开 API 不变。测试：tests/regression.test.mjs、scripts/browser_ab.py、search_condition_audit.py、focus_audit.py、focus_repair_audit.py、compare_feishu_focus.py。源码批准差异：docs/APPROVED_CHANGES.json；只读飞书对照：tests/reference/feishu-7.6.5。

---

# 架构与维护地图

## 范围

本工程最初由职责拆分建立；当前 modular.3 在保留 modular.2 搜索/筛选修复的基础上，归一焦点、键盘和搜索触摸表面。当前审计见 FOCUS_AUDIT_MODULAR3.md。`src/main.js` 仅导出生命周期类；`src/core/LocalSearchPlugin.js` 保留构造/加载/卸载和依赖初始化；插件业务分别归入 `features/plugin/`。原 `SearchCore` 大类按会话、输入、搜索排序、文件操作、结果事件、界面挂载拆分。

运行源码 **153 文件**，静态依赖 **641 条**，循环依赖 **0**。入口外的 152 个模块列于 `MODULE_INDEX.md`，入口同时列为独立条目。完整、由实际 import 生成的图在 `dependencies.mmd`、`dependencies.dot` 和 `../reports/module-graph.json`。图描述静态导入；`this` 动态调用另见方法索引，不能据此宣称外部动态调用不存在。

## 结构与职责

```text
src/main.js                 对 Obsidian 导出原插件类
src/core/                   生命周期、SearchCore、共享会话与方法组合
src/data/                   文件格式、标签/属性/目录模型、正文索引、时间规则
src/services/               原批量元数据写入、文件事务和 I/O 并发池
src/features/plugin/        索引、持久化、时间、项目目录、公开接口、命令与偏好
src/features/create/        创建草稿、输入模式、预览、模板载荷与提交
src/features/facets/        标签/目录/属性/类型 Picker 与维护操作
src/features/result-controls/ 搜索操作、过滤池、视图编辑和历史
src/features/results/       卡片、频道、摘要、虚拟窗口与滚动锚点
src/features/selection/     多选、Shift 范围、批量互斥与选择栏
src/features/navigator/     原侧栏导航、自定义和工具栏配置
src/features/filters|search|sort/ 查询、筛选与排序模型/控制器
src/ui/                     原组件、Dialog、Picker、窗口宿主、设置和视图
src/interactions/           原 Hover、Swipe-Back、卡片侧滑、拖拽和滚动
src/integrations/           公开版本/能力与 Workspace 能力层
src/utils/                  无业务状态的字符串、路径、DOM、匹配工具
src/styles/styles.css       唯一生产样式源；共同搜索触摸表面与输入重置
```

没有空目录占位，没有为了行数平均切段。大型职责如属性 Picker、Navigator、视图编辑仍允许保持同一个完整模块，不为了做小而拆散一个交互事务。

## 当前焦点/键盘模块索引（modular.3）

`features/navigator/SearchNavigatorController.js` 拥有页面、搜索可见性和导航布局；原生 focus 不是更新输入，width/layout 没变不重复投影。restore 必须显式保证页面投影。

`ui/mobile/mobile-frame.js` 内部的 MobileViewportState 拥有同 document 的键盘事件、宿主 CSS inset、可见视口基线和共享全局监听；它没有持久化，不是第二份业务状态。MobileFrameController 消费 snapshot，拥有自身临时 frameHeight / scrollport；mountMobileFrame 的签名与销毁合同未变。最后一个消费者销毁即释放共享监听。

`ui/overlays/SearchDropdownController.js` 仍拥有唯一 panel 打开、定位、关闭及父子栈；完成原有 CSS sheet 显示后通知 Frame 测量。不得创建第二个 Picker 或移动焦点来解决重绘。

`styles/styles.css` 的 Search Text Field/Input Primitive 拥有主输入与 Picker 的 tap-highlight、输入 reset；caret/selection 仍是原生控件。其余焦点下划线、尺寸与设置 Token 保持原归属。

对应测试：tests/focus-scenarios.js、scripts/focus_audit.py；原几何/交互 A/B 在 tests/browser-scenarios.js、scripts/browser_ab.py；数据/接口在 tests/regression.test.mjs。第三方主题/片段与真实 iOS 的证据不能由模拟宿主替代。

## 原类如何拆开

原代码的 36 个顶层类仍存在；另有函数内部的 `SearchModalHost` 类保留在宿主工厂中。混合大类拆为单一职责的“方法组对象”。`core/compose-class-methods.js` 只完成类定义阶段的描述符组装：不增加调用转发、不保存第二份状态、不改对象原型链，并拒绝重复/缺失方法。方法名称、参数数量、getter/setter、可枚举性及原始键顺序已与原版对照。需要 `super` 的方法留在原生类。

这是显式方法组合，不是旧/新实现兼容层。但它保留了原大类的 `this` 协作约定，因此不是把原状态架构改成完全独立的小服务。未来 AI 维护方法组仍需读取对应构造器和直接 `this` 调用接口。这样的边界是本次避免行为重写的取舍。

## 状态唯一所有权与写入链

| 状态 / 资源 | 原 Owner 与现在的位置 | 输入 / 输出及约束 |
|---|---|---|
| 设置、索引、文件内容缓存、侧车状态 | `LocalSearchPlugin`；`features/plugin/*` | 从 Vault、loadData 和原元数据目录读取；仍走原串行 Promise 写队列，不另建数据库 |
| 元数据正式写入 | `services/BatchMetadataService.js`、`FileOperationService.js` | 接收文件/路径和变更草稿；返回原统计/操作结果；失败和部分成功语义保留 |
| 当前搜索、条件、结果、草稿 | `SearchCore` 及其原控制器 | 输入事件/外部请求进入同一会话；结果和 UI 由原 renderer 更新 |
| 多选和批量互斥 | `SearchSelectionController` | 原 selectedPaths、anchorPath、shiftBasePaths、mutationState，不新增另一套选择集 |
| 虚拟列表 | `SearchResultRendererController`、`SparseHeightIndex` | 原高度估计、窗口/锚点/读取池，DOM 卡片仍只有原一套 |
| Picker 与 Dialog | `SearchDropdownController`、dialog-session | 父子层栈和确认事务租约不改；返回、Esc、焦点恢复走原路径 |
| 手势与 Hover 跨插件协调 | `interactions/swipe-back.js`、hover-hints | 保留原 `Symbol.for` 共享协调机制与释放合同；没有为模块化新增任意全局业务变量 |
| 项目目录 | GLS 索引 + 原 Dida 项目目录只读集成 | 原合并和通知规则保留；工作台不产生新的权威索引 |
| 虚拟属性 | 原 provider 注册表 / 投影缓存 | 只读投影，不写入原 YAML / 持久索引；陈旧句柄不得移除新 provider |
| 外部嵌入会话 | `mountExternalSearch` 原 handle | ready/active/busy/captureSession/setScope/dismissTop/destroy 保留；更新 scope 不更换搜索 input 节点 |

Markdown 的原 frontmatter 和时间写入、Canvas/图片等原 JSON 侧车、元数据目录默认 `GLS-元数据`、最近打开历史、原有迁移判断全部保留。这里的“保留”有片段对照和覆盖场景测试支持，不代表真实 NAS 并发已经实测。

## 常见修改路由

| 需求 | 首读 | 必要依赖 / 测试 |
|---|---|---|
| 搜索输入、橡皮擦、清条件、未命中创建 | core/search/input-and-filters-methods、result-controls/toolbar-methods、create/input-mode-methods | SearchCore / FilterState；browser 02–07、15–16 |
| 重命名/删除位置、焦点、返回 | ui/dialogs/*、core/search/file-actions-methods | FileOperationService、swipe-back；browser 10–14、19 |
| 属性/标签/目录 Picker | features/facets 对应模块、ui/pickers 对应 Primitive | dropdown、batch/property-editor；browser 04–06 + 新增专项 |
| 多选/Shift/批量 | features/selection/SearchSelectionController | result-menu-events；browser 08–09 |
| 虚拟列表、摘要、滚动 | features/results 对应模块 | SparseHeightIndex、IoPool；独立前缀和参考测试 + UI 回归 |
| 时间/NAS/非 Markdown 属性 | features/plugin/time-cache、non-markdown-metadata、markdown-write-tracking | metadata-directory、data/time；Node 非 Markdown/属性/持久化测试，另需真实 NAS 验收 |
| 工作台接入 | integrations/public-contract、features/plugin/external-search、external-properties、project-catalog | Node provider/Dida/API 验证，browser 20 |
| 图标/布局/样式 | 原对应组件 + src/styles/styles.css | 不新增第二份样式源；修改受授权时补主题/视口回归 |

## 当前最大模块

| 文件 | 行数 | 字节 |
|---|---:|---:|
| `src/features/facets/property-picker-methods.js` | 1,099 | 52,615 |
| `src/features/navigator/SearchNavigatorController.js` | 996 | 59,769 |
| `src/features/result-controls/view-composer-methods.js` | 943 | 45,180 |
| `src/features/batch/property-editor-methods.js` | 789 | 37,957 |
| `src/features/result-controls/filter-pool-editor-methods.js` | 789 | 36,216 |
| `src/ui/hosts/SearchWindowSession.js` | 697 | 29,852 |
| `src/interactions/SwipeActionCoordinator.js` | 679 | 29,113 |
| `src/ui/overlays/SearchDropdownController.js` | 670 | 29,992 |

## 构建及影响范围

正常构建只读 `src/` 和固定的依赖，生成一个 CommonJS `dist/main.js`，复制原样式。没有运行时 Node 内置模块；host `obsidian` 由宿主提供。`build.mjs` 的模块缓存只是模块加载设施，不是业务状态源。

基线到源码的映射见 `reports/source-origins.json`：modular.1 最初 **826 / 826** 个声明/方法片段保留原文；当前 modular.2 为 **819 个逐字保留 + 7 个明确批准的修改来源项**，整个源码树另受逐文件哈希门禁约束。脚本或 bundler 自身变更会影响所有运行代码，必须全局回归；普通功能修改可先局部测试，但发布前仍需构建、全体 Node 测试及相关 UI 回归。

## 已知结构取舍

无强制 TypeScript 业务迁移；当前检查覆盖语法、模块/导出解析、未解析符号和片段一致性，不是完整类型证明。打包会改变函数源码字符串、堆栈文件行号和模块求值组织；未承诺 `Function.toString()` 或所有动态反射文本与原聚合文件一样。不要凭静态图删除动态 API。真实设备的加载性能和内存峰值尚未做基准测试。

## modular.2：搜索状态交接合同

- 主输入 / QueryState：输入是防抖前的实时编辑值，QueryState 是已提交查询；它们是编辑缓冲与提交态，不是两份权威查询数据库。组合输入未完成时不可提前提交。
- 当前条件：FilterState → facets.syncFilterButtons/renderPinnedPropertyFilters → _syncResultStateRow。只有实际 Chip 或可切换的双频道存在时渲染行。
- 派生创建：SearchCreateController._leaveDerivedCreateView 同时恢复原 FilterState 与 Chip/类型/筛选池投影。橡皮擦、新查询、返回和清空不得分别修 DOM。
- 返回筛选：setPage("filters") 表达结束文本搜索；保留筛选，提交空 Query，复用原 Navigator generation/cache 投影。已在筛选页的明确返回命令也会清理旧查询。
- 标签/属性/文件夹 Picker：仍共用 input-controls、picker-shell、Dropdown；无新增光标、焦点或键盘状态。

对应新增验证：tests/search-condition-scenarios.js + scripts/search_condition_audit.py。冻结片段索引中的原行号用于溯源，不等于当前源码行号。
