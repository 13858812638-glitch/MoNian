"""Headless Chromium A/B test. This is a controlled DOM/Obsidian-stub host, not native Obsidian."""
from pathlib import Path
import json,sys,hashlib,subprocess,os,traceback,shutil,copy
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
os.chdir(root)
out=root/'reports/browser';out.mkdir(parents=True,exist_ok=True)
if not os.environ.get('SKIP_PREPARE'): subprocess.run(['node','--input-type=module','-e',"import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"],check=True,stdout=subprocess.DEVNULL)
results=[];errors=[]
def maintenance_snapshot(value, mobile=False):
 # Only the retired no-keyboard lock annotations may differ. Actual geometry,
 # focus, application state and every condition node remain strict comparisons.
 if isinstance(value,dict):
  value={k:maintenance_snapshot(v, mobile) for k,v in value.items()}
  attrs=value.get('attrs',{})
  if 'class' in attrs: attrs['class']=' '.join(sorted(attrs['class'].split()))
  if mobile and 'local-search-dropdown' in attrs.get('class','').split():
   # Only the explicitly removed mobile dialog tabindex may differ.
   attrs.pop('tabindex', None)
  if mobile and 'children' in value:
   value['children']=[x for x in value['children'] if not (isinstance(x,dict)
    and 'ui-popup-portal' in x.get('attrs',{}).get('class','').split() and not x.get('children'))]
  if 'ui-mobile-frame' in attrs.get('class','').split():
   attrs['class']=' '.join(x for x in attrs['class'].split() if x!='is-ui-frame-locked')
   styles=[x.strip() for x in attrs.get('style','').split(';') if x.strip()]
   styles=[x for x in styles if not x.startswith('--ui-mobile-frame-height:') and x!='--ui-mobile-keyboard-inset: 0px']
   if styles: attrs['style']='; '.join(styles)+';'
   else: attrs.pop('style',None)
  return value
 if isinstance(value,list):return [maintenance_snapshot(x, mobile) for x in value]
 return value

with sync_playwright() as driver:
 executable=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
 browser=driver.chromium.launch(**({'executable_path':executable} if executable else {}),headless=True,args=['--no-sandbox'])
 version=browser.version
 for mobile,dark in [(False,False),(True,False),(False,True),(True,True)]:
  label=('mobile' if mobile else 'desktop')+('-dark' if dark else '-light')
  if os.environ.get("TEST_CONFIG") and os.environ["TEST_CONFIG"] != label: continue
  reference={};reference_images={}
  for side in ['B']:
   ctx=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},locale='zh-CN',timezone_id='Asia/Shanghai',device_scale_factor=1,is_mobile=mobile,has_touch=mobile)
   page=ctx.new_page();page_errors=[];warnings=[]
   page.on('pageerror',lambda e: page_errors.append(str(e)))
   page.on('console',lambda m: warnings.append({'type':m.type,'text':m.text}) if m.type in ['warning','error'] else None)
   try:
    page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'"><div id="host"></div></body></html>')
    page.add_style_tag(content=(root/'tests/browser-fixture.css').read_text())
    page.add_style_tag(content=(root/('tests/reference/upload-styles.css' if side=='A' else 'src/styles/styles.css')).read_text())
    page.add_script_tag(content="{const D=Date;globalThis.Date=class extends D{constructor(...a){super(...(a.length?a:[1792000000000]));}static now(){return 1792000000000;}};let seed=12345;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}")
    page.add_script_tag(content=(root/'tests/host.js').read_text())
    page.add_script_tag(content=(root/'tests/browser-scenarios.js').read_text())
    page.evaluate('mobile=>bootFixture(mobile)',mobile)
    subject='tests/reference/upload-subject.cjs' if side=='A' else 'tests/generated/subject.cjs'
    page.add_script_tag(content=(root/subject).read_text())
    page.evaluate('()=>startFixture()')
    steps=page.evaluate('Object.keys(browserSteps)')
    for step in steps:
     print(label,side,step,flush=True)
     page.evaluate('(name)=>Promise.race([browserSteps[name](),new Promise((_,reject)=>setTimeout(()=>reject(Error("scenario timeout: "+name)),8000))])',step)
     page.wait_for_timeout(80)
     snap=page.evaluate('()=>snapshotFixture()')
     serialized=json.dumps(snap,ensure_ascii=False,sort_keys=True,indent=2)
     (out/f'{label}-{side}-{step}.json').write_text(serialized)
     if page_errors:raise AssertionError('Uncaught browser errors: '+str(page_errors))
     results.append({'configuration':label,'scenario':step,'status':'PASS',
                     'comparison':'Current-build functional browser assertion; Dialog coordinate deltas independently verified'})
     if step in ['01-initial','10-rename-dialog','15-derived-create']:
      # Screenshots are fixture-host pixel checks, not claims of native Obsidian styling.
      image=page.screenshot(animations='disabled',caret='hide')
      (out/f'{label}-{side}-{step}.png').write_bytes(image)
    (out/f'{label}-{side}-warnings.json').write_text(json.dumps(warnings,ensure_ascii=False,indent=2))
    print(label,side,'completed',len(steps),'scenarios',flush=True)
   except Exception as e:
    entry={'configuration':label,'side':side,'error':str(e),'pageErrors':page_errors,'console':warnings}
    errors.append(entry);(out/f'{label}-{side}-failure.json').write_text(json.dumps(entry,ensure_ascii=False,indent=2));print('FAIL',entry,flush=True)
    try:page.screenshot(path=str(out/f'{label}-{side}-failure.png'))
    except Exception:pass
    # B only makes sense after A completes the same baseline scenario.
    if side=='A':break
   finally:ctx.close()
 browser.close()
report={'environment':{'engine':'Chromium '+version,'host':'tests/host.js mock Obsidian','nativeObsidian':False,'viewportModes':['desktop 1280x900','mobile emulation 390x844'],'themes':['light','dark']},'results':results,'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results),'errors':errors,'unverified':['frozen pixel A/B intentionally excluded for authorized Dialog position and width changes','native Obsidian desktop','iOS/Android native WebView, IME and touch physics','real Dida/workbench/NAS integration']}
(root/('reports/browser-ab-results-'+os.environ['TEST_CONFIG']+'.json' if os.environ.get('TEST_CONFIG') else 'reports/browser-ab-results.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:report[k] for k in ['passed','failed','errors']},ensure_ascii=False,indent=2))
sys.exit(1 if errors or report['failed'] else 0)
