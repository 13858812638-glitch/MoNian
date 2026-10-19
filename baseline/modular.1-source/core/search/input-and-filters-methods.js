// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { attachmentExtension, logicalFileType } from "../../data/formats/file-types.js";
import { isExclusivePropertySelectionValue, normalizePropertySelection, propertyValueKey } from "../../data/properties/property-values.js";
import { NO_TAGS_FILTER_VALUE, normalizeFilterTagSelection, normalizeTagValue, tagIdentityKey } from "../../data/tags/tag-values.js";
import { isGLSTimeSidecarPath } from "../../data/time/time-values.js";
import { FilterEngine } from "../../features/filters/FilterEngine.js";
import { FilterState, normalizeFileTypeFilterValue } from "../../features/filters/filter-state.js";
import { isDomInput } from "../../utils/dom.js";
import { normalizeVaultFolderPath } from "../../utils/vault-paths.js";
// Instance method owner. `this` is the unchanged SearchCore instance. No additional state store.
export const SearchCore_input_and_filters_methods = {


    _initializeResultState() {
        // Header 的 Filter Pool / Quick Dock 在 Shell 完成后只做一次初始填充；
        // 后续由各自 Owner 显式刷新，不再依赖 renderPage() 顺带建立。
        this.resultRenderer._renderFilterPoolHeader();

        // 空输入按“最近打开 · 降序”进入正式默认结果态；搜索记录通过独立历史按钮进入。
        // renderCurrentView 是同步计算 / 同步首屏渲染，不再人为制造 Promise 微任务断点。
        this.performSearch(
            this.createFlow.isCreateMode()
                ? this.queryState.raw
                : this.searchInput.value,
            true
        );
    },


    _commitSearchInputValue() {
        if (this._destroyed || !isDomInput(this.searchInput)) return false;
        if (this._inputComposing) return false;
        const query = String(this.searchInput.value || "");
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = null;
        this._notifyStateChange();

        if (this.createFlow?.isCreateMode?.()) {
            this.createFlow.handleInput(query);
            return true;
        }

        const previousQuery = this.queryState.normalized;
        const nextNormalized = query.trim().toLocaleLowerCase("zh-CN");
        // 搜索词改变就是新的结果上下文：不等 debounce，立即退出旧批量选择。
        if (previousQuery !== nextNormalized && this.selection.selectedPaths.size) {
            this.selection.clear();
        }
        this._syncSearchHeaderControls();

        if (!query.trim()) {
            this.performSearch("");
            return true;
        }
        this.searchTimer = setTimeout(() => {
            this.searchTimer = null;
            if (!this._destroyed) this.performSearch(query);
        }, 150);
        return true;
    },


    _bindSearchInput() {
        // 原生输入与程序化“应用搜索记录”共用唯一提交入口；搜索复用 150ms 防抖。
        this.searchInput.addEventListener("compositionstart", () => {
            this._inputComposing = true;
            if (this.searchTimer) clearTimeout(this.searchTimer);
            this.searchTimer = null;
        });
        this.searchInput.addEventListener("compositionend", () => {
            this._inputComposing = false;
            this._commitSearchInputValue();
            this.plugin.sharedSearchState?.schedule(this);
        });
        this.searchInput.addEventListener("blur", () => this.plugin.sharedSearchState?.schedule(this));
        this.searchInput.addEventListener("input", () => this._commitSearchInputValue());

        this.searchInput.addEventListener("keydown", async (e) => {
            if (this._destroyed || e.isComposing || e.keyCode === 229) return;
            if (e.key === "Escape") {
                e.preventDefault();

                // Child dialog → picker → search; never dismiss the parent while its child is pending.
                if (this._confirmSession) {
                    this._confirmSession.finish(false);
                    return;
                }
                if (this.dropdown.isOpen) {
                    this.dropdown.close();
                    return;
                }

                this.close();
                return;
            }
            if (e.key === "ArrowDown") { e.preventDefault(); this.resultRenderer.navigateResults(1); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); this.resultRenderer.navigateResults(-1); return; }
            if (e.key === "Enter") {
                e.preventDefault();
                if (this.searchTimer) this.performSearch(this.searchInput.value);

                // Search 0 命中直接派生 Create View；Enter 与显式 Create 共用唯一提交链。
                // 与 Dida Master 一致：组合修饰键保留给宿主/结果打开语义，不触发快速创建。
                if (
                    this.createFlow?.isCreateView?.()
                    && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
                ) {
                    e.stopPropagation();
                    await this.createFlow.submitCreateView();
                    return;
                }

                if (this.selection.batchMode) {
                    if (this.selectedIndex >= 0 && this.selectedIndex < this.resultEls.length) {
                        const activeEl = this.resultEls[this.selectedIndex];
                        const activeResult = this._resolveResultElement(activeEl);
                        if (activeResult?.path) this.selection.togglePath(activeResult.path);
                    }
                    return;
                }

                if (this.selectedIndex >= 0 && this.selectedIndex < this.resultEls.length) {
                    await this.openSelectedNote(!!(e.metaKey || e.ctrlKey));
                    return;
                }
                if (this.renderedResults.length > 0) {
                    const first = this.renderedResults[0];
                    await this._openResultFromSearch(first.file, {
                        newTab: !!(e.metaKey || e.ctrlKey),
                        excludedPath: first.path
                    });
                    return;
                }
            }
        });
        this.containerEl.addEventListener("keydown", e => {
            if (
                !this.plugin.settings.enableTabFocusSearch ||
                e.key !== "Tab" ||
                e.shiftKey ||
                e.altKey ||
                e.ctrlKey ||
                e.metaKey ||
                e.isComposing ||
                e.keyCode === 229
            ) {
                return;
            }

            // 搜索框未全选时保留快捷全选；已全选后允许 Tab 离开。
            if (e.target === this.searchInput) {
                const input = this.searchInput;
                if (input.value && (input.selectionStart !== 0 || input.selectionEnd !== input.value.length)) {
                    e.preventDefault();
                    input.select();
                }
                return;
            }
            // 仅稳定容器承接快捷聚焦；按钮和结果保留原生 Tab 顺序。
            if (e.target !== this.containerEl || this.dropdown.isOpen) return;

            e.preventDefault();
            this.searchInput?.focus({ preventScroll: true });
            this.searchInput?.select();
        });

    },



    // Result Metadata Quick Filter：卡片元数据只负责声明“同类入口”的正式交互语义；
    // 真正的筛选状态仍全部写回唯一 FilterState，不复制 Result 专用状态。
    _applyResultQuickFilter(kind, value, key = "") {
        if (kind === "tag") {
            // 结果卡 Tag 与普通 Tag Facet 同属浏览筛选：点击可累积/取消，但 GLS 查询语义仍保持 AND。
            this.filterState.tagMatchMode = "all";
            this._applyFacetSelection("tag", value, { mode: "toggle" });
            return;
        }

        if (kind === "property") {
            // 同键属性值本身就是 OR；跨键仍保持 GLS 普通 Facet 的 AND。
            this.filterState.propertyMatchMode = "all";
            this._applyFacetSelection("property", value, { key, mode: "toggle" });
            return;
        }

        if (kind === "folder") {
            const normalized = String(value || "").trim();
            if (!normalized) return;
            const onlyCurrent = this.filterState.folders.size === 1
                && this.filterState.folders.has(normalized);
            this._applyFacetSelection("folder", normalized, {
                mode: onlyCurrent ? "clear" : "replace"
            });
            return;
        }

        if (kind === "fileType") {
            const normalized = normalizeFileTypeFilterValue(value);
            if (!normalized) return;
            const onlyCurrent = this.filterState.fileTypes.size === 1
                && this.filterState.fileTypes.has(normalized);
            this._applyFacetSelection("fileType", normalized, {
                mode: onlyCurrent ? "clear" : "replace"
            });
        }
    },


    // Facet Selection Engine：Live FilterState 与 Picker Draft 共用这一套规则。
    // UI 只表达 replace / toggle / remove / clear；Draft 不复制业务语义。
    _applyFacetSelectionToState(state, kind, value, { key = "", mode = "replace" } = {}) {
        if (!(state instanceof FilterState)) return;
        const operation = ["replace", "toggle", "remove", "clear"].includes(mode)
            ? mode
            : "replace";

        if (kind === "tag") {
            if (operation === "clear") {
                state.tags.clear();
                return;
            }

            const normalizedValue = value === NO_TAGS_FILTER_VALUE
                ? NO_TAGS_FILTER_VALUE
                : normalizeTagValue(value);
            if (!normalizedValue) return;

            const values = operation === "toggle" || operation === "remove"
                ? new Set(state.tags)
                : new Set();
            const existing = normalizedValue === NO_TAGS_FILTER_VALUE
                ? (values.has(NO_TAGS_FILTER_VALUE)
                    ? NO_TAGS_FILTER_VALUE
                    : undefined)
                : [...values].find(selected =>
                    selected !== NO_TAGS_FILTER_VALUE
                    && tagIdentityKey(selected) === tagIdentityKey(normalizedValue)
                );

            if (operation === "remove") {
                if (existing !== undefined) values.delete(existing);
            } else if (operation === "toggle" && existing !== undefined) {
                values.delete(existing);
            } else if (normalizedValue === NO_TAGS_FILTER_VALUE) {
                // “没有标签”与真实标签天然互斥：新选择哪一侧，就由哪一侧接管。
                values.clear();
                values.add(NO_TAGS_FILTER_VALUE);
            } else {
                values.delete(NO_TAGS_FILTER_VALUE);
                values.add(normalizedValue);
            }
            state.tags = this._normalizeTagSelection(values);
            return;
        }

        if (kind === "property") {
            if (operation === "clear") {
                if (key) state.properties.delete(key);
                else state.properties.clear();
                return;
            }
            if (!key) return;

            const values = operation === "toggle" || operation === "remove"
                ? normalizePropertySelection(state.properties.get(key) || [])
                : new Set();
            const incomingKey = propertyValueKey(value);
            const existing = [...values].find(
                selected => propertyValueKey(selected) === incomingKey
            );

            if (operation === "remove") {
                if (existing !== undefined) values.delete(existing);
            } else if (operation === "toggle" && existing !== undefined) {
                values.delete(existing);
            } else if (isExclusivePropertySelectionValue(value)) {
                // 独占状态永远不与真实值或其它独占状态共存。
                values.clear();
                values.add(value);
            } else {
                // 真实值之间同键 OR；若外部旧状态残留独占态，真实值接管该键。
                for (const selected of [...values]) {
                    if (isExclusivePropertySelectionValue(selected)) {
                        values.delete(selected);
                    }
                }
                values.add(value);
            }

            const normalized = normalizePropertySelection(values);
            if (normalized.size) state.properties.set(key, normalized);
            else state.properties.delete(key);
            return;
        }

        if (kind === "folder") {
            if (operation === "clear") {
                state.folders.clear();
            } else if (operation === "toggle" || operation === "remove") {
                const normalized = String(value || "").trim();
                if (!normalized) return;
                if (operation === "remove") {
                    state.folders.delete(normalized);
                } else if (state.folders.has(normalized)) {
                    state.folders.delete(normalized);
                } else {
                    state.folders.add(normalized);
                }
            } else {
                state.folder = value;
            }
            return;
        }

        if (kind === "fileType") {
            if (operation === "clear") {
                state.fileTypes.clear();
                return;
            }
            const normalized = normalizeFileTypeFilterValue(value);
            if (!normalized) return;
            if (operation === "remove") state.fileTypes.delete(normalized);
            else if (operation === "toggle") {
                if (state.fileTypes.has(normalized)) state.fileTypes.delete(normalized);
                else state.fileTypes.add(normalized);
            } else {
                state.fileTypes.clear();
                state.fileTypes.add(normalized);
            }
        }
    },


    _applyFacetSelection(kind, value, options = {}) {
        this._applyFacetSelectionToState(
            this.filterState,
            kind,
            value,
            options
        );
    },


    _normalizeTagSelection(values) {
        return new Set(normalizeFilterTagSelection(values));
    },


    _prepareResultVisibility() {
        const settings = this.plugin.settings;
        const folders = [...(settings.excludedFolders || [])];
        if (this.plugin._metadataDirectorySafe !== false) folders.push(this.plugin._metadataDirectory());
        if (!this.ignoreResultExclusions) folders.push(...(settings.resultExcludedFolders || []));
        return {
            folders: folders.map(normalizeVaultFolderPath).filter(Boolean),
            attachments: this.ignoreResultExclusions ? [] : settings.resultExcludedAttachmentTypes || []
        };
    },


    _isResultMetaVisible(meta, includeExcludedAttachments = false, prepared = null) {
        if (!meta?.path) return false;
        if (
            this.externalPathScope !== null
            && !this.externalPathScope.has(meta.path)
        ) {
            return false;
        }
        // 全局排除是插件索引边界；即使完整索引重建仍在防抖等待，当前结果也立即服从新设置。
        if (prepared) {
            if (isGLSTimeSidecarPath(meta.path)
                || prepared.folders.some(folder => meta.path === folder || meta.path.startsWith(folder + "/"))) return false;
            return includeExcludedAttachments || !prepared.attachments.length
                || logicalFileType(meta) !== "attachment" || !prepared.attachments.includes(attachmentExtension(meta));
        }
        if (this.plugin.isPathExcluded(meta.path)) return false;
        if (this.ignoreResultExclusions) return true;
        return !this.plugin.isResultPathExcluded(meta.path)
            && (includeExcludedAttachments || !this.plugin.isResultAttachmentTypeExcluded(meta));
    },


    // “最近打开”只负责排序，不再承担 Scope / Filter 职责。
    // 无论默认首页、显式选择该排序，还是叠加任意筛选条件，结果集合始终来自完整查询范围；
    // recentOpened 仅提供排序权重，未进入打开历史的文件仍保留在结果中并统一沉底。
    // Facet / Picker / 一级结果 / 批量计数因此共享同一个正式结果集合语义。
    _visibleVaultFileCount() {
        const cache = this.plugin.fileMetaCache;
        if (
            this.externalPathScope === null
            && !(this.plugin.settings.excludedFolders || []).length
            && (
                this.ignoreResultExclusions
                || (!(this.plugin.settings.resultExcludedFolders || []).length
                    && !(this.plugin.settings.resultExcludedAttachmentTypes || []).length)
            )
        ) return cache.size;

        let count = 0;
        const candidates = this.externalPathScope === null
            ? cache.values()
            : Array.from(this.externalPathScope, path => cache.get(path));
        const visibility = this._prepareResultVisibility();
        for (const meta of candidates) if (this._isResultMetaVisible(meta, false, visibility)) count++;
        return count;
    },


    _facetUniverse(query = this.queryState, includeExcludedAttachments = false) {
        const visibility = this._prepareResultVisibility();
        if (this.createFlow?.isCreateView?.()) {
            return Array.from(this.plugin.fileMetaCache.values()).filter(meta =>
                this._isResultMetaVisible(meta, includeExcludedAttachments, visibility)
            );
        }
        return Array.from(this.plugin.fileMetaCache.values())
            .filter(meta => this._isResultMetaVisible(meta, includeExcludedAttachments, visibility)
                && Boolean(this._matchCandidate(meta, query)))
            .map(meta => this.plugin._searchMeta(meta));
    },


    // Faceted filtering：数量与候选项基于完整查询范围 + 其他已生效条件；排序字段不参与候选集合裁剪。
    // 统计某一维度时忽略该维度自身，避免已选值把同维度其它候选压成 0。
    _facetCandidates(
        ignore = "",
        propertyKey = "",
        universe = null,
        filterState = this.filterState
    ) {
        const source = universe ?? this._facetUniverse();
        if (this.createFlow?.isCreateView?.()) {
            return source;
        }

        // Facet Projection 只接受一个 FilterState 权威源：
        // 正式模式默认使用 live filterState；Picker 多选显式传入 draft。
        // 统计自身维度时仍只忽略该维度，避免破坏同维度的 OR / 可追加候选语义。
        const sourceState = filterState instanceof FilterState
            ? filterState
            : this.filterState;
        const filter = sourceState.clone();
        if (ignore === "tags") filter.tags.clear();
        else if (ignore === "folder") filter.folders.clear();
        else if (ignore === "fileType") filter.fileType = "all";
        else if (ignore === "properties") filter.properties.clear();
        else if (ignore === "time") filter.dateRange = null;
        else if (ignore === "property" && propertyKey) filter.properties.delete(propertyKey);

        // Picker 生命周期内复用已完成 query / 工作区边界过滤的 universe。
        return filter.active ? source.filter(meta => FilterEngine.matches(meta, filter)) : source;
    },


    _onFilterChanged(rawQuery = this.queryState.raw) {
        if (this.createFlow?.isCreateView?.()) {
            this.createFlow._syncDraftTypeFromFacetState();
            this.facets.syncFilterButtons();
            this.createFlow._refreshCreatePreview({ refreshPools: true });
            this._notifyStateChange();
            return;
        }
        this.facets.syncFilterButtons();
        this.resultControls?.refreshFilterPoolHeader?.();
        this.performSearch(rawQuery);
    },
};

