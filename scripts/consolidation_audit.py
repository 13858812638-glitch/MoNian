"""Cross-host shared primitives, stable navigation and atomic result commits."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_CONSOLIDATION_OUT','/workspace/consolidation-audit/current'))
OUT.mkdir(parents=True,exist_ok=True)
results=[]
def check(name,ok,evidence=None):
    results.append({'name':name,'pass':bool(ok),'evidence':evidence})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for mobile in [False,True]:
      for tab in [False,True]:
        scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
        setup=(ROOT/'scripts/desktop_navigator_audit.py').read_text().split('\nwith sync_playwright()')[0]
        if tab:setup=setup.replace('new S.SearchView({app:H.app},P)','new S.SearchView({app:H.app},P,S.TAB_VIEW_TYPE)')
        setup=setup.replace("(ROOT/'tests/generated/subject.cjs').read_text()","Path(os.environ.get('GLS_CONSOLIDATION_SUBJECT',ROOT/'tests/generated/subject.cjs')).read_text()")
        setup=setup.replace("(ROOT / filename).read_text())","(Path(os.environ['GLS_CONSOLIDATION_CSS']).read_text() if filename=='src/styles/styles.css' and 'GLS_CONSOLIDATION_CSS' in os.environ else (ROOT / filename).read_text()))")
        exec(setup,scope)
        ctx,p=scope['boot'](browser,mobile=mobile)
        p.evaluate("()=>{const meta=document.createElement('meta');meta.name='viewport';meta.content='width=device-width,initial-scale=1';document.head.append(meta)}");p.wait_for_timeout(60)
        prefix=('mobile ' if mobile else 'desktop ')+('tab ' if tab else 'sidebar ')
        p.evaluate('''async()=>{
            window.N=C.navigator;window.R=C.resultRenderer;
            window.go=path=>{if(N)N.select('folder',path);else {C._selectBrowseFolder(path);C._onFilterChanged()}};
            if(!N)return;
            N.collapsed.clear();N.renderRevision=-1;N.sync();await waitFixture(50);
            window.inventory=()=>['tags','properties'].map(k=>[...N.sections.get(k).content.querySelectorAll('.local-search-nav-row')].map(n=>n.dataset.pickerKey));
            window.originalInventory=inventory();
            go('Folder000');if(N.layout==='mobile')N.setPage('filters',false);await waitFixture(50);
        }''')
        if not tab:check(prefix+'folder changes preserve global facet inventory',p.evaluate('JSON.stringify(inventory())===JSON.stringify(originalInventory)'),p.evaluate('({before:originalInventory,after:inventory()})'))
        p.evaluate('''async()=>{
            if(!N)return;N.collapsed.delete('properties');N.renderRevision=-1;N.sync();await waitFixture(30);
            N.sections.get('properties').content.querySelector('[data-picker-key="status"] > .local-search-move-tree-folder').click();await waitFixture(40);
        }''')
        if not tab:check(prefix+'property key expands through same inline path',p.evaluate("N.expanded.has('properties:status')&&!C.dropdown.isOpen&&!!N.sections.get('properties').content.querySelector('[data-picker-key=active]')"))
        p.evaluate('''async()=>{C.dropdown.close(false);go('Folder001');await waitFixture(40);go('Folder000');await waitFixture(40);window.card=C.resultEls[0];go('Folder001');await waitFixture(40);go('Folder000');await waitFixture(40)}''')
        check(prefix+'ordinary browse uses the same retained-card path',p.evaluate('C.resultEls[0]===card'))
        x=p.evaluate('''()=>{
            const nodes=[...C.resultEls].map(x=>x._lsSwipeShell),records=[];
            const observer=new MutationObserver(rs=>records.push(...rs));observer.observe(C.resultsRail,{childList:true});
            R.renderPage();records.push(...observer.takeRecords());observer.disconnect();
            const removed=records.flatMap(r=>[...r.removedNodes]).filter(n=>nodes.includes(n));
            return {removed:removed.length,retained:nodes.every(n=>n.isConnected),same:nodes.every((n,i)=>C.resultEls[i]?._lsSwipeShell===n)};
        }''')
        check(prefix+'unchanged cards are never detached during page commit',x['removed']==0 and x['retained'] and x['same'],x)
        x=p.evaluate('''()=>{
            const nodes=[...C.resultsRail.childNodes],items=C.resultEls,old=C.selection.syncControls;
            C.selection.syncControls=()=>{throw Error('injected post-commit failure')};try{R.renderPage()}catch{}finally{C.selection.syncControls=old}
            return {same:nodes.length===C.resultsRail.childNodes.length&&nodes.every((n,i)=>C.resultsRail.childNodes[i]===n),array:C.resultEls===items};
        }''')
        check(prefix+'post-commit failure restores complete page and array',all(x.values()),x)
        x=p.evaluate('''async()=>{
            if(N?.layout==='mobile')N.setPage('filters',false);await waitFixture(40);
            const node=C.resultControls.resultViewBtn,read=()=>node.getAttribute('aria-label')||document.getElementById(node.getAttribute('aria-labelledby'))?.textContent;
            const before=read();let mutations=0;const observer=new MutationObserver(rs=>mutations+=rs.length);
            observer.observe(node,{subtree:true,attributes:true,childList:true,characterData:true});for(let i=0;i<8;i++)C.resultControls.syncInputActions();await waitFixture(30);
            mutations+=observer.takeRecords().length;observer.disconnect();return {mutations,before,after:read()};
        }''')
        check(prefix+'unchanged accessible name has no redundant mutations',x['mutations']==0 and x['before']==x['after'],x)
        if mobile:
            x=p.evaluate('''async()=>{
                const root=document.body.createDiv({cls:'local-search-dropdown ui-mobile-picker-sheet'});
                root.style.cssText='position:fixed;top:0;left:0;height:650px;width:340px;';
                const list=root.createDiv();list.style.cssText='height:600px;overflow-y:auto;flex-shrink:0;';
                const spacer=list.createDiv();spacer.style.height='580px';const input=list.createEl('input');
                const frame=S.mountMobileFrame(root);await waitFixture(40);const before=root.getBoundingClientRect();input.focus();
                window.dispatchEvent(new CustomEvent('keyboardWillShow',{detail:{keyboardHeight:334}}));await waitFixture(60);
                const height=list.getBoundingClientRect().height,outer=root.getBoundingClientRect().height,token=getComputedStyle(root).getPropertyValue('--ui-mobile-keyboard-height').trim();
                const header=root.createEl('input');root.prepend(header);header.focus();await waitFixture(40);const headerReleased=!list.classList.contains('ui-mobile-keyboard-scrollport');
                const foreign=document.body.createDiv();foreign.style.cssText='position:fixed;top:0;height:600px;overflow-y:auto;';foreign.createDiv().style.height='580px';const other=foreign.createEl('input');other.focus();await waitFixture(40);const foreignUntouched=!foreign.classList.contains('ui-mobile-keyboard-scrollport');foreign.remove();
                window.dispatchEvent(new Event('keyboardDidHide'));await waitFixture(40);const released=!list.classList.contains('ui-mobile-keyboard-scrollport');
                frame.destroy();root.remove();return {height,outer,before:before.height,token,released,headerReleased,foreignUntouched,viewport:innerHeight};
            }''')
            check(prefix+'keyboard token limits only internal scrollport',x['token']!='' and x['height']<=min(520,x['viewport']*.55)+1 and abs(x['outer']-x['before'])<1 and x['released'],x)
            check(prefix+'header focus releases internal keyboard scrollport',x['headerReleased'],x)
            check(prefix+'frame cannot resize a foreign scroll container',x['foreignUntouched'],x)
        p.evaluate('V.onClose()');ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(r['pass'] for r in results) else 1)
