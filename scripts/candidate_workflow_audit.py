"""Run existing behavioral assertions beyond the frozen 01-initial A/B mismatch.

This supplements, never replaces, browser_ab.py. No pixel/parity claim is made.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_WORKFLOW_OUT','/workspace/sidebar-release-audit/workflows'))
OUT.mkdir(parents=True,exist_ok=True)
rows=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for mobile,dark in [(False,False),(True,False),(False,True),(True,True)]:
        label=('mobile' if mobile else 'desktop')+('-dark' if dark else '-light')
        ctx=browser.new_context(viewport=dict(width=390 if mobile else 1280,height=844 if mobile else 900),
            locale='zh-CN',timezone_id='Asia/Shanghai',is_mobile=mobile,has_touch=mobile)
        p=ctx.new_page();errors=[]
        p.on('pageerror',lambda error:errors.append(str(error)))
        try:
            p.set_content('<body class="'+('is-mobile ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'"><div id="host"></div></body>')
            for f in ['tests/browser-fixture.css','src/styles/styles.css']:p.add_style_tag(content=(ROOT/f).read_text())
            for f in ['tests/host.js','tests/browser-scenarios.js']:p.add_script_tag(content=(ROOT/f).read_text())
            p.evaluate('(mobile)=>bootFixture(mobile)',mobile)
            p.add_script_tag(content=(ROOT/'tests/generated/subject.cjs').read_text())
            p.evaluate('()=>startFixture()')
            for step in p.evaluate('Object.keys(browserSteps)'):
                p.evaluate('(step)=>Promise.race([browserSteps[step](),new Promise((_,reject)=>setTimeout(()=>reject(Error("scenario timeout")),8000))])',step)
                p.wait_for_timeout(80)
                if errors:raise AssertionError(str(errors))
                rows.append(dict(configuration=label,scenario=step,passed=True))
                print('PASS '+label+' '+step,flush=True)
                if step in ['01-initial','10-rename-dialog','15-derived-create']:
                    p.screenshot(path=str(OUT/(label+'-'+step+'.png')),animations='disabled',caret='initial')
            (OUT/(label+'-final.json')).write_text(json.dumps(p.evaluate('snapshotFixture()'),ensure_ascii=False,indent=2))
        except Exception as error:
            rows.append(dict(configuration=label,passed=False,error=str(error),pageErrors=errors))
            print('FAIL '+label+' '+str(error),flush=True)
        finally:ctx.close()
    browser.close()
report=dict(passed=sum(r['passed'] for r in rows),failed=sum(not r['passed'] for r in rows),
    scope='Existing workflow assertions, mocked Obsidian/Chromium. Not frozen snapshot or pixel parity.',results=rows)
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(bool(report['failed']))
