> 历史记录：此文件描述 modular.1 工程拆分，不是本轮验收结论。modular.2 的实际改动、最终结果和残余风险以 AUDIT_MODULAR2.md 为准。

# 基线审计与执行记录

## 输入及备份

唯一输入 `/mnt/data/Archive 2(9).zip`，已实际解压；仅 main.js、styles.css，未见 manifest、原工程、source map、构建配置或其他运行资源。完整原 ZIP 和两份解压源保存在 baseline/。ZIP SHA-256：`1f02c96a278fc5d470db94b60e2a8456357ade7c65394276b935ffa15f953bce`。

main.js：30,595 行 / 1,380,818 字节，SHA-256 `6178ecce711ab48c1164922e8251ae86bd15a6ef3143abe75e3638c48074319f`。

styles.css：7,246 行 / 245,468 字节，SHA-256 `402c2dc853b405f694c868a8945562c0d02b3c11045e89f6932a434725090e97`。

代码标注 GLS Navigator build 2026-10-15.7；发行清单未知，不将其当正式 manifest.version。

## 全量扫描

Acorn 扫描所有 342 个顶层语句：36 个顶层类、248 个顶层函数、822 个顶层类方法；另保留工厂内部 SearchModalHost。TypeScript 符号绑定分析解析 357 个顶层绑定（含宿主解构导入），原版未解析名称 0。模块归属来自代码/依赖/实例状态/调用链审查，不按行数均分。

模块化后 153 个运行源码文件、641 条静态导入边、无循环，仅保留 obsidian 宿主依赖。826 段原文映射全部通过 SHA 与源码包含校验；public-contracts.json 记录原公共包装器、能力、命令、视图、事件与类方法签名。

## 生命周期、UI、数据审计路径

生命周期和注册保持在 core/LocalSearchPlugin；onload/onunload 的顺序原文保留。文件与 Workspace 事件、Promise 写队列、DOM 事件、定时器和清理函数的源引用保存在 baseline-audit.json。UI 沿原 SearchCore、Navigator、renderer、facets、createFlow、selection、dropdown、Dialog、SwipeBack/PointerSort 组件拆分，未重画 DOM。状态所有者与读写链详见 ARCHITECTURE.md。

静态扫描不会证明所有分支的资源释放；当前 mock 生命周期验证事件订阅为 0，Chromium 覆盖的会话/弹窗/手势租约也有清理断言。真实宿主的资源/内存情况仍列人工验收。

## 实际命令

```sh
node scripts/audit.mjs
node scripts/dependencies.mjs
npm install --offline --cache /root/.npm --save-dev --save-exact acorn@8.15.0 acorn-walk@8.3.4 typescript@5.8.3 jszip@3.10.1
node scripts/extract-modules.mjs
npm run check
npm run build
node --check dist/main.js
npm test
python3 scripts/browser_ab.py
node scripts/describe-contracts.mjs
node scripts/pack.mjs install
```

最后一条在缺 manifest 时预期退出 2；不是安装通过。npm 联网安装和 esbuild 运行尝试失败，日志另存。提取时每个模块即时做语法与模块编译检查，随后全量链接和 A/B；**没有对 153 个中间切分版本分别做完整 Obsidian 原生回归**。已交付最终工程验证，不把逐模块语法检查冒充全套产品验收。

## 构建结果

真实默认构建生成 1,635,127 字节 main.js，SHA-256 `e87b20d437d7cd55f115d8a003381e86a4ed80ff2bcef9ec43b5b410b8c64887`，153 个模块、1 个宿主 external。二次构建字节一致；styles.css 三份源/目标与基线一致。源码构建后的体积比原版增加约 18.4%，来自模块设施、非压缩转译和可维护注释，不是功能增加；尚未做真实 Obsidian 启动速度基准。

## 自动化范围

Node：98 PASS / 0 FAIL。包括所有顶层类原型合同、符号/默认值、规范化、Markdown/摘要/匹配、虚拟列表独立参考算法、Filter/Query、BodyIndex、IoPool 并发/异常、真实生产 bundle mock 加卸载、8 命令/2 视图/API18、配置队列失败恢复、项目/最近打开/属性写入、LRU、文件互斥、虚拟 provider 世代、非法外部请求、Canvas 原侧车、Dida 订阅及重建一致性。

Chromium：92 PASS / 0 FAIL；当前 20 个连续场景 × 4 种环境，共 80 个 DOM/几何/焦点/状态/文件 A/B；另 12 个测试宿主截图字节对照。桌面 1280×900、移动模拟 390×844，浅/深色各一组。新增 pointer 拖拽与取消、最深 Swipe-Back Owner/纵向手势/原生 input 排除、正式 workbench mount/setScope/destroy。组件来自实际原版/模块版，Obsidian 外围通过测试宿主模拟。

未做行/分支覆盖率统计。多个纯工具用例同时比较正常返回与异常文本，不把测试条数换算为功能覆盖率。浏览器测试使用测试图标和少量宿主 CSS，像素一致不代表真实 Obsidian 外观已人工确认。详见 MANUAL_ACCEPTANCE.md。
