# GLS v4 · 顶部仓库名与开合图标（候选）

本轮从 `GLS-Notebook渐隐分割线-v3-20261018` **完整模块化 Source** 继续。2026-10-18 用户冻结的「导航范围与精筛分离 v1」正式基线不被覆盖。

## 用户要求
- 左侧导航最上方「文件夹」分组标题显示当前 Obsidian 仓库名（`app.vault.getName()`），不增加“自定义仓库名”的第二套数据。
- 同组图标与 Notebook Navigator 的仓库根节点一致：展开 `open-vault`、折叠 `vault`。不改变左侧的 `chevron` 开合控件。
- 其余文件夹行、图标、颜色、计数、分割线、属性标签分组、排序筛选、移动底栏、Picker、CSS 与业务数据一律不修改。

## 实施范围
- 唯一业务源码：`src/features/navigator/SearchNavigatorController.js`。
- `_definitions()`：第一个分组仅改变可见 label 和默认 icon，内部组 key 仍为 `folder`。其余分组不变。
- `_section()`：缓存/重用的分组行只更新显示的仓库名以及对应可访问性文字；不重新挂载 DOM，也不改交互监听。
- 已存在的分组自定义图标仍按原 `NavigatorCustomization.decorate()` 优先，不覆盖用户设置。
- 样式文件与 v3 按字节完全一致；原 153 JS 模块中除上述模块外全部相同。

## 验证与边界
- 变更前的 4 项 Node 专项有 2 项失败（静态标题与图标）；修改后 4/4 通过。
- Chromium 真 DOM 专项：手机/桌面 × 深/浅共 48/48，检查标题、动态切换、已有 DOM 引用、组 ID 和标签属性不变。
- 全量 Node：119/119。导航 Chromium：76/76。移动侧边栏 Chromium：96/96。工程检查及构建通过。CSS 审计未发现新增重复 ID。
- 这些自动化测试不代表用户 iPhone WebKit/原生 Obsidian 已实机验收；这是可安装候选版本。

安装只需覆盖同一版本的聚合 `main.js` 和 `styles.css`，保留原插件的 `manifest.json`、`data.json`。本次 CSS 内容和 v3 完全一致，因此严格说仅替换 `main.js` 即可；同时提供完整 CSS 供双文件分包习惯使用。
