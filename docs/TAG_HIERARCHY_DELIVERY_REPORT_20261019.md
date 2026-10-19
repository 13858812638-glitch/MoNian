# GLS v5.2「分级标签极速创建 v1」· 开发候选验收报告

- 生成日期：2026-10-19
- 状态：**开发测试候选，尚未晋升正式基线**。
- 唯一父基线：2026-10-19 GLS v5.2「P1–P4 工程优化 · 返回筛选首帧一致与 CSS 默认值 v1」。父版 Source SHA256：`03bcfd9eca21187c0b673dbfb2f9f2383a37bc08f93c04726eb420b135afb275`。
- 官方冻结版未改动；保留 JSON 显示/排除/计数行为、两项 6px CSS 默认值、P1-P4 性能修复及 Navigator / Swipe / 返回筛选修复。

## 新的标签创建交互

1. 原标签编辑 Picker 的任意树节点最右侧增加「＋」：点它进入该父级，不会自动保存或添加该父标签。
2. 在当前父级输入一级名字，可按 Enter 只加入当前叶子标签；也可点候选行最右侧「进入下一级」，逐级创建虚拟路径。举例：点 `运动` 后的＋ → 输入 `跑步` → 进入下一级 → 输入 `训练` → Enter → 待添加仅 `运动/跑步/训练`。
3. 已有多级 `/` 输入方式完全保留；输入 `一级/` 自动下钻。顶部面包屑可回到任意祖先；输入框为空按 Backspace 回上级。
4. 每个层级沿用同一个搜索输入框，中文 IME 期间不切层。深层级面包屑自动露出末级；手机端新增尾部 ＋ 可点击区域不小于 44px。
5. 原有确定/取消、批量与单文件编辑、创建文档草稿等路由不变；只在原有提交动作执行写盘。

## 实际修改内容

- 运行 `src/` 与正式版相比，**修改 1 个 JS 模块、新增 1 个纯函数模块、仅在 CSS 末尾追加 2,699 字节专用样式**。
- 共 147 个 JS 模块、636 条静态依赖边，0 环依赖、0 未解析引用。
- 新测试 `tests/tag-hierarchy-composer.test.mjs`、`scripts/tag_hierarchy_browser_audit.py`，静态门禁只对指定新模块的路径与 SHA256 放行。

## 验证记录

| 项目 | 结果 |
|---|---|
| 纯 Node 完整回归（含 22 个新测试） | **238/238 PASS** |
| 新标签交互 Chromium 四配置（移动 390/320，桌面 1100/870，明暗主题） | **98/98 PASS** |
| Navigator 浏览 | **76/76 PASS** |
| 移动侧边栏 Chromium 模拟 | **96/96 PASS** |
| Picker 光标 Chromium 模拟 | **36/36 PASS** |
| Picker Portal Chromium | **48/48 PASS** |
| 索引重试 | **7/7 PASS** |
| 静态门禁与构建 | **PASS** |
| Source ZIP 全新解压、静态检查、重新构建及 Node 回归 | **PASS**，238/238；JS/CSS 哈希逐字节一致 |

注意：Portal 测试脚本在 Chromium 48 项通过后尝试启动本环境缺失的 Playwright WebKit 浏览器，退出报缺少可执行文件；因此只计 Chromium PASS，不声称该 Portal 全脚本或 iOS WebKit 真机通过。独立解压使用当前环境已有且与项目锁文件相容的依赖；未在全新联网环境验证首次 `npm ci`。实际 iPhone Obsidian 操作仍需用户验收。

## 源码差异 SHA-256

- `src/features/batch/tag-editor-methods.js`（modified）：`66cef244c04838939bc4cfbb4c5d0dd61640004cf97a11db91d7bfdcf1cd461a`
- `src/features/batch/tag-hierarchy-compose.js`（new）：`5202346afcfbf072c3b9413843ec892fd668ea8f05eac8eaa60e1b53e921a1ef`
- `src/styles/styles.css`（modified）：`9032db7e0caedbdae82ef67a0532d571eddba60f6ac989ffcbd3368b1e9d6c12`


## 安装和回退

- 用双文件覆盖包中的 **`main.js`、`styles.css`** 替换现有 GLS 的两份运行文件。**不要覆盖用户的 `manifest.json`、`data.json`、YAML、内部元数据**。
- 恢复时覆盖回 2026-10-19 正式冻结版两文件，不执行用户数据迁移。
- 模块化开发只编辑 Source 的 `src/`，勿在聚合的 `dist/main.js` 上直接堆改动。
