from pathlib import Path
import json,os,subprocess,sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent.parent
checks=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,mobile in [(390,True),(250,True),(1100,False)]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
  p=ctx.new_page();err=[];p.on('pageerror',lambda e:err.append(str(e)))
  try:
   p.set_content(f'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body class="theme-dark {"is-mobile is-phone is-ios" if mobile else ""}"><div id="leaf" style="width:100%;height:740px;display:flex;flex-direction:column"></div><div id="host"></div></body>')
   for f in ('tests/browser-fixture.css','src/styles/styles.css'):p.add_style_tag(content=(R/f).read_text())
   for f in ('tests/host.js','tests/browser-scenarios.js'):p.add_script_tag(content=(R/f).read_text())
   p.evaluate('(mobile)=>bootFixture(mobile)',mobile)
   p.add_script_tag(content=(R/'tests/generated/subject.cjs').read_text())
   p.evaluate('''async()=>{
    window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);await P.onload();await H.layoutReady();await P._flushIndexQueueNow();
    const leaf={app:H.app,parent:H.app.workspace.leftSplit,detach(){}};
    window.V=new S.SearchView(leaf,P);document.querySelector('#leaf').append(V.containerEl);
    V.containerEl.style.cssText='height:100%;width:100%;display:flex;flex-direction:column';
    await V.onOpen();window.C=V.core;
    await C.performSearch('');await waitFixture(110);
    C.navigator.collapsed.clear();C.navigator.setPage('filters',false);C.navigator.renderRevision=-1;C.navigator.sync();await waitFixture(120);
    }''')
   def check(n,ok,d):
    checks.append({'width':width,'mobile':mobile,'case':n,'passed':bool(ok),'detail':d})
    print(width,n,'PASS' if ok else 'FAIL',str(d)[:210],flush=True)
   if mobile:
    for g,name in [('folder','项目'),('tags','计划'),('properties','所属项目')]:
     d=p.evaluate('''([group,name])=>{
      const row=[...document.querySelectorAll(`.local-search-nav-section[data-nav-section="${group}"] .local-search-nav-row`)].find(x=>x.querySelector('.local-search-move-tree-name')?.textContent===name);
      if(!row)return {error:'missing'};
      const target=row.querySelector(':scope>button.local-search-move-tree-folder');
      const ev=(type,x,y)=>target.dispatchEvent(new PointerEvent(type,{pointerType:'touch',pointerId:9,button:0,clientX:x,clientY:y,bubbles:true,cancelable:true}));
      const x=100,y=120;
      ev('pointerdown',x,y);const start=row.className;
      ev('pointermove',x,y+15);const moved=row.className;
      ev('pointerup',x,y+15);const ended=row.className;
      return {start,moved,ended,activeBefore:row.matches('.is-selected')}
      }''',[g,name]);check(g+'.direct-touch-drag-cancels',not 'error' in d and 'is-nav-touch-dragged' in d['moved'] and 'is-nav-touch-dragged' not in d['ended'],d)
    d=p.evaluate('''()=>{const row=document.querySelector('.local-search-nav-section[data-nav-section="folder"] .local-search-nav-row');const badge=row.querySelector(':scope>.local-search-move-current-badge');const ev=(t,x,y)=>badge.dispatchEvent(new PointerEvent(t,{pointerType:'touch',pointerId:8,button:0,clientX:x,clientY:y,bubbles:true}));ev('pointerdown',100,100);const start=row.className;C.navigator.scroll.dispatchEvent(new Event('scroll'));const scrolled=row.className;ev('pointercancel',100,120);return {start,scrolled,end:row.className}}''');check('folder.count-scroll-cancels', 'is-nav-trailing-touch-pressed' in d['start'] and 'is-nav-touch-dragged' in d['scrolled'] and 'is-nav-touch-dragged' not in d['end'], d)
   p.evaluate('''()=>{C.navigator.showResults(false)}''');p.wait_for_timeout(300)
   info=p.evaluate('''()=>({wrappers:document.querySelectorAll('.local-search-swipe-shell').length,bindings:document.querySelectorAll('.local-search-swipe-shell[_lsResultBinding]').length,page:C.navigator.page,results:C.fullResults?.length})''')
   print('SETUP RESULT',width,info,flush=True)
   for direc in ('right','left'):
    d=p.evaluate('''direction=>{const w=[...document.querySelectorAll('.local-search-swipe-shell')].find(x=>x._lsResultBinding);if(!w)return {error:'missing binding'};
     w._lsResultBinding.open(direction);
     const shelf=w.querySelector('.local-search-swipe-actions');const card=w.querySelector(':scope>.local-search-item');
     if(!shelf||!card)return {error:'missing shelf/card'};
     const sr=shelf.getBoundingClientRect(),cr=card.getBoundingClientRect();const bg=getComputedStyle(card);const pad=parseFloat(bg.paddingLeft);const items=[...shelf.querySelectorAll('button')];
     return {shelfLeft:sr.left,shelfRight:sr.right,shelfWidth:sr.width,cardLeft:cr.left,cardRight:cr.right,cardWidth:cr.width,pad,expectedLeft:cr.left+pad,expectedRight:cr.right-pad,buttons:items.length,edge:shelf.className,viewport:window.innerWidth}}''',direc)
    if 'error' in d:check('shelf.'+direc,False,d);continue
    expected=d['expectedLeft'] if direc=='right' else d['expectedRight'];got=d['shelfLeft'] if direc=='right' else d['shelfRight']
    passed=abs(expected-got)<1.2 and d['shelfLeft']>=d['expectedLeft']-1.2 and d['shelfRight']<=d['expectedRight']+1.2
    check('shelf.'+direc+'.inside-content-baseline',passed,{**d,'delta':got-expected})
   check('pageerrors',not err,err)
  except Exception as exc:
   check('error',False,str(exc))
  finally:ctx.close()
 browser.close()
report={'checks':checks,'passed':sum(c['passed'] for c in checks),'total':len(checks),'source':str(R)}
out=R/'reports/navigator-press-swipe-alignment-v1-browser.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2));print('TOTAL',report['passed'],report['total'],flush=True)
sys.exit(0 if all(c['passed'] for c in checks) else 1)
