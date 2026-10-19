// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { Modal, Scope } from "obsidian";


// 默认搜索入口：Obsidian Modal Host；搜索业务全部由 SearchWindowSession 持有。
export class SearchModalHost extends Modal {
    constructor(app, session) {
        super(app);
        this.session = session;
        this.scope = new Scope(this.scope);
        this.scope.register([], "Escape", event => {
            this.session?._handleEscapeEvent(event);
            return false;
        });
    }

    isOpen() {
        return Boolean(this.modalEl?.isConnected);
    }

    onOpen() {
        this.session?._attachHost(this, this.modalEl, this.contentEl);
        this.session?.onOpen();
    }

    close() {
        return this.session?.close() ?? false;
    }

    _closeDirect() {
        super.close();
    }

    onClose() {
        this.session?.onClose();
    }
}
