"""Stable desktop facet rows, folder-scoped counts, and source invalidation."""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_STABLE_FACETS_OUT','/workspace/sidebar-stable-audit/current'))
OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
setup=(ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0]
setup=re.sub(r'const files=Array.from.*?window.H=', '''const files=[
        {path:'A/one.md',content:'one',properties:{tags:['Work/One','Shared'],alpha:'x',empty:'',flag:false,amount:0}},
        {path:'A/two.md',content:'two',properties:{tags:['Work/Two','work/one'],alpha:'y'}},
        {path:'B/three.md',content:'three',properties:{tags:['Remote','Shared'],beta:'z'}},
        {path:'root.md',content:'root',properties:{rootOnly:'r'}}];
      window.H=''',setup,flags=re.S)
exec(setup,scope)
results=[]
def check(name,passed,evidence=None):
    results.append({'name':name,'pass':bool(passed),'evidence':evidence})
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for mobile in [False,True]:
        ctx,p=scope['boot'](browser,mobile=mobile)
        p.evaluate('''async()=>{
          window.N=C.navigator;
          N.collapsed.delete('properties');N.expanded.add('tag:Work');N.renderRevision=-1;N.sync();await waitFixture(50);
          window.rows=kind=>[...N.sections.get(kind).content.querySelectorAll('.local-search-nav-row')];
          window.row=(kind,key)=>rows(kind).find(r=>r.dataset.pickerKey===key);
          window.count=(kind,key)=>row(kind,key)?.querySelector(':scope > .local-search-move-current-badge')?.textContent;
          window.inventory=()=>Object.fromEntries(['tags','properties'].map(k=>[k,rows(k).map(r=>r.dataset.pickerKey)]));
          window.initialInventory=inventory();window.originalRows=new Map(['tags','properties'].flatMap(k=>rows(k).map(r=>[k+':'+r.dataset.pickerKey,r])));
          window.writes=0;window.observer=new MutationObserver(rs=>{
            for(const r of rs) if(r.type==='childList') writes+=[...r.addedNodes,...r.removedNodes].filter(n=>n.nodeType===1&&n.matches('.local-search-nav-row')).length;
          });for(const k of ['tags','properties'])observer.observe(N.sections.get(k).content,{subtree:true,childList:true});
          window.decorations=0;const decorate=N.customization.decorate;N.customization.decorate=function(r,...a){if(r.classList.contains('local-search-nav-row'))decorations++;return decorate.call(this,r,...a)};
          window.modelBuilds=0;const cached=N._cached;N._cached=function(k,b){return cached.call(this,k,()=>{if(k.includes('tag-tree')||k.includes('property-keys'))modelBuilds++;return b()})};
          window.selectFolder=async path=>{N.select('folder',path);if(N.layout==='mobile')N.setPage('filters',false);await waitFixture(35)};
          await selectFolder('A');
        }''')
        a=p.evaluate('''()=>({inventory:inventory(),initial:initialInventory,remote:count('tags','Remote'),work:count('tags','Work'),
          one:count('tags','Work/One'),beta:count('properties','beta'),alpha:count('properties','alpha'),
          empty:count('properties','empty'),flag:count('properties','flag'),amount:count('properties','amount'),
          same:[...originalRows].every(([key,r])=>r.isConnected&&row(...[key.slice(0,key.indexOf(':')),key.slice(key.indexOf(':')+1)])===r)})''')
        if mobile:
            check('mobile retains folder-scoped inventory','Remote' not in a['inventory']['tags'] and 'beta' not in a['inventory']['properties'],a)
            check('mobile counts remain folder-scoped',a['work']=='2' and a['alpha']=='2',a)
            p.evaluate('V.onClose()');ctx.close();continue
        check('desktop keeps complete tag and property inventory',a['inventory']==a['initial'],a)
        check('desktop retains the same DOM row nodes',a['same'])
        check('unrelated tags and keys stay visible with zero counts',a.get('remote')=='0' and a.get('beta')=='0',a)
        check('hierarchical tags count each file once',a['work']=='2' and a['one']=='2',a)
        check('empty false and zero are present properties',all(a[k]=='1' for k in ['empty','flag','amount']),a)
        p.evaluate('''async()=>{for(let i=0;i<12;i++)await selectFolder(i%2?'A':'B')}''')
        stable=p.evaluate('''()=>({writes,decorations,modelBuilds,inventory:inventory(),same:[...originalRows.values()].every(r=>r.isConnected)})''')
        check('folder switching does not remove insert or reorder facet rows',stable['writes']==0 and stable['same'],stable)
        check('count updates do not redecorate unchanged rows',stable['decorations']==0,stable)
        check('folder changes reuse tag and property inventory models',stable['modelBuilds']==0,stable)
        p.evaluate("row('properties','beta')?.querySelector('.local-search-move-tree-folder').click()")
        p.wait_for_timeout(40)
        check('zero-count property expands its global values inline',p.evaluate("N.expanded.has('properties:beta')&&count('properties','z')==='0'&&!C.dropdown.panel?.isConnected"))
        p.evaluate("row('properties','beta')?.querySelector('.local-search-move-tree-folder').click()");p.wait_for_timeout(40)
        p.evaluate("N.sections.get('tags').heading.querySelector('.local-search-nav-section-toggle').click()")
        p.evaluate("selectFolder('B')")
        p.evaluate("N.sections.get('tags').heading.querySelector('.local-search-nav-section-toggle').click()")
        check('collapsed group receives current counts before reopening',p.evaluate("count('tags','Remote')==='1'&&count('tags','Work')==='0'"))
        p.evaluate("selectFolder('A')")
        p.evaluate("row('tags','Work').querySelector('.local-search-move-tree-toggle').click()")
        p.wait_for_timeout(40)
        p.evaluate("selectFolder('B')")
        p.evaluate("row('tags','Work').querySelector('.local-search-move-tree-toggle').click()")
        p.wait_for_timeout(40)
        check('reopened zero-count branch retains its global children',p.evaluate("count('tags','Work/One')==='0'&&count('tags','Work/Two')==='0'"))
        p.evaluate("selectFolder('A')")
        p.evaluate("row('tags','Remote')?.querySelector('.local-search-move-tree-folder').click()")
        p.wait_for_timeout(40)
        zero=p.evaluate("({count:C.fullResults.length,selected:C.filterState.tags.has('Remote'),remote:count('tags','Remote')})")
        check('zero-count tag remains selectable and shows empty results',zero=={'count':0,'selected':True,'remote':'0'},zero)
        p.evaluate("selectFolder('Missing')")
        empty=p.evaluate("({same:JSON.stringify(inventory())===JSON.stringify(initialInventory),counts:['tags','properties'].flatMap(k=>rows(k).map(r=>r.querySelector(':scope > .local-search-move-current-badge')?.textContent))})")
        check('empty folder keeps all rows and zero counts',empty['same'] and all(v=='0' for v in empty['counts']),empty)
        p.evaluate('''async()=>{
          await P.addPropertyCatalogValues([{key:'catalogOnly',addValues:['unused']}]);await waitFixture(60);
        }''')
        check('catalog-only key remains visible in a selected folder',p.evaluate("count('properties','catalogOnly')==='0'"))
        p.evaluate('''async()=>{
          const f=await H.app.vault.create('B/new.md','new');
          await H.app.fileManager.processFrontMatter(f,m=>{m.tags=['New/Child'];m.newKey='new'});
          P._queueFileIndex(f);await P._flushIndexQueueNow();C.performSearch('');await waitFixture(60);
        }''')
        check('index addition refreshes global rows outside current folder',p.evaluate("count('tags','New')==='0'&&count('properties','newKey')==='0'"))
        p.evaluate("selectFolder('B')")
        check('new folder scope updates live counts',p.evaluate("count('tags','New')==='1'&&count('properties','newKey')==='1'"))
        p.evaluate('''async()=>{
          const f=H.store.get('B/new.md');await H.app.fileManager.processFrontMatter(f,m=>{m.tags=['Replacement'];delete m.newKey;m.replacementKey='r'});
          P._queueFileIndex(f);await P._flushIndexQueueNow();C.performSearch('');await waitFixture(60);
        }''')
        check('metadata edits invalidate removed and added inventory',p.evaluate("!row('tags','New')&&count('tags','Replacement')==='1'&&!row('properties','newKey')&&count('properties','replacementKey')==='1'"))
        p.evaluate('''async()=>{
          P.settings.excludedKeys=[...P.settings.excludedKeys,'beta'];N.refreshPreferences();await waitFixture(40);
        }''')
        check('global property exclusions still hide excluded keys',p.evaluate("!row('properties','beta')"))
        p.evaluate('''async()=>{await H.app.vault.delete(H.store.get('B/new.md'));await P._flushIndexQueueNow();C.performSearch('');await waitFixture(60)}''')
        check('file deletion removes its last unique tag and key',p.evaluate("!row('tags','Replacement')&&!row('properties','replacementKey')"))
        p.screenshot(path=str(OUT/'desktop.png'))
        p.evaluate('observer.disconnect();V.onClose()');ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(r['pass'] for r in results) else 1)
