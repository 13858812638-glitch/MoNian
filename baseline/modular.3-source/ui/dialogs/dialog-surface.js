// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { createSearchButton, createSearchInput } from "../components/input-controls.js";
import { setIcon } from "obsidian";


export function createSearchDialogContent(dialog) {
    return dialog.createDiv({ cls: "local-search-dialog-content" });
}


// 唯一 Dialog Surface Primitive：文件重命名、结果卡删除、命令删除及 Picker 维护弹窗
// 均消费同一个 Frame / Content / Action Rail；只以 field、danger、option 声明内容差异。
// Session / Overlay adapters own host lifecycle, not another UI implementation.
export function createSharedDialogSurface(host, {
    title = "确认操作",
    message = "",
    detail = "",
    confirmText = "确认",
    danger = false,
    closeable = false,
    optionLabel = "",
    optionChecked = false,
    field = null,
    onFinish = null
} = {}) {
    const dialog = host.createDiv({
        cls: "local-search-confirm-dialog local-search-dialog-surface",
        attr: { role: "dialog", "aria-modal": "true", "aria-label": title }
    });
    const content = createSearchDialogContent(dialog);
    content.createDiv({ cls: "local-search-confirm-title", text: title });
    if (message) content.createDiv({ cls: "local-search-confirm-message", text: message });
    if (detail) content.createDiv({ cls: "local-search-confirm-detail", text: detail });

    let input = null;
    if (field) {
        input = createSearchInput(content, {
            type: "text",
            cls: "local-search-dialog-input",
            attr: {
                "aria-label": field.label || "名称",
                placeholder: field.placeholder || "",
                enterkeyhint: "done",
                autocomplete: "off",
                autocapitalize: "off",
                spellcheck: "false"
            }
        });
        input.value = String(field.value ?? "");
    }

    const actions = dialog.createDiv({ cls: "local-search-picker-actions" });
    let optionInput = null;
    if (optionLabel) {
        const option = actions.createEl("label", { cls: "local-search-confirm-option" });
        optionInput = createSearchInput(option, {
            type: "checkbox",
            attr: { "aria-label": optionLabel }
        });
        optionInput.checked = Boolean(optionChecked);
        option.createSpan({ text: optionLabel });
    }

    const cancelButton = createSearchButton(actions, "action", {
        text: "取消",
        cls: "local-search-action-btn"
    });
    const confirmButton = createSearchButton(actions, "action", {
        text: confirmText,
        cls: danger
            ? "local-search-action-btn local-search-action-danger"
            : "local-search-action-btn local-search-action-primary"
    });
    let closeButton = null;
    const controls = { dialog, content, input, cancelButton, confirmButton, optionInput, closeButton };
    const finish = value => onFinish?.(Boolean(value), controls);

    if (closeable) {
        closeButton = createSearchButton(dialog, "action", {
            cls: "local-search-overlay-close is-positioned",
            attr: { "aria-label": "关闭" }
        });
        setIcon(closeButton, "x");
        controls.closeButton = closeButton;
        closeButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            finish(false);
        });
    }
    cancelButton.addEventListener("click", () => finish(false));
    confirmButton.addEventListener("click", () => finish(true));
    dialog.addEventListener("keydown", event => {
        if (event.isComposing || event.keyCode === 229 || event.key !== "Escape") return;
        event.preventDefault();
        finish(false);
    });
    return controls;
}
