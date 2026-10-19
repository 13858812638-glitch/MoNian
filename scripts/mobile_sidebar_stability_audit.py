"""Actual production GLS classes with a controlled mobile Obsidian drawer.
Tests are Chromium device emulation, *not* native Obsidian or real iOS validation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, shutil, subprocess, sys, traceback
ROOT=Path(__file__).resolve().parent.parent
os.chdir(ROOT)
subprocess.run(['node','--input-type=module','-e',"import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"], check=True, stdout=subprocess.DEVNULL)
rows=[]; faults=[]
def row(device, label, success, evidence):
    rows.append(dict(device=device,case=label,pass_=bool(success),evidence=evidence))
    print(device,label,'PASS' if success else 'FAIL', flush=True)

def run_theme(browser, theme, width, height=844):
    name=f'{theme}-{width}'; ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,locale='zh-CN')
    p=ctx.new_page(); p.set_default_timeout(9000)
    errors=[]; p.on('pageerror',lambda err:errors.append(str(err)))
    try:
        p.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="is-mobile is-phone is-ios theme-'+theme+'"><div class="safe-area-top-cover" id="top-cover"></div><div class="workspace-drawer mod-left" id="drawer"><div class="workspace-drawer-inner"><div class="workspace-drawer-tab-container"><div class="workspace-leaf mod-active" id="leaf"></div></div></div></div><div id="host"></div></body></html>')
        p.add_style_tag(content='''body{--mobile-sidebar-background:#d9e1e5;--keyboard-height:0px}.workspace-drawer{position:absolute;top:32px;left:0;width:100%;height:calc(100vh - 32px);background:rgb(100,110,120)}.workspace-drawer-inner,.workspace-drawer-tab-container,.workspace-leaf{height:100%;width:100%;display:flex;flex-direction:column;min-height:0}.workspace-leaf .view-content{min-height:0;flex:1 1 auto}.safe-area-top-cover{height:32px;background:rgb(100,110,120)}.workspace-drawer .workspace-leaf .view-content {height:100%}''')
        if theme == 'dark': p.add_style_tag(content='body{--mobile-sidebar-background:#1b2422}')
        for s in ['tests/browser-fixture.css','src/styles/styles.css']:p.add_style_tag(content=(ROOT/s).read_text())
        for s in ['tests/host.js','tests/browser-scenarios.js','tests/focus-scenarios.js']:
            p.add_script_tag(content=(ROOT/s).read_text())
        p.evaluate('()=>{installFocusProbe();bootFixture(true)}')
        p.add_script_tag(content=(ROOT/'tests/generated/subject.cjs').read_text())
        p.evaluate('''async()=>{
            window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);await P.onload();await H.layoutReady();await P._flushIndexQueueNow();
            window.leaf={app:H.app,parent:H.app.workspace.leftSplit,detach(){this.detached=true}};
            H.app.workspace.activeLeaf=leaf;
            window.V=new S.SearchView(leaf,P);
            document.getElementById('leaf').append(V.containerEl);
            V.containerEl.classList.add('gls-audit-native-leaf');
            V.containerEl.style.cssText='width:100%;height:100%;min-height:0;display:flex;flex-direction:column';
            await V.onOpen();window.C=V.core;await new Promise(r=>setTimeout(r,220));
        }''')
        p.wait_for_timeout(200)
        def sample():return p.evaluate('''()=>({page:C.navigator.page,visible:C.navigator.searchVisible,inputShown:getComputedStyle(C.searchInput).display!=='none' && !!C.searchInput.getClientRects().length,scroll:C.navigator.mobileToolbar.scrollLeft,scrollMax:C.navigator.mobileToolbar.scrollWidth-C.navigator.mobileToolbar.clientWidth,drawer: getComputedStyle(document.querySelector('#drawer')).backgroundColor,root:getComputedStyle(C.containerEl).backgroundColor,toolbar:getComputedStyle(C.navigator.mobileToolbar).backgroundColor,rootKeyboard:C.containerEl.classList.contains('is-ui-keyboard-open'),toolbarRect:C.navigator.mobileToolbar.getBoundingClientRect().toJSON(),clientWidth:C.navigator.mobileToolbar.clientWidth,unloaded:V._closed})''')
        initial=sample();row(name,'native-shell-and-toolbar',initial['page']=='filters' and not initial['visible'] and initial['clientWidth']>0,initial)
        if name in ['light-390','dark-320']:
            p.screenshot(path=str(ROOT/f'reports/sidebar-{name}-filters.png'),caret='initial')
        surface=p.evaluate('''()=>({cover:getComputedStyle(document.querySelector('#top-cover')).backgroundColor,drawer:getComputedStyle(document.querySelector('#drawer')).backgroundColor,native:document.querySelector('#drawer').classList.contains('gls-mobile-sidebar-active')})''')
        row(name,'ios-status-safe-area-is-native-drawer-color',surface['native'] and surface['cover']==surface['drawer']==initial['root'],surface)
        buttons=p.evaluate('''()=>[...C.navigator.mobileToolbar.querySelectorAll('.local-search-nav-tool-slot:not([hidden]) button')].map(b=>({label:b.getAttribute('aria-label'),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))''')
        row(name,'mobile-command-tap-target-min-44px',all(b['label'] and b['width']>=43.9 and b['height']>=43.9 for b in buttons),buttons)
        e=p.evaluate('''()=>{const bar=C.navigator.mobileToolbar;const all=[...bar.querySelectorAll('[data-nav-action]')];return{hidden:all.filter(n=>n.hidden).map(n=>[n.dataset.navAction,getComputedStyle(n).display]),display:all.filter(n=>!n.hidden).map(n=>n.dataset.navAction),size:all.map(n=>[n.dataset.navAction,Math.round(n.getBoundingClientRect().width)])};}''')
        row(name,'hidden-actions-no-hitbox',all(d=='none' for _,d in e['hidden']),e)
        p.evaluate('()=>{C.navigator.resultsButton.click()}');p.wait_for_timeout(90)
        state=sample();row(name,'results-action-shows-search-without-auto-focus',state['page']=='results' and state['visible'] and state['inputShown'] and p.evaluate('()=>document.activeElement!==C.searchInput'),state)
        p.evaluate('()=>{C.navigator.setPage("filters");C.navigator.tools.get("search").button.click()}');p.wait_for_timeout(90)
        state=sample();row(name,'search-command-does-open-search',state['page']=='results' and state['visible'] and state['inputShown'],state)
        # A toolbar that was scrolled far right on filters must not hide the first results-page actions.
        p.evaluate('''()=>{const toolbars=P.settings.navigatorToolbars||{};toolbars.filters={version:2,order:['collapse','results','view','history','create','sort-navigation','pool:folder','pool:tag','pool:property','pool:fileType'],hidden:[]};toolbars.results={version:2,order:['search','filters','sort','view','batch','create','history','time','pool:folder','pool:tag','pool:property','pool:fileType'],hidden:[]};P.settings.navigatorToolbars=toolbars;C.navigator.setPage('filters');C.navigator.refreshPreferences();}''')
        p.wait_for_timeout(110)
        pre=p.evaluate('''()=>{const b=C.navigator.mobileToolbar;b.scrollLeft=10000;return {x:b.scrollLeft,max:b.scrollWidth-b.clientWidth}}''')
        p.evaluate('()=>C.navigator.setPage("results")');p.wait_for_timeout(100)
        post=sample();row(name,'context-switch-restores-leading-tools',pre['x']>0 and post['page']=='results' and post['scroll']<5,dict(before=pre,after=post))
        ordered=p.evaluate('''()=>[...C.navigator.mobileToolbar.querySelectorAll('.local-search-nav-tool-slot:not([hidden])')].map(n=>n.dataset.navAction)''')
        row(name,'results-toolbar-configured-order-preserved',ordered==['search','filters','sort','view','batch','create','history','time','pool:folder','pool:tag','pool:property','pool:fileType'],ordered)
        p.evaluate('''()=>{C.navigator.mobileToolbar.scrollLeft=600;C.navigator.tools.get('filters').button.click()}''')
        p.wait_for_timeout(100)
        returned=sample();row(name,'back-to-filters-leads-from-first-command',returned['page']=='filters' and returned['scroll']<5 and not returned['inputShown'],returned)
        p.evaluate('''()=>{C.navigator.resultsButton.click();C.navigator.tools.get('search').button.click()}''')
        p.wait_for_timeout(90)
        hiddenSearch=sample();row(name,'collapsed-search-keeps-native-results',not hiddenSearch['visible'] and not hiddenSearch['inputShown'] and hiddenSearch['page']=='results',hiddenSearch)
        p.evaluate('''()=>C.navigator.tools.get('search').button.click()''');p.wait_for_timeout(65)
        toggled=sample();row(name,'explicit-search-toggle-shows-and-hides',toggled['page']=='results' and toggled['visible'] and toggled['inputShown'],toggled)
        # Native keyboard appearing while *another* input owns focus must not change GLS layout.
        p.evaluate('''()=>{const n=document.createElement('input');n.id='foreign-edit';document.body.append(n);n.focus();setTestKeyboard(250)}''')
        p.wait_for_timeout(90); st=sample();row(name,'foreign-keyboard-does-not-lock-GLS',not st['rootKeyboard'],st)
        p.evaluate('''()=>{setTestKeyboard(0);document.querySelector('#foreign-edit').remove();C.navigator.searchVisible=true;C.navigator.syncPage()}''');p.wait_for_timeout(90)
        dock_before_keyboard=sample()
        input_node=p.evaluate('''()=>{C.searchInput.focus();return C.searchInput===document.activeElement}''')
        p.evaluate('()=>setTestKeyboard(260)');p.wait_for_timeout(100)
        st=sample()
        if name in ['light-390','dark-320']:
            p.screenshot(path=str(ROOT/f'reports/sidebar-{name}-keyboard.png'),caret='initial')
        bottom=p.evaluate('()=>window.testViewport.height+window.testViewport.offsetTop')
        dock_info=p.evaluate("""()=>({frameMounted:!!V.capabilities?.mobileFrame,frameClass:C.containerEl.classList.contains('ui-mobile-frame'),inset:C.containerEl.style.getPropertyValue('--ui-mobile-keyboard-inset'),margin:getComputedStyle(C.navigator.mobileToolbar).marginBottom})""")
        row(name,'own-keyboard-native-sidebar-does-not-follow',input_node and not st['rootKeyboard'] and not dock_info['frameMounted'] and not dock_info['frameClass'] and not dock_info['inset'] and dock_info['margin']=='0px' and abs(st['toolbarRect']['bottom']-dock_before_keyboard['toolbarRect']['bottom'])<=1.1,dict(viewportBottom=bottom,before=dock_before_keyboard['toolbarRect']['bottom'],after=st['toolbarRect']['bottom'],details=dock_info))
        # Sticky painted surface must not change with focus/blur or the keyboard.
        focus_back=st['drawer'];p.evaluate('''()=>{C.searchInput.blur();setTestKeyboard(0)}''');p.wait_for_timeout(110)
        unfocus=sample()
        row(name,'focus-blur-same-native-drawer-surface',focus_back==unfocus['drawer']==unfocus['root']==unfocus['toolbar'],dict(focused=st,unfocused=unfocus))
        row(name,'keyboard-hide-cleans-lock-and-inset',not unfocus['rootKeyboard'] and
            not p.evaluate('''()=>C.containerEl.style.getPropertyValue('--ui-mobile-keyboard-inset')'''),unfocus)
        row(name,'keyboard-dismiss-does-not-reflow-command-dock',abs(unfocus['toolbarRect']['bottom']-dock_before_keyboard['toolbarRect']['bottom'])<=1.1,dict(before=dock_before_keyboard['toolbarRect']['bottom'],after=unfocus['toolbarRect']['bottom']))
        tabframe=p.evaluate('''()=>{const tab=document.createElement('div');tab.className='native-tab-frame-test';tab.style.cssText='height:400px;width:300px';document.body.append(tab);const c=new S.SearchWorkspaceCapabilities({containerEl:tab,hostKind:'tab',dropdown:{_queueReposition(){},invalidateFrame(){}}});const has=!!c.mobileFrame&&tab.classList.contains('ui-mobile-frame');c.destroy();const cleared=!tab.classList.contains('ui-mobile-frame');tab.remove();return{has,cleared};}''')
        row(name,'native-search-tab-keeps-independent-keyboard-frame',tabframe['has'] and tabframe['cleared'],tabframe)
        p.evaluate('''()=>window.dispatchEvent(new Event('orientationchange'))''');p.wait_for_timeout(80)
        rotation=sample();row(name,'rotation-without-keyboard-keeps-toolbar',not rotation['rootKeyboard'] and rotation['toolbarRect']['bottom'] <= 844,rotation)
        p.evaluate('''()=>{const x=document.createElement('div');x.id='other-drawer-tab';document.getElementById('leaf').parentNode.append(x);H.app.workspace.trigger('active-leaf-change',{view:{contentEl:x}})}''');p.wait_for_timeout(70)
        off=p.evaluate('''()=>({className:document.getElementById('drawer').className,cover:getComputedStyle(document.getElementById('top-cover')).backgroundColor})''')
        p.evaluate('''()=>H.app.workspace.trigger('active-leaf-change',leaf)''');p.wait_for_timeout(70)
        on=p.evaluate('''()=>({className:document.getElementById('drawer').className,cover:getComputedStyle(document.getElementById('top-cover')).backgroundColor})''')
        row(name,'other-native-tab-release-and-return-restores-surface','gls-mobile-sidebar-active' not in off['className'] and 'gls-mobile-sidebar-active' in on['className'] and on['cover']==initial['root'],dict(off=off,on=on))
        p.evaluate('''()=>V._collapseMobileSidebar()''');p.wait_for_timeout(60)
        collapsed=p.evaluate('''()=>({collapsed:H.app.workspace.leftSplit.collapsed,active:document.querySelector('#drawer').classList.contains('gls-mobile-sidebar-active'),cover:getComputedStyle(document.querySelector('#top-cover')).backgroundColor})''')
        row(name,'native-sidebar-collapse-releases-status-safe-area',collapsed['collapsed'] and not collapsed['active'] and collapsed['cover']!=initial['root'],collapsed)
        p.evaluate('''()=>{H.app.workspace.leftSplit.collapsed=false;V.onResize()}''');p.wait_for_timeout(75)
        reopened=p.evaluate('''()=>({collapsed:H.app.workspace.leftSplit.collapsed,active:document.querySelector('#drawer').classList.contains('gls-mobile-sidebar-active'),cover:getComputedStyle(document.querySelector('#top-cover')).backgroundColor})''')
        row(name,'native-sidebar-resize-reopens-restored-surface',not reopened['collapsed'] and reopened['active'] and reopened['cover']==initial['root'],reopened)
        # E portal: input remains one node and higher external overlay does not steal touch.
        p.evaluate('''()=>{C.navigator.setPage('results');C.facets.showFolderDropdown({anchor:C.navigator.tools.get('filters').button});}''');p.wait_for_timeout(130)
        portal=p.evaluate('''()=>{const d=C.dropdown.panel, i=d?.querySelector('input'),box=i?.getBoundingClientRect();const external=document.body.createDiv({cls:'external-mask'});external.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:10500;background:transparent;pointer-events:auto';const hit=box?document.elementFromPoint(box.left+box.width/2,box.top+box.height/2):null;external.remove();return{portalDisplay:getComputedStyle(C._popupHost).display,hit:hit===i,actual:hit?.className||'',input:i?.className||'',zIndex:d?getComputedStyle(d).zIndex:null};}''')
        row(name,'ios-portal-external-layer-hit-test',portal['portalDisplay']=='contents' and portal['hit'],portal)
        p.evaluate('''()=>{const d=C.dropdown.panel;window.pickerInput=d?.querySelector('input');pickerInput?.focus()}''');p.wait_for_timeout(65)
        picker=p.evaluate('''()=>({singleNode:pickerInput?.isConnected,focused:document.activeElement===pickerInput,caret:pickerInput?getComputedStyle(pickerInput).caretColor:null,frame:C.containerEl.classList.contains('is-ui-keyboard-open'),popupFrame:!!C.dropdown.panel?.[S.MOBILE_FRAME_OWNER]})''')
        row(name,'portal-input-focus-owned-by-picker-not-sidebar',picker['singleNode'] and picker['focused'] and not picker['frame'] and picker['popupFrame'],picker)
        p.evaluate('''()=>{C.dropdown.close(false);C.navigator.setPage('filters');V.onClose();P.onunload()}''');p.wait_for_timeout(100)
        end=p.evaluate('''()=>({open:!!document.querySelector('.local-search-dropdown'),ownerClass:document.querySelector('#drawer').className,events:focusProbeListeners.length,ref:V.core})''')
        row(name,'teardown-cleans-surface-and-listeners',not end['open'] and 'gls-mobile-sidebar-active' not in end['ownerClass'] and end['events']==0 and end['ref']==None,end)
        if errors: faults.append({'device':name,'pageErrors':errors})
    except Exception as e:
        faults.append({'device':name,'error':str(e),'trace':traceback.format_exc()});traceback.print_exc()
        p.screenshot(path=str(ROOT/f'reports/mobile-sidebar-failure-{name}.png'),caret='initial')
    finally:ctx.close()

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH',shutil.which('chromium')),args=['--no-sandbox'])
    for theme,width in [('light',390),('dark',320),('light',375),('dark',430)]:run_theme(browser,theme,width)
    browser.close()
report={'tool':'Chromium', 'iPhoneDeviceVerified':False, 'nativeObsidianVerified':False,'passed':sum(x['pass_'] for x in rows),'failed':sum(not x['pass_'] for x in rows),'rows':rows,'errors':faults}
(ROOT/'reports/mobile-sidebar-stability.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='rows'},ensure_ascii=False,indent=2))
sys.exit(0 if not report['failed'] and not faults else 1)
