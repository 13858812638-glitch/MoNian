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

> **2026-10-19 · P1+P2+P3+P4 开发测试候选（未冻结）。** 仅继承先前三轮候选并对三个树形 Picker 的 autoLocate rAF 做生命周期收口；新增共享可取消的帧调度，连续重绘仅保留最后一帧，关闭时取消。运行 JS 只改 4 个模块，CSS/manifest/data/公开插件 ID 无变更。**唯一正式冻结基线始终是 GLS v5.2「同词无变化通知收口 v1」（2026-10-18）**。见 `docs/P4_PICKER_AUTO_LOCATE_LIFECYCLE_20261019.md`，以下内容为历史冻结及迭代沿革。
> **P4 额外工程门禁**：为消除全新解压并行 `npm test` 时共享生成文件的非原子覆盖、排序测试首次启动前未自建 subject 的问题，测试工具 `tests/harness.mjs` 采用独立临时文件 + 原子替换；附两项回归。只调整测试工程，不影响插件 `src/` 运行行为。


---

# 当前候选：GLS v5.2 · P1+P2+P3「渲染与滚动状态优化 v1」

**开发测试候选，不是正式冻结。** 唯一正式基线仍是 2026-10-18「同词无变化通知收口 v1」。上一候选 P1+P2 的所有改动继续保留。P3 仅修改 `SearchNavigatorController.js` 与 `virtual-window-methods.js`；详见 `docs/P3_RENDER_SCROLL_LIFECYCLE_CANDIDATE.md`。只修改 `src/` 并构建；仅用双文件运行包测试，不覆盖用户 manifest/data。

---

> **2026-10-19 P2 开发测试候选（未晋级正式版）**：本工程以 P1「索引缓存分片序列化」候选为唯一工程父版本，在 `src/core/search/search-and-ranking-methods.js` 增加 bounded 增量排序合并。**正式冻结版仍为 GLS v5.2「同词无变化通知收口 v1」2026-10-18，绝不修改正式包**。本候选无 UI/CSS/API/持久化格式变化；请见 `docs/P2_INCREMENTAL_SORTING_CANDIDATE.md`。

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

> **当前新增：模块归一 v2 候选（2026-10-18）**：146 个模块不变；文件夹/标签/属性 Picker 模式互斥归一，属性目录源码改正旧命名。`GLS v5.2「独立浮窗退役」` 仍是正式冻结基线。完整细节见 `docs/MODULE_CONSOLIDATION_V2_20261018.md`。

> **模块归一开发候选（非正式基线）：** 本 Source 基于 `GLS v5.2「独立浮窗退役」正式冻结 Source` 派生；正式冻结版始终只读，候选还需用户实机验收后才可能升级。详见 `docs/MODULE_CONSOLIDATION_PHASE1.md`、`docs/MODULE_CONSOLIDATION_PHASE2.md`。

> **正式冻结声明（2026-10-18）：** 这是 **GLS v5.2「独立浮窗退役」唯一正式开发基线**；具体规则见 `docs/FORMAL_BASELINE_v5.2_20261018.md`。任何后续模块归一必须从本版 `src/` 派生候选，勿直接覆盖本冻结版。

# GLS v5.1 · 独立浮窗退役（开发候选）

以 v5.1「渲染清空与属性目录收口」候选为唯一修改输入；仅删除桌面无模态独立浮窗的命令、运行 Host、会话分支与专属 CSS。快捷搜索仍是 Obsidian Modal，原生侧边栏、标签页、外部 Modal/嵌入调用、Picker/Dialog 和共享 SearchCore 保留。此候选不自动取代 v5.1 冻结版。

旧 `open-local-search-floating` 命令已取消，不进行隐藏别名或自动转发；旧快捷键需重新绑定 `open-local-search` / `open-local-search-tab`。用户设置、保存的会话和 `modalBoundsV3` 未删除或迁移。源工程构建方式保持 `npm run check && npm run build && npm test`。

---

# GLS v5.1 · 唯一正式冻结开发基线（2026-10-18）

**唯一后续开发起点：本包 `src/`。** 已由用户实机确认「标题行高统一」候选版并要求冻结；此前 v5 及所有更早版本仅用于历史比较，不回填补丁。

运行文件完全继承候选版，新增的标题行高规则让移动侧栏的分组标题直接使用 `--ls-nav-row-height`，与普通行一致；`ls-nav-heading-content-gap` 的 6px 默认值不变；所有其他参数和 JS 逻辑不变。

当前审计阶段仅允许维护报告/测试，发现缺陷不自动改变本冻结运行文件。额外修复须单独派生候选源码，先复现后验证。保留原 manifest.json、data.json。

---

> **本目录是 v5 标题行高统一开发候选版，不是正式冻结基线。** 详情见 `docs/HEADING_ROW_HEIGHT_CANDIDATE_20261018.md`。

# GLS Navigator · v5 正式冻结基线（2026-10-18）

唯一正式 Source：`GLS-v5-标题与内容间距-正式基线-20261018-完整模块化Source.zip`。本包从 GLS v4「仓库名与开合图标」完整 Source 派生，仅在 `src/styles/styles.css` 新增移动侧栏独立参数 **「标题与内容间距」**（`ls-nav-heading-content-gap`，6px，0–32px）。当前移动导航的「仓库名 → 根目录」「标签 → 无标签」「属性 → 首项属性键」都通过同一 CSS 控制；展开才生效，折叠不预留空白。普通列表相邻行间距、三个分组之间留白、桌面布局和独立 Picker 不受影响。

`dist/main.js` 与 v4 字节一致；其他 Style Settings 默认值、JS 功能、Portal E 光标机制、Dialog44、底部命令不跟随输入法、Notebook 风格渐隐线、文件夹直接/递归计数及普通属性项目分组全部继承不变。本工程源码入口为 `src/`；构建为单一 `dist/main.js` 加独立 `dist/styles.css`。只在已有 GLS 插件目录覆盖双文件，保留原 `manifest.json`/`data.json`。本工程没有官方 manifest，不能作为新的独立安装插件使用。

本轮测试记录与 iOS/WebKit 实机未验收边界见 `docs/FORMAL_BASELINE_V5_HEADING_GAP_20261018.md`。以后 GLS 维护均以这份 v5 Source 为唯一代码起点，旧版本只读审计。

---


# 历史变更记录：Navigation Browse Scope v1

全库文件夹树 + 当前文件夹属性/标签目录 + 结果交叉筛选；切换文件夹不再手动清理精筛。见 `docs/NAVIGATION_BROWSE_SCOPE.md`。

# GLS 移动端侧边栏稳定性修复 · mobile-sidebar-stability.1

唯一修改基线：`GLS-Picker-iOS-Portal-Fix-1-Source.zip`。只修改维护源码 `src/`，运行版由锁定构建工具聚合到 `dist/main.js`，样式独立 `dist/styles.css`。保留此前 iPhone 已证明可见光标的 Portal E 条件，不添加假光标或抢焦点。

本次侧栏状态/样式、键盘、底部命令、Picker 层级、索引 IO 恢复的改造和测试证据见 `docs/MOBILE_SIDEBAR_STABILITY.md` 和 `reports/`。

现有 GLS 安装：从 **双文件覆盖包** 中提取完整 `main.js` 和 `styles.css` 覆盖插件原文件，保留已有 **manifest.json** 和 **data.json**，重载插件。源码维护用 **Source.zip**。原始压缩包没有正式 `manifest.json`，不能将源代码 ZIP 当作新装包；绝不使用 fixture manifest 冒充正式插件。

环境：Node >=22；`npm ci`，`npm run check`，`npm run build`，`npm test`。含 Python Playwright 的 UI 回归可运行 `npm run test:mobile-sidebar`、`npm run test:browser`、`npm run test:acceptance` 等；Chrome 路径设为 `CHROMIUM_PATH`。只有 Chromium 可用时，用 `PORTAL_AUDIT_ENGINES=chromium npm run test:picker-portal` 测试 Chromium Portal 子集；未安装 WebKit 不得冒充其已通过。

**验证边界**：全套本地 Node + Chromium 自动化检查不能证明真实 iPhone 状态栏文字、宿主插件冲突或长期稳定性，需真实 iOS Obsidian 中再测试。

## 2026-10-18 · RenderGuard / Clear / Catalog 候选（不更改正式冻结声明）

本 Source 基于 GLS v5.1 正式冻结版本，仅修复有故障注入证据的结果构建失败回退、虚拟窗口局部回退、橡皮擦无效失焦与重复按钮同步、未使用属性值更新的全结果重算。详细测试证据及边界见 `docs/V5_1_RENDER_GUARD_CANDIDATE_20261018.md`。需要实机验证后再决定是否升级正式基线。
