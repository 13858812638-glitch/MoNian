# GLS v5.2「分级标签极速创建 v1」 · 正式冻结声明

- **冻结日期**：2026-10-19（UTC+8）。
- **用户授权**：用户明确提出「冻结为正式基线」。
- **唯一最新正式基线**：GLS v5.2「分级标签极速创建 v1」。
- **上一正式基线**：GLS v5.2「P1–P4 工程优化 · 返回筛选首帧一致与 CSS 默认值 v1」，今后仅作为历史只读回退。
- **原始研发候选**：`GLS-v5.2-分级标签极速创建-v1-候选-完整模块化Source.zip`，SHA256 `49908c67800daf7ce60966b18391bc86d5661416f02a172b21978f0b915ed38b`（10199955 字节）。

## 原样继承的能力

继续保留 P1–P4 性能与工程优化、Navigator 按压与 Swipe 基线对齐、返回筛选首帧完整刷新、CSS Snapshot 默认值、既有 JSON 可见与计数语义。新增正式化的分级标签极速创建包括：选择已有父标签后直接创建子级、就地逐级进入、面包屑与空输入退格返回、按 Enter 将完整标签加入待保存列表、继续兼容 `一级/二级/三级` 完整路径输入。与原标签 Picker / 原元数据写入链共用，不添加第二套存储。

本次正式冻结 **不新增运行功能，不调整既有行为或 CSS 参数**；`ls-result-card-pad-x` 和 `ls-item-pad-y` 均维持 6px 的源码默认值。JSON 显示与计数规则按此前用户认可方案原样保留。

## 不可变运行产物

- `dist/main.js`：1686261 bytes，SHA256 `2f8524e5d3f3bbbe473ab006984e75df43a7dee50ed274ad5d92e7b020a9744b`。
- `dist/styles.css`：259623 bytes，SHA256 `9032db7e0caedbdae82ef67a0532d571eddba60f6ac989ffcbd3368b1e9d6c12`。
- 运行 `src/` JS 模块：147 个。
- 代码及测试文件，包括 `src/`、`dist/`、`tests/`、`scripts/`、`baseline/`、`reports/`、原 `docs/` 和配置，均与冻结前候选 **逐字节一致**。
- 仅顶层 `README.md`、`AGENTS.md`、`ARCHITECTURE.md`、`CHANGELOG.md` 置顶版本声明，并新增本文档。
- Source ZIP 的 SHA256 记录于 ZIP 外的冻结校验清单，避免自引用哈希循环。

## 工程开发与安装边界

此正式 Source 只读封存。以后修改仅从本版 `src/` 派生独立候选，经构建与测试、用户确认后才能再次晋升。日常交付为单个 `main.js` 加独立 `styles.css`；不能直接在聚合 `main.js` 上叠加补丁。安装时保留实际仓库内的 `manifest.json`、`data.json` 与 GLS 元数据；Source ZIP 不是插件安装包。

## 验收边界

候选版已有记录：Node **238/238 PASS**、新 Chromium 标签交互 **98/98 PASS**、Navigator **76/76 PASS**、移动侧边栏 **96/96 PASS**、Picker 光标 **36/36 PASS**、Portal Chromium **48/48 PASS**。源包已曾独立解压、重新构建并验证 JS/CSS 字节一致。冻结过程中将再次进行独立解压和代码回归。**这些桌面模拟与 Node 结果不等于真实 iPhone Obsidian/WebKit 验收。**
