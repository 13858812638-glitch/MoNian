// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { logicalFileType } from "../../data/formats/file-types.js";
import { parseGLSDate } from "../../data/time/time-values.js";
import { FilterEngine } from "../../features/filters/FilterEngine.js";
import { FilterState } from "../../features/filters/filter-state.js";
import { ResultRanker } from "../../features/search/ResultRanker.js";
import { normalizeSortDirection, normalizeSortField } from "../../features/sort/sort-model.js";
import { matchReadableText } from "../../utils/search-text.js";
import { Notice, TFile } from "obsidian";
// One collator per loaded search-ranking module; shared by name and path sort.
export const RESULT_TEXT_COLLATOR = new Intl.Collator("zh-Hans-CN", {
    numeric: true,
    sensitivity: "base"
});

// A small index batch must not pay for another full sort of already ordered
// results. Preserve the exact comparison function (including opened/missing
// semantics and the raw-path tie-break) used by the full ranking path.
const MAX_INCREMENTAL_RANK_PATHS = 64;

function mergeSortedResultRows(retained, incoming, compare) {
    if (!incoming.length) return retained;
    if (!retained.length) return incoming;

    // Typical one-file updates use logarithmic comparisons and one array copy.
    // For larger batches, a linear merge avoids repeated array shifts.
    if (incoming.length <= 8) {
        const result = retained.slice();
        for (const row of incoming) {
            let low = 0, high = result.length;
            while (low < high) {
                const mid = (low + high) >>> 1;
                if (compare(result[mid], row) <= 0) low = mid + 1;
                else high = mid;
            }
            result.splice(low, 0, row);
        }
        return result;
    }

    const result = new Array(retained.length + incoming.length);
    let i = 0, j = 0, k = 0;
    while (i < retained.length && j < incoming.length) {
        result[k++] = compare(retained[i], incoming[j]) <= 0
            ? retained[i++] : incoming[j++];
    }
    while (i < retained.length) result[k++] = retained[i++];
    while (j < incoming.length) result[k++] = incoming[j++];
    return result;
}

function rankChangedResults(core, candidates, retained, filter) {
    // Delegate matching, visibility, filtering and delta sorting to the
    // original owner. Only the reassembly of unchanged rows is optimized.
    const delta = core._rankCandidates(candidates, core.queryState, filter);
    const field = normalizeSortField(core.sortField, Boolean(core.queryState?.active), core.plugin.settings);
    const direction = normalizeSortDirection(core.sortDirection);
    const openedRank = field === "opened" ? core._openedRankMap() : null;
    const compare = (a, b) => core._compareResults(a, b, field, direction, openedRank);

    if (field === "relevance") {
        // Relevance always keeps the title/meta channel before body-only,
        // including ascending tier order. Do not globally interleave them.
        const retainedBest = [], retainedBody = [];
        for (const row of retained) (row.bodyOnly ? retainedBody : retainedBest).push(row);
        return {
            best: mergeSortedResultRows(retainedBest, delta.best, compare),
            body: mergeSortedResultRows(retainedBody, delta.body, compare),
            bestCount: retainedBest.length + delta.bestCount,
            bodyCount: retainedBody.length + delta.bodyCount
        };
    }

    let bestCount = delta.bestCount, bodyCount = delta.bodyCount;
    for (const row of retained) {
        if (row.bodyOnly) bodyCount++;
        else bestCount++;
    }
    return {
        best: mergeSortedResultRows(retained, delta.best, compare),
        body: [], bestCount, bodyCount
    };
}

// Instance method owner. `this` is the unchanged SearchCore instance. No additional state store.
export const SearchCore_search_and_ranking_methods = {










    _shouldCloseAfterFileOpen() {
        if (this.isWorkspaceHost) return false;
        return this.closeAfterFileOpen !== false;
    },


    async _openResultFromSearch(file, {
        newTab = false,
        forceKeepOpen = false,
        excludedPath = file?.path || ""
    } = {}) {
        if (!(file instanceof TFile)) return false;

        const app = this.app;
        const plugin = this.plugin;
        const query = this.queryState.raw.trim();
        const openFile = this.externalOpenFileHandler;
        const shouldClose =
            !forceKeepOpen
            && this._shouldCloseAfterFileOpen();

        if (shouldClose) {
            const exitSession = this._captureCurrentModalSession({
                excludedPaths: excludedPath ? [excludedPath] : null
            });

            // 普通 Modal 打开结果：先同步释放 Host / Scope，再切换 Workspace 文件。
            // 对于需要保留当前工作区的入口，跳过主窗关闭。
            const closed = this.close({
                sessionSnapshot: exitSession
            });
            if (closed === false) return false;

            // 只跨一个 microtask，让同步 Modal.close() 完成生命周期；
            // 不等待动画帧，不人为增加可感知打开延迟。
            await Promise.resolve();
        }

        try {
            if (openFile) {
                // false 是宿主拒绝失效导航；不能回退到另一个标签页打开。
                if (await openFile(file, { newTab }) === false) return false;
            } else if (newTab || this.hostKind === "tab" || this.hostKind === "embedded") {
                await app.workspace.getLeaf("tab").openFile(file);
            } else {
                await app.workspace.openLinkText(
                    file.path,
                    "",
                    false
                );
            }
            if (query) plugin.recordSearchHistory(query);
            this.onFileOpened?.(file, { newTab, forceKeepOpen });
            return true;
        } catch (error) {
            console.error(`打开文件失败：${file.path}`, error);
            new Notice(`打开文件失败：${file.basename}`);
            return false;
        }
    },








    // “查看已选”只过滤渲染层；搜索结果、筛选、排序、创建元数据均保持原状态。






// 结果列表只挂载当前视口附近的小窗口；滚动只替换窗口 DOM，不累计历史卡片。
// 正文 / 标题的频道状态统一由结果头部单行切换器表达，
// 结果列表不再重复插入第二套分组标题，避免额外占行和重复视觉层级。




// 初始化 / 明确重建当前视图：建立新的 Search Snapshot。







    // 搜索记录回填：写回输入框并触发搜索（点击与键盘 Enter 共用）


    // 首屏与追加页摘要都只原地更新对应节点，不触发整页重绘。




    _openedRankMap() {
        return new Map((this.plugin.settings.recentOpened || [])
            .map((path, index) => [path, index]));
    },


    _compareResults(a, b, field, direction, openedRank = null) {
        const sign = direction === "asc" ? 1 : -1;

        let diff = 0;
        if (field === "relevance") {
            // tier 数值越小相关度越高。desc = 高相关度优先；asc = 低相关度优先。
            const aTier = Number.isFinite(a?.tier) ? a.tier : Number.MAX_SAFE_INTEGER;
            const bTier = Number.isFinite(b?.tier) ? b.tier : Number.MAX_SAFE_INTEGER;
            diff = bTier - aTier;
        } else if (field === "opened") {
            const missing = Number.MAX_SAFE_INTEGER;
            const aRank = openedRank?.has(a.path) ? openedRank.get(a.path) : missing;
            const bRank = openedRank?.has(b.path) ? openedRank.get(b.path) : missing;
            // 未进入最近打开记录的文件始终沉底；asc/desc 只反转已记录部分。
            if (aRank === missing || bRank === missing) {
                if (aRank !== bRank) return aRank === missing ? 1 : -1;
            } else {
                diff = bRank - aRank;
            }
        } else if (field === "created") {
            const aTime = parseGLSDate(a?.ctime);
            const bTime = parseGLSDate(b?.ctime);
            if (!aTime || !bTime) { if (aTime !== bTime) return aTime ? -1 : 1; }
            diff = aTime - bTime;
        } else if (field === "contentModified") {
            const aTime = parseGLSDate(a?.contentModifiedAt);
            const bTime = parseGLSDate(b?.contentModifiedAt);
            if (!aTime || !bTime) { if (aTime !== bTime) return aTime ? -1 : 1; }
            diff = aTime - bTime;
        } else if (field === "fileModified") {
            const aTime = parseGLSDate(a?.fileModifiedAt);
            const bTime = parseGLSDate(b?.fileModifiedAt);
            if (!aTime || !bTime) { if (aTime !== bTime) return aTime ? -1 : 1; }
            diff = aTime - bTime;
        } else if (field === "name") {
            diff = RESULT_TEXT_COLLATOR.compare(String(a?.name || ""), String(b?.name || ""));
        }

        const directed = diff * sign;
        if (directed) return directed;
        const left = String(a?.path || ""), right = String(b?.path || "");
        return RESULT_TEXT_COLLATOR.compare(left, right) || (left < right ? -1 : left > right ? 1 : 0);
    },


    _matchCandidate(meta, query = this.queryState) {
        const ranked = ResultRanker.rank(meta, query);
        if (ranked) return ranked;

        if (logicalFileType(meta) !== "note") return null;
        const bodyText = this.plugin.bodyIndex.get(meta.path);
        const bodyMatch = matchReadableText(bodyText, query);
        if (!bodyMatch) return null;
        const tier = bodyMatch.type === "phrase" ? 7
            : bodyMatch.type === "units" ? 8
                : 9;
        return {
            tier,
            bodyOnly: true,
            bodyMatchType: bodyMatch.type,
            bodyMatchRanges: bodyMatch.ranges
        };
    },


    _rankCandidates(candidates, query, filter = null, retained = []) {
        const effectiveFilter = filter instanceof FilterState ? filter : this.filterState;
        const visibility = this._prepareResultVisibility();
        const hasFilter = effectiveFilter?.active;
        const sortField = normalizeSortField(
            this.sortField,
            Boolean(query?.active),
            this.plugin.settings
        );
        const sortDirection = normalizeSortDirection(this.sortDirection);
        const openedRank = sortField === "opened" ? this._openedRankMap() : null;
        const best = [], body = [];
        for (const row of retained) (row.bodyOnly ? body : best).push(row);

        for (const rawMeta of candidates) {
            if (!this._isResultMetaVisible(rawMeta, false, visibility)) continue;
            const meta = this.plugin._searchMeta(rawMeta);
            if (hasFilter && !FilterEngine.matches(meta, effectiveFilter)) continue;

            // 空查询只做筛选与排序，直接复用索引 Meta 引用；
            // 不为 2 万 / 10 万文件再克隆同等数量的 Result 对象。
            if (!query?.active) { best.push(meta); continue; }
            const match = this._matchCandidate(meta, query);
            if (!match) continue;
            const result = {
                ...meta, ...match, matchedFields: "", snippet: "", snippetMatchRanges: []
            };
            (match.bodyOnly ? body : best).push(result);
        }

        const compare = (a, b) => this._compareResults(
            a,
            b,
            sortField,
            sortDirection,
            openedRank
        );
        const bestCount = best.length;
        const bodyCount = body.length;
        if (sortField !== "relevance") {
            // 时间 / 名称 / 最近打开一次性全局排序；频道计数仍保留真实语义。
            const all = body.length ? best.concat(body) : best;
            all.sort(compare);
            return { best: all, body: [], bestCount, bodyCount };
        }
        best.sort(compare);
        body.sort(compare);
        return { best, body, bestCount, bodyCount };
    },


    _recomputeCurrentResults({ preserveSelection = true, changedPaths = null } = {}) {
        const candidates = changedPaths
            ? [...changedPaths].map(path => this.plugin.fileMetaCache.get(path)).filter(Boolean)
            : this.plugin.fileMetaCache.values();
        const retained = changedPaths ? this.fullResults.filter(row => !changedPaths.has(row.path)) : [];
        const resultFilterState = this.createFlow?.searchResultFilterState?.() || this.filterState;
        const cacheKey = this.plugin.settings.keepSearchResultsInMemory !== false
            ? this._residentResultKey(resultFilterState) : null;
        const cached = !changedPaths && cacheKey ? this.plugin._getResidentSearchResults(cacheKey) : null;
        // A bounded index batch changes only a few results. The retained rows
        // already have the current view's total ordering, so merge newly
        // matched rows without re-sorting the entire result set. Full search,
        // unknown/global changes and larger batches keep the original path.
        const canMerge = changedPaths && typeof changedPaths.has === "function" && changedPaths.size > 0
            && changedPaths.size <= MAX_INCREMENTAL_RANK_PATHS && this._resultGeneration > 0;
        const ranked = cached || (canMerge
            ? rankChangedResults(this, candidates, retained, resultFilterState)
            : this._rankCandidates(candidates, this.queryState, resultFilterState, retained));
        const { best, body, bestCount, bodyCount } = ranked;
        if (!cached && cacheKey) this.plugin._rememberSearchResults(cacheKey, ranked, this.queryState.active);

        // 增量索引变更需要推进 generation，使旧异步任务不能写回新结果；
        // 但只失效真实修改路径与旧代仍在途的摘要。已完成且未修改的摘要
        // 仍可复用，避免离屏文件变化触发当前窗口全部摘要重读/DOM 更新。
        if (changedPaths) {
            for (const path of changedPaths) this.loadedPaths.delete(path);
            for (const path of this.resultRenderer._snippetInFlight.keys()) {
                this.loadedPaths.delete(path);
            }
        } else {
            this.loadedPaths.clear();
        }
        this._resultGeneration++;
        // 旧任务保留自身 generation 守卫；旧 Promise 的 finally 不能误删新任务。
        this.resultRenderer._snippetInFlight.clear();
        this.bestResultCount = bestCount;
        this.bodyResultCount = bodyCount;
        // 频道内没有结果时直接展示另一频道，避免命中正文却出现空列表。
        // 不增加缓存或额外查询；仅校正现有会话态。
        if (this.queryState.active && this.sortField === "relevance") {
            if (!bestCount && bodyCount) this.bodyExpanded = true;
            else if (!bodyCount) this.bodyExpanded = false;
        }
        this.fullResults = body.length ? best.concat(body) : best;

        if (preserveSelection && this.selection.selectedPaths.size) {
            this.selection.retainPaths(
                new Set(this.fullResults.map(row => row.path))
            );
        }

        this.resultControls.sync();
    },


    _residentResultKey(filter) {
        const settings = this.plugin.settings;
        const sort = normalizeSortField(this.sortField, this.queryState.active, settings);
        return JSON.stringify(["results", this.queryState.normalized, filter.toSnapshot(), sort,
            normalizeSortDirection(this.sortDirection), ...this._residentResultScope(),
            sort === "opened" ? settings.recentOpened : null]);
    },


    _residentResultScope() {
        const settings = this.plugin.settings;
        return [this.externalPathScope ? [...this.externalPathScope] : null,
            this.ignoreResultExclusions, settings.excludedFolders, settings.resultExcludedFolders,
            settings.resultExcludedAttachmentTypes, settings.metadataDirectory, this.plugin._metadataDirectorySafe];
    },


    _refreshCurrentResultsAfterMutation({
        preserveSelection = true,
        scrollTop = this.resultsContainer?.scrollTop || 0,
        preferredPaths = null,
        excludedPaths = null,
        syncControls = true,
        refreshPools = false
    } = {}) {
        if (this._destroyed) return;
        refreshPools ||= Boolean(this._pendingResultUpdate?.pools);
        this._pendingResultUpdate = null;

        const viewportAnchor = this.resultRenderer.captureViewportAnchor(
            preferredPaths,
            excludedPaths
        ) || { scrollTop };
        if (!viewportAnchor.path && !viewportAnchor.fallbackPath) {
            viewportAnchor.scrollTop = scrollTop;
        }

        this._recomputeCurrentResults({ preserveSelection });
        if (!this._destroyed) {
            this.resultRenderer.refreshResultChannels();
            // 数据重排后先按 path 找到新 display position，再首挂锚点附近窗口。
            // 禁止先按旧 windowStart 渲染、再期待 restoreViewportAnchor 跨窗口命中。
            this.resultRenderer.renderInitialPage(viewportAnchor, { syncControls });
            if (refreshPools) this.resultControls.refreshFilterPoolHeader();
            this.navigator?.sync();
        }
    },


    _queueResultIndexChanges(paths = null, { refreshPools = false } = {}) {
        if (this._destroyed) return false;
        const pending = this._pendingResultUpdate;
        if (!pending) this._pendingResultUpdate = {
            paths: paths == null ? null : new Set(paths), pools: refreshPools
        };
        else {
            if (paths == null) pending.paths = null;
            else if (pending.paths) for (const path of paths) pending.paths.add(path);
            pending.pools ||= refreshPools;
        }
        this._scheduleResultIndexUpdate();
        return true;
    },


    _scheduleResultIndexUpdate() {
        this.plugin.sharedSearchState?.schedule(this);
        if (this._destroyed || !this._pendingResultUpdate || this._resultUpdateQueued) return;
        this._resultUpdateQueued = true;
        queueMicrotask(() => {
            this._resultUpdateQueued = false;
            if (this._destroyed || !this._pendingResultUpdate) return;
            // 只暂缓 UI 提交：索引继续更新。退出交互后合并路径、读取最新查询一次提交。
            if (!this._resultGeneration || this._isRendering || this.searchTimer
                || this.selection?.busy || this._confirmSession || this.dropdown?.isOpen
                || this.createFlow?.isCreateMode?.() || this.swipe?.activeCancel
                || this.swipe?.openWrapper || this.swipe?.closingWrapper
                || this.resultRenderer?.isNativeScrolling?.()) return;
            const pending = this._pendingResultUpdate;
            try {
                this._commitResultIndexChanges(pending);
                if (this._pendingResultUpdate === pending) this._pendingResultUpdate = null;
            } catch (error) {
                // 保留待提交路径，下一次事件/交互结束可重试；不递归轮询或吞掉错误。
                console.error("后台搜索结果更新失败", error);
            }
        });
    },


    _commitResultIndexChanges({ paths, pools }) {
        const previous = this.fullResults;
        const oldBest = this.bestResultCount;
        const anchor = this.resultRenderer.captureMountedViewportAnchor();
        this._recomputeCurrentResults({ changedPaths: paths });
        const orderChanged = oldBest !== this.bestResultCount || previous.length !== this.fullResults.length
            || previous.some((row, i) => row.path !== this.fullResults[i]?.path);
        if (orderChanged) {
            this.resultRenderer.refreshResultChannels();
            this.resultRenderer.renderInitialPage(anchor);
        } else if (this.fullResults.length) {
            this.resultRenderer.refreshChangedRows(paths);
        } else this.selection.syncControls();
        if (pools) this.resultControls.refreshFilterPoolHeader();
        this.navigator?.sync();
    },


    performSearch(rawQuery, preserveSelection = false, { refreshFacets = false } = {}) {
        if (this._destroyed) return;
        // 搜索零命中的派生 Create View 只冻结 UI / CreateDraft；
        // 新一轮查询前先恢复真实 Search FilterState，禁止用创建草稿参与结果计算。
        this.createFlow?.prepareSearchEvaluation?.();
        // 筛选 / 排序也会主动搜索，不能随后被旧输入定时器覆盖。
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        this.searchTimer = null;
        const previousQuery = this.queryState.normalized;
        const wasActive = this.queryState.active;
        this.queryState.set(rawQuery);
        const isActive = this.queryState.active;
        if (wasActive !== isActive) {
            // 唯一状态转换：刚进入查询自动最佳匹配；清空恢复原浏览排序。
            // 非空查询继续输入时不覆盖用户在排序控件中的主动选择。
            if (isActive) {
                this._browseSortField = normalizeSortField(this.sortField, false, this.plugin.settings);
                this.sortField = "relevance";
            } else {
                this.sortField = normalizeSortField(this._browseSortField, false, this.plugin.settings);
            }
            this.sorting.normalize();
            this.sorting.cycleCursorField = this.sorting.allowedFields().includes(this.sortField)
                ? this.sortField : null;
            this.sorting.sync();
        }
        if (!preserveSelection || previousQuery !== this.queryState.normalized) {
            this.bodyExpanded = false;
        }
        if (!preserveSelection && this.selection.selectedPaths.size) {
            this.selection.clearState();
        }

        // 显式查询吸收尚未提交的索引变化，取消旧批次但不新增另一份查询状态。
        const refreshPools = Boolean(this._pendingResultUpdate?.pools);
        this._pendingResultUpdate = null;
        this.resultRenderer.resetViewport();
        // Reset against the existing layout before condition/header DOM writes.
        // The final page still measures the real resulting viewport, including
        // condition-row height changes. No cached or deferred geometry owner.
        if (refreshFacets) this.facets.syncFilterButtons();
        if (refreshFacets) this.resultControls.refreshFilterPoolHeader();
        this._recomputeCurrentResults({ preserveSelection });

        // 首次会话锚点只消费一次：直接首挂目标窗口并完成恢复，不保留跨阶段中间态。
        const initialAnchor = this._initialViewportAnchor;
        this._initialViewportAnchor = null;
        this.resultRenderer.refreshResultChannels();
        if (initialAnchor) this.resultRenderer.renderInitialPage(initialAnchor);
        else this.resultRenderer.renderPage();
        if (refreshPools && !refreshFacets) this.resultControls.refreshFilterPoolHeader();
        this._notifyStateChange();
    },
};

