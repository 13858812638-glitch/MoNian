# GLS v5.2 · 模块归一 v2 候选 · 当前 146 模块职责索引

> **以本文件为准定位当前 `src/`。** v5.2「独立浮窗退役」仍为唯一正式冻结基线；模块归一 v1 / v2 均为未冻结候选。不得依据旧版 152/153 模块文档回填代码。

- 当前源模块：**146**；静态导入边：**635**；工程检查：**PASS-ENGINEERING**。
- 所有运行模块路径均来自当前 `src/`，没有孤立或已经退役的旧文件。
- 方法归属由当前 `src/` 及 `composeClassMethods()` 确定；`METHOD_INDEX.md` 的原始行号仅是旧源码溯源，不应作为当前行号。
- 普通属性目录正式 Owner：`src/features/plugin/property-catalog-methods.js`；当前运行源码不再使用旧项目目录模块。

| 当前模块 | 行数 | 主要职责 | 导出 |
|---|---:|---|---|
| `src/core/LocalSearchPlugin.js` | 456 | 插件生命周期、搜索会话与状态归属 | `LocalSearchPlugin` |
| `src/core/SearchCore.js` | 220 | 插件生命周期、搜索会话与状态归属 | `SEARCH_CORE_UI_REF_KEYS`、`SearchCore` |
| `src/core/SharedSearchStateCoordinator.js` | 207 | 插件生命周期、搜索会话与状态归属 | `SharedSearchStateCoordinator` |
| `src/core/compose-class-methods.js` | 30 | 插件生命周期、搜索会话与状态归属 | `composeClassMethods` |
| `src/core/default-settings.js` | 57 | 插件生命周期、搜索会话与状态归属 | `DEFAULT_SETTINGS` |
| `src/core/picker-cleanup.js` | 20 | 插件生命周期、搜索会话与状态归属 | `disposePickerCleanup`、`registerPickerCleanup` |
| `src/core/search/file-actions-methods.js` | 359 | 插件生命周期、搜索会话与状态归属 | `SearchCore_file_actions_methods`、`SearchCore_open_selection_methods` |
| `src/core/search/input-and-filters-methods.js` | 521 | 插件生命周期、搜索会话与状态归属 | `SearchCore_input_and_filters_methods` |
| `src/core/search/result-menu-events-methods.js` | 269 | 插件生命周期、搜索会话与状态归属 | `SearchCore_result_menu_events_methods` |
| `src/core/search/search-and-ranking-methods.js` | 442 | 插件生命周期、搜索会话与状态归属 | `RESULT_TEXT_COLLATOR`、`SearchCore_search_and_ranking_methods` |
| `src/core/search/session-methods.js` | 129 | 插件生命周期、搜索会话与状态归属 | `SearchCore_session_methods` |
| `src/core/search/shell-methods.js` | 410 | 插件生命周期、搜索会话与状态归属 | `SearchCore_shell_methods` |
| `src/core/session-values.js` | 35 | 插件生命周期、搜索会话与状态归属 | `normalizeModalSearchQuery`、`normalizeModalViewportAnchor` |
| `src/core/view-types.js` | 9 | 插件生命周期、搜索会话与状态归属 | `VIEW_TYPE`、`TAB_VIEW_TYPE` |
| `src/data/folders/folder-tree.js` | 181 | 索引、元数据与纯数据模型 | `sharedFolderChildren`、`comparePickerTreePaths`、`orderFolderSelectionsForPicker` 等 8 项 |
| `src/data/formats/drawing-content.js` | 158 | 索引、元数据与纯数据模型 | `canvasNodeCountFromContent`、`LZ_BASE64_ALPHABET`、`LZ_BASE64_INDEX` 等 6 项 |
| `src/data/formats/drawing-detection.js` | 21 | 索引、元数据与纯数据模型 | `EXCALIDRAW_DRAWING_SUFFIX`、`hasExcalidrawFrontmatter`、`isExcalidrawMeta` |
| `src/data/formats/file-types.js` | 116 | 索引、元数据与纯数据模型 | `attachmentExtension`、`normalizeExcludedAttachmentTypes`、`FILE_TYPE_ICONS` 等 13 项 |
| `src/data/index/BodyIndex.js` | 32 | 索引、元数据与纯数据模型 | `BodyIndex` |
| `src/data/index/index-version.js` | 6 | 索引、元数据与纯数据模型 | `INDEX_CACHE_VERSION` |
| `src/data/properties/property-catalog.js` | 117 | 索引、元数据与纯数据模型 | `collectPropertyKeys`、`orderPropertyValuesForPicker`、`orderSelectedPropertyValues` 等 6 项 |
| `src/data/properties/property-types.js` | 146 | 索引、元数据与纯数据模型 | `PROPERTY_TYPE_OPTIONS`、`normalizeMetadataPropertyType`、`metadataPropertySample` 等 10 项 |
| `src/data/properties/property-values.js` | 393 | 索引、元数据与纯数据模型 | `MISSING_PROPERTY_VALUE`、`EMPTY_PROPERTY_VALUE`、`PRESENT_PROPERTY_VALUE` 等 22 项 |
| `src/data/properties/raw-mutations.js` | 99 | 索引、元数据与纯数据模型 | `removeRawPropertyValues`、`renameRawPropertyValue` |
| `src/data/tags/tag-tree.js` | 99 | 索引、元数据与纯数据模型 | `buildTagTreeModel`、`flattenTagTreePaths`、`orderTagsForPicker` 等 4 项 |
| `src/data/tags/tag-values.js` | 103 | 索引、元数据与纯数据模型 | `normalizeTagValue`、`tagIdentityKey`、`normalizeUniqueTagList` 等 7 项 |
| `src/data/time/time-values.js` | 158 | 索引、元数据与纯数据模型 | `GLS_MANAGED_TIME_KEYS`、`indexedFileProperties`、`markdownBodyForContentTracking` 等 15 项 |
| `src/features/batch/BatchMetadataController.js` | 31 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `BatchMetadataController` |
| `src/features/batch/mutation-flow-methods.js` | 245 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `BatchMetadataController_mutation_flow_methods` |
| `src/features/batch/property-editor-methods.js` | 789 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `BatchMetadataController_property_editor_methods` |
| `src/features/batch/tag-editor-methods.js` | 252 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `BatchMetadataController_tag_editor_methods` |
| `src/features/create/SearchCreateController.js` | 42 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchCreateController` |
| `src/features/create/create-file-methods.js` | 233 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchCreateController_create_file_methods` |
| `src/features/create/create-model.js` | 92 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `CREATE_TYPE_IDS`、`normalizeCreateType`、`createTypeFromFileType` 等 6 项 |
| `src/features/create/draft-and-metadata-methods.js` | 399 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchCreateController_draft_and_metadata_methods` |
| `src/features/create/input-mode-methods.js` | 342 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchCreateController_input_mode_methods` |
| `src/features/create/payload-methods.js` | 263 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchCreateController_payload_methods` |
| `src/features/create/preview-methods.js` | 242 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchCreateController_preview_methods` |
| `src/features/facets/SearchFacetController.js` | 102 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchFacetController`、`SearchFacetController_picker_model_methods` |
| `src/features/facets/folder-colors-methods.js` | 270 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchFacetController_folder_colors_methods` |
| `src/features/facets/folder-picker-methods.js` | 518 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchFacetController_folder_picker_methods` |
| `src/features/facets/property-picker-methods.js` | 1082 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchFacetController_property_picker_methods` |
| `src/features/facets/sidebar-maintenance-methods.js` | 235 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchFacetController_sidebar_maintenance_methods` |
| `src/features/facets/tag-picker-methods.js` | 546 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchFacetController_tag_picker_methods` |
| `src/features/facets/type-picker-methods.js` | 313 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchFacetController_type_picker_methods` |
| `src/features/filters/FilterEngine.js` | 83 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `FilterEngine` |
| `src/features/filters/filter-state.js` | 334 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `normalizeFileTypeFilterValue`、`normalizeFileTypeFilterSelection`、`normalizeFilterMatchMode` 等 12 项 |
| `src/features/filters/pool-config.js` | 121 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `FILTER_POOL_KINDS`、`FILTER_POOL_FIXED_DEFS`、`normalizeFilterPoolSelectionMode` 等 9 项 |
| `src/features/filters/pool-values.js` | 76 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `filterPoolLabel`、`filterPoolIcon`、`filterPoolValueKey` 等 7 项 |
| `src/features/folders/exclusions.js` | 89 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `normalizeExcludedFolders`、`isFolderExclusionInherited`、`toggleFolderExclusionSelection` 等 4 项 |
| `src/features/folders/folder-colors.js` | 63 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `normalizeHexColor`、`normalizeResultFolderColors`、`resultFolderColorConfig` |
| `src/features/navigator/NavigatorCustomization.js` | 605 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `NavigatorCustomization` |
| `src/features/navigator/SearchNavigatorController.js` | 1056 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchNavigatorController` |
| `src/features/navigator/customization-model.js` | 141 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `NAVIGATOR_CUSTOMIZATION_KINDS`、`navigatorItemId`、`parseNavigatorItemId` 等 5 项 |
| `src/features/navigator/toolbar-config.js` | 127 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `NAVIGATOR_TOOLBAR_CONTEXTS`、`NAVIGATOR_TOOLBAR_ACTIONS`、`navigatorToolbarActionIdIsValid` 等 10 项 |
| `src/features/plugin/content-cache-methods.js` | 193 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_content_cache_methods` |
| `src/features/plugin/external-properties-methods.js` | 272 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_external_properties_methods` |
| `src/features/plugin/external-search-methods.js` | 326 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_external_search_methods` |
| `src/features/plugin/file-command-actions-methods.js` | 100 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_file_command_actions_methods` |
| `src/features/plugin/file-index-methods.js` | 401 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_file_index_methods` |
| `src/features/plugin/index-queue-methods.js` | 131 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_index_queue_methods` |
| `src/features/plugin/index-storage-methods.js` | 183 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_index_storage_methods` |
| `src/features/plugin/markdown-write-tracking-methods.js` | 318 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_markdown_write_tracking_methods` |
| `src/features/plugin/metadata-directory-methods.js` | 123 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_metadata_directory_methods` |
| `src/features/plugin/non-markdown-metadata-methods.js` | 342 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_non_markdown_metadata_methods` |
| `src/features/plugin/notifications-methods.js` | 115 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_notifications_methods` |
| `src/features/plugin/path-lifecycle-methods.js` | 607 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_path_lifecycle_methods` |
| `src/features/plugin/property-catalog-methods.js` | 213 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_property_catalog_methods` |
| `src/features/plugin/property-maintenance-methods.js` | 508 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_property_maintenance_methods` |
| `src/features/plugin/recent-history-state-methods.js` | 232 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_recent_history_state_methods`、`LocalSearchPlugin_recent_history_storage_methods` |
| `src/features/plugin/search-history-methods.js` | 252 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_search_history_methods` |
| `src/features/plugin/settings-storage-methods.js` | 407 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_settings_storage_methods` |
| `src/features/plugin/time-cache-methods.js` | 144 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_time_cache_methods` |
| `src/features/plugin/tree-maintenance-methods.js` | 351 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_tree_maintenance_methods` |
| `src/features/plugin/view-preferences-methods.js` | 293 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_view_preferences_methods` |
| `src/features/plugin/workspace-entry-methods.js` | 87 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `LocalSearchPlugin_workspace_entry_methods` |
| `src/features/result-controls/SearchResultControlsController.js` | 35 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultControlsController` |
| `src/features/result-controls/filter-pool-editor-methods.js` | 789 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultControlsController_filter_pool_editor_methods` |
| `src/features/result-controls/search-history-methods.js` | 206 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultControlsController_search_history_methods` |
| `src/features/result-controls/toolbar-methods.js` | 148 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultControlsController_toolbar_methods` |
| `src/features/result-controls/view-composer-methods.js` | 947 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultControlsController_view_composer_methods` |
| `src/features/results/SearchResultRendererController.js` | 94 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultRendererController` |
| `src/features/results/SparseHeightIndex.js` | 87 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SparseHeightIndex` |
| `src/features/results/card-metadata-methods.js` | 347 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultRendererController_card_metadata_methods` |
| `src/features/results/filter-channels-methods.js` | 310 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultRendererController_filter_channels_methods` |
| `src/features/results/page-and-snippets-methods.js` | 274 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultRendererController_page_and_snippets_methods` |
| `src/features/results/result-card-methods.js` | 207 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultRendererController_result_card_methods` |
| `src/features/results/view-config.js` | 166 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `RESULT_VIEW_IDS`、`RESULT_VIEW_LABELS`、`RESULT_CONTENT_DEFS` 等 11 项 |
| `src/features/results/viewport-anchors-methods.js` | 397 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultRendererController_viewport_anchors_methods` |
| `src/features/results/viewport-geometry-methods.js` | 441 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultRendererController_viewport_geometry_methods` |
| `src/features/results/virtual-window-methods.js` | 441 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchResultRendererController_virtual_window_methods` |
| `src/features/results/virtualization-config.js` | 51 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `RESULT_WINDOW_MOUNT_MIN`、`RESULT_WINDOW_MOUNT_MAX`、`RESULT_WINDOW_BUFFER_MIN` 等 6 项 |
| `src/features/search/QueryState.js` | 19 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `QueryState` |
| `src/features/search/ResultRanker.js` | 58 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `ResultRanker` |
| `src/features/selection/SearchSelectionController.js` | 543 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SEARCH_SELECTION_UI_REF_KEYS`、`SearchSelectionController` |
| `src/features/sort/SearchSortController.js` | 381 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SearchSortController` |
| `src/features/sort/sort-model.js` | 106 | 搜索与筛选、Picker 工作流、创建、结果渲染及批量功能 | `SORT_FIELD_DEFS`、`SORT_FIELD_IDS`、`DEFAULT_SORT_FIELD_ORDER` 等 11 项 |
| `src/integrations/SearchWorkspaceCapabilities.js` | 47 | 对外合同与 Obsidian 工作区能力 | `SearchWorkspaceCapabilities` |
| `src/integrations/public-contract.js` | 31 | 对外合同与 Obsidian 工作区能力 | `EXTERNAL_SEARCH_API_VERSION`、`EXTERNAL_SEARCH_API_CAPABILITIES` |
| `src/interactions/PointerSortCoordinator.js` | 327 | 触控、滚动、拖拽、滑动及反馈 | `PointerSortCoordinator` |
| `src/interactions/SwipeActionCoordinator.js` | 679 | 触控、滚动、拖拽、滑动及反馈 | `RESULT_SWIPE_INTENT_SLOP_PX`、`RESULT_SWIPE_HORIZONTAL_BIAS`、`RESULT_SWIPE_SETTLE_RATIO` 等 5 项 |
| `src/interactions/hover-hints.js` | 114 | 触控、滚动、拖拽、滑动及反馈 | `supportsPluginFineHover`、`installPluginHoverHintSuppression` |
| `src/interactions/scroll-anchor.js` | 120 | 触控、滚动、拖拽、滑动及反馈 | `captureScrollableAnchor`、`restoreScrollableAnchor`、`revealScrollableKey` 等 5 项 |
| `src/interactions/sort-feedback.js` | 65 | 触控、滚动、拖拽、滑动及反馈 | `SortFeedback` |
| `src/interactions/swipe-back.js` | 314 | 触控、滚动、拖拽、滑动及反馈 | `swipeBackCanNavigate`、`swipeBackResolve`、`swipeBackNativeGestureOwner` 等 8 项 |
| `src/main.js` | 2 | 插件生命周期、搜索会话与状态归属 | （内部入口） |
| `src/services/BatchMetadataService.js` | 389 | 实际文件写入与批量操作服务 | `NO_FRONTMATTER_WRITE`、`assertVaultPropertyMutationSucceeded`、`BatchMetadataService` |
| `src/services/FileOperationService.js` | 285 | 实际文件写入与批量操作服务 | `FileOperationService` |
| `src/services/IoPool.js` | 47 | 实际文件写入与批量操作服务 | `IoPool` |
| `src/ui/components/indicator-label.js` | 14 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `setIndicatorLabel` |
| `src/ui/components/input-controls.js` | 99 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `initializeSearchInteractionElement`、`createSearchButton`、`createSearchInput` 等 6 项 |
| `src/ui/components/property-state.js` | 75 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `appendPropertySpecialStateInlineGroup` |
| `src/ui/components/view-composer.js` | 120 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `createViewComposerChoice`、`syncViewComposerChoiceSelection`、`createViewComposerSection` 等 5 项 |
| `src/ui/dialogs/dialog-session.js` | 209 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `createDialogSession`、`openSearchRenameDialog`、`openPickerDeleteDialog` |
| `src/ui/dialogs/dialog-surface.js` | 100 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `createSearchDialogContent`、`createSharedDialogSurface` |
| `src/ui/dialogs/submission.js` | 65 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `trapDialogTab`、`createDialogSubmission` |
| `src/ui/hosts/SearchWindowSession.js` | 690 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `SearchWindowSession` |
| `src/ui/hosts/modal-host.js` | 56 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `SearchModalHost`、`stripObsidianModalChrome` |
| `src/ui/mobile/mobile-frame.js` | 214 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `MOBILE_FRAME_OWNER`、`MobileFrameController`、`mountMobileFrame` |
| `src/ui/overlays/LocalSearchOverlayHost.js` | 131 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `LocalSearchOverlayHost` |
| `src/ui/overlays/OperationOverlayController.js` | 153 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `OperationOverlayController` |
| `src/ui/overlays/SearchDropdownController.js` | 684 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `SearchDropdownController` |
| `src/ui/overlays/geometry.js` | 33 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `resolveOverlayBounds`、`resolveDropdownViewportBounds` |
| `src/ui/overlays/popup-order.js` | 25 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `markSearchPopupActive`、`topSearchPopupSurface` |
| `src/ui/pickers/count-rail.js` | 21 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `observePickerCountRail` |
| `src/ui/pickers/folder-picker.js` | 216 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `renderSharedFolderTreePicker` |
| `src/ui/pickers/header-modes.js` | 117 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `attachFacetPickerOverflow`、`attachPickerHeaderModes` |
| `src/ui/pickers/icon-catalog.js` | 52 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `PROPERTY_SHORTCUT_DEFAULT_ICON`、`FILTER_TOOLBAR_ICON_PRESETS`、`normalizeRecentIconIds` 等 6 项 |
| `src/ui/pickers/icon-picker.js` | 82 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `openFilterToolbarIconPicker` |
| `src/ui/pickers/picker-header.js` | 131 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `createPickerHeaderIconAction`、`configureSharedPickerHeader` |
| `src/ui/pickers/picker-shell.js` | 117 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `createSharedPickerFooter`、`createSharedPickerTreeShell`、`setPickerSearchMode` 等 5 项 |
| `src/ui/pickers/selection-mode.js` | 188 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `facetSelectionCount`、`commitFacetSelectionState`、`deactivateConflictingFacetPickerModes` 等 4 项 |
| `src/ui/pickers/selection-strip.js` | 95 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `createSharedPickerSelectionStrip` |
| `src/ui/pickers/sort-mode.js` | 84 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `attachPickerSortModeToggle`、`attachFacetPickerSortModeToggle` |
| `src/ui/pickers/template-picker.js` | 167 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `createTemplateFilesForType`、`orderTemplateFilesForPicker`、`openTemplateFilePicker` |
| `src/ui/pickers/tree-row.js` | 222 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `createSharedPickerTreeRow`、`syncSharedPickerTreeRowAvailability`、`createTreeActionButton` 等 4 项 |
| `src/ui/settings/LocalSearchSettingTab.js` | 257 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `LocalSearchSettingTab` |
| `src/ui/settings/setting-row.js` | 73 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `createPluginSettingClass`、`SearchSettingRow` |
| `src/ui/views/SearchView.js` | 205 | 宿主视图、Picker 原语、Dialog 与交互呈现 | `SearchView` |
| `src/utils/dom.js` | 49 | 无状态的通用辅助函数 | `hostDocument`、`hostWindow`、`activeWorkspaceDocument` 等 7 项 |
| `src/utils/markdown-text.js` | 230 | 无状态的通用辅助函数 | `simpleSegment`、`decodeReadableEntities`、`readableWikiTarget` 等 8 项 |
| `src/utils/normalization.js` | 44 | 无状态的通用辅助函数 | `normalizeIntegerSetting`、`normalizeUniqueStringList`、`normalizeStringListMap` |
| `src/utils/preferred-order.js` | 77 | 无状态的通用辅助函数 | `moveOrderedKey`、`sortByPreferredOrder`、`updatePreferredSiblingOrder` 等 5 项 |
| `src/utils/search-text.js` | 307 | 无状态的通用辅助函数 | `mergeTextRanges`、`fillSearchHitText`、`tagQueryMatchRanges` 等 12 项 |
| `src/utils/tree-match.js` | 14 | 无状态的通用辅助函数 | `treeNodeMatches` |
| `src/utils/vault-paths.js` | 30 | 无状态的通用辅助函数 | `normalizeVaultFolderPath`、`isSameOrDescendantVaultPath` |

## 模块间依赖（按当前源码）

### `src/core/LocalSearchPlugin.js`
- **职责**：插件生命周期、搜索会话与状态归属；456 行，30,173 字节。
- **直接依赖**：`../data/index/BodyIndex.js`、`../features/create/create-model.js`、`../features/plugin/content-cache-methods.js`、`../features/plugin/external-properties-methods.js`、`../features/plugin/external-search-methods.js`、`../features/plugin/file-command-actions-methods.js`、`../features/plugin/file-index-methods.js`、`../features/plugin/index-queue-methods.js`、`../features/plugin/index-storage-methods.js`、`../features/plugin/markdown-write-tracking-methods.js`、`../features/plugin/metadata-directory-methods.js`、`../features/plugin/non-markdown-metadata-methods.js`、`../features/plugin/notifications-methods.js`、`../features/plugin/path-lifecycle-methods.js`、`../features/plugin/property-catalog-methods.js`、`../features/plugin/property-maintenance-methods.js`、`../features/plugin/recent-history-state-methods.js`、`../features/plugin/search-history-methods.js`、`../features/plugin/settings-storage-methods.js`、`../features/plugin/time-cache-methods.js`、`../features/plugin/tree-maintenance-methods.js`、`../features/plugin/view-preferences-methods.js`、`../features/plugin/workspace-entry-methods.js`、`../integrations/public-contract.js`、`../interactions/hover-hints.js`、`../interactions/swipe-back.js`、`../services/BatchMetadataService.js`、`../services/FileOperationService.js`、`../ui/mobile/mobile-frame.js`、`../ui/settings/LocalSearchSettingTab.js`、`../ui/views/SearchView.js`、`../utils/normalization.js`、`./SharedSearchStateCoordinator.js`、`./compose-class-methods.js`、`./view-types.js`、`obsidian`
- **导出**：`LocalSearchPlugin`

### `src/core/SearchCore.js`
- **职责**：插件生命周期、搜索会话与状态归属；220 行，13,130 字节。
- **直接依赖**：`../features/batch/BatchMetadataController.js`、`../features/create/SearchCreateController.js`、`../features/create/create-model.js`、`../features/facets/SearchFacetController.js`、`../features/filters/filter-state.js`、`../features/result-controls/SearchResultControlsController.js`、`../features/results/SearchResultRendererController.js`、`../features/search/QueryState.js`、`../features/selection/SearchSelectionController.js`、`../features/sort/SearchSortController.js`、`../features/sort/sort-model.js`、`../interactions/SwipeActionCoordinator.js`、`../services/IoPool.js`、`../ui/overlays/SearchDropdownController.js`、`../utils/normalization.js`、`../utils/vault-paths.js`、`./compose-class-methods.js`、`./search/file-actions-methods.js`、`./search/input-and-filters-methods.js`、`./search/result-menu-events-methods.js`、`./search/search-and-ranking-methods.js`、`./search/session-methods.js`、`./search/shell-methods.js`、`./session-values.js`、`obsidian`
- **导出**：`SEARCH_CORE_UI_REF_KEYS`、`SearchCore`

### `src/core/SharedSearchStateCoordinator.js`
- **职责**：插件生命周期、搜索会话与状态归属；207 行，9,313 字节。
- **直接依赖**：`../features/filters/filter-state.js`、`../features/sort/sort-model.js`、`./session-values.js`
- **导出**：`SharedSearchStateCoordinator`

### `src/core/compose-class-methods.js`
- **职责**：插件生命周期、搜索会话与状态归属；30 行，1,580 字节。
- **直接依赖**：无
- **导出**：`composeClassMethods`

### `src/core/default-settings.js`
- **职责**：插件生命周期、搜索会话与状态归属；57 行，5,072 字节。
- **直接依赖**：`../data/time/time-values.js`、`../features/navigator/toolbar-config.js`、`../features/results/view-config.js`、`../features/sort/sort-model.js`
- **导出**：`DEFAULT_SETTINGS`

### `src/core/picker-cleanup.js`
- **职责**：插件生命周期、搜索会话与状态归属；20 行，729 字节。
- **直接依赖**：无
- **导出**：`disposePickerCleanup`、`registerPickerCleanup`

### `src/core/search/file-actions-methods.js`
- **职责**：插件生命周期、搜索会话与状态归属；359 行，14,229 字节。
- **直接依赖**：`../../data/folders/folder-tree.js`、`../../data/formats/file-types.js`、`../../ui/dialogs/dialog-session.js`、`../../ui/dialogs/dialog-surface.js`、`../../ui/pickers/folder-picker.js`、`../picker-cleanup.js`、`obsidian`
- **导出**：`SearchCore_file_actions_methods`、`SearchCore_open_selection_methods`

### `src/core/search/input-and-filters-methods.js`
- **职责**：插件生命周期、搜索会话与状态归属；521 行，22,878 字节。
- **直接依赖**：`../../data/formats/file-types.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`../../data/time/time-values.js`、`../../features/filters/FilterEngine.js`、`../../features/filters/filter-state.js`、`../../utils/dom.js`、`../../utils/vault-paths.js`
- **导出**：`SearchCore_input_and_filters_methods`

### `src/core/search/result-menu-events-methods.js`
- **职责**：插件生命周期、搜索会话与状态归属；269 行，11,710 字节。
- **直接依赖**：`../../utils/dom.js`、`obsidian`
- **导出**：`SearchCore_result_menu_events_methods`

### `src/core/search/search-and-ranking-methods.js`
- **职责**：插件生命周期、搜索会话与状态归属；442 行，18,638 字节。
- **直接依赖**：`../../data/formats/file-types.js`、`../../data/time/time-values.js`、`../../features/filters/FilterEngine.js`、`../../features/filters/filter-state.js`、`../../features/search/ResultRanker.js`、`../../features/sort/sort-model.js`、`../../utils/search-text.js`、`obsidian`
- **导出**：`RESULT_TEXT_COLLATOR`、`SearchCore_search_and_ranking_methods`

### `src/core/search/session-methods.js`
- **职责**：插件生命周期、搜索会话与状态归属；129 行，5,816 字节。
- **直接依赖**：`../../features/filters/filter-state.js`、`../../features/sort/sort-model.js`、`../../utils/normalization.js`、`../session-values.js`
- **导出**：`SearchCore_session_methods`

### `src/core/search/shell-methods.js`
- **职责**：插件生命周期、搜索会话与状态归属；410 行，18,350 字节。
- **直接依赖**：`../../features/navigator/SearchNavigatorController.js`、`../../ui/components/indicator-label.js`、`../../ui/components/input-controls.js`、`../../utils/dom.js`
- **导出**：`SearchCore_shell_methods`

### `src/core/session-values.js`
- **职责**：插件生命周期、搜索会话与状态归属；35 行，1,064 字节。
- **直接依赖**：无
- **导出**：`normalizeModalSearchQuery`、`normalizeModalViewportAnchor`

### `src/core/view-types.js`
- **职责**：插件生命周期、搜索会话与状态归属；9 行，345 字节。
- **直接依赖**：无
- **导出**：`VIEW_TYPE`、`TAB_VIEW_TYPE`

### `src/data/folders/folder-tree.js`
- **职责**：索引、元数据与纯数据模型；181 行，6,861 字节。
- **直接依赖**：`../../utils/normalization.js`、`../../utils/vault-paths.js`、`../../utils/preferred-order.js`、`obsidian`
- **导出**：`sharedFolderChildren`、`comparePickerTreePaths`、`orderFolderSelectionsForPicker`、`sharedFolderAncestors`、`createSharedFolderCountProvider`、`createSharedFolderDirectAndRecursiveCounts`、`formatSharedFolderDirectAndRecursiveCount`、`sharedFolderDisplayIcon`

### `src/data/formats/drawing-content.js`
- **职责**：索引、元数据与纯数据模型；158 行，4,623 字节。
- **直接依赖**：无
- **导出**：`canvasNodeCountFromContent`、`LZ_BASE64_ALPHABET`、`LZ_BASE64_INDEX`、`decompressLzBase64`、`excalidrawSceneFromContent`、`excalidrawElementCountFromContent`

### `src/data/formats/drawing-detection.js`
- **职责**：索引、元数据与纯数据模型；21 行，925 字节。
- **直接依赖**：`obsidian`
- **导出**：`EXCALIDRAW_DRAWING_SUFFIX`、`hasExcalidrawFrontmatter`、`isExcalidrawMeta`

### `src/data/formats/file-types.js`
- **职责**：索引、元数据与纯数据模型；116 行，4,212 字节。
- **直接依赖**：`../../features/filters/filter-state.js`、`./drawing-detection.js`
- **导出**：`attachmentExtension`、`normalizeExcludedAttachmentTypes`、`FILE_TYPE_ICONS`、`RESULT_FILE_TYPE_ACTIONS`、`resultFileTypeAction`、`fileTypeFilterDisplay`、`logicalFileType`、`resultFileTypeLabel`、`resultFileTypeIcon`、`resultFileTypeDisplay`、`resultFileTypeFilterValue`、`drawingBasenameSuffix`、`displayBasename`

### `src/data/index/BodyIndex.js`
- **职责**：索引、元数据与纯数据模型；32 行，1,347 字节。
- **直接依赖**：`../../utils/markdown-text.js`
- **导出**：`BodyIndex`

### `src/data/index/index-version.js`
- **职责**：索引、元数据与纯数据模型；6 行，173 字节。
- **直接依赖**：无
- **导出**：`INDEX_CACHE_VERSION`

### `src/data/properties/property-catalog.js`
- **职责**：索引、元数据与纯数据模型；117 行，3,833 字节。
- **直接依赖**：`../../utils/preferred-order.js`、`../tags/tag-tree.js`、`./property-values.js`
- **导出**：`collectPropertyKeys`、`orderPropertyValuesForPicker`、`orderSelectedPropertyValues`、`orderPropertySelectionsForPicker`、`materializeTagPickerOrder`、`materializePropertyPickerOrders`

### `src/data/properties/property-types.js`
- **职责**：索引、元数据与纯数据模型；146 行，6,057 字节。
- **直接依赖**：`../time/time-values.js`、`../tags/tag-values.js`、`./property-values.js`
- **导出**：`PROPERTY_TYPE_OPTIONS`、`normalizeMetadataPropertyType`、`metadataPropertySample`、`resolveMetadataPropertyType`、`metadataPropertyValuePlaceholder`、`parseMetadataPropertyInput`、`normalizePropertyValueCatalog`、`validateEditablePropertyKey`、`normalizeEditableTagValue`、`editableTagError`

### `src/data/properties/property-values.js`
- **职责**：索引、元数据与纯数据模型；393 行，14,592 字节。
- **直接依赖**：无
- **导出**：`MISSING_PROPERTY_VALUE`、`EMPTY_PROPERTY_VALUE`、`PRESENT_PROPERTY_VALUE`、`propertyValueDisplay`、`propertyValuePlainDisplay`、`propertySpecialInlineDisplay`、`propertyFilterChipValueDisplay`、`propertyValueSortRank`、`propertyValueKey`、`isSpecialPropertyValue`、`isExclusivePropertySelectionValue`、`normalizePropertySelection`、`materializableCreatePropertySelections`、`normalizePropertyValues`、`propertyValuesFromRaw`、`flattenPropertyListStructure`、`rawSampleForPropertyValue`、`frontmatterPropertyStateEqual`、`metaHasProperty`、`propertyValuesFromMeta`、`propertySelectionMatches`、`buildPropertyUsageStats`

### `src/data/properties/raw-mutations.js`
- **职责**：索引、元数据与纯数据模型；99 行，3,731 字节。
- **直接依赖**：`./property-types.js`、`./property-values.js`
- **导出**：`removeRawPropertyValues`、`renameRawPropertyValue`

### `src/data/tags/tag-tree.js`
- **职责**：索引、元数据与纯数据模型；99 行，3,436 字节。
- **直接依赖**：`../../utils/normalization.js`、`../../utils/preferred-order.js`、`./tag-values.js`
- **导出**：`buildTagTreeModel`、`flattenTagTreePaths`、`orderTagsForPicker`、`orderTagSelectionsForPicker`

### `src/data/tags/tag-values.js`
- **职责**：索引、元数据与纯数据模型；103 行，3,526 字节。
- **直接依赖**：无
- **导出**：`normalizeTagValue`、`tagIdentityKey`、`normalizeUniqueTagList`、`tagPathMatches`、`normalizeFilterTagSelection`、`buildHierarchicalTagUsageCounts`、`NO_TAGS_FILTER_VALUE`

### `src/data/time/time-values.js`
- **职责**：索引、元数据与纯数据模型；158 行，6,714 字节。
- **直接依赖**：`obsidian`
- **导出**：`GLS_MANAGED_TIME_KEYS`、`indexedFileProperties`、`markdownBodyForContentTracking`、`fastContentFingerprint`、`markdownBodyFingerprint`、`stableTimeProperties`、`markdownTimePayload`、`binaryTimeFingerprint`、`resolveTrackedModification`、`CONTENT_TIME_CACHE_VERSION`、`GLS_METADATA_DEFAULT_DIRECTORY`、`GLS_METADATA_HISTORY_VERSION`、`parseGLSDate`、`isGLSTimeSidecarPath`、`normalizeGLSMetadataDirectory`

### `src/features/batch/BatchMetadataController.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；31 行，1,420 字节。
- **直接依赖**：`../../core/compose-class-methods.js`、`./mutation-flow-methods.js`、`./property-editor-methods.js`、`./tag-editor-methods.js`
- **导出**：`BatchMetadataController`

### `src/features/batch/mutation-flow-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；245 行，10,333 字节。
- **直接依赖**：`../../data/properties/property-catalog.js`、`../../data/properties/property-types.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`../../ui/components/input-controls.js`、`../../ui/pickers/picker-shell.js`、`../../utils/preferred-order.js`、`obsidian`
- **导出**：`BatchMetadataController_mutation_flow_methods`

### `src/features/batch/property-editor-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；789 行，37,957 字节。
- **直接依赖**：`../../data/properties/property-catalog.js`、`../../data/properties/property-types.js`、`../../data/properties/property-values.js`、`../../interactions/scroll-anchor.js`、`../../ui/components/input-controls.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/picker-shell.js`、`../../ui/pickers/selection-strip.js`、`../../ui/pickers/tree-row.js`、`../../utils/normalization.js`、`../../utils/preferred-order.js`、`obsidian`
- **导出**：`BatchMetadataController_property_editor_methods`

### `src/features/batch/tag-editor-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；252 行，11,114 字节。
- **直接依赖**：`../../data/properties/property-types.js`、`../../data/tags/tag-tree.js`、`../../data/tags/tag-values.js`、`../../interactions/scroll-anchor.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/picker-shell.js`、`../../ui/pickers/selection-strip.js`、`../../ui/pickers/tree-row.js`、`../../utils/tree-match.js`
- **导出**：`BatchMetadataController_tag_editor_methods`

### `src/features/create/SearchCreateController.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；42 行，3,114 字节。
- **直接依赖**：`../../core/compose-class-methods.js`、`../filters/filter-state.js`、`./create-file-methods.js`、`./draft-and-metadata-methods.js`、`./input-mode-methods.js`、`./payload-methods.js`、`./preview-methods.js`
- **导出**：`SearchCreateController`

### `src/features/create/create-file-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；233 行，13,031 字节。
- **直接依赖**：`../../data/formats/drawing-detection.js`、`../../utils/dom.js`、`obsidian`
- **导出**：`SearchCreateController_create_file_methods`

### `src/features/create/create-model.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；92 行，3,542 字节。
- **直接依赖**：`../../data/properties/property-types.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`../../utils/vault-paths.js`、`../filters/filter-state.js`
- **导出**：`CREATE_TYPE_IDS`、`normalizeCreateType`、`createTypeFromFileType`、`fileTypeFromCreateType`、`normalizeCreatePropertyTypes`、`normalizeCreateMetadataMemory`

### `src/features/create/draft-and-metadata-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；399 行，17,659 字节。
- **直接依赖**：`../../data/formats/file-types.js`、`../../data/properties/property-types.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`../../ui/pickers/template-picker.js`、`../filters/filter-state.js`、`./create-model.js`、`obsidian`
- **导出**：`SearchCreateController_draft_and_metadata_methods`

### `src/features/create/input-mode-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；342 行，14,585 字节。
- **直接依赖**：`../../utils/dom.js`、`../filters/filter-state.js`、`obsidian`
- **导出**：`SearchCreateController_input_mode_methods`

### `src/features/create/payload-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；263 行，8,692 字节。
- **直接依赖**：`../../data/properties/property-types.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`../../utils/vault-paths.js`、`obsidian`
- **导出**：`SearchCreateController_payload_methods`

### `src/features/create/preview-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；242 行，10,863 字节。
- **直接依赖**：`../../data/properties/property-catalog.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-tree.js`、`../../data/tags/tag-values.js`、`../../ui/components/input-controls.js`、`../../utils/dom.js`、`../filters/filter-state.js`、`obsidian`
- **导出**：`SearchCreateController_preview_methods`

### `src/features/facets/SearchFacetController.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；102 行，5,065 字节。
- **直接依赖**：`../../core/compose-class-methods.js`、`../../data/properties/property-catalog.js`、`../../data/properties/property-values.js`、`./folder-colors-methods.js`、`./folder-picker-methods.js`、`./property-picker-methods.js`、`./sidebar-maintenance-methods.js`、`./tag-picker-methods.js`、`./type-picker-methods.js`
- **导出**：`SearchFacetController`、`SearchFacetController_picker_model_methods`

### `src/features/facets/folder-colors-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；270 行，10,558 字节。
- **直接依赖**：`../../ui/components/input-controls.js`、`../../ui/dialogs/dialog-session.js`、`../../ui/pickers/picker-header.js`、`../../utils/dom.js`、`../folders/folder-colors.js`、`obsidian`
- **导出**：`SearchFacetController_folder_colors_methods`

### `src/features/facets/folder-picker-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；518 行，22,138 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../../data/folders/folder-tree.js`、`../../interactions/PointerSortCoordinator.js`、`../../ui/components/indicator-label.js`、`../../ui/pickers/folder-picker.js`、`../../ui/pickers/header-modes.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/selection-mode.js`、`../../ui/pickers/selection-strip.js`、`../../ui/pickers/sort-mode.js`、`../../ui/pickers/tree-row.js`、`../../utils/preferred-order.js`、`../folders/exclusions.js`、`obsidian`
- **导出**：`SearchFacetController_folder_picker_methods`

### `src/features/facets/property-picker-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；1082 行，52,360 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../../data/folders/folder-tree.js`、`../../data/formats/file-types.js`、`../../data/properties/property-catalog.js`、`../../data/properties/property-types.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-tree.js`、`../../data/tags/tag-values.js`、`../../interactions/PointerSortCoordinator.js`、`../../interactions/scroll-anchor.js`、`../../ui/components/input-controls.js`、`../../ui/components/property-state.js`、`../../ui/dialogs/submission.js`、`../../ui/pickers/header-modes.js`、`../../ui/pickers/icon-catalog.js`、`../../ui/pickers/icon-picker.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/picker-shell.js`、`../../ui/pickers/selection-mode.js`、`../../ui/pickers/selection-strip.js`、`../../ui/pickers/sort-mode.js`、`../../ui/pickers/tree-row.js`、`../../utils/dom.js`、`../../utils/preferred-order.js`、`../filters/filter-state.js`、`../filters/pool-config.js`、`../filters/pool-values.js`、`obsidian`
- **导出**：`SearchFacetController_property_picker_methods`

### `src/features/facets/sidebar-maintenance-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；235 行，15,139 字节。
- **直接依赖**：`../../data/properties/property-types.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`../../ui/dialogs/dialog-session.js`、`../../utils/normalization.js`、`../../utils/vault-paths.js`、`../filters/pool-values.js`、`../folders/exclusions.js`、`obsidian`
- **导出**：`SearchFacetController_sidebar_maintenance_methods`

### `src/features/facets/tag-picker-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；546 行，24,684 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../../data/tags/tag-tree.js`、`../../data/tags/tag-values.js`、`../../interactions/PointerSortCoordinator.js`、`../../interactions/scroll-anchor.js`、`../../ui/pickers/header-modes.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/picker-shell.js`、`../../ui/pickers/selection-mode.js`、`../../ui/pickers/selection-strip.js`、`../../ui/pickers/sort-mode.js`、`../../ui/pickers/tree-row.js`、`../../utils/dom.js`、`../../utils/tree-match.js`
- **导出**：`SearchFacetController_tag_picker_methods`

### `src/features/facets/type-picker-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；313 行，14,102 字节。
- **直接依赖**：`../../data/formats/file-types.js`、`../../interactions/scroll-anchor.js`、`../../ui/components/indicator-label.js`、`../../ui/components/input-controls.js`、`../../ui/pickers/header-modes.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/picker-shell.js`、`../../ui/pickers/selection-strip.js`、`../../ui/pickers/tree-row.js`、`obsidian`
- **导出**：`SearchFacetController_type_picker_methods`

### `src/features/filters/FilterEngine.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；83 行，3,948 字节。
- **直接依赖**：`../../data/formats/file-types.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`./filter-state.js`
- **导出**：`FilterEngine`

### `src/features/filters/filter-state.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；334 行，12,971 字节。
- **直接依赖**：`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`../../data/time/time-values.js`、`../../utils/normalization.js`、`../../utils/vault-paths.js`、`./pool-config.js`
- **导出**：`normalizeFileTypeFilterValue`、`normalizeFileTypeFilterSelection`、`normalizeFilterMatchMode`、`FILTER_TIME_FIELDS`、`normalizeFilterDate`、`filterLocalDate`、`normalizeFilterDateRange`、`filterDateRangeDisplay`、`recentFilterDateRange`、`FilterState`、`normalizeLegacyFilterPoolSnapshot`、`clearBrowseRefinements`

### `src/features/filters/pool-config.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；121 行，4,342 字节。
- **直接依赖**：`../../ui/pickers/icon-catalog.js`、`../../utils/normalization.js`
- **导出**：`FILTER_POOL_KINDS`、`FILTER_POOL_FIXED_DEFS`、`normalizeFilterPoolSelectionMode`、`normalizePropertyPoolEntry`、`normalizePropertyPoolEntries`、`propertyPoolEntryHasState`、`filterPoolId`、`normalizeFilterPoolConfig`、`normalizeFilterPools`

### `src/features/filters/pool-values.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；76 行，2,735 字节。
- **直接依赖**：`../../data/formats/file-types.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`../../utils/vault-paths.js`、`./pool-config.js`
- **导出**：`filterPoolLabel`、`filterPoolIcon`、`filterPoolValueKey`、`filterPoolValueDisplay`、`filterPoolValueVisible`、`propertyPoolEntry`、`propertyPoolKeyVisible`

### `src/features/folders/exclusions.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；89 行，3,718 字节。
- **直接依赖**：`../../ui/pickers/tree-row.js`、`../../utils/normalization.js`、`../../utils/vault-paths.js`、`obsidian`
- **导出**：`normalizeExcludedFolders`、`isFolderExclusionInherited`、`toggleFolderExclusionSelection`、`createFolderExclusionController`

### `src/features/folders/folder-colors.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；63 行，1,821 字节。
- **直接依赖**：`../../utils/vault-paths.js`
- **导出**：`normalizeHexColor`、`normalizeResultFolderColors`、`resultFolderColorConfig`

### `src/features/navigator/NavigatorCustomization.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；605 行，37,555 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`../../interactions/PointerSortCoordinator.js`、`../../ui/components/input-controls.js`、`../../ui/dialogs/dialog-session.js`、`../../ui/pickers/count-rail.js`、`../../ui/pickers/icon-picker.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/tree-row.js`、`../../utils/preferred-order.js`、`../folders/folder-colors.js`、`./customization-model.js`、`obsidian`
- **导出**：`NavigatorCustomization`

### `src/features/navigator/SearchNavigatorController.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；1056 行，62,798 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../../core/session-values.js`、`../../data/folders/folder-tree.js`、`../../data/formats/file-types.js`、`../../data/properties/property-catalog.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-tree.js`、`../../data/tags/tag-values.js`、`../../interactions/scroll-anchor.js`、`../../ui/components/input-controls.js`、`../../ui/pickers/count-rail.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/tree-row.js`、`../../utils/normalization.js`、`../sort/sort-model.js`、`./NavigatorCustomization.js`、`./customization-model.js`、`./toolbar-config.js`、`obsidian`
- **导出**：`SearchNavigatorController`

### `src/features/navigator/customization-model.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；141 行，8,232 字节。
- **直接依赖**：`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`../../utils/vault-paths.js`、`../folders/folder-colors.js`、`./toolbar-config.js`
- **导出**：`NAVIGATOR_CUSTOMIZATION_KINDS`、`navigatorItemId`、`parseNavigatorItemId`、`normalizeNavigatorCustomization`、`remapNavigatorCustomization`

### `src/features/navigator/toolbar-config.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；127 行，7,355 字节。
- **直接依赖**：`../../ui/pickers/icon-catalog.js`、`../../utils/preferred-order.js`、`../filters/pool-config.js`
- **导出**：`NAVIGATOR_TOOLBAR_CONTEXTS`、`NAVIGATOR_TOOLBAR_ACTIONS`、`navigatorToolbarActionIdIsValid`、`navigatorToolbarActionAvailable`、`navigatorToolbarCatalog`、`normalizeNavigatorToolbars`、`navigatorToolbarIcon`、`NAVIGATOR_VISIBLE_SECTION_DEFS`、`normalizeNavigatorVisibleSections`、`normalizeNavigatorTimeField`

### `src/features/plugin/content-cache-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；193 行，9,062 字节。
- **直接依赖**：`../../data/time/time-values.js`、`../results/virtualization-config.js`
- **导出**：`LocalSearchPlugin_content_cache_methods`

### `src/features/plugin/external-properties-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；272 行，15,602 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../../data/folders/folder-tree.js`、`../../data/properties/property-types.js`、`../../ui/overlays/LocalSearchOverlayHost.js`、`../../ui/overlays/SearchDropdownController.js`、`../../ui/pickers/folder-picker.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/selection-strip.js`、`../../utils/dom.js`、`../../utils/normalization.js`、`../batch/BatchMetadataController.js`、`../folders/exclusions.js`、`../selection/SearchSelectionController.js`、`obsidian`
- **导出**：`LocalSearchPlugin_external_properties_methods`

### `src/features/plugin/external-search-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；326 行，15,235 字节。
- **直接依赖**：`../../core/SearchCore.js`、`../../core/session-values.js`、`../../data/tags/tag-values.js`、`../../integrations/SearchWorkspaceCapabilities.js`、`../../ui/hosts/SearchWindowSession.js`、`../../utils/normalization.js`、`../create/create-model.js`、`../filters/filter-state.js`、`../sort/sort-model.js`
- **导出**：`LocalSearchPlugin_external_search_methods`

### `src/features/plugin/file-command-actions-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；100 行，4,446 字节。
- **直接依赖**：`../../core/view-types.js`、`../../ui/overlays/OperationOverlayController.js`、`obsidian`
- **导出**：`LocalSearchPlugin_file_command_actions_methods`

### `src/features/plugin/file-index-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；401 行，18,864 字节。
- **直接依赖**：`../../data/formats/drawing-content.js`、`../../data/formats/drawing-detection.js`、`../../data/formats/file-types.js`、`../../data/tags/tag-values.js`、`../../data/time/time-values.js`、`../../services/IoPool.js`、`../../utils/markdown-text.js`、`../../utils/vault-paths.js`、`obsidian`
- **导出**：`LocalSearchPlugin_file_index_methods`

### `src/features/plugin/index-queue-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；131 行，5,804 字节。
- **直接依赖**：`../../services/IoPool.js`、`obsidian`
- **导出**：`LocalSearchPlugin_index_queue_methods`

### `src/features/plugin/index-storage-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；183 行，8,693 字节。
- **直接依赖**：`../../data/index/index-version.js`、`../../data/time/time-values.js`、`obsidian`
- **导出**：`LocalSearchPlugin_index_storage_methods`

### `src/features/plugin/markdown-write-tracking-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；318 行，19,657 字节。
- **直接依赖**：`../../data/time/time-values.js`、`../../services/BatchMetadataService.js`、`../../services/IoPool.js`、`obsidian`
- **导出**：`LocalSearchPlugin_markdown_write_tracking_methods`

### `src/features/plugin/metadata-directory-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；123 行，5,875 字节。
- **直接依赖**：`../../data/time/time-values.js`、`../../utils/vault-paths.js`
- **导出**：`LocalSearchPlugin_metadata_directory_methods`

### `src/features/plugin/non-markdown-metadata-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；342 行，21,296 字节。
- **直接依赖**：`../../data/time/time-values.js`、`obsidian`
- **导出**：`LocalSearchPlugin_non_markdown_metadata_methods`

### `src/features/plugin/notifications-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；115 行，4,315 字节。
- **直接依赖**：`../filters/filter-state.js`
- **导出**：`LocalSearchPlugin_notifications_methods`

### `src/features/plugin/path-lifecycle-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；607 行，24,039 字节。
- **直接依赖**：`../../utils/normalization.js`、`../../utils/preferred-order.js`、`../../utils/vault-paths.js`、`../create/create-model.js`、`../filters/filter-state.js`、`../folders/exclusions.js`、`../folders/folder-colors.js`、`../navigator/customization-model.js`、`obsidian`
- **导出**：`LocalSearchPlugin_path_lifecycle_methods`

### `src/features/plugin/property-catalog-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；213 行，11,188 字节。
- **直接依赖**：`../../data/properties/property-types.js`、`../../data/properties/property-values.js`、`../../data/time/time-values.js`、`../../utils/normalization.js`、`obsidian`
- **导出**：`LocalSearchPlugin_property_catalog_methods`

### `src/features/plugin/property-maintenance-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；508 行，24,558 字节。
- **直接依赖**：`../../data/properties/property-types.js`、`../../data/properties/property-values.js`、`../../services/BatchMetadataService.js`、`../../utils/normalization.js`、`../create/create-model.js`、`../filters/filter-state.js`、`../filters/pool-config.js`、`../navigator/customization-model.js`
- **导出**：`LocalSearchPlugin_property_maintenance_methods`

### `src/features/plugin/recent-history-state-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；232 行，10,676 字节。
- **直接依赖**：`../../data/time/time-values.js`、`obsidian`
- **导出**：`LocalSearchPlugin_recent_history_state_methods`、`LocalSearchPlugin_recent_history_storage_methods`

### `src/features/plugin/search-history-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；252 行，8,896 字节。
- **直接依赖**：`../../core/session-values.js`、`../filters/filter-state.js`、`../sort/sort-model.js`
- **导出**：`LocalSearchPlugin_search_history_methods`

### `src/features/plugin/settings-storage-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；407 行，17,279 字节。
- **直接依赖**：`../../core/default-settings.js`、`../../core/session-values.js`、`../../data/formats/file-types.js`、`../../data/properties/property-types.js`、`../../data/time/time-values.js`、`../../ui/pickers/icon-catalog.js`、`../../utils/normalization.js`、`../../utils/vault-paths.js`、`../create/create-model.js`、`../filters/filter-state.js`、`../filters/pool-config.js`、`../folders/exclusions.js`、`../folders/folder-colors.js`、`../navigator/customization-model.js`、`../navigator/toolbar-config.js`、`../results/view-config.js`、`../sort/sort-model.js`
- **导出**：`LocalSearchPlugin_settings_storage_methods`

### `src/features/plugin/time-cache-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；144 行，5,171 字节。
- **直接依赖**：`../../data/time/time-values.js`
- **导出**：`LocalSearchPlugin_time_cache_methods`

### `src/features/plugin/tree-maintenance-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；351 行，16,434 字节。
- **直接依赖**：`../../data/properties/property-catalog.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-values.js`、`../../utils/normalization.js`、`../../utils/preferred-order.js`、`../../utils/vault-paths.js`、`../create/create-model.js`、`../filters/pool-config.js`、`../navigator/customization-model.js`、`obsidian`
- **导出**：`LocalSearchPlugin_tree_maintenance_methods`

### `src/features/plugin/view-preferences-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；293 行，10,822 字节。
- **直接依赖**：`../../data/formats/file-types.js`、`../../utils/vault-paths.js`、`../filters/pool-config.js`、`../folders/exclusions.js`、`../results/view-config.js`、`../sort/sort-model.js`、`obsidian`
- **导出**：`LocalSearchPlugin_view_preferences_methods`

### `src/features/plugin/workspace-entry-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；87 行，4,193 字节。
- **直接依赖**：`../../core/view-types.js`、`../../ui/views/SearchView.js`、`obsidian`
- **导出**：`LocalSearchPlugin_workspace_entry_methods`

### `src/features/result-controls/SearchResultControlsController.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；35 行，2,612 字节。
- **直接依赖**：`../../core/compose-class-methods.js`、`../results/view-config.js`、`./filter-pool-editor-methods.js`、`./search-history-methods.js`、`./toolbar-methods.js`、`./view-composer-methods.js`
- **导出**：`SearchResultControlsController`

### `src/features/result-controls/filter-pool-editor-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；789 行，36,216 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../../data/folders/folder-tree.js`、`../../data/formats/file-types.js`、`../../data/properties/property-catalog.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-tree.js`、`../../data/tags/tag-values.js`、`../../interactions/scroll-anchor.js`、`../../ui/components/input-controls.js`、`../../ui/components/view-composer.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/picker-shell.js`、`../../ui/pickers/selection-mode.js`、`../../ui/pickers/tree-row.js`、`../../utils/normalization.js`、`../filters/filter-state.js`、`../filters/pool-config.js`、`../filters/pool-values.js`
- **导出**：`SearchResultControlsController_filter_pool_editor_methods`

### `src/features/result-controls/search-history-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；206 行，9,577 字节。
- **直接依赖**：`../../interactions/hover-hints.js`、`../../ui/components/input-controls.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/picker-shell.js`、`../../ui/pickers/tree-row.js`、`../../utils/dom.js`、`obsidian`
- **导出**：`SearchResultControlsController_search_history_methods`

### `src/features/result-controls/toolbar-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；148 行，5,900 字节。
- **直接依赖**：`../../ui/components/input-controls.js`、`../results/view-config.js`、`obsidian`
- **导出**：`SearchResultControlsController_toolbar_methods`

### `src/features/result-controls/view-composer-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；947 行，45,508 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../../data/properties/property-catalog.js`、`../../interactions/PointerSortCoordinator.js`、`../../ui/components/input-controls.js`、`../../ui/components/view-composer.js`、`../../ui/pickers/icon-catalog.js`、`../../ui/pickers/icon-picker.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/picker-shell.js`、`../../ui/pickers/sort-mode.js`、`../../ui/pickers/tree-row.js`、`../../utils/dom.js`、`../../utils/preferred-order.js`、`../filters/pool-values.js`、`../folders/exclusions.js`、`../navigator/toolbar-config.js`、`../results/view-config.js`、`../sort/sort-model.js`、`obsidian`
- **导出**：`SearchResultControlsController_view_composer_methods`

### `src/features/results/SearchResultRendererController.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；94 行，6,638 字节。
- **直接依赖**：`../../core/compose-class-methods.js`、`../../utils/dom.js`、`./SparseHeightIndex.js`、`./card-metadata-methods.js`、`./filter-channels-methods.js`、`./page-and-snippets-methods.js`、`./result-card-methods.js`、`./viewport-anchors-methods.js`、`./viewport-geometry-methods.js`、`./virtual-window-methods.js`、`./virtualization-config.js`
- **导出**：`SearchResultRendererController`

### `src/features/results/SparseHeightIndex.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；87 行，3,147 字节。
- **直接依赖**：`./virtualization-config.js`
- **导出**：`SparseHeightIndex`

### `src/features/results/card-metadata-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；347 行，15,887 字节。
- **直接依赖**：`../../data/formats/file-types.js`、`../../data/properties/property-catalog.js`、`../../data/properties/property-values.js`、`../../data/tags/tag-tree.js`、`../../data/tags/tag-values.js`、`../../ui/components/input-controls.js`、`../../utils/normalization.js`、`../../utils/preferred-order.js`、`../../utils/search-text.js`、`../folders/folder-colors.js`、`obsidian`
- **导出**：`SearchResultRendererController_card_metadata_methods`

### `src/features/results/filter-channels-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；310 行，14,513 字节。
- **直接依赖**：`../../data/properties/property-catalog.js`、`../../ui/components/indicator-label.js`、`../../ui/components/input-controls.js`、`../../utils/preferred-order.js`、`../filters/pool-config.js`、`../filters/pool-values.js`、`obsidian`
- **导出**：`SearchResultRendererController_filter_channels_methods`

### `src/features/results/page-and-snippets-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；274 行，14,272 字节。
- **直接依赖**：`../../data/formats/file-types.js`、`../../utils/dom.js`、`../../utils/markdown-text.js`、`../../utils/search-text.js`、`../search/QueryState.js`
- **导出**：`SearchResultRendererController_page_and_snippets_methods`

### `src/features/results/result-card-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；207 行，9,729 字节。
- **直接依赖**：`../../data/formats/file-types.js`、`../../ui/components/input-controls.js`、`../../utils/dom.js`、`../../utils/search-text.js`、`./view-config.js`、`obsidian`
- **导出**：`SearchResultRendererController_result_card_methods`

### `src/features/results/view-config.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；166 行，5,756 字节。
- **直接依赖**：`../../utils/normalization.js`
- **导出**：`RESULT_VIEW_IDS`、`RESULT_VIEW_LABELS`、`RESULT_CONTENT_DEFS`、`RESULT_CONTENT_IDS`、`RESULT_CONTENT_DEF_MAP`、`VIEW_COMPOSER_SECTION_IDS`、`normalizeResultContentOrder`、`DEFAULT_RESULT_VIEWS`、`normalizeResultViewId`、`normalizeResultViewConfig`、`normalizeResultViews`

### `src/features/results/viewport-anchors-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；397 行，18,130 字节。
- **直接依赖**：`../../core/session-values.js`、`../../utils/dom.js`、`./virtualization-config.js`
- **导出**：`SearchResultRendererController_viewport_anchors_methods`

### `src/features/results/viewport-geometry-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；441 行，18,474 字节。
- **直接依赖**：`../../core/session-values.js`、`../../interactions/SwipeActionCoordinator.js`、`../../utils/dom.js`、`./virtualization-config.js`
- **导出**：`SearchResultRendererController_viewport_geometry_methods`

### `src/features/results/virtual-window-methods.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；441 行，19,497 字节。
- **直接依赖**：`../../core/session-values.js`、`../../utils/dom.js`、`./virtualization-config.js`
- **导出**：`SearchResultRendererController_virtual_window_methods`

### `src/features/results/virtualization-config.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；51 行，2,106 字节。
- **直接依赖**：无
- **导出**：`RESULT_WINDOW_MOUNT_MIN`、`RESULT_WINDOW_MOUNT_MAX`、`RESULT_WINDOW_BUFFER_MIN`、`RESULT_ROW_HEIGHT_ESTIMATE`、`FULL_CONTENT_CACHE_LIMIT`、`RESULT_GEOMETRY_CSS_TOKENS`

### `src/features/search/QueryState.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；19 行，679 字节。
- **直接依赖**：`../../utils/markdown-text.js`
- **导出**：`QueryState`

### `src/features/search/ResultRanker.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；58 行，2,292 字节。
- **直接依赖**：`../../data/formats/file-types.js`、`../../data/tags/tag-values.js`、`../../utils/search-text.js`
- **导出**：`ResultRanker`

### `src/features/selection/SearchSelectionController.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；543 行，22,904 字节。
- **直接依赖**：`../../ui/components/input-controls.js`、`obsidian`
- **导出**：`SEARCH_SELECTION_UI_REF_KEYS`、`SearchSelectionController`

### `src/features/sort/SearchSortController.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；381 行，15,848 字节。
- **直接依赖**：`../../ui/components/input-controls.js`、`../../ui/pickers/picker-header.js`、`../../ui/pickers/tree-row.js`、`../filters/filter-state.js`、`../navigator/toolbar-config.js`、`./sort-model.js`、`obsidian`
- **导出**：`SearchSortController`

### `src/features/sort/sort-model.js`
- **职责**：搜索与筛选、Picker 工作流、创建、结果渲染及批量功能；106 行，3,642 字节。
- **直接依赖**：`../../utils/normalization.js`
- **导出**：`SORT_FIELD_DEFS`、`SORT_FIELD_IDS`、`DEFAULT_SORT_FIELD_ORDER`、`normalizeSortFieldOrder`、`normalizeHiddenSortFields`、`selectableSortFieldsForQuery`、`sortFieldsForQuery`、`normalizeSortDirection`、`defaultSortField`、`normalizeSortField`、`migrateLegacySortState`

### `src/integrations/SearchWorkspaceCapabilities.js`
- **职责**：对外合同与 Obsidian 工作区能力；47 行，2,444 字节。
- **直接依赖**：`../ui/mobile/mobile-frame.js`、`obsidian`
- **导出**：`SearchWorkspaceCapabilities`

### `src/integrations/public-contract.js`
- **职责**：对外合同与 Obsidian 工作区能力；31 行，972 字节。
- **直接依赖**：无
- **导出**：`EXTERNAL_SEARCH_API_VERSION`、`EXTERNAL_SEARCH_API_CAPABILITIES`

### `src/interactions/PointerSortCoordinator.js`
- **职责**：触控、滚动、拖拽、滑动及反馈；327 行，12,683 字节。
- **直接依赖**：`./sort-feedback.js`、`obsidian`
- **导出**：`PointerSortCoordinator`

### `src/interactions/SwipeActionCoordinator.js`
- **职责**：触控、滚动、拖拽、滑动及反馈；679 行，29,113 字节。
- **直接依赖**：`../ui/components/input-controls.js`、`../utils/dom.js`、`obsidian`
- **导出**：`RESULT_SWIPE_INTENT_SLOP_PX`、`RESULT_SWIPE_HORIZONTAL_BIAS`、`RESULT_SWIPE_SETTLE_RATIO`、`RESULT_SWIPE_SETTLE_MAX_PX`、`SwipeActionCoordinator`

### `src/interactions/hover-hints.js`
- **职责**：触控、滚动、拖拽、滑动及反馈；114 行，5,767 字节。
- **直接依赖**：无
- **导出**：`supportsPluginFineHover`、`installPluginHoverHintSuppression`

### `src/interactions/scroll-anchor.js`
- **职责**：触控、滚动、拖拽、滑动及反馈；120 行，4,141 字节。
- **直接依赖**：`../utils/dom.js`
- **导出**：`captureScrollableAnchor`、`restoreScrollableAnchor`、`revealScrollableKey`、`rerenderPickerListPreservingScroll`、`syncSharedPickerTreeRowSelection`

### `src/interactions/sort-feedback.js`
- **职责**：触控、滚动、拖拽、滑动及反馈；65 行，3,650 字节。
- **直接依赖**：无
- **导出**：`SortFeedback`

### `src/interactions/swipe-back.js`
- **职责**：触控、滚动、拖拽、滑动及反馈；314 行，15,347 字节。
- **直接依赖**：`obsidian`
- **导出**：`swipeBackCanNavigate`、`swipeBackResolve`、`swipeBackNativeGestureOwner`、`createSharedSwipeBackRealm`、`createSharedTrackpadBackRealm`、`getSharedTrackpadBackRealm`、`SharedSwipeBackPrimitive`、`LocalSearchSwipeBackPrimitive`

### `src/main.js`
- **职责**：插件生命周期、搜索会话与状态归属；2 行，145 字节。
- **直接依赖**：`./core/LocalSearchPlugin.js`
- **导出**：仅副作用或默认入口

### `src/services/BatchMetadataService.js`
- **职责**：实际文件写入与批量操作服务；389 行，17,381 字节。
- **直接依赖**：`../data/properties/property-types.js`、`../data/properties/property-values.js`、`../data/properties/raw-mutations.js`、`../data/tags/tag-values.js`、`obsidian`
- **导出**：`NO_FRONTMATTER_WRITE`、`assertVaultPropertyMutationSucceeded`、`BatchMetadataService`

### `src/services/FileOperationService.js`
- **职责**：实际文件写入与批量操作服务；285 行，14,268 字节。
- **直接依赖**：`../data/properties/property-types.js`、`../data/tags/tag-values.js`、`../data/time/time-values.js`、`../utils/vault-paths.js`、`obsidian`
- **导出**：`FileOperationService`

### `src/services/IoPool.js`
- **职责**：实际文件写入与批量操作服务；47 行，1,490 字节。
- **直接依赖**：无
- **导出**：`IoPool`

### `src/ui/components/indicator-label.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；14 行，671 字节。
- **直接依赖**：`../../utils/dom.js`
- **导出**：`setIndicatorLabel`

### `src/ui/components/input-controls.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；99 行，3,885 字节。
- **直接依赖**：`../../utils/dom.js`、`obsidian`
- **导出**：`initializeSearchInteractionElement`、`createSearchButton`、`createSearchInput`、`createSearchTextField`、`createSearchWindowAction`、`bindInputFocusGuard`

### `src/ui/components/property-state.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；75 行，2,561 字节。
- **直接依赖**：`../../data/properties/property-values.js`、`./input-controls.js`
- **导出**：`appendPropertySpecialStateInlineGroup`

### `src/ui/components/view-composer.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；120 行，3,644 字节。
- **直接依赖**：`../../utils/dom.js`、`../pickers/tree-row.js`、`./indicator-label.js`、`./input-controls.js`、`obsidian`
- **导出**：`createViewComposerChoice`、`syncViewComposerChoiceSelection`、`createViewComposerSection`、`createViewComposerActionRow`、`createViewComposerRemoveButton`

### `src/ui/dialogs/dialog-session.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；209 行，9,356 字节。
- **直接依赖**：`../../utils/dom.js`、`./dialog-surface.js`、`./submission.js`、`obsidian`
- **导出**：`createDialogSession`、`openSearchRenameDialog`、`openPickerDeleteDialog`

### `src/ui/dialogs/dialog-surface.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；100 行，3,853 字节。
- **直接依赖**：`../components/input-controls.js`、`obsidian`
- **导出**：`createSearchDialogContent`、`createSharedDialogSurface`

### `src/ui/dialogs/submission.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；65 行，3,312 字节。
- **直接依赖**：无
- **导出**：`trapDialogTab`、`createDialogSubmission`

### `src/ui/hosts/SearchWindowSession.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；690 行，29,439 字节。
- **直接依赖**：`../../core/SearchCore.js`、`../../utils/dom.js`、`../mobile/mobile-frame.js`、`./modal-host.js`、`obsidian`
- **导出**：`SearchWindowSession`

### `src/ui/hosts/modal-host.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；56 行，1,561 字节。
- **直接依赖**：`obsidian`
- **导出**：`SearchModalHost`、`stripObsidianModalChrome`

### `src/ui/mobile/mobile-frame.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；214 行，11,516 字节。
- **直接依赖**：`obsidian`
- **导出**：`MOBILE_FRAME_OWNER`、`MobileFrameController`、`mountMobileFrame`

### `src/ui/overlays/LocalSearchOverlayHost.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；131 行，5,874 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../../utils/dom.js`、`../components/input-controls.js`、`../mobile/mobile-frame.js`、`./popup-order.js`、`obsidian`
- **导出**：`LocalSearchOverlayHost`

### `src/ui/overlays/OperationOverlayController.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；153 行，6,690 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../../data/folders/folder-tree.js`、`../../utils/dom.js`、`../dialogs/dialog-surface.js`、`../dialogs/submission.js`、`../pickers/folder-picker.js`、`./LocalSearchOverlayHost.js`、`obsidian`
- **导出**：`OperationOverlayController`

### `src/ui/overlays/SearchDropdownController.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；684 行，31,101 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../dialogs/submission.js`、`../mobile/mobile-frame.js`、`../pickers/picker-header.js`、`./geometry.js`、`./popup-order.js`、`obsidian`
- **导出**：`SearchDropdownController`

### `src/ui/overlays/geometry.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；33 行，2,194 字节。
- **直接依赖**：`../../utils/dom.js`、`obsidian`
- **导出**：`resolveOverlayBounds`、`resolveDropdownViewportBounds`

### `src/ui/overlays/popup-order.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；25 行，1,156 字节。
- **直接依赖**：无
- **导出**：`markSearchPopupActive`、`topSearchPopupSurface`

### `src/ui/pickers/count-rail.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；21 行，791 字节。
- **直接依赖**：无
- **导出**：`observePickerCountRail`

### `src/ui/pickers/folder-picker.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；216 行，7,989 字节。
- **直接依赖**：`../../data/folders/folder-tree.js`、`../../interactions/scroll-anchor.js`、`../../utils/dom.js`、`../../utils/preferred-order.js`、`./picker-shell.js`、`./tree-row.js`、`obsidian`
- **导出**：`renderSharedFolderTreePicker`

### `src/ui/pickers/header-modes.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；117 行，4,890 字节。
- **直接依赖**：`./picker-header.js`、`./picker-shell.js`、`./tree-row.js`
- **导出**：`attachFacetPickerOverflow`、`attachPickerHeaderModes`

### `src/ui/pickers/icon-catalog.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；52 行，2,208 字节。
- **直接依赖**：`../../utils/normalization.js`、`obsidian`
- **导出**：`PROPERTY_SHORTCUT_DEFAULT_ICON`、`FILTER_TOOLBAR_ICON_PRESETS`、`normalizeRecentIconIds`、`resolvePickerIcon`、`rememberPickerIcon`、`filterToolbarIconCatalog`

### `src/ui/pickers/icon-picker.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；82 行，4,559 字节。
- **直接依赖**：`../../utils/normalization.js`、`./icon-catalog.js`、`./picker-header.js`、`./picker-shell.js`、`./tree-row.js`
- **导出**：`openFilterToolbarIconPicker`

### `src/ui/pickers/picker-header.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；131 行，3,886 字节。
- **直接依赖**：`../components/input-controls.js`、`obsidian`
- **导出**：`createPickerHeaderIconAction`、`configureSharedPickerHeader`

### `src/ui/pickers/picker-shell.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；117 行，4,501 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../components/input-controls.js`、`./count-rail.js`、`./tree-row.js`、`obsidian`
- **导出**：`createSharedPickerFooter`、`createSharedPickerTreeShell`、`setPickerSearchMode`、`activatePickerSearch`、`renderSharedPickerRoot`

### `src/ui/pickers/selection-mode.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；188 行，5,989 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../../data/properties/property-values.js`、`../../features/filters/filter-state.js`、`../components/input-controls.js`、`./picker-header.js`、`./picker-shell.js`
- **导出**：`facetSelectionCount`、`commitFacetSelectionState`、`deactivateConflictingFacetPickerModes`、`createFacetPickerSelectionMode`

### `src/ui/pickers/selection-strip.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；95 行，4,203 字节。
- **直接依赖**：`../../core/picker-cleanup.js`、`../components/input-controls.js`、`obsidian`
- **导出**：`createSharedPickerSelectionStrip`

### `src/ui/pickers/sort-mode.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；84 行，2,559 字节。
- **直接依赖**：`./picker-header.js`、`./picker-shell.js`、`./selection-mode.js`
- **导出**：`attachPickerSortModeToggle`、`attachFacetPickerSortModeToggle`

### `src/ui/pickers/template-picker.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；167 行，6,284 字节。
- **直接依赖**：`../../data/formats/drawing-detection.js`、`../../utils/dom.js`、`../../utils/normalization.js`、`./picker-header.js`、`./picker-shell.js`、`./tree-row.js`
- **导出**：`createTemplateFilesForType`、`orderTemplateFilesForPicker`、`openTemplateFilePicker`

### `src/ui/pickers/tree-row.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；222 行，8,335 字节。
- **直接依赖**：`../../utils/dom.js`、`../components/input-controls.js`、`obsidian`
- **导出**：`createSharedPickerTreeRow`、`syncSharedPickerTreeRowAvailability`、`createTreeActionButton`、`createPickerRowAction`

### `src/ui/settings/LocalSearchSettingTab.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；257 行，13,454 字节。
- **直接依赖**：`../../core/view-types.js`、`../../data/time/time-values.js`、`../components/input-controls.js`、`./setting-row.js`、`obsidian`
- **导出**：`LocalSearchSettingTab`

### `src/ui/settings/setting-row.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；73 行，2,920 字节。
- **直接依赖**：`obsidian`
- **导出**：`createPluginSettingClass`、`SearchSettingRow`

### `src/ui/views/SearchView.js`
- **职责**：宿主视图、Picker 原语、Dialog 与交互呈现；205 行，10,105 字节。
- **直接依赖**：`../../core/SearchCore.js`、`../../core/view-types.js`、`../../integrations/SearchWorkspaceCapabilities.js`、`obsidian`
- **导出**：`SearchView`

### `src/utils/dom.js`
- **职责**：无状态的通用辅助函数；49 行，1,448 字节。
- **直接依赖**：无
- **导出**：`hostDocument`、`hostWindow`、`activeWorkspaceDocument`、`isDomElement`、`isDomHTMLElement`、`isDomButton`、`isDomInput`

### `src/utils/markdown-text.js`
- **职责**：无状态的通用辅助函数；230 行，9,826 字节。
- **直接依赖**：无
- **导出**：`simpleSegment`、`decodeReadableEntities`、`readableWikiTarget`、`normalizeReadableText`、`stripReadableLineSyntax`、`cleanMarkdownForSnippet`、`extractCountableTextFromMarkdown`、`readableTokenCountFromText`

### `src/utils/normalization.js`
- **职责**：无状态的通用辅助函数；44 行，1,224 字节。
- **直接依赖**：无
- **导出**：`normalizeIntegerSetting`、`normalizeUniqueStringList`、`normalizeStringListMap`

### `src/utils/preferred-order.js`
- **职责**：无状态的通用辅助函数；77 行，3,016 字节。
- **直接依赖**：`../features/filters/pool-config.js`、`./normalization.js`
- **导出**：`moveOrderedKey`、`sortByPreferredOrder`、`updatePreferredSiblingOrder`、`remapPreferredPathOrder`、`remapFilterPoolStoredKeys`

### `src/utils/search-text.js`
- **职责**：无状态的通用辅助函数；307 行，11,466 字节。
- **直接依赖**：`./dom.js`
- **导出**：`mergeTextRanges`、`fillSearchHitText`、`tagQueryMatchRanges`、`substringMatchRange`、`unitMatchRanges`、`compactUnitMatchRanges`、`orderedMatchRanges`、`compactOrderedBodyMatchRanges`、`matchReadableText`、`_findSnippetStartBoundary`、`_findSnippetEndBoundary`、`buildSnippetWindow`

### `src/utils/tree-match.js`
- **职责**：无状态的通用辅助函数；14 行，470 字节。
- **直接依赖**：无
- **导出**：`treeNodeMatches`

### `src/utils/vault-paths.js`
- **职责**：无状态的通用辅助函数；30 行，862 字节。
- **直接依赖**：无
- **导出**：`normalizeVaultFolderPath`、`isSameOrDescendantVaultPath`

