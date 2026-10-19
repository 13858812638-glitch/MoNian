// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { cleanMarkdownForSnippet } from "../../utils/markdown-text.js";


export class BodyIndex {
    constructor(maxLength = 8000) { this.documents = new Map(); this.maxLength = maxLength; }
    clear() { this.documents.clear(); }
    addFile(meta, content = "", readableText = null) {
        if (meta.extension !== "md") {
            this.documents.delete(meta.path);
            return;
        }
        const text = readableText === null
            ? cleanMarkdownForSnippet(content)
            : String(readableText || "");
        this.documents.set(
            meta.path,
            text.slice(0, this.maxLength).toLowerCase()
        );
    }
    removeFile(path) { this.documents.delete(path); }
    moveFile(oldPath, newPath) {
        if (!oldPath || !newPath || oldPath === newPath || !this.documents.has(oldPath)) return;
        const content = this.documents.get(oldPath);
        this.documents.delete(oldPath);
        this.documents.set(newPath, content);
    }
    get(path) { return this.documents.get(path) || ""; }
    serialize() { return { documents: Object.fromEntries(this.documents) }; }
    deserialize(data) { this.documents = new Map(Object.entries(data?.documents || {})); }
}
