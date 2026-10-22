import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {prepareSubjects,loadSubject} from './harness.mjs';
let applet,Navigator,Renderer,scheduleScroll;
before(()=>{prepareSubjects();applet=loadSubject('B');Navigator=applet.subject.SearchNavigatorController;Renderer=applet.subject.SearchResultRendererController;scheduleScroll=applet.subject.scheduleNavigatorScrollStateSave;});
after(()=>applet?.dispose());

function clock(){
 let now=0,id=0;const pending=new Map();
 const window={setTimeout(fn,delay){const key=++id;pending.set(key,{fn,at:now+delay});return key;},clearTimeout(key){pending.delete(key);}};
 function advance(delta){const target=now+delta;let guard=0;
   while(true){const tasks=[...pending].filter(([,v])=>v.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0]);
     if(!tasks.length)break;
     if(++guard>1000)throw Error('stuck timer');
     const [key,task]=tasks[0];now=task.at;pending.delete(key);task.fn();
   }
   now=target;
 }
 return {window,advance,get pending(){return pending.size;},get now(){return now;}};
}
function navFixture(){
 const time=clock();let calls=0;let disposed=0;
 const nav=Object.create(Navigator.prototype);
 const core={_destroyed:false,onStateChange(){calls++;}};
 const root={ownerDocument:{defaultView:time.window},dataset:{},removeClass(){},removeAttribute(){}};
 Object.assign(nav,{core,scroll:{scrollTop:0},root,facets:{hidden:false},page:'filters',searchVisible:false,
    expanded:new Set(),collapsed:new Set(),
    _scrollStateTimer:null,_scrollStatePending:false,_lastScrollStateTop:0,
    _projectionTask:null,observer:{disconnect(){disposed++;}},customization:{destroy(){disposed++;}},cleanups:[()=>disposed++]});
 return {nav,core,time,root,get calls(){return calls;},get disposed(){return disposed;}};
}

test('Navigator: leading request happens on first actual scroll; duplicates and zero-delta events do not resave',()=>{
 const x=navFixture();scheduleScroll(x.nav);assert.equal(x.calls,0);
 x.nav.scroll.scrollTop=12;scheduleScroll(x.nav);assert.equal(x.calls,1);
 scheduleScroll(x.nav);assert.equal(x.calls,1);
 x.time.advance(200);assert.equal(x.calls,1);assert.equal(x.time.pending,0);
 x.nav.scroll.scrollTop=14;scheduleScroll(x.nav);assert.equal(x.calls,2);
 x.time.advance(200);
 x.nav.destroy();assert.equal(x.time.pending,0);
});

test('Navigator: 100 native scroll events in 500ms coalesce into a few bounded layout requests',()=>{
 const x=navFixture();for(let i=1;i<=100;i++){x.nav.scroll.scrollTop=i;scheduleScroll(x.nav);x.time.advance(5);}
 const during=x.calls;assert.ok(during>=2 && during<=5,{during});
 x.time.advance(400);assert.ok(x.calls<=6,{calls:x.calls});assert.equal(x.time.pending,0);
 assert.equal(x.nav.capture().scrollTop,100,'capture takes live scrollTop, not trailing-notification snapshot');
 x.nav.destroy();
});

test('Navigator: continued scroll is bounded and settle always requests the final position',()=>{
 const x=navFixture();for(let i=1;i<=360;i++){x.nav.scroll.scrollTop=i;scheduleScroll(x.nav);x.time.advance(5);}
 x.time.advance(360);
 assert.ok(x.calls<=14 && x.calls>=8,{calls:x.calls});
 assert.equal(x.nav.capture().scrollTop,360);assert.equal(x.time.pending,0);x.nav.destroy();
});

test('Navigator: destroying during a trailing window cancels timer/listeners and emits no late callback',()=>{
 const x=navFixture();x.nav.scroll.scrollTop=1;scheduleScroll(x.nav);
 x.nav.scroll.scrollTop=2;scheduleScroll(x.nav);
 assert.equal(x.calls,1);assert.equal(x.time.pending,1);
 x.nav.destroy();assert.equal(x.time.pending,0);assert.equal(x.disposed,3);
 x.time.advance(500);assert.equal(x.calls,1);assert.equal(x.nav.core,null);
});

test('Navigator: hidden pane, removed onStateChange and destroyed core do not arm scroll-save timers',()=>{
 const x=navFixture();x.nav.facets.hidden=true;x.nav.scroll.scrollTop=20;scheduleScroll(x.nav);assert.equal(x.calls,0);
 x.nav.facets.hidden=false;scheduleScroll(x.nav);assert.equal(x.calls,1);
 x.time.advance(180);x.core.onStateChange=null;x.nav.scroll.scrollTop=30;scheduleScroll(x.nav);assert.equal(x.time.pending,0);
 x.core._destroyed=true;x.nav.scroll.scrollTop=40;scheduleScroll(x.nav);assert.equal(x.calls,1);x.nav.destroy();
});

test('Navigator: synchronous destruction by a save callback cannot arm an orphaned timer',()=>{
 const x=navFixture();x.core.onStateChange=()=>{x.core._destroyed=true;};
 x.nav.scroll.scrollTop=1;scheduleScroll(x.nav);assert.equal(x.time.pending,0);x.nav.destroy();
});

function resultFixture({size=1000,start=150,mount=32,best=0,body=0,expanded=false,invalidPos=null,extraUnrendered=false}={}){
 const fullResults=Array.from({length:size},(_,i)=>({path:`folder/${i}.md`,version:2}));
 const active=best+body>0;
 const mounted=[];let replacementCount=0;
 for(let i=0;i<mount;i++){
   const position=start+i,actual=expanded&&active?best+position:position;
   const path=fullResults[actual].path;
   const shell={dataset:{virtualPosition:String(i===invalidPos?'not-an-int':position)},replaceWith(_next){replacementCount++;}};
   const item={dataset:{path},closest(){return shell;},shell};
   mounted.push(item);
 }
 const oldRows=mounted.map((m,i)=>({path:m.dataset.path,version:1}));
 if(extraUnrendered)oldRows.push({path:fullResults[0].path,version:1});
 const core={
    fullResults,renderedResults:oldRows,resultEls:[...mounted],
    resultsContainer:{querySelectorAll:()=>mounted,ownerDocument:{createDocumentFragment:()=>({})}},
    _resultGeneration:8,queryState:{active},sortField:active?'relevance':'name',bodyExpanded:expanded,
    bestResultCount:best,bodyResultCount:body,selection:{syncControls(){core.selectionCalls++;}},selectionCalls:0
 };
 const renderer=Object.create(Renderer.prototype);renderer.owner=core;
 renderer._heightIndexGeneration=0;renderer.queueLazySnippetFill=()=>{core.snippetCalls=(core.snippetCalls||0)+1;};
 renderer._unobserveShell=()=>{core.unobserved=(core.unobserved||0)+1;};
 renderer._buildResultItem=(index,_frag,pos)=>{
  const replacement={dataset:{path:core.fullResults[index].path},position:pos,_lsSwipeShell:{_lsResultBinding:{syncAllExpanded(){}}}};
  core.resultEls.push(replacement);core.builders=(core.builders||[]).concat([{index,pos}]);return replacement;
 };
 return {core,renderer,mounted,get replacements(){return replacementCount;}};
}

test('Result renderer: one path change rebuilds only that mounted card and refreshes object bindings',()=>{
 const f=resultFixture(),changed=f.mounted[7].dataset.path;
 f.renderer.refreshChangedRows(new Set([changed]));
 assert.equal(f.replacements,1);assert.deepEqual(f.core.builders,[{index:157,pos:157}]);
 assert.equal(f.core.renderedResults[7],f.core.fullResults[157]);
 assert.equal(f.core.renderedResults[8],f.core.fullResults[158]);
 assert.equal(f.renderer._heightIndexGeneration,8);assert.equal(f.core.selectionCalls,1);assert.equal(f.core.snippetCalls,1);
});

test('Result renderer: offscreen change does not rebuild any mounted card',()=>{
 const f=resultFixture();f.renderer.refreshChangedRows(new Set(['folder/3.md']));
 assert.equal(f.replacements,0);assert.equal(f.core.builders,undefined);
 assert.equal(f.core.renderedResults.length,32);assert.equal(f.core.selectionCalls,1);
});

test('Result renderer: null paths preserves full mounted refresh semantics',()=>{
 const f=resultFixture({mount:12});f.renderer.refreshChangedRows(null);
 assert.equal(f.replacements,12);assert.equal(f.core.renderedResults.length,12);
 assert.ok(f.core.renderedResults.every(r=>r.version===2));
});

test('Result renderer: relevance body channel resolves the real index, not display position',()=>{
 const f=resultFixture({size:300,best:50,body:160,expanded:true,start:30,mount:12});
 const path=f.mounted[4].dataset.path;
 f.renderer.refreshChangedRows(new Set([path]));
 assert.deepEqual(f.core.builders,[{index:84,pos:34}]);assert.equal(f.core.renderedResults[4],f.core.fullResults[84]);
});

test('Result renderer: stale virtual position falls back to exact path identity',()=>{
 const f=resultFixture({size:500,invalidPos:5,mount:12});
 const path=f.mounted[5].dataset.path;
 f.renderer.refreshChangedRows(new Set([path]));
 assert.deepEqual(f.core.builders,[{index:155,pos:NaN}]);
 assert.equal(f.core.renderedResults[5],f.core.fullResults[155]);
});

test('Result renderer: off-DOM rendered-result references use the original full-path fallback',()=>{
 const f=resultFixture({extraUnrendered:true});
 f.renderer.refreshChangedRows(new Set(['folder/0.md']));
 assert.equal(f.replacements,0);assert.equal(f.core.renderedResults.at(-1),f.core.fullResults[0]);
});

test('Result renderer: 200 deterministic batches keep mounted identities and rebuild only matching paths',()=>{
 const f=resultFixture({size:1500});let replacements=0;
 for(let batch=0;batch<200;batch++){
  const idx=(batch*37)%f.core.fullResults.length;
  const path=f.core.fullResults[idx].path;
  const matches=f.mounted.some(m=>m.dataset.path===path);
  f.renderer.refreshChangedRows(new Set([path]));
  if(matches)replacements++;
  assert.equal(f.replacements,replacements);
  assert.ok(f.core.renderedResults.every((r,i)=>r.path===f.mounted[i].dataset.path));
 }
 assert.equal(f.core.selectionCalls,200);
});
