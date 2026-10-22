# 桌面侧栏鼠标交互候选 · 2026-10-22

从 `f113a8d` 继续修复用户反馈的点击其他筛选行卡顿／无响应。继承重复箭头、结果窗口预算和移动 Picker 光标修复，仍为待原生 Obsidian 验收的开发候选。

## 已复现的原因

桌面侧栏本体此前注册为整面板 SwipeBack 返回层。共享识别器处理鼠标按下，并检查目标祖先的横向滚动尺寸；横向移动达到 10 像素时认领手势，松开时屏蔽随后 click。即使没有达到 48 像素的实际返回距离，也会屏蔽点击。

在真实 SearchView 生命周期的 Chromium 模拟宿主中，鼠标按下后在同一按钮内右移 14 像素再松开：浅色、深色各 12 次文件夹选择，父候选均未执行选择。相关手势路径每组读取 `scrollWidth/clientWidth` 1224 次。该数值是访问次数，不能等同于强制重排次数。

## 修改范围

唯一运行源码变更为 `src/ui/views/SearchView.js`：整面板 SwipeBack 只向 Tab 或移动 sidebar 注册，桌面 sidebar 本体不再注册。此后其鼠标点击和横向滚轮不会进入这一返回层的几何检查与点击拦截。

这是宿主级边界修改，未改共享手势状态机。右键菜单、展开折叠、鼠标滚轮、分栏拖宽和显式拖拽排序继续由原有控件负责；子 Picker 的返回层、独立窗口、Tab、移动侧栏继续沿用自己的行为。没有修改 CSS、弹窗位置、数据存储、默认设置或公开 API。原图标与结果列表性能改进保留。

## 验证与边界

新增 `scripts/sidebar_mouse_gesture_audit.py`：27 项检查，修复前 14 通过／13 失败，修复后 27 通过。修复后两组 12 次轻微横移点击全部选中预期文件夹，结果和高亮一致，SwipeBack 的尺寸读取为零；另验证分栏拖宽、右键菜单、Picker 独立返回层、另开 Tab 后侧栏仍免于扫描、Tab 内主动滑动仍返回、Mac 横向滚轮和关闭后的释放。

测试使用 Playwright 真实鼠标事件流；Mac 平台与 WheelEvent 为模拟，Tab 内使用实际 SearchView 表面中的临时按钮探针。搜索验收 144、桌面导航 55、侧栏弹窗 80、移动侧栏 96、索引 7、Chromium Portal 48、光标 36、完整工作流 80 项通过。全体 Node 258 通过／4 项历史合同失败，冻结浏览器 A/B 保留 4 个初始快照失败。完整门禁及历史失败见 [验证记录](../reports/sidebar-mouse-validation.json)，复现前后证据见 [专项记录](../reports/sidebar-mouse-results.json)。

全体 Node 和冻结浏览器 A/B 仍有此前已记录的历史合同／初始快照差异，未修改或放宽旧断言。原生 Obsidian 桌面、iOS、Android、WebKit 和真实第三方集成未验证。这次证明并移除了一条误吞点击的路径，不能据此保证真实库中的所有渲染卡顿均已消失。

## 安装

[下载 GLS-Desktop-Sidebar-Mouse-20261022.zip](https://github.com/13858812638-glitch/MoNian/raw/refs/heads/fix/desktop-sidebar/downloads/GLS-Desktop-Sidebar-Mouse-20261022.zip)。关闭插件，备份旧 `main.js`、`styles.css`，覆盖 ZIP 中同名文件并重新启用。保留原 `manifest.json`、`data.json`。恢复备份即可回退。

[交付记录](../reports/sidebar-mouse-delivery.json)包含 ZIP CRC、文件哈希及远端下载复验。此前下载包保留。
