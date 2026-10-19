// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.


// END SHARED HOVER HINTS

// BEGIN SHARED DRAG FEEDBACK — generated from shared/drag-feedback.js
// Feedback only. Gesture ownership, drop validation and persistence stay with the sorter.
// One DOM allocation per drag; no listeners, timers, copied row DOM or business state.
export class SortFeedback {
    constructor(source) {
        this.source = source;
        this.doc = source.ownerDocument;
        this.root = this.doc.createElement("div");
        this.root.className = "ui-sort-feedback";
        this.root.dataset.uiSortOwner = "ls";
        this.root.setAttribute("aria-hidden", "true");
        this.line = this.doc.createElement("div");
        this.line.className = "ui-sort-feedback-line";
        this.target = this.doc.createElement("div");
        this.target.className = "ui-sort-feedback-target";
        this.badge = this.doc.createElement("div");
        this.badge.className = "ui-sort-feedback-badge";
        this.nameEl = this.doc.createElement("span");
        this.nameEl.className = "ui-sort-feedback-name";
        this.actionEl = this.doc.createElement("span");
        this.actionEl.className = "ui-sort-feedback-action";
        this.badge.append(this.nameEl, this.actionEl);
        this.root.append(this.line, this.target, this.badge);
        this.doc.body.append(this.root);
        const title = source.querySelector(".pwb-module-label,.pwb-project-name,.pwb-action-editor-name,.pwb-project-layout-label,.dida-bridge-view-label,.dida-bridge-view-row-main,.dida-bridge-view-section-toggle,.dida-bridge-picker-tree-label,.local-search-view-label,.local-search-view-row-main,.local-search-view-section-toggle,.local-search-row-label");
        this.name = (source.dataset.sortName || title?.textContent || source.textContent || "排序项").trim().replace(/\s+/g, " ");
        this.nameEl.textContent = this.name;
    }

    show({ bounds, clip = bounds, y = null, pointerY, label, target = null }) {
        if (!this.source?.isConnected || !this.root?.isConnected) return;
        const win = this.doc.defaultView;
        const viewport = win.visualViewport;
        const top = viewport?.offsetTop || 0;
        const left = viewport?.offsetLeft || 0;
        const width = viewport?.width || win.innerWidth;
        const height = viewport?.height || win.innerHeight;
        const x = Math.max(left, bounds.left, clip.left);
        const right = Math.min(left + width, bounds.right, clip.right);
        const upper = Math.max(top, clip.top), lower = Math.min(top + height, clip.bottom);
        const set = (name, value) => this.root.style.setProperty(name, `${Math.round(value)}px`);
        set("--ui-sort-left", x); set("--ui-sort-width", Math.max(0, right - x));
        set("--ui-sort-pointer-y", pointerY);
        set("--ui-sort-viewport-top", top); set("--ui-sort-viewport-bottom", top + height);
        this.line.hidden = y === null || y < upper || y > lower || right <= x;
        if (!this.line.hidden) set("--ui-sort-line-y", y);
        this.target.hidden = !target;
        if (target) {
            set("--ui-sort-target-top", Math.max(upper, target.top));
            set("--ui-sort-target-height", Math.max(0, Math.min(lower, target.bottom) - Math.max(upper, target.top)));
        }
        if (this.actionEl.textContent !== label) this.actionEl.textContent = label;
    }

    destroy() {
        this.root?.remove();
        this.root = this.source = this.doc = this.line = this.target = this.badge = this.nameEl = this.actionEl = null;
    }
}
