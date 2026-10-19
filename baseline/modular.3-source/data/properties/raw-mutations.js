// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeMetadataPropertyType } from "./property-types.js";
import { EMPTY_PROPERTY_VALUE, MISSING_PROPERTY_VALUE, flattenPropertyListStructure, normalizePropertyValues, propertyValueKey, rawSampleForPropertyValue } from "./property-values.js";


// 属性值写盘与内存索引共用同一纯转换，避免“文件已改、Picker 仍读旧缓存”的双状态。
export function removeRawPropertyValues(current, removeKeys) {
    const keys = removeKeys instanceof Set ? removeKeys : new Set(removeKeys || []);
    if (current === undefined || !keys.size) return current;
    if (Array.isArray(current)) {
        const matched = normalizePropertyValues(current).some(value =>
            keys.has(propertyValueKey(value))
        );
        if (!matched) return current;
        const next = flattenPropertyListStructure(current).filter(item =>
            !normalizePropertyValues(item).some(value =>
                keys.has(propertyValueKey(value))
            )
        );
        return next.length ? next : undefined;
    }
    return normalizePropertyValues(current).some(value =>
        keys.has(propertyValueKey(value))
    )
        ? undefined
        : current;
}


export function renameRawPropertyValue(
    current,
    oldValue,
    newValue,
    propertyType = "text"
) {
    const oldKey = propertyValueKey(oldValue);
    const listType = normalizeMetadataPropertyType(propertyType) === "multitext";
    const targetValues = normalizePropertyValues(newValue);
    if (targetValues.length !== 1) {
        throw new Error("目标属性值必须是单个有效值");
    }
    const targetNormalizedValue = targetValues[0];
    const sampledTargetValue = rawSampleForPropertyValue(
        newValue,
        targetNormalizedValue
    );
    const targetValue = sampledTargetValue !== undefined
        ? sampledTargetValue
        : (targetNormalizedValue === EMPTY_PROPERTY_VALUE
            ? null
            : targetNormalizedValue);

    const dedupeList = values => {
        const seen = new Set();
        const result = [];
        for (const value of flattenPropertyListStructure(values)) {
            const normalizedValues = normalizePropertyValues(value);
            if (!normalizedValues.length) {
                result.push(value);
                continue;
            }
            const id = propertyValueKey(normalizedValues[0]);
            if (seen.has(id)) continue;
            seen.add(id);
            result.push(value);
        }
        return result;
    };

    if (oldValue === MISSING_PROPERTY_VALUE) {
        return current === undefined
            ? (listType ? [targetValue] : targetValue)
            : current;
    }
    if (current === undefined) return current;
    if (Array.isArray(current)) {
        if (current.length === 0) {
            if (oldValue !== EMPTY_PROPERTY_VALUE) return current;
            return listType ? [targetValue] : targetValue;
        }
        const sourceItems = flattenPropertyListStructure(current, true);
        let matched = false;
        const next = sourceItems.map(item => {
            const hit = normalizePropertyValues(item).some(
                value => propertyValueKey(value) === oldKey
            );
            if (!hit) return item;
            matched = true;
            return targetValue;
        });
        return matched ? dedupeList(next) : current;
    }
    const matched = normalizePropertyValues(current).some(
        value => propertyValueKey(value) === oldKey
    );
    if (!matched) return current;
    return listType ? [targetValue] : targetValue;
}
