import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transferTextPropertyValue } from '../src/data/properties/cross-key-transfer.js';
const read = path => fs.readFileSync(`src/${path}`,'utf8');

test('cross key: list A one value -> empty text B; retain other A entries',()=>{
    assert.deepEqual(transferTextPropertyValue({ A:['甲','乙'],B:undefined },'A','甲','B','multitext','text'),
        {changed:true,nextSource:['乙'],nextTarget:'甲'});
});
test('cross key: text A -> existing list B is append-only, no loss or dup',()=>{
    assert.deepEqual(transferTextPropertyValue({A:'甲',B:['乙','乙']},'A','甲','B','text','multitext'),
        {changed:true,nextSource:undefined,nextTarget:['乙','乙','甲']});
    assert.deepEqual(transferTextPropertyValue({A:'甲',B:['甲','乙']},'A','甲','B','text','multitext'),
        {changed:true,nextSource:undefined,nextTarget:['甲','乙']});
});
test('cross key: existing different text B is a hard preflight conflict',()=>{
    assert.throws(()=>transferTextPropertyValue({A:['甲','乙'],B:'丙'},'A','甲','B','multitext','text'),/拒绝覆盖/);
});
test('cross key: nontext, date, malformed YAML and system values are blocked',()=>{
    for(const kind of ['number','date','datetime','checkbox'])
        assert.throws(()=>transferTextPropertyValue({A:'1'},'A','1','B','text',kind),/只有文本与列表/);
    assert.throws(()=>transferTextPropertyValue({A:['甲',42]},'A','甲','B','multitext','text'),/非文本/);
    assert.throws(()=>transferTextPropertyValue({A:'甲',B:{foo:'乙'}},'A','甲','B','text','multitext'),/复杂结构/);
    assert.throws(()=>transferTextPropertyValue({A:''},'A','', 'B','text','text'),/非空/);
});
test('cross key: unmatched A is unchanged and target B not touched',()=>{
    assert.deepEqual(transferTextPropertyValue({A:['乙'],B:'丙'},'A','甲','B','multitext','text'),{changed:false});
});
test('Navigator: same coordinator, local type scope and no independent all-category entry',()=>{
    const nav=read('features/navigator/NavigatorCustomization.js');
    const controller=read('features/navigator/SearchNavigatorController.js');
    assert.match(nav,/hierarchical: true/);
    assert.match(nav,/this\.sortScope/);
    assert.match(nav,/this\._canNest\(source, target\)/);
    assert.match(nav,/mode === "nest" \|\| mode === "promote"/);
    assert.match(nav,/moveVaultPropertyValueToKey/);
    assert.match(nav,/moveFolderTreeNode/);
    assert.match(nav,/migrateVaultTagTreePrefix/);
    assert.doesNotMatch(controller,/id: "sort", title: "拖拽排序"/);
    assert.match(controller,/sort-finish/);
});
test('Navigator: root folder, peer/child tag and key-value creation entry all exposed',()=>{
    const nav=read('features/navigator/NavigatorCustomization.js');
    for(const x of ['create-root-folder','create-child-folder','create-sibling-tag','create-child-tag','create-property-value'])assert.ok(nav.includes(x));
    assert.match(nav,/initialTagParentPath: parentPath/);
    assert.match(nav,/addPropertyCatalogValues/);
    assert.match(read('features/batch/tag-editor-methods.js'),/session\.initialTagParentPath/);
});
test('Navigator: fixed Picker frame and explicit rename scroll snapshot',()=>{
    const nav=read('features/navigator/NavigatorCustomization.js');
    const ctrl=read('features/navigator/SearchNavigatorController.js');
    const css=read('styles/styles.css');
    const dropdown=read('ui/overlays/SearchDropdownController.js');
    assert.doesNotMatch(css,/--ls-dropdown-base-height: auto !important/);
    assert.match(dropdown,/size === "navigator-actions"[\s\S]*fixedHeight: true/);
    assert.match(ctrl,/_maintenanceScrollSnapshot/);
    assert.match(nav,/navScrollBeforeDismiss = core\.navigator\?\.scroll\?\.scrollTop/);
    assert.match(nav,/scrollTop: scrollBeforeDismiss \?\? core\.navigator\.scroll\.scrollTop/);
});

test('Desktop retains Picker until explicit property-value drag; value rows appear temporarily',()=>{
  const ctrl=read('features/navigator/SearchNavigatorController.js');
  const nav=read('features/navigator/NavigatorCustomization.js');
  assert.match(ctrl,/this\.customization\.sortScope === "property-value"/);
  assert.match(nav,/sort-property-values/);
  assert.match(nav,/previousDesktopValueDrag !== nowDesktopValueDrag/);
});
