# GLS Navigator · v5 2026-10-18 正式冻结规范

## 当前唯一起点

v5「标题与内容间距」，唯一源码包名：`GLS-v5-标题与内容间距-正式基线-20261018-完整模块化Source.zip`。唯一祖先为已交付的 `GLS-v4-仓库名与开合图标-20261018-完整模块化Source.zip`，不是早期正式 v1 的重新分支。v4 的运行 JS 与本版完全一致，当前仅 CSS 改动。

今后修改直接在 `src/` 模块源码进行，再用现有 `npm run check`、`npm run build` 生成单一 main.js + 独立 styles.css，不允许从其它候选版本复制逻辑或直接编辑 dist/main.js。

## 唯一新增 Style Settings

- ID：`ls-nav-heading-content-gap`；标题「标题与内容间距」。
- 分组：本地搜索 → 侧边栏 → 字体与行距。
- 类型：`variable-number-slider`，default 6、min 0、max 32、step 1、format px。
- 变量：`--ls-nav-heading-content-gap`，Source `:root` 的完整默认值为 `6px`。
- 消费者：`.local-search-navigator[data-nav-layout="mobile"] .local-search-nav-section-heading + .local-search-nav-section-content:not([hidden])`，只改变展开的移动导航区块正文上间距。
- 移动分组标题由于原 Tree Row 会额外提供底部 `--ls-row-spacing-y`，将标题行自身 bottom margin 置 0：0px 参数产生真实 0px 视觉间距；正常文件夹/标签/属性普通行的 `ls-nav-row-spacing` 保持原值。
- 文件夹、标签、属性三类分组均使用一份 CSS，不新增 JS 渲染分支。
- 折叠内容 `hidden` 无占位；非移动布局、Picker、普通行高度、渐隐分割线、触控与计数位置不受影响。

## 严格变更边界

- runtime 源码只修改：`src/styles/styles.css`。
- CSS 控制中心既有 142 个参数默认值（以 v4 实际枚举为准）全部保持不变；仅新增一个参数，原参数顺序、ID 不变。
- 原有 JS 153 个模块及 `dist/main.js` 与 v4 哈希一致；不改变搜索、文件索引、项目属性、NoKeyboardFollow、Portal E 或公开接口。
- 来源包没有真实 manifest.json，不制造安装清单；保留用户已安装插件的 manifest.json/data.json；不包含用户数据。
- 测试为工程本地 Node 与 Chromium 夹具，不代表真实 iOS WebKit 或 Obsidian 原生界面的实机验收。

## 本轮自动化门禁

- `npm run check`：PASS，153 个 JS 模块。
- `npm run build`：PASS，生成 JS 与 v4 SHA-256 相同。
- `npm test`：121/121 PASS，其中新增标题间距专项 2/2。
- `python scripts/nav_heading_gap_audit.py`：Chromium 108/108 PASS（375/430 手机 × 深浅主题；1200 桌面 × 深浅主题）。
- `npm run test:navigation-browse`：Node 5/5、Chromium 76/76 PASS。
- `npm run test:mobile-sidebar`：96/96 PASS。
- `npm run audit:source`：CSS 解析、Style Settings 重复 ID 及缺失消费者检查无异常。
- `npm run test:index-retry`：7/7 PASS。
- `npm run test:picker-caret`：36/36 PASS；`PORTAL_AUDIT_ENGINES=chromium npm run test:picker-portal`：66/66 PASS；未运行 iOS WebKit 原生测试。
- `npm run test:acceptance`：尝试运行，约 150 秒时触发本环境时间限制（退出 124），已执行的断言日志没有失败但**不得标记全量通过**。该限制不影响已完成的本轮布局专项通过结论。

安装后，在 Style Settings 里调「标题与内容间距」为 0、6、13，分别观察标题到首项内容的距离；原「列表相邻行间距」与「分组上下留白」保持各自独立值。若有旧 CSS 自定义覆盖，恢复此项默认即可。
