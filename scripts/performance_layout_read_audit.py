"""Diagnostic only: attribute forced layout to getters; never use instrumented durations as latency."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent;OUT=Path(os.environ.get('GLS_LAYOUT_READ_OUT','/workspace/perf-audit-20261023/getters'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')};exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx,p=scope['boot'](b);p.wait_for_timeout(200)
 cdp=ctx.new_cdp_session(p);trace=[];done=[];cdp.on('Tracing.dataCollected',lambda d:trace.extend(d['value']));cdp.on('Tracing.tracingComplete',lambda _:done.append(True))
 p.evaluate('''()=>{
 window.getterSites={};window.undo=[];let serial=0;
 for(const [proto,names] of [[Element.prototype,['scrollTop','scrollHeight','clientHeight','clientWidth']],[HTMLElement.prototype,['offsetHeight','offsetWidth']]])for(const name of names){
  const desc=Object.getOwnPropertyDescriptor(proto,name);if(!desc?.get)continue;
  Object.defineProperty(proto,name,{...desc,get(){
   if(!C.containerEl.contains(this))return desc.get.call(this);
   const id=++serial;getterSites[id]={name,cls:this.className,stack:new Error().stack};performance.mark('getter-enter:'+id);
   try{return desc.get.call(this)}finally{performance.mark('getter-exit:'+id)}
  }});undo.push(()=>Object.defineProperty(proto,name,desc));
 }
 }''')
 cdp.send('Tracing.start',{'categories':'devtools.timeline,blink.user_timing','transferMode':'ReportEvents'})
 p.evaluate('''async()=>{for(let i=0;i<6;i++){C.navigator.select('folder','Folder00'+i);await waitFixture(60)}}''');cdp.send('Tracing.end')
 for _ in range(200):
  if done:break
  p.wait_for_timeout(50)
 if not done:raise RuntimeError("Trace incomplete")
 sites=p.evaluate('getterSites');starts={};spans=[]
 for e in sorted(trace,key=lambda x:x['ts']):
  n=e['name']
  if n.startswith('getter-enter:'):starts[n.split(':')[1]]=e['ts']
  if n.startswith('getter-exit:'):
   k=n.split(':')[1];spans.append((starts[k],e['ts'],k))
 layouts=[]
 for e in trace:
  if e['name']!='Layout' or e.get('ph')!='X':continue
  parents=[s for s in spans if s[0]<=e['ts'] and s[1]>=e['ts']+e.get('dur',0)]
  if parents:
   k=min(parents,key=lambda s:s[1]-s[0])[2];layouts.append(sites[k])
 (OUT/'results.json').write_text(json.dumps(layouts,ensure_ascii=False,indent=2));(OUT/'trace.json').write_text(json.dumps({'traceEvents':trace}));print(json.dumps(layouts,ensure_ascii=False,indent=2));p.evaluate('undo.forEach(f=>f());V.onClose()');ctx.close();b.close()
