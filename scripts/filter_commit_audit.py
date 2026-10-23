"""Filter commit contracts: retained conditions, live actions and scroll state."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('GLS_COMMIT_OUT', '/workspace/commit-audit/current'))
OUT.mkdir(parents=True, exist_ok=True)
results = []

def check(name, passed, evidence=None):
    results.append({'name': name, 'pass': bool(passed), 'evidence': evidence})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for mobile in [False, True]:
        for tab in [False, True]:
            scope = {'__file__': str(ROOT/'scripts/desktop_navigator_audit.py')}
            setup = (ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0]
            if tab:
                setup = setup.replace('new S.SearchView({app:H.app},P)', 'new S.SearchView({app:H.app},P,S.TAB_VIEW_TYPE)')
            if os.environ.get('GLS_COMMIT_SUBJECT'):
                setup = setup.replace("(ROOT/'tests/generated/subject.cjs')", "Path(os.environ['GLS_COMMIT_SUBJECT'])")
            exec(setup, scope)
            ctx, page = scope['boot'](browser, mobile=mobile)
            prefix = ('mobile' if mobile else 'desktop') + (' tab ' if tab else ' sidebar ')
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            x = page.evaluate('''async()=>{
              C._selectBrowseFolder('Folder000');C._onFilterChanged();
              C.navigator?.setPage('results',false);await waitFixture(60);
              const wrap=C.activeFilterWrap,button=wrap.querySelector('button');
              button.focus();const records=[],mo=new MutationObserver(r=>records.push(...r));
              mo.observe(wrap,{subtree:true,childList:true,attributes:true,characterData:true});
              for(let i=0;i<8;i++)C.facets.syncFilterButtons();
              await Promise.resolve();records.push(...mo.takeRecords());mo.disconnect();
              return {same:button===wrap.querySelector('button'),focused:document.activeElement===button,
                mutations:records.length,visible:button.getClientRects().length>0};
            }''')
            check(prefix+'unchanged conditions retain nodes and keyboard focus',x['same'] and x['focused'] and x['visible'],x)
            check(prefix+'unchanged conditions perform no DOM mutations',x['mutations']==0,x)
            x = page.evaluate('''async()=>{
              const button=C.activeFilterWrap.querySelector('button');
              C.filterState.folder='Folder001';C._onFilterChanged();await waitFixture(40);
              const name=button.getAttribute('aria-label')||document.getElementById(button.getAttribute('aria-labelledby'))?.textContent||'';
              const result={same:button===C.activeFilterWrap.querySelector('button'),label:name,
                text:button.textContent,consistent:C.fullResults.every(r=>r.path.startsWith('Folder001/'))};
              let changes=0;const old=C._onFilterChanged;C._onFilterChanged=function(...args){changes++;return old.apply(this,args)};
              C.activeFilterWrap.querySelector('button').click();C._onFilterChanged=old;
              return {...result,changes,cleared:C.filterState.folders.size===0};
            }''')
            check(prefix+'folder changes update retained text and accessible name',x['same'] and 'Folder001' in x['label'] and x['consistent'],x)
            check(prefix+'retained clear action commits once against live state',x['changes']==1 and x['cleared'],x)
            x = page.evaluate('''async()=>{
              C.filterState.tags=new Set(['tag0','tag1']);
              C.filterState.properties=new Map([['status',new Set(['active','other'])],['标签',new Set(['collision'])]]);
              C.facets.syncFilterButtons();await waitFixture(40);
              const groups=[...C.activeFilterWrap.querySelectorAll('.local-search-active-condition-group')];
              const tags=groups.find(g=>g.querySelector('button')?.textContent.startsWith('标签：'));
              const prop=groups.find(g=>g.querySelector('button')?.textContent.startsWith('status：'));
              const tagButtons=[...tags.querySelectorAll('.local-search-active-condition-value')];
              const kept=tagButtons[1];kept.focus();tagButtons[0].click();await waitFixture(40);
              const afterTag={one:C.filterState.tags.size===1&&C.filterState.tags.has('tag1'),
                retained:kept.isConnected,focused:document.activeElement===kept,
                propertyRetained:prop.isConnected,collision:C.filterState.properties.has('标签')};
              const liveProp=[...C.activeFilterWrap.querySelectorAll('.local-search-active-condition-group')].find(g=>g.querySelector('button')?.textContent.startsWith('status：'));
              liveProp.querySelector('.local-search-active-condition-value').click();await waitFixture(40);
              const single=C.filterState.properties.get('status')?.size===1;
              const remaining=[...C.activeFilterWrap.querySelectorAll('.local-search-active-condition-group')].find(g=>g.querySelector('button')?.textContent.startsWith('status：'));
              remaining.querySelector('.local-search-active-condition-key').click();await waitFixture(40);
              return {...afterTag,single,cleared:!C.filterState.properties.has('status'),
                unrelated:C.filterState.properties.has('标签')&&C.filterState.tags.has('tag1')};
            }''')
            check(prefix+'removing one tag retains siblings, focus and unrelated groups',all(x[k] for k in ['one','retained','focused','propertyRetained','collision']),x)
            check(prefix+'property value and group actions preserve other dimensions',all(x[k] for k in ['single','cleared','unrelated']),x)
            x = page.evaluate('''async()=>{
              C.filterState.tags.clear();C.filterState.properties.clear();
              C.filterState.fileTypes=new Set(['note','canvas']);
              C.filterState.dateRange={field:'created',from:'2026-01-01',to:'2026-12-31'};
              C.facets.syncFilterButtons();await waitFixture(40);
              const wrap=C.activeFilterWrap,type=wrap.querySelector('.local-search-active-condition-group');
              const date=wrap.querySelector('.local-search-active-filter-chip');
              const remaining=type.querySelectorAll('.local-search-active-condition-value')[1];
              C.filterState.dateRange={field:'modified',from:'2026-02-01',to:'2026-12-31'};
              C.facets.syncFilterButtons();await waitFixture(20);
              const dateRetained=date===wrap.querySelector('.local-search-active-filter-chip')&&date.textContent.includes('2026-02-01');
              date.click();await waitFixture(30);
              const dateCleared=C.filterState.dateRange===null&&remaining.isConnected;
              type.querySelector('.local-search-active-condition-value').click();await waitFixture(30);
              const valueRetained=remaining.isConnected&&C.filterState.fileTypes.size===1&&C.filterState.fileTypes.has('canvas');
              type.querySelector('.local-search-active-condition-key').click();await waitFixture(30);
              return {dateRetained,dateCleared,valueRetained,empty:wrap.childElementCount===0&&C.filterState.fileTypes.size===0};
            }''')
            check(prefix+'date control keeps identity, live display and clear behavior',x['dateRetained'] and x['dateCleared'],x)
            check(prefix+'type values and group clear reconcile the final empty row',x['valueRetained'] and x['empty'],x)
            x = page.evaluate('''async()=>{
              let refreshes=0;const old=C.resultControls.refreshFilterPoolHeader;
              C.resultControls.refreshFilterPoolHeader=function(...args){refreshes++;return old.apply(this,args)};
              try {
                C._pendingResultUpdate={paths:new Set(),pools:true};
                C._selectBrowseFolder('Folder001');C._onFilterChanged();await waitFixture(30);
                return {refreshes,consumed:C._pendingResultUpdate===null,consistent:C.fullResults.every(r=>r.path.startsWith('Folder001/'))};
              } finally {C.resultControls.refreshFilterPoolHeader=old;}
            }''')
            check(prefix+'pending index and explicit facet refresh commit the filter rail once',x['refreshes']==1 and x['consumed'] and x['consistent'],x)
            x = page.evaluate('''async()=>{
              C.filterState.folder='';C._onFilterChanged();await waitFixture(40);
              const list=C.resultsContainer;list.scrollTop=600;await waitFixture(70);
              const before=list.scrollTop;C._selectBrowseFolder('Folder002');C._onFilterChanged();await waitFixture(50);
              const r=C.resultRenderer;
              return {before,after:list.scrollTop,start:r.windowStart,
                consistent:C.fullResults.length>0&&C.fullResults.every(x=>x.path.startsWith('Folder002/')),
                mounted:C.resultEls.every((el,i)=>C.renderedResults[i]?.path===C._resolveResultElement(el)?.path)};
            }''')
            check(prefix+'filter commit resets a genuinely scrolled list and keeps mounted state aligned',x['before']>0 and x['after']==0 and x['start']==0 and x['consistent'] and x['mounted'],x)
            page.evaluate('V.onClose()')
            page.wait_for_timeout(40)
            check(prefix+'close leaves no asynchronous errors',not errors,errors)
            ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(r['pass'] for r in results) else 1)
