# GLS v5.1 · 结果构建与清空调用链收口（候选）

> 2026-10-18。唯一修改起点：用户冻结的 `GLS-v5.1-标题行高统一-正式基线-20261018-完整模块化Source.zip`。
> 本目录是候选源码，不升级或覆盖 v5.1 原正式基线。未来修复不得从历史 v4、A–D 诊断包回填。

## 仅 8 个 JS 源模块有运行改动

- `src/features/results/page-and-snippets-methods.js`：renderPage 的普通结果、空结果、派生创建视图全走离屏准备 → 一次 DOM 提交。构建失败时旧 DOM、滚动高度索引、虚拟范围、已渲染行和滚动坐标恢复。准备中创建的 ResizeObserver 观察目标在错误退出时撤销。提交后状态更新异常亦回退。原异步摘要回填/原生 ScrollOwner 仍是唯一实现。
- `src/features/results/virtual-window-methods.js`：滚动窗口补充卡片先构建所有新增片段，成功后再移除范围外旧卡；失败时保留原有列表、锚点和虚拟范围，释放离屏观察目标。避免虚拟平移出错时卡片间出现暴露底层的空窗。
- `src/features/result-controls/toolbar-methods.js` + `src/features/result-controls/view-composer-methods.js`：创建提交或已存在待补写文件时，橡皮擦不可执行；事件处理在调用 blur 前提前返回。其余结果视图按钮逻辑不变。
- `src/features/create/input-mode-methods.js`：清空后不再手动二次调用 `syncInputActions()`；原 `handleInput/performSearch` 负责唯一一次必要状态更新。
- `src/features/plugin/project-catalog-methods.js` + `src/core/LocalSearchPlugin.js`：通用属性值目录变更仅刷新实际目录消费组件，并用 `subscribeIndexChanges([])` 向工作台报告“文件未变，仅属性目录变化”。不再冒充文件索引全量变更。
- `src/features/plugin/property-maintenance-methods.js`：普通属性目录只有零文件值的重命名/删除也采用同一精准通知，避免重复刷新筛选池。

## 已执行的可复跑测试

- `node scripts/check.mjs`：153 JS 模块、641 import 边，无静态环和未解析符号。变更清单 `docs/APPROVED_CHANGES.json` 只批准本轮八个模块的变动。
- `node scripts/build.mjs`：重新构建出 `dist/main.js` 和 `dist/styles.css`。
- `npm test`：123/123。
- `python3 scripts/repair_regression_audit.py`：Chromium 手机/桌面，66/66 断言。旧版第一批为 24/36；包含失败发生在 DOM 提交前和提交后的回退、虚拟窗口局部卡片失败、创建预览、正在创建期间橡皮擦禁用与焦点保持、正常清空仅一次动作同步、空属性值增/改/删订阅通知与零搜索重算。
- `python3 scripts/repair_long_delete_audit.py`：两种主题、手机/桌面 × 3 个滚动位置删除，12/12。
- `npm run test:mobile-sidebar`：96/96。
- `npm run test:navigation-browse`：Node 5/5、Chromium 76/76。
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:picker-caret`：36/36。
- `PORTAL_AUDIT_ENGINES=chromium CHROMIUM_PATH=/usr/bin/chromium npm run test:picker-portal`：66/66。
- `npm run test:index-retry`：7/7。
- `npm run audit:source`：无重复 Style Settings ID，CSS 未改动。
- 搜索条件 `TEST_CONFIG=mobile-dark npm run test:acceptance`：当前候选中 v5.1 第一轮补丁阶段执行得到 B 36/36；最终补入虚拟窗口异常回退后，导航及长列表删除已重新通过，但未再执行完整四组 144/144。
- `npm run test:focus`：记录中 56/56 断言通过；运行封装退出码没有稳定获取，不记为整套完整通过。`test:focus-repair` 未取得可确认的最终结果。

## 未被证明的事项

- **不能将 Chromium 中的 DOM 回退等同于已消除用户 iPhone WebKit 上下露出 Markdown 的绘制穿透。** 截图在中间仍有卡片，与单纯渲染异常并不完全一致。应配合 Wisdom CSS 开/关，使用 iPhone 真机做重复删除和键盘收起验收。
- 本轮不修改 CSS、滚动手势 Owner、Picker Portal E、Dialog44、底部命令栏不跟随输入法的正式逻辑。
- 不盲删旧版本兼容、原生宿主 CSS 权重、动态拼接的方法或“项目”旧文件命名；无证据的深度清理留在后续独立评估，不与健壮性修复混装。
- 无用户装机 `manifest.json`、`data.json`，未做真机/NAS 并发场景完整验收；安装仍保留已有 `manifest.json` 和个人配置。

## 独立源码包复现验收

在新临时目录重新解压候选 Source ZIP，以锁定的本地依赖版本链接后执行 `node scripts/check.mjs`、`node scripts/build.mjs`、`npm test`：
工程检查 PASS、123/123 Node 测试通过；生成的 `dist/main.js` 和 `dist/styles.css` 与交付分包 SHA-256 完全一致。由于本环境缺少部分 npm 离线缓存，不能据此宣称 `npm ci --offline` 已通过；正式安装依赖由可联网环境按 `package-lock.json` 获取。

**未经 iPhone 实机确认，绝不宣称截图中的 WebKit 内容穿透已彻底解决；当前版本仍是候选。**
