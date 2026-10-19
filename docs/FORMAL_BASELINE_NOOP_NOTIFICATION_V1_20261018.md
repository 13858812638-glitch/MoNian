# GLS v5.2「同词无变化通知收口 v1」正式冻结声明

**唯一最新正式冻结基线**：GLS v5.2「同词无变化通知收口 v1」  
**冻结日期**：2026-10-18  
**用户授权**：用户明确要求“升级为正式基线”  
**正式 Source**：`GLS-v5.2-同词无变化通知收口-v1-正式基线-20261018-完整模块化Source.zip`

## 版本关系

- 上一正式冻结基线：GLS v5.2「同词无变化提交收口 v1」，现作为历史只读回退版本。
- 本版本由「同词无变化通知收口 v1」候选升格，运行逻辑完全不变。
- 此文件之外的候选历史记录和既往“当前基线”声明均按其形成时点保留；以本文件及顶层 README/AGENTS 最新置顶声明为准。
- 未来只以本冻结 Source 内 `src/` 为唯一研发起点，复制派生新候选，正式包只读。仅用户另行确认后才能再次升级正式基线。

## 运行及行为合同

相对于上一正式基线，仅 `src/core/search/input-and-filters-methods.js` 发生业务代码变更；`_commitSearchInputValue` 的相同原始输入、结果已提交且无待处理索引/首屏锚点、非创建模式条件判断前移至 `_notifyStateChange` 之前；仍保留 `_syncSearchHeaderControls`，真正的查询变化（含原始空格变化）、创建、IME、异步索引、文件夹/排序等有状态操作均执行原有路径。

本次冻结动作没有修改 `src/`、`dist/`、`scripts/`、`tests/`、`reports/`、配置、基准快照或 CSS 的字节；仅在顶层文档置顶本声明、添加此文档并重命名 ZIP 根目录。没有新增计时器、事件监听、状态 Owner、持久化字段或接口变更。用户实际仓库的 `manifest.json` 和 `data.json` 应保留，不随覆盖包覆盖。

## 冻结哈希（与候选逐字节一致）

- 完整 `dist/main.js`：**59ecad0a0c474e51ece84443f92f314976676fe455d0db4709092c97be7b1df6**，1,661,257 字节。
- 完整 `dist/styles.css`：**dfb2878bd18d2104caf50b8395142ed43afd808db03d13a5415be4c08a2ba2a6**，256,695 字节。
- 原候选 Source ZIP：`ea15186b504269775ba38dcc4910bc63ef2de98c22badb7c5dff2dffd327f6e6`。
- 新正式 Source ZIP：见同名 SHA-256 校验 JSON；文档不能预写自身所在 ZIP 的哈希以避免循环依赖。

## 验收与限制

候选原有回归（真实构建产物/Chromium 模拟宿主）：同值/空词/IME 无效通知 16 → 0，Node 138/138、业务 40/40、移动侧栏 96/96、导航 76/76、焦点 96/96、Picker 光标 Chromium 36/36、Portal Chromium 48/48、搜索条件 144/144。晋级时独立解压 `npm run check`、`npm run build` 和 `npm test` 138/138 通过，重建 JS/CSS 与原候选独立文件完全一致。

以上 Chromium 和模拟宿主测试不能替代真实 iPhone Obsidian/WebKit 对本候选版的独立验收；真实 CSS 片段隐藏页首引发的历史显示/焦点冲突，应由该 CSS 片段本身处理，不据此为 GLS 添加新的焦点或宿主布局补丁。
