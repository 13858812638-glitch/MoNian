# 剩余性能空间审计 · 2026-10-22

唯一基线：`64449ed`，运行源码来自 `c8237d4`。本轮按“继续审计，找出性能优化空间”进行测量与定位，**没有修改运行 JS、CSS 或发布新的安装包**。以下是仍待实施的改进，不是已修复声明。

## 结论与优先级

| 优先级 | 已确认的现象 | 改进方向 | 必须保留的合同 |
|---|---|---|---|
| P1 | 24 次文件夹切换产生 72 次 Layout；48 次嵌套在点击事件的 FunctionCall 中 | 整理同一筛选事务的几何读取与 DOM 提交顺序，减少写后读导致的同步布局 | 点击立即生效、原生滚动边界、失败回滚、频道与键盘跳转 |
| P1 | 相同筛选状态同步 8 次，条件按钮被移除 8 次；原按钮焦点丢失 | 现有 Condition Group Primitive 按语义身份保留节点，只更新变化的内容与动作 | 单项/整组清除、排序、无障碍名称、创建模式与跨宿主同步 |
| P2 | 24 次分组折叠只发生 24 次布局，没有搜索或结果页重建；大目录样本布局及绘制仍重 | 优先评估导航滚动区域的布局影响范围；大目录再评估按可见范围挂载 | 属性/标签展开、排序拖拽、滚动锚点、焦点行、计数与弹窗锚点 |
| P3 | 每次结果提交计算两次窗口预算，随后重新扫描已挂载卡片 | 复用本次提交已知的节点序列与窗口预算，收口到共享提交路径 | 滚动追加、结果频道、卡片高度测量、选中状态与回滚 |

不把降低局部函数耗时等同于点击变快。上一轮过滤条省去布局读取后，最新 CPU 采样中 `_setScrollTop` 的耗时更突出；本轮时间线确认点击内仍有两轮同步布局。只换一个地方读取 `scrollTop/clientHeight`，可能继续把开销转移给下一个调用者。

## 测量方式与证据

- 真实 `SearchView.onOpen` 初始化链，受控 Obsidian 宿主与系统 Chromium；161 文件/11 文件夹和 2400 文件/200 文件夹两组样本。
- CPU 4 倍降速；每组 24 次真实鼠标切换文件夹，随后 24 次分组开合。计时阶段不包裹业务方法、不挂审计 MutationObserver。
- 另开带方法标记的诊断阶段，记录调用次数及 Layout 所在方法；诊断阶段耗时不作为性能成绩。直接调用筛选入口并等待微任务，只用于工作量核对，不冒充真实输入延迟。
- 可复现脚本：[performance_opportunities_audit.py](../scripts/performance_opportunities_audit.py)。原始时间线保留在 `/workspace/opportunities-audit/`；可移植的摘要、输入哈希和时间线文件哈希见 [审计证据](../reports/performance-opportunities-20261022.json)。

两种数据规模、重复测量的布局次数一致：

| 24 次操作 | 搜索重算 | 结果页提交 | 导航投影 | Layout |
|---|---:|---:|---:|---:|
| 切换文件夹 | 24 | 24 | 24 | 72 |
| 当前分组开合 | 0 | 0 | 0 | 24 |

诊断标记进一步将切换期间的同步布局归属到 `_setScrollTop` 24 次、`renderPage` 24 次。其余布局不在这两个方法内。计时与诊断阶段分开，不能把不同阶段的次数/时长相加。

时间线中的 `Layout`、`FunctionCall`、`EventDispatch` 存在嵌套；禁止把它们的累计时间相加作为总耗时。CPU 降速、测试宿主与自动化输入都有影响，本报告不将绝对毫秒数解释成用户设备的点击到绘制延迟。

## 根因边界与修改约束

### 1. 筛选事务仍有同步布局屏障

调用链：`Navigator.select → _onFilterChanged → performSearch → resetViewport / 重算结果 / renderPage`。当前控件写入之后，`resetViewport` 调用 `_setScrollTop(0)`，后者读取 `scrollHeight/clientHeight/scrollTop`；结果控制栏更新之后，`renderPage` 又读取回滚快照和窗口几何。

定位文件：[viewport-geometry-methods.js](../src/features/results/viewport-geometry-methods.js)、[page-and-snippets-methods.js](../src/features/results/page-and-snippets-methods.js)、[virtual-window-methods.js](../src/features/results/virtual-window-methods.js)。

已确认两处方法级同步布局；`renderPage` 内究竟由哪个 getter 首先刷新布局，仍需更细粒度诊断。正式重构应在既有 Renderer 内协调单次事务的读取/提交，不另建全局几何缓存，也不靠新增定时器、延迟显示选中态或删除回滚快照掩盖问题。归零滚动是否可以省去上界测量，需要覆盖超界、触摸回弹、隐藏列表与原生程序滚动标记后再决定。

### 2. 当前条件行缺少节点保留

[renderPinnedPropertyFilters](../src/features/facets/property-picker-methods.js) 每次先 `activeFilterWrap.empty()`，再创建按钮并重新绑定事件。相同状态同步 8 次，受控场景产生 28 条 MutationRecord（其中移除节点 8 个、加入节点 10 个，包含辅助标签工作），`sameButton=false`、`focusedBefore=true`、`focusedAfter=false`。

这是确定的无效重建和焦点问题，但不等于每次文件夹变化时全部条件都不该更新。实际条件改变、排序调整、创建视图显隐仍须提交。修复应让现有组件按条件身份维护节点和当前动作，沿用 FilterState 的唯一状态源；禁止以 `blur → focus`、另存一份筛选状态或桌面/移动两套渲染函数补救。

### 3. 折叠重计算已消除，浏览器工作尚未消失

[Navigator._section](../src/features/navigator/SearchNavigatorController.js) 的有效投影分支保留行节点，只改变分组显示。测量中开合没有调用搜索重算、结果页提交或导航投影，仍会通知会话状态，这涉及折叠状态保存，不能直接删掉。

大型样本开合的布局耗时显著高于小型样本，仍属优化候选。当前导航滚动区域是正常流布局；CSS 的 `overscroll-behavior: contain` 是滚动链约束，不是布局隔离。若评估 `contain` 或按可见范围挂载，应先验证固定定位、溢出、拖拽占位、滚动锚点和无障碍，不能全局添加 CSS 后宣称解决。

用户截图的文件夹数量较少，因此“大树挂载量”不能被当作当前用户卡顿的唯一根因，更不应为了这个样本直接引入复杂的导航虚拟化状态机。

### 4. 结果提交仍有较低优先级的重复遍历

24 次切换中 `_windowSize` 调用 48 次。提交先遍历挂载 shell 注册高度观察，再由 `_syncMountedState` 扫描 shell 并查找 item、重建派生数组。这部分可从单次提交已有的节点序列推导，不需要新增长期缓存。

观察器重新注册不能直接删：每个结果 generation 都可能重建 HeightIndex，未改变尺寸的复用节点若不重新提供测量，新索引可能继续用估计高度。需要与高度初始化一起处理，并验证滚动窗口、选择、内容失效和异常回滚。

## 已排除的优先方向

- 预热后这 24 次文件夹切换没有调用 `_buildResultItem`。复用缓存实际为 90/72 张，未超过 96 上限；继续扩大缓存不能解决本样本的布局阻塞。
- 未出现一次点击触发两次搜索重算、结果提交或导航投影。不能为减少次数丢弃必要的最终提交。
- 分组开合不触发搜索和结果卡重建。不能继续把开合卡顿笼统归因于“重复搜索”。
- 没有将用户的主题或 CSS 片段认定为原因。本次未收到片段文件，不能凭静态 CSS 检查证明真实片段兼容性。
- CSS 中 `overflow: hidden; overflow: clip` 是显式回退声明，重复选择器中也存在职责不同的 Token/布局声明；静态重复项不是已证实的性能故障。

## 覆盖与未覆盖

重新扫描全部 153 个 JS 模块和唯一 CSS：723 条 CSS 规则；Style Settings 28 个 heading、143 个参数；无解析错误、重复参数 ID、同名重复根或缺少消费者的参数候选。共享状态、Renderer 提交/滚动/高度观察、条件行、导航开合、CSS 布局和销毁路径进行了调用链复核。全源扫描是资源与职责盘点，不等于每个运行分支都做过动态性能证明。

条件按钮另经桌面/移动模拟的 Sidebar/Tab 四种宿主核对。首次扩展夹具误假设 Tab 一定有 Navigator，导致测试脚本报错；改为各宿主共有的 `_selectBrowseFolder → _onFilterChanged` 路径，保留初次失败日志，未改生产代码。

`npm run check` 通过。本轮未改运行代码，不重新引用上一轮 1132 项测试为本轮新增验证，也未重跑全套历史 A/B。没有原生 Obsidian、iOS、Android 或 WebKit 的性能验证；没有发布性能改善百分比或“最终完美版”。

实施顺序：先处理筛选事务的两处同步布局与条件节点保留，再用同一鼠标流验证布局次数、焦点、滚动和回滚；只有这些收益仍不足，才推进导航布局隔离及大树挂载策略。
