#!/usr/bin/env python3
"""Navigator hit-target acceptance. Actual dist Chromium mouse/touch clicks, no runtime edits."""
import argparse, json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--quiet', action='store_true')
args=parser.parse_args(); root=args.source; results=[]

init='''async () => {
 await startFixture(); C.destroy();
 window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),{hostKind:'sidebar',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false});
 if (!await C.init()) throw Error('sidebar failed');
 await C.performSearch(''); await waitFixture(180);
 C.navigator.collapsed.clear(); C.navigator.setPage('filters',false);
 C.navigator.renderRevision=-1; C.navigator.sync(); await waitFixture(210);
 window._hitLog=[]; C.navigator.select=function(kind,value){_hitLog.push({kind,value})};
 C.navigator._openProperty=function(key){_hitLog.push({kind:'property-key',value:key})};
 C.navigator.openSection=function(kind){_hitLog.push({kind:'manage',value:kind})};
}'''
read_row='''([group,name])=>{
  const section=document.querySelector(`.local-search-nav-section[data-nav-section="${group}"]`);
  const rows=[...section.querySelectorAll('.local-search-nav-row')];
  const row=rows.find(x=>x.querySelector('.local-search-move-tree-name')?.textContent===name);
  if(!row)return null;
  const rect=el=>{let r=el?.getBoundingClientRect();return r&&{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}};
  return {row:rect(row),button:rect(row.querySelector(':scope>.local-search-move-tree-folder')),
   badge:rect(row.querySelector(':scope>.local-search-move-current-badge')),
   toggle:rect(row.querySelector(':scope>.local-search-move-tree-toggle')),
   enabled:!row.querySelector(':scope>.local-search-move-tree-folder')?.disabled,
   id:row.dataset.navId};
}'''
read_heading='''group=>{const row=document.querySelector(`.local-search-nav-section[data-nav-section="${group}"] .local-search-nav-section-heading`);
 const rect=e=>{let r=e?.getBoundingClientRect();return r&&{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}};
 return {row:rect(row),button:rect(row.querySelector(':scope>.local-search-move-tree-folder')),
 badge:rect(row.querySelector(':scope>.local-search-nav-count')),
 toggle:rect(row.querySelector(':scope>.local-search-move-tree-toggle')),
 expanded:!C.navigator.collapsed.has(group)};
}'''

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mobile in (True,False):
  for theme in ('light','dark'):
   config=f'{"mobile" if mobile else "desktop"}-{theme}'
   ctx=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1,locale='zh-CN')
   page=ctx.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   checks=[]
   try:
    page.set_content(f'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="{"is-mobile " if mobile else ""}theme-{theme}"><div id="host"></div></body></html>')
    for f in ('tests/browser-fixture.css','src/styles/styles.css'):page.add_style_tag(content=(root/f).read_text())
    for f in ('tests/host.js','tests/browser-scenarios.js'):page.add_script_tag(content=(root/f).read_text())
    page.evaluate('m=>bootFixture(m)',mobile)
    page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
    page.evaluate(init)
    def check(label, passed, detail=None):
     checks.append({'case':label,'ok':bool(passed),'detail':detail})
     if not args.quiet: print(config,label,'PASS' if passed else 'FAIL',detail if not passed else '',flush=True)
    def click(x,y):
     if mobile: page.touchscreen.tap(x,y)
     else: page.mouse.click(x,y)
     page.wait_for_timeout(45)
    def location(x,y):
     return page.evaluate('''([x,y])=>{const el=document.elementFromPoint(x,y);return {tag:el?.tagName||'',cls:typeof el?.className==='string'?el.className:'',role:el?.getAttribute?.('role')||'', closestControl:el?.closest?.('button, a, input, select, textarea')?.className||''}}''',[x,y])
    for group,name,expected in [('folder','项目','folder'),('tags','计划','tag'),('properties','所属项目','property-key')]:
     for slot in ('name','badge','after_button','right'):
      r=page.evaluate(read_row,[group,name]); assert r and r['enabled'] and r['badge'], (group,name,r)
      y=r['row']['y']+r['row']['height']/2
      if slot=='name':x=r['button']['x']+min(36,r['button']['width']*.45)
      elif slot=='badge':x=r['badge']['x']+r['badge']['width']*.5
      elif slot=='after_button':x=r['button']['right']+max(6,min(12,(r['row']['right']-r['button']['right'])*.14))
      else:x=r['row']['right']-6
      el=location(x,y)
      page.evaluate('window._hitLog=[]')
      key_expanded_before=page.evaluate("C.navigator.expanded.has('properties:所属项目')") if group=='properties' and mobile else None
      click(x,y)
      log=page.evaluate('window._hitLog')
      key_expanded_after=page.evaluate("C.navigator.expanded.has('properties:所属项目')") if group=='properties' and mobile else None
      passed=(key_expanded_after != key_expanded_before and len(log)==0) if group=='properties' and mobile else (len(log)==1 and log[0]['kind']==expected)
      check(f'{group}.{slot}',passed,{'x':round(x,2),'target':el,'hits':log,'mobilePropertyExpanded':[key_expanded_before,key_expanded_after]})
    for group in ('folder','tags','properties'):
     for slot in ('name','badge','right','toggle'):
      h=page.evaluate(read_heading,group);assert h and h['badge'],(group,h)
      y=h['row']['y']+h['row']['height']/2
      x={'name':h['button']['x']+min(25,h['button']['width']*.4),'badge':h['badge']['x']+h['badge']['width']/2,
          'right':h['row']['right']-6,'toggle':h['toggle']['x']+h['toggle']['width']/2}[slot]
      el=location(x,y);page.evaluate('window._hitLog=[]');click(x,y)
      after=page.evaluate(read_heading,group)
      # Manage action is intentionally independent if a rightmost hit lands on it.
      is_manage='local-search-nav-manage' in el.get('closestControl','')
      log=page.evaluate('window._hitLog')
      # If desktop management button overlaps the count or the far edge, it owns the click.
      passed=(len(log)==1 and log[0]=={'kind':'manage','value':group} and after['expanded']==h['expanded']) if is_manage else (after['expanded']!=h['expanded'] and len(log)==0)
      check(f'heading.{group}.{slot}',passed,{'target':el,'before':h['expanded'],'after':after['expanded'],'hits':log})
    # Real right-click on count must not select; menu owner remains the only action.
    if not mobile:
     r=page.evaluate(read_row,['folder','项目']);y=r['row']['y']+r['row']['height']/2;x=r['badge']['x']+r['badge']['width']/2
     page.evaluate('window._hitLog=[]');page.mouse.click(x,y,button='right');page.wait_for_timeout(60)
     check('folder.rightclick.no-select',not any(x['kind']=='folder' for x in page.evaluate('window._hitLog')),page.evaluate('window._hitLog'))
    # Client-mode-specific: sort/maintenance row click must go through original owner, not direct selection.
    page.evaluate('window._hitLog=[];C.navigator.customization.setSortMode(true);C.navigator.collapsed.clear();C.navigator.renderRevision=-1;C.navigator.sync();')
    r=page.evaluate(read_row,['folder','项目']);
    if r and r['badge']:
     x=r['badge']['x']+r['badge']['width']*.5;y=r['row']['y']+r['row']['height']/2
     if page.evaluate('''([x,y])=>{let el=document.elementFromPoint(x,y);return el&&el.closest('.local-search-nav-scroll')!==null}''',[x,y]):
      click(x,y)
      check('sort.count.no-select',not any(x['kind']=='folder' for x in page.evaluate('window._hitLog')),page.evaluate('window._hitLog'))
    # Maintenance/capture owner: a count click is delegated to the existing
    # primary button, whose captured click routes to maintenance (not selection).
    page.evaluate("""()=>{const nav=C.navigator;nav.customization.setSortMode(false);
      nav.customization.maintenanceMode={kind:'folder',id:'test-maintenance'};
      nav.customization._maintenanceDefinition=d=>d.kind==='folder'?{id:'test-maintenance'}:null;
      nav.customization._runMaintenance=d=>_hitLog.push({kind:'maintenance',value:d.key});
      window._hitLog=[];}""")
    for slot in ('name','badge','right'):
     r=page.evaluate(read_row,['folder','项目']);
     if not r or not r['badge']:continue
     y=r['row']['y']+r['row']['height']/2
     x={'name':r['button']['x']+min(35,r['button']['width']*.4),
        'badge':r['badge']['x']+r['badge']['width']*.5,
        'right':r['row']['right']-6}[slot]
     page.evaluate('window._hitLog=[]')
     click(x,y)
     log=page.evaluate('window._hitLog')
     check('maintenance.'+slot+'.owner',len(log)==1 and log[0]['kind']=='maintenance',log)
    page.evaluate('C.navigator.customization.maintenanceMode=null;window._hitLog=[]')
    # Disabled normal row must stay inert even when the trailing count is tapped.
    page.evaluate("""()=>{window._hitLog=[];const r=[...document.querySelectorAll('.local-search-nav-section[data-nav-section=folder] .local-search-nav-row')].find(e=>e.querySelector('.local-search-move-tree-name')?.textContent==='项目');r.querySelector(':scope>.local-search-move-tree-folder').disabled=true;}""")
    r=page.evaluate(read_row,['folder','项目'])
    if r and r['badge']:
     click(r['badge']['x']+r['badge']['width']/2,r['row']['y']+r['row']['height']/2)
     check('disabled.count.inert',len(page.evaluate('window._hitLog'))==0,page.evaluate('window._hitLog'))
    # Exercise real selection and page transition with the actual Navigator method.
    page.evaluate("""async()=>{C.destroy();window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),{hostKind:'sidebar',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false});await C.init();await C.performSearch('');await waitFixture(150);C.navigator.collapsed.delete('folder');C.navigator.setPage('filters',false);C.navigator.renderRevision=-1;C.navigator.sync();await waitFixture(180);window._selectionCommits=0;const select=C.navigator.select.bind(C.navigator);C.navigator.select=function(...args){window._selectionCommits++;return select(...args)}}""")
    r=page.evaluate(read_row,['folder','项目'])
    if r and r['badge']:
     click(r['badge']['x']+r['badge']['width']/2,r['row']['y']+r['row']['height']/2)
     result=page.evaluate("()=>({commits:window._selectionCommits,filter:[...C.filterState.folders],page:C.navigator.page,results:C.fullResults.map(x=>x.path)})")
     check('folder.count.real-filter-single-commit',result['commits']==1 and result['filter']==['项目'] and (not mobile or result['page']=='results'),result)
    check('pageerrors',not errors,errors)
   except Exception as exc:
    checks.append({'case':'setup-or-execution','ok':False,'detail':str(exc)})
    print('ERROR',config,str(exc),flush=True)
   finally:
    results.append({'config':config,'checks':checks,'passed':sum(x['ok'] for x in checks),'total':len(checks),'errors':errors})
    ctx.close()
 browser.close()
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps({'source':str(root),'results':results,'passed':sum(r['passed'] for r in results),'total':sum(r['total'] for r in results)},ensure_ascii=False,indent=2))
print('SUMMARY',sum(r['passed'] for r in results),'/',sum(r['total'] for r in results),'OUTPUT',args.output,flush=True)
sys.exit(0 if all(c['ok'] for r in results for c in r['checks']) else 1)
