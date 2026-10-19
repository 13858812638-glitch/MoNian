> 历史诊断记录。后续用户提供了 E 阶段截图并明确回复“e可以”：输入框右侧可见原生光标。当前版本已移除诊断命令，不再按本页步骤运行。永久修复见 PICKER_IOS_PORTAL_FIX.md。下文保留当时状态与失败记录，不是当前验收结论。

# 真机光标对照 diagnostic.caret.2（不是修复版）

用户最新录屏已经证明 picker-ios-caret.1 未解决问题。主搜索能显示原生光标；标签、属性、属性值 Picker 能输入和过滤，但无光标。

## 已确认与未确认

- 主搜索和 Picker 使用同一个原生 input 构造组件。已有真机日志中，Picker 的 activeElement、selectionStart/End、caret-color、命中目标均正常。
- 实际区别包括 Picker 的独立 viewport portal、fixed 弹层、输入框行高与多层裁切。尚未证明其中任何一个就是根因。
- 本轮 Linux WebKit 26.0 中，原上传版与 caret.1 的主搜索和 Picker 都能产生原生引擎光标像素；透明光标负对照也成立。增加已记录的 body containment 后结果相同。因此该环境未复现 iPhone 故障，不能作为 iOS 修复验收。
- Linux WebKit 与 iPhone UIKit 原生光标层不是同一个可测试目标。浏览器计算样式、DOM 焦点、选区正确，不等于真机光标已经绘制。

## 只需一次真机录屏

1. 将交付的 main.js.txt 重命名为 main.js，与 styles.css 覆盖原搜索插件对应文件，然后重载插件。
2. 在 Obsidian 命令面板运行“光标定位：开始／停止一次真机对照”。
3. 开始录屏，打开任意标签／属性 Picker，点击它的搜索框，输入几个字。
4. 保持输入框和键盘打开约 46 秒；标题依次显示 A～F。每阶段 6 秒，中间恢复原样 2 秒。不需要点击或手动切换条件。
5. 将这段录屏发回，或说明哪个字母阶段出现光标，以及回到“原样间隔”后是否又消失。

| 阶段 | 临时对照条件 |
| --- | --- |
| A | 原样，作为基准 |
| B | 输入框使用当前主搜索的字号、行高和高度合同 |
| C | 只解除输入框 Field 与搜索行的裁切 |
| D | 只解除弹层本身的裁切和 isolation |
| E | portal 使用 display:contents，去掉该层绘制盒，输入节点不移动 |
| F | 原输入框使用弹层的实心背景和独立定位层 |

每个阶段均从原样开始，条件不叠加。这些是诊断干预，不是已确认的修复。某阶段出现光标仍需据录屏继续确认原因，不能只凭样式变化直接定案。

## 源码范围

- src/core/LocalSearchPlugin.js：onload 注册一个显式诊断命令，原八个命令保持原样。
- src/ui/overlays/SearchDropdownController.js：新增独立模块函数 registerPickerCaretVisualProbe(plugin)。正常 Dropdown 业务方法沿用 caret.1。
- src/styles/styles.css 与上一版 caret.1 完全一致；诊断通过短时 inline styles 实现，结束后恢复原值及 priority。
- 仍为 153 个 JS 模块、642 条静态依赖。没有改变业务查询、过滤、存储、公开 API、已有命令 ID。
- 所有计时器和监听只在显式运行诊断命令后存在；结束、输入失焦、关闭、切换子 Picker 或卸载插件会还原。再次运行命令可立即停止。
- 不读取或记录输入内容，不创建日志文件，不上传数据，不添加光标模拟元素，不调用 focus/blur，不重建或移动 input。
- 为避免提示层影响对照，准备 Notice 在开始输入时隐藏；阶段状态写在现有标题文字中。

## 验证

专项测试先在未添加命令的代码上失败：reports/picker-native-probe-before.json。
随后在 Chromium 与 Linux WebKit 中检查六个阶段的 input identity、焦点、文本、选区和无程序 focus/blur，并检查完成和提前关闭时的样式／标题还原。见 reports/picker-native-probe.json。
新增专项需要安装 Playwright 的 Chromium 与 WebKit；可用 CHROMIUM_PATH 指定 Chromium，用 WEBKIT_BUNDLE_DIR 和 WEBKIT_DEPS_LIBRARY_PATH 指定便携 WebKit 及其依赖。默认使用 Playwright 标准安装。

Node、浏览器、搜索条件、焦点与飞书对照门禁的本轮执行记录见 reports/diagnostic-caret-2/。这些仅说明对照程序和正常功能的工程检查结果；iOS 原生光标仍待此次录屏观察。

## 还原

对照结束即自动还原所有临时样式。若不再需要诊断命令，可恢复上一版 caret.1 的 main.js，CSS 无需更换。上一版 caret.1 同样尚未修复 iPhone 故障。

初轮全量 Node 检查：90 通过、8 失败；差异均为诊断版多注册的一个命令事件。已在 A/B 测试公共入口严格断言该命令的唯一 ID、名称和次数后，只扣除这一个已授权事件，继续比较全部其余宿主事件。原始失败日志保留在 reports/diagnostic-caret-2/node-first-run.log。

第二轮 Node 检查 97 通过、1 失败：LRU 用例主动清空事件记录，诊断命令计数断言位置应在用例执行前。该断言已移至初始化完成后，并保留完整后续事件比较；第二轮日志为 node-second-run.log。

最终工程检查：98 项 Node、92 项浏览器回归、144 项搜索条件、56 项焦点、96 项焦点修订、7 项飞书对照、36 项 Chromium 光标合同、10 项双引擎诊断回滚检查均通过。静态检查通过；iOS 根因未确定，真机未修复验收。
