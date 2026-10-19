# GLS 正式冻结基线 · 2026-10-18

## 版本标识

- 名称：GLS Navigator · 导航范围与结果精筛分离 v1 · Snapshot 2项默认值冻结
- 代码母本：`GLS-导航范围与精筛分离-v1-完整模块化Source.zip`
- 发布身份：保留用户已安装插件的原始 `manifest.json`；源码工程的工程版本字段不作为插件发行版号。
- 状态：用户明确指定的**唯一正式冻结开发基线**。以后所有改动均从本完整 `src/` 出发构建，不基于历史候选/诊断版补丁叠加。

## 本次授权修改

| Style Settings ID | 原默认 | 冻结默认 | CSS 变量 |
|---|---:|---:|---|
| `ls-nav-section-spacing` | 0px | 6px | `--ls-nav-section-spacing`（对应 `var` 回退值） |
| `ls-nav-count-tail` | 16px | 2px | `--ls-nav-count-tail`（`body` 变量默认值） |

仅这些参数的 `default`、对应 CSS 默认/回退值及其自身描述性注释改变，其他设置完全不变。`src/main.js` 等全部 JS 模块和构建后的 `main.js` 与前一版逐字一致。

## 保留能力

- 全库文件夹目录；按当前文件夹范围展示完整标签、属性候选和范围内计数；结果由搜索和属性条件精筛。
- 文件夹切换重置临时精筛；用户主动多选 OR，不同属性键 AND；`所属项目` / `项目负责人` 对 GLS 都只是普通文件属性。
- Dialog44、Picker Portal E、已有 Style Settings 和移动侧栏底部命令栏不跟随输入法策略全部不改。
- 和个人工作台的“按指定普通属性分组”接口保持上一版本一致，无需重新更新工作台。

## 验收与安装

- 用 `npm run check`、`npm run build`、`npm test` 和默认值差异检查进行源码验证；浏览器专项只可视为 Chromium 模拟，不替代 iPhone WebKit 真机。
- 安装仅替换已有 GLS 插件的 `main.js` 与 `styles.css`，保留真实 `manifest.json`、`data.json` 和笔记/业务数据；建议备份后重启 Obsidian。
- CSS 控制中心已保存的用户覆盖设置优先于新的代码默认值，如需要使用 6px 与 2px，须恢复这两项为默认或手动修改。
