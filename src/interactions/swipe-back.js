// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { Platform } from "obsidian";


// BEGIN SHARED NAVIGATION — generated from shared/navigation.js
// Canonical navigation source. Bundled into each independent plugin by build_shared.py.
// One registry per document/input adapter; plugin instances own only their leases.
export function swipeBackCanNavigate(layer) {
    if (!layer || layer.disposed || layer.working || !layer.surface.isConnected
        || layer.surface.closest("[hidden], [inert], .pwb-modal-suspended")) return false;
    try { return layer.isEnabled() && layer.navigation.canGoBack?.() !== false; }
    catch (_) { return false; }
}

export function swipeBackResolve(layers, target) {
    if (target.closest("[hidden], [inert], .pwb-modal-suspended")) return null;
    let best = null, bestRoot = null;
    for (const layer of layers) {
        if (layer.disposed || !layer.surface.isConnected) continue;
        for (const root of layer.roots) {
            if (!root.isConnected || !root.contains(target)) continue;
            if (!bestRoot || bestRoot === root || bestRoot.contains(root)) {
                best = layer; bestRoot = root;
            }
        }
    }
    return best;
}


export function swipeBackNativeGestureOwner(doc, target) {
        if (target?.nodeType !== 1) return false;
        const win = doc.defaultView;
        if (doc.querySelector(".ui-sort-feedback")
            || target.closest(".is-sort-mode [data-sort-key], .is-sort-committing [data-sort-key]")
            || target.closest("[data-db-sort-key]")?._dbSortBound) return true;
        // Native horizontal scrolling owns the entire gesture, including either edge.
        for (let node = target; node; node = node.parentElement) {
            if (node.scrollWidth > node.clientWidth + 1) {
                const overflow = win.getComputedStyle(node).overflowX;
                if (overflow === "auto" || overflow === "scroll") return true;
            }
        }
        return Boolean(target.closest([
            "a, img, [draggable='true'], .cm-editor, .markdown-source-view",
            "[data-pwb-horizontal-gesture], [data-pwb-swipe-action]",
            ".pwb-layout-grip, .pwb-sort-active",
            ".local-search-drag-handle, .local-search-resize-handle",
            ".local-search-swipe-shell.has-swipe-actions",
            ".local-search-view-sort-list.is-sort-mode, .is-sort-committing",
            ".dida-bridge-drag-handle, .dida-bridge-resize-handle",
            ".dida-bridge-result-swipe-node.has-swipe-actions",
            ".dida-bridge-detail-checklist-row, .dida-bridge-tree-sort-active"
        ].join(", ")));
}


export function createSharedSwipeBackRealm(doc, key) {
    const win = doc.defaultView, layers = [], cleanups = [];
    let phase = 0, pointerId = null, entry = null, startX = 0, startY = 0;
    let suppressClickUntil = 0, releaseTimer = null, disposed = false;
    const element = value => value?.nodeType === 1;
    const clear = () => { phase = 0; pointerId = null; entry = null; };
    const consume = event => {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
    };
    const releaseIfIdle = () => {
        if (layers.length || disposed) return;
        if (releaseTimer !== null) win.clearTimeout(releaseTimer);
        releaseTimer = null;
        // Closing the final surface must still swallow this gesture's synthetic click.
        const remaining = suppressClickUntil - Date.now();
        if (remaining > 0) { releaseTimer = win.setTimeout(releaseIfIdle, remaining); return; }
        disposed = true;
        clear();
        for (const cleanup of cleanups) cleanup();
        if (doc[key] === realm) delete doc[key];
    };
    const canBack = swipeBackCanNavigate;
    const resolve = target => swipeBackResolve(layers, target);
    const priority = target => swipeBackNativeGestureOwner(doc, target);
    const listen = (type, listener, options) => {
        win.addEventListener(type, listener, options);
        cleanups.push(() => win.removeEventListener(type, listener, options));
    };
    listen("pointerdown", event => {
        if (event.isPrimary === false) { clear(); return; }
        suppressClickUntil = 0;
        clear();
        releaseIfIdle();
        if (disposed || event.button > 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        const target = element(event.target) ? event.target : null;
        if (!target) return;
        const layer = resolve(target);
        // Disabled / blocked children never fall through to their parent.
        if (!canBack(layer) || target.isContentEditable || target.closest("input, textarea, select, option")
            || priority(target)) return;
        if (event.pointerType === "mouse" && !target.closest("button, [role='button']")
            && [...target.childNodes].some(node => node.nodeType === 3 && String(node.textContent || "").trim())
            && win.getComputedStyle(target).userSelect !== "none") return;
        phase = 1; pointerId = event.pointerId; entry = layer;
        startX = event.clientX; startY = event.clientY;
    }, true);
    listen("pointermove", event => {
        if (event.pointerId !== pointerId || phase === 0 || phase === 3) return;
        if (!canBack(entry) || (event.pointerType === "mouse" && !(event.buttons & 1))) { clear(); return; }
        if (phase === 1 && priority(event.target)) { phase = 3; return; }
        const dx = event.clientX - startX, dy = Math.abs(event.clientY - startY);
        if (phase === 1) {
            if (Math.abs(dx) < 10 && dy < 10) return;
            if (dx <= 0 || dx < dy * 1.35) { phase = 3; return; }
            phase = 2;
        }
        if (phase === 2) consume(event);
    }, { capture: true, passive: false });
    listen("pointerup", event => {
        if (event.pointerId !== pointerId || phase === 0) return;
        const layer = entry, dx = event.clientX - startX, dy = Math.abs(event.clientY - startY);
        const commit = phase === 2 && dx >= 48 && dx > dy * 1.35 && canBack(layer);
        if (phase === 2) { consume(event); suppressClickUntil = Date.now() + 320; }
        clear();
        if (commit) {
            layer.working = true;
            try {
                const result = layer.navigation.back();
                if (result?.then) Promise.resolve(result).then(
                    () => { layer.working = false; },
                    error => { layer.working = false; console.warn("Swipe-Back 返回失败", error); }
                );
                else layer.working = false;
            } catch (error) { layer.working = false; console.warn("Swipe-Back 返回失败", error); }
        }
        releaseIfIdle();
    }, true);
    listen("pointercancel", event => { if (event.pointerId === pointerId) clear(); }, true);
    listen("click", event => {
        if (Date.now() < suppressClickUntil) { suppressClickUntil = 0; consume(event); }
        releaseIfIdle();
    }, true);
    listen("blur", clear);
    const realm = {
        add(layer) {
            if (releaseTimer !== null) win.clearTimeout(releaseTimer);
            releaseTimer = null;
            layers.push(layer);
            return () => {
                if (layer.disposed) return;
                layer.disposed = true;
                const index = layers.indexOf(layer);
                if (index >= 0) layers.splice(index, 1);
                if (entry === layer) clear();
                releaseIfIdle();
            };
        }
    };
    return realm;
}



// Mac touchpad horizontal-wheel adapter v2: shared across GLS, Dida and Workbench.
// Pointer/Touch retain the existing independent v1 state machine. Navigation
// semantics belong to the original layer callbacks, not this input adapter.
// All plugins use one document symbol and one committed-gesture lock.
export function createSharedTrackpadBackRealm(doc, key) {
    const win = doc.defaultView, layers = [];
    let session = null, disposed = false, releaseTimer = null;
    const releaseIfIdle = () => {
        if (layers.length || disposed) return;
        if (releaseTimer !== null) win.clearTimeout(releaseTimer);
        releaseTimer = null;
        const remaining = session?.committed ? 480 - (Date.now() - session.lastAt) : 0;
        if (remaining > 0) { releaseTimer = win.setTimeout(releaseIfIdle, remaining); return; }
        disposed = true;
        session = null;
        win.removeEventListener("wheel", onWheel, true);
        if (doc[key] === realm) delete doc[key];
    };
    const canBack = swipeBackCanNavigate;
    const resolve = target => swipeBackResolve(layers, target);
    const nativeOwner = target => swipeBackNativeGestureOwner(doc, target);
    const foreignOwner = target => Boolean(target.closest([
        ".pwb-gls-embed, .pwb-dida-embed, .dida-bridge-embedded-host",
        ".local-search-swipe-shell, .local-search-modal, .local-search-embedded-host",
        ".dida-bridge-task-center, .dida-bridge-modal-shell",
        ".dida-bridge-dialog-container, .dida-bridge-child-dialog-surface"
    ].join(", ")));
    const consume = event => {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
    };
    // Electron's horizontal wheel sign changes when Natural Scrolling is off.
    const goesRight = event => event.webkitDirectionInvertedFromDevice === false
        ? event.deltaX > 0 : event.deltaX < 0;
    const onWheel = event => {
        const now = Date.now();
        // Once a gesture has navigated, it cannot navigate again when the
        // closing child's DOM disappears and inertia lands on its parent.
        // Do this before resolving the new target or checking its visibility.
        if (session?.committed) {
            if (now - session.lastAt <= 480) {
                if (event.deltaMode === 0 && Math.abs(event.deltaX) >= 2
                    && goesRight(event) && Math.abs(event.deltaX) >= Math.abs(event.deltaY) * 1.45) {
                    session.lastAt = now;
                    consume(event);
                }
                return;
            }
            session = null;
        }
        if (disposed || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey
            || event.shiftKey || event.deltaMode !== 0 || !Number.isFinite(event.deltaX)
            || !Number.isFinite(event.deltaY)) { session = null; return; }
        const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
        if (!target || !target.isConnected) { session = null; return; }
        const layer = resolve(target);
        // Only Workbench yields for foreign UI with no native layer. Once GLS
        // or Dida has registered a deeper layer it MUST be allowed to navigate.
        if (!canBack(layer) || (layer.owner === "workbench" && foreignOwner(target))
            || target.isContentEditable || target.closest("input, textarea, select, option, [contenteditable]")
            || nativeOwner(target) || Boolean(win.getSelection?.()?.toString()?.trim())) {
            session = null; return;
        }
        const horizontal = Math.abs(event.deltaX), vertical = Math.abs(event.deltaY);
        if (horizontal < 2 || horizontal < vertical * 1.45 || !goesRight(event)) {
            session = null; return;
        }
        if (!session || session.layer !== layer || now - session.lastAt > 260) {
            session = { layer, distance: 0, count: 0, startedAt: now, lastAt: now, committed: false };
        }
        session.lastAt = now;
        session.distance += horizontal;
        session.count++;
        // Pixel-mode + 3 samples + horizontal dominance: don't steal a normal
        // mouse click, Shift+wheel, vertical scroll or imprecise diagonal scroll.
        if (session.count < 3 || session.distance < 78 || now - session.startedAt > 520) return;
        session.committed = true;
        consume(event);
        layer.working = true;
        try {
            const result = layer.navigation.back();
            if (result?.then) Promise.resolve(result).then(
                () => { layer.working = false; },
                error => { layer.working = false; console.warn("Mac 触控板右滑返回失败", error); }
            );
            else layer.working = false;
        } catch (error) { layer.working = false; console.warn("Mac 触控板右滑返回失败", error); }
    };
    win.addEventListener("wheel", onWheel, { capture: true, passive: false });
    const realm = {
        add(layer) {
            if (releaseTimer !== null) win.clearTimeout(releaseTimer);
            releaseTimer = null;
            layers.push(layer);
            return () => {
                const index = layers.indexOf(layer);
                if (index >= 0) layers.splice(index, 1);
                // A committed lock survives deregistration while other layers
                // remain. The inertial tail must not back out of the parent.
                if (session?.layer === layer && !session.committed) session = null;
                releaseIfIdle();
            };
        }
    };
    return realm;
}


export function getSharedTrackpadBackRealm(doc, isMobileApp) {
    const win = doc?.defaultView;
    if (!win || isMobileApp || !/Mac/i.test(String(win.navigator?.platform || "")
        + " " + String(win.navigator?.userAgent || ""))) return null;
    const key = Symbol.for("gls-dida.swipe-back.trackpad.v2");
    return doc[key] || (doc[key] = createSharedTrackpadBackRealm(doc, key));
}


export class SharedSwipeBackPrimitive {
    constructor(owner, isEnabled, isMobileApp) {
        this.owner = owner;
        this.isEnabled = typeof isEnabled === "function" ? isEnabled : () => true;
        this.isMobileApp = isMobileApp;
        this.releases = new Set();
        this.disposed = false;
    }
    register(surface, navigation, hitRoots = []) {
        const doc = surface?.ownerDocument;
        if (this.disposed || surface?.nodeType !== 1 || !doc?.defaultView || typeof navigation?.back !== "function") return () => {};
        const key = Symbol.for("gls-dida.swipe-back.v1");
        const realm = doc[key] || (doc[key] = createSharedSwipeBackRealm(doc, key));
        const roots = [surface, ...(Array.isArray(hitRoots) ? hitRoots : [hitRoots])]
            .filter(root => root?.nodeType === 1 && root.ownerDocument === doc);
        const layer = { surface, navigation, roots, owner: this.owner, isEnabled: this.isEnabled, disposed: false, working: false };
        const removePointer = realm.add(layer);
        const removeWheel = getSharedTrackpadBackRealm(doc, this.isMobileApp)?.add(layer);
        const release = () => { removeWheel?.(); removePointer(); this.releases.delete(release); };
        this.releases.add(release);
        return release;
    }
    dispose() {
        this.disposed = true;
        for (const release of [...this.releases]) release();
    }
}

// END SHARED NAVIGATION

export class LocalSearchSwipeBackPrimitive extends SharedSwipeBackPrimitive {
    constructor(isEnabled = () => true) { super("gls", isEnabled, Platform.isMobileApp); }
}
