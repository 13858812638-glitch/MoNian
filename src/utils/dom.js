// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



// Host Context Primitive：DOM Realm 永远跟随真实宿主节点，而不是插件加载时的主 window。
// 多窗口 / Pop-out / 原生 Tab 共用这一套 document/window/Element 判定；
// 业务层不得直接假定全局 document/window 与当前 Surface 属于同一个 Realm。
export function hostDocument(source = null) {
    if (source?.nodeType === 9) return source;
    if (source?.document?.nodeType === 9) return source.document;
    return source?.ownerDocument || globalThis.document;
}


export function hostWindow(source = null) {
    return hostDocument(source)?.defaultView || globalThis.window;
}


export function activeWorkspaceDocument(app) {
    const leaf = app?.workspace?.activeLeaf;
    const host = leaf?.view?.containerEl || leaf?.containerEl || null;
    return hostDocument(host);
}


export function isDomElement(value) {
    return Boolean(value && value.nodeType === 1);
}


export function isDomHTMLElement(value) {
    return Boolean(
        value
        && value.nodeType === 1
        && value.namespaceURI === "http://www.w3.org/1999/xhtml"
    );
}


export function isDomButton(value) {
    return isDomHTMLElement(value) && value.tagName === "BUTTON";
}


export function isDomInput(value) {
    return isDomHTMLElement(value) && value.tagName === "INPUT";
}
