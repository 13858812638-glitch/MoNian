# GLS Navigator 交互热路径审计 · 2026-10-22

本轮唯一基线为上一交付 `48269f9`（运行源码提交 `5e8fb14`）。从当前 `src/` 修改并重新构建，无历史代码回填。本轮只修改 6 个运行模块，共增加 20 行、删除 19 行；没有新状态、新缓存、新定时器、新平台分支或第二套组件。

## 全量范围与根因

重新清点 153 个 JS 模块和 1 个生产 CSS，复核真实导入图、样式/Token/Style Settings、监听与清理引用。全源清单、逐文件哈希见 `reports/current/full-source-style-audit.json`。全源静态清点与下表调用链审查，不等同于每项功能均在原生 Obsidian 上验收。

| 链路 | 检查范围 | 结论 |
|---|---|---|
| 选择与搜索 | Navigator.select → FilterState → _onFilterChanged → performSearch → rank/filter → renderPage → notify/sync | 保留一次搜索与同次导航提交；未启用的类型和空属性条件存在多余计算，已修正 |
| 导航树与计数 | 稳定目录、展开状态、全局/范围缓存、标签计数、属性值、滚动锚点 | 标签行更新两次计算同一个身份键；改为本次循环内一次计算，不增加持久缓存 |
| 筛选按钮与文本 | syncFilterButtons / syncTypeButtons / updateFolderButton → Indicator Label / DOM Primitive | 相同按钮状态仍重写属性，Indicator Label 每次替换文字节点；收口至已有共享 Primitive |
| 筛选条 | 保留 Group/Chip/Shortcut 节点 → 原生横向滚动容器 | 每次刷新前后读取 scrollLeft 并尝试恢复，形成同步布局边界；已有节点复用使这套恢复没有必要 |
| 结果卡与滚动 | 有界卡片缓存、内容/配置校验、暂存/提交/回滚、SparseHeightIndex、ResizeObserver、窗口覆盖 | 保留上一轮正式实现；高度监听与实际窗口几何有正确性用途，没有为减少次数盲目删除 |
| 同步与生命周期 | SharedSearchStateCoordinator、SearchView/Core、配置与索引通知、关闭/重开、监听与任务释放 | 未新增更新源；仍验证末次选择、跨宿主设置、退出清理及失败恢复 |
| 弹窗与交互 | sidebar-popup、Dropdown、Picker、Dialog、输入 Guard、键盘、动作手势、分栏拖动 | 侧栏定位范围、原生焦点和输入能力适配不变；当前行为由相应专项回归验证 |
| 移动端/样式 | 移动页面显示、主/子 Picker、键盘内部滚动、Portal、光标、Style Settings、Snippet 边界 | CSS 与参数默认值逐字节未变。无新的样式控制链；用户实际 Vault / CSS Snippet 无法在本环境检查 |

## 实际修改

1. **筛选条交给原生滚动。** `_renderFilterPoolHeader` 保留同一滚动容器与子节点，不再主动读取、恢复横向偏移。内容减少时由浏览器夹取合法范围；选择、计数、锚点和真实配置变化继续更新。
2. **共享标签保留文字节点。** `setIndicatorLabel` 使用已有 `setDomText`。文件夹、标签、属性、类型按钮使用已有 `setSearchAttribute` / `setDomProperty`，相同值直接返回。保留原生 focus、辅助名称和真实 pressed/hidden 状态更新。
3. **筛选按启用条件计算。** 文件类型筛选为空时不计算 `logicalFileType`；空属性 Map 不复制条目。类型、后缀、文件夹、标签、属性和时间匹配语义不变；非空属性与原有 iterable 输入继续走同一匹配路径。
4. **标签身份只归一一次。** 同一行的计数查找和选中查找共享局部 identity，不再各调用一次 `tagIdentityKey`。

## 修改前后证据

`interaction_work_audit.py` 覆盖桌面/移动 × Sidebar/Tab 四种宿主组合。固定基线 30 项中 16 项通过、14 项失败；修改后 30/30。

- 相同 Facet 控件同步 8 次：DOM 变更 **112 → 0**，可见文字节点持续保留。
- 筛选条刷新 8 次：同步 scrollLeft 读取 **32 → 0**，无补偿写入；可见横向位置保持，内容缩减后不超出边界。
- 仅文件夹筛选：类型元数据读取 **1 → 0**，空属性迭代 **1 → 0**；启用类型/属性后仍正确匹配。
- 稳定标签行：每行身份归一 **2 → 1**；没有添加缓存或新状态。

初轮夹具错误地要求移动 Sidebar 中已被产品 CSS 隐藏的筛选条可滚动，产生一个无效失败。定位到它实际为 `display:none` 后，测试改为：可见容器验证滚动位置，隐藏容器验证保持零偏移。正式前后对照均使用修正后的同一测试，未改产品 CSS 来迎合夹具。

## 连续点击测量

环境为 Chromium + 模拟 Obsidian API，CPU 4 倍降速。按“基线 → 修改后 → 修改后 → 基线”顺序，在每种规模中每轮执行 50 次文件夹点击、40 次展开折叠。全部点击送达、最后一次选择、单箭头、结果一致性、滚动覆盖和远端键盘跳转均通过。

| 数据量 | 同步选择均值：基线 → 修改后 | 含导航微任务提交均值：基线 → 修改后 | 导航投影均值：基线 → 修改后 |
|---|---:|---:|---:|
| 161 文件 | 18.39 → 18.47 ms | 22.27 → 22.08 ms | 2.27 → 2.07 ms |
| 2400 文件 | 18.89 → 17.50 ms | 29.00 → 25.72 ms | 8.70 → 6.89 ms |

大样本的同步选择均值下降约 7%，含导航提交均值下降约 11%；小样本没有明确平均提速。筛选条方法均值约从 2.9–3.1 ms 降至 0.15–0.19 ms，但部分布局工作会移至后续结果提交，不能把该局部下降直接当作整体提升。

P95、最大值、帧间隔与逐轮样本统计见 `reports/interaction-performance-benchmark.json`。以上均不是原生设备输入到绘制完成的延迟，也不是用户 Vault 的实测帧率。

## 验证与交付边界

最终门禁、专项数量、初轮证据和可重复构建哈希见 `reports/interaction-performance-validation.json`；运行包及真实下载校验见 `reports/interaction-performance-delivery.json`。

静态检查、构建及当前交互套件执行完毕后交付。历史冻结对比仍保留 4 项 Node 契约差异和 4 项初始浏览器快照差异，未修改旧断言或冻结快照掩盖差异。浏览器 A/B 在初始快照差异处退出，不能把它算成后续场景全部通过；当前功能使用独立交互套件验证。

本环境没有原生 Obsidian、iOS/Android 真机或 WebKit。原生性能、实际 Vault 和三方插件组合尚未验证；不能宣称全部卡顿消失或达到任何设备上的最高流畅度。

运行包仅含 `main.js`、`styles.css`。关闭 Obsidian 后覆盖原插件同名文件，保留原 `manifest.json`、`data.json`，再启动 Obsidian。
