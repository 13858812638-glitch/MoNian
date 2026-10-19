// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { registerPickerCleanup } from "../../core/picker-cleanup.js";
import { createSearchButton } from "../components/input-controls.js";
import { setIcon } from "obsidian";


export function createSharedPickerSelectionStrip(panel, { onClear, canEdit = () => true } = {}) {
    // 母版：当前条件在列表后、底部分割线上；空集合不占位，Chip 原位更新。
    const root = panel.createDiv({ cls: "local-search-picker-current-selection", attr: { role: "group", "aria-label": "当前已选" } });
    const list = root.createDiv({ cls: "local-search-picker-current-list" });
    const clearButton = createSearchButton(root, "action", {
        cls: "local-search-action-btn local-search-picker-condition-clear", text: "清空",
        attr: { "aria-label": "清空当前已选" }
    });
    clearButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        if (!clearButton.disabled && panel.isConnected && canEdit()) onClear?.();
    });
    const chips = new Map();

    const createChip = key => {
        const chip = createSearchButton(list, "choice", {
            cls: "local-search-picker-current-chip"
        });
        chip.dataset.selectionKey = key;
        chip._lsText = chip.createSpan();
        const x = chip.createSpan({ cls: "local-search-picker-current-chip-x" });
        setIcon(x, "x");
        chip.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (chip.disabled || !panel.isConnected || !canEdit()) return;
            const entry = chip._lsSelectionEntry;
            if (!entry) return;
            entry.onRemove?.();
        });
        chips.set(key, chip);
        return chip;
    };

    const render = items => {
        const entries = Array.isArray(items) ? items.filter(Boolean) : [];
        const focused = root.contains(root.ownerDocument.activeElement) ? root.ownerDocument.activeElement : null;
        const focusedIndex = focused ? [...list.children].indexOf(focused) : -1;
        const keyboardFocus = focused?.matches(":focus-visible");
        const seen = new Set();
        const order = [];

        for (const entry of entries) {
            const text = String(entry.text || "");
            if (!text) continue;
            const key = String(entry.key ?? text);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            order.push(key);

            const chip = chips.get(key) || createChip(key);
            chip._lsSelectionEntry = entry;
            chip.disabled = !canEdit();
            chip.title = entry.title || `移除 ${text}`;
            chip.setAttribute("aria-label", entry.title || `移除 ${text}`);
            if (chip._lsText?.textContent !== text) chip._lsText.textContent = text;
        }

        for (const [key, chip] of [...chips]) {
            if (seen.has(key)) continue;
            chip.remove();
            chips.delete(key);
        }

        const currentOrder = [...list.children]
            .map(chip => chip.dataset.selectionKey || "");
        if (JSON.stringify(currentOrder) !== JSON.stringify(order)) {
            const previousLeft = list.scrollLeft;
            for (const key of order) {
                const chip = chips.get(key);
                if (chip) list.appendChild(chip);
            }
            const maxLeft = Math.max(0, list.scrollWidth - list.clientWidth);
            list.scrollLeft = Math.min(previousLeft, maxLeft);
        }
        root.hidden = !order.length;
        clearButton.disabled = !order.length || !canEdit() || typeof onClear !== "function";
        if (keyboardFocus && (!focused.isConnected || root.hidden)) {
            (chips.get(order[Math.max(0, Math.min(focusedIndex, order.length - 1))])
                || panel.querySelector(".local-search-picker-search"))?.focus({ preventScroll: true });
        }
    };

    render([]);
    registerPickerCleanup(panel, () => chips.clear());
    return { root, list, clearButton, render };
}
