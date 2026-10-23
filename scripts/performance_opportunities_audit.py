"""Observe remaining work; no production patches or synthetic speedup claims.

Run after tests/harness.mjs prepareSubjects(). Uses the real SearchView chain in
the controlled browser host. Trace durations are not native Obsidian latency.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('GLS_OPPORTUNITIES_OUT', '/workspace/opportunities-audit/current'))
OUT.mkdir(parents=True, exist_ok=True)
scope = {'__file__': str(ROOT / 'scripts/desktop_navigator_audit.py')}
setup = (ROOT / 'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0]
setup = setup.replace('large?2400:36', 'large?2400:161').replace('large?200:6', 'large?200:11')
if os.environ.get('GLS_OPPORTUNITIES_SUBJECT'):
    setup = setup.replace("(ROOT/'tests/generated/subject.cjs')", "Path(os.environ['GLS_OPPORTUNITIES_SUBJECT'])")
if os.environ.get('GLS_OPPORTUNITIES_CSS'):
    setup = setup.replace('(ROOT / filename).read_text()', "(Path(os.environ['GLS_OPPORTUNITIES_CSS']) if filename == 'src/styles/styles.css' else ROOT / filename).read_text()")
exec(setup, scope)

report = []
contexts = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for large in [False, True]:
        ctx, page = scope['boot'](browser, large=large)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.evaluate("document.querySelector('#host').style.width='714px';V.onResize()")
        page.wait_for_timeout(150)
        cdp = ctx.new_cdp_session(page)
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        trace = []
        completed = []
        cdp.on('Tracing.dataCollected', lambda data: trace.extend(data['value']))
        cdp.on('Tracing.tracingComplete', lambda _: completed.append(True))
        cdp.send('Tracing.start', {'categories': 'devtools.timeline,blink.user_timing',
                                   'transferMode': 'ReportEvents'})
        # Timing pass has no method wrappers or MutationObserver audit overhead.
        page.evaluate("performance.mark('audit-folder-start')")
        for i in range(24):
            row = page.locator(f'[data-nav-section="folder"] [data-picker-key="Folder{i % 6:03}"] > .local-search-move-tree-folder')
            box = row.bounding_box()
            page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        page.wait_for_timeout(100)
        page.evaluate("performance.mark('audit-folder-end');performance.mark('audit-disclosure-start')")
        group = page.locator('[data-nav-section="folder"] > .local-search-nav-section-heading > .local-search-move-tree-toggle')
        box = group.bounding_box()
        for _ in range(24):
            page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        page.wait_for_timeout(100)
        page.evaluate("performance.mark('audit-disclosure-end')")
        cdp.send('Tracing.end')
        for _ in range(200):
            if completed:
                break
            page.wait_for_timeout(50)
        if not completed:
            raise RuntimeError('Trace did not complete')
        size = 'large' if large else 'small'
        (OUT / f'{size}-trace.json').write_text(json.dumps({'traceEvents': trace}))
        marks = {e['name']: e['ts'] for e in trace if e['name'].startswith('audit-')}
        timing = {}
        for phase in ['folder', 'disclosure']:
            begin, end = marks[f'audit-{phase}-start'], marks[f'audit-{phase}-end']
            events = [e for e in trace if begin <= e['ts'] <= end and e.get('ph') == 'X']
            timing[phase] = {}
            for name in ['Layout', 'UpdateLayoutTree', 'Paint', 'FunctionCall', 'EventDispatch']:
                values = [e.get('dur', 0) / 1000 for e in events if e['name'] == name]
                timing[phase][name] = {'count': len(values), 'totalMs': sum(values), 'maxMs': max(values, default=0)}
        # Separate instrumented pass: count work and identity, not latency.
        trace.clear()
        completed.clear()
        cdp.send('Tracing.start', {'categories': 'devtools.timeline,blink.user_timing',
                                   'transferMode': 'ReportEvents'})
        observed = page.evaluate('''async () => {
          const n=C.navigator,r=C.resultRenderer,counts={},restores=[];let serial=0;
          for(const [prefix,obj,names] of [
            ['core',C,['_recomputeCurrentResults','_notifyStateChange']],
            ['nav',n,['_renderProjection']],
            ['facets',C.facets,['renderPinnedPropertyFilters']],
            ['renderer',r,['renderPage','_syncMountedState','_mountedShells','_observeShell','_windowSize','_setScrollTop','_buildResultItem']]]) {
            for(const name of names){const old=obj[name];obj[name]=function(...args){
              const key=prefix+'.'+name,id=++serial;counts[key]=(counts[key]||0)+1;
              performance.mark('owner-enter:'+id+':'+key);
              try{return old.apply(this,args)}finally{performance.mark('owner-exit:'+id+':'+key)}};
              restores.push(()=>obj[name]=old);}
          }
          const phases={};
          try {
            for(const [phase,run] of [
              ['folder',i=>n.select('folder','Folder'+String(i%6).padStart(3,'0'))],
              ['disclosure',()=>n.sections.get('folder').chevron.click()]]) {
              for(const key of Object.keys(counts))delete counts[key];
              performance.mark('work-'+phase+'-start');
              for(let i=0;i<24;i++){run(i);await Promise.resolve();}
              performance.mark('work-'+phase+'-end');
              phases[phase]={...counts};
            }
          } finally {for(const restore of restores)restore();}
          if(!C.filterState.folders.size)n.select('folder','Folder000');
          await waitFixture(40);
          const wrap=C.activeFilterWrap,button=wrap.querySelector('button');
          if(!button)throw new Error('No active condition button');
          button.focus();const focusedBefore=document.activeElement===button;
          const mutations=[],mo=new MutationObserver(records=>mutations.push(...records));
          mo.observe(wrap,{subtree:true,childList:true,attributes:true,characterData:true});
          for(let i=0;i<8;i++)C.facets.syncFilterButtons();
          await Promise.resolve();mutations.push(...mo.takeRecords());mo.disconnect();
          const conditions={syncs:8,mutations:mutations.length,
            removedNodes:mutations.reduce((sum,m)=>sum+m.removedNodes.length,0),
            addedNodes:mutations.reduce((sum,m)=>sum+m.addedNodes.length,0),
            sameButton:wrap.querySelector('button')===button,focusedBefore,
            focusedAfter:document.activeElement===button};
          return {phases,conditions,folder:[...C.filterState.folders],
            results:C.fullResults.length,mounted:C.resultEls.length,
            cacheSize:r._browseCardCache?.entries.size||0,
            consistent:C.fullResults.every(x=>[...C.filterState.folders].some(f=>x.path.startsWith(f+'/')))};
        }''')
        cdp.send('Tracing.end')
        for _ in range(200):
            if completed:
                break
            page.wait_for_timeout(50)
        if not completed:
            raise RuntimeError('Instrumented trace did not complete')
        (OUT / f'{size}-work-trace.json').write_text(json.dumps({'traceEvents': trace}))
        starts, spans = {}, []
        for event in sorted(trace, key=lambda e: e['ts']):
            name = event['name']
            if name.startswith('owner-enter:'):
                starts[name.split(':', 1)[1]] = event['ts']
            elif name.startswith('owner-exit:'):
                key = name.split(':', 1)[1]
                if key in starts:
                    spans.append((starts[key], event['ts'], key.split(':', 1)[1]))
        bounds = {e['name']: e['ts'] for e in trace if e['name'].startswith('work-')}
        owners = {}
        for event in trace:
            if event['name'] != 'Layout' or not bounds['work-folder-start'] <= event['ts'] <= bounds['work-folder-end']:
                continue
            parents = [s for s in spans if s[0] <= event['ts'] and s[1] >= event['ts'] + event.get('dur', 0)]
            owner = min(parents, key=lambda s: s[1] - s[0])[2] if parents else 'outside wrapped methods'
            owners[owner] = owners.get(owner, 0) + 1
        observed['synchronousLayoutOwners'] = owners
        page.evaluate('V.onClose()')
        page.wait_for_timeout(40)
        report.append({'files': 2400 if large else 161, 'cpuThrottle': 4,
                       'timing': timing, 'work': observed, 'pageErrors': errors})
        print(json.dumps(report[-1], ensure_ascii=False), flush=True)
        ctx.close()
    (OUT / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    for mobile in [False, True]:
        for tab in [False, True]:
            context_scope = {'__file__': str(ROOT / 'scripts/desktop_navigator_audit.py')}
            context_setup = setup.replace('new S.SearchView({app:H.app},P)',
                'new S.SearchView({app:H.app},P,S.TAB_VIEW_TYPE)') if tab else setup
            exec(context_setup, context_scope)
            ctx, page = context_scope['boot'](browser, mobile=mobile)
            observed = page.evaluate('''async()=>{
              C._selectBrowseFolder('Folder000');C._onFilterChanged();
              C.navigator?.setPage('results',false);await waitFixture(60);
              const wrap=C.activeFilterWrap,button=wrap.querySelector('button');
              if(!button)throw new Error('No condition button');
              const rect=button.getBoundingClientRect();button.focus();
              const focusedBefore=document.activeElement===button;
              for(let i=0;i<8;i++)C.facets.syncFilterButtons();
              await Promise.resolve();
              return {visible:rect.width>0&&rect.height>0,focusedBefore,
                focusedAfter:document.activeElement===button,
                sameButton:wrap.querySelector('button')===button};
            }''')
            contexts.append({'mobile': mobile, 'host': 'tab' if tab else 'sidebar', **observed})
            page.evaluate('V.onClose()')
            ctx.close()
    browser.close()
(OUT / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
(OUT / 'conditions-contexts.json').write_text(json.dumps(contexts, ensure_ascii=False, indent=2))
if any(x['pageErrors'] or not x['work']['consistent'] for x in report):
    raise SystemExit('Audit fixture consistency failed')
