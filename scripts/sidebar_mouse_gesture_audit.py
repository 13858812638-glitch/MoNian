"""Desktop sidebar pointer input must not enter swipe-back recognition.

Real SearchView lifecycle and mouse input in a mocked Obsidian Chromium host.
Child Pickers and tabs keep their independent navigation leases.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_MOUSE_GESTURE_OUT','/workspace/sidebar-mouse-audit/before'))
OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py'),
       'SUBJECT':Path(os.environ.get('GLS_MOUSE_SUBJECT',ROOT/'tests/generated/subject.cjs'))}
setup=(ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0]
setup=setup.replace("(ROOT/'tests/generated/subject.cjs')",'SUBJECT')
setup=setup.replace('const files=Array.from', '''if(!mobile && document.body.classList.contains('theme-dark'))
        Object.defineProperty(navigator,'platform',{value:'MacIntel',configurable:true});
      const files=Array.from''')
exec(setup,scope)
results=[]
def check(name,passed,evidence=None):
    results.append({'name':name,'pass':bool(passed),'evidence':evidence})
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for dark in [False,True]:
        ctx,p=scope['boot'](browser,dark=dark)
        prefix='dark' if dark else 'light'
        p.evaluate('''()=>{
          window.gestureReads=0;
          for(const name of ['scrollWidth','clientWidth']) {
            const desc=Object.getOwnPropertyDescriptor(Element.prototype,name);
            Object.defineProperty(Element.prototype,name,{...desc,get(){
              if(new Error().stack.includes('swipeBackNativeGestureOwner'))gestureReads++;
              return desc.get.call(this);
            }});
          }
        }''')
        button=lambda i:p.locator(f'[data-nav-section="folder"] [data-picker-key="Folder{i:03}"] > .local-search-move-tree-folder')
        # Keep the entire down/move/up inside one button. A 14px drift must
        # remain an ordinary desktop click, rather than cancel via swipe-back.
        commits=[]
        for i in range(12):
            loc=button(i%6);box=loc.bounding_box()
            p.mouse.move(box['x']+20,box['y']+box['height']/2)
            p.mouse.down();p.mouse.move(box['x']+34,box['y']+box['height']/2,steps=3);p.mouse.up()
            commits.append(p.evaluate('''()=>({scope:[...C.filterState.folders],
              selected:[...C.navigator.scroll.querySelectorAll('[data-nav-section="folder"] .is-selected')].map(r=>r.dataset.pickerKey),
              results:C.fullResults.map(r=>r.path)})'''))
        check(prefix+' desktop sidebar has no swipe-back lease',p.evaluate('V._swipeBackCleanup===null'))
        check(prefix+' mouse selection performs zero swipe geometry reads',p.evaluate('gestureReads===0'),p.evaluate('gestureReads'))
        check(prefix+' all twelve slightly moving clicks select the intended folder',all(x['scope']==[f'Folder{i%6:03}'] for i,x in enumerate(commits)),commits)
        check(prefix+' selection and results agree',all(x['scope']==x['selected'] and x['results'] and all(path.startswith(x['scope'][0]+'/') for path in x['results']) for x in commits if x['scope']))
        # The explicit pointer-drag controls must still work.
        handle=p.locator('.local-search-nav-divider');box=handle.bounding_box()
        before=p.evaluate('C.navigator.facets.getBoundingClientRect().width')
        p.mouse.move(box['x']+box['width']/2,box['y']+100);p.mouse.down()
        p.mouse.move(box['x']+box['width']/2+50,box['y']+100,steps=4);p.mouse.up()
        check(prefix+' divider drag remains available',abs(p.evaluate('C.navigator.facets.getBoundingClientRect().width')-before-50)<2)
        button(0).click(button='right');p.wait_for_timeout(50)
        check(prefix+' right-click management remains available',p.evaluate('C.dropdown.isOpen'))
        check(prefix+' picker retains its own swipe lease',p.evaluate('P.swipeBack.releases.size===1'),p.evaluate('P.swipeBack.releases.size'))
        p.keyboard.press('Escape');p.wait_for_timeout(30)
        check(prefix+' closing picker leaves no sidebar swipe lease',p.evaluate('P.swipeBack.releases.size===0'),p.evaluate('P.swipeBack.releases.size'))
        # A simultaneous tab continues owning swipe navigation. Its shared
        # document listener must not start geometry scans for sidebar clicks.
        p.evaluate('''async()=>{
          window.tabDetached=0;window.T=new S.SearchView({app:H.app,detach(){tabDetached++;}},P,S.TAB_VIEW_TYPE);
          document.body.append(T.containerEl);T.containerEl.style.cssText='width:900px;height:700px';
          await T.onOpen();await waitFixture(50);
        }''')
        check(prefix+' tab keeps its independent swipe lease',p.evaluate('typeof T._swipeBackCleanup==="function"'))
        p.evaluate('gestureReads=0');button(2).click()
        check(prefix+' another host listener does not scan sidebar geometry',p.evaluate('gestureReads===0'),p.evaluate('gestureReads'))
        if dark:
            wheel=p.evaluate('''()=>{
              gestureReads=0;const target=C.navigator.sections.get('folder').toggle;
              const cancelled=[];for(let i=0;i<3;i++)cancelled.push(!target.dispatchEvent(new WheelEvent('wheel',{
                deltaX:-30,deltaY:0,deltaMode:0,bubbles:true,cancelable:true})));
              return {cancelled,reads:gestureReads,tabDetached};
            }''')
            check('Mac sidebar horizontal wheel skips back recognition',not any(wheel['cancelled']) and wheel['reads']==0 and wheel['tabDetached']==0,wheel)
        # The tab itself continues navigating with a deliberate drag.
        box=p.evaluate('''()=>{
          const button=T.contentEl.createEl('button',{text:'Swipe probe'});
          button.style.cssText='position:fixed;left:20px;top:20px;width:200px;height:40px;z-index:999';
          const b=button.getBoundingClientRect();
          return {x:b.x,y:b.y,width:b.width,height:b.height};
        }''')
        p.mouse.move(box['x']+10,box['y']+box['height']/2);p.mouse.down()
        p.mouse.move(box['x']+75,box['y']+box['height']/2,steps=5);p.mouse.up()
        check(prefix+' tab deliberate swipe still navigates',p.evaluate('tabDetached===1'),p.evaluate('tabDetached'))
        p.evaluate('T.onClose();T.containerEl.remove();V.onClose()')
        check(prefix+' close releases all navigation leases',p.evaluate('P.swipeBack.releases.size===0'))
        ctx.close()
    ctx,p=scope['boot'](browser,mobile=True)
    check('mobile sidebar retains swipe-back lease',p.evaluate('typeof V._swipeBackCleanup==="function"'))
    p.evaluate('V.onClose()')
    check('mobile close releases navigation lease',p.evaluate('P.swipeBack.releases.size===0'))
    ctx.close();browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(x['pass'] for x in results) else 1)
