// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { Notice, TFile } from "obsidian";
// Instance method owner. `this` is the unchanged SearchCore instance. No additional state store.
export const SearchCore_open_selection_methods = {


    // DOM 位置仅用于键盘游标；文件按 path、历史按原文解析当前结果。
_resolveResultElement(el) {
    if (!el?.dataset.path) return null;

    return this.fullResults.find(
        r => r.path === el.dataset.path
    ) || null;
},


    async _chooseExternalFile(file) {
        if (!this.externalPickHandler || !(file instanceof TFile)) return false;
        try {
            const result = await Promise.resolve(this.externalPickHandler(file));
            if (result === false) return true;
            if (this.closeOnExternalPick) this.close();
            return true;
        } catch (error) {
            console.error("外部选择文件失败", error);
            new Notice("选择文件失败");
            return false;
        }
    },


    async openSelectedNote(newTab = false) {
        if (this.selectedIndex < 0 || this.selectedIndex >= this.resultEls.length) return;
        const el = this.resultEls[this.selectedIndex];
        const target = this._resolveResultElement(el);
        if (!target) return;
        if (this.externalPickHandler) {
            return this._chooseExternalFile(target.file);
        }
        return this._openResultFromSearch(target.file, {
            newTab,
            excludedPath: target.path
        });
    },


    // 键盘结果游标的 active 样式清理由 SearchCore 保留，
    // 结果列表本身仍由 SearchResultRendererController 唯一渲染。
    clearSelected() {
        for (const el of this.resultEls) el.classList.remove("is-current");
    },
};

