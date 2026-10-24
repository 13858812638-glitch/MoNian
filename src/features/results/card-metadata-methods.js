// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { resultFileTypeDisplay, resultFileTypeFilterValue, resultFileTypeIcon, resultFileTypeLabel } from "../../data/formats/file-types.js";
import { orderSelectedPropertyValues } from "../../data/properties/property-catalog.js";
import { EMPTY_PROPERTY_VALUE, MISSING_PROPERTY_VALUE, normalizePropertyValues, propertyValueDisplay, propertyValuesFromRaw } from "../../data/properties/property-values.js";
import { orderTagsForPicker } from "../../data/tags/tag-tree.js";
import { tagIdentityKey } from "../../data/tags/tag-values.js";
import { createSearchButton } from "../../ui/components/input-controls.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { sortByPreferredOrder } from "../../utils/preferred-order.js";
import { fillSearchHitText, tagQueryMatchRanges } from "../../utils/search-text.js";
import { resultFolderColorConfig } from "../folders/folder-colors.js";
import { setIcon } from "obsidian";
// Instance method owner. `this` is the unchanged SearchResultRendererController instance. No additional state store.
export const SearchResultRendererController_card_metadata_methods = {


    _appendHighlightedTitle(parent, result) {
        const name = result?.name || "";
        const title = parent.createEl("span", { cls: "local-search-item-title" });
        fillSearchHitText(title, name, result?.titleMatchRanges || []);
        return title;
    },

    
    _buildTitleRow(item, result) {
        const core = this.owner;
        const titleRow = item.createDiv({ cls: "local-search-item-title-row" });
        // Result Title Primitive：标题行拥有布局，只有可见文件名拥有打开热区。
        // 类型图标及标题后的剩余空间始终属于结果卡批量选择区域。
        const titleMain = titleRow.createDiv({ cls: "local-search-item-title-main" });
        const typeIcon = titleMain.createSpan({
            cls: "local-search-item-leading-icon",
            attr: { "aria-hidden": "true" }
        });
        setIcon(typeIcon, resultFileTypeIcon(result));
        if (!core.externalPickHandler) {
            const titleOpen = createSearchButton(titleMain, "quiet", {
                cls: "local-search-batch-title-open",
                attr: { "aria-label": `打开文件：${result.name || result.path}`, title: "打开文件" }
            });
            this._appendHighlightedTitle(titleOpen, result);
        } else {
            this._appendHighlightedTitle(titleMain, result);
        }

        const titleActions = titleRow.createDiv({
            cls: "local-search-item-title-actions",
            attr: { "aria-label": "结果卡操作" }
        });
        const typeFilterValue = resultFileTypeFilterValue(result);
        const typeLabel = resultFileTypeLabel(result);
        const typeButton = createSearchButton(titleActions, "quiet", {
            text: resultFileTypeDisplay(result),
            cls: "local-search-item-meta local-search-meta-nav",
            attr: {
                "aria-label": `筛选文件类型：${typeLabel}`,
                title: `筛选文件类型：${typeLabel}`
            }
        });
        typeButton.dataset.lsNav = "fileType";
        typeButton.dataset.value = typeFilterValue;

        return { titleRow, typeButton };
    },


    _createFilterChip(parent, { kind, value, key = "", text, title, extraClass = "", highlightRanges = [] }) {
        const isTag = kind === "tag";
        const componentClass = isTag ? "local-search-item-tag" : "local-search-item-property";
        const className = `local-search-result-attribute-chip ${componentClass} local-search-meta-nav${extraClass ? ` ${extraClass}` : ""}`;
        const label = createSearchButton(parent, "quiet", {
            cls: className,
            attr: { "aria-label": `筛选：${title}` }
        });
        fillSearchHitText(label, text, highlightRanges);
        label.dataset.lsNav = kind;
        label.dataset.key = key;
        label.dataset.value = value;
        return label;
    },


    _createResultMetadataRow(item, kind = "meta") {
        const row = item.createDiv({ cls: `local-search-result-metadata-row is-${kind}` });
        const flow = row.createDiv({ cls: "local-search-result-metadata-flow" });
        const aside = row.createDiv({ cls: "local-search-result-metadata-aside" });
        return { row, flow, aside };
    },


    _appendTags(item, result) {
        const core = this.owner;
        const tags = result.tags || [];
        if (!tags.length) return null;
        const inlineTagKeys = new Set((result.inlineTags || []).map(tagIdentityKey).filter(Boolean));
        const frontTagKeys = new Set(normalizePropertyValues(result.properties?.tags).map(tagIdentityKey).filter(Boolean));
        const { row, flow, aside } = this._createResultMetadataRow(item, "tags");
        aside.hidden = true;

        const orderedTags = orderTagsForPicker(tags, core.plugin.settings.pickerTagOrder);
        for (const tag of orderedTags) {
            const normalizedTag = tagIdentityKey(tag);
            this._createFilterChip(flow, {
                kind: "tag",
                value: tag,
                text: tag,
                title: tag,
                extraClass: inlineTagKeys.has(normalizedTag) && !frontTagKeys.has(normalizedTag)
                    ? "is-inline-tag"
                    : "",
                highlightRanges: tagQueryMatchRanges(tag, core.queryState)
            });
        }
        return row;
    },


    _visibleProperties(result) {
        const core = this.owner;
        const hidden = new Set(core.plugin.settings.hiddenResultPropertyKeys || []);
        const propertyMap = result.properties || {};
        const availableKeys = Object.keys(propertyMap)
            .filter(key => key !== "position"
            && key !== "tags");
        const orderedKeys = sortByPreferredOrder(
            availableKeys,
            core.plugin.settings.pickerPropertyOrder,
            key => key
        );
        return orderedKeys
            .filter(key => !hidden.has(key))
            .map(key => ({
            key,
            values: orderSelectedPropertyValues(
                propertyValuesFromRaw(propertyMap[key]),
                core.plugin.settings.pickerPropertyValueOrder?.[key] || []
            )
        }))
            // 复杂 YAML 对象不会被 normalizePropertyValues 强转；
            // 无可展示值的属性不能占用默认显示名额，也不能生成“空 key：”。
            .filter(({ values }) => values.length > 0);
    },

    
    _createPropertyKeyButton(parent, key) {
        const core = this.owner;
        const button = createSearchButton(parent, "quiet", {
            // 属性键与属性值使用“弱键 + 强值”结构；
            // 不再依赖冒号制造层级，避免结果卡元数据出现正文句式感。
            text: key,
            cls: "local-search-item-property-key",
            attr: {
                "aria-label": `选择 ${key} 的属性值`
            }
        });
        button.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            // 与标签 / 属性 / 文件夹 Picker 使用同一套开关语义：
            // 再次点击当前锚点 = 关闭；点击其它锚点 = 切换到新 Picker。
            if (core.dropdown.closeIfSameAnchor(button))
                return;
            core.facets.openPropertyPicker(key, button);
        });
        return button;
    },

    
    _appendProperties(item, result) {
        const core = this.owner;
        const properties = this._visibleProperties(result)
            .map(property => ({
                ...property,
                values: property.values.filter(value => value !== MISSING_PROPERTY_VALUE)
            }))
            .filter(property => property.values.length);
        if (!properties.length) return null;

        const { row, flow, aside } = this._createResultMetadataRow(item, "properties");
        aside.hidden = true;
        const appendProperty = ({ key, values }) => {
            const group = flow.createDiv({ cls: "local-search-item-property-group" });
            this._createPropertyKeyButton(group, key);
            let hasLongValue = false;
            let totalDisplayLength = 0;
            for (const value of values) {
                const isEmptyValue = value === EMPTY_PROPERTY_VALUE;
                const display = isEmptyValue ? "空" : propertyValueDisplay(value);
                totalDisplayLength += String(display).length;
                if (String(display).length > 40) hasLongValue = true;
                const chip = this._createFilterChip(group, {
                    kind: "property",
                    key,
                    value,
                    text: display,
                    title: isEmptyValue ? `${key}：有属性但无值` : `${key}：${display}`
                });
                if (isEmptyValue) chip.addClass("is-empty-property-value");
            }
            if (totalDisplayLength > 56) hasLongValue = true;
            if (hasLongValue) {
                const expand = createSearchButton(group, "quiet", {
                    text: "展开",
                    cls: "local-search-item-property-expand",
                    attr: {
                        "aria-expanded": "false",
                        "aria-label": `展开属性 ${key} 的完整值`
                    }
                });
                expand.addEventListener("click", e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const expanded = !group.hasClass("is-value-expanded");
                    group.toggleClass("is-value-expanded", expanded);
                    expand.textContent = expanded ? "收起" : "展开";
                    expand.setAttribute("aria-expanded", String(expanded));
                    expand.setAttribute("aria-label", `${expanded ? "收起" : "展开"}属性 ${key} 的完整值`);
                });
            }
        };
        properties.forEach(appendProperty);
        return row;
    },


    _timeFormatters() {
        // 每个结果窗口仅建立三份格式器；卡片滚入视口不反复初始化 Intl。
        return this._dateFormats ||= {
            date: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }),
            shortDate: new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }),
            time: new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" })
        };
    },


    _formatTime(timestamp) {
        const formats = this._timeFormatters();
        return `${formats.date.format(timestamp)} ${formats.time.format(timestamp)}`;
    },


    _formatCardMetaTime(timestamp) {
        const formats = this._timeFormatters();
        const format = new Date(timestamp).getFullYear() === new Date().getFullYear() ? formats.shortDate : formats.date;
        return `${format.format(timestamp)} ${formats.time.format(timestamp)}`;
    },


    _appendMetaFields(item, result, fieldIds = []) {
        const core = this.owner;
        const ids = normalizeUniqueStringList(fieldIds)
            .filter(id => ["folder", "createdTime", "contentModifiedTime", "modifiedTime"].includes(id));
        if (!ids.length) return null;

        const slash = result.path.lastIndexOf("/");
        const dirPath = slash >= 0 ? result.path.slice(0, slash) : "";
        const createdTime = result.ctime ?? 0;
        const contentModifiedTime = result.contentModifiedAt ?? 0;
        const modifiedTime = result.fileModifiedAt ?? 0;
        const timeMeta = id => {
            if (id === "createdTime" && createdTime) return {
                icon: "calendar-plus", label: "创建时间", timestamp: createdTime,
                text: this._formatCardMetaTime(createdTime)
            };
            if (id === "contentModifiedTime" && contentModifiedTime) return {
                icon: "file-clock",
                label: ["md", "canvas", "excalidraw"].includes(result.extension) ? "正文修改" : "修改时间",
                timestamp: contentModifiedTime,
                text: this._formatCardMetaTime(contentModifiedTime)
            };
            if (id === "modifiedTime" && modifiedTime) return {
                icon: "clock-3", label: "文件修改", timestamp: modifiedTime,
                text: this._formatCardMetaTime(modifiedTime)
            };
            return null;
        };

        const available = ids.some(id => id === "folder" || Boolean(
            id === "createdTime" ? createdTime : id === "contentModifiedTime" ? contentModifiedTime : modifiedTime));
        if (!available) return null;
        const { row, flow, aside } = this._createResultMetadataRow(item, "meta");
        let hasFlow = false, hasAside = false;

        for (const id of ids) {
            if (id === "folder") {
                const pathButton = createSearchButton(flow, "quiet", {
                    text: dirPath || "根目录",
                    cls: "local-search-result-attribute-chip local-search-item-path local-search-meta-nav",
                    attr: { "aria-label": `筛选文件夹 ${dirPath || "根目录"}` }
                });
                pathButton.dataset.lsNav = "folder";
                pathButton.dataset.value = dirPath || "/";
                const folderColor = resultFolderColorConfig(core.plugin.settings, dirPath || "/");
                if (folderColor) {
                    pathButton.addClass("has-custom-folder-color");
                    if (folderColor.light) pathButton.style.setProperty("--ls-result-folder-color-light", folderColor.light);
                    if (folderColor.dark) pathButton.style.setProperty("--ls-result-folder-color-dark", folderColor.dark);
                }
                hasFlow = true;
                continue;
            }
            const meta = timeMeta(id);
            if (!meta) continue;
            const description = `${meta.label} ${this._formatTime(meta.timestamp)}`;
            const timeField = aside.createSpan({
                cls: "local-search-result-meta-cell",
                attr: {
                    "aria-label": description,
                    title: description
                }
            });
            const inner = timeField.createSpan({ cls: "local-search-result-meta-content" });
            const icon = inner.createSpan({
                cls: "local-search-result-meta-icon",
                attr: { "aria-hidden": "true" }
            });
            setIcon(icon, meta.icon);
            inner.createSpan({ cls: "local-search-result-meta-text", text: meta.text });
            hasAside = true;
        }
        flow.hidden = !hasFlow;
        aside.hidden = !hasAside;
        if (!hasFlow && !hasAside) {
            row.remove();
            return null;
        }
        return row;
    },
};

