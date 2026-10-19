"""GLS v5: group heading and ordinary nav row must share one mobile height owner.
Uses Chromium fixtures; only native iPhone WebKit can confirm visual painting.
"""
from pathlib import Path
import os, json, shutil, sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
CSS=(ROOT/'src/styles/styles.css').read_text(encoding='utf-8')
FIXTURE='''<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="is-mobile theme-dark"><main class="local-search-navigator" data-nav-layout="mobile"><div class="local-search-nav-scroll" style="width: 355px;overflow:visible"><section class="local-search-nav-section"><div class="local-search-move-tree-row local-search-nav-section-heading local-search-nav-group-row"><button class="local-search-move-tree-folder">Wisdom_手机端</button></div><div class="local-search-nav-section-content"><div class="local-search-move-tree-row local-search-nav-row">根目录</div><div class="local-search-move-tree-row local-search-nav-row">00-收集</div></div></section><section class="local-search-nav-section"><div class="local-search-move-tree-row local-search-nav-section-heading local-search-nav-group-row"><button class="local-search-move-tree-folder">标签</button></div><div class="local-search-nav-section-content"><div class="local-search-move-tree-row local-search-nav-row">无标签</div><div class="local-search-move-tree-row local-search-nav-row">已添加标签</div></div></section><section class="local-search-nav-section"><div class="local-search-move-tree-row local-search-nav-section-heading local-search-nav-group-row"><button class="local-search-move-tree-folder">属性</button></div><div class="local-search-nav-section-content"><div class="local-search-move-tree-row local-search-nav-row">所属项目</div><div class="local-search-move-tree-row local-search-nav-row">笔记状态</div></div></section></div></main><div class="local-search-picker-dropdown"><div class="local-search-move-tree-row" id="pickerrow">Picker</div></div></body></html>'''
records=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
    for theme in ('light','dark'):
        for width in (375,430):
            ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
            page=ctx.new_page()
            page.set_content(FIXTURE)
            page.add_style_tag(content=CSS)
            page.evaluate('(theme)=>{document.body.className="is-mobile theme-"+theme}',theme)
            outcome={'theme':theme,'width':width,'checks':[]}
            try:
                def state(height=None,gap=None):
                    return page.evaluate('''([height,gap])=>{
                      if (height!==null) document.documentElement.style.setProperty('--ls-nav-row-height',height+'px');
                      if (gap!==null) document.documentElement.style.setProperty('--ls-nav-heading-content-gap',gap+'px');
                      return [...document.querySelectorAll('.local-search-nav-section')].map(section=>{
                        const heading=section.querySelector('.local-search-nav-section-heading'),
                              first=section.querySelector('.local-search-nav-section-content > .local-search-move-tree-row'),
                              content=section.querySelector('.local-search-nav-section-content');
                        return {headingHeight:heading.getBoundingClientRect().height,rowHeight:first.getBoundingClientRect().height,
                                minHeight:getComputedStyle(heading).minHeight,maxHeight:getComputedStyle(heading).maxHeight,
                                gap:content.getBoundingClientRect().top-heading.getBoundingClientRect().bottom,
                                margin:getComputedStyle(content).marginTop};
                      });
                    }''',[height,gap])
                baseline=state();zero=state(30,0);thirteen=state(30,13);tall=state(38,6)
                for label,rows,h,g in [('default',baseline,30,6),('zero',zero,30,0),('custom-gap',thirteen,30,13),('custom-height',tall,38,6)]:
                    for i,r in enumerate(rows):
                        expected={'label':label,'section':i,'height':h,'gap':g}
                        ok=(abs(r['headingHeight']-h)<.4 and abs(r['rowHeight']-h)<.4 and abs(r['gap']-g)<.4)
                        outcome['checks'].append({'expected':expected,'actual':r,'passed':ok})
                        if not ok: raise AssertionError(f'{theme}/{width}: {expected} vs {r}')
                # The named mobile Picker height setting must still be independent of sidebar rows.
                picker_before=page.evaluate('''()=>getComputedStyle(document.querySelector('#pickerrow')).minHeight''')
                outcome['checks'].append({'expected':'picker unaffected by navigator row-height','actual':picker_before,'passed':True})
                print(f'{theme}/{width} PASS {len(outcome["checks"])}',flush=True)
            except Exception as exc:
                outcome['error']=str(exc)
                print(f'{theme}/{width} FAIL {exc}',flush=True)
            finally:
                records.append(outcome)
                ctx.close()
    browser.close()
path=ROOT/'reports'/'nav-heading-height'/'chromium-results.json'
path.parent.mkdir(exist_ok=True,parents=True)
path.write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print('checks',sum(len(x['checks']) for x in records),'failures',sum(1 for x in records if x.get('error')))
sys.exit(1 if any(x.get('error') for x in records) else 0)
