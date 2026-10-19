// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



// 属性值唯一语义模型：筛选、分面计数、结果展示、结果点击全部只走这一套。
// “没有此属性”与“有属性但无值”使用不同内部哨兵，且都不会与用户真实文本发生碰撞。
export const MISSING_PROPERTY_VALUE = "␟__LS_MISSING_PROPERTY_VALUE__␟";

export const EMPTY_PROPERTY_VALUE = "␟__LS_EMPTY_PROPERTY_VALUE__␟";

export const PRESENT_PROPERTY_VALUE = "␟__LS_PRESENT_PROPERTY_VALUE__␟";


export function propertyValueDisplay(value) {
    if (value === MISSING_PROPERTY_VALUE) return "[没有此属性]";
    if (value === EMPTY_PROPERTY_VALUE) return "[有属性但无值]";
    if (value === PRESENT_PROPERTY_VALUE) return "含有此属性";
    return String(value);
}


// UI 摘要使用更自然的纯文本语义；内部哨兵仍保持原模型，避免把显示格式泄漏到业务逻辑。
export function propertyValuePlainDisplay(value) {
    if (value === MISSING_PROPERTY_VALUE) return "没有此属性";
    if (value === EMPTY_PROPERTY_VALUE) return "有属性但无值";
    if (value === PRESENT_PROPERTY_VALUE) return "含有此属性";
    return String(value);
}


// 特殊状态在属性 Picker 中使用更紧凑的短标签；
// 仅改变显示文本，筛选值仍复用统一哨兵模型。
export function propertySpecialInlineDisplay(value) {
    if (value === MISSING_PROPERTY_VALUE) return "没有此属性";
    if (value === EMPTY_PROPERTY_VALUE) return "有属性空值";
    return propertyValuePlainDisplay(value);
}


// 主筛选 Chip 对普通真实值保留原来的 [值] 视觉；特殊状态不再产生双层方括号。
export function propertyFilterChipValueDisplay(value) {
    if (
        value === MISSING_PROPERTY_VALUE
        || value === EMPTY_PROPERTY_VALUE
        || value === PRESENT_PROPERTY_VALUE
    ) return propertyValuePlainDisplay(value);
    return `[${propertyValuePlainDisplay(value)}]`;
}


export function propertyValueSortRank(value) {
    if (value === MISSING_PROPERTY_VALUE) return 0;
    if (value === EMPTY_PROPERTY_VALUE) return 1;
    return 2;
}


export function propertyValueKey(value) {
    if (
        value === MISSING_PROPERTY_VALUE
        || value === EMPTY_PROPERTY_VALUE
        || value === PRESENT_PROPERTY_VALUE
    ) return value;
    return String(value).trim().toLocaleLowerCase("zh-CN");
}


export function isSpecialPropertyValue(value) {
    return value === MISSING_PROPERTY_VALUE
        || value === EMPTY_PROPERTY_VALUE;
}


export function isExclusivePropertySelectionValue(value) {
    return value === PRESENT_PROPERTY_VALUE
        || isSpecialPropertyValue(value);
}


// 属性选择的唯一归一规则：
// - 真实值可同键多选（OR）；
// - “含有此属性 / 没有此属性 / 有属性空值”都是独占状态；
// - 旧状态若混入独占态与真实值，由独占态接管，避免运行期出现互相矛盾的筛选集合。
export function normalizePropertySelection(values = []) {
    const source = values instanceof Set
        ? [...values]
        : (Array.isArray(values) ? values : [values]);
    const normalValues = [];
    const seen = new Set();
    let exclusiveValue;

    for (const value of source) {
        if (value === undefined || value === null) continue;
        const id = propertyValueKey(value);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        if (isExclusivePropertySelectionValue(value)) {
            if (exclusiveValue === undefined) exclusiveValue = value;
            continue;
        }
        normalValues.push(value);
    }

    return exclusiveValue !== undefined
        ? new Set([exclusiveValue])
        : new Set(normalValues);
}


// CreateDraft 只保留真正能够写入 Frontmatter 的属性值。
// 查询结构态（存在 / 缺失 / 空值）永远不进入新文件；真实值保持原有集合，
// 单值 / 多值约束由 Obsidian Property Type 在创建交互与最终落盘时统一决定。
export function materializableCreatePropertySelections(properties) {
    const source = properties instanceof Map ? properties : new Map();
    return new Map(
        [...source.entries()].flatMap(([key, values]) => {
            const normalized = normalizePropertySelection(values || []);
            const realValues = [...normalized].filter(value =>
                value !== PRESENT_PROPERTY_VALUE
                && !isSpecialPropertyValue(value)
            );
            return realValues.length
                ? [[key, new Set(realValues)]]
                : [];
        })
    );
}


// 只规范化“已存在属性”的原始值；缺失属性绝不从这里伪造成空值。
export function normalizePropertyValues(raw) {
    const out = [];
    const seen = new Set();
    const push = (value) => {
        if (Array.isArray(value)) {
            if (value.length === 0) push(null);
            else for (const item of value) push(item);
            return;
        }
        let normalized;
        if (value === null || value === undefined) normalized = EMPTY_PROPERTY_VALUE;
        else if (typeof value === "string") normalized = value.trim() || EMPTY_PROPERTY_VALUE;
        else if (typeof value === "number" || typeof value === "boolean") normalized = String(value);
        else return; // 不把对象/复杂 YAML 结构强转为 [object Object] 污染筛选值。
        const key = propertyValueKey(normalized);
        if (!seen.has(key)) {
            seen.add(key);
            out.push(normalized);
        }
    };
    push(raw);
    return out;
}


// 属性原始值到“筛选语义值”的唯一入口。
// 空字符串/null/空数组只有在整项没有任何真实值时才归入“有属性空值”；
// 一旦同一属性里存在任意真实值，空占位不再与真实值并存。
// 复杂对象仍保持不可筛选，不伪造成空值。
export function propertyValuesFromRaw(raw) {
    const normalized = normalizePropertyValues(raw);
    const realValues = normalized.filter(
        value => value !== EMPTY_PROPERTY_VALUE
    );
    if (realValues.length) return realValues;
    return normalized.includes(EMPTY_PROPERTY_VALUE)
        ? [EMPTY_PROPERTY_VALUE]
        : [];
}


// 列表写入统一展平历史嵌套数组；可选保留空数组语义。
export function flattenPropertyListStructure(rawValue, preserveEmptyArrays = false) {
    const out = [];
    const visit = value => {
        if (Array.isArray(value)) {
            if (!value.length) {
                if (preserveEmptyArrays) out.push(null);
                return;
            }
            for (const item of value) visit(item);
            return;
        }
        if (value !== undefined) out.push(value);
    };
    visit(rawValue);
    return out;
}


export function rawSampleForPropertyValue(rawValue, normalizedValue) {
    const wantedKey = propertyValueKey(normalizedValue);
    let found = false;
    let sample;

    const visit = value => {
        if (found) return;
        if (Array.isArray(value)) {
            if (value.length === 0 && normalizedValue === EMPTY_PROPERTY_VALUE) {
                found = true;
                sample = null;
                return;
            }
            for (const item of value) visit(item);
            return;
        }

        if (normalizePropertyValues(value).some(
            normalized => propertyValueKey(normalized) === wantedKey
        )) {
            found = true;
            sample = value;
        }
    };

    visit(rawValue);
    if (found) return sample;
    return normalizedValue === EMPTY_PROPERTY_VALUE ? null : undefined;
}


// Frontmatter 状态同时比较“键是否存在”和“值是什么”。
export function frontmatterPropertyStateEqual(
    beforePresent,
    beforeValue,
    afterPresent,
    afterValue
) {
    if (Boolean(beforePresent) !== Boolean(afterPresent)) return false;
    if (!beforePresent) return true;
    return JSON.stringify(beforeValue) === JSON.stringify(afterValue);
}


export function metaHasProperty(meta, key) {
    const properties = meta?.properties || {};
    return Object.prototype.hasOwnProperty.call(properties, key);
}


export function propertyValuesFromMeta(meta, key) {
    const properties = meta?.properties || {};
    if (!metaHasProperty(meta, key)) return [MISSING_PROPERTY_VALUE];
    return propertyValuesFromRaw(properties[key]);
}


export function propertySelectionMatches(meta, key, wantedValues) {
    const properties = meta?.properties || {};
    const hasProperty = Object.prototype.hasOwnProperty.call(properties, key);
    let actualKeys = null;

    for (const value of wantedValues || []) {
        if (value === PRESENT_PROPERTY_VALUE) {
            if (hasProperty) return true;
            continue;
        }
        if (!actualKeys) {
            actualKeys = new Set(
                propertyValuesFromMeta(meta, key).map(propertyValueKey)
            );
        }
        if (actualKeys.has(propertyValueKey(value))) return true;
    }
    return false;
}


export function buildPropertyUsageStats(
    candidates,
    key,
    selectedValues = [],
    knownValues = []
) {
    const canonical = new Map();
    for (const value of knownValues) {
        if (typeof value === "string" && !isSpecialPropertyValue(value)) canonical.set(value.toLocaleLowerCase(), value);
    }
    const display = value => typeof value === "string" && !isSpecialPropertyValue(value)
        ? (canonical.get(value.toLocaleLowerCase()) || value) : value;
    const identities = new Map();
    const valueId = value => {
        if (!identities.has(value)) identities.set(value, propertyValueKey(display(value)));
        return identities.get(value);
    };
    const absent = Symbol("missing-property");
    const normalizedByRaw = new Map();
    const selectedByRaw = new Map();
    const counts = new Map();
    const valueMap = new Map();
    const selected = [...normalizePropertySelection(selectedValues)];
    const hasSelection = selected.length > 0;
    const presenceSelected = selected.some(
        value => value === PRESENT_PROPERTY_VALUE
    );
    const selectedSpecialValue = selected.find(isSpecialPropertyValue);
    const selectedSpecialId = selectedSpecialValue === undefined
        ? ""
        : valueId(selectedSpecialValue);
    const selectedOverlapCounts = new Map();
    let present = 0;
    let selectedMatchCount = 0;

    // 单次扫描同时产出：
    // 1) 属性/值原始使用量；
    // 2) 当前同键 OR 选择的命中数；
    // 3) 每个值与当前选择的重叠数。
    // Picker 因此可以直接算“再加入该值”的 OR 投影，不需要逐行重扫候选集。
    for (const meta of candidates || []) {
        const hasProperty = metaHasProperty(meta, key);
        if (hasProperty) present++;
        const raw = hasProperty ? meta.properties[key] : absent;
        if (!normalizedByRaw.has(raw)) normalizedByRaw.set(raw, propertyValuesFromMeta(meta, key));
        const values = normalizedByRaw.get(raw);
        const valueIds = new Set();
        for (const value of values) {
            const id = valueId(value);
            if (valueIds.has(id)) continue;
            valueIds.add(id);
            if (!valueMap.has(id)) valueMap.set(id, display(value));
            counts.set(id, (counts.get(id) || 0) + 1);
        }

        if (hasSelection && !selectedByRaw.has(raw)) selectedByRaw.set(raw, propertySelectionMatches(meta, key, selected));
        if (hasSelection && selectedByRaw.get(raw)) {
            selectedMatchCount++;
            for (const id of valueIds) {
                selectedOverlapCounts.set(
                    id,
                    (selectedOverlapCounts.get(id) || 0) + 1
                );
            }
        }
    }

    // Picker 可能展示“完整属性值宇宙”里的值，而当前候选域内 rawCount 恰好为 0。
    // 这些可见值仍必须进入同一 Projection Map：真实值模式计算同键 OR；
    // 互斥结构状态与真实值之间则直接复用 rawCount 作为 REPLACE Projection。
    // 不为切换交互另建统计链，也不逐行重复扫描候选集。
    for (const knownValue of knownValues || []) {
        if (knownValue === PRESENT_PROPERTY_VALUE) continue;
        const id = valueId(knownValue);
        if (!valueMap.has(id)) valueMap.set(id, display(knownValue));
    }
    for (const selectedValue of selected) {
        if (selectedValue === PRESENT_PROPERTY_VALUE) continue;
        const id = valueId(selectedValue);
        if (!valueMap.has(id)) valueMap.set(id, display(selectedValue));
    }

    const projectedCounts = new Map();
    for (const [id, value] of valueMap) {
        const rawCount = counts.get(id) || 0;
        let projected = rawCount;

        if (hasSelection && !presenceSelected) {
            if (selectedSpecialValue !== undefined) {
                // 结构状态与其它同键候选在数据上互斥，但交互允许直接切换。
                // 当前结构状态显示当前 Draft 命中数；其它结构状态/真实值显示
                // “用该候选替换当前键选择”后的结果数。候选域已经忽略当前键，
                // 所以 rawCount 正好就是 REPLACE Projection，无需第二次扫描。
                projected = id === selectedSpecialId
                    ? selectedMatchCount
                    : rawCount;
            } else if (isSpecialPropertyValue(value)) {
                // 当前是真实值 OR 模式；点击结构状态会原子替换整个键，
                // 因此这里同样显示 REPLACE Projection，而不是错误裁成 0。
                projected = rawCount;
            } else {
                // 同键真实值继续保持 OR Projection。
                projected = selectedMatchCount
                    + rawCount
                    - (selectedOverlapCounts.get(id) || 0);
            }
        }

        projectedCounts.set(id, projected);
    }

    const values = [...valueMap.values()].sort((a, b) =>
        propertyValueSortRank(a) - propertyValueSortRank(b)
        || propertyValueDisplay(a).localeCompare(propertyValueDisplay(b), "zh-Hans-CN", { numeric: true })
    );
    return {
        present,
        counts,
        values,
        selectedMatchCount,
        projectedCounts,
        projectedKeyCount: hasSelection ? selectedMatchCount : present
    };
}
