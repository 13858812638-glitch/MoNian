from pathlib import Path
import json, shutil
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parent.parent
out=r/'reports/current'; out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 for mobile in [True,False]:
  for host in ['sidebar','embedded']:
   ctx=b.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile)
   page=ctx.new_page(); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
   page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile ' if mobile else '')+'theme-light"><div id="host"></div></body></html>')
   page.add_style_tag(content=(r/'tests/browser-fixture.css').read_text());page.add_style_tag(content=(r/'src/styles/styles.css').read_text())
   page.add_script_tag(content=(r/'tests/host.js').read_text());page.add_script_tag(content=(r/'tests/browser-scenarios.js').read_text().replace("hostKind:'embedded',persistModalSession",f"hostKind:'{host}',persistModalSession"))
   page.evaluate('m=>bootFixture(m)',mobile);page.add_script_tag(content=(r/'tests/generated/subject.cjs').read_text());page.evaluate('()=>startFixture()')
   page.evaluate('''()=>{window.probe=()=>{const n=C.navigator,r=C.propertyFilterRow; const s=e=>e?{hidden:e.hidden,display:getComputedStyle(e).display,text:e.textContent,rect:e.getBoundingClientRect().toJSON()}:null;return {query:C.queryState.raw,input:C.searchInput.value,filters:C.filterState.toSnapshot(),searchFilters:C.createFlow.searchResultFilterState().toSnapshot(),create:C.createFlow.isCreateView(),page:n?.page,layout:n?.layout,results:C.fullResults.length,generation:C._resultGeneration,navRevision:n?.renderRevision,cacheRevision:n?._cacheRevision,condition:s(r),channels:s(C.resultChannelHost),chips:s(C.activeFilterWrap),clear:s(C.clearFiltersBtn),counts:[...document.querySelectorAll('.local-search-nav-section')].map(e=>({id:e.dataset.navSection,text:e.textContent})),active:document.activeElement?.className}};}''')
   records=[]
   def snap(label):
    page.wait_for_timeout(240);v=page.evaluate('probe()');records.append({'stage':label,**v});print(mobile,host,label,json.dumps({k:v[k] for k in ['query','create','page','results','generation','navRevision','cacheRevision'] if k in v}), 'condition',v['condition']['hidden'],'channels',v['channels']['text'],'counts',v['counts'],flush=True)
   snap('initial')
   if host=='sidebar':page.evaluate('C.navigator.showResults(false)')
   page.evaluate("C.searchInput.value='不可能有的检索词';C.searchInput.dispatchEvent(new InputEvent('input',{bubbles:true}))")
   snap('zero-query')
   page.locator('[data-ls-input-action="clear-input"]').first.click(force=True)
   snap('erased-zero')
   page.evaluate("C.searchInput.value='不可能有的检索词';C.searchInput.dispatchEvent(new InputEvent('input',{bubbles:true}))")
   snap('second-zero')
   if host=='sidebar':page.evaluate("C.navigator.tools.get('filters').button.click()")
   snap('returned-filters')
   page.evaluate('C._clearSearchContext()')
   snap('clear-all')
   page.evaluate("C.facets.showFolderDropdown({anchor:C.navigator?.tools.get('filters')?.button||C.folderBtn})")
   page.wait_for_timeout(240)
   search=page.locator('.local-search-picker-search').first
   if mobile:search.tap()
   else:search.click()
   search.type('资料');page.wait_for_timeout(200)
   info=search.evaluate('''e=>{const s=getComputedStyle(e);let a=e;const path=[];while(a){const c=getComputedStyle(a);path.push({cls:a.className,rect:a.getBoundingClientRect().toJSON(),transform:c.transform,contain:c.contain,overflow:c.overflow,opacity:c.opacity,pointerEvents:c.pointerEvents,userSelect:c.userSelect,hidden:a.hidden});a=a.parentElement}return {outer:e.outerHTML,active:document.activeElement===e,caret:s.caretColor,color:s.color,font:s.fontSize,line:s.lineHeight,start:e.selectionStart,end:e.selectionEnd,path}}''')
   records.append({'stage':'picker-input',**info});page.screenshot(path=str(out/f'probe-{host}-{mobile}-picker.png'),caret='initial')
   print('PICKER',mobile,host,json.dumps(info,ensure_ascii=False),flush=True)
   (out/f'probe-{host}-{mobile}.json').write_text(json.dumps({'records':records,'errors':errors},ensure_ascii=False,indent=2))
   ctx.close()
 b.close()
