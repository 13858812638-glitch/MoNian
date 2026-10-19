> 历史记录：此文件描述 modular.1 工程拆分，不是本轮验收结论。modular.2 的实际改动、最终结果和残余风险以 AUDIT_MODULAR2.md 为准。

# GLS Navigator · modular.1 工程交付报告

## 结论

已实际完成当前双文件基线的全量静态审计、职责模块提取、单文件构建、自动化 A/B 对照和可复现构建工程。**不能把本次称为完整原生安装验收**：原附件缺 manifest.json，且原生设备/真实外部集成尚未验证。

本次提供完整源码工程与 main.js/styles.css 双文件覆盖包；不冒充包含原 manifest 的全新安装包。原源代码标注构建号 2026-10-15.7，工程修订 modular.1；package.json 的 0.0.0-modular.1 仅是工程包标识，绝不替代原插件正式版本或 ID。

## 基线与产物

原 main.js：30,595 行，1,380,818 字节。原 styles.css：7,246 行，245,468 字节。仅使用 Archive 2(9).zip；完整原包与文件备份见 baseline/。未发现原构建配置/source map，所以不能复现一个未提供的“原源码工程”；本次建立的是从该安装代码提取的新构建工程。

模块化运行源码：153 个 JavaScript 文件，641 条静态依赖，无循环；最大模块 1,099 行。主入口仅导出生命周期类；36 个顶层类、248 个顶层函数、822 个类方法和嵌套宿主类均保留。826 个原声明/方法片段的原文及 SHA-256 全部匹配；CSS 与原版完全相同。

真实重建 main.js：1,635,127 字节，SHA-256：

```text
e87b20d437d7cd55f115d8a003381e86a4ed80ff2bcef9ec43b5b410b8c64887
```

生产 CSS 的 SHA-256：

```text
402c2dc853b405f694c868a8945562c0d02b3c11045e89f6932a434725090e97
```

打包增加约 18.4% 体积，来自模块设施、非压缩转译与注释，不代表增加功能。没有对真实 Obsidian 启动性能/内存作结论。

## 构建链与执行结果

本次 npm 网络不可达，esbuild 未预装，备用 esbuild 尝试失败。实际使用锁定 TypeScript 5.8.3 转译 ESM JavaScript，配合静态 CommonJS 链接器输出单文件；仅 `obsidian` 留作宿主 external，不把 Node.js 内置模块塞进移动端代码。esbuild.config.mjs 只是未验证的备用路线。

`npm run check`：153 模块语法/导入导出检查通过，未解析符号 0、循环 0、片段 826/826、CSS 校验通过；清单身份检查明确 BLOCKED。不是完整 TypeScript 类型证明。

`npm run build` 与 `node --check dist/main.js`：通过。Node A/B 用例再次重建并确认 main.js 字节一致，styles.css 源/目标/原版三方一致。

`npm test`：98 通过、0 失败。覆盖原型合同、工具与算法、索引、并发、数据写入/错误恢复、设置持久化、生产 bundle 生命周期、命令/视图/API、虚拟属性、非 Markdown 侧车和 Dida 订阅合同。

`npm run test:browser` 对应的真实 Chromium 测试：92 通过、0 失败、无未捕获页面异常。20 个场景 × 桌面/移动模拟 × 浅/深主题 = 80 个 DOM/计算几何/焦点/状态/文件 A/B；另 12 个测试宿主截图字节一致。覆盖搜索、组合输入事件、筛选/清空、Picker、多选、排序、重命名、删除、创建、卸载、拖拽与取消、右滑 Owner 隔离及正式 workbench mount/setScope/destroy。

所有浏览器外围均是测试宿主，不是安装好的 Obsidian。模拟 composition/PointerEvent 不等于真实输入法或手指；测试图标/宿主 CSS 不等于真实 Obsidian 主题视觉验收。

`npm run pack:install`：因缺原 manifest，实际退出 2，不生成伪安装包。覆盖包及源码包由真实 ZIP 脚本生成，并校验 CRC32 与每个文件 SHA-256；最终文件清单/校验见交付目录的验证结果。

## 独立源码包复现

已将实际 Source ZIP 解压到独立空目录，执行 `npm ci --offline --cache /root/.npm --no-audit --no-fund`，16 个锁定依赖包安装成功；随后重新运行 build、check 和全部 Node 测试。98 项再次通过，重建的 main.js/styles.css 与覆盖 ZIP 内文件逐字节相同。没有依赖原工作目录的 node_modules、生成的测试 bundle 或隐藏源码。详见 reports/clean-rebuild.json 及 clean-*.log。

浏览器全套已在主工程执行至 92 项通过；独立目录这次复跑的是构建、静态和 Node，不把它描述为第二次独立浏览器验收。

## 公开与数据合同

保留 API v18、19 个 API 对象键、8 个命令 ID、local-search-sidebar/local-search-tab 两个 ViewType，及 gls:external-api-ready / dida:workbench-api-ready 等原事件。完整方法参数、包装器、能力与目标模块见 PUBLIC_API.md / METHOD_INDEX.md，不按“可能没有调用”删除动态入口。

原插件实例与 SearchCore 仍为状态 Owner；没有第二份业务数据源。所有 settings 默认值、原持久化结构、YAML/侧车/历史处理和原错误分支保留。任何安装包都不携带 data.json；执行中的数据测试只写内存测试仓库，不碰用户真实仓库。

## 交付目录

- 运行覆盖包：main.js、styles.css，仅覆盖已有原插件这两份文件。
- Source 包：153 个源码模块、全部原样式、package/lock、构建/检查/打包脚本、测试与浏览器宿主、AGENTS、README、架构/接口/模块/方法索引、依赖图、基线备份、执行记录与现有 dist。
- 完整安装包：因原 manifest 未提供，不交付伪造版本。补齐真实清单后再执行受控打包，并完成相应身份/加载验收。

## 未验证、风险与后续维护

原生 Obsidian 桌面、iOS、Android、真实中文输入法、Mac 触控板、真实工作台/Dida/NAS 联动、全分支动态反射和设备性能未验证。方法组合不承诺 Function.toString 文本、堆栈行号与旧聚合文件相同。原生验收步骤见 MANUAL_ACCEPTANCE.md；所有初轮失败、测试宿主修正和环境障碍见 VALIDATION_ISSUES.md。

后续从 AGENTS.md → ARCHITECTURE.md → 目标职责模块/直接依赖/对应测试进入。修改 src，不修改 dist。运行受影响测试与必要全局回归，然后由同一份源码构建覆盖包和 Source。不要重新执行一次性提取脚本覆盖后续源码成果。
