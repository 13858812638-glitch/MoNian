# GLS 普通属性与工作台分组 · 2026-10-18

## 当前有效架构（覆盖旧文档“项目目录”段落）

- **GLS** 只拥有 Obsidian 文件的原始普通属性读写、索引、非 Markdown 侧车属性，以及同一套通用属性值目录；没有专用「所属项目」「项目负责人」索引、Owner 分组、Dida 项目注入或项目目录 API。
- GLS 外部 API v19 提供 `listIndexedFiles()` / `subscribeIndexChanges(listener)`，`getFileProperties(path)` / `getPropertyCatalog()`，`patchProperties(request)`，`addPropertyValues(operations)`，`renamePropertyValue({key,oldValue,newValue,propertyType})`，`deletePropertyValue({key,value,propertyType})`。这些操作对任何允许编辑的普通属性平等适用。
- **工作台** 负责在其设置里选一个普通属性键（`projectGroupingProperty`，默认「所属项目」），读取 GLS 通用属性快照、按值分组。单文件多值出现在多个分组。无需 project 主文件或专用主记录。
- 工作台的“新建项目”只是对这个键新增一个 GLS 通用属性值目录项：没有文件时仍可显示空分组；不创建 Markdown 文件。日后给任意文件写入该值即可使其归组。属性值目录是 GLS 原有的**通用属性选项**，不代表另一套项目成员关系。
- 项目内加入/移除文件、按值重命名/删除，都使用 GLS 通用属性写入与属性值维护 API。工作台 `projectPrefs` 继续保存卡片展示的排序、状态、主文件、下一步等用户偏好，**不保存文件的权威归属**。
- 前一轮取消 `项目负责人` 虚拟属性注入，依旧生效；旧工作台的私人负责人偏好/UI 不会注入 GLS 或替代 YAML 同名属性。

## 生命周期与兼容

- 重新索引/属性目录改动均经 `subscribeIndexChanges` 通知；持久化保持原 GLS metadata/YAML/sidecar，已存在的标签/数据不会迁移或删除。
- 专用 `listProjects`、`subscribeProjectChanges` 和 `getIndexedProjectGroups` 从公开 API 退役，旧工作台需要配套更新，否则不能保证项目列表。其他非项目工作台接口不变。
- iOS Picker Portal E，`44%` 共用 Dialog 坐标、9 个已提升的 Style Settings 默认值、iOS 移动底部命令栏不跟随输入法的正式交互保持不变。
- 基线源码没有正式 `manifest.json`；不要推测插件 ID 或覆盖安装中的 manifest / data.json。
- 所有 Node 与 Chromium 检查均是本地 mock/fixture；iPhone Obsidian/WebKit 实机未验收。
