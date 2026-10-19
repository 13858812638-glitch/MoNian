// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { isDomElement } from "../../utils/dom.js";
import { createSharedDialogSurface } from "./dialog-surface.js";
import { createDialogSubmission, trapDialogTab } from "./submission.js";
import { Notice, Platform } from "obsidian";


export function createDialogSession(core, {
    backdropClass = "local-search-confirm-backdrop",
    ownerPanel = null,
    kind = "confirm",
    onFinish = null
} = {}) {
    if (core?._destroyed || !core?.containerEl?.isConnected) return null;
    const previous = core._confirmSession;
    if (previous) {
        previous.finish(false);
        if (!previous.settled) return null;
    }

    const doc = core.containerEl.ownerDocument;
    const focusOwner = ownerPanel?.isConnected ? ownerPanel : core.popupSurfaceHost();
    // All shared dialogs/backdrops use the existing viewport Portal, never
    // a scrolling Picker container. This gives one fixed coordinate space on
    // desktop, Android and iOS, while ownerPanel still owns focus/cleanup.
    // On iOS the validated paint-free Portal E remains the caret surface.
    const host = core.popupSurfaceHost();
    const focusOrigin = ownerPanel?.isConnected ? ownerPanel : core.containerEl;
    const focused = doc.activeElement;
    // Mobile text inputs match :focus-visible after a finger tap as well.
    // Closing a child dialog must not resurrect that parent's native editing
    // session; it follows the same return-focus contract as child Pickers.
    const previousFocus = focusOrigin.contains(focused) && focused.matches?.(":focus-visible")
        && (!Platform.isMobile || !focused.matches?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))
        ? focused : null;
    const fallbackFocus = focusOrigin.querySelector("button:not(:disabled)");
    const backdrop = host.createDiv({ cls: `${backdropClass} local-search-dialog-backdrop`.trim() });
    let dialog = null, submission = null, swipeCleanup = null, settled = false, resolveFinished;
    const finished = new Promise(resolve => { resolveFinished = resolve; });
    const active = () => !settled && !core._destroyed && dialog?.isConnected && core.containerEl.isConnected;

    // User dismissals wait for the transaction. Only host teardown may force
    // disposal; that ends the UI lease, not the already-started file operation.
    const finish = (value, { force = false, restoreFocus = true } = {}) => {
        if (settled || (submission?.busy && !force)) return false;
        const shouldRestore = restoreFocus && previousFocus && focusOwner.isConnected && !core._destroyed
            && (dialog?.contains(doc.activeElement) || doc.activeElement === doc.body);
        settled = true;
        swipeCleanup?.();
        swipeCleanup = null;
        host.removeEventListener("keydown", trapKeyboard, true);
        if (core._confirmSession === session) core._confirmSession = null;
        backdrop.remove();
        dialog?.remove();
        const confirmed = Boolean(value);
        try { onFinish?.(confirmed); }
        finally {
            resolveFinished(confirmed);
            if (!core._destroyed) core._scheduleResultIndexUpdate?.();
        }
        const target = previousFocus?.isConnected ? previousFocus : fallbackFocus;
        if (shouldRestore && !core._confirmSession && !core._destroyed && focusOwner.isConnected
            && target?.isConnected && !target.disabled && doc.activeElement === doc.body) {
            target.focus({ preventScroll: true });
        }
        return confirmed;
    };
    const trapKeyboard = event => {
        if (!active() || event.isComposing || event.keyCode === 229) return;
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopImmediatePropagation();
            finish(false);
            return;
        }
        trapDialogTab(dialog, event);
    };
    // Dialog may be a sibling of its Picker on iOS, so keyboard events
    // must be captured by the real dialog portal, not an unrelated ancestor.
    host.addEventListener("keydown", trapKeyboard, true);
    const swallow = event => { event.stopPropagation(); event.stopImmediatePropagation(); };
    backdrop.addEventListener("pointerdown", swallow);
    backdrop.addEventListener("pointerup", swallow);
    backdrop.addEventListener("click", event => { event.preventDefault(); swallow(event); finish(false); });
    const session = {
        host, backdrop, ownerPanel, kind, finished, finish,
        get settled() { return settled; },
        get busy() { return Boolean(submission?.busy); },
        submit(operation, controls, errorText) { return submission?.submit(operation, controls, errorText) ?? false; },
        setDialog(value) {
            swipeCleanup?.();
            swipeCleanup = null;
            dialog = value;
            if (isDomElement(dialog)) {
                submission = createDialogSubmission(dialog, active, () => finish(true),
                    (error, fallback) => new Notice(error?.message || fallback));
                swipeCleanup = core.plugin?.swipeBack?.register(dialog, {
                    canGoBack: () => active() && !session.busy,
                    back: () => finish(false)
                }, [backdrop]) ?? null;
            }
            return dialog;
        }
    };
    core._confirmSession = session;
    return session;
}


// 文件重命名与删除保持同一个 Dialog 固定几何：不再监听软键盘、
// visualViewport 或动态覆盖中心坐标。iOS 仅由系统负责输入焦点与键盘。

export function openSearchRenameDialog(core, {
    ownerPanel = core.dropdown?.panel || null,
    kind = "rename",
    onFinish = null,
    title = "重命名",
    message = "",
    fieldLabel = "名称",
    initialValue = "",
    placeholder = "",
    confirmText = "确定",
    errorText = "保存失败",
    onSubmit = null
} = {}) {
    if (typeof onSubmit !== "function") return false;
    const session = createDialogSession(core, {
        backdropClass: "local-search-picker-dialog-backdrop",
        ownerPanel, kind,
        onFinish
    });
    if (!session) return null;

    const standaloneFileRename = kind === "rename-file" && !ownerPanel;
    const originalValue = String(initialValue || "");
    const surface = createSharedDialogSurface(session.host, {
        title, message, confirmText,
        closeable: standaloneFileRename,
        field: { label: fieldLabel, placeholder, value: originalValue },
        onFinish: confirmed => {
            if (!confirmed) session.finish(false);
            else void submit();
        }
    });
    const { dialog, input, cancelButton, confirmButton } = surface;
    dialog.addClass("local-search-picker-dialog", "local-search-rename-dialog");
    if (standaloneFileRename) dialog.addClass("local-search-file-rename-dialog", "local-search-file-operation-dialog");
    session.setDialog(dialog);

    const submit = () => {
        if (session.settled || session.busy) return;
        const next = String(input.value || "").trim();
        if (!next) {
            new Notice(`请输入${fieldLabel}`);
            input.focus({ preventScroll: true });
            return;
        }
        if (next === originalValue) { session.finish(false); return; }
        return session.submit(() => onSubmit(next), [input, cancelButton, confirmButton], errorText);
    };

    dialog.addEventListener("pointerdown", event => event.stopPropagation());
    dialog.addEventListener("click", event => event.stopPropagation());
    input.addEventListener("keydown", event => {
        event.stopPropagation();
        if (event.isComposing || event.keyCode === 229 || event.key !== "Enter") return;
        event.preventDefault();
        void submit();
    });

    input.focus({ preventScroll: true });
    if (Platform.isMobile) {
        // iOS: place the insertion caret after the editable base name, never select-all.
        if (input.ownerDocument.activeElement === input) {
            try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {}
        }
    } else input.select();
    return session;
}


export function openPickerDeleteDialog(core, {
    title = "删除",
    message = "",
    confirmText = "删除",
    onConfirm = null
} = {}) {
    if (typeof onConfirm !== "function") return false;
    const session = createDialogSession(core, {
        backdropClass: "local-search-picker-dialog-backdrop",
        ownerPanel: core.dropdown?.panel || null
    });
    if (!session) return false;

    const surface = createSharedDialogSurface(session.host, {
        title, message, confirmText, danger: true,
        onFinish: (confirmed, controls) => {
            if (!confirmed) { session.finish(false); return; }
            void session.submit(onConfirm, [controls.cancelButton, controls.confirmButton], "删除失败");
        }
    });
    surface.dialog.addClass("local-search-picker-dialog");
    session.setDialog(surface.dialog);
    surface.dialog.addEventListener("pointerdown", event => event.stopPropagation());
    surface.dialog.addEventListener("click", event => event.stopPropagation());
    surface.cancelButton.focus({ preventScroll: true });
    return true;
}
