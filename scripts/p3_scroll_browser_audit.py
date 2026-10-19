"""P3 real Chromium mock-host scroll and teardown audit, not native iPhone."""
from pathlib import Path
import os, subprocess, json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
os.chdir(root)
subprocess.run(['node','--input-type=module','-e',"import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"],check=True,stdout=subprocess.DEVNULL)
rows=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for mobile in (False,True):
  ctx=browser.new_context(viewport={'width':390 if mobile else 1150,'height':844},is_mobile=mobile,has_touch=mobile)
  p=ctx.new_page();errors=[];p.on('pageerror',lambda err:errors.append(str(err)))
  p.set_content('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body class="theme-light '+('is-mobile is-phone is-ios' if mobile else '')+'"><div class="workspace-drawer"><div id="leaf"></div></div><div id="host"></div></body>')
  p.add_style_tag(content='#leaf{width:100%;height:740px;display:flex;flex-direction:column}#leaf .view-content{flex:1;min-height:0}')
  for f in ('tests/browser-fixture.css','src/styles/styles.css'):p.add_style_tag(content=(root/f).read_text())
  for f in ('tests/host.js','tests/browser-scenarios.js'):p.add_script_tag(content=(root/f).read_text())
  p.evaluate('(mobile)=>bootFixture(mobile)',mobile)
  p.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
  p.evaluate('''async()=>{
    window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);await P.onload();await H.layoutReady();await P._flushIndexQueueNow();
    window.layoutRequests=0;H.app.workspace.requestSaveLayout=()=>layoutRequests++;
    const leaf={app:H.app,parent:H.app.workspace.leftSplit,detach(){}};
    window.V=new S.SearchView(leaf,P);document.querySelector('#leaf').append(V.containerEl);
    V.containerEl.style.cssText='height:100%;width:100%;display:flex;flex-direction:column';
    await V.onOpen();window.C=V.core;
    const s=C.navigator.scroll;s.style.cssText='height:150px;max-height:150px;overflow:auto';
    const filler=document.createElement('div');filler.style.height='2000px';s.append(filler);s.scrollTop=0;
  }''')
  data=p.evaluate('''async()=>{
    const nav=C.navigator,s=nav.scroll;layoutRequests=0;
    for(let i=1;i<=120;i++){s.scrollTop=i;s.dispatchEvent(new Event('scroll'));}
    const immediate=layoutRequests,live=nav.capture().scrollTop;
    await new Promise(r=>setTimeout(r,440));
    const settled=layoutRequests,pending=nav._scrollStateTimer;
    for(let i=121;i<=124;i++){s.scrollTop=i;s.dispatchEvent(new Event('scroll'));}
    const final=nav.capture().scrollTop,beforeClose=nav._scrollStateTimer!=null;
    V.onClose();const afterClose=nav._scrollStateTimer;
    const stored=V._state.session.navigator.scrollTop,requests=layoutRequests;
    await new Promise(r=>setTimeout(r,240));
    return {immediate,live,settled,pending,final,beforeClose,afterClose,stored,requests,later:layoutRequests};
  }''')
  ok=1<=data['immediate']<=3 and data['live']==120 and data['settled']<=4 and data['pending'] is None and data['final']==124 and data['beforeClose'] and data['afterClose'] is None and data['stored']==124 and data['requests']==data['later'] and not errors
  rows.append({'mobileEmulation':mobile,'ok':ok,'data':data,'errors':errors});print('mobile' if mobile else 'desktop', 'PASS' if ok else 'FAIL', data,flush=True)
  ctx.close()
 browser.close()
report={'browser':'Chromium','nativeIOS':False,'results':rows,'passed':sum(r['ok'] for r in rows),'failed':sum(not r['ok'] for r in rows)}
(root/'reports/p3-scroll-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
raise SystemExit(bool(report['failed']))
