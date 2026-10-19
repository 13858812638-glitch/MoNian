import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSubjects,loadSubject,plain} from './harness.mjs';
prepareSubjects();

test('GLS navigator does not reserve project or owner groups',()=>{
 const h=loadSubject('B');
 try{
   assert.deepEqual(plain(h.subject.NAVIGATOR_VISIBLE_SECTION_DEFS).map(x=>x.id),['folder','tags','properties']);
   assert.deepEqual(plain(h.subject.normalizeNavigatorVisibleSections(['folder','project','properties'])),['folder','properties']);
   const defs=h.subject.SearchNavigatorController.prototype._definitions.call({layout:'desktop',core:{plugin:{settings:{}}}});
   assert.deepEqual(plain(defs).map(x=>x[0]),['folder','tags','properties']);
 }finally{h.dispose();}
});

test('generic GLS index lists ordinary properties and updates any attribute',async()=>{
 const h=loadSubject('B',{files:[
  {path:'项目/a.md',content:'# A',properties:{所属项目:['卫康','鞋垫'],项目负责人:['55'],备注:'1'}},
  {path:'项目/b.md',content:'# B',properties:{备注:['旧']}}
 ]},true);
 const p=new h.subject(h.host.app);
 try{
  await p.onload();await h.host.layoutReady();await p._flushIndexQueueNow();
  const api=p.externalSearchApi;
  assert.equal(api.listProjects,undefined);
  assert.equal(api.subscribeProjectChanges,undefined);
  const rows=plain(api.listIndexedFiles());
  assert.deepEqual(rows.map(x=>x.path).sort(),['项目/a.md','项目/b.md']);
  assert.deepEqual(rows[0].properties.所属项目,['卫康','鞋垫']);
  assert.deepEqual(rows[0].properties.项目负责人,['55']);
  let called=0;const stop=api.subscribeIndexChanges(()=>called++);
  const before=called;
  const result=await api.patchProperties({paths:['项目/b.md'],properties:[{key:'备注',addValues:['新'],propertyType:'multitext'}]});
  assert.equal(result.failed||0,0);await p._flushIndexQueueNow();
  assert.ok(called>before);
  assert.ok(plain(api.listIndexedFiles()).find(x=>x.path==='项目/b.md').properties.备注.includes('新'));
  stop();
 }finally{await p._unloadHost();h.dispose();}
});

test('empty group is stored solely as an ordinary property catalog value, and value maintenance notifies subscribers',async()=>{
 const h=loadSubject('B',{files:[{path:'资料/笔记.md',content:'# 内容',properties:{备注:'保留'}}]},true);
 const p=new h.subject(h.host.app);
 try{
  await p.onload();await h.host.layoutReady();await p._flushIndexQueueNow();
  const api=p.externalSearchApi;
  let changes=0;const stop=api.subscribeIndexChanges(()=>changes++);
  const before=JSON.stringify(plain(api.listIndexedFiles()));
  await api.addPropertyValues([{key:'所属项目',propertyType:'multitext',addValues:['新项目']}]);
  assert.ok(plain(api.getPropertyCatalog()).find(x=>x.key==='所属项目')?.values.includes('新项目'));
  assert.equal(JSON.stringify(plain(api.listIndexedFiles())),before,'creating a group must not create or modify a file');
  assert.ok(changes>0);
  assert.equal(await api.renamePropertyValue({key:'所属项目',oldValue:'新项目',newValue:'新名称',propertyType:'multitext'}),true);
  assert.deepEqual(plain(api.getPropertyCatalog()).find(x=>x.key==='所属项目')?.values,['新名称']);
  assert.equal(await api.deletePropertyValue({key:'所属项目',value:'新名称',propertyType:'multitext'}),true);
  assert.equal(plain(api.getPropertyCatalog()).some(x=>x.key==='所属项目'&&x.values.includes('新名称')),false);
  assert.equal(JSON.stringify(plain(api.listIndexedFiles())),before);
  stop();
 }finally{await p._unloadHost();h.dispose();}
});
