"""Ownership repair boundary checks in Chromium's controlled Obsidian host."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('GLS_OWNER_EDGE_OUT', '/workspace/ownership-fix/edges'))
OUT.mkdir(parents=True, exist_ok=True)
scope = {'__file__': str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0], scope)
rows = []
def check(name, passed, evidence):
    rows.append({'name': name, 'pass': bool(passed), 'evidence': evidence})
    print(('PASS ' if passed else 'FAIL ')+name, flush=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for mobile in [False, True]:
        ctx, p = scope['boot'](browser, mobile=mobile)
        prefix = 'mobile' if mobile else 'desktop'
        errors = []
        p.on('pageerror', lambda error: errors.append(str(error)))
        recovery = p.evaluate('''async()=>{
          await P.setExcludedFolders(['Folder005']);
          C.facets.showFolderDropdown();await waitFixture(100);
          const panel=C.dropdown.panel;let renders=0;const old=C.resultRenderer.renderPage;
          C.resultRenderer.renderPage=function(...a){renders++;return old.apply(this,a)};
          await P.setExcludedFolders([]);await waitFixture(120);
          C.resultRenderer.renderPage=old;
          const result={samePanel:C.dropdown.panel===panel&&panel.isConnected,
            pending:!!C._pendingResultUpdate,results:C.fullResults.length,index:P.fileMetaCache.size,renders};
          C.dropdown.close();return result;
        }''')
        check(prefix+' restore index while Picker blocks background commit', recovery['samePanel'] and not recovery['pending'] and recovery['results']==36 and recovery['index']==36, recovery)
        channels = p.evaluate('''async()=>{
          await H.app.vault.create('Folder000/needle.md','plain');
          await H.app.vault.create('Folder001/body-match.md','needle');await P._flushIndexQueueNow();
          C.searchInput.value='needle';C.performSearch('needle');C.navigator.setPage('results',false);
          const button=C.resultChannelHost.querySelectorAll('button')[1];button.click();button.focus();
          const generation=C._resultGeneration;let renders=0;const old=C.resultRenderer.renderPage;
          C.resultRenderer.renderPage=function(...a){renders++;return old.apply(this,a)};
          button.click();const noOp=renders===0&&document.activeElement===button;
          C.resultRenderer.renderPage=old;C.performSearch('');
          const detached=!button.isConnected&&C.resultChannelHost.childElementCount===0;
          C.searchInput.value='needle';C.performSearch('needle');
          return {noOp,detached,same:button===C.resultChannelHost.querySelectorAll('button')[1],
            count:C.resultChannelHost.querySelectorAll('button').length,bodyExpanded:C.bodyExpanded};
        }''')
        check(prefix+' retained channels handle no-op, hide and reactivation', channels['noOp'] and channels['detached'] and channels['same'] and channels['count']==2 and not channels['bodyExpanded'], channels)
        navigation = p.evaluate('''()=>{
          C.filterState.clear();C.navigator.setPage('filters',false);
          const histories=[],renders=[],old=C.resultRenderer.renderPage,remember=P.recordSearchHistory;
          C.resultRenderer.renderPage=function(...a){renders.push(C.navigator.main.hidden);return old.apply(this,a)};
          P.recordSearchHistory=function(q){histories.push(q);return remember.call(this,q)};
          C.searchInput.value='note0';C._commitSearchInputValue();C.navigator.showResults();
          const search={renders:[...renders],query:C.queryState.raw,timer:!!C.searchTimer};
          C.navigator.setPage('filters',false);renders.length=0;histories.length=0;
          C.searchInput.value='note0';C._commitSearchInputValue();C.navigator.select('tag','tag0');
          const selection={renders:[...renders],query:C.queryState.raw,histories:[...histories],timer:!!C.searchTimer};
          C.resultRenderer.renderPage=old;P.recordSearchHistory=remember;
          return {search,selection};
        }''')
        check(prefix+' reveal commits pending input once and records the committed query',
              navigation['search']['renders']==[False] and navigation['search']['query']=='note0' and not navigation['search']['timer']
              and navigation['selection']['renders']==[False] and navigation['selection']['query']=='note0' and not navigation['selection']['timer']
              and (not mobile or navigation['selection']['histories']==['note0']), navigation)
        metrics = p.evaluate('''()=>{
          const root=C.containerEl;root.style.setProperty('--ls-compact-view-desktop-width','287px');
          root.style.setProperty('--ls-compact-view-mobile-width','251px');
          const panel=document.createElement('div');panel.dataset.lsDropdownSize='compact-view';
          const contract=C.dropdown._sizeContract(panel);
          root.style.removeProperty('--ls-compact-view-desktop-width');root.style.removeProperty('--ls-compact-view-mobile-width');
          const defaults=C.dropdown._sizeContract(panel);
          return {contract,defaults,missing:S.readCssNumber(root,'--audit-missing-token'),gap:C.dropdown._cssMetric('--ls-dropdown-anchor-gap')};
        }''')
        check(prefix+' CSS owns popup defaults and overrides', metrics['contract']['desktopWidth']==287 and metrics['contract']['mobileWidth']==251 and metrics['defaults']['desktopWidth']==244 and metrics['defaults']['mobileWidth']==232 and metrics['missing']==0 and metrics['gap']==(6 if mobile else 8), metrics)
        check(prefix+' no page errors', not errors, errors)
        p.evaluate('V.onClose()')
        ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2)+'\n')
assert all(row['pass'] for row in rows)
