# GLS v5.2 · Navigator 整行命中 v1（候选）

**状态：独立开发候选，未冻结**。唯一正式冻结基线为 2026-10-18「后台摘要与属性计数整合 v1」；所有正式源码和运行包保持只读。

## 根因及最小实现

Navigator 将可见行背景、主选择按钮和尾部计数绘制成不同的兄弟节点。源代码此前只在主按钮上注册点击：因此右侧计数和行内空白没有筛选/折叠动作。只在 `src/features/navigator/SearchNavigatorController.js` 的 Navigator `scroll` 挂一个随控制器清理的 click 委托；对背景/非交互计数区域，将点击转交**同一行现有且启用的主 button**，保留它原有的回调链、模式拦截和状态提交。

## 不可破坏的交互边界

- 直接点击主按钮保持原逻辑；委托不会对按钮二次转发，不产生双重点击。
- 展开箭头仍独立控制展开；桌面组标题管理按钮仍打开管理，不会折叠。
- Navigator 排序/维护模式原有捕获事件 Owner 仍先执行；排序手柄不被代为选择；禁用按钮不被委托触发。
- 分割线、非 Navigator Picker、输入、链接、可编辑区域不接受此委托。
- 未增加全局监听器、定时器、额外状态、CSS、更改插件 ID/设置/数据/API；无透明遮罩或尺寸改动。
- 移动端右滑返回、滚动、输入法、原生 WebKit 性能仍需真实设备验证。

## 重放测试

```
npm run check
npm run build
npm test
node --input-type=module -e "import { prepareSubjects } from './tests/harness.mjs'; prepareSubjects();"
python3 scripts/navigator_row_hit_acceptance.py --source . --output reports/navigator-row-hit/acceptance-replay.json
```

该脚本使用真实构建产物在 Chromium 模拟宿主中执行点击/触屏动作，测试移动/桌面、浅色/深色、文件夹/标签/属性、分组标题、右侧数字、空白区域、展开箭头、管理、排序、维护、禁用行、右键与实际文件夹筛选；不是 iPhone/WebKit 原生验收。

## 与正式基线对照

- 正式基线 Source ZIP SHA-256：`9da2ba7f468f2c1eba04ed5012b2f77f7cf18d6829d14716f1468e3a8d6eb7bb`
- 正式 `main.js` SHA-256：`95cb366f80a51c78e8fba9996bedd6bfc9e3eba1908c5ea62ba97bb81622e07a`
- 原 CSS SHA-256：`d82b51abc8e65e93c760dc88e33c813ca26b8a192b34cf9a7e8b4d417bfaf99b`

只修改正式 `src/` 中一处模块。无需新增目录、兼容层或项目属性模型。
