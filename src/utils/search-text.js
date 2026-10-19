// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { isDomElement } from "./dom.js";


export function mergeTextRanges(ranges) {
    const normalized = ranges
        .filter(range => Array.isArray(range) && range.length === 2 && range[1] > range[0])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged = [];
    for (const [start, end] of normalized) {
        const previous = merged[merged.length - 1];
        if (previous && start <= previous[1]) {
            previous[1] = Math.max(previous[1], end);
        } else {
            merged.push([start, end]);
        }
    }
    return merged;
}


// 搜索命中展示只有一套正式渲染路径：普通文本 + 命中文字颜色。
// 标题、正文摘要、标签全部复用此函数，禁止各自维护背景 / padding / 圆角等高亮实现。
export function fillSearchHitText(element, text, ranges) {
    if (!isDomElement(element)) return;
    const source = String(text || "");
    const validRanges = mergeTextRanges(ranges || [])
        .filter(([start, end]) => start >= 0 && end <= source.length);

    element.empty();
    if (!validRanges.length) {
        element.textContent = source;
        return;
    }

    let cursor = 0;
    for (const [start, end] of validRanges) {
        if (start > cursor) {
            element.append(element.ownerDocument.createTextNode(source.slice(cursor, start)));
        }
        element.createEl("mark", {
            text: source.slice(start, end),
            cls: "local-search-hit"
        });
        cursor = end;
    }
    if (cursor < source.length) {
        element.append(element.ownerDocument.createTextNode(source.slice(cursor)));
    }
}


// 标签搜索本身采用“查询单元包含”语义；展示层与同一 QueryState 保持一致。
// 这里只计算显示区间，不参与搜索判定，不新增第二套匹配状态。
export function tagQueryMatchRanges(text, query) {
    if (!query?.active) return [];
    const source = String(text || "");
    const lower = source.toLowerCase();
    const ranges = [];
    for (const unit of query.units || []) {
        if (!unit) continue;
        let from = 0;
        while (from <= lower.length - unit.length) {
            const start = lower.indexOf(unit, from);
            if (start < 0) break;
            ranges.push([start, start + unit.length]);
            from = start + Math.max(1, unit.length);
        }
    }
    return mergeTextRanges(ranges);
}


export function substringMatchRange(text, query) {
    if (!query) return null;
    const at = text.indexOf(query);
    return at < 0 ? null : [at, at + query.length];
}


export function unitMatchRanges(text, units) {
    const ranges = [];
    for (const unit of units) {
        const range = substringMatchRange(text, unit);
        if (!range) return null;
        ranges.push(range);
    }
    return mergeTextRanges(ranges);
}


// 多搜索单元命中时寻找覆盖全部单元的最短窗口，而不是机械使用每个单元的首次出现位置。
export function compactUnitMatchRanges(text, units) {
    const normalizedUnits = [...new Set((units || []).filter(Boolean))];
    if (!normalizedUnits.length) return null;
    if (normalizedUnits.length === 1) {
        const range = substringMatchRange(text, normalizedUnits[0]);
        return range ? [range] : null;
    }

    const occurrences = [];
    normalizedUnits.forEach((unit, unitIndex) => {
        let from = 0;
        while (from <= text.length - unit.length) {
            const start = text.indexOf(unit, from);
            if (start < 0) break;
            occurrences.push({ unitIndex, start, end: start + unit.length });
            from = start + Math.max(1, unit.length);
        }
    });
    if (!occurrences.length) return null;
    occurrences.sort((a, b) => a.start - b.start || a.end - b.end);

    const counts = new Array(normalizedUnits.length).fill(0);
    const maxEndDeque = [];
    let covered = 0;
    let left = 0;
    let best = null;

    for (let right = 0; right < occurrences.length; right++) {
        const current = occurrences[right];
        if (counts[current.unitIndex]++ === 0) covered++;
        while (maxEndDeque.length && occurrences[maxEndDeque[maxEndDeque.length - 1]].end <= current.end) {
            maxEndDeque.pop();
        }
        maxEndDeque.push(right);

        while (covered === normalizedUnits.length && left <= right) {
            const first = occurrences[left];
            const spanStart = first.start;
            const spanEnd = occurrences[maxEndDeque[0]].end;
            if (!best || (spanEnd - spanStart) < (best.end - best.start)) {
                best = { left, right, start: spanStart, end: spanEnd };
            }
            if (--counts[first.unitIndex] === 0) covered--;
            if (maxEndDeque[0] === left) maxEndDeque.shift();
            left++;
        }
    }
    if (!best) return null;

    const selected = [];
    const seen = new Set();
    for (let i = best.left; i <= best.right; i++) {
        const occurrence = occurrences[i];
        if (seen.has(occurrence.unitIndex)) continue;
        seen.add(occurrence.unitIndex);
        selected.push([occurrence.start, occurrence.end]);
    }
    return selected.length === normalizedUnits.length ? mergeTextRanges(selected) : null;
}


export function orderedMatchRanges(text, query) {
    if (!query) return [];
    const ranges = [];
    let at = 0;
    for (const ch of query) {
        const found = text.indexOf(ch, at);
        if (found < 0) return null;
        ranges.push([found, found + ch.length]);
        at = found + ch.length;
    }
    return mergeTextRanges(ranges);
}


// 正文的非连续顺序匹配比标题更严格：
// 1) 总跨度必须紧凑；2) 至少存在一个连续的多字符片段。
// 避免长正文里“无…效…代…码”这种逐字偶然出现被判成有效结果。
export function compactOrderedBodyMatchRanges(text, query) {
    const ranges = orderedMatchRanges(text, query);
    if (!ranges?.length) return null;

    const span = ranges[ranges.length - 1][1] - ranges[0][0];
    const queryLength = Array.from(query || "").length;
    const maxSpan = Math.max(12, queryLength * 4);
    if (span > maxSpan) return null;

    if (queryLength >= 3) {
        const hasMeaningfulFragment = ranges.some(([start, end]) => end - start >= 2);
        if (!hasMeaningfulFragment) return null;
    }

    return ranges;
}


// 正文搜索与搜索摘要共用唯一匹配模型。
// 优先级：完整短语 > 多单元最短共同窗口 > 紧凑片段式顺序匹配。
export function matchReadableText(text, query) {
    if (!text || !query?.active) return null;
    const phraseRange = substringMatchRange(text, query.intent);
    if (phraseRange) return { type: "phrase", ranges: [phraseRange] };

    if (query.units.length > 1) {
        const compactRanges = compactUnitMatchRanges(text, query.units);
        if (compactRanges) return { type: "units", ranges: compactRanges };
        return null;
    }

    const orderedRanges = compactOrderedBodyMatchRanges(text, query.intent);
    return orderedRanges ? { type: "ordered", ranges: orderedRanges } : null;
}


export function _findSnippetStartBoundary(text, start, matchStart) {
    // 只在“少量前文预算”内寻找离命中最近的自然边界。
    // 从后向前找，避免为了句界把摘要起点推回很远。
    const hardBoundary = /[。！？!?；;\n]/;
    for (let i = matchStart - 1; i >= start; i--) {
        if (hardBoundary.test(text[i])) return i + 1;
    }
    return start;
}


export function _findSnippetEndBoundary(text, end, radius = 24) {
    const hardBoundary = /[。！？!?；;\n]/;
    const max = Math.min(text.length, end + radius);
    for (let i = end; i < max; i++) {
        if (hardBoundary.test(text[i])) return i + 1;
    }
    return end;
}


export function buildSnippetWindow(text, matchRanges, maxLen = 200) {
    const cleanText = String(text || "");
    const limit = Math.max(40, Number.parseInt(String(maxLen), 10) || 200);
    const ranges = mergeTextRanges(matchRanges || [])
        .filter(([start, end]) => start >= 0 && end <= cleanText.length);

    if (!ranges.length) {
        const snippetText = cleanText.slice(0, limit);
        return {
            text: snippetText + (cleanText.length > limit ? "…" : ""),
            ranges: []
        };
    }

    const matchStart = ranges[0][0];
    const matchEnd = ranges[ranges.length - 1][1];
    const matchSpan = Math.max(1, matchEnd - matchStart);
    let start;
    let end;

    if (matchSpan < limit) {
        // 搜索摘要不是正文预览，而是“命中解释”：
        // 命中前只保留固定、很短的语境，不再按摘要长度百分比居中。
        // 这样 CSS 即使只显示三行，真正的命中也会稳定出现在可见前部。
        const beforeBudget = Math.min(24, Math.max(0, limit - matchSpan));
        start = Math.max(0, matchStart - beforeBudget);
        start = _findSnippetStartBoundary(cleanText, start, matchStart);

        end = Math.min(cleanText.length, start + limit);
        if (end < matchEnd) end = matchEnd;

        // 仅在不会明显拉长摘要时补到自然句界；所有额外空间都给命中后文。
        const naturalEnd = _findSnippetEndBoundary(cleanText, end, 24);
        if (naturalEnd > end && naturalEnd - start <= Math.floor(limit * 1.12)) {
            end = naturalEnd;
        }
    } else {
        // 极端长匹配跨度无法完整塞入一个摘要时，优先选择实际命中密度最高的窗口；
        // 每个候选窗口同样只给命中前保留少量语境。
        const beforeBudget = Math.min(24, Math.floor(limit * 0.15));
        let bestStart = Math.max(0, Math.min(matchStart - beforeBudget, cleanText.length - limit));
        let bestScore = -1;
        const candidates = new Set([bestStart]);
        for (const [rangeStart, rangeEnd] of ranges) {
            candidates.add(Math.max(0, Math.min(rangeStart - beforeBudget, cleanText.length - limit)));
            candidates.add(Math.max(0, Math.min(rangeEnd - Math.max(1, limit - beforeBudget), cleanText.length - limit)));
        }
        for (const candidate of candidates) {
            const candidateEnd = candidate + limit;
            let score = 0;
            for (const [rangeStart, rangeEnd] of ranges) {
                score += Math.max(0, Math.min(rangeEnd, candidateEnd) - Math.max(rangeStart, candidate));
            }
            if (score > bestScore) {
                bestScore = score;
                bestStart = candidate;
            }
        }
        start = bestStart;
        end = Math.min(cleanText.length, start + limit);
    }

    const prefix = start > 0 ? "…" : "";
    const suffix = end < cleanText.length ? "…" : "";
    const offset = prefix.length - start;
    const localRanges = [];
    for (const [rangeStart, rangeEnd] of ranges) {
        const clippedStart = Math.max(start, rangeStart);
        const clippedEnd = Math.min(end, rangeEnd);
        if (clippedEnd > clippedStart) {
            localRanges.push([clippedStart + offset, clippedEnd + offset]);
        }
    }

    return {
        text: prefix + cleanText.slice(start, end) + suffix,
        ranges: mergeTextRanges(localRanges)
    };
}
