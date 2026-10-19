// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



// Modal 内容由插件自己拥有：沿 contentEl → modalEl 的祖先链删除 Obsidian
// 自动插入的 Header / 其它同级 Chrome，避免宿主外壳继续参与窗口几何。
export function stripObsidianModalChrome(modalEl, contentEl) {
    if (!modalEl || !contentEl) return;

    let branch = contentEl;
    while (branch && branch !== modalEl) {
        const parent = branch.parentElement;
        if (!parent) break;

        for (const sibling of [...parent.children]) {
            if (sibling !== branch) sibling.remove();
        }
        branch = parent;
    }
}
