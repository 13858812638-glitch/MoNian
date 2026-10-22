// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



// Shared UI primitive, bundled identically for independent plugin loading.
// One observer per document; leases own only the real UI roots they register.
// BEGIN SHARED HOVER HINTS — generated from shared/hover-hints.js
// One document observer shared by independent plugin leases.
// Preserve accessible names while removing hover hints from owned desktop UI.
export function supportsPluginFineHover(root = null) {
    const win = root?.ownerDocument?.defaultView || globalThis.window;
    const query = win?.matchMedia?.("(hover: hover) and (pointer: fine)");
    return query ? query.matches : !(globalThis.navigator?.maxTouchPoints > 0);
}

// Attribute updates use the same owner that preserves accessible names. No
// controller keeps a second label-intent cache or recreates suppressed hints.
export function setSearchAttribute(node, name, value) {
    if (!node) return;
    const text = String(value);
    const owner = globalThis[Symbol.for("gls-dida-pwb.hover-hints.v1")];
    if (owner?.writeAttribute?.(node, name, text)) return;
    if (node.getAttribute(name) !== text) node.setAttribute(name, text);
}

export function installPluginHoverHintSuppression() {
    const key = Symbol.for("gls-dida-pwb.hover-hints.v1");
    let owner = globalThis[key];
    if (!owner) {
        const documents = new Map(), labels = new WeakMap();
        let sequence = 0;
        const element = node => node?.nodeType === 1;
        const suppress = (node, incoming = node.getAttribute("aria-label")) => {
            if (!element(node)) return;
            for (const name of ["title", "data-tooltip-position", "data-tooltip-delay"])
                if (node.hasAttribute(name)) node.removeAttribute(name);
            let saved = labels.get(node);
            const labelledBy = node.getAttribute("aria-labelledby");
            if (labelledBy && labelledBy !== saved?.id) {
                if (incoming !== null) node.removeAttribute("aria-label");
                return;
            }
            if (incoming !== null) {
                if (!saved) { saved = { id: `plugin-ui-label-${++sequence}`, text: incoming }; labels.set(node, saved); }
                else saved.text = incoming;
            }
            if (!saved) return;
            const host = /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName) ? node.parentElement : node;
            if (!host) return;
            let label = saved.node;
            if (!label || !host.contains(label)) {
                label = node.ownerDocument.createElement("span");
                label.id = saved.id;
                label.hidden = true;
                saved.node = label;
                host.appendChild(label);
            }
            if (label.textContent !== saved.text) label.textContent = saved.text;
            if (labelledBy !== saved.id) node.setAttribute("aria-labelledby", saved.id);
            if (node.hasAttribute("aria-label")) node.removeAttribute("aria-label");
        };
        const scan = root => {
            if (!element(root)) return;
            suppress(root);
            root.querySelectorAll("[title], [aria-label], [data-tooltip-position], [data-tooltip-delay]").forEach(node => suppress(node));
        };
        const options = { subtree: true, childList: true, attributes: true,
            attributeFilter: ["title", "aria-label", "aria-labelledby", "data-tooltip-position", "data-tooltip-delay"] };
        owner = {
            writeAttribute(node, name, value) {
                if (!["aria-label", "title", "data-tooltip-position", "data-tooltip-delay"].includes(name)) return false;
                if (!documents.get(node.ownerDocument)?.owns(node)) return false;
                suppress(node, name === "aria-label" ? value : undefined);
                return true;
            },
            observe(root) {
                if (!element(root)) return false;
                const doc = root.ownerDocument, win = doc.defaultView;
                if (!win?.MutationObserver || !supportsPluginFineHover(root)) return false;
                let record = documents.get(doc);
                if (!record) {
                    const roots = new Map();
                    const owns = node => {
                        for (const root of roots.keys())
                            if (root === node || root.contains(node)) return true;
                        return false;
                    };
                    const process = records => {
                        for (const change of records) {
                            // Removed/virtualized rows are no longer owned UI.
                            if (!owns(change.target)) continue;
                            suppress(change.target);
                            if (change.type === "childList") for (const node of change.addedNodes)
                                if (change.target.contains(node)) scan(node);
                        }
                    };
                    const observer = new win.MutationObserver(process);
                    record = { roots, observer, process, owns };
                    documents.set(doc, record);
                }
                const count = record.roots.get(root) || 0;
                record.roots.set(root, count + 1);
                if (!count) { scan(root); record.observer.observe(root, options); }
                return true;
            },
            forget(root) {
                const doc = root?.ownerDocument, record = documents.get(doc);
                const count = record?.roots.get(root) || 0;
                if (!count) return;
                if (count > 1) { record.roots.set(root, count - 1); return; }
                record.roots.delete(root);
                // Drain pending changes for surviving roots before reconnecting.
                // Closing one surface must not rescan all other open surfaces.
                record.process(record.observer.takeRecords());
                record.observer.disconnect();
                if (!record.roots.size) documents.delete(doc);
                else for (const active of record.roots.keys()) record.observer.observe(active, options);
            },
        };
        globalThis[key] = owner;
    }
    const roots = new Set();
    return {
        observeRoot(root) { if (!roots.has(root) && owner.observe(root)) roots.add(root); },
        forgetRoot(root) { if (roots.delete(root)) owner.forget(root); },
        disconnect() { for (const root of roots) owner.forget(root); roots.clear(); },
    };
}
