"""Focused Chromium host-fixture checks for browse/precision separation.
This is not iOS WebKit nor native Obsidian. Does not alter any data files.
"""
import json, os, shutil, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
os.chdir(root)
out=root/'reports/current/navigation-browse'
out.mkdir(parents=True,exist_ok=True)
records=[]
with sync_playwright() as pw:
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    browser=pw.chromium.launch(headless=True,executable_path=exe if exe else None,args=['--no-sandbox'])
    for mobile in [False,True]:
      for dark in [False,True]:
        label=('mobile' if mobile else 'desktop')+('-dark' if dark else '-light')
        ctx=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,locale='zh-CN')
        page=ctx.new_page(); errs=[]
        page.on('pageerror',lambda e:errs.append(str(e)))
        try:
            page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'"><div id="host"></div></body></html>')
            for f in ['tests/browser-fixture.css','src/styles/styles.css']:
                page.add_style_tag(content=(root/f).read_text())
            for f in ['tests/host.js','tests/browser-scenarios.js']:
                page.add_script_tag(content=(root/f).read_text())
            page.evaluate('m=>bootFixture(m)',mobile)
            page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
            page.evaluate('''async()=>{
                await startFixture();
                C.destroy();
                window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),{hostKind:'sidebar',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false});
                if(!await C.init())throw Error('sidebar failed to initialize');
                await C.performSearch('');await waitFixture(250);
            }''')
            observations=page.evaluate('''async()=>{
                const checks=[];const ck=(ok,name,details={})=>{checks.push({name,ok:Boolean(ok),details});if(!ok)throw Error(name+': '+JSON.stringify(details))};
                const paths=xs=>xs.map(x=>x.path);
                const nav=C.navigator;
                ck(nav!=null,'navigator-mounted');
                const navInitial=C._navigationCandidates();
                ck(navInitial.all.length===6&&navInitial.scope.length===6,'whole-vault-available',{all:navInitial.all.length,scope:navInitial.scope.length});
                // Search must not mutate the navigation catalog or its counts.
                C.performSearch('鞋垫');await waitFixture(190);
                ck(C.queryState.raw==='鞋垫'&&C.fullResults.length===2,'query-refines-results',{results:paths(C.fullResults)});
                ck(C._navigationCandidates().all.length===6,'query-does-not-prune-facets');
                C._applyFacetSelection('tag','周报',{mode:'replace'});C._onFilterChanged();await waitFixture(190);
                ck(C._navigationCandidates().all.length===6,'tags-do-not-prune-folder-tree');
                // Explicit folder click is a location navigation, never an AND addition.
                nav.select('folder','资料');await waitFixture(250);
                ck(C.filterState.folder==='资料','folder-scope-changed');
                ck(!C.filterState.tags.size&&!C.filterState.properties.size&&!C.filterState.fileTypes.size,'transient-facets-dropped');
                ck(C.searchInput.value===''&&C.queryState.raw==='','text-query-cleared');
                ck(C.fullResults.length===2,'folder-result-scope',{results:paths(C.fullResults)});
                const scope=C._navigationCandidates();
                ck(scope.all.length===6&&scope.scope.length===2,'two-level-candidates',{all:scope.all.length,scope:scope.scope.length});
                const includedTagNames=[...new Set(scope.scope.flatMap(x=>x.tags||[]))];
                ck(includedTagNames.includes('图片')&&includedTagNames.includes('运动')&&!includedTagNames.includes('周报'),'tag-candidates-from-folder',{tags:includedTagNames});
                const keys=[...new Set(scope.scope.flatMap(x=>Object.keys(x.properties||{})))];
                ck(keys.includes('所属项目')&&!keys.includes('其它独立的项目属性'),'folder-property-catalog',{keys});
                // Actual Picker DOM: unrelated folder-only labels must not appear.
                C.facets.openTagPicker();await waitFixture(125);
                const tagPicker=C.dropdown.panel;
                const tagLabels=Array.from(tagPicker?.querySelectorAll('.local-search-tag-tree-row')||[],x=>x.textContent);
                ck(tagLabels.some(x=>x.includes('运动'))&&tagLabels.some(x=>x.includes('图片'))&&!tagLabels.some(x=>x.includes('周报')),'tag-picker-scoped-to-folder',{labels:tagLabels});
                C.dropdown.close(false);await waitFixture(60);
                C.facets.openPropertyPicker('所属项目',undefined,{mode:'quick-value'});await waitFixture(140);
                const propertyPicker=C.dropdown.panel;
                const text=propertyPicker?.textContent||'';
                ck(text.includes('卫康')&&!text.includes('研发'),'property-picker-scoped-to-folder',{text:text.slice(0,350)});
                C.dropdown.close(false);await waitFixture(60);
                C._applyFacetSelection('property','卫康',{key:'所属项目',mode:'replace'});C._onFilterChanged();await waitFixture(150);
                C._applyFacetSelection('tag','运动',{mode:'replace'});C._onFilterChanged();await waitFixture(150);
                ck(C.fullResults.length===1&&C.fullResults[0].path==='资料/鞋垫方案.md','property-and-tag-intersection',{results:paths(C.fullResults)});
                ck(C._navigationCandidates().scope.length===2,'sibling-candidates-remain-visible');
                // Switching another location clears both refinements.
                nav.select('folder','项目');await waitFixture(200);
                ck(C.filterState.folder==='项目'&&!C.filterState.tags.size&&!C.filterState.properties.size,'second-location-clears-refinements');
                ck(C.fullResults.length===2,'second-location-results');
                nav.select('folder','项目');await waitFixture(200);
                ck(C.filterState.folders.size===0&&C.fullResults.length===6,'tap-active-location-clears');
                C.destroy();await P._unloadHost();
                return checks;
            }''')
            records.append({'configuration':label,'passed':len(observations),'observations':observations,'pageErrors':errs})
            print(label,len(observations),'PASS',flush=True)
        except Exception as e:
            records.append({'configuration':label,'error':str(e),'pageErrors':errs})
            print(label,'FAIL',str(e)[:450],flush=True)
        finally:ctx.close()
    browser.close()
(out/'results.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print('TOTAL',sum(x.get('passed',0) for x in records),'failures',sum(bool(x.get('error') or x.get('pageErrors')) for x in records))
sys.exit(1 if any(x.get('error') or x.get('pageErrors') for x in records) else 0)
