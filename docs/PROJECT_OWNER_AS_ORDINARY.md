# 项目负责人 → 普通属性（2026-10-18）

本轮不再为 `项目负责人` 提供 GLS 级特殊快捷分组或项目负责人迁移接口。`所属项目` 仍然是项目分组属性。

用户原有 YAML/Canvas/图片等属性保留；如果自行维护 `项目负责人`，完全走 GLS 既有普通属性索引、Picker、重命名、删除以及样式。

重点：个人工作台 3.4.1 的 SearchBridge 会额外注册外部虚拟属性 `workbench-project-owners`，造成同名键只读及覆盖 YAML。必须与独立工作台桥接修正版配套安装才能完全取消污染。工作台内部项目负责人字段和用户已保存的偏好数据本轮不删除。

正常项目分组 getIndexedProjectGroups、普通属性接口、Picker、iOS Portal、输入法底栏不跟随、Dialog44 和 Style Settings 默认值保持原状。
