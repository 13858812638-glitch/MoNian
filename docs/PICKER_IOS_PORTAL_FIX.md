# Picker iOS Portal 修复 · picker-ios-portal.1

## 实机依据

用户在 diagnostic.caret.2 的 E 阶段明确回复“e可以”，并提供标题为“E · 无 Portal 绘制盒”的截图。输入框中的 E 右侧可见原生光标，软键盘保持打开。

E 阶段唯一干预是在原 Portal 上设置 `display: contents !important`。阶段切换先还原前一阶段样式；输入节点、文本、选区、监听和焦点没有被替换或重建。因此本次有直接实机依据采用这个条件，而不再修改输入框的颜色、字号或聚焦方式。

主搜索与 Picker 都使用同一个原生 input 组件，但主搜索不经过这个独立的固定全屏 Portal。E 结果把有效干预定位到 Picker 外层绘制盒。它不能独立证明 iOS/WebKit 内部的具体缺陷，也不能解释飞书为何在相似计算样式下未触发问题；本交付不作这些超出证据的断言。

## 正式实现

生产新增只在 `src/styles/styles.css` 的 Portal 定义旁：

```css
body.is-ios .ui-popup-portal.local-search-content:has(> .local-search-dropdown):not(:has(> .local-search-dialog-surface)) {
    display: contents !important;
}
```

- 真实设备此前诊断记录包含 `body.is-ios`；这不是猜测出的宿主类名。
- 保留 Portal DOM、继承变量、父子关系、事件与销毁 Owner；只去掉其绘制盒。Picker 仍用原 fixed Surface 负责位置与命中。
- 原空 Portal、独立确认/重命名弹窗保留原有 Portal 盒和层级。与 Picker 并存的独立同级 Dialog 也保留原 stacking context。Picker 自己的维护 Dialog 继续挂在 Picker 内。
- iOS 以外和 `.dida-bridge-content` 不命中本次规则。主搜索输入样式、查询/筛选和存储协议不变。
- 删除 SearchDropdownController 模块中的临时 `registerPickerCaretVisualProbe` 函数、LocalSearchPlugin 的 import 与 onload 注册。原八个命令恢复；不再出现 A～F 标题和阶段定时器。
- 不添加模拟光标，不调用额外 focus/blur，不移动或重新创建 input。保留现有 caret.1 之前的业务合同；没有用旧版本整体回填生产源码。

相对于上一诊断包，生产文件只变更三个：共享 CSS、SearchDropdownController（移除诊断）、LocalSearchPlugin（移除诊断入口）。153 个 JavaScript 模块、641 条静态依赖；826 个来源片段中 811 个逐字保留、15 个为累计授权修改。

## 工程验证

`scripts/picker_portal_audit.py` 先于生产修改编写。旧诊断代码结果为 62 通过、58 失败；失败项是永久 E 条件不存在和诊断尚未移除，原输入/几何/关闭检查通过。保留 `reports/portal-fix-before.json`。

首次修复后专项为 114 通过、6 失败。新增测试在 Picker 未关闭时直接调用独立文件确认 API，并错误地要求确认框盖住 Picker；旧代码同样是 z-index 41 的确认框位于 z-index 10090 的 Picker 之后。没有为本次修复扩大业务改动。测试改为分别验证：并存时保留旧 Portal 上下文；正常关闭 Picker 后，独立确认框确实可见且按钮可点。保留 `reports/portal-fix-first-run.json`。

第二次专项的 6 个失败是测试在 `finish()` 移除 Dialog 后才读取其 parentElement。改为关闭前采样，没有修改生产实现；记录为 `reports/portal-fix-second-run.json`。

最终专项覆盖 Chromium 与 Linux WebKit 中的侧栏、模拟 Modal、浮窗；检查四类 Picker 的 E 条件、几何一致、点击命中、原生输入和选区、主输入不变、父子节点保留、右滑返回、竖向和输入手势排除、外部点击关闭、重开，以及独立/嵌套 Dialog 层级。Android 和桌面类名条件另检查保持原样。

最终检查通过：静态检查、98 项 Node、92 项界面 A/B、144 项搜索条件、56 项焦点、96 项焦点修订、7 项飞书对照、36 项 Chromium 光标合同，以及 132 项双引擎 Portal 检查；均无未解决的失败。

每项实际执行结果见 `reports/portal-fix-1/gates.json` 与对应日志，专项明细见 `reports/picker-portal.json`。`test:focus-repair` 仍覆盖真实 SearchView.onOpen → SearchWorkspaceCapabilities → SearchView.onResize 调用链（运行于模拟 Obsidian 宿主）。`test:picker-caret` 的截图明确保留 caret，并设透明光标负对照；截图仅用于本地检查，不随源码包交付。

验证边界：用户已在真实 iPhone 确认 E 条件有效；此永久构建尚未在该设备重新验收。Chromium/Linux WebKit 检查只能证明上述工程行为，不能代替 iOS UIKit 原生光标绘制。原生桌面 Obsidian、真实 Android、用户主题/其他插件的全部集成组合未在本轮运行。

## 使用与维护

交付完整 `main.js.txt` 和完整 `styles.css`。将前者改名为 `main.js`，同时覆盖现有搜索插件的这两个文件并重载。无需运行诊断命令。原 manifest 未提供，不编造 Plugin ID 或安装元数据，也不打包用户数据。

源码和独立运行文件来自同一次构建。打包执行 ZIP CRC 和内部载荷校验；最终分发文件另外与源码 ZIP 的 dist 文件逐字节对比。

历史诊断说明保留在 NATIVE_CARET_PROBE.md；旧诊断脚本仅作为 `.historical` 记录保留，不是当前测试入口。维护本版使用 `npm run test:picker-portal`，不再运行 `test:native-probe`。
