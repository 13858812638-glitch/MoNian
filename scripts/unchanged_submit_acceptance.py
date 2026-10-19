"""Chromium simulated-Obsidian regression for identical input and sort commits.
Runs the actual bundled GLS under the existing source fixture, with instrumentation only in the page.
"""
import argparse, json, pathlib, sys, importlib.util
from playwright.sync_api import sync_playwright
fixture_path=pathlib.Path(__file__).resolve().with_name('unchanged_submit_fixture.py')
spec=importlib.util.spec_from_file_location('gls_fixture',fixture_path)
fix=importlib.util.module_from_spec(spec);sys.modules[spec.name]=fix;spec.loader.exec_module(fix)

TEST=r'''async ()=>{
 const wait=ms=>new Promise(res=>setTimeout(res,ms));
 const cases=[];
 let renderCalls=0,searchCalls=0,rankCalls=0;
 const originals=[[C.resultRenderer,'renderPage',C.resultRenderer.renderPage],[C,'performSearch',C.performSearch],[C,'_rankCandidates',C._rankCandidates]];
 C.resultRenderer.renderPage=function(...args){renderCalls++;return originals[0][2].apply(this,args)};
 C.performSearch=function(...args){searchCalls++;return originals[1][2].apply(this,args)};
 C._rankCandidates=function(...args){rankCalls++;return originals[2][2].apply(this,args)};
 const snap=()=>({render:renderCalls,search:searchCalls,rank:rankCalls,gen:C._resultGeneration,
  scroll:C.resultsContainer.scrollTop,selected:[...C.selection.selectedPaths],
  raw:C.queryState.raw,sort:C.sortField,direction:C.sortDirection,
  files:C.fullResults.map(x=>x.path),nodes:C.resultRenderer._mountedShells(),
  headFocus:document.activeElement===C.searchInput, pending:!!C._pendingResultUpdate,
  basis:P.settings.navigatorTimeField
 });
 const delta=(before,after)=>({render:after.render-before.render,search:after.search-before.search,rank:after.rank-before.rank,generation:after.gen-before.gen,
  nodeRetained:after.nodes.filter(x=>before.nodes.includes(x)).length,
  scrollBefore:Math.round(before.scroll),scrollAfter:Math.round(after.scroll),
  selectedBefore:before.selected.length,selectedAfter:after.selected.length,
  sortBefore:before.sort,sortAfter:after.sort,dirBefore:before.direction,dirAfter:after.direction,
  rawBefore:before.raw,rawAfter:after.raw,pendingAfter:after.pending,basisBefore:before.basis,basisAfter:after.basis,
  resultsMatch:JSON.stringify(before.files)===JSON.stringify(after.files)
 });
 const reset=()=>{
  C._pendingResultUpdate=null;
  C.filterState.folders.clear();C.filterState.tags.clear();C.filterState.properties.clear();
  C.filterState.dateRange=null; C.sortDirection='desc';C.sortField='relevance';
  C.searchInput.value='产品测试笔记';C.performSearch('产品测试笔记',false);C.navigator.showResults(false);
  if(C.selection.batchMode)C.selection.exitBatchMode();
 };
 const record=async(kind,fn)=>{reset();await wait(30);renderCalls=searchCalls=rankCalls=0;
  // Give visible content a scroll position and select one file, ensuring no-op preserves both.
  if(kind==='same-input'||kind==='same-empty'||kind==='sort-same'){
   C.selection.enterBatchMode();C.selection.togglePath(C.fullResults[0].path);
   C.resultsContainer.scrollTop=Math.round((C.resultsContainer.scrollHeight-C.resultsContainer.clientHeight)*.45);
   C.resultRenderer.handleScrollLoad(C.resultsContainer);
   await wait(30);
  }
  if(kind==='same-empty') { C.searchInput.value=''; C.performSearch('',true); }
  if(kind==='focus-same-input'){const btn=C.resultRenderer._mountedShells()[0]?.querySelector('button');if(!btn)throw Error('result button missing');btn.focus();if(document.activeElement!==btn)throw Error('result button focus unavailable');}
  const focusBefore=document.activeElement;const before=snap();await fn();await wait(kind.includes('input')?175:30);const after=snap();
  const x=delta(before,after);x.focusPreserved=document.activeElement===focusBefore;cases.push({kind,...x});return x;
 };
 await record('same-input',async()=>C.searchInput.dispatchEvent(new Event('input',{bubbles:true})));
 await record('same-empty',async()=>C.searchInput.dispatchEvent(new Event('input',{bubbles:true})));
 await record('focus-same-input',async()=>C.searchInput.dispatchEvent(new Event('input',{bubbles:true})));
 await record('sort-same',async()=>C.sorting.applyField(C.sortField));
 await record('sort-changed',async()=>C.sorting.applyField('name'));
 await record('sort-cycle',async()=>C.sorting.cycleField());
 await record('sort-direction',async()=>C.sorting.toggleDirection());
 await record('filter-change',async()=>C.navigator.select('folder','项目1'));
 await record('query-changed',async()=>{C.searchInput.value='笔记000';C.searchInput.dispatchEvent(new Event('input',{bubbles:true}));await wait(180)});
 await record('query-raw-spaces-changed',async()=>{C.searchInput.value=' 产品测试笔记 ';C.searchInput.dispatchEvent(new Event('input',{bubbles:true}));await wait(180)});
 await record('input-same-pending-index',async()=>{
  C._pendingResultUpdate={paths:new Set(),pools:false};
  C.searchInput.dispatchEvent(new Event('input',{bubbles:true}));await wait(180);
 });
 await record('sort-same-pending-index',async()=>{
  C._pendingResultUpdate={paths:new Set(),pools:false};C.sorting.applyField(C.sortField);
 });
 await record('sort-same-time-basis-change',async()=>{
  C.sortField='created';C.performSearch(C.queryState.raw,true);
  P.settings.navigatorTimeField='modified'; // Actual time basis change even if same field picked
  C.sorting.applyField('created');
 });
 await record('input-composition',async()=>{
  C.searchInput.dispatchEvent(new Event('compositionstart',{bubbles:true}));
  C.searchInput.dispatchEvent(new Event('input',{bubbles:true}));
  C.searchInput.dispatchEvent(new Event('compositionend',{bubbles:true}));await wait(180);
 });
 // Final actual repeated input must not stop follow-up real file changes.
 for(const [o,k,original] of originals)o[k]=original;
 C.destroy();return {cases,listenerCount:H.activeListeners()};
}'''
# Fix method instrumentation: originals as [object,method,originalFn] above, alter before execution
TEST=TEST.replace("[[C.resultRenderer,'renderPage'],[C,'performSearch'],[C,'_rankCandidates']]", "[[C.resultRenderer,'renderPage',C.resultRenderer.renderPage],[C,'performSearch',C.performSearch],[C,'_rankCandidates',C._rankCandidates]]")
TEST=TEST.replace("originals[0][1].apply(this,args):originals[0][1](...args)", "originals[0][2].apply(this,args):originals[0][2].apply(this,args)")
TEST=TEST.replace("originals[1][2].apply(this,args)", "originals[1][2].apply(this,args)")
TEST=TEST.replace("originals[2][2].apply(this,args)", "originals[2][2].apply(this,args)")

def run(source,output,files,mode,strict):
 out={'source':str(source),'files':files,'mode':mode,'runs':[],'errors':[]}
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for n in files:
   for mobile in ([True,False] if mode=='both' else [mode=='mobile']):
    c=b.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},locale='zh-CN',is_mobile=mobile,has_touch=mobile)
    page=c.new_page();err=[];page.on('pageerror',lambda e:err.append(str(e)))
    try:
     fix.boot(page,source,n,mobile);got=page.evaluate(TEST)
     out['runs'].append({'files':n,'mobile':mobile,'cases':got['cases'],'listenersAfterDestroy':got['listenerCount'],'pageErrors':err})
     for a in got['cases']:
      print(n,'M' if mobile else 'D',a['kind'],'render',a['render'],'search',a['search'],'scroll',a['scrollBefore'],'->',a['scrollAfter'],'selected',a['selectedBefore'],'->',a['selectedAfter'],flush=True)
    except Exception as e:out['errors'].append({'files':n,'mobile':mobile,'error':str(e),'pageErrors':err});print('ERROR',e,flush=True)
    finally:c.close()
  b.close()
  output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(out,ensure_ascii=False,indent=2,default=lambda _: None),encoding='utf8')
  if out['errors']:sys.exit('BROWSER ERRORS: '+str(out['errors']))
  if strict:
   req_noop={'same-input','same-empty','sort-same','input-composition','focus-same-input'}
   req_change={'sort-changed','sort-cycle','sort-direction','filter-change','query-changed','query-raw-spaces-changed','input-same-pending-index','sort-same-pending-index','sort-same-time-basis-change'}
   for run in out['runs']:
    for a in run['cases']:
     if a['kind'] in req_noop:
      assert a['search']==0 and a['render']==0 and a['generation']==0, (run['files'],a)
      assert a['selectedBefore']==a['selectedAfter'] and a['scrollBefore']==a['scrollAfter'], (run['files'],a)
     if a['kind']=='focus-same-input':assert a['focusPreserved'], (run['files'],a)
     if a['kind'] in req_change:assert a['search']>=1 and a['render']>=1, (run['files'],a)
  print('WROTE',output,'tests',sum(len(r['cases']) for r in out['runs']))

if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--source',type=pathlib.Path,required=True);ap.add_argument('--output',type=pathlib.Path,required=True);ap.add_argument('--files',nargs='+',type=int,default=[300]);ap.add_argument('--mode',choices=['mobile','desktop','both'],default='both');ap.add_argument('--strict',action='store_true');a=ap.parse_args();run(a.source,a.output,a.files,a.mode,a.strict)
