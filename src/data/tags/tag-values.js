// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



// 标签内部值统一去掉 Markdown # 前缀，但保留用户原始大小写。
// 大小写仅用于“同一个标签”的比较 / 去重，不得反向污染 UI 显示或 Frontmatter 写盘。
export function normalizeTagValue(value) {
    return String(value || "")
        .replace(/^#+/, "")
        .trim();
}


export function tagIdentityKey(value) {
    return normalizeTagValue(value)
        .toLocaleLowerCase("zh-CN");
}


export function normalizeUniqueTagList(values) {
    const source = Array.isArray(values) ? values : [];
    const seen = new Set();
    const result = [];

    for (const value of source) {
        const tag = normalizeTagValue(value);
        if (!tag) continue;
        const key = tagIdentityKey(tag);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        result.push(tag);
    }

    return result;
}


export function tagPathMatches(candidate, selected) {
    const candidateKey = tagIdentityKey(candidate);
    const selectedKey = tagIdentityKey(selected);
    if (!candidateKey || !selectedKey) return false;
    return candidateKey === selectedKey
        || candidateKey.startsWith(selectedKey + "/");
}


// FilterState 标签条件的唯一规范化：
// - [没有标签] 与真实标签互斥；旧快照若同时存在，优先保留真实标签，避免形成不可能条件。
// - 标签筛选采用 AND；父 + 子同时存在时父条件已被子条件包含，因此只保留更具体的子标签。
export function normalizeFilterTagSelection(values) {
    const source = values instanceof Set
        ? [...values]
        : (Array.isArray(values) ? values : []);
    const unique = normalizeUniqueTagList(source);
    const hasNoTags = unique.includes(NO_TAGS_FILTER_VALUE);
    const realTags = unique.filter(tag => tag !== NO_TAGS_FILTER_VALUE);

    if (!realTags.length) {
        return hasNoTags ? [NO_TAGS_FILTER_VALUE] : [];
    }

    return realTags.filter(tag =>
        !realTags.some(descendant =>
            descendant !== tag
            && tagPathMatches(descendant, tag)
        )
    );
}


// 标签层级按文件去重计数，并同时统计“无标签”。
export function buildHierarchicalTagUsageCounts(candidates) {
    const counts = new Map();
    const normalizedPaths = new Map();
    let noTags = 0;
    for (const meta of candidates || []) {
        const tags = Array.isArray(meta?.tags) ? meta.tags : [];
        if (!tags.length) { noTags++; continue; }

        const seen = new Set();
        for (const rawTag of tags) {
            let keys = normalizedPaths.get(rawTag);
            if (!keys) {
                keys = [];
                let path = "";
                for (const part of normalizeTagValue(rawTag).split("/").filter(Boolean)) {
                    path = path ? `${path}/${part}` : part;
                    keys.push(tagIdentityKey(path));
                }
                normalizedPaths.set(rawTag, keys);
            }
            for (const key of keys) seen.add(key);
        }
        for (const key of seen) counts.set(key, (counts.get(key) || 0) + 1);
    }
    return { counts, noTags };
}


// 标签筛选的“没有标签”是筛选状态，不是真实标签。
// 语义：Frontmatter 标签 + 正文 inline 标签合并后，实际标签数量为 0。
export const NO_TAGS_FILTER_VALUE = "␟__LS_NO_TAGS_FILTER_VALUE__␟";
