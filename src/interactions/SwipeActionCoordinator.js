// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { createSearchButton } from "../ui/components/input-controls.js";
import { hostDocument, hostWindow } from "../utils/dom.js";
import { Notice, setIcon } from "obsidian";


// ========== Result Swipe：结果卡左右滑动唯一状态机 ==========
export const RESULT_SWIPE_INTENT_SLOP_PX = 4;

export const RESULT_SWIPE_HORIZONTAL_BIAS = 1.15;

export const RESULT_SWIPE_SETTLE_RATIO = .35;

export const RESULT_SWIPE_SETTLE_MAX_PX = 56;


export class SwipeActionCoordinator {
    constructor(owner) {
        this.owner = owner;
        this.allExpanded = false;
        this.expansionRevision = 0;
        this.enabled = true;
        this.activeCancel = null;
        this.openWrapper = null;
        this.openClose = null;
        this.gestureWrapper = null;
        this.closingWrapper = null;
        this.ownerDocument = hostDocument(owner.containerEl);
        this.pendingAction = null;
        this._onDocumentPointerDown = event => {
            if (this.pendingAction || !this.openWrapper || !this.openClose) return;
            const target = event?.target;
            if (target?.nodeType && this.openWrapper.contains(target)) return;
            if (!this._ownsTarget(target)) {
                this.openClose();
                return;
            }

            // A child picker/dialog or native field owns this new input
            // session. Closing a result shelf may not cancel its first tap;
            // otherwise the document capture guard swallows WebKit's focus
            // and compatibility click before the input receives either.
            if (target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), .local-search-dropdown, .local-search-dialog-surface, .local-search-overlay-host')) {
                this.openClose();
                return;
            }

            // 触控在此时还不能区分点击与纵向滚动，不提前收起并缩短滚动范围。
            // 真正点击外部时才由同一 click 入口关闭；滚动不产生 click。
        };
        this._onDocumentClick = event => {
            if (this.pendingAction) return;
            const target = event?.target;
            if (this.openWrapper && target?.nodeType && !this.openWrapper.contains(target)) {
                this.openClose?.();
            }
        };
        this.ownerDocument.addEventListener(
            "pointerdown",
            this._onDocumentPointerDown,
            true
        );
        this.ownerDocument.addEventListener(
            "click",
            this._onDocumentClick,
            true
        );
    }

    _ownsTarget(target) {
        if (!target?.nodeType) return false;
        return Boolean(this.owner?.containerEl?.contains(target)
            || this.owner?.dropdown?.panel?.contains(target));
    }

    mountedBindings() {
        return [...(this.owner?.containerEl?.querySelectorAll(".local-search-swipe-shell") || [])]
            .map(wrapper => wrapper._lsResultBinding).filter(Boolean);
    }

    setAllExpanded(expanded) {
        const next = Boolean(expanded);
        if (next === this.allExpanded) return false;
        const viewport = this.owner?.resultRenderer;
        const anchor = viewport?._geometryAnchor?.();
        this.cancel();
        viewport?.cancelSwipeReveal?.();
        this.allExpanded = next;
        this.expansionRevision++;
        for (const binding of this.mountedBindings()) {
            if (next) binding.syncAllExpanded();
            else binding.close(true);
        }
        viewport?.refreshActionShelfLayout?.(anchor);
        return true;
    }

    closeOpen(except = null) {
        if (this.allExpanded) return;
        if (this.openWrapper && this.openWrapper !== except) {
            this.openClose?.();
        }
    }

    cancel() {
        this.activeCancel?.();
        this.activeCancel = null;
        this.openClose?.(true);
        this.openWrapper = null;
        this.openClose = null;
        this.gestureWrapper = null;
        this.closingWrapper = null;
    }

    closeAll({ immediate = false } = {}) {
        this.activeCancel?.();
        this.activeCancel = null;
        this.openClose?.(immediate);
        this.openWrapper = null;
        this.openClose = null;
        this.gestureWrapper = null;
        if (immediate) this.closingWrapper = null;
    }

    resetForRender() {
        this.cancel();
        this.closingWrapper = null;
        this.owner?.resultRenderer?.cancelSwipeReveal();
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
        if (!this.enabled) this.cancel();
    }

    destroy() {
        this.pendingAction = null;
        this.allExpanded = false;
        for (const binding of this.mountedBindings()) binding.close(true);
        this.resetForRender();
        this.gestureWrapper = null;
        this.ownerDocument?.removeEventListener(
            "pointerdown",
            this._onDocumentPointerDown,
            true
        );
        this.ownerDocument?.removeEventListener(
            "click",
            this._onDocumentClick,
            true
        );
        this.ownerDocument = null;
        this._onDocumentPointerDown = null;
        this._onDocumentClick = null;
        this.owner = null;
    }

    bind(wrapper, row, options = {}) {
        if (!wrapper || !row) return null;
        const actions = (Array.isArray(options.actions) ? options.actions : [])
            .filter(Boolean);
        if (!actions.length) return null;

        wrapper.classList.add("has-swipe-actions");
        const consume = event => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            event?.stopImmediatePropagation?.();
        };

        // Mobile action buttons are built only on the first actual reveal.
        let panel = null;
        let activeDirection = null;
        let close = () => {};
        const ensurePanel = () => {
            if (panel?.isConnected) return panel;

            panel = wrapper.ownerDocument.createElement("div");
            panel.className = "local-search-swipe-actions is-edge-right";
            panel.setAttribute("aria-hidden", "true");
            panel.style.setProperty("--ls-swipe-action-count", String(actions.length));
            for (const item of actions) {
                const button = createSearchButton(panel, "choice", {
                    cls: `local-search-swipe-action${item.tone ? ` is-${item.tone}` : ""}${item.className ? ` ${item.className}` : ""}`,
                    attr: {
                        tabindex: "-1",
                        title: item.label || "操作",
                        "aria-label": item.ariaLabel || item.label || "操作"
                    }
                });
                const icon = button.createSpan({
                    cls: "local-search-swipe-action-icon",
                    attr: { "aria-hidden": "true" }
                });
                if (item.icon) setIcon(icon, item.icon);
                button.createSpan({
                    cls: "local-search-swipe-action-label",
                    text: item.shortLabel || item.label || "操作"
                });
                button.addEventListener("click", event => {
                    consume(event);
                    if (this.pendingAction) return;
                    const token = { wrapper };
                    this.pendingAction = token;
                    button.setAttribute("aria-busy", "true");
                    const finish = () => {
                        button.removeAttribute("aria-busy");
                        if (this.pendingAction !== token) return;
                        this.pendingAction = null;
                        if (wrapper.isConnected) close();
                    };
                    try {
                        const pending = options.onAction?.(item.key, button, activeDirection);
                        if (pending?.then) Promise.resolve(pending).catch(error => {
                            new Notice(error?.message || "操作失败");
                        }).finally(finish);
                        else finish();
                    } catch (error) {
                        finish();
                        new Notice(error?.message || "操作失败");
                    }
                });
            }
            wrapper.appendChild(panel);
            return panel;
        };

        let widthCache = null;
        let renderedOffset = 0;
        const widthFor = () => {
            if (Number.isFinite(widthCache)) return widthCache;
            return widthCache = Math.max(0, ensurePanel().getBoundingClientRect().width || 0);
        };
        const hasActions = () => widthFor() > 0;
        const setDirectionClass = direction => {
            wrapper.classList.toggle("is-swipe-left", direction === "left");
            wrapper.classList.toggle("is-swipe-right", direction === "right");
        };
        const setPanelEdge = direction => {
            const shelf = ensurePanel();
            const revealFromRight = direction !== "right";
            shelf.classList.toggle("is-edge-right", revealFromRight);
            shelf.classList.toggle("is-edge-left", !revealFromRight);
        };
        const setPanelProgress = (progress, direction) => {
            wrapper.style.setProperty("--ls-swipe-progress", progress.toFixed(4));
            if (!panel) return;
            const shift = (direction === "right" ? -100 : 100) * (1 - progress);
            panel.style.setProperty("transform", progress === 1 ? "none" : `translate3d(${shift}%, 0, 0)`, "important");
        };
        const setOffset = (value, direction = null) => {
            const width = direction ? widthFor() : 0;
            const numeric = Number(value) || 0;
            const next = Math.round(direction === "left" ? Math.max(-width, Math.min(0, numeric))
                : direction === "right" ? Math.min(width, Math.max(0, numeric)) : 0);
            if (next === renderedOffset && direction) return next;
            renderedOffset = next;
            setPanelProgress(width > 0 ? Math.min(1, Math.abs(next) / width) : 0, direction);
            return next;
        };
        const setPanelTabState = active => {
            if (!panel && !active) return;
            const shelf = ensurePanel();
            shelf.setAttribute("aria-hidden", active ? "false" : "true");
            for (const button of shelf.querySelectorAll("button")) {
                button.setAttribute("tabindex", active ? "0" : "-1");
            }
        };
        close = (immediate = false) => {
            // 批量展开由工具栏独占控制；动作、外部点击和反向手势不改变全局展示状态。
            if (this.allExpanded) {
                if (wrapper.classList.contains("is-swiping")) open("left");
                return;
            }
            if (!this.allExpanded && wrapper.matches(".is-swiping, .is-swipe-open")) {
                this.closingWrapper = immediate ? null : wrapper;
            }
            if (immediate && this.closingWrapper === wrapper) this.closingWrapper = null;
            if (immediate) this.owner?.resultRenderer?.cancelSwipeReveal(wrapper);
            const currentDirection = wrapper.classList.contains("is-swipe-left")
                ? "left"
                : wrapper.classList.contains("is-swipe-right")
                    ? "right"
                    : activeDirection;
            if (immediate) wrapper.classList.add("is-swipe-no-transition");
            wrapper.classList.remove("is-swipe-open", "is-swiping");
            setPanelTabState(false);
            renderedOffset = 0;
            setPanelProgress(0, currentDirection);
            activeDirection = null;
            if (this.closingWrapper === wrapper) {
                const style = wrapper.ownerDocument.defaultView.getComputedStyle(wrapper);
                const baseline = parseFloat(style.getPropertyValue("--ls-virtual-trailing-space")) || 0;
                if (parseFloat(style.paddingBottom) <= baseline + 0.1) {
                    this.closingWrapper = null;
                    this.owner?.resultRenderer?.cancelSwipeReveal(wrapper);
                }
            }
            this.owner?._scheduleResultIndexUpdate?.();
            if (this.openWrapper === wrapper) {
                this.openWrapper = null;
                this.openClose = null;
            }
            if (immediate) {
                wrapper.classList.remove("is-swipe-left", "is-swipe-right");
            }
        };
        const open = (direction, reveal = true) => {
            if (this.allExpanded) direction = "left";
            wrapper.classList.remove("is-swipe-no-transition");
            widthCache = null;
            if (!direction) { close(); return; }
            ensurePanel();
            this.closeOpen(wrapper);
            if (!this.allExpanded && reveal && !wrapper.matches(".is-swiping, .is-swipe-open")) {
                this.owner?.resultRenderer?.beginSwipeReveal(wrapper);
            }
            if (this.closingWrapper === wrapper) this.closingWrapper = null;
            wrapper.classList.add("is-swipe-open");
            wrapper.classList.remove("is-swiping");
            setDirectionClass(direction);
            setPanelEdge(direction);
            activeDirection = direction;
            setPanelTabState(true);
            renderedOffset = null;
            setPanelProgress(1, direction);
            if (!this.allExpanded) {
                this.openWrapper = wrapper;
                this.openClose = close;
            }
        };
        row.addEventListener("click", event => {
            if (
                Date.now() < (wrapper._lsSwipeSuppressClickUntil || 0)
                || (wrapper.classList.contains("is-swipe-open") && !this.allExpanded && !this.owner?.selection?.batchMode)
            ) {
                consume(event);
                close();
            }
        }, true);

        // Touch uses Touch Events; pen input uses Pointer Events.
        let activeTouch = null;

        const beginGesture = ({ startX, startY, inputType, pointerId = null }) => {
            widthCache = null;
            this.activeCancel?.();
            this.gestureWrapper = wrapper;

            const startedDirection = wrapper.classList.contains("is-swipe-open")
                ? (wrapper.classList.contains("is-swipe-left")
                    ? "left"
                    : wrapper.classList.contains("is-swipe-right")
                        ? "right"
                        : null)
                : null;
            let startOffset = 0;
            let offset = 0;
            let direction = null;
            let gestureMode = "pending";
            let finished = false;
            let captured = false;
            const win = hostWindow(row);

            const lockSwipe = next => {
                if (gestureMode !== "pending" || !next || !hasActions()) return false;
                startOffset = startedDirection === "left" ? -widthFor() : startedDirection === "right" ? widthFor() : 0;
                offset = startOffset;
                wrapper.classList.remove("is-swipe-no-transition");
                // 只有横滑成立才切换展开卡；触摸另一张卡向上/下滚动不关闭当前 Shelf。
                this.closeOpen(wrapper);
                direction = next;
                activeDirection = direction;
                gestureMode = "swipe";
                this.owner?.resultRenderer?.beginSwipeReveal(wrapper);
                if (this.closingWrapper === wrapper) this.closingWrapper = null;
                wrapper.classList.add("is-swiping");
                wrapper.classList.remove("is-swipe-open");
                setDirectionClass(direction);
                setPanelEdge(direction);
                setPanelTabState(true);
                if (inputType === "pointer" && pointerId != null) {
                    try {
                        row.setPointerCapture?.(pointerId);
                        captured = true;
                    } catch (_) {}
                }
                return true;
            };

            // 唯一方向判定：PENDING → SWIPE 或 PENDING → SCROLL。
            // PENDING 阶段不移动卡片；横向必须越过 4px 死区且明显强于纵向才锁 Swipe。
            // 一旦进入 SWIPE，固定 Action Shelf 才开始露出，并在本次手势结束前持续 preventDefault。
            const applyMove = (clientX, clientY, cancelableEvent = null) => {
                if (finished) return;
                const dx = clientX - startX;
                const dy = clientY - startY;

                if (gestureMode === "pending") {
                    const absX = Math.abs(dx);
                    const absY = Math.abs(dy);
                    const horizontalIntent =
                        absX >= RESULT_SWIPE_INTENT_SLOP_PX
                        && absX > absY * RESULT_SWIPE_HORIZONTAL_BIAS;

                    if (horizontalIntent) {
                        const nextDirection = startedDirection
                            || (dx < 0 ? "left" : dx > 0 ? "right" : null);
                        if (!lockSwipe(nextDirection)) {
                            releaseToScroll();
                            return;
                        }
                    } else if (absY >= RESULT_SWIPE_INTENT_SLOP_PX) {
                        releaseToScroll();
                        return;
                    } else {
                        return;
                    }
                }

                if (gestureMode !== "swipe" || !direction) return;
                if (cancelableEvent?.cancelable) cancelableEvent.preventDefault();
                offset = setOffset(startOffset + dx, direction);
            };

            const cleanupPointer = () => {
                if (inputType !== "pointer") return;
                win.removeEventListener("pointermove", pointerMove, true);
                win.removeEventListener("pointerup", pointerEnd, true);
                win.removeEventListener("pointercancel", pointerCancel, true);
                if (captured) {
                    try { row.releasePointerCapture?.(pointerId); } catch (_) {}
                }
            };

            const cleanup = () => {
                cleanupPointer();
                if (inputType === "touch" && activeTouch?.gesture === gesture) {
                    activeTouch = null;
                }
                if (this.activeCancel === abort) this.activeCancel = null;
                if (this.gestureWrapper === wrapper) this.gestureWrapper = null;
                this.owner?._scheduleResultIndexUpdate?.();
            };

            // open/close 原子切换展开态；不能先清 is-swiping 再在 open 的测宽中触发布局。
            const settle = cancelled => {
                if (finished) return;
                finished = true;
                cleanup();

                if (cancelled) {
                    if (direction) startedDirection ? open(startedDirection) : close();
                    return;
                }

                if (direction) wrapper._lsSwipeSuppressClickUntil = Date.now() + 360;
                if (!direction) return;

                const width = widthFor();
                const threshold = Math.min(
                    width * RESULT_SWIPE_SETTLE_RATIO,
                    RESULT_SWIPE_SETTLE_MAX_PX
                );
                const revealed = direction === "left" ? -offset : offset;
                if (startedDirection === direction) {
                    const reverseDistance = direction === "left"
                        ? Math.max(0, offset - startOffset)
                        : Math.max(0, startOffset - offset);
                    reverseDistance >= threshold ? close() : open(direction);
                } else {
                    revealed >= threshold ? open(direction) : close();
                }
            };

            const releaseToScroll = () => {
                if (finished) return;
                gestureMode = "scroll";
                this.owner?.resultRenderer?.yieldSwipeReveal();
                finished = true;
                cleanup();
            };

            const abort = () => {
                if (finished) return;
                finished = true;
                cleanup();
                if (direction) startedDirection ? open(startedDirection) : close(true);
            };

            const pointerMove = moveEvent => {
                if (moveEvent.pointerId !== pointerId || finished) return;
                applyMove(moveEvent.clientX, moveEvent.clientY, moveEvent);
            };
            const pointerEnd = endEvent => {
                if (endEvent.pointerId === pointerId) settle(false);
            };
            const pointerCancel = cancelEvent => {
                if (!cancelEvent || cancelEvent.pointerId === pointerId) settle(true);
            };

            const gesture = { applyMove, settle, abort, releaseToScroll };
            this.activeCancel = abort;

            if (inputType === "pointer") {
                win.addEventListener("pointermove", pointerMove, { capture: true, passive: false });
                win.addEventListener("pointerup", pointerEnd, true);
                win.addEventListener("pointercancel", pointerCancel, true);
            }

            return gesture;
        };

        row.addEventListener("pointerdown", event => {
            if (
                event.pointerType === "touch"
                || event.pointerType === "mouse"
                || !this.enabled
                || event.button > 0
                || options.canStart?.(event) === false
            ) return;

            beginGesture({
                startX: event.clientX,
                startY: event.clientY,
                inputType: "pointer",
                pointerId: event.pointerId
            });
        });

        // iOS non-passive touchmove 必须在手势开始前就注册在命中链上。
        row.addEventListener("touchstart", event => {
            if (
                !this.enabled
                || event.touches?.length !== 1
                || options.canStart?.(event) === false
            ) return;

            const touch = event.changedTouches?.[0] || event.touches?.[0];
            if (!touch) return;

            const gesture = beginGesture({
                startX: touch.clientX,
                startY: touch.clientY,
                inputType: "touch"
            });
            activeTouch = {
                identifier: touch.identifier,
                gesture
            };
        }, { passive: true });

        row.addEventListener("touchmove", event => {
            const state = activeTouch;
            if (!state) return;
            if (event.touches?.length !== 1) {
                state.gesture.settle(true);
                return;
            }
            const touch = event.touches[0];
            if (!touch || touch.identifier !== state.identifier) return;
            state.gesture.applyMove(touch.clientX, touch.clientY, event);
        }, { passive: false });

        row.addEventListener("touchend", event => {
            const state = activeTouch;
            if (!state) return;
            const ended = Array.from(event.changedTouches || [])
                .some(item => item.identifier === state.identifier);
            if (ended) state.gesture.settle(false);
        }, { passive: true });

        row.addEventListener("touchcancel", event => {
            const state = activeTouch;
            if (!state) return;
            const cancelled = Array.from(event.changedTouches || [])
                .some(item => item.identifier === state.identifier);
            if (cancelled || !event.changedTouches?.length) state.gesture.settle(true);
        }, { passive: true });

        let expansionRevision = -1;
        const binding = {
            get panel() { return panel; }, close, open,
            syncAllExpanded: () => {
                if (!this.allExpanded || !wrapper.isConnected || expansionRevision === this.expansionRevision) return;
                expansionRevision = this.expansionRevision;
                open("left", false);
                wrapper.classList.add("is-swipe-no-transition");
            }
        };
        wrapper._lsResultBinding = binding;
        return binding;
    }
}
