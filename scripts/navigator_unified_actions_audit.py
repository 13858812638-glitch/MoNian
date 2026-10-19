"""Chromium simulated Obsidian: desktop native contextmenu/mobile configured hold,
per-kind contextual actions, compact height and cleanup. NOT iOS WebKit hardware.
"""
import json,shutil,sys,os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;os.chdir(root)
results=[]
with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox'])
  for mobile in (True,False):
    for dark in (True,False):
      label=('mobile' if mobile else 'desktop')+('-dark' if dark else '-light')
      ctx=browser.new_context(viewport={'width':390 if mobile else 1150,'height':844},is_mobile=mobile,has_touch=mobile,locale='zh-CN')
      page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
      try:
        page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile is-phone ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'"><div id="host"></div></body></html>')
        for f in ['tests/browser-fixture.css','src/styles/styles.css']:page.add_style_tag(content=(root/f).read_text())
        for f in ['tests/host.js','tests/browser-scenarios.js']:page.add_script_tag(content=(root/f).read_text())
        page.evaluate('(m)=>bootFixture(m)',mobile)
        page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
        page.evaluate('''async()=>{ await startFixture(); C.destroy();window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),{hostKind:'sidebar',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false}); if(!await C.init())throw Error('nav init');C.performSearch('');await waitFixture(220); }''')
        checks=page.evaluate('''async (mobile)=>{
          const out=[];const ck=(cond,name,detail={})=>{out.push({name,ok:!!cond,detail});if(!cond)throw Error(name+':'+JSON.stringify(detail))};
          const nav=C.navigator, customs=nav.customization;
          nav.collapsed.clear(); nav.expanded.add("properties:所属项目"); nav.renderRevision=-1; nav.sync(); await waitFixture(125);
          const entries=()=>[...customs.rows].filter(([el])=>el.isConnected);
          const match=kind=>entries().find(([el,d])=>d.kind===kind&&d.key!=='/'&&d.key!=='__NO_TAGS__'&&d.sortable!==false); 
          ck(entries().length>0,'nav rows present',{n:entries().length});
          const folder=match('folder'),tag=match('tag'),key=match('property-key'),value=match('property-value');
          ck(!!folder&&!!tag&&!!key&&(value||!mobile),'available kinds',{types:entries().map(([,d])=>d.kind)});
          const show=row=>C.dropdown.panel?.classList.contains('local-search-nav-actions-picker')&&C.dropdown.panel?.dataset.navItemId===customs.rows.get(row).id;
          for(const [kind,entry,wanted] of [
             ['folder',folder,['item-rename','create-child-folder','item-result-exclude','item-delete','icon','sort-navigation']],
             ['tag',tag,['item-rename','item-delete','icon','sort-navigation']],
             ['property-key',key,['item-rename','item-pin','item-exclude','item-result','item-delete']],
             ['property-value',value,['item-rename','item-delete','background','sort-navigation']]
          ]){
            if(!entry) continue;
            const [row,d]=entry;
            if(!mobile){
              row.querySelector('button')?.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2}));
            } else customs.openMenu(null,d,row);
            ck(show(row),'menu open '+kind); await waitFixture(65);
            const panel=C.dropdown.panel, ids=[...panel.querySelectorAll('[data-nav-action]')].map(e=>e.dataset.navAction);
            for(const id of wanted)ck(ids.includes(id),kind+' has '+id,{ids});
            ck(panel.querySelectorAll('.local-search-nav-action-group').length>=2,'sections '+kind);
            ck(panel.getBoundingClientRect().height<=(mobile?576:720),'compact height '+kind,{h:panel.getBoundingClientRect().height});
            if(mobile && kind==='property-key') ck(panel.getBoundingClientRect().height<innerHeight-80,'safe mobile viewport height',{h:panel.getBoundingClientRect().height});
            C.dropdown.close(false,{returnToParent:false});
          }
          if(mobile){
             ck(nav.layout==='mobile','mobile navigation active',{layout:nav.layout});
             const [row]=folder;
             P.settings.navigatorLongPressMs=180;
             const pointer=(type,x,y,id=101)=>row.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',button:0,pointerId:id,isPrimary:true,clientX:x,clientY:y}));
             pointer('pointerdown',160,240);pointer('pointermove',160,265);await waitFixture(240);
             ck(!C.dropdown.panel,'drag cancels pending longpress');
             pointer('pointerup',160,265);
             pointer('pointerdown',160,240,102);
             row.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
             ck(!C.dropdown.panel,'native contextmenu cannot preempt configured timer');
             await waitFixture(215);
             ck(show(row),'configurable hold opens panel');
             const current=C.dropdown.panel;
             row.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
             ck(C.dropdown.panel===current,'native followup contextmenu deduped');
             let stopped=!row.querySelector('button')?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
             ck(stopped,'post-longpress click suppressed');
             C.dropdown.close(false,{returnToParent:false});
             pointer('pointerup',160,240,102);
             ck(customs._hold==null,'longpress session cleaned');
          }
          // Actual native dialog owner from a contextual action, no secondary rename state.
          const [row,d]=tag; customs.openMenu(null,d,row);
          const ren=C.dropdown.panel.querySelector('[data-nav-action="item-rename"]');
          ck(!!ren,'tag rename available');ren.click();
          ck(!!C._confirmSession,'rename uses native session');
          C._confirmSession?.finish?.(false);
          return out;
        }''',mobile)
        results.append({'configuration':label,'checks':checks,'passed':len(checks),'errors':errors})
        print(label,len(checks),'PASS' if not errors else 'ERROR '+str(errors),flush=True)
      except Exception as e:
        results.append({'configuration':label,'error':str(e),'errors':errors});print(label,'FAIL',str(e)[:400],flush=True)
      finally:ctx.close()
  browser.close()
out=root/'reports/current/navigator-unified-actions';out.mkdir(parents=True,exist_ok=True)
(out/'chromium.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print('PASS',sum(x.get('passed',0) for x in results),'FAIL CONFIGS',sum(bool(x.get('error') or x.get('errors')) for x in results))
sys.exit(1 if any(x.get('error') or x.get('errors') for x in results) else 0)
