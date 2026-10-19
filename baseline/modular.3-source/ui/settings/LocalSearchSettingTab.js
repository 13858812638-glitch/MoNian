// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { VIEW_TYPE } from "../../core/view-types.js";
import { GLS_METADATA_DEFAULT_DIRECTORY } from "../../data/time/time-values.js";
import { createSearchButton } from "../components/input-controls.js";
import { SearchSettingRow } from "./setting-row.js";
import { Notice, PluginSettingTab } from "obsidian";


export class LocalSearchSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
        this._activeModuleId = "search";
        this._moduleCleanups = [];
    }

    _disposeModule() {
        for (const cleanup of this._moduleCleanups.splice(0)) {
            try { cleanup(); } catch (error) { console.warn("设置模块清理失败", error); }
        }
    }

    _renderNavigatorSettings(card) {
        new SearchSettingRow(card)
            .setName("视图设置")
            .setDesc("侧栏显示内容和各页面底栏按钮统一在视图设置中管理。长按导航条目可调整图标、颜色、背景和分隔线。")
            .addButton(control => control
                .setButtonText("打开视图设置")
                .onClick(async () => {
                    control.setDisabled(true);
                    try {
                        if (!await this.plugin.activateView()) return;
                        const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)
                            .find(item => item.view?.plugin === this.plugin && !item.view?._closed);
                        const core = leaf?.view?.core;
                        if (!core || core._destroyed) return;
                        this.app.setting?.close?.();
                        const anchor = core.navigator?.tools?.get("view")?.button;
                        core.resultControls.openViewDropdown(
                            anchor?.isConnected && !anchor.closest("[hidden]") ? anchor : core.resultControls.resultViewBtn,
                            { section: "toolbars" }
                        );
                    } finally { control.setDisabled(false); }
                }));
    }

    display() {
        const { containerEl } = this;
        this._disposeModule();
        containerEl.empty();
        containerEl.addClass("local-search-settings-page");

        const modules = [
            {
                id: "search",
                label: "搜索交互",
                title: "搜索交互",
                desc: "管理搜索交互与再次打开时的结果缓存。",
                render: card => {
                    new SearchSettingRow(card)
                        .setName("常驻搜索结果缓存")
                        .setDesc("保留最近搜索结果与筛选候选，加快再次打开。最多 3 组、合计 20,000 条；占用部分内存，文件变化自动失效。关闭开关立即释放，退出 Obsidian 后不保留。")
                        .addToggle(toggle => toggle
                            .setValue(this.plugin.settings.keepSearchResultsInMemory !== false)
                            .onChange(async value => {
                                this.plugin.settings.keepSearchResultsInMemory = value;
                                if (!value) this.plugin._clearResidentSearchResults();
                                await this.plugin.saveSettings();
                            }));
                    new SearchSettingRow(card)
                        .setName("Tab 快速聚焦搜索框")
                        .setDesc("开启后，在搜索结果界面且当前焦点不在输入框内时，按 Tab 会聚焦搜索框并全选当前搜索词；Shift+Tab 保持原生行为。")
                        .addToggle(toggle => toggle
                            .setValue(this.plugin.settings.enableTabFocusSearch)
                            .onChange(async value => {
                                this.plugin.settings.enableTabFocusSearch = value;
                                await this.plugin.saveSettings();
                            }));
                }
            },
            {
                id: "navigation",
                label: "导航与工具栏",
                title: "导航与工具栏",
                desc: "管理侧栏导航与移动端各页面的底部操作。修改立即生效，不清空搜索和创建内容。",
                render: card => this._renderNavigatorSettings(card)
            },
            {
                id: "mobile",
                label: "移动端",
                title: "移动端",
                desc: "管理移动端打开搜索时的焦点与键盘行为。",
                render: card => {
                    new SearchSettingRow(card)
                        .setName("移动端打开时聚焦搜索框")
                        .setDesc("开启后，移动端每次打开本地搜索都会自动聚焦搜索框并弹出键盘；关闭时保持当前不抢焦点的行为。")
                        .addToggle(toggle => toggle
                            .setValue(this.plugin.settings.focusSearchOnMobileOpen)
                            .onChange(async value => {
                                this.plugin.settings.focusSearchOnMobileOpen = value;
                                await this.plugin.saveSettings();
                            }));
                }
            },
            {
                id: "time",
                label: "时间与历史",
                title: "时间与历史",
                desc: "GLS 时间记录随仓库经 NAS 同步；历史目录必须位于 Obsidian 仓库内。",
                render: card => {
                    new SearchSettingRow(card)
                        .setName("元数据目录")
                        .setDesc("仓库相对路径，默认 GLS-元数据。修改后先复制并验证旧时间记录，再切换位置；旧目录不会自动删除。")
                        .addText(control => {
                            control.setPlaceholder(GLS_METADATA_DEFAULT_DIRECTORY);
                            control.setValue(this.plugin.settings.metadataDirectory);
                            const input = control.inputEl;
                            if (!input) return;
                            let pending = false;
                            const commit = async () => {
                                if (pending || input.value === this.plugin.settings.metadataDirectory) return;
                                pending = true;
                                input.disabled = true;
                                try {
                                    const changed = await this.plugin.changeMetadataDirectory(input.value);
                                    if (changed) new Notice("GLS 元数据目录已更新；旧文件保留，可核对后自行清理");
                                    else input.value = this.plugin.settings.metadataDirectory;
                                } catch (error) {
                                    new Notice(`元数据目录未修改：${error.message || "路径不可用"}`);
                                    input.value = this.plugin.settings.metadataDirectory;
                                } finally {
                                    pending = false;
                                    input.disabled = false;
                                }
                            };
                            input.addEventListener("change", () => void commit());
                            input.addEventListener("keydown", event => {
                                if (event.key !== "Enter" || event.isComposing || event.keyCode === 229) return;
                                event.preventDefault();
                                input.blur();
                            });
                        });
                    new SearchSettingRow(card)
                        .setName("文件时间记录")
                        .setDesc("创建时间固定；正文与普通属性分别记录修改时间。Markdown 保存在 YAML，其他文件保存在元数据目录。最近打开独立记录。");
                }
            },
            {
                id: "files",
                label: "文件操作",
                title: "文件操作",
                desc: "管理删除等高风险文件操作的确认行为。",
                render: card => {
                    new SearchSettingRow(card)
                        .setName("删除文件前确认")
                        .setDesc("开启时删除文件会先显示确认弹窗；在删除弹窗勾选“不再询问”会关闭此项，可随时在这里重新开启。")
                        .addToggle(toggle => toggle
                            .setValue(this.plugin.settings.confirmBeforeDelete !== false)
                            .onChange(async value => {
                                this.plugin.settings.confirmBeforeDelete = value;
                                await this.plugin.saveSettings();
                            }));
                }
            }
        ];
        const moduleById = new Map(modules.map(module => [module.id, module]));
        if (!moduleById.has(this._activeModuleId)) this._activeModuleId = modules[0].id;

        const tabs = containerEl.createDiv({
            cls: "local-search-settings-tabs",
            attr: { role: "tablist", "aria-label": "设置模块" }
        });
        const panel = containerEl.createDiv({
            cls: "local-search-settings-module",
            attr: { role: "tabpanel", id: "local-search-settings-module-panel" }
        });
        const tabButtons = new Map();

        const focusTab = moduleId => {
            const button = tabButtons.get(moduleId);
            if (!button) return;
            button.focus({ preventScroll: true });
            const outer = tabs.getBoundingClientRect();
            const inner = button.getBoundingClientRect();
            if (inner.left < outer.left) tabs.scrollLeft += inner.left - outer.left;
            else if (inner.right > outer.right) tabs.scrollLeft += inner.right - outer.right;
        };

        const renderModule = (id, focus = false) => {
            const module = moduleById.get(id) || modules[0];
            if (panel.dataset.lsModuleId === module.id && panel.childElementCount) {
                if (focus) focusTab(module.id);
                return;
            }
            this._activeModuleId = module.id;
            for (const [moduleId, button] of tabButtons) {
                const selected = moduleId === module.id;
                button.classList.toggle("is-selected", selected);
                button.setAttribute("aria-selected", String(selected));
                button.setAttribute("tabindex", selected ? "0" : "-1");
            }
            this._disposeModule();
            panel.empty();
            panel.dataset.lsModuleId = module.id;
            panel.setAttribute("aria-labelledby", `local-search-settings-tab-${module.id}`);
            const head = panel.createDiv({ cls: "local-search-settings-module-head" });
            head.createDiv({ text: module.title, cls: "local-search-settings-section-title" });
            if (module.desc) head.createDiv({ text: module.desc, cls: "local-search-settings-section-desc" });
            const card = panel.createDiv({ cls: "local-search-settings-card" });
            const group = card.createDiv({ cls: "local-search-settings-group" });
            module.render(group);
            if (focus) focusTab(module.id);
        };

        for (const module of modules) {
            const button = createSearchButton(tabs, "choice", {
                text: module.label,
                cls: "local-search-settings-tab",
                attr: {
                    role: "tab",
                    id: `local-search-settings-tab-${module.id}`,
                    "aria-controls": "local-search-settings-module-panel",
                    "aria-selected": "false",
                    tabindex: "-1"
                }
            });
            button.addEventListener("click", () => renderModule(module.id));
            tabButtons.set(module.id, button);
        }

        tabs.addEventListener("keydown", event => {
            if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            const current = Math.max(0, modules.findIndex(module => module.id === this._activeModuleId));
            let next = current;
            if (event.key === "Home") next = 0;
            else if (event.key === "End") next = modules.length - 1;
            else if (event.key === "ArrowLeft") next = (current - 1 + modules.length) % modules.length;
            else if (event.key === "ArrowRight") next = (current + 1) % modules.length;
            const module = modules[next];
            if (!module) return;
            event.preventDefault();
            renderModule(module.id, true);
        });

        renderModule(this._activeModuleId);
        this.plugin._hoverHintObserver?.observeRoot(containerEl);
    }

    hide() {
        this._disposeModule();
        this.plugin._hoverHintObserver?.forgetRoot(this.containerEl);
        super.hide();
    }

}
