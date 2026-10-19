// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { createSearchInput } from "../../ui/components/input-controls.js";
import { createDialogSession } from "../../ui/dialogs/dialog-session.js";
import { configureSharedPickerHeader, createPickerHeaderIconAction } from "../../ui/pickers/picker-header.js";
import { hostWindow, isDomHTMLElement } from "../../utils/dom.js";
import { normalizeHexColor, normalizeResultFolderColors } from "../folders/folder-colors.js";
import { Notice, TFolder } from "obsidian";
// Instance method owner. `this` is the unchanged SearchFacetController instance. No additional state store.
export const SearchFacetController_folder_colors_methods = {


    _resultFolderDefaultColor(theme) {
        const core = this.owner;
        const host = core?.containerEl?.isConnected
            ? core.containerEl
            : core?.modalEl;
        const token = host
            ? hostWindow(host).getComputedStyle(host).getPropertyValue(
                theme === "dark"
                    ? "--ls-result-folder-default-dark"
                    : "--ls-result-folder-default-light"
            )
            : "";
        return normalizeHexColor(token)
            || (theme === "dark" ? "#99A4B1" : "#748289");
    },


    _resultFolderColorMap() {
        return normalizeResultFolderColors(
            this.owner?.plugin?.settings?.resultFolderColors
        );
    },


    _refreshResultFolderColorViews() {
        this.owner?.plugin?._refreshActiveResultCards?.();
    },


    _applyResultFolderPickerColor(row, path) {
        if (!isDomHTMLElement(row)) return;
        const entry = this._resultFolderColorMap()[path] || {};
        const light = normalizeHexColor(entry.light || "");
        const dark = normalizeHexColor(entry.dark || "");

        row.classList.toggle("has-folder-color-light", Boolean(light));
        row.classList.toggle("has-folder-color-dark", Boolean(dark));

        if (light) {
            row.style.setProperty("--ls-folder-picker-color-light", light);
        } else {
            row.style.removeProperty("--ls-folder-picker-color-light");
        }
        if (dark) {
            row.style.setProperty("--ls-folder-picker-color-dark", dark);
        } else {
            row.style.removeProperty("--ls-folder-picker-color-dark");
        }
    },


    async _setResultFolderThemeColor(path, theme, value) {
        const core = this.owner;
        if (!core?.plugin) return false;

        const current = this._resultFolderColorMap();
        const nextValue = normalizeHexColor(value);
        const entry = {
            light: current[path]?.light || "",
            dark: current[path]?.dark || ""
        };
        entry[theme] = nextValue;

        if (entry.light || entry.dark) current[path] = entry;
        else delete current[path];

        core.plugin.settings.resultFolderColors = current;
        this._refreshResultFolderColorViews();
        if (await core.plugin.saveSettings() === false) {
            throw new Error("设置未能写入，请重试");
        }
        return true;
    },


    async _resetResultFolderColors(path) {
        const core = this.owner;
        if (!core?.plugin) return false;

        const current = this._resultFolderColorMap();
        if (!(path in current)) return false;

        delete current[path];
        core.plugin.settings.resultFolderColors = current;
        this._refreshResultFolderColorViews();
        if (await core.plugin.saveSettings() === false) {
            throw new Error("设置未能写入，请重试");
        }
        return true;
    },


    _openFolderColorEditor(path, onChanged = null) {
        const core = this.owner;
        const ownerPanel = core?.dropdown?.panel || null;
        if (!core || core._destroyed || !core.containerEl?.isConnected) return;
        const folder = path === "/" ? core.app.vault.getRoot() : core.app.vault.getAbstractFileByPath(path);
        if (!(folder instanceof TFolder)) {
            new Notice("文件夹已不存在，请重新选择");
            return;
        }
        const currentPath = () => {
            core.plugin.fileOperations.assertCurrent(folder);
            return folder === core.app.vault.getRoot() ? "/" : folder.path;
        };
        const session = createDialogSession(core, {
            backdropClass: "local-search-picker-dialog-backdrop",
            ownerPanel
        });
        if (!session) return;

        const label = path === "/"
            ? "仓库根目录"
            : (String(path).split("/").filter(Boolean).pop() || path);

        // 调色属于编辑 Dialog，不进入会隐藏父窗的 Picker 导航栈。
        // 与重命名、删除共用遮罩、焦点、Escape 和父窗关闭生命周期。
        const panel = session.setDialog(session.host.createDiv({
            cls: "local-search-confirm-dialog local-search-picker-dialog local-search-picker-dropdown local-search-folder-color-editor-picker local-search-dialog-surface",
            attr: { role: "dialog", "aria-modal": "true", "aria-label": `文件夹颜色 · ${label}` }
        }));
        panel.createDiv({ cls: "local-search-dropdown-title" });
        panel.addEventListener("pointerdown", event => event.stopPropagation());
        panel.addEventListener("click", event => event.stopPropagation());

        const header = configureSharedPickerHeader(panel, {
            headingText: label,
            icon: "palette"
        });
        if (header?.heading) {
            header.heading.title = path === "/" ? "仓库根目录" : path;
        }

        const reset = createPickerHeaderIconAction(header?.actions, {
            icon: "rotate-ccw",
            label: `恢复 ${label} 的默认文件夹颜色`,
            onClick: () => void commit(() => this._resetResultFolderColors(currentPath()), true)
        });
        const close = createPickerHeaderIconAction(header?.actions, {
            icon: "x",
            label: "关闭文件夹调色",
            onClick: () => session.finish(false)
        });

        const body = panel.createDiv({ cls: "local-search-folder-color-editor" });
        const commit = async (write, rebuild = false) => {
            try {
                await write();
            } catch (error) {
                new Notice(`文件夹颜色保存失败：${error?.message || error}`);
            } finally {
                if (!core._destroyed && core.containerEl?.isConnected) onChanged?.();
                if (!session.settled) {
                    if (rebuild) render();
                    else syncResetState();
                }
            }
        };

        const renderThemeRow = (theme, title) => {
            const colors = this._resultFolderColorMap();
            const custom = colors[folder === core.app.vault.getRoot() ? "/" : folder.path]?.[theme] || "";
            const fallback = this._resultFolderDefaultColor(theme);
            const shown = custom || fallback;

            const row = body.createDiv({
                cls: "local-search-folder-color-editor-row"
            });
            const copy = row.createDiv({
                cls: "local-search-folder-color-editor-copy"
            });
            copy.createDiv({
                text: title,
                cls: "local-search-folder-color-editor-label"
            });
            const valueEl = copy.createDiv({
                text: custom ? custom.toUpperCase() : "跟随默认",
                cls: "local-search-folder-color-editor-value"
            });

            const control = row.createEl("label", {
                cls: `local-search-folder-color-editor-control${custom ? " is-custom" : ""}`,
                attr: {
                    title: custom
                        ? `${title}：${custom}`
                        : `${title}：跟随默认`
                }
            });
            const syncPreview = value => {
                const normalized = normalizeHexColor(value) || fallback;
                control.style.setProperty(
                    "--ls-folder-color-swatch",
                    normalized
                );
                control.classList.add("is-custom");
                control.title = `${title}：${normalized}`;
                valueEl.textContent = normalized.toUpperCase();
            };
            control.style.setProperty(
                "--ls-folder-color-swatch",
                shown
            );
            control.createSpan({
                cls: "local-search-folder-color-editor-swatch",
                attr: { "aria-hidden": "true" }
            });

            const input = createSearchInput(control, {
                type: "color",
                cls: "local-search-folder-color-editor-input",
                attr: {
                    "aria-label": `${label} · ${title}`,
                    value: shown
                }
            });
            input.value = shown;

            // iOS 原生颜色面板拖动时，只更新当前控件；绝不销毁 input。
            input.addEventListener("input", () => {
                const next = normalizeHexColor(input.value);
                if (next) syncPreview(next);
            });

            // change 只提交正式数据，不重绘当前 input。
            input.addEventListener("change", () => {
                const next = normalizeHexColor(input.value);
                if (!next) return;
                syncPreview(next);
                void commit(() => this._setResultFolderThemeColor(currentPath(), theme, next));
            });
        };

        const syncResetState = () => {
            const hasCustom = Object.prototype.hasOwnProperty.call(
                this._resultFolderColorMap(),
                folder === core.app.vault.getRoot() ? "/" : folder.path
            );
            if (!reset) return;
            reset.disabled = !hasCustom;
            const resetLabel = hasCustom
                ? `恢复 ${label} 的默认文件夹颜色`
                : `${label} 当前使用默认文件夹颜色`;
            reset.setAttribute("aria-label", resetLabel);
            reset.title = resetLabel;
        };

        const render = () => {
            body.empty();
            renderThemeRow("light", "浅色模式");
            renderThemeRow("dark", "深色模式");
            syncResetState();
        };

        render();
        close?.focus({ preventScroll: true });
    },
};

