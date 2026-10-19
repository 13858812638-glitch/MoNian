"""Regression oracles for the modular.4 focus repair, versus frozen modular.3.
Real production methods in Chromium; keyboard/IME/viewport inputs are controlled.
No claim of native iOS caret painting or actual Obsidian device acceptance.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, shutil, sys, subprocess, traceback
root = Path(__file__).resolve().parent.parent
os.chdir(root)
out = root/'reports/focus-repair'; out.mkdir(parents=True, exist_ok=True)
subprocess.run(['node','--input-type=module','-e',"import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"],check=True,stdout=subprocess.DEVNULL)
rows=[]; errors=[]
sides=os.environ.get('REPAIR_SIDES','A,B').split(',')
def record(side,theme,name,passed,evidence):
    row=dict(side=side,theme=theme,case=name,passed=bool(passed),evidence=evidence); rows.append(row)
    print(side,theme,name,'PASS' if passed else 'FAIL',flush=True)
with sync_playwright() as driver:
    browser=driver.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
    version=browser.version
    for theme in os.environ.get('REPAIR_THEMES','light,dark').split(','):
      for side in sides:
        context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='zh-CN')
        p=context.new_page(); p.set_default_timeout(5000); page_errors=[]
        p.on('pageerror',lambda e: page_errors.append(str(e)))
        try:
          p.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="is-mobile theme-'+theme+'"><div id="host"></div></body></html>')
          for path in ['tests/browser-fixture.css', 'baseline/modular.3-styles.css' if side=='A' else 'src/styles/styles.css']:p.add_style_tag(content=(root/path).read_text())
          for path in ['tests/host.js','tests/browser-scenarios.js','tests/focus-scenarios.js']:p.add_script_tag(content=(root/path).read_text())
          p.evaluate('()=>{installFocusProbe();bootFixture(true)}')
          p.add_script_tag(content=(root/('baseline/modular.3-subject.cjs' if side=='A' else 'tests/generated/subject.cjs')).read_text())
          p.evaluate('()=>startFixture()');p.add_script_tag(content=(root/'tests/search-condition-scenarios.js').read_text())
          def fresh():p.evaluate('()=>freshFocusFixture()')
          def pause():p.wait_for_timeout(95)
          def state():return p.evaluate('()=>inputEvidence(C.dropdown.panel?.querySelector(".local-search-picker-search")||C.searchInput)')
          def row(name,ok,ev):record(side,theme,name,ok,ev)
          fresh();p.locator('.local-search-input:visible').tap();pause()
          for px in [2,20,120,334]:
            p.evaluate('(px)=>setTestKeyboard(px,false,false)',px);pause();s=state()
            row('viewport-only-not-a-keyboard-signal-'+str(px),not s['keyboard'] and not s['locked'] and s['active'],s)
          p.evaluate('()=>C.searchInput.blur()');pause();s=state()
          row('no-self-latched-keyboard-after-blur',not s['locked'] and not s['keyboard'],s)
          fresh();p.locator('.local-search-input:visible').tap();p.evaluate('()=>setTestKeyboard(334)');pause()
          for kind in ['folder','tags','property-key','property-value','create-folder','create-tags','create-property']:
            fresh();p.locator('.local-search-input:visible').tap();p.evaluate('()=>{setTestKeyboard(334);resetFocusMetrics()}')
            p.evaluate('(kind)=>auditOpenPicker(kind)',kind);pause()
            e=p.evaluate('()=>({programmatic:programmaticFocus,mainFocused:document.activeElement===C.searchInput,picker:!!C.dropdown.panel})')
            row('open-does-not-programmatically-end-input-'+kind,not e['programmatic'] and e['mainFocused'] and e['picker'],e)
            p.evaluate('resetFocusMetrics()');p.locator('.local-search-picker-search:visible').tap();pause();s=state()
            row('native-input-handoff-'+kind,s['active'] and s['keyboard'] and not s['programmatic'],s)
            p.locator('.local-search-picker-search:visible').press_sequentially('资料',delay=10);pause();s=state()
            row('same-input-native-text-selection-'+kind,s['value']=='资料' and s['selection']==[2,2] and s['active'],s)
            # Exercise the actual SearchView callback, not only Navigator.resize.
            p.evaluate('resetFocusMetrics()')
            for i in range(3):
              p.evaluate('()=>S.SearchView.prototype.onResize.call({capabilities:FC,core:C,contentEl:C.containerEl})');pause()
            s=state();row('actual-sidebar-resize-no-popup-reflow-'+kind,s['metrics']['position']==0 and s['metrics']['tools']==0 and s['active'] and not s['programmatic'],s)
          # Touch/pen/mouse use the same existing focus guard, with no editable hit interception.
          fresh();p.evaluate('()=>auditOpenPicker("folder")');p.locator('.local-search-picker-search:visible').tap();pause()
          for typ in ['mouse','touch','pen']:
            e=p.evaluate('''typ=>{const panel=C.dropdown.panel,input=panel.querySelector('input'),button=panel.querySelector('.local-search-picker-title-icon-action'); const before=document.activeElement; const event=new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:typ,button:0});button.dispatchEvent(event); const edit=new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:typ,button:0});input.dispatchEvent(edit);return{buttonFound:!!button,prevented:event.defaultPrevented,inputPrevented:edit.defaultPrevented,active:document.activeElement===before};}''',typ)
            row('picker-shared-guard-'+typ,e['prevented'] and not e['inputPrevented'] and e['active'],e)
          # Multi-select toggles by genuine touch, search node must stay active and click fires.
          p.evaluate('()=>{window.keptInput=C.dropdown.panel.querySelector("input");resetFocusMetrics()}')
          p.locator('.local-search-dropdown button[aria-label="进入文件夹多选"]').tap();pause()
          mode=p.evaluate('()=>({active:document.activeElement===keptInput,multi:C.dropdown.panel.classList.contains("is-persistent-toggle"),programmatic:programmaticFocus})')
          row('native-touch-mode-keeps-edit-session',mode['active'] and mode['multi'] and not mode['programmatic'],mode)
          p.locator('.local-search-picker-search:visible').tap();p.evaluate('resetFocusMetrics()')
          p.locator('.local-search-dropdown .local-search-move-tree-row[data-sort-key="资料"] .local-search-move-tree-folder').tap();pause()
          e=p.evaluate('()=>({sameInput:keptInput===C.dropdown.panel?.querySelector("input"),active:document.activeElement===keptInput,selected:!!C.dropdown.panel.querySelector(".local-search-move-tree-row[data-sort-key=资料].is-selected"),draftOnly:C.filterState.folders.size===0,programmatic:programmaticFocus})')
          row('native-touch-multiselect-click-keeps-edit-session',e['sameInput'] and e['active'] and e['selected'] and e['draftOnly'] and not e['programmatic'],e)
          # Basic control guard never consumes editable, right-button or a drag-owned event.
          e=p.evaluate('''()=>{const panel=C.dropdown.panel,input=panel.querySelector('input'); const other=panel.querySelector('button');let ev=new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'mouse',button:2});other.dispatchEvent(ev);return{rightPrevented:ev.defaultPrevented};}''')
          row('right-button-not-intercepted',not e['rightPrevented'],e)
          # Existing parent/child stack and explicit dismissal: no hidden-input refocus.
          p.evaluate('''()=>{resetFocusMetrics();window.parentPanel=C.dropdown.panel;const anchor=parentPanel.querySelector('button');window.child=C.dropdown.openChild(anchor,'子级测试');S.createSharedPickerTreeShell(child,{placeholder:'搜索子级'});}''');pause()
          p.locator('.local-search-dropdown:not([hidden]) .local-search-picker-search').tap();pause()
          p.evaluate('()=>{resetFocusMetrics();C.dropdown._navigateBack(C.dropdown.panel)}');pause()
          e=p.evaluate('()=>({parent:C.dropdown.panel===parentPanel,visible:!parentPanel.hidden,programmatic:programmaticFocus})')
          row('child-back-keeps-parent-no-hidden-input-refocus',e['parent'] and e['visible'] and not e['programmatic'],e)
          # True keyboard signal -> present; genuine hide -> released even with focused input.
          fresh();p.evaluate('()=>auditOpenPicker("tags")');p.locator('.local-search-picker-search:visible').tap()
          p.evaluate('()=>setTestKeyboard(334)');pause();s=state();row('native-keyboard-frame-preserved',s['keyboard'] and s['locked'] and s['active'],s)
          p.evaluate('()=>window.dispatchEvent(new Event("keyboardDidHide"))');pause();s=state();row('host-height-still-protects-late-hide',s['keyboard'] and s['active'],s)
          p.evaluate('()=>setTestKeyboard(0)');pause();s=state();row('keyboard-hide-releases-focused-frame',not s['locked'] and not s['keyboard'] and s['active'],s)
          # First reveal is final geometry; repeated reposition without geometry change doesn't refresh the frame.
          p.evaluate('''()=>{window.frameRefreshes=0;const f=C.dropdown.panel[S.MOBILE_FRAME_OWNER], old=f.refresh;f.refresh=function(...args){frameRefreshes++;return old.apply(this,args)}; C.dropdown.reposition();C.dropdown.reposition();C.dropdown.reposition();}''');pause()
          count=p.evaluate('frameRefreshes');row('already-visible-reveal-no-second-frame-refresh',count==0,{'refreshes':count})
          # Keyboard accessibility remains explicit, not automatic on pointer opening.
          fresh();p.locator('.local-search-input:visible').tap();p.evaluate('()=>{C.searchInput.value="周报";C.searchInput.dispatchEvent(new InputEvent("input",{bubbles:true}))}');p.wait_for_timeout(200)
          p.evaluate('()=>{resetFocusMetrics();C.containerEl.querySelector("[data-ls-input-action=clear-input]").click()}');pause()
          e=p.evaluate('()=>({raw:C.queryState.raw,value:C.searchInput.value,active:document.activeElement===C.searchInput,programmatic:programmaticFocus})')
          row('explicit-eraser-still-finishes-editing',e['raw']=='' and e['value']=='' and not e['active'] and [x['action'] for x in e['programmatic']]==['blur'],e)
          # Full native-View lifecycle (using the mock host's actual ItemView base).
          # Unlike the historical omission, onOpen installs the production
          # SearchWorkspaceCapabilities before real onResize callbacks are tested.
          p.evaluate('''async()=>{focusObserver.disconnect();FC.destroy();C.destroy();document.querySelector('#host').remove();
            const leaf={app:H.app,detach(){this.detached=true;}};window.V=new S.SearchView(leaf,P);
            V.containerEl.style.cssText='width:390px;height:700px';V.contentEl.id='host';document.body.append(V.containerEl);
            await V.onOpen();window.C=V.core;window.FC=V.capabilities;C.navigator.showResults(false);await waitFixture(150);
            const pos=C.dropdown.reposition,tools=C.navigator._syncMobileTools;
            C.dropdown.reposition=function(...a){focusMetrics.position++;return pos.apply(this,a)};
            C.navigator._syncMobileTools=function(...a){focusMetrics.tools++;return tools.apply(this,a)};
            resetFocusMetrics();}''')
          p.locator('.local-search-input:visible').tap();p.evaluate('()=>setTestKeyboard(334)');pause()
          p.evaluate('()=>auditOpenPicker("folder")');p.locator('.local-search-picker-search:visible').tap();pause()
          p.evaluate('resetFocusMetrics()')
          for i in range(3):p.evaluate('()=>V.onResize()');pause()
          e=p.evaluate('()=>({nativeView:V.core===C,capability:V.capabilities===FC,legacyPreserveFrame:FC.mobileFrame?.options?.preserveFrame,sidebarHasNoKeyboardFrame:FC.mobileFrame===null,hasKeyboardClass:C.containerEl.classList.contains("is-ui-keyboard-open"),metrics:focusMetrics,inputFocused:document.activeElement===C.dropdown.panel.querySelector("input")})')
          frame_policy=(e['legacyPreserveFrame'] is False) if side=='A' else (e['sidebarHasNoKeyboardFrame'] and not e['hasKeyboardClass'])
          row('real-view-onOpen-to-onResize-zero-reflows',e['nativeView'] and e['capability'] and frame_policy and e['metrics']['position']==0 and e['metrics']['tools']==0 and e['inputFocused'],e)
          p.evaluate('''()=>{setTestKeyboard(0);}''');pause()
          p.evaluate('''()=>{resetFocusMetrics();V.contentEl.style.width='360px';V.onResize();}''');pause()
          e=p.evaluate('()=>({positions:focusMetrics.position,width:C.navigator.width,measured:C.containerEl.getBoundingClientRect().width})')
          row('real-width-change-still-repositions-once',e['positions']==1 and e['width']==e['measured']==360,e)
          p.evaluate('()=>{V.onClose();P.onunload()}');pause()
          n=p.evaluate('focusProbeListeners.length');row('teardown-releases-all-keyboard-listeners',n==0,{'remaining':n})
          if page_errors: errors.append(dict(side=side,theme=theme,errors=page_errors))
        except Exception as e:
          errors.append(dict(side=side,theme=theme,error=str(e)));traceback.print_exc()
          p.screenshot(path=str(out/f'{theme}-{side}-failure.png'),caret='initial')
        finally:context.close()
    browser.close()
report=dict(baseline='modular.3',candidate=json.loads((root/'package.json').read_text())['version'],engine='Chromium '+version,nativeIOS=False,nativeObsidian=False,rows=rows,errors=errors,passed=sum(r['side']=='B' and r['passed'] for r in rows),failed=sum(r['side']=='B' and not r['passed'] for r in rows))
label=os.environ.get('REPAIR_REPORT','results.json');(out/label).write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='rows'},ensure_ascii=False,indent=2))
sys.exit(1 if errors or report['failed'] else 0)
