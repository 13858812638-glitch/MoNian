"""Real mouse sequences through mock SearchView. Timings are lab evidence only."""
import json
import os
from collections import Counter
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('GLS_INTERACTION_OUT', '/workspace/sidebar-interaction-audit/before'))
OUT.mkdir(parents=True, exist_ok=True)
# Reuse the host setup, without executing its assertions.
scope = {'__file__': str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0]
     .replace('large?2400:36', 'large?2400:161').replace('large?200:6', 'large?200:11'), scope)
report = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for large in [False, True]:
        ctx, p = scope['boot'](browser, large=large)
        p.evaluate("document.querySelector('#host').style.width='714px';V.onResize()")
        p.wait_for_timeout(300)
        cdp = ctx.new_cdp_session(p)
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        cdp.send('Performance.enable')
        p.evaluate('''() => {
          window.calls={};window.events=[];window.frames=[];window.commits=[];
          for(const [prefix,obj,names] of [
            ['nav',C.navigator,['sync','_renderProjection','_syncMobileTools']],
            ['core',C,['_onFilterChanged','performSearch','_recomputeCurrentResults','_notifyStateChange','captureSession']],
            ['renderer',C.resultRenderer,['renderPage','_renderFilterPoolHeader','_handleViewportResize','_handleRowResize']],
            ['controls',C.resultControls,['refreshFilterPoolHeader']]])
            for(const name of names){const old=obj[name];obj[name]=function(...args){
              const t=performance.now();try{return old.apply(this,args)}finally{
                (calls[prefix+'.'+name]||=[]).push(performance.now()-t)}}}
          const tick=t=>{frames.push(t);window.raf=requestAnimationFrame(tick)};window.raf=requestAnimationFrame(tick);
          for(const type of ['pointerdown','pointerup','click']) C.navigator.scroll.addEventListener(type,e=>{
            events.push({type,t:performance.now(),target:e.target.closest('button')?.getAttribute('aria-label')});
            if(type==='click') queueMicrotask(()=>commits.push({
              selected:[...C.navigator.scroll.querySelectorAll('[data-nav-section="folder"] .local-search-nav-row.is-selected')].map(x=>x.dataset.pickerKey),
              scope:[...C.filterState.folders]
            }));
          },true);
        }''')
        metrics=lambda: {x['name']:x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
        before=metrics();cdp.send('Profiler.enable');cdp.send('Profiler.start')
        operations=[]
        for i in range(6):
            selector=f'[data-nav-section="folder"] .local-search-nav-row[data-picker-key="Folder{i:03}"] > .local-search-move-tree-folder'
            loc=p.locator(selector);loc.hover()
            style="""el=>({bg:getComputedStyle(el.parentElement).backgroundColor,outline:getComputedStyle(el.parentElement).outline,transform:getComputedStyle(el).transform,selected:el.parentElement.classList.contains('is-selected')})"""
            hover=loc.evaluate(style);p.mouse.down();p.wait_for_timeout(80);held=loc.evaluate(style)
            p.mouse.up();p.wait_for_timeout(160)
            folder=p.evaluate("({selected:[...C.navigator.scroll.querySelectorAll('.local-search-nav-row.is-selected')].map(x=>x.dataset.pickerKey),scope:[...C.filterState.folders],results:C.fullResults.length})")
            operations.append(dict(kind='folder',hover=hover,held=held,final=folder))
            branch=p.locator(selector.replace('> .local-search-move-tree-folder','> .local-search-move-tree-toggle'))
            p.evaluate('''() => {window.unchangedWrites=0;window.unrelated=C.navigator.sections.get('folder').rows.values().find(t=>t.row.dataset.pickerKey==='Folder010')?.row;
              window.mutations=new MutationObserver(rs=>{unchangedWrites+=rs.length});if(unrelated)mutations.observe(unrelated,{subtree:true,attributes:true,childList:true,characterData:true});}''')
            branch.click();p.wait_for_timeout(120);branch.click();p.wait_for_timeout(120)
            operations.append(dict(kind='branch',unrelatedWrites=p.evaluate('mutations.disconnect();unchangedWrites')))
        group=p.locator('[data-nav-section="folder"] > .local-search-nav-section-heading > .local-search-move-tree-toggle')
        for i in range(6):
            group.click();p.wait_for_timeout(120)
        profile=cdp.send('Profiler.stop')['profile'];after=metrics()
        counts=Counter(profile.get('samples',[]));nodes={n['id']:n for n in profile['nodes']}
        result=p.evaluate('''()=>{cancelAnimationFrame(raf);return {calls,events,
          gaps:frames.slice(1).map((x,i)=>x-frames[i]),commits,host:C.hostKind}}''')
        atomic=p.evaluate('''async()=>{
          const n=C.navigator,ref=n.sections.get('folder');
          const button=path=>ref.content.querySelector(`[data-picker-key="${path}"] > .local-search-move-tree-folder`);
          button('Folder006').click();button('Folder007').click();await Promise.resolve();
          const selected=[...ref.content.querySelectorAll('.is-selected')].map(x=>x.dataset.pickerKey);
          const latest=selected.length===1&&selected[0]==='Folder007'&&C.filterState.folders.has('Folder007')
            &&C.fullResults.every(x=>x.path.startsWith('Folder007/'));
          const branch=ref.content.querySelector('[data-picker-key="Folder007"] > .local-search-move-tree-toggle');
          const generation=C._resultGeneration;branch.click();await Promise.resolve();
          const branchReady=branch.getAttribute('aria-expanded')==='true';
          const sameResults=C._resultGeneration===generation;
          return {latest,branchReady,sameResults};
        }''')
        result.update(large=large,operations=operations,atomic=atomic,metrics={k:after[k]-before[k] for k in ['LayoutCount','LayoutDuration','RecalcStyleCount','RecalcStyleDuration','TaskDuration']},profile=[{'function':nodes[k]['callFrame']['functionName'],'samples':v} for k,v in counts.most_common(24)])
        result['checks']={
            'held mouse has no second fill':all(x['hover']['bg']==x['held']['bg'] for x in operations if x['kind']=='folder'),
            'unrelated sibling is untouched':all(x['unrelatedWrites']==0 for x in operations if x['kind']=='branch'),
            'folder scope matches selection':all(x['final']['scope']==x['final']['selected'] for x in operations if x['kind']=='folder'),
            'latest rapid click commits before paint':atomic['latest'],
            'branch commits before paint':atomic['branchReady'],
            'disclosure does not rerender results':atomic['sameResults']}
        report.append(result)
        (OUT/('large-profile.json' if large else 'small-profile.json')).write_text(json.dumps(profile))
        print(json.dumps({k:v for k,v in result.items() if k not in ['events','gaps','operations']},ensure_ascii=False),flush=True)
        p.screenshot(path=str(OUT/('large.png' if large else 'small.png')))
        ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(all(r['checks'].values()) for r in report) else 1)
