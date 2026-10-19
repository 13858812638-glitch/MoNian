"""GLS v5.2 targeted snippet invalidation check on real built JS, mock Obsidian Chromium.
Run against baseline and proposed changes. Does not imply iOS/WebKit validation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, argparse, traceback

def run(root: Path, count=300, mobile=True):
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        ctx=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,locale='zh-CN')
        page=ctx.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+ ('is-mobile is-ios ' if mobile else '')+'theme-light"><div id="host" style="height:720px;width:100%"></div></body></html>')
        for css in ['tests/browser-fixture.css','src/styles/styles.css']:
            page.add_style_tag(content=(root/css).read_text())
        page.add_script_tag(content=(root/'tests/host.js').read_text())
        page.evaluate('''({count,mobile})=>{const files=Array.from({length:count},(_,i)=>({path:`项目${i%36}/产品测试笔记${String(i).padStart(5,'0')}.md`, content:`# 产品测试笔记${i}\\n产品详情规格 ${i%29}\\n新款研发状态${i%7}`,properties:{所属项目:`项目${i%12}`,项目负责人:[`员工${i%20}`],tags:[`主题${i%19}`,`类别${i%8}`] }}));window.H=__makeHost({files,mobile});window.module={exports:{}};window.require=name=>{if(name!=='obsidian')throw Error('Unknown '+name);return H.obsidian};}''',{'count':count,'mobile':mobile})
        page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
        page.evaluate('''async()=>{window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);await P.onload();await H.layoutReady();await P._flushIndexQueueNow();window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),{hostKind:'embedded',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false}); if(!await C.init())throw Error('core init');C.performSearch('产品测试笔记');await new Promise(r=>setTimeout(r,200));}''')
        result=page.evaluate('''async()=>{
           const summary={};
           const renderer=C.resultRenderer;
           const visible=()=>Array.from(C.resultsRail.querySelectorAll('.local-search-item[data-path]'));
           const getVisiblePaths=()=>visible().map(el=>el.dataset.path);
           const docSig=()=>visible().map(el=>[el.dataset.path,el.querySelector('.local-search-item-snippet')?.textContent||'']);
           const beforePaths=getVisiblePaths();const beforeNodes=visible();
           summary.initial={count:visible().length,loaded:C.loadedPaths.size,gen:C._resultGeneration,first:docSig()[0]};
           let updates=0,builds=0,mutations=0,readCalls=0;
           const originalUpdate=renderer._updateSnippetInPlace,originalBuild=renderer._buildResultItem,originalRead=P.getFileFullContent;
           renderer._updateSnippetInPlace=function(...args){updates++;return originalUpdate.apply(this,args)};
           renderer._buildResultItem=function(...args){builds++;return originalBuild.apply(this,args)};
           P.getFileFullContent=function(...args){readCalls++;return originalRead.apply(this,args)};
           const ob=new MutationObserver(xs=>{mutations+=xs.length});ob.observe(C.resultsRail,{childList:true,subtree:true});
           const step=[];
           for(let i=0;i<12;i++){
             const path=C.fullResults.at(-i-1).path;if(beforePaths.includes(path))throw Error('offscreen conflict');
             const f=H.app.vault.getAbstractFileByPath(path);const old={updates,builds,mutations,readCalls};
             await H.app.vault.modify(f,f.content+`\\nburst update ${i}`);await P._flushIndexQueueNow();
             await new Promise(r=>setTimeout(r,36));
             step.push({updates:updates-old.updates,builds:builds-old.builds,mutations:mutations-old.mutations,reads:readCalls-old.readCalls,retained:beforeNodes.every(el=>el.isConnected),loaded:C.loadedPaths.size});
           }
           summary.offscreen={steps:step,updateCount:updates,buildCount:builds,mutationCount:mutations,readCount:readCalls,allDomRetained:beforeNodes.every(el=>el.isConnected),sameVisibleOrder:JSON.stringify(getVisiblePaths())===JSON.stringify(beforePaths)};
           const visiblePath=beforePaths[0],file=H.app.vault.getAbstractFileByPath(visiblePath);
           const old={updates,builds};
           await H.app.vault.modify(file, '# 产品测试笔记\\nVISIBLE_MARKER_20261018 new body');await P._flushIndexQueueNow();await new Promise(r=>setTimeout(r,110));
           summary.visibleChanged={updates:updates-old.updates,builds:builds-old.builds,rendered:visible().find(el=>el.dataset.path===visiblePath)?.querySelector('.local-search-item-snippet')?.textContent||'',loaded:C.loadedPaths.has(visiblePath)};
           const stateAfterVisible={paths:C.fullResults.map(x=>x.path),gen:C._resultGeneration,scroll:C.resultsContainer.scrollTop,selected:C.selection.selectedPaths.size};
           // Scrolling to an entirely different virtual window must still load new summaries.
           C.resultsContainer.scrollTop=Math.max(0,C.resultsContainer.scrollHeight-C.resultsContainer.clientHeight-5);renderer.handleScrollLoad(C.resultsContainer);
           await new Promise(r=>setTimeout(r,360));
           const endingPaths=getVisiblePaths(),endingSnippets=docSig();
           summary.scroll={changed:JSON.stringify(beforePaths)!==JSON.stringify(endingPaths),visible:endingPaths.length,summaryCount:endingSnippets.filter(x=>x[1]).length,loaded:C.loadedPaths.size};
           C.performSearch('绝不命中测试词',false);
           await new Promise(r=>setTimeout(r,50));
           summary.newQuery={results:C.fullResults.length,loaded:C.loadedPaths.size,generation:C._resultGeneration};
           C.destroy();summary.cleanup={destroyed:C._destroyed,listeners:H.activeListeners(),pendingSnippetLoads:renderer._snippetInFlight?.size||0};
           P.getFileFullContent=originalRead;ob.disconnect();
           return summary;
        }''')
        result['pageErrors']=errors
        ctx.close();browser.close()
        return result

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--root',type=Path,required=True);a.add_argument('--count',type=int,default=300);a.add_argument('--desktop',action='store_true');a.add_argument('--output',type=Path);args=a.parse_args()
    val=run(args.root,args.count,not args.desktop)
    text=json.dumps(val,ensure_ascii=False,indent=2)
    if args.output: args.output.write_text(text,encoding='utf8')
    print(json.dumps({'count':args.count,'mobile':not args.desktop,'offscreenTotalUpdates':val['offscreen']['updateCount'],'offscreenDOMMutations':val['offscreen']['mutationCount'],'visibleChanged':val['visibleChanged'],'scroll':val['scroll'],'errors':val['pageErrors']},ensure_ascii=False))
