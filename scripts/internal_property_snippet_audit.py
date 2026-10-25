"""Static snippet ownership before plugin load; controlled native-note DOM."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_INTERNAL_SNIPPET_OUT','/workspace/internal-property-snippet/after'));OUT.mkdir(parents=True,exist_ok=True)
fields=['gls_created_at','gls_created_source','gls_body_modified_at','gls_body_fingerprint','gls_file_modified_at','gls_file_fingerprint']
css=(ROOT/'src/styles/styles.css').read_text();snippet=ROOT/'snippets/GLS-Hide-Internal-Properties.css'
snippet_css=snippet.read_text() if snippet.exists() else ''
rows=[]
def check(name,passed,evidence=None):
 rows.append(dict(name=name,passed=bool(passed),evidence=evidence));print(('PASS ' if passed else 'FAIL ')+name,flush=True)
check('standalone snippet exists with no Style Settings or JS dependency',bool(snippet_css) and '@settings' not in snippet_css and 'ls-show-internal-time-properties' not in snippet_css)
check('plugin CSS retires rule and setting together','ls-show-internal-time-properties' not in css and not any('data-property-key="'+f+'"' in css for f in fields))
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mobile in [False,True]:
  for dark in [False,True]:
   ctx=browser.new_context(viewport={'width':390 if mobile else 1200,'height':900},is_mobile=mobile,has_touch=mobile);p=ctx.new_page()
   label=('mobile' if mobile else 'desktop')+('-dark' if dark else '-light')
   props=''.join('<div class="metadata-property" data-property-key="'+f+'">'+f+'</div>' for f in fields+['status','tags','created','gls_custom'])
   note='<div class="workspace-leaf-content" data-type="markdown"><div class="metadata-container">'+props+'</div><pre class="cm-content">gls_created_at: 2026-10-25</pre></div>'
   p.set_content('<body class="'+('is-mobile ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'">'+note+'<aside class="workspace-leaf-content" data-type="all-properties"><div class="metadata-container">'+props+'</div></aside><div class="local-search-results">'+props+'</div></body>')
   p.add_style_tag(content='.metadata-property {display:flex;}')
   p.add_style_tag(content=snippet_css or '/* no snippet installed */').evaluate('(el)=>el.id="snippet"')
   p.evaluate('(fields)=>window.fields=fields',fields)
   query='''()=>Object.fromEntries([...document.querySelectorAll('[data-type="markdown"] .metadata-property')].map(e=>[e.dataset.propertyKey,getComputedStyle(e).display]))'''
   state=p.evaluate(query)
   check(label+' hides six internal fields before plugin loads',all(state[f]=='none' for f in fields),state)
   check(label+' ordinary note properties stay visible',all(state[f]!='none' for f in ['status','tags','created','gls_custom']))
   check(label+' source text, property sidebar and result cards stay visible',p.evaluate('''()=>getComputedStyle(document.querySelector('.cm-content')).display!=='none'&&document.querySelector('.cm-content').textContent.includes('gls_created_at')&&[...document.querySelectorAll('aside .metadata-property,.local-search-results .metadata-property')].every(e=>getComputedStyle(e).display!=='none')'''))
   p.add_style_tag(content=css).evaluate('(el)=>el.id="plugin"');state=p.evaluate(query)
   check(label+' plugin load cannot change snippet result',all(state[f]=='none' for f in fields))
   p.evaluate('document.body.classList.add("ls-show-internal-time-properties")');state=p.evaluate(query)
   check(label+' legacy setting class cannot reintroduce startup dependency',all(state[f]=='none' for f in fields))
   p.evaluate('document.getElementById("plugin").remove();document.body.classList.remove("ls-show-internal-time-properties")');state=p.evaluate(query)
   check(label+' plugin unload keeps note fields hidden',all(state[f]=='none' for f in fields))
   p.evaluate('''()=>{const node=document.querySelector('[data-type="markdown"]').cloneNode(true);node.id='new-note';document.body.append(node)}''')
   check(label+' new note fields hide immediately without observers',p.evaluate('fields.every(f=>getComputedStyle(document.querySelector(`#new-note [data-property-key="${f}"]`)).display==="none")'))
   p.add_style_tag(content=css).evaluate('(el)=>el.id="plugin"');p.evaluate('document.getElementById("snippet").remove()');state=p.evaluate(query)
   check(label+' disabling snippet reveals fields even with plugin loaded',all(state[f]!='none' for f in fields),state)
   ctx.close()
 browser.close()
(OUT/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
if not os.environ.get('GLS_INTERNAL_SNIPPET_RECORD_ONLY'):assert all(r['passed'] for r in rows)
