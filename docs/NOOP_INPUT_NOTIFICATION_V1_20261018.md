# GLS v5.2 · 同词无变化通知收口 v1 · 开发候选

**状态：未冻结。** 唯一正式基线仍为 `同词无变化提交收口 v1`，2026-10-18。不得直接修改正式 Source。

## 运行差异

只改变 `src/core/search/input-and-filters-methods.js` 的 `_commitSearchInputValue`：
- 对已提交且原始输入完全一致、结果已生成、无待处理索引/首屏锚点、非创建视图的输入事件，仅同步搜索框标题操作控件，随后返回；**不**发出 `_notifyStateChange`。
- 真正变化的关键词（包括原始字符串空格变化）、延迟索引提交、创建模式和衍生创建视图沿用原先逻辑；不更动 `performSearch`、SharedSearchStateCoordinator、Navigator/滚动保存事件、CSS、API。
- 无新定时器、监听器、持久化字段或状态 Owner。

## 验证边界

回归脚本：`scripts/unchanged_notification_acceptance.py`（真实 bundled JS + Chromium/mock Obsidian）；请区分 Chromium 与 iOS WebKit。现有 Node/浏览器检查以交付报告为准。不得称声称已 iPhone 真机验收。
