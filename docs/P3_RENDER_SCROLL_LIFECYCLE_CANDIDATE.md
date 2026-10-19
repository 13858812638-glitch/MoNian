# GLS v5.2 · P1+P2+P3「渲染与滚动状态优化 v1」开发测试候选

> **未升级正式基线。** 本候选从 P1+P2「缓存与增量排序 v1」完整模块化 Source 派生，唯一正式冻结仍为 2026-10-18 GLS v5.2「同词无变化通知收口 v1」，正式 Source SHA256 `eeef86b7ff5a50ff97807f60627d852be53635b727f2bb856a57a2c2651dfd2d`。

## 一、改动范围

本轮仅修改两个运行源码文件：

1. `src/features/navigator/SearchNavigatorController.js`：原生 `scroll` 仍由浏览器处理，触摸按压清理、DOM、原生滚动位置与锚点完全不动；对仅用于 `workspace.requestSaveLayout()` 的 `onStateChange` 通知进行**第一次立即通知 + 同一滚动段每 180ms 最多一次后续通知**。读取会话仍直接从 DOM 的当前 `scrollTop` 获取，不依赖任何延迟快照。销毁时取消当前定时器，终止待保存调度。辅助函数位于模块顶层，不新增 Navigator 原型方法，冻结的原型方法列表、顺序、描述符与参数数量不变。
2. `src/features/results/virtual-window-methods.js`：`refreshChangedRows` 在结果顺序未改变时，直接用屏幕内已挂载结果卡的 `data-virtual-position` 确定其在 `fullResults` 内的索引；只对变化行重建卡片，保持原 ResizeObserver、摘要、选择状态与高度索引路径。位置缺失或不一致时**懒加载一次完整路径映射**，作为与旧版一致的安全回退。对未挂载但仍保留在 `renderedResults` 的异常行也沿用原路径回退语义。

未修改 P1 的 3 个 JS 模块、P2 的排序模块、任一 CSS 文件、UI/Picker/焦点/键盘/Swipe-Back、持久化结构、索引时间、NAS、插件 ID、工作台接口。146 JS 模块、635 条静态依赖边不变。

## 二、性能实测（隔离测试，不等于设备 FPS）

Node.js v22.16.0；调用 **真实编译源码**中的 `SearchResultRendererController.refreshChangedRows`；固定当前窗口 32 张结果卡、单文件路径更新；同机相同模拟数据，预热 5 次后采样 25 次，报告中位数。未包含实际 DOM 布局、真实 Obsidian 文件读写、NAS、UI 动画、WebKit 或设备耗电。

| 结果数量 | P1+P2 中位数 | P1+P2+P3 中位数 | 该方法计算提速 |
|---:|---:|---:|---:|
| 2,000 | 0.2018 ms | 0.0316 ms | 6.4 倍 |
| 10,000 | 1.2621 ms | 0.0318 ms | 39.7 倍 |
| 30,000 | 4.1342 ms | 0.0308 ms | 134.2 倍 |

30,000 行下，`refreshChangedRows` 纯 JS 中位耗时降低约 99.25%。全搜索、全结果排序与其他 UI 工作**没有测得相同比例收益**，不应将其宣传为整体提速。

**工作区布局通知 Chromium 验证**：桌面和移动模拟宿主连续同步分发 120 次 `scroll` 事件，均观察到首次立即通知 1 次、稳定后总通知 2 次；短暂再滚动到 scrollTop=124 后，`SearchView.onClose()` 捕获 124、释放 Navigator 保存定时器且关闭后不再触发新的请求。原代码与 `scroll` 一一对应调用，理论通知次数为 120 次；新的同组通知下降 98.3%。该验证只针对通知次数，不代表 Obsidian 最终磁盘写入次数（宿主还可能自己合并）。

## 三、工程与回归结果

| 检查 | 结果 |
|---|---|
| `npm run check` | PASS-ENGINEERING，146 模块、635 依赖、0 环、0 未解析标识符 |
| `npm run build` | PASS，单一 `dist/main.js` + 独立 `dist/styles.css` |
| `npm test` | **195/195 PASS**（父 P1+P2 的 182 项 + P3 新增 13 项） |
| P3 浏览器滚动关闭专项 | **2/2 PASS**（桌面 / 移动 Chromium 模拟宿主） |
| 索引重试 | **7/7 PASS** |
| Navigator | **76/76 PASS** |
| 移动侧边栏 | **96/96 PASS** |
| Picker 光标 | **36/36 PASS**（Chromium 模拟） |
| Portal | **48/48 PASS**（仅 Chromium 子集） |
| v5.2 冻结方法契约 | PASS（包含在 Node 195 项中） |
| 真实 iOS Obsidian/WebKit | **本轮未验证** |

注意：`npm run check` 中的 `cssByteExact=false` 只是与历史 modular.3 CSS 对比的存量标志；本轮 CSS 与 P1+P2 **字节完全一致**。原 Source 不附可验证的安装 manifest，不能据此宣称已验证插件 ID 或用户安装的 manifest。`PORTAL_AUDIT_ENGINES=chromium` 仅运行 Chromium，因为当前环境缺少可启动的 Playwright WebKit 浏览器；默认双引擎命令的 WebKit 分支不可用。不把上述模拟结论等同 iPhone 实机。

## 四、生命周期与正确性边界

- Navigator 的原生 scroll 事件继续立即清除移动触摸按压反馈；只合并布局持久化的**通知**，不会防抖/代理/修改原生滚动本身。
- 首个滚动事件即时请求工作区布局保存；连续滚动每 180ms 最多一次通知。浏览器窗口正常关闭时 `SearchView.onClose()` 仍直接捕获当前值，随后 `SearchCore.destroy()` 清理挂起定时器。异常进程终止时不能保证最后 180ms 内的布局保存已完成，和其它异步保存一样存在边界。
- 对于 `_commitResultIndexChanges` 已确认排序未变化的局部刷新，虚拟位置可信；如遇位置异常，退回旧式完整映射以保正确性，不强行假设完美 DOM。
- DOM 结果卡的 `ResizeObserver`、HeightIndex、窗口化策略、滚动锚点、异步摘要、点击、Swipe-Reveal 没有更改。
- P1 缓存序列化和 P2 增量排序的源码 SHA256 与上一候选逐字节一致；未写入或迁移任何用户资料。

## 五、回退与安装

只用测试覆盖包替换 `main.js` 和 `styles.css`，**保留用户实际的 `manifest.json`、`data.json`、所有仓库笔记、GLS 元数据和 NAS 同步配置**。不符合实际设备期望时恢复 P1+P2 覆盖包，或恢复正式 GLS v5.2 双文件。未经用户明确授权，P1/P2/P3 均属于候选，不得晋级正式冻结版。

独立源代码工程详见本候选 Source ZIP；必须只修改 `src/` 再构建，不在 `dist/main.js` 上累加补丁。证据包包含每组测试和对照测量原始记录。
