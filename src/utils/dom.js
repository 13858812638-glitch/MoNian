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

// Retain child-owned icons/accessibility labels while updating visible text.
export function setDomText(node, value) {
    if (!node) return;
    const text = String(value ?? "");
    const child = [...node.childNodes].find(node => node.nodeType === 3);
    if (child) { if (child.nodeValue !== text) child.nodeValue = text; }
    else if (text) node.prepend(node.ownerDocument.createTextNode(text));
}

export function setDomProperty(node, name, value) {
    if (!node) return;
    if (name === "textContent") setDomText(node, value);
    else if (node[name] !== value) node[name] = value;
}

// CSS owns visual defaults. A missing/invalid metric contributes no extent;
// callers still clamp measured geometry to the actual owning viewport.
export function readCssNumber(element, name, style = null) {
    const raw = (style || element?.ownerDocument?.defaultView?.getComputedStyle(element))?.getPropertyValue(name);
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : 0;
}

// One ordered commit primitive. Remove obsolete children first so retained
// siblings do not move around disappearing rows, preserving focus and layout.
export function reconcileDomChildren(parent, nodes) {
    const keep = new Set(nodes);
    for (const node of [...parent.childNodes]) if (!keep.has(node)) node.remove();
    let cursor = parent.firstChild;
    for (const node of nodes) {
        if (node !== cursor) parent.insertBefore(node, cursor);
        cursor = node.nextSibling;
    }
}
