"""Result viewport event ownership through real SearchView and Chromium input."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_SCROLL_OWNER_OUT','/workspace/result-scroll/after'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
checks=[]
def check(name,ok,evidence=None):
 checks.append(dict(name=name,passed=bool(ok),evidence=evidence));print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mobile in [False,True]:
  ctx,p=scope['boot'](b,mobile=mobile);label='mobile' if mobile else 'desktop'
  errors=[];p.on('pageerror',lambda e: errors.append(str(e)))
  p.evaluate('C.navigator.showResults(false)');p.wait_for_timeout(400)
  p.evaluate('''()=>{
   window.work={};window.resetWork=()=>{work={mark:0,settle:0,nav:0,publish:0,save:0,commit:0,render:0,opened:0}};resetWork();
   for(const [obj,name,key] of [[C.resultRenderer,'_markNativeScroll','mark'],[C.resultRenderer,'_settleNativeScroll','settle'],
     [C.navigator,'sync','nav'],[P.sharedSearchState,'publish','publish'],[C,'onStateChange','save'],
     [C,'_commitResultIndexChanges','commit'],[C.resultRenderer,'renderPage','render']]){
    const fn=obj[name];obj[name]=function(...args){work[key]++;return fn?.apply(this,args)};
   }
   C._openResultFromSearch=async()=>{work.opened++};
  }''')
  if not mobile:
   p.locator('.local-search-item').first.hover();p.mouse.down();p.wait_for_timeout(240)
   held=p.evaluate('({...work,scrolling:C.resultRenderer.isNativeScrolling()})')
   check(label+' held mouse is not a scroll transaction',held['mark']==0 and held['settle']==0 and held['nav']==0 and held['publish']==0,held)
   p.mouse.up();p.wait_for_timeout(240)
   click=p.evaluate('({...work,selected:C.selectedIndex})')
   check(label+' click opens and selects without delayed refresh',click['opened']==1 and click['selected']==0 and click['nav']==0 and click['publish']==0 and click['settle']==0,click)
   p.evaluate('resetWork();C.resultEls[0].focus({preventScroll:true})');p.keyboard.press('ArrowLeft');p.wait_for_timeout(240)
   key=p.evaluate('({...work})')
   check(label+' non-scrolling key does no work',key['mark']==0 and key['settle']==0,key)
   # Space on a nested button must activate its action, not pre-arm scrolling.
   p.evaluate('''()=>{window.probe=C.resultEls[0].createEl('button',{text:'probe'});probe.onclick=e=>e.stopPropagation();probe.focus({preventScroll:true});resetWork()}''')
   p.keyboard.press('Space');p.wait_for_timeout(240)
   key=p.evaluate('({...work})');p.evaluate('probe.remove()')
   check(label+' button keyboard activation is not scrolling',key['mark']==0 and key['settle']==0 and key['nav']==0,key)
  if not mobile:
   p.locator('.local-search-item').first.hover();p.evaluate('resetWork()');p.mouse.down()
   immediate=p.evaluate('''async()=>{C._queueResultIndexChanges(new Set([C.fullResults[0].path]));await Promise.resolve();return {...work,pending:!!C._pendingResultUpdate}}''')
   p.mouse.up();p.wait_for_timeout(400)
   check(label+' mouse press does not delay a valid index commit',immediate['commit']==1 and not immediate['pending'],immediate)
  programmatic=p.evaluate('''async()=>{resetWork();C.resultRenderer._setScrollTop(80);await waitFixture(350);return {...work,top:C.resultsContainer.scrollTop}}''')
  check(label+' explicit position restore does not start native scrolling',programmatic['top']==80 and programmatic['mark']==0 and programmatic['settle']==0,programmatic)
  p.evaluate('resetWork();C.resultsContainer.scrollTop=220');p.wait_for_timeout(400)
  scroll=p.evaluate('({...work,top:C.resultsContainer.scrollTop,saved:V.getState().session.viewportAnchor?.scrollTop,timer:C.resultRenderer._scrollSettleTimer})')
  check(label+' real scroll saves position without query publish or navigation sync',scroll['top']>0 and scroll['saved']==round(scroll['top']) and scroll['save']>=1 and scroll['nav']==0 and scroll['publish']==0 and scroll['render']==0 and scroll['timer'] is None,scroll)
  pending=p.evaluate('''async()=>{resetWork();C.resultRenderer._markNativeScroll();
   C._queueResultIndexChanges(new Set([C.fullResults[0].path]));await Promise.resolve();const early=work.commit;
   await waitFixture(400);return {...work,early,pending:!!C._pendingResultUpdate}}''')
  check(label+' pending index work waits then commits once',pending['early']==0 and pending['commit']==1 and not pending['pending'],pending)
  shared=p.evaluate('''async()=>{resetWork();C.resultRenderer._markNativeScroll();
    const shared=P.sharedSearchState;shared.state={...shared.state,query:'note1'};shared.revision++;shared.schedule(C);
    await Promise.resolve();const before=C.queryState.raw;await waitFixture(400);
    return {...work,before,after:C.queryState.raw,applied:shared.members.get(C).applied,revision:shared.revision}}''')
  check(label+' pending shared query still consumed after scroll',shared['before']!='note1' and shared['after']=='note1' and shared['applied']==shared['revision'],shared)
  p.evaluate('C.searchInput.value="";C.performSearch("")');p.wait_for_timeout(400)
  if not mobile:
   p.evaluate('C.resultsContainer.tabIndex=0;C.resultsContainer.focus({preventScroll:true});resetWork()')
   p.keyboard.press('PageDown');p.wait_for_timeout(500)
   keyscroll=p.evaluate('({...work,top:C.resultsContainer.scrollTop})')
   check(label+' native keyboard scrolling still tracked',keyscroll['top']>0 and keyscroll['mark']>0 and keyscroll['save']>=1 and keyscroll['nav']==0,keyscroll)
   p.locator('.local-search-results').hover();p.evaluate('resetWork()');p.mouse.wheel(0,180);p.wait_for_timeout(450)
   wheel=p.evaluate('({...work})')
   check(label+' wheel still settles without redundant projections',wheel['mark']>0 and wheel['settle']>=1 and wheel['nav']==0 and wheel['publish']==0,wheel)
  closing=p.evaluate('''async()=>{resetWork();C.resultRenderer._markNativeScroll();const r=C.resultRenderer;V.onClose();
    const saved={...work};await waitFixture(300);return {saved,after:work,timer:r._scrollSettleTimer,owner:r.owner}}''')
  check(label+' close cancels scroll timer with no late work',closing['saved']==closing['after'] and closing['timer'] is None and closing['owner'] is None,closing)
  check(label+' no page errors',not errors,errors);ctx.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
if not os.environ.get('GLS_SCROLL_OWNER_RECORD_ONLY'):assert all(c['passed'] for c in checks)
