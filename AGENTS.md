> **2026-10-25 原生笔记内部属性片段（未冻结）**：以 `adb3a0a` 为唯一开发基线，生产代码与最新源码包一致。六个 GLS 内部字段仅由独立 CSS Snippet 控制；移除插件 CSS 隐藏规则及对应 Style Settings 开关。见 [迁移与验证](docs/INTERNAL_PROPERTIES_SNIPPET_20261025.md)。

> **2026-10-24 结果滚动职责精简（未冻结）**：以 `b2dee87` 为唯一开发基线。结果区普通鼠标/控件键盘动作不再预先启动滚动事务；停稳仅保存宿主位置，待处理索引与共享查询仍由原调度器兑现。见 [实现与验证](docs/RESULT_SCROLL_OWNER_20261024.md)。下文保留历史记录。

> **2026-10-24 桌面结果行交互（未冻结）**：唯一开发基线 `9fa2631`。移除桌面结果侧滑生命周期和悬浮“…”专用路径；桌面结果行共用导航行悬浮/选中样式。移动侧滑保留。见 [实现与验证](docs/DESKTOP_RESULT_SURFACE_20261024.md)。下文保留历史记录。

> **2026-10-23 输入与 Picker 重复工作精简（未冻结）**：唯一开发基线 `90f1ade`。待提交输入只保存编辑缓冲，输入显隐不遍历工具栏；页面同值属性不重复写入，Picker 初始测量统一由 ResizeObserver 负责。见 [实现、测量与边界](docs/INTERACTION_EFFICIENCY_20261023.md)。下文保留历史记录。

> **2026-10-23 Owner 与提交链修复（未冻结）**：唯一开发基线 `d26f42a`。修复审计七项：导航提交去重、同值排序失效、通道节点与焦点、排除索引刷新、页面展示与结果提交、共享状态异常重试、CSS 默认值归属。见 [实现、验收与边界](docs/OWNERSHIP_REPAIR_20261023.md)。下文保留历史记录。

> **2026-10-23 滚动测量精简（未冻结）**：唯一开发基线 `176d307`。共享滚动归零省去上界测量与重复位置读取；CSS 试验因收益不稳已撤回。没有新增缓存、延迟提交或第二套组件。见 [实现与测量](docs/SMOOTH_LAYOUT_20261023.md)。下文保留历史记录。

> **2026-10-23 自适应上下分栏调高（未冻结）**：唯一开发基线 `aed6f38`。现有分隔条按布局统一切换横纵轴；上下布局可拖动调高，宽高分别随会话保存。高度变化只同步分隔边界，不触发导航投影或搜索。见 [实现与验证](docs/STACK_PANE_HEIGHT_20261023.md)。下文保留历史记录。

> **2026-10-23 工具栏与状态同步优化（未冻结）**：以 `1ab2cd7` 为唯一开发基线。桌面左侧顶部命令栏右对齐，共用右侧动作栏的尺寸 Primitive / Token；统计与条件状态复用共享同值更新函数。153 个 JS 模块、664 条静态依赖；本轮修改 2 个 JS 模块及 CSS。见 [实现、测量与边界](docs/TOOLBAR_PERFORMANCE_20261023.md)。下文保留历史记录。

> **2026-10-23 筛选提交优化（未冻结）**：从 `e38dea9` 唯一基线实施审计结论。共享条件组件保留节点、焦点与实时动作；筛选先复位滚动再写控件，结果提交共用一次窗口预算和已构建节点序列。153 个 JS 模块、661 条静态依赖；CSS 不变。见 [本轮实现与验证](docs/FILTER_COMMIT_20261023.md)。下文保留历史记录。

> **2026-10-22 交互热路径优化（未冻结）**：以 `48269f9` 为唯一基线。6 个运行模块统一减少同值 DOM 写入、横向滚动恢复和未启用筛选计算，CSS/状态/生命周期/公开接口不变。详见 [本轮审计与测量](docs/INTERACTION_PERFORMANCE_20261022.md)。下文为历史版本记录。

> **2026-10-22 整合归一（未冻结）**：以 `7fd3f53` 为唯一开发起点。导航目录/计数、属性展开、投影调度、结果卡复用与节点提交统一；标签归属共享 Hover Owner；移动键盘只约束本 Frame 的内部滚动容器。当前实现、验证和环境边界见 [整合审计](docs/INTEGRATED_UNIFICATION_20261022.md)。下方桌面专属缓存及未归一说明仅作历史记录。

> **2026-10-22 全源审计候选（未冻结）**：统一卡片区间遍历及挂载后的高度监听，修复滚动构建失败污染数组，去掉无变化设置刷新。审计明确记录尚未归一的桌面策略、标签 Primitive 和移动键盘参数；不宣称已经最丝滑。见 [审计范围、修复与未闭环项](docs/FULL_AUDIT_20261022.md)。

> **最新开发候选：侧栏结果卡复用与完整交互链审计（2026-10-22）。** 减少重复筛选的结果卡构建，限定桌面 sidebar 普通浏览，保留内容失效、原子提交和失败回滚；每个窗口最多保留 96 张卡，关闭释放。见 [审计与测量](docs/SIDEBAR_RESULT_REUSE_20261022.md)。仍待原生 Obsidian 验收，以下为历史记录。

> **最新开发候选：侧栏属性展开与隐藏刷新审计（2026-10-22）。** 桌面 sidebar 属性键可原地展开；展开值保持全局目录和当前文件夹计数，隐藏分组延后内部更新。见 [说明与验证](docs/SIDEBAR_PROPERTY_EXPANSION_20261022.md)。仍待原生 Obsidian 验收，以下为历史记录。

> **最新开发候选：侧栏结果筛选条审计（2026-10-22）。** 保留可见文本及无障碍名称节点，抑制重复属性/显隐写入；选中状态、真实计数变化及弹窗锚点继续由原逻辑维护。见 [说明与验证](docs/SIDEBAR_FILTER_RAIL_20261022.md)。仍待原生 Obsidian 验收，以下为历史记录。

> **最新开发候选：侧栏冗余动作审计（2026-10-22）。** 结构不变时跳过逐行位置测量和滚动恢复；文件夹范围不变时复用导航候选与计数。保留结构变化锚点、索引失效及移动端行为。见 [说明与验证](docs/SIDEBAR_REDUNDANT_WORK_20261022.md)。仍待原生 Obsidian 验收，以下为历史记录。

> **最新开发候选：桌面侧栏固定标签/属性列表（2026-10-22）。** 切换文件夹时保留全局导航项和行节点，仅更新目录计数与选择；保留零计数行，减少重复排序、装饰和属性值统计。见 [说明与验证](docs/DESKTOP_STABLE_FACETS_20261022.md)。仍待原生 Obsidian 验收，以下为历史记录。

> **最新开发候选：桌面侧栏鼠标交互（2026-10-22）。** 停用桌面 sidebar 本体的滑动返回，修复轻微横移误吞点击，移除这条手势路径的祖先尺寸检查。见 [说明与验证](docs/DESKTOP_SIDEBAR_MOUSE_20261022.md)。仍待原生 Obsidian 验收，以下为历史记录。

> **最新开发候选：侧栏重复箭头与连续筛选修订（2026-10-22）。** 明确替换复用控件的 SVG，保留辅助标签；减少桌面 sidebar 筛选时的屏外卡片构建。见 [说明与验证](docs/SIDEBAR_ICONS_CLICKS_20261022.md)。仍待原生 Obsidian 验收，以下为历史记录。

> **最新开发候选：移动文件夹 Picker 光标归一（2026-10-22）。** 补齐独立文件夹选择器的 iOS 绘制规则和移动端聚焦合同，保留背景关闭与窗口定位。见 [说明与验证](docs/MOVE_PICKER_CARET_20261022.md)。原生设备待复验，以下为历史记录。

> **最新开发候选：侧栏交付审计（2026-10-21）。** 修复空命令栏重复显隐、分栏拖动取消读数与宿主缩窄时的旧拖动边界；增加保存失败、连续切换、关闭重开及完整工作流检查。见 [说明与验证](docs/SIDEBAR_RELEASE_AUDIT_20261021.md)。尚待原生 Obsidian 验收，以下为历史记录。

> **最新开发候选：整体侧栏刷新优化（2026-10-21）。** 减少命令栏、分组标题和无障碍标签的重复写入，弹窗只随相关滚动更新；见 [说明与验证](docs/SIDEBAR_REFRESH_20261021.md)。仍待用户实机验证，以下为历史记录。

> **最新开发候选：目录切换与折叠优化（2026-10-21）。** 减少结果提交后的强制布局和无效目录行移动，复用排序比较器，精简左侧分组“…”；见 [说明与验证](docs/SIDEBAR_TREE_EFFICIENCY_20261021.md)。仍待用户实机验证，以下为历史记录。

> **最新开发候选：桌面侧栏点击与折叠交互（2026-10-21）。** 修复按住中间底色和重复刷新，仍待用户实机验证；见 [说明](docs/SIDEBAR_CLICK_INTERACTION_20261021.md)。以下为历史记录。

> **当前开发候选：桌面侧栏弹窗与顶部命令栏（2026-10-21）。** 只调整桌面 sidebar 宿主，详见 [说明与验证](docs/SIDEBAR_POPUPS_TOOLBAR_20261021.md)。继承此前侧栏性能、调宽和搜索条右置改进；未晋升正式冻结版本。以下保留历史说明。

> **当前开发候选：GLS v5.2「桌面侧栏优化·搜索条右置」2026-10-19。** 针对用户反馈的桌面文件夹切换/折叠卡顿、箭头显示及分栏宽度调整，从上传的 Navigator 候选继续开发；未升级冻结基线。实现、验证边界与安装说明见 [桌面侧栏候选说明](docs/DESKTOP_NAVIGATOR_20261019.md)。以下版本声明按历史记录保留。

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

**当前开发候选说明（2026-10-18）：**本 Source 为「Navigator 行尾按压反馈 v1」；唯一正式冻结基线仍为「后台摘要与属性计数整合 v1」。仅 Navigator 控制器和独立 CSS 增加移动端尾部按压反馈，完整范围见 `docs/NAVIGATOR_TRAILING_TOUCH_FEEDBACK_V1.md`。

> **最新开发候选（未冻结）：GLS v5.2「Navigator 整行命中 v1」**（2026-10-18）  
> 唯一正式冻结基线仍为 **GLS v5.2「后台摘要与属性计数整合 v1」**。本候选仅修改 `src/features/navigator/SearchNavigatorController.js`，未修改共享 Picker、筛选算法、CSS、manifest / data、公开接口；iOS 真机仍待验收。

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

> **最新权威冻结声明（2026-10-18）：GLS v5.2「模块归一 v2」已由用户正式确认为唯一开发基线。**本包所有运行源码、dist JS/CSS 与 v2 候选字节一致。以前任何“候选”“独立浮窗退役仍为正式基线”表述均为当时历史状态，不能覆盖本次冻结。后续仅从本包 `src/` 派生候选，历史 `baseline/` 只供回退对照。详见 `docs/FORMAL_BASELINE_MODULE_CONSOLIDATION_V2_20261018.md`。

---

> **本轮候选（模块归一 v2）**：以模块归一 v1 源码为候选起点，对 Picker 模式互斥状态执行无状态共享，`project-catalog-methods.js` 更正为 `property-catalog-methods.js`；只修改 src/，方法装配与业务行为不变；正式冻结版仍为 v5.2。详见 `docs/MODULE_CONSOLIDATION_V2_20261018.md`。

> **模块归一开发候选（非正式基线）：** 本 Source 基于 `GLS v5.2「独立浮窗退役」正式冻结 Source` 派生；正式冻结版始终只读，候选还需用户实机验收后才可能升级。详见 `docs/MODULE_CONSOLIDATION_PHASE1.md`、`docs/MODULE_CONSOLIDATION_PHASE2.md`。

> **正式冻结声明（2026-10-18）：** 这是 **GLS v5.2「独立浮窗退役」唯一正式开发基线**；具体规则见 `docs/FORMAL_BASELINE_v5.2_20261018.md`。任何后续模块归一必须从本版 `src/` 派生候选，勿直接覆盖本冻结版。

# 当轮候选 · 独立浮窗退役（不改变正式冻结基线）

只允许从当前 v5.1 RenderGuard 候选的 `src/` 修改；移除独立无模态搜索宿主、命令与其唯一 CSS。Modal、Tab、Sidebar、Embedded 外部接口、Popup/Picker、数据模型与窗口共享几何全部保留。`src/ui/hosts/floating-host.js` 已正式删除，冻结的 baseline/ 只用于对照，不得作为当前生产模块重新构建。基于 `docs/APPROVED_CHANGES.json` 的 `retiredFiles` 校验此次授权删除，禁止留下空壳或浮窗别名。

---

# GLS v5.1 · 唯一正式冻结开发基线（2026-10-18）

**唯一后续开发起点：本包 `src/`。** 已由用户实机确认「标题行高统一」候选版并要求冻结；此前 v5 及所有更早版本仅用于历史比较，不回填补丁。

运行文件完全继承候选版，新增的标题行高规则让移动侧栏的分组标题直接使用 `--ls-nav-row-height`，与普通行一致；`ls-nav-heading-content-gap` 的 6px 默认值不变；所有其他参数和 JS 逻辑不变。

当前审计阶段仅允许维护报告/测试，发现缺陷不自动改变本冻结运行文件。额外修复须单独派生候选源码，先复现后验证。保留原 manifest.json、data.json。

---

# GLS Navigator · 当前唯一正式冻结开发基线（2026-10-18 · v5）

**正式冻结起点：`GLS-v5-标题与内容间距-正式基线-20261018-完整模块化Source.zip`。** 由 v4「仓库名与开合图标」完整模块化 Source 唯一派生；v4 含 Notebook 渐隐分割线、文件夹显示与双数计数、普通属性通用索引、导航范围/精筛分离、Dialog44、iOS Portal E、NoKeyboardFollow。以后所有 GLS 代码修改都从本正式 v5 包的 `src/` 开始构建，不能回退到 v4、v3、v2、Stability-1 等历史候选，也不能直接手工修改聚合 `main.js`。

**本轮冻结授权仅新增一个 CSS 控制中心设置**：`ls-nav-heading-content-gap`（「标题与内容间距」），默认 6px、0–32px，在移动侧栏的每个**已展开**分组标题与首个内容项之间生效；原行间距保持不变，标题行不再额外贡献行间距以确保设为 0 时真实为 0。仅 `src/styles/styles.css` 改动；153 个 JS 模块、编译生成的 `dist/main.js`、其余现有 Style Settings 默认值全部与 v4 逐字节／逐项一致。保留真实 `manifest.json` 和 `data.json`，它们没有包含在源码包中。见 `docs/FORMAL_BASELINE_V5_HEADING_GAP_20261018.md`。

**严禁在本 CSS 功能上恢复焦点或键盘补丁。** 只使用一个新的 CSS token，普通行、独立 Picker、桌面分栏、分割线、右侧计数、筛选和文件索引不变。旧阶段审计记录在下文仅作历史背景，均不再代表当前开发起点。

---


# 历史变更准则 · 导航浏览与精筛分离

本次从 GLS 普通属性通用索引版完整 Source 单独派生；新增唯一浏览候选 `SearchCore._navigationCandidates`，只由已有 FilterState.folders 决定范围。导航目录不得跟随搜索词/其它精筛改变候选；右侧 Result FilterEngine 仍交叉。不要引入第二套索引/项目特殊逻辑或变更 NoKeyboardFollow、Dialog44、Portal E。详见 docs/NAVIGATION_BROWSE_SCOPE.md。

# 本轮补充 · 原生移动侧栏命令栏固定政策（2026-10-17）

Stability-1 仍是唯一官方维护起点。本候选只取消原生移动侧栏的命令栏输入法让位：`SearchWorkspaceCapabilities` 对 `hostKind="sidebar"` 不再挂载 MobileFrameController，CSS 移除 `--ui-mobile-keyboard-inset` 命令栏 margin。不得为跟随输入法重新引入 `VisualViewport` 高度猜测、定位补偿或强制重排。保留 Tab / Picker / Modal 的原生键盘所有权。本候选不升级为正式基线，直到 iPhone 实机确认。

当前维护交付 mobile-sidebar-stability.1，唯一开发起点为本源码工程（上一基线 picker-ios-portal.1）。保留用户在 iPhone 已确认有效的 Picker Portal E 光标条件；本轮原生侧栏/状态栏覆盖区、键盘、底部命令及索引重试修复见 `docs/MOBILE_SIDEBAR_STABILITY.md`。本轮最终源码包同样尚待真实 iPhone 复验。诊断命令已移除，不得重新启用自动阶段轮换。

# 后续 AI 开发规则

## 唯一维护源

编辑 `src/`，不要编辑 `dist/main.js`、`baseline/` 或覆盖包里的 main.js。先读 `docs/ARCHITECTURE.md`，按功能定位 `docs/MODULE_INDEX.md`；涉及跨方法调用时读 `docs/METHOD_INDEX.md`。不得从另一个历史版本回填代码。

## 读取范围

从目标模块、构造器状态定义、直接输入/输出依赖及对应测试开始。纯工具问题只需工具与调用点；涉及状态切换、异步写入、跨 Picker 或卸载的问题必须向调用链、状态 Owner 和清理路径扩读。节省上下文不能成为忽略依赖的理由。不要无意义读取整个聚合 main.js。

## 冻结约束

未经本次具体需求授权，不改 DOM、CSS 类、样式 token、设置默认值、顺序语义、存储结构、Plugin ID、命令 ID、ViewType、公开 API/事件、手势和焦点路径。保留原本存在的历史处理，不新增旧/新业务双轨。动态方法没有静态调用证据也不能删除。

## 模块边界

同一职责一个正式实现。`LocalSearchPlugin` / `SearchCore` 仍是原状态 Owner。方法组通过 `composeClassMethods` 安装原方法描述符，不创建新实例状态，不使用任意全局服务定位器，不加转发包装器。新增/移动方法必须保持方法表、模块依赖和 `docs/METHOD_INDEX.md` 同步。含 `super`、私有字段、静态语义的方法留在原生类中，不放进普通方法组。

对外接口只能经 `src/integrations/public-contract.js` 和插件的公开入口消费；内部方法依赖先查构造器和方法索引。不要把导出的内部函数擅自升级为另一个公开产品协议。

## 开发与验证

先写能复现需求的测试，再改源码。运行受影响测试、`npm run check`、`npm run build`、`npm test`；凡涉及界面/输入/选择/弹窗/交互，再运行 `npm run test:browser` 和 `npm run test:acceptance`。最后对生成 ZIP 做 CRC 和内部文件校验。

当前维护修订为 mobile-sidebar-stability.1，E 阶段证据见 docs/PICKER_IOS_PORTAL_FIX.md，新增移动侧栏及索引回归见 docs/MOBILE_SIDEBAR_STABILITY.md；历史工程基线为 modular.4；完整源码冻结来自 modular.3，见 baseline/modular.3-source-manifest.json。当前 10 个 JS 源模块的前后哈希见 docs/APPROVED_CHANGES.json，本轮 Picker 输入 CSS 有授权修改，见 docs/APPROVED_CHANGES.json。对焦点问题必须运行 test:focus、test:focus-repair、test:feishu-focus，并走真实 SearchView.onOpen → SearchWorkspaceCapabilities → SearchView.onResize，禁止只调用 Navigator.resize 后宣称宿主链通过。原 826 个来源片段中 811 个逐字保留、15 个为累计授权修改。

普通 Picker/排序/类型/导航按钮禁止调用 _releaseSearchFocusForControl；它仅供显式结束编辑（例如橡皮擦），不能重建通用 blur 前置门禁。Picker 搜索复用 input-controls 的同一 Focus Guard，不区分鼠标/触控/笔的完整业务实现；不得取消原生编辑目标或抢夺拖拽已认领的事件。显式返回后也不得程序重新聚焦已隐藏的输入框。

MobileViewportState 只把原生 keyboard 事件或宿主 --keyboard-height 视为键盘信号；visualViewport 只负责可见边界。禁止重新增加“缩小 N px + 有焦点 = 键盘打开”推断或 open 自锁状态。保留公开 mountMobileFrame 接口及外部消费者销毁合同。

条件栏显隐 Owner 为 SearchCore._syncResultStateRow；Query 属于主输入，不能为了 Query.active 显示空条件行。派生创建退出统一由 SearchCreateController._leaveDerivedCreateView 恢复状态及投影；不得在每个橡皮擦/返回按钮上补一套清理。导航返回必须走 SearchNavigatorController.setPage；显示导航不会复制第二份计数数据。现有 sharedSearchState 的跨宿主语义保留。焦点是原生输入状态，不得拿它驱动导航工具栏重新投影。MobileViewportState 是同 document 内宿主键盘信号的唯一 Owner；MobileFrameController 只消费该状态并负责本窗口的临时锁框与内部让位，禁止新增各 Picker 独立 keyboard-open 缓存。只有真实宽度/布局变化才调用导航几何更新；restore 必须独立保证页面投影。CSS 共享搜索表面控制 tap-highlight 和输入重置，禁止再添加主框/Picker 两套同义规则。专项 npm run test:picker-caret 与 npm run test:picker-portal 必须通过，截图显式 caret="initial" 并通过透明光标负对照。iOS 光标尚待实机验收，禁止用假光标或 blur→rAF→focus 补救。

测试宿主不是 Obsidian。报告要分别列静态、Node、Chromium、原生桌面、iOS、Android及真实集成的覆盖程度；未跑的就是未验证。不要写“100% 一致”。保留初轮失败及修正原因。

## 构建与交付

默认使用锁定的离线可用构建链 `npm ci && npm run build`。esbuild 备用配置本次未验证；换编译器本身就是一项需要重新跑 A/B 的工程变更。源码包和运行包要来自同一次真实构建。不得把 fixture manifest 当正式 manifest，不得打包用户的 `data.json` 或业务数据。

`extract-modules.mjs` 只用于复核本次最初提取过程，不要把它接进 build、test 或日常维护。它会从冻结原版重新生成源码。

## mobile-sidebar-stability.1 新增回归门禁

修改移动侧栏、键盘共享、底部命令或 Picker 层级时，除原有焦点专项外必须再执行 `npm run test:mobile-sidebar` 与 `npm run test:index-retry`；原生 split 折叠/重开不能遗留 safe-area 顶部颜色。注意 `test:picker-portal` 默认还会运行 WebKit，若没有安装 WebKit，只能通过 `PORTAL_AUDIT_ENGINES=chromium npm run test:picker-portal` 验证 Chromium 子集，报告必须注明 WebKit 未测试，不得声称全部通过。
