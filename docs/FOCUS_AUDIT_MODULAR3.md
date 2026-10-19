# GLS Navigator modular.3 · 焦点、键盘与搜索表面审计

## 结论与唯一基线

本轮只修改本会话的 modular.2 Source.zip。源码 ZIP SHA256 为 `34e5bd4900122156304fa13c1abdcae901efa1780760f022ba07b0b0fb857ede`。修改发生在 src/，main.js 是重新构建的产物，未在聚合文件末尾补丁。

已复现并处理：主输入获得焦点引起无关导航重投影；同宽度的高度变化重复刷新导航；仅聚焦、未出现软键盘时提前锁定外框；各个弹窗分别记忆键盘状态，导致新 Picker 错过已有键盘；搜索触摸高亮和过渡重置只在主输入上生效，没有归属共同的搜索组件。

**这是一份有实测依据的焦点链修订候选，不是 iPhone 实机“光标已百分之百恢复”的验收结论。** 录屏证明用户遇到了真实异常，上一版的 Chromium activeElement / selection / caretColor 检查不足以否定它。本轮没有在测试宿主中重现 iOS 插入光标消失的完整绘制过程，因此不能把所修控制链缺陷说成该原生症状的唯一已证实原因。主搜索背景的所有变化也不能仅凭 Picker 的触摸高亮差异解释完毕。

## 录屏与测试证据的区分

已检查用户约 66 秒的屏幕录像，按时间抽帧观察主搜索、创建切换、清空和属性 Picker。主输入在部分片段能看到插入光标；属性 Picker 在键盘已出现的片段看不到同样的插入光标。不能将一张光标熄灭帧当成证明，也没有把录屏通知或个人画面加入源码包。

可重复的本地证据来自 `reports/focus/focus-results.json`。测试包含真正的 Chromium 点击/tap、实际 Workspace 能力层、可控 visualViewport、宿主键盘事件和合成组词事件。它们不是 iOS 软件键盘，也不是用户当前主题/CSS Snippet 的替代品。

## 根因一：把 focus 当作导航更新

原 `_buildMobileToolbar` 在搜索框 focus 时设置 searchVisible 并调用 `_syncMobileTools`。普通点击也会重写工具栏和标题；同宽度 resize 又再次进入 syncPage / 工具栏更新。

实测同一浅色移动测试宿主中，一次主输入 tap 引起 1 次工具栏投影、12 条 DOM MutationObserver 记录，包含 1 次子节点变化。新版三者均为 0。连续两次同宽 resize，原版工具栏投影 2 次、DOM 变更 50 条；新版均为 0。这是 DOM 操作计数，**不是浏览器重绘次数或实机性能基准**。

现在搜索可见性由原导航入口/页面状态负责，focus 只交给原生输入。Navigator 只在实际宽度或布局变化时更新布局。restore 独立保证页面投影，避免优化 resize 后同宽恢复页面失效；对此建立了专门回归。

## 根因二：各窗口分别猜键盘状态，且 focus 过早锁框

旧 MobileFrameController 在 focusin 时立即 lock，即使没有软键盘也写入固定高度。每一个窗口又分别维护 nativeOpen、nativeHeight 和 restingBottom。主搜索键盘已经出现后，新 Picker 的 restingBottom 会以缩小后的视口为基线；读取宿主 CSS 的 `--keyboard-height` 还要求这个新 Picker 自己先收到 keyboardWillShow，因此“键盘已经开着，不再重发 show”的路径判断错误。

现在同一 document 的 GLS 移动窗口共享一个生命周期受控的 MobileViewportState。它统一读取宿主当前 inset、原生键盘通知和 visualViewport，各 Frame 只消费结果并维护自身临时外框/内部滚动让位，不另存一套独立键盘开关。最后一个 Frame 销毁即解绑全部共享全局监听。

焦点获得时只记录测量值，不写固定高度、不变外框、不滚动补偿；只有实际键盘/可见视口遮挡存在时才进入临时键盘状态。键盘真实消退后，即便 DOM 仍保有焦点，也退出临时锁框。迟到的 hide 不能覆盖仍存在的 CSS inset/可见视口遮挡。

在 844px 视口、334px 键盘、510px 可见区的控制实验中：旧版新 Picker 报告 keyboard=false / inset=0；新版正确报告 keyboard=true，并按自身外框测得约 194.73px 遮挡。主窗加 Picker 共存时，相关全局监听从 14 条减为 7 条；全部销毁后为 0。监听数量来自当前测试场景，不等于插件整个生命周期总监听数量。

## 根因三：同类搜索输入的触摸表面不一致

主搜索 wrapper 已有 transparent tap-highlight；Picker 没有继承同一条规则。在本次 Chromium 移动模拟中，主输入的计算值为透明，而 Picker 为 `rgba(51, 181, 229, 0.4)`。这证明两者触摸高亮合同不一致，不是已经量化了用户 iPhone 的实际变色色值。

触摸高亮现在集中到共同的搜索表面规则；主输入和 Picker 共享 transform / transition 重置。没有新增 Style Settings 参数，没有改选中背景或其他业务色彩。Picker 原有焦点下划线继续保留，正常的可辨识焦点反馈不是异常。

MDN 对该非标准 CSS 属性的说明：它控制触摸高亮并可继承。参考：
https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/-webkit-tap-highlight-color

## 定位与组件生命周期

Dropdown 仍使用原 panel、原 portal、原打开/关闭/父子返回路径。移动 Frame 等待已有定位入口完成 CSS sheet 布局后再测量，避免把临时隐藏的 dropdown 尺寸当成最终外框。重复定位不再重写相同 class 和不存在的样式属性。

没有新增 focus/blur 调用、假光标、延迟自动聚焦、轮询、requestAnimationFrame 焦点重试、transform 合成层补救或正文/筛选数据源。保留原有明确关闭/切换控件时释放输入焦点的路径，不能把所有 blur 一概删除。Native frame 的 preserveFrame:false 合同保留，原生 Leaf 不叠加第二个固定外框。

## 实际修改范围

- `src/features/navigator/SearchNavigatorController.js`：移除 focus 驱动的工具栏投影；同宽布局去重；恢复页面不依赖一次无条件 resize。
- `src/ui/mobile/mobile-frame.js`：同 document 统一键盘状态；焦点和实际键盘分离；沿用内部滚动让位与清理合同。
- `src/ui/overlays/SearchDropdownController.js`：已有 panel 显示后通知 Frame 测量；位置写入幂等化。
- `src/styles/styles.css`：共同搜索表面的触摸高亮与输入重置归属。

相对 modular.2，只有 3 个 JS 模块和 1 个 CSS 源文件改变；其余 150 个 JS 模块逐字未变。未新增生产模块，未改数据结构、设置默认值、命令、ViewType、公开 API 或文件写入逻辑。8 个命令、2 个 ViewType、API v18 的既有合同测试继续通过。原生 manifest 仍未提供，因此没有编造 Plugin ID 或正式 manifest.version。

Style Settings 仍有 134 参数、27 heading；扫描未发现重复 ID、同名根 heading 或无消费参数候选。279 个已定义 Token 的数量不变。此静态结果不等于所有真实主题、用户片段和全部参数极值的实机验收。

## 自动化验证

本轮 A 使用冻结 modular.2 主体和对应 CSS，B 使用当前源码重新构建；不是两边加载同一新 CSS。

- Node：98 / 98，0 失败。
- 浏览器既有界面 A/B：92 / 92，0 失败，包括 80 个场景配置检查、12 次测试宿主截图字节对照。
- 搜索/条件/导航/Picker 回归：144 / 144，0 失败。
- 新焦点专项：56 / 56，0 失败。其中 46 个配置断言由 A 不满足变为 B 满足；含主题和 Picker 类型重复，不是 46 个独立 Bug。
- 静态检查：153 模块、641 依赖边、0 循环、0 未解析符号、0 越界源码变更；原始单文件 826 个来源片段中 817 个仍逐字保留，9 项是累计获授权修改。

新的界面 A/B 不再忽略整个条件栏。它只归一已明确删除的“无键盘临时锁框”class/高度/inset=0 注解；其他 DOM、实际几何、焦点、状态和写入继续严格比较，并独立断言 B 在无键盘时没有锁框。不是把整张弹窗从检查里排除。

测试分别执行 `npm run check`、`npm run build`、`npm test`、`python3 scripts/browser_ab.py`、四个 TEST_CONFIG 的 `python3 scripts/search_condition_audit.py`、两个 FOCUS_THEME 的 `python3 scripts/focus_audit.py`、`python3 scripts/audit-source-style.py`。分配置结果已合并；它们等价于执行 package.json 中的整套门禁，但本轮没有伪称某个被时限终止的 npm run verify 已经完整返回成功。

## 失败、环境边界与未验证

早期长时间测试工具调用遭到执行时限终止，产生 EPIPE；中途已输出的成功项没有冒充整套完成。随后完整执行并得到正常退出码，原日志保留在 reports/focus/history/。第一次严格 UI A/B 报无键盘 `--ui-mobile-keyboard-inset: 0px` 注解差异；确认是本轮授权删除的状态写入后，缩小到该状态注解的归一，同时加上 B 不得锁框的独立断言。

WebKit 浏览器安装尝试因下载域名 DNS 失败未完成，日志一并保留。因此 **没有 WebKit、真实 Obsidian 桌面、iOS/Android、真实中文输入法、真实主题/片段、NAS 或多插件联合实机验收**。录像是用户的真实症状证据，不是本版本已在该设备运行的证据。

参考 VisualViewport 的平台语义：
https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
焦点 API 的作用与滚动选项：
https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus
这些参考不构成当前 iOS 某个已知缺陷的归因，本轮也未拿历史 WebKit Bug 冒充当前设备诊断。

## 安装与本机验收

交付双文件覆盖包，不是独立新装包。备份现有 GLS 插件后同时覆盖 main.js 与 styles.css，保留 manifest.json、data.json 和业务数据；完整重启 Obsidian，先在测试仓库验收。

按录像路径检查：不输入文字只点击主搜索；在键盘仍开着时切入文件夹、标签、属性 Picker；点击输入、组词、清空、再次点击、切换 Picker；最后收起键盘但保留输入焦点。观察光标是否可见、输入表面有无异常整块变色、弹窗外框是否跳动、返回/滚动是否正常。原焦点下划线保留是预期行为。

本版需要 iPhone 回测后才能判断用户的完整原生症状是否消失。未经回测不能称“全插件封盘”或“100% 光标修复”。

## 维护与复现

继续以新的 Source.zip 维护 src/，不要改生成后的 main.js。先读 AGENTS.md 和 ARCHITECTURE.md，焦点问题优先查看本轮 3 个 JS 模块、共享输入 CSS、tests/focus-scenarios.js 与 scripts/focus_audit.py。跨宿主问题再扩读 Workspace 能力层和 Shared UI API，不必重复全读聚合文件。

默认构建仍是 TypeScript 5.8.3 转译 + deterministic CommonJS linker；未换 esbuild。依赖与锁文件完整，npm ci 后 npm run build 即可重建。完整 ZIP 复验与运行文件 SHA256 另附在校验结果 JSON；源包的校验值不能放回被校验的源 ZIP 内造成循环哈希。
