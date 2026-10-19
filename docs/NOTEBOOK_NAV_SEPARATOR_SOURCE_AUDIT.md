# GLS 导航线对照 Notebook Navigator 源码（v3 候选）

## 使用的参考来源

- 用户历史上传：`Notebook-Navigator-3.3.6-GLS-Bridge-main.js`，包含 `nn-nav-list-spacer` 和 `nn-nav-spacer--with-separator` 真实渲染节点。
- Notebook Navigator 官方 GitHub 源码 `styles.css`（2026-10-18 查询）：https://raw.githubusercontent.com/johansan/notebook-navigator/main/styles.css ，`src/styles/sections/layout-spacers.css` 段。
- Notebook 的间距节点本身负责垂直留白；`::after` 在间距节点中心画 1px 线；渲染范围超出左右 10px 导航内边距；线条 0–15% 渐入、15–85% 保持、85–100% 渐出，默认不透明度 0.3。

## v2 中不一致的根因

1. 自动分组线：边界 `border-top: 1px solid var(--ls-divider)` 是全宽硬边框，无边缘渐隐。
2. 手动分割线：仅把 Row 的 `::before` 实体边框外拉到可视边界，依然是全宽硬边框。
3. 自动与手动本来分别定义线的色彩与几何，无法保证一致的视觉规律。

## v3 的最小修复

- 建立共用分割线绘制规则，使用带 15%/85% 停靠点的横向透明渐变、1px 高度、0.3 不透明度。
- 自动分组线仍处于两个 section 的间距中点；不额外占用高度。
- 手动新增线仍位于它本身可配置的 8/12/20px 间距行中央；左右补偿 scroller 的真实 inset 而非列表选中背景 inset。
- 手动 `solid` 使用相同背景渐变；`dashed`/`dotted` 用原来线型叠加边缘淡出 mask。
- 仅添加一个 `data-nav-separator-style` DOM 状态标签，由已存在的 `descriptor.style` 派生；不新增业务状态或事件。
- 排序时只显示原管理行里的线和操作按钮，不叠普通状态的整行渐变线。
- 保留浅/深单独颜色、普通树、索引、屏蔽、文件夹计数、Picker、手势、底部工具栏的既有实现。
- Source 不含用户 data.json、也没有授权的 manifest.json。安装只覆盖原 GLS 目录内已有的 JS/CSS。

## 已实际执行的回归

- 静态检查：153 JS 模块 / 641 条依赖边 / 0 循环和 0 未解析符号。
- 构建成功，src/styles/styles.css 与 dist/styles.css 字节一致。
- Node 单元：115/115。
- 导航专项：76/76；移动侧栏：96/96。
- Chromium 独立几何/样式测试：36/36（手机/桌面、深/浅色，自动/手动、虚线/点线、排序模式、主题自定义色）。
- Picker caret Chromium：通过；Picker Portal Chromium：通过；索引失败恢复：7/7。
- CSS Style Settings 块在 v2 和 v3 中逐字一致。
- 完整搜索条件历史套件本轮运行超过工具限制，只验证了已完成的断言，不能声称全量通过。
- 真实 Obsidian iPhone WebKit 未实机执行；用户确认外观与触摸后方可升级正式基线。

## 版本边界

这份以 `GLS-文件夹导航计数与分割线修复-v2-20261018` 为父候选，变更范围仅一个 JS 和一个 CSS 源模块；2026-10-18 原正式冻结 v1 不修改、不自动升级。
