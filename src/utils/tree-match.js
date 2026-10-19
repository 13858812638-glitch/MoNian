// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



export function treeNodeMatches(node, query, getText = item => [item.path, item.name]) {
    if (!query) return true;
    if (getText(node).some(text => String(text || "").toLowerCase().includes(query))) {
        return true;
    }
    return (node.children || []).some(child =>
        treeNodeMatches(child, query, getText)
    );
}
