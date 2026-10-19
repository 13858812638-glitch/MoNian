from pathlib import Path
from playwright.sync_api import sync_playwright
import json, traceback, os, shutil
G=Path(__file__).resolve().parent.parent;F=G/'tests/reference/feishu-7.6.5';B=G/'reports/focus-repair';B.mkdir(parents=True,exist_ok=True)
rows=[];errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
 version=browser.version
 ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='zh-CN')
 p=ctx.new_page();p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)))
 p.set_content('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="is-mobile theme-dark"><div id="host"></div></body></html>')
 for path in [G/'tests/browser-fixture.css',G/'src/styles/styles.css',F/'replace/styles.css']:p.add_style_tag(content=path.read_text())
 for name in ['host.js','browser-scenarios.js','focus-scenarios.js']:p.add_script_tag(content=(G/'tests'/name).read_text())
 p.evaluate('()=>{installFocusProbe();bootFixture(true)}')
 p.add_script_tag(content=(G/'tests/generated/subject.cjs').read_text())
 p.evaluate('()=>startFixture()')
 p.add_script_tag(content=(G/'tests/search-condition-scenarios.js').read_text())
 p.evaluate('()=>{window.exports=window.module.exports;}')
 p.add_script_tag(content=(F/'replace/main.js').read_text()+ '\nwindow.FT={TaskCenterPopupModule,TaskCenterPickerPrimitiveModule,TaskCenterShellModule,TaskCenterWindowModule,bindDidaMobileFrame,createDidaInput};')
 print('FEISHU_LOAD',p.evaluate('typeof window.FT'),errors,flush=True)
 p.evaluate('()=>freshFocusFixture()')
 p.locator('.local-search-input:visible').tap();p.wait_for_timeout(100)
 rows.append({'case':'GLS-main-native-tap-no-keyboard','evidence':p.evaluate('()=>inputEvidence(C.searchInput)')})
 p.evaluate('()=>{resetFocusMetrics();setTestKeyboard(2,false,false)}');p.wait_for_timeout(120)
 rows.append({'case':'GLS-2px-viewport-reduction-without-keyboard-events-or-css','evidence':p.evaluate('()=>inputEvidence(C.searchInput)')})
 p.evaluate('()=>{C.searchInput.blur()}');p.wait_for_timeout(120)
 rows.append({'case':'GLS-after-blur-still-2px-reduced','evidence':p.evaluate('()=>inputEvidence(C.searchInput)')})
 p.evaluate('()=>freshFocusFixture()');p.locator('.local-search-input:visible').tap();p.wait_for_timeout(60)
 p.evaluate('()=>{resetFocusMetrics();C.facets.showFolderDropdown({anchor:C.navigator.tools.get("filters").button})}');p.wait_for_timeout(180)
 rows.append({'case':'GLS-production-folder-picker-open-from-focused-main','evidence':p.evaluate('()=>({programmatic:programmaticFocus,mainFocused:document.activeElement===C.searchInput,activeClass:document.activeElement.className,picker:!!C.dropdown.panel})')})
 # Exercise the real ItemView resize entry, not just Navigator.resize().
 p.locator('.local-search-move-search-wrap input:visible').tap();p.wait_for_timeout(80)
 p.evaluate('()=>setTestKeyboard(334)');p.wait_for_timeout(120)
 p.evaluate('()=>resetFocusMetrics()')
 for _ in range(3):
  p.evaluate('()=>S.SearchView.prototype.onResize.call({capabilities:FC,core:C,contentEl:C.containerEl})');p.wait_for_timeout(70)
 rows.append({'case':'GLS-actual-SearchView-onResize-three-times-during-keyboard','evidence':p.evaluate('()=>({calls:3,rootLockedClass:C.containerEl.classList.contains("is-ui-frame-locked"),rootKeyboardClass:C.containerEl.classList.contains("is-ui-keyboard-open"),controllerMounted:!!FC.mobileFrame,controllerLocked:FC.mobileFrame?.locked ?? false,preserveFrame:FC.mobileFrame?.options?.preserveFrame ?? null,popupRepositions:focusMetrics.position,toolbarUpdates:focusMetrics.tools})')})
 p.evaluate('()=>{FC.destroy();C.destroy();setTestKeyboard(0);document.querySelector("#host").remove();}')
 p.evaluate('''()=>{
 const root=document.body.createDiv({cls:'dida-bridge-content dida-bridge-task-center',attr:{id:'task-host'}});
 root.style.height='650px';root.style.width='390px';
 const wrap=root.createDiv({cls:'dida-bridge-input-wrap'});
 const field=wrap.createDiv({cls:'dida-bridge-search-text-field'});
 window.taskInput=FT.createDidaInput(field,'input',{cls:'dida-bridge-input',type:'text'});
 window.taskAnchor=root.createEl('button',{text:'清单',attr:{id:'task-anchor'}});
 const plugin={app:H.app,swipeBack:P.swipeBack};
 window.TO=Object.assign({app:H.app,plugin,hostEl:root,contentEl:root,host:{kind:'modal'},state:{popup:{},host:{}},hasPendingSubmission:()=>false,isCreateView:()=>false},FT.TaskCenterPopupModule);
 TO.createPickerHeader=FT.TaskCenterPickerPrimitiveModule.createPickerHeader;
 window.TRoot=root;
}''')
 p.locator('.dida-bridge-input').tap();p.wait_for_timeout(60)
 p.evaluate('''()=>{programmaticFocus=[];window.taskPanel=TO.togglePopup(taskAnchor,'清单','dida-bridge-list-filter-popup');window.taskSearch=FT.TaskCenterPickerPrimitiveModule.createPickerSearch(taskPanel,'搜索清单');TO.queuePopupLayout(taskPanel)}''');p.wait_for_timeout(180)
 rows.append({'case':'Feishu765-production-popup-open-from-focused-main-no-GLS-provider','evidence':p.evaluate('()=>({programmatic:programmaticFocus,mainFocused:document.activeElement===taskInput,activeClass:document.activeElement.className,picker:!!taskPanel,frameBound:!!taskPanel[S.MOBILE_FRAME_OWNER]})')})
 p.locator('.dida-bridge-tag-search').tap();p.wait_for_timeout(100)
 rows.append({'case':'Feishu765-picker-tap-no-GLS-provider','evidence':p.evaluate('()=>({active:document.activeElement===taskSearch,caret:getComputedStyle(taskSearch).caretColor,font:getComputedStyle(taskSearch).fontSize,frameBound:!!taskPanel[S.MOBILE_FRAME_OWNER],programmatic:programmaticFocus})')})
 p.evaluate('''()=>{TO.closePopup();H.app.plugins.plugins['local-search']=P;}''');p.wait_for_timeout(50)
 p.locator('.dida-bridge-input').tap();p.wait_for_timeout(60)
 p.evaluate('''()=>{programmaticFocus=[];window.taskPanel=TO.togglePopup(taskAnchor,'清单','dida-bridge-list-filter-popup');window.taskSearch=FT.TaskCenterPickerPrimitiveModule.createPickerSearch(taskPanel,'搜索清单');TO.queuePopupLayout(taskPanel)}''');p.wait_for_timeout(180)
 rows.append({'case':'Feishu765-production-popup-open-from-focused-main-with-GLS-provider','evidence':p.evaluate('()=>({programmatic:programmaticFocus,mainFocused:document.activeElement===taskInput,frameBound:!!taskPanel[S.MOBILE_FRAME_OWNER]})')})
 p.locator('.dida-bridge-tag-search').tap();p.wait_for_timeout(60)
 p.evaluate('()=>{setTestKeyboard(2,false,false)}');p.wait_for_timeout(120)
 rows.append({'case':'Feishu765-GLS-provider-bound-2px-resize','evidence':p.evaluate('()=>({active:document.activeElement===taskSearch,frameBound:!!taskPanel[S.MOBILE_FRAME_OWNER],locked:taskPanel.classList.contains("is-ui-frame-locked"),keyboard:taskPanel.classList.contains("is-ui-keyboard-open"),height:taskPanel.style.getPropertyValue("--ui-mobile-frame-height")})')})
 # Repeat height-lock writes with unchanged values, using the actual shared controller.
 p.evaluate('()=>{setTestKeyboard(334);window.classMutations=[];window.mo=new MutationObserver(rs=>classMutations.push(...rs.map(r=>({className:r.target.className,attribute:r.attributeName}))));mo.observe(taskPanel,{attributes:true,subtree:true});}');p.wait_for_timeout(80)
 p.evaluate('()=>{classMutations=[];taskSearch.dispatchEvent(new InputEvent("input",{bubbles:true,data:"a"}))}');p.wait_for_timeout(100)
 rows.append({'case':'Feishu765-shared-frame-input-event-attribute-mutations','evidence':p.evaluate('()=>({mutations:classMutations})')})
 p.evaluate('''()=>{mo.disconnect();TO.closePopup();setTestKeyboard(0);TO.host.kind='tab';TO.state.window={};TO.controllers={detail:{session:{}}};Object.assign(TO,FT.TaskCenterWindowModule);TO.setupMobileViewport()}''');p.wait_for_timeout(100)
 p.locator('.dida-bridge-input').tap();p.wait_for_timeout(50)
 p.evaluate('()=>setTestKeyboard(334)');p.wait_for_timeout(120)
 p.evaluate('''()=>{window.taskPanel=TO.togglePopup(taskAnchor,'清单','dida-bridge-list-filter-popup');window.taskSearch=FT.TaskCenterPickerPrimitiveModule.createPickerSearch(taskPanel,'搜索清单');TO.queuePopupLayout(taskPanel)}''');p.wait_for_timeout(200)
 p.evaluate('''()=>{window.taskLayoutCalls=0;const original=TO.positionPopup;TO.positionPopup=function(...args){taskLayoutCalls++;return original.apply(this,args)}}''')
 for _ in range(3):
  p.evaluate('()=>TO.handleHostResize()');p.wait_for_timeout(70)
 rows.append({'case':'Feishu765-actual-tab-handleHostResize-three-times-during-keyboard','evidence':p.evaluate('()=>({calls:3,rootLockedClass:TRoot.classList.contains("is-ui-frame-locked"),rootKeyboardClass:TRoot.classList.contains("is-ui-keyboard-open"),popupRepositions:taskLayoutCalls})')})
 p.evaluate('()=>{TO.teardownMobileViewport();TO.closePopup();P.onunload()}');p.wait_for_timeout(60)
 browser.close()
result={'scope':'modular.4 versus Feishu7.6.5; read-only comparison. Real production GLS modules and Feishu popup/search methods, controlled minimal host and synthetic viewport signals. No real Obsidian, iOS keyboard or caret-paint validation.','engine': 'Chromium '+version,'rows':rows,'pageErrors':errors}
(B/'feishu-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))

# Assertions target observed production paths, not native OS caret painting.
by={r['case']:r['evidence'] for r in rows}
checks={
 'GLS-tiny-viewport-not-keyboard':not by['GLS-2px-viewport-reduction-without-keyboard-events-or-css']['keyboard'],
 'GLS-open-like-Feishu-no-programmatic-blur':not by['GLS-production-folder-picker-open-from-focused-main']['programmatic'] and by['GLS-production-folder-picker-open-from-focused-main']['mainFocused'],
 'GLS-real-host-resize-zero-repositions':by['GLS-actual-SearchView-onResize-three-times-during-keyboard']['popupRepositions']==0,
 'GLS-sidebar-does-not-own-keyboard-frame':not by['GLS-actual-SearchView-onResize-three-times-during-keyboard']['controllerMounted'],
 'Feishu-no-provider-native-open':not by['Feishu765-production-popup-open-from-focused-main-no-GLS-provider']['programmatic'],
 'Feishu-shared-provider-native-open':not by['Feishu765-production-popup-open-from-focused-main-with-GLS-provider']['programmatic'],
 'Feishu-shared-provider-no-tiny-viewport-lock':not by['Feishu765-GLS-provider-bound-2px-resize']['locked'],
 'Feishu-real-host-resize-zero-repositions':by['Feishu765-actual-tab-handleHostResize-three-times-during-keyboard']['popupRepositions']==0,
}
result['checks']=checks;result['passed']=sum(checks.values());result['failed']=len(checks)-sum(checks.values())
(B/'feishu-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('COMPARISON ASSERTIONS',json.dumps(checks,ensure_ascii=False))
raise SystemExit(1 if errors or not all(checks.values()) else 0)
