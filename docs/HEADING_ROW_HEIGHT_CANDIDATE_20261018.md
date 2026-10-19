# GLS v5 标题行高统一 · 开发候选版（2026-10-18）

- **正式冻结基线仍为** `GLS-v5-标题与内容间距-正式基线-20261018-完整模块化Source.zip`。
- 本工程从正式 v5 源码独立派生；没有回写或覆盖正式基线。
- 唯一运行源码变化：`src/styles/styles.css` 中移动导航分组标题 `min-height` 从 `--ls-mobile-picker-row-h`（44px）改为 `--ls-nav-row-height`（默认 30px）。
- 现有「列表单行高度」同时控制普通导航行和分组标题；「标题与内容间距」仍是独立 6px 默认设置。
- `main.js` 与 v5 正式版 SHA-256 相同；所有 Style Settings ID、描述、默认值均未变。
- 测试仅代表 Chromium 和静态/单元回归，不代表 iPhone WebKit 已实机确认。
- 若真机满意，再由用户明确决定是否升级下一份正式冻结基线。
