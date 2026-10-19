// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { TFile } from "obsidian";
// Instance method owner. `this` is the unchanged LocalSearchPlugin instance. No additional state store.
export const LocalSearchPlugin_recent_history_state_methods = {


    _normalizeRecentOpened(paths, { validateExists = true } = {}) {
        const seen = new Set();
        const source = Array.isArray(paths) ? paths : [];
        return source
            .map(path => String(path || ""))
            .filter(path => {
                if (!path || seen.has(path) || this.isPathExcluded(path)) return false;
                if (validateExists) {
                    const file = this.app.vault.getAbstractFileByPath(path);
                    if (!(file instanceof TFile)) return false;
                }
                seen.add(path);
                return true;
            })
            .slice(0, 100);
    },


    _setRecentOpened(paths, options) {
        const next = this._normalizeRecentOpened(paths, options);
        const current = this.settings.recentOpened || [];
        const unchanged = next.length === current.length
            && next.every((value, index) => value === current[index]);
        if (unchanged) return false;
        this.settings.recentOpened = next;
        // rename / delete 操作只能清理当前设备快照；其它设备存档保留且会在读取时校验路径是否存在。
        this._recentOpenedLocal = this._recentOpenedLocal.filter(item => next.includes(item.path));
        this._recentOpenedHistory = this._recentOpenedHistory.filter(item => next.includes(item.path));
        this._throttleSaveRecentOpenedHistory();
        this._notifyRecentOpened();
        return true;
    },


    _touchRecentOpened(path) {
        if (this.isPathExcluded(path)) return false;
        // 真正的访问时钟只在 GLS 的 file-open Owner 里写，文件 mtime/ctime 不参与。
        const openedAt = Math.max(Date.now(), (this._recentOpenedLocal[0]?.openedAt || 0) + 1);
        this._recentOpenedLocal = [
            { path, openedAt },
            ...this._recentOpenedLocal.filter(item => item.path !== path)
        ].slice(0, 100);
        this._mergeRecentOpenedHistory();
        this._throttleSaveRecentOpenedHistory();
        this._forEachActiveSearchCore(core => {
            if (core.sortField === "opened") core._queueResultIndexChanges(null);
        });
        return true;
    },


    _removeRecentOpenedPath(path) {
        return this._setRecentOpened((this.settings.recentOpened || []).filter(item => item !== path));
    },


    // GLS 唯一历史记录还需迁移真实文件路径：仅改设置数组会让 NAS Sidecar 在重启后恢复旧路径。
    _remapRecentOpenedHistory(oldPath, newPath, descendants = false) {
        if (!oldPath) return false;
        const remap = path => {
            if (path === oldPath) return newPath;
            if (descendants && path.startsWith(`${oldPath}/`)) {
                return newPath ? newPath + path.slice(oldPath.length) : "";
            }
            return path;
        };
        let changed = false;
        const next = items => items.map(item => {
            const path = remap(item.path);
            if (path !== item.path) changed = true;
            return path ? { ...item, path } : null;
        }).filter(Boolean);
        this._recentOpenedLocal = next(this._recentOpenedLocal);
        this._recentOpenedHistory = next(this._recentOpenedHistory);
        if (changed) {
            this._mergeRecentOpenedHistory();
            this._throttleSaveRecentOpenedHistory();
        }
        return changed;
    },
};

