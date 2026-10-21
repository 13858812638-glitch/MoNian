"""Whole-sidebar refresh and popup-scroll ownership; mocked Obsidian/Chromium."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_REFRESH_OUT','/workspace/sidebar-refresh-audit/current'))
OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
rows=[]
def check(name,passed,evidence=None):
    rows.append(dict(name=name,passed=bool(passed),evidence=evidence))
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for dark in [False,True]:
        ctx,p=scope['boot'](browser,dark=dark,large=True)
        prefix='dark ' if dark else 'light '
        result=p.evaluate('''()=>{
          const n=C.navigator,o=new MutationObserver(()=>{});
          o.observe(n.mobileToolbar,{attributes:true,childList:true,subtree:true});
          o.observe(n.header,{attributes:true,childList:true,subtree:true});
          for(let i=0;i<10;i++)n._syncMobileTools();
          const toolbar=o.takeRecords().length;o.disconnect();
          for(const r of n.sections.values())o.observe(r.heading,{attributes:true,childList:true,subtree:true});
          n.renderRevision=-1;n._renderProjection();
          const headings=o.takeRecords().length;o.disconnect();return {toolbar,headings};
        }''')
        check(prefix+'unchanged toolbar causes no DOM writes',result['toolbar']==0,result)
        check(prefix+'unchanged group headings cause no DOM writes',result['headings']==0,result)
        p.evaluate("C.navigator.tools.get('collapse').button.click()")
        p.wait_for_timeout(40)
        check(prefix+'collapse action updates its label',p.evaluate("(C.navigator.tools.get('collapse').button.getAttribute('aria-label')||document.getElementById(C.navigator.tools.get('collapse').button.getAttribute('aria-labelledby'))?.textContent)==='展开全部导航'"))
        p.evaluate("C.navigator.tools.get('collapse').button.click()")
        p.wait_for_timeout(40)
        check(prefix+'expand action updates its label',p.evaluate("(C.navigator.tools.get('collapse').button.getAttribute('aria-label')||document.getElementById(C.navigator.tools.get('collapse').button.getAttribute('aria-labelledby'))?.textContent)==='折叠全部导航'"))
        p.evaluate("C.navigator.customization.setSortMode(true,'folder')")
        check(prefix+'toolbar exposes active sort mode',p.evaluate("C.navigator.tools.get('sort-navigation').button.getAttribute('aria-pressed')==='true'"))
        p.evaluate("C.navigator.customization.setSortMode(false)")
        check(prefix+'toolbar clears active sort mode',p.evaluate("C.navigator.tools.get('sort-navigation').button.getAttribute('aria-pressed')==='false'"))
        p.evaluate('''async()=>{
          const n=C.navigator,ref=n.sections.get('folder');
          await n.customization.setAppearance(ref.heading.dataset.navId,{icon:'star'});await waitFixture(50);
        }''')
        check(prefix+'group appearance changes invalidate decoration',p.evaluate("C.navigator.sections.get('folder').heading.querySelector('.local-search-move-tree-folder-icon').dataset.testIcon==='star'"))
        p.evaluate("H.app.vault.getName=()=> 'Renamed vault';C.navigator.renderRevision=-1;C.navigator.sync()")
        p.wait_for_timeout(50)
        check(prefix+'vault rename updates caption and accessible name',p.evaluate('''()=>{
          const r=C.navigator.sections.get('folder'),b=r.toggle;
          return b.querySelector('.local-search-move-tree-name').textContent==='Renamed vault'
            &&(b.getAttribute('aria-label')||document.getElementById(b.getAttribute('aria-labelledby'))?.textContent)==='Renamed vault';
        }'''))
        p.evaluate("C.navigator.select('folder','Folder000')")
        p.wait_for_timeout(60)
        check(prefix+'count and accessible count update together',p.evaluate('''()=>{
          const el=C.navigator.sections.get('tags').summary;
          return el.firstChild.nodeValue==='12'
            &&(el.getAttribute('aria-label')||document.getElementById(el.getAttribute('aria-labelledby'))?.textContent)==='12 个文件';
        }'''))
        p.evaluate("C.facets.showFolderDropdown({anchor:C.navigator.sections.get('folder').toggle})")
        p.wait_for_timeout(100)
        p.evaluate('''()=>{window.repositions=0;const old=C.dropdown._queueReposition;
          C.dropdown._queueReposition=function(){repositions++;return old.call(this)};
        }''')
        result=p.evaluate('''()=>{
          repositions=0;for(let i=0;i<10;i++)C.resultsContainer.dispatchEvent(new Event('scroll'));
          const unrelated=repositions;repositions=0;C.navigator.scroll.dispatchEvent(new Event('scroll'));
          return {unrelated,anchor:repositions};
        }''')
        check(prefix+'results scrolling does not reposition left picker',result['unrelated']==0,result)
        check(prefix+'anchor scrolling still repositions picker',result['anchor']>0,result)
        p.evaluate("S.openFilterToolbarIconPicker(C,{anchor:C.dropdown.panel.querySelector('button'),propertyKey:'status',preserveAnchor:true})")
        p.wait_for_timeout(100)
        check(prefix+'nested picker follows original anchor scroll',p.evaluate("repositions=0;C.navigator.scroll.dispatchEvent(new Event('scroll'));repositions>0"))
        check(prefix+'ancestor scroll still repositions nested picker',p.evaluate("repositions=0;document.querySelector('#host').dispatchEvent(new Event('scroll'));repositions>0"))
        p.evaluate("C.dropdown.close(false,{returnToParent:false});C.facets.showFolderDropdown({anchor:C.resultEls[0]})")
        p.wait_for_timeout(100)
        check(prefix+'result-anchored picker still follows results scroll',p.evaluate("repositions=0;C.resultsContainer.dispatchEvent(new Event('scroll'));repositions>0"))
        p.evaluate("C.dropdown.close(false,{returnToParent:false});C.facets.openFolderCreateDialog({parentPath:'Folder000'})")
        p.wait_for_timeout(100)
        result=p.evaluate('''async()=>{
          const root=C.containerEl,rect=root.getBoundingClientRect;let reads=0;
          root.getBoundingClientRect=function(){reads++;return rect.call(this)};
          for(let i=0;i<6;i++){C.resultsContainer.dispatchEvent(new Event('scroll'));await waitFixture(25)}
          root.getBoundingClientRect=rect;return reads;
        }''')
        check(prefix+'results scrolling does not measure centered dialog',result==0,result)
        result=p.evaluate('''async()=>{
          const d=document.querySelector('.local-search-dialog-surface'),host=document.querySelector('#host');
          const before=d.getBoundingClientRect().top;host.style.marginTop='40px';host.dispatchEvent(new Event('scroll'));
          await waitFixture(80);return {before,after:d.getBoundingClientRect().top};
        }''')
        check(prefix+'dialog follows leaf movement in ancestor',result['after']>result['before']+20,result)
        p.evaluate('C._confirmSession.finish(false);V.onClose()');ctx.close()
    browser.close()
report={'passed':sum(r['passed'] for r in rows),'failed':sum(not r['passed'] for r in rows),'results':rows}
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(bool(report['failed']))
