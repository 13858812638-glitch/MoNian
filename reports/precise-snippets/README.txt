GLS v5.2 后台摘要精准刷新 v1 · Chromium mock Obsidian 实测复跑
依赖 Playwright Python 与 /usr/bin/chromium 或调整脚本 executable_path。
示例（完整 Source 解压根目录）：python3 reports/precise-snippets/snippet_precision_probe.py --root . --count 300
离屏更改基线与候选的原始 JSON 用相同脚本分别执行。iOS 真机未验收。
