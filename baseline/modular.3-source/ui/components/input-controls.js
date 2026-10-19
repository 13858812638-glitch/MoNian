// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { isDomElement, isDomHTMLElement } from "../../utils/dom.js";
import { setIcon } from "obsidian";


// Dida Master v1.1.0 · Control Interaction Primitive。
// interaction 是静态组件合同，不代表临时按压状态；CSS 只按正式语义消费。
// action: 执行动作；choice: 直接改变值/状态；chrome: 工具栏动作；
// text: 文本型轻动作；field: 元数据字段；tree-hit/tree-toggle: 外层 Tree Row 拥有反馈；
// quiet: 无临时反馈；input: 原生输入控件。
export function initializeSearchInteractionElement(element, interaction) {
    if (!isDomElement(element)) return element;
    element.dataset.lsInteraction = String(interaction || "quiet");
    if (element.tagName === "BUTTON" && !element.hasAttribute("type")) {
        element.setAttribute("type", "button");
    }
    return element;
}


export function createSearchButton(host, interaction, options = {}) {
    const button = host.createEl("button", {
        ...options,
        attr: { type: "button", ...options.attr }
    });
    return initializeSearchInteractionElement(button, interaction);
}


// Native form values share one construction contract; each visual component
// still owns its own geometry / focus surface. No focus listener or state is added here.
export function createSearchInput(host, options = {}) {
    return initializeSearchInteractionElement(
        host.createEl("input", { ...options, attr: { ...options.attr } }),
        "input"
    );
}


// Search Text Field Primitive：主搜索与 Picker 搜索共用唯一 DOM 结构。
// 外层 Field 是唯一 flex 项；真实 input 永远 width:100%，不直接参与兄弟动作区的 flex 尺寸计算。
export function createSearchTextField(host, {
    fieldClass = "",
    inputClass = "",
    ...inputOptions
} = {}) {
    const field = host.createDiv({
        cls: ["local-search-search-field", fieldClass].filter(Boolean).join(" ")
    });
    const input = createSearchInput(field, {
        ...inputOptions,
        cls: ["local-search-search-text-input", inputClass].filter(Boolean).join(" ")
    });
    return { field, input };
}


export function createSearchWindowAction(host, icon, label) {
    const button = createSearchButton(host, "chrome", {
        cls: "local-search-window-action",
        attr: { "aria-label": label }
    });
    setIcon(button, icon);
    return button;
}


// Mouse-only focus guard for controls that continue the same editing session.
// Cancelling touch pointerdown can suppress WebKit's subsequent click entirely;
// native touch/pen activation and text input must retain their default behavior.
export function bindInputFocusGuard(surface, inputOrResolver, {
    selector = "button",
    when = null,
    ignore = null
} = {}) {
    if (!isDomHTMLElement(surface)) return () => {};
    const onPointerDown = event => {
        if (event.pointerType !== "mouse" || event.button > 0) return;
        const input = typeof inputOrResolver === "function"
            ? inputOrResolver()
            : inputOrResolver;
        if (!input?.ownerDocument || input.ownerDocument.activeElement !== input) return;
        const target = isDomElement(event.target)
            ? event.target
            : event.target?.parentElement || null;
        if (
            !target?.closest(selector)
            || (when && !when(event, input, target))
            || (ignore && ignore(event, input, target))
        ) {
            return;
        }
        event.preventDefault();
    };
    surface.addEventListener("pointerdown", onPointerDown);
    return () => surface.removeEventListener("pointerdown", onPointerDown);
}
