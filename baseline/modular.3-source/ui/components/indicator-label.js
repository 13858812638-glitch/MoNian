// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { isDomHTMLElement } from "../../utils/dom.js";


// Dida Master v1.1.0：文字型 Applied / Selected 入口共用唯一 Indicator Label Primitive。
// 业务 button 只拥有状态；指示线只由 label 的 CSS Owner 绘制。
export function setIndicatorLabel(button, text) {
    if (!isDomHTMLElement(button)) return null;
    let label = button.querySelector(":scope > .ui-indicator-label");
    if (!label) label = button.createSpan({ cls: "ui-indicator-label" });
    label.setText(String(text ?? ""));
    return label;
}
