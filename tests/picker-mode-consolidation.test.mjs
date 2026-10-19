import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareSubjects, loadSubject} from './harness.mjs';
let live;
before(() => { prepareSubjects(); live = loadSubject('B'); });
const fake = name => ({setActive: value => trace.push(`${name}:${String(value)}`)});
let trace = [];
const paths=['folder-picker-methods.js','tag-picker-methods.js','property-picker-methods.js'];

test('facet modes: entering multiselect clears maintenance then sort, only once',()=>{
 const {deactivateConflictingFacetPickerModes: deactivate}=live.subject;
 assert.equal(typeof deactivate,'function');
 trace=[];deactivate({maintenanceMode:fake('maintenance'),sortToggle:fake('sort')});
 assert.deepEqual(trace,['maintenance:','sort:false']);
});

test('facet modes: entering maintenance clears selection then sort',()=>{
 const {deactivateConflictingFacetPickerModes: deactivate}=live.subject;
 trace=[];deactivate({selectionMode:fake('selection'),sortToggle:fake('sort')});
 assert.deepEqual(trace,['selection:false','sort:false']);
});

test('facet modes: tag/property sort preserves selection before maintenance',()=>{
 const {deactivateConflictingFacetPickerModes: deactivate}=live.subject;
 trace=[];deactivate({selectionMode:fake('selection'),maintenanceMode:fake('maintenance'),maintenanceFirst:false});
 assert.deepEqual(trace,['selection:false','maintenance:']);
});

test('facet modes: folder sort preserves maintenance before selection',()=>{
 const {deactivateConflictingFacetPickerModes: deactivate}=live.subject;
 trace=[];deactivate({selectionMode:fake('selection'),maintenanceMode:fake('maintenance'),maintenanceFirst:true});
 assert.deepEqual(trace,['maintenance:','selection:false']);
});

test('all three facet pickers use one mode coordination contract, keeping specialized sort commits',()=>{
 const folder='src/features/facets';
 for(const name of paths){
  const code=fs.readFileSync(`${folder}/${name}`,'utf8');
  assert.match(code,/deactivateConflictingFacetPickerModes/);
  assert.match(code,/attachFacetPickerSortModeToggle/);
  assert.match(code,/new PointerSortCoordinator/);
 }
});

test('property catalog source name describes ordinary properties; old path is gone',()=>{
 assert.equal(fs.existsSync('src/features/plugin/project-catalog-methods.js'),false);
 assert.equal(fs.existsSync('src/features/plugin/property-catalog-methods.js'),true);
 assert.match(fs.readFileSync('src/core/LocalSearchPlugin.js','utf8'),/property-catalog-methods\.js/);
 assert.doesNotMatch(fs.readFileSync('src/core/LocalSearchPlugin.js','utf8'),/project-catalog-methods\.js/);
});
