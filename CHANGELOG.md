# GLS v5.2「Navigator 一体化操作面板 v1」开发候选（2026-10-19） · 工作状态声明

> **仅开发测试候选，不是正式冻结基线。** 唯一正式冻结开发基线仍为 GLS v5.2「分级标签极速创建 v1」（2026-10-19），其 ZIP SHA256 为 `05cc6ef1c0a8f7dadcfaf19cf0306cf12cf7c58477c08f261d9c9682969ec55f`。此工作副本由该 Source 的 `src/` 派生，不修改原正式包。候选仅在用户实际安装测试、明确授权后才能升级冻结。详情见 `docs/CANDIDATE_NAVIGATOR_UNIFIED_ACTIONS_V1_20261019.md`。

---

> **唯一最新正式冻结基线：GLS v5.2「分级标签极速创建 v1」（2026-10-19）。** 用户已明确授权将原「分级标签极速创建 v1」候选原样晋升为正式版；上一正式基线 GLS v5.2「P1–P4 工程优化 · 返回筛选首帧一致与 CSS 默认值 v1」 改为历史只读回退。**冻结仅新增正式声明、更新顶层文档状态，不修改 `src/`、`dist/`、CSS、测试、构建、JSON 规则或实际运行行为。** 本包以 `docs/FORMAL_BASELINE_TAG_HIERARCHY_COMPOSER_V1_20261019.md` 的声明为最新版本状态权威，后续开发必须从本包 `src/` 复制派生新候选；以下旧文档中写有“未冻结”“父版仍为正式基线”等均是当时历史状态，不适用于当前冻结版。

---

> **当前研发候选：GLS v5.2「分级标签极速创建 v1」（2026-10-19，未冻结）。** 以 2026-10-19 已正式冻结的「P1–P4 工程优化 · 返回筛选首帧一致与 CSS 默认值 v1」完整模块化 Source 为唯一父版本派生。**父版本仍是唯一正式基线，本候选不修改或取代冻结包**。新增的分级标签创建仅复用现有标签 Picker/元数据 Owner，无新数据存储、无 manifest/data 变更。详见 `docs/TAG_HIERARCHY_COMPOSER_V1_20261019.md`。以下旧版状态声明仅为历史文档。

---

> **唯一最新正式冻结基线：GLS v5.2「P1–P4 工程优化 · 返回筛选首帧一致与 CSS 默认值 v1」（2026-10-19）。** 已由用户明确确认将上一整合候选原样晋升。**本次不修改任何运行代码、CSS、JSON 显示与计数语义、测试及构建脚本**；旧文档中“候选”“当前正式基线仍为 2026-10-18”等声明均属于历史时间点，现以 `docs/FORMAL_BASELINE_P1P2P3P4_RETURN_FILTER_20261019.md` 为唯一权威状态。后续开发只能复制本包 `src/` 派生新候选，冻结包只读。

---

> **当前研发候选（未冻结）：GLS v5.2 P1P2P3P4「返回筛选首帧一致 + CSS Snapshot v1」**。继承上一「Navigator 按压与 Swipe 基线对齐 v1」候选，仅修复移动端 Results → Filters 投影时序，并将 `ls-result-card-pad-x`、`ls-item-pad-y` 两个 CSS 默认值更新为 6px；详见 `docs/NAVIGATOR_RETURN_ATOMIC_AND_CSS_SNAPSHOT_V1_20261019.md`。正式冻结基线仍为 2026-10-18「同词无变化通知收口 v1」。

> 当前最新研发候选：**GLS v5.2 P1P2P3P4「Navigator 按压与 Swipe 基线对齐 v1」**。唯一源码起点为本包 `src/`；详情见 `docs/NAV_PRESS_SWIPE_ALIGNMENT_20261019.md`。正式冻结基线仍是 2026-10-18「同词无变化通知收口 v1」，未升级。

> **最新唯一正式冻结基线（2026-10-18）：GLS v5.2「同词无变化通知收口 v1」。** 已由用户明确批准晋升。运行代码、`src/`、`dist/`、`scripts/`、`tests/` 与上轮候选逐字节相同。本文件以下的“候选版”“上一正式基线”仅是历史时点记录，当前权威状态请查阅 `docs/FORMAL_BASELINE_NOOP_NOTIFICATION_V1_20261018.md`；正式 Source 不可直接改动，后续只能复制开发候选。

---

> **开发候选（非正式冻结）** GLS v5.2「同词无变化通知收口 v1」（2026-10-18），从正式「同词无变化提交收口 v1」派生。唯一正式冻结源码仍为上一基线；参见 `docs/NOOP_INPUT_NOTIFICATION_V1_20261018.md`。

> **当前唯一正式基线：GLS v5.2「同词无变化提交收口 v1」（2026-10-18）。** 冻结动作仅添加声明并更新工程顶部状态，不修改运行源码与测试。历史候选/基线称呼均属历史记录，现以 `docs/FORMAL_BASELINE_NOOP_SEARCH_V1_20261018.md` 为准。

---

> **2026-10-18 · GLS v5.2「同词无变化提交收口 v1」开发候选（未冻结）**：唯一正式冻结源码仍为 GLS v5.2「Navigator 行尾按压反馈 v1」。本候选只变更 `src/core/search/input-and-filters-methods.js` 和 `src/features/sort/SearchSortController.js`，覆盖无变化输入和排序提交；保留正式基线、全部 UI/CSS、公开接口及数据行为。见 `docs/UNCHANGED_SEARCH_SUBMIT_V1_20261018.md`。

> **最新唯一正式基线：GLS v5.2「Navigator 行尾按压反馈 v1」（2026-10-18）。** 本次晋级仅补充冻结声明与文件命名，所有运行代码、脚本及测试保持候选版逐字节一致。原文出现的“候选版”“旧正式基线”等仅反映历史时点，最新状态以 `docs/FORMAL_BASELINE_NAVIGATOR_TRAILING_PRESSED_V1_20261018.md` 为准。后续只以该正式 Source 复制派生候选，正式包不可直接修改。

---

## 2026-10-18 · Navigator 整行命中 v1（开发候选，未冻结）
- 左侧导航文件夹、标签、属性和分组标题的计数/背景命中委托至原生主按钮；未增加全局监听、计时器或状态管理器。
- 折叠箭头、桌面管理按钮、排序与维护动作仍归现有交互 Owner。
- 唯一运行源码修改：`src/features/navigator/SearchNavigatorController.js`；CSS 完全未修改。
- 仅测试宿主 Chromium，未完成真实 iPhone WebKit 验收。

> **最新唯一正式冻结基线（2026-10-18）：GLS v5.2「后台摘要与属性计数整合 v1」。** 用户已明确批准将上一轮整合候选晋升为正式版。本次冻结只更新文档和压缩包目录；`src/`、`dist/`、`scripts/`、`tests/`、配置与所有运行代码保持逐字节一致。旧文档中“候选版”“关键词匹配按需计算 v1 为最新正式基线”等说法属于历史时点，当前状态以 `docs/FORMAL_BASELINE_INTEGRATED_V1_20261018.md` 为准。后续开发必须从此 Source 复制派生候选，不得修改正式冻结文件。

---

> **本目录权威状态（2026-10-18）：GLS v5.2「后台摘要精准刷新 v1 + 属性计数语义统一 v1」开发测试候选，未冻结。** 最新且唯一正式冻结基线仍为「关键词匹配按需计算 v1」。本候选相较正式基线改变 4 个运行 JS 模块（src/features/facets/property-picker-methods.js, src/features/results/page-and-snippets-methods.js, src/features/results/SearchResultRendererController.js, src/core/search/search-and-ranking-methods.js），CSS/插件 ID/原有文件数据结构不变。整合包继承上一轮尚未冻结的后台摘要精准刷新功能；原后台摘要候选和正式冻结包均未被覆盖。以下旧文档的版本声明仅作历史溯源，不覆盖本行。详见 docs/PROPERTY_COUNT_FIX_CANDIDATE_20261018.md。

---

> **当前目录为开发候选：GLS v5.2「后台摘要精准刷新 v1」（2026-10-18）。** 唯一正式冻结基线仍是 GLS v5.2「关键词匹配按需计算 v1」。本候选不得自动视为正式版本；原正式 ZIP 保留且完全未修改。本候选只改 3 个 `src/` JS 文件，CSS、公开接口与持久化保持不变。

> **最新唯一正式冻结基线（2026-10-18）：GLS v5.2「关键词匹配按需计算 v1」。** 用户已明确确认由候选版提升为正式版。冻结操作仅更新说明及 ZIP 顶层文件夹名；`src/`、`dist/`、`scripts/`、`tests/`、所有运行代码均按字节原样保留。旧文档中“候选”和“Picker 模式单次绘制 v1 是最新正式版”均为历史记录，不再表示当前状态。今后从本 Source `src/` 开发，须另建候选，不得改写冻结包。详见 `docs/FORMAL_BASELINE_LAZY_RANKER_V1_20261018.md`。

---

> **2026-10-18 当前包状态：关键词匹配按需计算 v1【开发候选，未冻结】。** 当前唯一正式代码基线为 GLS v5.2「Picker 模式单次绘制 v1」。本候选仅修改 `src/features/search/ResultRanker.js`，其余业务源码与 CSS 完全一致。历史正式冻结声明保留为溯源文档，不能将本候选称为正式版。详见 `docs/LAZY_RESULT_RANKER_CANDIDATE_20261018.md`。

---

> **当前唯一正式冻结基线（2026-10-18）：GLS v5.2「Picker 模式单次绘制 v1」。** 用户已明确确认将原开发候选提升为正式基线；本次仅更新冻结说明及 ZIP 顶层目录名，`src/`、`dist/`、`tests/`、`scripts/` 和所有运行代码字节未修改。之前关于“模块归一 v2 为正式版”“Picker v1 仍是候选”的说明均为历史状态，不能覆盖本冻结声明。之后只从此正式 Source 的 `src/` 派生新候选；历史 `baseline/` 不作为生产源码。详见 `docs/FORMAL_BASELINE_PICKER_SINGLE_RENDER_V1_20261018.md`。

---

> **当前包的权威状态（2026-10-18）：GLS v5.2「模块归一 v2」→「Picker 模式单次绘制 v1」开发测试候选。** 从最新正式冻结 `GLS v5.2「模块归一 v2」` Source 派生，只修改 5 个业务 JS 文件，原正式基线不动。下文此前阶段的“当前/正式”均为历史记载。本包不是正式冻结版本；详见 `docs/PICKER_SINGLE_FINAL_RENDER_CANDIDATE_20261018.md`。

---

## 2026-10-18 · 正式冻结「模块归一 v2」

- 用户明确要求将本候选提升为新的唯一正式基线；所有运行文件和源码均与原候选完全一致，仅补充权威冻结文档及重命名 Source 文件夹。
- GLS v5.2「独立浮窗退役」改作历史回退版本；下方旧基线状态属于历史记录。
- iOS 实机未验收，不能把冻结误读为性能/宿主问题已修复。

## 2026-10-18 · 模块归一 v2（候选）

- 三类 Facet Picker 的多选、维护、排序互斥切换归一，无新状态；文件夹特殊顺序保持。
- 普通属性目录源模块更正命名；公开属性接口不变。
- 工程索引与准确的源码改名 SHA 门禁同步。
- 本版 146 模块，CSS 未修改，Node 134/134，浏览器 4/4 模式 A/B，搜索条件 144/144。
- GLS v5.2 冻结包不变。

## v5.2 模块归一 v1 开发候选 · 2026-10-18

- 以 GLS v5.2 正式冻结源码为唯一起点，运行逻辑、设置、用户数据及公开接口不变。
- 第一批 3 个单一消费者辅助模块合并回原所有者，并归一完全同语义的标签值规范化。
- 第二批 3 个方法组文件合并到原控制器；保留原对象导出及 `composeClassMethods` 列表次序。
- 152 → 146 源码 JS 模块；639 → 634 导入边；删除 6 个源码文件。
- 保留虚拟列表、Picker/Modal/Workspace 生命周期等高风险独立模块。

## 2026-10-18 · Remove modeless floating search (candidate)

Retire only `SearchFloatingHost`, floating command, session branch and modeless CSS; native Modal, tabs and sidebars remain. Details: `docs/FLOATING_RETIREMENT_CANDIDATE_20261018.md`.

## v5 标题行高统一（候选，2026-10-18）

只修改手机导航分组标题 min-height 的来源，统一使用普通导航行高度，不影响 Picker。

## 2026-10-18 · v5 正式冻结 · 侧栏标题与内容间距

- 经用户授权，v4 仓库名/展开图标及此前 Notebook 渐隐分割线等候选功能随 v5 正式冻结为唯一维护起点。
- 仅改 `src/styles/styles.css`：新增一个 Style Settings `ls-nav-heading-content-gap`（标题与内容间距，默认 6px，0–32px）及消费规则。作用于 mobile 导航中已展开的 `section heading + section content`，三个分组同一逻辑。
- 标题行的共享 row-spacing 不再占用这一独立间距；设置 0px 时视觉间距实际归零，普通列表相邻行间距仍由旧 token 控制。
- 153 个 JS 源模块与 `dist/main.js` 与 v4 哈希一致；其他现存参数默认值、UI、搜索与插件身份未改。
- 新增 Node DOM/CSS 源码契约与 Chromium 几何回归，验证移动深浅色/宽度、桌面无影响、Picker 无影响和折叠不占位。参见 `docs/FORMAL_BASELINE_V5_HEADING_GAP_20261018.md`。

---

## 2026-10-18 · 正式冻结：Navigation Browse Scope v1 / CSS Snapshot 2

- 用户确认升级为唯一正式基线；上一版导航范围与精筛分离 v1 作为代码原点。
- 精确修改两个 Style Settings 默认值：`ls-nav-section-spacing` 0 → 6px，`ls-nav-count-tail` 16 → 2px；同步更改相同两个变量的 CSS 实际默认/回退。
- 不修改 JS、其他 Style Settings 默认值、布局行为、索引、工作台通信或原生输入/键盘。
- 后续从本份完整模块化 Source 的 `src/` 修改，详见 `docs/FORMAL_BASELINE_20261018.md`。

---

## 2026-10-18 · Navigation Browse Scope v1

- 目录与结果计数解耦；全库文件夹树固定，标签/属性按文件夹范围固定。
- 文件夹切换清除临时精筛和搜索词；同维度点击替换/再点取消；显式标签多选 OR。
- 统一 Picker 候选目录而不改变数据、UI、Dialog44、Portal E、NoKeyboardFollow。

## Stability-1 · Native Sidebar No Keyboard Follow 1 (2026-10-17, development candidate)

- Strictly based on original `GLS-Mobile-Sidebar-Stability-1-Source.zip`; neither FirstMount-2 nor iOS A–D diagnostic patches were inherited.
- Only `src/integrations/SearchWorkspaceCapabilities.js` and `src/styles/styles.css` changed in runtime sources.
- Native mobile sidebar no longer mounts `MobileFrameController`; its bottom command toolbar does not subscribe to GLS keyboard/VisualViewport inset adjustments. Touch/Swipe handlers and Obsidian native Leaf sizing are unchanged.
- Removed the sole CSS rule `is-ui-keyboard-open > .local-search-nav-mobile-toolbar { margin-bottom: var(--ui-mobile-keyboard-inset) }` and retained the original mobile toolbar geometry and horizontal scrolling.
- Independent modal / Picker, floating hosts, and the native search tab preserve their existing mobile keyboard handlers. No forced focus, fake caret, fixed body or compensating transforms were introduced.
- Real iPhone WebKit / Obsidian physical keyboard behavior not yet verified. If Obsidian itself resizes its native drawer on keyboard appearance, host geometry remains outside GLS control.

# mobile-sidebar-stability.1 · 移动端侧边栏完整回归修复

唯一修改基线 picker-ios-portal.1。保留 iOS Portal E 条件 display:contents，修复叠层输入命中、外部输入激活原生侧栏键盘锁定（保留 Picker 先前已开启键盘的接力）、遮挡下方命令栏、原生侧栏和 safe-area-top-cover 背景（含关闭/重开边界）、结果页原生搜索框显隐兼容、工具栏切页横向滚动位置。额外修复单次 NAS/IO 读取失败导致的永久旧索引：独立失败隔离、有限退避（不再失去队列记录）、删除/卸载清理。不改宿主全局主题、OS 状态栏文本、数据结构、GLS 插件 ID 或工作台公开接口。

新增 `scripts/mobile_sidebar_stability_audit.py`、`scripts/index_queue_stability_audit.mjs`。保留首次失败的 baseline 测试报告以方便后续复测。模拟 Chromium / fixture 不能替代真实 iOS/Obsidian/NAS，报告会分层说明。

---

# modular.4 · 输入焦点路径减法修复

唯一修改基线 modular.3；飞书 7.6.5 为只读对照。删除普通操作的前置 blur；恢复 Picker 共用 Focus Guard；删除 viewport 键盘推断及自锁；去掉移动宿主重复 Picker 重排和重复 Frame refresh。保留显式清空、键盘导航、返回、原生键盘通知、内部让位、公共接口和持久化结构。CSS 与 modular.3 完全一致。

当前实际验证和限制见 docs/FOCUS_REPAIR_MODULAR4.md。以下是历史变更记录。

---

# modular.3 · 2026-10-15

从 modular.2 Source 继续：原生聚焦不再驱动导航重投影；同宽度 resize 不重复更新导航；共享 document 键盘状态，实际键盘才启用临时 Frame；共享主搜索/Picker 触摸与输入 reset；定位入口不重写相同状态。数据与公开接口不变。新增焦点专项，真实 iOS/WebKit 未验证。工程号不替代原 manifest.version。

---

# 工程变更记录

## 2026-10-15.7 / modular.2

唯一基线：本会话 modular.1 Source ZIP。

修复关键词误触发空条件行；默认创建类型不再制造可清空条件。标题/正文频道仅在两者均有结果时提供切换。退出零命中创建预览时，由一个交接入口恢复搜索状态和所有相关筛选投影，删除原来另一退出分支的重复刷新。返回筛选命令清空文本查询并保留真正的筛选条件；复用原检索和缓存更新入口。筛选提交读取实时输入，组词期间保留已提交值；清空同时检查提交态和编辑态。

CSS 删除导航页对频道显隐的重复控制，改由条件行 Owner 写 hidden / aria-hidden。未修改 Picker 光标规则、输入节点、组件外框、样式参数默认值、外部 API、文件写入及 schema。没有新增生产模块、持久字段、监听器、定时器或 rAF。

增加整树源码哈希门禁、按真实正确性验收的 A/B 专项、已有输入焦点进入 Picker 场景、全局监听释放及全源码/CSS只读审计。修正旧测试中直接调用私有数据变更但未走正式筛选提交链的问题，以及统计读取把 aria 辅助文本算进数字的问题。历史失败日志保留。

manifest 缺失，继续只交付两文件覆盖包而非新装包。原生光标未复现；完整跨插件样式所有权、原生键盘与设备性能未封盘。

## modular.1

原始聚合 main.js 拆分为 153 个 ES Module；建立确定性单文件构建、A/B 测试和架构/方法索引。原样式逐字保留。该阶段只验证工程前后一致，不能证明原有产品行为不存在缺陷。

## v5.1 渲染与清空调用链精简 · 2026-10-18 候选

- 异常时先保留旧结果 DOM：renderPage 和虚拟窗口平移的新增卡片均先离屏构建；提交中发生异常也进行回退。
- 创建期间橡皮擦提前禁用并禁止无效失焦；正常清空只同步一次输入动作状态。
- 普通属性值目录空值新增、重命名、删除只发布目录变更通知；文件未改时不重算搜索结果。
- 原 v5.1 JS/CSS 正式冻结产物保持不变。本候选未对 iOS 截图中的 GPU 绘制层穿透作已解决声明。
