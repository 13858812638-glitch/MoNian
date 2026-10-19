import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync('src/features/navigator/SearchNavigatorController.js','utf8');
const css = fs.readFileSync('src/styles/styles.css','utf8');
test('Navigator touch feedback uses one existing delegated owner for native primary hit + count',()=>{
 assert.match(source,/const rowTouchTarget = target =>/);
 assert.match(source,/const passive = passiveRowTarget\(target\);/);
 assert.match(source,/button\.local-search-move-tree-folder\[data-ls-interaction='tree-hit'\]/);
 assert.match(source,/if \(hit\.delegated\) hit\.row\.classList\.add\("is-nav-trailing-touch-pressed"\)/);
 assert.equal(source.split('this._listen(this.scroll, "pointerdown"').length-1,1);
 assert.equal(source.split('this._listen(this.scroll, "pointermove"').length-1,1);
});
test('Cancelled drag is excluded from transient pressed only, maintaining Selected and custom backgrounds',()=>{
 assert.match(css,/\.is-selected, \.is-partial, \.is-unavailable, \.is-nav-touch-dragged, \.is-sort-mode/);
 assert.match(source,/trailingTouch\?\.row\?\.classList\.remove\("is-nav-trailing-touch-pressed", "is-nav-touch-dragged"\)/);
 assert.match(source,/this\._listen\(this\.scroll, "scroll", \(\) => \{ markTouchDrag\(\); scheduleNavigatorScrollStateSave\(this\); \}/);
});
test('Swipe shelf edges use the exact card content inset in both directions and constrain available width',()=>{
 assert.match(css,/\.local-search-swipe-actions\.is-edge-left \{\s*left: var\(--ls-result-card-pad-x\)/);
 assert.match(css,/\.local-search-swipe-actions\.is-edge-right \{\s*right: var\(--ls-result-card-pad-x\)/);
 assert.match(css,/width: min\(max\(0px, calc\(100% - var\(--ls-result-card-pad-x\) - var\(--ls-result-card-pad-x\)\)\)/);
 assert.match(css,/\.local-search-content \.local-search-swipe-shell\.has-swipe-actions > \.local-search-item[\s\S]*?var\(--ls-result-card-pad-x\)/);
});
