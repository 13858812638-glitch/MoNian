"""Chromium mock-host smoke test for P4 Picker auto-locate frame cleanup.
Not native Obsidian or iOS/WebKit. Does not modify any vault file.
"""
import json, os, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
os.chdir(root)
subprocess.run(['node','--input-type=module','-e',
                "import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"],check=True)
records=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox'])
    for mobile in (False,True):
      for dark in (False,True):
        label=('mobile' if mobile else 'desktop')+('-dark' if dark else '-light')
        context=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile)
        page=context.new_page(); errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        try:
            page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile is-ios ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'"><div id="host"></div></body></html>')
            for name in ('tests/browser-fixture.css','src/styles/styles.css'):
                page.add_style_tag(content=(root/name).read_text())
            for name in ('tests/host.js','tests/browser-scenarios.js'):
                page.add_script_tag(content=(root/name).read_text())
            page.evaluate('(m)=>bootFixture(m)',mobile)
            page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
            page.evaluate('()=>startFixture()')
            x=page.evaluate('''()=>{
                C.facets.openTagPicker();
                const panel=C.dropdown.panel,list=panel.querySelector('.local-search-tag-tree');
                if (!panel||!list) throw new Error('tag Picker missing');
                const queue=S.createPickerAutoLocateScheduler(panel,list);
                window.p4Counter=0;
                for (let i=0;i<400;i++) queue(()=>{window.p4Counter++;});
                C.dropdown.close(false);
                return {detached:!panel.isConnected,cleanupCleared:panel._lsCleanup===null,stillOpen:C.dropdown.isOpen};
            }''')
            page.wait_for_timeout(150)
            p4=page.evaluate('''()=>({lateCalls:window.p4Counter,panelOpen:C.dropdown.isOpen,
                mobileFrameOwners:document.querySelectorAll('.is-ui-frame-locked').length})''')
            ok=x['detached'] and x['cleanupCleared'] and not x['stillOpen'] and p4['lateCalls']==0 and not p4['panelOpen'] and not errors
            records.append({'label':label,'case':'close-cancels-stale-reveal','passed':ok,'evidence':{**x,**p4,'errors':errors}})
            print(label,'close-cancels-stale-reveal', 'PASS' if ok else 'FAIL',flush=True)
            page.evaluate('()=>C.facets.openTagPicker()')
            page.wait_for_timeout(180)  # host-owned first frame/focus is not a P4 effect
            page.evaluate('''()=>{
                const panel=C.dropdown.panel,list=panel.querySelector('.local-search-tag-tree');
                const queue=S.createPickerAutoLocateScheduler(panel,list);
                window.p4Counter=0;
                window.p4InputBefore=panel.querySelector('.local-search-picker-search');
                window.p4ActiveBefore=document.activeElement;
                for(let i=0;i<400;i++)queue(()=>{window.p4Counter++;});
            }''')
            page.wait_for_timeout(120)
            x=page.evaluate('''()=>({calls:window.p4Counter,activeSame:document.activeElement===window.p4ActiveBefore,
                inputSame:C.dropdown.panel.querySelector('.local-search-picker-search')===window.p4InputBefore,
                remainsOpen:C.dropdown.isOpen})''')
            ok=x['calls']==1 and x['activeSame'] and x['inputSame'] and x['remainsOpen'] and not errors
            records.append({'label':label,'case':'last-frame-keeps-native-focus','passed':ok,'evidence':{**x,'errors':errors}})
            print(label,'last-frame-keeps-native-focus','PASS' if ok else 'FAIL',flush=True)
            page.evaluate('''()=>{C.dropdown.close(false);C.destroy();}''')
        except Exception as e:
            records.append({'label':label,'case':'runtime-error','passed':False,'error':str(e)})
            print(label,'runtime-error',str(e),flush=True)
        finally:
            context.close()
    browser.close()
out=root/'reports/p4-browser-auto-locate.json'
out.write_text(json.dumps({'cases':records,'passed':sum(x['passed'] for x in records),'failed':sum(not x['passed'] for x in records),'chromiumMockHost':True,'nativeIosWebkitVerified':False},ensure_ascii=False,indent=2))
print('TOTAL',sum(x['passed'] for x in records),'PASS',sum(not x['passed'] for x in records),'FAIL',flush=True)
sys.exit(0 if all(x['passed'] for x in records) else 1)
