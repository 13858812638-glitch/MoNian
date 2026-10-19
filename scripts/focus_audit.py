"""Frozen modular.2 versus candidate: native tap + controlled viewport/native events.
This deliberately adds the actual Workspace capability omitted in the prior fixture.
It cannot validate iOS WebKit caret painting or a real software keyboard.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, shutil, sys, subprocess, traceback
root=Path(__file__).resolve().parent.parent;os.chdir(root)
out=root/'reports/focus';out.mkdir(parents=True,exist_ok=True)
subprocess.run(['node','--input-type=module','-e',"import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"],check=True,stdout=subprocess.DEVNULL)
rows=[];errors=[]
def record(side,theme,name,passed,evidence):
    rows.append(dict(side=side,theme=theme,case=name,passed=bool(passed),evidence=evidence))
    print(side,theme,name,'PASS' if passed else 'FAIL',flush=True)
with sync_playwright() as driver:
    browser=driver.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
    version=browser.version
    for dark in ([os.environ["FOCUS_THEME"] == "dark"] if os.environ.get("FOCUS_THEME") else [False,True]):
      theme='dark' if dark else 'light'
      for side in ['A','B']:
        context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='zh-CN')
        page=context.new_page();page_errors=[];page.on('pageerror',lambda e:page_errors.append(str(e)))
        try:
          page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="is-mobile theme-'+theme+'"><div id="host"></div></body></html>')
          for path in ['tests/browser-fixture.css','baseline/modular.3-styles.css' if side=='A' else 'src/styles/styles.css']:page.add_style_tag(content=(root/path).read_text())
          for path in ['tests/host.js','tests/browser-scenarios.js','tests/focus-scenarios.js']:page.add_script_tag(content=(root/path).read_text())
          page.evaluate('()=>{installFocusProbe();bootFixture(true)}')
          page.add_script_tag(content=(root/('baseline/modular.3-subject.cjs' if side=='A' else 'tests/generated/subject.cjs')).read_text())
          page.evaluate('()=>startFixture()');page.add_script_tag(content=(root/'tests/search-condition-scenarios.js').read_text())
          def fresh():page.evaluate('()=>freshFocusFixture()')
          def state():return page.evaluate('()=>inputEvidence(C.dropdown.panel?.querySelector(".local-search-picker-search")||C.searchInput)')
          def pause():page.wait_for_timeout(100)
          fresh();before=state();page.locator('.local-search-input:visible').tap();pause();after=state()
          record(side,theme,'native-main-focus-no-navigation-projection',after['metrics']['tools']==0 and after['metrics']['childChanges']==0 and not after['programmatic'],after)
          record(side,theme,'main-focus-does-not-lock-without-keyboard',not after['locked'] and not after['keyboard'],after)
          record(side,theme,'main-focus-stable-geometry-and-surface',before['box']==after['box'] and before['background']==after['background'] and before['parentBackground']==after['parentBackground'] and after['active'],{'before':before,'after':after})
          page.evaluate('()=>{resetFocusMetrics();C.navigator.resize();C.navigator.resize();}');pause();resized=state()
          record(side,theme,'same-width-host-resize-no-navigation-projection',resized['metrics']['tools']==0 and resized['metrics']['childChanges']==0,resized)
          page.evaluate('()=>{C.navigator.restore({navigationVersion:2,page:"filters",searchVisible:false});}')
          record(side,theme,'restore-at-same-width-still-projects-page',page.evaluate('()=>C.navigator.page==="filters"&&!C.navigator.facets.hidden&&C.navigator.main.hidden'),page.evaluate('()=>({page:C.navigator.page,facetsHidden:C.navigator.facets.hidden,resultsHidden:C.navigator.main.hidden})'))
          fresh();page.locator('.local-search-input:visible').tap();page.evaluate('()=>setTestKeyboard(334)');pause()
          page.evaluate('()=>auditOpenPicker("property-value")');pause();opened=state()
          record(side,theme,'new-picker-sees-already-open-keyboard-before-tap',opened['keyboard'] and float(opened['inset'].removesuffix('px') or '0')>0,opened)
          record(side,theme,'one-global-keyboard-subscription-for-two-surfaces',opened['globalKeyboardListeners']==7,opened)
          page.evaluate('resetFocusMetrics()');page.locator('.local-search-picker-search:visible').tap();pause();tapped=state()
          record(side,theme,'picker-native-handoff-keeps-input-and-keyboard',tapped['active'] and tapped['keyboard'] and not tapped['programmatic'] and opened['box']==tapped['box'],tapped)
          page.evaluate('()=>window.dispatchEvent(new Event("keyboardDidHide"))');pause();late=state()
          record(side,theme,'late-hide-does-not-override-visible-keyboard',late['keyboard'] and late['active'],late)
          page.locator('.local-search-picker-search:visible').press_sequentially('资料',delay=30);pause();typed=state()
          record(side,theme,'native-picker-text-and-collapsed-selection',typed['value']=='资料' and typed['selection']==[2,2] and typed['active'] and not typed['programmatic'],typed)
          page.screenshot(path=str(out/f'{theme}-{side}-keyboard-reuse.png'),caret='initial')
          page.evaluate('()=>setTestKeyboard(0)');pause();hidden=state()
          record(side,theme,'actual-keyboard-close-unlocks-even-if-input-still-focused',hidden['active'] and not hidden['locked'] and not hidden['keyboard'],hidden)
          for kind in ['folder','tags','property-key','property-value','create-folder','create-tags','create-property']:
            fresh();page.evaluate('kind=>auditOpenPicker(kind)',kind);pause();before=state();page.evaluate('resetFocusMetrics()')
            page.locator('.local-search-picker-search:visible').tap();pause();tapped=state()
            record(side,theme,'shared-search-touch-contract-'+kind,tapped['tapHighlight']=='rgba(0, 0, 0, 0)' and tapped['transition']=='0s' and tapped['transform']=='none',tapped)
            record(side,theme,'picker-focus-no-keyboard-no-frame-mutation-'+kind,tapped['active'] and not tapped['locked'] and not tapped['programmatic'] and before['box']==tapped['box'],tapped)
          fresh();page.locator('.local-search-input:visible').tap();page.evaluate('()=>setTestKeyboard(334,false,false)');pause();main=state()
          page.evaluate('()=>auditOpenPicker("tags")');pause();page.locator('.local-search-picker-search:visible').tap();pause();viewportOnly=state()
          record(side,theme,'viewport-alone-cannot-create-keyboard-state',not main['keyboard'] and not viewportOnly['keyboard'],{'main':main,'picker':viewportOnly})
          page.evaluate('()=>{C.dropdown.close(false);setTestKeyboard(0);}')
          # Composition does not cause a native focus handoff, including late hide signals.
          fresh();page.evaluate('()=>auditOpenPicker("property-value")');page.locator('.local-search-picker-search:visible').tap()
          page.evaluate('''()=>{resetFocusMetrics();window.imeInput=C.dropdown.panel.querySelector('.local-search-picker-search');imeInput.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));imeInput.value='卫';imeInput.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));setTestKeyboard(334);window.dispatchEvent(new Event('keyboardDidHide'));}''');pause()
          page.evaluate('''()=>{imeInput.value='卫康';imeInput.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'卫康'}));imeInput.dispatchEvent(new InputEvent('input',{bubbles:true}));imeInput.setSelectionRange(2,2);}''');pause();ime=state()
          record(side,theme,'composition-keeps-same-native-input',page.evaluate('()=>imeInput===C.dropdown.panel.querySelector(".local-search-picker-search")') and ime['active'] and ime['value']=='卫康' and not ime['programmatic'],ime)
          page.evaluate('()=>{focusObserver.disconnect();FC.destroy();C.destroy();P.onunload();}');pause()
          record(side,theme,'all-global-keyboard-listeners-released',page.evaluate('focusProbeListeners.length')==0,page.evaluate('()=>focusProbeListeners.map(x=>({type:x.type,target:x.target===window?"window":"viewport"}))'))
          if page_errors:errors.append({'side':side,'theme':theme,'errors':page_errors})
        except Exception as e:
          errors.append({'side':side,'theme':theme,'error':str(e)});traceback.print_exc()
          page.screenshot(path=str(out/f'{theme}-{side}-test-error.png'),caret='initial')
        finally:context.close()
    browser.close()
keys={(r['theme'],r['case']):{} for r in rows}
for r in rows:keys[r['theme'],r['case']][r['side']]=r['passed']
report={'baseline':'modular.3','candidate':json.loads((root/'package.json').read_text())['version'],'engine':'Chromium '+version,'nativeIOS':False,'nativeObsidian':False,'rows':rows,'passed':sum(r['side']=='B' and r['passed'] for r in rows),'failed':sum(r['side']=='B' and not r['passed'] for r in rows),'baselineFailToCandidatePass':sum(v.get('A') is False and v.get('B') is True for v in keys.values()),'errors':errors,'limitations':['Keyboard events, viewport and IME are controlled test signals, not real OS devices.','No iOS/WebKit caret-paint verification.','Theme uses controlled host CSS, not the user CSS snippets.']}
(out/('focus-results-'+os.environ['FOCUS_THEME']+'.json' if os.environ.get('FOCUS_THEME') else 'focus-results.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k not in ['rows']},ensure_ascii=False,indent=2))
sys.exit(1 if report['failed'] or errors else 0)
