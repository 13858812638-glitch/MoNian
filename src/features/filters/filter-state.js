// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizePropertySelection, propertyValueKey } from "../../data/properties/property-values.js";
import { normalizeFilterTagSelection } from "../../data/tags/tag-values.js";
import { parseGLSDate } from "../../data/time/time-values.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { normalizeVaultFolderPath } from "../../utils/vault-paths.js";
import { normalizeFilterPoolSelectionMode, normalizeFilterPools } from "./pool-config.js";


export function normalizeFileTypeFilterValue(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw || raw === "all") return "";
    if (["note", "canvas", "excalidraw", "attachment"].includes(raw)) return raw;
    return /^ext:[a-z0-9][a-z0-9._+-]*$/i.test(raw) ? raw : "";
}


export function normalizeFileTypeFilterSelection(values = []) {
    const source = values instanceof Set ? [...values] : (Array.isArray(values) ? values : [values]);
    const result = [];
    const seen = new Set();
    for (const raw of source) {
        const value = normalizeFileTypeFilterValue(raw);
        if (!value || seen.has(value)) continue;
        seen.add(value);
        result.push(value);
    }
    return result;
}


export function normalizeFilterMatchMode(value) {
    return value === "any" ? "any" : "all";
}


export const FILTER_TIME_FIELDS = Object.freeze({
    created: { key: "ctime", label: "创建时间" },
    modified: { key: "contentModifiedAt", label: "正文修改时间" },
    fileModified: { key: "fileModifiedAt", label: "文件修改时间" }
});


export function normalizeFilterDate(value) {
    const text = typeof value === "string" ? value.trim() : "";
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return "";
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return "";
    // Date-only state never passes through Date.parse: UTC parsing would shift
    // the chosen calendar day on devices west of UTC.
    const check = new Date(0);
    check.setUTCFullYear(year, month - 1, day);
    return check.getUTCFullYear() === year
        && check.getUTCMonth() === month - 1
        && check.getUTCDate() === day ? text : "";
}


export function filterLocalDate(value) {
    const timestamp = parseGLSDate(value);
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const year = date.getFullYear();
    if (year < 1 || year > 9999) return "";
    return `${String(year).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}


export function normalizeFilterDateRange(value) {
    if (!value || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(FILTER_TIME_FIELDS, value.field)) return null;
    const from = normalizeFilterDate(value.from);
    const to = normalizeFilterDate(value.to);
    if ((value.from && !from) || (value.to && !to) || (!from && !to) || (from && to && from > to)) return null;
    return { field: value.field, from, to };
}


export function filterDateRangeDisplay(value) {
    const range = normalizeFilterDateRange(value);
    if (!range) return "";
    const dates = range.from === range.to ? range.from
        : `${range.from || "不限"} 至 ${range.to || "不限"}`;
    return `${FILTER_TIME_FIELDS[range.field].label}：${dates}`;
}


export function recentFilterDateRange(field, days, now = new Date()) {
    const end = new Date(parseGLSDate(now));
    const start = new Date(end);
    // Calendar arithmetic includes today and remains correct across DST.
    start.setDate(start.getDate() - Math.max(0, Math.floor(days) - 1));
    return normalizeFilterDateRange({ field, from: filterLocalDate(start), to: filterLocalDate(end) });
}


export class FilterState {
    constructor() { this.clear(); }

    clear() {
        this.tags = new Set();
        this.folders = new Set();
        this.properties = new Map();
        this.fileTypes = new Set();
        this.dateRange = null;
        // 普通 Facet 保留 GLS 既有 AND 语义；筛选池多选可在同一 FilterState 内切到 OR。
        this.tagMatchMode = "all";
        this.propertyMatchMode = "all";
    }

    // 文件类型筛选池支持真正多选；旧 fileType 保留为单值兼容入口。
    get fileType() {
        return this.fileTypes.size === 1 ? [...this.fileTypes][0] : "all";
    }

    set fileType(value) {
        this.fileTypes.clear();
        const normalized = normalizeFileTypeFilterValue(value);
        if (normalized) this.fileTypes.add(normalized);
    }

    // 单目录兼容入口：只有恰好一个目录时才返回路径。
    // 多目录筛选属于 OR 查询范围，不能被“新建文件”等单目录功能误当成某一个目录。
    get folder() {
        return this.folders.size === 1
            ? [...this.folders][0]
            : "";
    }

    set folder(value) {
        this.folders.clear();
        const normalized = String(value || "").trim();
        if (normalized) this.folders.add(normalized);
    }

    get active() {
        return this.tags.size > 0
            || this.folders.size > 0
            || this.properties.size > 0
            || this.fileTypes.size > 0
            || Boolean(this.dateRange);
    }

    clone() {
        const f = new FilterState();
        f.tags = new Set(this.tags);
        f.folders = new Set(this.folders);
        f.fileTypes = new Set(this.fileTypes);
        f.dateRange = normalizeFilterDateRange(this.dateRange);
        f.tagMatchMode = normalizeFilterMatchMode(this.tagMatchMode);
        f.propertyMatchMode = normalizeFilterMatchMode(this.propertyMatchMode);
        f.properties = new Map(
            Array.from(
                this.properties,
                ([key, values]) => [key, new Set(values)]
            )
        );
        return f;
    }

    // FilterState 是唯一筛选状态模型；持久化也必须由它负责序列化 / 反序列化，
    // 避免 Modal、Sidebar、设置层各自维护一套字段口径。
    toSnapshot() {
        return FilterState.normalizeSnapshot({
            tags: [...this.tags],
            folders: [...this.folders],
            properties: [...this.properties.entries()]
                .map(([key, values]) => [key, [...values]]),
            fileTypes: [...this.fileTypes],
            fileType: this.fileType,
            dateRange: this.dateRange,
            tagMatchMode: normalizeFilterMatchMode(this.tagMatchMode),
            propertyMatchMode: normalizeFilterMatchMode(this.propertyMatchMode)
        });
    }

    static normalizeSnapshot(value) {
        const source = value && typeof value === "object" ? value : {};

        const tags = normalizeFilterTagSelection(source.tags);

        // 兼容旧版保存的单 folder 字段；新状态统一为 folders[]。
        const rawFolders = Array.isArray(source.folders)
            ? source.folders
            : source.folder
                ? [source.folder]
                : [];
        const folders = normalizeUniqueStringList(rawFolders)
            .map(raw => {
                const value = String(raw || "").trim();
                return value === "/"
                    ? "/"
                    : normalizeVaultFolderPath(value);
            })
            .filter(Boolean);

        const fileTypes = normalizeFileTypeFilterSelection(
            Array.isArray(source.fileTypes) ? source.fileTypes : [source.fileType || "all"]
        );
        const fileType = fileTypes.length === 1 ? fileTypes[0] : "all";

        const properties = [];
        const propertySource = Array.isArray(source.properties)
            ? source.properties
            : [];

        for (const entry of propertySource) {
            if (!Array.isArray(entry) || entry.length < 2) continue;

            const key = String(entry[0] || "").trim();
            if (!key) continue;

            const rawValues = Array.isArray(entry[1])
                ? entry[1]
                : [entry[1]];
            const seen = new Set();
            const values = [];

            for (const rawValue of rawValues) {
                if (rawValue === undefined || rawValue === null) continue;
                const value = String(rawValue).trim();
                if (!value) continue;

                // FilterState Snapshot 必须完整保存搜索语义。
                // PRESENT / MISSING / EMPTY 都属于正式筛选状态；
                // 只有进入 CreateDraft materialize 时才过滤不可写入 Frontmatter 的查询态。
                const semanticKey = propertyValueKey(value);
                if (seen.has(semanticKey)) continue;
                seen.add(semanticKey);
                values.push(value);
            }

            const normalizedSelection = normalizePropertySelection(values);
            if (normalizedSelection.size) {
                properties.push([key, [...normalizedSelection]]);
            }
        }

        return {
            tags,
            folders,
            properties,
            fileTypes,
            fileType,
            dateRange: normalizeFilterDateRange(source.dateRange),
            tagMatchMode: normalizeFilterMatchMode(source.tagMatchMode),
            propertyMatchMode: normalizeFilterMatchMode(source.propertyMatchMode)
        };
    }

    static fromSnapshot(value) {
        const snapshot = FilterState.normalizeSnapshot(value);
        const state = new FilterState();

        state.tags = new Set(snapshot.tags);
        state.folders = new Set(snapshot.folders);
        state.fileTypes = new Set(snapshot.fileTypes);
        state.dateRange = snapshot.dateRange;
        state.tagMatchMode = snapshot.tagMatchMode;
        state.propertyMatchMode = snapshot.propertyMatchMode;
        state.properties = new Map(
            snapshot.properties.map(
                ([key, values]) => [key, new Set(values)]
            )
        );

        return state;
    }
}



export function normalizeLegacyFilterPoolSnapshot(value, pools) {
    const source = value && typeof value === "object" ? value : {};
    const hasCurrentSemantics = Object.prototype.hasOwnProperty.call(source, "tagMatchMode")
        && Object.prototype.hasOwnProperty.call(source, "propertyMatchMode")
        && Array.isArray(source.fileTypes);
    if (hasCurrentSemantics) return FilterState.normalizeSnapshot(source);

    const state = FilterState.fromSnapshot(source);
    // 旧 Snapshot 没有来源语义时按 GLS 原正式 Facet 语义恢复；
    // 筛选池配置只决定点击方式，不允许仅因“配置为 Multi”就把已有条件从 AND 重解释为 OR。
    state.tagMatchMode = "all";
    state.propertyMatchMode = "all";
    for (const pool of normalizeFilterPools(pools)) {
        const mode = normalizeFilterPoolSelectionMode(pool.selectionMode);
        if (pool.kind === "tag") {
            if (mode === "single" && state.tags.size > 1) {
                const first = state.tags.values().next().value;
                state.tags.clear();
                if (first !== undefined) state.tags.add(first);
            }
        } else if (pool.kind === "property") {
            if (mode === "single") {
                let first = null;
                let count = 0;
                for (const [key, values] of state.properties) {
                    for (const item of values) {
                        if (!first) first = { key, value: item };
                        count++;
                    }
                }
                if (count > 1) {
                    state.properties.clear();
                    if (first) state.properties.set(first.key, new Set([first.value]));
                }
            }
        } else if (pool.kind === "folder" && mode === "single" && state.folders.size > 1) {
            const first = state.folders.values().next().value;
            state.folders.clear();
            if (first !== undefined) state.folders.add(first);
        } else if (pool.kind === "fileType" && mode === "single" && state.fileTypes.size > 1) {
            const first = state.fileTypes.values().next().value;
            state.fileTypes.clear();
            if (first !== undefined) state.fileTypes.add(first);
        }
    }
    return state.toSnapshot();
}


// Navigation scope is only the folder selection. Temporary refinements belong
// to the results and must not survive an explicit browse-location change.
export function clearBrowseRefinements(state) {
    if (!(state instanceof FilterState)) return false;
    state.tags.clear();
    state.properties.clear();
    state.fileTypes.clear();
    state.dateRange = null;
    state.tagMatchMode = "all";
    state.propertyMatchMode = "all";
    return true;
}
