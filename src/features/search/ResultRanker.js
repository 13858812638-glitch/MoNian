// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { logicalFileType } from "../../data/formats/file-types.js";
import { tagIdentityKey } from "../../data/tags/tag-values.js";
import { orderedMatchRanges, substringMatchRange, unitMatchRanges } from "../../utils/search-text.js";


export class ResultRanker {
    static rank(meta, query) {
        if (!query.active) return { tier: 0, bodyOnly: false, titleMatchRanges: [] };
        const title = meta.nameLower || "";
        const phrase = query.intent;

        // Exact and contiguous title matches do not require tag traversal,
        // file-type detection or multi-unit checks. Keep identical ranking
        // precedence while deferring those costs until actually needed.
        if (title === phrase) {
            return { tier: 1, bodyOnly: false, titleMatchRanges: [[0, title.length]] };
        }
        const phraseRange = substringMatchRange(title, phrase);
        if (phraseRange) {
            return { tier: 2, bodyOnly: false, titleMatchRanges: [phraseRange] };
        }
        if (query.units.length > 1 && query.units.every(u => title.includes(u))) {
            return {
                tier: 3,
                bodyOnly: false,
                titleMatchRanges: unitMatchRanges(title, query.units) || []
            };
        }

        const orderedRanges = orderedMatchRanges(title, phrase);

        // Excalidraw / Canvas / 其他附件的关键词搜索只看标题；
        // tags / properties 仍保留给 FilterEngine 做正常元数据筛选。
        if (logicalFileType(meta) !== "note") {
            if (orderedRanges) {
                return { tier: 6, bodyOnly: false, titleMatchRanges: orderedRanges };
            }
            return null;
        }

        const tags = meta.tags || [];
        const everyTag = query.units.every(u =>
            tags.some(tag => {
                const key = tagIdentityKey(tag);
                return key === u || key.includes(u);
            })
        );
        if (orderedRanges && everyTag) {
            return { tier: 4, bodyOnly: false, titleMatchRanges: orderedRanges };
        }
        if (everyTag) return { tier: 5, bodyOnly: false, titleMatchRanges: [] };
        if (orderedRanges) {
            return { tier: 6, bodyOnly: false, titleMatchRanges: orderedRanges };
        }
        return null;
    }
}
