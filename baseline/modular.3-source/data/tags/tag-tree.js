// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { sortByPreferredOrder } from "../../utils/preferred-order.js";
import { NO_TAGS_FILTER_VALUE, normalizeUniqueTagList, tagIdentityKey } from "./tag-values.js";


export function buildTagTreeModel(candidates = [], preferredOrder = []) {
    const canonicalOrder = normalizeUniqueStringList(preferredOrder.map(tagIdentityKey));
    const discovered = [...new Set(candidates.flatMap(meta => meta.tags || []))];
    const allTags = normalizeUniqueTagList(discovered).sort((a, b) =>
        a.localeCompare(b, "zh-Hans-CN", { numeric: true })
    );
    const nodeMap = new Map();

    // 节点身份大小写不敏感，但 path / name 始终保留第一次发现的真实标签写法。
    for (const tag of allTags) {
        const parts = String(tag).split("/").filter(Boolean);
        let parent = null;
        let displayPath = "";

        for (const part of parts) {
            const candidatePath = displayPath
                ? `${displayPath}/${part}`
                : part;
            const key = tagIdentityKey(candidatePath);
            let node = nodeMap.get(key);

            if (!node) {
                node = {
                    path: candidatePath,
                    name: part,
                    parentPath: parent?.path || "",
                    children: []
                };
                nodeMap.set(key, node);
                if (parent) parent.children.push(node);
            }

            parent = node;
            displayPath = node.path;
        }
    }

    for (const node of nodeMap.values()) {
        node.children = sortByPreferredOrder(
            node.children,
            canonicalOrder,
            child => tagIdentityKey(child.path)
        );
    }
    return sortByPreferredOrder(
        [...nodeMap.values()].filter(node => !node.parentPath),
        canonicalOrder,
        node => tagIdentityKey(node.path)
    );
}


export function flattenTagTreePaths(nodes = []) {
    const result = [];
    const visit = list => {
        for (const node of list || []) {
            if (!node?.path) continue;
            result.push(node.path);
            visit(node.children || []);
        }
    };
    visit(nodes);
    return result;
}


// 结果卡标签与标签 Picker 共用同一层级排序规则；只返回当前结果真实拥有的标签，
// 不把为了构建层级而产生的父节点标签注入结果卡。
export function orderTagsForPicker(tags = [], preferredOrder = []) {
    const source = normalizeUniqueTagList(tags);
    const actual = new Map(source.map(tag => [tagIdentityKey(tag), tag]));
    return flattenTagTreePaths(
        buildTagTreeModel([{ tags: source }], preferredOrder)
    )
        .map(path => actual.get(tagIdentityKey(path)))
        .filter(Boolean);
}


export function orderTagSelectionsForPicker(selectedTags = [], preferredOrder = []) {
    const selected = [...(selectedTags || [])];
    if (!selected.length) return [];

    const hasNoTags = selected.includes(NO_TAGS_FILTER_VALUE);
    const ordered = orderTagsForPicker(
        selected.filter(value => value !== NO_TAGS_FILTER_VALUE),
        preferredOrder
    );
    return hasNoTags
        ? [NO_TAGS_FILTER_VALUE, ...ordered]
        : ordered;
}
