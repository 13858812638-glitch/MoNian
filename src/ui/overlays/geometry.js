// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { hostWindow } from "../../utils/dom.js";
import { Platform } from "obsidian";

// END SHARED DIALOG SUBMISSION
export function resolveOverlayBounds(ownerEl, view, insetX = 0, insetY = insetX, useVisualViewport = true) {
    // 移动端 Popup 外框必须锁在一级主窗 / layout viewport 上。软键盘只改变可见区，
    // 不得把二级/三级 Surface 当成新的几何源反复重排。桌面仍可使用 visualViewport。
    const viewport = useVisualViewport ? view.visualViewport : null;
    const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
    const width = Math.max(1, viewport?.width || view.innerWidth || 1);
    const height = Math.max(1, viewport?.height || view.innerHeight || 1);
    const owner = ownerEl?.isConnected ? ownerEl.getBoundingClientRect() : null;
    const edgeX = Math.min(Math.max(0, insetX), Math.max(0, (width - 1) / 2));
    const edgeY = Math.min(Math.max(0, insetY), Math.max(0, (height - 1) / 2));
    let x1 = Math.max(left + edgeX, owner ? owner.left + edgeX : left + edgeX);
    let x2 = Math.min(left + width - edgeX, owner ? owner.right - edgeX : left + width - edgeX);
    let y1 = Math.max(top + edgeY, owner ? owner.top + edgeY : top + edgeY);
    let y2 = Math.min(top + height - edgeY, owner ? owner.bottom - edgeY : top + height - edgeY);
    if (x2 <= x1) { x1 = left + edgeX; x2 = left + width - edgeX; }
    if (y2 <= y1) { y1 = top + edgeY; y2 = top + height - edgeY; }
    return { left: x1, right: x2, top: y1, bottom: y2, width: x2 - x1, height: y2 - y1,
        owner: owner || { left, top, right: left + width, bottom: top + height, width, height } };
}


export function resolveDropdownViewportBounds(containerEl, inset) {
    const frameHost = containerEl?.classList?.contains("local-search-embedded-host")
        ? containerEl.closest(".view-content") || containerEl
        : containerEl?.closest(".local-search-modal, .local-search-workspace-host");
    return resolveOverlayBounds(frameHost, hostWindow(containerEl), inset, inset, !Platform.isMobile);
}
