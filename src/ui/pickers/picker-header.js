// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { createSearchButton } from "../components/input-controls.js";
import { setIcon } from "obsidian";



// ========== Picker 基础设施：纯 DOM 构建与聚焦，不持有 SearchCore 业务状态 ==========
export function createPickerHeaderIconAction(parent, {
    icon = "circle",
    label = "操作",
    classes = "",
    danger = false,
    pressed = null,
    interaction = "action",
    onClick = null
} = {}) {
    if (!parent) return null;

    const button = createSearchButton(parent, interaction, {
        cls: [
            "local-search-picker-title-icon-action",
            classes,
            danger ? "is-danger-action" : ""
        ].filter(Boolean).join(" "),
        attr: {
            type: "button",
            "aria-label": label,
            title: label
        }
    });
    if (pressed !== null && pressed !== undefined) {
        button.setAttribute("aria-pressed", String(Boolean(pressed)));
    }
    setIcon(button, icon);
    // Overflow and direct controls share this action; the callback is never copied
    // into another business owner or replayed through a synthetic DOM click.
    button._lsPickerAction = { icon, danger, invoke: event => onClick?.(button, event) };
    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        button._lsPickerAction.invoke(event);
    });
    return button;
}


export function configureSharedPickerHeader(panel, {
    headingText = "",
    countText = null,
    countAriaLabel = "",
    icon = "list-tree",
    allText = "",
    allTitle = "",
    onAll = null
} = {}) {
    const titleEl = panel.querySelector(".local-search-dropdown-title");
    if (!titleEl) {
        return {
            summary: null,
            heading: null,
            controls: null,
            actions: null,
            selectionActions: null,
            count: null,
            iconBtn: null
        };
    }

    titleEl.empty();
    titleEl.addClass("local-search-folder-dropdown-head");

    const summary = titleEl.createDiv({
        cls: "local-search-picker-title-summary"
    });

    let iconBtn = null;
    if (typeof onAll === "function") {
        iconBtn = createPickerHeaderIconAction(summary, {
            icon,
            label: allTitle || allText || headingText,
            onClick: () => onAll()
        });
    } else if (icon) {
        const iconEl = summary.createSpan({
            cls: "local-search-picker-title-icon",
            attr: { "aria-hidden": "true" }
        });
        setIcon(iconEl, icon);
    }

    const heading = summary.createSpan({
        text: headingText,
        cls: "local-search-folder-dropdown-heading"
    });

    // Header Controls 是标题右侧唯一正式组件：
    // maintenance actions -> selection mode -> count。
    // 组件只负责结构归一；视觉保持透明，不再制造额外 Surface / 外框。
    const controls = summary.createDiv({
        cls: "local-search-picker-title-controls"
    });
    const actions = controls.createDiv({
        cls: "local-search-picker-title-actions"
    });
    const selectionActions = controls.createDiv({
        cls: "local-search-picker-title-selection-actions"
    });

    const count = countText === null || countText === undefined
        ? null
        : controls.createSpan({
            text: String(countText),
            cls: "local-search-picker-title-count",
            attr: {
                "aria-label": countAriaLabel
                    || `当前文件数 ${countText}`
            }
        });

    return {
        summary,
        heading,
        controls,
        actions,
        selectionActions,
        count,
        iconBtn,
        backButton: null
    };
}
