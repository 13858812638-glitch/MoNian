// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { isDomButton, isDomHTMLElement } from "../../utils/dom.js";
import { createSearchButton } from "../components/input-controls.js";
import { setIcon } from "obsidian";


export function createSharedPickerTreeRow(list, {
    depth = 0,
    rowClasses = "",
    active = false,
    hasChildren = false,
    expanded = false,
    toggleTitle = "",
    itemClasses = "",
    itemTitle = "",
    icon = "tag",
    name = "",
    count = null,
    countClasses = "",
    countPlacement = "row-end",
    onToggle = null,
    onIconClick = null,
    onClick = null,
    renderTrailing = null,
    staticItem = false,
    restoreFocus = true,
    sortKey = "",
    sortParent = "",
    sortPromoteParent = "",
    sortName = "",
    sortDisabled = false
} = {}) {
    const previousRow = list.lastElementChild;
    const row = list.createDiv({ cls: `local-search-move-tree-row ${rowClasses}`.trim() });
    row.dataset.treeDepth = String(depth);
    // Flat rows keep the sort owner intact; guide segments join across each ancestor level.
    for (const guide of previousRow?.querySelectorAll(":scope > .local-search-tree-guide") || []) {
        if (Number(guide.dataset.level) <= depth) guide.classList.remove("is-end");
    }
    for (let level = 1; level <= depth; level++) {
        const guide = row.createSpan({
            cls: `local-search-tree-guide is-end${Number(previousRow?.dataset.treeDepth || 0) < level ? " is-start" : ""}`,
            attr: { "aria-hidden": "true" }
        });
        guide.dataset.level = String(level);
        guide.style.setProperty("--ls-guide-level", String(level));
    }
    const footerOption = Boolean(list.closest(".local-search-picker-footer"));
    if (footerOption) row.addClass("is-footer-option");
    row.style.setProperty("--ls-move-depth", String(depth));
    if (sortKey) {
        row.dataset.sortKey = sortKey;
        row.dataset.sortDepth = String(depth);
        row.dataset.sortParent = sortParent || "";
        row.dataset.sortPromoteParent = sortPromoteParent || "";
        row.dataset.sortName = sortName || name || sortKey;
    }
    if (sortDisabled) row.addClass("is-no-sort");
    if (active) row.addClass("is-selected");
    row.dataset.pickerKey = itemTitle || name;
    const runAction = (action, selector) => {
        const hadFocus = row.contains(row.ownerDocument.activeElement);
        action();
        if (restoreFocus && hadFocus && !row.isConnected) {
            const replacement = [...list.children].find(el => el.dataset.pickerKey === row.dataset.pickerKey);
            replacement?.querySelector(selector)?.focus({ preventScroll: true });
        }
    };

    const toggle = createSearchButton(row, "tree-toggle", {
        cls: "local-search-move-tree-toggle local-search-row-hit-target",
        attr: { "data-ls-no-drag": "true" }
    });
    if (hasChildren) {
        setIcon(toggle, expanded ? "chevron-down" : "chevron-right");
        toggle.setAttribute("aria-expanded", String(expanded));
        toggle.setAttribute("aria-label", `${toggleTitle} ${name}`);
    } else {
        toggle.addClass("is-placeholder");
        toggle.tabIndex = -1;
        toggle.setAttribute("aria-hidden", "true");
    }

    const itemClassName =
        `local-search-move-tree-folder ${itemClasses}`.trim();
    const button = staticItem
        ? row.createDiv({
            cls: itemClassName,
            attr: {
                "aria-label": itemTitle || name,
                "aria-hidden": "true"
            }
        })
        : createSearchButton(row, "tree-hit", {
            cls: itemClassName,
            attr: {
                "aria-label": itemTitle || name,
                "aria-pressed": String(active)
            }
        });
    if (!staticItem && !onClick) button.disabled = true;
    if (!hasChildren) toggle.disabled = true;

    const iconEl = onIconClick
        ? createSearchButton(row, "tree-hit", { cls:"local-search-move-tree-folder-icon is-interactive", attr: {
            "aria-label": `多选 / 取消：${name}`, "aria-pressed": String(active), "data-ls-no-drag": "true"
        } })
        : button.createSpan({ cls:"local-search-move-tree-folder-icon"});
    setIcon(iconEl, icon);
    if (onIconClick) {
        row.insertBefore(iconEl, button);
        button.setAttribute("aria-label", `单选：${name}`);
        iconEl.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            runAction(onIconClick, ".is-interactive");
        });
    }
    button.createSpan({ text: name, cls:"local-search-move-tree-name"});
    const hasCount = count !== null && count !== undefined && count !== "";
    if (hasCount && countPlacement !== "row-end") {
        button.createSpan({
            text: String(count),
 cls: `local-search-move-current-badge ${countClasses}`.trim()
        });
    }

    if (onToggle && hasChildren) {
        toggle.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            runAction(onToggle, ".local-search-move-tree-toggle");
        });
    }
    if (onClick) {
        button.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            runAction(onClick, ".local-search-move-tree-folder");
        });
    }
    // 与母版共用行尾展开槽；图标 / 名称不因有没有子级而改变起点。
    row.appendChild(toggle);
    if (typeof renderTrailing === "function") renderTrailing(row);
    if (hasCount && countPlacement === "row-end") {
        if (footerOption) row.createSpan({ text: "·", cls: "local-search-picker-footer-dot", attr: { "aria-hidden": "true" } });
        row.createSpan({
            text: String(count),
            cls: `local-search-move-current-badge ${countClasses}`.trim()
        });
    }

    // Row 是 Tree / Picker 唯一 Surface 状态拥有者。
    // 直接子 button 只负责命中与 aria，不允许自己再绘制 Pressed / Selected 背景，
    // 避免父 Row 已选中时子 button:active 形成“中间截断”的第二层色块。
    for (const hitTarget of [button, iconEl].filter(el => el.tagName === "BUTTON")) {
        hitTarget.addClass("local-search-row-hit-target");
    }
    if (sortKey && !sortDisabled) {
        const grip = row.createSpan({ cls: "local-search-picker-sort-indicator", attr: { "aria-hidden": "true" } });
        setIcon(grip, "grip-vertical");
    }
    return { row, toggle, button, iconEl };
}


export function syncSharedPickerTreeRowAvailability(row, unavailable) {
    if (!isDomHTMLElement(row)) return;
    const disabled = Boolean(unavailable);
    row.classList.toggle("is-unavailable", disabled);
    row.setAttribute("aria-disabled", String(disabled));
    const button = row.querySelector(":scope > .local-search-move-tree-folder");
    if (isDomButton(button)) {
        button.disabled = disabled;
        button.tabIndex = disabled ? -1 : 0;
    }
}



// ========== Search / Batch Metadata 共享树与属性 UI 纯函数 ==========
export function createTreeActionButton(parent, { text = "", icon = "", title = "" } = {}) {
    const button = createSearchButton(parent, "action", {
        text,
        cls: "local-search-move-tree-folder-icon is-interactive",
        attr: { "aria-label": title }
    });
    if (icon) setIcon(button, icon);
    return button;
}


export function createPickerRowAction(row, {
    icon = "pencil",
    label = "操作",
    danger = false,
    interaction = "action",
    onClick = null
} = {}) {
    const options = {
        cls: [
            "local-search-picker-row-action",
            danger ? "is-danger-action" : "",
            icon === "eye-off" ? "is-hidden-state" : ""
        ].filter(Boolean).join(" "),
        attr: {
            type: "button",
            "data-ls-no-drag": "true",
            "aria-label": label,
            title: label
        }
    };
    const button = createSearchButton(row, interaction, options);
    setIcon(button, icon);
    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        onClick?.(button, event);
    });
    return button;
}
