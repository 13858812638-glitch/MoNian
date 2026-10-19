# GLS Navigator · Browse Scope / Result Refinements v1

## 起点与边界

唯一修改起点：`GLS-普通属性通用索引-模块化Source.zip`（2026-10-18），其 `dist/main.js` / `dist/styles.css` 的 SHA-256 与同期单文件交付一致。只改 `src/`；不依赖工作台专用项目接口；不改 `data.json`、YAML、插件 ID、命令、ViewType、公开 API、手势及 CSS。

## 单一状态，两个投影

- **Browse Scope（浏览范围）**：依旧使用唯一 `core.filterState.folders`，不是新增永久状态。未选文件夹 = 全部可见文件；选某个文件夹 = 该目录树内文件；特意选仓库根目录 `/` = 仅根级文件。筛选池/其他显式多选仍可维护多个文件夹（OR）。
- **Navigation Projection（导航候选）**：`SearchCore._navigationCandidates()` 从已有文件索引单次扫描出 `all`（全库可见文件）与 `scope`（浏览范围文件）。不应用当前搜索词、标签/属性/文件类型/时间等临时精筛。文件夹树计数来自 `all`；标签/属性键值与数量来自 `scope`。
- **Result Projection（搜索结果）**：沿用 `FilterEngine.matches`、`QueryState` 和既有结果索引；搜索词、标签、属性键、文件类型与时间精筛继续参与 AND 组合。没有重建第二份索引。

## 交互合同

1. 普通点击文件夹：替换浏览位置，清除临时精筛和搜索词；再次点击同一文件夹恢复全库范围。无额外模式开关；不新增键盘 blur/focus。
2. 普通点击标签/属性值：在当前文件夹范围内替换同一维度的值；再次点击已选唯一值取消。不同属性键之间可交叉叠加。
3. 显式 Picker 多选：标签同维度 OR；同一属性键多值 OR；不同属性键 AND。文件夹多选 OR，但确认后清除旧临时精筛与查询。
4. 目录分组/属性键点击仅展开/收起；导航列表不因临时精筛或查询而隐藏其他候选，计数也不被联动压成 0。
5. Picker：常规标签、属性、附件类型只显示当前浏览范围候选；文件夹 Picker 显示完整目录并采用全库计数。筛选池编辑模式及维护模式保留全域语义，避免无意隐藏管理入口。
6. 当前条件保留所有实际生效值及清除操作；结果总数依旧实时反映全部条件交集。

## 关键模块

- `src/core/search/input-and-filters-methods.js`：`_navigationCandidates`、`_selectBrowseFolder`；结果卡同维度单选切换。
- `src/features/filters/filter-state.js`：共用的 `clearBrowseRefinements`，不修改 `FilterState` 存储/schema。
- `src/features/navigator/SearchNavigatorController.js`：目录数量独立于精筛；行点击切换/取消；文件夹跳转。
- `src/features/facets/{folder-picker,tag-picker,property-picker,picker-model,type-picker}-methods.js`：Picker 候选与计数归属于当前浏览范围。
- `src/ui/pickers/selection-mode.js`：显式多选语义与文件夹范围跳转。

## 回归与局限

- Node: `npm test`、`node --test tests/navigation-browse-scope.test.mjs`。
- Chromium: `python3 scripts/navigation_browse_audit.py`，验证目录、搜索、属性/标签 Picker、叠加、切换、计数；测试内无实际 Obsidian/iPhone。
- 辅助回归：`npm run test:mobile-sidebar`、`npm run test:focus`、`npm run test:picker-caret`、`PORTAL_AUDIT_ENGINES=chromium npm run test:picker-portal`、搜索条件专项。
- `npm run test:browser` 传统 A/B 像素比较可能因为早于本版的 Dialog44 宽度/位置和这次有意调整的导航语义产生差异，不能把旧版像素快照当作新语义的真值；需单独运行功能断言。真实 iOS WebKit、用户 CSS Snippets、NAS 压力和 Obsidian 原生宿主并未在容器中验证。

## 维持不变的冻结政策

- `NoKeyboardFollow`：移动侧边栏底部命令按钮不随输入法抬升。
- Picker Portal E：保留 iOS 原生光标已验证的 `display: contents` 机制，不做延迟聚焦/假光标。
- Dialog44：共享弹窗纵向位置 44%；9 个 Style Settings 默认值原样保留。
- 无内置「所属项目」「项目负责人」业务字段；仍为完全普通属性，工作台按其自选属性分组。
