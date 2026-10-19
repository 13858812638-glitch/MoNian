// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { activeWorkspaceDocument } from "../../utils/dom.js";


// 专用浮窗命令入口：真正 modeless Host，不进入 Obsidian Modal Scope。
// 除 Escape 外不注册任何全局键盘快捷键，因此浮窗存在时 Obsidian 全局快捷键照常工作。
export class SearchFloatingHost {
    constructor(session) {
        this.session = session;
        this.panel = null;
        this.contentEl = null;
        this._escapeHandler = null;
    }

    isOpen() {
        return Boolean(this.panel?.isConnected);
    }

    _createPanel() {
        const doc = this.session?._hostDocument?.() || activeWorkspaceDocument(this.session?.app);
        const panel = doc.body.createDiv({
            cls: "local-search-modal local-search-modeless-window",
            attr: {
                role: "dialog",
                "aria-modal": "false",
                "aria-label": "本地搜索"
            }
        });
        this.panel = panel;
        this._escapeHandler = event => {
            if (event.key !== "Escape") return;
            this.session?._handleEscapeEvent(event);
        };
        panel.addEventListener("keydown", this._escapeHandler, true);
        return panel;
    }

    open() {
        if (this.isOpen()) return true;
        const panel = this._createPanel();
        const contentEl = panel.createDiv({ cls: "local-search-content" });
        this.contentEl = contentEl;
        this.session?._attachHost(this, panel, contentEl);
        this.session?.onOpen();
        return true;
    }

    close() {
        return this.session?.close() ?? false;
    }

    _closeDirect() {
        const panel = this.panel;
        if (this._escapeHandler) {
            panel?.removeEventListener("keydown", this._escapeHandler, true);
            this._escapeHandler = null;
        }

        // Modeless Host 没有 Obsidian Modal 动画 / Scope 需要等待。
        // 先从文档树摘除窗口，再做 SearchCore / Observer / Picker 清理；
        // 避免“清理完成后窗口才消失”的反向视觉顺序。
        panel?.remove();
        this.panel = null;
        this.contentEl = null;
        this.session?.onClose();
    }
}
