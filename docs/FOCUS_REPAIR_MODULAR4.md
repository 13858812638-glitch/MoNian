# GLS modular.4 · 焦点路径减法修复交付报告

## 交付结论

已从本会话 modular.3 完整模块化源码修改、实际构建并执行下列验证。本轮交付真实双文件覆盖包和完整源码包；不是继续只发诊断。飞书任务 7.6.5 Login-State-Fix 为只读对照，未替换 GLS 基线或修改飞书运行文件。

已删除普通控件操作的程序失焦、视口猜测键盘、自保持键盘状态、侧栏多余 Picker 重排和重复框架 refresh。恢复同一正式 Picker 焦点保护。**不能将这些已验证的代码修复等同于 iPhone 原生插入光标绘制已经实机验收。**

## 基线与版本

- 唯一修改基线：GLS-Navigator-2026-10-15.7-modular.3-Source.zip。
- 基线 SHA256：`29a1bb545615a56d531b2e8415b66bbdd23119d5ccadde6570152fcbea6cfa31`。
- 工程修订：modular.3 → modular.4；不冒充缺失的 manifest.version。
- 原包未提供 manifest.json，交付仅覆盖 main.js 和 styles.css；保留用户原有 manifest.json、data.json 及业务文件。
- 所有生产修改在 src/；未直接编辑生成后的 main.js。构建保持 TypeScript 5.8.3 转译 + 静态 CommonJS linker，不更换编译器。

## 实际删除及归一

### 普通动作不再结束输入

`SearchDropdownController.open/openChild` 不再前置 `_releaseSearchFocusForControl()`。导航工具按钮、普通排序、类型选择和工作台工具展开也移除同类主动失焦。类型按钮的 `button.blur()` 一并删除；返回原有按钮焦点不再先额外 blur 一次。

橡皮擦是明确结束输入动作，仍保留原 helper；但空输入时打开结果视图不再先 blur。已有方法名及参数不删除，避免破坏动态调用接口。输入→输入由浏览器原生完成，没有加入强制 focus、延迟补焦点或假光标。

### Picker 内共用正式 Focus Guard

`input-controls.bindInputFocusGuard` 去掉只接受鼠标的特例。共享树形 Picker 在 `picker-shell` 统一绑定这一既有 Primitive，鼠标、触控、笔操作同一套按钮保护。与飞书同样，Picker 内切换多选、选择条目不应无意终止当前搜索输入。

原生 input/textarea/select/contenteditable、右键、已被其他 Owner 处理的事件，以及排序拖拽区域不由该保护接管。组件销毁走 registerPickerCleanup，不增加第二套状态机。隐藏父面板仍走原 DOM/返回栈，不额外聚焦隐藏输入。

### 删除猜测，不用新阈值替换旧阈值

`MobileViewportState` 移除“视口缩小超过 1px + 聚焦/旧 open”为键盘的判断，删除 restingBottom 及 open 自保持。键盘状态只来自 Obsidian 原生 keyboard 事件或宿主 `--keyboard-height`；visualViewport 只提供可见边界。

**这是明确取消 viewport-only 键盘推断，而不是把 1px 改成另一个未经验证的像素阈值。** 没有宿主信号时不加键盘锁框，原生布局继续运行。独立浏览器/异常宿主若不给这些信号，不再获得猜测式固定外框；需在真实 Obsidian 核验宿主信号和键盘遮挡。这项行为边界没有隐藏。

原生 keyboardWillShow/DidShow/DidHide、宿主高度、内部滚动让位、公开 mountMobileFrame、外部消费者和销毁合同保留。

### 侧栏只在真实几何变化时布局

`SearchView.onResize` 在移动端不再依据 `is-ui-frame-locked` 决定重排，因为原生侧栏明确配置 preserveFrame:false，不应该等待这一 CSS 类出现。

移动宽度/布局变化继续由现有 Navigator.resize 处理；方向变化继续由 Frame 回调处理；桌面 resize 行为保留。不是全面禁用适配。测试新增完整 SearchView.onOpen → 实际能力层挂载 → onResize → onClose 路径，不再只调用 Navigator.resize。

### 首次显示只挂载一次移动框架

把 Picker Frame 挂载放到最终 CSS Surface 首次显示处，删除隐藏面板先绑定再额外 refresh 的路径。已显示面板重复 reveal/reposition 不再刷新 Frame。父级恢复显示仍明确刷新已有 Frame，不复制生命周期。

## 生产修改范围

10 个既有 JavaScript 模块修改，143 个 JS 模块不变。没有新增生产模块，模块总数 153，静态依赖 641，循环依赖 0，未解析符号 0。

修改文件：

- `src/core/search/shell-methods.js`
- `src/features/facets/type-picker-methods.js`
- `src/features/navigator/SearchNavigatorController.js`
- `src/features/result-controls/toolbar-methods.js`
- `src/features/sort/SearchSortController.js`
- `src/ui/components/input-controls.js`
- `src/ui/mobile/mobile-frame.js`
- `src/ui/overlays/SearchDropdownController.js`
- `src/ui/pickers/picker-shell.js`
- `src/ui/views/SearchView.js`

完整 CSS 与 modular.3 **逐字节一致**。设置默认值、数据结构、命令 ID、ViewType、公开 API 不改。原始提取来源 826 项中 811 项逐字保留、15 项为累计授权变更；这是相对最初上传聚合包，不等于本轮改了 15 项独立功能。

本轮源码净减少 14 行 / 715 字节，运行 main.js 从 1,638,646 → 1,637,963 字节。没有据此宣称真实设备启动性能已提高。

## 实际测试

| 命令 | 本轮结果 | 范围 |
|---|---:|---|
| npm run check | PASS | 语法、符号、依赖、循环、来源片段、全文件哈希批准范围 |
| npm run build | PASS | 从 src 构建完整单文件产物 |
| npm test | 98 / 98 | 生命周期、数据、接口、错误路径、构建复现等 |
| npm run test:browser | 92 / 92 | 4 尺寸/主题组合下 DOM、几何、焦点、业务/文件和截图对照 |
| npm run test:acceptance | 144 / 144 | 搜索、筛选、创建退出、计数、原 Picker 路径 |
| npm run test:focus | 56 / 56 | 主输入、键盘通知、触控、组合输入、共享监听释放 |
| npm run test:focus-repair | 96 / 96 | 七类 Picker、真实宿主回调/生命周期、触控多选、宽度变化和销毁 |
| npm run test:feishu-focus | 7 / 7 | 原飞书 7.6.5 方法及 GLS 公开 Frame 接入对照 |
| npm run audit:source | PASS | 全源码/CSS/Style Settings 静态扫描；不等同于所有主题实机验收 |

测试数包含主题、尺寸和入口重复配置，不是同等数量的独立功能。新增修复专项中 52 个 A/B 配置断言由不满足目标变为满足，不应写成 52 个独立 Bug。

直接观察：七类 Picker 打开前程序 focus/blur 为 0；连续三次真实侧栏 resize 的 Picker reposition 为 0；完整 SearchView 生命周期也为 0；实际宽度由 390→360px 仍正确重排一次。仅 2px、20px、120px 或 334px 视口变化、没有宿主键盘信号时均不再进入键盘状态。飞书保留/接入 GLS Frame 两条对照均通过。

Chromium 144.0.7559.96，测试宿主为受控 Obsidian 适配器。键盘、visualViewport、组词通知为模拟信号；实际 tap/click/type 来自 Chromium。没有真实 iOS WebKit、Android、真实 Obsidian 桌面或多插件实机验收。

## 失败记录和测试修正

1. 新专项首次按错误的“图标多选按钮”查找文件夹操作，真实组件是“进入文件夹多选”按钮 + 行选择。该轮明确报错，之后改用真实组件入口，不改生产 UI 来迎合测试。
2. 旧界面对照把新旧 mobile 04 的焦点差异判失败：A 把焦点清到 BODY，B 保留主 input。这正是获授权改变。只对这一场景加入保留原输入及选区的明确断言，其他焦点仍严格比较。
3. Frame 改为首次显示时挂载后，class token 顺序改变；比较改为 token 集合排序，未忽略类增删或几何/状态差异。
4. 新增完整宿主宽度测试初轮是 94/96。原测试只改外容器，fixture #host CSS 仍把实际内容固定为 390px，未发生真正宽度变化。修正为修改实际内容容器，并明确同时断言“测得 360px、Navigator 为 360px、重排一次”；未降低为“有任何调用就算通过”。
5. 一次限定 20 秒的工具命令中断了长浏览器回归；后续实际完整执行全部配置。终端交互流不可用，改用当前响应内轮询进程，所有测试均已等候到退出并读取结果。

初轮报告、失败日志与差异位于 reports/focus-repair/，没有当成最终通过结果。生产代码未因上述测试宿主问题追加补丁。

## 文件校验

main.js：1637963 字节，SHA256 `e7e924550555da3c432902de41e29dfe84a758f86a31789ae88565d1c8d8de5d`。

styles.css：245873 字节，SHA256 `621950fca60711fb43d5e355e52deeccf8f611185793115869ececf97c361cad`；与 modular.3 相同。

最终 ZIP CRC、内部文件与源码 ZIP 独立解压重建结果另附交付校验 JSON，避免把一个 ZIP 自身的哈希写回该 ZIP 引发循环校验。

## 安装与维护

双文件覆盖包只覆盖 main.js/styles.css，保留原 manifest.json/data.json。建议先备份并完整重启 Obsidian。随后按原录屏路径检查主搜索、键盘未收起时进入 Picker、多选/确认/返回、真正插入光标和背景；不要仅看文字能否输入。

后续唯一维护基线为本轮 Source.zip；继续改 src 再构建。AGENTS.md、README、架构入口、批准差异和对应测试均已同步。

技术核对参考：Pointer Events 对 compatibility mouse events 与 click 的区分，W3C Pointer Events Level 3，https://www.w3.org/TR/pointerevents3/ 。恢复的是飞书已有的按钮焦点保护，并补实测点击验证，不把标准条款当成 iOS 实机证明。
