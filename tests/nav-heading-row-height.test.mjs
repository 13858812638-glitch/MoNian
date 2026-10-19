import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css = fs.readFileSync('src/styles/styles.css', 'utf8');
test('mobile navigator headings use sidebar row height rather than 44px mobile Picker height', () => {
  const selector = '.local-search-navigator[data-nav-layout="mobile"] .local-search-nav-section-heading';
  const block = css.match(/\.local-search-navigator\[data-nav-layout="mobile"\] \.local-search-nav-section-heading \{([^}]+)\}/)?.[1];
  assert.ok(block, `Missing ${selector}`);
  assert.match(block, /min-height:\s*var\(--ls-nav-row-height, 30px\);/);
  assert.doesNotMatch(block, /--ls-mobile-picker-row-h/);
});
test('v5 heading/content gap still defaults to independently controlled 6px', () => {
  const settings = css.match(/\/\* @settings([\s\S]*?)\*\//)?.[1] || '';
  assert.match(settings, /- id: ls-nav-heading-content-gap\n[\s\S]*?default: 6\n/);
  assert.match(css, /margin-block-start:\s*var\(--ls-nav-heading-content-gap, 6px\);/);
  assert.match(css, /--ls-mobile-picker-row-h:\s*44px/);
});
