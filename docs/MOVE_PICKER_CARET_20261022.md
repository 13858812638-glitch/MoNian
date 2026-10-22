# 移动文件夹 Picker 光标归一 · 2026-10-22

用户反馈“移动文件夹的 Picker 没光标，其他都有”。从 `aa1ed73` 继续修复，保留之前全部侧栏改进；仍为待原生设备复验的候选。

## 原因与改动

搜索框本来就通过 `renderSharedFolderTreePicker` → `createSharedPickerTreeShell` → `createSearchTextField` 使用统一输入组件。遗漏在独立文件操作的宿主：列表内“移动到”使用 SearchDropdownController 的 Popup Portal，命令和外部调用的文件夹选择器使用 LocalSearchOverlayHost。

后者没有覆盖此前用户在 iPhone 上确认有效的 E 阶段条件（见 [原实机依据](PICKER_IOS_PORTAL_FIX.md)），而且移动端从聚焦输入框打开时，外部调用路径仍可能聚焦 Picker 外壳。测试复现了这两类合同差异；Chromium 修复前也能绘制光标，因此没有将模拟结果写成“复现了原生 iOS 光标消失”。

- 独立文件夹 Picker 接入同一条 iOS `display: contents` 规则，使全屏宿主不再充当输入框的额外绘制祖先。
- 背景点击层改为 Picker 的同级元素，继续由原 Overlay Owner 处理外部点击关闭；复用既有 `_lsOpenedOrder` 保持叠加窗口顺序。
- 移动端独立文件夹 Picker 不再把焦点转到弹窗外壳，与现有普通 Picker 一致。原生输入节点、输入组件、选区和事件 Owner 保持原归属。
- 桌面、Android 的绘制布局保留；删除弹窗、属性编辑窗口不匹配这条独立文件夹 Picker 规则。

## 验证

`scripts/move_picker_caret_audit.py` 通过真实 SearchView 生命周期覆盖桌面、iOS 类名模拟、Android 类名模拟 × 深浅主题 × 列表移动/命令移动/外部文件夹选择三个入口。初轮 148 通过、8 个合同差异失败；修复后 156/156 通过。包含输入节点连续性、命中、中文合成输入与选区、SearchView resize、实际测试库文件移动、外部回调、Escape、点击背景关闭和卸载。

18 个入口组合均执行原生 caret 截图，并用透明 caret 负对照排除文字、样式变化。截图显式使用 `caret="initial"`，不使用模拟光标。

`scripts/move_picker_host_audit.py` 24/24 通过：两个独立 Picker 叠加时的命中与关闭顺序、删除弹窗原布局、原生 Modal 容器归属、关闭按钮，以及 18 组修复前后精确位置/尺寸对比。背景点击层不包裹输入框，窗口定位不迁移。

最终回归：焦点 56/56、焦点修复 96/96、飞书共享焦点 8/8、移动侧栏 96/96、索引 7/7、Chromium Portal 48/48、Caret 36/36、侧栏弹窗 80/80、业务工作流 80/80、搜索验收 144/144。静态检查、构建及可复现构建通过；Node 256 通过、4 个历史合同失败，冻结浏览器 A/B 保留 4 个初始快照失败。

完整门禁结果见 [验证记录](../reports/move-picker-caret-validation.json)，专项前后证据见 [审计记录](../reports/move-picker-caret-results.json)。保留历史 Node 原型合同及冻结浏览器 A/B 初始快照差异，不修改冻结基线来消除失败。

以上运行于 Chromium + 模拟 Obsidian。原生 iOS/WebKit、Android、桌面 Obsidian 中本次修复的光标表现仍需实机确认；历史 E 阶段实机证据不能替代本次交付验收。

## 安装

下载 [GLS-Move-Picker-Caret-20261022.zip](../downloads/GLS-Move-Picker-Caret-20261022.zip)。关闭插件，备份后覆盖 `main.js` 和 `styles.css`，保留原 `manifest.json`、`data.json`，重新启用。两个文件来自同一次构建；旧包仍可回退。

ZIP CRC、内部文件哈希和远端下载复验见 [交付记录](../reports/move-picker-caret-delivery.json)。
