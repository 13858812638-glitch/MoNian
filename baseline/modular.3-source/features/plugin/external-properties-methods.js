// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { disposePickerCleanup } from "../../core/picker-cleanup.js";
import { sharedFolderAncestors } from "../../data/folders/folder-tree.js";
import { validateEditablePropertyKey } from "../../data/properties/property-types.js";
import { LocalSearchOverlayHost } from "../../ui/overlays/LocalSearchOverlayHost.js";
import { SearchDropdownController } from "../../ui/overlays/SearchDropdownController.js";
import { renderSharedFolderTreePicker } from "../../ui/pickers/folder-picker.js";
import { configureSharedPickerHeader } from "../../ui/pickers/picker-header.js";
import { createSharedPickerSelectionStrip } from "../../ui/pickers/selection-strip.js";
import { activeWorkspaceDocument } from "../../utils/dom.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { BatchMetadataController } from "../batch/BatchMetadataController.js";
import { createFolderExclusionController } from "../folders/exclusions.js";
import { SearchSelectionController } from "../selection/SearchSelectionController.js";
import { Notice, TFile, TFolder } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_external_properties_methods = {


    // V4 · Virtual Properties: key/value search projection only. The source
    // project plugin remains sole owner of project data. No copying into YAML
    // or the persistent GLS index; metadata editing consumes the raw property index.
    registerVirtualProperties(source = {}) {
        if (this._unloaded || !source || typeof source !== "object"
            || typeof source.getProperties !== "function") return null;
        const id = String(source.id || "").trim();
        const keys = [...new Set((Array.isArray(source.keys) ? source.keys : [])
            .map(key => String(key || "").trim()).filter(Boolean))];
        if (!id || !keys.length || keys.some(key => ["__proto__", "constructor", "prototype"].includes(key))) return null;
        // The provider is replaced atomically. An obsolete handle cannot remove
        // a newer generation, even across caller reloads.
        const token = { id, keys, getProperties: source.getProperties, errorLogged: false };
        this._externalPropertyProviders.set(id, token);
        this._invalidateVirtualProperties(null);
        let disposed = false;
        return Object.freeze({
            invalidate: paths => {
                if (disposed || this._unloaded || this._externalPropertyProviders.get(id) !== token) return false;
                this._invalidateVirtualProperties(paths);
                return true;
            },
            dispose: () => {
                if (disposed) return false;
                disposed = true;
                if (this._externalPropertyProviders.get(id) !== token) return false;
                this._externalPropertyProviders.delete(id);
                if (!this._unloaded) this._invalidateVirtualProperties(null);
                return true;
            }
        });
    },


    isVirtualPropertyKey(key) {
        return [...this._externalPropertyProviders.values()]
            .some(source => source.keys.includes(String(key || "")));
    },


    _searchMeta(meta) {
        if (!meta?.path || !this._externalPropertyProviders.size) return meta;
        const cached = this._externalMetaProjectionCache.get(meta.path);
        if (cached?.raw === meta) return cached.projected;
        const overlay = Object.create(null);
        const real = meta.properties || {};
        for (const source of this._externalPropertyProviders.values()) {
            let properties;
            try { properties = source.getProperties(meta.path, real); }
            catch (error) {
                if (!source.errorLogged) {
                    source.errorLogged = true;
                    console.warn("GLS 虚拟属性提供器失败", source.id, error);
                }
                continue;
            }
            if (!properties || typeof properties !== "object" || Array.isArray(properties)) continue;
            for (const key of source.keys) {
                // A declared project property belongs to its provider. An empty
                // value must also mask legacy YAML after an owner is removed.
                if (Object.prototype.hasOwnProperty.call(overlay, key)
                    || !Object.prototype.hasOwnProperty.call(properties, key)) continue;
                const raw = properties[key];
                const values = (Array.isArray(raw) ? raw : [raw])
                    .filter(value => typeof value === "string" && value.trim())
                    .map(value => value.trim());
                overlay[key] = [...new Set(values)];
            }
        }
        const projected = Object.keys(overlay).length
            ? { ...meta, properties: { ...real, ...overlay } }
            : meta;
        this._externalMetaProjectionCache.set(meta.path, { raw: meta, projected });
        return projected;
    },


    _invalidateVirtualProperties(paths = null) {
        this._clearResidentSearchResults();
        let changedPaths = null;
        if (Array.isArray(paths) || paths instanceof Set) {
            changedPaths = new Set([...paths].map(value => String(value || "").trim()).filter(Boolean));
            if (!changedPaths.size) return;
            for (const path of changedPaths) this._externalMetaProjectionCache.delete(path);
        } else this._externalMetaProjectionCache.clear();
        this._forEachActiveSearchCore(core => {
            if (!core?._destroyed) core._queueResultIndexChanges(changedPaths, { refreshPools: true });
        });
    },


    // Reuse GLS's existing overlay, folder-tree Primitive and swipe owner. The
    // public caller sees only a disposable handle and a validated folder path.
    openExternalFolderPicker(request = {}) {
        const exclusionRequest = request.exclusion;
        const exclusionMode = typeof exclusionRequest?.read === "function" && typeof exclusionRequest?.write === "function";
        if (this._unloaded || (!exclusionMode && typeof request?.onChoose !== "function")) return null;
        let picking = false, closed = false, panel = null, overlayEl = null, picker = null, current = null;
        const anchor = request.anchor;
        const overlayHost = new LocalSearchOverlayHost({
            className: "local-search-command-overlay",
            ownerDocument: anchor?.ownerDocument || activeWorkspaceDocument(this.app),
            ownerElement: anchor,
            swipeBack: this.swipeBack,
            onClose: () => {
                closed = true;
                disposePickerCleanup(panel);
                this._hoverHintObserver?.forgetRoot(overlayEl);
                this._externalFolderPickers.delete(handle);
                if (anchor?.isConnected && !anchor.closest("[hidden]")) anchor.focus({ preventScroll: true });
            }
        });
        const handle = Object.freeze({ get active() { return !closed; }, close: () => overlayHost.close() });
        this._externalFolderPickers.add(handle);
        overlayEl = overlayHost.open();
        panel = overlayEl.createDiv({
            cls: "local-search-dropdown local-search-move-dropdown local-search-picker-dropdown local-search-centered-picker-surface local-search-command-shared-picker"
        });
        panel.createDiv({ cls: "local-search-dropdown-title" });
        const header = configureSharedPickerHeader(panel, {
            headingText: String(request.title || "选择文件夹"), icon: "folder", countText: exclusionMode ? 0 : null
        });
        overlayHost.createCloseButton(panel, { positioned: true });
        const refresh = () => {
            if (closed) return;
            picker?.rerender();
            if (!exclusion) return;
            const paths = exclusion.paths();
            if (header.count) { header.count.setText(String(paths.length)); header.count.setAttribute("aria-label", `已排除 ${paths.length} 个文件夹`); }
            current?.render(paths.map(path => ({ key: path, text: path, title: `取消排除 ${path}`, onRemove: () => void exclusion.remove(path) })));
        };
        const exclusion = exclusionMode ? createFolderExclusionController({
            read: exclusionRequest.read, write: exclusionRequest.write,
            isLive: () => !closed && !this._unloaded, onChange: refresh
        }) : null;
        if (exclusion) current = createSharedPickerSelectionStrip(panel, { onClear: () => void exclusion.clear() });
        const initial = String(request.initialPath || "");
        const expanded = new Set(sharedFolderAncestors(initial));
        for (const path of exclusion?.paths() || []) for (const ancestor of sharedFolderAncestors(path)) expanded.add(ancestor);
        picker = renderSharedFolderTreePicker({
            app: this.app, plugin: this, panel, expanded, selectedPath: initial,
            rootPath: "", autoLocate: !exclusion,
            isActivePath: exclusion ? () => false : path => path === initial,
            renderTrailingForPath: exclusion ? (row, {path}) => exclusion.renderAction(row, path) : null,
            includeExcluded: request.includeExcluded === true,
            searchPlaceholder: String(request.placeholder || (exclusion ? "搜索要排除的文件夹…" : "搜索文件夹…")),
            onChoose: path => {
                if (closed || picking) return;
                if (exclusion) { void exclusion.toggle(path); return; }
                const folder = path ? this.app.vault.getAbstractFileByPath(path) : this.app.vault.getRoot();
                if (!(folder instanceof TFolder) || (!path && request.allowRoot === false)
                    || (typeof request.acceptPath === "function" && !request.acceptPath(path))) {
                    new Notice("此文件夹不可选，请选择其他位置"); return;
                }
                picking = true;
                void Promise.resolve().then(() => request.onChoose(path)).then(result => {
                    if (closed) return;
                    if (result === false) picking = false; else overlayHost.close();
                }).catch(error => { picking = false; if (!closed) new Notice(error?.message || "文件夹选择失败"); });
            }
        });
        refresh();
        this._hoverHintObserver?.observeRoot(overlayEl);
        return handle;
    },


    openExternalPropertyEditor(request = {}) {
        if (this._unloaded || typeof request.commit !== "function") return null;
        const key = validateEditablePropertyKey(request.key, []);
        const propertyTarget = { label: String(request.label || key),
            values: normalizeUniqueStringList(request.values || []),
            catalog: normalizeUniqueStringList(request.catalog || []), commit: request.commit };
        const anchor = request.anchor;
        if (!anchor?.isConnected) return null;
        let closed = false, resolveFinished, observer, leafEvent;
        const finished = new Promise(resolve => { resolveFinished = resolve; });
        const overlayHost = new LocalSearchOverlayHost({
            className: "local-search-command-overlay",
            ownerDocument: anchor.ownerDocument, swipeBack: this.swipeBack,
            ownerElement: anchor,
            canClose: () => !owner.dropdown.busy,
            onClose: () => {
                if (closed) return;
                closed = true; owner._destroyed = true;
                observer?.disconnect(); owner.dropdown.destroy(); controller.destroy(); owner.selection.destroy();
                if (leafEvent) this.app.workspace.offref(leafEvent);
                this._hoverHintObserver?.forgetRoot(root);
                this._externalPropertyPickers.delete(handle);
                if (anchor.isConnected && !anchor.closest("[hidden]")) anchor.focus({ preventScroll: true });
                resolveFinished();
            }
        });
        const root = overlayHost.open();
        const owner = {
            app: this.app, plugin: this, containerEl: root, _destroyed: false,
            popupSurfaceHost: () => root,
            _releaseSearchFocusForControl() {},
            _scheduleResultIndexUpdate: () => queueMicrotask(() => {
                if (!closed && !owner.dropdown.isOpen) overlayHost.close();
            }),
            _refreshCurrentResultsAfterMutation: () => request.onChanged?.()
        };
        owner.selection = new SearchSelectionController(owner);
        owner.dropdown = new SearchDropdownController(owner);
        const controller = new BatchMetadataController(owner);
        const handle = Object.freeze({ get active() { return !closed; }, get busy() { return owner.dropdown.busy; }, finished,
            close: options => overlayHost.close(options) });
        this._externalPropertyPickers.add(handle);
        try {
            const session = controller.open(anchor, { initialAction: "property", propertyKey: key, propertyTarget });
            if (!session) { overlayHost.close(); return null; }
            overlayHost.createCloseButton(session.panel, { positioned: true });
            this._hoverHintObserver?.observeRoot(root);
            observer = new anchor.ownerDocument.defaultView.MutationObserver(() => {
                if (!anchor.isConnected || anchor.closest("[hidden]")) overlayHost.close({ force: true });
            });
            observer.observe(anchor.ownerDocument.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
            leafEvent = this.app.workspace?.on?.("active-leaf-change", () => {
                if (anchor.checkVisibility?.() === false) overlayHost.close({ force: true });
            });
            return handle;
        } catch (error) { overlayHost.close(); throw error; }
    },


    async moveExternalFiles(request = {}) {
        if (this._unloaded || !this.fileOperations) throw new Error("GLS 文件操作尚未就绪");
        const folderPath = String(request?.targetFolder ?? "").trim();
        const folder = folderPath ? this.app.vault.getAbstractFileByPath(folderPath) : this.app.vault.getRoot();
        if (!(folder instanceof TFolder)) throw new Error("目标文件夹不存在");
        const paths = [...new Set((Array.isArray(request.paths) ? request.paths : [])
            .map(item => String(typeof item === "string" ? item : item?.path || "").trim()).filter(Boolean))];
        const files = [];
        const destinations = new Set();
        for (const path of paths) {
            const file = this.app.vault.getAbstractFileByPath(path);
            if (!(file instanceof TFile)) throw new Error(`文件不存在：${path}`);
            const destination = folderPath ? `${folderPath}/${file.name}` : file.name;
            if (destinations.has(destination)) throw new Error(`本批文件存在同名目标：${destination}`);
            destinations.add(destination);
            const conflict = this.app.vault.getAbstractFileByPath(destination);
            if (conflict && conflict !== file) throw new Error(`目标存在同名文件：${destination}`);
            files.push(file);
        }
        // Existing FileOperationService owns the write, rename settling and
        // notices; no second Obsidian rename pathway in Workbench.
        if (!files.length) return { moved: [], failed: [] };
        return this.fileOperations.moveFiles(files, folderPath);
    },
};

