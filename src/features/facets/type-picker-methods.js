// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { RESULT_FILE_TYPE_ACTIONS, attachmentExtension, fileTypeFilterDisplay, logicalFileType } from "../../data/formats/file-types.js";
import { syncSharedPickerTreeRowSelection } from "../../interactions/scroll-anchor.js";
import { setIndicatorLabel } from "../../ui/components/indicator-label.js";
import { createSearchButton } from "../../ui/components/input-controls.js";
import { attachFacetPickerOverflow, attachPickerHeaderModes } from "../../ui/pickers/header-modes.js";
import { configureSharedPickerHeader } from "../../ui/pickers/picker-header.js";
import { createSharedPickerTreeShell, renderSharedPickerRoot } from "../../ui/pickers/picker-shell.js";
import { createSharedPickerSelectionStrip } from "../../ui/pickers/selection-strip.js";
import { createPickerRowAction, createSharedPickerTreeRow } from "../../ui/pickers/tree-row.js";
import { Notice, setIcon } from "obsidian";
// Instance method owner. `this` is the unchanged SearchFacetController instance. No additional state store.
export const SearchFacetController_type_picker_methods = {


    openAttachmentTypePicker(anchor = null) {
        const core = this.owner;
        anchor ||= core.typeButtonEls.find(el => el.dataset.type === "attachment");
        if (!anchor) return;

        const panel = core.dropdown.open(anchor, "附件类型");
        panel.addClass("local-search-folder-dropdown","local-search-picker-dropdown","local-search-facet-picker");

        // Attachment navigation uses the current folder only, not search or other
        // refinement facets; excluded attachment kinds remain available to restore.
        const typeCandidates = core._navigationCandidates({ includeExcludedAttachments: true }).scope;
        const attachmentCandidates = typeCandidates.filter(meta =>
            logicalFileType(meta) === "attachment"
        );

        const extensionCounts = new Map();
        for (const meta of attachmentCandidates) {
            const extension = attachmentExtension(meta);
            if (!extension) continue;
            extensionCounts.set(extension, (extensionCounts.get(extension) || 0) + 1);
        }

        const extensions = [...extensionCounts.keys()].sort((a, b) =>
            a.localeCompare(b, "en", { numeric: true })
        );

        const currentCount = () => {
            const selected = [...core.filterState.fileTypes].filter(value =>
                value === "attachment" || value.startsWith("ext:")
            );
            const available = attachmentCandidates.filter(meta =>
                core.ignoreResultExclusions || !core.plugin.isResultAttachmentTypeExcluded(meta)
            );
            if (!selected.length) return available.length;
            const wanted = new Set(selected);
            let count = 0;
            for (const meta of available) {
                const extension = attachmentExtension(meta);
                if (wanted.has("attachment") || wanted.has(`ext:${extension}`)) count++;
            }
            return count;
        };

        const header = configureSharedPickerHeader(panel, {
            headingText: "附件类型",
            countText: currentCount(),
            icon: "paperclip",
            allText: "全部附件",
            allTitle: "筛选当前范围全部附件",
            onAll: () => {
                if (excludeMode?.activeId) return;
                const soleActive = core.filterState.fileTypes.size === 1
                    && core.filterState.fileTypes.has("attachment");
                core._applyFacetSelection(
                    "fileType",
                    "attachment",
                    { mode: soleActive ? "clear" : "replace" }
                );
                core._onFilterChanged();
                core.dropdown.close();
            }
        });
        let excludeMode = null;
        const exclusions = () => new Set(core.plugin.settings.resultExcludedAttachmentTypes || []);
        const toggleExclusion = extension => {
            const next = exclusions();
            if (next.has(extension)) next.delete(extension);
            else next.add(extension);
            void core.plugin.setResultExcludedAttachmentTypes([...next]).catch(error =>
                new Notice(`结果排除设置保存失败：${error?.message || error}`)
            );
        };
        const current = createSharedPickerSelectionStrip(panel, {
            canEdit: () => !excludeMode?.activeId,
            onClear: () => {
                core._applyFacetSelection("fileType", "", { mode: "clear" });
                core._onFilterChanged();
                this._syncHeaderCount(header, currentCount);
                renderCurrentSelection();
                syncSharedPickerTreeRowSelection(rootView?.row, false);
                render();
            }
        });

        const { search, rootHost, list } = createSharedPickerTreeShell(panel, {
            placeholder: "搜索附件类型…",
            rootClasses: "local-search-folder-root",
            treeClasses: "local-search-folder-tree"
        });

        let rootView = null;
        const renderCurrentSelection = () => {
            const values = [...core.filterState.fileTypes].filter(value =>
                value === "attachment" || value.startsWith("ext:")
            );
            current.render(values.map(value => {
                const label = fileTypeFilterDisplay(value);
                return {
                    key: value,
                    text: label,
                    title: `取消附件类型筛选 ${label}`,
                    onRemove: () => {
                        core._applyFacetSelection("fileType", value, { mode: "remove" });
                        core._onFilterChanged();
                        this._syncHeaderCount(header, currentCount);
                        renderCurrentSelection();
                        syncSharedPickerTreeRowSelection(
                            rootView?.row,
                            core.filterState.fileTypes.has("attachment")
                        );
                        render();
                    }
                };
            }));
        };

        rootView = renderSharedPickerRoot(rootHost, {
            title: "全部附件",
            icon: "paperclip",
            name: "全部附件",
            count: attachmentCandidates.length,
            countClasses: "local-search-folder-count",
            active: core.filterState.fileTypes.has("attachment"),
            onClick: () => {
                if (excludeMode?.activeId) return;
                const soleActive = core.filterState.fileTypes.size === 1
                    && core.filterState.fileTypes.has("attachment");
                core._applyFacetSelection(
                    "fileType",
                    "attachment",
                    { mode: soleActive ? "clear" : "replace" }
                );
                core._onFilterChanged();
                core.dropdown.close();
            }
        });

        const render = () => {
            const previousScrollTop = list.scrollTop;
            list.empty();
            const query = search.value.trim().toLowerCase();
            const visible = [...new Set([...extensions, ...exclusions()])]
                .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
                .filter(extension => !query || extension.includes(query));

            if (!visible.length) {
                list.createDiv({
 cls:"local-search-picker-empty",
                    text: query ? "没有匹配的附件类型" : "当前没有附件"
                });
                return;
            }

            for (const extension of visible) {
                const filterValue = `ext:${extension}`;
                const excluding = Boolean(excludeMode?.activeId);
                const hidden = exclusions().has(extension);
                createSharedPickerTreeRow(list, {
                    depth: 0,
                    active: !excluding && core.filterState.fileTypes.has(filterValue),
                    itemTitle: extension.toUpperCase(),
                    icon: "file",
                    name: extension.toUpperCase(),
                    count: extensionCounts.get(extension) || 0,
                    countClasses: "local-search-folder-count",
                    countPlacement: "row-end",
                    renderTrailing: excluding ? row => createPickerRowAction(row, {
                        icon: hidden ? "eye-off" : "eye",
                        label: `${hidden ? "恢复结果显示" : "从结果中排除"} ${extension.toUpperCase()}`,
                        onClick: () => toggleExclusion(extension)
                    }) : null,
                    onClick: () => {
                        if (excluding) return toggleExclusion(extension);
                        const soleActive = core.filterState.fileTypes.size === 1
                            && core.filterState.fileTypes.has(filterValue);
                        core._applyFacetSelection(
                            "fileType",
                            filterValue,
                            { mode: soleActive ? "clear" : "replace" }
                        );
                        core._onFilterChanged();
                        core.dropdown.close();
                    }
                });
            }
            list.scrollTop = previousScrollTop;
        };

        excludeMode = attachPickerHeaderModes(header, {
            modes: [{
                id: "result-exclude",
                icon: "eye-off",
                title: "结果排除附件类型",
                activeTitle: "退出结果排除"
            }],
            onChange: mode => {
                header.heading.textContent = mode ? "结果排除附件类型" : "附件类型";
                search.placeholder = mode ? "搜索要从结果中排除的类型…" : "搜索附件类型…";
                if (header.iconBtn) header.iconBtn.disabled = Boolean(mode);
                syncSharedPickerTreeRowSelection(rootView?.row, !mode && core.filterState.fileTypes.has("attachment"));
                renderCurrentSelection();
                render();
            }
        });
        attachFacetPickerOverflow(core, panel, header);
        core.dropdown.setRefreshHandler(panel, () => {
            this._syncHeaderCount(header, currentCount);
            render();
        });
        search.addEventListener("input", render);
        renderCurrentSelection();
        render();

        this._syncHeaderCount(header, currentCount);
    },


    buildTypeActions(parentEl) {
        const core = this.owner;
        if (!parentEl) return [];
        core.typeButtonEls = [];
        for (const def of RESULT_FILE_TYPE_ACTIONS) {
            const button = createSearchButton(parentEl, "choice", {
                cls: "local-search-status-filter-action",
                attr: {
                    title: def.label,
                    "aria-label": `筛选文件类型：${def.label}`,
                    "aria-pressed": "false"
                }
            });
            button.dataset.type = def.value;
            setIcon(button, def.icon);
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                if (core.createFlow?.isCreateView?.()) {
                    if (def.value === "attachment") return;
                    core._applyFacetSelection("fileType", def.value, { mode: "replace" });
                    core._onFilterChanged();
                    return;
                }
                if (def.value === "attachment") {
                    if (core.dropdown.closeIfSameAnchor(button)) return;
                    this.openAttachmentTypePicker();
                    return;
                }
                const soleActive = core.filterState.fileTypes.size === 1
                    && core.filterState.fileTypes.has(def.value);
                core._applyFacetSelection(
                    "fileType",
                    def.value,
                    { mode: soleActive ? "clear" : "replace" }
                );
                core._onFilterChanged();
            });
            core.typeButtonEls.push(button);
        }
        this.syncTypeButtons();
        return core.typeButtonEls;
    },


    syncTypeButtons() {
        const core = this.owner;
        for (const el of core.typeButtonEls || []) {
            const createMode = Boolean(core.createFlow?.isCreateView?.());
            const createUnsupported = createMode && el.dataset.type === "attachment";
            el.hidden = createUnsupported;
            el.setAttribute("aria-hidden", String(createUnsupported));
            const active = !createUnsupported && (
                core.filterState.fileTypes.has(el.dataset.type)
                || (el.dataset.type === "attachment"
                    && [...core.filterState.fileTypes].some(value => value === "attachment" || value.startsWith("ext:")))
            );
            el.classList.toggle("is-applied", active);
            el.setAttribute("aria-pressed", String(active));
        }
    },


    syncFilterButtons() {
        const core = this.owner;
        const tags = [...core.filterState.tags];
        const tagApplied = tags.length > 0;
        setIndicatorLabel(core.tagFilterBtn, "标签");
        core.tagFilterBtn.classList.toggle("is-applied", tagApplied);
        core.tagFilterBtn.setAttribute("aria-pressed", String(tagApplied));
        this.updateFolderButton();
        const propertyApplied = core.filterState.properties.size > 0;
        setIndicatorLabel(core.propertyFilterBtn, "属性");
        core.propertyFilterBtn.classList.toggle("is-applied", propertyApplied);
        core.propertyFilterBtn.setAttribute("aria-pressed", String(propertyApplied));
        this.renderPinnedPropertyFilters();
        this.syncTypeButtons();
    },
};

