"""Generate the review/maintenance indices from this frozen baseline, not a guessed version."""
from pathlib import Path
import json,hashlib,collections
root=Path(__file__).resolve().parent.parent
p=lambda name:root/name
read=lambda name:json.loads(p(name).read_text())
write=lambda name,text:p(name).write_text(text,encoding='utf-8')
audit=read('reports/baseline-audit.json'); index=read('reports/module-index.json'); contract=read('reports/public-contracts.json'); origins=read('reports/source-origins.json'); graph=read('reports/module-graph.json'); build=read('reports/build-info.json'); browser=read('reports/browser-ab-results.json'); checks=read('reports/static-checks.json')
sources=sorted(p('src').rglob('*.js')); stats=[(str(f.relative_to(root)),len(f.read_text().splitlines()),f.stat().st_size)for f in sources]; biggest=sorted(stats,key=lambda x:x[1],reverse=True)
node_log=p('reports/node-test.log').read_text();node_pass=int(node_log.split('# pass ')[-1].splitlines()[0]);node_fail=int(node_log.split('# fail ')[-1].splitlines()[0])
module_summary='\n'.join(f'| `{file}` | {lines:,} | {size:,} |'for file,lines,size in biggest[:8])
base=p('baseline/main.js').read_text(); newline=chr(10)
write('README.md',f'''# GLS Navigator 模块化源码工程 · modular.1

本工程只使用本次 `Archive 2(9).zip` 的代码。源文件标注构建号 **2026-10-15.7**。这是工程修订标识，不是未经确认的插件发行版本。

## 先看交付边界

原附件只有 `main.js`、`styles.css`。**没有 manifest.json，故插件 ID、正式版本、最低 Obsidian 版本、桌面专用标记均无法从原清单确认。** 本工程不补造清单，不借用历史包；本次只能产出双文件覆盖包和完整源码工程包，不能声称完成全新安装包验收。

源码已拆为 **{len(sources)} 个 ES Module JavaScript 文件**。所有生产样式仍在 `src/styles/styles.css`，与原 CSS 逐字节一致。未移植为 TypeScript 业务代码。构建后的 `dist/main.js` 仍直接导出原插件类，唯一运行时外部模块为 `obsidian`。

## 构建

已验证 Node 22.16.0、npm 10.9.2。安装依赖后，纯构建不需要 Python、浏览器或 Obsidian：

```sh
npm ci
npm run build
npm run check
npm test
```

本次实际使用 **TypeScript 5.8.3 转译 JavaScript + 确定性静态 CommonJS 链接器**。这是编译工具链，不是第二套业务引擎。固定版本和依赖锁文件均随包交付。

环境无法连接 npm 且未预装 esbuild，因此 `npm run build:esbuild` 的实际尝试失败。`esbuild.config.mjs` 仅是单独输出到 `dist-esbuild/` 的备用配置，**未执行成功、未被本次交付采纳**；不要把它的产物直接替换本次验证结果。正式构建命令就是上面的 `npm run build`。

## 浏览器回归

```sh
python -m pip install -r requirements-test.txt
python -m playwright install chromium
npm run test:browser
```

`PYTHON` 可指定 Python 路径，`CHROMIUM_PATH` 可指定已安装浏览器。Linux 下自动尝试系统 Chromium，否则使用 Playwright 安装的 Chromium。执行环境使用 Playwright 1.57.0 和 Chromium；两组视口 × 两个主题。

```sh
npm run verify
```

`verify` 是工程验证，不等于原生 Obsidian 上的完整验收。当前 Node **{node_pass} 通过 / {node_fail} 失败**；浏览器 **{browser['passed']} 通过 / {browser['failed']} 失败**，均由工具实际运行。原生 iOS、Android、Obsidian 桌面宿主、真实工作台/Dida/NAS 联动仍需人工验收。

## 打包与覆盖

```sh
npm run pack:overlay
npm run pack:source
```

`pack:overlay` 仅写 `main.js`、`styles.css`。先备份并在测试仓库验证，覆盖到**已安装的这一个原插件目录**，保留真实 `manifest.json`、`data.json` 和全部业务数据。它不是全新安装包，不要重命名插件目录或复制到另一个插件下面。

完整安装包入口明确拒绝猜测清单：

```sh
npm run pack:install -- --manifest /path/to/exact-original/manifest.json
```

没有这个原文件时退出码为 2，不生成安装 ZIP。补充清单后的身份一致性及真实宿主加载仍需另外验收；现有脚本不会覆盖任何现存仓库。

## 维护入口

先读 `AGENTS.md` 和 `docs/ARCHITECTURE.md`，再查 `docs/MODULE_INDEX.md`、`docs/METHOD_INDEX.md`。常见问题直接进入对应职责模块，不读生成的 `dist/main.js` 作为修改起点。

`baseline/` 是只读 A/B 对照；`tests/host.js`、`tests/browser-fixture.css` 是测试宿主，绝不进入运行包。`scripts/extract-modules.mjs` 是本次一次性提取工具，不是正常构建步骤；之后重跑会覆盖源码维护成果，禁止随意重跑。

## 文档导航

架构与状态所有权见 `docs/ARCHITECTURE.md`；逐模块输入/输出/依赖见 `docs/MODULE_INDEX.md`；全部类方法位置与 this 调用见 `docs/METHOD_INDEX.md`；公开协议见 `docs/PUBLIC_API.md`；审计与实际命令见 `docs/AUDIT.md`、`docs/DELIVERY_REPORT.md`；未验证项见 `docs/MANUAL_ACCEPTANCE.md`；失败和纠正记录见 `docs/VALIDATION_ISSUES.md`。
''')
write('AGENTS.md','''# 后续 AI 开发规则

## 唯一维护源

编辑 `src/`，不要编辑 `dist/main.js`、`baseline/` 或覆盖包里的 main.js。先读 `docs/ARCHITECTURE.md`，按功能定位 `docs/MODULE_INDEX.md`；涉及跨方法调用时读 `docs/METHOD_INDEX.md`。不得从另一个历史版本回填代码。

## 读取范围

从目标模块、构造器状态定义、直接输入/输出依赖及对应测试开始。纯工具问题只需工具与调用点；涉及状态切换、异步写入、跨 Picker 或卸载的问题必须向调用链、状态 Owner 和清理路径扩读。节省上下文不能成为忽略依赖的理由。不要无意义读取整个聚合 main.js。

## 冻结约束

未经本次具体需求授权，不改 DOM、CSS 类、样式 token、设置默认值、顺序语义、存储结构、Plugin ID、命令 ID、ViewType、公开 API/事件、手势和焦点路径。保留原本存在的历史处理，不新增旧/新业务双轨。动态方法没有静态调用证据也不能删除。

## 模块边界

同一职责一个正式实现。`LocalSearchPlugin` / `SearchCore` 仍是原状态 Owner。方法组通过 `composeClassMethods` 安装原方法描述符，不创建新实例状态，不使用任意全局服务定位器，不加转发包装器。新增/移动方法必须保持方法表、模块依赖和 `docs/METHOD_INDEX.md` 同步。含 `super`、私有字段、静态语义的方法留在原生类中，不放进普通方法组。

对外接口只能经 `src/integrations/public-contract.js` 和插件的公开入口消费；内部方法依赖先查构造器和方法索引。不要把导出的内部函数擅自升级为另一个公开产品协议。

## 开发与验证

先写能复现需求的测试，再改源码。运行受影响测试、`npm run check`、`npm run build`、`npm test`；凡涉及界面/输入/选择/弹窗/交互，再运行 `npm run test:browser`。最后对生成 ZIP 做 CRC 和内部文件校验。

静态片段对照针对本次“零行为改动”提取。当未来需求确实允许行为变化时，必须明确记录授权范围并定向更新对应黄金片段/测试；不能为了让测试变绿而删除整个审计门。纯 refactor 应继续保持 826 个原片段一致。

测试宿主不是 Obsidian。报告要分别列静态、Node、Chromium、原生桌面、iOS、Android及真实集成的覆盖程度；未跑的就是未验证。不要写“100% 一致”。保留初轮失败及修正原因。

## 构建与交付

默认使用锁定的离线可用构建链 `npm ci && npm run build`。esbuild 备用配置本次未验证；换编译器本身就是一项需要重新跑 A/B 的工程变更。源码包和运行包要来自同一次真实构建。不得把 fixture manifest 当正式 manifest，不得打包用户的 `data.json` 或业务数据。

`extract-modules.mjs` 只用于复核本次最初提取过程，不要把它接进 build、test 或日常维护。它会从冻结原版重新生成源码。
''')
write('ARCHITECTURE.md','# 架构入口\n\n完整架构、状态所有权和修改路由见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。\n')
write('docs/ARCHITECTURE.md',f'''# 架构与维护地图

## 范围

本次是职责拆分，未改变数据架构或产品 UI。`src/main.js` 仅导出生命周期类；`src/core/LocalSearchPlugin.js` 保留构造/加载/卸载和依赖初始化；插件业务分别归入 `features/plugin/`。原 `SearchCore` 大类按会话、输入、搜索排序、文件操作、结果事件、界面挂载拆分。

运行源码 **{len(sources)} 文件**，静态依赖 **{checks['importEdges']} 条**，循环依赖 **0**。入口外的 152 个模块列于 `MODULE_INDEX.md`，入口同时列为独立条目。完整、由实际 import 生成的图在 `dependencies.mmd`、`dependencies.dot` 和 `../reports/module-graph.json`。图描述静态导入；`this` 动态调用另见方法索引，不能据此宣称外部动态调用不存在。

## 结构与职责

```text
src/main.js                 对 Obsidian 导出原插件类
src/core/                   生命周期、SearchCore、共享会话与方法组合
src/data/                   文件格式、标签/属性/目录模型、正文索引、时间规则
src/services/               原批量元数据写入、文件事务和 I/O 并发池
src/features/plugin/        索引、持久化、时间、项目目录、公开接口、命令与偏好
src/features/create/        创建草稿、输入模式、预览、模板载荷与提交
src/features/facets/        标签/目录/属性/类型 Picker 与维护操作
src/features/result-controls/ 搜索操作、过滤池、视图编辑和历史
src/features/results/       卡片、频道、摘要、虚拟窗口与滚动锚点
src/features/selection/     多选、Shift 范围、批量互斥与选择栏
src/features/navigator/     原侧栏导航、自定义和工具栏配置
src/features/filters|search|sort/ 查询、筛选与排序模型/控制器
src/ui/                     原组件、Dialog、Picker、窗口宿主、设置和视图
src/interactions/           原 Hover、Swipe-Back、卡片侧滑、拖拽和滚动
src/integrations/           公开版本/能力与 Workspace 能力层
src/utils/                  无业务状态的字符串、路径、DOM、匹配工具
src/styles/styles.css       唯一生产样式源，原 CSS 全量保留
```

没有空目录占位，没有为了行数平均切段。大型职责如属性 Picker、Navigator、视图编辑仍允许保持同一个完整模块，不为了做小而拆散一个交互事务。

## 原类如何拆开

原代码的 36 个顶层类仍存在；另有函数内部的 `SearchModalHost` 类保留在宿主工厂中。混合大类拆为单一职责的“方法组对象”。`core/compose-class-methods.js` 只完成类定义阶段的描述符组装：不增加调用转发、不保存第二份状态、不改对象原型链，并拒绝重复/缺失方法。方法名称、参数数量、getter/setter、可枚举性及原始键顺序已与原版对照。需要 `super` 的方法留在原生类。

这是显式方法组合，不是旧/新实现兼容层。但它保留了原大类的 `this` 协作约定，因此不是把原状态架构改成完全独立的小服务。未来 AI 维护方法组仍需读取对应构造器和直接 `this` 调用接口。这样的边界是本次避免行为重写的取舍。

## 状态唯一所有权与写入链

| 状态 / 资源 | 原 Owner 与现在的位置 | 输入 / 输出及约束 |
|---|---|---|
| 设置、索引、文件内容缓存、侧车状态 | `LocalSearchPlugin`；`features/plugin/*` | 从 Vault、loadData 和原元数据目录读取；仍走原串行 Promise 写队列，不另建数据库 |
| 元数据正式写入 | `services/BatchMetadataService.js`、`FileOperationService.js` | 接收文件/路径和变更草稿；返回原统计/操作结果；失败和部分成功语义保留 |
| 当前搜索、条件、结果、草稿 | `SearchCore` 及其原控制器 | 输入事件/外部请求进入同一会话；结果和 UI 由原 renderer 更新 |
| 多选和批量互斥 | `SearchSelectionController` | 原 selectedPaths、anchorPath、shiftBasePaths、mutationState，不新增另一套选择集 |
| 虚拟列表 | `SearchResultRendererController`、`SparseHeightIndex` | 原高度估计、窗口/锚点/读取池，DOM 卡片仍只有原一套 |
| Picker 与 Dialog | `SearchDropdownController`、dialog-session | 父子层栈和确认事务租约不改；返回、Esc、焦点恢复走原路径 |
| 手势与 Hover 跨插件协调 | `interactions/swipe-back.js`、hover-hints | 保留原 `Symbol.for` 共享协调机制与释放合同；没有为模块化新增任意全局业务变量 |
| 项目目录 | GLS 索引 + 原 Dida 项目目录只读集成 | 原合并和通知规则保留；工作台不产生新的权威索引 |
| 虚拟属性 | 原 provider 注册表 / 投影缓存 | 只读投影，不写入原 YAML / 持久索引；陈旧句柄不得移除新 provider |
| 外部嵌入会话 | `mountExternalSearch` 原 handle | ready/active/busy/captureSession/setScope/dismissTop/destroy 保留；更新 scope 不更换搜索 input 节点 |

Markdown 的原 frontmatter 和时间写入、Canvas/图片等原 JSON 侧车、元数据目录默认 `GLS-元数据`、最近打开历史、原有迁移判断全部保留。这里的“保留”有片段对照和覆盖场景测试支持，不代表真实 NAS 并发已经实测。

## 常见修改路由

| 需求 | 首读 | 必要依赖 / 测试 |
|---|---|---|
| 搜索输入、橡皮擦、清条件、未命中创建 | core/search/input-and-filters-methods、result-controls/toolbar-methods、create/input-mode-methods | SearchCore / FilterState；browser 02–07、15–16 |
| 重命名/删除位置、焦点、返回 | ui/dialogs/*、core/search/file-actions-methods | FileOperationService、swipe-back；browser 10–14、19 |
| 属性/标签/目录 Picker | features/facets 对应模块、ui/pickers 对应 Primitive | dropdown、batch/property-editor；browser 04–06 + 新增专项 |
| 多选/Shift/批量 | features/selection/SearchSelectionController | result-menu-events；browser 08–09 |
| 虚拟列表、摘要、滚动 | features/results 对应模块 | SparseHeightIndex、IoPool；独立前缀和参考测试 + UI 回归 |
| 时间/NAS/非 Markdown 属性 | features/plugin/time-cache、non-markdown-metadata、markdown-write-tracking | metadata-directory、data/time；Node 非 Markdown/属性/持久化测试，另需真实 NAS 验收 |
| 工作台接入 | integrations/public-contract、features/plugin/external-search、external-properties、project-catalog | Node provider/Dida/API 验证，browser 20 |
| 图标/布局/样式 | 原对应组件 + src/styles/styles.css | 不新增第二份样式源；修改受授权时补主题/视口回归 |

## 当前最大模块

| 文件 | 行数 | 字节 |
|---|---:|---:|
{module_summary}

## 构建及影响范围

正常构建只读 `src/` 和固定的依赖，生成一个 CommonJS `dist/main.js`，复制原样式。没有运行时 Node 内置模块；host `obsidian` 由宿主提供。`build.mjs` 的模块缓存只是模块加载设施，不是业务状态源。

基线到源码的映射见 `reports/source-origins.json`：**826 / 826** 个声明/方法片段保留原文。脚本或 bundler 自身变更会影响所有运行代码，必须全局回归；普通功能修改可先局部测试，但发布前仍需构建、全体 Node 测试及相关 UI 回归。

## 已知结构取舍

无强制 TypeScript 业务迁移；当前检查覆盖语法、模块/导出解析、未解析符号和片段一致性，不是完整类型证明。打包会改变函数源码字符串、堆栈文件行号和模块求值组织；未承诺 `Function.toString()` 或所有动态反射文本与原聚合文件一样。不要凭静态图删除动态 API。真实设备的加载性能和内存峰值尚未做基准测试。
''')
# Module catalogue with concrete inputs/outputs, dependencies, original excerpts and affected tests.
sections=['# 逐模块索引\n\n这是职责导航，不需要每次全读。源码只维护 src；状态方法的输入包括同名原实例的 this。所有方法原参数和直接 this 调用见 METHOD_INDEX.md。\n', '## `src/main.js`\n\n输入：core/LocalSearchPlugin；输出：default 原插件类。无额外业务状态。测试：生产 bundle 加载/卸载。\n']
for m in sorted(index,key=lambda x:x['file']):
 file=m['file']; ex=', '.join('`'+x+'`' for x in m['exports']);dep=', '.join('`'+x+'`'for x in m['dependencies']) or '无'; state='方法组使用原类实例 this，状态定义见对应类构造器。'if file.endswith('-methods.js') else ('类实例自有状态；请按方法索引确认具体字段。'if any(c['name']in m['exports']for c in contract['classes']) else '导出模型/工具/组件；未建立新的业务状态库。')
 loc='；'.join(f"{o['id']}（原 L{o['lineRange'][0]}–{o['lineRange'][1]}）"for o in m['origins']) or '本次工程设施（不替代原业务实现）'
 tests='tests/regression.test.mjs + tests/browser-scenarios.js'if any(s in file for s in ['ui/','interactions/','core/','features/']) else 'tests/regression.test.mjs；涉及 UI 的调用者另跑 browser-scenarios'
 sections.append(f"## `{file}`\n\n规模：{m['lines']} 行 / {m['bytes']} 字节。\n\n输出/所有者：{ex}。\n\n直接输入依赖：{dep}。\n\n状态：{state}\n\n源位置：{loc}。\n\n回归入口：{tests}。具体覆盖只以测试断言为准；不是每个导出都已得到动态调用覆盖。\n")
write('docs/MODULE_INDEX.md','\n'.join(sections))
sections=['# 类方法索引与实例调用\n\n包含 36 个顶层类和工厂内的 SearchModalHost；全保留，没有根据“未使用”做删除。直接 this 调用是语法扫描结果；通过 this.owner / this.plugin 的跨实例链仍须读取对应构造器和依赖模块。\n']
for c in contract['classes']:
 sections.append(f"## {c['name']}"+(f" extends {c['extends']}"if c['extends']else '')+'\n')
 for m in c['methods']:
  calls=', '.join('`'+s+'`'for s in m['directThisCalls']) or '无直接 this.method 调用';state=', '.join('`'+s+'`'for s in m['instanceReadsAndWrites']) or '无直接 this 字段引用'
  sections.append(f"### `{m['signature']}`\n\n归属：`{m['module']}`；原始行 L{m['line']}；种类 {m['kind']}；static={m['static']}。\n\n调用：{calls}。\n\n实例依赖：{state}。\n")
write('docs/METHOD_INDEX.md','\n'.join(sections))
api='\n\n'.join(f"### `{x['name']}`\n\n原始 L{x['line']}，入口表达式逐字保留：\n\n```js\n{x['definition']}\n```"for x in contract['publicApi'])
commands='\n'.join(f"- `{x['fields']['id']}` — {x['fields']['name']}"for x in contract['commands'])
write('docs/PUBLIC_API.md',f'''# 外部接口冻结清单

## 身份边界

插件 ID 与发行版本：**manifest 未提供，无法确认**。不以代码中的回退字符串猜测原安装目录。`module.exports` 仍为同名 `LocalSearchPlugin` 类；这是入口形态，不是插件 ID。

`externalSearchApiVersion = 18`。`externalSearchApi` 的 19 个键（含 version/capabilities 和 17 个方法）保持原定义。以下代码摘录和参数默认值直接取自本次原版构造器，不从历史文档推断。

{api}

## 返回和生命周期合同

open 保留原布尔成功/拒绝语义。mount 对非法或已卸载宿主保留拒绝行为；成功返回冻结 handle，其 ready 是初始化 Promise；active/busy 是实时 getter，另有 captureSession、setScope、dismissTop、destroy。captureSession 是脱离实例的 UI 快照，不是外部权威数据副本。

registerVirtualProperties 返回 invalidate/dispose 句柄或 null；同 id 替换后旧句柄不会误删新 provider。订阅接口返回原取消函数。getFileProperties 返回深拷贝属性或 null；getPropertyCatalog 返回原 key/propertyType/values 条目数组。listProjects 保留冻结的 name/paths/createdAt 目录。getProjectOwnerMigration 仍保留就绪前 null 和原迁移读取语义，不因本次重构删除。

patchProperties 接收 {{paths, properties, addTags, removeTags}}；properties 中每项是 {{key, propertyType, isNewKey, removeValues, addValues}}，**不是 [key,value] 二元组**。原返回统计和错误语义不变。非 Markdown 属性写入原侧车，不覆写 Canvas 内容。

其他字段/返回以入口目标实现为准。不是所有返回分支都在当前测试中触发；本次保留全部原方法体及描述符来避免删掉动态分支。

## 命令 ID

{commands}

## ViewType

`local-search-sidebar`、`local-search-tab`。两者仍复用原 SearchView；底层 SearchCore 与其他宿主共享原控制器。

## 事件与动态外部依赖

固定公开就绪事件为 `gls:external-api-ready`；Dida 就绪监听为 `dida:workbench-api-ready`。原版还处理 active-leaf-change、changed、create、css-change、delete、file-menu、file-open、files-menu、modify、rename。完整原始调用及行号在 `reports/public-contracts.json`、`reports/baseline-audit.json`。Dida owner 仍由原 `dida-bridge` 入口获取；本次不改另一个插件的实现。

能力键：{', '.join('`'+s+'`'for s in contract['capabilities'])}。

## 动态方法保留

`LocalSearchPlugin` 的 189 个原方法/构造器条目全部留存；其他类也没有按调用次数做删除。`METHOD_INDEX.md` 提供全部位置，Node 对比 36 个顶层类的原型名称、参数数量、描述符、键顺序和静态成员。工厂内部类随原函数原文保留，未单独以顶层导出加载。
''')
# Full static dependency graphs, not an illustrative made-up architecture picture.
files=sorted(graph);ids={f:'m'+str(i)for i,f in enumerate(files)}
write('docs/dependencies.mmd','flowchart LR\n'+''.join(f'  {ids[f]}["{f}"]\n'for f in files)+''.join(f'  {ids[f]} --> {ids[t]}\n'for f in files for t in graph[f] if t in ids))
write('docs/dependencies.dot','digraph GLS {\n  rankdir=LR;\n'+''.join(f'  "{f}" -> "{t}";\n'for f in files for t in graph[f])+ '}\n')
write('CHANGELOG.md','''# 变更记录

## 2026-10-15.7 · 工程修订 modular.1

仅以本次双文件附件为基线，153 个 JavaScript ESM 运行源码文件替代聚合文件维护方式。新增可复现的静态构建、依赖/片段校验、A/B 测试、真实 Chromium DOM/几何/焦点/数据及像素对照、ZIP 校验和 AI 架构索引。拆分大型混合类但保留同一实例状态和原方法描述符。CSS 与基线逐字节一致。

未改产品功能，未补造 manifest，未改变发行版本或插件 ID。默认编译器受环境限制采用已验证的 TypeScript 转译 + CommonJS 链接；备用 esbuild 没有验证。本次没有完整原生宿主或真实设备验收。
''')
write('docs/AUDIT.md',f'''# 基线审计与执行记录

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

真实默认构建生成 {build['bytes']:,} 字节 main.js，SHA-256 `{build['sha256']}`，153 个模块、1 个宿主 external。二次构建字节一致；styles.css 三份源/目标与基线一致。源码构建后的体积比原版增加约 {(build['bytes']/1380818-1)*100:.1f}%，来自模块设施、非压缩转译和可维护注释，不是功能增加；尚未做真实 Obsidian 启动速度基准。

## 自动化范围

Node：{node_pass} PASS / {node_fail} FAIL。包括所有顶层类原型合同、符号/默认值、规范化、Markdown/摘要/匹配、虚拟列表独立参考算法、Filter/Query、BodyIndex、IoPool 并发/异常、真实生产 bundle mock 加卸载、8 命令/2 视图/API18、配置队列失败恢复、项目/最近打开/属性写入、LRU、文件互斥、虚拟 provider 世代、非法外部请求、Canvas 原侧车、Dida 订阅及重建一致性。

Chromium：{browser['passed']} PASS / {browser['failed']} FAIL；当前 20 个连续场景 × 4 种环境，共 80 个 DOM/几何/焦点/状态/文件 A/B；另 12 个测试宿主截图字节对照。桌面 1280×900、移动模拟 390×844，浅/深色各一组。新增 pointer 拖拽与取消、最深 Swipe-Back Owner/纵向手势/原生 input 排除、正式 workbench mount/setScope/destroy。组件来自实际原版/模块版，Obsidian 外围通过测试宿主模拟。

未做行/分支覆盖率统计。多个纯工具用例同时比较正常返回与异常文本，不把测试条数换算为功能覆盖率。浏览器测试使用测试图标和少量宿主 CSS，像素一致不代表真实 Obsidian 外观已人工确认。详见 MANUAL_ACCEPTANCE.md。
''')
print('Generated README, AGENTS, architecture, full module/method/API indices, graphs, changelog and audit.')
