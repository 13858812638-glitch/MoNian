// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { simpleSegment } from "../../utils/markdown-text.js";


// ========== 批量修改笔记属性值：纯函数层 ==========

// ========== Search state / ranking ==========
export class QueryState {
    constructor(raw = "") { this.set(raw); }
    set(raw) {
        this.raw = String(raw || "");
        this.normalized = this.raw.trim().toLowerCase();
        this.intent = this.normalized.replace(/^#/, "");
        this.units = simpleSegment(this.intent);
        return this;
    }
    get active() { return this.units.length > 0; }
}
