// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { createPickerHeaderIconAction } from "./picker-header.js";
import { setPickerSearchMode } from "./picker-shell.js";
import { deactivateConflictingFacetPickerModes } from "./selection-mode.js";


export function attachPickerSortModeToggle(header, {
    label = "拖拽",
    onChange = null
} = {}) {
    const actions = header?.actions;
    if (!actions) return null;

    let active = false;
    const button = createPickerHeaderIconAction(actions, {
        icon: "arrow-up-down",
        label: `进入${label}拖拽模式`,
        pressed: false,
        interaction: "choice",
        onClick: () => setActive(!active)
    });
    if (!button) return null;

    const sync = () => {
        const nextLabel = active
            ? `退出${label}拖拽模式`
            : `进入${label}拖拽模式`;
        button.classList.toggle("is-selected", active);
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute("aria-label", nextLabel);
        button.title = nextLabel;
    };

    const setActive = value => {
        const next = Boolean(value);
        if (next === active) return active;
        active = next;
        sync();
        onChange?.(active);
        const panel = actions.closest(".local-search-picker-dropdown");
        panel?.classList.toggle("is-persistent-toggle", active);
        setPickerSearchMode(panel, active ? "拖动条目调整顺序" : "");
        return active;
    };

    sync();

    return {
        button,
        get active() { return active; },
        setActive,
        destroy() {
            setActive(false);
        }
    };
}


// Shared facet sort-mode transition. Specialized commit/reorder logic stays
// in the folder/tag/property controllers and their PointerSortCoordinator.
export function attachFacetPickerSortModeToggle(header, {
    label,
    selectionMode = null,
    maintenanceMode = null,
    maintenanceFirst = false,
    coordinator = null,
    suppressIntermediateRender = false,
    onEnter = null,
    onRefreshSelection = null
} = {}) {
    return attachPickerSortModeToggle(header, {
        label,
        onChange: active => {
            if (active) {
                deactivateConflictingFacetPickerModes({
                    selectionMode, maintenanceMode, maintenanceFirst,
                    suppressIntermediateRender
                });
                onEnter?.();
            }
            coordinator?.setEnabled(active);
            onRefreshSelection?.();
        }
    });
}
