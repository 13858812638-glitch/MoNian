"""Reproduce stale in-flight snippet reads during index commits in Chromium mock."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,json

def run(root:Path,change_visible:bool=False,multi_host:bool=False):
  with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=c.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="is-mobile is-ios theme-light"><div id="host" style="height:720px;width:100%"></div><div id="host2" style="height:720px;width:100%"></div></body></html>')
    for f in ['tests/browser-fixture.css','src/styles/styles.css']:page.add_style_tag(content=(root/f).read_text())
    page.add_script_tag(content=(root/'tests/host.js').read_text())
    page.evaluate('''()=>{const files=Array.from({length:400},(_,i)=>({path:`项目${i%36}/产品测试笔记${String(i).padStart(5,'0')}.md`,content:`# 产品测试笔记${i}\\n测试正文${i}`,properties:{tags:[`tag${i%20}`]}}));window.H=__makeHost({files,mobile:true});window.module={exports:{}};window.require=name=>{if(name!=='obsidian')throw Error('unknown module');return H.obsidian};}''')
    page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
    out=page.evaluate('''async ({changeVisible,multiHost})=>{
      window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);await P.onload();await H.layoutReady();await P._flushIndexQueueNow();
      window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),{hostKind:'embedded',persistModalSession:false,allowCreate:true});await C.init();C.performSearch('产品测试笔记');
      await new Promise(r=>setTimeout(r,140));
      if(multiHost){window.C2=new S.SearchCore(H.app,P,document.querySelector('#host2'),{hostKind:'embedded',persistModalSession:false,allowCreate:true});await C2.init();C2.performSearch('产品测试笔记');await new Promise(r=>setTimeout(r,180));}
      const view=()=>[...C.resultsContainer.querySelectorAll('.local-search-item[data-path]')], path=view()[0].dataset.path,original=P.getFileFullContent;
      let held=null, heldResolver=null, blocked=true, events=[];
      P.getFileFullContent=function(file){
        if(file.path===path && blocked){blocked=false;events.push('old-start');held=new Promise(resolve=>heldResolver=resolve);return held;}
        if(file.path===path)events.push('new-start');
        return original.call(this,file);
      };
      C.performSearch('产品测试笔记',true);
      await new Promise(r=>setTimeout(r,38));
      if(!heldResolver)throw Error('expected held pending read');
      const oldGeneration=C._resultGeneration;
      const updatePath=changeVisible?path:C.fullResults.at(-1).path;
      const f=H.app.vault.getAbstractFileByPath(updatePath);
      await H.app.vault.modify(f,changeVisible?'# 产品测试笔记\\nNEW_CONTENT_MARKER':f.content+'\\noffscreen updated');
      await P._flushIndexQueueNow();
      await new Promise(r=>setTimeout(r,140));
      const beforeRelease={gen:C._resultGeneration,oldGeneration,inFlight:C.resultRenderer._snippetInFlight?.size,loaded:C.loadedPaths.has(path),events:[...events],snippet:C.renderedResults.find(x=>x.path===path)?.snippet||''};
      heldResolver('# 产品测试笔记\\nOLD_STALE_CONTENT_MARKER');events.push('old-release');
      await new Promise(r=>setTimeout(r,135));
      const afterSnippet=C.renderedResults.find(x=>x.path===path)?.snippet||'';
      const domSnippet=view().find(x=>x.dataset.path===path)?.querySelector('.local-search-item-snippet')?.textContent||'';
      const state={beforeRelease,afterSnippet,domSnippet,events,pending:C.resultRenderer._snippetInFlight?.size||0,listenerCount:H.activeListeners(),retainedPaths:C.fullResults.length};
      if(multiHost){state.secondHost={visible:C2.resultRenderer._mountedShells().length,loaded:C2.loadedPaths.size,pending:C2.resultRenderer._snippetInFlight?.size||0,sameSearch:C2.fullResults.map(x=>x.path).join('|')===C.fullResults.map(x=>x.path).join('|')};C2.destroy();}
      C.destroy();state.destroyed=C._destroyed;state.pendingAfterDestroy=C.resultRenderer===null?0:99;
      return state;
    }''',{'changeVisible':change_visible,'multiHost':multi_host})
    out['pageErrors']=errors
    c.close();b.close();return out

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--root',type=Path,required=True);a.add_argument('--visible',action='store_true');a.add_argument('--multi',action='store_true');a.add_argument('--output',type=Path);x=a.parse_args();v=run(x.root,x.visible,x.multi)
 if x.output:x.output.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps({'visible':x.visible,'multi':x.multi,'events':v.get('events'),'hasStale':'OLD_STALE' in v['domSnippet'],'hasNew':'NEW_CONTENT' in v['domSnippet'],'pending':v['pending'],'secondHost':v.get('secondHost'),'errors':v['pageErrors']},ensure_ascii=False))
