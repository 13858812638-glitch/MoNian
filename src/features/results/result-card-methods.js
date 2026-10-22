// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { logicalFileType } from "../../data/formats/file-types.js";
import { initializeSearchInteractionElement } from "../../ui/components/input-controls.js";
import { hostDocument, isDomElement, isDomHTMLElement } from "../../utils/dom.js";
import { fillSearchHitText } from "../../utils/search-text.js";
import { RESULT_CONTENT_DEF_MAP } from "./view-config.js";
import { Notice } from "obsidian";
// Instance method owner. `this` is the unchanged SearchResultRendererController instance. No additional state store.
export const SearchResultRendererController_result_card_methods = {


    _buildResultItem(i, frag, displayPosition = null) {
        const core = this.owner;
        const result = core.fullResults[i];
        const shell = hostDocument(frag).createElement("div");
        shell.className = "local-search-swipe-shell";
        shell.dataset.path = result.path || "";
        const resolvedPosition = Number.isInteger(displayPosition)
            ? displayPosition
            : this._displayPositionForActualIndex(i);
        if (resolvedPosition >= 0) {
            shell.dataset.virtualPosition = String(resolvedPosition);
            shell.classList.toggle(
                "is-last-result",
                resolvedPosition === this.visibleResultCount() - 1
            );
        }
        const logicalType = logicalFileType(result);
        shell.dataset.resultType = logicalType === "note"
            ? "md"
            : (logicalType === "canvas" || logicalType === "excalidraw" ? logicalType : "other");

        const item = initializeSearchInteractionElement(
            shell.createDiv({ cls: "local-search-item" }),
            "choice"
        );
        item.dataset.path = result.path || "";
        item._lsSwipeShell = shell;
        item.setAttribute("aria-label", `文件：${result.name || result.path || "未命名"}`);
        item.addEventListener("keydown", event => {
            if (event.target !== item) return;
            if (
                event.isComposing
                || event.keyCode === 229
                || event.repeat
                || event.altKey
                || event.ctrlKey
                || event.metaKey
                || (event.key !== "Enter" && event.key !== " ")
            ) return;
            event.preventDefault();
            event.stopPropagation();
            // 键盘只负责把 Row 语义转成现有 click；普通打开、批量选择、外部会话继续只有一个业务 Owner。
            item.click();
        });
        const content = item.createDiv({ cls: "local-search-item-content" });
        const body = content.createDiv({ cls: "local-search-item-body" });
        const { moreButton } = this._buildTitleRow(body, result);
        const view = core.resultControls.activeViewConfig();
        if (view.snippetLines !== 0 && result.snippet) {
            const snippet = body.createDiv({ cls: "local-search-item-snippet" });
            this._fillSnippet(snippet, result, view.snippetLines);
        }

        // 结果卡顺序只由 View Composer 的 contentOrder 决定。
        // 连续 Meta 字段合并到一行，拖开后才拆成新的 Meta 行，兼顾灵活性与默认密度。
        const metaIds = new Set(["folder", "createdTime", "contentModifiedTime", "modifiedTime"]);
        let pendingMeta = [];
        const flushMeta = () => {
            if (!pendingMeta.length) return;
            this._appendMetaFields(body, result, pendingMeta);
            pendingMeta = [];
        };
        for (const id of view.contentOrder) {
            const def = RESULT_CONTENT_DEF_MAP.get(id);
            if (!def || !view[def.flag]) continue;
            if (metaIds.has(id)) {
                pendingMeta.push(id);
                continue;
            }
            flushMeta();
            if (id === "tags") this._appendTags(body, result);
            else if (id === "properties") this._appendProperties(body, result);
        }
        flushMeta();

        // 与 Dida Bridge 结果卡相同：Swipe 生命周期逐卡绑定，
        // 不再由结果容器维护第二套委托状态机。
        core.swipe?.bind(shell, item, {
            desktopTrigger: moreButton,
            actions: [
                { key: "rename", icon: "pencil", label: "重命名", shortLabel: "重命名", ariaLabel: `重命名：${result.name || result.path}` },
                { key: "move", icon: "folder-input", label: "移动到", shortLabel: "移动", ariaLabel: `移动到：${result.name || result.path}` },
                { key: "add-tag", icon: "tag", label: "新增标签", shortLabel: "标签", tone: "accent", ariaLabel: `新增标签：${result.name || result.path}` },
                { key: "add-property", icon: "list-plus", label: "新增属性", shortLabel: "属性", tone: "accent", ariaLabel: `新增属性：${result.name || result.path}` },
                { key: "delete", icon: "trash-2", label: "删除文件", shortLabel: "删除", tone: "danger", ariaLabel: `删除文件：${result.name || result.path}` }
            ],
            canStart: event => {
                if (core.externalPickHandler) {
                    return false;
                }
                const target = isDomElement(event.target) ? event.target : null;
                if (!target) return true;
                if (target.closest([
                    ".local-search-swipe-actions",
                    ".local-search-meta-nav",
                    "[data-ls-nav]",
                    ".local-search-item-property-key",
                    ".local-search-item-property-expand",
                    "input",
                    "textarea",
                    "select"
                ].join(","))) {
                    return false;
                }
                // 标签 / 属性 / 路径行本身允许横向滚动时，不抢它们的原生横向手势。
                const rail = target.closest(".local-search-result-metadata-flow");
                return !(isDomHTMLElement(rail) && rail.scrollWidth > rail.clientWidth + 2);
            },
            onAction: (key, button) => {
                try {
                    core.plugin.fileOperations.assertCurrent(result.file);
                    return core.handleSwipeAction(key, result.file.path, button);
                } catch (error) {
                    new Notice(error?.message || "目标已变化，请重新选择");
                }
            }
        });

        // 所有卡内控件创建完成后再由 Selection Owner 一次性同步行/子控件交互状态。
        core.selection.syncElement(item, result.path);
        frag.appendChild(shell);
        // Construction owns content only. The committing caller acquires the
        // height observer after attachment, never for staged/failed cards.
        core.resultEls.push(item);
        return item;
    },

    
    _fillSnippet(snippetEl, res, maxLines = this.owner.resultControls.activeViewConfig().snippetLines) {
        snippetEl.dataset.lines = String(maxLines);
        const text = String(res?.snippet || "");
        fillSearchHitText(snippetEl, text, res?.snippetMatchRanges || []);
    },

    
    _updateSnippetInPlace(res) {
        const core = this.owner;
        if (!res || !core.resultsContainer)
            return;
        const el = core.resultsContainer.querySelector(`.local-search-item[data-path="${CSS.escape(res.path || "")}"]`);
        if (!el)
            return;
        let snippetEl = el.querySelector(".local-search-item-snippet");
        const maxLines = core.resultControls.activeViewConfig().snippetLines;
        if (maxLines === 0) {
            snippetEl?.remove();
            return;
        }
        if (!res.snippet) {
            if (snippetEl)
                snippetEl.remove();
            return;
        }
        if (!snippetEl) {
            snippetEl = el.ownerDocument.createElement("div");
            snippetEl.className = "local-search-item-snippet";
            const titleRow = el.querySelector(".local-search-item-title-row");
            const body = el.querySelector(".local-search-item-body");
            if (titleRow)
                titleRow.after(snippetEl);
            else if (body)
                body.prepend(snippetEl);
            else
                el.prepend(snippetEl);
        }
        this._fillSnippet(snippetEl, res, maxLines);
    },

    
    navigateResults(direction) {
        const core = this.owner;
        const total = this.visibleResultCount();
        if (!total) return;
        let currentPosition = -1;
        if (core.selectedIndex >= 0 && core.selectedIndex < core.resultEls.length) {
            currentPosition = this._displayPositionForPath(core.resultEls[core.selectedIndex]?.dataset?.path || "");
        }
        const nextPosition = currentPosition < 0
            ? (direction > 0 ? 0 : total - 1)
            : (currentPosition + direction + total) % total;
        if (nextPosition < this.windowStart || nextPosition >= this.windowEnd) {
            this.renderPage({ targetPosition: nextPosition, syncControls: false });
        }
        core.clearSelected();
        const actualIndex = this._actualIndexAtDisplayPosition(nextPosition);
        const path = core.fullResults[actualIndex]?.path || "";
        const targetEl = path
            ? core.resultsContainer.querySelector(`.local-search-item[data-path="${CSS.escape(path)}"]`)
            : null;
        if (!isDomHTMLElement(targetEl)) return;
        core.selectedIndex = core.resultEls.indexOf(targetEl);
        targetEl.classList.add("is-current");
        targetEl.scrollIntoView({ block: "nearest" });
    },
};

