"""Hot-path work and native scrolling contracts, across desktop/mobile Sidebar/Tab."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_WORK_OUT','/workspace/latency-audit/current'));OUT.mkdir(parents=True,exist_ok=True)
results=[]
def check(n,v,e=None):
 results.append(dict(name=n,passed=bool(v),evidence=e));print(('PASS ' if v else 'FAIL ')+n,flush=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mobile in [False,True]:
  for tab in [False,True]:
   scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
   setup=(ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0]
   if tab:setup=setup.replace('new S.SearchView({app:H.app},P)','new S.SearchView({app:H.app},P,S.TAB_VIEW_TYPE)')
   if os.environ.get('GLS_WORK_SUBJECT'):setup=setup.replace("(ROOT/'tests/generated/subject.cjs')","Path(os.environ['GLS_WORK_SUBJECT'])")
   exec(setup,scope);ctx,p=scope['boot'](browser,mobile=mobile)
   prefix=('mobile' if mobile else 'desktop')+(' tab ' if tab else ' sidebar ')
   errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   p.evaluate('''async()=>{
    const meta=document.createElement('meta');meta.name='viewport';meta.content='width=device-width,initial-scale=1';document.head.append(meta);
    window.R=C.resultRenderer;window.N=C.navigator;
    if(N?.layout==='mobile')N.setPage('results',false);
    P.settings.filterPools=C.resultControls.filterPools().map(x=>({...x,visible:true,showAllValues:true}));
    document.querySelector('#host').style.width='600px';V.onResize();C.resultControls.refreshFilterPoolHeader();await waitFixture(60);if(N?.layout==='mobile')N.setPage('results',false);await waitFixture(40);
   }''')
   x=p.evaluate('''()=>{
    const nodes=[C.tagFilterBtn,C.propertyFilterBtn,C.folderBtn,...C.typeButtonEls],records=[];
    const text=C.tagFilterBtn.querySelector('.ui-indicator-label').firstChild;
    const mo=new MutationObserver(rs=>records.push(...rs));for(const n of nodes)mo.observe(n,{subtree:true,childList:true,attributes:true,characterData:true});
    for(let i=0;i<8;i++)C.facets.syncFilterButtons();records.push(...mo.takeRecords());mo.disconnect();
    return {mutations:records.length,sameText:C.tagFilterBtn.querySelector('.ui-indicator-label').firstChild===text};
   }''')
   check(prefix+'unchanged facet controls preserve nodes without mutations',x['mutations']==0 and x['sameText'],x)
   x=p.evaluate('''async()=>{
    const list=C.filterPoolValues,other=C.filterPoolShortcuts;list.scrollLeft=80;await waitFixture(20);
    const before=list.scrollLeft,desc=Object.getOwnPropertyDescriptor(Element.prototype,'scrollLeft');let reads=0,writes=0;
    for(const n of [list,other])Object.defineProperty(n,'scrollLeft',{configurable:true,get(){reads++;return desc.get.call(this)},set(v){writes++;desc.set.call(this,v)}});
    for(let i=0;i<8;i++)C.resultControls.refreshFilterPoolHeader();
    for(const n of [list,other])delete n.scrollLeft;await waitFixture(20);
    return {reads,writes,before,after:list.scrollLeft,max:list.scrollWidth-list.clientWidth,visible:!!list.getClientRects().length};
   }''')
   check(prefix+'filter rail refresh never reads or restores scroll geometry',x['reads']==0 and x['writes']==0,x)
   check(prefix+('native horizontal offset survives retained rail updates' if x['visible'] else 'hidden mobile rail stays unscrolled'),(x['before']>0 and abs(x['after']-x['before'])<1) if x['visible'] else x['after']==0 and x['max']==0,x)
   x=p.evaluate('''async()=>{
    const list=C.filterPoolValues;list.scrollLeft=1e6;await waitFixture(20);const oldMax=list.scrollWidth-list.clientWidth;
    P.settings.filterPools=P.settings.filterPools.map(x=>({...x,visible:x.kind==='folder',showAllValues:false,values:['Folder000']}));
    C.resultControls.refreshFilterPoolHeader();await waitFixture(30);
    return {left:list.scrollLeft,max:list.scrollWidth-list.clientWidth,oldMax};
   }''')
   check(prefix+'shrinking rail is naturally clamped to its scroll range',x['left']>=0 and x['left']<=x['max']+1 and x['max']<=x['oldMax'],x)
   x=p.evaluate('''()=>{
    let extensions=0,iterations=0;const meta={path:'A/n.md',tags:[],properties:{},get extension(){extensions++;return 'md'}};
    const filter=new S.FilterState();filter.folders.add('A');const iterator=filter.properties[Symbol.iterator];
    filter.properties[Symbol.iterator]=function(){iterations++;return iterator.call(this)};
    const match=S.FilterEngine.matches(meta,filter),lazy={extensions,iterations};filter.fileTypes.add('canvas');const rejected=!S.FilterEngine.matches(meta,filter);
    filter.fileTypes.clear();filter.properties.set('status',new Set(['active']));meta.properties.status='active';const property=S.FilterEngine.matches(meta,filter);
    return {match,lazy,rejected,property,activeReads:extensions};
   }''')
   check(prefix+'inactive filter fields do no metadata or iterator work',x['match'] and x['lazy']=={'extensions':0,'iterations':0},x)
   check(prefix+'active file type and property filters keep their semantics',x['rejected'] and x['property'] and x['activeReads']>0,x)
   if not tab:
    x=p.evaluate('''async()=>{
     N.setPage('filters',false);N.collapsed.delete('tags');N.renderRevision=-1;N.sync();await waitFixture(40);
     const original=String.prototype.toLocaleLowerCase;let repeats={};
     String.prototype.toLocaleLowerCase=function(...a){const text=String(this);if(/^tag[0-9]+$/.test(text))repeats[text]=(repeats[text]||0)+1;return original.apply(this,a)};
     try{N.renderRevision=-1;N._renderProjection()}finally{String.prototype.toLocaleLowerCase=original}
     return repeats;
    }''')
    check(prefix+'stable tag rows normalize each identity only once',len(x)>0 and all(n==1 for n in x.values()),x)
   p.evaluate('V.onClose()');p.wait_for_timeout(40);check(prefix+'no asynchronous browser errors',not errors,errors);ctx.close()
 browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(x['passed'] for x in results) else 1)
