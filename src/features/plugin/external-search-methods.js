// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { SearchCore } from "../../core/SearchCore.js";
import { normalizeModalSearchQuery } from "../../core/session-values.js";
import { NO_TAGS_FILTER_VALUE } from "../../data/tags/tag-values.js";
import { SearchWorkspaceCapabilities } from "../../integrations/SearchWorkspaceCapabilities.js";
import { SearchWindowSession } from "../../ui/hosts/SearchWindowSession.js";
import { normalizeUniqueStringList } from "../../utils/normalization.js";
import { CREATE_TYPE_IDS } from "../create/create-model.js";
import { FilterState, normalizeFileTypeFilterSelection } from "../filters/filter-state.js";
import { migrateLegacySortState, normalizeSortDirection, normalizeSortField } from "../sort/sort-model.js";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_external_search_methods = {


    _normalizeExternalSearchRequest(request = {}) {
        if (request == null) return {};
        if (typeof request !== "object" || Array.isArray(request)) {
            console.warn("External Search API V1：request 必须是对象");
            return null;
        }

        const source = { ...request };
        if (source.filters != null && (typeof source.filters !== "object" || Array.isArray(source.filters))) {
            console.warn("External Search API V1：filters 必须是对象");
            return null;
        }
        if (source.allowedPaths != null && !Array.isArray(source.allowedPaths)) {
            console.warn("External Search API V1：allowedPaths 必须是数组");
            return null;
        }
        if (source.pick != null && (typeof source.pick !== "object" || Array.isArray(source.pick))) {
            console.warn("External Search API V1：pick 必须是对象");
            return null;
        }
        if (source.selection != null && (typeof source.selection !== "object" || Array.isArray(source.selection))) {
            console.warn("External Search API V1：selection 必须是对象");
            return null;
        }

        const pick = source.pick || {};
        const selection = source.selection || {};
        if (pick.mode != null && pick.mode !== "single") {
            console.warn("External Search API V1：pick.mode 只支持 single");
            return null;
        }
        if (selection.mode != null && selection.mode !== "multiple") {
            console.warn("External Search API V1：selection.mode 只支持 multiple");
            return null;
        }

        const wantsSingle = pick.mode === "single";
        const wantsMultiple = selection.mode === "multiple";

        if (wantsSingle && typeof pick.onChoose !== "function") {
            console.warn("External Search API V1：single pick 缺少 onChoose(file)");
            return null;
        }
        if (wantsMultiple && selection.onSubmit != null && typeof selection.onSubmit !== "function") {
            console.warn("External Search API V8：selection.onSubmit 必须是函数或省略");
            return null;
        }
        if (wantsSingle && wantsMultiple) {
            console.warn("External Search API V1：single pick 与 multiple selection 不能同时启用");
            return null;
        }

        // Legacy External API 只在公共边界读一次；Session / SearchCore 只接收 current schema。
        if (source.initialSortField == null && source.initialFilenameSortMode != null) {
            const legacy = migrateLegacySortState(
                source.initialFilenameSortMode,
                Boolean(normalizeModalSearchQuery(source.initialQuery).trim())
            );
            source.initialSortField = legacy.field;
            if (source.initialSortDirection == null) source.initialSortDirection = legacy.direction;
        }
        delete source.initialFilenameSortMode;
        return source;
    },


    _openSearchSession(options = {}) {
        if (this._unloaded) return false;

        const current = this.searchSession;
        if (current && current.close() === false) {
            return false;
        }

        const session = new SearchWindowSession(this.app, this, options);
        this.searchSession = session;
        try {
            session.open();
            return true;
        } catch (error) {
            try {
                session.close();
            } catch (_) {}
            if (this.searchSession === session) this.searchSession = null;
            console.error("打开本地搜索失败", error);
            return false;
        }
    },


    _externalSearchOptions(source) {
        const rawFilters = source.filters && typeof source.filters === "object"
            ? source.filters
            : {};
        const tags = Array.isArray(rawFilters.tags)
            ? [...rawFilters.tags]
            : [];
        if (rawFilters.untagged === true) tags.unshift(NO_TAGS_FILTER_VALUE);

        const filterSnapshot = FilterState.normalizeSnapshot({
            tags,
            folders: Array.isArray(rawFilters.folders)
                ? rawFilters.folders
                : rawFilters.folder
                    ? [rawFilters.folder]
                    : [],
            properties: Array.isArray(rawFilters.properties)
                ? rawFilters.properties
                : [],
            fileTypes: normalizeFileTypeFilterSelection(rawFilters.fileTypes || rawFilters.fileType || "all"),
            fileType: rawFilters.fileType || "all"
        });

        const pick = source.pick && typeof source.pick === "object"
            ? source.pick
            : {};
        const singlePick = pick.mode === "single"
            && typeof pick.onChoose === "function";

        const selection = source.selection
            && typeof source.selection === "object"
                ? source.selection
                : {};
        const multipleSelection = selection.mode === "multiple";

        // V1 Modal 与 V2 Embedded Host 共用查询、范围与选择语义的唯一转换。
        return {
            initialFilterSnapshot: filterSnapshot,
            initialQuery: normalizeModalSearchQuery(source.initialQuery),
            initialSortField: normalizeSortField(
                source.initialSortField,
                Boolean(normalizeModalSearchQuery(source.initialQuery).trim()),
                this.settings
            ),
            initialSortDirection: normalizeSortDirection(
                source.initialSortDirection
            ),
            allowedPaths: Array.isArray(source.allowedPaths)
                ? normalizeUniqueStringList(source.allowedPaths)
                : null,
            ignoreResultExclusions: source.ignoreResultExclusions === true,
            allowCreate: source.allowCreate !== false,
            createFolder: typeof source.createFolder === "string" ? source.createFolder : "",
            createProperties: Array.isArray(source.createProperties) ? source.createProperties : [],
            createType: CREATE_TYPE_IDS.includes(source.createType) ? source.createType : "",
            initialCreate: source.initialCreate === true,
            focusInputOnOpen: source.focusInputOnOpen === true || source.initialCreate === true,
            onCreated: typeof source.onCreated === "function" ? source.onCreated : null,
            headingTitle: String(source.headingTitle || "本地搜索"),
            presentation: source.presentation === "workbench" ? "workbench" : "full",
            toolbarHost: source.toolbarHost?.nodeType === 1 ? source.toolbarHost : null,
            headingCaption: String(source.headingCaption || "你的知识，触手可及"),
            onPickFile: singlePick ? pick.onChoose : null,
            onOpenFile: typeof source.onOpenFile === "function" ? source.onOpenFile : null,
            closeOnPick: pick.closeOnPick !== false,
            externalSelectionAction: multipleSelection
                ? {
                    label: String(selection.actionLabel || "确认选择"),
                    onSubmitFiles: typeof selection.onSubmit === "function" ? selection.onSubmit : null,
                    startInBatchMode: selection.startInBatchMode !== false,
                    closeOnSubmit: selection.closeOnSubmit !== false
                }
                : null,
            onExternalClose: typeof source.onClose === "function"
                ? source.onClose
                : null
        };
    },


    openExternalSearch(request = {}) {
        if (this._unloaded) return false;
        const source = this._normalizeExternalSearchRequest(request);
        if (!source) return false;
        // V1 兼容：外部打开仍属于独立 Modal；执行中的旧会话不被新窗口覆盖。
        return this._openSearchSession({
            externalSession: true,
            ...this._externalSearchOptions(source)
        });
    },


    mountExternalSearch(host, request = {}) {
        if (this._unloaded || !host?.isConnected || host.nodeType !== 1) return null;
        const source = this._normalizeExternalSearchRequest(request);
        if (!source || this._embeddedSearchSessions.has(host)) return null;
        const options = this._externalSearchOptions(source);
        let initialSession = null;
        try {
            if (source.initialSession && typeof source.initialSession === "object" && !Array.isArray(source.initialSession))
                initialSession = JSON.parse(JSON.stringify(source.initialSession));
        } catch (_) { return null; }
        let closed = false;
        let sessionReady = false;
        let capabilities = null;
        let swipeCleanup = null;
        let core = null;
        const containEscape = event => {
            if (event.key === "Escape") event.stopPropagation();
        };
        host.addEventListener("keydown", containEscape);
        const release = () => {
            if (closed) return;
            closed = true;
            this._embeddedSearchSessions.delete(host);
            host.removeEventListener("keydown", containEscape);
            swipeCleanup?.();
            swipeCleanup = null;
            capabilities?.destroy();
            capabilities = null;
            core?.destroy();
            host.empty();
            host.removeClass("local-search-content", "local-search-workspace-host", "local-search-embedded-host", "local-search-workbench", "is-workbench-expanded");
            host.removeAttribute("tabindex");
        };
        const requestClose = () => {
            if (closed || core?.selection?.busy || core?._confirmSession?.busy || core?.createFlow?._createInFlight) return false;
            // 退出逻辑只通知外部 Host；实际销毁由此处唯一 Owner 执行。
            try {
                if (typeof source.onClose === "function" && source.onClose() === false) return false;
            } catch (error) {
                console.warn("External Search V2：宿主关闭回调失败", error);
                return false;
            }
            release();
            return true;
        };
        core = new SearchCore(this.app, this, host, {
            ...options,
            hostKind: "embedded",
            persistModalSession: false,
            sessionKey: "",
            closeAfterFileOpen: false,
            onCloseRequest: requestClose
        });
        const handle = Object.freeze({
            get ready() { return ready; },
            get active() { return !closed && !core._destroyed; },
            get busy() { return Boolean(core?.selection?.busy || core?._confirmSession?.busy || core?.createFlow?._createInFlight); },
            // Caller stores an opaque detached UI snapshot, never a second file/task index.
            captureSession() {
                if (closed || core._destroyed) return null;
                const snapshot = sessionReady ? core.captureSession() : initialSession;
                return snapshot ? JSON.parse(JSON.stringify(snapshot)) : null;
            },
            // 项目文件发生外部变化时原位更新范围。搜索 Input 与 Picker Host 保持原节点，
            // 不销毁/重建 SearchCore，也不增加第二套索引或焦点补救链。
            setScope(paths) {
                if (closed || core._destroyed || !Array.isArray(paths)) return false;
                core.externalPathScope = new Set(normalizeUniqueStringList(paths));
                // 范围更新沿用索引提交队列：批量、Picker、创建或滚动结束后自然补交，不丢事件、不重建输入框。
                core._queueResultIndexChanges(null, { refreshPools: true });
                return true;
            },
            // 工作台父级返回按钮先关闭当前 GLS 子 Picker，而不是直接销毁父页面。
            dismissTop() {
                if (closed || core._destroyed) return false;
                if (core._confirmSession) { core._confirmSession.finish(false); return true; }
                if (core.dropdown?.isOpen) { core.dropdown.close(); return true; }
                return false;
            },
            destroy: release
        });
        this._embeddedSearchSessions.set(host, handle);
        host.addClass("local-search-embedded-host");
        const ready = (async () => {
            try {
                const shellReady = await core.mountShell();
                if (!shellReady || closed) {
                    if (!closed) release();
                    return false;
                }
                if (initialSession) core.restoreSession(initialSession);
                // 与 GLS 原生标签页同一 Swipe-Back Owner；工作台不再竞争嵌入区手势。
                swipeCleanup = this.swipeBack.register(host, {
                    canGoBack: () => !closed && host.isConnected,
                    back: () => requestClose()
                });
                capabilities = new SearchWorkspaceCapabilities(core);
                const initialized = await core.startResults();
                sessionReady = Boolean(initialized && !closed);
                if (!initialized && !closed) release();
                return Boolean(initialized && !closed);
            } catch (error) {
                console.error("External Search V2：内嵌搜索初始化失败", error);
                release();
                return false;
            }
        })();
        return handle;
    },


    // 默认搜索入口永远是普通 Modal；已有搜索会话时保持现有实例，不重复创建。
    // 外部 API 可以通过 _openSearchSession(options) 显式切换到新的 Modal 会话。
    openSearchModal() {
        if (this._unloaded) return false;
        if (this.searchSession) return true;
        return this._openSearchSession();
    },


    // 默认搜索 Toggle：未打开时永远创建普通 Modal；已打开时只关闭当前搜索会话。
    toggleSearchModal() {
        if (this._unloaded) return false;
        const current = this.searchSession;
        if (current) return current.close() !== false;
        return this._openSearchSession();
    },
};

