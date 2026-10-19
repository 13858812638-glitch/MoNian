# GLS v5.2 · 返回筛选首帧一致 + CSS Snapshot v1（开发候选）

- **工作起点**：P1+P2+P3+P4「Navigator 按压与 Swipe 基线对齐 v1」候选完整模块化 Source。
- **正式冻结基线不变**：2026-10-18「同词无变化通知收口 v1」。不得擅自晋升。
- **用户证据**：2026-10-19 iPhone 录屏 `ScreenRecording_10-19-2026 02-31-24_1.mp4`；录屏不随源码包分发。

## 缺陷与证据

Navigator 在 Results 页面时有意跳过隐藏导航树 DOM 投影；返回 Filters 时，`SearchNavigatorController.setPage()` 先使筛选面板可见，而 `sync()` 的待处理投影仍由 `setTimeout(..., 0)` 延迟提交。实际生产类在 Chromium 模拟宿主的对照记录：先按文件夹「资料」缩小导航全集再返回，上一候选在**返回操作刚结束时**仍展示全仓库标签「周报」和「所属项目4」；等待后才变为文件夹范围的标签/属性。新候选同一测试在返回操作刚结束时已经展示「无标签0 图片1 运动1 / 所属项目2」，后续动画帧不再替换这组内容。

## 运行改动（仅 1 个 JS 模块）

`src/features/navigator/SearchNavigatorController.js`：只在真实移动端 Results → Filters 且非页面恢复时，在 `syncPage()` 后复用已经排队的 Navigator 投影。取消**该条已有**延迟任务，并在宿主可以绘制筛选页面之前执行 `_renderProjection()`。没有引入新的缓存、Owner、计时器或 DOM 层。隐身的 Results 页面仍不重建导航树；普通文件/筛选变动、桌面端、Picker、键盘、焦点、手势、滚动锚点逻辑保持原路径。若自定义排序正在提交，则保留其原有延迟路径以避免触碰该交互状态机。

## CSS 控制中心默认值（仅两项）

| ID | @settings default | 源 CSS token | 新默认 |
| --- | --- | --- | --- |
| `ls-result-card-pad-x` | 14 → 6 | `--ls-result-card-pad-x` 14px → 6px | 6px |
| `ls-item-pad-y` | 12 → 6 | `--ls-item-pad-y` 12px → 6px | 6px |

其余 `@settings` 参数、变量、Style Settings ID 与 CSS 选择器逐字节保持不变。历史用户已保存的 Style Settings 覆盖值不是源码默认值，仍由用户端设置管理，不自动修改或清空。详细/精简结果密度默认值 13px/9px 不变。

## 证据、测试边界

- 独立静态检查（批准修改范围）、TypeScript 符号/模块解析和构建：PASS；146 JS 模块，原有模块树结构不变。
- Node：216/216 PASS（上一候选 212，新增 4 个目标合同测试）。
- Chromium 独立模拟宿主、从编译的真实 GLS 类加载：返回首帧与标签/属性范围、连续导航、焦点及 CSS token：64/64 PASS（4 个主题/屏宽组合）。
- Navigator 真实类浏览测试 76/76 PASS；移动侧边栏 96/96 PASS；Picker 光标 36/36 PASS；Portal Chromium 48/48 PASS。
- 原版与候选同宿主即时状态对照，见证据包 `原版与修复版-首帧对照.log`。
- **不等于真实 iPhone/WebKit 或 Obsidian 原生宿主实机验收**；需要用户安装双文件候选后验证。
- 缓存、索引文件和 NAS 数据格式没有改动；源包不提供或覆盖 `manifest.json` / `data.json`。
