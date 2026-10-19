// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { attachmentExtension, logicalFileType } from "../../data/formats/file-types.js";
import { propertySelectionMatches } from "../../data/properties/property-values.js";
import { NO_TAGS_FILTER_VALUE, tagPathMatches } from "../../data/tags/tag-values.js";
import { FILTER_TIME_FIELDS, filterLocalDate, normalizeFileTypeFilterSelection, normalizeFilterDateRange, normalizeFilterMatchMode } from "./filter-state.js";


export class FilterEngine {
    static matchesDateRange(meta, value) {
        if (!value) return true;
        const range = normalizeFilterDateRange(value);
        if (!range) return false;
        // The index owns all three clocks. Never fall back to TFile.stat or
        // mtime, which can reflect NAS synchronization rather than user edits.
        const day = filterLocalDate(meta?.[FILTER_TIME_FIELDS[range.field].key]);
        return Boolean(day)
            && (!range.from || day >= range.from)
            && (!range.to || day <= range.to);
    }

    static matchesTags(meta, selectedTags, matchMode = "all") {
        const selected = selectedTags instanceof Set
            ? selectedTags
            : new Set(Array.isArray(selectedTags) ? selectedTags : []);
        if (!selected.size) return true;

        const tags = Array.isArray(meta?.tags) ? meta.tags : [];
        if (selected.has(NO_TAGS_FILTER_VALUE)) {
            // [没有标签] 是互斥条件；若外部旧状态仍混入真实标签，按无效状态处理。
            return selected.size === 1 && tags.length === 0;
        }

        const matches = wanted => tags.some(tag => tagPathMatches(tag, wanted));
        // 普通标签 Facet 继续使用 AND；筛选池“多选”与 Dida 一样使用同池 OR。
        return normalizeFilterMatchMode(matchMode) === "any"
            ? [...selected].some(matches)
            : [...selected].every(matches);
    }

    static matches(meta, filter) {
        if (!filter) return true;
        if (!FilterEngine.matchesDateRange(meta, filter.dateRange)) return false;
        const kind = logicalFileType(meta);
        const fileTypes = filter.fileTypes instanceof Set
            ? filter.fileTypes
            : new Set(normalizeFileTypeFilterSelection(filter.fileType));
        if (fileTypes.size) {
            const extension = kind === "attachment" ? attachmentExtension(meta) : "";
            let matched = false;
            for (const wanted of fileTypes) {
                if (wanted === "attachment") matched = kind === "attachment";
                else if (wanted.startsWith("ext:")) matched = kind === "attachment" && extension === wanted.slice(4);
                else matched = kind === wanted;
                if (matched) break;
            }
            if (!matched) return false;
        }
        if (filter.folders?.size) {
            let folderMatched = false;
            for (const folder of filter.folders) {
                if (
                    (folder === "/" && !meta.path.includes("/"))
                    || (folder !== "/" && meta.path.startsWith(folder + "/"))
                ) {
                    folderMatched = true;
                    break;
                }
            }
            if (!folderMatched) return false;
        }
        if (!FilterEngine.matchesTags(meta, filter.tags, filter.tagMatchMode)) return false;
        const propertyEntries = [...filter.properties];
        if (propertyEntries.length) {
            const propertyMatches = ([key, wanted]) => propertySelectionMatches(meta, key, wanted);
            const matched = normalizeFilterMatchMode(filter.propertyMatchMode) === "any"
                ? propertyEntries.some(propertyMatches)
                : propertyEntries.every(propertyMatches);
            if (!matched) return false;
        }
        return true;
    }
}
