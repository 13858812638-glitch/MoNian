#!/usr/bin/env python3
"""Compute navigation separator geometry / theme / manual line variants in Chromium."""
import json
import pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[1]
css=(root/'dist/styles.css').read_text()
fixture=f'''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}</style></head>
<body class="theme-light"><div class="local-search-navigator" data-nav-layout="mobile" style="width:360px; height:650px; --ls-nav-content-inset-left:16px; --ls-nav-content-inset-right:12px; --ls-nav-background-extend-left:6px; --ls-nav-background-extend-right:0px;">
<div class="local-search-nav-scroll" style="width:100%; height:500px;">
<section class="local-search-nav-section" id="section0"><div style="height:60px">文件夹</div></section>
<section class="local-search-nav-section" id="section1"><div style="height:60px">标签</div></section>
<div class="local-search-move-tree-row local-search-nav-separator" id="separator" data-nav-separator-style="solid" style="--ls-nav-separator-style:solid; --ls-nav-separator-space:12px;"><div class="local-search-move-tree-folder">&nbsp;</div></div>
<section class="local-search-nav-section" id="section2"><div style="height:60px">属性</div></section>
</div></div></body></html>'''
def close(a,b,tol=0.6):return abs(a-b)<tol
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 count=0
 results=[]
 for theme in ['theme-light','theme-dark']:
  for width,height in [(390,844),(1024,768)]:
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=2)
   page.set_content(fixture)
   page.evaluate('(cls)=>document.body.className=cls',theme)
   data=page.evaluate('''() => {
     const nav=document.querySelector('.local-search-navigator');const scroll=document.querySelector('.local-search-nav-scroll');
     const auto=document.querySelector('#section1'),row=document.querySelector('#separator');
     const sc=getComputedStyle(scroll),a=getComputedStyle(auto,'::before'),r=getComputedStyle(row,'::before');
     const ar=auto.getBoundingClientRect(), rr=row.getBoundingClientRect(), sr=scroll.getBoundingClientRect();
     return {auto:{background:a.backgroundImage,opacity:a.opacity,height:a.height,left:a.left,right:a.right,border:a.borderTopStyle,content:a.content},
       manual:{background:r.backgroundImage,opacity:r.opacity,height:r.height,left:r.left,right:r.right,top:r.top,content:r.content},
       boxes:{sectionWidth:ar.width,manualWidth:rr.width,scrollWidth:sr.width, scrollLeft:sr.left, sectionLeft:ar.left,manualLeft:rr.left}};
    }''')
   assert data['auto']['background'].startswith('linear-gradient('),data
   assert data['manual']['background'].startswith('linear-gradient('),data
   assert '15%' in data['auto']['background'] and '85%' in data['auto']['background'],data
   assert '15%' in data['manual']['background'] and '85%' in data['manual']['background'],data
   assert data['auto']['border']=='none',data
   assert data['auto']['opacity']=='0.3' and data['manual']['opacity']=='0.3',data
   assert data['auto']['height']=='1px' and data['manual']['height']=='1px',data
   assert data['manual']['top'] != 'auto',data
   for style in ['dashed','dotted']:
    page.eval_on_selector('#separator', '''(row,style)=>{row.dataset.navSeparatorStyle=style;row.style.setProperty('--ls-nav-separator-style',style)}''',style)
    alt=page.evaluate('''() => {const r=getComputedStyle(document.querySelector('#separator'),'::before');return {background:r.backgroundImage,border:r.borderTopStyle,mask:r.webkitMaskImage || r.maskImage}}''')
    assert alt['border']==style,alt
    assert 'linear-gradient' in alt['mask'],alt
    count+=1
   page.eval_on_selector('#separator','''row=>{row.dataset.navSeparatorStyle='solid';row.style.setProperty('--ls-nav-separator-style','solid')}''')
   page.eval_on_selector('#separator','''(row,theme)=>{const color=theme==='theme-light'?'#d12a8f':'#6fddb4';row.classList.add('has-nav-separator-color-'+(theme==='theme-light'?'light':'dark'));row.style.setProperty('--ls-nav-separator-color-'+(theme==='theme-light'?'light':'dark'),color)}''',theme)
   painted=page.evaluate('''() => getComputedStyle(document.querySelector('#separator'),'::before').backgroundImage''')
   assert '209, 42, 143' in painted or '111, 221, 180' in painted,painted
   page.eval_on_selector('.local-search-nav-scroll',"el=>el.classList.add('is-sort-mode')")
   hidden=page.evaluate('''() => getComputedStyle(document.querySelector('#separator'),'::before').content''')
   assert hidden in ('none','normal'),hidden
   count+=7
   results.append({'theme':theme,'size':f'{width}x{height}','css':data})
   page.close()
 browser.close()
(root/'reports/notebook-separator-audit.json').write_text(json.dumps({'status':'PASS','checks':count,'variants':results},ensure_ascii=False,indent=2))
print(json.dumps({'status':'PASS','checks':count,'variants':len(results)},ensure_ascii=False))
