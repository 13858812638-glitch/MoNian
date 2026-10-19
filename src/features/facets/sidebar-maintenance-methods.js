// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { editableTagError, metadataPropertySample, normalizeEditableTagValue, parseMetadataPropertyInput, validateEditablePropertyKey } from "../../data/properties/property-types.js";
import { isExclusivePropertySelectionValue, propertyValueDisplay, propertyValueKey } from "../../data/properties/property-values.js";
import { NO_TAGS_FILTER_VALUE, tagIdentityKey } from "../../data/tags/tag-values.js";
import { openPickerDeleteDialog, openSearchRenameDialog } from "../../ui/dialogs/dialog-session.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { normalizeVaultFolderPath } from "../../utils/vault-paths.js";
import { propertyPoolEntry } from "../filters/pool-values.js";
import { createFolderExclusionController } from "../folders/exclusions.js";
import { Notice, TFolder } from "obsidian";
// Instance method owner. `this` is the unchanged SearchFacetController instance. No additional state store.

// Merge into an existing sibling directory. Use FileOperationService for each
// move (vault rename, link update, index reconciliation and name collision
// allocation). Never overwrite an existing file or silently discard content.
async function mergeRenamedFolder(plugin, source, target) {
    const operations = plugin.fileOperations;
    let migrated = 0;
    const original = source.path;
    const merge = async (from, into) => {
        for (const child of [...from.children]) {
            operations.assertCurrent(child);
            const wanted = `${into.path}/${child.name}`;
            const occupied = plugin.app.vault.getAbstractFileByPath(wanted);
            if (child instanceof TFolder && occupied instanceof TFolder) {
                await merge(child, occupied);
            } else {
                const safePath = occupied && occupied !== child
                    ? operations._availablePath(child, into.path) : wanted;
                await operations.renameFile(child, safePath);
                migrated++;
            }
        }
        if (from.children.length) throw new Error(`源文件夹仍有未迁移内容：${from.path}`);
        await operations.deleteFolder(from); // only an EMPTY folder is recycled
    };
    try { await merge(source, target); }
    catch (error) {
        throw new Error(`已迁入 ${migrated} 项，其余操作已停止；不会覆盖同名文件。${error?.message || error}`);
    }
    // Child renames already go through the original path-lifecycle owner.
    // Remap the source folder's own filters, appearance and tree order too.
    plugin._migrateRenameSettings(original, target.path, { descendants: true, folderRename: true });
    await plugin.saveSettings();
    return { oldPath: original, newPath: target.path, merged: true, migrated };
}

export const SearchFacetController_sidebar_maintenance_methods = {

    // Shared creation workflow: the Folder Picker header and the mobile
    // Sidebar Tools command invoke the same dialog, validation and vault owner.
    // No duplicate modal, folder writer or second navigation state is created.
    openFolderCreateDialog({ ownerPanel = null, parentPath = null, onCreated = null } = {}) {
        const core = this.owner;
        if (!core || core._destroyed) return false;
        const selection = core.createFlow?.searchResultFilterState?.() || core.filterState;
        const folders = [...(selection?.folders || [])];
        const inferredParent = folders.length === 1 && folders[0] !== "/" ? folders[0] : "";
        const parent = normalizeVaultFolderPath(parentPath ?? inferredParent);
        return openSearchRenameDialog(core, {
            ownerPanel,
            kind: "create-folder",
            title: "新建文件夹",
            message: `位置：${parent || "仓库根目录"}`,
            fieldLabel: "文件夹名称",
            placeholder: "文件夹名称",
            confirmText: "创建",
            errorText: "创建文件夹失败",
            onSubmit: async raw => {
                const name = String(raw || "").trim();
                if (!name || name === "." || name === ".." || /[\\/:*?"<>|\x00-\x1f]/.test(name)) {
                    throw new Error("文件夹名称不能包含路径分隔符或非法字符");
                }
                const path = parent ? `${parent}/${name}` : name;
                const folder = await core.plugin.fileOperations.createFolder(path);
                new Notice(`已创建文件夹：${folder.path}`);
                if (!core._destroyed) onCreated?.(folder);
                return true;
            }
        });
    },

    sidebarMaintenanceModes(kind) {
        const modes = {
            folder: [
                { id: "rename", icon: "pencil", title: "重命名文件夹" },
                { id: "delete", icon: "trash-2", title: "删除文件夹", danger: true },
                { id: "color", icon: "palette", title: "设置文件夹颜色" },
                { id: "result-exclude", icon: "eye-off", title: "结果排除文件夹" }
            ],
            tag: [
                { id: "delete", icon: "trash-2", title: "删除标签", danger: true },
                { id: "rename", icon: "pencil", title: "重命名标签" }
            ],
            "property-key": [
                { id: "pin", icon: "pin", title: "固定属性到右侧" },
                { id: "exclude", icon: "eye-off", title: "排除属性" },
                { id: "result", icon: "panels-top-left", title: "结果卡属性" },
                { id: "delete", icon: "trash-2", title: "删除属性键和值", danger: true },
                { id: "rename", icon: "pencil", title: "重命名属性键和值" }
            ],
            "property-value": [
                { id: "delete", icon: "trash-2", title: "删除属性值", danger: true },
                { id: "rename", icon: "pencil", title: "重命名属性值" }
            ]
        };
        return (modes[kind] || []).map(mode => ({ ...mode, activeTitle: `退出${mode.title}` }));
    },


    canSidebarMaintenance(kind, mode, descriptor = {}) {
        if (!this.sidebarMaintenanceModes(kind).some(item => item.id === mode)) return false;
        if (kind === "folder") return (descriptor.path || "/") !== "/" || mode === "color";
        if (kind === "tag") return Boolean(descriptor.path) && descriptor.path !== NO_TAGS_FILTER_VALUE;
        if (!descriptor.key) return false;
        if (kind === "property-value" && (descriptor.value === undefined
            || isExclusivePropertySelectionValue(descriptor.value))) return false;
        return !["rename", "delete"].includes(mode) || !this.owner?.plugin?.isVirtualPropertyKey(descriptor.key);
    },


    sidebarMaintenancePresentation(kind, mode, descriptor = {}) {
        const definition = this.sidebarMaintenanceModes(kind).find(item => item.id === mode);
        if (!definition) return null;
        const core = this.owner, key = descriptor.key, path = descriptor.path;
        const presentation = { ...definition, label: definition.title, pressed: false };
        if (kind === "folder" && mode === "result-exclude") {
            const state = createFolderExclusionController({
                read: () => core.plugin.settings.resultExcludedFolders,
                write: paths => core.plugin.setResultExcludedFolders(paths)
            }).state(path);
            return { ...presentation, icon: state.hidden ? "eye-off" : "eye", pressed: state.hidden,
                disabled: state.inherited,
                label: state.inherited ? `${path} 随上级排除` : `${state.explicit ? "恢复结果显示" : "从结果中隐藏文件夹"} ${path}` };
        }
        if (kind === "property-key" && mode === "pin") {
            const pinned = propertyPoolEntry(core.resultControls?._filterPoolById?.("property"), key).pinnedRight;
            return { ...presentation, icon: pinned ? "pin-off" : "pin", pressed: pinned,
                label: `${pinned ? "取消固定" : "固定"} ${key} 到右侧` };
        }
        if (kind === "property-key" && ["exclude", "result"].includes(mode)) {
            const hidden = (mode === "exclude" ? core.plugin.settings.excludedKeys : core.plugin.settings.hiddenResultPropertyKeys)?.includes(key);
            return { ...presentation, icon: hidden ? "eye-off" : "eye", pressed: Boolean(hidden),
                label: mode === "exclude" ? `${hidden ? "恢复显示属性" : "隐藏属性"} ${key}`
                    : `${hidden ? "在结果卡显示" : "从结果卡隐藏"} ${key}` };
        }
        const value = kind === "property-value" ? `${key}: ${propertyValueDisplay(descriptor.value)}` : path || key || "";
        presentation.label = `${definition.title} ${value}`.trim();
        return presentation;
    },


    runSidebarMaintenance(kind, mode, descriptor = {}, anchor = null, { onChange = null } = {}) {
        const core = this.owner;
        if (!core || core._destroyed || !this.canSidebarMaintenance(kind, mode, descriptor)) return false;
        const plugin = core.plugin;
        const changed = detail => { if (!core._destroyed) onChange?.(detail || {}); };
        const run = operation => Promise.resolve().then(operation).then(result => {
            changed(result); return result;
        }).catch(error => { new Notice(error?.message || "操作失败，请重试"); return false; });
        if (kind === "folder") {
            const path = descriptor.path || "/";
            const folder = path === "/" ? core.app.vault.getRoot() : core.app.vault.getAbstractFileByPath(path);
            if (!(folder instanceof TFolder)) { new Notice("文件夹已不存在，请重新选择"); return false; }
            if (mode === "color") return this._openFolderColorEditor(path, changed);
            if (path === "/") return false;
            if (mode === "result-exclude") return run(() => {
                const exclusion = createFolderExclusionController({
                    read: () => plugin.settings.resultExcludedFolders,
                    write: paths => plugin.setResultExcludedFolders(paths),
                    isLive: () => !core._destroyed
                });
                return exclusion.toggle(path);
            });
            if (mode === "rename") return openSearchRenameDialog(core, {
                title: "重命名文件夹", message: `位置：${normalizeVaultFolderPath(folder.parent?.path) || "仓库根目录"}`,
                fieldLabel: "文件夹名称", initialValue: folder.name, placeholder: "文件夹名称", errorText: "重命名文件夹失败",
                onSubmit: async name => {
                    if (/[\\/:*?"<>|\x00-\x1f]/.test(name) || name === "." || name === "..") throw new Error("文件夹名称不能包含路径分隔符或非法字符");
                    const parent = normalizeVaultFolderPath(folder.parent?.path);
                    const nextPath = parent ? `${parent}/${name}` : name;
                    const existing = core.app.vault.getAbstractFileByPath(nextPath);
                    if (existing && existing !== folder && descriptor.mergeExisting) {
                        if (!(existing instanceof TFolder)) throw new Error("目标已存在同名文件，不能合并文件夹");
                        const detail = await mergeRenamedFolder(plugin, folder, existing);
                        changed(detail); return true;
                    }
                    await plugin.fileOperations.renameFile(folder, nextPath);
                    changed({ oldPath: path, newPath: folder.path }); return true;
                }
            });
            return openPickerDeleteDialog(core, {
                title: "删除文件夹", message: `将删除文件夹「${path}」及其中的全部文件和子文件夹，并按 Obsidian 的设置移入回收站。`,
                onConfirm: async () => { await plugin.fileOperations.deleteFolder(folder); changed({ oldPath: path, deleted: true }); return true; }
            });
        }
        if (kind === "tag") {
            const path = String(descriptor.path || "");
            if (!path || path === NO_TAGS_FILTER_VALUE) return false;
            if (mode === "rename") return openSearchRenameDialog(core, {
                title: "重命名标签", message: `当前标签：${path}`, fieldLabel: "标签名称",
                initialValue: descriptor.name || path.split("/").pop(),
                onSubmit: async raw => {
                    const name = normalizeEditableTagValue(raw), error = editableTagError(name);
                    if (error) throw new Error(error);
                    if (name.includes("/")) throw new Error("这里只修改当前名称；层级移动请使用拖拽");
                    const parent = descriptor.parentPath ?? path.split("/").slice(0, -1).join("/");
                    const nextPath = parent ? `${parent}/${name}` : name;
                    if (tagIdentityKey(nextPath) === tagIdentityKey(path)) return true;
                    await plugin.migrateVaultTagTreePrefix(path, nextPath, { mergeExisting: descriptor.mergeExisting === true });
                    changed({ oldPath: path, newPath: nextPath }); return true;
                }
            });
            return openPickerDeleteDialog(core, {
                title: "删除标签", message: `将从整个仓库删除标签「${path}」及其子标签；Frontmatter 与正文中的对应标签都会一起删除。`,
                onConfirm: async () => { await plugin.deleteVaultTagTreePrefix(path); changed({ oldPath: path, deleted: true }); return true; }
            });
        }
        const key = String(descriptor.key || "");
        if (!key) return false;
        if (["rename", "delete"].includes(mode) && plugin.isVirtualPropertyKey(key)) return false;
        const isValue = kind === "property-value", value = descriptor.value;
        const propertyType = plugin.propertyCatalogType(key, metadataPropertySample(plugin.fileMetaCache.values(), key));
        if (mode === "rename") {
            const retry = {};
            return openSearchRenameDialog(core, {
                title: isValue ? "重命名属性值" : "重命名属性键",
                message: isValue ? `当前值：${key}：${propertyValueDisplay(value)}` : `当前属性键：${key}`,
                fieldLabel: isValue ? "属性值名称" : "属性键名称",
                initialValue: isValue ? propertyValueDisplay(value) : key,
                onSubmit: async raw => {
                    const next = isValue ? parseMetadataPropertyInput(raw, propertyType) : validateEditablePropertyKey(raw, plugin.settings.excludedKeys);
                    if (isValue ? propertyValueKey(next) === propertyValueKey(value) : next === key) return true;
                    if (isValue) await plugin.renameVaultPropertyValue(key, value, next, propertyType);
                    else await plugin.renameVaultPropertyKey(key, next, retry, { mergeExisting: descriptor.mergeExisting === true });
                    changed(isValue ? { key, oldValue: value, newValue: next } : { oldKey: key, newKey: next }); return true;
                }
            });
        }
        if (mode === "delete") return openPickerDeleteDialog(core, {
            title: isValue ? "删除属性值" : "删除属性键",
            message: isValue ? `将从整个仓库删除属性值「${key}：${propertyValueDisplay(value)}」。` : `将从整个仓库删除属性「${key}」以及这个属性下的全部值。`,
            onConfirm: async () => {
                if (isValue) await plugin.deleteVaultPropertyValue(key, value, propertyType);
                else await plugin.deleteVaultPropertyKey(key);
                changed({ key, value, deleted: true }); return true;
            }
        });
        if (mode === "pin") return run(() => core.resultControls._updatePropertyPoolEntry("property", key,
            current => ({ ...current, pinnedRight: !current.pinnedRight })));
        return run(() => plugin._withPropertyCatalogMutation(async () => {
            const before = plugin._propertyMaintenanceSettingsSnapshot();
            if (mode === "exclude") {
                const excluded = new Set(plugin.settings.excludedKeys || []);
                const exclude = !excluded.has(key);
                exclude ? excluded.add(key) : excluded.delete(key);
                plugin.settings.excludedKeys = normalizeUniqueStringList([...excluded]);
                if (exclude) {
                    plugin._mutatePropertyFilterPoolEntries(entries => {
                        if (entries[key]) entries[key] = { ...entries[key], pinnedRight: false };
                    });
                    plugin._transformSearchFilters(state => { state.properties.delete(key); });
                }
            } else if (mode === "result") {
                const hidden = new Set(plugin.settings.hiddenResultPropertyKeys || []);
                hidden.has(key) ? hidden.delete(key) : hidden.add(key);
                plugin.settings.hiddenResultPropertyKeys = normalizeUniqueStringList([...hidden]);
            }
            const error = await plugin._savePropertyMaintenanceSettings(before, { changed: 0 }, "属性显示设置");
            plugin._refreshFilterPoolCores?.();
            plugin._refreshActiveResultCards?.({ geometryChanged: true });
            if (error) throw error;
            return true;
        }));
    },
};

