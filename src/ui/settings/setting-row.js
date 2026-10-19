// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { Setting } from "obsidian";


/**
 * 设置页共享选择器 Overlay。
 * 不再使用独立 Obsidian Modal；文件夹与模板文件都复用搜索弹窗现有
 * local-search-dropdown / Picker Tree 结构与实体 Surface 样式。
 */
// BEGIN SHARED SETTINGS — generated from shared/settings.js
// Native Setting keeps its components and callbacks. Plugin rows own their DOM
// classes so host settings snippets cannot become a second layout owner.
export function createPluginSettingClass(NativeSetting) {
    return class PluginSettingRow extends NativeSetting {
        constructor(parent) {
            super(parent);
            for (const [key, nativeClass, ownClass] of [
                ["settingEl", "setting-item", "ui-setting-row"],
                ["infoEl", "setting-item-info", "ui-setting-info"],
                ["nameEl", "setting-item-name", "ui-setting-name"],
                ["descEl", "setting-item-description", "ui-setting-description"],
                ["controlEl", "setting-item-control", "ui-setting-control"]
            ]) {
                this[key].classList.replace(nativeClass, ownClass);
            }
        }
        addToggle(callback) {
            return super.addToggle(control => {
                control.toggleEl.classList.replace("checkbox-container", "ui-setting-toggle");
                callback(control);
            });
        }
        addText(callback) {
            return super.addText(control => {
                control.inputEl.classList.add("ui-setting-input");
                callback(control);
            });
        }
        addTextArea(callback) {
            return super.addTextArea(control => {
                control.inputEl.classList.add("ui-setting-input");
                callback(control);
            });
        }
        addButton(callback) {
            return super.addButton(control => {
                control.buttonEl.classList.add("ui-setting-action");
                callback(control);
                if (control.buttonEl.classList.contains("mod-cta")) {
                    control.buttonEl.classList.replace("mod-cta", "ui-setting-primary");
                }
            });
        }
        addPicker(callback) {
            this.settingEl.classList.add("ui-setting-block");
            return super.addButton(control => {
                control.buttonEl.classList.add("ui-setting-picker");
                callback(control);
            });
        }
        addExtraButton(callback) {
            return super.addExtraButton(control => {
                control.extraSettingsEl.classList.add("ui-setting-icon");
                callback(control);
            });
        }
    };
}

// END SHARED SETTINGS

export const SearchSettingRow = createPluginSettingClass(Setting);
