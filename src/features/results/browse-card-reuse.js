// Browse cards are derived UI, never a second result/index owner.
// Keep a bounded working set; queries, pickers and batch/action states use the
// normal builder. Live nodes move only after every new card has built successfully.
const MAX_RETAINED_CARDS = 96;

function cardContentKey(result) {
    try {
        return JSON.stringify([result.path, result.name, result.extension, result.type,
            result.ctime, result.contentModifiedAt, result.fileModifiedAt,
            result.textCount, result.canvasNodeCount, result.excalidrawElementCount,
            result.snippet, result.snippetMatchRanges, result.titleMatchRanges,
            result.tags, result.inlineTags, result.properties]);
    } catch { return null; }
}

function reusable(entry, result, key) {
    return key !== null && entry?.result === result && entry.key === key
        && entry.item._lsSelecting === false
        && !entry.shell.matches('.is-swiping, .is-swipe-open, .is-swipe-closing')
        && !entry.shell.querySelector('.local-search-swipe-actions, .is-value-expanded');
}

export function beginBrowseCardReuse(renderer) {
    const core = renderer.owner;
    if (core.queryState.raw.trim()
        || core.externalPickHandler || core.selection.batchMode || core.swipe?.allExpanded
        || core.dropdown?.panel?.isConnected || core._confirmSession || core.createFlow?.isCreateView?.()) {
        renderer._browseCardCache?.entries.clear();
        renderer._browseCardCache = null;
        return null;
    }
    const settings = core.plugin.settings;
    const signature = JSON.stringify([core.resultControls.activeViewConfig(),
        settings.hiddenResultPropertyKeys, settings.pickerPropertyOrder,
        settings.pickerPropertyValueOrder, settings.pickerTagOrder,
        settings.resultFolderColors, new Date().getFullYear()]);
    let cache = renderer._browseCardCache;
    if (!cache || cache.signature !== signature) {
        cache?.entries.clear();
        cache = renderer._browseCardCache = { signature, entries: new Map() };
    }
    const staged = [];
    return {
        appendItem(index, fragment, position) {
            const result = core.fullResults[index];
            const key = cardContentKey(result);
            const entry = cache.entries.get(result.path);
            if (reusable(entry, result, key)) {
                staged.push({ entry, position, reused: true, connected: entry.shell.isConnected,
                    oldPosition: entry.shell.getAttribute('data-virtual-position'),
                    oldLast: entry.shell.classList.contains('is-last-result'),
                    oldCurrent: entry.item.classList.contains('is-current') });
                core.resultEls.push(entry.item);
            } else {
                const item = renderer._buildResultItem(index, fragment, position);
                staged.push({ entry: { result, key, item, shell: item._lsSwipeShell }, position });
            }
        },
        commit() {
            for (const record of staged) {
                if (!record.reused) continue;
                const { shell, item } = record.entry;
                if (shell.dataset.virtualPosition !== String(record.position)) shell.dataset.virtualPosition = String(record.position);
                shell.classList.toggle('is-last-result', record.position === renderer.visibleResultCount() - 1);
                item.classList.remove('is-current');
            }
        },
        finish() {
            for (const { entry } of staged) {
                if (entry.key === null) continue;
                cache.entries.delete(entry.result.path);
                cache.entries.set(entry.result.path, entry);
            }
            while (cache.entries.size > MAX_RETAINED_CARDS)
                cache.entries.delete(cache.entries.keys().next().value);
        },
        rollback() {
            for (const record of staged) {
                if (!record.reused) continue;
                const { shell, item } = record.entry;
                if (record.oldPosition === null) shell.removeAttribute('data-virtual-position');
                else shell.setAttribute('data-virtual-position', record.oldPosition);
                shell.classList.toggle('is-last-result', record.oldLast);
                item.classList.toggle('is-current', record.oldCurrent);
                if (!record.connected) shell.remove();
            }
        }
    };
}
