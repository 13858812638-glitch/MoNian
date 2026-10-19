"""Browser-host regression for mobile Navigator Results -> Filters atomic projection.
No real iPhone or native Obsidian claim. Exercises the actual compiled GLS classes.
"""
from pathlib import Path
import json, os, shutil, sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
os.chdir(ROOT)
OUT=ROOT/'reports/current/navigator-return-atomic'
OUT.mkdir(parents=True,exist_ok=True)
checks=[]; failures=[]
with sync_playwright() as pw:
    binary=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    browser=pw.chromium.launch(headless=True,executable_path=binary if binary else None,args=['--no-sandbox'])
    for theme,width in [('light',390),('dark',390),('light',320),('dark',320)]:
        name=f'{theme}-{width}'
        context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,locale='zh-CN')
        page=context.new_page(); errors=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        try:
            page.set_content(f'''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="is-mobile is-ios theme-{theme}"><div id="host" style="height:780px;width:100%;display:flex;flex-direction:column"></div></body></html>''')
            for f in ['tests/browser-fixture.css','src/styles/styles.css']:
                page.add_style_tag(content=(ROOT/f).read_text())
            for f in ['tests/host.js','tests/browser-scenarios.js']:
                page.add_script_tag(content=(ROOT/f).read_text())
            page.evaluate('()=>bootFixture(true)')
            page.add_script_tag(content=(ROOT/'tests/generated/subject.cjs').read_text())
            report=page.evaluate('''async()=>{
                const rows=[];
                const ck=(name,ok,evidence={})=>{rows.push({name,ok:!!ok,evidence});if(!ok)throw Error(name+' '+JSON.stringify(evidence))};
                window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);
                await P.onload();await H.layoutReady();await P._flushIndexQueueNow();
                window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),
                    {hostKind:'sidebar',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false});
                if(!await C.init())throw Error('init failed');C.performSearch('');await waitFixture(80);
                const nav=C.navigator;nav.resize();
                nav.collapsed.delete('tags');nav.collapsed.delete('properties');
                nav.renderRevision=-1;nav.sync();await waitFixture(80);
                const tags=()=>nav.sections.get('tags').content.textContent;
                const props=()=>nav.sections.get('properties').content.textContent;
                const initial={tags:tags(),props:props()};
                ck('initial-vault-has-tag-branches',initial.tags.includes('周报')&&initial.tags.includes('图片'),initial);
                ck('initial-vault-has-property-values',initial.props.includes('4'),initial);
                ck('live-mobile-layout',nav.layout==='mobile',{layout:nav.layout});
                const style=getComputedStyle(C.containerEl);
                ck('CSS Snapshot root pad-x 6px',style.getPropertyValue('--ls-result-card-pad-x').trim()==='6px',
                    {computed:style.getPropertyValue('--ls-result-card-pad-x')});
                ck('CSS Snapshot standard pad-y 6px',style.getPropertyValue('--ls-item-pad-y').trim()==='6px',
                    {computed:style.getPropertyValue('--ls-item-pad-y')});
                const origRender=nav._renderProjection.bind(nav);
                let rendered=0;
                nav._renderProjection=function(){rendered++;return origRender()};
                // A real location click enters Results and must NOT rebuild the hidden tree.
                nav.select('folder','资料');
                const countBefore=rendered;
                ck('select-location-enter-results',nav.page==='results'&&nav.facets.hidden,{page:nav.page});
                ck('hidden-navigation-is-not-eagerly-rendered',nav.renderRevision!==C._resultGeneration&&countBefore===0,
                    {generation:C._resultGeneration,renderRevision:nav.renderRevision,rendered});
                nav.back(); // No await: inspect before the browser can paint one intermediate frame.
                const immediate={tags:tags(),props:props(),renderRevision:nav.renderRevision,generation:C._resultGeneration,timer:nav._projectionTimer,scrollTop:nav.scroll.scrollTop};
                ck('return-shows-visible-filters',nav.page==='filters'&&!nav.facets.hidden,immediate);
                ck('return-is-fresh-before-first-frame',immediate.renderRevision===immediate.generation&&immediate.timer===null,immediate);
                ck('return-tags-correct-without-wait',immediate.tags.includes('图片')&&immediate.tags.includes('运动')&&!immediate.tags.includes('周报'),immediate);
                ck('return-properties-correct-without-wait',!immediate.props.includes('4')&&immediate.props.includes('所属项目2'),immediate);
                ck('single-visible-projection',rendered===1,{rendered});
                await new Promise(resolve=>requestAnimationFrame(resolve));await waitFixture(40);
                ck('no-late-content-swap-after-frame',rendered===1&&tags()===immediate.tags&&props()===immediate.props,
                    {rendered,atFirstPaint:immediate,after:{tags:tags(),props:props()}});
                // Another folder makes a *different* current-scope property+tag projection.
                nav.select('folder','项目');
                nav.back();
                const newScope={tags:tags(),props:props(),revision:nav.renderRevision,generation:C._resultGeneration};
                ck('rapid-new-folder-immediate-projection',newScope.revision===newScope.generation&&newScope.tags.includes('周报')&&!newScope.tags.includes('运动'),newScope);
                // Clear a live query on Back, preserving explicit folder selection.
                nav.showResults(false);C.searchInput.value='周报';C.performSearch('周报');
                nav.back();
                ck('return-clears-only-live-query',C.queryState.raw===''&&C.filterState.folders.has('项目')&&nav.renderRevision===C._resultGeneration,
                    {query:C.queryState.raw,folders:[...C.filterState.folders],rev:nav.renderRevision,gen:C._resultGeneration});
                ck('return-does-not-refocus-search-input',document.activeElement!==C.searchInput,
                    {active:document.activeElement?.className});
                C.destroy();await P._unloadHost();
                return rows;
            }''')
            for row in report:
                checks.append(dict(configuration=name,**row))
            if errors: failures.append(dict(configuration=name,errors=errors))
            print(name,len(report),'PASS' if not errors else 'PAGE ERRORS',flush=True)
        except Exception as error:
            failures.append(dict(configuration=name,error=str(error),pageErrors=errors))
            print(name,'FAIL',str(error)[:500],flush=True)
        finally: context.close()
    browser.close()
result={'source':'actual compiled GLS subject in Chromium synthetic Obsidian host','ios_webkit_verified':False,'checks':checks,'failures':failures,'passed':len(checks),'failed':len(failures)}
(OUT/'results.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
print('TOTAL',len(checks),'FAILURES',len(failures))
sys.exit(1 if failures else 0)
