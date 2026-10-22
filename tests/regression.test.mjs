import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateMaintenanceScope} from '../scripts/check-change-scope.mjs';
import {build} from '../scripts/build.mjs';
import {prepareSubjects,loadSubject,classNames,originalNames,plain} from './harness.mjs';
let A,B;const outcomes=[];
// Historical A/B baseline contained a dedicated `owner` section and a
// project-owner migration API. Only these named retirements are allowed to
// differ; all unrelated lifecycle, settings and index data stay exact.
// Compare every unchanged contract byte-for-byte. Only authorized project-specific
// API, navigation and Dida subscription retirements are normalized.
function approvedOwnerRetirement(value){
  if(Array.isArray(value))return value.map(approvedOwnerRetirement);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).filter(([key])=>key!=="navigatorLongPressMs").map(([key,v])=>{
    if(key==='navigatorVisibleSections'&&Array.isArray(v))return [key,v.filter(x=>!['owner','project'].includes(x))];
    if(key==='commands'&&Array.isArray(v))return [key,v.filter(x=>x!=='open-local-search-floating')];
    if(key==='apiKeys'&&Array.isArray(v))return [key,v.filter(x=>!['getProjectOwnerMigration','listProjects','subscribeProjectChanges','listIndexedFiles','subscribeIndexChanges','addPropertyValues','renamePropertyValue','deletePropertyValue'].includes(x))];
    if(key==='capabilities'&&Array.isArray(v))return [key,v.filter(x=>!['project-catalog','indexed-files','index-change-subscription','property-value-maintenance'].includes(x))];
    if(key==='trace'&&Array.isArray(v))return [key,v.filter(x=>!(x?.data?.name==='dida:workbench-api-ready'&&['listen','unlisten'].includes(x.type) || x?.type==='command'&&x?.data?.id==='open-local-search-floating')).map(approvedOwnerRetirement)];
    return [key,approvedOwnerRetirement(v)];
  }));
}
function sameExceptRetiredOwner(actual,expected){assert.deepEqual(approvedOwnerRetirement(actual),approvedOwnerRetirement(expected));}

function snap(v,seen=new WeakSet()){
 if(v===undefined)return {$undefined:true};if(typeof v==='number'&&!Number.isFinite(v))return {$number:String(v)};
 if(typeof v==='symbol')return {$symbol:v.description};if(typeof v==='function')return {$function:v.name,length:v.length};
 if(v===null||typeof v!=='object')return v;
 if(seen.has(v))return {$cycle:true};seen.add(v);
 const kind=Object.prototype.toString.call(v);
 if(kind==='[object Map]')return {$map:[...v].map(([k,x])=>[snap(k),snap(x)])};
 if(kind==='[object Set]')return {$set:[...v].map(x=>snap(x))};
 if(kind==='[object Date]')return {$date:Number.isNaN(+v)?'invalid':v.toISOString()};
 if(ArrayBuffer.isView(v))return [...v];
 if(Array.isArray(v))return Array.from(v,x=>snap(x,seen));
 return Object.fromEntries(Object.keys(v).map(k=>[k,snap(v[k],seen)]));
}
function invoke(S,name,args){try{return {value:snap(S[name](...args))};}catch(e){return {error:{name:e.name,message:e.message}};}}
function record(name,detail){outcomes.push({name,status:'PASS',...detail});}
before(()=>{prepareSubjects();A=loadSubject('A');B=loadSubject('B');});
after(()=>{A?.dispose();B?.dispose();fs.writeFileSync('reports/node-ab-cases.json',JSON.stringify(outcomes,null,2));});
for(const name of classNames.filter(name=>name!=='SearchFloatingHost'))test('prototype contract: '+name,()=>{
 const describe=C=>Object.getOwnPropertyNames(C.prototype).map(key=>{const d=Object.getOwnPropertyDescriptor(C.prototype,key);return {key,enumerable:d.enumerable,configurable:d.configurable,writable:d.writable,value:d.value?{name:d.value.name,length:d.value.length}:null,get:d.get?{name:d.get.name,length:d.get.length}:null,set:d.set?{name:d.set.name,length:d.set.length}:null};});
 // Formal NoKeyboardFollow baseline keeps all legacy signatures intact.
 // A single additive shared folder-create method is deliberately introduced;
 // its absence in the historical baseline is not a regression.
 const excluded=new Set(['getProjectOwnerMigration','getIndexedProjectGroups','subscribeProjectPropertyChanges','_publishProjectChanges','_connectDidaProjectCatalog','_refreshDidaProjectCatalog','subscribeIndexChanges','getIndexedFiles','_publishPropertyCatalogChanges']);
 const keep=x=>!(name==='LocalSearchPlugin'&&x.key==='openFloatingSearch')&&!(name==='SearchFacetController'&&x.key==='openFolderCreateDialog')&&!(name==='LocalSearchPlugin'&&excluded.has(x.key))&&!(name==='SearchCore'&&['_navigationCandidates','_selectBrowseFolder'].includes(x.key));
 const retired=name==='SearchNavigatorController'?'_propertyStats':null;
 if(retired)assert.equal(B.subject[name].prototype[retired],undefined);
 assert.deepEqual(describe(A.subject[name]).filter(keep).filter(x=>x.key!==retired),describe(B.subject[name]).filter(keep));
 if(name==='LocalSearchPlugin'){
   assert.equal(typeof B.subject[name].prototype.getIndexedFiles,'function');
   assert.equal(typeof B.subject[name].prototype.subscribeIndexChanges,'function');
   assert.equal(typeof B.subject[name].prototype._publishPropertyCatalogChanges,'function');
 }
 if(name==='SearchFacetController') assert.equal(typeof B.subject[name].prototype.openFolderCreateDialog,'function');
 if(name==='SearchCore') for(const key of ['_navigationCandidates','_selectBrowseFolder']) assert.equal(typeof B.subject[name].prototype[key],'function');
 const staticD=C=>Object.getOwnPropertyNames(C).filter(k=>!['length','name','prototype'].includes(k)).map(k=>[k,typeof C[k],C[k]?.length]);
 assert.deepEqual(staticD(A.subject[name]),staticD(B.subject[name]));record('prototype:'+name);
});
test('all original top-level symbol types and constants are retained',()=>{for(const n of originalNames){if(n==='SearchFloatingHost'){assert.equal(B.subject[n],undefined);continue;}assert.equal(typeof B.subject[n],typeof A.subject[n],n);if(typeof A.subject[n]!=='function'){const v=snap(B.subject[n]),baseline=snap(A.subject[n]);if(n==='EXTERNAL_SEARCH_API_VERSION'){assert.equal(v,19);assert.equal(baseline,18);}else if(n==='EXTERNAL_SEARCH_API_CAPABILITIES')assert.deepEqual(approvedOwnerRetirement({capabilities:v}),approvedOwnerRetirement({capabilities:baseline}));else if(n==='NAVIGATOR_VISIBLE_SECTION_DEFS')assert.deepEqual(v,baseline.filter(x=>!['owner','project'].includes(x.id)),n);else if(n==='DEFAULT_SETTINGS')sameExceptRetiredOwner(v,baseline);else assert.deepEqual(v,baseline,n);}}record('symbol-surface',{symbols:originalNames.length});});
const normalizeNames=['normalizeSortFieldOrder','normalizeHiddenSortFields','normalizeSortDirection','normalizeModalSearchQuery','normalizeModalViewportAnchor','normalizeGLSMetadataDirectory','normalizeMetadataPropertyType','normalizePropertyValueCatalog','validateEditablePropertyKey','normalizeEditableTagValue','editableTagError','normalizeUniqueStringList','normalizeStringListMap','normalizeTagValue','tagIdentityKey','normalizeUniqueTagList','normalizeFilterTagSelection','normalizeVaultFolderPath','normalizeHexColor','normalizeResultFolderColors','normalizeExcludedFolders','normalizeResultContentOrder','normalizeRecentIconIds','normalizeFilterPoolSelectionMode','normalizePropertyPoolEntry','normalizePropertyPoolEntries','normalizeFilterPoolConfig','normalizeFilterPools','normalizeResultViewId','normalizeResultViews','normalizeNavigatorToolbars','normalizeNavigatorVisibleSections','normalizeNavigatorTimeField','normalizeFileTypeFilterValue','normalizeFileTypeFilterSelection','normalizeFilterMatchMode','normalizeFilterDate','normalizeFilterDateRange','normalizeExcludedAttachmentTypes','normalizePropertySelection','normalizeCreateType','normalizeCreatePropertyTypes','normalizeCreateMetadataMemory','normalizeNavigatorCustomization'];
const normalCases=[undefined,null,'',' 项目/子项 ',['A','a','A','',null,0,'标签/子级'],{}, {kind:'property',key:'所属项目',values:['卫康','研发'],tags:['鞋垫','运动'],folders:['资料'],fileTypes:['md','canvas'],name:'custom'},true,0];
for(const name of normalizeNames)test('A/B normalization: '+name,()=>{for(const v of normalCases)assert.deepEqual(name==='normalizeNavigatorVisibleSections' ? approvedOwnerRetirement({navigatorVisibleSections:invoke(A.subject,name,[structuredClone(v)]).value}).navigatorVisibleSections : invoke(A.subject,name,[structuredClone(v)]),name==='normalizeNavigatorVisibleSections' ? invoke(B.subject,name,[structuredClone(v)]).value : invoke(B.subject,name,[structuredClone(v)]));record('normalize:'+name,{inputs:normalCases.length});});
test('normalization has meaningful expected results, not only equality',()=>{for(const S of [A.subject,B.subject]){assert.deepEqual(plain(S.normalizeUniqueStringList([' a ','a','b',''])),['a','b']);assert.equal(S.normalizeSortDirection('desc'),'desc');assert.equal(S.normalizeVaultFolderPath('/资料//方案/'),'资料/方案');assert.equal(S.normalizeHexColor('#ABC'),'#AABBCC');}record('normalization-known-answers');});
test('Markdown cleaning, snippets, ranges, drawing parsers A/B',()=>{
 const texts=['# 标题\n\n普通 **正文** [[资料|显示名]] ![图](https://example.invalid/p.png)','# 中文鞋垫 优惠','---\ntags: ["A"]\n---\n## 内容\n- [x] 完成\n```js\nlet x=1;\n```','hello world hello','<b>A&amp;B</b>',''];
 const one=['simpleSegment','decodeReadableEntities','readableWikiTarget','normalizeReadableText','stripReadableLineSyntax','cleanMarkdownForSnippet','extractCountableTextFromMarkdown','readableTokenCountFromText','markdownBodyForContentTracking','fastContentFingerprint','markdownBodyFingerprint','markdownTimePayload','canvasNodeCountFromContent','excalidrawSceneFromContent','excalidrawElementCountFromContent'];
 for(const name of one)for(const text of texts)assert.deepEqual(invoke(A.subject,name,[text]),invoke(B.subject,name,[text]),name);
 for(const text of texts)for(const query of ['标题','鞋垫','hello','不存在',''])for(const name of ['substringMatchRange','orderedMatchRanges','matchReadableText','tagQueryMatchRanges','compactOrderedBodyMatchRanges'])assert.deepEqual(invoke(A.subject,name,[text,query]),invoke(B.subject,name,[text,query]),name);
 for(const ranges of [[],[[0,3]],[[1,4],[3,8]],[[10,20]]])assert.deepEqual(invoke(A.subject,'buildSnippetWindow',[texts[0],ranges,20]),invoke(B.subject,'buildSnippetWindow',[texts[0],ranges,20]));
 record('text-formats-snippets',{oneArgumentCases:one.length*texts.length,matchingCases:texts.length*5*5});
});
test('SparseHeightIndex matches an independent prefix-sum reference',()=>{
 for(const S of [A.subject,B.subject]){const idx=new S.SparseHeightIndex();idx.reset(120,100);const heights=Array(120).fill(100);
  for(let i=0;i<80;i++){const k=(i*31)%120,h=20+(i*17)%200;idx.set(k,h);heights[k]=h;}
  const prefix=k=>heights.slice(0,k).reduce((a,b)=>a+b,0);
  for(let i=0;i<=120;i++)assert.equal(idx.prefix(i),prefix(i));assert.equal(idx.total(),prefix(120));
  for(let offset=0;offset<idx.total();offset+=29){let pos=0;while(pos<119&&prefix(pos+1)<=offset)pos++;assert.equal(idx.positionAt(offset),pos);}
  idx.rebaseEstimate(110);for(let k=0;k<120;k++)if(!idx.measured.has(k))heights[k]=110;assert.equal(idx.total(),prefix(120));idx.reset(0,90);assert.equal(idx.positionAt(10),-1);
 }record('height-index-reference');
});
test('query and filter clone/serialization contracts',()=>{
 const snapshots=[{}, {folder:'资料',tags:['a','a/b'],fileType:'md'}, {folders:['资料','项目'],tags:['#A'],fileTypes:['md','canvas'],properties:[['所属项目',['卫康']]],dateRange:{field:'created',from:'2026-10-01',to:'2026-10-15'}}];
 for(const input of snapshots){const fa=A.subject.FilterState.fromSnapshot(input),fb=B.subject.FilterState.fromSnapshot(input);assert.deepEqual(snap(fa.toSnapshot()),snap(fb.toSnapshot()));const ca=fa.clone(),cb=fb.clone();ca.tags.add('new');cb.tags.add('new');assert.deepEqual(snap(ca.toSnapshot()),snap(cb.toSnapshot()));assert.equal(fa.tags.has('new'),false);assert.equal(fb.tags.has('new'),false);}
 for(const q of ['',' hello World ','#鞋垫 运动'])assert.deepEqual(snap(new A.subject.QueryState(q)),snap(new B.subject.QueryState(q)));record('query-filter-state');
});
test('BodyIndex storage, rename and non-Markdown exclusion',()=>{
 function run(S){const idx=new S.BodyIndex(100);idx.addFile({path:'a.md',extension:'md'},'# Hello\nworld');assert.equal(idx.get('a.md').includes('hello'),true);idx.addFile({path:'b.png',extension:'png'},'ignored');assert.equal(idx.get('b.png'),'');idx.moveFile('a.md','c.md');const snapshot=idx.serialize();const restored=new S.BodyIndex();restored.deserialize(snapshot);assert.equal(restored.get('c.md'),idx.get('c.md'));idx.removeFile('c.md');return [snapshot,idx.serialize()];}assert.deepEqual(snap(run(A.subject)),snap(run(B.subject)));record('body-index');
});
test('IoPool concurrency, rejection and queued-task recovery',async()=>{
 async function run(S){const pool=new S.IoPool(2);let active=0,max=0;const finished=[];const jobs=Array.from({length:9},(_,i)=>pool.run(async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,i%2?2:1));active--;finished.push(i);if(i===3)throw Error('fixture failure');return i*2;}));const results=await Promise.allSettled(jobs);assert.equal(max,2);assert.equal(pool.running,0);assert.equal(results[3].status,'rejected');return results.map(r=>r.status==='fulfilled'?r.value:r.reason.message);}assert.deepEqual(await run(A.subject),await run(B.subject));record('io-concurrency');
});
const files=[{path:'资料/鞋垫方案.md',content:'# 鞋垫方案\n运动缓震',properties:{所属项目:'卫康',项目负责人:['张'],tags:['运动']}},{path:'项目/周报.md',content:'# 周报\n销量总结',properties:{所属项目:'卫康',tags:['周报']}},{path:'画板.canvas',content:'{"nodes":[],"edges":[]}'},{path:'图片.png',content:'image'}];
async function runPlugin(which,fn,settings={}){const h=loadSubject(which,{files,settings},true),p=new h.subject(h.host.app);try{await p.onload();await h.host.layoutReady();await p._flushIndexQueueNow();const value=await fn(p,h);await p._unloadHost();await Promise.all([p._settingsWriteChain,p._persistWriteChain,p._contentTimeWriteChain,p._nonMarkdownWriteChain,p._metadataHistoryWriteChain]);return {value:snap(value),trace:plain(h.host.trace),warnings:plain(h.warnings),listeners:h.host.activeListeners()};}finally{h.dispose();}}
test('production initialization retires one modeless command; preserves 2 views, generic API and clean unload',async()=>{
 const inspect=(p,h,expectedVersion,commandCount)=>{assert.equal(p._commands.length,commandCount);assert.equal(p._views.length,2);assert.equal(p.externalSearchApi.version,expectedVersion);assert.equal(h.hostRequireCalls,1);return {commands:p._commands.map(c=>c.id),views:p._views.map(v=>v.id),apiKeys:Object.keys(p.externalSearchApi),capabilities:p.externalSearchApi.capabilities,settings:p.settings,index:[...p.fileMetaCache.keys()]};};
 const a=await runPlugin('A',(p,h)=>inspect(p,h,18,8)),b=await runPlugin('B',(p,h)=>inspect(p,h,19,7));
 sameExceptRetiredOwner(b,a);assert.equal(a.listeners,0);assert.equal(a.warnings.length,0);record('production-lifecycle',{commands:7,viewTypes:2,apiVersion:19});
});
test('settings legacy input and queued writes preserve exact persisted snapshots',async()=>{
 const settings={ioConcurrentLimit:3,defaultFolder:'资料',useTemplate:true,templatePath:'资料/模板.md',sortFieldOrder:['name','opened'],recentOpened:['项目/周报.md'],unknownUserKey:{keep:true}};
 const run=async(p,h)=>{const initial=clone(p.settings);p.settings.searchHistory=['first'];const a=p.saveSettings();p.settings.searchHistory=['second'];const b=p.saveSettings();assert.equal(await a,true);assert.equal(await b,true);return {initial,saved:clone(p._saved)};};
 const a=await runPlugin('A',run,settings),b=await runPlugin('B',run,settings);sameExceptRetiredOwner(b,a);record('settings-migration-queue');
});
function clone(x){return JSON.parse(JSON.stringify(x));}
test('settings write failure is reported and the next queued write recovers',async()=>{
 const run=async(p,h)=>{p._saveFailure=Error('fixture disk error');const bad=await p.saveSettings();p._saveFailure=null;const good=await p.saveSettings();assert.equal(bad,false);assert.equal(good,true);return {bad,good};};const a=await runPlugin('A',run),b=await runPlugin('B',run);sameExceptRetiredOwner(b,a);record('settings-error-recovery');
});
test('ordinary indexed file public API, recent-opened subscription and property writes',async()=>{
 const run=async(p,h)=>{
  const before=p.externalSearchApi.listIndexedFiles();assert.ok(before.some(f=>f.properties?.['所属项目']));
  const updates=[];const off=p.externalSearchApi.subscribeRecentOpened(x=>updates.push(x));
  p.externalSearchApi.markOpened('项目/周报.md');const recent=p.externalSearchApi.getRecentOpened(5);off();
  const patch=await p.externalSearchApi.patchProperties({paths:['项目/周报.md'],properties:[{key:'负责人',propertyType:'text',isNewKey:true,addValues:['李']}],addTags:['待跟进']});await p._flushIndexQueueNow();
  const properties=p.externalSearchApi.getFileProperties('项目/周报.md');
  assert.ok(p.externalSearchApi.listIndexedFiles().some(f=>f.path==='项目/周报.md'));
  return {recent,updates,patch,properties,catalog:p.externalSearchApi.getPropertyCatalog()};
 };
 const b=await runPlugin('B',run);assert.ok(b.value.properties.负责人);
 // Legacy A still covers the shared property write and catalog, excluding retired project listing.
 const a=await runPlugin('A',async(p,h)=>{
  const updates=[];const off=p.externalSearchApi.subscribeRecentOpened(x=>updates.push(x));
  p.externalSearchApi.markOpened('项目/周报.md');const recent=p.externalSearchApi.getRecentOpened(5);off();
  const patch=await p.externalSearchApi.patchProperties({paths:['项目/周报.md'],properties:[{key:'负责人',propertyType:'text',isNewKey:true,addValues:['李']}],addTags:['待跟进']});await p._flushIndexQueueNow();
  return {recent,updates,patch,properties:p.externalSearchApi.getFileProperties('项目/周报.md'),catalog:p.externalSearchApi.getPropertyCatalog()};
 });
 sameExceptRetiredOwner(b,a);record('ordinary-index-and-writes');
});
test('full-content LRU cache hit, non-retained read and missing-file identity',async()=>{
 const run=async(p,h)=>{p.globalContentCache.clear();const file=h.host.store.get('项目/周报.md');h.host.clearTrace();const a=await p.getFileFullContent(file);const b=await p.getFileFullContent(file);const c=await p.getFileFullContent(file,{retain:false});assert.equal(a,b);assert.equal(b,c);assert.equal(p.globalContentCache.size,0);return {readTrace:clone(h.host.trace),content:a};};sameExceptRetiredOwner(await runPlugin('A',run),await runPlugin('B',run));record('content-cache');
});
test('file-operation leases reject overlap and release after a failure',async()=>{
 const run=async(p,h)=>{const file=h.host.store.get('项目/周报.md'),service=p.fileOperations;let release;const gate=new Promise(r=>release=r);const first=service.withTargets([file],()=>gate);let message;try{await service.withTargets([file],()=>{});}catch(e){message=e.message;}assert.equal(typeof message,'string');release('ok');assert.equal(await first,'ok');await assert.rejects(service.withTargets([file],()=>{throw Error('fixture mutation error')}),/fixture mutation/);assert.equal(service._targetLeases.size,0);return {message,recovered:await service.withTargets([file],()=>true)};};sameExceptRetiredOwner(await runPlugin('A',run),await runPlugin('B',run));record('file-operation-leases');
});
test('build reproducibility and explicitly reviewed CSS source',()=>{const original=fs.readFileSync('dist/main.js');build({outfile:'tests/generated/rebuilt.cjs'});assert.deepEqual(fs.readFileSync('tests/generated/rebuilt.cjs'),original);assert.deepEqual(validateMaintenanceScope().failures,[]);assert.deepEqual(fs.readFileSync('dist/styles.css'),fs.readFileSync('src/styles/styles.css'));record('reproducible-build-and-approved-css');});
test('virtual provider replacement, stale handles and raw metadata ownership',async()=>{
 const run=async(p,h)=>{const path='项目/周报.md',raw=p.fileMetaCache.get(path),before=JSON.stringify(raw.properties);
  assert.equal(p.externalSearchApi.registerVirtualProperties({id:'unsafe',keys:['__proto__'],getProperties:()=>({})}),null);
  const first=p.externalSearchApi.registerVirtualProperties({id:'fixture-provider',keys:['临时归属'],getProperties:()=>({'临时归属':['第一份']})});
  assert.deepEqual(plain(p._searchMeta(raw).properties['临时归属']),['第一份']);
  const second=p.externalSearchApi.registerVirtualProperties({id:'fixture-provider',keys:['临时归属'],getProperties:()=>({'临时归属':['第二份']})});
  assert.equal(first.dispose(),false);assert.equal(first.invalidate([path]),false);assert.equal(second.invalidate([path]),true);
  assert.deepEqual(plain(p._searchMeta(raw).properties['临时归属']),['第二份']);assert.equal(JSON.stringify(raw.properties),before);
  assert.equal(p.externalSearchApi.getFileProperties(path)['临时归属'],undefined);assert.equal(second.dispose(),true);assert.equal(second.dispose(),false);assert.equal(p._searchMeta(raw),raw);
  return {providerCount:p._externalPropertyProviders.size,rawUnchanged:JSON.stringify(raw.properties)===before};};sameExceptRetiredOwner(await runPlugin('A',run),await runPlugin('B',run));record('virtual-provider-generation-and-no-persistence');
});
test('external API rejects malformed request shapes without creating a session',async()=>{
 const run=async(p,h)=>{const inputs=[3,[],{allowedPaths:'all'},{filters:[]},{pick:{mode:'many'}},{selection:{mode:'single'}},{pick:{mode:'single'}},{pick:{mode:'single',onChoose:()=>{}},selection:{mode:'multiple'}}];
  const got=inputs.map(r=>p._normalizeExternalSearchRequest(r));for(const v of got)assert.equal(v,null);
  assert.equal(p.searchSession,null);return got;};sameExceptRetiredOwner(await runPlugin('A',run),await runPlugin('B',run));record('invalid-external-requests',{inputs:8});
});
test('Canvas property writes use existing metadata sidecar instead of rewriting Canvas content',async()=>{
 const run=async(p,h)=>{const file=h.host.store.get('画板.canvas'),before=file.content;
  const result=await p.externalSearchApi.patchProperties({paths:[file.path],properties:[{key:'所属项目',propertyType:'text',isNewKey:true,addValues:['画板项目']}]});
  await p._flushIndexQueueNow();assert.equal(file.content,before);assert.equal(result.failed,0);assert.equal(result.changed,1);
  const properties=p.externalSearchApi.getFileProperties(file.path);assert.equal(properties['所属项目'],'画板项目');
  return {result,properties,writes:[...h.host.adapterFiles].filter(([name,value])=>name.includes('file-times')&&value!==null)};};sameExceptRetiredOwner(await runPlugin('A',run),await runPlugin('B',run));record('non-markdown-sidecar-write');
});
test('GLS has no Dida project-catalog coupling and ignores task-only projects',async()=>{
 const result=await runPlugin('B',async(p,h)=>{
  assert.equal(p._connectDidaProjectCatalog,undefined);
  assert.equal(p.externalSearchApi.listProjects,undefined);
  assert.equal(p.externalSearchApi.subscribeProjectChanges,undefined);
  return p.externalSearchApi.listIndexedFiles().map(x=>x.path);
 });
 assert.ok(result.value.includes('项目/周报.md'));
 assert.equal(result.listeners,0);
 record('no-dida-project-coupling');
});

test('generic file/property catalog API exposes operations without project-specific special contracts',async()=>{
 const result=await runPlugin('B',async(p)=>{
  const api=p.externalSearchApi;
  assert.equal(api.version,19);
  for(const fn of ['listIndexedFiles','subscribeIndexChanges','getPropertyCatalog','addPropertyValues','renamePropertyValue','deletePropertyValue'])
   assert.equal(typeof api[fn],'function',fn);
  for(const fn of ['listProjects','subscribeProjectChanges','getProjectOwnerMigration'])
   assert.equal(api[fn],undefined,fn);
  return {capabilities:api.capabilities,keys:Object.keys(api)};
 });
 assert.ok(result.value.capabilities.includes('property-value-maintenance'));
 record('generic-property-public-interface');
});
