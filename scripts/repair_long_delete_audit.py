from pathlib import Path
import os, json, shutil, sys, traceback
from playwright.sync_api import sync_playwright
from subprocess import run
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reports'/'repair-long-delete';OUT.mkdir(parents=True,exist_ok=True)
os.chdir(ROOT)
run(['node','--input-type=module','-e',"import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"],check=True,stdout=open(OUT/'prepare-long.log','w'))
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 for theme in ['light','dark']:
  for mobile in [False,True]:
   label=theme+'-'+('mobile' if mobile else 'desktop')
   ctx=b.new_context(viewport={'width':390 if mobile else 900,'height':844},is_mobile=mobile,has_touch=mobile)
   page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   row={'case':label}
   try:
    page.set_content(f'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="theme-{theme} '+('is-mobile is-ios' if mobile else '')+'"><div id="host" style="height:770px;width:100%;display:flex"></div></body></html>')
    for name in ['tests/browser-fixture.css','src/styles/styles.css']:page.add_style_tag(content=(ROOT/name).read_text())
    for name in ['tests/host.js','tests/browser-scenarios.js']:page.add_script_tag(content=(ROOT/name).read_text())
    page.evaluate(f'()=>bootFixture({str(mobile).lower()})')
    page.add_script_tag(content=(ROOT/'tests/generated/subject.cjs').read_text())
    page.evaluate('()=>startFixture()')
    page.evaluate('''async()=>{for(let i=0;i<38;i++)await H.app.vault.create(`资料/虚拟审计${String(i).padStart(3,'0')}.md`,'## 标题审计\\n'+('文本内容 '.repeat(4+i%7)));await P._flushIndexQueueNow(); C.performSearch('');}''')
    page.wait_for_timeout(250)
    row['initial_count']=page.evaluate('()=>C.fullResults.length')
    # multiple positions, including a mid-list delete and near the end.
    for iteration in range(3):
     snap=page.evaluate('''iter=>{const list=C.resultsContainer;list.scrollTop=(iter+1)*.23*Math.max(0,list.scrollHeight-list.clientHeight);list.dispatchEvent(new Event('scroll'));C.resultRenderer._syncWindowToViewport(list);const b=list.getBoundingClientRect();const visible=[...list.querySelectorAll('.local-search-item[data-path]')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>b.top+5&&r.top<b.bottom-5});return {candidate:visible[Math.floor(visible.length/2)]?.dataset.path,scrollTop:list.scrollTop,window:[C.resultRenderer.windowStart,C.resultRenderer.windowEnd],count:C.fullResults.length}}''',iteration)
     if not snap['candidate']:raise AssertionError(f'no visible candidate at iteration={iteration}: {snap}')
     page.evaluate('''path=>{window.pendingDelete=C.handleSwipeAction('delete',path,null)}''',snap['candidate'])
     page.wait_for_timeout(45)
     danger=page.locator('.local-search-action-danger').last
     if danger.count():danger.click()
     page.evaluate('()=>pendingDelete');page.evaluate('()=>P._flushIndexQueueNow()');page.wait_for_timeout(230)
     after=page.evaluate('''()=>{const list=C.resultsContainer;const b=list.getBoundingClientRect();const shell=[...list.querySelectorAll('.local-search-swipe-shell')];const visible=shell.map(e=>({p:e.dataset.path,r:e.getBoundingClientRect()})).filter(x=>x.r.bottom>b.top&&x.r.top<b.bottom);return{visible:visible.length,first:visible[0]?.p,last:visible.at(-1)?.p,virtual:[C.resultRenderer.windowStart,C.resultRenderer.windowEnd],rendered:shell.length,top:list.scrollTop,clientHeight:list.clientHeight,scrollHeight:list.scrollHeight,range:C.fullResults.length}}''')
     row[f'delete_{iteration}']={'before':snap,'after':after,'passed':(snap['candidate'] not in page.evaluate('()=>C.fullResults.map(x=>x.path)') and after['visible']>0 and after['range']==snap['count']-1)}
    row['pageerrors']=errors[:]
    page.screenshot(path=str(OUT/('long-'+label+'.png')),caret='initial')
    page.evaluate('()=>{C.destroy();P.onunload()}')
   except Exception as e:row['error']=str(e);row['trace']=traceback.format_exc()
   results.append(row);ctx.close()
 b.close()
(OUT/'long-results-swipe-delete.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
for r in results:print(r['case'],r.get('initial_count'),[(k,v['passed'],v['after']['visible']) for k,v in r.items() if k.startswith('delete_')],r.get('error'))
sys.exit(1 if any(r.get('error') or not all(x.get('passed') for k,x in r.items() if k.startswith('delete_')) for r in results) else 0)
