// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



export function trapDialogTab(root, event) {
    if (event.key !== "Tab" || event.isComposing || event.keyCode === 229 || event.defaultPrevented || !root?.isConnected) return false;
    const controls = [...root.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]')]
        .filter(node => node.tabIndex >= 0 && !node.closest('[hidden], [inert]') && node.getClientRects().length);
    const active = root.ownerDocument.activeElement;
    const first = controls[0], last = controls[controls.length - 1];
    if (!first || !root.contains(active) || (event.shiftKey ? active === first : active === last)) {
        event.preventDefault();
        event.stopPropagation();
        if (!first) root.tabIndex = -1;
        (event.shiftKey ? last : first)?.focus({ preventScroll: true });
        if (!first) root.focus({ preventScroll: true });
        return true;
    }
    return false;
}

// BEGIN SHARED DIALOG SUBMISSION — generated from shared/dialog-submission.js
// One submission owner per dialog or picker; host adapters own layout and dismissal.
// Read-only text fields preserve the current keyboard/caret while work is pending.
export function createDialogSubmission(root, isActive, close, reportError) {
    let busy = false;
    return {
        get busy() { return busy; },
        async submit(operation, controls, failureMessage, onError = reportError, { closeOnSuccess = true } = {}) {
            if (busy || !isActive()) return false;
            busy = true;
            root.setAttribute("aria-busy", "true");
            const doc = root.ownerDocument;
            const focused = root.contains(doc.activeElement) && doc.activeElement.matches?.(":focus-visible") ? doc.activeElement : null;
            const previous = controls.map(node => [node, node.disabled, node.readOnly]);
            for (const [node] of previous) {
                const text = node.tagName === "TEXTAREA" || (node.tagName === "INPUT"
                    && ["text", "search", "tel", "url", "email", "password", "date", "month", "week", "time", "datetime-local", "number"].includes(node.type));
                if (text) node.readOnly = true;
                else node.disabled = true;
            }
            try {
                const result = await operation();
                if (result === false) return false;
                busy = false;
                if (closeOnSuccess && isActive()) close();
                return true;
            } catch (error) {
                if (isActive()) onError?.(error, failureMessage);
                return false;
            } finally {
                busy = false;
                if (isActive()) {
                    root.removeAttribute("aria-busy");
                    for (const [node, disabled, readOnly] of previous) {
                        node.disabled = disabled;
                        if (readOnly !== undefined) node.readOnly = readOnly;
                    }
                    if (focused?.isConnected && doc.activeElement === doc.body) focused.focus({ preventScroll: true });
                }
            }
        }
    };
}
