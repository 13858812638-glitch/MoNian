import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareSubjects,loadSubject,plain} from './harness.mjs';

prepareSubjects();

test('GLS navigation has no privileged project-owner grouping and filters old group preferences', () => {
  const h=loadSubject('B');
  try {
    const S=h.subject;
    const keys=plain(S.NAVIGATOR_VISIBLE_SECTION_DEFS).map(x=>x.id);
    assert.deepEqual(keys,['folder','tags','properties']);
    assert.deepEqual(plain(S.normalizeNavigatorVisibleSections(['folder','properties','project','owner'])),['folder','properties']);
    const defs=S.SearchNavigatorController.prototype._definitions.call({layout:'desktop', core:{plugin:{settings:{}}}});
    assert.deepEqual(plain(defs).map(x=>x[0]),['folder','tags','properties']);
    assert.equal(fs.readFileSync('src/features/navigator/SearchNavigatorController.js','utf8').includes('"项目负责人"'),false);
  } finally {h.dispose()}
});

test('raw 项目负责人 YAML is a normal editable property; unrelated virtual properties remain supported',async()=>{
  const h=loadSubject('B',{files:[{path:'项目/文件.md',content:'# 资料',properties:{所属项目:'卫康',项目负责人:['55']}}]},true);
  const p=new h.subject(h.host.app);
  try {
    await p.onload(); await h.host.layoutReady(); await p._flushIndexQueueNow();
    const api=p.externalSearchApi;
    assert.equal(api.getProjectOwnerMigration,undefined);
    assert.equal(p.isVirtualPropertyKey('项目负责人'),false);
    assert.equal(p.propertyCatalogKeys([...Object.keys(api.getFileProperties('项目/文件.md'))]).includes('项目负责人'),true);
    assert.deepEqual(plain(api.getFileProperties('项目/文件.md').项目负责人),['55']);
    assert.equal(p.externalSearchApi.getPropertyCatalog().some(x=>x.key==='项目负责人'),true);
    const result=await api.patchProperties({paths:['项目/文件.md'],properties:[{key:'项目负责人',propertyType:'multitext',addValues:['徐佳佳']} ]});
    assert.equal(result.failed || 0,0); await p._flushIndexQueueNow();
    assert.deepEqual(plain(api.getFileProperties('项目/文件.md').项目负责人),['55','徐佳佳']);
    const handle=api.registerVirtualProperties({id:'another-independent-provider',keys:['第三方属性'],getProperties:()=>({第三方属性:['可用']})});
    assert.ok(handle); assert.equal(p.isVirtualPropertyKey('第三方属性'),true);
    assert.equal(p.isVirtualPropertyKey('项目负责人'),false);
    handle.dispose(); assert.equal(p.isVirtualPropertyKey('第三方属性'),false);
  } finally {await p._unloadHost();h.dispose()}
});


test('previously grey 项目负责人 key now has the ordinary rename/delete maintenance actions',()=>{
  const h=loadSubject('B');
  try {
    const can=h.subject.SearchFacetController.prototype.canSidebarMaintenance;
    const receiver={sidebarMaintenanceModes:()=>[{id:'rename'},{id:'delete'}],owner:{plugin:{isVirtualPropertyKey:()=>false}}};
    assert.equal(can.call(receiver,'property-key','rename',{key:'项目负责人'}),true);
    assert.equal(can.call(receiver,'property-key','delete',{key:'项目负责人'}),true);
  }finally{h.dispose()}
});
