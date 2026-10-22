"""Shared result construction/commit lifecycle; controlled Chromium SearchView."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('GLS_RENDER_LIFECYCLE_OUT', '/workspace/unified-audit/current'))
OUT.mkdir(parents=True, exist_ok=True)
scope = {'__file__': str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('\nwith sync_playwright()')[0], scope)
results = []
def check(name, ok, evidence):
    results.append({'name': name, 'pass': bool(ok), 'evidence': evidence})
    print(('PASS ' if ok else 'FAIL ') + name, flush=True)
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for mobile in [False, True]:
        ctx, p = scope['boot'](browser, mobile=mobile, large=True)
        prefix = 'mobile ' if mobile else 'desktop '
        p.evaluate('''()=>{
            window.R=C.resultRenderer;
            if(C.navigator.layout==='mobile')C.navigator.setPage('results');
            window.observations=[];window.ranges=0;window.configReads=0;
            const observe=R._observeShell,range=R._appendPositionRange,config=C.resultControls.activeViewConfig;
            R._observeShell=function(shell,...a){observations.push({connected:shell.isConnected,path:shell.dataset.path});return observe.call(this,shell,...a)};
            R._appendPositionRange=function(...a){ranges++;return range.apply(this,a)};
            C.resultControls.activeViewConfig=function(...a){configReads++;return config.apply(this,a)};
        }''')
        x=p.evaluate('''()=>{observations=[];ranges=0;configReads=0;R._browseCardCache=null;R.renderPage();return {observations,ranges,configReads,cards:C.resultEls.length}}''')
        check(prefix+'page observes connected cards exactly once',len(x['observations'])==x['cards'] and all(o['connected'] for o in x['observations']),x)
        check(prefix+'page uses the shared range traversal',x['ranges']==1,x['ranges'])
        check(prefix+'card config normalized once per card',x['configReads']<=x['cards']+2,x)
        x=p.evaluate('''()=>{
            const old=R._buildResultItem,items=C.resultEls,copy=[...items],nodes=[...C.resultsRail.childNodes];
            let count=0;observations=[];
            R._buildResultItem=function(...a){if(++count===3)throw Error('injected staging failure');return old.apply(this,a)};
            const success=R._shiftWindowRange(120,140);R._buildResultItem=old;
            return {success,observations,itemsUnchanged:C.resultEls===items&&items.length===copy.length&&copy.every((n,i)=>items[i]===n),
                nodesUnchanged:nodes.length===C.resultsRail.childNodes.length&&nodes.every((n,i)=>C.resultsRail.childNodes[i]===n)};
        }''')
        check(prefix+'failed scroll build preserves live row array',not x['success'] and x['itemsUnchanged'] and x['nodesUnchanged'],x)
        check(prefix+'failed scroll build acquires no height observers',not x['observations'],x)
        x=p.evaluate('''()=>{observations=[];const success=R._shiftWindowRange(120,140);return {success,observations,matching:C.resultEls.every(x=>x.isConnected)&&C.resultEls.length===20}}''')
        check(prefix+'successful scroll observes only mounted new rows',x['success'] and x['matching'] and len(x['observations'])==20 and all(o['connected'] for o in x['observations']),x)
        x=p.evaluate('''()=>{observations=[];const path=C.resultEls[0].dataset.path;R.refreshChangedRows(new Set([path]));return {observations,connected:C.resultEls.every(x=>x.isConnected)}}''')
        check(prefix+'single-row refresh observes one connected replacement',x['connected'] and len(x['observations'])==1 and all(o['connected'] for o in x['observations']),x)
        p.evaluate('V.onClose()');ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(r['pass'] for r in results) else 1)
