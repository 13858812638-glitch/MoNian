# GLS 移动端侧边栏稳定性修复 · mobile-sidebar-stability.1

**唯一修改基线：** `GLS-Picker-iOS-Portal-Fix-1-Source.zip`（picker-ios-portal.1）。本轮在维护源 `src/` 修改，经锁定构建链重新打包 `dist/main.js` 与 `dist/styles.css`。未从其他历史插件回填源代码；保留用户 iPhone 已确认光标正常的 Portal E 条件 `display:contents`，没有引入假光标、定时反复 `focus()`、输入替身或改变原始文件的数据结构。

## 确认的问题及修复

### 1. 键盘影响不属于当前编辑者的移动侧栏

**复现：** GLS 原生侧栏显示时，把焦点放在其他宿主输入框并触发共享 keyboardWillShow，GLS 自身仍被设置 `is-ui-keyboard-open`，导致内容和底部按钮被错误重排。

**修复：** `src/ui/mobile/mobile-frame.js` 仍保留 document 级唯一 `MobileViewportState`；只对 `preserveFrame:false` 的原生叶视图启用本宿主焦点所有权判断。独立 Picker 的保留帧继续继承共享键盘已打开状态，保证主输入框到 Picker 的原生输入交接。这一限制是通过原 `test:focus` 的反例修订，不是删除全局键盘状态。

### 2. 键盘覆盖下方原生工具栏

**复现：** 对于 host 未缩小原生叶视图、只叠加输入法键盘的布局，命令栏底部坐标仍处在被覆盖区。

**修复：** 仅在 `.local-search-workspace-host.local-search-navigator[data-nav-layout="mobile"].is-ui-keyboard-open` 下，将已由 MobileFrameController 计算的 `--ui-mobile-keyboard-inset` 作为底部命令栏让位距离。原生叶视图主动随键盘缩小时这个变量为 `0px`，不会额外重复缩小。

### 3. 顶部状态栏安全区与侧栏表面颜色不统一

**复现：** 原生 `.workspace-drawer` 与 `.safe-area-top-cover` 可以延续其他宿主的背景颜色，GLS 的 `--ls-surface` 不能单独覆盖它们。聚焦/失焦时的宿主切换尤其明显。

**修复：** `SearchView` 模块内私有 `syncMobileSidebarSurface(view, active)` 为原生移动侧栏建立独立的 WeakMap 所有权，只给活跃 GLS 抽屉加 `gls-mobile-sidebar-active`。CSS 仅作用于该宿主原生抽屉及 iOS 的 `.safe-area-top-cover`。原生 split 折叠/视图关闭时释放样式，onResize 及活跃视图事件恢复。重复通知不反复更新 class；与其他侧栏视图的样式不会长期混用。

**能力边界：** 这里只改变 Obsidian WebView 的安全区覆盖层背景；无法修改 iOS 操作系统负责绘制的状态栏文字或宿主未暴露的系统画面。真实 iOS 主题可能叠加外部 CSS，需要实机验收。

### 4. 横向底部命令在切页后保持上次滚动位置

**复现：** 将筛选页底栏配置为 10 个按钮，横向滚动至后方后切到结果页，其首项容易留在视窗之外（即便结果页本身也有大量自定义按钮）。

**修复：** `SearchNavigatorController._syncMobileTools` 仅在筛选/结果/创建三类上下文发生真实变化时，把共享命令栏 `scrollLeft` 归零。保留按钮的原 DOM/原 click handler、自定义图标/顺序/隐藏配置、已打开 Picker 的锚点保护。

**特意保持不变：** 原来点击“查看结果”后结果页会显示主搜索栏，此设计被旧焦点/筛选链使用。本轮曾试图默认隐藏，回归暴露失配后已恢复原行为，并确认只是显示搜索栏、**不自动获取焦点或弹键盘**。

### 5. iOS Portal E 条件的浮层覆盖风险

**复现：** `display:contents` 取消 portal 绘制盒后，Picker 面板原 `z-index:10090` 可以被 `z-index:10500` 的别的浮层截获输入命中；原 Portal 的堆叠层级为 `11000`。

**修复：** 只在 iOS 和 GLS 自身 Portal 直接 Picker 子面板上赋予 `z-index:11010`，保留既有 `display:contents !important`、输入节点、滚动/焦点控制、独立 dialog 堆叠关系。没有给 Portal 新增透明遮罩、模拟 DOM 输入或重写事件分发。

### 6. 增量索引读取失败后长期留旧索引

**复现：** `_updateSingleFile(file)` 因一次 NAS/IO 失败返回 false，而 `_flushIndexQueue()` 无论成功失败都会从队列移除路径，读取恢复后也无后续刷新。

**修复：** 保留原索引路径/发布事件/缓存结构，新增一次性临时 Map/Set/Timer 负责失败路径的有限次数退避；多个文件并发时单文件抛异常不会中断整个批次；文件删除或新事件重新排序，插件卸载清掉重试计时器。最多重试 4 次，间隔约 250/500/1000/2000ms。持续失败将给出日志，不作无休止重试；新的文件修改事件仍可重新触发索引。

## 工程/功能边界

- 原 `SearchView` 原型、GLS plugin ID、WorkspaceLeaf ViewType、全部公开接口、原手势 Owner、原设置和数据 schema 不改；临时 UI 样式 Owner 只是模块内私有函数。
- 手机顶栏/底栏的变化限定于 GLS 原生移动侧栏；没有改飞书任务或工作台的 DOM/CSS。
- 原来依靠 `[hidden]` + CSS `display:none!important` 的按钮显隐已经正常；这项是审计排除项，不添加多余修复。
- 暂不全面重构既有 7,000+ 行 CSS 或 500+ 个 `!important`：缺少真实主题/插件冲突证据时，大范围重绘会比局部改动带来更高回归风险。
- 原始源码包缺少真实插件 `manifest.json`。禁止从测试 fixture 或推测信息生成安装清单；使用已安装插件的原 manifest 并只替换双文件。绝不携带 `data.json`。

## 复核测试（模拟并不等同于真机）

- 源码静态检查 `npm run check`：153 个 JS 模块，依赖无环、无未解析代码符号；原冻结基线哈希仍通过。
- Node 单元 `npm test`：98 项。
- Browser A/B：92 项（桌面及移动、深浅两种主题的原有页面和插件主流程）。
- 搜索条件专项：144 项（包括从主输入到 Picker、返回、创建及清空上下文）。
- 新增移动侧栏专项：88 项（320/375/390/430px，浅/深色，状态栏安全区、键盘、底栏、开/关、切换原生抽屉、层级及卸载）。首次回归记录保留为 `reports/mobile-sidebar-before.json`，原基线 10/20 未通过。
- 新增索引暂时失败、并发隔离、永久失败限制、删除、卸载：7 项。
- 焦点专项、焦点修复、飞书焦点对照、Picker caret、Portal 的最终详细统计另见 `reports/` 与交付报告；可在本地运行相同命令。

**测试解释：** 自动浏览器测试是 Chromium 内的 Obsidian host fixture，无法真实验证 iOS Safari/WebKit 光标绘制、手机状态栏系统部分、物理输入法、用户全部 CSS 主题和 NAS 端实际竞态。需要用户实机验收，不能称“100% 稳定已实机证明”。

## 建议 iPhone 实机核查顺序

1. 侧栏筛选/结果切换，结果页搜索框应显示但不自动弹键盘；显式点击搜索输入后才会弹键盘。
2. 聚焦与失焦的 Obsidian 顶部状态栏**背景覆盖区**一致；切换另一个侧栏视图、侧栏折叠/重新展开不残留 GLS 颜色。
3. 中文拼音正在组词时打开 Picker，原生光标可见，候选词、选区、下滑、右滑返回正常。
4. 键盘弹起时底部命令栏不落到键盘下方；隐藏键盘后栏位置恢复，不出现底部额外留白。
5. 底部工具栏自定义 10+ 个按钮、横向滚动后切筛选/结果/创建，首个操作能再次看到；隐藏按钮不占位。
6. 快速反复执行：打开 Picker/取消/再次打开、切结果/返回、创建/退出、切到其他侧栏插件、转动横竖屏。
7. NAS 同步期间读取短暂失败后再次检索已修改笔记；若长期 IO 故障，检查控制台是否有达到重试上限的提醒。

## 最终构建门禁（2026-10-16）

- `npm run check`：PASS，153 JS 模块 / 641 依赖边；冻结基线仍有效。
- `npm test`：98/98 PASS。
- `npm run test:browser`：92/92 PASS。
- `npm run test:acceptance`：144/144 PASS。
- `npm run test:focus`：56/56 PASS。
- `npm run test:focus-repair`：96/96 PASS。
- `npm run test:feishu-focus`：7/7 PASS。
- `npm run test:picker-caret`：36/36 PASS。
- `PORTAL_AUDIT_ENGINES=chromium npm run test:picker-portal`：66/66 PASS。
- `npm run test:mobile-sidebar`：88/88 PASS。
- `npm run test:index-retry`：7/7 PASS。
- `npm run audit:source`：执行成功，详见报告。

所有项目均来自**同一版模块源码编译产物**，且以上所有用到原工程入口的最终运行状态码均为 0。统计之间存在重叠，不把它们当作互不重复的 690 个功能。WebKit 默认门禁因为本地缺少其可执行文件未运行：已明确以 Chromium 专项代替、并保留真实 iOS 为未验收项。
