# modular.4 当前验证记录

本轮失败及修正完整见 FOCUS_REPAIR_MODULAR4.md 和 reports/focus-repair/。全部最终门禁通过，未执行原生设备验收。

---

# modular.3 实际失败与恢复

第一次长测试调用、其后的并行长测试调用因执行时限中止，产生 EPIPE；这些中止不算成功。最终完整运行各项脚本，正常退出码 0，详见 reports/focus/logs 与最终汇总。

第一次新版严格浏览器 A/B 在移动第 04 场景报告 --ui-mobile-keyboard-inset:0px 的 DOM 注解差异。它来自授权删除的“焦点即锁框”链，并非卡片/文本/数据不同。测试只归一该退休的无键盘临时状态注解；同时独立断言新版无键盘不得锁框，所有实际几何、其他 DOM 和焦点/写入继续严比。12 张对应截图比较通过。

WebKit 安装下载 DNS 失败，未运行该引擎。不能拿 Chromium 的成功结果当成原生 iPhone 光标通过。原始日志在 reports/focus/history/webkit-install.log。

以下是原工程历史台账，不是本轮覆盖范围或版本：

---

> 历史记录：此文件描述 modular.1 工程拆分，不是本轮验收结论。modular.2 的实际改动、最终结果和残余风险以 AUDIT_MODULAR2.md 为准。

# 失败、阻碍与修正台账

本文件记录实际遇到的失败；最终通过数不抹去初轮问题。生产源码提取后没有为让测试通过而修改原业务方法体。

## 尚未解除的交付阻碍

**原 manifest.json 缺失。** 本次 ZIP 只有两个运行文件，未使用历史版本补充 ID/version。完整安装打包命令实际退出 2，并明确不生成 ZIP。日志：reports/install-package-blocked.log。当前仅交付双文件覆盖包和完整可构建源码工程。

**esbuild 不可用。** npm 联网解析失败，环境没有预装 esbuild；实际尝试不能算通过。改用锁定的 TypeScript 转译 + 静态 CommonJS 链接器完成真实构建和重建。备用配置保留但未验证。日志：dependency-install.log、dependency-install-offline.log、esbuild-attempt.log。

**原生设备与服务未验证。** 没有进行真实 Obsidian 桌面、iOS、Android、原生输入法、Mac 触控板、真实工作台/Dida 或 NAS 集成验收。MANUAL_ACCEPTANCE.md 给出执行步骤；这些不计入自动化通过项。

## Node 初轮问题（已修正测试宿主/断言）

第一轮 94 项中 69 通过、25 失败，原日志保留为 reports/node-test-initial.log。跨 VM Realm 数组的 map 返回了不同 Realm 的 Array，deepStrictEqual 把结构相同的值判为原型不同；改为 Array.from 后比较统一的宿主快照。短色值的原规则输出大写 #AABBCC，测试先前错误期待小写，修正预期而非修改产品。

测试文件夹 adapter.stat 原先把 mkdir 结果报告为 file；测试文件的属性仅放 metadataCache 而未写入原代码实际读取的 frontmatter；这两项按测试宿主应模拟的合同补齐。属性修改用例先前误用 [key,value]，改为实际的 key/propertyType/isNewKey/addValues 操作对象。生产写入链未改。

扩展为 98 项时两项初轮失败保存在 reports/node-test-expanded-initial.log：直接序列化带 TFile.parent/children 循环的原 metadata 导致测试自身 JSON.stringify 报错；以及 Canvas 文本属性被错误期待成数组。改为检查原 properties，并按原接口的 scalar 返回断言。最终 98 通过、0 失败，见 node-test.log。

## Chromium 初轮问题（已修正测试选择器/平台预期）

原版 A 就出现两类断言错误：桌面 Hover 可访问性逻辑将 aria-label 转为 aria-labelledby，测试不应强制查旧属性；改用原稳定 data-ls-input-action 选择器。移动端原实现不支持桌面 Shift 范围逻辑，移动预期调整为普通逐项选择，桌面仍检查固定 Anchor 扩展与收缩。未调整生产 DOM、Hover、选择逻辑或 CSS。

初始失败日志见 browser-ab-initial.log / browser-ab-initial.json；当时截图和异常快照保存在 investigation/browser-fixture-initial/。此前两次浏览器全套调用被执行调用时限中断，未计作通过；改为让本地验证进程实际运行结束后才取完整报告。最终 20 场景 × 4 环境的 80 个结构/状态对照，以及 12 个截图对照全部通过。

## 方法与工具限制

每个提取模块执行了语法解析和模块转译检查；不是每个中间版本都跑过完整宿主 A/B。最终链接产物执行整体 Node/Chromium 对照。JavaScript 工程没有声称通过完整 TypeScript 类型检查；只检查未解析符号和模块边界。

类方法组组合保留原状态与方法实现，但没有把所有 this 依赖转成强类型接口。静态图不覆盖外部动态调用全集；没有分支覆盖率或真实设备性能基准。修改源码后必须更新相应测试，不能把这些限制当成允许省略必要回归的理由。

## 独立重建启动

独立重建的首次终端调用指定了尚不存在的工作目录，命令未执行；先实际创建并解压目录后，重跑依赖安装、构建、静态检查与 98 项 Node 测试，均通过。这是执行路径问题，不计作产品失败或未执行命令成功。
