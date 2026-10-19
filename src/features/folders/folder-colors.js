// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { normalizeVaultFolderPath } from "../../utils/vault-paths.js";


export function normalizeHexColor(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const shortMatch = raw.match(/^#([0-9a-f]{3})$/i);
    if (shortMatch) {
        return "#" + [...shortMatch[1]]
            .map(char => char + char)
            .join("")
            .toUpperCase();
    }

    const longMatch = raw.match(/^#([0-9a-f]{6})$/i);
    return longMatch
        ? `#${longMatch[1].toUpperCase()}`
        : "";
}


export function normalizeResultFolderColors(value) {
    const source =
        value && typeof value === "object" && !Array.isArray(value)
            ? value
            : {};
    const normalized = {};

    for (const [rawPath, rawConfig] of Object.entries(source)) {
        const originalPath = String(rawPath || "").trim();
        const path = originalPath === "/"
            ? "/"
            : normalizeVaultFolderPath(originalPath);

        if (!path && originalPath !== "/") continue;

        const config =
            rawConfig && typeof rawConfig === "object"
                ? rawConfig
                : {};
        const light = normalizeHexColor(config.light);
        const dark = normalizeHexColor(config.dark);

        if (!light && !dark) continue;
        normalized[path || "/"] = { light, dark };
    }

    return normalized;
}


export function resultFolderColorConfig(settings, folderPath) {
    const path = folderPath === "/"
        ? "/"
        : normalizeVaultFolderPath(folderPath);
    const colors = normalizeResultFolderColors(
        settings?.resultFolderColors
    );
    return colors[path || "/"] || null;
}
