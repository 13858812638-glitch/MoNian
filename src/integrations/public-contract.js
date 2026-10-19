// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



// V11 adds an optional host file navigator; file data and search state remain owned by GLS.
export const EXTERNAL_SEARCH_API_VERSION = 19;

export const EXTERNAL_SEARCH_API_CAPABILITIES = Object.freeze([
    "isolated-session",
    "filters",
    "allowed-paths",
    "single-pick",
    "multi-select",
    "browse-then-batch",
    "batch-title-open",
    "inline-host",
    "recent-opened-readonly",
    "virtual-properties-readonly",
    "folder-picker",
    "folder-exclusion-picker",
    "property-editor",
    "shared-mobile-frame",
    "file-move",
    "embedded-create-context",
    "native-batch-selection",
    "property-catalog-readonly",
    "embedded-session-state",
    "host-file-navigation",
    "workbench-presentation", "workbench-toolbar", "indexed-files", "index-change-subscription", "property-value-maintenance"
]);
