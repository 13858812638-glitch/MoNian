# GLS v5.2「P1–P4 工程优化 · 返回筛选首帧一致与 CSS 默认值 v1」 · 正式冻结声明

- **冻结时间：2026-10-19（UTC+8）**
- **批准来源：用户明确要求「现在这样合理的 冻结为正式基线吧」**
- **上一唯一正式基线：** GLS v5.2「同词无变化通知收口 v1」（2026-10-18），降为历史只读回退版本。
- **冻结对象：** 最终候选 `GLS-v5.2-P1P2P3P4-返回筛选首帧一致-CSS默认值-v1-候选-完整模块化Source.zip`，SHA256 `85c928c96eec6cda8412225dee4e1a8c0d0c5453a17e610a207718b5b67a8fc4`。
- **候选交付的原运行文件 SHA256（正式版沿用）：**
  - `dist/main.js`（1,675,741 bytes）：`a10391dd4ffaeffa771d567d5fe62c564926ceec45394c4f79814e6af7af4e6e`
  - `dist/styles.css`（256,924 bytes）：`dc1e3a7a7353442e5fd6d6532c31099638ee6fbbdce5abb0598069b46b0c56dd`

## 正式范围

本基线完整继承 P1 缓存分片序列化、P2 后台增量排序、P3 结果卡局部刷新 / Navigator 滚动保存、P4 Picker 生命周期与测试工程收口，以及其后的 Navigator 按压及结果 Swipe 基线对齐、返回筛选首帧动态标签/属性立即刷新修复。

CSS 控制中心的两个已授权新默认值：`ls-result-card-pad-x = 6px`、`ls-item-pad-y = 6px`。本次冻结不新增任何参数变化。

**保留当前全部 JSON 规则原样运行，不统一计数口径、不移除 JSON 文件计数、不改变索引、可见性、文件夹统计或搜索列表的条件。** 不修改 JSON 数据文件，也不改变原有设置 / 元数据格式。

## 冻结边界（重要）

本次晋升只变更顶层 `README.md` / `AGENTS.md` / `ARCHITECTURE.md` / `CHANGELOG.md` 的历史状态置顶说明，并新增本正式声明。下列目录中的所有文件与原候选**逐字节一致**：`src/`、`dist/`、`scripts/`、`tests/`、`baseline/`、`reports/`、其它 `docs/`、`package.json` 和 `package-lock.json`。

不得将旧文档中的“候选版”视为当前状态；文档描述的旧问题和旧基线名称仅用于历史追溯。此 Source 是未来唯一工程起点，但必须在它的**副本**中开发；插件最终安装依旧为单 `main.js` 加独立 `styles.css`。严禁直接修改打包后的 main.js。

安装时仅覆盖 `main.js` 和 `styles.css`，保留用户仓库已有的 `manifest.json`、`data.json` 及 GLS 随库元数据；本源码包不应直接作为新插件安装。

## 已有候选验证 / 仍有边界

候选交付记录：Node **216/216 PASS**、返回筛选首帧 **64/64 PASS**、Navigator **76/76 PASS**、移动侧边栏 **96/96 PASS**、Picker 光标 Chromium **36/36 PASS**、Portal Chromium **48/48 PASS**，并已做过独立 Source 解压、构建及运行产物字节比较。**这些不等于实际 iPhone Obsidian/WebKit 测试**；iOS 真实设备层验证仍以上游用户实测反馈为准。

冻结验证附正式 ZIP 完整性、原候选所有非文档文件哈希一致性及新的独立构建和 Node 测试日志；相关哈希记录在 Source ZIP 外的 `SHA256与冻结校验.json`，避免文件自引用循环。
