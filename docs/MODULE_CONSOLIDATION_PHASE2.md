# 第二批同一所有者方法组归一

合并前后方法组仍是独立导出的对象字面量，`composeClassMethods` 的数组项和顺序不变。

1. `open-selection-methods.js` 归入 `file-actions-methods.js`，`SearchCore_open_selection_methods` 导出不变。
2. `recent-history-storage-methods.js` 归入 `recent-history-state-methods.js`，两个方法组导出与插件装配顺序不变。
3. `picker-model-methods.js` 归入 `SearchFacetController.js`，`SearchFacetController_picker_model_methods` 导出与装配顺序不变。

源码模块数预计 152 → 146，JS/DOM/事件/数据/API 行为不改变。新文件不能作为唯一正式基线，必须在真实宿主验收后另行冻结。
