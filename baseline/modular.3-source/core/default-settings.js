// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { GLS_METADATA_DEFAULT_DIRECTORY } from "../data/time/time-values.js";
import { normalizeNavigatorToolbars, normalizeNavigatorVisibleSections } from "../features/navigator/toolbar-config.js";
import { DEFAULT_RESULT_VIEWS, normalizeResultViews } from "../features/results/view-config.js";
import { DEFAULT_SORT_FIELD_ORDER } from "../features/sort/sort-model.js";


export const DEFAULT_SETTINGS = {
    keepSearchResultsInMemory: true,
    enableTabFocusSearch: true, // Tab 快速聚焦并全选搜索框
    focusSearchOnMobileOpen: false, // 移动端打开搜索界面时是否自动聚焦搜索框
    confirmBeforeDelete: true, // 删除文件前显示插件确认；弹窗“不再询问”可关闭，设置页可重新开启
    createLastType: "md", // 旧设置兼容字段；新建不再读取跨会话类型历史
    createMetadataMemory: {
        md: { folder: "01-零散笔记", tags: [], properties: [], template: { enabled: false, path: "" } },
        canvas: { folder: "01-零散笔记", tags: [], properties: [], template: { enabled: false, path: "" } },
        excalidraw: { folder: "01-零散笔记", tags: [], properties: [], template: { enabled: false, path: "" } }
    }, // 保留旧设置以兼容导入/路径维护；新建仅消费当前条件和当前 CreateDraft
    ioConcurrentLimit: 16,
    createSessionRecovery: {}, // 仅在提交 / 关闭时保存未完成创建；沿用 settings 唯一写链
    snippetReadLimit: 5000,
    snippetMaxLen: 200,          // 摘要最大字符数
    activeResultView: "standard", // 当前结果视图：详细 / 标准 / 精简
    resultViews: normalizeResultViews(DEFAULT_RESULT_VIEWS),
    filterPools: [], // 四类筛选池固定存在；旧数据缺失项规范化为 visible:false
    contentSegmentMaxLen: 8000,  // 正文索引最大读取字符，超长截断
    favoriteTemplatePaths: [],       // 模板 Picker 收藏路径；仅影响显示置顶，不改变 CreateDraft 选择
    excludedFolders: [],       // 全局排除文件夹：由结果视图设置管理，不参与索引和搜索
    resultExcludedFolders: [], // 结果排除文件夹：由顶部文件夹 Picker 管理，仍参与索引与操作，仅从结果/Facet 隐藏
    resultExcludedAttachmentTypes: [], // 附件扩展名的结果排除；不退出索引，附件 Picker 可恢复
    excludedKeys: [],          // 排除属性键列表（批量修改属性值的键列表里不显示）
    hiddenResultPropertyKeys: [], // 结果卡片不显示的属性；默认显示全部可用属性
    resultFolderColors: {},   // 结果卡文件夹颜色：{ "folder/path": { light, dark } }
    searchHistory: [],         // 最近搜索（最多20条，新的在前）
    favoriteSearches: [],       // 收藏搜索（用户主动管理）
    recentOpened: [],          // V237 历史兼容镜像；V238 以元数据目录中的设备独立记录为优先源
    metadataDirectory: GLS_METADATA_DEFAULT_DIRECTORY, // NAS 同步的仓库内目录，不能是 .obsidian / 仓库外绝对路径
    modalFilterSnapshot: null, // 除系统 X 外保存的筛选状态
    modalSearchQuery: "",      // 与当前搜索视图一起保存；仅系统 X 关闭时清空
    modalSortField: "opened",      // 当前搜索会话排序字段
    modalSortDirection: "desc",  // 排序方向：desc / asc
    modalViewportAnchor: null, // 搜索主窗恢复锚点：path + 视口偏移；scrollTop 只作最终 fallback
    resultSortOrder: [...DEFAULT_SORT_FIELD_ORDER], // 排序按钮循环顺序；由结果视图统一编排
    hiddenResultSortFields: ["fileModified"], // eye 关闭 = 不加入快捷循环；全量排序 Picker 仍可直接选择
    navigatorToolbars: normalizeNavigatorToolbars(null), // 移动侧栏按页面记忆底栏顺序、显隐与图标
    recentIconIds: [], // 所有图标选择入口共用，最近使用在前（最多24个）
    navigatorVisibleSections: normalizeNavigatorVisibleSections(null), // 视图设置拥有侧栏分组显隐
    navigatorTimeField: "created", // 固定日期区间共用排序组件的时间依据
    navigatorCustomization: {}, // 仅存导航外观、分隔线与分组顺序；文件/标签/属性排序沿用 Picker 权威源
    pickerFolderOrder: [],       // 文件夹 Picker 同级自定义顺序；层级变化仍写回真实 Vault
    pickerTagOrder: [],          // 标签 Picker 同级自定义顺序；层级变化仍写回真实 Markdown 标签
    pickerPropertyOrder: [],     // 属性键统一显示顺序；由属性 Picker 拖拽维护，不重排已有 Frontmatter
    pickerPropertyValueOrder: {}, // 属性值统一显示顺序；由属性 Picker 拖拽维护：{ key: [propertyValueKey...] }
    propertyValueCatalog: [], // 用户明确新增、尚未被文件使用的可选属性值；不复制文件索引
    modalBoundsV3: null         // 桌面窗口几何 { x, y, width, height }
};
