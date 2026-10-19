// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { orderPropertySelectionsForPicker } from "../../data/properties/property-catalog.js";
import { propertyValuePlainDisplay } from "../../data/properties/property-values.js";
import { orderTagSelectionsForPicker } from "../../data/tags/tag-tree.js";
import { NO_TAGS_FILTER_VALUE } from "../../data/tags/tag-values.js";
import { bindInputFocusGuard, createSearchButton } from "../../ui/components/input-controls.js";
import { isDomButton } from "../../utils/dom.js";
import { FilterState } from "../filters/filter-state.js";
import { Notice, TFile, setIcon } from "obsidian";
// Instance method owner. `this` is the unchanged SearchCreateController instance. No additional state store.
export const SearchCreateController_preview_methods = {


    renderQuickCreatePreview(parent, rawTitle) {
        const core = this.owner;
        if (!core || !parent || !this.isCreateView()) return false;
        const title = String(rawTitle || "").replace(/\s+/g, " ").trim();

        const initialType = this._currentCreateType();
        const initialTypeOption = this._createTypeOption(initialType);
        const preview = parent.createDiv({
            cls: "local-search-quick-create-preview",
            attr: { "aria-live": "polite" }
        });
        const summary = preview.createDiv({ cls: "local-search-quick-create-summary" });
        const create = createSearchButton(summary, "action", {
            cls: "local-search-quick-create-primary"
        });
        this._syncQuickCreateButton(create, title);
        bindInputFocusGuard(create, () => core.searchInput);
        create.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            const liveTitle = this.currentCreateTitle();
            if (!liveTitle) return;
            void this.createNewNote(this._currentCreateType(), liveTitle);
        });
        const pendingStatus = summary.createDiv({ cls: "local-search-empty-hint", attr: { role: "status" } });
        const openCreated = createSearchButton(summary, "action", { text: "打开已创建文件", cls: "local-search-action-btn" });
        const retainCreated = createSearchButton(summary, "action", { text: "保留文件并返回", cls: "local-search-action-btn" });
        pendingStatus.hidden = openCreated.hidden = retainCreated.hidden = true;
        openCreated.addEventListener("click", () => {
            const pending = this.createDraft?.pendingCreation;
            const file = pending && core.app.vault.getAbstractFileByPath(pending.path);
            if (file instanceof TFile) void core._openResultFromSearch(file);
            else new Notice("已创建文件已不存在");
        });
        retainCreated.addEventListener("click", () => this.retainPartialFileAndReturn());

        // 元数据格只创建一次。Filter / Type / Folder / Template 变化只刷新文字与图标，
        // 不重建按钮、不替换 Picker anchor，也不复制 CreateDraft 状态。
        const sections = preview.createDiv({ cls: "local-search-quick-create-sections" });
        const section = sections.createDiv({ cls: "local-search-quick-create-section" });
        const metadata = section.createDiv({ cls: "local-search-quick-create-metadata" });
        const refs = new Map();

        const addMeta = ({ kind, label, icon, wide = false, onClick = null }) => {
            const cls = `local-search-quick-create-meta local-search-quick-create-meta-${kind}${wide ? " is-wide" : ""}${onClick ? " is-interactive" : ""}`;
            const field = onClick
                ? createSearchButton(metadata, "field", {
                    cls,
                    attr: { "aria-label": label }
                })
                : metadata.createDiv({ cls });
            if (onClick) {
                field.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (this._createInFlight || this.createDraft?.pendingCreation) return;
                    onClick(field);
                });
            }
            const iconEl = field.createSpan({
                cls: "local-search-quick-create-meta-icon",
                attr: { "aria-hidden": "true" }
            });
            setIcon(iconEl, icon);
            const copy = field.createDiv({ cls: "local-search-quick-create-meta-copy" });
            copy.createDiv({ cls: "local-search-quick-create-meta-label", text: label });
            const valueEl = copy.createDiv({ cls: "local-search-quick-create-meta-value" });
            const ref = { field, iconEl, valueEl, label, icon };
            refs.set(kind, ref);
            return ref;
        };

        addMeta({
            kind: "tags",
            label: "标签",
            icon: "tag",
            wide: true,
            onClick: anchor => core.facets.openTagPicker({ anchor })
        });
        addMeta({
            kind: "properties",
            label: "属性",
            icon: "list",
            wide: true,
            onClick: anchor => core.facets.openPropertyPicker("", anchor)
        });
        addMeta({
            kind: "folder",
            label: "文件夹",
            icon: "folder",
            onClick: anchor => core.facets.showFolderDropdown({ anchor })
        });
        addMeta({
            kind: "type",
            label: "类型",
            icon: initialTypeOption.icon,
            onClick: () => this.cycleCreateType()
        });
        addMeta({
            kind: "template",
            label: "模板",
            icon: "files",
            wide: true,
            onClick: anchor => this._openDraftTemplatePicker(
                anchor,
                this._currentCreateType()
            )
        });

        const refreshMetadata = () => {
            if (!preview.isConnected) return;
            const pending = this.createDraft?.pendingCreation;
            pendingStatus.hidden = openCreated.hidden = retainCreated.hidden = !pending;
            pendingStatus.textContent = pending ? `文件已创建：${pending.path}；属性尚未完成。补写仅更新这个文件。` : "";
            retainCreated.disabled = openCreated.disabled = this._createInFlight;
            const type = this._currentCreateType();
            const typeOption = this._createTypeOption(type);
            const folder = this._effectiveFolder(type) || "仓库根目录";
            const template = this._effectiveTemplateSetting(type);
            const selectedTags = this._activeCreateTags();
            const selectedProperties = this._activeCreateProperties();
            const propertyText = selectedProperties.size
                ? [...selectedProperties.entries()]
                    .map(([key, values]) => `${key}：${values
                        .map(propertyValuePlainDisplay)
                        .join("、")}`)
                    .join(" · ")
                : "无";
            const templateValue = template.enabled && template.path
                ? this._displayCreatePathName(template.path)
                : "未使用";
            const values = {
                tags: {
                    value: selectedTags.length ? selectedTags.join(" · ") : "无",
                    icon: "tag",
                    title: ""
                },
                properties: { value: propertyText, icon: "list", title: "" },
                folder: { value: folder, icon: "folder", title: folder },
                type: { value: typeOption.label, icon: typeOption.icon, title: "点击循环切换：笔记 → 画布 → Excalidraw" },
                template: {
                    value: templateValue,
                    icon: "files",
                    title: template.enabled && template.path ? template.path : "未使用模板"
                }
            };

            for (const [kind, ref] of refs) {
                const next = values[kind];
                if (!next) continue;
                if (ref.icon !== next.icon) {
                    ref.iconEl.replaceChildren();
                    setIcon(ref.iconEl, next.icon);
                    ref.icon = next.icon;
                }
                if (ref.valueEl.textContent !== next.value) {
                    ref.valueEl.textContent = next.value;
                }
                if (next.title) ref.valueEl.setAttribute("title", next.title);
                else ref.valueEl.removeAttribute("title");
                if (isDomButton(ref.field)) {
                    ref.field.disabled = Boolean(this._createInFlight || pending);
                    ref.field.setAttribute("aria-label", `${ref.label}：${next.value}`);
                }
            }
        };

        preview._lsRefreshMetadata = refreshMetadata;
        refreshMetadata();
        return true;
    },


    _displayCreatePathName(path) {
        const leaf = String(path || "").split("/").pop() || String(path || "");
        return leaf.replace(/\.(?:md|canvas|excalidraw)$/i, "") || leaf || "未使用";
    },


    _activeCreateTags() {
        const core = this.owner;
        const selected = [...(this._draft().filterState?.tags || [])]
            .filter(tag => tag !== NO_TAGS_FILTER_VALUE);
        if (!selected.length || !core) return selected;

        // 只投影当前已选标签；层级与 sibling 顺序直接由 pickerTagOrder 决定。
        // 不再为新建摘要 / 落盘扫描完整候选集合。
        return orderTagSelectionsForPicker(
            selected,
            core.plugin.settings.pickerTagOrder
        );
    },


    _activeCreateProperties() {
        const core = this.owner;
        const source = this._draft().filterState?.properties || new Map();
        const eligible = this._normalizeCreateProperties(source);
        if (!core || !eligible.size) {
            return new Map(
                [...eligible].map(([key, values]) => [key, [...values]])
            );
        }

        const ordered = orderPropertySelectionsForPicker(
            eligible,
            core.plugin.settings.pickerPropertyOrder,
            core.plugin.settings.pickerPropertyValueOrder
        );
        return new Map(
            ordered.flatMap(([key, values]) =>
                values.length ? [[key, [...values]]] : []
            )
        );
    },


    _effectiveCreateFilterState() {
        const state = this._draft().filterState?.clone?.() || new FilterState();
        state.tags = new Set(this._activeCreateTags());
        state.properties = new Map(
            [...this._activeCreateProperties().entries()]
                .map(([key, values]) => [key, new Set(values)])
        );
        return state;
    },
};

