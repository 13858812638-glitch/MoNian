"""Sidebar popup ownership/toolbar regression; Chromium mock host, not native Obsidian."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('GLS_SIDEBAR_AUDIT_OUT', '/workspace/sidebar-popup-audit/after'))
OUT.mkdir(parents=True, exist_ok=True)
rows = []
geometry = {}


def check(name, passed, evidence=None):
    rows.append(dict(name=name, passed=bool(passed), evidence=evidence))
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)


def boot(browser, kind, dark=False, mobile=False):
    ctx = browser.new_context(viewport={'width': 390 if mobile else 1800, 'height': 950},
                              is_mobile=mobile, has_touch=mobile)
    p = ctx.new_page()
    p.set_content('<body class="'+('is-mobile ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'"><div id="host"></div></body>')
    for f in ['tests/browser-fixture.css', 'src/styles/styles.css']:
        path=Path('/workspace/sidebar-popup-audit/before.css') if os.environ.get('GLS_SIDEBAR_BASELINE') and f.startswith('src/') else ROOT/f
        p.add_style_tag(content=path.read_text())
    p.add_style_tag(content='#host {width:700px;height:850px;margin:40px 0 0 40px}body.is-mobile #host{width:380px;margin:0;height:900px}')
    for f in ['tests/host.js', 'tests/browser-scenarios.js']:
        p.add_script_tag(content=(ROOT/f).read_text())
    p.evaluate('''mobile=>{window.H=__makeHost({mobile,files:[
      {path:'Projects/a.md',content:'# alpha',properties:{tags:['tag'],status:'active'}},
      {path:'Archive/b.md',content:'# beta',properties:{tags:['other'],status:'done'}}]});
      window.module={exports:{}};window.require=()=>H.obsidian;}''', mobile)
    subject=Path('/workspace/sidebar-popup-audit/before.cjs') if os.environ.get('GLS_SIDEBAR_BASELINE') else ROOT/'tests/generated/subject.cjs'
    p.add_script_tag(content=subject.read_text())
    p.evaluate('''async kind=>{
      window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);await P.onload();await H.layoutReady();await P._flushIndexQueueNow();
      if(kind==='sidebar'||kind==='tab') {
        window.V=new S.SearchView({app:H.app},P,kind==='tab'?S.TAB_VIEW_TYPE:S.VIEW_TYPE);
        document.querySelector('#host').append(V.containerEl);V.containerEl.style.height='100%';V.contentEl.style.height='100%';
        await V.onOpen();window.C=V.core;
      } else {
        const el=document.querySelector('#host').createDiv();el.style.height='100%';
        if(kind==='window')el.classList.add('local-search-modal');
        window.C=new S.SearchCore(H.app,P,el,{hostKind:kind});await C.init();
      }
      await waitFixture(150);
    }''', kind)
    return ctx, p


def box(p, selector):
    return p.evaluate('''selector=>{
      const r=document.querySelector(selector).getBoundingClientRect(),h=C.containerEl.getBoundingClientRect();
      return {x:r.x,y:r.y,w:r.width,h:r.height,inside:r.left>=h.left-1&&r.right<=h.right+1&&r.top>=h.top-1&&r.bottom<=h.bottom+1};
    }''', selector)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for dark in [False, True]:
        for kind in ['sidebar', 'tab', 'window', 'embedded', 'mobile']:
            mobile = kind == 'mobile'
            ctx, p = boot(browser, 'sidebar' if mobile else kind, dark, mobile)
            errors = []
            p.on('pageerror', lambda error: errors.append(str(error)))
            label = kind + ('-dark' if dark else '-light')
            geometry[label] = {}
            toolbar = p.evaluate('''()=>{
              if(!C.navigator)return {visible:false,atTop:false,buttons:[]};
              const n=C.navigator,t=n.mobileToolbar,r=t.getBoundingClientRect(),s=n.scroll.getBoundingClientRect();
              return {visible:r.height>0&&r.width>0,atTop:n.facets.contains(t)&&r.bottom<=s.top+1,
                buttons:[...t.querySelectorAll('[data-nav-action]')].filter(x=>!x.hidden).map(x=>x.dataset.navAction)};
            }''')
            if kind == 'sidebar':
                check(label+' command rail above navigation', toolbar['visible'] and toolbar['atTop'], toolbar)
            elif not mobile:
                check(label+' has no sidebar command rail', not toolbar['visible'], toolbar)
            else:
                check(label+' retains bottom command rail', toolbar['visible'] and not toolbar['atTop'])
            dialogs = {
                'rename-folder': "C.facets.runSidebarMaintenance('folder','rename',{path:'Projects'})",
                'create-folder': "C.facets.openFolderCreateDialog({parentPath:'Projects'})",
                'delete-tag': "S.openPickerDeleteDialog(C,{title:'删除标签',onConfirm:()=>true})",
                'appearance': "C.facets._openFolderColorEditor('Projects',()=>{})",
                'rename-file': "S.openSearchRenameDialog(C,{kind:'rename-file',initialValue:'alpha',onSubmit:()=>true})"
            }
            for name, code in dialogs.items():
                p.evaluate(code);p.wait_for_timeout(80)
                b=box(p,'.local-search-dialog-surface');geometry[label][name]=b
                if kind == 'sidebar':
                    check(label+' '+name+' within sidebar',b['inside'] and b['w']>100,b)
                p.evaluate('C._confirmSession.finish(false)');p.wait_for_timeout(20)
            pickers = {
                'folder': "C.facets.showFolderDropdown({anchor:(C.navigator?.desktopSidebar?C.navigator.sections.get('folder').toggle:C.navigator?.sections.get('folder').manage)||C.searchInput})",
                'tags': "C.facets.openTagPicker({anchor:(C.navigator?.desktopSidebar?C.navigator.sections.get('tags').toggle:C.navigator?.sections.get('tags').manage)||C.searchInput})",
                'property': "C.facets.openPropertyPicker('status',(C.navigator?.desktopSidebar?C.navigator.sections.get('properties').toggle:C.navigator?.sections.get('properties').manage)||C.searchInput)",
                'sort': "C.sorting.openPicker({pickerBtn:C.sorting.pickerBtn})",
                'view': "C.resultControls.openViewDropdown(C.searchInput)",
                'history': "C.resultControls.openHistoryDropdown(C.resultControls.historyBtn)",
                'file-move': "C.showMovePickerForFiles([H.app.vault.getAbstractFileByPath('Projects/a.md')],C.searchInput)",
                'icon': "S.openFilterToolbarIconPicker(C,{anchor:C.searchInput,propertyKey:'status',preserveAnchor:true})"
            }
            for name, code in pickers.items():
                p.evaluate(code);p.wait_for_timeout(100)
                b=box(p,'.local-search-dropdown');geometry[label]['picker-'+name]=b
                if kind == 'sidebar':check(label+' '+name+' picker within sidebar',b['inside'],b)
                p.evaluate('C.dropdown.close(false,{returnToParent:false})');p.wait_for_timeout(20)
            if kind == 'sidebar':
                # Toolbar commands use the same live controls and preserve an active query on collapse.
                p.evaluate("C.searchInput.value='alpha';C.performSearch('alpha')");p.wait_for_timeout(70)
                if toolbar['visible']:
                    p.screenshot(path=str(OUT/(label+'-toolbar.png')))
                    p.locator('[data-nav-action="collapse"] button').click();p.wait_for_timeout(50)
                    check(label+' collapse keeps query',p.evaluate("C.queryState.raw==='alpha'"))
                    p.locator('[data-nav-action="view"] button').click();p.wait_for_timeout(100)
                    check(label+' view command opens picker',p.evaluate('C.dropdown.isOpen'))
                    p.evaluate('C.dropdown.close(false,{returnToParent:false})')
                    p.locator('[data-nav-action="history"] button').click();p.wait_for_timeout(80)
                    check(label+' history uses existing picker',p.evaluate('C.dropdown.isOpen'))
                    p.evaluate('C.dropdown.close(false,{returnToParent:false})')
                    p.locator('[data-nav-action="create"] button').click();p.wait_for_timeout(80)
                    check(label+' create command enters existing flow',p.evaluate('C.createFlow.isCreateMode()'))
                    p.locator('[data-nav-action="create"] button').click();p.wait_for_timeout(80)
                    # Exit can ask to discard the temporary query-derived draft.
                    p.evaluate('C._confirmSession?.finish(false)')
                    p.evaluate("if(C.createFlow.isCreateMode())C.createFlow.leaveCreateMode?.()")
                p.evaluate(dialogs['rename-folder']);p.wait_for_timeout(50)
                p.locator('.local-search-dialog-input').fill('Draft in progress')
                p.evaluate("document.querySelector('#host').style.width='300px';V.onResize()")
                p.wait_for_timeout(100)
                b=box(p,'.local-search-dialog-surface')
                check(label+' live dialog follows narrower sidebar',b['inside'] and b['w']<=300,b)
                check(label+' resize preserves edited input and focus',p.evaluate("document.activeElement===document.querySelector('.local-search-dialog-input')&&document.activeElement.value==='Draft in progress'"))
                p.evaluate("document.querySelector('#host').style.display='none';V.onResize()")
                p.wait_for_timeout(80)
                check(label+' collapsed sidebar hides its dialog',not p.locator('.local-search-dialog-surface').is_visible())
                p.evaluate("document.querySelector('#host').style.display='block';V.onResize()")
                p.wait_for_timeout(80)
                check(label+' reopened sidebar retains dialog draft',p.locator('.local-search-dialog-input').input_value()=='Draft in progress')
                p.locator('.local-search-dialog-input').focus()
                p.keyboard.press('Escape');p.wait_for_timeout(40)
                check(label+' Escape closes dialog',p.locator('.local-search-dialog-surface').count()==0)
                p.evaluate("C.facets.showFolderDropdown({anchor:C.navigator.sections.get('folder').toggle})");p.wait_for_timeout(80)
                p.evaluate("S.openFilterToolbarIconPicker(C,{anchor:C.dropdown.panel.querySelector('button'),propertyKey:'status',preserveAnchor:true})");p.wait_for_timeout(80)
                p.evaluate("document.querySelector('#host').style.width='240px';V.onResize()")
                p.wait_for_timeout(100)
                b=p.evaluate('''()=>{const r=C.dropdown.panel.getBoundingClientRect(),h=C.containerEl.getBoundingClientRect();return {inside:r.left>=h.left-1&&r.right<=h.right+1,w:r.width}}''')
                check(label+' nested picker remains bounded after resize',b['inside'],b)
                p.evaluate("document.querySelector('#host').style.display='none';V.onResize()")
                p.wait_for_timeout(80)
                check(label+' collapsed sidebar hides its picker',not p.locator('.local-search-dropdown:visible').count())
                p.evaluate("document.querySelector('#host').style.display='block';V.onResize()")
                p.wait_for_timeout(80)
                check(label+' reopened sidebar reveals current picker',p.locator('.local-search-dropdown:visible').count()==1)
                p.evaluate('V.onClose()');p.wait_for_timeout(50)
                check(label+' teardown removes popups',p.locator('.local-search-dropdown,.local-search-dialog-surface').count()==0)
            check(label+' no page errors',not errors,errors)
            if kind != 'sidebar':p.evaluate('C.destroy()')
            ctx.close()
    browser.close()

baseline=Path('/workspace/sidebar-popup-audit/before/geometry.json')
if baseline.exists() and OUT != baseline.parent:
    old=json.loads(baseline.read_text())
    for label, value in geometry.items():
        if not label.startswith('sidebar-'):
            check(label+' popup geometry unchanged from previous build',value==old[label],{'before':old[label],'after':value})
report={'passed':sum(x['passed'] for x in rows),'failed':sum(not x['passed'] for x in rows),'results':rows}
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
(OUT/'geometry.json').write_text(json.dumps(geometry,indent=2))
print(json.dumps({k:report[k] for k in ['passed','failed']}))
raise SystemExit(bool(report['failed']))
