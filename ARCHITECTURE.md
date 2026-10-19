# GLS v5.2「Navigator 一体化操作面板 v1」开发候选（2026-10-19） · 工作状态声明

> **仅开发测试候选，不是正式冻结基线。** 唯一正式冻结开发基线仍为 GLS v5.2「分级标签极速创建 v1」（2026-10-19），其 ZIP SHA256 为 `05cc6ef1c0a8f7dadcfaf19cf0306cf12cf7c58477c08f261d9c9682969ec55f`。此工作副本由该 Source 的 `src/` 派生，不修改原正式包。候选仅在用户实际安装测试、明确授权后才能升级冻结。详情见 `docs/CANDIDATE_NAVIGATOR_UNIFIED_ACTIONS_V1_20261019.md`。

---

> **唯一最新正式冻结基线：GLS v5.2「分级标签极速创建 v1」（2026-10-19）。** 用户已明确授权将原「分级标签极速创建 v1」候选原样晋升为正式版；上一正式基线 GLS v5.2「P1–P4 工程优化 · 返回筛选首帧一致与 CSS 默认值 v1」 改为历史只读回退。**冻结仅新增正式声明、更新顶层文档状态，不修改 `src/`、`dist/`、CSS、测试、构建、JSON 规则或实际运行行为。** 本包以 `docs/FORMAL_BASELINE_TAG_HIERARCHY_COMPOSER_V1_20261019.md` 的声明为最新版本状态权威，后续开发必须从本包 `src/` 复制派生新候选；以下旧文档中写有“未冻结”“父版仍为正式基线”等均是当时历史状态，不适用于当前冻结版。

---

> **当前研发候选：GLS v5.2「分级标签极速创建 v1」（2026-10-19，未冻结）。** 以 2026-10-19 已正式冻结的「P1–P4 工程优化 · 返回筛选首帧一致与 CSS 默认值 v1」完整模块化 Source 为唯一父版本派生。**父版本仍是唯一正式基线，本候选不修改或取代冻结包**。新增的分级标签创建仅复用现有标签 Picker/元数据 Owner，无新数据存储、无 manifest/data 变更。详见 `docs/TAG_HIERARCHY_COMPOSER_V1_20261019.md`。以下旧版状态声明仅为历史文档。

---

> **唯一最新正式冻结基线：GLS v5.2「P1–P4 工程优化 · 返回筛选首帧一致与 CSS 默认值 v1」（2026-10-19）。** 已由用户明确确认将上一整合候选原样晋升。**本次不修改任何运行代码、CSS、JSON 显示与计数语义、测试及构建脚本**；旧文档中“候选”“当前正式基线仍为 2026-10-18”等声明均属于历史时间点，现以 `docs/FORMAL_BASELINE_P1P2P3P4_RETURN_FILTER_20261019.md` 为唯一权威状态。后续开发只能复制本包 `src/` 派生新候选，冻结包只读。

---

> **最新唯一正式冻结基线（2026-10-18）：GLS v5.2「同词无变化通知收口 v1」。** 已由用户明确批准晋升。运行代码、`src/`、`dist/`、`scripts/`、`tests/` 与上轮候选逐字节相同。本文件以下的“候选版”“上一正式基线”仅是历史时点记录，当前权威状态请查阅 `docs/FORMAL_BASELINE_NOOP_NOTIFICATION_V1_20261018.md`；正式 Source 不可直接改动，后续只能复制开发候选。

---

> **开发候选（非正式冻结）** GLS v5.2「同词无变化通知收口 v1」（2026-10-18），从正式「同词无变化提交收口 v1」派生。唯一正式冻结源码仍为上一基线；参见 `docs/NOOP_INPUT_NOTIFICATION_V1_20261018.md`。

> **当前唯一正式基线：GLS v5.2「同词无变化提交收口 v1」（2026-10-18）。** 冻结动作仅添加声明并更新工程顶部状态，不修改运行源码与测试。历史候选/基线称呼均属历史记录，现以 `docs/FORMAL_BASELINE_NOOP_SEARCH_V1_20261018.md` 为准。

---

> **2026-10-18 · GLS v5.2「同词无变化提交收口 v1」开发候选（未冻结）**：唯一正式冻结源码仍为 GLS v5.2「Navigator 行尾按压反馈 v1」。本候选只变更 `src/core/search/input-and-filters-methods.js` 和 `src/features/sort/SearchSortController.js`，覆盖无变化输入和排序提交；保留正式基线、全部 UI/CSS、公开接口及数据行为。见 `docs/UNCHANGED_SEARCH_SUBMIT_V1_20261018.md`。

> **最新唯一正式基线：GLS v5.2「Navigator 行尾按压反馈 v1」（2026-10-18）。** 本次晋级仅补充冻结声明与文件命名，所有运行代码、脚本及测试保持候选版逐字节一致。原文出现的“候选版”“旧正式基线”等仅反映历史时点，最新状态以 `docs/FORMAL_BASELINE_NAVIGATOR_TRAILING_PRESSED_V1_20261018.md` 为准。后续只以该正式 Source 复制派生候选，正式包不可直接修改。

---

> **最新唯一正式冻结基线（2026-10-18）：GLS v5.2「后台摘要与属性计数整合 v1」。** 用户已明确批准将上一轮整合候选晋升为正式版。本次冻结只更新文档和压缩包目录；`src/`、`dist/`、`scripts/`、`tests/`、配置与所有运行代码保持逐字节一致。旧文档中“候选版”“关键词匹配按需计算 v1 为最新正式基线”等说法属于历史时点，当前状态以 `docs/FORMAL_BASELINE_INTEGRATED_V1_20261018.md` 为准。后续开发必须从此 Source 复制派生候选，不得修改正式冻结文件。

---

> **本目录权威状态（2026-10-18）：GLS v5.2「后台摘要精准刷新 v1 + 属性计数语义统一 v1」开发测试候选，未冻结。** 最新且唯一正式冻结基线仍为「关键词匹配按需计算 v1」。本候选相较正式基线改变 4 个运行 JS 模块（src/features/facets/property-picker-methods.js, src/features/results/page-and-snippets-methods.js, src/features/results/SearchResultRendererController.js, src/core/search/search-and-ranking-methods.js），CSS/插件 ID/原有文件数据结构不变。整合包继承上一轮尚未冻结的后台摘要精准刷新功能；原后台摘要候选和正式冻结包均未被覆盖。以下旧文档的版本声明仅作历史溯源，不覆盖本行。详见 docs/PROPERTY_COUNT_FIX_CANDIDATE_20261018.md。

---

> **最新唯一正式冻结基线（2026-10-18）：GLS v5.2「关键词匹配按需计算 v1」。** 用户已明确确认由候选版提升为正式版。冻结操作仅更新说明及 ZIP 顶层文件夹名；`src/`、`dist/`、`scripts/`、`tests/`、所有运行代码均按字节原样保留。旧文档中“候选”和“Picker 模式单次绘制 v1 是最新正式版”均为历史记录，不再表示当前状态。今后从本 Source `src/` 开发，须另建候选，不得改写冻结包。详见 `docs/FORMAL_BASELINE_LAZY_RANKER_V1_20261018.md`。

---

> **2026-10-18 当前包状态：关键词匹配按需计算 v1【开发候选，未冻结】。** 当前唯一正式代码基线为 GLS v5.2「Picker 模式单次绘制 v1」。本候选仅修改 `src/features/search/ResultRanker.js`，其余业务源码与 CSS 完全一致。历史正式冻结声明保留为溯源文档，不能将本候选称为正式版。详见 `docs/LAZY_RESULT_RANKER_CANDIDATE_20261018.md`。

---

> **当前唯一正式冻结基线（2026-10-18）：GLS v5.2「Picker 模式单次绘制 v1」。** 用户已明确确认将原开发候选提升为正式基线；本次仅更新冻结说明及 ZIP 顶层目录名，`src/`、`dist/`、`tests/`、`scripts/` 和所有运行代码字节未修改。之前关于“模块归一 v2 为正式版”“Picker v1 仍是候选”的说明均为历史状态，不能覆盖本冻结声明。之后只从此正式 Source 的 `src/` 派生新候选；历史 `baseline/` 不作为生产源码。详见 `docs/FORMAL_BASELINE_PICKER_SINGLE_RENDER_V1_20261018.md`。

---

> **最新权威冻结声明（2026-10-18）：GLS v5.2「模块归一 v2」已由用户正式确认为唯一开发基线。**本包所有运行源码、dist JS/CSS 与 v2 候选字节一致。以前任何“候选”“独立浮窗退役仍为正式基线”表述均为当时历史状态，不能覆盖本次冻结。后续仅从本包 `src/` 派生候选，历史 `baseline/` 只供回退对照。详见 `docs/FORMAL_BASELINE_MODULE_CONSOLIDATION_V2_20261018.md`。

---

# GLS v5.2 · 当前候选架构（模块归一 v2）

正式冻结版仍为 GLS v5.2「独立浮窗退役」。当前候选源含 146 个 JS 模块，唯一开发路径为 `src/`，构建得到 `dist/main.js` 与 `dist/styles.css`。普通属性目录是唯一权威接口，不再有项目特殊目录。请以 [当前模块索引](docs/MODULE_INDEX.md) 和 [v2 归一说明](docs/MODULE_CONSOLIDATION_V2_20261018.md) 为准。历史 `baseline/` 不作为生产源。
