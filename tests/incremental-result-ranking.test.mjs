import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {prepareSubjects,loadSubject} from './harness.mjs';

let runtime;
before(() => { prepareSubjects(); runtime = loadSubject('B'); });
after(() => runtime?.dispose());

function row(i, additions = {}) {
    const name = i % 5 === 0 ? `周报-${String(i).padStart(5, '0')}` : `资料${String(i % 37).padStart(2, '0')}-${i}`;
    return {
        path: `部门${i % 17}/${name}.${i % 29 === 0 ? 'pdf' : 'md'}`,
        name, nameLower: name.toLowerCase(),
        tags: i % 2 ? ['#日常'] : ['#高优先'],
        extension: i % 29 === 0 ? 'pdf' : 'md', properties: {},
        ctime: i % 17 === 0 ? 0 : 1760000000000 + (i * 5 % 79) * 1000,
        fileModifiedAt: i % 13 === 0 ? 0 : 1760010000000 + (i * 11 % 53) * 1000,
        contentModifiedAt: i % 11 === 0 ? 0 : 1760020000000 + (i * 7 % 61) * 1000,
        textCount: i % 20, body: i % 7 === 0 ? '本周周报总结，有记录' : '不相关正文',
        ...additions
    };
}

function makeCore({size = 300, queryActive = false, field = 'name', direction = 'asc', filtered = false} = {}) {
    const {SearchCore, FilterState} = runtime.subject;
    const core = Object.create(SearchCore.prototype);
    const fileMetaCache = new Map();
    for (let i = 0; i < size; i++) {
        const m = row(i);
        fileMetaCache.set(m.path, m);
    }
    const filter = new FilterState();
    if (filtered) filter.tags.add('#高优先');
    const controls = {syncCount: 0, sync() {this.syncCount++;}};
    const renderer = {
        _snippetInFlight: new Map(),
        refreshResultChannels() {this.channelRefreshes=(this.channelRefreshes||0)+1;},
        renderInitialPage() {this.rebuilds=(this.rebuilds||0)+1;},
        refreshChangedRows() {this.rowRefreshes=(this.rowRefreshes||0)+1;},
        captureMountedViewportAnchor() {return {path:'anchor.md', offset:0};}
    };
    core.queryState = queryActive
        ? {raw:'周报', normalized:'周报', intent:'周报', units:['周报'], active:true}
        : {raw:'', normalized:'', intent:'', units:[], active:false};
    core.sortField = field; core.sortDirection = direction;
    core.filterState = filter;
    core.createFlow = null;
    core._prepareResultVisibility = () => ({});
    core._isResultMetaVisible = meta => !meta.hidden;
    core.plugin = {
        fileMetaCache,
        bodyIndex: {get: path => fileMetaCache.get(path)?.body || ''},
        _searchMeta: meta => meta,
        settings: {keepSearchResultsInMemory:false, recentOpened:[...fileMetaCache.keys()].filter((_,i)=>i%33===0).reverse()}
    };
    core._resultGeneration = 0;
    core.loadedPaths = new Set();
    core.selection = {selectedPaths:new Set(), retainPaths(paths) {
        this.selectedPaths=new Set([...this.selectedPaths].filter(path=>paths.has(path)));
    }};
    core.resultControls = controls;
    core.resultRenderer = renderer;
    core.navigator = {sync(){}};
    core.bodyExpanded = false;
    core._destroyed = false;
    const first = core._rankCandidates(fileMetaCache.values(), core.queryState, filter);
    core.fullResults = first.body.length ? first.best.concat(first.body) : first.best;
    core.bestResultCount = first.bestCount;
    core.bodyResultCount = first.bodyCount;
    core._resultGeneration = 1;
    return {core, filter, fileMetaCache, controls, renderer};
}

function expectedCurrent(core, changed) {
    const candidates = changed == null
        ? core.plugin.fileMetaCache.values()
        : [...changed].map(path => core.plugin.fileMetaCache.get(path)).filter(Boolean);
    const retained = changed == null ? [] : core.fullResults.filter(r=>!changed.has(r.path));
    return core._rankCandidates(candidates,core.queryState,core.filterState,retained);
}
function resultSnapshot(r) {
    return JSON.stringify({rows:(r.body.length ? r.best.concat(r.body) : r.best), best:r.bestCount, body:r.bodyCount});
}
function assertMatchesFrozenRanking(core, changed, msg) {
    const expect = expectedCurrent(core,changed);
    const want = resultSnapshot(expect);
    core._recomputeCurrentResults({changedPaths:changed});
    const got = JSON.stringify({rows:core.fullResults,best:core.bestResultCount,body:core.bodyResultCount});
    assert.equal(got,want,msg);
    assert.equal(new Set(core.fullResults.map(m=>m.path)).size,core.fullResults.length,'no duplicate paths');
}

// Comparison oracle deliberately uses the PRE-OPTIMIZATION _rankCandidates
// with retained rows. It preserves old snippets and metadata object semantics.
for(const field of ['name','created','contentModified','fileModified','opened','relevance']) {
    for(const direction of ['asc','desc']) {
        for(const filtered of [false,true]) {
            test(`P1 ranked output parity ${field}/${direction} filtered=${filtered}`,()=>{
                const queryActive=field==='relevance'||filtered;
                const {core,fileMetaCache} = makeCore({queryActive,field,direction,filtered});
                const keys=[...fileMetaCache.keys()];
                let changed=new Set([keys[25],keys[26],keys[29],keys[52]]);
                fileMetaCache.set(keys[25],{...fileMetaCache.get(keys[25]),name:'周报-AAAAA',nameLower:'周报-aaaaa',ctime:1765000000000,tags:['#高优先']});
                fileMetaCache.set(keys[26],{...fileMetaCache.get(keys[26]),name:'周报-zzz',nameLower:'周报-zzz',body:'周报正文',tags:['#高优先']});
                fileMetaCache.delete(keys[29]);
                fileMetaCache.set(keys[52],{...fileMetaCache.get(keys[52]),hidden:true});
                assertMatchesFrozenRanking(core,changed,'update/delete/hide/member re-rank');

                const added=row(90500,{path:'部门0/周报-新建.md',name:'周报-新建',nameLower:'周报-新建',tags:['#高优先']});
                fileMetaCache.set(added.path,added);
                assertMatchesFrozenRanking(core,new Set([added.path]),'new result insertion');

                const noMatch=row(99998,{path:'部门1/无关新建.md',name:'无关新建',nameLower:'无关新建',tags:['#日常'],body:'无关正文'});
                fileMetaCache.set(noMatch.path,noMatch);
                assertMatchesFrozenRanking(core,new Set([noMatch.path]),'non matching result');
            });
        }
    }
}

test('body-only channel never interleaves with title channel even in ascending relevance',()=>{
    const {core,fileMetaCache} = makeCore({queryActive:true,field:'relevance',direction:'asc',size:500});
    const paths=[...fileMetaCache.keys()];
    fileMetaCache.set(paths[14],{...fileMetaCache.get(paths[14]),body:'周报周报正文'});
    assertMatchesFrozenRanking(core,new Set([paths[14]]));
    const firstBodyIndex=core.fullResults.findIndex(m=>m.bodyOnly);
    assert.equal(core.fullResults.slice(firstBodyIndex).every(m=>m.bodyOnly),true);
    assert.equal(core.fullResults.slice(0,firstBodyIndex).every(m=>!m.bodyOnly),true);
});

test('large delta falls back to frozen path; whole refresh still recalculates all files',()=>{
    const {core,fileMetaCache} = makeCore({size:440,queryActive:true,field:'created'});
    const changed = new Set([...fileMetaCache.keys()].slice(0,65));
    for(const p of changed) fileMetaCache.set(p,{...fileMetaCache.get(p),ctime:1800000000000});
    assertMatchesFrozenRanking(core,changed);
    assertMatchesFrozenRanking(core,null);
});

test('incremental updates do not lose selections or snippet lifecycle guards',()=>{
    const {core,fileMetaCache,renderer,controls} = makeCore({size:500,field:'name',queryActive:true});
    const selected=core.fullResults[0]?.path;
    assert.ok(selected);
    core.selection.selectedPaths.add(selected);
    core.loadedPaths.add(selected);
    core.resultRenderer._snippetInFlight.set(selected,Promise.resolve());
    const changed=new Set([selected]);
    fileMetaCache.delete(selected);
    const generation=core._resultGeneration;
    core._commitResultIndexChanges({paths:changed,pools:false});
    assert.equal(core._resultGeneration,generation+1);
    assert.equal(core.loadedPaths.has(selected),false);
    assert.equal(core.selection.selectedPaths.has(selected),false);
    assert.equal(renderer._snippetInFlight.size,0);
    assert.equal(controls.syncCount,1);
    assert.equal(renderer.rebuilds,1,'membership loss must rebuild near viewport anchor');
});

test('unchanged rank/order uses local row refresh instead of whole DOM',()=>{
    const {core,fileMetaCache,renderer} = makeCore({size:350,field:'name'});
    const selected=core.fullResults[30].path;
    fileMetaCache.set(selected,{...fileMetaCache.get(selected),textCount:999});
    core._commitResultIndexChanges({paths:new Set([selected]),pools:false});
    assert.equal(renderer.rebuilds||0,0);
    assert.equal(renderer.rowRefreshes,1);
});

test('deterministic 200-batch differential stress keeps every ranked row and channel stable',()=>{
    let seed=0x12345678;
    const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    for (const config of [
        {field:'name',queryActive:false},
        {field:'relevance',queryActive:true},
        {field:'created',queryActive:false},
        {field:'opened',queryActive:true,filtered:true}
    ]) {
        const {core,fileMetaCache}=makeCore({...config,size:450});
        let nextId=200000;
        for(let batch=0;batch<200;batch++) {
            const count=batch%17===0 ? 10 : 1+Math.floor(rand()*4);
            const paths=[...fileMetaCache.keys()];
            const changed=new Set();
            for(let k=0;k<count;k++) {
                const type=Math.floor(rand()*5);
                if(type===0 || !paths.length) {
                    const id=nextId++;
                    const newRow=row(id,{path:`部门额外/周报-${id}.md`,name:`周报-${id}`,nameLower:`周报-${id}`,tags:['#高优先']});
                    fileMetaCache.set(newRow.path,newRow);changed.add(newRow.path);
                } else {
                    const path=paths[Math.floor(rand()*paths.length)];
                    if (changed.has(path)) continue;
                    changed.add(path);
                    if(type===1) fileMetaCache.delete(path);
                    else {
                        const old=fileMetaCache.get(path);
                        if(!old)continue;
                        fileMetaCache.set(path,{...old,ctime:old.ctime+batch*131,hidden:type===2,
                            name:type===3?'周报-突然出现':old.name,
                            nameLower:type===3?'周报-突然出现':old.nameLower,
                            body:type===4?'周报出现于正文':old.body,
                            tags:type===4?['#高优先']:old.tags});
                    }
                }
            }
            assertMatchesFrozenRanking(core,changed,`${config.field} batch ${batch}`);
        }
    }
});

test('whole rescan with changed opened history stays on full-ranking path',()=>{
    const {core}=makeCore({size:220,field:'opened'});
    const reversed=core.fullResults.slice(0,90).map(x=>x.path).reverse();
    core.plugin.settings.recentOpened=reversed;
    assertMatchesFrozenRanking(core,null);
    assert.equal(JSON.stringify(core.fullResults.slice(0,90).map(x=>x.path)),JSON.stringify([...reversed].reverse()));
});
