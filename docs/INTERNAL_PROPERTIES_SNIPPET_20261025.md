# 原生笔记内部属性 · 独立 CSS 片段 · 2026-10-25

基线 `adb3a0a3077e045a57f38145e9f766a404258a19`，其生产代码与刚交付的最新源码包相同。本次没有 JS 变更，仅迁移原生笔记属性展示规则。

## 原因及职责

此前 `src/styles/styles.css` 隐藏六个 GLS 管理字段，并通过 Style Settings 的 `ls-show-internal-time-properties` 控制。插件样式尚未加载时，规则尚不存在，因此早于插件打开的笔记可能先显示内部字段。这是加载依赖问题，不能靠增加 observer 或插件启动后再补 class 消除。

现由 `snippets/GLS-Hide-Internal-Properties.css` 单独负责显隐：Obsidian 加载已启用的 CSS 片段即可生效，不依赖 GLS 或 Style Settings。启用即隐藏，停用即显示。插件 CSS 删除对应规则和开关，不额外添加 JS、监听、刷新、计时器或新状态。旧 Style Settings 保存值不再有 CSS 消费者；不擅自修改其他插件配置。

选择器仅针对 Markdown 叶片中的原生属性行，并精确匹配 `GLS_MANAGED_TIME_KEYS` 的六个键：

- gls_created_at
- gls_created_source
- gls_body_modified_at
- gls_body_fingerprint
- gls_file_modified_at
- gls_file_fingerprint

普通属性、全局属性侧栏、GLS 搜索组件与 YAML 数据保持原状。读写时间/指纹逻辑、搜索索引、桌面/移动 DOM、焦点和手势都没有变化。片段没有 @settings 根节点或参数，不引入另一套设置层级。

## 安装

1. 从合集 `Snippets/` 取 `GLS-Hide-Internal-Properties.css`，放到当前仓库配置目录的 `snippets/`，通常是 `.obsidian/snippets/`。也可用“设置 → 外观 → CSS 代码片段”的文件夹按钮定位；自定义配置目录以该按钮为准。
2. 在“设置 → 外观 → CSS 代码片段”刷新列表并启用该片段。桌面和手机都需确认片段文件存在且已启用。
3. 退出 Obsidian，用合集 `Runtime/` 的 `main.js`、`styles.css` 更新现有插件（main.js 与上一版一致），保留原 manifest.json 和 data.json，再打开。

必须更新插件 styles.css，才能移除原插件规则与设置开关，实现单一控制源。只复制片段而保留旧插件 CSS 会留下两份规则。

需要临时查看内部字段时停用片段，或切换源码模式查看 YAML。无需等待 GLS 启动；Obsidian 自身何时加载用户片段仍由宿主负责，不承诺第三方主题/片段冲突或所有原生设备的绝对首帧时序。

## 验证范围

`scripts/internal_property_snippet_audit.py` 使用受控原生笔记 DOM，覆盖桌面/移动尺寸、亮/暗主题，不运行 GLS JS。检查插件样式加载前、加载后、卸载后、旧 class 存在、新笔记创建及片段停用的表现。源码模式、普通属性、属性侧栏和搜索区域作为不应被隐藏的对照。

初次测试夹具向 Playwright 传入空 CSS 被拒绝，已用无规则注释表示“尚未安装片段”，修正后在修改源码前完成基线对照；原错误日志保留。

详细结果位于 `reports/internal-property-snippet-20261025/`。原生 Obsidian 启动、真实 iOS/Android、第三方主题及用户其他片段未实测。上一轮运行行为回归不能替代这些原生验证。

## 本轮结果

- 片段专项 34/34 通过；修改前同一脚本 12/34，22 项未达到独立片段合同。
- 工程检查和标准构建通过：153 个 JS 模块、666 条依赖。main.js 与上一版逐字节一致。
- 搜索条件验收 144/144；全量 Node 268/272，4 项为已有冻结 ABI 比较失败。
- 旧浏览器快照四种配置仍在 01-initial 失败，不声称该门禁后续 B 场景已执行。
- 插件全源 JS/CSS 静态审计通过；新片段独立解析确认只有一条规则和一个 display:none 声明，未新增 Style Settings。

## 交付包

`downloads/GLS-Property-Snippet-Source-and-Runtime-20261025.zip` 包含 Snippets、Runtime 和完整 Source，共 1229 项。CRC 与全部文件字节校验通过；解压后独立安装锁定依赖并构建，两项运行产物与交付内容一致。

SHA256：`12a2b2467e92b39db7b1d1100589d6d320ffb8addcd6fb5de91498787e0160ba`。
