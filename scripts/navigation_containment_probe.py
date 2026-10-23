"""Disposable layout containment experiment, never delivered as production CSS."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent;OUT=Path(os.environ.get('GLS_CONTAINMENT_OUT','/workspace/perf-audit-20261023/containment'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')};exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
report=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for trial,contain in enumerate([False,True,True,False]):
  ctx,p=scope['boot'](b,large=True);p.evaluate("document.querySelector('#host').style.width='714px';V.onResize()")
  if contain:p.add_style_tag(content='.local-search-navigator .local-search-nav-scroll { contain: layout paint; }')
  p.wait_for_timeout(200);cdp=ctx.new_cdp_session(p);cdp.send('Emulation.setCPUThrottlingRate',{'rate':4});trace=[];done=[]
  cdp.on('Tracing.dataCollected',lambda d:trace.extend(d['value']));cdp.on('Tracing.tracingComplete',lambda _:done.append(True))
  cdp.send('Tracing.start',{'categories':'devtools.timeline,blink.user_timing','transferMode':'ReportEvents'})
  p.evaluate("performance.mark('probe-start')");group=p.locator('[data-nav-section="folder"] > .local-search-nav-section-heading > .local-search-move-tree-toggle');box=group.bounding_box()
  for i in range(24):p.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
  p.wait_for_timeout(100);p.evaluate("performance.mark('probe-end')");cdp.send('Tracing.end')
  for i in range(200):
   if done:break
   p.wait_for_timeout(50)
  if not done:raise RuntimeError('Trace incomplete')
  marks={e['name']:e['ts'] for e in trace if e['name'] in ['probe-start','probe-end']};events=[e for e in trace if e.get('ph')=='X' and marks['probe-start']<=e['ts']<=marks['probe-end']]
  r={'trial':trial,'contain':contain,'stats':{},'rows':p.evaluate('C.navigator.scroll.querySelectorAll("[data-nav-id]").length')}
  for name in ['Layout','Paint','UpdateLayoutTree']:
   vals=[e.get('dur',0)/1000 for e in events if e['name']==name];r['stats'][name]={'count':len(vals),'totalMs':sum(vals),'maxMs':max(vals,default=0)}
  (OUT/f'{trial}-trace.json').write_text(json.dumps({'traceEvents':trace}));report.append(r);print(json.dumps(r),flush=True);p.evaluate('V.onClose()');ctx.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(report,indent=2)+'\n')
