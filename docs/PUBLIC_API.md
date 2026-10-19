# 外部接口冻结清单

## 身份边界

插件 ID 与发行版本：**manifest 未提供，无法确认**。不以代码中的回退字符串猜测原安装目录。`module.exports` 仍为同名 `LocalSearchPlugin` 类；这是入口形态，不是插件 ID。

`externalSearchApiVersion = 18`。`externalSearchApi` 的 19 个键（含 version/capabilities 和 17 个方法）保持原定义。以下代码摘录和参数默认值直接取自本次原版构造器，不从历史文档推断。

### `version`

原始 L24877，入口表达式逐字保留：

```js
EXTERNAL_SEARCH_API_VERSION
```

### `capabilities`

原始 L24878，入口表达式逐字保留：

```js
EXTERNAL_SEARCH_API_CAPABILITIES
```

### `open`

原始 L24879，入口表达式逐字保留：

```js
(request = {}) => this.openExternalSearch(request)
```

### `mount`

原始 L24880，入口表达式逐字保留：

```js
(host, request = {}) => this.mountExternalSearch(host, request)
```

### `getRecentOpened`

原始 L24881，入口表达式逐字保留：

```js
(limit = 100) => this.getRecentOpenedHistory(limit)
```

### `subscribeRecentOpened`

原始 L24882，入口表达式逐字保留：

```js
(listener) => this.subscribeRecentOpened(listener)
```

### `getFileTime`

原始 L24883，入口表达式逐字保留：

```js
(path) => this.getAuthoritativeFileTime(path)
```

### `markOpened`

原始 L24884，入口表达式逐字保留：

```js
(path) => this.markOpenedFromExternal(path)
```

### `registerVirtualProperties`

原始 L24885，入口表达式逐字保留：

```js
(provider) => this.registerVirtualProperties(provider)
```

### `pickFolder`

原始 L24886，入口表达式逐字保留：

```js
(request) => this.openExternalFolderPicker(request)
```

### `editProperty`

原始 L24887，入口表达式逐字保留：

```js
(request) => this.openExternalPropertyEditor(request)
```

### `mountMobileFrame`

原始 L24888，入口表达式逐字保留：

```js
(root, options) => {
                if (this._unloaded || !root?.isConnected) return null;
                const frame = mountMobileFrame(root, options, () => this._externalMobileFrames.delete(frame));
                if (frame) this._externalMobileFrames.add(frame);
                return frame;
            }
```

### `moveFiles`

原始 L24894，入口表达式逐字保留：

```js
(request) => this.moveExternalFiles(request)
```

### `listProjects`

原始 L24895，入口表达式逐字保留：

```js
() => this.getIndexedProjectGroups()
```

### `getFileProperties`

原始 L24897，入口表达式逐字保留：

```js
path => this.getIndexedFileProperties(path)
```

### `getPropertyCatalog`

原始 L24898，入口表达式逐字保留：

```js
() => this.getIndexedPropertyCatalog()
```

### `patchProperties`

原始 L24899，入口表达式逐字保留：

```js
(request) => this.patchExternalProperties(request)
```

### `subscribeProjectChanges`

原始 L24900，入口表达式逐字保留：

```js
(listener) => this.subscribeProjectPropertyChanges(listener)
```

## 返回和生命周期合同

open 保留原布尔成功/拒绝语义。mount 对非法或已卸载宿主保留拒绝行为；成功返回冻结 handle，其 ready 是初始化 Promise；active/busy 是实时 getter，另有 captureSession、setScope、dismissTop、destroy。captureSession 是脱离实例的 UI 快照，不是外部权威数据副本。

registerVirtualProperties 返回 invalidate/dispose 句柄或 null；同 id 替换后旧句柄不会误删新 provider。订阅接口返回原取消函数。getFileProperties 返回深拷贝属性或 null；getPropertyCatalog 返回原 key/propertyType/values 条目数组。listProjects 保留冻结的 name/paths/createdAt 目录。已删除历史 `getProjectOwnerMigration` 迁移接口；普通属性完全由原生属性查询和编辑负责。

patchProperties 接收 {paths, properties, addTags, removeTags}；properties 中每项是 {key, propertyType, isNewKey, removeValues, addValues}，**不是 [key,value] 二元组**。原返回统计和错误语义不变。非 Markdown 属性写入原侧车，不覆写 Canvas 内容。

其他字段/返回以入口目标实现为准。不是所有返回分支都在当前测试中触发；本次保留全部原方法体及描述符来避免删掉动态分支。

## 命令 ID

当前正式 API 命令入口保留 Modal、标签页和侧边栏；独立浮窗命令已退役。旧绑定它的快捷键需要重新绑定保留的搜索命令。


- `open-local-search-tab` — 在标签页打开搜索
- `open-local-search` — 打开本地笔记搜索
- `move-current-file` — 移动当前文件到…
- `delete-current-file` — 删除当前文件
- `batch-edit-properties` — 打开搜索以批量修改属性
- `open-local-search-sidebar` — 打开 GLS 搜索侧边栏
- `toggle-local-search-density` — 切换搜索结果视图

## ViewType

`local-search-sidebar`、`local-search-tab`。两者仍复用原 SearchView；底层 SearchCore 与其他宿主共享原控制器。

## 事件与动态外部依赖

固定公开就绪事件为 `gls:external-api-ready`；Dida 就绪监听为 `dida:workbench-api-ready`。原版还处理 active-leaf-change、changed、create、css-change、delete、file-menu、file-open、files-menu、modify、rename。完整原始调用及行号在 `reports/public-contracts.json`、`reports/baseline-audit.json`。Dida owner 仍由原 `dida-bridge` 入口获取；本次不改另一个插件的实现。

能力键：`isolated-session`, `filters`, `allowed-paths`, `single-pick`, `multi-select`, `browse-then-batch`, `batch-title-open`, `inline-host`, `recent-opened-readonly`, `virtual-properties-readonly`, `folder-picker`, `folder-exclusion-picker`, `property-editor`, `shared-mobile-frame`, `file-move`, `embedded-create-context`, `native-batch-selection`, `property-catalog-readonly`, `embedded-session-state`, `host-file-navigation`, `workbench-presentation`, `workbench-toolbar`, `project-catalog`。

## 动态方法保留

`LocalSearchPlugin` 的 189 个原方法/构造器条目全部留存；其他类也没有按调用次数做删除。`METHOD_INDEX.md` 提供全部位置，Node 对比 36 个顶层类的原型名称、参数数量、描述符、键顺序和静态成员。工厂内部类随原函数原文保留，未单独以顶层导出加载。
