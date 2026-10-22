"""Sidebar row-cache lifecycle and host isolation in Chromium's mock host."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUT=Path('/workspace/sidebar-interaction-audit/contracts');OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
results=[]
def check(name,ok):
    results.append(dict(name=name,passed=bool(ok)));print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for dark in [False,True]:
        ctx,p=scope['boot'](browser,dark=dark)
        label='dark ' if dark else 'light '
        # Row-cache comparison must never evaluate a lazy directory subtree.
        lazy=p.evaluate('''()=>{
          const n=C.navigator,ref=n.sections.get('folder'),tree=[...ref.rows.values()].find(t=>t._navOptions.navDescriptor?.key==='Folder000');
          const options=tree._navOptions,node=options.navDescriptor.node;
          const saved=Object.getOwnPropertyDescriptor(node,'children');let reads=0;
          Object.defineProperty(node,'children',{configurable:true,get(){reads++;throw Error('collapsed subtree was traversed')}});
          ref.plannedRows=[];let error='';try{n._row(ref,options)}catch(e){error=e.message}
          Object.defineProperty(node,'children',saved);ref.plannedRows=null;return {reads,error};
        }''')
        check(label+'row cache leaves lazy subtrees unread',lazy['reads']==0 and not lazy['error'])
        # A different host replaces shared appearance settings and invalidates
        # section signatures, without advancing this sidebar's local epoch.
        changed=p.evaluate('''async()=>{
          const n=C.navigator,ref=n.sections.get('folder'),tree=[...ref.rows.values()].find(t=>t._navOptions.navDescriptor?.key==='Folder000');
          const state=JSON.parse(JSON.stringify(n.customization.state));
          state.appearance[tree.row.dataset.navId]={icon:'star',color:{light:'#ff0000',dark:'#ff0000'},background:{light:'',dark:''}};
          P.settings.navigatorCustomization=state;
          P.settings.resultFolderColors={...P.settings.resultFolderColors,Folder000:{light:'#ff0000',dark:'#ff0000'}};
          for(const r of n.sections.values())r.signature='';n.renderRevision=-1;n.sync();await Promise.resolve();
          return tree.iconEl.dataset.navIcon==='star'&&tree.row.style.getPropertyValue('--ls-nav-item-color-light').toUpperCase()==='#FF0000';
        }''')
        check(label+'appearance edits from another host invalidate rows',changed)
        path='[data-nav-section="folder"] .local-search-nav-row[data-picker-key="Folder001"] > .local-search-move-tree-folder'
        p.locator(path).hover();before=p.evaluate('[...C.filterState.folders]');p.mouse.down();p.mouse.move(1100,800);p.mouse.up();p.wait_for_timeout(30)
        check(label+'dragging off a held folder does not select it',before==p.evaluate('[...C.filterState.folders]'))
        group=p.locator('[data-nav-section="folder"] > .local-search-nav-section-heading > .local-search-move-tree-toggle')
        group.focus();group.press('Enter');p.wait_for_timeout(30)
        check(label+'keyboard collapse retains visible focus',p.evaluate("C.navigator.sections.get('folder').content.hidden&&document.activeElement===C.navigator.sections.get('folder').chevron"))
        group.press('Enter');p.wait_for_timeout(30)
        # Destroy before queued projection: callbacks cannot touch a dead view.
        check(label+'pending projection is harmless after teardown',p.evaluate('''async()=>{const n=C.navigator;n.renderRevision=-1;n.sync();await V.onClose();await Promise.resolve();return n.core===null&&!n._projectionTask}'''))
        ctx.close()
        # A desktop tab's folder picker retains its held-mouse feedback.
        ctx,p=scope['boot'](browser,dark=dark)
        p.evaluate('''async()=>{await V.onClose();V=new S.SearchView({app:H.app},P,S.TAB_VIEW_TYPE);document.querySelector('#host').replaceChildren(V.containerEl);V.containerEl.style.height='100%';V.contentEl.style.height='100%';await V.onOpen();C=V.core;await waitFixture(80)}''')
        p.evaluate('C.facets.showFolderDropdown({anchor:C.searchInput})');p.wait_for_timeout(70)
        loc=p.locator('.local-search-dropdown .local-search-move-tree-row:not(.is-selected) > button.local-search-move-tree-folder').first
        loc.hover();style='el=>getComputedStyle(el.parentElement).backgroundColor'
        hover=loc.evaluate(style);p.mouse.down();held=loc.evaluate(style);p.mouse.up()
        check(label+'desktop tab retains held-mouse feedback',hover!=held)
        ctx.close()
        # Native touch CSS remains active in the mobile sidebar.
        ctx,p=scope['boot'](browser,dark=dark,mobile=True)
        p.locator('[data-nav-section="folder"] > .local-search-nav-section-heading > .local-search-move-tree-toggle').click();p.wait_for_timeout(50)
        loc=p.locator(path);count=p.locator('[data-nav-section="folder"] .local-search-nav-row[data-picker-key="Folder001"] > .local-search-move-current-badge')
        rect=count.bounding_box();normal=loc.evaluate(style);cdp=ctx.new_cdp_session(p)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':rect['x']+rect['width']/2,'y':rect['y']+rect['height']/2}]})
        held=loc.evaluate(style);cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
        check(label+'mobile sidebar retains touch feedback',normal!=held)
        ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
