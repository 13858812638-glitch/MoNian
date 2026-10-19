// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { isDomHTMLElement } from "../utils/dom.js";


export function captureScrollableAnchor(container, {
    selector = "[data-picker-key]",
    keyFrom = element => element?.dataset?.pickerKey || ""
} = {}) {
    if (!isDomHTMLElement(container)) return null;

    const bounds = container.getBoundingClientRect();
    const visible = [...container.querySelectorAll(selector)].find(element => {
        if (!isDomHTMLElement(element)) return false;
        const rect = element.getBoundingClientRect();
        return rect.bottom > bounds.top + 1
            && rect.top < bounds.bottom - 1;
    });

    return {
        key: visible ? String(keyFrom(visible) || "") : "",
        offset: visible
            ? visible.getBoundingClientRect().top - bounds.top
            : 0,
        scrollTop: container.scrollTop
    };
}


export function restoreScrollableAnchor(container, anchor, {
    selector = "[data-picker-key]",
    keyFrom = element => element?.dataset?.pickerKey || ""
} = {}) {
    if (!isDomHTMLElement(container) || !container.isConnected || !anchor) {
        return false;
    }

    let restored = false;
    if (anchor.key) {
        const target = [...container.querySelectorAll(selector)].find(
            element => String(keyFrom(element) || "") === anchor.key
        );
        if (isDomHTMLElement(target)) {
            const bounds = container.getBoundingClientRect();
            const rect = target.getBoundingClientRect();
            container.scrollTop += rect.top - bounds.top - anchor.offset;
            restored = true;
        }
    }

    if (!restored) {
        container.scrollTop = Math.max(0, Number(anchor.scrollTop) || 0);
    }

    const maxScroll = Math.max(
        0,
        container.scrollHeight - container.clientHeight
    );
    container.scrollTop = Math.min(
        Math.max(0, container.scrollTop),
        maxScroll
    );
    return restored;
}


export function revealScrollableKey(container, key, {
    selector = "[data-picker-key]",
    keyFrom = element => element?.dataset?.pickerKey || ""
} = {}) {
    if (!isDomHTMLElement(container) || !container.isConnected || !key
        || container.closest("[hidden], [inert], .pwb-modal-suspended")) {
        return false;
    }
    const target = [...container.querySelectorAll(selector)].find(
        element => String(keyFrom(element) || "") === String(key)
    );
    if (!isDomHTMLElement(target)) return false;

    const bounds = container.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return false;
    const rect = target.getBoundingClientRect();
    if (rect.top < bounds.top) {
        container.scrollTop += rect.top - bounds.top;
    } else if (rect.bottom > bounds.bottom) {
        container.scrollTop += rect.bottom - bounds.bottom;
    }
    const maxScroll = Math.max(
        0,
        container.scrollHeight - container.clientHeight
    );
    container.scrollTop = Math.min(
        Math.max(0, container.scrollTop),
        maxScroll
    );
    return true;
}


export function rerenderPickerListPreservingScroll(list, render) {
    if (!list || typeof render !== "function") return;
    const anchor = captureScrollableAnchor(list);
    render();
    restoreScrollableAnchor(list, anchor);
}


export function syncSharedPickerTreeRowSelection(row, selected) {
    if (!isDomHTMLElement(row)) return;
    const active = Boolean(selected);

    // Tree / Picker 的视觉状态只允许挂在 Row 上。
    // 子 button 只保留语义性的 aria-pressed，不再写入 is-selected，
    // 避免 Obsidian / 主题对 button.is-selected 注入额外背景并产生中间态。
    row.classList.toggle("is-selected", active);
    const button = row.querySelector(":scope > .local-search-move-tree-folder");
    button?.setAttribute("aria-pressed", String(active));
    const iconButton = row.querySelector(":scope > .local-search-move-tree-folder-icon.is-interactive");
    iconButton?.setAttribute("aria-pressed", String(active));
}
