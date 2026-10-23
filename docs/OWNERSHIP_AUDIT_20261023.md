# 事件、状态与更新链全源审计 · 2026-10-23

结论：当前实现尚未完全满足“一个事件一个明确 Owner、一个状态一个权威来源、一次界面更新只走必要最短链”。主要问题是同一业务动作经过多个刷新入口，以及少量组件重建和事务提交边界问题。没有证据把当前卡顿统一归因于手势或监听器泄漏。

唯一代码基线：`b418d239d47acde4564e64be4c1720b8aebcb3ec`，分支 `fix/desktop-sidebar`。本轮只新增审计工具与证据，不修改 `src/`、`dist/`、CSS 或安装包。所有结论针对该基线；历史版本不参与拼接。

## 范围与证据级别

- 全部 153 个生产 JS 模块进行 AST 清点，逐文件记录 SHA-256、依赖、事件/调度/观察器调用、状态写入、更新调用及词法作用域。
- 全部 CSS 解析：729 条规则；Style Settings 28 个 heading、143 个参数。检查重复 ID、同名可见根候选、Token 消费、重复选择器和声明。
- 沿下表中的正式 Owner 人工追踪输入、输出、失效及销毁边界；用真实 `SearchView.onOpen → SearchCore → Navigator` 初始化链在受控 Chromium 宿主复现主要路径。
- 全源结构清点不等于每一行、每种业务组合都执行过。原生 Obsidian、真实 CSS Snippet 集合、第三方插件集成、iOS/Android/WebKit 本轮未验证。无法仅凭这些计数证明真实仓库的帧耗时或“最丝滑”。

| 层级 | 本轮覆盖 | 证据 |
| --- | --- | --- |
| 全源结构 | 153 JS、CSS、依赖、状态写入、注册及清理候选 | `reports/ownership-audit-20261023/inventory.json`、`source-style.json` |
| 交互调用链 | 桌面/移动模拟各 8 个场景、键盘真实按键 | `runtime.json`，含调用边、DOM mutation、结果面板显隐状态 |
| 同步异常边界 | 两宿主、结果构建器单次故障注入、随后重试 | `runtime.json` 的 `sharedFailure` |
| 生命周期 | 空闲 1.5 秒、横纵分隔拖动、关闭后 6 轮重开/关闭与 GC | `lifecycle.json` |
| 一致性 | `npm run check`、运行源码/产物哈希与 Git 基线比较 | `verification.json` |

扫描结果：396 处资源相关调用、2445 处状态写入、743 处更新调用、477 处视觉写入候选。这些是语法引用数量，**不是缺陷、监听器实例或独立状态 Owner 的数量**。静态别名及动态方法装配不能仅靠名称判断归属。

## 已确认问题

### O1 · P2：同一导航动作重复进入同步，展示变化也触发搜索共享快照

位置：`src/core/search/search-and-ranking-methods.js:370,533`、`src/core/search/session-methods.js:99`、`src/features/navigator/SearchNavigatorController.js:1129,1137`。

桌面切换一个文件夹：`performSearch → _recomputeCurrentResults → navigator.sync`；搜索末尾又通过 `_notifyStateChange → navigator.sync`。实测 `sync=2`、`_syncMobileTools=2`、`_scopeTitle=4`、投影构建 `=1`。子目录展开同样是直接 `sync`，再通知进入第二次 `sync`。

投影微任务已有合并，因此不是“整棵树重建两次”；重复发生在合并判断之前的标题和工具栏同步。纯展开还经过 `shared.publish → _capture → _normalize`，即使共享查询没有变化。分组展开快路径只同步一次，但仍走这条共享快照路径。

正式边界应为：查询/筛选提交由 SearchCore 统一提交必要结果与导航；Navigator 展开状态由 Navigator 持有并保存视图状态，不应借搜索模型发布来触发自己的同步。不能直接删除所有 `_notifyStateChange`，否则会破坏宿主布局保存及真实跨窗口查询传播。

### O2 · P2：重复选择当前时间排序仍清空导航缓存并重建投影

位置：`src/features/sort/SearchSortController.js:100`、`src/features/navigator/SearchNavigatorController.js:675`。

先选择 `created` 并等待完成，再次选择同一个字段：`performSearch=0`，但 `refreshPreferences=1`、`_renderProjection=1`。原因是无变化判断发生在 `refreshPreferences()` 之后，后者清理目录、计数、范围等缓存并推进失效代数。

正式最短路径：先判断排序、时间依据、日期条件、待提交索引、输入及创建态退出是否真的变化；无变化时保留当前节点/缓存。真实时间依据变化仍由一个设置提交入口通知消费者。不能把所有同字段点击一概吞掉。

### O3 · P2：结果通道重建按钮，键盘焦点丢失

位置：`src/features/results/filter-channels-methods.js:54–129`。

“标题”和“正文”都存在时，聚焦正文按钮按 Enter。桌面、移动模拟均复现：正文状态正确切换，但旧按钮断开 DOM，`document.activeElement` 落在 `BODY`，不再属于通道控件。

原因是 `_renderStateChannels()` 无条件 `host.empty()`，随后重新创建按钮和监听器。这与已保留节点的条件组件不一致。正式 Owner 应为 renderer 内同一通道组件；仅更新计数、选中态和可见性，状态继续使用 `core.bodyExpanded`。无需增加焦点补救定时器或第二份通道状态。

### O4 · P2：只排除文件夹也执行两轮完整结果刷新

位置：`src/features/plugin/view-preferences-methods.js:45–85`。

无待索引工作时执行 `setExcludedFolders(['Folder005'])`，只新增排除，没有恢复文件。桌面、移动模拟均为：`_refreshFolderStateCores=2`、结果重算 `=2`、`renderPage=2`、导航投影 `=2`。

原因：修改设置后立即刷新一次；即使没有恢复索引，保存/flush 的 `finally` 仍无条件再刷新一次。

正式边界应由设置事务区分“索引移除已提交”和“恢复索引产生了新提交”，每个真实数据提交只刷新一次。恢复被排除文件时仍必须等待索引成功并更新打开的 Picker，不能为了减少调用取消这条必要路径。

### O5 · P2：移动导航切换在同一代结果上先隐藏渲染、再显示渲染

位置：`src/features/navigator/SearchNavigatorController.js:715–795,831–864`、`src/core/search/search-and-ranking-methods.js:530`、`src/features/results/virtual-window-methods.js:10`。

模拟移动端从导航选择文件夹：`performSearch=1`，却 `renderPage=2`。记录显示两次 `_resultGeneration` 都是 2，第一次 `main.hidden=true/page=filters`，第二次 `main.hidden=false/page=results`；还出现两次状态通知。

第一条路径由筛选重算直接提交隐藏结果；第二条由 `showResults → setPage → syncPage → renderInitialPage` 在展示时再次提交。页面显示和结果提交职责重叠。

目标应是同一数据提交与展示事务合并，只在正确可见性下提交一次结果。需保留零结果派生创建、滚动锚点和已隐藏输入行为；不能简单禁止所有隐藏渲染或给移动端复制一套搜索业务。这是本轮受控移动复现，并非断言用户实机移动端已经卡顿。

### O6 · P2：跨宿主重试可以在 DOM 尚未恢复时确认版本已应用

位置：`src/core/SharedSearchStateCoordinator.js:166–199`。

故障注入步骤：源宿主正常发布新查询；目标宿主暂被真实忙碌门禁阻挡；解除门禁后在结果构建器抛出一次异常，再恢复构建器并重试 `consume`。

第一次失败时：新查询已经进入目标 core，旧结果 DOM 被 renderer 回滚保留，`applied` 尚未前进。第二次 consume 因 `_capture(core)` 已等于共享目标而跳过刷新，`retryRenders=0`，却将 `applied` 置为当前 revision。同步返回当刻旧 DOM 仍在。

**边界：本次 fixture 约 50ms 后，后续视口任务恢复了结果 DOM。没有复现永久旧数据，不将该异常场景说成正常点击卡顿根因。** 但“版本已应用”目前只证明模型相同，不能证明界面成功提交；恢复依赖另一条任务链。

应明确提交事务的成功条件，让现有 member 的 applied 只在必要视图提交成功后确认，失败重试也必须完成未完成的提交。不能只再增加一份共享模型掩盖该边界。

### O7 · P3：视觉默认值仍有 JS 与 CSS 两套定义

位置：`src/ui/overlays/SearchDropdownController.js:252–307,380–418`、`src/ui/overlays/sidebar-popup.js:5,27`、`src/styles/styles.css:1546–1556`。

例如 `--ls-compact-view-desktop-width` 在 CSS 定义 244px，JS `_cssMetric` 又写 244；其他尺寸也有相同默认值回退。侧栏弹窗 inset 默认 8，以及定位分支中的 6/8 gap、部分高度/偏移常量仍在 JS。

运行几何测量与边界裁切属于 JS；固定视觉策略默认值应归 CSS Token。正常加载时 CSS 值优先，目前未证实这些回退造成额外卡顿，但按用户要求仍不是完整的单一视觉 Owner。移除回退前需验证 CSS 加载顺序和非法 Token 行为，不能只删数字。

## Owner 与边界核对

| 领域 | 权威源 / 正式 Owner | 本轮结论 |
| --- | --- | --- |
| 查询、筛选、排序 | 活动 core 的 QueryState / FilterState；跨普通宿主已提交查询由 SharedSearchStateCoordinator 协调 | 本地待输入、共享已提交模型、会话持久化不是同一阶段；O1/O6 是应处理的提交边界 |
| 目录与计数 | Navigator 消费索引和同一 FilterState；目录缓存、范围缓存为派生数据 | 不应另建“桌面筛选状态”；O1/O2 存在不必要失效/调用 |
| 展开与页面 | Navigator 的展开集合、page、会话宽高 | 几何/展开属于视图；应避免搜索广播。上下/左右拖动共用一个轴适配实现 |
| 结果与虚拟窗口 | SearchCore 结果集合；renderer 持有可见窗口、行高与 DOM | 行高/视口 Observer 职责不同，不应为减少数量直接合并；O3/O5/O6 待闭环 |
| Vault 事件与索引 | 插件注册宿主事件，统一 `_indexQueue` 去重/提交 | modify 与 metadata changed 是不同输入信号，共用队列；没有据此认定双索引 Owner |
| 摘要 I/O 与缓存 | IoPool 调度，renderer 代数拒绝失效 UI 写入；插件持有内容缓存 | 在途标记与已完成缓存职责不同；缓存存在不等于第二份权威数据 |
| 文件与属性写入 | FileOperationService / BatchMetadataService；原始属性索引不混入虚拟属性 | 文件身份与目标 lease、异常 finally 释放、失败逐项返回需保留 |
| 创建草稿 / Picker 多选 | Create controller 草稿；Picker draft 在确认前隔离 | 临时草稿是合法事务边界，不可为了“一个源”把预览直接写进正式状态 |
| Picker / Dialog 生命周期 | Dropdown/OverlayHost 拥有面板；picker-cleanup、dialog-session 释放内部资源 | 全局键盘、外部点击、定位观察器按打开/关闭绑定释放；移动 Picker 不监听桌面定位链 |
| 焦点与键盘 | 原生焦点；input-controls Focus Guard；同 document 的 MobileViewportState | Guard 不应成为业务点击 Owner；O3 是节点生命周期造成的焦点损失 |
| 拖拽 / 滑动 | PointerSortCoordinator / SwipeActionCoordinator / SwipeBack 各自领域 | 全局拖动监听在手势期间挂载并释放；桌面导航没有移动返回手势全链复制 |
| 侧栏弹窗边界 | 仅 owner.hostKind=sidebar 使用侧栏几何适配，其他宿主共用基础实现 | 不用当前活动 leaf 或全局 body 状态移动其他窗口弹窗；O7 默认值需归一 |
| 外部接口 | public-contract、provider token 与 disposable handle | 旧 provider handle 无权移除新一代 provider；外部原始数据仍归提供方 |
| 持久化 | 插件 settings 单一对象、规范化链、串行快照写链 | 活动保存有合并；排除设置问题为 O4，不是并发 settings 双写链 |
| 样式 | CSS Token → Primitive → Component；Style Settings 仅暴露参数 | 无重复设置 ID/同名根候选；JS 回退默认值仍需清理，见 O7 |

## 不应误删的工作与待测项

- 重复点击当前文件夹目前是**取消该文件夹筛选**，标签/属性也有取消语义，不能当成无变化点击直接 return。
- 相同 `setPage` 在受控无变化场景仍有工具栏和状态行同步，但该入口兼有清查询、退出批量、兑现待投影等职责。属于进一步拆清变化条件的候选，不证明所有同页调用都多余。
- `observePickerCountRail` 同时用初次 rAF 和 ResizeObserver 同步滚动条预留宽度；存在重复初测候选。本轮未量化其打开耗时，不列为已证明卡顿根因。
- CSS 中两条 `.local-search-nav-scroll` 规则分别承担布局与分隔线 Token，未发现同属性相互争夺；`overflow:hidden; overflow:clip` 是兼容回退。重复选择器/属性数量不能直接当重复渲染数量。
- 静态 CSS Snippet 未提供真实用户启用清单。本轮只核对插件自身样式和 css-change 分发，不声称已排除所有第三方覆盖。
- 关闭资源测试保留插件实例：关闭后 host 仍有 7 个插件级监听是预期，不能要求归零。桌面 DOM 监听为 33、移动模拟为 20，6 轮开关均稳定；active cores 为 0，nodes 为 21。未做长时间真实仓库内存剖析。
- 上下拖动 20 步对应 20 次视口同步；左右拖动有行高观察和最终 1 次结果渲染。两者均没有搜索重算/导航投影。真实尺寸变化需要布局，不能把这些调用全部删除。空闲 1.5 秒，受监测更新调用及 DOM mutation 均为 0。

## 修复顺序与验收条件

1. 先收敛 O1/O2/O4 的正式提交出口与失效条件，保留索引/输入/创建态例外；验证相同行为不增加结果重算和投影。
2. 用同一通道组件解决 O3，验证鼠标、键盘、触控及跨窗口切换时节点和焦点生命周期。
3. 归一 O5 页面展示与结果提交，再验证正常、零结果、创建、锚点恢复及原生移动端。
4. 修正 O6 成功确认边界，用故障注入证明重试自身完成提交，不依赖偶然视口刷新。
5. 清理 O7 视觉默认值来源；保持侧栏几何作用域，其他宿主弹窗位置不变。

不新增第二套缓存、通用事件总线或桌面/移动完整实现来绕开上述问题。收益须用同输入、同数据的前后 trace 和原生交互验收证明；本轮没有运行修改，因此没有“提速百分比”。

## 复现与验证记录

在依赖已经配置的当前云环境运行：

```sh
export NODE_OPTIONS=--require=/workspace/.monian-setup/baseline-paths.cjs
node --input-type=module -e "import {prepareSubjects} from './tests/harness.mjs'; prepareSubjects()"
node scripts/ownership_inventory.mjs
python3 scripts/ownership_runtime_audit.py
GLS_PERF_EVENT_JOURNAL=metadata GLS_PERF_LIFECYCLE_OUT=/workspace/ownership-audit/lifecycle python3 scripts/performance_lifecycle_audit.py
PYTHONPATH=/tmp/gls-audit-python python3 scripts/audit-source-style.py
npm run check
```

上述 `/workspace/.monian-setup` 路径是当前环境已有基线映射，不是仓库自带依赖。运行时脚本在最终输出前检查本基线问题确实复现；这些断言是缺陷复现，**不是修复后应继续通过的行为契约**。

首两次运行未完成，原因是审计脚本假设导航初始展开且直接选择子行。该 fixture 默认分组折叠，尚未产生子行。修正为场景准备阶段先展开并等待投影，再使用组件拥有的行引用。没有因此修改生产代码或放宽缺陷判定。初始失败记录保留在证据目录。

生命周期测试使用既有 `metadata` 日志选项，仅让测试宿主的历史事件日志不再强持有已解绑回调；真实活跃监听表未改变。否则 fixture 的历史日志会被误读为产品泄漏。

本轮 `npm run check` 的 failures 为空；正式 manifest 未包含在原上传基线中这一既有状态仍保留，不能据 fixture manifest 宣布正式发行校验完成。本轮没有重新执行历史全套 Node/A-B/原生验收，也没有将旧轮结果冒充本轮结果。
