// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { FILE_TYPE_ICONS } from "../../data/formats/file-types.js";
import { metadataPropertySample, normalizeMetadataPropertyType, parseMetadataPropertyInput, resolveMetadataPropertyType, validateEditablePropertyKey } from "../../data/properties/property-types.js";
import { materializableCreatePropertySelections, propertyValueKey } from "../../data/properties/property-values.js";
import { NO_TAGS_FILTER_VALUE, normalizeFilterTagSelection, normalizeUniqueTagList, tagIdentityKey } from "../../data/tags/tag-values.js";
import { openTemplateFilePicker } from "../../ui/pickers/template-picker.js";
import { FilterState } from "../filters/filter-state.js";
import { CREATE_TYPE_IDS, createTypeFromFileType, fileTypeFromCreateType, normalizeCreateMetadataMemory, normalizeCreatePropertyTypes, normalizeCreateType } from "./create-model.js";
import { Notice } from "obsidian";
// Instance method owner. `this` is the unchanged SearchCreateController instance. No additional state store.
export const SearchCreateController_draft_and_metadata_methods = {


    captureDraft() {
        if (!this.isCreateMode() || !this.createDraft) return null;
        const title = String(this.owner?.searchInput?.value ?? this.quickCreateTitle);
        return {
            title,
            type: this._currentCreateType(),
            filterSnapshot: this.createDraft.filterState.toSnapshot(),
            propertyTypes: [...this.createDraft.propertyTypes],
            pendingCreation: this._pendingCreationSnapshot(),
            templates: JSON.parse(JSON.stringify(this.createDraft.templates))
        };
    },


    restoreDraft(snapshot) {
        const core = this.owner;
        if (!core) return;
        this.inputMode = "search";
        this.searchFilterState = null;
        this.searchQuery = "";
        this.quickCreateTitle = "";
        if (!snapshot || typeof snapshot !== "object" || !core.allowCreate) {
            this.syncInputModeView();
            return;
        }
        const draft = this._makeCreateDraft();
        draft.propertyTypes = normalizeCreatePropertyTypes(snapshot.propertyTypes);
        draft.pendingCreation = this._pendingCreationSnapshot(snapshot.pendingCreation);
        draft.filterState = FilterState.fromSnapshot(snapshot.filterSnapshot);
        // Date ranges are query predicates, never create metadata.
        draft.filterState.dateRange = null;
        draft.filterState.tags = new Set(normalizeFilterTagSelection(draft.filterState.tags).filter(tag => tag !== NO_TAGS_FILTER_VALUE));
        draft.filterState.properties = this._normalizeCreateProperties(draft.filterState.properties, draft.propertyTypes);
        draft.type = normalizeCreateType(snapshot.type);
        draft.filterState.fileType = fileTypeFromCreateType(draft.type);
        const memory = normalizeCreateMetadataMemory(Object.fromEntries(CREATE_TYPE_IDS.map(type => [type, {
            template: snapshot.templates?.[type] || {}
        }])));
        draft.templates = Object.fromEntries(CREATE_TYPE_IDS.map(type => [type, { ...memory[type].template }]));
        this.searchQuery = core.queryState.raw;
        this.searchFilterState = core.filterState;
        this.createDraft = draft;
        core.filterState = draft.filterState;
        this.inputMode = "create";
        this.quickCreateTitle = String(snapshot.title || "");
        this.syncInputModeView();
    },


    typeOptions() {
        return [
            { value: "md", label: "笔记", icon: FILE_TYPE_ICONS.note },
            { value: "canvas", label: "画布", icon: FILE_TYPE_ICONS.canvas },
            { value: "excalidraw", label: "Excalidraw", icon: FILE_TYPE_ICONS.excalidraw }
        ];
    },


    _propertyTypeForKey(key, propertyTypes = this.createDraft?.propertyTypes) {
        if (propertyTypes?.has(key)) return normalizeMetadataPropertyType(propertyTypes.get(key));
        const core = this.owner;
        const sample = metadataPropertySample(
                core?.plugin?.fileMetaCache?.values?.() || [],
                key
            );
        return core?.plugin?.propertyCatalogType?.(key, sample)
            || resolveMetadataPropertyType(core?.app, key, sample);
    },


    _normalizeCreateProperties(properties, propertyTypes = this.createDraft?.propertyTypes) {
        const clean = materializableCreatePropertySelections(properties);
        return new Map(
            [...clean.entries()].flatMap(([key, values]) => {
                // Virtual filter keys are not real file metadata. Inheriting an
                // active project filter into Create must never stamp project
                // ownership or assignees into the new note's YAML.
                if (this.owner?.plugin?.isVirtualPropertyKey(key)) return [];
                const ordered = [...values];
                if (!ordered.length) return [];
                const normalizedValues = this._propertyTypeForKey(key, propertyTypes) === "multitext"
                    ? ordered
                    : [ordered[0]];
                return [[key, new Set(normalizedValues)]];
            })
        );
    },


    _makeCreateDraft(source = null) {
        const inherited = source instanceof FilterState
            ? source.clone()
            : new FilterState();
        inherited.dateRange = null;
        inherited.tags = new Set(
            normalizeFilterTagSelection(inherited.tags)
                .filter(tag => tag !== NO_TAGS_FILTER_VALUE)
        );
        inherited.properties = this._normalizeCreateProperties(
            inherited.properties, new Map()
        );

        // The current search context is the sole seed, even when a dimension
        // is empty. Never fill it from another type/session's saved metadata.
        const type = normalizeCreateType(this.owner?.externalCreateType || (
            ["note", "canvas", "excalidraw"].includes(inherited.fileType)
                ? createTypeFromFileType(inherited.fileType) : "md"
        ));
        const propertyTypes = new Map();
        const filterState = inherited;
        filterState.fileType = fileTypeFromCreateType(type);
        // A query may include several folders; one new file has one destination.
        // Keep a single explicit destination (including "/"), otherwise use root.
        if (filterState.folders.size !== 1) filterState.folders.clear();

        // Host defaults seed the native draft before it is displayed or saved.
        // Search filters stay separate; users can inspect/edit these properties.
        for (const [key, values] of this._normalizeCreateProperties(
            FilterState.fromSnapshot({ properties: this.owner?.externalCreateProperties || [] }).properties, propertyTypes))
            filterState.properties.set(key, new Set(values));
        if (this.owner?.externalCreateFolder) filterState.folders = new Set([this.owner.externalCreateFolder]);
        return {
            filterState,
            type,
            propertyTypes,
            pendingCreation: null,
            templates: Object.fromEntries(
                CREATE_TYPE_IDS.map(id => [
                    id,
                    { enabled: false, path: "" }
                ])
            )
        };
    },


    _draft() {
        if (!this.createDraft) this.createDraft = this._makeCreateDraft();
        return this.createDraft;
    },


    _currentCreateType() {
        const draft = this._draft();
        const type = createTypeFromFileType(
            draft.filterState?.fileType,
            draft.type || "md"
        );
        draft.type = type;
        draft.filterState.fileType = fileTypeFromCreateType(type);
        return type;
    },


    _syncDraftTypeFromFacetState() {
        if (!this.isCreateView()) return false;
        const draft = this._draft();
        const previousType = normalizeCreateType(draft.type, "md");
        const nextType = createTypeFromFileType(
            draft.filterState?.fileType,
            previousType
        );
        draft.filterState.fileType = fileTypeFromCreateType(nextType);
        if (nextType === previousType) {
            draft.type = nextType;
            return false;
        }

        // Type is a field of this draft, not a key into historical drafts.
        // Folder, title, typed metadata and explicit per-format templates stay
        // attached to the same draft and the frozen search context stays intact.
        draft.type = nextType;
        this.syncInputModeView();
        return true;
    },


    _createTypeOption(type = this._currentCreateType()) {
        return this.typeOptions().find(item => item.value === type) || this.typeOptions()[0];
    },


    _setDraftTemplate(type, selection) {
        const draft = this._draft();
        if (!draft.templates || typeof draft.templates !== "object") {
            draft.templates = {};
        }
        draft.templates[type] = {
            enabled: !!selection?.enabled,
            path: selection?.enabled ? String(selection?.path || "") : ""
        };
        this.owner?._notifyStateChange();
    },


    _openDraftTemplatePicker(anchor, type = this._currentCreateType()) {
        const core = this.owner;
        if (!core || !this.isCreateView()) return;
        const typeOption = this._createTypeOption(type);
        openTemplateFilePicker(core, {
            anchor,
            type,
            label: typeOption.label,
            icon: typeOption.icon,
            title: `${typeOption.label} · 模板`,
            panelClasses: "is-create-metadata-picker",
            getSelection: () => this._effectiveTemplateSetting(type),
            onSelect: selection => {
                this._setDraftTemplate(type, selection);
                this._refreshCreatePreview();
            }
        });
    },


    cycleCreateType() {
        const core = this.owner;
        if (!core || core._destroyed || !this.isCreateView() || this._createInFlight || this.createDraft?.pendingCreation) return false;
        const current = this._currentCreateType();
        const next = CREATE_TYPE_IDS[(CREATE_TYPE_IDS.indexOf(current) + 1) % CREATE_TYPE_IDS.length];
        core.dropdown.close(false);
        core._applyFacetSelection("fileType", fileTypeFromCreateType(next), { mode: "replace" });
        core._onFilterChanged();
        return true;
    },


    openMetadataPicker(anchor, kind = "tag", propertyKey = "") {
        const core = this.owner;
        if (!core || core._destroyed || !this.isCreateView() || this._createInFlight || this.createDraft?.pendingCreation) return null;
        const draft = this._draft();
        return core.batchMetadata.open(anchor, {
            initialAction: kind,
            propertyKey,
            metadataTarget: {
                label: "待创建文件",
                propertyTypes: draft.propertyTypes,
                isActive: () => this.owner === core && this.isCreateView() && this.createDraft === draft && !this._createInFlight,
                summary: () => this._draftMetadataSummary(draft),
                commit: changes => this._applyDraftMetadata(changes, draft)
            }
        });
    },


    _draftMetadataSummary(draft = this._draft()) {
        const tags = normalizeUniqueTagList([...draft.filterState.tags]);
        return {
            tags: { present: tags.length ? 1 : 0, values: tags.map(value => ({ value, count: 1 })) },
            rows: [...draft.filterState.properties].map(([key, values]) => ({
                key,
                present: 1,
                values: new Map([...values].map(value => [propertyValueKey(value), {
                    value,
                    rawSample: this._typedPropertyValue(key, value),
                    count: 1
                }]))
            }))
        };
    },


    _applyDraftMetadata(changes, draft = this._draft()) {
        const core = this.owner;
        if (!core || core._destroyed || !this.isCreateView() || this._createInFlight || draft.pendingCreation || this.createDraft !== draft) return false;
        // Same Picker, different commit target: there is no TFile or metadata
        // service call until the user submits the whole create form.
        const removedTags = new Set(normalizeUniqueTagList(changes.removeTags || []).map(tagIdentityKey));
        const tags = normalizeUniqueTagList([
            ...[...draft.filterState.tags].filter(tag => !removedTags.has(tagIdentityKey(tag))),
            ...(changes.addTags || [])
        ]);
        const properties = new Map([...draft.filterState.properties].map(([key, values]) => [key, new Set(values)]));
        const propertyTypes = new Map(draft.propertyTypes);
        for (const operation of changes.properties || []) {
            const key = validateEditablePropertyKey(operation.key, core.plugin.settings.excludedKeys);
            const type = normalizeMetadataPropertyType(operation.propertyType);
            const removed = new Set((operation.removeValues || []).map(propertyValueKey));
            const values = new Map([...(properties.get(key) || [])]
                .filter(value => !removed.has(propertyValueKey(value)))
                .map(value => [propertyValueKey(value), value]));
            for (const raw of operation.addValues || []) {
                const value = parseMetadataPropertyInput(raw, type);
                const id = propertyValueKey(value);
                if (values.has(id)) continue;
                if (type !== "multitext" && values.size) continue;
                values.set(id, value);
            }
            if (values.size) {
                properties.set(key, new Set(values.values()));
                propertyTypes.set(key, type);
            } else {
                properties.delete(key);
                propertyTypes.delete(key);
            }
        }
        draft.filterState.tags = new Set(tags);
        draft.filterState.properties = properties;
        draft.propertyTypes = propertyTypes;
        core._onFilterChanged();
        return { changed: 1, failed: 0, conflict: 0 };
    },


    _pendingCreationSnapshot(value = this.createDraft?.pendingCreation) {
        if (!value || typeof value !== "object" || !value.path || !value.contentFingerprint
            || !Number.isFinite(value.createdAt) || value.createdAt <= 0) return null;
        try {
            return {
                path: String(value.path),
                contentFingerprint: String(value.contentFingerprint),
                propertyFingerprint: typeof value.propertyFingerprint === "string" ? value.propertyFingerprint : null,
                ctime: Number(value.ctime) || 0,
                createdAt: value.createdAt,
                metadata: {
                    tags: normalizeUniqueTagList(value.metadata?.tags || []),
                    properties: (value.metadata?.properties || []).map(([key, raw]) => [
                        validateEditablePropertyKey(key), JSON.parse(JSON.stringify(raw))
                    ])
                }
            };
        } catch (_) { return null; }
    },


    retainPartialFileAndReturn() {
        const core = this.owner;
        if (!core || this._createInFlight || !this.createDraft?.pendingCreation) return false;
        const submitted = this.captureDraft();
        core.plugin.settleCreateSession(core.sessionKey, submitted);
        core.plugin.fileOperations.forgetPendingCreation?.(this.createDraft.pendingCreation.path);
        this.createDraft.pendingCreation = null;
        const changed = this.toggleInputMode({ focusInput: false, refreshResultsOnExit: true });
        if (this.isDerivedCreateView()) {
            if (core.searchInput) core.searchInput.value = "";
            core.performSearch("");
        }
        if (changed) new Notice("已保留文件；未完成的属性可在结果卡中继续添加");
        return changed;
    },


    clearCreateConditions() {
        const core = this.owner;
        if (!core || !this.isCreateMode() || this._createInFlight || this.createDraft?.pendingCreation) return false;
        const draft = this._draft();
        core.dropdown.close(false);
        draft.filterState.clear();
        draft.propertyTypes.clear();
        draft.type = "md";
        draft.filterState.fileType = "note";
        draft.templates = Object.fromEntries(CREATE_TYPE_IDS.map(type => [type, { enabled: false, path: "" }]));
        this.syncInputModeView();
        core.facets?.syncFilterButtons?.();
        this._refreshCreatePreview({ refreshPools: true });
        core._syncResultStateRow?.();
        core._notifyStateChange();
        return true;
    },


    remapTemplatePaths(oldPath, newPath, { descendants = false } = {}) {
        const draft = this.createDraft;
        if (!draft?.templates) return false;
        let changed = false;
        for (const setting of Object.values(draft.templates)) {
            const path = String(setting?.path || "");
            if (!path) continue;
            if (path === oldPath) {
                setting.path = newPath;
                if (!newPath) setting.enabled = false;
                changed = true;
            } else if (descendants && path.startsWith(oldPath + "/")) {
                setting.path = newPath
                    ? newPath + path.slice(oldPath.length)
                    : "";
                if (!setting.path) setting.enabled = false;
                changed = true;
            }
        }
        if (changed && this.isCreateView()) this._refreshCreatePreview();
        return changed;
    },
};

