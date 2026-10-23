"""Scroll sizing and retained navigation contracts, through real SearchView."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent;OUT=Path(os.environ.get('GLS_SMOOTH_OUT','/workspace/smooth-audit/current'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')};exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
results=[]
def check(name,ok,evidence=None):
 results.append({'name':name,'pass':bool(ok),'evidence':evidence});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mobile in [False,True]:
  ctx,p=scope['boot'](b,mobile=mobile,large=True);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));prefix='mobile ' if mobile else 'desktop '
  x=p.evaluate('''async()=>{
   const n=C.navigator,rows=[...n.scroll.querySelectorAll('.local-search-nav-row')];
   const last=rows[rows.length-1],btn=last.querySelector('button:not([disabled])');
   btn.focus();await waitFixture(40);const rect=btn.getBoundingClientRect(),bounds=n.scroll.getBoundingClientRect();
   return {focused:document.activeElement===btn,visible:rect.width>0&&rect.height>0&&rect.bottom>bounds.top&&rect.top<bounds.bottom,
   rows:rows.length,preserved:rows.every(r=>r.isConnected)};
  }''');check(prefix+'far keyboard focus reveals retained row',x['focused'] and x['visible'] and x['preserved'],x)
  p.evaluate("C.navigator.scroll.scrollTop=0;C.navigator.setPage('results',false)");p.wait_for_timeout(80)
  x=p.evaluate('''()=>{
   const list=C.resultsContainer,r=C.resultRenderer,reads={height:0,client:0};
   const h=Object.getOwnPropertyDescriptor(Element.prototype,'scrollHeight'),c=Object.getOwnPropertyDescriptor(Element.prototype,'clientHeight');
   Object.defineProperty(list,'scrollHeight',{configurable:true,get(){reads.height++;return h.get.call(this)}});
   Object.defineProperty(list,'clientHeight',{configurable:true,get(){reads.client++;return c.get.call(this)}});
   let zero,negative,nan,upper;
   try{list.scrollTop=200;zero=r._setScrollTop(0);negative=r._setScrollTop(-10);nan=r._setScrollTop(NaN);
    const zeroReads={...reads};upper=r._setScrollTop(1e9);
    return {zero,negative,nan,zeroReads,upper,max:h.get.call(list)-c.get.call(list),marker:r._programmaticScrollTop};
   }finally{delete list.scrollHeight;delete list.clientHeight;r._setScrollTop(0)}
  }''');check(prefix+'origin reset avoids scroll extent reads',not any(x['zeroReads'].values()) and x['zero']==x['negative']==x['nan']==0,x)
  check(prefix+'positive scroll still clamps to live maximum',abs(x['upper']-x['max'])<1 and x['marker']==x['upper'],x)
  x=p.evaluate('''async()=>{
   const r=C.resultRenderer,list=C.resultsContainer;
   C.navigator.setPage("filters",false);
   const data=[];for(const size of [24,48]){
    C.containerEl.style.setProperty('--ls-picker-row-h',size+'px');C.containerEl.style.setProperty('--ls-nav-row-height',size+'px');
    await waitFixture(40);data.push([...C.navigator.scroll.querySelectorAll('.local-search-nav-row')].every(row=>Math.abs(row.getBoundingClientRect().height-size)<1));
   }
   C.containerEl.style.removeProperty('--ls-picker-row-h');C.containerEl.style.removeProperty('--ls-nav-row-height');
   return data;
  }''');check(prefix+'Style Settings row size applies to offscreen rows too',all(x),x)
  if not mobile:
   for width in [360,714,960]:
    p.evaluate('w=>{document.querySelector("#host").style.width=w+"px";V.onResize()}',width);p.wait_for_timeout(80)
    x=p.evaluate('''()=>{const r=C.resultRenderer,list=C.resultsContainer,index=r._ensureHeightIndex();
     return {viewport:list.clientHeight,start:r.windowStart,end:r.windowEnd,first:index.positionAt(Math.max(0,list.scrollTop-r._viewportPadTop)),last:index.positionAt(Math.max(0,list.scrollTop+list.clientHeight-1-r._viewportPadTop)),
     input:C.searchInput.getBoundingClientRect().height,nav:C.navigator.facets.clientHeight,
     mainBasis:getComputedStyle(C.navigator.main).flexBasis,shellBasis:getComputedStyle(C.resultsShell).flexBasis,listBasis:getComputedStyle(list).flexBasis}}
    ''');check(prefix+str(width)+'px result viewport remains filled',x['viewport']>0 and x['input']>0 and x['nav']>0 and x['start']<=x['first'] and x['end']>x['last'],x)
  p.evaluate('V.onClose()');p.wait_for_timeout(30);check(prefix+'close leaves no asynchronous errors',not errors,errors);ctx.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');raise SystemExit(any(not r['pass'] for r in results))
