# 侧栏结果筛选条审计 · 2026-10-22

在上一轮侧栏候选上继续审计，发现结果列表上方筛选条重复重建文本与无障碍标签。本轮仅修改 `src/features/results/filter-channels-methods.js`，仍是待原生 Obsidian 验收的开发候选。

## 问题及修复

桌面 Hover Hint Owner 为按钮保存隐藏的无障碍名称。原筛选条用整个按钮的 `textContent` 与可见文字比较；其中也包含隐藏名称，因此无变化刷新仍误判为文字变化。它清空按钮内容后，Hover Hint Owner 又补回隐藏名称；重复的 aria-label、title、hidden 等赋值还会触发后续观察器处理。

桌面 sidebar 现在只更新可见文本节点，保留无障碍名称节点；属性和显隐值相同时不再重复写入。可变的选中状态检查实际 DOM；名称意图附着于对应节点，随节点释放，无新增全局状态或缓存索引。名称/计数确实变化时仍通知原 Hover Hint Owner 更新辅助标签。

每次刷新仍更新按钮动作，排序、显隐设置、标签点击、属性快捷入口和打开中的弹窗锚点继续使用原 Owner。移动端和其他宿主保留原更新路径；未改弹窗位置、CSS、焦点或手势。没有通过防抖或吞点击降低执行次数。

## 验证

新增 `scripts/sidebar_filter_rail_audit.py`，从真实 SearchView 生命周期启动模拟 Obsidian/Chromium，覆盖浅色、深色桌面 sidebar 和移动端。

受控夹具为 36 文件，启用文件类型、标签、文件夹及属性筛选，并配置属性快捷入口。统计范围仅为筛选条 DOM，已等待无障碍观察器完成处理。

| 操作 | 修改前 DOM 变更记录 | 修改后 |
|---|---:|---:|
| 稳定状态连续刷新 10 次 | 1,510 | 0 |
| 点击一个标签 | 152 | 2 |

原先可见文本、隐藏名称节点都被替换；修改后保持原节点。按钮可见文字、可访问名称、筛选结果、选中状态、打开中的属性弹窗、索引增加后的计数和分组隐藏均通过检查。

初轮 21 项检查中 6 项失败、15 项通过；修改后 21 项通过。明细见 `reports/sidebar-rail-before.json`、`reports/sidebar-rail-after.json`，其余回归与历史基线差异见 `reports/sidebar-rail-validation.json`。

静态检查、构建、搜索验收 144 项、移动侧栏 96 项、弹窗 80 项及完整工作流 80 项通过。Node 为 258 通过、4 项历史原型/基线差异；旧浏览器 A/B 初始快照仍有 4 项历史差异。本轮没有新增失败，也没有放宽测试断言。

这说明重复 DOM 工作减少，不代表原生 Obsidian 的帧率或耗时已测量。原生桌面、原生 iOS/Android、WebKit、实际屏幕阅读器及真实第三方集成未验证。

## 交付

[下载覆盖包](https://github.com/13858812638-glitch/MoNian/raw/refs/heads/fix/desktop-sidebar/downloads/GLS-Sidebar-Filter-Rail-20261022.zip)

关闭插件后只覆盖原插件目录中的 `main.js`、`styles.css`，保留原 `manifest.json`、`data.json`，再启用。CRC、构建比对和真实下载验证见 `reports/sidebar-rail-delivery.json`。
