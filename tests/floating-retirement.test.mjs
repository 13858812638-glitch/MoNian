import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepareSubjects, loadSubject } from './harness.mjs';

const source=path=>fs.readFileSync(path,'utf8');
test('independent modeless host, command and CSS are physically retired',()=>{
  assert.equal(fs.existsSync('src/ui/hosts/floating-host.js'),false);
  for(const [file,forbidden] of [
    ['src/core/LocalSearchPlugin.js','open-local-search-floating'],
    ['src/features/plugin/external-search-methods.js','openFloatingSearch'],
    ['src/ui/hosts/SearchWindowSession.js','SearchFloatingHost'],
    ['src/styles/styles.css','local-search-modeless-window'],
  ]) assert.equal(source(file).includes(forbidden),false,file);
  assert.match(source('src/core/LocalSearchPlugin.js'),/open-local-search-tab/);
  assert.match(source('src/core/LocalSearchPlugin.js'),/open-local-search/);
  assert.match(source('src/ui/hosts/SearchWindowSession.js'),/new SearchModalHost/);
  assert.match(source('src/ui/hosts/SearchWindowSession.js'),/closeAfterFileOpen: true/);
  assert.match(source('src/styles/styles.css'),/\.local-search-modal-container/);
  assert.match(source('src/ui/views/SearchView.js'),/SearchView/);
});

test('production host registers 7 commands, two workspace views and retains external search API',async()=>{
  const { build }=await import('../scripts/build.mjs');
  build({outfile:'dist/main.js'});
  const h=loadSubject('B',{},true);
  const p=new h.subject(h.host.app);
  try {
    await p.onload();
    await h.host.layoutReady();
    const ids=p._commands.map(x=>x.id);
    assert.equal(ids.length,7);
    assert.equal(ids.includes('open-local-search-floating'),false);
    assert.equal(ids.includes('open-local-search'),true);
    assert.equal(ids.includes('open-local-search-tab'),true);
    assert.equal(p._views.length,2);
    for(const name of ['openSearchModal','toggleSearchModal','openExternalSearch','mountExternalSearch','activateView'])
      assert.equal(typeof p[name],'function',name);
    assert.equal(typeof p.openFloatingSearch,'undefined');
    assert.ok(p.externalSearchApi.open);
    assert.ok(p.externalSearchApi.mount);
    await p._unloadHost();
    assert.equal(h.host.activeListeners(),0);
  } finally {h.dispose();}
});

test('even a legacy floating option cannot create a modeless host',()=>{
  prepareSubjects();
  const h=loadSubject('B');
  try{
    const {SearchWindowSession,SearchModalHost}=h.subject;
    const onOpen=SearchWindowSession.prototype.onOpen;
    SearchWindowSession.prototype.onOpen=function(){}; // host choice only, no real DOM in this contract fixture
    try{
      for(const options of [{},{floating:true},{floating:false}]){
        const session=new SearchWindowSession(h.host.app,{settings:{}},options);
        assert.equal(session.open(),true);
        assert.ok(session.host instanceof SearchModalHost);
        assert.equal(session.floating,undefined);
        assert.equal(session.host.session,session);
      }
    }finally{SearchWindowSession.prototype.onOpen=onOpen;}
  }finally{h.dispose();}
});
