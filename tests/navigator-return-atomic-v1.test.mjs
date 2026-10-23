import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/features/navigator/SearchNavigatorController.js', 'utf8');
const css = fs.readFileSync('src/styles/styles.css', 'utf8');
function settingDefault(id) {
  const pos = css.indexOf(`  - id: ${id}\n`);
  assert.ok(pos >= 0, `Style Settings ID ${id} exists`);
  const next = css.indexOf('  - id: ', pos + 7);
  const block = css.slice(pos, next < 0 ? undefined : next);
  const match = block.match(/^    default: ([0-9.]+)\s*$/m);
  assert.ok(match, `${id} has a numeric default`);
  return Number(match[1]);
}
test('return projection is limited to real mobile Results -> Filters navigation', () => {
  assert.match(source, /const returningToFilters = this\.layout === "mobile" && this\.page === "results"\s*&& page === "filters" && !this\._restoringPage/);
  assert.match(source, /this\.syncPage\(\{ commitResults \}\);\s*if \(page === "filters"\) \{\s*this\.sync\(\);/);
});
test('consume the existing scheduled projection before first visible frame', () => {
  assert.match(source, /if \(returningToFilters && this\._projectionTask != null/);
  assert.match(source, /this\._projectionTask = null;\s*this\._renderProjection\(\);/);
  // Original hidden page short-circuit is kept to avoid continuous hidden DOM refreshes.
  assert.match(source, /if \(this\.layout === "mobile" && this\.page !== "filters"\) return;/);
});
test('CSS Snapshot promotes the two requested IDs and their root variables to 6px', () => {
  assert.equal(settingDefault('ls-result-card-pad-x'), 6);
  assert.equal(settingDefault('ls-item-pad-y'), 6);
  assert.match(css, /^    --ls-result-card-pad-x: 6px;/m);
  assert.match(css, /^    --ls-item-pad-y: 6px;/m);
});
test('unrequested detailed and compact densities retain their defaults', () => {
  assert.equal(settingDefault('ls-item-pad-y-detailed'), 13);
  assert.equal(settingDefault('ls-item-pad-y-compact'), 9);
  assert.match(css, /^    --ls-item-pad-y-detailed: 13px;/m);
  assert.match(css, /^    --ls-item-pad-y-compact: 9px;/m);
});
