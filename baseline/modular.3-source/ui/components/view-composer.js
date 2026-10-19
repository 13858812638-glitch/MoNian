// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { isDomButton } from "../../utils/dom.js";
import { createSharedPickerTreeRow } from "../pickers/tree-row.js";
import { setIndicatorLabel } from "./indicator-label.js";
import { createSearchButton } from "./input-controls.js";
import { setIcon } from "obsidian";


export function createViewComposerChoice(parent, {
    text = "",
    buttonClass = ""
} = {}) {
    const button = createSearchButton(parent, "choice", {
        cls: `local-search-view-segment-btn ${buttonClass}`.trim(),
        attr: { "aria-pressed": "false" }
    });
    setIndicatorLabel(button, text);
    return button;
}


export function syncViewComposerChoiceSelection(button, selected) {
    if (!isDomButton(button)) return;
    const pressed = String(Boolean(selected));
    if (button.getAttribute("aria-pressed") !== pressed) {
        button.setAttribute("aria-pressed", pressed);
    }
}


export function createViewComposerSection(parent, {
    id = "",
    title = "",
    collapsed = false
} = {}) {
    const section = parent.createDiv({
        cls: "local-search-view-section local-search-view-composer-section"
    });
    if (id) section.dataset.viewSection = id;
    const heading = section.createDiv({
        cls: "local-search-view-section-heading"
    });
    const toggle = createSearchButton(heading, "choice", {
        cls: "local-search-view-section-toggle",
        attr: {
            "aria-expanded": String(!collapsed),
            "aria-label": `${collapsed ? "展开" : "收起"}${title}`
        }
    });
    const chevron = toggle.createSpan({
        cls: "local-search-view-section-chevron",
        attr: { "aria-hidden": "true" }
    });
    setIcon(chevron, "chevron-down");
    toggle.createSpan({
        cls: "local-search-view-section-title",
        text: title
    });
    const count = heading.createSpan({
        cls: "local-search-view-section-count"
    });
    const actions = heading.createDiv({
        cls: "local-search-view-section-actions"
    });
    const body = section.createDiv({
        cls: "local-search-view-section-body"
    });
    const setCollapsed = value => {
        const next = Boolean(value);
        section.classList.toggle("is-collapsed", next);
        body.hidden = next;
        toggle.setAttribute("aria-expanded", String(!next));
        toggle.setAttribute("aria-label", `${next ? "展开" : "收起"}${title}`);
    };
    setCollapsed(collapsed);
    return { section, heading, toggle, chevron, count, actions, body, setCollapsed };
}


export function createViewComposerActionRow(parent, {
    icon = "plus",
    name = "",
    label = "",
    rowClasses = "",
    onClick = null
} = {}) {
    return createSharedPickerTreeRow(parent, {
        rowClasses: `local-search-view-composer-action-row ${rowClasses}`.trim(),
        icon,
        name,
        itemTitle: label || name,
        onClick,
        sortDisabled: true,
        restoreFocus: false
    });
}


export function createViewComposerRemoveButton(parent, {
    label = "删除",
    onClick = null
} = {}) {
    const button = createSearchButton(parent, "action", {
        cls: "local-search-view-row-remove",
        attr: {
            "data-ls-no-drag": "true",
            "aria-label": label
        }
    });
    setIcon(button, "x");
    if (typeof onClick === "function") {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            onClick(event);
        });
    }
    return button;
}
