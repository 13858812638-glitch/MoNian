"""Read-only picker transition baseline for GLS v5.2 consolidation v2.
Uses a standalone Chromium mock-host harness. No src/dist files are edited.
Collects synchronous click latency and DOM-mutation counts; NOT native iOS FPS.
"""
from __future__ import annotations
import json, os, statistics, math, argparse, subprocess
from collections import defaultdict
from pathlib import Path
from playwright.sync_api import sync_playwright
HERE = Path(__file__).resolve().parent
ROOT = Path(os.environ.get('GLS_SOURCE_ROOT', HERE.parent)).resolve()

def percentile(v,p):
    v=sorted(v)
    if not v: return None
    pos=(len(v)-1)*p
    low=int(math.floor(pos)); high=int(math.ceil(pos)); t=pos-low
    return v[low]*(1-t)+v[high]*t

def test_mode(page,kind,files):
    # This tests a direct mode action invocation, excluding overflow-menu animation.
    # Begin each facet from a clean host and fresh picker with the same indexed fixture.
    open_js={"tag":"C.facets.openTagPicker()","property":"C.facets.openPropertyPicker()","folder":"C.facets.showFolderDropdown()"}[kind]
    page.evaluate(f'()=>{{C.dropdown.close(false); {open_js};}}')
    label={"tag":"标签","property":"属性","folder":"文件夹"}[kind]
    maintenance={"tag":"重命名标签","property":"重命名属性键和值","folder":"重命名文件夹"}[kind]
    run_js="""async a=>{
      const panel=C.dropdown.panel;
      if (!panel) throw Error('missing panel');
      const kindLabel=a.label, action=a.action;
      const buttons=[...panel.querySelectorAll('button')];
      const actionBtn = buttons.find(b=>b.getAttribute('aria-label')===a.want);
      if (!actionBtn) throw Error('button not found: '+a.want+'; found '+buttons.map(b=>b.getAttribute('aria-label')).filter(Boolean).join(','));
      let called={resultPage:0,filterChanged:0,indexQueue:0,dropdownRefresh:0};
      const patches=[];
      for (const [object,name,key] of [[C.resultRenderer,'renderPage','resultPage'],[C,'_onFilterChanged','filterChanged'],[C,'_scheduleResultIndexUpdate','indexQueue'],[C.dropdown,'refresh','dropdownRefresh']]) {
        if (typeof object?.[name] !== 'function') continue;
        const original=object[name];
        object[name]=function(...args){called[key]++;return original.apply(this,args)};
        patches.push(()=>object[name]=original);
      }
      const observedRecords=[];const observer=new MutationObserver(rs=>observedRecords.push(...rs));
      observer.observe(panel,{childList:true,subtree:true,attributes:true,characterData:true});
      let treeClearCount=0;const oldEmpty=Element.prototype.empty;
      Element.prototype.empty=function(...x){if(this.classList?.contains('local-search-move-tree'))treeClearCount++;return oldEmpty.apply(this,x)};
      const rowCountBefore=panel.querySelectorAll('.local-search-move-tree-row,.local-search-tag-tree-row,.local-search-property-tree-row').length;
      const t=performance.now();actionBtn.click();const synchronousMs=performance.now()-t;
      await Promise.resolve();
      // Collect one animation frame of deferred mutations; frame time is not a paint/latency metric.
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const records=[...observedRecords,...observer.takeRecords()]; observer.disconnect(); Element.prototype.empty=oldEmpty;
      patches.reverse().forEach(undo=>undo());
      let added=0,removed=0,treeAdds=0,treeRemoves=0, treeMutations=0, attrs=0;
      for(const r of records){
        if(r.type==='attributes'){attrs++;continue};
        if(r.type!=='childList')continue;
        added+=r.addedNodes.length;removed+=r.removedNodes.length;
        const el=r.target.nodeType===1?r.target:r.target.parentElement;
        const tree=el?.closest?.('.local-search-tag-tree,.local-search-property-tree,.local-search-folder-tree');
        if(tree){treeMutations++;treeAdds+=r.addedNodes.length;treeRemoves+=r.removedNodes.length;}
      }
      return {kindLabel,action, synchronousMs, treeClearCount, records:records.length,added,removed,treeAdds,treeRemoves,treeMutations,attributes:attrs,rowCountBefore,rowCountAfter:panel.querySelectorAll('.local-search-move-tree-row,.local-search-tag-tree-row,.local-search-property-tree-row').length,called};
    }"""
    data=[]
    stepseq=['selection','sort','maintenance']
    for i in range(12):
      for step in stepseq:
        wanted=({'selection':'进入'+label+'多选', 'sort':'进入'+label+'拖拽模式', 'maintenance':maintenance}[step]);
        try: row=page.evaluate(run_js,{'action':step,'want':wanted,'label':label})
        except Exception as e:
          print('ERROR',kind,step,i,e,flush=True)
          raise
        row.update(cycle=i,kind=kind,files=files)
        data.append(row)
    return data

def main():
  p=argparse.ArgumentParser();p.add_argument('--files',type=int,default=6);p.add_argument('--output',default=None);p.add_argument('--cycles',type=int,default=12);p.add_argument('--headful',action='store_true')
  args=p.parse_args()
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=not args.headful,args=['--no-sandbox'])
   context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
   page=context.new_page()
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.set_content('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body class="is-mobile is-ios theme-light"><div id="host"></div>')
   for css in ['tests/browser-fixture.css','src/styles/styles.css']:page.add_style_tag(content=(ROOT/css).read_text())
   page.add_script_tag(content=(ROOT/'tests/host.js').read_text())
   if args.files==6:
    page.add_script_tag(content=(ROOT/'tests/browser-scenarios.js').read_text())
    page.evaluate('()=>bootFixture(true)')
   else:
    page.evaluate('''count=>{
       const files=Array.from({length:count},(_,i)=>({
         path:`项目${i%30}/笔记${i}.md`,content:`# 任务 ${i}\\n这里是模拟内容`,
         properties:{所属项目:`项目${i%12}`,项目负责人:[`员工${i%20}`],状态:`状态${i%5}`, tags:[`主题${i%19}`,`类别${i%7}/子${i%13}`]},
         tags:[`主题${i%19}`,`类别${i%7}/子${i%13}`]
       }));
       window.H=__makeHost({files,mobile:true});window.module={exports:{}};
       window.require=name=>{if(name!=='obsidian')throw Error('unexpected require');return H.obsidian};
    }''',args.files)
   page.add_script_tag(content=(ROOT/'tests/generated/subject.cjs').read_text())
   if args.files==6:page.evaluate('()=>startFixture()')
   else:
    page.evaluate('''async()=>{window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);await P.onload();await H.layoutReady();await P._flushIndexQueueNow();window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),{hostKind:'embedded',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false});if(!await C.init())throw Error('init failed');await C.performSearch();}''')
   samples=[];nfiles=page.evaluate('C.fullResults.length');print('fixture indexed',nfiles,flush=True)
   for kind in ['tag','property','folder']:
    chunk=test_mode(page,kind,args.files);samples.extend(chunk);print(kind,len(chunk),'actions',flush=True)
   result={"context":{"host":"Chromium + mock Obsidian","browser":browser.version,"mobileEmulation":True,"nativeIOS":False,"files":args.files,"indexed":nfiles,"note":"Direct hidden-source action invocation, without opening More overflow; this is JS synchronous click cost, not user-perceived response time; headless host and shared test machine"},"samples":samples,"errors":errors}
   res=[]
   for kind in ['tag','property','folder']:
    for action in ['selection','sort','maintenance']:
     rows=[s for s in samples if s['kind']==kind and s['action']==action and s['cycle']>=2]
     ms=[r['synchronousMs'] for r in rows]
     res.append({"kind":kind,"action":action,"n":len(rows),"sync_click_p50_ms":round(percentile(ms,.5),3),"sync_click_p95_ms":round(percentile(ms,.95),3),"tree_full_clear_p50":round(percentile([r['treeClearCount'] for r in rows],.5),2),"dom_records_p50":round(percentile([r['records'] for r in rows],.5),2),"dom_records_p95":round(percentile([r['records'] for r in rows],.95),2),"tree_mutations_p50":round(percentile([r['treeMutations'] for r in rows],.5),2),"tree_added_p50":round(percentile([r['treeAdds'] for r in rows],.5),2),"tree_removed_p50":round(percentile([r['treeRemoves'] for r in rows],.5),2),"filter_changes_sum":sum(r['called']['filterChanged'] for r in rows),"result_page_calls_sum":sum(r['called']['resultPage'] for r in rows)})
   result['summary']=res
   output=Path(args.output or HERE/f'picker-perf-{args.files}files.json');output.write_text(json.dumps(result,ensure_ascii=False,indent=2))
   print('RESULT',output,flush=True);print(json.dumps(res,ensure_ascii=False,indent=2),flush=True)
   context.close();browser.close()

if __name__=='__main__': main()
