"""GLS 2026-10-18 unchanged input notification regression using actual bundle.
Run: python3 scripts/unchanged_notification_acceptance.py --source . --output reports/unchanged-notification.json --strict
Requires Chromium at /usr/bin/chromium and Playwright; iPhone WebKit is not covered.
"""
import argparse, importlib.util, json, pathlib, sys
from playwright.sync_api import sync_playwright

fixture_path=pathlib.Path(__file__).with_name('unchanged_submit_fixture.py')
spec=importlib.util.spec_from_file_location('gls_noop_notification_fixture',fixture_path)
fixture=importlib.util.module_from_spec(spec);sys.modules[spec.name]=fixture;spec.loader.exec_module(fixture)

PROBE=r'''async () => {
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const calls={}, restore=[];
 const wrap=(object,name,label)=>{const original=object?.[name];if(typeof original!=='function')throw Error('Missing owner method: '+label);
  object[name]=function(...args){calls[label]=(calls[label]||0)+1;return original.apply(this,args)};
  restore.push(()=>{object[name]=original});};
 for(const [o,n,l] of [[C,'performSearch','search'],[C,'_notifyStateChange','notify'],
  [C.navigator,'sync','navsync'],[P.sharedSearchState,'publish','publish'],
  [C,'_syncSearchHeaderControls','header'],[C.createFlow,'handleInput','createInput'],
  [C.resultRenderer,'renderPage','render']])wrap(o,n,l);
 const originalStateChange=C.onStateChange;C.onStateChange=()=>{calls.layout=(calls.layout||0)+1;originalStateChange?.()};
 const resetCounts=()=>{for(const key of Object.keys(calls))delete calls[key]};
 const readCounts=()=>Object.fromEntries(['search','notify','navsync','publish','layout','header','createInput','render'].map(k=>[k,calls[k]||0]));
 const snapshot=()=>({gen:C._resultGeneration,revision:P.sharedSearchState.revision,
  selection:[...C.selection.selectedPaths],scroll:C.resultsContainer.scrollTop,
  query:C.queryState.raw,resultPaths:C.fullResults.map(r=>r.path),active:document.activeElement});
 const run=async(name,fn,settle=30)=>{
  await sleep(45);resetCounts();const before=snapshot();const started=performance.now();await fn();await sleep(settle);
  const after=snapshot();return {name,calls:readCounts(),elapsedMs:+(performance.now()-started-settle).toFixed(3),
   selectedBefore:before.selection.length,selectedAfter:after.selection.length,
   scrollBefore:Math.round(before.scroll),scrollAfter:Math.round(after.scroll),
   generationDelta:after.gen-before.gen,revisionDelta:after.revision-before.revision,
   sameResults:JSON.stringify(after.resultPaths)===JSON.stringify(before.resultPaths),
   focusKept:before.active===after.active};
 };
 const rows=[];
 const seed=async(query='产品测试笔记')=>{C.searchInput.value=query;C.performSearch(query,true);await sleep(55)};
 try{
  await seed();C.searchInput.focus();C.selection.enterBatchMode();C.selection.togglePath(C.fullResults[0].path);
  C.resultsContainer.scrollTop=(C.resultsContainer.scrollHeight-C.resultsContainer.clientHeight)*0.4;
  C.resultRenderer.handleScrollLoad(C.resultsContainer);await sleep(50);
  rows.push(await run('identical-input-x10',async()=>{for(let i=0;i<10;i++)C.searchInput.dispatchEvent(new Event('input',{bubbles:true}))},25));
  await seed('');rows.push(await run('identical-empty-x5',async()=>{for(let i=0;i<5;i++)C.searchInput.dispatchEvent(new Event('input',{bubbles:true}))},25));
  await seed();rows.push(await run('identical-ime-composition',async()=>{
   C.searchInput.dispatchEvent(new Event('compositionstart',{bubbles:true}));
   C.searchInput.dispatchEvent(new Event('input',{bubbles:true}));
   C.searchInput.dispatchEvent(new Event('compositionend',{bubbles:true}));},50));
  await seed();rows.push(await run('changed-keyword',async()=>{
   C.searchInput.value='笔记000';C.searchInput.dispatchEvent(new Event('input',{bubbles:true}))},230));
  await seed();rows.push(await run('raw-spaces-changed',async()=>{
   C.searchInput.value=' 产品测试笔记 ';C.searchInput.dispatchEvent(new Event('input',{bubbles:true}))},225));
  await seed();rows.push(await run('pending-index-identical',async()=>{
   C._pendingResultUpdate={paths:new Set(),pools:false};C.searchInput.dispatchEvent(new Event('input',{bubbles:true}))},225));
  await seed();const entered=C.createFlow.enterCreateMode();if(!entered)throw Error('Could not enter real CreateMode');
  rows.push(await run('create-mode-input',async()=>{
   C.searchInput.value='新建测试';C.searchInput.dispatchEvent(new Event('input',{bubbles:true}))},60));
  C.createFlow.toggleInputMode({focusInput:false});
  return {rows,revision:P.sharedSearchState.revision,pageErrors:[],loadedFiles:P.fileMetaCache.size};
 } finally {C.onStateChange=originalStateChange;for(const fn of restore)fn()}
}'''

def run(source,count,mobile):
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},locale='zh-CN',is_mobile=mobile,has_touch=mobile)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  init=fixture.boot(page,source,count,mobile)
  result=page.evaluate(PROBE);result.update({'count':count,'mobile':mobile,'initial':init,'pageErrors':errors})
  context.close();browser.close();return result

def check(result):
 failures=[]
 for r in result['rows']:
  name=r['name'];c=r['calls']
  if name.startswith('identical'):
   for key in ['search','notify','navsync','publish','layout','render']:
    if c[key]!=0:failures.append(f'{name}: {key}={c[key]} should be zero')
   if r['generationDelta'] or r['revisionDelta'] or not r['sameResults']:failures.append(f'{name}: result changed unexpectedly')
   if r['scrollBefore']!=r['scrollAfter'] or r['selectedBefore']!=r['selectedAfter'] or not r['focusKept']:
    failures.append(f'{name}: interaction changed unexpectedly')
   if c['header']<1:failures.append(f'{name}: search header not synchronized')
  elif name in ('changed-keyword','raw-spaces-changed','pending-index-identical'):
   if not c['search'] or not c['notify'] or not c['layout']:
    failures.append(f'{name}: real submit did not update state correctly: {c}')
  elif name=='create-mode-input':
   if not c['createInput'] or not c['notify']:failures.append(f'{name}: create draft notification missing: {c}')
 if result.get('pageErrors'):failures.extend(result['pageErrors'])
 return failures

if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--source',type=pathlib.Path,required=True);ap.add_argument('--output',type=pathlib.Path,required=True)
 ap.add_argument('--count',type=int,default=300);ap.add_argument('--mode',choices=['mobile','desktop'],default='mobile');ap.add_argument('--strict',action='store_true');a=ap.parse_args()
 data=run(a.source.resolve(),a.count,a.mode=='mobile');data['failures']=check(data)
 a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(data,ensure_ascii=False,indent=2,default=str))
 for row in data['rows']:print(row['name'],row['calls'],'delta gen',row['generationDelta'],'selection',row['selectedBefore'],'->',row['selectedAfter'],flush=True)
 print('ASSERTIONS',7-len(data['failures']),'passing /',len(data['failures']),'failures',flush=True)
 for f in data['failures']:print('FAIL:',f,flush=True)
 if a.strict and data['failures']:sys.exit(1)
