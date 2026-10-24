# 最新源码与运行文件交付 · 2026-10-25

代码基线：`76f83bb974be6eeaa5578ab04cfbcc879fbe8e87`，本次没有产品代码修改。

包：`downloads/GLS-Latest-Source-and-Runtime-20261025.zip`（10,728,778 字节，约 10.2 MiB）。

- `Source/`：当前完整源码、dist、构建配置、锁文件、测试、文档、审计记录及只读 baseline。
- `Runtime/`：可覆盖现有插件的 `main.js`、`styles.css`。
- 根 README：构建及使用说明；CHECKSUMS.json：逐文件 SHA256。
- 不含历史 downloads 交付包、Git 元数据、node_modules、用户 data.json；原真实 manifest 缺失，不伪造。

重新构建与上一轮运行包字节一致。ZIP 共 1203 项，CRC 及逐项字节校验通过。另从 ZIP 解压到独立目录，正常 `npm ci` 安装 16 个锁定依赖后 `npm run build` 成功，两项产物均与 Runtime 字节一致。首次离线安装因 npm 缓存缺失失败，已保留日志；正常安装重试成功。

SHA256：`8ddcd480f368a8427720f00feb25466c27b8b2cafc73b2f958e5bccb5444eabe`。

本次为打包验证，不重复宣称上一轮测试全部通过。历史测试失败与原生环境边界见 RESULT_SCROLL_OWNER_20261024.md。
