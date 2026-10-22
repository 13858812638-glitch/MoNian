"""Desktop sidebar property disclosure, stable values and lazy statistics."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_PROPERTY_EXPANSION_OUT','/workspace/sidebar-properties-audit/current'))
OUT.mkdir(parents=True,exist_ok=True)
base={'__file__':str(ROOT/'scripts/sidebar_stable_facets_audit.py')}
exec((ROOT/'scripts/sidebar_stable_facets_audit.py').read_text().split('\nwith sync_playwright()')[0],base)
results=[]
def check(name,passed,evidence=None):
    results.append({'name':name,'pass':bool(passed),'evidence':evidence})
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx,p=base['scope']['boot'](browser)
    p.evaluate('''async()=>{
      window.N=C.navigator;N.collapsed.delete('properties');N.renderRevision=-1;N.sync();await waitFixture(80);
      window.trees=()=>[...N.sections.get('properties').rows.values()];
      window.keyRow=k=>trees().find(t=>t._navOptions.navDescriptor?.kind==='property-key'&&t._navOptions.navDescriptor.key===k);
      window.valueRow=(k,v)=>trees().find(t=>t._navOptions.navDescriptor?.kind==='property-value'&&t._navOptions.navDescriptor.key===k&&t._navOptions.navDescriptor.value===v);
      window.count=(k,v)=>valueRow(k,v)?.row.querySelector(':scope > .local-search-move-current-badge')?.firstChild?.nodeValue;
      window.builds=[];const cached=N._cached;N._cached=function(k,b){return cached.call(this,k,()=>{builds.push(k);return b()})};
      window.searches=0;const search=C.performSearch;C.performSearch=function(...args){searches++;return search.apply(this,args)};
      window.clickKey=async k=>{keyRow(k)?.button.click();await waitFixture(40)};
      window.folder=async k=>{N.select('folder',k);await waitFixture(50)};
      await clickKey('alpha');
    }''')
    check('property key click expands inline',p.evaluate("N.expanded.has('properties:alpha')&&!!valueRow('alpha','x')&&!!valueRow('alpha','y')"))
    check('inline expansion does not open a picker',p.evaluate('!C.dropdown.panel?.isConnected'))
    check('disclosure does not rerun result search',p.evaluate('searches===0'))
    check('one disclosure SVG per key',p.evaluate("keyRow('alpha').row.querySelectorAll('.local-search-move-tree-toggle svg').length===1"))
    check('property disclosure arrow is visible',p.evaluate("keyRow('alpha').toggle.getAttribute('aria-hidden')!=='true'&&keyRow('alpha').toggle.getBoundingClientRect().width>0"))
    check('global counts match source',p.evaluate("count('alpha','x')==='1'&&count('alpha','y')==='1'"))
    check('collapsed keys never build value statistics',p.evaluate("!builds.some(k=>/property(?:-values|-counts)?:.*(?:beta|empty|flag|amount)/.test(k))"))
    p.evaluate('''async()=>{await clickKey('alpha');await clickKey('alpha');window.savedValues=trees().filter(t=>t._navOptions.navDescriptor?.kind==='property-value').map(t=>t.row);await folder('B')}''')
    check('zero-count values remain visible in another folder',p.evaluate("count('alpha','x')==='0'&&count('alpha','y')==='0'"))
    check('folder changes retain expanded value nodes',p.evaluate('savedValues.length===2&&savedValues.every(r=>r.isConnected)'))
    p.evaluate("valueRow('alpha','x')?.button.click()");p.wait_for_timeout(60)
    check('zero-count value selects and gives empty results',p.evaluate("C.filterState.properties.get('alpha')?.has('x')&&C.fullResults.length===0&&valueRow('alpha','x')?.row.classList.contains('is-selected')"))
    p.evaluate("folder('A')")
    check('returning to folder refreshes counts without losing values',p.evaluate("count('alpha','x')==='1'&&count('alpha','y')==='1'&&savedValues.every(r=>r.isConnected)"))
    p.evaluate('''async()=>{builds=[];searches=0;for(let i=0;i<6;i++){valueRow('alpha',i%2?'y':'x')?.button.click();await waitFixture(35)}}''')
    check('six value clicks each commit exactly once',p.evaluate('searches===6'),p.evaluate('searches'))
    check('selection changes reuse all navigation statistics',p.evaluate('builds.length===0'),p.evaluate('builds'))
    check('value selection and results agree',p.evaluate("C.fullResults.length===1&&C.filterState.properties.get('alpha')?.has('y')&&valueRow('alpha','y')?.row.classList.contains('is-selected')&&!valueRow('alpha','x')?.row.classList.contains('is-selected')"))
    p.evaluate('''async()=>{
      window.changes=0;window.mo=new MutationObserver(rs=>changes+=rs.length);mo.observe(N.sections.get('properties').content,{subtree:true,childList:true,attributes:true,characterData:true});
      for(let i=0;i<8;i++){N.renderRevision=-1;N.sync();await waitFixture(25)}mo.disconnect();
    }''')
    check('eight unchanged projections make no property DOM writes',p.evaluate('changes===0'),p.evaluate('changes'))
    p.evaluate('''async()=>{
      N.sections.get('properties').toggle.click();await waitFixture(40);builds=[];changes=0;
      mo.observe(N.sections.get('properties').content,{subtree:true,childList:true,attributes:true,characterData:true});
      await folder('B');mo.disconnect();
    }''')
    check('hidden property group skips value scans and DOM writes',p.evaluate("changes===0&&!builds.some(k=>k.startsWith('desktop-property-counts:'))"),p.evaluate('({changes,builds})'))
    p.evaluate("N.sections.get('properties').toggle.click()");p.wait_for_timeout(60)
    check('reopening hidden group updates counts before display',p.evaluate("count('alpha','x')==='0'&&count('alpha','y')==='0'&&!valueRow('alpha','y').row.classList.contains('is-selected')"))
    p.evaluate("folder('A')")
    # Actual pointer events on the arrow must toggle once, with no duplicate SVG.
    p.locator('.local-search-nav-property-key[data-property-key="alpha"] > .local-search-move-tree-toggle').click()
    p.wait_for_timeout(40)
    check('pointer click on arrow collapses exactly once',p.evaluate("!N.expanded.has('properties:alpha')&&!valueRow('alpha','x')"))
    p.locator('.local-search-nav-property-key[data-property-key="alpha"] > .local-search-move-tree-toggle').press('Enter')
    p.wait_for_timeout(40)
    check('keyboard disclosure reopens the property',p.evaluate("N.expanded.has('properties:alpha')&&!!valueRow('alpha','x')"))
    p.evaluate('''async()=>{searches=0;builds=[];for(let i=0;i<12;i++)await clickKey('alpha')}''')
    check('repeated collapse and expand reuse value models without searching',p.evaluate('searches===0&&builds.length===0'),p.evaluate('({searches,builds})'))
    check('repeated disclosure retains exactly one arrow',p.evaluate("keyRow('alpha').row.querySelectorAll('.local-search-move-tree-toggle svg').length===1"))
    p.evaluate("async()=>{await clickKey('empty');await clickKey('flag');await clickKey('amount')}" )
    check('empty false and zero properties can expand to selectable values',p.evaluate("!!valueRow('empty',S.EMPTY_PROPERTY_VALUE)&&!!valueRow('flag','false')&&!!valueRow('amount','0')"))
    check('empty-state row cannot be dragged as a real value',p.evaluate("(()=>{const custom=N.customization;custom.sortMode=true;custom.sortScope='property-value';const allowed=custom._canSort(valueRow('empty',S.EMPTY_PROPERTY_VALUE)._navOptions.navDescriptor);custom.sortMode=false;custom.sortScope=null;return !allowed})()"))
    p.evaluate('''async()=>{
      const f=H.store.get('A/one.md');await H.app.fileManager.processFrontMatter(f,m=>m.alpha='updated');
      P._queueFileIndex(f);await P._flushIndexQueueNow();C.performSearch('');await waitFixture(80);
    }''')
    check('metadata edit invalidates global values and scoped counts',p.evaluate("!valueRow('alpha','x')&&count('alpha','updated')==='1'&&count('alpha','y')==='1'"))
    p.evaluate("async()=>{await P.addPropertyCatalogValues([{key:'alpha',addValues:['catalog-only']}]);await waitFixture(80)}")
    check('catalog edit refreshes expanded values with zero count',p.evaluate("count('alpha','catalog-only')==='0'"))
    p.evaluate("async()=>{await H.app.vault.delete(H.store.get('A/one.md'));await P._flushIndexQueueNow();C.performSearch('');await waitFixture(80)}")
    check('deleting last source invalidates expanded values',p.evaluate("!valueRow('alpha','updated')&&count('alpha','y')==='1'"))
    p.evaluate('''async()=>{P.settings.excludedKeys=[...P.settings.excludedKeys,'alpha'];N.refreshPreferences();await waitFixture(60)}''')
    check('excluded key removes its expanded values too',p.evaluate("!keyRow('alpha')&&!valueRow('alpha','updated')"))
    p.screenshot(path=str(OUT/'desktop.png'))
    p.evaluate('V.onClose()');ctx.close()
    for mobile in [False,True]:
      ctx,p=base['scope']['boot'](browser,mobile=mobile)
      p.evaluate('''async()=>{window.N=C.navigator;N.collapsed.delete('properties');N.renderRevision=-1;N.sync();await waitFixture(60)}''')
      if not mobile:
        # Render the other desktop-host branch without changing its shared picker owner.
        p.evaluate("N.desktopSidebar=false;for(const r of N.sections.values())r.signature='';N.renderRevision=-1;N.sync()")
        p.wait_for_timeout(60)
      p.evaluate("[...N.sections.get('properties').rows.values()].find(t=>t._navOptions.navDescriptor?.key==='alpha').button.click()")
      p.wait_for_timeout(60)
      check('mobile retains inline expansion' if mobile else 'other desktop host retains shared picker',p.evaluate("N.expanded.has('properties:alpha')" if mobile else '!!C.dropdown.panel?.isConnected'))
      p.evaluate('V.onClose()');ctx.close()
    large={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
    exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('\nwith sync_playwright()')[0].replace("status:'active'","status:'value'+i%80"),large)
    ctx,p=large['boot'](browser,large=True)
    p.evaluate('''async()=>{
      window.N=C.navigator;N.collapsed.delete('properties');N.expanded.add('properties:status');N.renderRevision=-1;N.sync();await waitFixture(80);
      window.values=()=>[...N.sections.get('properties').rows.values()].filter(t=>t._navOptions.navDescriptor?.kind==='property-value');
      window.saved=values().map(t=>t.row);window.stats=0;window.searches=0;window.geometry=0;window.projecting=false;
      const cached=N._cached;N._cached=function(k,b){return cached.call(this,k,()=>{if(k.startsWith('desktop-property-'))stats++;return b()})};
      const search=C.performSearch;C.performSearch=function(...a){searches++;return search.apply(this,a)};
      const project=N._renderProjection;N._renderProjection=function(...a){projecting=true;try{return project.apply(this,a)}finally{projecting=false}};
      for(const name of ['getBoundingClientRect','getClientRects']){const read=Element.prototype[name];Element.prototype[name]=function(...a){if(projecting&&N.scroll.contains(this))geometry++;return read.apply(this,a)}}
      N.scroll.scrollTop=700;await waitFixture(40);
    }''')
    check('large property inventory mounts at most 60 values and a more action',p.evaluate("values().length===60&&[...N.sections.get('properties').rows.values()].some(t=>t._navOptions.rowKey==='more-property:status')"))
    p.evaluate('''async()=>{N.select('folder','Folder001');await waitFixture(60);window.firstStats=stats;stats=0;for(let i=0;i<10;i++){values()[i%2].button.click();await waitFixture(40)}}''')
    measured=p.evaluate('({stats,firstStats,searches,geometry,retained:saved.every(r=>r.isConnected)})')
    check('large expanded scope calculates one key once',measured['firstStats']==1,measured)
    check('ten large value clicks reuse statistics and existing rows',measured['stats']==0 and measured['retained'] and measured['searches']==11,measured)
    check('large scrolled filter clicks skip per-row geometry',measured['geometry']==0,measured)
    p.evaluate("[...N.sections.get('properties').rows.values()].find(t=>t._navOptions.rowKey==='more-property:status').button.click()")
    p.wait_for_timeout(60)
    check('truncated list opens the full shared property picker',p.evaluate('!!C.dropdown.panel?.isConnected'))
    p.evaluate('V.onClose()');ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(r['pass'] for r in results) else 1)
