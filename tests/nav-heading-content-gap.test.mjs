import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css = fs.readFileSync('src/styles/styles.css','utf8');
const setting = css.match(/  - id: ls-nav-heading-content-gap\n([\s\S]*?)(?=\n  - id:|\n\*\/)/)?.[1] || '';
test('mobile sidebar heading/content gap is a standalone Style Settings token defaulted to 6px',()=>{
  assert.ok(setting, 'ls-nav-heading-content-gap must exist in Style Settings');
  assert.match(setting,/    title: 标题与内容间距\n/);
  assert.match(setting,/    type: variable-number-slider\n/);
  assert.match(setting,/    default: 6\n/);
  assert.match(setting,/    min: 0\n/);
  assert.match(setting,/    format: px(?:\n|$)/);
  assert.match(css,/--ls-nav-heading-content-gap:\s*6px;/);
});
test('gap belongs only to the expanded mobile section content, never list rows or Picker',()=>{
  assert.match(css,/\.local-search-navigator\[data-nav-layout="mobile"\] \.local-search-nav-section-heading \+ \.local-search-nav-section-content:not\(\[hidden\]\)\s*\{\s*margin-block-start:\s*var\(--ls-nav-heading-content-gap, 6px\);/);
  assert.ok(!css.includes('margin-block-start: var(--ls-nav-heading-content-gap') || (css.match(/margin-block-start:\s*var\(--ls-nav-heading-content-gap/g)||[]).length === 1);
});
