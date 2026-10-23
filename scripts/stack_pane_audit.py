"""Adaptive pane resizing through SearchView; Chromium host, not native Obsidian."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_STACK_OUT','/workspace/stack-audit/current'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
setup=(ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright() as pw:')[0]
if os.environ.get('GLS_STACK_SUBJECT'):
 setup=setup.replace("(ROOT/'tests/generated/subject.cjs')",'Path('+repr(os.environ['GLS_STACK_SUBJECT'])+')')
if os.environ.get('GLS_STACK_CSS'):
 setup=setup.replace('(ROOT / filename).read_text()',"(Path(os.environ['GLS_STACK_CSS']) if filename == 'src/styles/styles.css' else ROOT / filename).read_text()")
exec(setup,scope);boot=scope['boot'];results=[]
def check(name,ok,evidence=None):
 results.append(dict(name=name,pass_=bool(ok),evidence=evidence));print(('PASS ' if ok else 'FAIL ')+name,flush=True)
def size(page):return page.evaluate('C.navigator.facets.getBoundingClientRect().height')
def resize(page,width=360,height=850):
 page.evaluate('([w,h])=>{const host=document.querySelector("#host");host.style.width=w+"px";host.style.height=h+"px";V.onResize()}',[width,height]);page.wait_for_timeout(60)
def drag(page,dy):
 b=page.locator('.local-search-nav-divider').bounding_box();x=b['x']+b['width']/2;y=b['y']+b['height']/2
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x,y+dy,steps=6);page.wait_for_timeout(30)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for dark in [False,True]:
  ctx,page=boot(browser,dark=dark);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));prefix='dark ' if dark else 'light '
  resize(page);handle=page.locator('.local-search-nav-divider')
  check(prefix+'stack exposes horizontal separator',handle.is_visible() and handle.get_attribute('aria-orientation')=='horizontal')
  if handle.is_visible():
   before=size(page);drag(page,90);page.mouse.up();page.wait_for_timeout(40);after=size(page)
   check(prefix+'drag grows navigation height',abs(after-before-90)<2,dict(before=before,after=after))
   check(prefix+'scroll viewport grows with pane',page.evaluate('C.navigator.scroll.clientHeight>180'))
   check(prefix+'value reflects actual geometry',abs(float(handle.get_attribute('aria-valuenow'))-after)<1)
   handle.press('ArrowUp');check(prefix+'vertical keyboard adjusts height',abs(size(page)-after+10)<2)
   stable=size(page);drag(page,50);page.keyboard.press('Escape');page.mouse.up()
   check(prefix+'Escape restores height and ends drag',abs(size(page)-stable)<2 and page.evaluate('!C.navigator.root.classList.contains("is-nav-resizing")'))
   drag(page,50);page.evaluate('window.dispatchEvent(new Event("blur"))');page.mouse.up()
   check(prefix+'blur restores height',abs(size(page)-stable)<2)
   drag(page,40);page.evaluate("window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1}))");page.mouse.up()
   check(prefix+'pointer cancellation restores height',abs(size(page)-stable)<2)
   drag(page,40);resize(page,900);page.mouse.up();resize(page)
   check(prefix+'layout change cancels drag without changing stored height',abs(size(page)-stable)<2 and page.evaluate('!C.navigator.root.classList.contains("is-nav-resizing")'))
   page.evaluate("C.navigator.workspace.style.direction='rtl'");drag(page,20);page.mouse.up()
   check(prefix+'RTL keeps downward height growth',abs(size(page)-stable-20)<2)
   handle.press('ArrowUp');handle.press('ArrowUp');page.evaluate("C.navigator.workspace.style.direction=''")
   saved=page.evaluate('C.captureSession().navigator');check(prefix+'session includes height',abs(saved.get('paneHeight',0)-stable)<2,saved.get('paneHeight'))
   resize(page,900);handle.press('ArrowRight');width=page.evaluate('C.navigator.facets.getBoundingClientRect().width')
   check(prefix+'wide layout keeps vertical separator',handle.is_visible() and handle.get_attribute('aria-orientation')=='vertical')
   resize(page);check(prefix+'layout switch retains height',abs(size(page)-stable)<2)
   resize(page,900);check(prefix+'layout switch retains independent width',abs(page.evaluate('C.navigator.facets.getBoundingClientRect().width')-width)<2)
   resize(page);handle.press('End');page.wait_for_timeout(40)
   bounds=page.evaluate('({pane:C.navigator.facets.clientHeight,results:C.navigator.main.clientHeight,total:C.navigator.workspace.clientHeight})')
   check(prefix+'maximum reserves result space',bounds['results']>=159 and bounds['pane']+bounds['results']<=bounds['total']+1,bounds)
   # Height-only host resize must not reproject navigation or search.
   work=page.evaluate('''()=>{window.work={project:0,search:0};for(const [o,k,c] of [[C.navigator,'_renderProjection','project'],[C,'performSearch','search']]){const old=o[k];o[k]=function(...a){work[c]++;return old.apply(this,a)}}return work}''')
   drag(page,-20);resize(page,360,450);page.mouse.up()
   check(prefix+'height-only resize cancels stale drag',page.evaluate('!C.navigator.root.classList.contains("is-nav-resizing")'))
   check(prefix+'height-only resize does not reproject or search',page.evaluate('work.project===0&&work.search===0'),page.evaluate('work'))
   check(prefix+'height-only resize updates separator bounds',float(handle.get_attribute('aria-valuenow'))<=float(handle.get_attribute('aria-valuemax'))+1)
   resize(page,360,220);handle.press('End')
   check(prefix+'short host keeps both panes inside workspace',page.evaluate('C.navigator.facets.clientHeight+C.navigator.main.clientHeight<=C.navigator.workspace.clientHeight+1 && C.navigator.main.clientHeight>0'))
   resize(page);handle.press('Home');handle.press('ArrowDown');page.wait_for_timeout(20)
   savedHeight=size(page)
   page.evaluate('window.savedState=V.getState();const old=V.containerEl;V.onClose();old.remove()')
   page.evaluate('''async()=>{window.V=new S.SearchView({app:H.app},P);document.querySelector('#host').append(V.containerEl);V.containerEl.style.height='100%';V.contentEl.style.height='100%';await V.setState(savedState,{});await V.onOpen();window.C=V.core;await waitFixture(80)}''')
   check(prefix+'reopened view restores height',abs(size(page)-savedHeight)<2,dict(saved=savedHeight,actual=size(page)))
   handle=page.locator('.local-search-nav-divider');handle.dblclick();page.wait_for_timeout(30)
   check(prefix+'double click clears only active dimension',page.evaluate('C.navigator._desktopPaneHeight==null && C.navigator._desktopPaneWidth!=null'))
   page.screenshot(path=str(OUT/(prefix.strip()+'.png')))
   drag(page,30);page.evaluate('V.onClose()');page.mouse.up();page.wait_for_timeout(30)
   check(prefix+'close removes separator and pending drag',page.locator('.local-search-nav-divider').count()==0 and not errors,errors)
  else:page.evaluate('V.onClose()')
  ctx.close()
 ctx,page=boot(browser,mobile=True);check('mobile has no desktop separator',page.locator('.local-search-nav-divider').count()==0 and page.evaluate('C.navigator.layout==="mobile"'));page.evaluate('V.onClose()');ctx.close();browser.close()
for row in results:row['pass']=row.pop('pass_')
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
raise SystemExit(any(not x['pass'] for x in results))
