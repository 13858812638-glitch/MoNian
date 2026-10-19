// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { propertySpecialInlineDisplay, propertyValueKey } from "../../data/properties/property-values.js";
import { createSearchButton } from "./input-controls.js";


export function appendPropertySpecialStateInlineGroup(host, {
    key,
    values = [],
    selectedValueKeys = new Set(),
    valueCount = () => 0,
    onToggle = () => {}
} = {}) {
    if (!host || !values.length) return null;

    const row = host.createDiv({
        cls: "local-search-property-special-state-inline",
        attr: {
            role: "group",
            "aria-label": `${key || "属性"}的特殊状态`
        }
    });

    const group = row.createDiv({
        cls: "local-search-property-special-state-group"
    });

    values.forEach(value => {
        const valueId = propertyValueKey(value);
        const selected = selectedValueKeys.has(valueId);
        const count = Math.max(0, Number(valueCount(value)) || 0);
        const unavailable = count <= 0 && !selected;
        const label = propertySpecialInlineDisplay(value);
        const button = createSearchButton(group, "choice", {
            cls: [
                "local-search-property-special-state-action",
                selected ? "is-selected" : "",
                unavailable ? "is-disabled" : ""
            ].filter(Boolean).join(" "),
            attr: {
                "aria-pressed": String(selected),
                "aria-disabled": String(unavailable),
                title: selected
                    ? `取消筛选：${key} · ${label}`
                    : unavailable
                        ? `当前条件下没有“${key} · ${label}”`
                        : `筛选：${key} · ${label}`
            }
        });
        button.disabled = unavailable;
        button.createSpan({
            cls: "local-search-property-special-state-label",
            text: label
        });
        button.createSpan({
            cls: "local-search-property-special-state-dot",
            text: "·",
            attr: { "aria-hidden": "true" }
        });
        button.createSpan({
            cls: "local-search-property-special-state-count",
            text: String(count)
        });

        if (!unavailable) {
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                onToggle(value);
            });
        }
    });

    return row;
}
