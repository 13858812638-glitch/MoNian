# 工具栏与状态同步优化 · 2026-10-23

本轮唯一开发基线为 `1ab2cd7`，包含此前已交付的筛选提交优化。用户要求左侧顶部命令图标与右侧动作栏同尺寸、右对齐，并继续审计性能损耗。本轮修改 2 个共享 JS 模块和唯一生产 CSS。

## 图标与样式归属

桌面侧栏顶部命令栏在左栏内部右对齐；其按钮与直接 SVG 子节点加入现有结果动作栏 Primitive，共同消费 `--ls-selection-action-size`（默认 26px）和 `--ls-selection-icon-size`（默认 15px）。删除旧的桌面命令按钮 28px 固定尺寸；未新增另一套尺寸 Token、Style Settings 参数或 JS 样式。

移动端保留原 44px 触控目标、22px 图标与靠左排列。定位、菜单锚点、命令顺序及共享命令配置不变。已有 Style Settings 的两个尺寸参数同时影响桌面两侧工具栏，说明文字已更新。

## 性能根因及正式实现

沿 Navigator 选择 → 筛选提交 → 结果渲染 → Selection 状态同步与结果条件行，核对统计文字、disabled、hidden、title、aria-label、aria-expanded 的实际写入。原实现即使状态相同也重复写 DOM，其中 textContent 会替换计数文本节点。

`SearchSelectionController.updateStats/syncControls` 和 `SearchCore._syncResultStateRow/_syncWorkbenchPresentation` 改用已有 `setDomText`、`setDomProperty` 和 Hover Owner 的 `setSearchAttribute`。可见文本保留节点，辅助名称继续由同一 Owner 维护；仅值变化时写入。实际计数、批量选择、创建中禁用、清空条件与展开状态仍实时更新。

没有新增状态副本、DOM 值缓存、监听器、定时器、焦点补偿或平台业务分支。桌面/移动与 Sidebar/Tab 消费同一同步实现。现有面板切换与焦点恢复路径保持原有职责。

## 工作量与连续点击对照

专项在同一真实 SearchView 控制器上调用 8 次无变化的 `syncControls` 与 `_syncResultStateRow`，观察工具栏和条件行 DOM：

| 宿主 | 修改前 MutationRecord | 修改后 |
|---|---:|---:|
| 桌面 Sidebar | 200 | 0 |
| 桌面 Tab | 200 | 0 |
| 移动模拟 Sidebar | 176 | 0 |
| 移动模拟 Tab | 192 | 0 |

这些数字表示无变化同步的重复写入，不表示正常切换无 DOM 变更，也不是整次点击的速度比例。专项同时验证实际状态变化、按钮可用性、清空最后条件、文本节点保留、窄宽布局、共享尺寸参数及关闭清理；同一脚本修改前 13/26，修改后 **26/26**。

完整回归结束后，在受控 Chromium、CPU 4 倍降速下串行运行修改前 → 修改后 → 修改后 → 修改前；每侧每种库规模合计 100 次文件夹切换。修改前同时固定本轮基线 JS 和 CSS：

| 文件规模 | 修改前平均 / P95 | 修改后平均 / P95 |
|---|---:|---:|
| 161 | 20.74 / 51.70 ms | 19.52 / 50.10 ms |
| 2400 | 24.18 / 43.90 ms | 22.88 / 49.50 ms |

计时从 `select` 开始至导航微任务结束，**不包含随后绘制，不是原生输入到画面延迟**。两组平均值降低约 5%～6%，大库 P95 未改善；不能据此承诺所有操作都已流畅。确定性收益是减少重复写入；本轮没有新的 Layout 次数结论。参见 [对照数据](../reports/toolbar-performance-benchmark.json)。

## 审计与验证范围

重新扫描全部 153 个 JS 模块、唯一生产 CSS、Style Settings、Token 和资源引用。当前依赖 664 条，无循环/未解析符号；723 条 CSS 规则无解析错误；143 个参数、28 个 heading，无重复 ID、同名外层标题或无消费者候选。相关 DOM、状态数据流、事件、监听/生命周期、缓存、同步、焦点/键盘、手势和移动宿主合同已结合当前代码与回归检查。扫描用于核对清单，不等于每个模块的所有行为已被证明。

本轮没有用户本机主题或 CSS Snippet 文件，未把它们作为根因，也未添加片段覆盖。已有全源扫描仍列出重复选择器等人工复核候选；本轮没有仅凭扫描命中改动其职责或宣称全项目不存在任何冗余。

工程检查及可复现构建通过，当前行为检查 **1202 项通过**，涵盖筛选、属性展开、连续点击、布局调宽、结果复用、选择操作、Picker/弹窗、焦点、Portal 和移动端模拟。Node 为 265/269，4 项既有冻结原型差异仍存在；历史浏览器 A/B 仍在 4 组初始快照处不同，后续 A/B 步骤未执行，独立当前行为套件用于验证现有交互。冻结基准未修改。详细列表见 [验证报告](../reports/toolbar-performance-validation.json)。

浏览器宿主替身的 SVG 用于测量尺寸，不是原生图标绘制验收。原生 Obsidian、iOS/Android、WebKit、用户实际仓库的流畅度及 Style Settings 最终 UI 尚未实机验证；自动化通过不等于“完美产品”。

## 安装与交付

`GLS-Toolbar-20261023.zip` 只包含 `main.js`、`styles.css`，覆盖现有插件目录中的两个文件后重载插件，保留原 `manifest.json`、`data.json`。包内文件与 `dist/` 逐字节一致，CRC 通过。源码在既有 `fix/desktop-sidebar` 分支；未变更 `main` 或升级冻结版本。公网下载校验见 [交付记录](../reports/toolbar-performance-delivery.json)。
