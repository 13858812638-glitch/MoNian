from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(sys.argv[1]); OUT=Path(sys.argv[2]); results=[]
init='''async()=>{await startFixture();C.destroy();window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),{hostKind:'sidebar',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false});if(!await C.init())throw Error('init failed');await C.performSearch('');await waitFixture(120);C.navigator.collapsed.clear();C.navigator.setPage('filters',false);C.navigator.renderRevision=-1;C.navigator.sync();await waitFixture(160);window._hitLog=[];C.navigator.select=function(kind,value){_hitLog.push({kind,value})};}'''
row_js='''()=>{const row=[...document.querySelectorAll('.local-search-nav-section[data-nav-section="folder"] .local-search-nav-row')].find(r=>r.querySelector('.local-search-move-tree-name')?.textContent==='项目');if(!row)return null;const rc=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,width:r.width,height:r.height}};return {row:rc(row),btn:rc(row.querySelector(':scope>button.local-search-move-tree-folder')),badge:rc(row.querySelector(':scope>.local-search-move-current-badge')),toggle:rc(row.querySelector(':scope>.local-search-move-tree-toggle'))}}'''
state_js='''()=>{const row=[...document.querySelectorAll('.local-search-nav-section[data-nav-section="folder"] .local-search-nav-row')].find(r=>r.querySelector('.local-search-move-tree-name')?.textContent==='项目');return {pressed:row?.classList.contains('is-nav-trailing-touch-pressed'),selected:row?.classList.contains('is-selected'),background:row&&getComputedStyle(row).backgroundColor,filterHits:window._hitLog||[],layout:C.navigator.layout}}'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for theme in ('light','dark'):
  ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2,locale='zh-CN')
  pg=ctx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  try:
   pg.set_content(f'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="is-mobile theme-{theme}"><div id="host"></div></body></html>')
   for f in ('tests/browser-fixture.css','src/styles/styles.css'):pg.add_style_tag(content=(ROOT/f).read_text())
   for f in ('tests/host.js','tests/browser-scenarios.js'):pg.add_script_tag(content=(ROOT/f).read_text())
   pg.evaluate('m=>bootFixture(m)',True);pg.add_script_tag(content=(ROOT/'tests/generated/subject.cjs').read_text());pg.evaluate(init)
   r=pg.evaluate(row_js);assert r,r
   d=ctx.new_cdp_session(pg)
   def checks(label,ok,detail):
    results.append({'theme':theme,'case':label,'ok':bool(ok),'detail':detail});print(theme,label,'PASS' if ok else 'FAIL',detail,flush=True)
   def start(x,y,id=1):d.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'radiusX':1,'radiusY':1,'force':1,'id':id}]});pg.wait_for_timeout(40)
   def move(x,y,id=1):d.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y,'radiusX':1,'radiusY':1,'force':1,'id':id}]});pg.wait_for_timeout(20)
   def end():d.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});pg.wait_for_timeout(80)
   def cancel():d.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});pg.wait_for_timeout(50)
   y=r['row']['y']+r['row']['height']/2;bx=r['badge']['x']+r['badge']['width']/2;rx=r['row']['right']-6;tx=r['toggle']['x']+r['toggle']['width']/2
   bg=pg.evaluate(state_js)['background'];start(bx,y);hold=pg.evaluate(state_js)
   checks('badge.press.feedback',hold['pressed'] and hold['background'] != bg and hold['layout']=='mobile',hold)
   end();released=pg.evaluate(state_js)
   checks('badge.release.clean+single-action',not released['pressed'] and len(released['filterHits'])==1,released)
   # clear current selection and check blank area press.
   pg.evaluate('''()=>{window._hitLog=[];document.querySelectorAll('.local-search-nav-row.is-selected').forEach(e=>e.classList.remove('is-selected'))}''')
   start(rx,y);hold=pg.evaluate(state_js);checks('blank.press.feedback',hold['pressed'],hold);end();rel=pg.evaluate(state_js);checks('blank.release.clean+single-action',not rel['pressed'] and len(rel['filterHits'])==1,rel)
   pg.evaluate('window._hitLog=[]');start(rx,y);move(rx,y+30);scrollState=pg.evaluate(state_js);checks('movement.clears-feedback',not scrollState['pressed'],scrollState);end();checks('movement.end.clean',not pg.evaluate(state_js)['pressed'],pg.evaluate(state_js))
   pg.evaluate('window._hitLog=[]');start(rx,y);cancel();checks('cancel.cleans-feedback',not pg.evaluate(state_js)['pressed'],pg.evaluate(state_js))
   pg.evaluate('window._hitLog=[]');h=pg.evaluate("""()=>{const heading=document.querySelector('.local-search-nav-section[data-nav-section=folder] .local-search-nav-section-heading');const r=heading.querySelector(':scope>.local-search-move-tree-toggle').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,disabled:heading.querySelector(':scope>.local-search-move-tree-toggle').disabled}}""");start(h['x'],h['y']);toggle=pg.evaluate("""()=>({pressedRows:document.querySelectorAll('.is-nav-trailing-touch-pressed').length})""");checks('disclosure.no-proxy-pressed',h['disabled']==False and toggle['pressedRows']==0,{'heading':h,'state':toggle});cancel()
   pg.evaluate("""()=>{const row=[...document.querySelectorAll('.local-search-nav-section[data-nav-section=folder] .local-search-nav-row')].find(r=>r.querySelector('.local-search-move-tree-name')?.textContent==='项目');row.querySelector(':scope>.local-search-move-tree-folder').disabled=true;}""")
   start(bx,y);disabled=pg.evaluate(state_js);checks('disabled.no-pressed',not disabled['pressed'],disabled);cancel()
   pg.evaluate("""()=>{const row=[...document.querySelectorAll('.local-search-nav-section[data-nav-section=folder] .local-search-nav-row')].find(r=>r.querySelector('.local-search-move-tree-name')?.textContent==='项目');row.querySelector(':scope>.local-search-move-tree-folder').disabled=false;C.navigator.customization.sortMode=true;}""")
   start(rx,y);sort=pg.evaluate(state_js);checks('sort.no-pressed',not sort['pressed'],sort);cancel()
   pg.evaluate('C.navigator.customization.sortMode=false')
   checks('no-pageerrors',not errors,errors)
  except Exception as exc: results.append({'theme':theme,'case':'setup','ok':False,'detail':str(exc)}); print(theme,'ERROR',str(exc))
  finally:ctx.close()
 browser.close()
OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps({'source':str(ROOT),'checks':results,'pass':sum(x['ok'] for x in results),'total':len(results)},ensure_ascii=False,indent=2))
print('TOTAL',sum(x['ok'] for x in results),'/',len(results));sys.exit(0 if all(x['ok'] for x in results) else 1)
