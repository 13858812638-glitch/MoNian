import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync('src/styles/styles.css','utf8');
const getDefault=(id)=>{
  const p=css.indexOf('  - id: '+id+'\n');
  assert.ok(p>=0,`missing ${id}`);
  const block=css.slice(p,css.indexOf('\n  - id:',p+1));
  const m=block.match(/^    default: (.+)$/m);
  assert.ok(m,`missing default ${id}`);
  return m[1];
};
test('frozen sidebar CSS snapshot defaults are 6px and 2px',()=>{
  assert.equal(getDefault('ls-nav-section-spacing'),'6');
  assert.equal(getDefault('ls-nav-count-tail'),'2');
  assert.match(css,/padding-block: var\(--ls-nav-section-spacing, 6px\);/);
  assert.match(css,/--ls-nav-count-tail: 2px;/);
});
