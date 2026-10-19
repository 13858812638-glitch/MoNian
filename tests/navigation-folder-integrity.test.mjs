import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prepareSubjects, loadSubject } from './harness.mjs';
let applet, subject;
before(() => { prepareSubjects(); applet = loadSubject('B', {
  files: [
    {path:'90-附件/图片.png'}, {path:'90-附件/说明.md'},
    {path:'90-附件/GLS-元数据/a.json'}, {path:'90-附件/GLS-元数据/b.json'},
    {path:'90-附件/用户目录/素材.pdf'}, {path:'01-笔记/周报.md'}
  ]
}); subject=applet.subject; });
after(()=>applet?.dispose());
function plugin(excludedFolders=[]) { return {
  settings:{excludedFolders,pickerFolderOrder:[],resultExcludedFolders:['90-附件'],resultExcludedAttachmentTypes:['png']},
  _metadataDirectory:()=> '90-附件/GLS-元数据',
  _metadataDirectorySafe:true,
  isPathExcluded(path) { return String(path).startsWith('90-附件/GLS-元数据') || excludedFolders.some(x=>path===x||path.startsWith(x+'/')); }
}; }
function paths(result){return Array.from(result,x=>x.path);}
test('metadata folder is visible in navigator, protected from ordinary picker, and globally blocked folder stays hidden',()=>{
  const {app}=applet.host, parent=app.vault.getAbstractFileByPath('90-附件');
  const normal=paths(subject.sharedFolderChildren(app,plugin(),parent));
  assert.deepEqual(normal,['90-附件/用户目录']);
  const nav=paths(subject.sharedFolderChildren(app,plugin(),parent,{showProtectedMetadata:true}));
  assert.deepEqual(nav.sort(),['90-附件/GLS-元数据','90-附件/用户目录'].sort());
  assert.deepEqual(paths(subject.sharedFolderChildren(app,plugin(['90-附件/GLS-元数据']),parent,{showProtectedMetadata:true})),['90-附件/用户目录']);
  assert.deepEqual(paths(subject.sharedFolderChildren(app,plugin(['90-附件']),app.vault.getRoot(),{showProtectedMetadata:true})),['01-笔记']);
});
test('folder direct and recursive physical counts ignore user global exclusion, never result-only hiding',()=>{
 const {app}=applet.host;
 const files=app.vault.getFiles().filter(x=>!x.path.startsWith('01-笔记/'));
 const count=subject.createSharedFolderDirectAndRecursiveCounts(files);
 assert.deepEqual(JSON.parse(JSON.stringify(count('90-附件'))),{direct:2,total:5});
 assert.deepEqual(JSON.parse(JSON.stringify(count('90-附件/GLS-元数据'))),{direct:2,total:2});
 assert.deepEqual(JSON.parse(JSON.stringify(count('90-附件/用户目录'))),{direct:1,total:1});
 assert.equal(subject.formatSharedFolderDirectAndRecursiveCount(count('90-附件')),'2 · 5');
 assert.equal(subject.formatSharedFolderDirectAndRecursiveCount(count('90-附件/GLS-元数据')),'2');
});
test('folder icon reflects the real expansion state, not every row as open',()=>{
 assert.equal(subject.sharedFolderDisplayIcon(false,false),'folder-closed');
 assert.equal(subject.sharedFolderDisplayIcon(true,false),'folder-closed');
 assert.equal(subject.sharedFolderDisplayIcon(true,true),'folder-open');
});
test('navigation folder scope ignores result-only exclusions while search results still respect them',()=>{
 const {app}=applet.host,p=plugin();
 const metas = app.vault.getFiles().map(x=>({path:x.path,tags:[],properties:{}}));
 const core={plugin:{...p,fileMetaCache:new Map(metas.map(x=>[x.path,x])),_searchMeta:x=>x},filterState:new subject.FilterState(),externalPathScope:null,
   ignoreResultExclusions:false, _prepareResultVisibility:subject.SearchCore.prototype._prepareResultVisibility,
   _isResultMetaVisible:subject.SearchCore.prototype._isResultMetaVisible};
 core.plugin.isResultPathExcluded=path => path.startsWith('90-附件/');
 core.plugin.isResultAttachmentTypeExcluded=()=>false;
 const nav=subject.SearchCore.prototype._navigationCandidates.call(core).all.map(x=>x.path);
 assert.deepEqual(JSON.parse(JSON.stringify(nav.sort())),['01-笔记/周报.md','90-附件/图片.png','90-附件/说明.md','90-附件/用户目录/素材.pdf'].sort());
 const prepared=subject.SearchCore.prototype._prepareResultVisibility.call(core);
 assert.equal(subject.SearchCore.prototype._isResultMetaVisible.call(core,{path:'90-附件/说明.md',type:'md'},false,prepared),false);
});
