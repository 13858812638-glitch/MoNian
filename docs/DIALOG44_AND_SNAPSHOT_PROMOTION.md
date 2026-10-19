# GLS NoKeyboardFollow · 共享 Dialog 44% 统一收口及 Snapshot 默认值升级（开发候选）

## 直接源码起点
`GLS-NoKeyboardFollow-正式基线-侧栏管理与光标统一-候选` 的完整模块化 Source。与该候选分包核对 SHA-256 后独立拷贝修改。**没有**回退到 Stability-1、FirstMount-2、A–D 或键盘跟随版。

## 确认修改
- 全部共享确认、删除、新建、重命名以及紧凑颜色 Dialog 的中心统一由 `--ls-dialog-position-y` 控制，默认 **44% 动态视口高度**。保留同一 Style Settings ID、范围和原默认 44。
- `src/styles/styles.css`：取消父容器 `%`、移动 `svh` 和 iOS 高优先级 `dvh` 三套位置覆盖；在一个 `.local-search-confirm-dialog` 中负责统一 `position: fixed`、`top: 44dvh`、宽度、与安全区相关的最大高度。保留非阻断式内部滚动。
- 全部共享 Dialog 的遮罩 `position:fixed; inset:0`，与 Dialog 共同使用视口边界。`src/ui/dialogs/dialog-session.js`：非 iOS、iOS 都挂原有 `core.popupSurfaceHost()`；`ownerPanel` 仍负责焦点返回与 Picker 关闭清理，不新建会话 Owner。
- iOS Portal E `display:contents`（之前确认的真实光标前提）仍保留，iOS 特殊选择器仅管理层级 z-index；没有创建假光标、重复聚焦或输入法高度追踪。
- 颜色 Dialog 继续使用 `--ls-compact-create-width` 作为宽度上限，不再被 iOS 通用 420px 宽度覆盖。
- 移动侧栏底部命令栏不随输入法升降的既定正式行为未修改。

## CSS 控制中心 Snapshot：仅九项写入默认

| Settings ID | 原默认 | 新默认 |
|---|---:|---:|
| `ls-nav-content-inset-left` | 12 | **16** |
| `ls-nav-background-extend-left` | 4 | **6** |
| `ls-nav-background-extend-right` | 4 | **0** |
| `ls-nav-text-weight` | 400 | **500** |
| `ls-nav-group-weight` | 600 | **700** |
| `ls-nav-row-height` | 44 | **30** |
| `ls-nav-section-spacing` | 2 | **0** |
| `ls-nav-depth-step` | 14 | **16** |
| `ls-nav-count-tail` | 48 | **16** |


未列出的所有 Style Settings `default` **逐项比较均未改变**。九项对应的纯 CSS fallback 同步更新，因此即使未安装 CSS 控制中心，插件自身默认也一致。特别注意：若用户已有本地 Style Settings 显式覆盖值，控件可能仍显示已保存的旧自定义值；本轮不清除/修改用户配置。

## 验证状态（2026-10-17）
- 原始 12 组浏览器视口/设备/安全区/尺寸测试：基线 64/72；修正后 **72/72** 通过；覆盖 44% 与自定义 55%、长 Dialog、安全区、文件夹颜色紧凑宽度、Portal E、遮罩实际命中区域。
- `npm run check`：PASS（153 模块，640 依赖边，无未解析符号）。`npm run build`：PASS。
- Node 单元 **98/98**；移动侧栏 **96/96**；侧栏管理及新建/重命名 Dialog **52/52**；索引 **7/7**。
- 当前版本 Chromium 浏览器主要业务操作：移动浅色 **20/20**、移动深色 **20/20**、桌面浅色 **20/20**，共 **60/60**（搜索、筛选、重命名、提交删除、取消、创建、右滑、清理）。
- 旧版像素 A/B 在更改 Dialog 宽度后刻意不再视为可满足的字节相同比较；早先运行的旧 A/B 发生了预期的 Dialog 几何不一致，不记作通过。完整搜索条件测试曾启动，但因外部进程超时/EPIPE 未完成全部断言；报告不能写 144/144 通过。
- 尚未使用真实 Obsidian iPhone WebKit/Android 验收遮罩滚动、软键盘和光标绘制。没有调用系统键盘跟随，仍需真机确认截图场景。

## 安装与回退
仅替换原 GLS 插件目录 `main.js` 与 `styles.css`；保留真实 `manifest.json`、`data.json` 和笔记元数据。每次同时覆盖一对文件，完全重启 Obsidian。若 WebKit 真机行为不符合预期，用保留的上一版双文件回退，不能混搭。
