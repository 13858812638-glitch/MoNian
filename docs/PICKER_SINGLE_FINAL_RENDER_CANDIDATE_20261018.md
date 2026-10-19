> **当前唯一正式冻结基线（2026-10-18）：GLS v5.2「Picker 模式单次绘制 v1」。** 用户已明确确认将原开发候选提升为正式基线；本次仅更新冻结说明及 ZIP 顶层目录名，`src/`、`dist/`、`tests/`、`scripts/` 和所有运行代码字节未修改。之前关于“模块归一 v2 为正式版”“Picker v1 仍是候选”的说明均为历史状态，不能覆盖本冻结声明。之后只从此正式 Source 的 `src/` 派生新候选；历史 `baseline/` 不作为生产源码。详见 `docs/FORMAL_BASELINE_PICKER_SINGLE_RENDER_V1_20261018.md`。

---

# GLS v5.2「模块归一 v2」→ Picker 模式单次绘制 v1 候选版

**2026-10-18｜状态：开发测试候选，未冻结。** 唯一正式冻结基线仍是 `GLS v5.2「模块归一 v2」`。正式 Source ZIP SHA-256：`34609f69d6fe86398a5606bb17b7a5e9e70686c6388fdaabef948680037344f1`。本候选只允许在其 `src/` 上继续开发；没有修改正式冻结包。版本名属于开发标识，不改真实 `manifest.json`、插件 ID 或业务数据。

## 1. 已复现问题与最小修改

只针对标签、属性 Picker 的 **维护→多选、多选→排序、维护→排序、多选→维护** 等互斥模式切换。冻结版在一次同步点击中，旧模式回调先执行 `list.empty()`+完整列表重建，新模式回调再重复执行一次。用真实控制器和 Chromium DOM 包装计数，**在 6、300 文件下共复现 12 处重复绘制**。在冻结版运行“必须 ≤1 次”的新测试为 **12 FAIL**，候选版为 **0 FAIL**。

改动限于 5 个 JS 源文件：

- `ui/pickers/selection-mode.js`：在 `deactivateConflictingFacetPickerModes` 增加**可选的、仅限当前调用栈** `suppressIntermediateRender` 参数，仍按原顺序调用维护、多选、排序状态 Owner 的 `setActive`。`createFacetPickerSelectionMode` 仍克隆/丢弃 Draft、同步按钮、Footer 和 Header；只把“是否略过中途树列表绘制”通知业务回调。
- `ui/pickers/header-modes.js`：现有维护模式 `setActive` 将该标记传给同步 `onChange`，仍同步 `aria-pressed`、类名、搜索提示和模式标题，不引入额外状态。
- `ui/pickers/sort-mode.js`：现有共享排序模式只在调用方主动指定时抑制退出旧模式过程的**中途树绘制**；排序状态、Coordinator 启停、执行顺序、最终 `onEnter` 渲染不变。
- `features/facets/tag-picker-methods.js`、`property-picker-methods.js`：仅在已有维护/多选回调中根据标记跳过中途 `rerenderPickerListPreservingScroll`；`refreshSource`、统计缓存、Heading、Selected、Draft 与最终一次渲染照常执行。维护→多选和维护→排序等不会强行合并不同业务模式。

**未修改**文件夹 Picker、`SearchCore`、结果虚拟列表、索引、文件操作、真实排序提交、数据模型、CSS、设置项、Portal、Dialog、右滑、输入法和公开 API。没有新增 `setTimeout`、`requestAnimationFrame`、`MutationObserver`、监听器或全局状态管理器。已有组件仍负责其原本生命周期。

## 2. 300 文件 Chromium 模拟宿主：实测前后对照

| Picker / 同步点击 | 整树清空 P50 | 点击耗时 P50 (ms) | DOM Mutation 记录 P50 |
|---|---:|---:|---:|
| tag / selection | 2 → 1 | 18.55 → 13.85 | 1640 → 833 |
| tag / sort | 2 → 1 | 8.8 → 2.4 | 1638 → 831 |
| tag / maintenance | 1 → 1 | 15.3 → 14.05 | 934 → 934 |
| property / selection | 2 → 1 | 7.95 → 5.6 | 212 → 124 |
| property / sort | 2 → 1 | 4.55 → 2.7 | 200 → 112 |
| property / maintenance | 1 → 1 | 5.6 → 5.8 | 133 → 133 |
| folder / selection | 1 → 1 | 6.15 → 5.8 | 957 → 957 |
| folder / sort | 1 → 1 | 3.05 → 2.6 | 949 → 949 |
| folder / maintenance | 1 → 1 | 8.2 → 7.6 | 1045 → 1045 |

计时仅测 Chromium headless + 模拟 Obsidian 宿主里的**同步 JS 点击处理耗时**，每项 12 轮、前 2 轮预热、后 10 轮统计；不是 iPhone WebKit、真实 Obsidian 输入到绘制/触摸到响应的耗时，更不是完整 FPS。`P95` 仅 10 个热样本，不能由一次运行推出长期百分位稳定性。可证实的结构性收益是标签/属性目标转换 **2 次整树重建→1 次**；文件夹 Picker 结构性计数与 DOM 变动记录均不变。

## 3. 同行为回归 / 测试

- 新增 `scripts/picker_transition_single_render_audit.py`：基线红灯复现 12 项；候选 **6 文件 18/18、300 文件 18/18** 模式切换最多一次整树清空，最终 DOM/按钮/输入与筛选状态快照均与正式版一致。
- 新增 300 文件强制滚动锚点场景：**18/18** 次最终 UI 与 scrollTop 快照和正式版一致。滚动只是浏览器模拟，不等于 iPhone 原生滚动验收。
- `npm run check`：**PASS**，146 JS 模块、635 条静态依赖、0 循环、0 未解析符号；已更新源码差异 SHA-256 白名单，**不修改历史 baseline**。
- `npm run build`：**PASS**，构建单一 `main.js`；Node 134/134 PASS；索引失败恢复 7/7 PASS。
- 原有完整业务动作：模拟移动/桌面 Chromium **40/40**；Picker v1/v2 模式 A/B **4/4 配置、12 条交互轨迹**；Picker 光标 Chromium **36/36**；Portal **48/48 Chromium**；移动侧栏 **96/96**；导航与精筛 **76/76**；焦点修复 **96/96**；飞书焦点合同对照 PASS。
- 当前版搜索条件和 Picker 焦点验收：**144/144 B PASS**（桌面/移动、浅/深色各 36），0 浏览器断言错误。原 `npm run test:acceptance` 旧 A/B 全流程耗时太长，本次独立采用更明确的“当前版本 B”四配置断言；没有把旧版 A 状态作为产品新合同。

### 留存的历史测试债（并非本轮引入）

旧 `npm run test:browser` 以历史 A 文件夹 Picker 的“文件数 2”强制对照最新 B 的“文件数 6”，四配置均在 **04-folder-picker** A/B 快照差异退出；这在正式基线的上一轮审计里已记录。原因涉及导航候选不跟随当前文字与精筛缩减；需要单独建立产品语义测试，**禁止为了绿灯篡改业务计数，或假称整个旧 A/B 全绿**。本轮当前版 40/40 和 144/144 则独立通过。

### 未完成/没有验证的部分

- **iPhone 真机 Obsidian WebKit、原生输入法/光标绘制、硬件键盘、长期滚动**：未测；旧的 MD 穿透问题不能因本轮模拟回归通过而宣称修复。
- **真实大仓库基准、低端设备、长时间内存变化**：未测；上线前应先在用户手机上按已知回归路径测试。
- 未提供真实插件 `manifest.json`，所以只交付完整 JS/CSS **双文件覆盖包**，不伪造插件 ID，也不包含 `data.json`。

## 4. 安装、回退、后续冻结

备份现有主程序和 CSS，仅在测试仓库使用候选覆盖包的 `main.js`、`styles.css`；保留原有 `manifest.json`、`data.json`、真实仓库。若有异常，使用原 GLS v5.2「模块归一 v2」正式双文件**成对回退**。候选代码验收不自动升级正式基线，需你确认。

`reports/picker-single-final-render-20261018/` 记录可复现的 6/300 文件快照、模拟性能、测试日志；`docs/PICKER_SINGLE_FINAL_RENDER_CANDIDATE_20261018.patch` 提供运行源码差异。使用 `npm run check && npm run build && npm test`、`python3 scripts/picker_transition_single_render_audit.py --files 300 --output /tmp/candidate.json --expect-single` 等命令复现（须有 Chromium 和 Python Playwright）。

**运行构建 SHA-256：** `main.js` = `4fc91c8adfdc8a8defaa879df6c3a0a898615f49caa147d5f5dea5844401749f`；`styles.css` = `d82b51abc8e65e93c760dc88e33c813ca26b8a192b34cf9a7e8b4d417bfaf99b`。正式旧版 `main.js` SHA-256 `914f85fb88aedc94a3c2eb1911dbd0b9db98e897d7a74830a22755f59fb3e41e`。CSS 字节不变。
