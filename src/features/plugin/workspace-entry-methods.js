// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { TAB_VIEW_TYPE, VIEW_TYPE } from "../../core/view-types.js";
import { SearchView } from "../../ui/views/SearchView.js";
import { Notice } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_workspace_entry_methods = {


    _enforceWorkspaceSingleton(type, preferredLeaf = null) {
        const leaves = [...this.app.workspace.getLeavesOfType(type)];
        if (!leaves.length) return null;
        const keeper = preferredLeaf && leaves.includes(preferredLeaf) ? preferredLeaf : leaves[0];
        for (const leaf of leaves) if (leaf !== keeper) leaf.detach();
        return keeper;
    },


    _latestCreateRecovery(kind) {
        let latest = null;
        for (const entry of Object.entries(this.settings.createSessionRecovery || {})) {
            if (entry[1]?.kind !== kind) continue;
            if (!latest || (entry[1].session?.capturedAt || 0) > (latest[1].session?.capturedAt || 0)) latest = entry;
        }
        return latest;
    },


    activateView(type = VIEW_TYPE) {
        if (this._unloaded) return Promise.resolve(false);
        if (this._workspaceOpenTasks.has(type)) return this._workspaceOpenTasks.get(type);
        const task = this._activateWorkspaceView(type).finally(() => {
            if (this._workspaceOpenTasks.get(type) === task) this._workspaceOpenTasks.delete(type);
        });
        this._workspaceOpenTasks.set(type, task);
        return task;
    },


    async _activateWorkspaceView(type) {
        let createdLeaf = null;
        try {
            const { workspace } = this.app;
            let leaf = this._enforceWorkspaceSingleton(type);
            if (!leaf) {
                leaf = type === TAB_VIEW_TYPE ? workspace.getLeaf("tab") : workspace.getLeftLeaf(false);
                if (!leaf) throw new Error("工作区尚未就绪");
                createdLeaf = leaf;
                const recovery = this._latestCreateRecovery(type === TAB_VIEW_TYPE ? "tab" : "sidebar");
                const closed = this._closedSearchViewStates.get(type);
                const state = recovery && (recovery[1].session?.capturedAt || 0) >= (closed?.session?.capturedAt || 0)
                    ? { sessionKey: recovery[0], session: recovery[1].session }
                    : (closed || {});
                await leaf.setViewState({ type, active: true, state });
                this._enforceWorkspaceSingleton(type, leaf);
            }
            if (this._unloaded) { createdLeaf?.detach(); return false; }
            // revealLeaf also loads DeferredView on Obsidian >= 1.7.2.
            await workspace.revealLeaf(leaf);
            if (this._unloaded) { createdLeaf?.detach(); return false; }
            let view = leaf.view;
            if (!(view instanceof SearchView) || view.plugin !== this || view._closed || view.core?._destroyed) {
                // A disposed host from hot reload is different from DeferredView. Recreate in place,
                // keeping native layout/state instead of detaching the user's leaf.
                const state = leaf.getViewState().state;
                await leaf.setViewState({ type: "empty" });
                if (this._unloaded) return false;
                await leaf.setViewState({ type, active: true, state });
                await workspace.revealLeaf(leaf);
                view = leaf.view;
            }
            if (!(view instanceof SearchView) || view.plugin !== this || view._closed) return false;
            if (view._ready) await view._ready;
            if (this._unloaded || view._closed || view.core?._destroyed) return false;
            if (type !== VIEW_TYPE || createdLeaf) view.focusSearchInput();
            return true;
        } catch (error) {
            createdLeaf?.detach();
            if (!this._unloaded) {
                console.error("打开搜索工作区失败", error);
                new Notice("打开搜索工作区失败");
            }
            return false;
        }
    },
};

