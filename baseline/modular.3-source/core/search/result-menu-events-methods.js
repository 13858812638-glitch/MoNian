// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { isDomElement } from "../../utils/dom.js";
import { Menu, Notice, Platform, TFile } from "obsidian";
// Instance method owner. `this` is the unchanged SearchCore instance. No additional state store.
export const SearchCore_result_menu_events_methods = {


    _getResultFileMenuContext(anchorFile) {
        if (!(anchorFile instanceof TFile)) return null;

        const selectedFiles = [];
        const seen = new Set();

        if (
            this.selection.selectedPaths.size > 1
            && this.selection.selectedPaths.has(anchorFile.path)
        ) {
            selectedFiles.push(anchorFile);
            seen.add(anchorFile.path);

            // 优先保持当前结果顺序，剩余选中项再按 selectedPaths 补齐。
            for (const result of this.fullResults) {
                const path = result?.path || "";
                if (!path || seen.has(path) || !this.selection.selectedPaths.has(path)) continue;
                const file = this.app.vault.getAbstractFileByPath(path);
                if (file instanceof TFile) {
                    selectedFiles.push(file);
                    seen.add(path);
                }
            }

            for (const path of this.selection.selectedPaths) {
                if (seen.has(path)) continue;
                const file = this.app.vault.getAbstractFileByPath(path);
                if (file instanceof TFile) {
                    selectedFiles.push(file);
                    seen.add(path);
                }
            }
        }

        const files = selectedFiles.length > 1 ? selectedFiles : [anchorFile];
        return Object.freeze({
            anchorFile,
            files,
            isMultiple: files.length > 1
        });
    },


    async _openFilesInNewTabs(files) {
        const openFile = this.externalOpenFileHandler;
        for (const file of files) {
            try {
                if (openFile) {
                    if (await openFile(file, { newTab: true }) === false) return false;
                } else await this.app.workspace.getLeaf("tab").openFile(file);
            } catch (error) {
                console.error(`打开文件失败：${file.path}`, error);
                new Notice(`打开文件失败：${file.basename}`);
                return false;
            }
        }
        return true;
    },


    _buildResultFileMenu(menu, context) {
        menu.addItem(item => {
            item.setTitle("在新标签页打开")
                .setIcon("file-plus")
                .setSection?.("open");
            item.onClick(() => void this._openFilesInNewTabs(context.files));
        });
    },


    _extendResultFileMenu(menu, context) {
        const source = "file-explorer-context-menu";
        if (context.isMultiple) {
            this.app.workspace.trigger("files-menu", menu, context.files, source);
        } else {
            this.app.workspace.trigger("file-menu", menu, context.anchorFile, source);
        }
    },


    _showResultFileMenu(file, mouseEvent) {
        const context = this._getResultFileMenuContext(file);
        if (!context || !mouseEvent) return false;

        const menu = new Menu();

        // GLS 只拥有一个补充动作；其余菜单项由标准 workspace 扩展事件提供。
        this._buildResultFileMenu(menu, context);
        this._extendResultFileMenu(menu, context);
        menu.showAtMouseEvent(mouseEvent);
        return true;
    },


    _bindResultEvents() {
        // 批量模式下，鼠标点击结果卡只负责 Selection，不负责建立键盘焦点。
        // 这是解决 Shift 焦点框的根因：如果普通鼠标点击先让卡片获得焦点，
        // 之后即使没有再次点击，单独按下 Shift 也可能让该既有焦点匹配 :focus-visible。
        // 因此所有桌面主键卡片选择都在 pointerdown 阶段阻止整卡夺焦；
        // click 仍沿用下方唯一 Selection 路径。键盘 Tab / Enter / Space 仍可正常聚焦卡片。
        this.resultsContainer.addEventListener("pointerdown", evt => {
            if (
                !this.selection.batchMode
                || Platform.isMobile
                || evt.button !== 0
            ) return;

            const target = isDomElement(evt.target) ? evt.target : null;
            if (!target) return;
            if (target.closest("[data-ls-nav], .local-search-batch-title-open, .local-search-card-more")) return;

            const item = target.closest(".local-search-item[data-path]");
            if (!item || !this.resultsContainer.contains(item)) return;

            evt.preventDefault();
        });

        this.resultsContainer.addEventListener("click", async evt => {
            try {
                // 0. 标题重命名是独立模态编辑态。
                // 编辑器内部事件由编辑器自己处理；任何意外落到结果层的点击
                // 都只关闭编辑态，绝不继续触发结果卡打开 / 导航 / 多选。
                if (this._confirmSession) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    this._confirmSession.finish(false);
                    return;
                }

                const itemEl = evt.target.closest(".local-search-item");
                const target = this._resolveResultElement(itemEl);
                if (!itemEl || !target) return;

                // 批量态：标题负责打开，卡片其余区域负责选择；
                // 标签 / 属性 / 文件夹 / 类型筛选退出本轮交互与焦点序列。
                if (this.selection.batchMode) {
                    evt.preventDefault();
                    evt.stopPropagation();

                    const { index: latestIndex, result: latest } =
                        this._findCurrentResult(target.path);
                    if (!latest) return;

                    // 标题打开与整卡选择独立；同一 SearchCore 也服务工作台内嵌会话。
                    if (evt.target.closest(".local-search-batch-title-open")
                        && !evt.shiftKey) {
                        if (latest.file) await this._openResultFromSearch(latest.file, {
                            newTab: Boolean(this.externalSelectionHandler || evt.metaKey || evt.ctrlKey),
                            forceKeepOpen: Boolean(this.externalSelectionHandler || (!Platform.isMobile && evt.ctrlKey && evt.altKey)),
                            excludedPath: latest.path
                        });
                        return;
                    }

                    if (evt.shiftKey && !Platform.isMobile) {
                        this.selection.selectRangeTo(latestIndex);
                    } else {
                        this.selection.togglePath(latest.path);
                    }
                    return;
                }

                const nav = evt.target.closest("[data-ls-nav]");
                if (nav) {
                    const restoreNavFocus = nav.contains(nav.ownerDocument.activeElement);
                    evt.preventDefault();
                    evt.stopPropagation();
                    const value = nav.dataset.value || "";
                    this._applyResultQuickFilter(
                        nav.dataset.lsNav,
                        value,
                        nav.dataset.key || ""
                    );
                    await this._onFilterChanged();

                    if (restoreNavFocus) {
                        const currentItem = itemEl.dataset.path
                            ? this.resultsContainer?.querySelector(
                                `.local-search-item[data-path="${CSS.escape(itemEl.dataset.path)}"]`
                            )
                            : null;
                        const next = [
                            ...(currentItem?.querySelectorAll("[data-ls-nav]") || [])
                        ].find(el =>
                            el.dataset.lsNav === nav.dataset.lsNav
                            && el.dataset.value === nav.dataset.value
                            && el.dataset.key === nav.dataset.key
                        );
                        let fallback = null;
                        if (nav.dataset.lsNav === "property") fallback = this.propertyFilterBtn;
                        else if (nav.dataset.lsNav === "tag") fallback = this.tagFilterBtn;
                        else if (nav.dataset.lsNav === "folder") fallback = this.folderBtn;
                        else if (nav.dataset.lsNav === "fileType") {
                            const wanted = value.startsWith("ext:") ? "attachment" : value;
                            fallback = (this.typeButtonEls || []).find(el => el.dataset.type === wanted);
                        }
                        (next || fallback || this.containerEl)?.focus({ preventScroll: true });
                    }
                    return;
                }

                // 兼容旧的外部单选会话；只改变最终结果卡点击语义。
                if (this.externalPickHandler) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    const { result: latest } = this._findCurrentResult(target.path);
                    if (!latest?.file) return;
                    await this._chooseExternalFile(latest.file);
                    return;
                }

                // Ctrl+Alt + 点击：桌面端批量打开专用手势。
                // Ctrl 继续沿用现有“新标签页打开”语义；Alt 只负责要求搜索弹窗保持打开。
                const keepSearchOpen = !Platform.isMobile && evt.ctrlKey && evt.altKey;

                // 4. 结果卡主体（包括标题）统一只负责打开文件。
                // 重命名只保留 Swipe / 显式菜单等专用入口，不再劫持标题点击。
                const { result: latest } =
                    this._findCurrentResult(target.path);
                if (!latest?.file) return;

                await this._openResultFromSearch(latest.file, {
                    newTab: !!(evt.metaKey || evt.ctrlKey),
                    forceKeepOpen: keepSearchOpen,
                    excludedPath: latest.path
                });
            } catch (error) {
                if (!this._destroyed) {
                    console.error("搜索结果交互失败", error);
                    new Notice("搜索结果操作失败");
                }
            }
        });

        // Desktop 右键与移动端系统长按最终都会产生 contextmenu。
        // 这里把它作为唯一文件菜单入口：没有自定义长按计时器，也没有第二条菜单触发链。
        this.resultsContainer.addEventListener("contextmenu", evt => {
            if (this._confirmSession) {
                evt.preventDefault();
                evt.stopPropagation();
                evt.stopImmediatePropagation();
                this._confirmSession.finish(false);
                return;
            }

            const item = evt.target.closest(
                ".local-search-item[data-path]"
            );
            if (!item) return;

            const file = this.app.vault.getAbstractFileByPath(item.dataset.path);
            if (!(file instanceof TFile)) return;

            evt.preventDefault();
            evt.stopPropagation();
            evt.stopImmediatePropagation();
            this._showResultFileMenu(file, evt);
        }, true);
    },
};

