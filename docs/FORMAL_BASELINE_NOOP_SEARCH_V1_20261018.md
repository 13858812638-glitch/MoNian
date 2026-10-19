# GLS v5.2「同词无变化提交收口 v1」 · 正式冻结声明

- **用户确认**：2026-10-18 明确要求将「同词无变化提交收口 v1」升级为正式基线，随后继续审计。
- **最新唯一正式开发基线**：GLS v5.2「同词无变化提交收口 v1」，此前「Navigator 行尾按压反馈 v1」转为历史只读回退。
- **运行代码冻结**：本次只标识基线状态，不改变候选的任何 `src/`、`dist/`、`tests/`、`scripts/`、`reports/`、`baseline/`。

## 主要改动（来自候选）

相对于上一正式版仅有以下两个源码模块变化：

1. `src/core/search/input-and-filters-methods.js`：输入内容完全一致、且无真实待提交工作时跳过重复搜索，保持批量选择、滚动和焦点。
2. `src/features/sort/SearchSortController.js`：重复选择相同排序字段时不触发无变化搜索；真实排序循环仍走重算。

Navigator 右侧点击和移动触摸按压、后台摘要精准刷新、属性计数统一等正式版已有功能全部继承。

## 已冻结运行文件 SHA-256

- `main.js` 1661163 bytes: `38466c1dda8eb267ac4d6959b54991447afceeb7a515562ce613d31fec648df4`
- `styles.css` 256695 bytes: `dfb2878bd18d2104caf50b8395142ed43afd808db03d13a5415be4c08a2ba2a6`
- 晋级前候选 Source ZIP: `c136951c259efce086b1cfef7ba04055a29affeb1e84c998904824f44cb6e934`

## 基线规则与验证边界

- 后续必须以本正式 Source 的 `src/` 复制派生开发候选；正式文件只读。
- 保持单 `main.js` 与独立 `styles.css`，不变更插件 ID、manifest、数据模型与公开接口。
- 由用户另行确认才可将未来候选升级为正式版。
- 此次仅执行构建、代码与现有测试，不意味着真实 iPhone Obsidian / WebKit 交互已获验收。
