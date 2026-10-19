# GLS v5.2 · 模块归一 v2 候选 · 验收与归一报告

**版本状态：候选版。** 唯一正式冻结基线仍为 GLS v5.2「独立浮窗退役」；本轮以模块归一 v1 的 146 个模块为研发起点，没有覆盖冻结源码。

## 本轮实际改动

1. 将标签、属性、文件夹 Picker 的多选、维护、排序三种模式的**互斥退出规则**集中到 `ui/pickers/selection-mode.js` 的无状态函数 `deactivateConflictingFacetPickerModes()`。保持不同类型原有触发顺序：文件夹排序“先退出维护再退出多选”，标签/属性排序“先退出多选再退出维护”。
2. `ui/pickers/sort-mode.js` 新增 `attachFacetPickerSortModeToggle()`，复用旧基础 SortToggle，集中重复的模式退出、协调器启停和已选条件区刷新；三种排序提交算法、PointerSortCoordinator、创建/池模式分支未合并。
3. 原 `project-catalog-methods.js` 已改名 `property-catalog-methods.js`，类方法组装配顺序、公开属性读写接口及持久化不变；只是消除错误旧命名，不重新引入项目模型。
4. 同步更新构建变更白名单、精确源文件改名的 SHA-256 校验、当前 146 模块索引和原始方法来源文档。不为了减少文件数引入无意义的合并。

## 规模与边界

- JS 模块 **146 → 146**；静态依赖边 **634 → 635**。模式回调共享是结构归一，**没有声称减少加载时间或调用开销**。
- **CSS 完全未修改**，143 项现有 CSS 设置保持原样。
- `LocalSearchPlugin` / `SearchCore` / `SearchFacetController` 已有状态 Owner 不变；无新定时器、观察者、额外事件源、数据模型或兼容层。
- 侧边栏、标签页、快捷 Modal、工作台外部搜索 API、Picker iOS Portal、Dialog44、滚动和右滑等原合同不变。
- `baseline/` 与历史 `tests/reference/upload-main.js` 含旧版路径是溯源资料；**当前 `src/` 不再包含项目目录实现**。

## 验证结果

| 项目 | 实测结果 |
|---|---|
| 原版故障门禁 | 新增 6 项专项在 v1 **0/6**、修改后 **6/6** |
| 工程 check / build | PASS，146 模块 / 635 条依赖 / 0 循环 |
| Node 单元与 API 对照 | **134/134** |
| Picker A/B 动作轨迹 | **4/4 配置，共 12 条真实交互序列，前后相同** |
| 全部搜索条件 | **144/144 B PASS，0 错误** |
| 移动侧栏 | **96/96** |
| 导航与精筛 | **76/76** |
| Picker 光标 Chromium | **36/36** |
| Portal Chromium | **48/48** |
| 索引失败恢复 | **7/7** |
| CSS / 代码扫描 | 通过 |
| iPhone WebKit / 原生 Obsidian | 未实测；不可据此宣布旧穿透问题已解决 |

首次运行 Picker 光标和 Portal 两套脚本时，Playwright 默认浏览器未安装，因此**工具启动失败（非功能断言失败）**；明确配置 `CHROMIUM_PATH=/usr/bin/chromium` 后全部通过。浏览器 A/B 首次桌面误用 `aria-label` 查找按钮（桌面按钮使用 `aria-labelledby`），更正测试读取后四组通过。失败与复跑日志保留在 `reports/`。

### 不做的下一步

暂不将树形标签排序、真实文件夹移动和带类型属性值排序硬归为同一种业务。也不把此轮结构归一解释为能够修复 iPhone 上删除文件之后的笔记穿透；那需要在真机宿主复现。

## 安装与回退

备份现有 `main.js`、`styles.css`，下载完整 JS TXT 改名 `main.js`，并与完整 `styles.css` 一起覆盖已安装 GLS。保留真实 `manifest.json` 与 `data.json`，重启 Obsidian。遇到异常可成对回退 v5.2 正式安装双文件。不要把候选源码误标为正式冻结。

完整源码索引与当前源码修改范围见 Source ZIP 内 `docs/MODULE_INDEX.md`、`docs/MODULE_CONSOLIDATION_V2_20261018.md` 和 `docs/APPROVED_CHANGES.json`。
