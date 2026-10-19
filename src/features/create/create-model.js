// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeMetadataPropertyType, validateEditablePropertyKey } from "../../data/properties/property-types.js";
import { materializableCreatePropertySelections } from "../../data/properties/property-values.js";
import { NO_TAGS_FILTER_VALUE, normalizeFilterTagSelection } from "../../data/tags/tag-values.js";
import { normalizeVaultFolderPath } from "../../utils/vault-paths.js";
import { FilterState } from "../filters/filter-state.js";


export const CREATE_TYPE_IDS = Object.freeze(["md", "canvas", "excalidraw"]);


export function normalizeCreateType(value, fallback = "md") {
    const type = String(value || "").trim().toLowerCase();
    return CREATE_TYPE_IDS.includes(type) ? type : fallback;
}


export function createTypeFromFileType(fileType, fallback = "md") {
    const value = String(fileType || "").trim().toLowerCase();
    if (value === "canvas") return "canvas";
    if (value === "excalidraw") return "excalidraw";
    if (value === "note") return "md";
    return normalizeCreateType(fallback);
}


export function fileTypeFromCreateType(type) {
    const value = normalizeCreateType(type);
    return value === "canvas"
        ? "canvas"
        : (value === "excalidraw" ? "excalidraw" : "note");
}


export function normalizeCreatePropertyTypes(value) {
    const entries = value instanceof Map ? [...value] : (Array.isArray(value) ? value : []);
    const result = new Map();
    for (const entry of entries) {
        if (!Array.isArray(entry) || entry.length < 2) continue;
        try {
            const key = validateEditablePropertyKey(entry[0]);
            result.set(key, normalizeMetadataPropertyType(entry[1]));
        } catch (_) { /* Ignore invalid recovered draft metadata. */ }
    }
    return result;
}


export function normalizeCreateMetadataMemory(value) {
    const source = value && typeof value === "object" ? value : {};
    const result = {};
    for (const type of CREATE_TYPE_IDS) {
        const raw = source[type] && typeof source[type] === "object"
            ? source[type]
            : {};
        const snapshot = FilterState.normalizeSnapshot({
            tags: raw.tags,
            properties: raw.properties,
            fileType: fileTypeFromCreateType(type)
        });
        const state = FilterState.fromSnapshot(snapshot);
        state.tags = new Set(
            normalizeFilterTagSelection(state.tags)
                .filter(tag => tag !== NO_TAGS_FILTER_VALUE)
        );
        state.properties = materializableCreatePropertySelections(
            state.properties
        );
        const clean = state.toSnapshot();
        const rawFolder = String(raw.folder || "").trim();
        const folder = rawFolder === "/"
            ? ""
            : normalizeVaultFolderPath(rawFolder);
        const templateSource = raw.template && typeof raw.template === "object"
            ? raw.template
            : {};
        const templatePath = String(templateSource.path || "").trim();
        result[type] = {
            folder,
            tags: clean.tags,
            properties: clean.properties,
            propertyTypes: [...normalizeCreatePropertyTypes(raw.propertyTypes)]
                .filter(([key]) => state.properties.has(key)),
            template: {
                enabled: !!templateSource.enabled && !!templatePath,
                path: templatePath
            }
        };
    }
    return result;
}
