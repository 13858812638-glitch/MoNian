// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { configureSharedPickerHeader, createPickerHeaderIconAction } from "./picker-header.js";
import { setPickerSearchMode } from "./picker-shell.js";
import { createSharedPickerTreeRow } from "./tree-row.js";


export function attachFacetPickerOverflow(core, panel, header) {
    if (!header?.actions || !header?.controls || !header.actions.children.length) return null;
    // The existing action controls keep ownership of their state. Only their
    // presentation moves into the common action list, after the multiselect.
    const source = header.actions;
    source.hidden = true;
    const host = header.controls.ownerDocument.createElement("div");
    host.className = "local-search-picker-title-overflow";
    header.controls.insertBefore(host, header.count || null);
    const button = createPickerHeaderIconAction(host, {
        icon: "ellipsis", label: "更多操作",
        classes: "local-search-picker-overflow-action",
        onClick: () => {
            if (!panel.isConnected || !core.dropdown.isActivePanel(panel)) return;
            const menu = core.dropdown.openChild(button, "更多操作");
            if (!menu) return;
            menu.addClass("local-search-picker-dropdown", "local-search-picker-action-menu");
            configureSharedPickerHeader(menu, { headingText: "更多操作", icon: "ellipsis" });
            const list = menu.createDiv({ cls: "local-search-folder-tree" });
            for (const actionButton of source.children) {
                const action = actionButton._lsPickerAction;
                if (!action || actionButton.disabled) continue;
                const row = createSharedPickerTreeRow(list, {
                    name: actionButton.getAttribute("aria-label") || actionButton.title || "操作",
                    icon: action.icon,
                    active: actionButton.getAttribute("aria-pressed") === "true",
                    onClick: () => {
                        core.dropdown.close(false);
                        if (!panel.isConnected || core._destroyed) return;
                        action.invoke();
                    }
                });
                if (action.danger) row.row.addClass("is-danger-action");
            }
        }
    });
    button.setAttribute("aria-haspopup", "dialog");
    return { button };
}


export function attachPickerHeaderModes(header, {
    modes = [],
    onChange = null
} = {}) {
    const actions = header?.actions;
    if (!actions) return null;

    const definitions = (Array.isArray(modes) ? modes : [])
        .map(mode => ({
            id: String(mode?.id || "").trim(),
            icon: String(mode?.icon || "circle"),
            title: String(mode?.title || "操作"),
            activeTitle: String(mode?.activeTitle || mode?.title || "退出操作"),
            description: String(mode?.description || `${mode?.title || "操作"}：点击条目进行设置`),
            danger: Boolean(mode?.danger)
        }))
        .filter(mode => mode.id);

    const buttons = new Map();
    let activeId = "";

    const sync = () => {
        for (const mode of definitions) {
            const button = buttons.get(mode.id);
            if (!button) continue;
            const active = activeId === mode.id;
            const label = active ? mode.activeTitle : mode.title;
            button.classList.toggle("is-selected", active);
            button.setAttribute("aria-pressed", String(active));
            button.setAttribute("aria-label", label);
            button.title = label;
        }
    };

    const setActive = (id, { suppressIntermediateRender = false } = {}) => {
        const wanted = definitions.some(mode => mode.id === id) ? id : "";
        if (wanted === activeId) return activeId;
        activeId = wanted;
        sync();
        onChange?.(activeId, { suppressIntermediateRender });
        const panel = actions.closest(".local-search-picker-dropdown");
        panel?.classList.toggle("is-persistent-toggle", Boolean(activeId));
        setPickerSearchMode(panel, definitions.find(mode => mode.id === activeId)?.description || "");
        return activeId;
    };

    for (const mode of definitions) {
        const button = createPickerHeaderIconAction(actions, {
            icon: mode.icon,
            label: mode.title,
            classes: `local-search-picker-title-mode-action${mode.icon === "pencil" ? " is-optical-edit" : ""}`,
            danger: mode.danger,
            pressed: false,
            interaction: "choice",
            onClick: () => {
                setActive(activeId === mode.id ? "" : mode.id);
            }
        });
        buttons.set(mode.id, button);
    }

    sync();
    return {
        buttons,
        get activeId() { return activeId; },
        isActive: id => activeId === id,
        setActive
    };
}
