"""Real Chromium regression gates for the v5.1 atomic renderer, eraser and catalog scope.
Uses the frozen project's existing Obsidian host fixture, not a simulated fake renderer.
"""
from pathlib import Path
from subprocess import run
from playwright.sync_api import sync_playwright
import json, shutil, sys
root=Path(__file__).resolve().parents[1]
out=root/'reports'/'repair-regression.json'
with (root/'reports'/'repair-regression-build.log').open('w') as stream:
    run(['node','--input-type=module','-e',"import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"],cwd=root,check=True,stdout=stream,stderr=stream)
results=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
    for mobile in [False, True]:
        page=b.new_page(viewport={'width':390 if mobile else 960,'height':844},is_mobile=mobile,has_touch=mobile)
        page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="is-mobile theme-dark"><div id="host" style="height:740px"></div></body></html>')
        for n in ['tests/browser-fixture.css','src/styles/styles.css']:
            page.add_style_tag(content=(root/n).read_text())
        for n in ['tests/host.js','tests/browser-scenarios.js']:
            page.add_script_tag(content=(root/n).read_text())
        page.evaluate('(mobile)=>bootFixture(mobile)',mobile)
        page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
        page.evaluate('()=>startFixture()')
        result=page.evaluate('''async()=>{
            const rowCount=()=>C.resultsRail.querySelectorAll('.local-search-item').length;
            const rail=C.resultsRail;
            const renderer=C.resultRenderer;
            const before={count:rowCount(), markup:rail.innerHTML, start:renderer.windowStart, end:renderer.windowEnd,
               selected: C.selectedIndex, scroll:C.resultsContainer.scrollTop, heightIndex: renderer._heightIndex};
            const original=renderer._buildResultItem;
            let built=0, error='';
            renderer._buildResultItem=function(...args){if(++built===3)throw Error('injected-card-build-failure');return original.apply(this,args)};
            try{renderer.renderPage({syncControls:false})}catch(e){error=e.message}
            renderer._buildResultItem=original;
            const failure={error, count:rowCount(), sameMarkup:before.markup===rail.innerHTML,
              sameRange: renderer.windowStart===before.start&&renderer.windowEnd===before.end,
              sameScroll:C.resultsContainer.scrollTop===before.scroll,
              sameHeightIndex:renderer._heightIndex===before.heightIndex,
              isRendering:C._isRendering};
            renderer.renderPage({syncControls:false});
            const recover={count:rowCount()};
            // Also simulate a failure after the prepared page has been
            // committed, e.g. a downstream mounted-state listener throws.
            const mounted=renderer._syncMountedState;
            const preCommitMarkup=rail.innerHTML;
            const preCommitScroll=C.resultsContainer.scrollTop;
            renderer._syncMountedState=()=>{throw Error('injected-mounted-state-failure')};
            let commitError='';
            try{renderer.renderPage({syncControls:false})}catch(e){commitError=e.message}
            renderer._syncMountedState=mounted;
            const postCommit={error:commitError, count:rowCount(),sameMarkup:rail.innerHTML===preCommitMarkup,
                sameScroll:C.resultsContainer.scrollTop===preCommitScroll};
            // Force a virtual-window shift to append two rows; the second
            // builder fails. No outgoing row may be removed on this failure.
            const realWindowSize=renderer._windowSize;
            renderer._windowSize=()=>3;
            renderer.renderPage({syncControls:false});
            const beforeShift={markup:rail.innerHTML,start:renderer.windowStart,end:renderer.windowEnd};
            let additions=0;
            renderer._buildResultItem=function(...args){
                if(++additions===2)throw Error('injected-scroll-window-failure');
                return original.apply(this,args);
            };
            const shiftResult=renderer._shiftWindowRange(2,5,6);
            renderer._buildResultItem=original;
            const scrollFailure={shiftResult,additions,sameMarkup:rail.innerHTML===beforeShift.markup,
                sameRange:renderer.windowStart===beforeShift.start&&renderer.windowEnd===beforeShift.end};
            renderer._windowSize=realWindowSize;
            renderer.renderPage({syncControls:false});
            // A create preview uses regular HTMLElement helpers and refreshes
            // its metadata only *after* the staged subtree is attached.
            C.createFlow.toggleInputMode({focusInput:false});
            C.searchInput.value='待创建'; C.createFlow.handleInput('待创建');
            renderer.renderPage({syncControls:false});
            const previewNode=rail.querySelector('.local-search-quick-create-preview');
            const preview={mounted:Boolean(previewNode),metadata:previewNode?.querySelectorAll('.local-search-quick-create-meta').length||0,
               rows:rowCount()};
            C.resultControls.syncInputActions();C.searchInput.focus();
            C.createFlow._createInFlight=true;C.resultControls.syncInputActions();
            const locked={beforeFocus:document.activeElement===C.searchInput, disabled:C.resultControls.resultViewBtn.disabled};
            C.resultControls.resultViewBtn.click();
            locked.afterFocus=document.activeElement===C.searchInput;
            locked.value=C.searchInput.value;
            C.createFlow._createInFlight=false;
            C.resultControls.syncInputActions();
            C.createFlow.toggleInputMode({focusInput:false});
            C.searchInput.value='查询文字';C.resultControls.syncInputActions();C.searchInput.focus();
            let syncs=0;
            const originalSync=C.resultControls.syncInputActions;
            C.resultControls.syncInputActions=function(...args){syncs++;return originalSync.apply(this,args)};
            C.resultControls.resultViewBtn.click();
            C.resultControls.syncInputActions=originalSync;
            const clear={value:C.searchInput.value, focus:document.activeElement===C.searchInput,syncs};
            let recomputes=0,subscriberEvents=[];
            const oldRecompute=C._recomputeCurrentResults;
            C._recomputeCurrentResults=function(...args){recomputes++;return oldRecompute.apply(this,args)};
            const unsubscribe=P.subscribeIndexChanges(paths=>subscriberEvents.push(paths));
            const beforePaths=C.fullResults.map(r=>r.path);
            await P.addPropertyCatalogValues([{key:'仅用于诊断的空属性',addValues:['未来某个值']}]);
            await new Promise(r=>setTimeout(r,200));
            const afterAddEvents=subscriberEvents.length;
            const renamed=await P.renameVaultPropertyValue('仅用于诊断的空属性','未来某个值','更新的值','multitext');
            const renamedPresent=P.getIndexedPropertyCatalog().some(row=>row.key==='仅用于诊断的空属性'&&row.values.includes('更新的值'));
            const deleted=await P.deleteVaultPropertyValue('仅用于诊断的空属性','更新的值','multitext');
            await new Promise(r=>setTimeout(r,140));
            unsubscribe();
            const catalog={recomputes,events:subscriberEvents.length,afterAddEvents,renamed,renamedPresent,deleted,
                removed:!P.getIndexedPropertyCatalog().some(row=>row.key==='仅用于诊断的空属性'&&row.values.includes('更新的值')),
                filesUnchanged: JSON.stringify(beforePaths)===JSON.stringify(C.fullResults.map(r=>r.path))};
            return {failure,recover,postCommit,scrollFailure,preview,locked,clear,catalog};
        }''')
        page.evaluate('()=>{C.destroy();P.onunload()}')
        result['mode']='mobile' if mobile else 'desktop'
        results.append(result)
        page.close()
    b.close()
out.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps([{k:v for k,v in x.items() if k!='failure' or True} for x in results],ensure_ascii=False,indent=2))
checks=[]
for x in results:
 f=x['failure'];checks += [f['error']=='injected-card-build-failure',f['count']>0,f['sameMarkup'],f['sameRange'],f['sameScroll'],f['sameHeightIndex'],f['isRendering'] is False]
 checks += [x['recover']['count']>0,x['postCommit']['error']=='injected-mounted-state-failure',x['postCommit']['count']>0,
            x['postCommit']['sameMarkup'],x['postCommit']['sameScroll'],x['scrollFailure']['shiftResult'] is False,
            x['scrollFailure']['additions']==2,x['scrollFailure']['sameMarkup'],x['scrollFailure']['sameRange'],x['preview']['mounted'],x['preview']['metadata']>=5,
            x['preview']['rows']==0,x['locked']['beforeFocus'],x['locked']['afterFocus'],
            x['locked']['value']=='待创建',x['locked']['disabled']]
 checks += [x['clear']['value']=='',x['clear']['syncs']==1,x['catalog']['recomputes']==0,x['catalog']['afterAddEvents']>=1,x['catalog']['events']>=3,x['catalog']['renamed'],x['catalog']['renamedPresent'],x['catalog']['deleted'],x['catalog']['removed'],x['catalog']['filesUnchanged']]
print(f'REPAIR GATES: {sum(checks)}/{len(checks)}')
sys.exit(0 if all(checks) else 1)
