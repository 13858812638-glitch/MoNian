// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { registerPickerCleanup } from "../../core/picker-cleanup.js";
import { normalizePropertySelection } from "../../data/properties/property-values.js";
import { createSearchButton } from "../components/input-controls.js";
import { createPickerHeaderIconAction } from "./picker-header.js";
import { createSharedPickerFooter, setPickerSearchMode } from "./picker-shell.js";


export function facetSelectionCount(state, kind) {
    if (!state) return 0;
    if (kind === "tag") return state.tags?.size || 0;
    if (kind === "folder") return state.folders?.size || 0;
    if (kind === "fileType") return state.fileTypes?.size || 0;
    if (kind === "property") {
        let count = 0;
        for (const values of state.properties?.values?.() || []) {
            count += values?.size || 0;
        }
        return count;
    }
    return 0;
}


export function commitFacetSelectionState(target, draft, kind) {
    if (!target || !draft) return false;
    if (kind === "tag") {
        target.tags = new Set(draft.tags || []);
        // 顶部正式 Facet 多选保持 GLS 自身既有 AND 语义；
        // 筛选池 Multi 的 OR 只由筛选池真实值操作声明，不能由设置项全局劫持。
        target.tagMatchMode = "all";
        return true;
    }
    if (kind === "folder") {
        target.folders = new Set(draft.folders || []);
        return true;
    }
    if (kind === "fileType") {
        target.fileTypes = new Set(draft.fileTypes || []);
        return true;
    }
    if (kind === "property") {
        target.properties = new Map(
            [...(draft.properties || new Map())].flatMap(([key, values]) => {
                const normalized = normalizePropertySelection(values || []);
                return normalized.size ? [[key, normalized]] : [];
            })
        );
        // 顶部属性 Facet 的跨键组合仍为 AND；同键多值继续由 Property Selection 自身 OR。
        target.propertyMatchMode = "all";
        return true;
    }
    return false;
}


export function createFacetPickerSelectionMode(panel, header, {
    core,
    kind,
    title = "多选",
    icon = "list-checks",
    onBeforeEnter = null,
    onStateChange = null,
    onCommit = null
} = {}) {
    const actions = header?.selectionActions;
    if (!panel || !actions || !core || !kind) return null;

    let active = false;
    let draft = null;

    const footer = createSharedPickerFooter(panel);
    const confirm = createSearchButton(footer, "action", {
        cls: "local-search-action-btn local-search-action-primary",
        attr: {
            "aria-label": "确认多选筛选"
        }
    });

    const commit = () => {
        if (!active || !draft) return false;
        if (!commitFacetSelectionState(core.filterState, draft, kind)) return false;
        core._onFilterChanged();
        if (core.dropdown.close() !== false) onCommit?.();
        return true;
    };

    const button = createPickerHeaderIconAction(actions, {
        icon,
        label: `进入${title}`,
        pressed: false,
        interaction: "choice",
        onClick: () => {
            setActive(!active);
        }
    });

    const sync = () => {
        const count = facetSelectionCount(draft, kind);
        const label = active ? `退出${title}` : `进入${title}`;
        button.classList.toggle("is-selected", active);
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute("aria-label", label);
        button.title = label;
        panel.classList.toggle("is-persistent-toggle", active);
        setPickerSearchMode(panel, active ? "点击条目多选，确认后应用" : "");
        if (confirm) {
            confirm.hidden = !active;
            confirm.textContent = "确定";
            confirm.setAttribute("aria-label", `确认多选筛选，已选 ${count} 项`);
        }
    };

    const notify = () => onStateChange?.({ active, draft });

    function setActive(value) {
        const next = Boolean(value);
        if (next === active) return active;

        if (next) {
            onBeforeEnter?.();
            draft = core.filterState.clone();
            active = true;
        } else {
            active = false;
            draft = null;
        }

        sync();
        notify();
        return active;
    }

    const refresh = () => {
        if (!active || !draft) return;
        sync();
        notify();
    };

    confirm?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        commit();
    });

    registerPickerCleanup(panel, () => {
        active = false;
        draft = null;
    });

    sync();
    return {
        button,
        footer,
        confirm,
        isActive: () => active,
        get draft() { return draft; },
        setActive,
        cancel: () => setActive(false),
        refresh,
        commit
    };
}
