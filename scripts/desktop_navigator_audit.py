"""Desktop Navigator regression through SearchView, with mobile guard coverage.

Controlled Obsidian host + Chromium, not a native desktop/theme certification.
Run after preparing tests/generated/subject.cjs. Artifacts stay outside checkout.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('GLS_DESKTOP_AUDIT_OUT', '/workspace/monian-desktop-audit/current'))
OUT.mkdir(parents=True, exist_ok=True)
results = []


def check(name, condition, evidence=None):
    results.append({'name': name, 'pass': bool(condition), 'evidence': evidence})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)


def boot(browser, mobile=False, dark=False, large=False):
    ctx = browser.new_context(viewport={'width': 390 if mobile else 1200, 'height': 900},
                              is_mobile=mobile, has_touch=mobile)
    page = ctx.new_page()
    page.set_content('<body class="' + ('is-mobile ' if mobile else '') +
                     ('theme-dark' if dark else 'theme-light') + '"><div id="host"></div></body>')
    for filename in ['tests/browser-fixture.css', 'src/styles/styles.css']:
        page.add_style_tag(content=(ROOT / filename).read_text())
    for filename in ['tests/host.js', 'tests/browser-scenarios.js']:
        page.add_script_tag(content=(ROOT / filename).read_text())
    page.evaluate('''({mobile,large}) => {
      const files=Array.from({length:large?2400:36},(_,i)=>({
        path:`Folder${String(i%(large?200:6)).padStart(3,'0')}/Child/note${i}.md`,
        content:'# title\\nbody',properties:{tags:['tag'+i%(large?100:4)],status:'active'}}));
      window.H=__makeHost({files,mobile});window.module={exports:{}};window.require=()=>H.obsidian;
      // Real chevron geometry instead of the host's deliberately empty SVG.
      const original=H.obsidian.setIcon;
      H.obsidian.setIcon=(el,name)=>{original(el,name);if(name.startsWith('chevron-')) {
        const svg=el.querySelector('svg');svg.setAttribute('viewBox','0 0 24 24');
        svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2');
        const path=document.createElementNS(svg.namespaceURI,'path');
        path.setAttribute('d',name==='chevron-down'?'m6 9 6 6 6-6':'m9 6 6 6-6 6');svg.append(path);
      }};
    }''', {'mobile': mobile, 'large': large})
    page.add_script_tag(content=(ROOT/'tests/generated/subject.cjs').read_text())
    page.evaluate('''async () => {
      window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);
      await P.onload();await H.layoutReady();await P._flushIndexQueueNow();
      window.V=new S.SearchView({app:H.app},P);document.querySelector('#host').append(V.containerEl);
      V.containerEl.style.height='100%';V.contentEl.style.height='100%';
      await V.onOpen();window.C=V.core;await waitFixture(200);
    }''')
    return ctx, page


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for dark in [False, True]:
        ctx, page = boot(browser, dark=dark)
        prefix = 'desktop-dark' if dark else 'desktop-light'
        placement=page.evaluate('''() => {
          const n=C.navigator,input=C.searchInput,wrap=input.closest('.local-search-input-wrap');
          const s=wrap.getBoundingClientRect(),m=n.main.getBoundingClientRect(),h=n.resultHeading.getBoundingClientRect();
          return {inResults:n.main.contains(input),aboveResults:s.bottom<=h.top,
            fits:s.left>=m.left&&s.right<=m.right,titleInSidebar:n.facets.contains(n.headingTitle),
            oneInput:n.root.querySelectorAll('.local-search-input').length===1};
        }''')
        check(prefix+' search sits above right-hand results',all(placement.values()),placement)
        page.locator('.local-search-input').fill('note6')
        page.locator('.local-search-input').press('Enter');page.wait_for_timeout(100)
        searched=page.evaluate("({query:C.queryState.raw,count:C.fullResults.length})")
        check(prefix+' relocated search filters results',searched['query']=='note6' and 0<searched['count']<36,searched)
        editing=page.evaluate('''async()=>{
          const input=C.searchInput;input.focus();input.setSelectionRange(1,3);
          const states=[];
          for(const width of [600,900]) {
            document.querySelector('#host').style.width=width+'px';V.onResize();await waitFixture(50);
            states.push(C.searchInput===input&&document.activeElement===input&&input.selectionStart===1&&input.selectionEnd===3&&input.value==='note6');
          }
          return states;
        }''')
        check(prefix+' resize retains live search and selection',all(editing),editing)
        page.locator('.local-search-input').fill('')
        page.locator('.local-search-input').press('Enter');page.wait_for_timeout(60)
        controls = page.evaluate('''() => [...C.navigator.sections.values()].map(r=>{
          const a=r.summary.getBoundingClientRect(),b=r.manage.getBoundingClientRect(),t=r.chevron.getBoundingClientRect();
          const svg=r.chevron.querySelector('svg'),s=svg.getBoundingClientRect();
          return {noOverlap:a.right<=b.left,arrowFits:s.width>=12&&s.x>=t.x&&s.right<=t.right,
            expanded:r.chevron.getAttribute('aria-expanded'),icon:r.chevron.dataset.testIcon};
        })''')
        check(prefix+' count and management do not overlap', all(r['noOverlap'] for r in controls), controls)
        check(prefix+' arrows fit their hit targets', all(r['arrowFits'] for r in controls))
        toggle=page.locator('[data-nav-section="folder"] > .local-search-nav-section-heading > .local-search-move-tree-toggle')
        toggle.click();page.wait_for_timeout(40)
        check(prefix+' mouse collapse',page.evaluate("C.navigator.sections.get('folder').content.hidden"))
        toggle.press('Enter');page.wait_for_timeout(40)
        check(prefix+' keyboard expand',page.evaluate("!C.navigator.sections.get('folder').content.hidden"))
        check(prefix+' vault glyph matches expansion',page.evaluate("C.navigator.sections.get('folder').heading.querySelector('.local-search-move-tree-folder-icon').dataset.testIcon==='open-vault'"))
        handle=page.locator('.local-search-nav-divider')
        check(prefix+' resize handle exists',handle.count()==1)
        if handle.count():
            width=page.evaluate('C.navigator.facets.getBoundingClientRect().width')
            box=handle.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+60)
            page.mouse.down();page.mouse.move(box['x']+box['width']/2+85,box['y']+60,steps=8);page.mouse.up()
            page.wait_for_timeout(80)
            grown=page.evaluate('C.navigator.facets.getBoundingClientRect().width')
            check(prefix+' drag changes width',abs(grown-width-85)<3,{'before':width,'after':grown})
            handle.press('ArrowLeft');page.wait_for_timeout(40)
            narrowed=page.evaluate('C.navigator.facets.getBoundingClientRect().width')
            check(prefix+' keyboard changes width',5<=grown-narrowed<=25)
            restore=page.evaluate('''() => {
              const n=C.navigator,session=C.captureSession(),before=n.facets.getBoundingClientRect().width;
              n.restore(session.navigator);return {before,after:n.facets.getBoundingClientRect().width,width:session.navigator.paneWidth};
            }''')
            check(prefix+' width survives session restore',restore['width'] is not None and abs(restore['before']-restore['after'])<2,restore)
            # Resize callbacks / narrow leaf must not leave a drag or hide results.
            page.evaluate("document.querySelector('#host').style.width='680px';V.onResize()")
            page.wait_for_timeout(60)
            bounds=page.evaluate('''()=>({left:C.navigator.facets.getBoundingClientRect().width,right:C.navigator.main.getBoundingClientRect().width,total:C.navigator.workspace.clientWidth})''')
            check(prefix+' narrow split retains result space',bounds['right']>=319 and bounds['left']+bounds['right']<=bounds['total']+1,bounds)
            handle.press('End');page.wait_for_timeout(40)
            check(prefix+' keyboard maximum remains bounded',page.evaluate('C.navigator.main.getBoundingClientRect().width>=319'))
            handle.press('Home');page.wait_for_timeout(40)
            check(prefix+' keyboard minimum remains usable',page.evaluate('C.navigator.facets.getBoundingClientRect().width>=179'))
            cancelWidth=page.evaluate('C.navigator.facets.getBoundingClientRect().width')
            box=handle.bounding_box();page.mouse.move(box['x']+4,box['y']+120);page.mouse.down()
            page.mouse.move(box['x']+64,box['y']+120,steps=4);page.wait_for_timeout(30)
            page.keyboard.press('Escape');page.mouse.up();page.wait_for_timeout(30)
            check(prefix+' Escape cancels drag and restores width',page.evaluate('!C.navigator.root.classList.contains("is-nav-resizing")') and abs(page.evaluate('C.navigator.facets.getBoundingClientRect().width')-cancelWidth)<2)
            page.evaluate("document.querySelector('#host').style.width='600px';V.onResize()")
            page.wait_for_timeout(60)
            check(prefix+' stack hides resize handle',not handle.is_visible())
            page.evaluate("document.querySelector('#host').style.width='900px';V.onResize()")
            page.wait_for_timeout(60)
            page.evaluate('window.savedDesktopState=V.getState();const old=V.containerEl;V.onClose();old.remove()')
            page.evaluate('''async()=>{
              window.V=new S.SearchView({app:H.app},P);document.querySelector('#host').append(V.containerEl);
              V.containerEl.style.height='100%';V.contentEl.style.height='100%';await V.setState(savedDesktopState,{});
              await V.onOpen();window.C=V.core;await waitFixture(80);
            }''')
            restored=page.evaluate('({actual:C.navigator.facets.getBoundingClientRect().width,saved:savedDesktopState.session.navigator.paneWidth,current:C.navigator._desktopPaneWidth,layout:C.navigator.layout})')
            check(prefix+' reopened view restores saved width',abs(restored['actual']-cancelWidth)<2,restored)
        page.screenshot(path=str(OUT/(prefix+'.png')))
        page.evaluate('V.onClose()')
        check(prefix+' destroy removes owned handle',page.locator('.local-search-nav-divider').count()==0)
        ctx.close()

    ctx,page=boot(browser,large=True)
    metrics=page.evaluate('''async () => {
      const n=C.navigator,reads={rect:0,client:0,files:0},ticks=[];
      const rect=Element.prototype.getBoundingClientRect,client=Element.prototype.getClientRects,files=H.app.vault.getFiles;
      Element.prototype.getBoundingClientRect=function(){if(n.scroll.contains(this))reads.rect++;return rect.call(this)};
      Element.prototype.getClientRects=function(){if(n.scroll.contains(this))reads.client++;return client.call(this)};
      for(let i=0;i<12;i++) {let t=performance.now();n.sections.get('tags').toggle.click();
        if(n._projectionTimer!=null){clearTimeout(n._projectionTimer);n._projectionTimer=null;n._renderProjection()}
        ticks.push(performance.now()-t);
      }
      Element.prototype.getBoundingClientRect=rect;Element.prototype.getClientRects=client;
      let projecting=false;const project=n._renderProjection,projection=[];
      n._renderProjection=function(){projecting=true;const t=performance.now();try{return project.call(this)}finally{projection.push(performance.now()-t);projecting=false}};
      H.app.vault.getFiles=function(){if(projecting)reads.files++;return files.call(this)};
      for(let i=0;i<12;i++){n.select('folder',`Folder${String(i).padStart(3,'0')}`);await waitFixture(30)}
      n._renderProjection=project;H.app.vault.getFiles=files;
      const list=C.resultsContainer,own=Object.getOwnPropertyDescriptor(list,'scrollHeight');let heightReads=0;
      Object.defineProperty(list,'scrollHeight',{configurable:true,get(){heightReads++;return 9999}});
      list.scrollTop=0;const overscroll=C.resultRenderer._isOverscrolling();
      if(own)Object.defineProperty(list,'scrollHeight',own);else delete list.scrollHeight;
      return {reads,ticks,projection,heightReads,overscroll};
    }''')
    check('top-of-tree collapse avoids per-row layout reads',metrics['reads']['rect']+metrics['reads']['client']<40,metrics)
    check('folder changes reuse structural inventory',metrics['reads']['files']<=1,metrics['reads'])
    check('top-of-results needs no scroll extent layout read',not metrics['overscroll'] and metrics['heightReads']==0,metrics['heightReads'])
    # Structural invalidation: additions and renames must still update counts.
    data=page.evaluate('''async () => {
      const n=C.navigator;await H.app.vault.create('Folder000/added.md','new');await P._flushIndexQueueNow();
      C.performSearch('');await waitFixture(100);
      const row=()=>n.sections.get('folder').content.querySelector('[data-picker-key="Folder000"] .local-search-move-current-badge')?.textContent;
      const added=row();await H.app.vault.rename(H.store.get('Folder000/added.md'),'Folder001/moved.md');await P._flushIndexQueueNow();
      C.performSearch('');await waitFixture(100);return {added,renamed:row()};
    }''')
    check('structural counts invalidate on create and rename',data=={'added':'1 · 13','renamed':'0 · 12'},data)
    state=page.evaluate('''async()=>{
      const n=C.navigator; n.select('folder','Folder001');await waitFixture(80);
      const selected=[...n.scroll.querySelectorAll('.local-search-nav-row.is-selected')].map(r=>r.dataset.pickerKey);
      n.scroll.scrollTop=600;await waitFixture(30);
      const before=n.scroll.scrollTop;
      n.renderRevision=-1;n._renderProjection();
      const after=n.scroll.scrollTop;
      // A collapsed branch can be expanded again without losing descendants.
      const folder=n.sections.get('folder').content.querySelector('[data-picker-key="Folder001"]');
      folder.querySelector('.local-search-move-tree-toggle').click();await waitFixture(50);
      const child=!!n.sections.get('folder').content.querySelector('[data-picker-key="Folder001/Child"]');
      return {selected,before,after,child};
    }''')
    check('cached folders retain exactly the current selection',state['selected']==['Folder001'],state)
    check('scrolled navigation retains its anchor',abs(state['before']-state['after'])<2,state)
    check('cached folder still expands children',state['child'])
    page.evaluate('V.onClose()');ctx.close()

    for dark in [False,True]:
        ctx,page=boot(browser,mobile=True,dark=dark)
        prefix='mobile-dark' if dark else 'mobile-light'
        check(prefix+' search retains original header location',page.evaluate('C.navigator.header.contains(C.searchInput) && C.navigator.header.parentElement===C.navigator.root'))
        check(prefix+' remains mobile without desktop handle',page.evaluate('C.navigator.layout==="mobile"') and page.locator('.local-search-nav-divider').count()==0)
        page.evaluate("C.navigator.sections.get('folder').toggle.click()")
        page.wait_for_timeout(60)
        check(prefix+' folder disclosure still works',page.evaluate("!C.navigator.sections.get('folder').content.hidden"))
        page.evaluate("C.navigator.select('folder','Folder000')");page.wait_for_timeout(80)
        check(prefix+' folder selection uses existing results page',page.evaluate("C.navigator.page==='results' && C.fullResults.length===6"))
        page.evaluate('C.navigator.back()');page.wait_for_timeout(40)
        check(prefix+' returns to navigation',page.evaluate("C.navigator.page==='filters' && !C.navigator.facets.hidden"))
        page.evaluate('V.onClose()');ctx.close()
    browser.close()

report={'results':results,'passed':sum(r['pass'] for r in results),'failed':sum(not r['pass'] for r in results)}
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:report[k] for k in ['passed','failed']}))
raise SystemExit(bool(report['failed']))
