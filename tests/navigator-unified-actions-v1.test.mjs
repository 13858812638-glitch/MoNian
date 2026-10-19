import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mergePropertyKeyValues } from '../src/data/properties/key-merge.js';
const nav = fs.readFileSync('src/features/navigator/NavigatorCustomization.js','utf8');
const maintenance = fs.readFileSync('src/features/facets/sidebar-maintenance-methods.js','utf8');
const css = fs.readFileSync('src/styles/styles.css','utf8');
const settings = fs.readFileSync('src/ui/settings/LocalSearchSettingTab.js','utf8');
const defaults = fs.readFileSync('src/core/default-settings.js','utf8');
const tag = fs.readFileSync('src/features/plugin/tree-maintenance-methods.js','utf8');
const property = fs.readFileSync('src/features/plugin/property-maintenance-methods.js','utf8');
test('Mobile uses a configurable cancellable timer; desktop keeps contextmenu',()=>{
 assert.match(nav,/addEventListener\("contextmenu", this\._contextMenu\)/);
 assert.match(nav,/event\.pointerType !== "touch"/);
 assert.match(nav,/navigatorLongPressMs/);
 for(const keyword of ['pointermove','pointerup','pointercancel','scroll','_clearHold','_holdClickGuard'])assert.ok(nav.includes(keyword));
 assert.match(defaults,/navigatorLongPressMs: 300/);
 assert.match(settings,/setLimits\(180, 700, 20\)/);
});
test('Typed object action menu delegates to current facet maintenance owner',()=>{
 assert.match(nav,/sidebarMaintenanceModes\?\.\(descriptor\.kind\)/);
 assert.match(nav,/runSidebarMaintenance\?\.\(descriptor\.kind, mode, target/);
 for(const keyword of ['create-child-folder','result-exclude','pin','exclude','result','delete','rename','appearance-reset','separator-before','separator-after','sort-navigation']) assert.ok(nav.includes(keyword),keyword);
 assert.match(nav,/mergeExisting: true/);
});
test('Navigator action Picker restores shared fixed-height frame',()=>{
 assert.match(css,/\.local-search-nav-actions-picker > \.local-search-move-tree\s*\{/);
 assert.doesNotMatch(css,/--ls-dropdown-base-height: auto !important/);
 assert.match(css,/overflow-y: auto/);
 const dropdown=fs.readFileSync('src/ui/overlays/SearchDropdownController.js','utf8');
 assert.match(dropdown,/size === "navigator-actions"[\s\S]*fixedHeight: true/);
});
test('Text and multitext property collisions retain all unique values',()=>{
 assert.deepEqual(mergePropertyKeyValues('甲','乙'),['甲','乙']);
 assert.deepEqual(mergePropertyKeyValues(['乙','甲'],['甲','丙'],'multitext'),['乙','甲','丙']);
 assert.equal(mergePropertyKeyValues('甲','甲'),'甲');
 assert.equal(mergePropertyKeyValues('','乙'),'乙');
 assert.throws(()=>mergePropertyKeyValues(10,11,'number'),/不能自动合并/);
 assert.throws(()=>mergePropertyKeyValues({x:1},'B','text'),/非文本值/);
});
test('Rename conflicts preserve folder file names, tag hierarchy and property catalog',()=>{
 assert.match(maintenance,/operations\._availablePath\(child, into\.path\)/);
 assert.match(maintenance,/operations\.renameFile\(child, safePath\)/);
 assert.match(maintenance,/if \(from\.children\.length\) throw/);
 assert.match(maintenance,/operations\.deleteFolder\(from\)/);
 assert.match(maintenance,/migrateVaultTagTreePrefix\(path, nextPath, \{ mergeExisting/);
 assert.match(tag,/if \(!removeTree && !mergeExisting\)/);
 assert.match(property,/mergePropertyKeyValues\(properties\[target\], properties\[source\], targetType\)/);
 assert.match(property,/propertyType: targetType/);
});
