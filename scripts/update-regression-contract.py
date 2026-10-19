from pathlib import Path
p=Path('/mnt/data/GLS-OrdinaryAttributes-20261018/tests/regression.test.mjs');s=p.read_text()
a=s.index('function approvedOwnerRetirement(value){');b=s.index('function sameExceptRetiredOwner',a)
s=s[:a]+'''// Compare every unchanged contract byte-for-byte. Only authorized project-specific
// API, navigation and Dida subscription retirements are normalized.
function approvedOwnerRetirement(value){
  if(Array.isArray(value))return value.map(approvedOwnerRetirement);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).map(([key,v])=>{
    if(key==='navigatorVisibleSections'&&Array.isArray(v))return [key,v.filter(x=>!['owner','project'].includes(x))];
    if(key==='apiKeys'&&Array.isArray(v))return [key,v.filter(x=>!['getProjectOwnerMigration','listProjects','subscribeProjectChanges','listIndexedFiles','subscribeIndexChanges'].includes(x))];
    if(key==='capabilities'&&Array.isArray(v))return [key,v.filter(x=>!['project-catalog','indexed-files','index-change-subscription'].includes(x))];
    if(key==='trace'&&Array.isArray(v))return [key,v.filter(x=>!(x?.data?.name==='dida:workbench-api-ready'&&['listen','unlisten'].includes(x.type))).map(approvedOwnerRetirement)];
    return [key,approvedOwnerRetirement(v)];
  }));
}
'''+s[b:]
s=s.replace(''' const changed=describe(B.subject[name]).filter(item=>!(name==='SearchFacetController'&&item.key==='openFolderCreateDialog'));
 assert.deepEqual(describe(A.subject[name]).filter(x=>!(name==='LocalSearchPlugin'&&x.key==='getProjectOwnerMigration')),changed);''',''' const excluded=new Set(['getProjectOwnerMigration','getIndexedProjectGroups','subscribeProjectPropertyChanges','_publishProjectChanges','_connectDidaProjectCatalog','_refreshDidaProjectCatalog','subscribeIndexChanges','getIndexedFiles']);
 const keep=x=>!(name==='SearchFacetController'&&x.key==='openFolderCreateDialog')&&!(name==='LocalSearchPlugin'&&excluded.has(x.key));
 assert.deepEqual(describe(A.subject[name]).filter(keep),describe(B.subject[name]).filter(keep));
 if(name==='LocalSearchPlugin'){
   assert.equal(typeof B.subject[name].prototype.getIndexedFiles,'function');
   assert.equal(typeof B.subject[name].prototype.subscribeIndexChanges,'function');
 }''')
s=s.replace("baseline.filter(x=>x.id!=='owner')","baseline.filter(x=>!['owner','project'].includes(x.id))")
s=s.replace("if(n==='NAVIGATOR_VISIBLE_SECTION_DEFS')","if(n==='EXTERNAL_SEARCH_API_VERSION'){assert.equal(v,19);assert.equal(baseline,18);}else if(n==='EXTERNAL_SEARCH_API_CAPABILITIES')assert.deepEqual(approvedOwnerRetirement({capabilities:v}),approvedOwnerRetirement({capabilities:baseline}));else if(n==='NAVIGATOR_VISIBLE_SECTION_DEFS')")
s=s.replace("assert.equal(p.externalSearchApi.version,18);","assert.equal(p.externalSearchApi.version,h.variant==='A'?18:19);")
s=s.replace("record('production-lifecycle',{commands:8,viewTypes:2,apiVersion:18});","record('production-lifecycle',{commands:8,viewTypes:2,apiVersion:19});")
# Replace legacy catalog test with separate checks of generic API and unchanged common behavior.
a=s.index("test('public project catalog, virtual projection, recent-opened subscription and property write'");b=s.index("test('full-content LRU",a)
s=s[:a]+'''test('ordinary indexed file public API, recent-opened subscription and property writes',async()=>{
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
'''+s[b:]
a=s.index("test('Dida catalog subscription identity and unloaded owner cleanup'");
s=s[:a]+'''test('GLS has no Dida project-catalog coupling and ignores task-only projects',async()=>{
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
'''
p.write_text(s)
q=Path('/mnt/data/GLS-OrdinaryAttributes-20261018/tests/project-owner-ordinary.test.mjs');s=q.read_text();s=s.replace("['folder','tags','properties','project']","['folder','tags','properties']").replace("['folder','properties','project']","['folder','properties']");q.write_text(s)
print('updated regression tests')
