// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { SortFeedback } from "./sort-feedback.js";
import { Notice } from "obsidian";


// ========== Pointer Sort：树形拖拽 / 普通排序共用唯一 Pointer Engine ==========
export class PointerSortCoordinator {
    constructor({
        list,
        scrollContainer = null,
        rowSelector = ".local-search-move-tree-row[data-sort-key]",
        hierarchical = false,
        getMeta = row => ({
            key: row?.dataset?.sortKey || "",
            depth: Number(row?.dataset?.sortDepth || 0),
            parentKey: row?.dataset?.sortParent || "",
            promoteParentKey: row?.dataset?.sortPromoteParent || "",
            name: row?.dataset?.sortName || row?.dataset?.sortKey || ""
        }),
        canStart = () => true,
        canNest = () => false,
        canPromote = () => true,
        onCommit = null,
        onSettled = null
    } = {}) {
        this.list = list;
        this.scrollContainer = scrollContainer || list;
        this.rowSelector = rowSelector;
        this.hierarchical = hierarchical;
        this.getMeta = getMeta;
        this.canStart = canStart;
        this.canNest = canNest;
        this.canPromote = canPromote;
        this.onCommit = onCommit;
        this.onSettled = onSettled;
        this.enabled = false;
        this.session = null;
        this._feedback = null;
        this._raf = 0;
        this._lastPointer = null;
        this._suppressClickUntil = 0;
        this._committing = false;
        this._move = null;
        this._finish = null;
        this._cancel = null;

        this._blur = event => { if (event.target === this.session?.win) this.cancel(); };
        this._pointerDown = event => this._onPointerDown(event);
        this._clickCapture = event => {
            if (performance.now() >= this._suppressClickUntil) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
        };
        this.list?.addEventListener("pointerdown", this._pointerDown);
        this.list?.addEventListener("click", this._clickCapture, true);
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
        this.list?.classList.toggle("is-sort-mode", this.enabled);
        if (!this.enabled) {
            this.cancel();
            // Leaving sort mode is an explicit new interaction. A drag's
            // compatibility-click guard must not swallow the next eye/delete
            // action after the user has already pressed the sort-mode button.
            this._suppressClickUntil = 0;
        }
    }

    _rows() {
        return [...(this.list?.querySelectorAll(this.rowSelector) || [])]
            .filter(row => row.isConnected && !row.classList.contains("is-no-sort")
                && row.getClientRects().length && row.getBoundingClientRect().height > 0);
    }

    _onPointerDown(event) {
        if (!this.enabled || this.session || this._committing || event.button !== 0) return;
        const target = event.target?.nodeType === 1 ? event.target : null;
        if (!target || target.closest("[data-ls-no-drag='true']")) return;
        const row = target.closest(this.rowSelector);
        if (!row || !this.list.contains(row) || !this.canStart(row, event)) return;

        const meta = this.getMeta(row);
        if (!meta?.key) return;

        event.preventDefault();
        event.stopPropagation();
        row.classList.add("is-dragging");
        this.list.classList.add("is-dragging");
        const win = this.list.ownerDocument.defaultView;
        win.document.body.classList.add("local-search-pointer-sorting");

        this.session = {
            win,
            pointerId: event.pointerId,
            row,
            meta,
            startX: event.clientX,
            startY: event.clientY,
            clientX: event.clientX,
            clientY: event.clientY,
            mode: "reorder",
            beforeKey: null,
            parentKey: meta.parentKey || "",
            targetRow: null
        };
        this._lastPointer = { x: event.clientX, y: event.clientY };

        this._move = moveEvent => this._onPointerMove(moveEvent);
        this._finish = finishEvent => this._finishSession(finishEvent, false);
        this._cancel = cancelEvent => this._finishSession(cancelEvent, true);
        win.addEventListener("pointermove", this._move, { passive: false, capture: true });
        win.addEventListener("pointerup", this._finish, true);
        win.addEventListener("pointercancel", this._cancel, true);
        win.addEventListener("blur", this._blur, true);
        this._updateDrop(event.clientX, event.clientY);
    }

    _onPointerMove(event) {
        const session = this.session;
        if (!session || event.pointerId !== session.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        session.clientX = event.clientX;
        session.clientY = event.clientY;
        this._lastPointer = { x: event.clientX, y: event.clientY };
        this._updateDrop(event.clientX, event.clientY);
        this._ensureAutoScroll();
    }

    _rowAtY(clientY, rows = this._rows()) {
        return rows.find(row => {
            const rect = row.getBoundingClientRect();
            return clientY >= rect.top && clientY <= rect.bottom;
        }) || null;
    }

    _sameLevelRows(meta) {
        return this._rows().filter(row => {
            if (row === this.session?.row) return false;
            const rowMeta = this.getMeta(row);
            return rowMeta.parentKey === (meta.parentKey || "")
                && Number(rowMeta.depth || 0) === Number(meta.depth || 0);
        });
    }

    _clearTargetVisual() {
        this.session?.targetRow?.classList.remove("is-sort-parent-target");
        if (this.session) this.session.targetRow = null;
        this.list?.classList.remove("is-sort-promote-root");
    }

    _showFeedback(clientY, label, y = null, target = null) {
        this._feedback ||= new SortFeedback(this.session.row);
        this._feedback.show({ bounds: this.list.getBoundingClientRect(),
            clip: this.scrollContainer.getBoundingClientRect(), y, pointerY: clientY, label, target });
    }

    _updateDrop(clientX, clientY) {
        const session = this.session;
        if (!session) return;
        this._clearTargetVisual();

        const dx = clientX - session.startX;
        const rows = this._rows();
        const hitRow = this._rowAtY(clientY, rows);
        const hitMeta = hitRow ? this.getMeta(hitRow) : null;

        if (
            this.hierarchical
            && dx <= -24
            && Number(session.meta.depth || 0) > 0
            && this.canPromote(session.meta)
        ) {
            session.mode = "promote";
            session.parentKey = session.meta.promoteParentKey || "";
            session.beforeKey = null;
            this.list.classList.add("is-sort-promote-root");
            this._showFeedback(clientY, "← 提升一级", null, this.list.getBoundingClientRect());
            return;
        }

        if (
            this.hierarchical
            && (dx >= 24 || session.meta.kind === "property-value")
            && hitRow
            && hitRow !== session.row
            && this.canNest(session.meta, hitMeta, hitRow)
        ) {
            session.mode = "nest";
            session.parentKey = hitMeta.key;
            session.beforeKey = null;
            session.targetRow = hitRow;
            hitRow.classList.add("is-sort-parent-target");
            this._showFeedback(clientY, `移入 ${hitMeta.name || hitMeta.key}`, null, hitRow.getBoundingClientRect());
            return;
        }

        session.mode = "reorder";
        session.parentKey = session.meta.parentKey || "";
        const candidates = this._sameLevelRows(session.meta);
        let beforeRow = null;
        for (const row of candidates) {
            const rect = row.getBoundingClientRect();
            if (clientY < rect.top + rect.height / 2) {
                beforeRow = row;
                break;
            }
        }
        session.beforeKey = beforeRow ? this.getMeta(beforeRow).key : null;

        const listRect = this.list.getBoundingClientRect();
        let y = listRect.bottom;
        if (beforeRow) {
            y = beforeRow.getBoundingClientRect().top;
        } else if (candidates.length) {
            y = candidates[candidates.length - 1].getBoundingClientRect().bottom;
        }
        this._showFeedback(clientY, `移到第 ${beforeRow ? candidates.indexOf(beforeRow) + 1 : candidates.length + 1} 项`, y);
    }

    _ensureAutoScroll() {
        if (this._raf || !this.session) return;
        const win = this.session.win;
        const tick = () => {
            this._raf = 0;
            const scroller = this.scrollContainer || this.list;
            if (!this.session || !this.list?.isConnected || !scroller?.isConnected || !this._lastPointer) return;
            const rect = scroller.getBoundingClientRect();
            const y = this._lastPointer.y;
            const edge = 64;
            let velocity = 0;
            if (y < rect.top + edge) {
                velocity = -Math.min(16, Math.max(3, (rect.top + edge - y) / 4));
            } else if (y > rect.bottom - edge) {
                velocity = Math.min(16, Math.max(3, (y - (rect.bottom - edge)) / 4));
            }
            if (velocity) {
                const before = scroller.scrollTop;
                scroller.scrollTop += velocity;
                if (scroller.scrollTop !== before) {
                    this._updateDrop(this._lastPointer.x, this._lastPointer.y);
                    this._raf = win.requestAnimationFrame(tick);
                }
            }
        };
        this._raf = win.requestAnimationFrame(tick);
    }

    async _finishSession(event, cancelled) {
        const session = this.session;
        if (!session) return;
        if (event?.pointerId !== undefined && event.pointerId !== session.pointerId) return;

        event?.preventDefault?.();
        event?.stopPropagation?.();
        this._suppressClickUntil = performance.now() + 360;

        session.win.removeEventListener("pointermove", this._move, true);
        session.win.removeEventListener("pointerup", this._finish, true);
        session.win.removeEventListener("pointercancel", this._cancel, true);
        session.win.removeEventListener("blur", this._blur, true);
        this._move = null;
        this._finish = null;
        this._cancel = null;
        if (this._raf) session.win.cancelAnimationFrame(this._raf);
        this._raf = 0;

        session.row?.classList.remove("is-dragging");
        this.list?.classList.remove("is-dragging");
        session.win.document.body.classList.remove("local-search-pointer-sorting");
        this._clearTargetVisual();
        this._feedback?.destroy(); this._feedback = null;
        this.session = null;
        this._lastPointer = null;

        if (!cancelled && typeof this.onCommit === "function") {
            this._committing = true;
            this.list?.classList.add("is-sort-committing");
            try {
                await this.onCommit({
                    key: session.meta.key,
                    meta: session.meta,
                    mode: session.mode,
                    beforeKey: session.beforeKey,
                    parentKey: session.parentKey
                });
            } catch (error) {
                console.error("拖拽排序提交失败", error);
                new Notice(error?.message || "拖拽排序失败");
            } finally {
                this._committing = false;
                this.list?.classList.remove("is-sort-committing");
            }
        }
        this.onSettled?.({ cancelled });
    }

    cancel() {
        if (!this.session) {
            this._clearTargetVisual();
            this._feedback?.destroy(); this._feedback = null;
            if (this._raf) this.list?.ownerDocument.defaultView.cancelAnimationFrame(this._raf);
            this._raf = 0;
            return;
        }
        void this._finishSession(null, true);
    }

    destroy() {
        this.cancel();
        this.list?.removeEventListener("pointerdown", this._pointerDown);
        this.list?.removeEventListener("click", this._clickCapture, true);
        this.list?.classList.remove(
            "is-sort-mode",
            "is-dragging",
            "is-sort-promote-root",
            "is-sort-committing"
        );
        this.list = null;
        this.scrollContainer = null;
        this._move = null;
        this._finish = null;
        this._cancel = null;
        this.onCommit = null;
        this.onSettled = null;
    }
}
