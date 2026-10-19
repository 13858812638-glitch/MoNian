# GLS v5.2 · P1「索引缓存分片序列化 v1」候选验收报告

> **状态：开发测试候选（NOT FORMAL）。** 本候选未得到用户实机验收与晋级授权；唯一正式冻结基线仍是 GLS v5.2「同词无变化通知收口 v1」（正式 Source ZIP SHA256 `eeef86b7ff5a50ff97807f60627d852be53635b727f2bb856a57a2c2651dfd2d`）。正式包原样只读；全部工作在独立副本 `src/` 中完成。

## 1. 任务及冻结范围

本轮仅解决 `index-cache.json` 在大仓库下的主线程全量同步 `JSON.stringify` 长任务，**不新增功能、不改变产品 UI、CSS、iOS 聚焦或键盘、筛选/Picker/滚动、Swipe-Back、数据字段、缓存路径、索引恢复规则、文件时间/NAS 规则、外部公开 API、插件 ID 或用户设置**。运行时仅变更以下三个源文件：

- `src/features/plugin/index-storage-methods.js`：提取一处元数据 JSON 字段投影，小快照维持原生同步序列化；大快照逐批 JSON 编码，约 6ms 预算/128 项，保留原 JSON 文件格式、字段顺序、属性遗漏语义和整数键顺序。未来若 `BodyIndex.serialize()` 扩展结构则自动退回原生序列化，不遗漏新字段。
- `src/features/plugin/content-cache-methods.js`：新延迟保存请求取消旧的在途编码；若旧回调在等待索引 build/flush，恢复时会检查是否已被后继请求覆盖，防止重复写入。
- `src/core/LocalSearchPlugin.js`：仅增加一个临时内存代际数字 `_indexCacheSaveGeneration`，**不是第二套索引 Owner，不落盘、不新增 timer/Observer/监听器**。

当前 `index-cache.json` 仍保存在原插件目录，索引保存用原有 `_persistWriteChain` 串行，卸载、过期和目录迁移等退出条件保持；无新增本地存储文件。没有修改 `BodyIndex.js`、结果卡、Navigator、设置、HTML、CSS 或工作台接口。

## 2. 性能证据（运行正式构建产物，合成数据）

基线和候选分别在 Node.js 22.16.0 / Linux VM 模拟宿主下调用**真实编译版** `LocalSearchPlugin.prototype.saveIndexCache()`；2,000、10,000、30,000 个 Meta+正文索引条目，7 次采样，前有预热，模拟写盘为内存适配器。**无真实磁盘、NAS、Obsidian、WebKit 或 iPhone 测量**。2ms 心跳定时器延迟的 P95 仅是主线程阻塞的近似指标，受调度与 GC 影响，不能等同实际 UI 帧耗时。

| 文件数 | 最终 JSON | 首次同步返回（中位） | 定时器延迟 P95 | 延迟变化 | 整次保存总时长（中位） |
|---:|---:|---:|---:|---:|---:|
| 2,000 | 3.44 MB | 15.4 → 4.9 ms | 24.0 → 16.0 ms | 33.4% | 16.7 → 20.4 ms (+22.0%) |
| 10,000 | 17.22 MB | 74.4 → 8.7 ms | 91.5 → 22.1 ms | 75.8% | 82.0 → 99.9 ms (+21.9%) |
| 30,000 | 51.77 MB | 238.7 → 21.7 ms | 276.7 → 40.5 ms | 85.4% | 261.8 → 294.4 ms (+12.5%) |

**解释**：30,000 条数据场景下，定时器延迟 P95 从 276.7ms 降到 40.5ms，降低 85.4%；同步首段从 238.7ms 降到 21.7ms。以更多任务切换换取更少长阻塞，完整保存耗时反而增加约 12.5%。**未声称总体 CPU 更快、写盘 I/O 更快，或真实设备必定改善同样幅度。**

### 字节级持久化兼容性

- 对冻结编译版 `main.js`（SHA256 `59ecad0a0c474e51ece84443f92f314976676fe455d0db4709092c97be7b1df6`）按固定 fixture 生成原始 JSON SHA256；候选版对 0、1、10、500、1000、2000 和 4096 行相同输入的保存文件，**7/7 与原版逐字节哈希完全一致**。
- Fixture 覆盖中文、emoji、转义字符、整数对象键、`__proto__` 数据键、特殊路径、缺失元数据字段、正常长文档。
- 另外覆盖正在保存时二次提交、延迟保存覆盖、卸载取消、排队写入顺序、适配器失败后恢复，以及未来 `indexData` 字段扩展回退。
- 固定数据的 JSON 字节数在新旧两版均完全一致：2,000条=3,439,374字节, 10,000条=17,218,908字节, 30,000条=51,767,743字节。

## 3. 验收矩阵与边界

| 检查 | 本候选结果 |
|---|---|
| 静态源码依赖与维护清单 | PASS，146 JS 模块、635 依赖边，0 环/未解析；仅 3 个业务源码模块有差异 |
| 重建产物 | PASS（候选 `main.js` SHA256 `7cb0e124475745f902ab8b4388193a09634bb5896068e1db19489340e8662093`）；构建 CSS 与正式版逐字节一致 |
| Node 测试（含新增 14 项） | **152/152 PASS** |
| 索引失败与有界重试 | **7/7 PASS** |
| Navigator 布局浏览 Chromium | **76/76 PASS**（此前 P1 编译版，UI 源码后续未改变） |
| 移动侧边栏 Chromium | **96/96 PASS**（最终构建的测试日志） |
| Picker 光标模拟 Chromium | **36/36 PASS**（最终构建的测试日志） |
| Portal 触控/层级 Chromium | **48/48 PASS**（最终构建，指定 Chromium-only） |
| Focus light 模拟 | 候选 **28/28 PASS**，最初候选，后续仅改变索引防抖回调 |
| 搜索条件 mobile-light | 结果 JSON 记录候选 **36/36 PASS、0 errors**；宿主命令整体在收尾阶段超时，**未记为完整脚本退出成功** |
| WebKit 真正执行 | **未完成**：当前环境缺 Playwright WebKit 浏览器执行文件；Chromium 模拟不代替 iOS |
| Obsidian/iPhone 与大 NAS 仓库 | **未做真实设备验收**，用户此前主观反馈现行正式版稳定，不作为本候选的真实设备测量 |

说明：曾尝试直接执行包含 Chromium + WebKit 的 Portal 全套脚本，因为 WebKit 可执行文件缺失而报环境错误；随后用官方脚本提供的 `PORTAL_AUDIT_ENGINES=chromium` 参数进行了完整 Chromium 路径 48/48。此环境错误不是 GLS 插件功能失败。

## 4. 工程交付与文件所有权

- 运行覆盖包只有 `main.js` + `styles.css`。**绝对不要覆盖用户原有 `manifest.json`、`data.json`、GLS 元数据/NAS 文件或 Obsidian 笔记。**
- 正式研发入口是本候选完整 Source 的 `src/`；不是直接编辑构建好的 main.js。
- CSS 哈希 `dfb2878bd18d2104caf50b8395142ed43afd808db03d13a5415be4c08a2ba2a6`，与正式版相同；新主代码大小 1,665,367 bytes，较正式版 +4,110 bytes。
- `docs/APPROVED_CHANGES.json` 更新了本候选的 3 个修改审计范围；旧冻结材料、报告与基线代码未修改。
- 没有改变正式冻结声明。候选的生成和测试不构成自动晋级。

## 5. 剩余风险、下一步与回退

1. 分片让出主线程会增加总保存完成的墙钟时间；如真实 iPhone 大仓库后台频繁更新，需观察保存是否拖延、卸载后缓存恢复是否正常。
2. 大缓存仍需短暂持有完整 JSON 字符串，内存峰值/GC 和 30k 文件条件下 iOS 内存压力**未做真实设备验证**；本轮没有引入压缩、分库或缓存格式升级，避免兼容风险。
3. 快照中 Meta 的字段引用在编码期间依赖现有索引更新机制；一旦新 throttle 执行代际会失效并停止过期编码。真实同步场景仍需以未过滤的文件变化/重试场景观察。
4. 推荐对真实库执行 1k/10k/30k 档次的保存耗时与交互延迟对照，在确认无回归后**由用户明确授权**才可升级唯一正式基线。
5. 回退仅需恢复正式版原始 `main.js` + `styles.css`；缓存文件格式不变，不需要迁移或清空用户数据。

## 6. 复跑命令

在候选 Source 目录（先准备 Node 22 及 `npm ci` 的工程依赖）运行：

```bash
npm run check
npm run build
npm test
npm run test:index-retry
npm run test:navigation-browse
CHROMIUM_PATH=/usr/bin/chromium npm run test:mobile-sidebar
CHROMIUM_PATH=/usr/bin/chromium npm run test:picker-caret
CHROMIUM_PATH=/usr/bin/chromium PORTAL_AUDIT_ENGINES=chromium npm run test:picker-portal
```

若需重跑本轮性能数据，将 `bench-comparative.mjs` 放在候选 Source 同级目录，运行：

```bash
node --expose-gc bench-comparative.mjs candidate
GLS_FORMAL_SOURCE_DIR=/path/to/frozen/formal/Source node --expose-gc bench-comparative.mjs formal
```

各脚本的输出是**测量证据**，不是移动端性能担保。对 `CHECK`、`BUILD`、`TEST` 的最终日志均放入证据包；旧的正式 Source 仍由上述 SHA 锁定。
