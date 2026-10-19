# GLS Stability-1 · 原生移动侧栏命令栏不跟随输入法（候选）

**开发起点**：GLS-Mobile-Sidebar-Stability-1-Source.zip（唯一官方修改基线）。不继承 FirstMount-2、A/B/C/D 或 HoverOnly 的后续实验分支。确认当前 Wisdom 2.11.42 背景作用域测试版未出现闪屏后，按用户新要求独立移除命令栏的软键盘联动。

## 改动范围

1. `src/integrations/SearchWorkspaceCapabilities.js`：仅 `core.hostKind === "sidebar"` 的原生移动侧栏不再建立 `MobileFrameController`。它不会再订阅软键盘事件、VisualViewport 高度变化或写入根容器的 `is-ui-keyboard-open` / `--ui-mobile-keyboard-inset`。其余功能如原有 touch / pointer 的事件隔离与资源清理保持原样。
2. `src/styles/styles.css`：删除移动原生侧栏底部命令栏按键盘 inset 动态设置 `margin-bottom` 的规则。既有按钮 DOM、命令、图标、顺序、横向滚动、Tap/Swipe 交互、44px 尺寸均不改。
3. 独立 Picker / Modal / 搜索 Tab 的软键盘共享 Owner 与布局逻辑仍存在。未修改 `src/ui/mobile/mobile-frame.js`，不破坏 Picker Portal E 条件或焦点策略。

## 明确边界

- GLS 不再**主动**把侧栏底部命令栏抬到输入法上面；键盘可以盖住位于屏幕底部的按钮，这是按用户要求的行为。
- `height:100%` 仍遵从 Obsidian 原生 Leaf 容器。若 Obsidian 自身因键盘出现而缩小原生 Leaf，工具栏会随 **宿主 Leaf** 的底边改变位置。本轮不引入强制 100vh/fixed/transform 逆向补偿，避免重复移动与渲染竞态；该差异必须用 iPhone 实机区分。
- 旧 `docs/MOBILE_SIDEBAR_STABILITY.md` 描述的是历史基线行为，不作为此候选的当前验收规则。
- 本候选没有提供官方 `manifest.json`；部署时保留原插件的 manifest 和 data.json。

## 反向复现与验收

在 Chromium iOS 外观模拟 + 静态原生侧栏容器中，针对 `keyboardWillShow` / `keyboardDidHide` 和 VisualViewport 尺寸变化，新增了“不能抬升命令栏”的断言：Stability-1 原版 4 个设备/主题组合均失败；当前修改版本这 4 项均通过，且键盘收起后底部位置与弹起前一致；测试现在还核对侧栏没有多余键盘帧实例、inset 和 class。

该结果不等于 Obsidian iPhone 真机验收。另需检查输入中 Picker 搜索光标、关闭返回、重复创建、横向滑动与筛选状态、与 Wisdom 修正版共存。
