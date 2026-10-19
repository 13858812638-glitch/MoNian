// Controlled native-leaf capability fixture. Keyboard signals are simulated;
// a Playwright tap is real Chromium input, not proof of a real iOS edit session.
window.installFocusProbe = function () {
    const viewport = new EventTarget();
    Object.assign(viewport, { width: innerWidth, height: innerHeight, offsetTop: 0, offsetLeft: 0, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    window.testViewport = viewport;
    window.focusProbeListeners = [];
    const proto = EventTarget.prototype, add = proto.addEventListener, remove = proto.removeEventListener;
    const tracked = (target, type) => (target === window && ['keyboardWillShow', 'keyboardDidShow', 'keyboardDidHide', 'orientationchange', 'resize'].includes(type)) || target === viewport;
    const capture = options => typeof options === 'boolean' ? options : Boolean(options?.capture);
    proto.addEventListener = function (type, fn, options) {
        if (tracked(this, type) && !focusProbeListeners.some(x => x.target === this && x.type === type && x.fn === fn && x.capture === capture(options)))
            focusProbeListeners.push({ target: this, type, fn, capture: capture(options) });
        return add.call(this, type, fn, options);
    };
    proto.removeEventListener = function (type, fn, options) {
        const i = focusProbeListeners.findIndex(x => x.target === this && x.type === type && x.fn === fn && x.capture === capture(options));
        if (i >= 0) focusProbeListeners.splice(i, 1);
        return remove.call(this, type, fn, options);
    };
    const originalFocus = HTMLElement.prototype.focus, originalBlur = HTMLElement.prototype.blur;
    window.programmaticFocus = [];
    HTMLElement.prototype.focus = function (...args) { programmaticFocus.push({ action: 'focus', target: this.className }); return originalFocus.apply(this, args); };
    HTMLElement.prototype.blur = function (...args) { programmaticFocus.push({ action: 'blur', target: this.className }); return originalBlur.apply(this, args); };
};
window.setTestKeyboard = function (height, notify = true, css = true) {
    testViewport.height = innerHeight - height;
    document.documentElement.style.setProperty('--keyboard-height', `${css ? height : 0}px`);
    if (notify) window.dispatchEvent(new CustomEvent(height ? 'keyboardWillShow' : 'keyboardDidHide', { detail: { keyboardHeight: height } }));
    testViewport.dispatchEvent(new Event('resize'));
};
window.freshFocusFixture = async function () {
    focusObserver?.disconnect(); window.FC?.destroy();
    window.setTestKeyboard(0); testViewport.scale = 1;
    await auditFresh();
    window.FC = new S.SearchWorkspaceCapabilities(C);
    window.focusMetrics = { tools: 0, mutation: 0, childChanges: 0, position: 0 };
    const tools = C.navigator._syncMobileTools, position = C.dropdown.reposition;
    C.navigator._syncMobileTools = function (...args) { focusMetrics.tools++; return tools.apply(this, args); };
    C.dropdown.reposition = function (...args) { focusMetrics.position++; return position.apply(this, args); };
    window.focusObserver = new MutationObserver(rows => {
        focusMetrics.mutation += rows.length;
        focusMetrics.childChanges += rows.filter(r => r.type === 'childList').length;
    });
    focusObserver.observe(C.containerEl, { subtree: true, attributes: true, childList: true });
    await waitFixture(220);
    resetFocusMetrics();
};
window.focusObserver = null;
window.resetFocusMetrics = () => { focusMetrics = { tools: 0, mutation: 0, childChanges: 0, position: 0 }; programmaticFocus = []; };
window.inputEvidence = function (input) {
    const rect = input.getBoundingClientRect(), css = getComputedStyle(input);
    const panel = input.closest('.local-search-dropdown');
    const frame = (panel || C.containerEl)[S.MOBILE_FRAME_OWNER];
    return {
        active: document.activeElement === input, connected: input.isConnected,
        value: input.value, selection: [input.selectionStart, input.selectionEnd],
        box: [rect.x, rect.y, rect.width, rect.height],
        tapHighlight: css.webkitTapHighlightColor, caret: css.caretColor, font: css.fontSize,
        background: css.backgroundColor, parentBackground: getComputedStyle(input.parentElement).backgroundColor,
        transform: css.transform, transition: css.transitionDuration,
        locked: Boolean(frame?.locked), keyboard: Boolean(frame?.root.classList.contains('is-ui-keyboard-open')),
        inset: frame?.root.style.getPropertyValue('--ui-mobile-keyboard-inset') || '',
        metrics: JSON.parse(JSON.stringify(focusMetrics)), programmatic: [...programmaticFocus],
        globalKeyboardListeners: focusProbeListeners.length
    };
};
