"""Compare two bundles on a 161-file fixture with 34/37-file folders.

Set GLS_PERF_BEFORE_BUNDLE to a separately built prior candidate subject.
Run alone: concurrent browser suites make wall-clock comparisons misleading.
"""
import json
import os
from pathlib import Path
from statistics import median
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_FILTER_COST_OUT','/workspace/sidebar-repeat-audit/cost'))
OUT.mkdir(parents=True,exist_ok=True)
setup=(ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0]
setup=setup.replace('large?2400:36','large?2400:161')
setup=setup.replace('i%(large?200:6)','(large?i%200:i<34?0:i<71?1:2+i%9)')
setup=setup.replace("(ROOT/'tests/generated/subject.cjs')",'SUBJECT')
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for round in range(2):
        variants=[('before',Path(os.environ['GLS_PERF_BEFORE_BUNDLE'])),('after',ROOT/'tests/generated/subject.cjs')]
        if round:variants.reverse()
        for variant,bundle in variants:
            scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py'),'SUBJECT':bundle}
            exec(setup,scope)
            ctx,p=scope['boot'](browser)
            p.evaluate("document.querySelector('#host').style.width='714px';V.onResize()")
            p.wait_for_timeout(100)
            ctx.new_cdp_session(p).send('Emulation.setCPUThrottlingRate',{'rate':4})
            p.evaluate('''()=>{
              window.samples=[];const nav=C.navigator,old=nav.select;
              nav.select=function(...args){const t=performance.now();const result=old.apply(this,args);
                samples.push({ms:performance.now()-t,mounted:C.resultEls.length,total:C.fullResults.length});return result;};
            }''')
            for i in range(36):
                loc=p.locator(f'[data-nav-section="folder"] [data-picker-key="Folder{i%2:03}"] > .local-search-move-tree-folder')
                box=loc.bounding_box();p.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
            samples=p.evaluate('samples')
            result={'variant':variant,'round':round,'samples':samples,'medianMs':median(x['ms'] for x in samples[6:]),
                    'mounted':sorted(set(x['mounted'] for x in samples)),
                    'allClicksCommitted':len(samples)==36 and all(x['total']==(34 if i%2==0 else 37) for i,x in enumerate(samples))}
            results.append(result);print(json.dumps({k:v for k,v in result.items() if k!='samples'}),flush=True)
            ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2))
raise SystemExit(0 if all(r['allClicksCommitted'] for r in results) else 1)
