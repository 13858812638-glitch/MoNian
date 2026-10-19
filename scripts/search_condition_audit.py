"""Same inputs on frozen modular.1 and modular.2, with independent acceptance oracles.
Caret checks are Chromium focus/selection/style/hit-testing, not native iOS verification.
"""
from pathlib import Path
import os,sys,json,shutil,subprocess,traceback
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;os.chdir(root)
out=root/'reports/current/acceptance';out.mkdir(parents=True,exist_ok=True)
if not os.environ.get('SKIP_PREPARE'): subprocess.run(['node','--input-type=module','-e',"import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"],check=True,stdout=subprocess.DEVNULL)
results=[];errors=[]
with sync_playwright() as driver:
 executable=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
 browser=driver.chromium.launch(**({'executable_path':executable} if executable else {}),headless=True,args=['--no-sandbox'])
 version=browser.version
 for mobile,dark in [(False,False),(True,False),(False,True),(True,True)]:
  label=('mobile' if mobile else 'desktop')+('-dark' if dark else '-light')
  if os.environ.get("TEST_CONFIG") and os.environ["TEST_CONFIG"] != label: continue
  for side in ['A','B']:
   context=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,locale='zh-CN',timezone_id='Asia/Taipei')
   page=context.new_page();page_errors=[];page.on('pageerror',lambda e:page_errors.append(str(e)))
   try:
    page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'"><div id="host"></div></body></html>')
    page.add_style_tag(content=(root/'tests/browser-fixture.css').read_text())
    page.add_style_tag(content=(root/('baseline/modular.2-styles.css' if side=='A' else 'src/styles/styles.css')).read_text())
    page.add_script_tag(content=(root/'tests/host.js').read_text());page.add_script_tag(content=(root/'tests/browser-scenarios.js').read_text())
    page.evaluate('m=>bootFixture(m)',mobile)
    page.add_script_tag(content=(root/('baseline/modular.2-subject.cjs' if side=='A' else 'tests/generated/subject.cjs')).read_text())
    page.evaluate('()=>startFixture()');page.add_script_tag(content=(root/'tests/search-condition-scenarios.js').read_text())
    for name in page.evaluate('Object.keys(auditCases)'):
     try:
      page.evaluate('()=>auditFresh()')
      value=page.evaluate('name=>Promise.race([auditCases[name](),waitFixture(8000).then(()=>{throw Error("timeout")})])',name)
      row={'configuration':label,'side':side,'case':name,'pass':bool(value['pass']),'evidence':value.get('evidence')}
      results.append(row);print(label,side,name,row['pass'],flush=True)
     except Exception as e:
      errors.append({'configuration':label,'side':side,'case':name,'error':str(e)});print('ERROR',errors[-1],flush=True)
    for scenario in [(kind,focused) for focused in [False,True] for kind in ['folder','tags','property-key','property-value','create-folder','create-tags','create-property']]:
     kind,pre_focused=scenario
     try:
      page.evaluate('()=>auditFresh()')
      if pre_focused:
       main=page.locator('.local-search-input:visible').first
       if mobile:main.tap(timeout=2500)
       else:main.click(timeout=2500)
       main.press_sequentially('周报',delay=20)
      page.evaluate('k=>auditOpenPicker(k)',kind)
      el=page.locator('.local-search-picker-search:visible').last
      if mobile:el.tap(timeout=2500)
      else:el.click(timeout=2500)
      el.press_sequentially('资料',delay=30);page.wait_for_timeout(150)
      value=el.evaluate('''e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{active:e.ownerDocument.activeElement===e,start:e.selectionStart,end:e.selectionEnd,value:e.value,readonly:e.readOnly,disabled:e.disabled,caret:s.caretColor,text:s.color,font:s.fontSize,select:s.userSelect,opacity:s.opacity,height:r.height,hit:e.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e,connected:e.isConnected}}''')
      passed=value['active'] and value['start']==value['end']==2 and value['hit'] and not value['readonly'] and not value['disabled'] and value['caret'] not in ['transparent','rgba(0, 0, 0, 0)']
      row={'configuration':label,'side':side,'case':('focused-main-to-picker-' if pre_focused else 'native-click-caret-')+kind,'pass':passed,'evidence':value};results.append(row);print(label,side,row['case'],passed,flush=True)
      if not pre_focused and kind in ['folder','property-key']:
       page.screenshot(path=str(out/f'{label}-{side}-caret-{kind}.png'),caret='initial')
      # Real keyboard event after typing; tests outside-click/lifecycle release, no programmatic focus.
      el.press('Escape');page.wait_for_timeout(60)
     except Exception as e:
      errors.append({'configuration':label,'side':side,'case':('focused-main-to-picker-' if pre_focused else 'native-click-caret-')+kind,'error':str(e)});print('ERROR',errors[-1],flush=True)
    if page_errors:errors.append({'configuration':label,'side':side,'case':'uncaught-page-errors','errors':page_errors})
    page.evaluate('()=>{C.destroy();P.onunload();}')
   except Exception as e:errors.append({'configuration':label,'side':side,'case':'setup','error':str(e)});traceback.print_exc()
   finally:context.close()
 browser.close()
by_key={}
for row in results:by_key.setdefault((row['configuration'],row['case']),{})[row['side']]=row
comparisons=[{'configuration':k[0],'case':k[1],'A':v.get('A',{}).get('pass'),'B':v.get('B',{}).get('pass'),'fixed':v.get('A',{}).get('pass') is False and v.get('B',{}).get('pass') is True} for k,v in by_key.items()]
report={'engine':'Chromium '+version,'nativeObsidian':False,'baseline':'frozen modular.2 subject and stylesheet','results':results,'comparisons':comparisons,'Bpassed':sum(r['side']=='B' and r['pass'] for r in results),'Bfailed':sum(r['side']=='B' and not r['pass'] for r in results),'reproducedAndFixed':sum(r['fixed'] for r in comparisons),'errors':errors,'limitations':['Four configurations include repeated tests of the same paths','No native iOS/Android/WebKit or real Obsidian','CSS/native-caret paint not proven by computed color alone','No user theme, CSS snippets or live data provided']}
(root/('reports/current/search-condition-results-'+os.environ['TEST_CONFIG']+'.json' if os.environ.get('TEST_CONFIG') else 'reports/current/search-condition-results.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:report[k] for k in ['Bpassed','Bfailed','reproducedAndFixed','errors']},ensure_ascii=False,indent=2))
sys.exit(1 if report['Bfailed'] or errors else 0)
