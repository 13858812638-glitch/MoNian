> **2026-10-22 侧栏结果卡工作审计**：`beginBrowseCardReuse(renderer)` 是内部事务工厂，返回 `append/commit/finish/rollback`；`cardContentKey` 和 `reusable` 为内部校验 helper。`renderPage` 在新卡构建成功后才移动复用节点，异常沿用原完整页面回滚。每个 Renderer 最多保留 96 张普通浏览卡，`destroy` 释放。查询、Picker、批量/动作状态和其他宿主继续使用原卡片构建路径；无新增类原型方法。

> **2026-10-22 属性键展开与隐藏列表审计**：Navigator 内部 `navigatorPropertyValues` 复用统一属性语义模型，按需缓存全局属性值和当前目录计数；选择状态即时从 FilterState 读取。`_renderProjection` 让桌面 sidebar 属性键原地展开，稳定投影仅更新值计数和选择；隐藏标签/属性分组保留旧 generation，重开前更新。其他桌面宿主保留共享 Picker，移动端保持既有展开逻辑。无新增类原型方法。

> **2026-10-22 侧栏结果筛选条审计**：仅 `filter-channels-methods.js` 增加内部 `setFilterRailAttribute` / `setFilterRailProperty`，在桌面 sidebar 抑制不变的显示写入；标签意图仅附着于对应 DOM 节点，生命周期随该节点释放。`_syncFilterPoolButton` 更新可见文本节点并保留 Hover Hint 拥有的无障碍标签。分组、快捷按钮、筛选条显隐仍由原方法负责，无新增原型方法或数据状态。

> **2026-10-22 侧栏冗余动作审计**：Navigator 内部 `navigatorSectionProjection` 统一结构预检和实际渲染签名。`_renderProjection` 仅在桌面侧栏的列表结构不变时省略逐行位置测量及滚动恢复；结构变化和显式恢复仍走原锚点路径。`_cached` 按当前文件夹集合复用导航候选/标签计数/属性存在计数，只保留一个范围；索引、文件事件、偏好更新及销毁统一失效。无新增类原型方法。

> **2026-10-22 桌面侧栏固定筛选列表**：无新增类原型方法。Navigator 内部 `syncNavigatorRowValues` 仅更新计数/选择，`navigatorPropertyPresence` 在当前目录范围一次扫描统计属性存在性。`_cached` 的全局标签树/属性键派生缓存随索引、文件事件、偏好更新失效并在销毁时清空；`_renderProjection` 在结构不变时直接更新已有行，保留原折叠、维护及共享 Picker 路径。移动端与其他宿主仍按目录生成列表。

> 2026-10-22 桌面侧栏鼠标候选：`SearchView.onOpen` 仅为 Tab 或移动 sidebar 注册整面板 SwipeBack；桌面 sidebar 取消该注册，子 Picker 继续独立管理返回层。公开原型、移动端与 Tab 的导航逻辑不变。

> 2026-10-22 侧栏图标与点击候选：内部函数 `setNavigatorIcon` 归属 `features/navigator/navigation-icon.js`，由 Navigator 与其 customization 复用，替换 SVG 并保留辅助标签；`SearchResultRendererController._windowSize` 仍是窗口预算唯一 Owner，仅桌面 sidebar 使用半屏双侧缓冲。无新增公开方法。

> **2026-10-22 移动文件夹 Picker 光标归一**：无新增类方法。`LocalSearchOverlayHost.createCloseButton` 为独立文件夹 Picker 挂载同级背景点击层，复用既有打开顺序；移动端不把焦点转移到 Picker 外壳。`open` 的背景关闭处理接受该同级层。iOS 绘制规则与现有 Popup Portal 共用 `display: contents`。

> **2026-10-21 交付边界审计**：未新增类原型方法。桌面命令栏显隐由 `_syncMobileTools` 单独负责，`_placeMobileTools` 只调整停靠位置。`createDesktopNavigatorPane` 的 `sync` 在宿主几何变化时取消旧拖动；`finish` 在结束后同步实际宽度和无障碍读数。

> **2026-10-21 整体侧栏刷新优化**：未新增类原型方法。Navigator 模块内部 `setNavigatorAttribute` / `setNavigatorProperty` 只对桌面 sidebar 抑制重复显示写入，动态状态检查实时 DOM；文本标签沿用现有 Hover Hint 的无障碍名称 Owner。`_renderProjection` 复用未变化的分组装饰并更新独立计数文本节点。Dropdown `_mountPanel` 的侧栏滚动订阅只响应当前/父级锚点及宿主祖先；`bindSidebarDialogPosition` 只跟随宿主移动。

> **2026-10-21 侧栏弹窗与命令栏**：未新增类原型方法。Navigator 原命令栏方法识别 `desktopSidebar` 并复用筛选导航配置；`navigatorToolbarIcon` 沿用该配置。`createDialogSession` 管理 `bindSidebarDialogPosition` 的定位与清理。Dropdown 的 `_applyFrameLock` 对侧栏子窗约束尺寸，`_mountPanel` 增加侧栏滚动/尺寸订阅，`reposition` 在侧栏收起时隐藏其浮层。宿主边界由新增内部函数 `resolveSidebarPopupBounds` 统一判断。

> **桌面搜索条右置补充**：`SearchNavigatorController.constructor` 在初始化时将既有 `.local-search-input-wrap`（含搜索动作按钮）放到结果标题前方；原导航标题仍留在左侧。移动端及缩放过程不重建搜索控件。

> **2026-10-19 桌面侧栏候选更新**：无新增类原型方法。`SearchNavigatorController` 构造器/`destroy` 管理目录缓存失效订阅与桌面分栏的生命周期；`capture`/`restore` 使用现有会话的可选 `navigator.paneWidth`；`resize` 同步分栏；`_section` 在桌面投影有效时直接切换分组显隐；`_cached`/`_renderProjection` 复用物理目录计数和行。`SearchResultRendererController._isOverscrolling` 保留原边界语义，在列表原点提前返回，避免读取布局高度。内部工厂 `src/features/navigator/desktop-pane.js#createDesktopNavigatorPane` 返回 `sync`/`restore`/`destroy`，事件回调、rAF 与指针捕获由此工厂创建和释放。

> **注意**：本文件含原始冻结源码的方法来源行号，只作历史溯源。当前有效的 JS 路径、导出和类装配以 `docs/MODULE_INDEX.md`、`src/` 为准。

本轮 picker-ios-portal.1：移除临时 registerPickerCaretVisualProbe 与 onload 注册；未新增或移动类方法。当前生产维护源为 152 个 JS 模块、639 条静态依赖，浮窗宿主已退役。生产新增仅为 iOS Picker Portal 的 CSS 绘制盒条件。

# 类方法索引与实例调用

保留现有搜索业务类与 SearchModalHost；SearchFloatingHost 为本轮明确退役的独立宿主。直接 this 调用是语法扫描结果；通过 this.owner / this.plugin 的跨实例链仍须读取对应构造器和依赖模块。

## SparseHeightIndex

### `constructor()`

归属：`src/features/results/SparseHeightIndex.js`；原始行 L78；种类 constructor；static=False。

调用：`reset`。

实例依赖：`reset`。

### `reset(size, estimate = RESULT_ROW_HEIGHT_ESTIMATE)`

归属：`src/features/results/SparseHeightIndex.js`；原始行 L82；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`estimate`, `measured`, `size`, `tree`。

### `_add(index, delta)`

归属：`src/features/results/SparseHeightIndex.js`；原始行 L89；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`size`, `tree`。

### `set(index, height)`

归属：`src/features/results/SparseHeightIndex.js`；原始行 L95；种类 method；static=False。

调用：`_add`。

实例依赖：`_add`, `estimate`, `measured`, `size`。

### `rebaseEstimate(estimate)`

归属：`src/features/results/SparseHeightIndex.js`；原始行 L107；种类 method；static=False。

调用：`_add`。

实例依赖：`_add`, `estimate`, `measured`, `size`, `tree`。

### `_deltaPrefix(count)`

归属：`src/features/results/SparseHeightIndex.js`；原始行 L118；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`size`, `tree`。

### `prefix(count)`

归属：`src/features/results/SparseHeightIndex.js`；原始行 L126；种类 method；static=False。

调用：`_deltaPrefix`。

实例依赖：`_deltaPrefix`, `estimate`, `size`。

### `total()`

归属：`src/features/results/SparseHeightIndex.js`；原始行 L131；种类 method；static=False。

调用：`prefix`。

实例依赖：`prefix`, `size`。

### `positionAt(offset)`

归属：`src/features/results/SparseHeightIndex.js`；原始行 L135；种类 method；static=False。

调用：`total`。

实例依赖：`estimate`, `size`, `total`, `tree`。

## IoPool

### `constructor(limit)`

归属：`src/services/IoPool.js`；原始行 L1694；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`limit`, `queue`, `running`。

### `run(fn)`

归属：`src/services/IoPool.js`；原始行 L1702；种类 method；static=False。

调用：`next`。

实例依赖：`limit`, `next`, `queue`, `running`。

### `next()`

归属：`src/services/IoPool.js`；原始行 L1719；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`limit`, `queue`, `running`。

### `async forEach(items, fn, shouldContinue)`

归属：`src/services/IoPool.js`；原始行 L1725；种类 method；static=False。

调用：`run`。

实例依赖：`run`。

## BodyIndex

### `constructor(maxLength = 8000)`

归属：`src/data/index/BodyIndex.js`；原始行 L1736；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`documents`, `maxLength`。

### `clear()`

归属：`src/data/index/BodyIndex.js`；原始行 L1737；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`documents`。

### `addFile(meta, content = "", readableText = null)`

归属：`src/data/index/BodyIndex.js`；原始行 L1738；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`documents`, `maxLength`。

### `removeFile(path)`

归属：`src/data/index/BodyIndex.js`；原始行 L1751；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`documents`。

### `moveFile(oldPath, newPath)`

归属：`src/data/index/BodyIndex.js`；原始行 L1752；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`documents`。

### `get(path)`

归属：`src/data/index/BodyIndex.js`；原始行 L1758；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`documents`。

### `serialize()`

归属：`src/data/index/BodyIndex.js`；原始行 L1759；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`documents`。

### `deserialize(data)`

归属：`src/data/index/BodyIndex.js`；原始行 L1760；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`documents`。

## QueryState

### `constructor(raw = "")`

归属：`src/features/search/QueryState.js`；原始行 L1767；种类 constructor；static=False。

调用：`set`。

实例依赖：`set`。

### `set(raw)`

归属：`src/features/search/QueryState.js`；原始行 L1768；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`intent`, `normalized`, `raw`, `units`。

### `get active()`

归属：`src/features/search/QueryState.js`；原始行 L1775；种类 get；static=False。

调用：无直接 this.method 调用。

实例依赖：`units`。

## FilterState

### `constructor()`

归属：`src/features/filters/filter-state.js`；原始行 L1857；种类 constructor；static=False。

调用：`clear`。

实例依赖：`clear`。

### `clear()`

归属：`src/features/filters/filter-state.js`；原始行 L1859；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`dateRange`, `fileTypes`, `folders`, `properties`, `propertyMatchMode`, `tagMatchMode`, `tags`。

### `get fileType()`

归属：`src/features/filters/filter-state.js`；原始行 L1871；种类 get；static=False。

调用：无直接 this.method 调用。

实例依赖：`fileTypes`。

### `set fileType(value)`

归属：`src/features/filters/filter-state.js`；原始行 L1875；种类 set；static=False。

调用：无直接 this.method 调用。

实例依赖：`fileTypes`。

### `get folder()`

归属：`src/features/filters/filter-state.js`；原始行 L1883；种类 get；static=False。

调用：无直接 this.method 调用。

实例依赖：`folders`。

### `set folder(value)`

归属：`src/features/filters/filter-state.js`；原始行 L1889；种类 set；static=False。

调用：无直接 this.method 调用。

实例依赖：`folders`。

### `get active()`

归属：`src/features/filters/filter-state.js`；原始行 L1895；种类 get；static=False。

调用：无直接 this.method 调用。

实例依赖：`dateRange`, `fileTypes`, `folders`, `properties`, `tags`。

### `clone()`

归属：`src/features/filters/filter-state.js`；原始行 L1903；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`dateRange`, `fileTypes`, `folders`, `properties`, `propertyMatchMode`, `tagMatchMode`, `tags`。

### `toSnapshot()`

归属：`src/features/filters/filter-state.js`；原始行 L1922；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`dateRange`, `fileType`, `fileTypes`, `folders`, `properties`, `propertyMatchMode`, `tagMatchMode`, `tags`。

### `static normalizeSnapshot(value)`

归属：`src/features/filters/filter-state.js`；原始行 L1936；种类 method；static=True。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `static fromSnapshot(value)`

归属：`src/features/filters/filter-state.js`；原始行 L2010；种类 method；static=True。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

## PointerSortCoordinator

### `constructor({
        list,
        scrollContainer = null,
        rowSelector = ".local-search-move-tree-row[data-sort-key]",
        hierarchical = false,
        getMeta = row => ({
            key: row?.dataset?.sortKey || "",
            depth: Number(row?.dataset?.sortDepth || 0),
            parentKey: row?.dataset?.sortParent || "",
            promoteParentKey: row?.dataset?.sortPromoteParent || "",
            name: row?.dataset?.sortName || row?.dataset?.sortKey || ""
        }),
        canStart = () => true,
        canNest = () => false,
        onCommit = null,
        onSettled = null
    } = {})`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3517；种类 constructor；static=False。

调用：`_onPointerDown`, `cancel`。

实例依赖：`_blur`, `_cancel`, `_clickCapture`, `_committing`, `_feedback`, `_finish`, `_lastPointer`, `_move`, `_onPointerDown`, `_pointerDown`, `_raf`, `_suppressClickUntil`, `canNest`, `canStart`, `cancel`, `enabled`, `getMeta`, `hierarchical`, `list`, `onCommit`, `onSettled`, `rowSelector`, `scrollContainer`, `session`。

### `setEnabled(enabled)`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3566；种类 method；static=False。

调用：`cancel`。

实例依赖：`_suppressClickUntil`, `cancel`, `enabled`, `list`。

### `_rows()`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3578；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`list`, `rowSelector`。

### `_onPointerDown(event)`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3584；种类 method；static=False。

调用：`_finishSession`, `_onPointerMove`, `_updateDrop`, `canStart`, `getMeta`。

实例依赖：`_blur`, `_cancel`, `_committing`, `_finish`, `_finishSession`, `_lastPointer`, `_move`, `_onPointerMove`, `_updateDrop`, `canStart`, `enabled`, `getMeta`, `list`, `rowSelector`, `session`。

### `_onPointerMove(event)`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3627；种类 method；static=False。

调用：`_ensureAutoScroll`, `_updateDrop`。

实例依赖：`_ensureAutoScroll`, `_lastPointer`, `_updateDrop`, `session`。

### `_rowAtY(clientY, rows = this._rows())`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3639；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_sameLevelRows(meta)`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3646；种类 method；static=False。

调用：`_rows`, `getMeta`。

实例依赖：`_rows`, `getMeta`, `session`。

### `_clearTargetVisual()`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3655；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`list`, `session`。

### `_showFeedback(clientY, label, y = null, target = null)`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3661；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_feedback`, `list`, `scrollContainer`, `session`。

### `_updateDrop(clientX, clientY)`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3667；种类 method；static=False。

调用：`_clearTargetVisual`, `_rowAtY`, `_rows`, `_sameLevelRows`, `_showFeedback`, `canNest`, `getMeta`。

实例依赖：`_clearTargetVisual`, `_rowAtY`, `_rows`, `_sameLevelRows`, `_showFeedback`, `canNest`, `getMeta`, `hierarchical`, `list`, `session`。

### `_ensureAutoScroll()`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3729；种类 method；static=False。

调用：`_updateDrop`。

实例依赖：`_lastPointer`, `_raf`, `_updateDrop`, `list`, `scrollContainer`, `session`。

### `async _finishSession(event, cancelled)`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3757；种类 method；static=False。

调用：`_clearTargetVisual`, `onCommit`, `onSettled`。

实例依赖：`_blur`, `_cancel`, `_clearTargetVisual`, `_committing`, `_feedback`, `_finish`, `_lastPointer`, `_move`, `_raf`, `_suppressClickUntil`, `list`, `onCommit`, `onSettled`, `session`。

### `cancel()`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3806；种类 method；static=False。

调用：`_clearTargetVisual`, `_finishSession`。

实例依赖：`_clearTargetVisual`, `_feedback`, `_finishSession`, `_raf`, `list`, `session`。

### `destroy()`

归属：`src/interactions/PointerSortCoordinator.js`；原始行 L3817；种类 method；static=False。

调用：`cancel`。

实例依赖：`_cancel`, `_clickCapture`, `_finish`, `_move`, `_pointerDown`, `cancel`, `list`, `onCommit`, `onSettled`, `scrollContainer`。

## FilterEngine

### `static matchesDateRange(meta, value)`

归属：`src/features/filters/FilterEngine.js`；原始行 L4922；种类 method；static=True。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `static matchesTags(meta, selectedTags, matchMode = "all")`

归属：`src/features/filters/FilterEngine.js`；原始行 L4934；种类 method；static=True。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `static matches(meta, filter)`

归属：`src/features/filters/FilterEngine.js`；原始行 L4953；种类 method；static=True。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

## ResultRanker

### `static rank(meta, query)`

归属：`src/features/search/ResultRanker.js`；原始行 L4998；种类 method；static=True。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

## BatchMetadataService

### `constructor(app, plugin)`

归属：`src/services/BatchMetadataService.js`；原始行 L5062；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`, `plugin`。

### `metadataFiles(paths = this.app.vault.getFiles().map(file => file.path))`

归属：`src/services/BatchMetadataService.js`；原始行 L5065；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`, `plugin`。

### `_normalizeTagList(values)`

归属：`src/services/BatchMetadataService.js`；原始行 L5072；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_frontmatterTagList(rawValue)`

归属：`src/services/BatchMetadataService.js`；原始行 L5076；种类 method；static=False。

调用：`_normalizeTagList`。

实例依赖：`_normalizeTagList`。

### `summarize(paths)`

归属：`src/services/BatchMetadataService.js`；原始行 L5089；种类 method；static=False。

调用：`_frontmatterTagList`, `metadataFiles`。

实例依赖：`_frontmatterTagList`, `metadataFiles`, `plugin`。

### `_mutateFiles(paths, operation)`

归属：`src/services/BatchMetadataService.js`；原始行 L5187；种类 method；static=False。

调用：`_applyMutation`, `metadataFiles`。

实例依赖：`_applyMutation`, `metadataFiles`, `plugin`。

### `async _editFrontmatter(file, transform)`

归属：`src/services/BatchMetadataService.js`；原始行 L5200；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`plugin`。

### `async _applyMutation(files, operation)`

归属：`src/services/BatchMetadataService.js`；原始行 L5221；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`plugin`。

### `transformValue(paths, key, transform)`

归属：`src/services/BatchMetadataService.js`；原始行 L5247；种类 method；static=False。

调用：`_editFrontmatter`, `_mutateFiles`。

实例依赖：`_editFrontmatter`, `_mutateFiles`。

### `applyMetadataDraft(paths, {
        addTags = [],
        removeTags = [],
        properties = []
    } = {})`

归属：`src/services/BatchMetadataService.js`；原始行 L5265；种类 method；static=False。

调用：`_editFrontmatter`, `_frontmatterTagList`, `_mutateFiles`, `_normalizeTagList`。

实例依赖：`_editFrontmatter`, `_frontmatterTagList`, `_mutateFiles`, `_normalizeTagList`。

### `migrateValue(paths, key, normalizedOldValue, newValue, propertyType = "text")`

归属：`src/services/BatchMetadataService.js`；原始行 L5395；种类 method；static=False。

调用：`transformValue`。

实例依赖：`transformValue`。

### `renameKey(paths, oldKey, newKey, completed = null)`

归属：`src/services/BatchMetadataService.js`；原始行 L5406；种类 method；static=False。

调用：`_editFrontmatter`, `_mutateFiles`。

实例依赖：`_editFrontmatter`, `_mutateFiles`。

## SharedSwipeBackPrimitive

### `constructor(owner, isEnabled, isMobileApp)`

归属：`src/interactions/swipe-back.js`；原始行 L6638；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`disposed`, `isEnabled`, `isMobileApp`, `owner`, `releases`。

### `register(surface, navigation, hitRoots = [])`

归属：`src/interactions/swipe-back.js`；原始行 L6645；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`disposed`, `isEnabled`, `isMobileApp`, `owner`, `releases`。

### `dispose()`

归属：`src/interactions/swipe-back.js`；原始行 L6659；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`disposed`, `releases`。

## LocalSearchSwipeBackPrimitive extends SharedSwipeBackPrimitive

### `constructor(isEnabled = () => true)`

归属：`src/interactions/swipe-back.js`；原始行 L6667；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

## SearchDropdownController

### `constructor(owner)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6744；种类 constructor；static=False。

调用：`_handleClickGuard`, `_handleContextMenu`, `_handleOutside`, `_queueReposition`, `handleEscape`。

实例依赖：`_backHandler`, `_clickGuardHandler`, `_contextHandler`, `_frameLock`, `_handleClickGuard`, `_handleContextMenu`, `_handleOutside`, `_keyHandler`, `_listenersCleanup`, `_outsideHandler`, `_panelStack`, `_positionFrame`, `_positionHandler`, `_queueReposition`, `_refreshHandlers`, `_resizeObserver`, `anchor`, `anchorWasCurrent`, `handleEscape`, `owner`, `panel`, `suppressClickUntil`。

### `get isOpen()`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6766；种类 get；static=False。

调用：无直接 this.method 调用。

实例依赖：`panel`。

### `get busy()`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6770；种类 get；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`, `panel`。

### `submissionFor(panel)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6774；种类 method；static=False。

调用：`close`, `isActivePanel`。

实例依赖：`close`, `isActivePanel`, `owner`。

### `isOpenFor(anchor)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6786；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_panelStack`, `anchor`, `panel`。

### `isActivePanel(panel)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6793；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`panel`。

### `setRefreshHandler(panel, handler)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6797；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_refreshHandlers`。

### `refresh(change = null)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6802；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_refreshHandlers`。

### `closeIfSameAnchor(anchor)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6808；种类 method；static=False。

调用：`close`。

实例依赖：`anchor`, `close`, `panel`。

### `_disposePanelFrame(panel, anchor, anchorWasCurrent)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6814；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `close(restoreFocus = true, { returnToParent = true, force = false } = {})`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6823；种类 method；static=False。

调用：`_disposePanelFrame`, `_listenersCleanup`, `_positionHandler`。

实例依赖：`_backHandler`, `_disposePanelFrame`, `_frameLock`, `_listenersCleanup`, `_panelStack`, `_positionHandler`, `_resizeObserver`, `anchor`, `anchorWasCurrent`, `busy`, `owner`, `panel`, `suppressClickUntil`。

### `destroy()`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6916；种类 method；static=False。

调用：`close`。

实例依赖：`_panelStack`, `close`, `owner`。

### `_cssMetric(name, fallback)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6922；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_captureFrame(panel)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6933；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_applyFrameLock(panel, frame)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6947；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_sizeContract(panel)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L6963；种类 method；static=False。

调用：`_cssMetric`。

实例依赖：`_cssMetric`。

### `_queueReposition()`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7018；种类 method；static=False。

调用：`reposition`。

实例依赖：`_positionFrame`, `panel`, `reposition`。

### `_revealPanel(panel)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7027；种类 method；static=False。

调用：`isActivePanel`。

实例依赖：`isActivePanel`。

### `reposition()`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7042；种类 method；static=False。

调用：`_applyFrameLock`, `_cssMetric`, `_revealPanel`, `_sizeContract`。

实例依赖：`_applyFrameLock`, `_cssMetric`, `_frameLock`, `_revealPanel`, `_sizeContract`, `anchor`, `owner`, `panel`。

### `invalidateFrame()`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7127；种类 method；static=False。

调用：`_queueReposition`。

实例依赖：`_frameLock`, `_panelStack`, `_queueReposition`。

### `setBackHandler(panel, handler)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7133；种类 method；static=False。

调用：`isActivePanel`。

实例依赖：`_backHandler`, `isActivePanel`。

### `_navigateBack(panel)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7138；种类 method；static=False。

调用：`_backHandler`, `close`, `isActivePanel`。

实例依赖：`_backHandler`, `busy`, `close`, `isActivePanel`。

### `_bindSwipeBack(panel)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7147；种类 method；static=False。

调用：`_navigateBack`, `isActivePanel`。

实例依赖：`_navigateBack`, `isActivePanel`, `owner`。

### `_mountPanel(anchor, title, { bindGlobalListeners = true, frameLock = null, keyboardOpened = null } = {})`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7155；种类 method；static=False。

调用：`_bindSwipeBack`, `_navigateBack`, `_positionHandler`, `invalidateFrame`。

实例依赖：`_bindSwipeBack`, `_clickGuardHandler`, `_contextHandler`, `_frameLock`, `_keyHandler`, `_listenersCleanup`, `_navigateBack`, `_outsideHandler`, `_positionFrame`, `_positionHandler`, `_resizeObserver`, `anchor`, `anchorWasCurrent`, `busy`, `invalidateFrame`, `owner`, `panel`。

### `open(anchor, title)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7238；种类 method；static=False。

调用：`_mountPanel`, `close`。

实例依赖：`_frameLock`, `_mountPanel`, `busy`, `close`, `owner`。

### `openChild(anchor, title)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7250；种类 method；static=False。

调用：`_captureFrame`, `_isEditableTarget`, `_mountPanel`, `open`。

实例依赖：`_backHandler`, `_captureFrame`, `_frameLock`, `_isEditableTarget`, `_mountPanel`, `_panelStack`, `_resizeObserver`, `anchor`, `anchorWasCurrent`, `busy`, `open`, `owner`, `panel`, `suppressClickUntil`。

### `_handleOutside(event)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7297；种类 method；static=False。

调用：`close`。

实例依赖：`anchor`, `busy`, `close`, `owner`, `panel`。

### `_handleContextMenu(event)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7341；种类 method；static=False。

调用：`_isEditableTarget`, `close`。

实例依赖：`_isEditableTarget`, `close`, `panel`, `suppressClickUntil`。

### `_handleClickGuard(event)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7357；种类 method；static=False。

调用：`_isEditableTarget`。

实例依赖：`_isEditableTarget`, `busy`, `suppressClickUntil`。

### `_isEditableTarget(target)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7366；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`panel`。

### `handleEscape(event)`

归属：`src/ui/overlays/SearchDropdownController.js`；原始行 L7372；种类 method；static=False。

调用：`_navigateBack`。

实例依赖：`_navigateBack`, `owner`, `panel`。

## BatchMetadataController

### `constructor(owner)`

归属：`src/features/batch/BatchMetadataController.js`；原始行 L7405；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`, `owner`, `plugin`。

### `get _destroyed()`

归属：`src/features/batch/BatchMetadataController.js`；原始行 L7411；种类 get；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `destroy()`

归属：`src/features/batch/BatchMetadataController.js`；原始行 L7415；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `editablePaths(paths = this.owner?.selection?.selectedPaths || [])`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7419；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`plugin`。

### `_summary(session, { refresh = false } = {})`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7427；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`plugin`。

### `_metadataUniverse(session, { refresh = false } = {})`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7437；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`plugin`。

### `_invalidateMetadata(session)`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7446；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_batchExistingTags(candidates)`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7452；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_batchExistingPropertyCatalog(candidates)`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7461；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`plugin`。

### `_propertyExistsInVault(key)`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7510；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`plugin`。

### `async _syncCreatedPropertyTypes(propertyTypes, stats)`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7519；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`。

### `_isActive(session)`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7546；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_destroyed`, `owner`。

### `_finishMutation(session, stats, action)`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7552；种类 method；static=False。

调用：`_invalidateMetadata`, `_isActive`。

实例依赖：`_invalidateMetadata`, `_isActive`, `owner`。

### `async _runMutation(session, { action, errorText, operation })`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7582；种类 method；static=False。

调用：`_finishMutation`, `_isActive`。

实例依赖：`_finishMutation`, `_isActive`, `owner`。

### `_createDraftFooter(panel, { getChangeCount, onConfirm })`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7602；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_activateBatchPickerSearch(session, search, renderList, renderAll)`

归属：`src/features/batch/mutation-flow-methods.js`；原始行 L7630；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_renderTagPicker(session)`

归属：`src/features/batch/tag-editor-methods.js`；原始行 L7637；种类 method；static=False。

调用：`_activateBatchPickerSearch`, `_batchExistingTags`, `_createDraftFooter`, `_metadataUniverse`, `_runMutation`, `_summary`。

实例依赖：`_activateBatchPickerSearch`, `_batchExistingTags`, `_createDraftFooter`, `_metadataUniverse`, `_runMutation`, `_summary`, `plugin`。

### `_renderPropertyPicker(session)`

归属：`src/features/batch/property-editor-methods.js`；原始行 L7873；种类 method；static=False。

调用：`_activateBatchPickerSearch`, `_batchExistingPropertyCatalog`, `_createDraftFooter`, `_metadataUniverse`, `_propertyExistsInVault`, `_runMutation`, `_summary`, `_syncCreatedPropertyTypes`。

实例依赖：`_activateBatchPickerSearch`, `_batchExistingPropertyCatalog`, `_createDraftFooter`, `_metadataUniverse`, `_propertyExistsInVault`, `_runMutation`, `_summary`, `_syncCreatedPropertyTypes`, `owner`, `plugin`。

### `open(anchor, { initialAction = "tag", paths = null, propertyKey = "", propertyTarget = null, metadataTarget = null, asChild = false } = {})`

归属：`src/features/batch/property-editor-methods.js`；原始行 L8595；种类 method；static=False。

调用：`_renderPropertyPicker`, `_renderTagPicker`, `editablePaths`。

实例依赖：`_renderPropertyPicker`, `_renderTagPicker`, `editablePaths`, `owner`。

## SearchFacetController

### `constructor(owner)`

归属：`src/features/facets/SearchFacetController.js`；原始行 L8646；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `destroy()`

归属：`src/features/facets/SearchFacetController.js`；原始行 L8650；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `sidebarMaintenanceModes(kind)`

归属：`src/features/facets/sidebar-maintenance-methods.js`；原始行 L8654；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `canSidebarMaintenance(kind, mode, descriptor = {})`

归属：`src/features/facets/sidebar-maintenance-methods.js`；原始行 L8681；种类 method；static=False。

调用：`sidebarMaintenanceModes`。

实例依赖：`owner`, `sidebarMaintenanceModes`。

### `sidebarMaintenancePresentation(kind, mode, descriptor = {})`

归属：`src/features/facets/sidebar-maintenance-methods.js`；原始行 L8691；种类 method；static=False。

调用：`sidebarMaintenanceModes`。

实例依赖：`owner`, `sidebarMaintenanceModes`。

### `runSidebarMaintenance(kind, mode, descriptor = {}, anchor = null, { onChange = null } = {})`

归属：`src/features/facets/sidebar-maintenance-methods.js`；原始行 L8721；种类 method；static=False。

调用：`_openFolderColorEditor`, `canSidebarMaintenance`。

实例依赖：`_openFolderColorEditor`, `canSidebarMaintenance`, `owner`。

### `_syncHeaderCount(header, countProvider)`

归属：`src/features/facets/picker-model-methods.js`；原始行 L8838；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_expandTreeAncestors(expanded, path, separator = "/")`

归属：`src/features/facets/picker-model-methods.js`；原始行 L8848；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_propertyValues(key, candidates = null)`

归属：`src/features/facets/picker-model-methods.js`；原始行 L8857；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_buildPropertyTreeModel(query = "", keys = null, valueProvider = null)`

归属：`src/features/facets/picker-model-methods.js`；原始行 L8873；种类 method；static=False。

调用：`_propertyValues`。

实例依赖：`_propertyValues`, `owner`。

### `openTimePicker(anchor = this.owner?.sorting?.pickerBtn)`

归属：`src/features/facets/tag-picker-methods.js`；原始行 L8898；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `openTagPicker(options = {})`

归属：`src/features/facets/tag-picker-methods.js`；原始行 L8903；种类 method；static=False。

调用：`_expandTreeAncestors`, `_syncHeaderCount`, `runSidebarMaintenance`, `sidebarMaintenanceModes`。

实例依赖：`_expandTreeAncestors`, `_syncHeaderCount`, `owner`, `runSidebarMaintenance`, `sidebarMaintenanceModes`。

### `openPropertyPicker(initialKey = "", anchor, options = {})`

归属：`src/features/facets/property-picker-methods.js`；原始行 L9452；种类 method；static=False。

调用：`_buildPropertyTreeModel`, `_syncHeaderCount`, `canSidebarMaintenance`, `runSidebarMaintenance`, `sidebarMaintenanceModes`。

实例依赖：`_buildPropertyTreeModel`, `_syncHeaderCount`, `canSidebarMaintenance`, `owner`, `runSidebarMaintenance`, `sidebarMaintenanceModes`。

### `renderPinnedPropertyFilters()`

归属：`src/features/facets/property-picker-methods.js`；原始行 L10354；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `openAttachmentTypePicker(anchor = null)`

归属：`src/features/facets/type-picker-methods.js`；原始行 L10515；种类 method；static=False。

调用：`_syncHeaderCount`。

实例依赖：`_syncHeaderCount`, `owner`。

### `buildTypeActions(parentEl)`

归属：`src/features/facets/type-picker-methods.js`；原始行 L10733；种类 method；static=False。

调用：`openAttachmentTypePicker`, `syncTypeButtons`。

实例依赖：`openAttachmentTypePicker`, `owner`, `syncTypeButtons`。

### `syncTypeButtons()`

归属：`src/features/facets/type-picker-methods.js`；原始行 L10781；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `syncFilterButtons()`

归属：`src/features/facets/type-picker-methods.js`；原始行 L10798；种类 method；static=False。

调用：`renderPinnedPropertyFilters`, `syncTypeButtons`, `updateFolderButton`。

实例依赖：`owner`, `renderPinnedPropertyFilters`, `syncTypeButtons`, `updateFolderButton`。

### `_resultFolderDefaultColor(theme)`

归属：`src/features/facets/folder-colors-methods.js`；原始行 L10814；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_resultFolderColorMap()`

归属：`src/features/facets/folder-colors-methods.js`；原始行 L10830；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_refreshResultFolderColorViews()`

归属：`src/features/facets/folder-colors-methods.js`；原始行 L10836；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_applyResultFolderPickerColor(row, path)`

归属：`src/features/facets/folder-colors-methods.js`；原始行 L10840；种类 method；static=False。

调用：`_resultFolderColorMap`。

实例依赖：`_resultFolderColorMap`。

### `async _setResultFolderThemeColor(path, theme, value)`

归属：`src/features/facets/folder-colors-methods.js`；原始行 L10861；种类 method；static=False。

调用：`_refreshResultFolderColorViews`, `_resultFolderColorMap`。

实例依赖：`_refreshResultFolderColorViews`, `_resultFolderColorMap`, `owner`。

### `async _resetResultFolderColors(path)`

归属：`src/features/facets/folder-colors-methods.js`；原始行 L10884；种类 method；static=False。

调用：`_refreshResultFolderColorViews`, `_resultFolderColorMap`。

实例依赖：`_refreshResultFolderColorViews`, `_resultFolderColorMap`, `owner`。

### `_openFolderColorEditor(path, onChanged = null)`

归属：`src/features/facets/folder-colors-methods.js`；原始行 L10900；种类 method；static=False。

调用：`_resetResultFolderColors`, `_resultFolderColorMap`, `_resultFolderDefaultColor`, `_setResultFolderThemeColor`。

实例依赖：`_resetResultFolderColors`, `_resultFolderColorMap`, `_resultFolderDefaultColor`, `_setResultFolderThemeColor`, `owner`。

### `_showManagedFolderDropdown(options = {})`

归属：`src/features/facets/folder-picker-methods.js`；原始行 L11065；种类 method；static=False。

调用：`_applyResultFolderPickerColor`, `_syncHeaderCount`。

实例依赖：`_applyResultFolderPickerColor`, `_syncHeaderCount`, `owner`。

### `showFolderDropdown(options = {})`

归属：`src/features/facets/folder-picker-methods.js`；原始行 L11130；种类 method；static=False。

调用：`_applyResultFolderPickerColor`, `_showManagedFolderDropdown`, `_syncHeaderCount`, `runSidebarMaintenance`, `sidebarMaintenanceModes`。

实例依赖：`_applyResultFolderPickerColor`, `_showManagedFolderDropdown`, `_syncHeaderCount`, `owner`, `runSidebarMaintenance`, `sidebarMaintenanceModes`。

### `updateFolderButton()`

归属：`src/features/facets/folder-picker-methods.js`；原始行 L11564；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

## SearchSortController

### `constructor(owner)`

归属：`src/features/sort/SearchSortController.js`；原始行 L11577；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`cycleCursorField`, `directionBtn`, `directionIcon`, `fieldBtn`, `fieldLabel`, `host`, `owner`, `pickerBtn`, `views`。

### `destroy()`

归属：`src/features/sort/SearchSortController.js`；原始行 L11589；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`cycleCursorField`, `directionBtn`, `directionIcon`, `fieldBtn`, `fieldLabel`, `host`, `owner`, `pickerBtn`, `views`。

### `allowedFields(view = null)`

归属：`src/features/sort/SearchSortController.js`；原始行 L11601；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `ensureCycleCursor(fields = this.allowedFields())`

归属：`src/features/sort/SearchSortController.js`；原始行 L11609；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`cycleCursorField`, `owner`。

### `normalize()`

归属：`src/features/sort/SearchSortController.js`；原始行 L11623；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `fieldFor(view = null)`

归属：`src/features/sort/SearchSortController.js`；原始行 L11635；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `timeField()`

归属：`src/features/sort/SearchSortController.js`；原始行 L11639；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_isCreateVisible()`

归属：`src/features/sort/SearchSortController.js`；原始行 L11645；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_prepareSearchAction()`

归属：`src/features/sort/SearchSortController.js`；原始行 L11651；种类 method；static=False。

调用：`_isCreateVisible`。

实例依赖：`_isCreateVisible`, `owner`。

### `applyField(field, view = null)`

归属：`src/features/sort/SearchSortController.js`；原始行 L11663；种类 method；static=False。

调用：`_prepareSearchAction`, `sync`。

实例依赖：`_prepareSearchAction`, `owner`, `sync`。

### `cycleField(view = null)`

归属：`src/features/sort/SearchSortController.js`；原始行 L11687；种类 method；static=False。

调用：`_prepareSearchAction`, `allowedFields`, `applyField`, `ensureCycleCursor`, `normalize`。

实例依赖：`_prepareSearchAction`, `allowedFields`, `applyField`, `cycleCursorField`, `ensureCycleCursor`, `normalize`, `owner`。

### `openPicker(view = this.views[0])`

归属：`src/features/sort/SearchSortController.js`；原始行 L11706；种类 method；static=False。

调用：`_prepareSearchAction`, `applyField`, `applyTimeRange`, `fieldFor`, `normalize`, `sync`, `timeField`, `toggleDirection`。

实例依赖：`_prepareSearchAction`, `applyField`, `applyTimeRange`, `fieldFor`, `normalize`, `owner`, `pickerBtn`, `sync`, `timeField`, `toggleDirection`。

### `applyTimeRange(days, onCommit = null)`

归属：`src/features/sort/SearchSortController.js`；原始行 L11795；种类 method；static=False。

调用：`_prepareSearchAction`, `sync`, `timeField`。

实例依赖：`_prepareSearchAction`, `owner`, `sync`, `timeField`。

### `toggleDirection(view = null)`

归属：`src/features/sort/SearchSortController.js`；原始行 L11806；种类 method；static=False。

调用：`_prepareSearchAction`, `sync`。

实例依赖：`_prepareSearchAction`, `owner`, `sync`。

### `build(parentEl, { context = "results" } = {})`

归属：`src/features/sort/SearchSortController.js`；原始行 L11817；种类 method；static=False。

调用：`cycleField`, `openPicker`, `sync`, `toggleDirection`。

实例依赖：`cycleField`, `openPicker`, `owner`, `sync`, `toggleDirection`, `views`。

### `sync()`

归属：`src/features/sort/SearchSortController.js`；原始行 L11873；种类 method；static=False。

调用：`_isCreateVisible`, `allowedFields`, `ensureCycleCursor`, `fieldFor`, `normalize`。

实例依赖：`_isCreateVisible`, `allowedFields`, `ensureCycleCursor`, `fieldFor`, `normalize`, `owner`, `pickerBtn`, `views`。

## SearchResultControlsController

### `constructor(owner)`

归属：`src/features/result-controls/SearchResultControlsController.js`；原始行 L11950；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`createNoteBtn`, `historyBtn`, `owner`, `resultViewBtn`, `searchResultControlsHost`, `viewComposerCollapsed`。

### `destroy()`

归属：`src/features/result-controls/SearchResultControlsController.js`；原始行 L11959；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`createNoteBtn`, `historyBtn`, `owner`, `resultViewBtn`, `searchResultControlsHost`, `viewComposerCollapsed`。

### `ownsAnchor(anchor)`

归属：`src/features/result-controls/toolbar-methods.js`；原始行 L11968；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`historyBtn`, `resultViewBtn`。

### `buildHost(searchWrap)`

归属：`src/features/result-controls/toolbar-methods.js`；原始行 L11975；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`searchResultControlsHost`。

### `_createInputAction(parent, className, label, iconName, interaction = "chrome")`

归属：`src/features/result-controls/toolbar-methods.js`；原始行 L11984；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `buildToolbar()`

归属：`src/features/result-controls/toolbar-methods.js`；原始行 L11996；种类 method；static=False。

调用：`_createInputAction`, `openHistoryDropdown`, `openViewDropdown`, `sync`, `syncViewMode`。

实例依赖：`_createInputAction`, `createNoteBtn`, `historyBtn`, `openHistoryDropdown`, `openViewDropdown`, `owner`, `resultViewBtn`, `searchResultControlsHost`, `sync`, `syncViewMode`。

### `activeViewId()`

归属：`src/features/result-controls/toolbar-methods.js`；原始行 L12090；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `activeViewConfig()`

归属：`src/features/result-controls/toolbar-methods.js`；原始行 L12095；种类 method；static=False。

调用：`activeViewId`。

实例依赖：`activeViewId`, `owner`。

### `filterPools()`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12101；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_filterPoolUniverse()`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12107；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_filterPoolHeaderCatalog(pools)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12115；种类 method；static=False。

调用：`_filterPoolDisplayEntries`, `_filterPoolUniverse`。

实例依赖：`_filterPoolDisplayEntries`, `_filterPoolUniverse`, `owner`。

### `_filterPoolEntries(pool, source = this._filterPoolUniverse())`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12134；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_filterPoolDisplayEntries(pool, source)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12229；种类 method；static=False。

调用：`_filterPoolEntries`。

实例依赖：`_filterPoolEntries`, `owner`。

### `_filterPoolById(poolId)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12246；种类 method；static=False。

调用：`filterPools`。

实例依赖：`filterPools`。

### `_isFilterPoolValueVisible(poolId, value)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12252；种类 method；static=False。

调用：`_filterPoolById`。

实例依赖：`_filterPoolById`。

### `async _toggleFilterPoolValueVisibility(poolId, value)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12261；种类 method；static=False。

调用：`_filterPoolById`, `filterPools`。

实例依赖：`_filterPoolById`, `filterPools`, `owner`。

### `_filterPoolCandidateKeys(pool)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12294；种类 method；static=False。

调用：`_filterPoolEntries`, `_filterPoolUniverse`。

实例依赖：`_filterPoolEntries`, `_filterPoolUniverse`, `owner`。

### `_filterPoolCandidateBulkAction(poolId)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12303；种类 method；static=False。

调用：`_filterPoolById`, `_filterPoolCandidateKeys`。

实例依赖：`_filterPoolById`, `_filterPoolCandidateKeys`。

### `async _setFilterPoolCandidateVisibility(poolId, action)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12317；种类 method；static=False。

调用：`_filterPoolById`, `_filterPoolCandidateKeys`, `filterPools`。

实例依赖：`_filterPoolById`, `_filterPoolCandidateKeys`, `filterPools`, `owner`。

### `_isPropertyPoolKeyVisible(poolId, key)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12364；种类 method；static=False。

调用：`_filterPoolById`。

实例依赖：`_filterPoolById`。

### `async _updatePropertyPoolEntry(poolId, key, updater)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12369；种类 method；static=False。

调用：`_filterPoolById`, `filterPools`。

实例依赖：`_filterPoolById`, `filterPools`, `owner`。

### `async _togglePropertyPoolKeyVisibility(poolId, key)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12402；种类 method；static=False。

调用：`_filterPoolById`, `_updatePropertyPoolEntry`, `filterPools`。

实例依赖：`_filterPoolById`, `_updatePropertyPoolEntry`, `filterPools`, `owner`。

### `_openFilterPoolEditor(pool)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12418；种类 method；static=False。

调用：`_openFileTypeFilterPoolPicker`。

实例依赖：`_openFileTypeFilterPoolPicker`, `owner`, `resultViewBtn`。

### `_openFileTypeChoicePicker(anchor, options = {})`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12468；种类 method；static=False。

调用：`_filterPoolById`, `_filterPoolDisplayEntries`, `_filterPoolUniverse`。

实例依赖：`_filterPoolById`, `_filterPoolDisplayEntries`, `_filterPoolUniverse`, `owner`。

### `_openFileTypeFilterPoolPicker(poolId, preferredAnchor = null)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12527；种类 method；static=False。

调用：`_attachFilterPoolSelectionModeControl`, `_filterPoolById`, `_filterPoolEntries`, `_toggleFilterPoolValueVisibility`。

实例依赖：`_attachFilterPoolSelectionModeControl`, `_filterPoolById`, `_filterPoolEntries`, `_toggleFilterPoolValueVisibility`, `owner`, `resultViewBtn`。

### `_filterPoolSelectionMode(pool)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12617；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_migrateFilterPoolSelectionMode(poolId, nextMode)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12621；种类 method；static=False。

调用：`_filterPoolById`。

实例依赖：`_filterPoolById`, `owner`。

### `_attachFilterPoolSelectionModeControl(panel, poolId)`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12666；种类 method；static=False。

调用：`_filterPoolById`, `_filterPoolCandidateBulkAction`, `_filterPoolSelectionMode`, `_setFilterPoolCandidateVisibility`。

实例依赖：`_filterPoolById`, `_filterPoolCandidateBulkAction`, `_filterPoolSelectionMode`, `_setFilterPoolCandidateVisibility`, `owner`。

### `_isFilterPoolValueActive(pool, value, propertyKey = "")`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12763；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_toggleFilterPoolValue(pool, value, propertyKey = "")`

归属：`src/features/result-controls/filter-pool-editor-methods.js`；原始行 L12783；种类 method；static=False。

调用：`_filterPoolSelectionMode`, `_isFilterPoolValueActive`。

实例依赖：`_filterPoolSelectionMode`, `_isFilterPoolValueActive`, `owner`。

### `refreshFilterPoolHeader()`

归属：`src/features/result-controls/view-composer-methods.js`；原始行 L12844；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `syncViewMode()`

归属：`src/features/result-controls/view-composer-methods.js`；原始行 L12850；种类 method；static=False。

调用：`activeViewId`, `syncInputActions`。

实例依赖：`activeViewId`, `owner`, `syncInputActions`。

### `syncInputActions()`

归属：`src/features/result-controls/view-composer-methods.js`；原始行 L12858；种类 method；static=False。

调用：`activeViewId`。

实例依赖：`activeViewId`, `createNoteBtn`, `owner`, `resultViewBtn`。

### `_openNavigatorToolbarPicker(context, anchor, onAdd)`

归属：`src/features/result-controls/view-composer-methods.js`；原始行 L12911；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_renderNavigatorPresentationSettings(scroll, panel, wireSection, cleanupFns)`

归属：`src/features/result-controls/view-composer-methods.js`；原始行 L12953；种类 method；static=False。

调用：`_openNavigatorToolbarPicker`。

实例依赖：`_openNavigatorToolbarPicker`, `owner`。

### `openViewDropdown(anchor, { section = "" } = {})`

归属：`src/features/result-controls/view-composer-methods.js`；原始行 L13180；种类 method；static=False。

调用：`_filterPoolById`, `_openFilterPoolEditor`, `_renderNavigatorPresentationSettings`, `activeViewConfig`, `activeViewId`, `filterPools`, `openGlobalExcludedFolderPicker`。

实例依赖：`_filterPoolById`, `_openFilterPoolEditor`, `_renderNavigatorPresentationSettings`, `activeViewConfig`, `activeViewId`, `filterPools`, `openGlobalExcludedFolderPicker`, `owner`, `resultViewBtn`, `viewComposerCollapsed`。

### `openGlobalExcludedFolderPicker(anchor, onChange = null)`

归属：`src/features/result-controls/view-composer-methods.js`；原始行 L13713；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`, `resultViewBtn`。

### `applyViewSettings({
        rerender = true,
        viewportAnchor = null,
        clearEstimate = false
    } = {})`

归属：`src/features/result-controls/view-composer-methods.js`；原始行 L13725；种类 method；static=False。

调用：`syncViewMode`。

实例依赖：`owner`, `syncViewMode`。

### `sync()`

归属：`src/features/result-controls/view-composer-methods.js`；原始行 L13743；种类 method；static=False。

调用：`syncInputActions`。

实例依赖：`historyBtn`, `owner`, `syncInputActions`。

### `openHistoryDropdown(anchorEl)`

归属：`src/features/result-controls/search-history-methods.js`；原始行 L13753；种类 method；static=False。

调用：`_renderHistoryList`, `sync`。

实例依赖：`_renderHistoryList`, `owner`, `sync`。

### `_renderHistoryList(listEl, rawQuery = "", onRefresh = null, {
        focusQuery = "",
        focusAction = "",
        fallbackIndex = 0
    } = {})`

归属：`src/features/result-controls/search-history-methods.js`；原始行 L13804；种类 method；static=False。

调用：`_applyHistoryQuery`, `_renderHistoryList`, `sync`。

实例依赖：`_applyHistoryQuery`, `_renderHistoryList`, `owner`, `sync`。

### `_applyHistoryQuery(q, { focus = true } = {})`

归属：`src/features/result-controls/search-history-methods.js`；原始行 L13915；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

## SwipeActionCoordinator

### `constructor(owner)`

归属：`src/interactions/SwipeActionCoordinator.js`；原始行 L13951；种类 constructor；static=False。

调用：`_ownsTarget`, `openClose`。

实例依赖：`_dismissClickArmed`, `_onDocumentClick`, `_onDocumentPointerDown`, `_ownsTarget`, `activeCancel`, `allExpanded`, `closingWrapper`, `enabled`, `expansionRevision`, `gestureWrapper`, `openClose`, `openWrapper`, `owner`, `ownerDocument`, `pendingAction`。

### `_ownsTarget(target)`

归属：`src/interactions/SwipeActionCoordinator.js`；原始行 L14027；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `mountedBindings()`

归属：`src/interactions/SwipeActionCoordinator.js`；原始行 L14033；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `setAllExpanded(expanded)`

归属：`src/interactions/SwipeActionCoordinator.js`；原始行 L14038；种类 method；static=False。

调用：`cancel`, `mountedBindings`。

实例依赖：`allExpanded`, `cancel`, `expansionRevision`, `mountedBindings`, `owner`。

### `closeOpen(except = null)`

归属：`src/interactions/SwipeActionCoordinator.js`；原始行 L14055；种类 method；static=False。

调用：`openClose`。

实例依赖：`allExpanded`, `openClose`, `openWrapper`。

### `cancel()`

归属：`src/interactions/SwipeActionCoordinator.js`；原始行 L14062；种类 method；static=False。

调用：`activeCancel`, `openClose`。

实例依赖：`activeCancel`, `closingWrapper`, `gestureWrapper`, `openClose`, `openWrapper`。

### `closeAll({ immediate = false } = {})`

归属：`src/interactions/SwipeActionCoordinator.js`；原始行 L14072；种类 method；static=False。

调用：`activeCancel`, `openClose`。

实例依赖：`activeCancel`, `closingWrapper`, `gestureWrapper`, `openClose`, `openWrapper`。

### `resetForRender()`

归属：`src/interactions/SwipeActionCoordinator.js`；原始行 L14082；种类 method；static=False。

调用：`cancel`。

实例依赖：`cancel`, `closingWrapper`, `owner`。

### `setEnabled(enabled)`

归属：`src/interactions/SwipeActionCoordinator.js`；原始行 L14088；种类 method；static=False。

调用：`cancel`。

实例依赖：`cancel`, `enabled`。

### `destroy()`

归属：`src/interactions/SwipeActionCoordinator.js`；原始行 L14093；种类 method；static=False。

调用：`mountedBindings`, `resetForRender`。

实例依赖：`_dismissClickArmed`, `_onDocumentClick`, `_onDocumentPointerDown`, `allExpanded`, `gestureWrapper`, `mountedBindings`, `owner`, `ownerDocument`, `pendingAction`, `resetForRender`。

### `bind(wrapper, row, options = {})`

归属：`src/interactions/SwipeActionCoordinator.js`；原始行 L14116；种类 method；static=False。

调用：`activeCancel`, `closeOpen`。

实例依赖：`activeCancel`, `allExpanded`, `closeOpen`, `closingWrapper`, `enabled`, `expansionRevision`, `gestureWrapper`, `openClose`, `openWrapper`, `owner`, `pendingAction`。

## SearchResultRendererController

### `constructor(owner)`

归属：`src/features/results/SearchResultRendererController.js`；原始行 L14614；种类 constructor；static=False。

调用：`_handleRowResize`, `_handleViewportResize`。

实例依赖：`_afterSpacer`, `_beforeSpacer`, `_filterPoolGroupRefs`, `_filterToolbarButtonRefs`, `_geometryRevision`, `_geometrySettleTimer`, `_geometryStyleSignature`, `_handleRowResize`, `_handleViewportResize`, `_heightIndex`, `_heightIndexGeneration`, `_heightIndexGeometryRevision`, `_heightIndexViewKey`, `_pendingGeometryRefresh`, `_programmaticScrollTop`, `_rowResizeObserver`, `_scrollFrame`, `_scrollOffset`, `_scrollSettleTimer`, `_scrollTouch`, `_swipeReveal`, `_viewportHeight`, `_viewportInputCleanup`, `_viewportPadTop`, `_viewportResizeObserver`, `_viewportWidth`, `owner`, `windowEnd`, `windowStart`。

### `destroy()`

归属：`src/features/results/SearchResultRendererController.js`；原始行 L14657；种类 method；static=False。

调用：`_viewportInputCleanup`, `cancelSwipeReveal`。

实例依赖：`_afterSpacer`, `_beforeSpacer`, `_filterPoolGroupRefs`, `_filterToolbarButtonRefs`, `_geometrySettleTimer`, `_heightIndex`, `_pendingGeometryRefresh`, `_pendingViewportMeasurement`, `_programmaticScrollTop`, `_rowResizeObserver`, `_scrollFrame`, `_scrollOffset`, `_scrollSettleTimer`, `_scrollTouch`, `_viewportInputCleanup`, `_viewportResizeObserver`, `cancelSwipeReveal`, `owner`。

### `getScrollTop()`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14687；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_setScrollTop(value)`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14694；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_programmaticScrollTop`, `owner`。

### `attachViewport(container = this.owner?.resultsContainer)`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14710；种类 method；static=False。

调用：`_markNativeScroll`, `_measureRailContentWidth`, `_readGeometryStyleSignature`, `_syncViewportInsets`, `_viewportInputCleanup`, `yieldSwipeReveal`。

实例依赖：`_geometryStyleSignature`, `_markNativeScroll`, `_measureRailContentWidth`, `_readGeometryStyleSignature`, `_scrollTouch`, `_syncViewportInsets`, `_viewportHeight`, `_viewportInputCleanup`, `_viewportResizeObserver`, `_viewportWidth`, `owner`, `yieldSwipeReveal`。

### `_isOverscrolling()`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14762；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `isNativeScrolling()`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14770；种类 method；static=False。

调用：`_isOverscrolling`。

实例依赖：`_isOverscrolling`, `_scrollSettleTimer`, `_scrollTouch`。

### `_markNativeScroll()`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14778；种类 method；static=False。

调用：`_isOverscrolling`, `_settleNativeScroll`。

实例依赖：`_isOverscrolling`, `_pendingViewportMeasurement`, `_scrollSettleTimer`, `_scrollTouch`, `_settleNativeScroll`, `owner`。

### `_settleNativeScroll()`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14798；种类 method；static=False。

调用：`_scheduleGeometryRefresh`, `_setScrollTop`, `_syncSpacerHeights`。

实例依赖：`_pendingGeometryRefresh`, `_scheduleGeometryRefresh`, `_scrollOffset`, `_setScrollTop`, `_syncSpacerHeights`, `owner`。

### `_geometryAnchor(index = this._ensureHeightIndex())`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14825；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_scrollOffset`, `_viewportPadTop`, `owner`。

### `_restoreGeometryAnchor(anchor, index = this._ensureHeightIndex())`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14838；种类 method；static=False。

调用：`_setScrollTop`, `isNativeScrolling`。

实例依赖：`_scrollOffset`, `_setScrollTop`, `_viewportPadTop`, `isNativeScrolling`, `owner`。

### `_readGeometryStyleSignature()`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14854；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_syncViewportInsets()`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14872；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_viewportPadTop`, `owner`。

### `_measureRailContentWidth(entry = null)`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14883；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `captureMountedViewportAnchor(preferredPaths = null, excludedPaths = null)`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14897；种类 method；static=False。

调用：`getScrollTop`。

实例依赖：`_scrollOffset`, `getScrollTop`, `owner`。

### `invalidateGeometry({ clearEstimate = false } = {})`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14943；种类 method；static=False。

调用：`_readGeometryStyleSignature`, `_rowEstimateCacheKey`, `_syncViewportInsets`。

实例依赖：`_geometryRevision`, `_geometryStyleSignature`, `_heightIndexGeometryRevision`, `_readGeometryStyleSignature`, `_rowEstimateCacheKey`, `_syncViewportInsets`, `owner`。

### `rerenderForGeometryChange({
        viewportAnchor = null,
        clearEstimate = false
    } = {})`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14961；种类 method；static=False。

调用：`captureMountedViewportAnchor`, `invalidateGeometry`, `isNativeScrolling`, `renderInitialPage`。

实例依赖：`_geometrySettleTimer`, `_pendingGeometryRefresh`, `captureMountedViewportAnchor`, `invalidateGeometry`, `isNativeScrolling`, `owner`, `renderInitialPage`。

### `_scheduleGeometryRefresh({ clearEstimate = "all" } = {})`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L14989；种类 method；static=False。

调用：`captureMountedViewportAnchor`, `isNativeScrolling`, `rerenderForGeometryChange`。

实例依赖：`_geometrySettleTimer`, `_pendingGeometryRefresh`, `captureMountedViewportAnchor`, `isNativeScrolling`, `owner`, `rerenderForGeometryChange`。

### `handleStyleEnvironmentChange()`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L15015；种类 method；static=False。

调用：`_measureRailContentWidth`, `_readGeometryStyleSignature`, `_scheduleGeometryRefresh`, `_syncViewportInsets`, `_syncWindowToViewport`。

实例依赖：`_geometryStyleSignature`, `_measureRailContentWidth`, `_readGeometryStyleSignature`, `_scheduleGeometryRefresh`, `_syncViewportInsets`, `_syncWindowToViewport`, `_viewportPadTop`, `_viewportWidth`, `owner`。

### `rerenderPreservingScrollTop()`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L15050；种类 method；static=False。

调用：`_setScrollTop`, `getScrollTop`, `renderPage`。

实例依赖：`_setScrollTop`, `getScrollTop`, `owner`, `renderPage`。

### `_handleViewportResize(entries = [])`

归属：`src/features/results/viewport-geometry-methods.js`；原始行 L15059；种类 method；static=False。

调用：`_measureRailContentWidth`, `_scheduleGeometryRefresh`, `_syncViewportInsets`, `_syncWindowToViewport`。

实例依赖：`_measureRailContentWidth`, `_scheduleGeometryRefresh`, `_syncViewportInsets`, `_syncWindowToViewport`, `_viewportHeight`, `_viewportWidth`, `owner`。

### `captureViewportAnchor(preferredPaths = null, excludedPaths = null)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15100；种类 method；static=False。

调用：`_actualIndexAtDisplayPosition`, `_ensureHeightIndex`, `getScrollTop`, `visibleResultCount`。

实例依赖：`_actualIndexAtDisplayPosition`, `_ensureHeightIndex`, `_scrollOffset`, `_viewportHeight`, `_viewportPadTop`, `getScrollTop`, `owner`, `visibleResultCount`, `windowEnd`, `windowStart`。

### `_displayPositionForActualIndex(actualIndex)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15184；种类 method；static=False。

调用：`_usesChannels`。

实例依赖：`_usesChannels`, `owner`。

### `_actualIndexAtDisplayPosition(position)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15196；种类 method；static=False。

调用：`_usesChannels`。

实例依赖：`_usesChannels`, `owner`。

### `_displayPositionForPath(path)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15207；种类 method；static=False。

调用：`_displayPositionForActualIndex`。

实例依赖：`_displayPositionForActualIndex`, `owner`。

### `_rowEstimateCacheKey(viewId = null)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15214；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_syncRowEstimate()`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15222；种类 method；static=False。

调用：`_rowEstimateCacheKey`。

实例依赖：`_rowEstimateCacheKey`, `owner`。

### `_ensureHeightIndex(total = this.visibleResultCount())`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15236；种类 method；static=False。

调用：`_rowEstimateCacheKey`, `_syncRowEstimate`。

实例依赖：`_geometryRevision`, `_heightIndex`, `_heightIndexGeneration`, `_heightIndexGeometryRevision`, `_heightIndexViewKey`, `_rowEstimateCacheKey`, `_syncRowEstimate`, `owner`。

### `beginSwipeReveal(shell)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15254；种类 method；static=False。

调用：`cancelSwipeReveal`。

实例依赖：`_swipeReveal`, `cancelSwipeReveal`, `owner`。

### `yieldSwipeReveal()`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15275；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_swipeReveal`。

### `cancelSwipeReveal(shell = null)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15279；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_swipeReveal`。

### `_sampleSwipeReveal(shell, height, itemHeight, trailing, expanded)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15284；种类 method；static=False。

调用：`_setScrollTop`, `cancelSwipeReveal`。

实例依赖：`_setScrollTop`, `_swipeReveal`, `cancelSwipeReveal`, `owner`。

### `_handleRowResize(entries = [])`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15308；种类 method；static=False。

调用：`_ensureHeightIndex`, `_geometryAnchor`, `_readGeometryStyleSignature`, `_restoreGeometryAnchor`, `_rowEstimateCacheKey`, `_sampleSwipeReveal`, `_syncSpacerHeights`, `_syncWindowToViewport`, `captureMountedViewportAnchor`, `prepareViewportAnchor`, `rerenderForGeometryChange`。

实例依赖：`_ensureHeightIndex`, `_geometryAnchor`, `_geometryStyleSignature`, `_pendingViewportMeasurement`, `_readGeometryStyleSignature`, `_restoreGeometryAnchor`, `_rowEstimateCacheKey`, `_sampleSwipeReveal`, `_swipeReveal`, `_syncSpacerHeights`, `_syncWindowToViewport`, `captureMountedViewportAnchor`, `owner`, `prepareViewportAnchor`, `rerenderForGeometryChange`, `windowStart`。

### `_observeShell(shell, position)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15417；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_rowResizeObserver`。

### `_unobserveShell(shell)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15426；种类 method；static=False。

调用：`cancelSwipeReveal`。

实例依赖：`_rowResizeObserver`, `cancelSwipeReveal`, `owner`。

### `prepareViewportAnchor(anchor)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15436；种类 method；static=False。

调用：`_displayPositionForPath`。

实例依赖：`_displayPositionForPath`。

### `restoreViewportAnchor(anchor)`

归属：`src/features/results/viewport-anchors-methods.js`；原始行 L15449；种类 method；static=False。

调用：`_setScrollTop`。

实例依赖：`_setScrollTop`, `owner`。

### `renderInitialPage(anchor, { syncControls = true } = {})`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15471；种类 method；static=False。

调用：`_ensureHeightIndex`, `prepareViewportAnchor`, `renderPage`, `restoreViewportAnchor`。

实例依赖：`_ensureHeightIndex`, `_pendingViewportMeasurement`, `_viewportPadTop`, `owner`, `prepareViewportAnchor`, `renderPage`, `restoreViewportAnchor`。

### `_usesChannels()`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15512；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `visibleResultCount()`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15518；种类 method；static=False。

调用：`_usesChannels`。

实例依赖：`_usesChannels`, `owner`。

### `getVisibleResultIndices()`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15526；种类 method；static=False。

调用：`_actualIndexAtDisplayPosition`, `visibleResultCount`。

实例依赖：`_actualIndexAtDisplayPosition`, `visibleResultCount`。

### `resetViewport()`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15536；种类 method；static=False。

调用：`_setScrollTop`, `invalidateGeometry`。

实例依赖：`_pendingGeometryRefresh`, `_pendingViewportMeasurement`, `_scrollOffset`, `_scrollSettleTimer`, `_scrollTouch`, `_setScrollTop`, `invalidateGeometry`, `owner`, `windowEnd`, `windowStart`。

### `_windowSize(total = this.visibleResultCount())`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15558；种类 method；static=False。

调用：`_syncRowEstimate`。

实例依赖：`_heightIndex`, `_syncRowEstimate`, `_viewportHeight`, `owner`。

### `_windowStartForPosition(position, total)`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15584；种类 method；static=False。

调用：`_windowSize`。

实例依赖：`_windowSize`。

### `_windowRangeForViewport(firstVisible, lastVisible, total)`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15592；种类 method；static=False。

调用：`_windowSize`。

实例依赖：`_windowSize`。

### `_spacer(height, cls = "")`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15611；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_mountedShells()`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15619；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `refreshActionShelfLayout(anchor)`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15628；种类 method；static=False。

调用：`_ensureHeightIndex`, `_restoreGeometryAnchor`, `_syncSpacerHeights`, `_syncWindowToViewport`。

实例依赖：`_ensureHeightIndex`, `_restoreGeometryAnchor`, `_syncSpacerHeights`, `_syncWindowToViewport`, `owner`。

### `_syncMountedState()`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15637；种类 method；static=False。

调用：`_actualIndexAtDisplayPosition`, `_mountedShells`。

实例依赖：`_actualIndexAtDisplayPosition`, `_mountedShells`, `owner`。

### `_syncSpacerHeights(total = this.visibleResultCount())`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15656；种类 method；static=False。

调用：`_ensureHeightIndex`。

实例依赖：`_afterSpacer`, `_beforeSpacer`, `_ensureHeightIndex`, `_scrollOffset`, `windowEnd`, `windowStart`。

### `_shiftWindowRange(start, end, total = this.visibleResultCount())`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15667；种类 method；static=False。

调用：`_appendPositionRange`, `_ensureHeightIndex`, `_mountedShells`, `_syncMountedState`, `_syncSpacerHeights`, `_unobserveShell`, `queueLazySnippetFill`。

实例依赖：`_afterSpacer`, `_appendPositionRange`, `_beforeSpacer`, `_ensureHeightIndex`, `_mountedShells`, `_syncMountedState`, `_syncSpacerHeights`, `_unobserveShell`, `owner`, `queueLazySnippetFill`, `windowEnd`, `windowStart`。

### `_syncWindowToViewport(container = this.owner?.resultsContainer)`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15751；种类 method；static=False。

调用：`_ensureHeightIndex`, `_shiftWindowRange`, `_windowRangeForViewport`, `visibleResultCount`。

实例依赖：`_ensureHeightIndex`, `_scrollOffset`, `_shiftWindowRange`, `_viewportPadTop`, `_windowRangeForViewport`, `owner`, `visibleResultCount`, `windowEnd`, `windowStart`。

### `handleScrollLoad(scrollContainer = this.owner?.resultsContainer)`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15809；种类 method；static=False。

调用：`_markNativeScroll`, `_syncWindowToViewport`, `yieldSwipeReveal`。

实例依赖：`_markNativeScroll`, `_programmaticScrollTop`, `_scrollFrame`, `_swipeReveal`, `_syncWindowToViewport`, `owner`, `yieldSwipeReveal`。

### `_appendPositionRange(frag, start, end)`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15835；种类 method；static=False。

调用：`_actualIndexAtDisplayPosition`, `_buildResultItem`。

实例依赖：`_actualIndexAtDisplayPosition`, `_buildResultItem`。

### `refreshChangedRows(paths)`

归属：`src/features/results/virtual-window-methods.js`；原始行 L15842；种类 method；static=False。

调用：`_buildResultItem`, `_unobserveShell`, `queueLazySnippetFill`。

实例依赖：`_buildResultItem`, `_heightIndexGeneration`, `_unobserveShell`, `owner`, `queueLazySnippetFill`。

### `renderCurrentView()`

归属：`src/features/results/page-and-snippets-methods.js`；原始行 L15867；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `queueLazySnippetFill(fromIdx = 0, generation = this.owner?._resultGeneration)`

归属：`src/features/results/page-and-snippets-methods.js`；原始行 L15872；种类 method；static=False。

调用：`_lazyFillSnippet`。

实例依赖：`_lazyFillSnippet`, `owner`。

### `async _lazyFillSnippet(fromIdx = 0, generation = this.owner?._resultGeneration)`

归属：`src/features/results/page-and-snippets-methods.js`；原始行 L15885；种类 method；static=False。

调用：`_updateSnippetInPlace`。

实例依赖：`_updateSnippetInPlace`, `owner`。

### `renderPage({
        targetPosition = null,
        preserveScrollTop = null,
        syncControls = true
    } = {})`

归属：`src/features/results/page-and-snippets-methods.js`；原始行 L15967；种类 method；static=False。

调用：`_appendPositionRange`, `_ensureHeightIndex`, `_setScrollTop`, `_spacer`, `_syncMountedState`, `_windowSize`, `_windowStartForPosition`, `queueLazySnippetFill`, `visibleResultCount`。

实例依赖：`_afterSpacer`, `_appendPositionRange`, `_beforeSpacer`, `_ensureHeightIndex`, `_rowResizeObserver`, `_setScrollTop`, `_spacer`, `_syncMountedState`, `_viewportPadTop`, `_windowSize`, `_windowStartForPosition`, `owner`, `queueLazySnippetFill`, `visibleResultCount`, `windowEnd`, `windowStart`。

### `_renderFilterPoolHeader()`

归属：`src/features/results/filter-channels-methods.js`；原始行 L16066；种类 method；static=False。

调用：`_syncFilterPoolGroups`, `_syncFilterToolbarEntries`。

实例依赖：`_syncFilterPoolGroups`, `_syncFilterToolbarEntries`, `owner`。

### `refreshResultChannels()`

归属：`src/features/results/filter-channels-methods.js`；原始行 L16098；种类 method；static=False。

调用：`_renderStateChannels`。

实例依赖：`_renderStateChannels`, `owner`。

### `_renderStateChannels(visible = true)`

归属：`src/features/results/filter-channels-methods.js`；原始行 L16104；种类 method；static=False。

调用：`_appendChannelGroup`。

实例依赖：`_appendChannelGroup`, `owner`。

### `_appendChannelGroup(target)`

归属：`src/features/results/filter-channels-methods.js`；原始行 L16113；种类 method；static=False。

调用：`_usesChannels`, `refreshResultChannels`, `renderPage`, `resetViewport`。

实例依赖：`_usesChannels`, `owner`, `refreshResultChannels`, `renderPage`, `resetViewport`。

### `_ensureFilterPoolGroup(values, groupKey, labelText = "", ariaLabel = "")`

归属：`src/features/results/filter-channels-methods.js`；原始行 L16181；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_filterPoolGroupRefs`。

### `_syncFilterPoolButton(ref, cursor, entryKey, { label, ariaLabel, active, action })`

归属：`src/features/results/filter-channels-methods.js`；原始行 L16197；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_syncFilterPoolGroups(values, source, poolSettings, catalog = null)`

归属：`src/features/results/filter-channels-methods.js`；原始行 L16221；种类 method；static=False。

调用：`_ensureFilterPoolGroup`, `_syncFilterPoolButton`。

实例依赖：`_ensureFilterPoolGroup`, `_filterPoolGroupRefs`, `_syncFilterPoolButton`, `owner`。

### `_syncFilterToolbarEntries(valuesHost, shortcutsHost, source, poolSettings)`

归属：`src/features/results/filter-channels-methods.js`；原始行 L16300；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_filterToolbarButtonRefs`, `owner`。

### `_appendHighlightedTitle(parent, result)`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16353；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_buildTitleRow(item, result)`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16360；种类 method；static=False。

调用：`_appendHighlightedTitle`。

实例依赖：`_appendHighlightedTitle`, `owner`。

### `_createFilterChip(parent, { kind, value, key = "", text, title, extraClass = "", highlightRanges = [] })`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16417；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_createResultMetadataRow(item, kind = "meta")`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16432；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_appendTags(item, result)`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16439；种类 method；static=False。

调用：`_createFilterChip`, `_createResultMetadataRow`。

实例依赖：`_createFilterChip`, `_createResultMetadataRow`, `owner`。

### `_visibleProperties(result)`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16465；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_createPropertyKeyButton(parent, key)`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16491；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_appendProperties(item, result)`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16514；种类 method；static=False。

调用：`_createFilterChip`, `_createPropertyKeyButton`, `_createResultMetadataRow`, `_visibleProperties`。

实例依赖：`_createFilterChip`, `_createPropertyKeyButton`, `_createResultMetadataRow`, `_visibleProperties`, `owner`。

### `_timeFormatters()`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16570；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_dateFormats`。

### `_formatTime(timestamp)`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16579；种类 method；static=False。

调用：`_timeFormatters`。

实例依赖：`_timeFormatters`。

### `_formatCardMetaTime(timestamp)`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16584；种类 method；static=False。

调用：`_timeFormatters`。

实例依赖：`_timeFormatters`。

### `_appendMetaFields(item, result, fieldIds = [])`

归属：`src/features/results/card-metadata-methods.js`；原始行 L16590；种类 method；static=False。

调用：`_createResultMetadataRow`, `_formatCardMetaTime`, `_formatTime`。

实例依赖：`_createResultMetadataRow`, `_formatCardMetaTime`, `_formatTime`, `owner`。

### `_buildResultItem(i, frag, displayPosition = null)`

归属：`src/features/results/result-card-methods.js`；原始行 L16671；种类 method；static=False。

调用：`_appendMetaFields`, `_appendProperties`, `_appendTags`, `_buildTitleRow`, `_displayPositionForActualIndex`, `_fillSnippet`, `_observeShell`, `visibleResultCount`。

实例依赖：`_appendMetaFields`, `_appendProperties`, `_appendTags`, `_buildTitleRow`, `_displayPositionForActualIndex`, `_fillSnippet`, `_observeShell`, `owner`, `visibleResultCount`。

### `_fillSnippet(snippetEl, res)`

归属：`src/features/results/result-card-methods.js`；原始行 L16797；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_updateSnippetInPlace(res)`

归属：`src/features/results/result-card-methods.js`；原始行 L16804；种类 method；static=False。

调用：`_fillSnippet`。

实例依赖：`_fillSnippet`, `owner`。

### `navigateResults(direction)`

归属：`src/features/results/result-card-methods.js`；原始行 L16836；种类 method；static=False。

调用：`_actualIndexAtDisplayPosition`, `_displayPositionForPath`, `renderPage`, `visibleResultCount`。

实例依赖：`_actualIndexAtDisplayPosition`, `_displayPositionForPath`, `owner`, `renderPage`, `visibleResultCount`, `windowEnd`, `windowStart`。

## SearchCreateController

### `constructor(owner)`

归属：`src/features/create/SearchCreateController.js`；原始行 L16866；种类 constructor；static=False。

调用：`_makeCreateDraft`。

实例依赖：`_createInFlight`, `_makeCreateDraft`, `createDraft`, `inputMode`, `owner`, `quickCreateTitle`, `searchFilterState`, `searchQuery`。

### `destroy()`

归属：`src/features/create/SearchCreateController.js`；原始行 L16876；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_createInFlight`, `createDraft`, `inputMode`, `owner`, `quickCreateTitle`, `searchFilterState`, `searchQuery`。

### `captureDraft()`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L16890；种类 method；static=False。

调用：`_currentCreateType`, `_pendingCreationSnapshot`, `isCreateMode`。

实例依赖：`_currentCreateType`, `_pendingCreationSnapshot`, `createDraft`, `isCreateMode`, `owner`, `quickCreateTitle`。

### `restoreDraft(snapshot)`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L16903；种类 method；static=False。

调用：`_makeCreateDraft`, `_normalizeCreateProperties`, `_pendingCreationSnapshot`, `syncInputModeView`。

实例依赖：`_makeCreateDraft`, `_normalizeCreateProperties`, `_pendingCreationSnapshot`, `createDraft`, `inputMode`, `owner`, `quickCreateTitle`, `searchFilterState`, `searchQuery`, `syncInputModeView`。

### `typeOptions()`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L16937；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_propertyTypeForKey(key, propertyTypes = this.createDraft?.propertyTypes)`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L16945；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `_normalizeCreateProperties(properties, propertyTypes = this.createDraft?.propertyTypes)`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L16956；种类 method；static=False。

调用：`_propertyTypeForKey`。

实例依赖：`_propertyTypeForKey`, `owner`。

### `_makeCreateDraft(source = null)`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L16974；种类 method；static=False。

调用：`_normalizeCreateProperties`。

实例依赖：`_normalizeCreateProperties`, `owner`。

### `_draft()`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17020；种类 method；static=False。

调用：`_makeCreateDraft`。

实例依赖：`_makeCreateDraft`, `createDraft`。

### `_currentCreateType()`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17025；种类 method；static=False。

调用：`_draft`。

实例依赖：`_draft`。

### `_syncDraftTypeFromFacetState()`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17036；种类 method；static=False。

调用：`_draft`, `isCreateView`, `syncInputModeView`。

实例依赖：`_draft`, `isCreateView`, `syncInputModeView`。

### `_createTypeOption(type = this._currentCreateType())`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17058；种类 method；static=False。

调用：`typeOptions`。

实例依赖：`typeOptions`。

### `_setDraftTemplate(type, selection)`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17062；种类 method；static=False。

调用：`_draft`。

实例依赖：`_draft`, `owner`。

### `_openDraftTemplatePicker(anchor, type = this._currentCreateType())`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17074；种类 method；static=False。

调用：`_createTypeOption`, `_effectiveTemplateSetting`, `_refreshCreatePreview`, `_setDraftTemplate`, `isCreateView`。

实例依赖：`_createTypeOption`, `_effectiveTemplateSetting`, `_refreshCreatePreview`, `_setDraftTemplate`, `isCreateView`, `owner`。

### `cycleCreateType()`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17093；种类 method；static=False。

调用：`_currentCreateType`, `isCreateView`。

实例依赖：`_createInFlight`, `_currentCreateType`, `createDraft`, `isCreateView`, `owner`。

### `openMetadataPicker(anchor, kind = "tag", propertyKey = "")`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17104；种类 method；static=False。

调用：`_applyDraftMetadata`, `_draft`, `_draftMetadataSummary`, `isCreateView`。

实例依赖：`_applyDraftMetadata`, `_createInFlight`, `_draft`, `_draftMetadataSummary`, `createDraft`, `isCreateView`, `owner`。

### `_draftMetadataSummary(draft = this._draft())`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17121；种类 method；static=False。

调用：`_typedPropertyValue`。

实例依赖：`_typedPropertyValue`。

### `_applyDraftMetadata(changes, draft = this._draft())`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17137；种类 method；static=False。

调用：`isCreateView`。

实例依赖：`_createInFlight`, `createDraft`, `isCreateView`, `owner`。

### `_pendingCreationSnapshot(value = this.createDraft?.pendingCreation)`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17178；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `retainPartialFileAndReturn()`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17198；种类 method；static=False。

调用：`captureDraft`, `isDerivedCreateView`, `toggleInputMode`。

实例依赖：`_createInFlight`, `captureDraft`, `createDraft`, `isDerivedCreateView`, `owner`, `toggleInputMode`。

### `clearCreateConditions()`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17214；种类 method；static=False。

调用：`_draft`, `_refreshCreatePreview`, `isCreateMode`, `syncInputModeView`。

实例依赖：`_createInFlight`, `_draft`, `_refreshCreatePreview`, `createDraft`, `isCreateMode`, `owner`, `syncInputModeView`。

### `remapTemplatePaths(oldPath, newPath, { descendants = false } = {})`

归属：`src/features/create/draft-and-metadata-methods.js`；原始行 L17232；种类 method；static=False。

调用：`_refreshCreatePreview`, `isCreateView`。

实例依赖：`_refreshCreatePreview`, `createDraft`, `isCreateView`。

### `_refreshCreatePreview({ refreshPools = false } = {})`

归属：`src/features/create/input-mode-methods.js`；原始行 L17255；种类 method；static=False。

调用：`_syncCreateTitlePreview`, `isCreateView`。

实例依赖：`_syncCreateTitlePreview`, `isCreateView`, `owner`。

### `_syncQuickCreateButton(button, rawTitle = this.currentCreateTitle())`

归属：`src/features/create/input-mode-methods.js`；原始行 L17273；种类 method；static=False。

调用：`_createTypeOption`。

实例依赖：`_createInFlight`, `_createTypeOption`, `createDraft`。

### `_syncCreateTitlePreview()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17296；种类 method；static=False。

调用：`_syncQuickCreateButton`, `currentCreateTitle`, `isCreateView`。

实例依赖：`_syncQuickCreateButton`, `currentCreateTitle`, `isCreateView`, `owner`。

### `isCreateMode()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17312；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`inputMode`。

### `isDerivedCreateView()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17316；种类 method；static=False。

调用：`isCreateMode`。

实例依赖：`isCreateMode`, `searchFilterState`。

### `isCreateView()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17320；种类 method；static=False。

调用：`isCreateMode`, `isDerivedCreateView`。

实例依赖：`isCreateMode`, `isDerivedCreateView`。

### `currentCreateTitle()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17324；种类 method；static=False。

调用：`isCreateMode`, `isDerivedCreateView`。

实例依赖：`isCreateMode`, `isDerivedCreateView`, `owner`, `quickCreateTitle`。

### `searchResultFilterState()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17332；种类 method；static=False。

调用：`isDerivedCreateView`。

实例依赖：`isDerivedCreateView`, `owner`, `searchFilterState`。

### `_leaveDerivedCreateView({ resetDraft = true } = {})`

归属：`src/features/create/input-mode-methods.js`；原始行 L17337；种类 method；static=False。

调用：`_makeCreateDraft`, `isDerivedCreateView`, `syncInputModeView`。

实例依赖：`_makeCreateDraft`, `createDraft`, `isDerivedCreateView`, `owner`, `quickCreateTitle`, `searchFilterState`, `searchQuery`, `syncInputModeView`。

### `prepareSearchEvaluation()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17351；种类 method；static=False。

调用：`_leaveDerivedCreateView`, `isCreateMode`。

实例依赖：`_leaveDerivedCreateView`, `isCreateMode`。

### `syncDerivedCreateViewState()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17356；种类 method；static=False。

调用：`_leaveDerivedCreateView`, `_makeCreateDraft`, `isCreateMode`, `isDerivedCreateView`, `syncInputModeView`。

实例依赖：`_leaveDerivedCreateView`, `_makeCreateDraft`, `createDraft`, `isCreateMode`, `isDerivedCreateView`, `owner`, `quickCreateTitle`, `searchFilterState`, `searchQuery`, `syncInputModeView`。

### `activeInputHasValue()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17397；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `syncInputModeView()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17402；种类 method；static=False。

调用：`_createTypeOption`, `isCreateMode`, `isCreateView`。

实例依赖：`_createInFlight`, `_createTypeOption`, `createDraft`, `isCreateMode`, `isCreateView`, `owner`, `quickCreateTitle`。

### `enterCreateMode()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17430；种类 method；static=False。

调用：`isCreateMode`, `toggleInputMode`。

实例依赖：`isCreateMode`, `toggleInputMode`。

### `toggleInputMode({ focusInput = true, searchQueryOnExit = null, refreshResultsOnExit = false } = {})`

归属：`src/features/create/input-mode-methods.js`；原始行 L17435；种类 method；static=False。

调用：`_makeCreateDraft`, `isCreateMode`, `isDerivedCreateView`, `syncInputModeView`。

实例依赖：`_makeCreateDraft`, `createDraft`, `inputMode`, `isCreateMode`, `isDerivedCreateView`, `owner`, `quickCreateTitle`, `searchFilterState`, `searchQuery`, `syncInputModeView`。

### `clearActiveInput({ keepFocus = true } = {})`

归属：`src/features/create/input-mode-methods.js`；原始行 L17520；种类 method；static=False。

调用：`handleInput`, `isCreateMode`。

实例依赖：`_createInFlight`, `createDraft`, `handleInput`, `isCreateMode`, `owner`。

### `handleInput(value)`

归属：`src/features/create/input-mode-methods.js`；原始行 L17550；种类 method；static=False。

调用：`_syncCreateTitlePreview`, `isCreateMode`。

实例依赖：`_createInFlight`, `_syncCreateTitlePreview`, `createDraft`, `isCreateMode`, `owner`, `quickCreateTitle`。

### `async submitCreateView()`

归属：`src/features/create/input-mode-methods.js`；原始行 L17560；种类 method；static=False。

调用：`_currentCreateType`, `createNewNote`, `currentCreateTitle`, `isCreateView`。

实例依赖：`_createInFlight`, `_currentCreateType`, `createNewNote`, `currentCreateTitle`, `isCreateView`。

### `renderQuickCreatePreview(parent, rawTitle)`

归属：`src/features/create/preview-methods.js`；原始行 L17569；种类 method；static=False。

调用：`_activeCreateProperties`, `_activeCreateTags`, `_createTypeOption`, `_currentCreateType`, `_displayCreatePathName`, `_effectiveFolder`, `_effectiveTemplateSetting`, `_openDraftTemplatePicker`, `_syncQuickCreateButton`, `createNewNote`, `currentCreateTitle`, `cycleCreateType`, `isCreateView`, `retainPartialFileAndReturn`。

实例依赖：`_activeCreateProperties`, `_activeCreateTags`, `_createInFlight`, `_createTypeOption`, `_currentCreateType`, `_displayCreatePathName`, `_effectiveFolder`, `_effectiveTemplateSetting`, `_openDraftTemplatePicker`, `_syncQuickCreateButton`, `createDraft`, `createNewNote`, `currentCreateTitle`, `cycleCreateType`, `isCreateView`, `owner`, `retainPartialFileAndReturn`。

### `_displayCreatePathName(path)`

归属：`src/features/create/preview-methods.js`；原始行 L17741；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_activeCreateTags()`

归属：`src/features/create/preview-methods.js`；原始行 L17746；种类 method；static=False。

调用：`_draft`。

实例依赖：`_draft`, `owner`。

### `_activeCreateProperties()`

归属：`src/features/create/preview-methods.js`；原始行 L17760；种类 method；static=False。

调用：`_draft`, `_normalizeCreateProperties`。

实例依赖：`_draft`, `_normalizeCreateProperties`, `owner`。

### `_effectiveCreateFilterState()`

归属：`src/features/create/preview-methods.js`；原始行 L17782；种类 method；static=False。

调用：`_activeCreateProperties`, `_activeCreateTags`, `_draft`。

实例依赖：`_activeCreateProperties`, `_activeCreateTags`, `_draft`。

### `_sanitizeTitle(rawQuery)`

归属：`src/features/create/payload-methods.js`；原始行 L17792；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_resolveFolder(type)`

归属：`src/features/create/payload-methods.js`；原始行 L17798；种类 method；static=False。

调用：`_draft`。

实例依赖：`_draft`。

### `_effectiveFolder(type = this._currentCreateType())`

归属：`src/features/create/payload-methods.js`；原始行 L17805；种类 method；static=False。

调用：`_resolveFolder`。

实例依赖：`_resolveFolder`。

### `_templateVariables(title, now = new Date())`

归属：`src/features/create/payload-methods.js`；原始行 L17809；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_applyTemplateVariables(content, values)`

归属：`src/features/create/payload-methods.js`；原始行 L17833；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_effectiveTemplateSetting(type = this._currentCreateType())`

归属：`src/features/create/payload-methods.js`；原始行 L17840；种类 method；static=False。

调用：`_draft`。

实例依赖：`_draft`。

### `_applyTemplateVariablesToJson(content, values)`

归属：`src/features/create/payload-methods.js`；原始行 L17848；种类 method；static=False。

调用：`_applyTemplateVariables`。

实例依赖：`_applyTemplateVariables`。

### `async _buildTemplateContent(type, title, fallback)`

归属：`src/features/create/payload-methods.js`；原始行 L17874；种类 method；static=False。

调用：`_applyTemplateVariables`, `_applyTemplateVariablesToJson`, `_effectiveTemplateSetting`, `_templateVariables`。

实例依赖：`_applyTemplateVariables`, `_applyTemplateVariablesToJson`, `_effectiveTemplateSetting`, `_templateVariables`, `owner`。

### `async _buildMarkdownContent(title)`

归属：`src/features/create/payload-methods.js`；原始行 L17905；种类 method；static=False。

调用：`_buildTemplateContent`。

实例依赖：`_buildTemplateContent`。

### `_buildExcalidrawContent(title)`

归属：`src/features/create/payload-methods.js`；原始行 L17915；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `async _buildPayload(type, title)`

归属：`src/features/create/payload-methods.js`；原始行 L17942；种类 method；static=False。

调用：`_buildExcalidrawContent`, `_buildMarkdownContent`, `_buildTemplateContent`。

实例依赖：`_buildExcalidrawContent`, `_buildMarkdownContent`, `_buildTemplateContent`。

### `async _resolvePath(core, folder, title, extension)`

归属：`src/features/create/payload-methods.js`；原始行 L17978；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_typedPropertyValue(key, normalizedValue)`

归属：`src/features/create/payload-methods.js`；原始行 L17993；种类 method；static=False。

调用：`_propertyTypeForKey`。

实例依赖：`_propertyTypeForKey`, `createDraft`, `owner`。

### `_createMetadataSnapshot(filterState)`

归属：`src/features/create/payload-methods.js`；原始行 L18015；种类 method；static=False。

调用：`_normalizeCreateProperties`, `_propertyTypeForKey`, `_typedPropertyValue`。

实例依赖：`_normalizeCreateProperties`, `_propertyTypeForKey`, `_typedPropertyValue`。

### `async createNewNote(createType, explicitTitle = "")`

归属：`src/features/create/create-file-methods.js`；原始行 L18030；种类 method；static=False。

调用：`_buildPayload`, `_createMetadataSnapshot`, `_createTypeOption`, `_currentCreateType`, `_draft`, `_effectiveCreateFilterState`, `_effectiveFolder`, `_pendingCreationSnapshot`, `_refreshCreatePreview`, `_resolvePath`, `_sanitizeTitle`, `captureDraft`, `currentCreateTitle`, `isCreateMode`, `isCreateView`, `isDerivedCreateView`, `syncInputModeView`, `toggleInputMode`。

实例依赖：`_buildPayload`, `_createInFlight`, `_createMetadataSnapshot`, `_createTypeOption`, `_currentCreateType`, `_draft`, `_effectiveCreateFilterState`, `_effectiveFolder`, `_pendingCreationSnapshot`, `_refreshCreatePreview`, `_resolvePath`, `_sanitizeTitle`, `captureDraft`, `createDraft`, `currentCreateTitle`, `inputMode`, `isCreateMode`, `isCreateView`, `isDerivedCreateView`, `owner`, `quickCreateTitle`, `syncInputModeView`, `toggleInputMode`。

## SearchSelectionController

### `constructor(owner)`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18259；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`anchorPath`, `batchMode`, `key`, `mutationState`, `owner`, `selectedPaths`, `shiftBasePaths`。

### `get busy()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18269；种类 get；static=False。

调用：无直接 this.method 调用。

实例依赖：`mutationState`。

### `resetShiftRange()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18273；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`shiftBasePaths`。

### `_iconButton(parent, icon, label, className = "", interaction = "chrome", role = "selection")`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18277；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_statItem(parent, label, value = 0)`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18290；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `buildToolbar()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18305；种类 method；static=False。

调用：`_iconButton`, `_statItem`, `enterBatchMode`, `exitBatchMode`, `submitExternalSelection`, `syncControls`, `toggleSelectAll`。

实例依赖：`_iconButton`, `_statItem`, `batchEntryBtn`, `batchMode`, `batchPanel`, `batchResultEl`, `batchSelectToggleBtn`, `batchSelectedEl`, `deleteFilesBtn`, `enterBatchMode`, `exitBatchBtn`, `exitBatchMode`, `expandActionsBtn`, `externalSubmitBtn`, `moveFilesBtn`, `normalCurrentEl`, `normalPanel`, `normalTotalEl`, `owner`, `propertyMetadataBtn`, `selectedPaths`, `submitExternalSelection`, `syncControls`, `tagMetadataBtn`, `toggleSelectAll`, `toolbar`。

### `updateStats()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18450；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`batchPanel`, `batchResultEl`, `batchSelectedEl`, `normalCurrentEl`, `normalPanel`, `normalTotalEl`, `owner`, `selectedPaths`。

### `getSelectableResults()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18470；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`。

### `enterBatchMode()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18477；种类 method；static=False。

调用：`syncUI`。

实例依赖：`batchMode`, `owner`, `syncUI`。

### `exitBatchMode()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18487；种类 method；static=False。

调用：`resetShiftRange`, `syncUI`。

实例依赖：`anchorPath`, `batchMode`, `owner`, `resetShiftRange`, `selectedPaths`, `syncUI`。

### `externalSelectedFiles()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18498；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`owner`, `selectedPaths`。

### `async submitExternalSelection()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18509；种类 method；static=False。

调用：`beginMutation`, `endMutation`, `externalSelectedFiles`。

实例依赖：`beginMutation`, `endMutation`, `externalSelectedFiles`, `owner`。

### `beginMutation(kind)`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18533；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`busy`, `mutationState`, `owner`。

### `endMutation(kind)`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18544；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`mutationState`, `owner`。

### `clearState()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18550；种类 method；static=False。

调用：`resetShiftRange`。

实例依赖：`anchorPath`, `resetShiftRange`, `selectedPaths`。

### `clear()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18556；种类 method；static=False。

调用：`resetShiftRange`, `syncUI`。

实例依赖：`anchorPath`, `resetShiftRange`, `selectedPaths`, `syncUI`。

### `selectAll()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18563；种类 method；static=False。

调用：`getSelectableResults`, `resetShiftRange`, `syncUI`。

实例依赖：`anchorPath`, `batchMode`, `getSelectableResults`, `resetShiftRange`, `selectedPaths`, `syncUI`。

### `toggleSelectAll()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18571；种类 method；static=False。

调用：`getSelectableResults`, `resetShiftRange`, `selectAll`, `syncUI`。

实例依赖：`anchorPath`, `batchMode`, `getSelectableResults`, `resetShiftRange`, `selectAll`, `selectedPaths`, `syncUI`。

### `togglePath(path)`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18586；种类 method；static=False。

调用：`resetShiftRange`, `syncControls`, `syncRenderedItem`。

实例依赖：`anchorPath`, `batchMode`, `owner`, `resetShiftRange`, `selectedPaths`, `syncControls`, `syncRenderedItem`。

### `selectRangeTo(index)`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18597；种类 method；static=False。

调用：`getSelectableResults`, `resetShiftRange`, `syncUI`。

实例依赖：`anchorPath`, `batchMode`, `getSelectableResults`, `owner`, `resetShiftRange`, `selectedPaths`, `shiftBasePaths`, `syncUI`。

### `retainPaths(validPaths)`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18640；种类 method；static=False。

调用：`resetShiftRange`。

实例依赖：`anchorPath`, `resetShiftRange`, `selectedPaths`。

### `removePaths(paths)`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18647；种类 method；static=False。

调用：`resetShiftRange`。

实例依赖：`anchorPath`, `resetShiftRange`, `selectedPaths`。

### `remapPathState(oldPath, newPath, { descendants = false } = {})`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18654；种类 method；static=False。

调用：`resetShiftRange`。

实例依赖：`anchorPath`, `owner`, `resetShiftRange`, `selectedPaths`。

### `removePathPrefix(path)`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18663；种类 method；static=False。

调用：`resetShiftRange`。

实例依赖：`anchorPath`, `resetShiftRange`, `selectedPaths`。

### `syncControls()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18675；种类 method；static=False。

调用：`updateStats`。

实例依赖：`batchEntryBtn`, `batchMode`, `batchPanel`, `batchSelectToggleBtn`, `deleteFilesBtn`, `exitBatchBtn`, `expandActionsBtn`, `externalSubmitBtn`, `moveFilesBtn`, `normalPanel`, `owner`, `propertyMetadataBtn`, `selectedPaths`, `tagMetadataBtn`, `toolbar`, `updateStats`。

### `syncElement(el, path)`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18739；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`batchMode`, `selectedPaths`。

### `syncRenderedItem(path)`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18763；种类 method；static=False。

调用：`syncElement`。

实例依赖：`owner`, `syncElement`。

### `syncUI()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18771；种类 method；static=False。

调用：`syncControls`, `syncElement`。

实例依赖：`owner`, `syncControls`, `syncElement`。

### `destroy()`

归属：`src/features/selection/SearchSelectionController.js`；原始行 L18781；种类 method；static=False。

调用：`resetShiftRange`。

实例依赖：`anchorPath`, `batchMode`, `key`, `mutationState`, `owner`, `resetShiftRange`, `selectedPaths`。

## SharedSearchStateCoordinator

### `constructor(plugin)`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18795；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`members`, `plugin`, `revision`, `state`。

### `_normalize(source)`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18802；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`plugin`。

### `_capture(core)`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18815；种类 method；static=False。

调用：`_normalize`。

实例依赖：`_normalize`。

### `_same(left, right)`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18829；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `transformFilters(transform)`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18834；种类 method；static=False。

调用：`_normalize`, `_remember`, `_same`, `schedule`。

实例依赖：`_normalize`, `_remember`, `_same`, `members`, `plugin`, `revision`, `schedule`, `state`。

### `attach(core)`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18857；种类 method；static=False。

调用：`_capture`, `_normalize`, `_remember`, `consume`。

实例依赖：`_capture`, `_normalize`, `_remember`, `consume`, `members`, `plugin`, `revision`, `state`。

### `_remember()`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18874；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`plugin`, `revision`, `state`。

### `publish(core, { closing = false } = {})`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18884；种类 method；static=False。

调用：`_capture`, `_normalize`, `_remember`, `_same`, `schedule`。

实例依赖：`_capture`, `_normalize`, `_remember`, `_same`, `members`, `revision`, `schedule`, `state`。

### `_blocked(core)`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18925；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `schedule(core)`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18935；种类 method；static=False。

调用：`consume`。

实例依赖：`consume`, `members`, `revision`。

### `consume(core)`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18945；种类 method；static=False。

调用：`_blocked`, `_capture`, `_same`。

实例依赖：`_blocked`, `_capture`, `_same`, `members`, `revision`, `state`。

### `restored(core)`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18977；种类 method；static=False。

调用：`_capture`, `consume`。

实例依赖：`_capture`, `consume`, `members`。

### `detach(core)`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18985；种类 method；static=False。

调用：`publish`。

实例依赖：`members`, `publish`。

### `destroy()`

归属：`src/core/SharedSearchStateCoordinator.js`；原始行 L18990；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`members`, `plugin`。

## NavigatorCustomization

### `constructor(core, { scroll, onChanged = null } = {})`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19126；种类 constructor；static=False。

调用：`_maintenanceDefinition`, `_runMaintenance`, `commitSort`, `openMenu`。

实例依赖：`_actionAnchorClick`, `_actionPanel`, `_contextMenu`, `_destroyed`, `_maintenanceClick`, `_maintenanceDefinition`, `_runMaintenance`, `_writes`, `commitSort`, `coordinator`, `core`, `lists`, `maintenanceMode`, `onChanged`, `openMenu`, `rows`, `scroll`, `sortMode`。

### `get state()`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19183；种类 get；static=False。

调用：无直接 this.method 调用。

实例依赖：`_normalizedState`, `_stateSource`, `core`。

### `_folderColors()`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19192；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_folderColorSource`, `_normalizedFolderColors`, `core`。

### `descriptor(value, parentId = value?.parentId || "")`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19201；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `beginRender()`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19210；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`rows`。

### `order(parentId, values)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19216；种类 method；static=False。

调用：`descriptor`。

实例依赖：`core`, `descriptor`, `lists`, `state`。

### `_inheritance(descriptor)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19258；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `resolvedAppearance(descriptor)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19273；种类 method；static=False。

调用：`_folderColors`, `_inheritance`。

实例依赖：`_folderColors`, `_inheritance`, `state`。

### `decorate(row, value)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19290；种类 method；static=False。

调用：`_decorateMaintenance`, `commitSort`, `descriptor`, `resolvedAppearance`。

实例依赖：`_decorateMaintenance`, `commitSort`, `descriptor`, `lists`, `resolvedAppearance`, `rows`, `sortMode`。

### `_maintenanceDefinition(descriptor)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19337；种类 method；static=False。

调用：`_maintenanceTarget`。

实例依赖：`_maintenanceTarget`, `core`, `maintenanceMode`。

### `_maintenanceTarget(descriptor)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19344；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_runMaintenance(descriptor, anchor)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19350；种类 method；static=False。

调用：`_maintenanceDefinition`, `_maintenanceTarget`。

实例依赖：`_destroyed`, `_maintenanceDefinition`, `_maintenanceTarget`, `core`。

### `_decorateMaintenance(row, descriptor)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19364；种类 method；static=False。

调用：`_maintenanceDefinition`, `_maintenanceTarget`, `_runMaintenance`。

实例依赖：`_maintenanceDefinition`, `_maintenanceTarget`, `_runMaintenance`, `core`, `rows`。

### `setMaintenanceMode(kind = "", id = "")`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19386；种类 method；static=False。

调用：`_decorateMaintenance`, `onChanged`, `setSortMode`。

实例依赖：`_decorateMaintenance`, `core`, `maintenanceMode`, `onChanged`, `rows`, `setSortMode`。

### `renderSeparator(parent, descriptor, depth = 0)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19395；种类 method；static=False。

调用：`_run`, `decorate`, `openMenu`, `removeSeparator`。

实例依赖：`_run`, `decorate`, `openMenu`, `removeSeparator`, `rows`, `sortMode`。

### `finishRender()`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19426；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`coordinator`, `rows`, `sortMode`。

### `setSortMode(value)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19431；种类 method；static=False。

调用：`_decorateMaintenance`, `onChanged`。

实例依赖：`_decorateMaintenance`, `coordinator`, `maintenanceMode`, `onChanged`, `rows`, `sortMode`。

### `_notify()`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19448；种类 method；static=False。

调用：`onChanged`。

实例依赖：`_destroyed`, `core`, `onChanged`。

### `_write(change)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19461；种类 method；static=False。

调用：`_notify`。

实例依赖：`_destroyed`, `_notify`, `_writes`, `core`, `state`。

### `setAppearance(id, patch)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19491；种类 method；static=False。

调用：`_write`。

实例依赖：`_write`。

### `addSeparator(value, placement = "after")`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19510；种类 method；static=False。

调用：`_write`, `descriptor`。

实例依赖：`_write`, `descriptor`, `lists`, `scroll`。

### `updateSeparator(id, patch)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19527；种类 method；static=False。

调用：`_write`。

实例依赖：`_write`。

### `removeSeparator(id)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19533；种类 method；static=False。

调用：`_write`。

实例依赖：`_write`。

### `async commitSort({ key, meta = {}, mode = "reorder", beforeKey = null, parentKey = meta.parentKey || "", visibleBoundary = false })`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19535；种类 method；static=False。

调用：`_write`。

实例依赖：`_destroyed`, `_write`, `coordinator`, `lists`。

### `_run(action)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19573；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_destroyed`。

### `openMenu(event, value, row)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19577；种类 method；static=False。

调用：`_run`, `addSeparator`, `descriptor`, `openColorEditor`, `removeSeparator`, `resolvedAppearance`, `setAppearance`, `setSortMode`, `updateSeparator`。

实例依赖：`_actionPanel`, `_destroyed`, `_run`, `addSeparator`, `coordinator`, `core`, `descriptor`, `openColorEditor`, `removeSeparator`, `resolvedAppearance`, `setAppearance`, `setSortMode`, `sortMode`, `state`, `updateSeparator`。

### `openColorEditor(descriptor, field)`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19640；种类 method；static=False。

调用：`_run`, `resolvedAppearance`, `setAppearance`, `updateSeparator`。

实例依赖：`_run`, `core`, `resolvedAppearance`, `setAppearance`, `state`, `updateSeparator`。

### `destroy()`

归属：`src/features/navigator/NavigatorCustomization.js`；原始行 L19699；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_actionAnchorClick`, `_actionPanel`, `_contextMenu`, `_destroyed`, `_maintenanceClick`, `coordinator`, `core`, `lists`, `rows`, `scroll`。

## SearchNavigatorController

### `constructor(core, workspace, facets, main)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L19713；种类 constructor；static=False。

调用：`_buildMobileToolbar`, `_listen`, `_syncMobileTools`, `back`, `clearSidebarMode`, `prepareSearch`, `refreshPreferences`, `resize`, `showResults`, `sync`。

实例依赖：`_buildMobileToolbar`, `_listen`, `_projectionCache`, `_syncMobileTools`, `back`, `backButton`, `cleanups`, `clearSidebarMode`, `collapsed`, `core`, `customization`, `expanded`, `facets`, `footer`, `header`, `headingTitle`, `layout`, `main`, `observer`, `page`, `prepareSearch`, `refreshPreferences`, `renderRevision`, `resize`, `resultHeading`, `resultTitle`, `resultsButton`, `root`, `scroll`, `searchVisible`, `sections`, `showResults`, `sync`, `workspace`。

### `_listen(node, type, fn, options)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L19780；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`cleanups`。

### `_buildMobileToolbar()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L19785；种类 method；static=False。

调用：`_definitions`, `_listen`, `_syncMobileTools`, `openSidebarTools`, `prepareSearch`, `setPage`, `showResults`, `sync`, `syncPage`。

实例依赖：`_addToolbarAction`, `_definitions`, `_listen`, `_syncMobileTools`, `collapsed`, `core`, `expanded`, `layout`, `mobileToolbar`, `movedTools`, `openSidebarTools`, `page`, `prepareSearch`, `renderRevision`, `resultsButton`, `root`, `searchVisible`, `setPage`, `showResults`, `sync`, `syncPage`, `tools`。

### `_placeMobileTools(mobile)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L19863；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`mobileToolbar`, `movedTools`。

### `_syncMobileTools()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L19871；种类 method；static=False。

调用：`_addToolbarAction`, `_definitions`, `_releaseToolbarAnchor`, `_runAdditionalToolbarAction`, `_scopeTitle`。

实例依赖：`_addToolbarAction`, `_definitions`, `_releaseToolbarAnchor`, `_runAdditionalToolbarAction`, `_scopeTitle`, `_toolbarOrderKey`, `collapsed`, `core`, `customization`, `headingTitle`, `layout`, `mobileToolbar`, `page`, `root`, `searchVisible`, `tools`。

### `_releaseToolbarAnchor(tool)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L19962；种类 method；static=False。

调用：`_syncMobileTools`。

实例依赖：`_pendingToolbarSyncPanel`, `_syncMobileTools`, `core`。

### `_runAdditionalToolbarAction(id, anchor)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L19984；种类 method；static=False。

调用：`prepareSearch`, `showResults`。

实例依赖：`core`, `page`, `prepareSearch`, `showResults`。

### `_scopeTitle()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20004；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`core`。

### `openSidebarTools(anchor)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20017；种类 method；static=False。

调用：`_definitions`, `clearSidebarMode`, `setSortMode`, `sync`。

实例依赖：`_definitions`, `clearSidebarMode`, `collapsed`, `core`, `customization`, `renderRevision`, `setSortMode`, `sync`。

### `clearSidebarMode()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20056；种类 method；static=False。

调用：`setSortMode`。

实例依赖：`customization`, `setSortMode`。

### `_definitions()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20061；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`core`, `layout`。

### `capture()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20068；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_filterScrollTop`, `collapsed`, `expanded`, `facets`, `page`, `scroll`, `searchVisible`。

### `hiddenResultAnchor()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20074；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`core`, `main`, `resultAnchor`。

### `restore(state, resultAnchor = null)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20080；种类 method；static=False。

调用：`resize`, `sync`。

实例依赖：`_filterScrollTop`, `_restoreScrollTop`, `_restoringPage`, `collapsed`, `expanded`, `page`, `renderRevision`, `resize`, `resultAnchor`, `searchVisible`, `sync`。

### `resize()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20097；种类 method；static=False。

调用：`_placeMobileTools`, `sync`, `syncPage`。

实例依赖：`_placeMobileTools`, `core`, `facets`, `header`, `layout`, `renderRevision`, `root`, `sync`, `syncPage`, `width`。

### `refreshPreferences()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20115；种类 method；static=False。

调用：`_syncMobileTools`, `sync`。

实例依赖：`_cacheRevision`, `_projectionCache`, `_syncMobileTools`, `core`, `renderRevision`, `sections`, `sync`。

### `_refreshAfterMaintenance(kind, detail = {})`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20125；种类 method；static=False。

调用：`refreshPreferences`。

实例依赖：`expanded`, `refreshPreferences`。

### `setSortMode(enabled)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20140；种类 method；static=False。

调用：`_syncMobileTools`。

实例依赖：`_syncMobileTools`, `core`, `customization`。

### `syncPage()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20147；种类 method；static=False。

调用：`_syncMobileTools`。

实例依赖：`_filterScrollTop`, `_restoringPage`, `_syncMobileTools`, `backButton`, `core`, `facets`, `footer`, `layout`, `main`, `mobileToolbar`, `page`, `resultAnchor`, `root`, `scroll`。

### `setPage(page, notify = true)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20183；种类 method；static=False。

调用：`sync`, `syncPage`。

实例依赖：`core`, `page`, `sync`, `syncPage`。

### `showResults(commitInput = true)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20193；种类 method；static=False。

调用：`setPage`。

实例依赖：`core`, `page`, `searchVisible`, `setPage`。

### `back()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20204；种类 method；static=False。

调用：`prepareSearch`, `setPage`。

实例依赖：`core`, `layout`, `page`, `prepareSearch`, `resultsButton`, `searchVisible`, `setPage`。

### `prepareSearch()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20221；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`core`。

### `select(kind, value, key = "")`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20236；种类 method；static=False。

调用：`prepareSearch`, `showResults`。

实例依赖：`core`, `layout`, `prepareSearch`, `showResults`。

### `openSection(kind, anchor)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20248；种类 method；static=False。

调用：`_trackPicker`, `prepareSearch`。

实例依赖：`_trackPicker`, `core`, `prepareSearch`。

### `_openProperty(key, anchor)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20263；种类 method；static=False。

调用：`_trackPicker`, `prepareSearch`。

实例依赖：`_trackPicker`, `core`, `prepareSearch`。

### `_trackPicker(before)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20270；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`core`, `page`, `pickerFlow`。

### `didClosePicker()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20277；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`pickerFlow`。

### `_section(id, title, icon)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20285；种类 method；static=False。

调用：`openSection`, `sync`。

实例依赖：`collapsed`, `core`, `layout`, `openSection`, `renderRevision`, `scroll`, `sections`, `sync`。

### `_row(ref, options)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20316；种类 method；static=False。

调用：`_placeProjectionRow`。

实例依赖：`_placeProjectionRow`, `customization`, `layout`。

### `_placeProjectionRow(ref, id, row)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20372；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_separator(ref, descriptor, depth = 0)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20378；种类 method；static=False。

调用：`_placeProjectionRow`。

实例依赖：`_placeProjectionRow`, `customization`, `layout`。

### `_finishProjectionRows(ref)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20393；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_more(ref, kind, text = "显示全部…")`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20399；种类 method；static=False。

调用：`_row`, `openSection`。

实例依赖：`_row`, `openSection`。

### `_cached(key, build)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20404；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_projectionCache`。

### `_propertyKeys(universe)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20409；种类 method；static=False。

调用：`_cached`。

实例依赖：`_cached`, `core`, `customization`。

### `_propertyStats(key, universe, state)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20415；种类 method；static=False。

调用：`_cached`。

实例依赖：`_cached`, `core`。

### `_tree(ref, roots, keyPrefix, row, kind, fixed = null)`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20423；种类 method；static=False。

调用：`_more`, `_row`, `_separator`, `sync`。

实例依赖：`_more`, `_row`, `_separator`, `core`, `customization`, `expanded`, `renderRevision`, `sync`。

### `sync()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20449；种类 method；static=False。

调用：`_renderProjection`, `_scopeTitle`, `_syncMobileTools`, `setPage`。

实例依赖：`_projectionTimer`, `_renderProjection`, `_scopeTitle`, `_syncMobileTools`, `core`, `layout`, `page`, `renderRevision`, `resultTitle`, `resultsButton`, `root`, `setPage`。

### `_renderProjection()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20471；种类 method；static=False。

调用：`_cached`, `_definitions`, `_finishProjectionRows`, `_more`, `_openProperty`, `_propertyKeys`, `_propertyStats`, `_row`, `_section`, `_separator`, `_tree`, `select`, `sync`, `syncPage`。

实例依赖：`_cacheRevision`, `_cached`, `_definitions`, `_filterScrollTop`, `_finishProjectionRows`, `_groupSeparators`, `_more`, `_openProperty`, `_projectionCache`, `_propertyKeys`, `_propertyStats`, `_restoreScrollTop`, `_row`, `_section`, `_separator`, `_tree`, `core`, `customization`, `expanded`, `facets`, `layout`, `page`, `renderRevision`, `root`, `scroll`, `sections`, `select`, `sync`, `syncPage`。

### `destroy()`

归属：`src/features/navigator/SearchNavigatorController.js`；原始行 L20660；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_projectionTimer`, `cleanups`, `core`, `customization`, `observer`, `root`。

## SearchCore

### `constructor(app, plugin, containerEl, options = {})`

归属：`src/core/SearchCore.js`；原始行 L20675；种类 constructor；static=False。

调用：`_clearUiRefs`。

实例依赖：`_browseSortField`, `_clearUiRefs`, `_confirmSession`, `_destroyed`, `_initialViewportAnchor`, `_pendingResultUpdate`, `_resultGeneration`, `_resultUpdateQueued`, `_snippetIoPool`, `allowCreate`, `app`, `batchMetadata`, `bodyExpanded`, `closeAfterFileOpen`, `closeOnExternalPick`, `closeOnExternalSelectionSubmit`, `containerEl`, `createFlow`, `dropdown`, `externalCreateFolder`, `externalCreateProperties`, `externalCreateType`, `externalOpenFileHandler`, `externalPathScope`, `externalPickHandler`, `externalSelectionActionLabel`, `externalSelectionHandler`, `externalSelectionStartInBatchMode`, `facets`, `filterState`, `fullResults`, `headingCaptionText`, `headingTitleText`, `hostKind`, `ignoreResultExclusions`, `initialCreate`, `isWorkspaceHost`, `loadedPaths`, `onCloseRequest`, `onExternalCreated`, `onFileOpened`, `onStateChange`, `persistModalSession`, `plugin`, `queryState`, `renderedResults`, `resultControls`, `resultEls`, `resultRenderer`, `searchTimer`, `selectedIndex`, `selection`, `sessionKey`, `sharedSearchState`, `sortDirection`, `sortField`, `sorting`, `swipe`, `workbenchPresentation`, `workbenchToolbarHost`, `workbenchToolsExpanded`。

### `_clearUiRefs()`

归属：`src/core/SearchCore.js`；原始行 L20777；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`key`。

### `popupSurfaceHost()`

归属：`src/core/search/shell-methods.js`；原始行 L20784；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_popupHost`, `containerEl`, `plugin`。

### `async mountShell()`

归属：`src/core/search/shell-methods.js`；原始行 L20793；种类 method；static=False。

调用：`_bindResultEvents`, `_bindSearchInput`, `_buildFilterBar`, `_buildResultShell`, `_buildSearchHeader`, `_buildWorkspaceLayout`, `_syncWorkbenchPresentation`。

实例依赖：`_bindResultEvents`, `_bindSearchInput`, `_buildFilterBar`, `_buildResultShell`, `_buildSearchHeader`, `_buildWorkspaceLayout`, `_destroyed`, `_syncWorkbenchPresentation`, `containerEl`, `createFlow`, `facets`, `initialCreate`, `isWorkspaceHost`, `plugin`, `resultControls`。

### `async startResults()`

归属：`src/core/search/shell-methods.js`；原始行 L20826；种类 method；static=False。

调用：`_initializeResultState`, `destroy`。

实例依赖：`_destroyed`, `_initializeResultState`, `containerEl`, `destroy`, `plugin`。

### `async init()`

归属：`src/core/search/shell-methods.js`；原始行 L20852；种类 method；static=False。

调用：`mountShell`, `startResults`。

实例依赖：`mountShell`, `startResults`。

### `_releaseSearchFocusForControl()`

归属：`src/core/search/shell-methods.js`；原始行 L20863；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`searchInput`。

### `_buildSearchHeader()`

归属：`src/core/search/shell-methods.js`；原始行 L20875；种类 method；static=False。

调用：`_syncSearchHeaderControls`, `onCloseRequest`。

实例依赖：`_syncSearchHeaderControls`, `containerEl`, `headingCaptionText`, `headingTitleText`, `isWorkspaceHost`, `onCloseRequest`, `queryState`, `resultControls`, `searchInput`。

### `_syncSearchHeaderControls()`

归属：`src/core/search/shell-methods.js`；原始行 L20927；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`resultControls`。

### `_syncWorkbenchPresentation()`

归属：`src/core/search/shell-methods.js`；原始行 L20933；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`containerEl`, `createFlow`, `workbenchPresentation`, `workbenchToolsButton`, `workbenchToolsExpanded`。

### `_buildFilterBar()`

归属：`src/core/search/shell-methods.js`；原始行 L20948；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_workbenchToolbar`, `containerEl`, `dropdown`, `facets`, `folderBtn`, `propertyFilterBtn`, `sorting`, `tagFilterBtn`, `workbenchToolbarHost`。

### `_buildResultShell()`

归属：`src/core/search/shell-methods.js`；原始行 L21013；种类 method；static=False。

调用：`_clearSearchContext`。

实例依赖：`_clearSearchContext`, `_destroyed`, `activeFilterWrap`, `clearFiltersBtn`, `containerEl`, `createFlow`, `filterPoolHost`, `filterPoolShortcuts`, `filterPoolValues`, `propertyFilterRow`, `resultChannelHost`, `resultRenderer`, `resultStateSeparator`, `resultsContainer`, `resultsRail`, `resultsShell`, `selection`。

### `_clearSearchContext()`

归属：`src/core/search/shell-methods.js`；原始行 L21081；种类 method；static=False。

调用：`_onFilterChanged`, `_syncSearchHeaderControls`。

实例依赖：`_onFilterChanged`, `_syncSearchHeaderControls`, `createFlow`, `dropdown`, `filterState`, `queryState`, `searchInput`, `searchTimer`。

### `_syncResultStateRow()`

归属：`src/core/search/shell-methods.js`；原始行 L21111；种类 method；static=False。

调用：`_syncWorkbenchPresentation`。

实例依赖：`_syncWorkbenchPresentation`, `activeFilterWrap`, `clearFiltersBtn`, `createFlow`, `filterState`, `propertyFilterRow`, `queryState`, `resultChannelHost`, `resultStateSeparator`。

### `_buildWorkspaceLayout()`

归属：`src/core/search/shell-methods.js`；原始行 L21157；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`containerEl`, `filterPoolHost`, `hostKind`, `navigator`, `propertyFilterRow`, `resultsShell`, `selection`。

### `_getResultFileMenuContext(anchorFile)`

归属：`src/core/search/result-menu-events-methods.js`；原始行 L21169；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`, `fullResults`, `selection`。

### `async _openFilesInNewTabs(files)`

归属：`src/core/search/result-menu-events-methods.js`；原始行 L21211；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`, `externalOpenFileHandler`。

### `_buildResultFileMenu(menu, context)`

归属：`src/core/search/result-menu-events-methods.js`；原始行 L21227；种类 method；static=False。

调用：`_openFilesInNewTabs`。

实例依赖：`_openFilesInNewTabs`。

### `_extendResultFileMenu(menu, context)`

归属：`src/core/search/result-menu-events-methods.js`；原始行 L21236；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`。

### `_showResultFileMenu(file, mouseEvent)`

归属：`src/core/search/result-menu-events-methods.js`；原始行 L21245；种类 method；static=False。

调用：`_buildResultFileMenu`, `_extendResultFileMenu`, `_getResultFileMenuContext`。

实例依赖：`_buildResultFileMenu`, `_extendResultFileMenu`, `_getResultFileMenuContext`。

### `_bindResultEvents()`

归属：`src/core/search/result-menu-events-methods.js`；原始行 L21258；种类 method；static=False。

调用：`_applyResultQuickFilter`, `_chooseExternalFile`, `_findCurrentResult`, `_onFilterChanged`, `_openResultFromSearch`, `_resolveResultElement`, `_showResultFileMenu`。

实例依赖：`_applyResultQuickFilter`, `_chooseExternalFile`, `_confirmSession`, `_destroyed`, `_findCurrentResult`, `_onFilterChanged`, `_openResultFromSearch`, `_resolveResultElement`, `_showResultFileMenu`, `app`, `containerEl`, `externalPickHandler`, `externalSelectionHandler`, `folderBtn`, `propertyFilterBtn`, `resultsContainer`, `selection`, `tagFilterBtn`, `typeButtonEls`。

### `_initializeResultState()`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21424；种类 method；static=False。

调用：`performSearch`。

实例依赖：`createFlow`, `performSearch`, `queryState`, `resultRenderer`, `searchInput`。

### `_commitSearchInputValue()`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21439；种类 method；static=False。

调用：`_notifyStateChange`, `_syncSearchHeaderControls`, `performSearch`。

实例依赖：`_destroyed`, `_inputComposing`, `_notifyStateChange`, `_syncSearchHeaderControls`, `createFlow`, `performSearch`, `queryState`, `searchInput`, `searchTimer`, `selection`。

### `_bindSearchInput()`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21471；种类 method；static=False。

调用：`_commitSearchInputValue`, `_openResultFromSearch`, `_resolveResultElement`, `close`, `openSelectedNote`, `performSearch`。

实例依赖：`_commitSearchInputValue`, `_confirmSession`, `_destroyed`, `_inputComposing`, `_openResultFromSearch`, `_resolveResultElement`, `close`, `containerEl`, `createFlow`, `dropdown`, `openSelectedNote`, `performSearch`, `plugin`, `renderedResults`, `resultEls`, `resultRenderer`, `searchInput`, `searchTimer`, `selectedIndex`, `selection`。

### `_applyResultQuickFilter(kind, value, key = "")`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21580；种类 method；static=False。

调用：`_applyFacetSelection`。

实例依赖：`_applyFacetSelection`, `filterState`。

### `_applyFacetSelectionToState(state, kind, value, { key = "", mode = "replace" } = {})`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21619；种类 method；static=False。

调用：`_normalizeTagSelection`。

实例依赖：`_normalizeTagSelection`。

### `_applyFacetSelection(kind, value, options = {})`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21741；种类 method；static=False。

调用：`_applyFacetSelectionToState`。

实例依赖：`_applyFacetSelectionToState`, `filterState`。

### `_normalizeTagSelection(values)`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21750；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_prepareResultVisibility()`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21754；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`ignoreResultExclusions`, `plugin`。

### `_isResultMetaVisible(meta, includeExcludedAttachments = false, prepared = null)`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21765；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`externalPathScope`, `ignoreResultExclusions`, `plugin`。

### `_visibleVaultFileCount()`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21790；种类 method；static=False。

调用：`_isResultMetaVisible`, `_prepareResultVisibility`。

实例依赖：`_isResultMetaVisible`, `_prepareResultVisibility`, `externalPathScope`, `ignoreResultExclusions`, `plugin`。

### `_facetUniverse(query = this.queryState, includeExcludedAttachments = false)`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21811；种类 method；static=False。

调用：`_isResultMetaVisible`, `_matchCandidate`, `_prepareResultVisibility`。

实例依赖：`_isResultMetaVisible`, `_matchCandidate`, `_prepareResultVisibility`, `createFlow`, `plugin`。

### `_facetCandidates(
        ignore = "",
        propertyKey = "",
        universe = null,
        filterState = this.filterState
    )`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21826；种类 method；static=False。

调用：`_facetUniverse`。

实例依赖：`_facetUniverse`, `createFlow`, `filterState`。

### `_onFilterChanged(rawQuery = this.queryState.raw)`

归属：`src/core/search/input-and-filters-methods.js`；原始行 L21855；种类 method；static=False。

调用：`_notifyStateChange`, `performSearch`。

实例依赖：`_notifyStateChange`, `createFlow`, `facets`, `performSearch`, `resultControls`。

### `_findCurrentResult(path)`

归属：`src/core/search/file-actions-methods.js`；原始行 L21868；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`fullResults`。

### `_beginTitleRenameByPath(path)`

归属：`src/core/search/file-actions-methods.js`；原始行 L21877；种类 method；static=False。

调用：`_findCurrentResult`, `_startTitleRename`。

实例依赖：`_confirmSession`, `_findCurrentResult`, `_startTitleRename`, `resultRenderer`, `resultsContainer`。

### `_startTitleRename(itemEl, result)`

归属：`src/core/search/file-actions-methods.js`；原始行 L21902；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_confirmSession`, `_destroyed`, `app`, `plugin`, `selection`。

### `_filesFromPaths(paths)`

归属：`src/core/search/file-actions-methods.js`；原始行 L21939；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`。

### `showMovePickerForFiles(files, anchor)`

归属：`src/core/search/file-actions-methods.js`；原始行 L21953；种类 method；static=False。

调用：`_facetCandidates`, `moveFiles`。

实例依赖：`_destroyed`, `_facetCandidates`, `app`, `dropdown`, `moveFiles`, `plugin`, `selection`。

### `async moveFiles(files, targetFolder)`

归属：`src/core/search/file-actions-methods.js`；原始行 L22013；种类 method；static=False。

调用：`_refreshCurrentResultsAfterMutation`。

实例依赖：`_refreshCurrentResultsAfterMutation`, `plugin`, `selection`。

### `_confirmAction({
        title,
        message = "",
        detail = "",
        confirmText = "确认",
        danger = false,
        allowDontAskAgain = false
    } = {})`

归属：`src/core/search/file-actions-methods.js`；原始行 L22039；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `async handleSwipeAction(action, path, anchor = null)`

归属：`src/core/search/file-actions-methods.js`；原始行 L22078；种类 method；static=False。

调用：`_beginTitleRenameByPath`, `deleteFiles`, `showMovePickerForFiles`。

实例依赖：`_beginTitleRenameByPath`, `_confirmSession`, `_destroyed`, `app`, `batchMetadata`, `deleteFiles`, `dropdown`, `selection`, `showMovePickerForFiles`。

### `async deleteFiles(files)`

归属：`src/core/search/file-actions-methods.js`；原始行 L22107；种类 method；static=False。

调用：`_confirmAction`, `_refreshCurrentResultsAfterMutation`。

实例依赖：`_confirmAction`, `_refreshCurrentResultsAfterMutation`, `plugin`, `selection`。

### `destroy()`

归属：`src/core/SearchCore.js`；原始行 L22153；种类 method；static=False。

调用：`_clearUiRefs`, `checkpointCreateSession`。

实例依赖：`_clearUiRefs`, `_confirmSession`, `_destroyed`, `_initialViewportAnchor`, `_pendingResultUpdate`, `_popupHost`, `_resultGeneration`, `_workbenchToolbar`, `batchMetadata`, `checkpointCreateSession`, `closeAfterFileOpen`, `containerEl`, `createFlow`, `dropdown`, `externalOpenFileHandler`, `externalPathScope`, `externalPickHandler`, `externalSelectionHandler`, `facets`, `fullResults`, `loadedPaths`, `navigator`, `onCloseRequest`, `onExternalCreated`, `onStateChange`, `plugin`, `renderedResults`, `resultControls`, `resultEls`, `resultRenderer`, `searchTimer`, `selectedIndex`, `selection`, `sorting`, `swipe`, `workbenchToolbarHost`, `workbenchToolsButton`。

### `close(options = {})`

归属：`src/core/SearchCore.js`；原始行 L22215；种类 method；static=False。

调用：`onCloseRequest`。

实例依赖：`_confirmSession`, `_destroyed`, `onCloseRequest`, `selection`。

### `_captureCurrentModalSession({ excludedPaths = null } = {})`

归属：`src/core/search/session-methods.js`；原始行 L22226；种类 method；static=False。

调用：`captureSession`。

实例依赖：`_destroyed`, `captureSession`, `isWorkspaceHost`, `persistModalSession`。

### `captureSession({ excludedPaths = null } = {})`

归属：`src/core/search/session-methods.js`；原始行 L22231；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_browseSortField`, `_destroyed`, `bodyExpanded`, `createFlow`, `filterState`, `navigator`, `queryState`, `resultRenderer`, `searchInput`, `selection`, `sortDirection`, `sortField`, `workbenchToolsExpanded`。

### `restoreSession(session)`

归属：`src/core/search/session-methods.js`；原始行 L22273；种类 method；static=False。

调用：`suspendInteractions`。

实例依赖：`_browseSortField`, `_destroyed`, `_initialViewportAnchor`, `_restoringSharedSearchState`, `_resultGeneration`, `bodyExpanded`, `createFlow`, `facets`, `filterState`, `navigator`, `plugin`, `queryState`, `searchInput`, `searchTimer`, `selection`, `sortDirection`, `sortField`, `suspendInteractions`, `workbenchToolsExpanded`。

### `checkpointCreateSession({ persist = true } = {})`

归属：`src/core/search/session-methods.js`；原始行 L22305；种类 method；static=False。

调用：`captureSession`。

实例依赖：`_destroyed`, `captureSession`, `hostKind`, `plugin`, `sessionKey`。

### `_notifyStateChange()`

归属：`src/core/search/session-methods.js`；原始行 L22310；种类 method；static=False。

调用：`onStateChange`。

实例依赖：`_destroyed`, `navigator`, `onStateChange`, `plugin`。

### `suspendInteractions()`

归属：`src/core/search/session-methods.js`；原始行 L22318；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_confirmSession`, `_destroyed`, `dropdown`, `swipe`。

### `_persistModalSessionSnapshot(session, { persist = true } = {})`

归属：`src/core/search/session-methods.js`；原始行 L22325；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_destroyed`, `isWorkspaceHost`, `persistModalSession`, `plugin`。

### `_persistCurrentModalView(options = {})`

归属：`src/core/search/session-methods.js`；原始行 L22332；种类 method；static=False。

调用：`_captureCurrentModalSession`, `_persistModalSessionSnapshot`。

实例依赖：`_captureCurrentModalSession`, `_persistModalSessionSnapshot`。

### `_shouldCloseAfterFileOpen()`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22345；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`closeAfterFileOpen`, `isWorkspaceHost`。

### `async _openResultFromSearch(file, {
        newTab = false,
        forceKeepOpen = false,
        excludedPath = file?.path || ""
    } = {})`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22350；种类 method；static=False。

调用：`_captureCurrentModalSession`, `_shouldCloseAfterFileOpen`, `close`, `onFileOpened`。

实例依赖：`_captureCurrentModalSession`, `_shouldCloseAfterFileOpen`, `app`, `close`, `externalOpenFileHandler`, `hostKind`, `onFileOpened`, `plugin`, `queryState`。

### `_openedRankMap()`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22441；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`plugin`。

### `_compareResults(a, b, field, direction, openedRank = null)`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22446；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_matchCandidate(meta, query = this.queryState)`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22490；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`plugin`。

### `_rankCandidates(candidates, query, filter = null, retained = [])`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22509；种类 method；static=False。

调用：`_compareResults`, `_isResultMetaVisible`, `_matchCandidate`, `_openedRankMap`, `_prepareResultVisibility`。

实例依赖：`_compareResults`, `_isResultMetaVisible`, `_matchCandidate`, `_openedRankMap`, `_prepareResultVisibility`, `filterState`, `plugin`, `sortDirection`, `sortField`。

### `_recomputeCurrentResults({ preserveSelection = true, changedPaths = null } = {})`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22559；种类 method；static=False。

调用：`_rankCandidates`, `_residentResultKey`。

实例依赖：`_rankCandidates`, `_residentResultKey`, `_resultGeneration`, `bestResultCount`, `bodyExpanded`, `bodyResultCount`, `createFlow`, `filterState`, `fullResults`, `loadedPaths`, `navigator`, `plugin`, `queryState`, `resultControls`, `selection`, `sortField`。

### `_residentResultKey(filter)`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22594；种类 method；static=False。

调用：`_residentResultScope`。

实例依赖：`_residentResultScope`, `plugin`, `queryState`, `sortDirection`, `sortField`。

### `_residentResultScope()`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22602；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`externalPathScope`, `ignoreResultExclusions`, `plugin`。

### `_refreshCurrentResultsAfterMutation({
        preserveSelection = true,
        scrollTop = this.resultsContainer?.scrollTop || 0,
        preferredPaths = null,
        excludedPaths = null,
        syncControls = true,
        refreshPools = false
    } = {})`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22609；种类 method；static=False。

调用：`_recomputeCurrentResults`。

实例依赖：`_destroyed`, `_pendingResultUpdate`, `_recomputeCurrentResults`, `resultControls`, `resultRenderer`。

### `_queueResultIndexChanges(paths = null, { refreshPools = false } = {})`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22639；种类 method；static=False。

调用：`_scheduleResultIndexUpdate`。

实例依赖：`_destroyed`, `_pendingResultUpdate`, `_scheduleResultIndexUpdate`。

### `_scheduleResultIndexUpdate()`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22654；种类 method；static=False。

调用：`_commitResultIndexChanges`。

实例依赖：`_commitResultIndexChanges`, `_confirmSession`, `_destroyed`, `_isRendering`, `_pendingResultUpdate`, `_resultGeneration`, `_resultUpdateQueued`, `createFlow`, `dropdown`, `plugin`, `resultRenderer`, `searchTimer`, `selection`, `swipe`。

### `_commitResultIndexChanges({ paths, pools })`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22678；种类 method；static=False。

调用：`_recomputeCurrentResults`。

实例依赖：`_recomputeCurrentResults`, `bestResultCount`, `fullResults`, `resultControls`, `resultRenderer`, `selection`。

### `performSearch(rawQuery, preserveSelection = false)`

归属：`src/core/search/search-and-ranking-methods.js`；原始行 L22694；种类 method；static=False。

调用：`_notifyStateChange`, `_recomputeCurrentResults`。

实例依赖：`_browseSortField`, `_destroyed`, `_initialViewportAnchor`, `_notifyStateChange`, `_pendingResultUpdate`, `_recomputeCurrentResults`, `bodyExpanded`, `createFlow`, `plugin`, `queryState`, `resultControls`, `resultRenderer`, `searchTimer`, `selection`, `sortField`, `sorting`。

### `_resolveResultElement(el)`

归属：`src/core/search/open-selection-methods.js`；原始行 L22746；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`fullResults`。

### `async _chooseExternalFile(file)`

归属：`src/core/search/open-selection-methods.js`；原始行 L22754；种类 method；static=False。

调用：`close`, `externalPickHandler`。

实例依赖：`close`, `closeOnExternalPick`, `externalPickHandler`。

### `async openSelectedNote(newTab = false)`

归属：`src/core/search/open-selection-methods.js`；原始行 L22768；种类 method；static=False。

调用：`_chooseExternalFile`, `_openResultFromSearch`, `_resolveResultElement`。

实例依赖：`_chooseExternalFile`, `_openResultFromSearch`, `_resolveResultElement`, `externalPickHandler`, `resultEls`, `selectedIndex`。

### `clearSelected()`

归属：`src/core/search/open-selection-methods.js`；原始行 L22784；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`resultEls`。

## MobileFrameController

### `constructor(root, options = {}, onDispose = null)`

归属：`src/ui/mobile/mobile-frame.js`；原始行 L22797；种类 constructor；static=False。

调用：`lock`, `ownsFocus`, `refresh`, `unlock`, `visualBottom`。

实例依赖：`cleanups`, `disposed`, `frame`, `frameHeight`, `lock`, `nativeHeight`, `nativeOpen`, `onDispose`, `options`, `ownsFocus`, `refresh`, `restingBottom`, `restingHeight`, `root`, `scrollport`, `unlock`, `visualBottom`, `win`。

### `ownsFocus(target)`

归属：`src/ui/mobile/mobile-frame.js`；原始行 L22848；种类 method；static=False。

调用：`isTextEntry`。

实例依赖：`isTextEntry`, `root`。

### `isTextEntry(target)`

归属：`src/ui/mobile/mobile-frame.js`；原始行 L22851；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `visualBottom()`

归属：`src/ui/mobile/mobile-frame.js`；原始行 L22854；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`win`。

### `get locked()`

归属：`src/ui/mobile/mobile-frame.js`；原始行 L22858；种类 get；static=False。

调用：无直接 this.method 调用。

实例依赖：`frameHeight`。

### `lock()`

归属：`src/ui/mobile/mobile-frame.js`；原始行 L22859；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`disposed`, `frameHeight`, `locked`, `options`, `root`。

### `clearScrollport()`

归属：`src/ui/mobile/mobile-frame.js`；原始行 L22871；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`scrollport`。

### `unlock()`

归属：`src/ui/mobile/mobile-frame.js`；原始行 L22877；种类 method；static=False。

调用：`clearScrollport`。

实例依赖：`clearScrollport`, `frameHeight`, `root`。

### `refresh()`

归属：`src/ui/mobile/mobile-frame.js`；原始行 L22884；种类 method；static=False。

调用：`clearScrollport`, `lock`, `ownsFocus`, `unlock`, `visualBottom`。

实例依赖：`clearScrollport`, `disposed`, `frame`, `lock`, `locked`, `nativeHeight`, `nativeOpen`, `options`, `ownsFocus`, `restingBottom`, `restingHeight`, `root`, `scrollport`, `unlock`, `visualBottom`, `win`。

### `destroy()`

归属：`src/ui/mobile/mobile-frame.js`；原始行 L22946；种类 method；static=False。

调用：`onDispose`, `unlock`。

实例依赖：`cleanups`, `disposed`, `frame`, `onDispose`, `root`, `unlock`, `win`。

## SearchWorkspaceCapabilities

### `constructor(core)`

归属：`src/integrations/SearchWorkspaceCapabilities.js`；原始行 L22963；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`cleanups`, `core`, `mobileFrame`, `root`, `win`。

### `resize()`

归属：`src/integrations/SearchWorkspaceCapabilities.js`；原始行 L22989；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`mobileFrame`。

### `destroy()`

归属：`src/integrations/SearchWorkspaceCapabilities.js`；原始行 L22990；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`cleanups`, `core`, `mobileFrame`。

## SearchView extends ItemView

### `constructor(leaf, plugin, viewType = VIEW_TYPE)`

归属：`src/ui/views/SearchView.js`；原始行 L23000；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`_activeLeafRef`, `_closed`, `_ready`, `_sessionKey`, `_state`, `_swipeBackCleanup`, `capabilities`, `core`, `plugin`, `viewType`。

### `getViewType()`

归属：`src/ui/views/SearchView.js`；原始行 L23014；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`viewType`。

### `getDisplayText()`

归属：`src/ui/views/SearchView.js`；原始行 L23015；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`viewType`。

### `getIcon()`

归属：`src/ui/views/SearchView.js`；原始行 L23016；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_collapseMobileSidebar()`

归属：`src/ui/views/SearchView.js`；原始行 L23018；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`, `leaf`, `viewType`。

### `getState()`

归属：`src/ui/views/SearchView.js`；原始行 L23032；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_sessionKey`, `_state`, `core`。

### `async setState(state, result)`

归属：`src/ui/views/SearchView.js`；原始行 L23036；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_sessionKey`, `_state`, `core`, `plugin`, `viewType`。

### `async onOpen()`

归属：`src/ui/views/SearchView.js`；原始行 L23053；种类 method；static=False。

调用：`_collapseMobileSidebar`, `_swipeBackCleanup`。

实例依赖：`_activeLeafRef`, `_closed`, `_collapseMobileSidebar`, `_ready`, `_sessionKey`, `_state`, `_swipeBackCleanup`, `app`, `capabilities`, `contentEl`, `core`, `leaf`, `plugin`, `viewType`。

### `onResize()`

归属：`src/ui/views/SearchView.js`；原始行 L23110；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`capabilities`, `contentEl`, `core`。

### `focusSearchInput()`

归属：`src/ui/views/SearchView.js`；原始行 L23118；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`core`, `plugin`, `viewType`。

### `onClose()`

归属：`src/ui/views/SearchView.js`；原始行 L23128；种类 method；static=False。

调用：`_swipeBackCleanup`, `getState`。

实例依赖：`_activeLeafRef`, `_closed`, `_state`, `_swipeBackCleanup`, `app`, `capabilities`, `contentEl`, `core`, `getState`, `plugin`, `viewType`。

## SearchWindowSession

### `constructor(app, plugin, options = {})`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23167；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`_activeDragCleanup`, `_activeResizeCleanup`, `_autofocusFrame`, `_closing`, `_contextMenuCloseHandler`, `_desktopBounds`, `_dragCleanup`, `_geometrySaveTimer`, `_mobileBackdropCleanup`, `_mobileFrame`, `_resizeCleanup`, `_searchSessionCloseHandled`, `_startupTimer`, `_swipeBackCleanup`, `_windowResizeCleanup`, `app`, `contentEl`, `core`, `floating`, `host`, `modalEl`, `options`, `plugin`。

### `_attachHost(host, modalEl, contentEl)`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23197；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`contentEl`, `host`, `modalEl`。

### `_hostDocument()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23203；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`, `contentEl`, `modalEl`。

### `_hostWindow()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23209；种类 method；static=False。

调用：`_hostDocument`。

实例依赖：`_hostDocument`。

### `_handleEscapeEvent(event)`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23213；种类 method；static=False。

调用：`close`。

实例依赖：`close`, `core`。

### `open()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23231；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_closing`, `app`, `floating`, `host`。

### `_focusSearchInput(core, expectedFocus)`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23243；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_closing`, `core`, `options`, `plugin`。

### `_desktopViewport()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23261；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`modalEl`。

### `_desktopMetrics()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23270；种类 method；static=False。

调用：`_hostWindow`。

实例依赖：`_hostWindow`, `modalEl`。

### `_clampDesktopBounds(bounds, metrics = this._desktopMetrics(), keepOrigin = false)`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23282；种类 method；static=False。

调用：`_desktopViewport`。

实例依赖：`_desktopViewport`。

### `_applyDesktopBounds(bounds, metrics = null, keepOrigin = false)`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23300；种类 method；static=False。

调用：`_clampDesktopBounds`, `_desktopMetrics`。

实例依赖：`_clampDesktopBounds`, `_desktopBounds`, `_desktopMetrics`, `modalEl`。

### `_queueGeometrySave(bounds, { immediate = false } = {})`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23312；种类 method；static=False。

调用：`_clampDesktopBounds`, `_hostWindow`。

实例依赖：`_clampDesktopBounds`, `_desktopBounds`, `_geometrySaveTimer`, `_hostWindow`, `plugin`。

### `_prepareDesktopWindowGeometry()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23345；种类 method；static=False。

调用：`_applyDesktopBounds`。

实例依赖：`_applyDesktopBounds`, `modalEl`, `plugin`。

### `_setupDesktopWindowGeometry()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23352；种类 method；static=False。

调用：`_activeDragCleanup`, `_activeResizeCleanup`, `_applyDesktopBounds`, `_desktopMetrics`, `_prepareDesktopWindowGeometry`, `_queueGeometrySave`。

实例依赖：`_activeDragCleanup`, `_activeResizeCleanup`, `_applyDesktopBounds`, `_desktopBounds`, `_desktopMetrics`, `_dragCleanup`, `_prepareDesktopWindowGeometry`, `_queueGeometrySave`, `_resizeCleanup`, `_windowResizeCleanup`, `contentEl`, `modalEl`, `plugin`。

### `_setupMobileBackdropGuard()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23499；种类 method；static=False。

调用：`_teardownMobileBackdropGuard`, `close`。

实例依赖：`_closing`, `_mobileBackdropCleanup`, `_teardownMobileBackdropGuard`, `close`, `core`, `modalEl`。

### `_teardownMobileBackdropGuard()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23552；种类 method；static=False。

调用：`_mobileBackdropCleanup`。

实例依赖：`_mobileBackdropCleanup`。

### `_setupMobileViewportGeometry()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23557；种类 method；static=False。

调用：`_teardownMobileViewportGeometry`。

实例依赖：`_mobileFrame`, `_teardownMobileViewportGeometry`, `core`, `modalEl`。

### `_teardownMobileViewportGeometry()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23564；种类 method；static=False。

调用：`_hostWindow`。

实例依赖：`_autofocusFrame`, `_hostWindow`, `_mobileFrame`。

### `_installWindowInteractions(core)`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23570；种类 method；static=False。

调用：`_focusSearchInput`, `_hostWindow`, `_setupDesktopWindowGeometry`, `_setupMobileViewportGeometry`, `_swipeBackCleanup`, `close`。

实例依赖：`_autofocusFrame`, `_closing`, `_contextMenuCloseHandler`, `_focusSearchInput`, `_hostWindow`, `_setupDesktopWindowGeometry`, `_setupMobileViewportGeometry`, `_swipeBackCleanup`, `close`, `contentEl`, `modalEl`, `options`, `plugin`。

### `async _mountSearchCore(externalSession)`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23617；种类 method；static=False。

调用：`_focusSearchInput`, `_hostWindow`, `_installWindowInteractions`, `close`。

实例依赖：`_closing`, `_focusSearchInput`, `_hostWindow`, `_installWindowInteractions`, `_startupTimer`, `app`, `close`, `contentEl`, `core`, `floating`, `modalEl`, `options`, `plugin`。

### `onOpen()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23696；种类 method；static=False。

调用：`_hostWindow`, `_mountSearchCore`, `_prepareDesktopWindowGeometry`, `_setupMobileBackdropGuard`。

实例依赖：`_closing`, `_hostWindow`, `_mountSearchCore`, `_prepareDesktopWindowGeometry`, `_setupMobileBackdropGuard`, `_startupTimer`, `contentEl`, `modalEl`, `options`。

### `_finalizeSearchSessionClose()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23716；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_searchSessionCloseHandled`, `core`, `options`。

### `close(options = {})`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23733；种类 method；static=False。

调用：`_hostWindow`。

实例依赖：`_closing`, `_geometrySaveTimer`, `_hostWindow`, `_searchSessionCloseHandled`, `core`, `host`, `modalEl`, `options`, `plugin`。

### `onClose()`

归属：`src/ui/hosts/SearchWindowSession.js`；原始行 L23785；种类 method；static=False。

调用：`_dragCleanup`, `_finalizeSearchSessionClose`, `_hostWindow`, `_resizeCleanup`, `_swipeBackCleanup`, `_teardownMobileBackdropGuard`, `_teardownMobileViewportGeometry`, `_windowResizeCleanup`。

实例依赖：`_closing`, `_contextMenuCloseHandler`, `_dragCleanup`, `_finalizeSearchSessionClose`, `_geometrySaveTimer`, `_hostWindow`, `_resizeCleanup`, `_startupTimer`, `_swipeBackCleanup`, `_teardownMobileBackdropGuard`, `_teardownMobileViewportGeometry`, `_windowResizeCleanup`, `core`, `host`, `modalEl`, `options`, `plugin`。

## SearchModalHost extends Modal

### `constructor(app, session)`

归属：`src/ui/hosts/modal-host.js`；原始行 L23853；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`scope`, `session`。

### `isOpen()`

归属：`src/ui/hosts/modal-host.js`；原始行 L23863；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`modalEl`。

### `onOpen()`

归属：`src/ui/hosts/modal-host.js`；原始行 L23867；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`contentEl`, `modalEl`, `session`。

### `close()`

归属：`src/ui/hosts/modal-host.js`；原始行 L23872；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`session`。

### `_closeDirect()`

归属：`src/ui/hosts/modal-host.js`；原始行 L23876；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `onClose()`

归属：`src/ui/hosts/modal-host.js`；原始行 L23880；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`session`。

## LocalSearchOverlayHost

### `constructor({ className = "", onClose = null, canClose = null, closeOnContextmenu = false, ownerDocument = null, ownerElement = null, swipeBack = null } = {})`

归属：`src/ui/overlays/LocalSearchOverlayHost.js`；原始行 L23957；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`_closed`, `_keydownHandler`, `_swipeCleanup`, `canClose`, `className`, `closeOnContextmenu`, `onClose`, `overlayEl`, `ownerDocument`, `ownerElement`, `swipeBack`。

### `open()`

归属：`src/ui/overlays/LocalSearchOverlayHost.js`；原始行 L23971；种类 method；static=False。

调用：`close`。

实例依赖：`_closed`, `_keydownHandler`, `_swipeCleanup`, `className`, `close`, `closeOnContextmenu`, `overlayEl`, `ownerDocument`, `ownerElement`, `swipeBack`。

### `createCloseButton(surface, { title = "关闭", positioned = false } = {})`

归属：`src/ui/overlays/LocalSearchOverlayHost.js`；原始行 L24024；种类 method；static=False。

调用：`close`。

实例依赖：`close`, `ownerElement`。

### `close({ force = false } = {})`

归属：`src/ui/overlays/LocalSearchOverlayHost.js`；原始行 L24048；种类 method；static=False。

调用：`_swipeCleanup`, `canClose`, `onClose`。

实例依赖：`_closed`, `_keydownHandler`, `_swipeCleanup`, `canClose`, `onClose`, `overlayEl`, `ownerDocument`, `ownerElement`。

## PluginSettingRow extends NativeSetting

### `constructor(parent)`

归属：`src/ui/settings/setting-row.js`；原始行 L24081；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`key`。

### `addToggle(callback)`

归属：`src/ui/settings/setting-row.js`；原始行 L24093；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `addText(callback)`

归属：`src/ui/settings/setting-row.js`；原始行 L24099；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `addTextArea(callback)`

归属：`src/ui/settings/setting-row.js`；原始行 L24105；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `addButton(callback)`

归属：`src/ui/settings/setting-row.js`；原始行 L24111；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `addPicker(callback)`

归属：`src/ui/settings/setting-row.js`；原始行 L24120；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`settingEl`。

### `addExtraButton(callback)`

归属：`src/ui/settings/setting-row.js`；原始行 L24127；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

## LocalSearchSettingTab extends PluginSettingTab

### `constructor(app, plugin)`

归属：`src/ui/settings/LocalSearchSettingTab.js`；原始行 L24140；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`_activeModuleId`, `_moduleCleanups`, `plugin`。

### `_disposeModule()`

归属：`src/ui/settings/LocalSearchSettingTab.js`；原始行 L24147；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_moduleCleanups`。

### `_renderNavigatorSettings(card)`

归属：`src/ui/settings/LocalSearchSettingTab.js`；原始行 L24153；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`, `plugin`。

### `display()`

归属：`src/ui/settings/LocalSearchSettingTab.js`；原始行 L24177；种类 method；static=False。

调用：`_disposeModule`, `_renderNavigatorSettings`。

实例依赖：`_activeModuleId`, `_disposeModule`, `_renderNavigatorSettings`, `plugin`。

### `hide()`

归属：`src/ui/settings/LocalSearchSettingTab.js`；原始行 L24380；种类 method；static=False。

调用：`_disposeModule`。

实例依赖：`_disposeModule`, `containerEl`, `plugin`。

## FileOperationService

### `constructor(app, plugin)`

归属：`src/services/FileOperationService.js`；原始行 L24390；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`_pendingCreationFiles`, `_targetLeases`, `app`, `plugin`。

### `assertCurrent(file)`

归属：`src/services/FileOperationService.js`；原始行 L24398；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`, `plugin`。

### `async withTargets(files, operation, destinations = [])`

归属：`src/services/FileOperationService.js`；原始行 L24406；种类 method；static=False。

调用：`assertCurrent`。

实例依赖：`_targetLeases`, `assertCurrent`, `plugin`。

### `createFolder(rawPath, { allowExisting = false } = {})`

归属：`src/services/FileOperationService.js`；原始行 L24427；种类 method；static=False。

调用：`withTargets`。

实例依赖：`app`, `withTargets`。

### `createFile(path, content, metadata = null)`

归属：`src/services/FileOperationService.js`；原始行 L24452；种类 method；static=False。

调用：`_writeCreatedMetadata`, `withTargets`。

实例依赖：`_pendingCreationFiles`, `_writeCreatedMetadata`, `app`, `plugin`, `withTargets`。

### `async _writeCreatedMetadata(file, content, metadata, createdAt, propertyFingerprint = null)`

归属：`src/services/FileOperationService.js`；原始行 L24487；种类 method；static=False。

调用：`assertCurrent`。

实例依赖：`app`, `assertCurrent`, `plugin`。

### `resumeCreationMetadata(pending)`

归属：`src/services/FileOperationService.js`；原始行 L24529；种类 method；static=False。

调用：`_writeCreatedMetadata`, `assertCurrent`, `withTargets`。

实例依赖：`_pendingCreationFiles`, `_writeCreatedMetadata`, `app`, `assertCurrent`, `plugin`, `withTargets`。

### `forgetPendingCreation(path)`

归属：`src/services/FileOperationService.js`；原始行 L24561；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_pendingCreationFiles`。

### `_availablePath(file, targetFolder)`

归属：`src/services/FileOperationService.js`；原始行 L24565；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`。

### `renameFile(file, newPath)`

归属：`src/services/FileOperationService.js`；原始行 L24583；种类 method；static=False。

调用：`withTargets`。

实例依赖：`app`, `plugin`, `withTargets`。

### `async moveFiles(files, targetFolder)`

归属：`src/services/FileOperationService.js`；原始行 L24603；种类 method；static=False。

调用：`_availablePath`, `assertCurrent`, `renameFile`。

实例依赖：`_availablePath`, `assertCurrent`, `renameFile`。

### `deleteFolder(folder)`

归属：`src/services/FileOperationService.js`；原始行 L24621；种类 method；static=False。

调用：`withTargets`。

实例依赖：`app`, `withTargets`。

### `async deleteFiles(files)`

归属：`src/services/FileOperationService.js`；原始行 L24634；种类 method；static=False。

调用：`withTargets`。

实例依赖：`app`, `plugin`, `withTargets`。

## OperationOverlayController

### `constructor(app, plugin, file, kind)`

归属：`src/ui/overlays/OperationOverlayController.js`；原始行 L24666；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`_closed`, `_dialogSubmission`, `_overlayHost`, `_picked`, `app`, `file`, `kind`, `overlayEl`, `plugin`, `surfaceEl`。

### `open()`

归属：`src/ui/overlays/OperationOverlayController.js`；原始行 L24679；种类 method；static=False。

调用：`_renderDelete`, `_renderMove`, `close`。

实例依赖：`_closed`, `_dialogSubmission`, `_overlayHost`, `_renderDelete`, `_renderMove`, `app`, `close`, `file`, `kind`, `overlayEl`, `plugin`, `surfaceEl`。

### `_createCloseButton(surface)`

归属：`src/ui/overlays/OperationOverlayController.js`；原始行 L24715；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_overlayHost`。

### `_renderMove(current)`

归属：`src/ui/overlays/OperationOverlayController.js`；原始行 L24719；种类 method；static=False。

调用：`_createCloseButton`, `close`。

实例依赖：`_closed`, `_createCloseButton`, `_picked`, `app`, `close`, `file`, `overlayEl`, `plugin`, `surfaceEl`。

### `_renderDelete(current)`

归属：`src/ui/overlays/OperationOverlayController.js`；原始行 L24759；种类 method；static=False。

调用：`close`。

实例依赖：`_closed`, `_dialogSubmission`, `app`, `close`, `file`, `overlayEl`, `plugin`, `surfaceEl`。

### `close()`

归属：`src/ui/overlays/OperationOverlayController.js`；原始行 L24794；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_closed`, `_overlayHost`, `overlayEl`, `plugin`, `surfaceEl`。

## LocalSearchPlugin extends Plugin

### `constructor()`

归属：`src/core/LocalSearchPlugin.js`；原始行 L24809；种类 constructor；static=False。

调用：`getAuthoritativeFileTime`, `getIndexedFileProperties`, `getIndexedProjectGroups`, `getIndexedPropertyCatalog`, `getRecentOpenedHistory`, `markOpenedFromExternal`, `mountExternalSearch`, `moveExternalFiles`, `openExternalFolderPicker`, `openExternalPropertyEditor`, `openExternalSearch`, `patchExternalProperties`, `registerVirtualProperties`, `subscribeProjectPropertyChanges`, `subscribeRecentOpened`。

实例依赖：`_activitySaveTimer`, `_closedSearchViewStates`, `_commandSelectionDeletePending`, `_contentTimePersistDirty`, `_contentTimePersistTimer`, `_contentTimeWriteChain`, `_currentFileOperationOverlay`, `_embeddedSearchSessions`, `_externalFolderPickers`, `_externalMetaProjectionCache`, `_externalMobileFrames`, `_externalPropertyPickers`, `_externalPropertyProviders`, `_hoverHintObserver`, `_indexBuildPromise`, `_indexCacheRestored`, `_indexFlushPromise`, `_indexQueue`, `_indexRefreshTimer`, `_initialIndexReady`, `_markdownStampTasks`, `_metadataDirectorySafe`, `_metadataHistorySaveTimer`, `_metadataHistoryWriteChain`, `_metadataWriterId`, `_nonMarkdownLocal`, `_nonMarkdownRecords`, `_nonMarkdownSaveTimer`, `_nonMarkdownWriteChain`, `_ownedFileCreations`, `_persistTimer`, `_persistWriteChain`, `_projectGroupSnapshot`, `_projectPropertySubscribers`, `_recentOpenedHistory`, `_recentOpenedLocal`, `_recentOpenedSaveWarned`, `_recentOpenedTrackingReady`, `_renameSettles`, `_residentSearchResultRows`, `_residentSearchResults`, `_resultRowHeightByView`, `_settingsWriteChain`, `_sidecarReloadPending`, `_sidecarReloadPromise`, `_timeHistorySubscribers`, `_timeWriteDisposers`, `_unloaded`, `_workspaceOpenTasks`, `activeSearchCores`, `app`, `bodyIndex`, `contentTimeCache`, `externalSearchApi`, `externalSearchApiVersion`, `fileMetaCache`, `fileOperations`, `getAuthoritativeFileTime`, `getIndexedFileProperties`, `getIndexedProjectGroups`, `getIndexedPropertyCatalog`, `getRecentOpenedHistory`, `globalContentCache`, `markOpenedFromExternal`, `mountExternalSearch`, `moveExternalFiles`, `openExternalFolderPicker`, `openExternalPropertyEditor`, `openExternalSearch`, `patchExternalProperties`, `registerVirtualProperties`, `searchSession`, `sharedSearchState`, `subscribeProjectPropertyChanges`, `subscribeRecentOpened`, `swipeBack`。

### `async setPickerSiblingOrder(kind, siblingKeys, draggedKey, beforeKey = null, scopeKey = "", { persist = true } = {})`

归属：`src/features/plugin/tree-maintenance-methods.js`；原始行 L24904；种类 method；static=False。

调用：`_refreshPickerOrderConsumers`, `saveSettings`。

实例依赖：`_refreshPickerOrderConsumers`, `saveSettings`, `settings`。

### `async moveFolderTreeNode(sourcePath, targetParentPath = "")`

归属：`src/features/plugin/tree-maintenance-methods.js`；原始行 L24949；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`, `fileOperations`。

### `_tagPathMatchesPrefix(value, prefix)`

归属：`src/features/plugin/tree-maintenance-methods.js`；原始行 L24976；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_remapTagPath(value, oldPrefix, newPrefix)`

归属：`src/features/plugin/tree-maintenance-methods.js`；原始行 L24985；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_rewriteInlineTagPositions(content, cache, oldPrefix, newPrefix, {
        removeTree = false
    } = {})`

归属：`src/features/plugin/tree-maintenance-methods.js`；原始行 L24997；种类 method；static=False。

调用：`_remapTagPath`, `_tagPathMatchesPrefix`。

实例依赖：`_remapTagPath`, `_tagPathMatchesPrefix`。

### `_materializeTagPickerOrder()`

归属：`src/features/plugin/tree-maintenance-methods.js`；原始行 L25037；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`fileMetaCache`, `settings`。

### `_materializePropertyPickerOrders()`

归属：`src/features/plugin/tree-maintenance-methods.js`；原始行 L25044；种类 method；static=False。

调用：`propertyCatalogKeys`, `propertyCatalogValues`。

实例依赖：`fileMetaCache`, `propertyCatalogKeys`, `propertyCatalogValues`, `settings`。

### `_mutatePropertyFilterPoolEntries(mutator)`

归属：`src/features/plugin/tree-maintenance-methods.js`；原始行 L25064；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`settings`。

### `async migrateVaultTagTreePrefix(oldPrefix, newPrefix, {
        removeTree = false
    } = {})`

归属：`src/features/plugin/tree-maintenance-methods.js`；原始行 L25076；种类 method；static=False。

调用：`_flushIndexQueueNow`, `_materializeTagPickerOrder`, `_readFileProperties`, `_refreshFilterPoolCores`, `_remapTagPath`, `_rewriteInlineTagPositions`, `_tagPathMatchesPrefix`, `_transformSearchFilters`, `fullRebuildMetaCache`, `isPathExcluded`, `saveSettings`。

实例依赖：`_flushIndexQueueNow`, `_materializeTagPickerOrder`, `_readFileProperties`, `_refreshFilterPoolCores`, `_remapTagPath`, `_rewriteInlineTagPositions`, `_tagPathMatchesPrefix`, `_transformSearchFilters`, `_unloaded`, `app`, `batchMetadataService`, `fileOperations`, `fullRebuildMetaCache`, `isPathExcluded`, `saveSettings`, `settings`。

### `async deleteVaultTagTreePrefix(prefix)`

归属：`src/features/plugin/tree-maintenance-methods.js`；原始行 L25223；种类 method；static=False。

调用：`migrateVaultTagTreePrefix`。

实例依赖：`migrateVaultTagTreePrefix`。

### `async _withPropertyCatalogMutation(operation)`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25230；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_propertyCatalogWriting`, `_unloaded`。

### `_propertyMaintenanceSettingsSnapshot(stats = null)`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25238；种类 method；static=False。

调用：`_activeCoreFilterStates`。

实例依赖：`_activeCoreFilterStates`, `_closedSearchViewStates`, `_unloaded`, `activeSearchCores`, `settings`, `sharedSearchState`。

### `_invalidatePropertyCatalogViews()`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25266；种类 method；static=False。

调用：`_clearResidentSearchResults`, `_publishIndexChanges`。

实例依赖：`_clearResidentSearchResults`, `_projectGroupSnapshot`, `_propertyCatalogRevision`, `_publishIndexChanges`。

### `async _savePropertyMaintenanceSettings(before, stats, action)`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25273；种类 method；static=False。

调用：`_forEachActiveSearchCore`, `_invalidatePropertyCatalogViews`, `_propertyMaintenanceSettingsSnapshot`, `_settleCoreFilterMutation`, `saveSettings`。

实例依赖：`_forEachActiveSearchCore`, `_invalidatePropertyCatalogViews`, `_propertyMaintenanceSettingsSnapshot`, `_settleCoreFilterMutation`, `_unloaded`, `saveSettings`, `settings`, `sharedSearchState`。

### `async renameVaultPropertyKey(...args)`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25327；种类 method；static=False。

调用：`_renameVaultPropertyKey`, `_withPropertyCatalogMutation`。

实例依赖：`_renameVaultPropertyKey`, `_withPropertyCatalogMutation`。

### `async _renameVaultPropertyKey(oldKey, newKey, retry = {})`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25331；种类 method；static=False。

调用：`_flushIndexQueueNow`, `_materializePropertyPickerOrders`, `_mutatePropertyFilterPoolEntries`, `_propertyMaintenanceSettingsSnapshot`, `_propertyValueCatalog`, `_publishIndexChanges`, `_readFileProperties`, `_refreshFilterPoolCores`, `_remapPropertyValueCatalog`, `_savePropertyMaintenanceSettings`, `_transformSearchFilters`。

实例依赖：`_flushIndexQueueNow`, `_materializePropertyPickerOrders`, `_mutatePropertyFilterPoolEntries`, `_propertyMaintenanceSettingsSnapshot`, `_propertyValueCatalog`, `_publishIndexChanges`, `_readFileProperties`, `_refreshFilterPoolCores`, `_remapPropertyValueCatalog`, `_savePropertyMaintenanceSettings`, `_transformSearchFilters`, `_unloaded`, `app`, `batchMetadataService`, `settings`。

### `async deleteVaultPropertyKey(...args)`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25467；种类 method；static=False。

调用：`_deleteVaultPropertyKey`, `_withPropertyCatalogMutation`。

实例依赖：`_deleteVaultPropertyKey`, `_withPropertyCatalogMutation`。

### `async _deleteVaultPropertyKey(key)`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25471；种类 method；static=False。

调用：`_flushIndexQueueNow`, `_materializePropertyPickerOrders`, `_mutatePropertyFilterPoolEntries`, `_propertyMaintenanceSettingsSnapshot`, `_publishIndexChanges`, `_refreshFilterPoolCores`, `_remapPropertyValueCatalog`, `_savePropertyMaintenanceSettings`, `_transformSearchFilters`。

实例依赖：`_flushIndexQueueNow`, `_materializePropertyPickerOrders`, `_mutatePropertyFilterPoolEntries`, `_propertyMaintenanceSettingsSnapshot`, `_publishIndexChanges`, `_refreshFilterPoolCores`, `_remapPropertyValueCatalog`, `_savePropertyMaintenanceSettings`, `_transformSearchFilters`, `_unloaded`, `app`, `batchMetadataService`, `settings`。

### `async deleteVaultPropertyValue(...args)`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25550；种类 method；static=False。

调用：`_deleteVaultPropertyValue`, `_withPropertyCatalogMutation`。

实例依赖：`_deleteVaultPropertyValue`, `_withPropertyCatalogMutation`。

### `async _deleteVaultPropertyValue(
        key,
        value,
        propertyType = "text"
    )`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25554；种类 method；static=False。

调用：`_flushIndexQueueNow`, `_materializePropertyPickerOrders`, `_propertyMaintenanceSettingsSnapshot`, `_publishIndexChanges`, `_refreshFilterPoolCores`, `_remapPropertyValueCatalog`, `_savePropertyMaintenanceSettings`, `_transformSearchFilters`。

实例依赖：`_flushIndexQueueNow`, `_materializePropertyPickerOrders`, `_propertyMaintenanceSettingsSnapshot`, `_publishIndexChanges`, `_refreshFilterPoolCores`, `_remapPropertyValueCatalog`, `_savePropertyMaintenanceSettings`, `_transformSearchFilters`, `_unloaded`, `batchMetadataService`, `settings`。

### `async renameVaultPropertyValue(...args)`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25630；种类 method；static=False。

调用：`_renameVaultPropertyValue`, `_withPropertyCatalogMutation`。

实例依赖：`_renameVaultPropertyValue`, `_withPropertyCatalogMutation`。

### `async _renameVaultPropertyValue(
        key,
        oldValue,
        newValue,
        propertyType = "text"
    )`

归属：`src/features/plugin/property-maintenance-methods.js`；原始行 L25634；种类 method；static=False。

调用：`_flushIndexQueueNow`, `_materializePropertyPickerOrders`, `_propertyMaintenanceSettingsSnapshot`, `_propertyValueCatalog`, `_publishIndexChanges`, `_refreshFilterPoolCores`, `_remapPropertyValueCatalog`, `_savePropertyMaintenanceSettings`, `_transformSearchFilters`, `propertyCatalogType`。

实例依赖：`_flushIndexQueueNow`, `_materializePropertyPickerOrders`, `_propertyMaintenanceSettingsSnapshot`, `_propertyValueCatalog`, `_publishIndexChanges`, `_refreshFilterPoolCores`, `_remapPropertyValueCatalog`, `_savePropertyMaintenanceSettings`, `_transformSearchFilters`, `_unloaded`, `batchMetadataService`, `fileMetaCache`, `propertyCatalogType`, `settings`。

### `_commandSearchSelectionCore()`

归属：`src/features/plugin/file-command-actions-methods.js`；原始行 L25715；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`activeSearchCores`, `app`, `searchSession`。

### `_deleteFromCommand()`

归属：`src/features/plugin/file-command-actions-methods.js`；原始行 L25735；种类 method；static=False。

调用：`_commandSearchSelectionCore`, `_openCurrentFileOperation`。

实例依赖：`_commandSearchSelectionCore`, `_commandSelectionDeletePending`, `_openCurrentFileOperation`, `_unloaded`, `app`。

### `_openCurrentFileOperation(kind, file)`

归属：`src/features/plugin/file-command-actions-methods.js`；原始行 L25775；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_currentFileOperationOverlay`, `app`, `fileOperations`, `settings`。

### `async onload()`

归属：`src/core/LocalSearchPlugin.js`；原始行 L25800；种类 method；static=False。

调用：`_assertMetadataDirectoryDedicated`, `_connectDidaProjectCatalog`, `_deleteFromCommand`, `_deleteNonMarkdownTimes`, `_enforceWorkspaceSingleton`, `_forEachActiveSearchCore`, `_handleFolderDelete`, `_installTimeWriteCapture`, `_isRemoteTimeSidecar`, `_mergeRecentOpenedHistory`, `_metadataDirectory`, `_normalizeRecentOpened`, `_notifyRecentOpened`, `_openCurrentFileOperation`, `_publishProjectChanges`, `_queueFileIndex`, `_reloadTimeSidecars`, `_remapStoredSearchPaths`, `_removeContentTimePath`, `_removeRecentOpenedPath`, `_settleRename`, `_throttleSaveActivity`, `_touchRecentOpened`, `activateView`, `addCommand`, `addRibbonIcon`, `addSettingTab`, `buildMetaCache`, `cycleActiveResultView`, `fullRebuildMetaCache`, `isPathExcluded`, `loadContentTimeCache`, `loadIndexCache`, `loadNonMarkdownTimes`, `loadRecentOpenedHistory`, `loadSettings`, `openFloatingSearch`, `openSearchModal`, `registerEvent`, `registerView`, `saveSettings`, `toggleSearchModal`。

实例依赖：`_assertMetadataDirectoryDedicated`, `_connectDidaProjectCatalog`, `_deleteFromCommand`, `_deleteNonMarkdownTimes`, `_enforceWorkspaceSingleton`, `_forEachActiveSearchCore`, `_handleFolderDelete`, `_hoverHintObserver`, `_initialIndexReady`, `_installTimeWriteCapture`, `_isRemoteTimeSidecar`, `_mergeRecentOpenedHistory`, `_metadataDirectory`, `_metadataDirectorySafe`, `_normalizeRecentOpened`, `_notifyRecentOpened`, `_openCurrentFileOperation`, `_ownedFileCreations`, `_publishProjectChanges`, `_queueFileIndex`, `_recentOpenedHistory`, `_recentOpenedTrackingReady`, `_reloadTimeSidecars`, `_remapStoredSearchPaths`, `_removeContentTimePath`, `_removeRecentOpenedPath`, `_settleRename`, `_throttleSaveActivity`, `_touchRecentOpened`, `_unloaded`, `activateView`, `addCommand`, `addRibbonIcon`, `addSettingTab`, `app`, `batchMetadataService`, `bodyIndex`, `buildMetaCache`, `cycleActiveResultView`, `fileOperations`, `fullRebuildMetaCache`, `globalContentCache`, `isPathExcluded`, `loadContentTimeCache`, `loadIndexCache`, `loadNonMarkdownTimes`, `loadRecentOpenedHistory`, `loadSettings`, `openFloatingSearch`, `openSearchModal`, `registerEvent`, `registerView`, `saveSettings`, `settings`, `toggleSearchModal`。

### `_enforceWorkspaceSingleton(type, preferredLeaf = null)`

归属：`src/features/plugin/workspace-entry-methods.js`；原始行 L26023；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`。

### `_latestCreateRecovery(kind)`

归属：`src/features/plugin/workspace-entry-methods.js`；原始行 L26031；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`settings`。

### `activateView(type = VIEW_TYPE)`

归属：`src/features/plugin/workspace-entry-methods.js`；原始行 L26040；种类 method；static=False。

调用：`_activateWorkspaceView`。

实例依赖：`_activateWorkspaceView`, `_unloaded`, `_workspaceOpenTasks`。

### `async _activateWorkspaceView(type)`

归属：`src/features/plugin/workspace-entry-methods.js`；原始行 L26050；种类 method；static=False。

调用：`_enforceWorkspaceSingleton`, `_latestCreateRecovery`。

实例依赖：`_closedSearchViewStates`, `_enforceWorkspaceSingleton`, `_latestCreateRecovery`, `_unloaded`, `app`。

### `recoverSearchSession(key, session)`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26097；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`settings`。

### `rememberCreateSession(key, kind, session, { persist = true } = {})`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26102；种类 method；static=False。

调用：`saveSettings`。

实例依赖：`_unloaded`, `saveSettings`, `settings`。

### `settleCreateSession(key, submitted)`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26116；种类 method；static=False。

调用：`rememberCreateSession`。

实例依赖：`_closedSearchViewStates`, `activeSearchCores`, `rememberCreateSession`, `settings`。

### `_normalizeSearchQueries(entries, limit = Infinity)`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26135；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_normalizeSearchHistory(entries)`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26155；种类 method；static=False。

调用：`_normalizeSearchQueries`。

实例依赖：`_normalizeSearchQueries`。

### `_normalizeFavoriteSearches(entries)`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26159；种类 method；static=False。

调用：`_normalizeSearchQueries`。

实例依赖：`_normalizeSearchQueries`。

### `_sameSearchQuery(a, b)`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26163；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_setSearchHistory(entries)`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26168；种类 method；static=False。

调用：`_normalizeSearchHistory`, `_sameSearchQuery`, `_throttleSaveActivity`。

实例依赖：`_normalizeSearchHistory`, `_sameSearchQuery`, `_throttleSaveActivity`, `settings`。

### `_setFavoriteSearches(entries)`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26190；种类 method；static=False。

调用：`_normalizeFavoriteSearches`, `_normalizeSearchHistory`, `_sameSearchQuery`, `saveSettings`。

实例依赖：`_normalizeFavoriteSearches`, `_normalizeSearchHistory`, `_sameSearchQuery`, `saveSettings`, `settings`。

### `rememberModalSearchSession(session = {}, { persist = true } = {})`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26214；种类 method；static=False。

调用：`saveSettings`。

实例依赖：`saveSettings`, `settings`。

### `recordSearchHistory(query)`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26263；种类 method；static=False。

调用：`_sameSearchQuery`, `_setSearchHistory`。

实例依赖：`_sameSearchQuery`, `_setSearchHistory`, `settings`。

### `favoriteSearchQuery(query)`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26282；种类 method；static=False。

调用：`_sameSearchQuery`, `_setFavoriteSearches`。

实例依赖：`_sameSearchQuery`, `_setFavoriteSearches`, `settings`。

### `unfavoriteSearchQuery(query)`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26293；种类 method；static=False。

调用：`_sameSearchQuery`, `_setFavoriteSearches`, `_setSearchHistory`。

实例依赖：`_sameSearchQuery`, `_setFavoriteSearches`, `_setSearchHistory`, `settings`。

### `deleteSearchQuery(query, { favorite = false } = {})`

归属：`src/features/plugin/search-history-methods.js`；原始行 L26311；种类 method；static=False。

调用：`_sameSearchQuery`, `_setFavoriteSearches`, `_setSearchHistory`。

实例依赖：`_sameSearchQuery`, `_setFavoriteSearches`, `_setSearchHistory`, `settings`。

### `_normalizeRecentOpened(paths, { validateExists = true } = {})`

归属：`src/features/plugin/recent-history-state-methods.js`；原始行 L26326；种类 method；static=False。

调用：`isPathExcluded`。

实例依赖：`app`, `isPathExcluded`。

### `_setRecentOpened(paths, options)`

归属：`src/features/plugin/recent-history-state-methods.js`；原始行 L26343；种类 method；static=False。

调用：`_normalizeRecentOpened`, `_notifyRecentOpened`, `_throttleSaveRecentOpenedHistory`。

实例依赖：`_normalizeRecentOpened`, `_notifyRecentOpened`, `_recentOpenedHistory`, `_recentOpenedLocal`, `_throttleSaveRecentOpenedHistory`, `settings`。

### `_touchRecentOpened(path)`

归属：`src/features/plugin/recent-history-state-methods.js`；原始行 L26358；种类 method；static=False。

调用：`_forEachActiveSearchCore`, `_mergeRecentOpenedHistory`, `_throttleSaveRecentOpenedHistory`, `isPathExcluded`。

实例依赖：`_forEachActiveSearchCore`, `_mergeRecentOpenedHistory`, `_recentOpenedLocal`, `_throttleSaveRecentOpenedHistory`, `isPathExcluded`。

### `_removeRecentOpenedPath(path)`

归属：`src/features/plugin/recent-history-state-methods.js`；原始行 L26374；种类 method；static=False。

调用：`_setRecentOpened`。

实例依赖：`_setRecentOpened`, `settings`。

### `_remapRecentOpenedHistory(oldPath, newPath, descendants = false)`

归属：`src/features/plugin/recent-history-state-methods.js`；原始行 L26379；种类 method；static=False。

调用：`_mergeRecentOpenedHistory`, `_throttleSaveRecentOpenedHistory`。

实例依赖：`_mergeRecentOpenedHistory`, `_recentOpenedHistory`, `_recentOpenedLocal`, `_throttleSaveRecentOpenedHistory`。

### `_replacePathPrefix(path, oldPath, newPath, { descendants = false } = {})`

归属：`src/features/plugin/path-lifecycle-methods.js`；原始行 L26403；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_migrateCorePathState(oldPath, newPath, { descendants = false } = {})`

归属：`src/features/plugin/path-lifecycle-methods.js`；原始行 L26412；种类 method；static=False。

调用：`_activeCoreFilterStates`, `_forEachActiveSearchCore`, `_replacePathPrefix`。

实例依赖：`_activeCoreFilterStates`, `_forEachActiveSearchCore`, `_replacePathPrefix`。

### `_transformSearchFilters(transform, { includeLive = true } = {})`

归属：`src/features/plugin/path-lifecycle-methods.js`；原始行 L26488；种类 method；static=False。

调用：`_activeCoreFilterStates`, `_forEachActiveSearchCore`, `_settleCoreFilterMutation`。

实例依赖：`_activeCoreFilterStates`, `_closedSearchViewStates`, `_forEachActiveSearchCore`, `_settleCoreFilterMutation`, `settings`, `sharedSearchState`。

### `_remapStoredSearchPaths(remap, { folders = false } = {})`

归属：`src/features/plugin/path-lifecycle-methods.js`；原始行 L26528；种类 method；static=False。

调用：`_transformSearchFilters`。

实例依赖：`_closedSearchViewStates`, `_transformSearchFilters`, `settings`。

### `_migrateRenameSettings(oldPath, newPath, {
        descendants = false,
        folderRename = false
    } = {})`

归属：`src/features/plugin/path-lifecycle-methods.js`；原始行 L26558；种类 method；static=False。

调用：`_normalizeRecentOpened`, `_remapStoredSearchPaths`, `_replacePathPrefix`。

实例依赖：`_normalizeRecentOpened`, `_remapStoredSearchPaths`, `_replacePathPrefix`, `settings`。

### `_settleRename(file, oldPath)`

归属：`src/features/plugin/path-lifecycle-methods.js`；原始行 L26687；种类 method；static=False。

调用：`_handleFileRename`, `_handleFolderRename`。

实例依赖：`_handleFileRename`, `_handleFolderRename`, `_renameSettles`, `_unloaded`。

### `_clearIndexPathPrefix(path)`

归属：`src/features/plugin/path-lifecycle-methods.js`；原始行 L26725；种类 method；static=False。

调用：`_evictIndexedPath`。

实例依赖：`_evictIndexedPath`, `_externalMetaProjectionCache`, `_indexQueue`, `bodyIndex`, `fileMetaCache`, `globalContentCache`。

### `_handleFolderDelete(path)`

归属：`src/features/plugin/path-lifecycle-methods.js`；原始行 L26735；种类 method；static=False。

调用：`_activeCoreFilterStates`, `_clearIndexPathPrefix`, `_deleteNonMarkdownTimes`, `_forEachActiveSearchCore`, `_publishIndexChanges`, `_refreshFolderStateCores`, `_remapRecentOpenedHistory`, `_remapStoredSearchPaths`, `_removeContentTimePathPrefix`, `_settleCoreFilterMutation`, `_throttleSaveActivity`, `saveSettings`, `throttleSaveCache`。

实例依赖：`_activeCoreFilterStates`, `_clearIndexPathPrefix`, `_deleteNonMarkdownTimes`, `_forEachActiveSearchCore`, `_publishIndexChanges`, `_refreshFolderStateCores`, `_remapRecentOpenedHistory`, `_remapStoredSearchPaths`, `_removeContentTimePathPrefix`, `_settleCoreFilterMutation`, `_throttleSaveActivity`, `_unloaded`, `saveSettings`, `settings`, `throttleSaveCache`。

### `async _handleFolderRename(folder, oldPath)`

归属：`src/features/plugin/path-lifecycle-methods.js`；原始行 L26894；种类 method；static=False。

调用：`_clearIndexPathPrefix`, `_flushIndexQueueNow`, `_migrateContentTimePath`, `_migrateCorePathState`, `_migrateRenameSettings`, `_publishIndexChanges`, `_refreshFolderStateCores`, `_remapNonMarkdownTimes`, `_remapRecentOpenedHistory`, `saveSettings`, `throttleSaveCache`。

实例依赖：`_clearIndexPathPrefix`, `_flushIndexQueueNow`, `_indexQueue`, `_migrateContentTimePath`, `_migrateCorePathState`, `_migrateRenameSettings`, `_publishIndexChanges`, `_refreshFolderStateCores`, `_remapNonMarkdownTimes`, `_remapRecentOpenedHistory`, `_unloaded`, `saveSettings`, `throttleSaveCache`。

### `async _handleFileRename(file, oldPath)`

归属：`src/features/plugin/path-lifecycle-methods.js`；原始行 L26945；种类 method；static=False。

调用：`_evictIndexedPath`, `_isRemoteTimeSidecar`, `_migrateContentTimePath`, `_migrateCorePathState`, `_migrateRenameSettings`, `_publishIndexChanges`, `_reloadTimeSidecars`, `_remapNonMarkdownTimes`, `_remapRecentOpenedHistory`, `_updateSingleFile`, `isPathExcluded`, `saveSettings`, `throttleSaveCache`。

实例依赖：`_evictIndexedPath`, `_indexQueue`, `_isRemoteTimeSidecar`, `_migrateContentTimePath`, `_migrateCorePathState`, `_migrateRenameSettings`, `_publishIndexChanges`, `_reloadTimeSidecars`, `_remapNonMarkdownTimes`, `_remapRecentOpenedHistory`, `_unloaded`, `_updateSingleFile`, `bodyIndex`, `isPathExcluded`, `saveSettings`, `throttleSaveCache`。

### `_throttleSaveActivity()`

归属：`src/features/plugin/notifications-methods.js`；原始行 L26987；种类 method；static=False。

调用：`saveSettings`。

实例依赖：`_activitySaveTimer`, `_unloaded`, `saveSettings`。

### `_activeCoreFilterStates(core)`

归属：`src/features/plugin/notifications-methods.js`；原始行 L26998；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_settleCoreFilterMutation(core)`

归属：`src/features/plugin/notifications-methods.js`；原始行 L27011；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_forEachActiveSearchCore(callback)`

归属：`src/features/plugin/notifications-methods.js`；原始行 L27024；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`activeSearchCores`。

### `_refreshSearchCoreResultCards(core, { geometryChanged = false } = {})`

归属：`src/features/plugin/notifications-methods.js`；原始行 L27038；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_refreshActiveResultCards(options = {})`

归属：`src/features/plugin/notifications-methods.js`；原始行 L27052；种类 method；static=False。

调用：`_forEachActiveSearchCore`, `_refreshSearchCoreResultCards`。

实例依赖：`_forEachActiveSearchCore`, `_refreshSearchCoreResultCards`。

### `_refreshPickerOrderConsumers(kind)`

归属：`src/features/plugin/notifications-methods.js`；原始行 L27060；种类 method；static=False。

调用：`_forEachActiveSearchCore`, `_refreshSearchCoreResultCards`。

实例依赖：`_forEachActiveSearchCore`, `_refreshSearchCoreResultCards`。

### `_publishIndexChanges(paths = null, { refreshPools = true, projectChanged = false } = {})`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27086；种类 method；static=False。

调用：`_clearResidentSearchResults`, `_forEachActiveSearchCore`, `_publishProjectChanges`。

实例依赖：`_clearResidentSearchResults`, `_forEachActiveSearchCore`, `_publishProjectChanges`, `_unloaded`。

### `_publishProjectChanges(paths = null)`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27093；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_projectGroupSnapshot`, `_projectPropertySubscribers`。

### `subscribeProjectPropertyChanges(listener)`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27101；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_projectPropertySubscribers`, `_unloaded`。

### `_connectDidaProjectCatalog(providedOwner = null)`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27107；种类 method；static=False。

调用：`_didaProjectUnsubscribe`, `_refreshDidaProjectCatalog`。

实例依赖：`_didaProjectApi`, `_didaProjectOwner`, `_didaProjectUnsubscribe`, `_refreshDidaProjectCatalog`, `_unloaded`, `app`。

### `_refreshDidaProjectCatalog()`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27122；种类 method；static=False。

调用：`_publishIndexChanges`。

实例依赖：`_didaProjectApi`, `_didaProjectRows`, `_projectGroupSnapshot`, `_publishIndexChanges`, `_unloaded`。

### `_propertyValueCatalog()`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27135；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_propertyValueCatalogMap`, `_propertyValueCatalogSource`, `settings`。

### `propertyCatalogType(key, sample)`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27144；种类 method；static=False。

调用：`_propertyValueCatalog`。

实例依赖：`_propertyValueCatalog`, `app`。

### `propertyCatalogValues(key)`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27148；种类 method；static=False。

调用：`_propertyValueCatalog`, `getIndexedProjectGroups`。

实例依赖：`_propertyValueCatalog`, `getIndexedProjectGroups`。

### `hasPropertyCatalogValue(key, value)`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27157；种类 method；static=False。

调用：`_propertyValueCatalog`。

实例依赖：`_propertyValueCatalog`。

### `propertyCatalogKeys(keys = [], excluded = [])`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27161；种类 method；static=False。

调用：`_propertyValueCatalog`, `getIndexedProjectGroups`。

实例依赖：`_propertyValueCatalog`, `getIndexedProjectGroups`。

### `async addPropertyCatalogValues(operations = [])`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27167；种类 method；static=False。

调用：`_addPropertyCatalogValues`, `_withPropertyCatalogMutation`。

实例依赖：`_addPropertyCatalogValues`, `_withPropertyCatalogMutation`。

### `async _addPropertyCatalogValues(operations = [])`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27171；种类 method；static=False。

调用：`_invalidatePropertyCatalogViews`, `_publishIndexChanges`, `isVirtualPropertyKey`, `propertyCatalogType`, `saveSettings`。

实例依赖：`_invalidatePropertyCatalogViews`, `_propertyCatalogRevision`, `_publishIndexChanges`, `_unloaded`, `app`, `fileMetaCache`, `isVirtualPropertyKey`, `propertyCatalogType`, `saveSettings`, `settings`。

### `_remapPropertyValueCatalog({ key, nextKey, oldValue, newValue, removeKey = false, removeValue = false })`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27214；种类 method；static=False。

调用：`_clearResidentSearchResults`, `propertyCatalogType`。

实例依赖：`_clearResidentSearchResults`, `_projectGroupSnapshot`, `_propertyCatalogRevision`, `fileMetaCache`, `propertyCatalogType`, `settings`。

### `getIndexedProjectGroups()`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27240；种类 method；static=False。

调用：`_connectDidaProjectCatalog`, `_propertyValueCatalog`。

实例依赖：`_connectDidaProjectCatalog`, `_didaProjectRows`, `_projectGroupSnapshot`, `_propertyValueCatalog`, `fileMetaCache`。

### `getIndexedFileProperties(path)`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27289；种类 method；static=False。

调用：`isPathExcluded`。

实例依赖：`_unloaded`, `app`, `fileMetaCache`, `isPathExcluded`。

### `getIndexedPropertyCatalog()`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27297；种类 method；static=False。

调用：`_propertyValueCatalog`, `propertyCatalogType`, `propertyCatalogValues`。

实例依赖：`_propertyValueCatalog`, `_unloaded`, `app`, `batchMetadataService`, `fileMetaCache`, `propertyCatalogType`, `propertyCatalogValues`。

### `async patchExternalProperties({ paths = [], properties = [], addTags = [], removeTags = [] } = {})`

归属：`src/features/plugin/property-catalog-methods.js`；原始行 L27327；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`batchMetadataService`。

### `_queueFileIndex(path)`

归属：`src/features/plugin/index-queue-methods.js`；原始行 L27332；种类 method；static=False。

调用：`_flushIndexQueue`。

实例依赖：`_flushIndexQueue`, `_indexQueue`, `_indexRefreshTimer`, `_unloaded`, `globalContentCache`。

### `async _flushIndexQueueNow()`

归属：`src/features/plugin/index-queue-methods.js`；原始行 L27347；种类 method；static=False。

调用：`_flushIndexQueue`。

实例依赖：`_flushIndexQueue`, `_indexRefreshTimer`, `_unloaded`。

### `async _flushIndexQueue()`

归属：`src/features/plugin/index-queue-methods.js`；原始行 L27357；种类 method；static=False。

调用：`_evictIndexedPath`, `_flushIndexQueue`, `_publishIndexChanges`, `_removeContentTimePath`, `_updateSingleFile`, `throttleSaveCache`。

实例依赖：`_evictIndexedPath`, `_flushIndexQueue`, `_indexBuildPromise`, `_indexFlushPromise`, `_indexQueue`, `_publishIndexChanges`, `_removeContentTimePath`, `_unloaded`, `_updateSingleFile`, `app`, `fileMetaCache`, `settings`, `throttleSaveCache`。

### `async _readFileProperties(file)`

归属：`src/features/plugin/time-cache-methods.js`；原始行 L27418；种类 method；static=False。

调用：`_nonMarkdownProperties`。

实例依赖：`_nonMarkdownProperties`, `app`, `fileOperations`。

### `_setContentTimeEntry(path, entry)`

归属：`src/features/plugin/time-cache-methods.js`；原始行 L27424；种类 method；static=False。

调用：`_markContentTimeCacheDirty`。

实例依赖：`_markContentTimeCacheDirty`, `contentTimeCache`。

### `_removeContentTimePath(path)`

归属：`src/features/plugin/time-cache-methods.js`；原始行 L27447；种类 method；static=False。

调用：`_markContentTimeCacheDirty`。

实例依赖：`_markContentTimeCacheDirty`, `contentTimeCache`。

### `_removeContentTimePathPrefix(path)`

归属：`src/features/plugin/time-cache-methods.js`；原始行 L27453；种类 method；static=False。

调用：`_markContentTimeCacheDirty`。

实例依赖：`_markContentTimeCacheDirty`, `contentTimeCache`。

### `_migrateContentTimePath(oldPath, newPath, { descendants = false } = {})`

归属：`src/features/plugin/time-cache-methods.js`；原始行 L27472；种类 method；static=False。

调用：`_markContentTimeCacheDirty`。

实例依赖：`_markContentTimeCacheDirty`, `contentTimeCache`。

### `_markContentTimeCacheDirty()`

归属：`src/features/plugin/time-cache-methods.js`；原始行 L27503；种类 method；static=False。

调用：`saveContentTimeCache`。

实例依赖：`_contentTimePersistDirty`, `_contentTimePersistTimer`, `_indexBuildPromise`, `_indexFlushPromise`, `_unloaded`, `saveContentTimeCache`。

### `_flushContentTimeCacheSave()`

归属：`src/features/plugin/time-cache-methods.js`；原始行 L27536；种类 method；static=False。

调用：`saveContentTimeCache`。

实例依赖：`_contentTimePersistDirty`, `_contentTimePersistTimer`, `_unloaded`, `saveContentTimeCache`。

### `_pluginDirectory()`

归属：`src/features/plugin/metadata-directory-methods.js`；原始行 L27547；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`, `manifest`。

### `_metadataDirectory()`

归属：`src/features/plugin/metadata-directory-methods.js`；原始行 L27551；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`settings`。

### `_metadataHistoryFilename(writer = this._metadataWriterId)`

归属：`src/features/plugin/metadata-directory-methods.js`；原始行 L27556；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_metadataContentFilename(writer = this._metadataWriterId)`

归属：`src/features/plugin/metadata-directory-methods.js`；原始行 L27560；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_metadataNonMarkdownFilename(writer = this._metadataWriterId)`

归属：`src/features/plugin/metadata-directory-methods.js`；原始行 L27564；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `async _assertMetadataDirectoryDedicated(directory)`

归属：`src/features/plugin/metadata-directory-methods.js`；原始行 L27568；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`。

### `async _ensureMetadataDirectory(directory = this._metadataDirectory())`

归属：`src/features/plugin/metadata-directory-methods.js`；原始行 L27578；种类 method；static=False。

调用：`_assertMetadataDirectoryDedicated`, `_pluginDirectory`。

实例依赖：`_assertMetadataDirectoryDedicated`, `_pluginDirectory`, `app`。

### `async _metadataSidecarFiles(directory = this._metadataDirectory())`

归属：`src/features/plugin/metadata-directory-methods.js`；原始行 L27595；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`。

### `async changeMetadataDirectory(rawPath)`

归属：`src/features/plugin/metadata-directory-methods.js`；原始行 L27605；种类 method；static=False。

调用：`_ensureMetadataDirectory`, `_metadataDirectory`, `_metadataSidecarFiles`, `saveContentTimeCache`, `saveNonMarkdownTimes`, `saveRecentOpenedHistory`, `saveSettings`。

实例依赖：`_contentTimeWriteChain`, `_ensureMetadataDirectory`, `_metadataDirectory`, `_metadataDirectorySafe`, `_metadataHistoryWriteChain`, `_metadataSidecarFiles`, `_nonMarkdownWriteChain`, `app`, `saveContentTimeCache`, `saveNonMarkdownTimes`, `saveRecentOpenedHistory`, `saveSettings`, `settings`。

### `_markdownTimeFromFile(file, frontmatter = {}, fingerprint = "", fallback = 0,
        olderTracker = this.contentTimeCache.get(file.path), localAt = 0, fileFingerprint = "", metadataOnly = false)`

归属：`src/features/plugin/markdown-write-tracking-methods.js`；原始行 L27656；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`fileMetaCache`。

### `_markdownEditorViews(file)`

归属：`src/features/plugin/markdown-write-tracking-methods.js`；原始行 L27696；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`app`。

### `async _editMarkdownFrontmatter(file, transform, acceptRaw = null)`

归属：`src/features/plugin/markdown-write-tracking-methods.js`；原始行 L27705；种类 method；static=False。

调用：`_editMarkdownFrontmatter`, `_markdownEditorViews`。

实例依赖：`_editMarkdownFrontmatter`, `_markdownEditorViews`, `_unloaded`, `app`。

### `_scheduleMarkdownStamp(file)`

归属：`src/features/plugin/markdown-write-tracking-methods.js`；原始行 L27753；种类 method；static=False。

调用：`_editMarkdownFrontmatter`, `_queueFileIndex`。

实例依赖：`_editMarkdownFrontmatter`, `_markdownStampTasks`, `_markdownTimeWritePool`, `_queueFileIndex`, `_unloaded`, `app`, `contentTimeCache`, `settings`。

### `_timePayload(file, data)`

归属：`src/features/plugin/markdown-write-tracking-methods.js`；原始行 L27805；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_recordFileWrite(file, before, after, at, initialStats = file.stat, metadataOnly = false)`

归属：`src/features/plugin/markdown-write-tracking-methods.js`；原始行 L27814；种类 method；static=False。

调用：`_markdownTimeFromFile`, `_queueFileIndex`, `_resolveNonMarkdownTimes`, `_setContentTimeEntry`, `isPathExcluded`。

实例依赖：`_markdownTimeFromFile`, `_nonMarkdownLocal`, `_queueFileIndex`, `_resolveNonMarkdownTimes`, `_setContentTimeEntry`, `_unloaded`, `app`, `contentTimeCache`, `globalContentCache`, `isPathExcluded`。

### `_installTimeWriteCapture()`

归属：`src/features/plugin/markdown-write-tracking-methods.js`；原始行 L27836；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_timeWriteDisposers`, `app`。

### `_noteOwnedCreation(file, at = Date.now())`

归属：`src/features/plugin/markdown-write-tracking-methods.js`；原始行 L27934；种类 method；static=False。

调用：`_clearResidentSearchResults`。

实例依赖：`_clearResidentSearchResults`, `_nonMarkdownLocal`, `_nonMarkdownRecords`, `_ownedFileCreations`, `contentTimeCache`, `fileMetaCache`, `globalContentCache`。

### `_timeRecordValid(entry)`

归属：`src/features/plugin/markdown-write-tracking-methods.js`；原始行 L27947；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_nonMarkdownPropertyRecord(path, { activeOnly = false } = {})`

归属：`src/features/plugin/non-markdown-metadata-methods.js`；原始行 L27954；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_nonMarkdownRecords`。

### `_nonMarkdownProperties(path)`

归属：`src/features/plugin/non-markdown-metadata-methods.js`；原始行 L27968；种类 method；static=False。

调用：`_nonMarkdownPropertyRecord`。

实例依赖：`_nonMarkdownPropertyRecord`。

### `async _editNonMarkdownProperties(file, transform)`

归属：`src/features/plugin/non-markdown-metadata-methods.js`；原始行 L27974；种类 method；static=False。

调用：`_nonMarkdownProperties`, `_nonMarkdownPropertyRecord`, `_queueFileIndex`, `_resolveNonMarkdownTimes`, `isPathExcluded`, `saveNonMarkdownTimes`。

实例依赖：`_metadataWriterId`, `_nonMarkdownLocal`, `_nonMarkdownProperties`, `_nonMarkdownPropertyRecord`, `_queueFileIndex`, `_resolveNonMarkdownTimes`, `app`, `fileOperations`, `isPathExcluded`, `saveNonMarkdownTimes`。

### `async _reloadTimeSidecars()`

归属：`src/features/plugin/non-markdown-metadata-methods.js`；原始行 L27997；种类 method；static=False。

调用：`_forEachActiveSearchCore`, `_mergeRecentOpenedHistory`, `_queueFileIndex`, `_reloadTimeSidecars`, `loadContentTimeCache`, `loadNonMarkdownTimes`, `loadRecentOpenedHistory`。

实例依赖：`_forEachActiveSearchCore`, `_mergeRecentOpenedHistory`, `_nonMarkdownRecords`, `_queueFileIndex`, `_recentOpenedHistory`, `_reloadTimeSidecars`, `_sidecarReloadPending`, `_sidecarReloadPromise`, `_unloaded`, `app`, `contentTimeCache`, `loadContentTimeCache`, `loadNonMarkdownTimes`, `loadRecentOpenedHistory`。

### `_isRemoteTimeSidecar(path)`

归属：`src/features/plugin/non-markdown-metadata-methods.js`；原始行 L28030；种类 method；static=False。

调用：`_metadataContentFilename`, `_metadataDirectory`, `_metadataHistoryFilename`, `_metadataNonMarkdownFilename`。

实例依赖：`_metadataContentFilename`, `_metadataDirectory`, `_metadataHistoryFilename`, `_metadataNonMarkdownFilename`。

### `async loadNonMarkdownTimes({ preserveLocal = false } = {})`

归属：`src/features/plugin/non-markdown-metadata-methods.js`；原始行 L28036；种类 method；static=False。

调用：`_metadataNonMarkdownFilename`, `_metadataSidecarFiles`, `_timeRecordValid`。

实例依赖：`_metadataNonMarkdownFilename`, `_metadataSidecarFiles`, `_nonMarkdownLocal`, `_nonMarkdownRecords`, `_timeRecordValid`, `_unloaded`, `app`。

### `_resolveNonMarkdownTimes(file, fingerprint = "", localAt = 0, initialStats = file.stat)`

归属：`src/features/plugin/non-markdown-metadata-methods.js`；原始行 L28093；种类 method；static=False。

调用：`_nonMarkdownProperties`, `_nonMarkdownPropertyRecord`, `_scheduleNonMarkdownSave`。

实例依赖：`_nonMarkdownLocal`, `_nonMarkdownProperties`, `_nonMarkdownPropertyRecord`, `_nonMarkdownRecords`, `_ownedFileCreations`, `_scheduleNonMarkdownSave`, `fileMetaCache`。

### `_scheduleNonMarkdownSave()`

归属：`src/features/plugin/non-markdown-metadata-methods.js`；原始行 L28148；种类 method；static=False。

调用：`saveNonMarkdownTimes`。

实例依赖：`_nonMarkdownSaveTimer`, `saveNonMarkdownTimes`。

### `async saveNonMarkdownTimes({ mutation = null } = {})`

归属：`src/features/plugin/non-markdown-metadata-methods.js`；原始行 L28156；种类 method；static=False。

调用：`_ensureMetadataDirectory`, `_metadataDirectory`, `_metadataNonMarkdownFilename`, `_nonMarkdownProperties`, `_scheduleNonMarkdownSave`。

实例依赖：`_ensureMetadataDirectory`, `_metadataDirectory`, `_metadataNonMarkdownFilename`, `_metadataWriterId`, `_nonMarkdownLocal`, `_nonMarkdownProperties`, `_nonMarkdownRecords`, `_nonMarkdownSaveTimer`, `_nonMarkdownWriteChain`, `_scheduleNonMarkdownSave`, `_unloaded`, `app`。

### `_remapNonMarkdownTimes(oldPath, newPath, descendants = false)`

归属：`src/features/plugin/non-markdown-metadata-methods.js`；原始行 L28209；种类 method；static=False。

调用：`_nonMarkdownPropertyRecord`, `_scheduleNonMarkdownSave`。

实例依赖：`_metadataWriterId`, `_nonMarkdownLocal`, `_nonMarkdownPropertyRecord`, `_nonMarkdownRecords`, `_ownedFileCreations`, `_scheduleNonMarkdownSave`。

### `_deleteNonMarkdownTimes(path, descendants = false)`

归属：`src/features/plugin/non-markdown-metadata-methods.js`；原始行 L28271；种类 method；static=False。

调用：`_remapNonMarkdownTimes`。

实例依赖：`_remapNonMarkdownTimes`。

### `registerVirtualProperties(source = {})`

归属：`src/features/plugin/external-properties-methods.js`；原始行 L28278；种类 method；static=False。

调用：`_invalidateVirtualProperties`。

实例依赖：`_externalPropertyProviders`, `_invalidateVirtualProperties`, `_unloaded`。

### `isVirtualPropertyKey(key)`

归属：`src/features/plugin/external-properties-methods.js`；原始行 L28308；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_externalPropertyProviders`。

### `_searchMeta(meta)`

归属：`src/features/plugin/external-properties-methods.js`；原始行 L28313；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_externalMetaProjectionCache`, `_externalPropertyProviders`。

### `_invalidateVirtualProperties(paths = null)`

归属：`src/features/plugin/external-properties-methods.js`；原始行 L28349；种类 method；static=False。

调用：`_clearResidentSearchResults`, `_forEachActiveSearchCore`。

实例依赖：`_clearResidentSearchResults`, `_externalMetaProjectionCache`, `_forEachActiveSearchCore`。

### `openExternalFolderPicker(request = {})`

归属：`src/features/plugin/external-properties-methods.js`；原始行 L28364；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_externalFolderPickers`, `_hoverHintObserver`, `_unloaded`, `app`, `swipeBack`。

### `openExternalPropertyEditor(request = {})`

归属：`src/features/plugin/external-properties-methods.js`；原始行 L28437；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_externalPropertyPickers`, `_hoverHintObserver`, `_unloaded`, `app`, `swipeBack`。

### `async moveExternalFiles(request = {})`

归属：`src/features/plugin/external-properties-methods.js`；原始行 L28495；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_unloaded`, `app`, `fileOperations`。

### `markOpenedFromExternal(path)`

归属：`src/features/plugin/recent-history-storage-methods.js`；原始行 L28522；种类 method；static=False。

调用：`_touchRecentOpened`。

实例依赖：`_recentOpenedTrackingReady`, `_touchRecentOpened`, `_unloaded`, `app`。

### `getAuthoritativeFileTime(path)`

归属：`src/features/plugin/recent-history-storage-methods.js`；原始行 L28528；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`fileMetaCache`。

### `subscribeRecentOpened(listener)`

归属：`src/features/plugin/recent-history-storage-methods.js`；原始行 L28540；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_timeHistorySubscribers`, `_unloaded`。

### `_notifyRecentOpened()`

归属：`src/features/plugin/recent-history-storage-methods.js`；原始行 L28546；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_timeHistorySubscribers`。

### `getRecentOpenedHistory(limit = 100)`

归属：`src/features/plugin/recent-history-storage-methods.js`；原始行 L28552；种类 method；static=False。

调用：`isPathExcluded`。

实例依赖：`_recentOpenedHistory`, `app`, `isPathExcluded`。

### `_mergeRecentOpenedHistory()`

归属：`src/features/plugin/recent-history-storage-methods.js`；原始行 L28561；种类 method；static=False。

调用：`_notifyRecentOpened`, `isPathExcluded`。

实例依赖：`_notifyRecentOpened`, `_recentOpenedHistory`, `_recentOpenedLocal`, `isPathExcluded`, `settings`。

### `async loadRecentOpenedHistory({ preserveLocal = false } = {})`

归属：`src/features/plugin/recent-history-storage-methods.js`；原始行 L28584；种类 method；static=False。

调用：`_metadataDirectory`, `_metadataHistoryFilename`, `_metadataSidecarFiles`。

实例依赖：`_metadataDirectory`, `_metadataHistoryFilename`, `_metadataSidecarFiles`, `_recentOpenedHistory`, `_recentOpenedLocal`, `_unloaded`, `app`。

### `_throttleSaveRecentOpenedHistory()`

归属：`src/features/plugin/recent-history-storage-methods.js`；原始行 L28612；种类 method；static=False。

调用：`saveRecentOpenedHistory`。

实例依赖：`_metadataHistorySaveTimer`, `saveRecentOpenedHistory`。

### `async saveRecentOpenedHistory()`

归属：`src/features/plugin/recent-history-storage-methods.js`；原始行 L28620；种类 method；static=False。

调用：`_ensureMetadataDirectory`, `_metadataDirectory`, `_metadataHistoryFilename`。

实例依赖：`_ensureMetadataDirectory`, `_metadataDirectory`, `_metadataHistoryFilename`, `_metadataHistorySaveTimer`, `_metadataHistoryWriteChain`, `_metadataWriterId`, `_recentOpenedLocal`, `_recentOpenedSaveWarned`, `_unloaded`, `app`。

### `async _writablePluginDirectory()`

归属：`src/features/plugin/content-cache-methods.js`；原始行 L28649；种类 method；static=False。

调用：`_pluginDirectory`。

实例依赖：`_pluginDirectory`, `app`。

### `async saveContentTimeCache()`

归属：`src/features/plugin/content-cache-methods.js`；原始行 L28663；种类 method；static=False。

调用：`_ensureMetadataDirectory`, `_metadataContentFilename`, `_metadataDirectory`。

实例依赖：`_contentTimeWriteChain`, `_ensureMetadataDirectory`, `_metadataContentFilename`, `_metadataDirectory`, `_unloaded`, `app`, `contentTimeCache`。

### `async loadContentTimeCache()`

归属：`src/features/plugin/content-cache-methods.js`；原始行 L28701；种类 method；static=False。

调用：`_metadataDirectory`, `_metadataSidecarFiles`, `_pluginDirectory`。

实例依赖：`_metadataDirectory`, `_metadataSidecarFiles`, `_pluginDirectory`, `_unloaded`, `app`, `contentTimeCache`。

### `async getFileFullContent(file, { retain = true } = {})`

归属：`src/features/plugin/content-cache-methods.js`；原始行 L28755；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_unloaded`, `app`, `globalContentCache`。

### `_evictIndexedPath(path)`

归属：`src/features/plugin/content-cache-methods.js`；原始行 L28793；种类 method；static=False。

调用：`_clearResidentSearchResults`。

实例依赖：`_clearResidentSearchResults`, `_externalMetaProjectionCache`, `bodyIndex`, `fileMetaCache`, `globalContentCache`。

### `throttleSaveCache()`

归属：`src/features/plugin/content-cache-methods.js`；原始行 L28802；种类 method；static=False。

调用：`saveIndexCache`。

实例依赖：`_indexBuildPromise`, `_indexFlushPromise`, `_persistTimer`, `_unloaded`, `saveIndexCache`。

### `async _updateSingleFile(file)`

归属：`src/features/plugin/file-index-methods.js`；原始行 L28827；种类 method；static=False。

调用：`_clearResidentSearchResults`, `_evictIndexedPath`, `_indexValidationStamp`, `_markdownTimeFromFile`, `_nonMarkdownProperties`, `_queueFileIndex`, `_resolveNonMarkdownTimes`, `_scheduleMarkdownStamp`, `_setContentTimeEntry`, `getFileFullContent`, `isPathExcluded`。

实例依赖：`_clearResidentSearchResults`, `_evictIndexedPath`, `_indexValidationStamp`, `_markdownTimeFromFile`, `_nonMarkdownProperties`, `_queueFileIndex`, `_resolveNonMarkdownTimes`, `_scheduleMarkdownStamp`, `_setContentTimeEntry`, `_unloaded`, `app`, `bodyIndex`, `contentTimeCache`, `fileMetaCache`, `getFileFullContent`, `isPathExcluded`, `settings`。

### `isPathExcluded(path)`

归属：`src/features/plugin/file-index-methods.js`；原始行 L29052；种类 method；static=False。

调用：`_metadataDirectory`。

实例依赖：`_metadataDirectory`, `_metadataDirectorySafe`, `settings`。

### `isResultPathExcluded(path)`

归属：`src/features/plugin/file-index-methods.js`；原始行 L29063；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`settings`。

### `isResultAttachmentTypeExcluded(meta)`

归属：`src/features/plugin/file-index-methods.js`；原始行 L29069；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`settings`。

### `async buildMetaCache()`

归属：`src/features/plugin/file-index-methods.js`；原始行 L29075；种类 method；static=False。

调用：`_clearResidentSearchResults`, `_publishIndexChanges`, `_updateSingleFile`, `isPathExcluded`, `throttleSaveCache`。

实例依赖：`_clearResidentSearchResults`, `_indexBuildPromise`, `_indexFlushPromise`, `_publishIndexChanges`, `_unloaded`, `_updateSingleFile`, `app`, `bodyIndex`, `fileMetaCache`, `globalContentCache`, `isPathExcluded`, `settings`, `throttleSaveCache`。

### `_indexValidationStamp(file, parsedFrontmatter = undefined)`

归属：`src/features/plugin/file-index-methods.js`；原始行 L29107；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_nonMarkdownRecords`, `app`, `contentTimeCache`。

### `_needsIndexRefresh(file, cached = this.fileMetaCache.get(file.path))`

归属：`src/features/plugin/file-index-methods.js`；原始行 L29120；种类 method；static=False。

调用：`_indexValidationStamp`。

实例依赖：`_indexValidationStamp`。

### `async fullRebuildMetaCache()`

归属：`src/features/plugin/file-index-methods.js`；原始行 L29132；种类 method；static=False。

调用：`_evictIndexedPath`, `_needsIndexRefresh`, `_publishIndexChanges`, `_updateSingleFile`, `isPathExcluded`, `throttleSaveCache`。

实例依赖：`_evictIndexedPath`, `_indexBuildPromise`, `_indexFlushPromise`, `_needsIndexRefresh`, `_publishIndexChanges`, `_unloaded`, `_updateSingleFile`, `app`, `fileMetaCache`, `isPathExcluded`, `settings`, `throttleSaveCache`。

### `_captureActiveResultViewAnchors()`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29205；种类 method；static=False。

调用：`_forEachActiveSearchCore`。

实例依赖：`_forEachActiveSearchCore`。

### `_refreshActiveResultViewCores({
        rerender = true,
        anchors = null,
        clearEstimate = false
    } = {})`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29218；种类 method；static=False。

调用：`_forEachActiveSearchCore`。

实例依赖：`_forEachActiveSearchCore`。

### `_refreshFolderStateCores(change = null)`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29234；种类 method；static=False。

调用：`_forEachActiveSearchCore`。

实例依赖：`_forEachActiveSearchCore`。

### `async setExcludedFolders(paths)`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29246；种类 method；static=False。

调用：`_evictIndexedPath`, `_flushIndexQueueNow`, `_refreshFolderStateCores`, `isPathExcluded`, `saveSettings`, `throttleSaveCache`。

实例依赖：`_evictIndexedPath`, `_flushIndexQueueNow`, `_indexQueue`, `_refreshFolderStateCores`, `_unloaded`, `app`, `isPathExcluded`, `saveSettings`, `settings`, `throttleSaveCache`。

### `async setResultExcludedFolders(paths)`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29275；种类 method；static=False。

调用：`_refreshFolderStateCores`, `saveSettings`。

实例依赖：`_refreshFolderStateCores`, `saveSettings`, `settings`。

### `async setResultExcludedAttachmentTypes(extensions)`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29289；种类 method；static=False。

调用：`_refreshFolderStateCores`, `saveSettings`。

实例依赖：`_refreshFolderStateCores`, `saveSettings`, `settings`。

### `_refreshFilterPoolCores()`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29299；种类 method；static=False。

调用：`_forEachActiveSearchCore`。

实例依赖：`_forEachActiveSearchCore`。

### `async setFilterPoolSelectionMode(poolId, mode)`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29305；种类 method；static=False。

调用：`_forEachActiveSearchCore`, `saveSettings`。

实例依赖：`_forEachActiveSearchCore`, `saveSettings`, `settings`。

### `async setFilterPools(pools)`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29325；种类 method；static=False。

调用：`_refreshFilterPoolCores`, `saveSettings`。

实例依赖：`_refreshFilterPoolCores`, `saveSettings`, `settings`。

### `_refreshResultSortCores()`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29350；种类 method；static=False。

调用：`_forEachActiveSearchCore`。

实例依赖：`_forEachActiveSearchCore`。

### `async setResultSortPreferences({ order, hidden } = {})`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29361；种类 method；static=False。

调用：`_refreshResultSortCores`, `saveSettings`。

实例依赖：`_refreshResultSortCores`, `saveSettings`, `settings`。

### `async setActiveResultView(viewId)`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29387；种类 method；static=False。

调用：`_captureActiveResultViewAnchors`, `_refreshActiveResultViewCores`, `saveSettings`。

实例依赖：`_captureActiveResultViewAnchors`, `_refreshActiveResultViewCores`, `saveSettings`, `settings`。

### `async updateActiveResultViewConfig(patch = {})`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29403；种类 method；static=False。

调用：`_captureActiveResultViewAnchors`, `_refreshActiveResultViewCores`, `saveSettings`。

实例依赖：`_captureActiveResultViewAnchors`, `_refreshActiveResultViewCores`, `saveSettings`, `settings`。

### `async resetActiveResultView()`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29433；种类 method；static=False。

调用：`_captureActiveResultViewAnchors`, `_refreshActiveResultViewCores`, `saveSettings`。

实例依赖：`_captureActiveResultViewAnchors`, `_refreshActiveResultViewCores`, `saveSettings`, `settings`。

### `async cycleActiveResultView()`

归属：`src/features/plugin/view-preferences-methods.js`；原始行 L29453；种类 method；static=False。

调用：`openSearchModal`, `setActiveResultView`。

实例依赖：`activeSearchCores`, `openSearchModal`, `setActiveResultView`, `settings`。

### `_normalizeExternalSearchRequest(request = {})`

归属：`src/features/plugin/external-search-methods.js`；原始行 L29470；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：无直接 this 字段引用。

### `_openSearchSession(options = {})`

归属：`src/features/plugin/external-search-methods.js`；原始行 L29535；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_unloaded`, `app`, `searchSession`。

### `_externalSearchOptions(source)`

归属：`src/features/plugin/external-search-methods.js`；原始行 L29558；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`settings`。

### `openExternalSearch(request = {})`

归属：`src/features/plugin/external-search-methods.js`；原始行 L29637；种类 method；static=False。

调用：`_externalSearchOptions`, `_normalizeExternalSearchRequest`, `_openSearchSession`。

实例依赖：`_externalSearchOptions`, `_normalizeExternalSearchRequest`, `_openSearchSession`, `_unloaded`。

### `mountExternalSearch(host, request = {})`

归属：`src/features/plugin/external-search-methods.js`；原始行 L29648；种类 method；static=False。

调用：`_externalSearchOptions`, `_normalizeExternalSearchRequest`。

实例依赖：`_embeddedSearchSessions`, `_externalSearchOptions`, `_normalizeExternalSearchRequest`, `_unloaded`, `app`, `swipeBack`。

### `openFloatingSearch()`

归属：`src/features/plugin/external-search-methods.js`；原始行 L29758；种类 method；static=False。

调用：`_openSearchSession`。

实例依赖：`_openSearchSession`, `_unloaded`, `searchSession`。

### `openSearchModal()`

归属：`src/features/plugin/external-search-methods.js`；原始行 L29772；种类 method；static=False。

调用：`_openSearchSession`。

实例依赖：`_openSearchSession`, `_unloaded`, `searchSession`。

### `toggleSearchModal()`

归属：`src/features/plugin/external-search-methods.js`；原始行 L29779；种类 method；static=False。

调用：`_openSearchSession`。

实例依赖：`_openSearchSession`, `_unloaded`, `searchSession`。

### `_normalizeSettingsInPlace()`

归属：`src/features/plugin/settings-storage-methods.js`；原始行 L29788；种类 method；static=False。

调用：`_normalizeFavoriteSearches`, `_normalizeSearchHistory`, `_sameSearchQuery`。

实例依赖：`_normalizeFavoriteSearches`, `_normalizeSearchHistory`, `_sameSearchQuery`, `settings`。

### `async loadSettings()`

归属：`src/features/plugin/settings-storage-methods.js`；原始行 L29906；种类 method；static=False。

调用：`_normalizeSettingsInPlace`, `_queueSettingsSnapshot`, `loadData`。

实例依赖：`_normalizeSettingsInPlace`, `_queueSettingsSnapshot`, `_unloaded`, `loadData`, `settings`。

### `_queueSettingsSnapshot()`

归属：`src/features/plugin/settings-storage-methods.js`；原始行 L30135；种类 method；static=False。

调用：`_writablePluginDirectory`, `saveData`。

实例依赖：`_settingsWriteChain`, `_unloaded`, `_writablePluginDirectory`, `saveData`, `settings`。

### `async saveSettings()`

归属：`src/features/plugin/settings-storage-methods.js`；原始行 L30155；种类 method；static=False。

调用：`_clearResidentSearchResults`, `_normalizeSettingsInPlace`, `_queueSettingsSnapshot`。

实例依赖：`_activitySaveTimer`, `_clearResidentSearchResults`, `_normalizeSettingsInPlace`, `_queueSettingsSnapshot`, `_unloaded`, `settings`。

### `_clearResidentSearchResults()`

归属：`src/features/plugin/index-storage-methods.js`；原始行 L30166；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_residentSearchResultRows`, `_residentSearchResults`。

### `_getResidentSearchSnapshot(key)`

归属：`src/features/plugin/index-storage-methods.js`；原始行 L30171；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_residentSearchResults`, `_unloaded`, `settings`。

### `_getResidentSearchResults(key)`

归属：`src/features/plugin/index-storage-methods.js`；原始行 L30180；种类 method；static=False。

调用：`_getResidentSearchSnapshot`。

实例依赖：`_getResidentSearchSnapshot`。

### `_rememberSearchResults(key, ranked, active)`

归属：`src/features/plugin/index-storage-methods.js`；原始行 L30188；种类 method；static=False。

调用：`_rememberSearchSnapshot`。

实例依赖：`_rememberSearchSnapshot`, `_unloaded`, `settings`。

### `_rememberSearchSnapshot(key, entry)`

归属：`src/features/plugin/index-storage-methods.js`；原始行 L30196；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`_residentSearchResultRows`, `_residentSearchResults`, `_unloaded`, `settings`。

### `async saveIndexCache()`

归属：`src/features/plugin/index-storage-methods.js`；原始行 L30213；种类 method；static=False。

调用：`_writablePluginDirectory`。

实例依赖：`_persistWriteChain`, `_unloaded`, `_writablePluginDirectory`, `app`, `bodyIndex`, `fileMetaCache`, `settings`。

### `async loadIndexCache()`

归属：`src/features/plugin/index-storage-methods.js`；原始行 L30270；种类 method；static=False。

调用：`_clearResidentSearchResults`, `_pluginDirectory`, `_publishIndexChanges`, `isPathExcluded`。

实例依赖：`_clearResidentSearchResults`, `_indexCacheRestored`, `_pluginDirectory`, `_publishIndexChanges`, `_unloaded`, `app`, `bodyIndex`, `fileMetaCache`, `isPathExcluded`, `settings`。

### `onunload()`

归属：`src/core/LocalSearchPlugin.js`；原始行 L30333；种类 method；static=False。

调用：`_clearResidentSearchResults`, `_didaProjectUnsubscribe`, `_flushContentTimeCacheSave`, `saveNonMarkdownTimes`, `saveRecentOpenedHistory`, `saveSettings`。

实例依赖：`_activitySaveTimer`, `_clearResidentSearchResults`, `_closedSearchViewStates`, `_contentTimePersistTimer`, `_currentFileOperationOverlay`, `_didaProjectApi`, `_didaProjectOwner`, `_didaProjectRows`, `_didaProjectUnsubscribe`, `_embeddedSearchSessions`, `_externalFolderPickers`, `_externalMetaProjectionCache`, `_externalMobileFrames`, `_externalPropertyPickers`, `_externalPropertyProviders`, `_flushContentTimeCacheSave`, `_hoverHintObserver`, `_indexQueue`, `_indexRefreshTimer`, `_markdownStampTasks`, `_metadataHistorySaveTimer`, `_nonMarkdownLocal`, `_nonMarkdownRecords`, `_nonMarkdownSaveTimer`, `_ownedFileCreations`, `_persistTimer`, `_projectPropertySubscribers`, `_recentOpenedTrackingReady`, `_renameSettles`, `_timeHistorySubscribers`, `_timeWriteDisposers`, `_unloaded`, `_workspaceOpenTasks`, `activeSearchCores`, `app`, `bodyIndex`, `contentTimeCache`, `fileMetaCache`, `globalContentCache`, `saveNonMarkdownTimes`, `saveRecentOpenedHistory`, `saveSettings`, `searchSession`, `sharedSearchState`, `swipeBack`。

## SortFeedback

### `constructor(source)`

归属：`src/interactions/sort-feedback.js`；原始行 L30540；种类 constructor；static=False。

调用：无直接 this.method 调用。

实例依赖：`actionEl`, `badge`, `doc`, `line`, `name`, `nameEl`, `root`, `source`, `target`。

### `show({ bounds, clip = bounds, y = null, pointerY, label, target = null })`

归属：`src/interactions/sort-feedback.js`；原始行 L30565；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`actionEl`, `doc`, `line`, `root`, `source`, `target`。

### `destroy()`

归属：`src/interactions/sort-feedback.js`；原始行 L30590；种类 method；static=False。

调用：无直接 this.method 调用。

实例依赖：`actionEl`, `badge`, `doc`, `line`, `nameEl`, `root`, `source`, `target`。

## mobile-sidebar-stability.1 生命周期备注

- `syncMobileSidebarSurface(view, active)`（`src/ui/views/SearchView.js`）：Obsidian 原生移动侧栏样式 Owner（模块内私有帮助函数，不修改 SearchView 原型）；onOpen / 同侧栏 leaf 切换 / 原生 split 关闭及 onResize 恢复 / onClose 统一调用，WeakMap 保护同侧栏不同 SearchView 不互相撤销样式。没有公开 API。
- `MobileFrameController.refresh()`（`src/ui/mobile/mobile-frame.js`）：键盘是 document 信号；原生叶视图 `preserveFrame:false` 只在 `ownsFocus(activeElement)` 时锁定；保留独立 Picker 的共享键盘接力与锁框时机。
- `LocalSearchPlugin._queueFileIndex()` 与 `_flushIndexQueue()`（`src/features/plugin/index-queue-methods.js`）：新增仅构造器级临时 Map/Set/Timer 的有限次退避重试；onunload 同步清理；不新增持久化索引结构。
- `SearchNavigatorController._syncMobileTools()` 按页面上下文进入时恢复横向命令滚动为 0；`showResults()` 保留原结果页显示搜索框的行为，但不添加自动焦点与键盘唤起。
