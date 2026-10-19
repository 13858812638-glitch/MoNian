// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { propertyValueKey } from "../../data/properties/property-values.js";
import { tagIdentityKey } from "../../data/tags/tag-values.js";
import { normalizeVaultFolderPath } from "../../utils/vault-paths.js";
import { normalizeHexColor } from "../folders/folder-colors.js";
import { normalizeNavigatorToolbars } from "./toolbar-config.js";


// Navigator owns presentation only. Queries, facets, cards and writes stay in SearchCore.
// Navigator presentation metadata. File/tag/property order still belongs to
// the existing picker*Order settings and setPickerSiblingOrder write owner.
export const NAVIGATOR_CUSTOMIZATION_KINDS = new Set(["group", "folder", "tag", "property-key", "property-value", "time", "separator"]);


export function navigatorItemId(kind, key = "", value = "") {
    kind = kind === "property" ? "property-key" : kind === "value" ? "property-value" : String(kind || "");
    if (!NAVIGATOR_CUSTOMIZATION_KINDS.has(kind)) return "";
    key = String(key ?? "");
    if (kind === "folder") key = key === "/" ? "/" : normalizeVaultFolderPath(key);
    if (kind === "tag") key = tagIdentityKey(key);
    const valueId = kind === "property-value" ? propertyValueKey(value) : String(value ?? "");
    return JSON.stringify([kind, key, valueId]);
}


export function parseNavigatorItemId(id) {
    if (typeof id !== "string" || id.length > 4096) return null;
    try {
        const parts = JSON.parse(id);
        return Array.isArray(parts) && parts.length === 3 && NAVIGATOR_CUSTOMIZATION_KINDS.has(parts[0])
            && parts.every(part => typeof part === "string") ? { kind: parts[0], key: parts[1], valueId: parts[2] } : null;
    } catch (_) { return null; }
}


export function normalizeNavigatorCustomization(raw) {
    const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const source = object(raw);
    const colors = value => ({ light: normalizeHexColor(value?.light), dark: normalizeHexColor(value?.dark) });
    const result = { version: 1, appearance: {}, groupOrder: [], separators: {} };
    for (const [id, value] of Object.entries(object(source.appearance)).slice(0, 3000)) {
        const parsed = parseNavigatorItemId(id);
        if (!parsed || parsed.kind === "separator") continue;
        const entry = object(value);
        const icon = /^[a-z0-9][a-z0-9-]{0,79}$/i.test(entry.icon || "") ? entry.icon : "";
        // Folder foreground is the existing resultFolderColors authority.
        const color = colors(parsed.kind === "folder" ? null : entry.color);
        const background = colors(entry.background);
        if (icon || color.light || color.dark || background.light || background.dark)
            result.appearance[id] = { icon, color, background };
    }
    result.groupOrder = [...new Set(Array.isArray(source.groupOrder) ? source.groupOrder : [])]
        .filter(id => parseNavigatorItemId(id)?.kind === "group").slice(0, 30);
    for (const [id, value] of Object.entries(object(source.separators)).slice(0, 300)) {
        if (parseNavigatorItemId(id)?.kind !== "separator") continue;
        const entry = object(value);
        const parentId = String(entry.parentId || "");
        if (parentId !== "groups" && !parseNavigatorItemId(parentId)) continue;
        const beforeId = entry.beforeId == null ? null : String(entry.beforeId);
        if (beforeId !== null && (!parseNavigatorItemId(beforeId) || parseNavigatorItemId(beforeId).kind === "separator")) continue;
        result.separators[id] = {
            parentId, beforeId,
            rank: Math.max(0, Math.min(10000, Number(entry.rank) || 0)),
            style: ["solid", "dashed", "dotted"].includes(entry.style) ? entry.style : "solid",
            color: colors(entry.color),
            space: [8, 12, 20].includes(Number(entry.space)) ? Number(entry.space) : 12
        };
    }
    return result;
}


// Invoked by the existing successful folder/tag/property rename/delete owners,
// before their normal settings save. No filesystem operation lives here.
export function remapNavigatorCustomization(settings, { kind, from, to = null, key = "" } = {}) {
    kind = kind === "property" ? "property-key" : kind === "value" ? "property-value" : kind;
    if (!["folder", "tag", "property-key", "property-value"].includes(kind)) return false;
    const state = normalizeNavigatorCustomization(settings.navigatorCustomization);
    const source = kind === "tag" ? tagIdentityKey(from) : kind === "folder" ? normalizeVaultFolderPath(from)
        : kind === "property-value" ? propertyValueKey(from) : String(from ?? "");
    const target = to == null ? null : kind === "tag" ? tagIdentityKey(to) : kind === "folder" ? normalizeVaultFolderPath(to)
        : kind === "property-value" ? propertyValueKey(to) : String(to);
    if (!source || target === source) return false;
    let changed = false;
    const remap = id => {
        const parsed = parseNavigatorItemId(id);
        if (!parsed) return id;
        let nextKey = parsed.key, nextValue = parsed.valueId;
        const tree = kind === "folder" || kind === "tag";
        if (tree && parsed.kind === kind && (parsed.key === source || parsed.key.startsWith(`${source}/`))) {
            changed = true;
            if (target === null) return null;
            nextKey = target + parsed.key.slice(source.length);
        } else if (kind === "property-key" && ["property-key", "property-value"].includes(parsed.kind) && parsed.key === source) {
            changed = true;
            if (target === null) return null;
            nextKey = target;
        } else if (kind === "property-value" && parsed.kind === kind && parsed.key === String(key) && parsed.valueId === source) {
            changed = true;
            if (target === null) return null;
            nextValue = target;
        }
        return JSON.stringify([parsed.kind, nextKey, nextValue]);
    };
    const appearance = {};
    // An explicit destination style wins over a renamed source on a merge.
    for (const [id, style] of Object.entries(state.appearance)) if (remap(id) === id) appearance[id] = style;
    for (const [id, style] of Object.entries(state.appearance)) {
        const nextId = remap(id);
        if (nextId && !Object.prototype.hasOwnProperty.call(appearance, nextId)) appearance[nextId] = style;
    }
    state.appearance = appearance;
    for (const [id, separator] of Object.entries(state.separators)) {
        const parentId = separator.parentId === "groups" ? "groups" : remap(separator.parentId);
        const beforeId = separator.beforeId == null ? null : remap(separator.beforeId);
        if (!parentId || (separator.beforeId != null && !beforeId)) { delete state.separators[id]; changed = true; }
        else { separator.parentId = parentId; separator.beforeId = beforeId; }
    }
    if (kind === "property-key") {
        const oldId = `property:${source}`;
        const newId = target === null ? null : `property:${target}`;
        const toolbars = normalizeNavigatorToolbars(settings.navigatorToolbars);
        let toolbarChanged = false;
        for (const config of Object.values(toolbars)) {
            if (!config.order.includes(oldId)) continue;
            const destinationExists = newId !== null && config.order.includes(newId);
            const move = id => id !== oldId ? id : destinationExists ? null : newId;
            config.order = [...new Set(config.order.map(move).filter(Boolean))];
            // When keys merge, preserve the destination shortcut's existing
            // position/visibility rather than inheriting the removed source.
            config.hidden = [...new Set(config.hidden.map(move).filter(id => id && config.order.includes(id)))];
            if (newId && !destinationExists && config.icons[oldId]) config.icons[newId] = config.icons[oldId];
            delete config.icons[oldId];
            toolbarChanged = true;
        }
        if (toolbarChanged) { settings.navigatorToolbars = toolbars; changed = true; }
    }
    if (changed) settings.navigatorCustomization = state;
    return changed;
}
