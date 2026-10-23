"""Repeated disclosure/filter input, with append-style host icons.

Controlled SearchView + Chromium, not native Obsidian performance evidence.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('GLS_REPEAT_OUT', '/workspace/sidebar-repeat-audit/before'))
OUT.mkdir(parents=True, exist_ok=True)
scope = {'__file__': str(ROOT/'scripts/desktop_navigator_audit.py')}
setup = (ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0]
setup = setup.replace('large?2400:36', 'large?2400:161').replace('large?200:6', 'large?200:11')
setup = setup.replace('__makeHost({files,mobile})', '__makeHost({files,mobile,appendIcons:true})')
if os.environ.get('GLS_REPEAT_SUBJECT'):
    setup = setup.replace("(ROOT/'tests/generated/subject.cjs')", 'Path('+repr(os.environ['GLS_REPEAT_SUBJECT'])+')')
if os.environ.get('GLS_REPEAT_CSS'):
    setup = setup.replace("(ROOT / filename).read_text()", "(Path(os.environ['GLS_REPEAT_CSS']) if filename == 'src/styles/styles.css' else ROOT / filename).read_text()")
exec(setup, scope)
report = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for large in [False, True]:
        ctx, p = scope['boot'](browser, large=large)
        p.evaluate("document.querySelector('#host').style.width='714px';V.onResize()")
        p.wait_for_timeout(100)
        cdp = ctx.new_cdp_session(p)
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        p.evaluate('''() => {
          window.calls={};window.clicks=[];window.frames=[];window.counts=[];window.delivered=0;
          for(const [prefix,obj,names] of [
            ['nav',C.navigator,['select','_renderProjection']],
            ['core',C,['_onFilterChanged','performSearch','_recomputeCurrentResults','_notifyStateChange']],
            ['renderer',C.resultRenderer,['renderPage','_renderFilterPoolHeader','_handleRowResize','_appendPositionRange','_ensureHeightIndex','_windowSize','_buildResultItem']],
            ['selection',C.selection,['syncControls']]])
            for(const name of names){const old=obj[name];obj[name]=function(...args){
              const t=performance.now();try{return old.apply(this,args)}finally{
                (calls[prefix+'.'+name]||=[]).push(performance.now()-t);if(prefix==='nav'&&name==='select') recordClick(t);}}}
          const tick=t=>{frames.push(t);window.raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);
          C.navigator.scroll.addEventListener('click',()=>delivered++,true);
          window.recordClick=start=>{queueMicrotask(()=>clicks.push({
              duration:performance.now()-start,scope:[...C.filterState.folders],
              selected:[...C.navigator.scroll.querySelectorAll('[data-nav-section="folder"] .is-selected')].map(r=>r.dataset.pickerKey),
              count:C.fullResults.length,consistent:C.fullResults.every(x=>!C.filterState.folders.size||[...C.filterState.folders].some(f=>x.path.startsWith(f+'/')))
            }));
          };
        }''')
        cdp.send('Profiler.enable');cdp.send('Profiler.start')
        # A real mouse stream, with no artificial 120/160ms settling delay.
        group=p.locator('[data-nav-section="folder"] > .local-search-nav-section-heading > .local-search-move-tree-toggle')
        box=group.bounding_box()
        for _ in range(40):
            p.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
        row=lambda i:p.locator(f'[data-nav-section="folder"] [data-picker-key="Folder{i:03}"] > .local-search-move-tree-folder')
        box=row(0).bounding_box()
        for _ in range(20):
            p.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
        for i in range(30):
            box=row(i%6).bounding_box()
            p.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
        p.wait_for_timeout(100)
        result=p.evaluate('''()=>{
          cancelAnimationFrame(raf);
          const n=C.navigator,duplicates=[...n.scroll.querySelectorAll('.local-search-move-tree-toggle,.local-search-move-tree-folder-icon,.local-search-nav-maintenance-action')]
            .filter(el=>el.querySelectorAll(':scope > svg').length>1).map(el=>({cls:el.className,count:el.querySelectorAll(':scope > svg').length}));
          return {calls,clicks,delivered,duplicates,svgCount:n.scroll.querySelectorAll('svg').length,gaps:frames.slice(1).map((t,i)=>t-frames[i])};
        }''')
        (OUT/('large-profile.json' if large else 'small-profile.json')).write_text(json.dumps(cdp.send('Profiler.stop')['profile']))
        result['large']=large
        folders=result['clicks']
        result['checks']={
            'one icon per reused host':not result['duplicates'],
            'every real click delivered':result['delivered']==90 and len(result['clicks'])==50 and len(result['calls']['nav.select'])==50,
            'repeat selection toggles on and off':all(bool(x['scope'])==(i%2==0) for i,x in enumerate(folders[:20])),
            'selection and results commit together':all(x['scope']==x['selected'] and x['consistent'] for x in folders),
            'last click wins':folders[-1]['scope']==['Folder005'],
        }
        # Repeated icon updates retain the hidden accessible name node.
        labels=p.evaluate('''()=>{
          const el=C.navigator.sections.get('folder').chevron;
          const id=el.getAttribute('aria-labelledby'),label=el.ownerDocument.getElementById(id);
          const icon=el.querySelector('svg');
          for(let i=0;i<20;i++)el.click();
          return {same:label&&label.isConnected&&el.ownerDocument.getElementById(id)===label,
            single:el.querySelectorAll(':scope > svg').length===1};
        }''')
        result['checks']['icon changes preserve accessible names']=all(labels.values())
        # Filter reset, actual wheel scrolling and a far keyboard jump must
        # continue filling the viewport with the smaller desktop mount budget.
        p.evaluate("C.navigator.select('folder','Folder005')")
        p.wait_for_timeout(60)
        p.locator('.local-search-item').first.hover()
        coverage=[]
        for delta in [500,800,1200,-900]:
            p.mouse.wheel(0,delta);p.wait_for_timeout(90)
            coverage.append(p.evaluate('''()=>{
              const r=C.resultRenderer,list=C.resultsContainer,index=r._ensureHeightIndex();
              const first=index.positionAt(Math.max(0,list.scrollTop-r._viewportPadTop));
              const last=index.positionAt(Math.max(0,list.scrollTop+list.clientHeight-1-r._viewportPadTop));
              return {first,last,start:r.windowStart,end:r.windowEnd,total:C.fullResults.length};
            }'''))
        result['checks']['wheel scrolling keeps visible rows mounted']=all(x['start']<=x['first'] and x['end']>x['last'] for x in coverage)
        result['scrollCoverage']=coverage
        jump=p.evaluate('''()=>{
          const r=C.resultRenderer,pos=C.fullResults.length-1;
          C.selectedIndex=-1;r.navigateResults(-1);
          return {start:r.windowStart,end:r.windowEnd,total:C.fullResults.length};
        }''')
        result['checks']['far keyboard navigation reaches final result']=jump['end']==jump['total']
        report.append(result)
        print(json.dumps({k:v for k,v in result.items() if k not in ['calls','clicks','gaps','duplicates']},ensure_ascii=False),flush=True)
        print(json.dumps({k:{'mean':sum(v)/len(v),'max':max(v)} for k,v in result['calls'].items()}),flush=True)
        p.screenshot(path=str(OUT/('large.png' if large else 'small.png')))
        ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(all(r['checks'].values()) for r in report) else 1)
