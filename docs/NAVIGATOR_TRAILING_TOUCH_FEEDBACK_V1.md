# GLS v5.2 · Navigator 行尾按压反馈 v1（开发候选）

## 来源与版本状态

- **唯一正式冻结基线**：GLS v5.2「后台摘要与属性计数整合 v1」（2026-10-18），保持只读。
- **直接开发起点**：上一轮未冻结的「Navigator 整行命中 v1」候选源码。
- 当前是二次优化开发候选，**尚未正式冻结**。既继承整行右侧可点击修复，也解决右侧触摸按住时没有短暂底色的反馈断层。

## 实际变化

只修改 2 个运行文件：

1. `src/features/navigator/SearchNavigatorController.js`：把原有 Navigator 行尾点击识别提取为同一个无状态局部函数，点击委托维持原按钮唯一动作 Owner。对移动端**触摸**、非子控件的行尾计数/空白，以 `pointerdown` 暂时设置现有 Row 上的 `is-nav-trailing-touch-pressed`；移动超过 8px、pointerup、pointercancel、实际滚动或 Navigator 销毁时立即取消。
2. `src/styles/styles.css`：仅在 Navigator 移动布局、Row 标记存在且非已选/不可用时复用原 `--ls-state-pressed-bg`；不改现有 Picker/桌面/已选样式。

没有新定时器、常驻全局监听器、新状态管理器、文件索引/查询变更或 CSS 设置项。JS 模块与静态依赖数量不变。触控事件只委托至 Navigator 自己的滚动容器，用既有 `_listen` 绑定及 `cleanups` 清理。独立展开箭头、管理按钮、排序/维护、右键和禁用行不触发反馈代理。

## 测试及限制

- 基线失败回归（之前的 Navigator 整行命中 v1）：**18/22**，新候选：**22/22**。测试移动 Chromium 390px，浅/深色，各 11 项；以真实构建产品与 CDP touchStart/move/end/cancel 采样行背景。
- 点击命中专项（移动/桌面、浅/深色、文件夹/标签/属性/分组标题、管理/排序等）：**126/126**。
- 桌面/移动浏览器业务：**40/40**；移动侧栏 **96/96**；导航精筛 **76/76**；Node **138/138**。
- 完整工程从交付 Source ZIP 重新解压、check/build/test，重建 JS/CSS 与独立交付字节一致（见交付 SHA 报告）。
- **未在原生 iPhone Obsidian/WebKit 真机验收**；Chromium 触摸模拟不是 iOS 真实行为保证。
- 当前无有效真实 `manifest.json` 来源；安装应保留原插件 `manifest.json` 和 `data.json`，不要从测试工程替换。

## 重要的视觉区分

行外层 `.is-selected` 是**筛选已选中**的持久背景/左线；`is-nav-trailing-touch-pressed` 是**按住**时短暂背景，两者不会重复叠加。桌面端不新增鼠标按压效果。

## 变更范围与回退

正式基线完全不改。若用户验收异常，可完整成对回退上一轮「Navigator 整行命中 v1」的 main.js/styles.css；对正式基线回退则会同时失去“行尾可以点击”的上一轮修复。
