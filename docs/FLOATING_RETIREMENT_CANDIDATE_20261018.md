# GLS v5.1 · 独立浮窗退役开发候选（2026-10-18）

## 代码基线与范围

以正式 v5.1「标题行高统一」加上已审计的 RenderGuard「渲染清空与属性目录收口」候选为唯一代码输入。**v5.1 正式冻结源文件保持不变；本包为单独候选。**

本轮只退役桌面独立 modeless 无模态浮窗，不删除原生 Modal、Workspace Tab、移动/桌面 Sidebar、嵌入式外部搜索、Picker、删除/重命名确认 Dialog，也不删除 Modal 拖拽缩放或尺寸记忆。

唯一删除的生产模块：`src/ui/hosts/floating-host.js`。`SearchWindowSession` 只生成 `SearchModalHost`，`LocalSearchPlugin` 不再注册 `open-local-search-floating`，公开内部方法 `openFloatingSearch()` 已删除。旧命令不保留别名；此前绑定到它的热键需要用户手动重新绑定现有「打开本地搜索」（Modal）或「在标签页打开搜索」。即便旧调用者传 `floating:true`，会走普通 Modal，不启动浮窗。

生产 src 变化（独立于测试/文档）：
- `src/core/LocalSearchPlugin.js`
- `src/core/search/search-and-ranking-methods.js`
- `src/core/search/shell-methods.js`
- `src/core/ui-reference-keys.js`
- `src/features/plugin/external-search-methods.js`
- `src/features/plugin/file-command-actions-methods.js`
- `src/styles/styles.css`
- `src/ui/hosts/SearchWindowSession.js`
- `src/ui/hosts/floating-host.js`

## 验证

- 工程构建与变更范围校验：PASS，152 个 JS 模块，639 条依赖，0 循环/未解析引用。
- Node 回归：125/125 通过（含浮窗退役专项）。
- 业务浏览器流程：80/80 通过（desktop/mobile × light/dark）。
- 真实 Modal 启动/关闭/重开/子 Picker/文件选择/卸载测试：32/32 通过。
- 移动侧栏 96/96、导航 76/76、Picker 光标 Chromium 36/36、Portal Chromium 通过、索引恢复 7/7。
- CSS/Style Settings 审计通过：143 个 Style Settings 参数，未增加重复 ID。
- 历史页面像素 A/B **未通过**：旧基线采用了不同年代的筛选范围和计数快照，在文件夹 Picker 产生差异；不是本轮退役浮窗的功能回归证明，保留失败日志；改以当前候选业务合同的真实操作浏览器测试覆盖。
- 完整搜索条件：144/144 通过；Source 独立解压重建及 125/125 Node 回归通过，生成运行文件与分包完全一致。
- iPhone 原生 WebKit 未运行，不称作实机验收。

## 生产交付

从本 Source 的 `src/` 维护，构建为 `dist/main.js` + `dist/styles.css`，拷贝完整双文件覆盖已有 GLS 插件目录。**保留已有的真实 `manifest.json` 和 `data.json`**，本包不提供或推测安装清单，不删除用户现有笔记或自定义设置。

### 变更范围检查

`docs/APPROVED_CHANGES.json` 仅允许已列出的变更和原 `floating-host.js` 的明确退休；冻结历史 `baseline/` 只用于对照，不参与生产编译。原 Modal `.local-search-modal`、顶部底部工具栏、iOS Portal E 光标与 NoKeyboardFollow 均保留。
