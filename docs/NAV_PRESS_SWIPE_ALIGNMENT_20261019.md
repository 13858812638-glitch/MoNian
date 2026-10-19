# GLS v5.2 · Navigator 按压与 Swipe 基线对齐 v1 · 候选验收报告

- **唯一研发起点**：已交付的 P1+P2+P3+P4 完整模块化 Source，未回退。
- **正式冻结版**：仍为 2026-10-18 `GLS v5.2「同词无变化通知收口 v1」`，本轮不升级正式版。
- **源证据**：用户 2026-10-19 上传的 iPhone 录屏，长按导航行原生上下滚动；结果卡两侧 Swipe Action Shelf 超出文本对齐线。
- **变更范围**：只修改两份运行源码：`src/features/navigator/SearchNavigatorController.js`、`src/styles/styles.css`；不变更插件 ID、公开 API、Indexed 元数据、工作台接口、筛选语义或数据持久化格式。

## 核查原因和修复

### 1. 导航行按压滚动不一致

- 原有 `passiveRowTarget` 的右侧数字/空白点击代理使用 `is-nav-trailing-touch-pressed`，在 `pointermove >8px`、原生 `scroll`、`pointerup/cancel` 时清除。
- 文件夹/标签/属性名称按钮使用浏览器 `:active`，原来的 Navigator 监听器没有同步跟踪该按压；iOS 按下开始滚动时，三种行的反馈可能不同步。它们**不应在滚动中保持临时 Pressed**，但真实 `is-selected` 必须保留。
- 修复：同一 Navigator 的委托指针监听同时识别直接的主按钮和点击代理区域，移动超过 8px 或发生原生 `scroll` 时为该行加临时 `is-nav-touch-dragged`，仅排除 Pressed CSS 的 `:active`，原有 Selected、配置的自定义背景、Tap 及展开行为不变；pointerup、pointercancel 与 View destroy 释放该类。
- 无触摸手势阻断、无 `preventDefault`、无 `touch-action` 改动、无新增 timer/Observer/监听器数量。

### 2. Result Swipe 操作栏左右边缘突出

- 结果卡外框含 14px 默认内边距，而 Action Shelf 的旧 `left:0/right:0` 贴外框，录屏中因而左右各比文字轨道突出约 14px。
- 修复：Shelf 两侧都使用已有 `--ls-result-card-pad-x`；宽度受 `shell-width - 2 * inset` 约束，避免狭窄 Sidebar 中一行按钮溢出。
- 无新增 CSS Token，不改变结果卡文字布局、图标/按钮宽度上限、Swipe 动作方向/开合状态机。

## 验收与证据

- `npm run check`：PASS-ENGINEERING，146 模块，632 静态模块导入边，无循环、无缺失导入。
- `npm run build`：PASS。
- `npm test`：**212/212 PASS**，相较于 P4 的 209 项新增 3 项源码合同测试。
- 本轮独立 Chromium UI 测试：**17/17 PASS**（390px/250px 移动侧栏、1100px 桌面；双向 Shelf 边界 + 三组直接行滑动取消 + 行尾代理取消 + 错误检测）。
- 原 Navigator 触控反馈验收：**22/22 PASS**；导航行完整点击/扩展：**126/126 PASS**。
- 原移动侧边栏模拟：**96/96 PASS**；Picker 光标模拟：**36/36 PASS**；Portal Chromium 原正式脚本：**48/48 PASS**。
- 一个旧版 `picker_portal_chromium_retest.py` 补充脚本，在“嵌套 Dialog”测试中访问不存在的宿主节点而抛错；相同脚本在**原 P4 未修改源码也同样失败**。本轮没有改变 Portal 相关源码，也没有将该额外脚本列为通过。
- **限制**：当前工具环境不等于真实 iPhone Obsidian / WebKit，尚未完成设备实机验收；用户原视频用于现象定位，不是补丁的真机通过证据。

## 安装与回退

- 在备份的仓库中测试覆盖 `main.js`、`styles.css`，保留现有 `manifest.json`、`data.json` 和元数据。
- 如有异常，可直接回退上一轮 P1P2P3P4 候选的两份运行文件。
- 未经用户确认，本候选**不得自动升格正式基线**。
