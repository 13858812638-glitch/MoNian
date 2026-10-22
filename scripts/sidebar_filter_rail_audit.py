"""Sidebar result filter rail: stable text/accessibility, minimal writes, live actions."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_RAIL_OUT','/workspace/sidebar-rail-audit/current'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
results=[]
def check(n,v,e=None):
    results.append(dict(name=n,passed=bool(v),evidence=e));print(('PASS ' if v else 'FAIL ')+n,flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for dark,mobile in [(False,False),(True,False),(False,True)]:
        ctx,p=scope['boot'](browser,dark=dark,mobile=mobile);prefix=('mobile' if mobile else 'dark' if dark else 'light')+' '
        p.evaluate('''async()=>{
          window.R=C.resultRenderer;
          P.settings.filterPools=C.resultControls.filterPools().map(x=>({...x,visible:true,showAllValues:true,...(x.kind==='property'?{propertyEntries:{status:{showKey:true,pinnedRight:true,shortcutIcon:'list'}}}:{})}));
          C.resultControls.refreshFilterPoolHeader();await waitFixture(60);
          window.textOnly=node=>[...node.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join('');
          window.accessible=node=>node.getAttribute('aria-label')||[...(node.getAttribute('aria-labelledby')||'').split(' ')].map(id=>document.getElementById(id)?.textContent||'').join('');
          window.tag=()=>R._filterPoolGroupRefs.get('tag').buttons.get('tag1');
          window.oldLabel=tag().querySelector('[hidden]');window.oldText=tag().firstChild;
          window.changes=[];window.observer=new MutationObserver(rs=>changes.push(...rs.map(r=>({type:r.type,attribute:r.attributeName,added:r.addedNodes.length,removed:r.removedNodes.length}))));
          observer.observe(C.filterPoolHost,{attributes:true,childList:true,characterData:true,subtree:true});
          for(let i=0;i<10;i++){C.resultControls.refreshFilterPoolHeader();await waitFixture(15)}
        }''')
        same=p.evaluate('({changes:changes.length,labelStable:!!oldLabel&&oldLabel.isConnected&&tag().contains(oldLabel),textStable:oldText===tag().firstChild,text:textOnly(tag()),name:accessible(tag())})')
        if not mobile:
            check(prefix+'unchanged filter rail refresh performs no DOM writes',same['changes']==0,same)
            check(prefix+'visible text and accessible label nodes survive refresh',same['labelStable'] and same['textStable'],same)
        check(prefix+'filter chip keeps its visible and accessible names',same['text']=='tag1' and 'tag1' in same['name'],same)
        p.evaluate('''async()=>{changes=[];tag().click();await waitFixture(60)}''')
        selected=p.evaluate('({selected:C.filterState.tags.has("tag1"),count:C.fullResults.length,pressed:tag().getAttribute("aria-pressed"),writes:changes.length})')
        check(prefix+'chip action still filters matching results',selected['selected'] and selected['count']==9 and selected['pressed']=='true',selected)
        if not mobile:check(prefix+'selection changes only affected presentation',selected['writes']<=4,selected)
        p.evaluate('''async()=>{R._filterToolbarButtonRefs.get('property:status').click();await waitFixture(50);window.popup=C.dropdown.panel;changes=[];C.resultControls.refreshFilterPoolHeader();await waitFixture(30)}''')
        check(prefix+'pinned property keeps its live popup anchor',p.evaluate("!!popup&&popup.isConnected&&C.dropdown.panel===popup&&C.dropdown.isOpenFor(R._filterToolbarButtonRefs.get('property:status'))"))
        p.keyboard.press('Escape')
        p.evaluate('''async()=>{const f=await H.app.vault.create('Folder001/Child/added.md','extra');await H.app.fileManager.processFrontMatter(f,m=>{m.tags=['tag1'];m.status='active'});P._queueFileIndex(f);await P._flushIndexQueueNow();C.performSearch('');C.resultControls.refreshFilterPoolHeader();await waitFixture(70)}''')
        check(prefix+'index changes update accessible usage counts',p.evaluate("accessible(tag()).includes('10 项')"))
        p.evaluate('''async()=>{P.settings.filterPools=P.settings.filterPools.map(x=>x.kind==='tag'?{...x,visible:false}:x);C.resultControls.refreshFilterPoolHeader();await waitFixture(30)}''')
        check(prefix+'visibility changes remove the correct group',p.evaluate("!R._filterPoolGroupRefs.has('tag')&&!!R._filterPoolGroupRefs.get('folder')?.group.isConnected"))
        p.evaluate('observer.disconnect();V.onClose()');ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
