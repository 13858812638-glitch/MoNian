"""A/B: approved v5.2 module-unification-v1 vs v2. Real button actions in Chromium host fixture.
Uses the v1 untouched modular worktree as historical oracle. Not an iOS/Obsidian native test.
"""
from pathlib import Path
import json,sys,os,shutil
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
prior=Path(os.environ.get('GLS_V1_SUBJECT',str(root/'tests/reference/module-unification-v1-subject.cjs')))
out=root/'reports/module-consolidation-v2'
out.mkdir(parents=True, exist_ok=True)
records=[]
script='''async ({kind}) => {
 const pick={tag:()=>C.facets.openTagPicker(),property:()=>C.facets.openPropertyPicker(),folder:()=>C.facets.showFolderDropdown()};
 pick[kind](); await waitFixture(70);
 const panel=C.dropdown.panel;
 const buttons=()=>[...panel.querySelectorAll('button')].filter(b=>b.getAttribute('aria-pressed')!==null);
 const labelOf=b=>b.getAttribute('aria-label')||b.title||b.ownerDocument.getElementById(b.getAttribute('aria-labelledby'))?.textContent||'';
 const role=(text)=>buttons().find(b=>labelOf(b).includes(text));
 const kindName={tag:'标签',property:'属性',folder:'文件夹'}[kind];
 const maintenance=kind==='property'?'重命名属性键和值':'重命名'+kindName;
 const trace=[];
 const snap=(phase)=>{
   const list=panel.querySelector('.local-search-folder-tree, .local-search-property-tree, .local-search-tag-tree');
   const a=role(maintenance),b=role(kindName+'拖拽模式'),c=role(kindName+'多选');
   if(!a||!b||!c)throw Error('missing header actions '+kind+' '+phase);
   trace.push({phase,maintenance:a.getAttribute('aria-pressed'),sort:b.getAttribute('aria-pressed'),multi:c.getAttribute('aria-pressed'),
     sortRows:!!list?.classList.contains('is-sort-mode'),persistent:panel.classList.contains('is-persistent-toggle'),
     selectionCount:panel.querySelectorAll('.is-selected').length,treeRows:panel.querySelectorAll('[data-picker-key]').length,
     search:panel.querySelector('input.local-search-picker-search')?.value||'',attached:panel.isConnected});
 };
 const click=(text)=>{const el=role(text);if(!el)throw Error('missing '+text);el.click()};
 snap('initial');
 const steps=[['maintenance',maintenance],['sort',kindName+'拖拽模式'],['multi',kindName+'多选'],
 ['maintenance-again',maintenance],['exit-maintenance',maintenance],['multi-again',kindName+'多选'],
 ['sort-again',kindName+'拖拽模式'],['exit-sort',kindName+'拖拽模式']];
 for(const [phase,label] of steps){click(label);await waitFixture(60);snap(phase)}
 C.dropdown.close(false);await waitFixture(50);
 return {trace,closed:!panel.isConnected};
}'''
with sync_playwright() as p:
 exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
 browser=p.chromium.launch(headless=True,executable_path=exe,args=['--no-sandbox'])
 for mobile in (False,True):
  for dark in (False,True):
   config=('mobile' if mobile else 'desktop')+'-'+('dark' if dark else 'light')
   captures={}
   for variant in ('v1','v2'):
    ctx=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,locale='zh-CN')
    page=ctx.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    try:
     page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'"><div id="host"></div></body></html>')
     for f in ['tests/browser-fixture.css','src/styles/styles.css']:page.add_style_tag(content=(root/f).read_text())
     for f in ['tests/host.js','tests/browser-scenarios.js']:page.add_script_tag(content=(root/f).read_text())
     page.evaluate('m=>bootFixture(m)',mobile)
     page.add_script_tag(content=(prior if variant=='v1' else root/'tests/generated/subject.cjs').read_text())
     page.evaluate('()=>startFixture()')
     captures[variant]={}
     for kind in ['folder','tag','property']:
      page.evaluate('()=>{C.dropdown.close(false)}')
      captures[variant][kind]=page.evaluate(script,{'kind':kind})
     if errors:raise RuntimeError('page errors '+repr(errors))
    except Exception as e:
     captures[variant]={'error':str(e)}
    finally:ctx.close()
   ok=captures.get('v1')==captures.get('v2') and 'error' not in captures.get('v2',{})
   record={'configuration':config,'pass':ok,'original':captures.get('v1'),'candidate':captures.get('v2')}
   records.append(record)
   print(config,'PASS' if ok else 'FAIL', 'scenarios',len(captures.get('v2',{})),flush=True)
 browser.close()
(out/'picker-mode-AB.json').write_text(json.dumps({'results':records,'pass':sum(x['pass'] for x in records),'total':len(records)},ensure_ascii=False,indent=2))
print('TOTAL',sum(x['pass'] for x in records),'/',len(records))
sys.exit(0 if all(x['pass'] for x in records) else 1)
