"""Observe idle, adaptive resizing and retained DOM resources without runtime changes."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_PERF_LIFECYCLE_OUT','/workspace/perf-audit-20261023/lifecycle'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
setup=(ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0]
# The test host's historical events journal holds every callback after offref.
# Optional diagnostic control removes only journal references, never active listeners.
if os.environ.get('GLS_PERF_EVENT_JOURNAL') == 'metadata':
 setup=setup.replace("page.add_script_tag(content=(ROOT / filename).read_text())", "page.add_script_tag(content=(ROOT / filename).read_text().replace('events.push(ref)', 'events.push({label,name})') if filename == 'tests/host.js' else (ROOT / filename).read_text())")
exec(setup,scope)
report=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for mobile in [False,True]:
  ctx,p=scope['boot'](browser,mobile=mobile);cdp=ctx.new_cdp_session(p);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.wait_for_timeout(600)
  p.evaluate('''()=>{
   window.work={};for(const [o,prefix,names] of [[C,'core',['performSearch','_recomputeCurrentResults']],
    [C.navigator,'nav',['_renderProjection','resize']],
    [C.resultRenderer,'renderer',['renderPage','_handleRowResize','_handleViewportResize','_syncWindowToViewport','_buildResultItem']]])
    for(const name of names){const old=o[name];o[name]=function(...a){const k=prefix+'.'+name;work[k]=(work[k]||0)+1;return old.apply(this,a)}}
   window.domWrites=0;window.auditMo=new MutationObserver(r=>domWrites+=r.length);auditMo.observe(C.containerEl,{attributes:true,childList:true,characterData:true,subtree:true});
  }''')
  p.wait_for_timeout(1500);idle=p.evaluate('({work:{...work},domWrites})');p.evaluate('auditMo.disconnect();auditMo=null')
  resizing=[]
  if not mobile:
   for mode in ['stack','split']:
    p.evaluate('w=>{document.querySelector("#host").style.width=w+"px";V.onResize()}',360 if mode=='stack' else 900);p.wait_for_timeout(250)
    p.evaluate('work={}');box=p.locator('.local-search-nav-divider').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
    p.mouse.move(x,y);p.mouse.down()
    p.mouse.move(x+(90 if mode=='split' else 0),y+(90 if mode=='stack' else 0),steps=20);p.mouse.up();p.wait_for_timeout(300)
    resizing.append({'layout':mode,'work':p.evaluate('work'),'resultCount':p.evaluate('C.fullResults.length')})
  # Close/remove the fixture view and strong global references; retain the one plugin.
  p.evaluate('V.onClose();V.containerEl.remove();V=null;C=null');p.wait_for_timeout(300)
  samples=[]
  for i in range(7):
   cdp.send('HeapProfiler.collectGarbage');samples.append({**cdp.send('Memory.getDOMCounters'),'hostActiveListeners':p.evaluate('H.activeListeners()'),'activeCores':p.evaluate('P.activeSearchCores.size')})
   if i==6:break
   p.evaluate('''async()=>{
    window.V=new S.SearchView({app:H.app},P);document.querySelector('#host').append(V.containerEl);
    V.containerEl.style.height='100%';V.contentEl.style.height='100%';await V.onOpen();window.C=V.core;await waitFixture(200);
    C.navigator.sections.get('folder').chevron.click();C.navigator.sections.get('folder').chevron.click();
    V.onClose();V.containerEl.remove();V=null;C=null;
   }''');p.wait_for_timeout(300)
  report.append({'mobile':mobile,'idle1500ms':idle,'resizing':resizing,'closedDOMAfterGC':samples,'pageErrors':errors})
  ctx.close()
 browser.close()
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
assert all(not r['pageErrors'] for r in report)
