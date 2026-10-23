"""Count input/index/Picker commits through SearchView, without timing claims."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent;OUT=Path(os.environ.get('GLS_PERF_FLOW_OUT','/workspace/perf-audit-20261023/flow'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')};exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
report=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mobile in [False,True]:
  ctx,p=scope['boot'](b,mobile=mobile,large=True);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.wait_for_timeout(400)
  p.evaluate('''()=>{
   window.work={};for(const [o,prefix,names] of [[C,'core',['performSearch','_recomputeCurrentResults','_commitResultIndexChanges']],
   [C.navigator,'nav',['_renderProjection']], [C.resultRenderer,'renderer',['renderPage','refreshChangedRows']]])
   for(const name of names){const old=o[name];o[name]=function(...a){const k=prefix+'.'+name;work[k]=(work[k]||0)+1;return old.apply(this,a)}}
   for(const value of ['n','no','not','note']){C.searchInput.value=value;C.searchInput.dispatchEvent(new Event('input',{bubbles:true}))}
  }''');p.wait_for_timeout(450);typing=p.evaluate('({work:{...work},query:C.queryState.raw,results:C.fullResults.length})')
  p.evaluate("work={};C.searchInput.dispatchEvent(new Event('input',{bubbles:true}))");p.wait_for_timeout(250);same=p.evaluate('({...work})')
  p.evaluate('''()=>{work={};C.dropdown.open(C.searchInput,'审计');for(let i=0;i<20;i++)C._queueResultIndexChanges(['Folder000/Child/note0.md'])}''');p.wait_for_timeout(250);held=p.evaluate('({work:{...work},pending:!!C._pendingResultUpdate})')
  p.evaluate('C.dropdown.close(false)');p.wait_for_timeout(350);resumed=p.evaluate('({work:{...work},pending:!!C._pendingResultUpdate})')
  p.evaluate('''()=>{work={};for(let i=0;i<8;i++){C.dropdown.open(C.searchInput,'审计');C.dropdown.close(false)}}''');p.wait_for_timeout(250);popup=p.evaluate('({...work})')
  report.append({'mobile':mobile,'typingBurst':typing,'unchangedInput':same,'indexBurstWhilePickerOpen':held,'afterPickerClosed':resumed,'popupOpenClose8':popup,'pageErrors':errors});p.evaluate('V.onClose()');ctx.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2));assert all(not x['pageErrors'] for x in report)
