"""Desktop result interaction removal and shared row surfaces, real DOM fixture."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_RESULT_SURFACE_OUT','/workspace/result-surface/after'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
rows=[]
def check(name,ok,evidence=None):
 rows.append({'name':name,'pass':bool(ok),'evidence':evidence});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mobile,dark in [(False,False),(False,True),(True,False),(True,True)]:
  ctx,p=scope['boot'](b,mobile=mobile,dark=dark);prefix=('mobile' if mobile else 'desktop')+('-dark' if dark else '-light')
  errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.evaluate("C.navigator.showResults(false)")
  state=p.evaluate('''()=>({coordinator:!!C.swipe,more:C.containerEl.querySelectorAll('.local-search-card-more').length,
    bindings:C.resultEls.filter(x=>x._lsSwipeShell._lsResultBinding).length,rows:C.resultEls.length,
    expand:!!C.selection.expandActionsBtn})''')
  check(prefix+' controls and bindings follow platform policy',state['more']==0 and (state['coordinator'] and state['expand'] and state['bindings']==state['rows'] if mobile else not state['coordinator'] and not state['expand'] and state['bindings']==0),state)
  cdp=ctx.new_cdp_session(p)
  obj=cdp.send('Runtime.evaluate',{'expression':'C.resultEls[0]'})['result']['objectId']
  listeners=cdp.send('DOMDebugger.getEventListeners',{'objectId':obj})['listeners']
  kinds=[x['type'] for x in listeners]
  check(prefix+' row gesture listeners exist only on mobile',all(t in kinds for t in ['touchstart','touchmove','touchend','touchcancel','pointerdown']) if mobile else not any(t in kinds for t in ['touchstart','touchmove','touchend','touchcancel','pointerdown','click']),kinds)
  p.evaluate('window.rowSize={width:C.resultEls[1].offsetWidth,height:C.resultEls[1].offsetHeight}')
  sampled=p.evaluate('''()=>{let samples=0;const renderer=C.resultRenderer,original=renderer._sampleSwipeReveal;
    renderer._sampleSwipeReveal=function(...args){samples++;return original.apply(this,args)};
    renderer._handleRowResize(C.resultEls.map(item=>({target:item._lsSwipeShell,
      borderBoxSize:[{blockSize:item._lsSwipeShell.getBoundingClientRect().height}]})));
    renderer._sampleSwipeReveal=original;return samples}''')
  check(prefix+' ordinary desktop row sizing skips action-reveal work',sampled>0 if mobile else sampled==0,sampled)
  if not mobile:
   p.locator('.local-search-item').first.hover()
   hover=p.evaluate('''()=>{const item=C.resultEls[0],tree=C.navigator.scroll.querySelector('.local-search-move-tree-row');
     const expected=getComputedStyle(tree).getPropertyValue('--ls-control-surface-hover').trim();
     const probe=document.createElement('div');tree.append(probe);probe.style.background=expected;
     const bg=getComputedStyle(probe).backgroundColor;probe.remove();return {actual:getComputedStyle(item).backgroundColor,expected:bg}}''')
   check(prefix+' result hover uses the filter row surface',hover['actual']==hover['expected'],hover)
   p.evaluate('''()=>{window.opens=0;window.renders=0;C._openResultFromSearch=async()=>{opens++};
     const render=C.resultRenderer.renderPage;C.resultRenderer.renderPage=function(...a){renders++;return render.apply(this,a)}}''')
   p.locator('.local-search-item').nth(0).click(position={'x':12,'y':12})
   p.locator('.local-search-item').nth(1).click(position={'x':12,'y':12})
   selected=p.evaluate('''()=>{const item=C.resultEls[1],tree=C.navigator.scroll.querySelector('.local-search-move-tree-row');
     tree.classList.add('is-selected');const style=getComputedStyle(tree),actual=getComputedStyle(item);
     const result={selected:item.classList.contains('is-current'),count:C.resultEls.filter(x=>x.classList.contains('is-current')).length,
       index:C.selectedIndex,bg:actual.backgroundColor,expectedBg:style.backgroundColor,shadow:actual.boxShadow,expectedShadow:style.boxShadow,
       opens,renders};tree.classList.remove('is-selected');return result}''')
   check(prefix+' click updates one cursor with shared selection styling and no render',selected['selected'] and selected['count']==1 and selected['index']==1 and selected['bg']==selected['expectedBg'] and selected['shadow']==selected['expectedShadow'] and selected['opens']==2 and selected['renders']==0,selected)
   check(prefix+' hover and selected surfaces do not resize the row',p.evaluate('rowSize.width===C.resultEls[1].offsetWidth&&rowSize.height===C.resultEls[1].offsetHeight'))
   p.screenshot(path=str(OUT/(prefix+'-selected.png')))
   keyboard=p.evaluate('''()=>{C.resultRenderer.navigateResults(1);return {index:C.selectedIndex,count:C.resultEls.filter(x=>x.classList.contains('is-current')).length}}''')
   check(prefix+' keyboard continues from the clicked cursor',keyboard['index']==2 and keyboard['count']==1,keyboard)
   p.evaluate('C.selection.enterBatchMode()');p.locator('.local-search-item').nth(0).click(position={'x':12,'y':12})
   check(prefix+' batch selection remains independent',p.evaluate('C.selection.selectedPaths.size===1&&C.resultEls[0].classList.contains("is-selected")'))
   p.evaluate('()=>{C.selection.exitBatchMode();window.menuPath=null;C._showResultFileMenu=(file)=>{menuPath=file.path}}')
   p.locator('.local-search-item').nth(0).click(button='right')
   check(prefix+' context menu remains available',p.evaluate('menuPath===C.resultEls[0].dataset.path'))
   p.evaluate('C.suspendInteractions();C.searchInput.value="note";C.performSearch("note")')
   check(prefix+' rebuilt result has no swipe state or stale cursor',p.evaluate('!C.swipe&&C.resultEls.every(x=>!x._lsSwipeShell._lsResultBinding&&!x.classList.contains("is-current"))'))
   hosts=p.evaluate('''async()=>{const outcomes=[];for(const kind of ['tab','window','embedded']){
     const el=document.body.createDiv({cls:'local-search-content'});const core=new S.SearchCore(H.app,P,el,{hostKind:kind,sharedSearchState:false});core.init();
     outcomes.push({kind,swipe:!!core.swipe,more:!!el.querySelector('.local-search-card-more'),expand:!!core.selection.expandActionsBtn});core.destroy();el.remove()}return outcomes}''')
   check(prefix+' desktop host variants create no swipe lifecycle',all(not r['swipe'] and not r['more'] and not r['expand'] for r in hosts),hosts)
  else:
   box=p.locator('.local-search-item').first.bounding_box();cdp=ctx.new_cdp_session(p);x=box['x']+box['width']*.7;y=box['y']+20
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   for step in range(1,7):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-step*20,'y':y}]})
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});p.wait_for_timeout(200)
   check(prefix+' real touch sequence still reveals five actions',p.evaluate('!!C.swipe.openWrapper&&C.swipe.openWrapper.querySelectorAll(".local-search-swipe-action").length===5'))
   p.evaluate('C.swipe.closeAll({immediate:true});C.selection.enterBatchMode();C.selection.expandActionsBtn.click()')
   check(prefix+' mobile expand-all still works',p.evaluate('C.swipe.allExpanded&&C.resultEls.every(x=>x._lsSwipeShell.classList.contains("is-swipe-open"))'))
  check(prefix+' no page errors',not errors,errors)
  p.screenshot(path=str(OUT/(prefix+'.png')));p.evaluate('V.onClose()');ctx.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
if not os.environ.get('GLS_RESULT_SURFACE_RECORD_ONLY'):assert all(x['pass'] for x in rows)
