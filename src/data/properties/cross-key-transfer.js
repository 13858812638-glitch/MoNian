// Safe single-value transfer between two existing Obsidian text/list keys.
// Never reinterpret dates, numbers, checkboxes or complex YAML as text.
import { propertyValueKey, isExclusivePropertySelectionValue } from './property-values.js';

// Keep the safety core host-free: importing the whole property-types module
// pulls Obsidian runtime-only helpers into the pure validation path.
const normalizedTextType = type => {
    const typeName = String(type ?? '').trim().toLowerCase();
    return ['list', 'tags', 'aliases'].includes(typeName) ? 'multitext' : typeName;
};
const isPlainText = value => typeof value === 'string' && value.trim().length > 0;
const textList = (raw, label) => {
    if (raw === undefined) return [];
    const values = Array.isArray(raw) ? raw : [raw];
    if (!values.every(isPlainText)) throw new Error(`${label}包含非文本、空值或复杂结构，不能安全迁移`);
    return values;
};

export function transferTextPropertyValue(frontmatter, sourceKey, value, targetKey, sourceType, targetType) {
    const fromType = normalizedTextType(sourceType);
    const toType = normalizedTextType(targetType);
    if (!['text', 'multitext'].includes(fromType) || !['text', 'multitext'].includes(toType))
        throw new Error('只有文本与列表属性之间支持跨键拖拽，数字、日期、复选框请使用属性编辑器');
    if (!isPlainText(value) || isExclusivePropertySelectionValue(value))
        throw new Error('只能迁移真实的非空文本属性值');
    if (!sourceKey || !targetKey || sourceKey === targetKey) throw new Error('源属性键和目标属性键必须不同');
    const rawSource = frontmatter[sourceKey];
    if (rawSource === undefined) return { changed: false };
    const sourceValues = textList(rawSource, '源属性');
    const valueId = propertyValueKey(value);
    const matched = sourceValues.some(item => propertyValueKey(item) === valueId);
    if (!matched) return { changed: false };
    const rawTarget = frontmatter[targetKey];
    const targetValues = textList(rawTarget, '目标属性');
    const chosen = sourceValues.find(item => propertyValueKey(item) === valueId); // preserve original spelling
    let nextTarget;
    if (toType === 'text') {
        if (Array.isArray(rawTarget) && targetValues.length > 1)
            throw new Error(`目标「${targetKey}」已经有多个值，不能转为单一文本`);
        if (targetValues.length && targetValues.some(item => propertyValueKey(item) !== valueId))
            throw new Error(`目标「${targetKey}」已有不同文本值，拒绝覆盖；请先调整目标属性类型或处理冲突`);
        nextTarget = targetValues.length ? (targetValues[0]) : chosen;
    } else {
        // Preserve all pre-existing list items byte-for-byte and in order;
        // de-duplicate only the value being appended by this operation.
        nextTarget = targetValues.some(item => propertyValueKey(item) === valueId)
            ? [...targetValues] : [...targetValues, chosen];
    }
    const remaining = sourceValues.filter(item => propertyValueKey(item) !== valueId);
    const nextSource = remaining.length ? Array.isArray(rawSource) ? remaining : remaining[0] : undefined;
    return { changed: true, nextSource, nextTarget };
}
