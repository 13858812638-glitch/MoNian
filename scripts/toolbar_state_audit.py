"""Toolbar geometry and shared status-control work across desktop/mobile hosts."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_TOOLBAR_OUT','/workspace/toolbar-audit/current'));OUT.mkdir(parents=True,exist_ok=True)
results=[]
def check(name,ok,evidence=None):
 results.append({'name':name,'pass':bool(ok),'evidence':evidence});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mobile in [False,True]:
  for tab in [False,True]:
   scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
   setup=(ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0]
   if tab:setup=setup.replace('new S.SearchView({app:H.app},P)','new S.SearchView({app:H.app},P,S.TAB_VIEW_TYPE)')
   if os.environ.get('GLS_TOOLBAR_SUBJECT'):setup=setup.replace("(ROOT/'tests/generated/subject.cjs')","Path(os.environ['GLS_TOOLBAR_SUBJECT'])")
   if os.environ.get('GLS_TOOLBAR_CSS'):setup=setup.replace("(ROOT / filename).read_text()","(Path(os.environ['GLS_TOOLBAR_CSS']) if filename=='src/styles/styles.css' else ROOT / filename).read_text()")
   exec(setup,scope);ctx,p=scope['boot'](browser,mobile=mobile)
   prefix=('mobile' if mobile else 'desktop')+(' tab ' if tab else ' sidebar ')
   errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   p.evaluate('''async()=>{C._selectBrowseFolder('Folder000');C._onFilterChanged();await waitFixture(60)}''')
   x=p.evaluate('''async()=>{
    const s=C.selection,first=s.normalCurrentEl.firstChild,records=[];
    const mo=new MutationObserver(r=>records.push(...r));
    for(const el of [s.toolbar,C.propertyFilterRow])mo.observe(el,{subtree:true,childList:true,attributes:true,characterData:true});
    for(let i=0;i<8;i++){s.syncControls();C._syncResultStateRow();}
    await Promise.resolve();records.push(...mo.takeRecords());mo.disconnect();
    return {mutations:records.length,sameText:first===s.normalCurrentEl.firstChild,
      count:Number(s.normalCurrentEl.textContent),expected:C.fullResults.length};
   }''')
   check(prefix+'unchanged toolbar and state row make zero DOM mutations',x['mutations']==0,x)
   check(prefix+'statistics keep their live text node and correct count',x['sameText'] and x['count']==x['expected'],x)
   x=p.evaluate('''async()=>{
    C.selection.enterBatchMode();C.selection.togglePath(C.fullResults[0].path);await waitFixture(40);
    const s=C.selection,label=s.batchPanel.querySelector('.local-search-batch-selected');
    const name=label.getAttribute('aria-label')||document.getElementById(label.getAttribute('aria-labelledby'))?.textContent||'';
    const selected=Number(s.batchSelectedEl.textContent)===1&&!s.moveFilesBtn.disabled&&!s.deleteFilesBtn.disabled;
    s.clearState();s.syncControls();await waitFixture(20);
    const cleared=Number(s.batchSelectedEl.textContent)===0&&s.moveFilesBtn.disabled&&s.deleteFilesBtn.disabled;
    s.exitBatchMode();await waitFixture(20);
    return {selected,cleared,name,normal:!s.normalPanel.hidden&&s.batchPanel.hidden};
   }''')
   check(prefix+'real selection changes update counts, names and enabled actions',all(x[k] for k in ['selected','cleared','normal']) and '已选 1' in x['name'],x)
   x=p.evaluate('''async()=>{
    const shown=!C.propertyFilterRow.hidden&&!C.clearFiltersBtn.hidden;
    C.clearFiltersBtn.click();await waitFixture(40);
    return {shown,empty:C.activeFilterWrap.childElementCount===0,hidden:C.propertyFilterRow.hidden,
      clearHidden:C.clearFiltersBtn.hidden,scope:C.filterState.folders.size};
   }''')
   check(prefix+'clearing the final condition hides the row and action',x['shown'] and x['empty'] and x['hidden'] and x['clearHidden'] and x['scope']==0,x)
   if not tab:
    p.evaluate("C.navigator.setPage('filters',false)");p.wait_for_timeout(30)
    if not mobile:
     for width in [714,520]:
      p.evaluate('(width)=>{document.querySelector("#host").style.width=width+"px";V.onResize()}',width);p.wait_for_timeout(40)
      x=p.evaluate('''()=>{
       const n=C.navigator,bar=n.mobileToolbar,b=bar.getBoundingClientRect(),style=getComputedStyle(bar);
       const buttons=[...bar.querySelectorAll('button')].filter(e=>e.getClientRects().length);
       const ref=C.selection.normalPanel.querySelector('.local-search-status-filter-action'),right=ref.querySelector('svg').getBoundingClientRect();
       return {right:right.width,buttons:buttons.map(e=>{const r=e.getBoundingClientRect(),svg=e.querySelector('svg').getBoundingClientRect();return {w:r.width,h:r.height,svg:svg.width,right:r.right,inside:r.left>=b.left&&r.right<=b.right}}),
         expectedRight:b.right-parseFloat(style.paddingRight),justify:style.justifyContent,referenceButton:ref.getBoundingClientRect().width};
      }''')
      check(prefix+f'{width}px icons and buttons match right action rail',len(x['buttons'])>0 and all(abs(b['svg']-x['right'])<.1 and abs(b['w']-x['referenceButton'])<.1 for b in x['buttons']),x)
      check(prefix+f'{width}px commands align right and fit the toolbar',x['justify']=='flex-end' and all(b['inside'] for b in x['buttons']) and abs(max(b['right'] for b in x['buttons'])-x['expectedRight'])<1,x)
     p.evaluate("C.containerEl.style.setProperty('--ls-selection-icon-size','19px');C.containerEl.style.setProperty('--ls-selection-action-size','32px')")
     x=p.evaluate('''()=>({icons:[...C.navigator.mobileToolbar.querySelectorAll('button')].filter(e=>e.getClientRects().length).map(e=>e.querySelector('svg').getBoundingClientRect().width),other:[...C.selection.normalPanel.querySelectorAll('.local-search-status-filter-action svg')].map(e=>e.getBoundingClientRect().width)})''')
     check(prefix+'existing Style Settings tokens control both toolbars together',len(x['icons'])>0 and all(v==19 for v in x['icons']+x['other']),x)
     p.evaluate("C.containerEl.style.removeProperty('--ls-selection-icon-size');C.containerEl.style.removeProperty('--ls-selection-action-size');document.querySelector('#host').style.width='714px';V.onResize()")
     p.wait_for_timeout(40)
    else:
     x=p.evaluate('''()=>{const bar=C.navigator.mobileToolbar;return {justify:getComputedStyle(bar).justifyContent,buttons:[...bar.querySelectorAll('button')].filter(e=>e.getClientRects().length).map(e=>({size:e.getBoundingClientRect().width,icon:e.querySelector('svg').getBoundingClientRect().width}))}}''')
     check(prefix+'mobile keeps its touch targets and original alignment',x['justify']=='flex-start' and len(x['buttons'])>0 and all(b['size']==44 and b['icon']==22 for b in x['buttons']),x)
    p.screenshot(path=str(OUT/(prefix.strip().replace(' ','-')+'.png')))
   p.evaluate('V.onClose()');p.wait_for_timeout(30);check(prefix+'close produces no asynchronous errors',not errors,errors);ctx.close()
 browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(r['pass'] for r in results) else 1)
