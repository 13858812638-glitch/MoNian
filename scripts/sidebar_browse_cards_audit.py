"""Result card work under repeated desktop navigation; stale-data and atomicity guards."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_BROWSE_CARDS_OUT','/workspace/sidebar-render-audit/current'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('\nwith sync_playwright()')[0],scope)
results=[]
def check(name,ok,evidence=None):
 results.append({'name':name,'pass':bool(ok),'evidence':evidence});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mobile in [False,True]:
  ctx,p=scope['boot'](b,mobile=mobile,large=not mobile)
  p.evaluate('''async()=>{
   window.R=C.resultRenderer;window.N=C.navigator;window.built=0;window.searches=0;window.durations=[];
   const build=R._buildResultItem;R._buildResultItem=function(...a){built++;return build.apply(this,a)};
   const search=C.performSearch;C.performSearch=function(...a){searches++;const t=performance.now();try{return search.apply(this,a)}finally{durations.push(performance.now()-t)}};
   window.go=async f=>{N.select('folder',f);await waitFixture(40)};
   await go('Folder000');window.first=C.resultEls[0];await go('Folder001');await go('Folder000');
  }''')
  if mobile:
   check('mobile shares retained-card path',p.evaluate('C.resultEls[0]===first'))
   p.evaluate("async()=>{C.swipe.setAllExpanded(true);built=0;C.performSearch('');await waitFixture(40)}")
   check('mobile expanded action shelves bypass card reuse',p.evaluate('built>0&&!R._browseCardCache'))
   p.evaluate("async()=>{C.swipe.setAllExpanded(false);C.performSearch('');await waitFixture(40);window.actionCard=C.resultEls[0];actionCard._lsSwipeShell._lsResultBinding.open('left');await go('Folder001');await go('Folder000')}")
   check('mobile opened action cards are rebuilt',p.evaluate('C.resultEls.find(x=>x.dataset.path===actionCard.dataset.path)!==actionCard'))
   p.evaluate('V.onClose()');ctx.close();continue
  check('returning to a folder reuses the same unchanged card',p.evaluate('C.resultEls[0]===first'))
  p.evaluate('''async()=>{built=0;searches=0;durations=[];for(let i=0;i<10;i++)await go(i%2?'Folder000':'Folder001')}''')
  measured=p.evaluate('({built,searches,durations,count:C.fullResults.length})')
  check('ten warmed folder switches do not rebuild cards',measured['built']==0,measured)
  check('every folder click still searches once and shows the correct files',measured['searches']==10 and measured['count']==12 and p.evaluate("C.renderedResults.every(x=>x.path.startsWith('Folder000/'))"),measured)
  check('mounted card positions match current results',p.evaluate("[...C.resultsRail.querySelectorAll('.local-search-swipe-shell')].every(s=>C.fullResults[R._actualIndexAtDisplayPosition(+s.dataset.virtualPosition)]?.path===s.dataset.path)"))
  p.evaluate('''async()=>{window.opened=[];const open=C._openResultFromSearch;C._openResultFromSearch=async file=>opened.push(file.path);window.targetPath=C.resultEls[0].dataset.path;C.resultEls[0].querySelector('.local-search-batch-title-open').click();await waitFixture(20);C._openResultFromSearch=open}''')
  check('reused title opens its current file exactly once',p.evaluate('opened.length===1&&opened[0]===targetPath'))
  p.evaluate("C.resultEls[0].querySelector('.local-search-item-property-key').click()")
  p.wait_for_timeout(40)
  check('reused property key still opens the shared picker',p.evaluate('!!C.dropdown.panel?.isConnected'))
  p.evaluate('''async()=>{built=0;C.performSearch('');await waitFixture(40)}''')
  check('open picker bypasses card reuse',p.evaluate('built>0&&!R._browseCardCache'))
  p.evaluate('C.dropdown.close(false)')
  p.evaluate('''async()=>{C.sortDirection=C.sortDirection==='asc'?'desc':'asc';C.performSearch('');await waitFixture(50)}''')
  check('sorting updates positions and final-row marker',p.evaluate("[...C.resultsRail.querySelectorAll('.local-search-swipe-shell')].every(s=>C.fullResults[R._actualIndexAtDisplayPosition(+s.dataset.virtualPosition)]?.path===s.dataset.path&&s.classList.contains('is-last-result')===(+s.dataset.virtualPosition===R.visibleResultCount()-1))"))
  p.evaluate('''async()=>{C.selection.enterBatchMode();built=0;C.performSearch('');await waitFixture(40)}''')
  check('batch mode uses fresh correctly marked checkboxes',p.evaluate("built>0&&!R._browseCardCache&&C.resultEls.every(x=>x.getAttribute('role')==='checkbox')"))
  p.evaluate('''async()=>{C.selection.exitBatchMode();C.performSearch('');await waitFixture(50);window.mutableCard=C.resultEls[0];window.mutableMeta=C.fullResults[0];mutableMeta.snippet='updated in place';C.performSearch('');await waitFixture(40)}''')
  check('in-place snippet edits invalidate retained content',p.evaluate("C.resultEls.find(x=>x.dataset.path===mutableMeta.path)!==mutableCard&&C.resultsRail.textContent.includes('updated in place')"))
  p.evaluate('''async()=>{window.previous=C.resultEls[0];const f=H.store.get(previous.dataset.path);await H.app.fileManager.processFrontMatter(f,m=>m.status='changed');P._queueFileIndex(f);await P._flushIndexQueueNow();C.performSearch('');await waitFixture(60)}''')
  check('metadata edits rebuild stale cards',p.evaluate("C.resultEls.find(x=>x.dataset.path===previous.dataset.path)!==previous&&C.resultsRail.textContent.includes('changed')"))
  p.evaluate("async()=>{await go('Folder001');window.changedFile=H.store.get(previous.dataset.path);await H.app.vault.rename(changedFile,'Folder000/Child/renamed.md');await P._flushIndexQueueNow();await go('Folder000')}" )
  check('renames never reuse the old path or title',p.evaluate("!C.resultEls.some(x=>x.dataset.path===previous.dataset.path)&&C.resultEls.some(x=>x.dataset.path==='Folder000/Child/renamed.md')"))
  p.evaluate('''async()=>{window.oldCard=C.resultEls[0];P.settings.hiddenResultPropertyKeys=['status'];C.performSearch('');await waitFixture(50)}''')
  check('presentation settings rebuild affected content',p.evaluate("C.resultEls[0]!==oldCard&&!C.resultsRail.querySelector('.local-search-item-property-key')"))
  p.evaluate('''async()=>{P.settings.hiddenResultPropertyKeys=[];C.performSearch('note');await waitFixture(90);window.queryCard=C.resultEls[0];C.performSearch('');await waitFixture(60)}''')
  check('query results never leak their card into browse results',p.evaluate('C.resultEls[0]!==queryCard'))
  p.evaluate('''async()=>{window.oldViewCard=C.resultEls[0];P.settings.activeResultView='compact';C.performSearch('');await waitFixture(50)}''')
  check('switching views rebuilds content with the new display flags',p.evaluate("C.resultEls[0]!==oldViewCard&&!C.resultsRail.querySelector('.local-search-item-tag,.local-search-item-property-key,.local-search-item-snippet')"))
  p.evaluate("async()=>{P.settings.activeResultView='standard';C.performSearch('');await waitFixture(40)}")
  p.evaluate('''async()=>{window.savedChildren=[...C.resultsRail.childNodes];window.savedItems=[...C.resultEls];window.savedBuild=R._buildResultItem;R._buildResultItem=function(){throw Error('intentional card failure')};try{N.select('folder','Folder150')}catch{}R._buildResultItem=savedBuild;await waitFixture(50)}''')
  check('builder failure preserves the complete previous page',p.evaluate('savedChildren.length===C.resultsRail.childNodes.length&&savedChildren.every((n,i)=>C.resultsRail.childNodes[i]===n)&&savedItems.every(n=>n.isConnected)'))
  p.evaluate("async()=>{C.performSearch('');await waitFixture(50);await go('Folder000')}" )
  # A post-commit failure must return reused nodes and positions to the old page.
  p.evaluate('''async()=>{window.savedChildren=[...C.resultsRail.childNodes];window.savedPositions=savedChildren.map(n=>n.dataset?.virtualPosition);const sync=C.selection.syncControls;C.selection.syncControls=()=>{throw Error('intentional post-commit failure')};try{N.select('folder','Folder001')}catch{}C.selection.syncControls=sync;await waitFixture(30)}''')
  check('post-commit failure rolls back cached card nodes and positions',p.evaluate('savedChildren.length===C.resultsRail.childNodes.length&&savedChildren.every((n,i)=>C.resultsRail.childNodes[i]===n&&n.dataset?.virtualPosition===savedPositions[i])'))
  p.evaluate("async()=>{C.performSearch('');await waitFixture(50);await go('Folder000')}" )
  p.evaluate("async()=>{window.actionCard=C.resultEls[0];await go('Folder001');await go('Folder000')}")
  check('desktop cards have no action lifecycle and remain reusable',p.evaluate('!C.swipe&&!C.containerEl.querySelector(".local-search-card-more,.local-search-swipe-actions")&&C.resultEls.find(x=>x.dataset.path===actionCard.dataset.path)===actionCard&&!actionCard._lsSwipeShell._lsResultBinding'))
  p.evaluate('''async()=>{window.deletedPath=C.resultEls[0].dataset.path;await go('Folder001');await H.app.vault.delete(H.store.get(deletedPath));await P._flushIndexQueueNow();await go('Folder000')}''')
  check('deleted cached file never returns to the result list',p.evaluate('!C.resultEls.some(x=>x.dataset.path===deletedPath)'))
  # Warm many distinct folders without retaining an unbounded detached vault UI.
  p.evaluate('''async()=>{for(let i=2;i<18;i++)await go('Folder'+String(i).padStart(3,'0'))}''')
  check('desktop retained card cache stays bounded',p.evaluate('R._browseCardCache?.entries.size<=96'),p.evaluate('R._browseCardCache?.entries.size??null'))
  p.evaluate('''async()=>{N.desktopSidebar=false;built=0;C.performSearch('');await waitFixture(40)}''')
  check('presentation flags do not change shared card reuse',p.evaluate('built===0&&!!R._browseCardCache'))
  p.evaluate('''async()=>{N.desktopSidebar=true;C.performSearch('');await waitFixture(40)}''')
  p.evaluate('V.onClose()')
  check('closing the view releases the retained cards',p.evaluate('!R._browseCardCache||R._browseCardCache.entries.size===0'))
  ctx.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(r['pass'] for r in results) else 1)
