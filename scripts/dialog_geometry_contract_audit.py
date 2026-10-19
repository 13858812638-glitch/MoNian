"""Real Chromium computed-style checks for GLS shared viewport Dialog placement.
Only tests Shared Dialog surfaces, not full-screen Facet Picker positions.
"""
import os, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

css_path = Path(os.environ.get('GLS_CSS_PATH', 'src/styles/styles.css')).resolve()
assert css_path.is_file(), css_path
out_path = Path(os.environ.get('GLS_DIALOG_GEOMETRY_RESULTS', 'reports/dialog44-geometry.json'))
failures=[]
results=[]

def near(x,y,tol=2): return abs(x-y)<=tol

def run(page, mode, height, width=390, color=False, large=False, value=44, safe=(47,34), owner='portal'):
    cls='theme-dark'+(' is-mobile' if mode!='desktop' else '')+(' is-ios' if mode=='ios' else '')
    typ=' local-search-folder-color-editor-picker local-search-picker-dropdown' if color else ''
    text='<p style="height:1150px;flex-shrink:0">Long dialog body</p>' if large else '<p>Do you want to delete this file?</p>'
    inner=(f'<div id="dialog" class="local-search-confirm-dialog local-search-dialog-surface local-search-picker-dialog{typ}" role="dialog">'
           f'<div class="local-search-dialog-content"><h3>删除文件</h3>{text}'
           '<input id="input" class="local-search-dialog-input" value="rename"/></div>'
           '<div class="local-search-picker-actions"><button>取消</button><button>删除</button></div></div>')
    backdrop='<div id="backdrop" class="local-search-dialog-backdrop local-search-picker-dialog-backdrop"></div>'
    content=backdrop+inner
    if owner=='overlay': content=f'<div id="overlay" class="local-search-overlay-host"><div class="local-search-command-shared-confirm-host">{content}</div></div>'
    else: content=f'<div class="ui-popup-portal local-search-content">{content}</div>'
    html=(f'<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>'
          f'<body class="{cls}" style="--ui-mobile-safe-top:{safe[0] if mode!="desktop" else 0}px;--ui-mobile-safe-bottom:{safe[1] if mode!="desktop" else 0}px;'
          f'--ls-dialog-position-y:{value};--ls-compact-create-width:292px;--ls-dropdown-pad:12px;--ls-dialog-content-inset:14px;--ls-modal-radius:12px;'
          f'--ls-modal-viewport-gap:24px;--ls-form-control-height:34px;--ls-window-shadow-color:transparent">{content}</body></html>')
    page.set_viewport_size({'width':width,'height':height})
    page.set_content(html)
    page.add_style_tag(path=str(css_path))
    d=page.locator('#dialog')
    style=d.evaluate('(e)=>{const s=getComputedStyle(e); return {top:s.top,width:s.width,maxHeight:s.maxHeight,position:s.position,transform:s.transform,zIndex:s.zIndex,display:s.display}}')
    b=page.locator('#backdrop').bounding_box()
    rect=d.bounding_box()
    center=rect['y']+rect['height']/2
    target=height*value/100
    allow=12
    top_area=safe[0] if mode!='desktop' else 0
    bottom_area=safe[1] if mode!='desktop' else 0
    within=rect['y'] >= top_area+allow-1 and rect['y']+rect['height'] <= height-bottom_area-allow+1
    overlay=page.locator('.ui-popup-portal').evaluate('(e)=>getComputedStyle(e).display') if owner=='portal' else '-'
    cases={
        'center_at_token': near(center,target,3),
        'viewport_fixed_dialog':style['position']=='fixed',
        'backdrop_is_viewport_fixed':near(b['x'],0,2) and near(b['y'],0,2) and near(b['width'],width,2) and near(b['height'],height,2),
        'safe_area_respected':within,
        'color_compact_width':(rect['width']<=294 if color else True),
        'ios_portal_e_preserved':(overlay=='contents' if mode=='ios' and owner=='portal' else True)
    }
    res={'scenario':f'{mode}-{owner}-h{height}-w{width}'+('-color' if color else '')+('-long' if large else '')+f'-pos{value}',
         'checks':cases,'rect':rect,'backdrop':b,'center':center,'target':target,'style':style,'portalDisplay':overlay}
    results.append(res)
    for k,passed in cases.items():
        if not passed: failures.append(f'{res["scenario"]}: {k} | dialog={rect}, backdrop={b}, style={style}')
    return res

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('GLS_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
    for mode,height,width,color,large,value,safe,owner in [
        ('ios',844,390,False,False,44,(47,34),'portal'),
        ('ios',615,390,False,True,44,(47,34),'portal'),
        ('ios',568,320,True,True,44,(47,34),'portal'),
        ('ios',844,390,True,False,44,(47,34),'portal'),
        ('ios',844,390,False,False,55,(47,34),'portal'),
        ('android',844,390,False,False,44,(24,24),'portal'),
        ('android',615,390,False,True,44,(24,24),'portal'),
        ('android',844,390,True,False,44,(24,24),'portal'),
        ('desktop',768,1024,False,False,44,(0,0),'portal'),
        ('desktop',768,1024,True,False,44,(0,0),'portal'),
        ('ios',844,390,False,False,44,(47,34),'overlay'),
        ('ios',615,390,False,True,44,(47,34),'overlay'),
    ]:
        run(page,mode,height,width,color,large,value,safe,owner)
    browser.close()
out_path.parent.mkdir(parents=True,exist_ok=True)
out_path.write_text(json.dumps({'checks':len(results)*6,'passed':len(results)*6-len(failures),'failed':len(failures),'failures':failures,'results':results},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Computed-style regression {len(results)*6-len(failures)}/{len(results)*6} checks', flush=True)
for f in failures: print('FAIL:',f, flush=True)
sys.exit(1 if failures else 0)
