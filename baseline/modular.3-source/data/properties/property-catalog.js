// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { sortByPreferredOrder } from "../../utils/preferred-order.js";
import { buildTagTreeModel, flattenTagTreePaths } from "../tags/tag-tree.js";
import { PRESENT_PROPERTY_VALUE, buildPropertyUsageStats, isSpecialPropertyValue, propertyValueDisplay, propertyValueKey, propertyValueSortRank } from "./property-values.js";


export function collectPropertyKeys(candidates = [], excludedKeys = []) {
    const excluded = new Set(excludedKeys || []);
    excluded.add("position");

    const keys = new Set();
    for (const meta of candidates) {
        for (const key of Object.keys(meta.properties || {})) {
            if (
                !excluded.has(key)
                && String(key).toLowerCase() !== "tags"
            ) {
                keys.add(key);
            }
        }
    }

    return [...keys].sort((a, b) =>
        a.localeCompare(b, "zh-Hans-CN")
    );
}



export function orderPropertyValuesForPicker(values = [], preferredOrder = []) {
    const normal = sortByPreferredOrder(
        (values || []).filter(value => !isSpecialPropertyValue(value)),
        preferredOrder,
        propertyValueKey
    );
    const special = (values || [])
        .filter(isSpecialPropertyValue)
        .sort((a, b) =>
            propertyValueSortRank(a) - propertyValueSortRank(b)
            || propertyValueDisplay(a).localeCompare(
                propertyValueDisplay(b),
                "zh-Hans-CN",
                { numeric: true }
            )
        );
    return [...normal, ...special];
}


export function orderSelectedPropertyValues(values = [], preferredOrder = []) {
    const source = [...(values || [])];
    const presence = source.filter(value => value === PRESENT_PROPERTY_VALUE);
    return [
        ...presence,
        ...orderPropertyValuesForPicker(
            source.filter(value => value !== PRESENT_PROPERTY_VALUE),
            preferredOrder
        )
    ];
}


// 已选属性的唯一 Picker 顺序投影：所有“当前已选 / 当前条件 / 新建摘要 / 新建落盘”
// 都从同一 key/value order 派生，不再分别按 Map / Set 插入顺序解释。
export function orderPropertySelectionsForPicker(
    properties = new Map(),
    preferredKeyOrder = [],
    preferredValueOrder = {}
) {
    const source = properties instanceof Map ? properties : new Map();
    const orderedKeys = sortByPreferredOrder(
        [...source.keys()],
        preferredKeyOrder,
        key => key
    );
    return orderedKeys.map(key => [
        key,
        orderSelectedPropertyValues(
            source.get(key) || [],
            preferredValueOrder?.[key] || []
        )
    ]);
}


// Picker 排序的权威快照：维护动作开始前先把当前真实显示顺序物化。
// 重命名只替换原槽位，删除只移除原槽位；不能让新名称因“未命中偏好表”掉到列表底部。
export function materializeTagPickerOrder(candidates = [], preferredOrder = []) {
    return flattenTagTreePaths(
        buildTagTreeModel(candidates, preferredOrder)
    );
}


export function materializePropertyPickerOrders(
    candidates = [],
    excludedKeys = [],
    preferredKeyOrder = [],
    preferredValueOrder = {}
) {
    const keys = sortByPreferredOrder(
        collectPropertyKeys(candidates, excludedKeys),
        preferredKeyOrder,
        key => key
    );
    const values = {};
    for (const key of keys) {
        values[key] = orderPropertyValuesForPicker(
            buildPropertyUsageStats(candidates, key).values,
            preferredValueOrder?.[key] || []
        )
            .filter(value => !isSpecialPropertyValue(value))
            .map(propertyValueKey);
    }
    return { keys, values };
}
