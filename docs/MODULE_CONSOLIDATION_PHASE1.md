# GLS v5.2 模块归一：第一阶段

修改基线：`GLS-v5.2-独立浮窗退役-正式基线-20261018-完整模块化Source.zip`。此目录为独立派生候选，不会覆盖已冻结 Source。

- `ui-reference-keys` → `SearchCore`：保留常量、初始化与销毁时的行为。
- `modal-chrome` → `modal-host`：`SearchWindowSession` 已依赖 `SearchModalHost`，复用单个导入，无新宿主或新生命周期。
- `text-collator` → `search-and-ranking-methods`：原 `Intl.Collator` 配置原封不动，在排序模块顶层只创建一次。
- 标签规范化：`normalizeEditableTagValue()` 保留原导出，委托同语义的 `normalizeTagValue()`，取消重复字符串规则。

不改任何业务 UI、CSS、数据格式、插件 ID、Picker/Modal/侧栏/标签页关闭路径，不删除公共属性类型接口。不碰虚拟列表、键盘焦点等高风险模块。
