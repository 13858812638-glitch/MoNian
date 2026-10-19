from pathlib import Path
import re
root=Path(__file__).resolve().parent.parent
csspath=root/'src/styles/styles.css'
js=root/'src/ui/dialogs/dialog-session.js'
css=csspath.read_text(); source=css
# Update exactly nine explicit @settings defaults, preserving all unmentioned setting definitions.
changes={
 'ls-nav-content-inset-left':(12,16),
 'ls-nav-background-extend-left':(4,6),
 'ls-nav-background-extend-right':(4,0),
 'ls-nav-text-weight':(400,500),
 'ls-nav-group-weight':(600,700),
 'ls-nav-row-height':(44,30),
 'ls-nav-section-spacing':(2,0),
 'ls-nav-depth-step':(14,16),
 'ls-nav-count-tail':(48,16),
}
for key,(old,new) in changes.items():
    pat=rf'(?m)(^  - id: {re.escape(key)}\n(?:(?!^  - id:).)*?^    default: ){old}(\n)'
    css,n=re.subn(pat,lambda m:f'{m.group(1)}{new}{m.group(2)}',css,flags=re.M|re.S)
    assert n==1,(key,n)
# In the absence of Style Settings, CSS local variable defaults should match the same nine promoted values.
repls={
 '--ls-nav-content-inset-left: 12px;':'--ls-nav-content-inset-left: 16px;',
 '--ls-nav-background-extend-left: 4px;':'--ls-nav-background-extend-left: 6px;',
 '--ls-nav-background-extend-right: 4px;':'--ls-nav-background-extend-right: 0px;',
 '--ls-nav-count-tail: 48px;':'--ls-nav-count-tail: 16px;',
 'var(--ls-nav-row-spacing, 2px)':'var(--ls-nav-row-spacing, 2px)',
 'var(--ls-nav-depth-step, 14px)':'var(--ls-nav-depth-step, 16px)',
 'var(--ls-nav-text-weight, 400)':'var(--ls-nav-text-weight, 500)',
 'var(--ls-nav-group-weight, 600)':'var(--ls-nav-group-weight, 700)',
 'var(--ls-nav-section-spacing, 2px)':'var(--ls-nav-section-spacing, 0px)',
 'var(--ls-nav-row-height, var(--ls-mobile-picker-row-h))':'var(--ls-nav-row-height, 30px)',
}
for old,new in repls.items():
    if old==new:continue
    assert old in css,old
    css=css.replace(old,new)
# A shared, fixed viewport backdrop for every shared Dialog regardless of Picker ownership.
old='''.local-search-dialog-backdrop {
    position: absolute;
    inset: 0;
    border-radius: inherit;
'''
new='''.local-search-dialog-backdrop {
    position: fixed;
    inset: 0;
    border-radius: 0;
'''
assert css.count(old)==1
css=css.replace(old,new)
# Keep iOS paint-free Portal E intact; don't recreate positioning or sizes at this higher specificity.
old='''/* A shared native rename/create Dialog uses exactly the same paint-free
   portal as the Picker. Because display:contents has no containing box,
   viewport-fixed dialog/backdrop geometry replaces its former absolute host. */
body.is-ios .ui-popup-portal.local-search-content > .local-search-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 11020;
}
body.is-ios .ui-popup-portal.local-search-content > .local-search-dialog-surface {
    position: fixed;
    left: 50%;
    top: calc(var(--ls-dialog-position-y) * 1dvh);
    width: min(calc(100vw - 40px), 420px);
    max-height: calc(100dvh - 24px);
    z-index: 11021;
}
'''
new='''/* The iOS paint-free Portal E stays unchanged. These are stacking-only
   overrides; the same viewport position, safe-area cap and width Primitive
   below controls every rename/create/delete/color surface. */
body.is-ios .ui-popup-portal.local-search-content > .local-search-dialog-backdrop {
    z-index: 11020;
}
body.is-ios .ui-popup-portal.local-search-content > .local-search-dialog-surface {
    z-index: 11021;
}
'''
assert css.count(old)==1
css=css.replace(old,new)
old='''.local-search-confirm-dialog {
    position: absolute;
    left: 50%;
    top: calc(var(--ls-dialog-position-y) * 1%);
    z-index: 41;
    width: min(calc(100% - 40px), 420px);
'''
new='''/* Single viewport coordinate owner: 44 means the dialog CENTER is at
   44dvh (not 44% of a scrolling Picker). Limit both halves of long dialogs
   to the safe-area boundary while preserving that center and internal scroll.
   No resize listener, keyboard tracking or extra focus changes are needed. */
.local-search-confirm-dialog {
    --ls-dialog-safe-top: var(--ui-mobile-safe-top, 0px);
    --ls-dialog-safe-bottom: var(--ui-mobile-safe-bottom, 0px);
    position: fixed;
    left: 50%;
    top: calc(var(--ls-dialog-position-y) * 1dvh);
    z-index: 41;
    width: min(calc(100vw - 40px), 420px);
'''
assert css.count(old)==1
css=css.replace(old,new)
old='''    max-height: calc(100% - 24px);
    overflow: hidden;
}

/* Dialog Content Scroller'''
new='''    max-height: max(0px, min(
        calc(100dvh - var(--ls-dialog-safe-top) - var(--ls-dialog-safe-bottom) - 24px),
        calc(2 * (var(--ls-dialog-position-y) * 1dvh - var(--ls-dialog-safe-top) - 12px)),
        calc(2 * (100dvh - var(--ls-dialog-safe-bottom) - 12px - var(--ls-dialog-position-y) * 1dvh))
    ));
    overflow: hidden;
}

/* Dialog Content Scroller'''
assert css.count(old)==1
css=css.replace(old,new)
old='''.local-search-confirm-dialog.local-search-folder-color-editor-picker {
    width: min(calc(100% - 40px), var(--ls-compact-create-width));
'''
new='''.local-search-confirm-dialog.local-search-folder-color-editor-picker {
    width: min(calc(100vw - 40px), var(--ls-compact-create-width));
'''
assert css.count(old)==1
css=css.replace(old,new)
old='''/* 所有紧凑 Dialog 共用全局位置参数；不再按文件／文件夹／属性分成
   居中和贴顶两条路径。大型 Picker 不使用 local-search-confirm-dialog。 */
body.is-mobile .local-search-confirm-dialog.local-search-dialog-surface {
    position: fixed;
    top: calc(var(--ls-dialog-position-y) * 1svh);
    left: 50%;
    width: min(calc(100vw - 2 * var(--ui-mobile-modal-inset-x)), 420px);
    max-height: calc(100svh - var(--ui-mobile-safe-top) - var(--ui-mobile-safe-bottom) - 24px);
    transform: translate(-50%, -50%);
    border-radius: var(--ui-mobile-modal-radius) !important;
}
'''
new='''/* Mobile keeps its original radius token only. Viewport position, width,
   max-height and backdrop are owned by .local-search-confirm-dialog above. */
body.is-mobile .local-search-confirm-dialog.local-search-dialog-surface {
    border-radius: var(--ui-mobile-modal-radius) !important;
}
'''
assert css.count(old)==1
css=css.replace(old,new)
# Keep the 9 setting defaults unchanged elsewhere and don't touch markup/other labels.
csspath.write_text(css)
text=js.read_text()
old='''    // iOS: the already validated Picker caret requires the portal to have no
    // painted viewport box. A dialog nested in a scrolling/isolation Picker
    // has its own ancestor painting context, which can hide the native caret.
    // Place *all* shared dialogs directly in the existing portal on iOS;
    // focus return and transaction ownership still belong to focusOwner.
    const iosPortal = doc.body.classList.contains("is-ios");
    const host = iosPortal ? core.popupSurfaceHost() : focusOwner;
'''
new='''    // All shared dialogs/backdrops use the existing viewport Portal, never
    // a scrolling Picker container. This gives one fixed coordinate space on
    // desktop, Android and iOS, while ownerPanel still owns focus/cleanup.
    // On iOS the validated paint-free Portal E remains the caret surface.
    const host = core.popupSurfaceHost();
'''
assert text.count(old)==1
js.write_text(text.replace(old,new))
print('Promoted defaults:',changes)
print('Applied shared Dialog fixed-viewport/safe-area contract.')
