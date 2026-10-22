"""Release edge cases through actual SearchView lifecycle in a mocked Chromium host."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('GLS_RELEASE_OUT', '/workspace/sidebar-release-audit/current'))
OUT.mkdir(parents=True, exist_ok=True)
scope = {'__file__': str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0], scope)
rows = []
def check(name, passed, evidence=None):
    rows.append(dict(name=name, passed=bool(passed), evidence=evidence))
    print(('PASS ' if passed else 'FAIL ')+name, flush=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for dark in [False, True]:
        ctx, p = scope['boot'](browser, dark=dark, large=True)
        prefix = 'dark ' if dark else 'light '
        errors = []
        p.on('pageerror', lambda error: errors.append(str(error)))
        for order, hidden, label in [([], [], 'empty'), (['collapse', 'history'], ['collapse', 'history'], 'all-hidden')]:
            result = p.evaluate('''async({order,hidden})=>{
              P.settings.navigatorToolbars={filters:{version:2,order,hidden}};
              const n=C.navigator;n.refreshPreferences();await waitFixture(60);
              const observer=new MutationObserver(()=>{});
              observer.observe(n.mobileToolbar,{attributes:true,attributeFilter:['hidden']});
              for(let i=0;i<10;i++)n._syncMobileTools();
              const writes=observer.takeRecords().length;observer.disconnect();
              return {writes,hidden:n.mobileToolbar.hidden};
            }''', dict(order=order, hidden=hidden))
            check(prefix+label+' toolbar remains hidden without repeated writes', result['hidden'] and result['writes']==0, result)
        p.evaluate("P.settings.navigatorToolbars={filters:{version:2,order:['history','collapse'],hidden:[]}};C.navigator.refreshPreferences()")
        p.wait_for_timeout(60)
        check(prefix+'toolbar re-enable preserves order and original command', p.evaluate('''()=>{
          const n=C.navigator;return !n.mobileToolbar.hidden &&
            [...n.mobileToolbar.children].filter(x=>!x.hidden).map(x=>x.dataset.navAction).join(',')==='history,collapse'
            &&n.tools.get('history').host.contains(C.resultControls.historyBtn);
        }'''))
        p.evaluate("C.resultControls.historyBtn.click()")
        p.wait_for_timeout(50)
        check(prefix+'re-enabled command opens its picker', p.evaluate('C.dropdown.isOpenFor(C.resultControls.historyBtn)'))
        p.evaluate("P.settings.navigatorToolbars={filters:{version:2,order:[],hidden:[]}};C.navigator.refreshPreferences()")
        p.wait_for_timeout(50)
        check(prefix+'removing active command releases picker and restores original button', p.evaluate('''()=>
          !C.dropdown.panel && !C.navigator.tools.get('history').host.contains(C.resultControls.historyBtn)
            &&C.resultControls.historyBtn.isConnected'''))
        divider = p.locator('.local-search-nav-divider')
        for cancel in ['Escape', 'blur', 'pointercancel']:
            p.evaluate('C.navigator._desktopPane.restore(250)')
            box = divider.bounding_box()
            p.mouse.move(box['x']+box['width']/2, box['y']+60);p.mouse.down()
            p.mouse.move(box['x']+box['width']/2+85, box['y']+60);p.wait_for_timeout(40)
            if cancel=='Escape': p.keyboard.press('Escape')
            elif cancel=='blur': p.evaluate("window.dispatchEvent(new Event('blur'))")
            else: p.evaluate("window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1}))")
            p.mouse.up();p.wait_for_timeout(40)
            result = p.evaluate('''()=>({width:C.navigator.facets.getBoundingClientRect().width,
              aria:Number(document.querySelector('.local-search-nav-divider').getAttribute('aria-valuenow')),
              saved:C.navigator.capture().paneWidth,dragging:C.navigator.root.classList.contains('is-nav-resizing')})''')
            check(prefix+cancel+' restores actual, saved and accessible widths', abs(result['width']-250)<2 and result['aria']==250 and result['saved']==250 and not result['dragging'], result)
        p.evaluate('C.navigator._desktopPane.restore(250)')
        box=divider.bounding_box()
        p.mouse.move(box['x']+box['width']/2, box['y']+60);p.mouse.down()
        p.mouse.move(box['x']+box['width']/2+50, box['y']+60);p.wait_for_timeout(30)
        p.evaluate("document.querySelector('#host').style.width='700px';V.onResize()")
        p.wait_for_timeout(40)
        p.mouse.move(680, box['y']+60);p.mouse.up();p.wait_for_timeout(40)
        result=p.evaluate('''()=>({width:C.navigator.facets.getBoundingClientRect().width,
          saved:C.navigator.capture().paneWidth,aria:Number(document.querySelector('.local-search-nav-divider').getAttribute('aria-valuenow')),
          max:Number(document.querySelector('.local-search-nav-divider').getAttribute('aria-valuemax'))})''')
        check(prefix+'host resize cancels stale drag bounds', result['saved']==250 and abs(result['width']-250)<2 and result['aria']<=result['max'], result)
        p.evaluate("document.querySelector('#host').style.width='1200px';V.onResize()")
        p.wait_for_timeout(40)
        for key in ['Home', 'End', 'ArrowLeft']:
            divider.press(key)
            result=p.evaluate('''()=>{const d=document.querySelector('.local-search-nav-divider');return {
              width:C.navigator.facets.getBoundingClientRect().width,aria:Number(d.getAttribute('aria-valuenow')),
              min:Number(d.getAttribute('aria-valuemin')),max:Number(d.getAttribute('aria-valuemax'))};}''')
            check(prefix+'keyboard '+key+' retains width bounds', abs(result['width']-result['aria'])<2 and result['min']<=result['aria']<=result['max'], result)
        result=p.evaluate('''async()=>{
          const n=C.navigator,id=n.sections.get('folder').heading.dataset.navId;
          const before=JSON.stringify(P.settings.navigatorCustomization),save=P.saveSettings;
          let rejected=false;P.saveSettings=async()=>false;
          try{await n.customization.setAppearance(id,{icon:'star'})}catch{rejected=true}
          P.saveSettings=save;await waitFixture(50);
          const rolledBack=JSON.stringify(P.settings.navigatorCustomization)===before;
          await n.customization.setAppearance(id,{icon:'star'});await waitFixture(50);
          return {rejected,rolledBack,recovered:n.sections.get('folder').heading.querySelector('.local-search-move-tree-folder-icon').dataset.testIcon==='star'};
        }''')
        check(prefix+'failed save rolls back and next save succeeds', all(result.values()), result)
        result=p.evaluate('''async()=>{
          const n=C.navigator;for(let i=0;i<30;i++)n.select('folder','Folder'+String(i).padStart(3,'0'));
          await waitFixture(100);return {folders:[...C.filterState.folders],count:C.fullResults.length,
            selected:[...n.scroll.querySelectorAll('.is-selected[data-nav-id]')].map(x=>JSON.parse(x.dataset.navId)).filter(x=>x[0]==='folder').map(x=>x[1])};
        }''')
        check(prefix+'rapid folder selection keeps final scope', result['folders']==['Folder029'] and result['count']==12 and result['selected']==['Folder029'], result)
        result=p.evaluate('''async()=>{
          const retired=[];let restored=true;
          for(let i=0;i<3;i++){
            C.navigator._desktopPane.restore(275);C.navigator.collapsed.add('tags');C.navigator.sync();
            C.facets.showFolderDropdown({anchor:C.navigator.sections.get('folder').toggle});
            const session=C.captureSession(),old=C.navigator;retired.push(old);
            await V.onClose();V.containerEl.remove();
            V=new S.SearchView({app:H.app},P);V._state={session};document.querySelector('#host').append(V.containerEl);
            V.containerEl.style.height='100%';V.contentEl.style.height='100%';await V.onOpen();C=V.core;await waitFixture(70);
            restored &&=C.navigator.capture().paneWidth===275&&C.navigator.collapsed.has('tags')&&C.filterState.folders.has('Folder029');
          }
          return {restored,retired:retired.every(n=>n.core===null&&n.cleanups.length===0&&n._projectionTask===null),
            roots:document.querySelectorAll('.local-search-navigator').length,pickers:document.querySelectorAll('.local-search-dropdown').length};
        }''')
        check(prefix+'close and reopen preserves session and releases old navigator', result['restored'] and result['retired'] and result['roots']==1 and result['pickers']==0, result)
        check(prefix+'no asynchronous browser errors', not errors, errors)
        p.evaluate('V.onClose()');ctx.close()
    browser.close()
report=dict(passed=sum(r['passed'] for r in rows),failed=sum(not r['passed'] for r in rows),results=rows)
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(bool(report['failed']))
