"""GLS Picker transition regression, standalone mock Obsidian + Chromium.

Runs the exact same real controller interactions on either formal baseline or
candidate.  Checks one full tree rebuild per mutually-exclusive mode change
and snapshots final UI state for exact baseline-vs-candidate comparison.
Does not assert native iOS/WebKit performance.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
OPEN={'tag':'C.facets.openTagPicker()','property':'C.facets.openPropertyPicker()'}
LABEL={'tag':'标签','property':'属性'}
MAINT={'tag':'重命名标签','property':'重命名属性键和值'}
STEPS=['maintenance','selection','sort','maintenance','sort','selection','maintenance','selection','sort']

def bootstrap(page,root,files):
    page.set_content('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body class="is-mobile is-ios theme-light"><div id="host"></div>')
    for css in ('tests/browser-fixture.css','src/styles/styles.css'):
        page.add_style_tag(content=(root/css).read_text())
    page.add_script_tag(content=(root/'tests/host.js').read_text())
    if files==6:
        page.add_script_tag(content=(root/'tests/browser-scenarios.js').read_text())
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
        }''',files)
    page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
    if files==6:
        page.evaluate('()=>startFixture()')
    else:
        page.evaluate('''async()=>{
          window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);
          await P.onload();await H.layoutReady();await P._flushIndexQueueNow();
          window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),
            {hostKind:'embedded',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false});
          if(!await C.init())throw Error('init failed');await C.performSearch();
        }''')

def run_kind(page,kind,force_scroll=False):
    page.evaluate(f'()=>{{C.dropdown.close(false);{OPEN[kind]};}}')
    def run_click(step):
        want={'maintenance':MAINT[kind],'selection':'进入'+LABEL[kind]+'多选','sort':'进入'+LABEL[kind]+'拖拽模式'}[step]
        return page.evaluate('''async a=>{
          const panel=C.dropdown.panel;
          const button=[...panel.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===a.want);
          if(!button)throw Error('button missing: '+a.want+'; '+[...panel.querySelectorAll('button')].map(b=>b.getAttribute('aria-label')).filter(Boolean).join(';'));
          const tree=panel.querySelector('.local-search-move-tree');
          if (a.forceScroll && tree) {
            tree.style.height='120px'; tree.style.overflow='auto';
            tree.scrollTop=Math.min(76,Math.max(0,tree.scrollHeight-tree.clientHeight));
          }
          let fullRender=0,filterChanges=0,resultRenders=0;
          const beforeEmpty=Element.prototype.empty, beforeFilter=C._onFilterChanged, beforeResult=C.resultRenderer.renderPage;
          Element.prototype.empty=function(...args){
            if(this.classList?.contains('local-search-move-tree')) fullRender++;
            return beforeEmpty.apply(this,args);
          };
          C._onFilterChanged=function(...args){filterChanges++;return beforeFilter.apply(this,args)};
          C.resultRenderer.renderPage=function(...args){resultRenders++;return beforeResult.apply(this,args)};
          let elapsed;
          try { const t=performance.now();button.click();elapsed=performance.now()-t; }
          finally {
            Element.prototype.empty=beforeEmpty;
            C._onFilterChanged=beforeFilter;
            C.resultRenderer.renderPage=beforeResult;
          }
          await Promise.resolve();
          const list=panel.querySelector('.local-search-move-tree');
          const allButtons=[...panel.querySelectorAll('button')];
          const relevantButtons=allButtons.filter(b=>(b.getAttribute('aria-label')||'').match(/(?:多选|拖拽模式|重命名标签|重命名属性键和值|确认多选)/));
          const state={
            panelClasses:[...panel.classList].sort(),
            heading:panel.querySelector('.local-search-picker-title-heading, .local-search-picker-title-text')?.textContent || '',
            inputs:[...panel.querySelectorAll('input')].map(x=>({value:x.value,placeholder:x.placeholder})),
            relevantButtons:relevantButtons.map(b=>({label:b.getAttribute('aria-label'),pressed:b.getAttribute('aria-pressed'),hidden:b.hidden,selected:b.classList.contains('is-selected')})),
            searchMode:panel.querySelector('.local-search-picker-search-mode')?.textContent || '',
            rows:[...list.querySelectorAll('[data-picker-key]')].map(el=>({key:el.dataset.pickerKey,text:el.textContent,selected:el.classList.contains('is-selected')})),
            currentSelection:panel.querySelector('.local-search-picker-current')?.textContent || '',
            scrollTop:list.scrollTop
          };
          return {step:a.step,fullRender,filterChanges,resultRenders,elapsedMs:elapsed,state};
        }''',{'step':step,'want':want,'forceScroll':force_scroll})
    return [run_click(step) for step in STEPS]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--root',type=Path,default=HERE.parent)
    parser.add_argument('--files',type=int,default=6)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--compare',type=Path)
    parser.add_argument('--expect-single',action='store_true')
    parser.add_argument('--force-scroll',action='store_true')
    args=parser.parse_args()
    root=args.root.resolve()
    errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
        page=context.new_page()
        page.on('pageerror',lambda error:errors.append(str(error)))
        bootstrap(page,root,args.files)
        kinds={kind:run_kind(page,kind,args.force_scroll) for kind in ('tag','property')}
        version=browser.version
        context.close();browser.close()
    result={'engine':'Chromium '+version,'files':args.files,'kinds':kinds,'errors':errors}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2))
    checks=[]
    for kind,seq in kinds.items():
        for i,row in enumerate(seq):
            if args.expect_single and row['fullRender']>1:
                checks.append(f'{kind} {i} {row["step"]}: fullRender={row["fullRender"]} > 1')
            if row['filterChanges'] or row['resultRenders']:
                checks.append(f'{kind} {i} {row["step"]}: unexpected result update')
    if args.compare:
        old=json.loads(args.compare.read_text())
        for kind,seq in kinds.items():
            for i,row in enumerate(seq):
                if row['state']!=old['kinds'][kind][i]['state']:
                    checks.append(f'{kind} {i} {row["step"]}: final UI state differs from baseline')
    checks+=errors
    for kind,seq in kinds.items():
        print(kind,[(x['step'],x['fullRender']) for x in seq],flush=True)
    print('CHECK', 'PASS' if not checks else 'FAIL', 'files=',args.files,'issues=',len(checks),flush=True)
    for msg in checks[:30]:print(' ',msg,flush=True)
    raise SystemExit(bool(checks))

if __name__=='__main__':main()
