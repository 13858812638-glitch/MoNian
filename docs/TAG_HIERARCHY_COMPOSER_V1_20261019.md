# GLS v5.2「分级标签极速创建 v1」开发候选

冻结父版：2026-10-19 GLS v5.2「P1–P4 工程优化 · 返回筛选首帧一致与 CSS 默认值 v1」，完整模块化 Source SHA256 `03bcfd9eca21187c0b673dbfb2f9f2383a37bc08f93c04726eb420b135afb275`。正式基线只读，本轮派生候选，不自动晋级正式版。

## 用户体验

- **选已有父标签 +**：在标签树任意父级右端点 ＋，进入其子级，只切换本 Picker 会话中的当前父路径，不创建标签、不执行文件写盘；包括由实际叶标签自动投影的虚拟父级。
- **递进创建**：在父级输入一个新名字，点拟新增行最右侧「进入下一级」，进入下一层但不先添加父标签。例如 `运动` → `跑步` → `训练`，仅把 `运动/跑步/训练` 加入待应用标签。
- **输入与键盘**：Enter 把当前完整路径加入原有待应用列表；重复 Enter 不会把已选标签取消。输入 `跑步/` 可以直接推进一层；原有 `一级/二级/三级` 完整输入保留。输入框为空时 Backspace 返回上一级。中文 IME 组合输入期间不自动钻入。
- **导航与焦点**：输入框始终是原 Picker 唯一的搜索输入。水平可滚动面包屑支持直接返回任何祖先层级，深层级定位到末端；手机端右侧 ＋ 点击区域不小于 44px。创建多个同父级标签不必重复输入父路径。
- **确认与取消**：只存储临时 Picker 草稿；用户点原有「确定」才通过 BatchMetadataService 或 `session.metadataTarget.commit` 写入。取消不写入；始终保留原有撤销和批量操作业务逻辑。

## 修改范围

- `src/features/batch/tag-editor-methods.js`：唯一已有运行模块变更；扩展共享标签编辑器。
- `src/features/batch/tag-hierarchy-compose.js`：新增独立纯函数模块；不维护第二权威标签目录。
- `src/styles/styles.css`：末尾追加特定标签 Picker CSS；原有全部 CSS 声明、包括两个 6px 默认值保持不变。
- `tests/tag-hierarchy-composer.test.mjs` 与 `scripts/tag_hierarchy_browser_audit.py`：22 项路径计算测试和多视口 98 项浏览器模拟测试。
- `scripts/check-change-scope.mjs`、`docs/APPROVED_CHANGES.json`：新增源码模块要求明确路径和 SHA256 审批，不允许任意新增。工程元数据由原构建脚本更新。

## 验证与边界

- 静态检查 147 模块、636 依赖边、0 环依赖、0 未解析引用。
- Node 测试 238/238，包含新增 22 项。分级编辑 Chromium 浏览器场景 98/98，包含移动 390/320px 与桌面 1100/870px、明暗主题、取消不写盘、确认提交、IME 保护、深层面包屑、44px 移动点击热区。
- 旧有 Navigator 76/76、移动侧栏 96/96、Picker 光标 Chromium 36/36、Portal Chromium 48/48、索引重试 7/7 已通过（见证据日志）；WebKit 未安装，不能代替真实 iPhone / Obsidian 实机验收。
- `index-cache`、GLS JSON 可见性与计数规则、项目元数据 Owner、Swipe-Back、原生滚动、焦点逻辑与全部用户数据均不变；没有更改插件 ID 或需要覆盖 manifest/data 的内容。

## 使用 / 回退

仅用双文件覆盖包中的 `main.js` + `styles.css` 覆盖现有插件运行文件，保留用户现有 `manifest.json`、`data.json`、YAML、GLS 自有元数据目录。保留正式冻结版双文件可随时回退。开发和修复只修改本候选 `src/`，完成验收后由用户决定是否晋级。
