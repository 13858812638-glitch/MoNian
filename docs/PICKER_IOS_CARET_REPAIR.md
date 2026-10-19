# Picker iOS 光标修复候选 · picker-ios-caret.1

本版从原始模块化源码修改并重新构建，只修改两个生产文件。已经验证可复现的移动弹层焦点转移、输入样式差异与空 Portal 生命周期；原始 iPhone 上“有输入但无光标”的唯一根因尚未证实，最终原生光标显示需要在同一台 iPhone 验收。

## 基线与证据

- 用户上传的搜索 `main.js` 与 modular.4 源码构建结果 SHA-256 完全相同：`e7e924550555da3c432902de41e29dfe84a758f86a31789ae88565d1c8d8de5d`。
- 用户上传的 `styles.css` 与 modular.6 源码完全相同：`bb3ffe9c315c8aa6057b2d694fd9d00fb9a49252b74ffac3b6f60203f78ade02`。本次按实际上传组合还原，未假定用户完整安装过 modular.6。
- 已找到的 iPhone 对照日志记录同一组哈希；iOS 18.7 / Obsidian 1.14.5，91 个事件、24 个快照、采样错误 0。GLS 输入始终可以获得焦点，选区随输入更新，`caret-color` 为正常文本色，不能把缺少光标直接解释成未聚焦。
- 对照飞书 7.6.5：实际输入框尺寸都是 331 × 38；GLS 字号 16px、touch-action:auto，飞书字号 14.992px、touch-action:manipulation。GLS 弹层带 tabindex=-1，飞书没有；GLS 复用空 Portal，飞书随工作流销毁。
- 后续 GLS-Feishu-Picker-Port-3 已作参考。本版没有覆盖其整套移植：仍维护这次上传版本的原始 ESM 模块、筛选状态与公开接口。

## 修改

| 源文件 | 修改及目的 |
| --- | --- |
| src/ui/overlays/SearchDropdownController.js | 移动弹层不再设置 tabindex 或获得延迟程序焦点，避免把原生输入的 :focus-visible 当成键盘导航意图；桌面保持原有焦点行为。 |
| 同上 | 最后一个移动面板销毁时释放空 Portal 并注销 hover observer；父子 Picker 切换保留父 DOM，其他面板仍在时保留 Portal。 |
| src/styles/styles.css | 共享 Picker 搜索输入采用 touch-action:manipulation，并由原 Picker 字号 token 决定大小，避开通用移动输入强制 16px 的覆盖。主搜索和其他表单字号策略不变。 |

没有引入假光标、焦点重置、blur→定时 focus、独立 Picker 状态或键盘高度推断。输入节点在过滤、组合输入和父子返回时保持身份。具体差异见 `PICKER_IOS_CARET.patch`，与上传版相比只有两个生产文件变化。

## 验证说明

- `reports/static-checks.json`：静态依赖、符号和批准变更范围；原冻结文件保持可校验。
- `reports/node-tests.log`：98 项 Node 回归通过，含生产构建加载和公开接口。
- `reports/picker-caret/report.json`：36 项专项通过，覆盖移动/桌面、浅/深色、输入与选区、组合输入事件、父子返回、重复打开和释放。
- 专项截图显式使用 `caret='initial'`。四种组合均检测到原生光标像素；设置透明 caret 后负对照像素差为零。该证据仅针对 Chromium 153，不等于 iPhone WebKit。
- 对上传基线重跑同一专项（`PICKER_AUDIT_BASELINE=1`）：24 项通过、12 项不符合新合同；修订版 36 项通过。上传基线在 Chromium 里同样能显示光标，因此本环境没有复现原始 iPhone 缺少光标的像素故障；修订消除的是已测得的焦点、样式与生命周期差异。
- `reports/gate-results.json` 与对应报告记录本次结果：浏览器 A/B 92 项、条件链 144 项、焦点 56 项通过；真实 SearchView 生命周期的模拟宿主检查及飞书对照门禁也通过。`reports/previous-releases/` 全部属于历史版本，不作为本次通过证据。
- 浏览器 A/B 的 A 端使用上传版 JS/CSS。仅对本次明确修改的移动 tabindex 和空 Portal 生命周期做有限归一化，并独立断言 B 端符合新合同；其余 DOM、几何、数据和操作结果仍比较。
- A/B 首轮在重命名提交后失败，原始快照实际上完全一致：新测试误把其他 Dialog 的空 Portal 也纳入本次 Picker 释放范围。已把释放断言收窄至专项中的真实 Picker 工作流，保留初轮记录并重跑受影响的两种移动主题；未修改 Dialog 生产实现。
- 初轮失败保留在 `picker-caret-before.json` / `picker-caret-before.log`。首次候选测试中，Chromium 移动模拟的物理按键只发送 keydown、不发送 beforeinput，因此保留失败记录后改用 CDP 原生文字插入路径；桌面继续测试逐键输入。此调整不属于生产代码修复，也不作为原始 iPhone 缺陷的复现证明。

原生 Obsidian 桌面、真实 iOS/Android WebView、真实中文输入法选词、真实飞书/工作台集成未在此环境验证。组合输入测试是事件级验证。

## 安装与验收

1. 备份现有搜索插件的 main.js、styles.css。
2. 解压双文件覆盖包，将两个文件一起覆盖到原搜索插件目录；保留原 manifest.json、data.json。
3. 完全关闭并重启 Obsidian，确保旧脚本与样式均已卸载。
4. 在同一台 iPhone 检查文件夹/标签/属性 Picker：首次点入、中文输入中、移动插入点、长按选词、关闭重开、子 Picker 返回后再次点入。光标应随原生选区显示，键盘不应被弹层抢走，过滤仍应正常。

输入字号现在遵循现有 Picker 行字号设置，会与修复前强制 16px 有差异。若实机仍无光标，请保留失败场景与录屏；不能依据 Chromium 通过就宣称真实 iOS 已解决。

## 重建与交付

`npm ci && npm run build` 使用原锁定 TypeScript 5.8.3 构建链。运行 `npm run check`、`npm test`、`npm run test:browser`、`npm run test:acceptance`、`npm run test:focus`、`npm run test:focus-repair`、`npm run test:feishu-focus`、`npm run test:picker-caret`。浏览器测试需 requirements-test.txt 及可用 Chromium，支持 CHROMIUM_PATH。

覆盖包只包含 main.js 和 styles.css。原上传不含 manifest.json，因此没有伪造完整安装包或插件版本。源码包包含同次构建的 dist、修复说明、补丁和测试证据，不包含用户 data.json。
