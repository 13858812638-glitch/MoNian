// Tag hierarchy composer is a draft-only UI projection. No new tag catalog or vault owner.
import { editableTagError, normalizeEditableTagValue } from "../../data/properties/property-types.js";
import { tagIdentityKey } from "../../data/tags/tag-values.js";

export function composeHierarchicalTag(raw, parentPath = "") {
    const name = normalizeEditableTagValue(raw);
    const parent = normalizeEditableTagValue(parentPath);
    const path = name ? (parent ? `${parent}/${name}` : name) : "";
    return { name, path, error: path ? editableTagError(path) : "" };
}

export function tagHierarchyDrillPath(raw, parentPath = "") {
    const input = String(raw ?? "");
    if (!input.endsWith("/") || input.endsWith("//")) return "";
    const candidate = composeHierarchicalTag(input.slice(0, -1), parentPath);
    return candidate.path && !candidate.error ? candidate.path : "";
}

export function tagHierarchyBreadcrumbs(parentPath = "") {
    const result = [{ path: "", name: "全部标签" }];
    let path = "";
    for (const part of normalizeEditableTagValue(parentPath).split("/").filter(Boolean)) {
        path = path ? `${path}/${part}` : part;
        result.push({ path, name: part });
    }
    return result;
}

export function findTagHierarchyNode(roots, path) {
    const wanted = tagIdentityKey(path);
    if (!wanted) return null;
    let nodes = roots || [];
    let found = null;
    for (const part of normalizeEditableTagValue(path).split("/").filter(Boolean)) {
        const key = tagIdentityKey(found ? `${found.path}/${part}` : part);
        found = nodes.find(node => tagIdentityKey(node.path) === key) || null;
        if (!found) return null;
        nodes = found.children || [];
    }
    return tagIdentityKey(found?.path) === wanted ? found : null;
}

export function tagHierarchyVisibleRoots(roots, parentPath = "") {
    if (!parentPath) return roots || [];
    return findTagHierarchyNode(roots, parentPath)?.children || [];
}
