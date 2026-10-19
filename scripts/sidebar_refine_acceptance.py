"""Production-code Chromium regression for user-requested sidebar controls.
Not an iOS WebKit native test. No underlying notes are modified.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess, json, os, traceback
ROOT=Path(__file__).resolve().parent.parent
subprocess.run(['node','--input-type=module','-e',"import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"],cwd=ROOT,check=True,capture_output=True,text=True)
rows=[]
def record(case,ok,detail):
    rows.append({'case':case,'passed':bool(ok),'detail':detail})
    print(f"{case}: {'PASS' if ok else 'FAIL'} {str(detail)[:250]}",flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    for theme,width in [('dark',390),('light',375),('dark',430),('light',320)]:
        key=f'{theme}-{width}'
        context=browser.new_context(viewport={'width':width,'height':850},is_mobile=True,has_touch=True,locale='zh-CN')
        p=context.new_page();p.set_default_timeout(7000)
        errors=[]
        p.on('pageerror',lambda err:errors.append(str(err)))
        p.set_content(f'''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="is-mobile is-phone is-ios theme-{theme}"><div class="safe-area-top-cover" id="top-cover"></div><div class="workspace-drawer mod-left" id="drawer"><div class="workspace-drawer-inner"><div class="workspace-drawer-tab-container"><div class="workspace-leaf mod-active" id="leaf"></div></div></div></div><div id="host"></div></body></html>''')
        p.add_style_tag(content='body{--mobile-sidebar-background:#1b2422}.workspace-drawer{position:absolute;top:32px;left:0;width:100%;height:calc(100vh - 32px)}.workspace-drawer-inner,.workspace-drawer-tab-container,.workspace-leaf{height:100%;width:100%;display:flex;flex-direction:column;min-height:0}.workspace-leaf .view-content{min-height:0;flex:1 1 auto}.safe-area-top-cover{height:32px}.workspace-drawer .workspace-leaf .view-content{height:100%}')
        for filename in ['tests/browser-fixture.css','src/styles/styles.css']:
            p.add_style_tag(content=(ROOT/filename).read_text())
        for filename in ['tests/host.js','tests/browser-scenarios.js','tests/focus-scenarios.js']:
            p.add_script_tag(content=(ROOT/filename).read_text())
        p.evaluate('()=>{installFocusProbe();bootFixture(true)}')
        p.add_script_tag(content=(ROOT/'tests/generated/subject.cjs').read_text())
        p.evaluate('''async()=>{
            window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);await P.onload();await H.layoutReady();await P._flushIndexQueueNow();
            window.leaf={app:H.app,parent:H.app.workspace.leftSplit,detach(){this.detached=true}};
            H.app.workspace.activeLeaf=leaf;window.V=new S.SearchView(leaf,P);
            document.getElementById('leaf').append(V.containerEl);
            V.containerEl.style.cssText='width:100%;height:100%;min-height:0;display:flex;flex-direction:column';
            await V.onOpen();window.C=V.core;await new Promise(r=>setTimeout(r,130));
        }''')
        p.wait_for_timeout(80)
        # Existing toolbar action opens one common Picker, including the new operation.
        state=p.evaluate('''()=>{const btn=C.navigator.tools.get('sort-navigation').button;
            C.navigator.openSidebarTools(btn);const menu=C.dropdown.panel;
            return {titles:[...menu.querySelectorAll('[data-sidebar-tool]')].map(x=>x.dataset.sidebarTool),text:menu.textContent};}''')
        record(key+'-tools-create-present-and-no-duplicate-exit', 'folder:create' in state['titles'] and 'finish' not in state['titles'],state['titles'])
        # Actual pointer clicks toggle sort mode without a second exit command.
        p.locator('[data-sidebar-tool="sort"]').click()
        after=p.evaluate('()=>C.navigator.customization.sortMode')
        p.evaluate('()=>C.navigator.openSidebarTools(C.navigator.tools.get("sort-navigation").button)')
        opened=p.evaluate('''()=>({active:C.navigator.customization.sortMode,ids:[...C.dropdown.panel.querySelectorAll('[data-sidebar-tool]')].map(x=>x.dataset.sidebarTool)})''')
        p.locator('[data-sidebar-tool="sort"]').click()
        ended=p.evaluate('()=>C.navigator.customization.sortMode')
        record(key+'-sort-click-again-exits',after and opened['active'] and not ended and 'finish' not in opened['ids'],[after,opened,ended])
        # Selection is owned by a leaf row, not its section. Property key is also a parent.
        state=p.evaluate('''()=>{
            window.selectedFolderPath=(H.app.vault.getRoot().children.find(x=>x.children)?.path||'资料');
            C.filterState.folders.add(selectedFolderPath);C.filterState.properties.set('所属项目',new Set(['卫康']));
            C.navigator.collapsed.delete('folder');C.navigator.collapsed.delete('properties');
            C.navigator.expanded.add('properties:所属项目');
            C.navigator.renderRevision=-1;C.navigator.sync();
        }''')
        p.wait_for_timeout(140)
        state=p.evaluate('''()=>{return {
                selectedFolderPath, selectedGroups:[...C.navigator.scroll.querySelectorAll('.local-search-nav-section-heading.is-selected')].map(r=>r.textContent),
                markedGroups:[...C.navigator.scroll.querySelectorAll('.local-search-nav-section-heading[data-has-applied-children="true"]')].map(r=>r.textContent),
                selectedFolders:[...C.navigator.scroll.querySelectorAll('.local-search-nav-row.is-selected[data-nav-row-key]')].map(r=>r.dataset.pickerKey),
                selectedParents:[...C.navigator.scroll.querySelectorAll('.local-search-nav-property-key.is-selected')].map(r=>r.dataset.pickerKey),
                propertyKeys:[...C.navigator.scroll.querySelectorAll('.local-search-nav-property-key')].map(r=>r.dataset.pickerKey),
                exactSelectedValues:[...C.navigator.scroll.querySelectorAll('.local-search-nav-property-key ~ .local-search-nav-row.is-selected')].map(r=>r.dataset.pickerKey)
            };}''')
        record(key+'-selected-only-leaf-rows',not state['selectedGroups'] and not state['selectedParents'] and state['selectedFolderPath'] in state['selectedFolders'],state)
        # CSS controls change only the scoped navigation, not unrelated Picker geometry.
        state=p.evaluate('''()=>{const root=C.containerEl;root.style.setProperty('--ls-nav-text-size','19px');
            root.style.setProperty('--ls-nav-text-weight','700');root.style.setProperty('--ls-nav-group-weight','500');
            root.style.setProperty('--ls-nav-line-height','1.75');root.style.setProperty('--ls-nav-row-height','52px');
            root.style.setProperty('--ls-nav-row-spacing','6px');root.style.setProperty('--ls-nav-section-spacing','5px');
            const row=C.navigator.scroll.querySelector('.local-search-nav-row'),group=C.navigator.scroll.querySelector('.local-search-nav-group-row');
            return {font:getComputedStyle(row).fontSize,weight:getComputedStyle(row).fontWeight,
                line:getComputedStyle(row).lineHeight,height:row.getBoundingClientRect().height,
                spacing:getComputedStyle(row).marginBottom,groupWeight:getComputedStyle(group).fontWeight,
                sectionPadding:getComputedStyle(group.closest('.local-search-nav-section')).paddingTop};}''')
        record(key+'-sidebar-style-settings-exposed',state['font']=='19px' and state['weight']=='700' and state['height']==52 and state['spacing']=='6px' and state['groupWeight']=='500' and state['sectionPadding']=='5px',state)
        # Create from sidebar menu with actual input and existing vault creation service.
        # Close any active dropdown from the previous steps first.
        p.evaluate('()=>{C.dropdown.close(false,{returnToParent:false});C.navigator.openSidebarTools(C.navigator.tools.get("sort-navigation").button)}')
        p.locator('[data-sidebar-tool="folder:create"]').click()
        state=p.evaluate('''()=>{const ses=C._confirmSession,portal=C._popupHost;
            const dialog=portal?.querySelector(':scope > .local-search-dialog-surface'),input=dialog?.querySelector('input');
            const r=input?.getBoundingClientRect();return {title:dialog?.querySelector('.local-search-confirm-title')?.textContent,
                direct:ses?.host===portal,portalDisplay:portal?getComputedStyle(portal).display:null,
                fixed:dialog?getComputedStyle(dialog).position:null,
                hit:!!r&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===input,
                inputFocused:input===document.activeElement,
                caret:input?getComputedStyle(input).caretColor:null};}''')
        record(key+'-dialog-native-paint-free-portal',state['title']=='新建文件夹' and state['direct'] and state['portalDisplay']=='contents' and state['fixed']=='fixed' and state['hit'] and state['inputFocused'],state)
        field=p.locator('.local-search-dialog-surface input.local-search-dialog-input:visible')
        field.tap();field.fill('新建验收目录')
        typed=p.evaluate('''()=>{const e=document.querySelector('.local-search-dialog-surface input');return{active:document.activeElement===e,selection:[e.selectionStart,e.selectionEnd],value:e.value}}''')
        p.locator('.local-search-dialog-surface button',has_text='创建').click()
        # Projection is scheduled as a separate task and may render after the
        # vault service has already committed. Wait for the visible row rather
        # than assuming 90ms is enough on every simulated device.
        try:
            p.wait_for_function('''()=>[...C.navigator.scroll.querySelectorAll('.local-search-nav-row')].some(e=>e.textContent.includes('新建验收目录'))''', timeout=3000)
        except Exception:
            pass  # The assertion below records a real failure with details.
        created=p.evaluate('''()=>({created:!!H.app.vault.getAbstractFileByPath('资料/新建验收目录'),dialogClosed:!C._confirmSession,sortStillOff:!C.navigator.customization.sortMode,listed:!![...C.navigator.scroll.querySelectorAll('.local-search-nav-row')].find(e=>e.textContent.includes('新建验收目录'))})''')
        record(key+'-create-folder-real-service-and-close', typed['active'] and typed['value']=='新建验收目录' and created['created'] and created['dialogClosed'] and created['sortStillOff'] and created['listed'],[typed,created])
        # Shared caret contract also applies to folder rename and property-key rename.
        for kind,mode,descriptor,title in [
            ('folder','rename',{'path':'资料'},'重命名文件夹'),
            ('property-key','rename',{'key':'所属项目'},'重命名属性键')
        ]:
            outcome=p.evaluate('''({kind,mode,descriptor})=>{
                const opened=C.facets.runSidebarMaintenance(kind,mode,descriptor);
                const session=C._confirmSession,dialog=session?.host.querySelector(':scope > .local-search-dialog-surface'),input=dialog?.querySelector('input');
                const r=input?.getBoundingClientRect();
                return {opened:!!opened,title:dialog?.querySelector('.local-search-confirm-title')?.textContent,
                    direct:dialog?.parentElement===C._popupHost,display:C._popupHost?getComputedStyle(C._popupHost).display:null,
                    hit:!!r&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===input,
                    focus:document.activeElement===input};
            }''',{'kind':kind,'mode':mode,'descriptor':descriptor})
            record(key+'-'+kind+'-native-rename-dialog',outcome['opened'] and outcome['title']==title
                and outcome['direct'] and outcome['display']=='contents' and outcome['hit'] and outcome['focus'],outcome)
            # Native finger-initiated edit and caret selection must remain usable.
            if outcome['opened']:
                edit=p.locator('.local-search-dialog-surface input:visible');edit.tap();edit.fill('更名验收')
                caret=p.evaluate('''()=>{const e=document.querySelector('.local-search-dialog-surface input');
                    return {focus:document.activeElement===e,selection:e.selectionStart,value:e.value}}''')
                record(key+'-'+kind+'-edit-selection',caret['focus'] and caret['selection']==4 and caret['value']=='更名验收',caret)
                p.locator('.local-search-dialog-surface button',has_text='取消').click()
        # Picker + button must use the same creation owner and return to its parent.
        p.evaluate('''()=>{C.facets.showFolderDropdown({anchor:C.navigator.scroll.querySelector('.local-search-nav-row .local-search-move-tree-folder')})}''')
        p.wait_for_timeout(120)
        # Picker header actions intentionally live inside the accessible "更多操作"
        # overflow menu, not as a visible direct header button.
        p.locator('.local-search-picker-overflow-action:visible').click()
        p.locator('.local-search-picker-action-menu .local-search-move-tree-row:has-text("新建文件夹")').click()
        info=p.evaluate('''()=>{const panel=C.dropdown.panel,session=C._confirmSession,portal=C._popupHost;
            const dialog=portal?.querySelector(':scope > .local-search-dialog-surface'),input=dialog?.querySelector('input');
            return {exists:!!dialog,parent:session?.ownerPanel===panel,
                direct:dialog?.parentElement===portal,display:portal?getComputedStyle(portal).display:null,
                focus:document.activeElement===input};}''')
        record(key+'-picker-plus-shared-create-dialog', info['exists'] and info['parent'] and info['direct']
            and info['display']=='contents' and info['focus'],info)
        p.locator('.local-search-dialog-surface button',has_text='取消').click()
        returned=p.evaluate('''()=>({parentStillOpen:!!C.dropdown.panel,dialogClosed:!C._confirmSession,
            searchStillPresent:!!C.dropdown.panel?.querySelector('.local-search-picker-search')})''')
        record(key+'-picker-cancel-preserves-parent',all(returned.values()),returned)
        p.evaluate('()=>{C.dropdown.close(false,{returnToParent:false});C.destroy();P._unloadHost()}')
        record(key+'-no-runtime-errors',not errors,errors)
        context.close()
    browser.close()
path=ROOT/'reports/sidebar-refine-acceptance.json'
path.write_text(json.dumps({'engine':'Chromium simulated touch, not iOS WebKit','passed':sum(x['passed'] for x in rows),'failed':sum(not x['passed'] for x in rows),'rows':rows},ensure_ascii=False,indent=2))
print(json.dumps({'passed':sum(x['passed'] for x in rows),'failed':sum(not x['passed'] for x in rows)},ensure_ascii=False))
raise SystemExit(any(not x['passed'] for x in rows))
