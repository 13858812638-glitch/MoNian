"""Minimal reproducible Chromium Obsidian mock fixture for unchanged-submit acceptance."""
def boot(page,root,file_count,mobile):
    page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile is-ios ' if mobile else '')+'theme-light"><div id="host" style="height:720px;width:100%"></div></body></html>')
    for css in ('tests/browser-fixture.css','src/styles/styles.css'):
        page.add_style_tag(content=(root/css).read_text())
    page.add_script_tag(content=(root/'tests/host.js').read_text())
    page.evaluate('''({count,mobile})=>{
      const files=Array.from({length:count},(_,i)=>({
        path:`项目${i%36}/产品测试笔记${String(i).padStart(5,'0')}.md`,
        content:`# 产品测试笔记${i}\\n产品详情规格 ${i%29}\\n新款研发状态${i%7}`,
        properties:{所属项目:`项目${i%12}`,项目负责人:[`员工${i%20}`],tags:[`主题${i%19}`,`类别${i%8}`]}
      }));
      window.H=__makeHost({files,mobile});window.module={exports:{}};
      window.require=name=>{if(name!=='obsidian')throw Error('Unexpected module: '+name);return H.obsidian};
    }''', {'count':file_count,'mobile':mobile})
    page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
    init=page.evaluate('''async()=>{
      window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);
      const start=performance.now();await P.onload();await H.layoutReady();await P._flushIndexQueueNow();
      window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),
        {hostKind:'sidebar',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false});
      if(!await C.init())throw Error('SearchCore init false'); C.performSearch();
      return {initAndIndexMs:+(performance.now()-start).toFixed(2),meta:P.fileMetaCache.size,
       total:C.fullResults.length,height:C.resultsContainer.clientHeight,
       mounted:C.resultRenderer._mountedShells().length};
    }''')
    page.wait_for_timeout(100)
    return init

