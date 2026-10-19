"""Read-only B-only functional regression against frozen formal GLS source.
Runs original browserSteps against the current v5.2 build, without obsolete A snapshot parity.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,subprocess,sys,shutil
here=Path(__file__).resolve().parent
root=Path(os.environ.get('GLS_SOURCE_ROOT',here.parent)).resolve()
results=[]
with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for mobile in [True,False]:
    ctx=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},locale='zh-CN',timezone_id='Asia/Shanghai',device_scale_factor=1,is_mobile=mobile,has_touch=mobile)
    pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile ' if mobile else '')+'theme-light"><div id="host"></div></body></html>')
    pg.add_style_tag(content=(root/'tests/browser-fixture.css').read_text())
    pg.add_style_tag(content=(root/'src/styles/styles.css').read_text())
    pg.add_script_tag(content="{const D=Date;globalThis.Date=class extends D{constructor(...a){super(...(a.length?a:[1792000000000]));}static now(){return 1792000000000;}};let seed=12345;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}")
    pg.add_script_tag(content=(root/'tests/host.js').read_text())
    pg.add_script_tag(content=(root/'tests/browser-scenarios.js').read_text())
    pg.evaluate('mobile=>bootFixture(mobile)',mobile)
    pg.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
    pg.evaluate('()=>startFixture()')
    for step in pg.evaluate('Object.keys(browserSteps)'):
      try:
        pg.evaluate('(name)=>Promise.race([browserSteps[name](),new Promise((_,reject)=>setTimeout(()=>reject(Error("scenario timeout: "+name)),8000))])',step)
        pg.wait_for_timeout(80)
        if errs: raise AssertionError('pageerrors: '+str(errs))
        results.append({'mobile':mobile,'step':step,'status':'PASS'})
        print('PASS',('mobile' if mobile else 'desktop'),step,flush=True)
      except Exception as e:
        results.append({'mobile':mobile,'step':step,'status':'FAIL','error':str(e)})
        print('FAIL',('mobile' if mobile else 'desktop'),step,e,flush=True)
        break
    ctx.close()
  version=browser.version;browser.close()
r={'engine':'Chromium '+version,'host':'mock Obsidian','modes':['mobile-light','desktop-light'],'results':results,'passed':len([v for v in results if v['status']=='PASS']),'failed':len([v for v in results if v['status']=='FAIL'])}
(here/'current-version-b-only-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print('SUMMARY',r['passed'],r['failed'],flush=True)
sys.exit(1 if r['failed'] else 0)
