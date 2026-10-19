// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { registerPickerCleanup } from "../../core/picker-cleanup.js";
import { bindInputFocusGuard, createSearchTextField } from "../components/input-controls.js";
import { observePickerCountRail } from "./count-rail.js";
import { createSharedPickerTreeRow } from "./tree-row.js";
import { setIcon } from "obsidian";


// A Picker's auto-reveal belongs to its Surface, not to individual renders.
// Coalesce repeated tree projections into one frame and cancel it on close.
export function createPickerAutoLocateScheduler(panel, list) {
    const win = panel.ownerDocument.defaultView;
    let frame = null;
    let disposed = false;
    registerPickerCleanup(panel, () => {
        disposed = true;
        if (frame !== null) win.cancelAnimationFrame(frame);
        frame = null;
    });
    return reveal => {
        if (disposed || !panel.isConnected || !list.isConnected
            || typeof reveal !== "function") return;
        if (frame !== null) win.cancelAnimationFrame(frame);
        frame = win.requestAnimationFrame(() => {
            frame = null;
            if (!disposed && panel.isConnected && list.isConnected) reveal();
        });
    };
}


export function createSharedPickerFooter(panel) {
    return panel.querySelector(":scope > .local-search-picker-footer")
        || panel.createDiv({ cls: "local-search-picker-footer" });
}


export function createSharedPickerTreeShell(panel, {
    placeholder,
    rootClasses = "",
    treeClasses = "",
    showRoot = true
}) {
    const searchWrap = panel.createDiv({ cls: "local-search-move-search-wrap" });
    const searchIcon = searchWrap.createSpan({ cls: "local-search-picker-search-icon", attr: { "aria-hidden": "true" } });
    setIcon(searchIcon, "search");
    const { input: search } = createSearchTextField(searchWrap, {
        fieldClass: "local-search-picker-search-field",
        inputClass: "local-search-picker-search",
        type: "text",
        placeholder,
        attr: { "aria-label": placeholder, autocomplete: "off", autocapitalize: "off", spellcheck: "false" }
    });
    search.dataset.searchPlaceholder = placeholder;
    const list = panel.createDiv({ cls: `local-search-move-tree ${treeClasses}`.trim() });
    const current = panel.querySelector(":scope > .local-search-picker-current-selection");
    if (current) panel.appendChild(current);
    const footer = createSharedPickerFooter(panel);
    panel.appendChild(footer);
    const rootHost = showRoot
        ? footer.createDiv({ cls: `local-search-move-root ${rootClasses}`.trim() })
        : null;

    // All tree Pickers share the existing input guard, as in Feishu. Buttons
    // continuing this search do not dismiss its keyboard. Hiding/removing a
    // parent remains native; no forced return to a hidden input is added.
    registerPickerCleanup(panel, bindInputFocusGuard(panel, search, {
        selector: "button, .local-search-dropdown-title",
        when: () => panel.isConnected && !panel.hidden,
        ignore: (_event, _input, target) => Boolean(
            target.closest(".is-sort-mode [data-sort-key]")
            && !target.closest('[data-ls-no-drag="true"]'))
    }));
    registerPickerCleanup(panel, observePickerCountRail(panel, list, "--ls-picker-scrollbar-reserve"));

    return { search, rootHost, list };
}


export function setPickerSearchMode(panel, description = "") {
    const wrap = panel?.querySelector(":scope > .local-search-move-search-wrap");
    const input = wrap?.querySelector(".local-search-picker-search");
    if (!input) return;
    if (input.dataset.searchPlaceholder === undefined) input.dataset.searchPlaceholder = input.placeholder;
    // Mode text shares the native placeholder/description. A second overlay
    // line used to change input padding and line-height as soon as typing
    // started, moving the text/caret within the same fixed-height field.
    input.placeholder = description || input.dataset.searchPlaceholder;
    if (description) input.setAttribute("aria-description", description);
    else input.removeAttribute("aria-description");
}


export function activatePickerSearch(search, {
    onInput = null,
    initialRender = null
} = {}) {
    if (!search) return;
    if (typeof onInput === "function") {
        search.addEventListener("input", onInput);
    }
    // Picker 打开只渲染，不夺取焦点；搜索由用户主动点击输入框后开始。
    initialRender?.();
}


export function renderSharedPickerRoot(rootHost, {
    rowClasses = "",
    itemClasses = "",
    title = "",
    icon = "list-tree",
    name = "",
    count = null,
    countClasses = "",
    active = false,
    interactive = true,
    onClick = null
} = {}) {
    rootHost.empty();
    const root = createSharedPickerTreeRow(rootHost, {
        depth: 0,
        rowClasses,
        itemClasses,
        itemTitle: title,
        icon,
        name,
        count,
        countClasses,
        countPlacement: "row-end",
        active,
        onClick: interactive ? onClick : null
    });
    if (!interactive) {
        root.row.addClass("is-noninteractive");
        root.button.tabIndex = -1;
        root.button.setAttribute("aria-hidden", "true");
    }
    return root;
}
