"""Modeless search removal: real Modal session smoke on mock Obsidian desktop/mobile host.
This tests executable production modules in Chromium; not native iOS WebKit.
"""
import json, subprocess, os, shutil,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;os.chdir(root)
subprocess.run(['node','--input-type=module','-e',"import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"],check=True,stdout=subprocess.DEVNULL)
records=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
    for mobile in (False,True):
      for dark in (False,True):
        name=('mobile' if mobile else 'desktop')+'-'+('dark' if dark else 'light')
        ctx=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,locale='zh-CN')
        page=ctx.new_page();errs=[]
        page.on('pageerror',lambda e:errs.append(str(e)))
        checks=[]
        try:
          page.set_content('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body class="'+('is-mobile is-phone is-ios ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'"><div id="host"></div></body>')
          for path in ('tests/browser-fixture.css','src/styles/styles.css'):page.add_style_tag(content=(root/path).read_text())
          for path in ('tests/host.js','tests/browser-scenarios.js'):page.add_script_tag(content=(root/path).read_text())
          page.evaluate('(mobile)=>bootFixture(mobile)',mobile)
          page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
          page.evaluate('()=>startFixture()')
          state=page.evaluate('''async()=>{
            C.destroy();
            const commands=P._commands.map(c=>c.id);
            const result={commands, opened:P.openSearchModal()};
            await waitFixture(650);
            const session=P.searchSession;
            result.modal=session?.host instanceof S.SearchModalHost;
            result.coreReady=Boolean(session?.core && session.core.fullResults?.length === 6);
            result.modalContainer=Boolean(document.querySelector('.local-search-modal-container'));
            result.modelessCount=document.querySelectorAll('.local-search-modeless-window').length;
            result.defaultCloseAfterOpen=session?.core?.closeAfterFileOpen;
            result.toggleCloses=P.toggleSearchModal();
            result.afterToggleClosed=!P.searchSession;
            result.reopen=P.toggleSearchModal();
            await waitFixture(500);
            result.afterReopenReady=Boolean(P.searchSession?.core?.fullResults?.length===6);
            // Pressing child folder Picker Escape must not close parent.
            const openCore=P.searchSession?.core;
            if(openCore){ openCore.facets.showFolderDropdown({anchor:openCore.searchInput}); await waitFixture(120); }
            result.pickerOpen=Boolean(openCore?.dropdown?.isOpen);
            openCore?.dropdown?.close(false);
            result.parentKeptOpen=Boolean(P.searchSession && !P.searchSession._closing);
            const openedFile=H.store.get('资料/鞋垫方案.md');
            result.fileOpened=await openCore._openResultFromSearch(openedFile,{newTab:true});
            result.closedAfterFileOpen=P.searchSession===null;
            result.closeTrace=H.trace.some(x=>x.type==='openFile'&&x.data==='资料/鞋垫方案.md');
            await P._unloadHost();
            result.unloadedListeners=H.activeListeners();
            return result;
          }''')
          names={
             'retired-command':len(state['commands'])==7 and 'open-local-search-floating' not in state['commands'],
             'modal-startup':state['opened'] and state['modal'] and state['coreReady'] and state['modalContainer'],
             'no-modeless-shell':state['modelessCount']==0,
             'modal-close-semantics':state['defaultCloseAfterOpen'] is True,
             'toggle-close-reopen':state['toggleCloses'] and state['afterToggleClosed'] and state['reopen'] and state['afterReopenReady'],
             'picker-stays-with-parent':state['pickerOpen'] and state['parentKeptOpen'],
             'file-open-closes-modal':state['fileOpened'] and state['closedAfterFileOpen'] and state['closeTrace'],
             'clean-unload':state['unloadedListeners']==0,
          }
          for label,passed in names.items():
            checks.append({'name':label,'passed':bool(passed)})
          if errs:raise AssertionError('pageerrors '+str(errs))
          if not all(names.values()):raise AssertionError('failed '+str([k for k,v in names.items() if not v])+' state '+str(state)[:1000])
          print(name,'PASS',len(checks),flush=True)
          records.append({'configuration':name,'checks':checks,'state':state,'errors':errs})
        except Exception as e:
          print(name,'FAIL',str(e)[:650],flush=True)
          records.append({'configuration':name,'checks':checks,'error':str(e),'errors':errs})
        finally:ctx.close()
    browser.close()
path=root/'reports/floating-retirement-browser.json';path.write_text(json.dumps(records,ensure_ascii=False,indent=2))
print('TOTAL',sum(c['passed'] for r in records for c in r.get('checks',[])),'FAILURES',sum(bool(r.get('error')) for r in records))
sys.exit(1 if any(r.get('error') for r in records) else 0)
