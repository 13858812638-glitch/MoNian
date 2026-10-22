import { setIcon } from "obsidian";

// Navigator reuses live buttons. Host setIcon implementations may append, so
// replace the owned SVG explicitly without deleting hover-hint label children.
export function setNavigatorIcon(element, name) {
    if (!element) return;
    const previous = [...element.children].filter(child => child.localName === "svg");
    if (element.dataset.navIcon === name && previous.length === 1) return;
    const labels = [...element.childNodes].filter(child => !previous.includes(child));
    for (const icon of previous) icon.remove();
    setIcon(element, name);
    // Also tolerate hosts that clear children rather than append an SVG.
    for (const label of labels) if (label.parentNode !== element) element.append(label);
    element.dataset.navIcon = name;
}
