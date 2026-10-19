// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



export function normalizeVaultFolderPath(value) {
    const raw = String(value || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/\/{2,}/g, "/")
        .replace(/^\/+|\/+$/g, "");

    if (!raw || raw === ".") return "";

    const parts = raw
        .split("/")
        .map(part => part.trim())
        .filter(Boolean);

    if (parts.some(part => part === "." || part === "..")) return "";
    return parts.join("/");
}


export function isSameOrDescendantVaultPath(path, parentPath) {
    const pathValue = String(path || "");
    const parent = normalizeVaultFolderPath(parentPath);
    if (!pathValue || !parent) return false;
    return pathValue === parent || pathValue.startsWith(parent + "/");
}
