"""Small same-host synchronous sort-submit benchmark; not an iOS performance claim."""
import pathlib,json,argparse,statistics,importlib.util,sys
from playwright.sync_api import sync_playwright
spec=importlib.util.spec_from_file_location('fixture',pathlib.Path(__file__).resolve().with_name('unchanged_submit_fixture.py'))
fixture=importlib.util.module_from_spec(spec);sys.modules[spec.name]=fixture;spec.loader.exec_module(fixture)
ap=argparse.ArgumentParser();ap.add_argument('--source',type=pathlib.Path,required=True);ap.add_argument('--output',type=pathlib.Path,required=True);ap.add_argument('--files',nargs='+',type=int,default=[300,3000]);a=ap.parse_args()
out=[]
with sync_playwright() as driver:
 b=driver.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for num in a.files:
  ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,locale='zh-CN');page=ctx.new_page()
  fixture.boot(page,a.source,num,True)
  metrics=page.evaluate('''()=>{
   C.searchInput.value='产品测试笔记';C.performSearch('产品测试笔记',true);
   C.sorting.applyField('name');
   const orig=C.resultRenderer.renderPage.bind(C.resultRenderer);let renders=0;
   C.resultRenderer.renderPage=function(...args){renders++;return orig(...args)};
   const sample=[];for(let i=0;i<3;i++)C.sorting.applyField('name');renders=0;
   for(let i=0;i<14;i++){const start=performance.now();C.sorting.applyField('name');sample.push(+(performance.now()-start).toFixed(3));}
   const result={samples:sample,renderPageCalls:renders};C.destroy();return result;
  }''')
  samples=sorted(metrics['samples']);metrics.update({'files':num,'p50ms':statistics.median(samples),'p95ms':round(samples[12]+0.35*(samples[13]-samples[12]),3)})
  out.append(metrics);print(num,'p50',metrics['p50ms'],'p95',metrics['p95ms'],'renders',metrics['renderPageCalls'],flush=True)
  ctx.close()
 b.close()
a.output.write_text(json.dumps(out,ensure_ascii=False,indent=2));print('WROTE',a.output)
