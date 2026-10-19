"""Mobile heading/content gap browser contract.  Isolated layout fixture: not native iOS/Obsidian."""
from pathlib import Path
import json, os, shutil, sys
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
css=(root/'src/styles/styles.css').read_text(encoding='utf-8')
records=[]
fixture='''<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body><div id="navigator" class="local-search-navigator" data-nav-layout="mobile">
<div class="local-search-nav-scroll" style="display:block; overflow:visible; width:355px;">
<section class="local-search-nav-section" data-nav-section="folder"><div class="local-search-move-tree-row local-search-nav-section-heading local-search-nav-group-row"><button class="local-search-move-tree-folder">Wisdom_手机端</button></div><div class="local-search-nav-section-content"><div class="local-search-move-tree-row local-search-nav-row">根目录</div><div class="local-search-move-tree-row local-search-nav-row">00-收集</div></div></section>
<section class="local-search-nav-section" data-nav-section="tags"><div class="local-search-move-tree-row local-search-nav-section-heading local-search-nav-group-row"><button class="local-search-move-tree-folder">标签</button></div><div class="local-search-nav-section-content"><div class="local-search-move-tree-row local-search-nav-row">无标签</div><div class="local-search-move-tree-row local-search-nav-row">Obsidian插件开发</div></div></section>
<section class="local-search-nav-section" data-nav-section="properties"><div class="local-search-move-tree-row local-search-nav-section-heading local-search-nav-group-row"><button class="local-search-move-tree-folder">属性</button></div><div class="local-search-nav-section-content"><div class="local-search-move-tree-row local-search-nav-row">所属项目</div><div class="local-search-move-tree-row local-search-nav-row">笔记状态</div></div></section>
</div></div>
<div class="local-search-picker-dropdown"><div class="local-search-nav-section-heading"></div><div class="local-search-nav-section-content" id="pickercontent">Picker</div></div>
</body></html>'''
with sync_playwright() as pw:
    exe=os.getenv('CHROMIUM_PATH') or shutil.which('chromium')
    browser=pw.chromium.launch(headless=True, executable_path=exe if exe else None, args=['--no-sandbox'])
    for mode in ['mobile','desktop']:
      for theme in ['light','dark']:
        for width in ([375,430] if mode=='mobile' else [1200]):
          label=f'{mode}/{theme}/{width}'
          ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=mode=='mobile',has_touch=mode=='mobile')
          page=ctx.new_page()
          try:
            page.set_content(fixture)
            page.add_style_tag(content=css)
            page.evaluate('''args=>{document.body.className=args[1];document.getElementById('navigator').dataset.navLayout=args[0]}''',[mode,'theme-'+theme+(' is-mobile' if mode=='mobile' else '')])
            result=page.evaluate('''()=>{
              const nav=document.getElementById('navigator');
              const items=[...document.querySelectorAll('.local-search-nav-section')].map(s=>({
                  content:s.querySelector('.local-search-nav-section-content'),
                  heading:s.querySelector('.local-search-nav-section-heading'),
                  rows:[...s.querySelectorAll('.local-search-nav-row')]
              }));
              const snapshot=()=>items.map(x=>({
                  top:Number(x.content.getBoundingClientRect().top-x.heading.getBoundingClientRect().bottom),
                  margin:getComputedStyle(x.content).marginTop,
                  rowHeights:x.rows.map(row=>row.getBoundingClientRect().height),
                  firstRowName:x.rows[0].textContent
              }));
              const initial=snapshot();
              document.documentElement.style.setProperty('--ls-nav-heading-content-gap','0px');
              const zero=snapshot();
              document.documentElement.style.setProperty('--ls-nav-heading-content-gap','13px');
              const thirteen=snapshot();
              const hidden=items[0].content;
              hidden.hidden=true;
              const collapsed={display:getComputedStyle(hidden).display,margin:getComputedStyle(hidden).marginTop};
              hidden.hidden=false;
              const pickerMargin=getComputedStyle(document.querySelector('#pickercontent')).marginTop;
              return {layout:nav.dataset.navLayout,initial,zero,thirteen,collapsed,pickerMargin};
            }''')
            checks=[]
            def check(ok,msg):
              checks.append({'test':msg,'pass':bool(ok)})
              if not ok:raise AssertionError(label+' '+msg+' '+repr(result))
            for idx,part in enumerate(result['initial']):
              check(part['margin']==('6px' if mode=='mobile' else '0px'),f'section_{idx}_6px_mobile_only')
              check(result['zero'][idx]['margin']=='0px',f'section_{idx}_zero_is_valid')
              check(result['thirteen'][idx]['margin']==('13px' if mode=='mobile' else '0px'),f'section_{idx}_custom_margin')
              check(abs(result['thirteen'][idx]['top']-result['zero'][idx]['top']-(13 if mode=='mobile' else 0))<0.4,f'section_{idx}_visual_delta')
              check(part['rowHeights']==result['zero'][idx]['rowHeights']==result['thirteen'][idx]['rowHeights'],f'section_{idx}_row_heights_unchanged')
            check(result['collapsed']['display']=='none', 'collapsed_content_hidden')
            check(result['collapsed']['margin']=='0px','collapsed_no_margin')
            check(result['pickerMargin']=='0px','picker_not_affected')
            records.append({'configuration':label,'passed':len(checks),'checks':checks,'computed':result})
            print(label,'PASS',len(checks),flush=True)
          except Exception as e:
            records.append({'configuration':label,'error':str(e)})
            print(label,'FAIL',str(e)[:550],flush=True)
          finally:ctx.close()
    browser.close()
out=root/'reports'/'current'/'nav-heading-gap'
out.mkdir(parents=True,exist_ok=True)
(out/'chromium-results.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print('total',sum(x.get('passed',0) for x in records),'failed',sum(bool(x.get('error')) for x in records))
sys.exit(1 if any(x.get('error') for x in records) else 0)
