import test, {before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareSubjects, loadSubject} from './harness.mjs';
const frozen=JSON.parse(fs.readFileSync('reports/formal-v52-api-snapshot.json','utf8'));
let live;
before(()=>{prepareSubjects();live=loadSubject('B');});
function inspect(C){
 return Object.getOwnPropertyNames(C.prototype).map(key=>{
  const d=Object.getOwnPropertyDescriptor(C.prototype,key),v=d.value;
  return {key,enumerable:d.enumerable,configurable:d.configurable,writable:d.writable??null,
   type:typeof v,name:v?.name??null,length:typeof v==='function'?v.length:null};
 });
}
function same(x){return JSON.parse(JSON.stringify(x));}
test('v5.2 formal baseline method order, descriptor, name and arity remain unchanged',()=>{
 const s=live.subject;
 for(const [name,items] of Object.entries(frozen.classes))assert.deepEqual(inspect(s[name]),items,name);
});
test('v5.2 shared UI refs, Collator, tag semantics and modal helper exports unchanged',()=>{
 const s=live.subject;
 for(const [name,expected] of Object.entries(frozen.symbols)){
  const v=s[name];assert.ok(v, name);assert.equal(typeof v,expected.type,name);
  if(expected.fnLength!==null)assert.equal(v.length,expected.fnLength,name);
 }
 assert.deepEqual(same(s.SEARCH_CORE_UI_REF_KEYS),frozen.values.uiRefKeys);
 assert.deepEqual(['文件2.md','文件10.md','A','a','阿'].sort(s.RESULT_TEXT_COLLATOR.compare),frozen.values.collatorSpec);
 assert.deepEqual([undefined,null,'##案例  ','###项目/分组','',55].map(x=>s.normalizeEditableTagValue(x)),frozen.values.normalizeTagCases);
});
test('all six retired module paths absent; controller ownership remains single',()=>{
 for(const file of ['src/core/ui-reference-keys.js','src/ui/hosts/modal-chrome.js','src/utils/text-collator.js',
  'src/core/search/open-selection-methods.js','src/features/plugin/recent-history-storage-methods.js','src/features/facets/picker-model-methods.js']){
  assert.equal(fs.existsSync(file),false,file);
 }
 const s=live.subject;
 for(const [name,keys] of [
  ['SearchCore',['openSelectedNote','_resolveResultElement','clearSelected']],
  ['LocalSearchPlugin',['markOpenedFromExternal','getRecentOpenedHistory','_touchRecentOpened','saveRecentOpenedHistory']],
  ['SearchFacetController',['_syncHeaderCount','_expandTreeAncestors','_buildPropertyTreeModel']]
 ])for(const key of keys)assert.equal(typeof s[name].prototype[key],'function',`${name}.${key}`);
});
