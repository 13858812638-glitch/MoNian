// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { bindInputFocusGuard, createSearchButton } from "../../ui/components/input-controls.js";
import { DEFAULT_RESULT_VIEWS, normalizeResultViewConfig, normalizeResultViewId } from "../results/view-config.js";
import { setIcon } from "obsidian";
// Instance method owner. `this` is the unchanged SearchResultControlsController instance. No additional state store.
export const SearchResultControlsController_toolbar_methods = {


    ownsAnchor(anchor) {
        return Boolean(
            anchor
            && (anchor === this.historyBtn || anchor === this.resultViewBtn)
        );
    },


    buildHost(searchWrap) {
        if (!searchWrap) return null;
        this.searchResultControlsHost = searchWrap.createDiv({
            cls: "local-search-search-result-controls-host",
            attr: { "aria-label": "搜索与结果工具" }
        });
        return this.searchResultControlsHost;
    },


    _createInputAction(parent, className, label, iconName, interaction = "chrome") {
        const button = createSearchButton(parent, interaction, {
            cls: ["local-search-input-action", className].filter(Boolean).join(" "),
            attr: {
                "aria-label": label
            }
        });
        // Dida Bridge 6.0.29：action button 自身就是唯一图标 Owner。
        setIcon(button, iconName);
        return { button };
    },


    buildToolbar() {
        const core = this.owner;
        const controls = core.containerEl.ownerDocument.createElement("div");
        controls.className = "local-search-search-result-controls";

        // 共用同一输入框；模式按钮双向阻止夺焦，保持已有键盘会话。
        // 只有右侧橡皮擦等明确结束输入的动作才允许释放焦点。
        {
            const { button } = this._createInputAction(
                controls,
                "local-search-create-mode-btn",
                "切换创建笔记",
                "file-plus",
                "choice"
            );
            this.createNoteBtn = button;
            bindInputFocusGuard(button, () => core.searchInput);
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                void core.createFlow?.toggleInputMode?.();
            });
        }

        // 搜索记录从输入框左侧移入统一右侧动作区。
        {
            const { button } = this._createInputAction(
                controls,
                "",
                "搜索记录",
                "history"
            );
            this.historyBtn = button;
            button.setAttribute("aria-haspopup", "dialog");
            button.setAttribute("aria-expanded", "false");
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                this.openHistoryDropdown(button);
            });
        }

        // 末尾固定一个动作槽：Create 只清标题；Search 有内容时只清搜索词；空搜索时打开结果视图。
        if (core.workbenchPresentation) {
            const { button } = this._createInputAction(controls, "local-search-workbench-tools", "展开筛选工具", "list-filter", "choice");
            core.workbenchToolsButton = button;
            button.setAttribute("aria-expanded", "false");
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                if (core.createFlow?.isCreateView?.()) return;
                core._releaseSearchFocusForControl();
                core.dropdown.close();
                core.workbenchToolsExpanded = !core.workbenchToolsExpanded;
                core._syncWorkbenchPresentation();
            });
        }
        {
            const { button } = this._createInputAction(
                controls,
                "local-search-view-btn",
                "结果视图",
                "list"
            );
            this.resultViewBtn = button;
            button.setAttribute("aria-expanded", "false");
            // Clearing deliberately ends editing. Do not first prevent native
            // focus transfer: WebKit may then omit the click that clears it.
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();

                // 橡皮擦只清当前输入，保留条件与模式；清空后不重新拉起键盘。
                const input = core.searchInput;
                if (input?.ownerDocument?.activeElement === input) input.blur();
                if (core.createFlow?.isCreateMode?.() || core.createFlow?.activeInputHasValue?.()) {
                    core.createFlow.clearActiveInput({ keepFocus: false });
                    return;
                }
                if (core.dropdown.closeIfSameAnchor(this.resultViewBtn)) {
                    this.sync();
                    return;
                }
                this.openViewDropdown(this.resultViewBtn);
            });
        }

        if (this.searchResultControlsHost) {
            this.searchResultControlsHost.appendChild(controls);
        }
        this.sync();
        this.syncViewMode();
    },


    activeViewId() {
        const core = this.owner;
        return normalizeResultViewId(core.plugin.settings.activeResultView);
    },

    
    activeViewConfig() {
        const core = this.owner;
        const id = this.activeViewId();
        return normalizeResultViewConfig(core.plugin.settings.resultViews?.[id], DEFAULT_RESULT_VIEWS[id]);
    },
};

