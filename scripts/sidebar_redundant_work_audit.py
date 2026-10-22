"""Count unnecessary desktop navigation scans/layout reads; retain structural work."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_REDUNDANT_OUT','/workspace/sidebar-redundant-audit/current'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
setup=(ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0]
if os.environ.get('GLS_REDUNDANT_SUBJECT'):
    setup=setup.replace("(ROOT/'tests/generated/subject.cjs')",'Path('+repr(os.environ['GLS_REDUNDANT_SUBJECT'])+')')
exec(setup,scope)
results=[]
def check(name,passed,evidence=None):
    results.append(dict(name=name,passed=bool(passed),evidence=evidence));print(('PASS ' if passed else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for dark in [False,True]:
        ctx,p=scope['boot'](browser,dark=dark,large=True)
        label='dark ' if dark else 'light '
        p.evaluate('''async()=>{
          window.N=C.navigator;N.collapsed.delete('properties');N.renderRevision=-1;N.sync();await waitFixture(50);
          window.measures={};window.projecting=false;
          const project=N._renderProjection;N._renderProjection=function(...a){projecting=true;try{return project.apply(this,a)}finally{projecting=false}};
          for(const name of ['getBoundingClientRect','getClientRects']){const orig=Element.prototype[name];Element.prototype[name]=function(...a){if(projecting&&N.scroll.contains(this))measures[name]=(measures[name]||0)+1;return orig.apply(this,a)}}
          const nav=C._navigationCandidates;C._navigationCandidates=function(...a){measures.navigation=(measures.navigation||0)+1;return nav.apply(this,a)};
          const cache=N._cached;N._cached=function(k,build){return cache.call(this,k,()=>{if(['tag-counts','property-presence'].includes(k))measures[k]=(measures[k]||0)+1;return build()})};
          const search=C.performSearch;C.performSearch=function(...a){measures.search=(measures.search||0)+1;return search.apply(this,a)};
          window.firstVisible=()=>{const top=N.scroll.getBoundingClientRect().top;return [...N.scroll.querySelectorAll('[data-nav-id]')].map(r=>({key:r.dataset.navId,offset:r.getBoundingClientRect().top-top,height:r.getBoundingClientRect().height})).find(r=>r.height&&r.offset>=0)};
          N.scroll.scrollTop=450;await waitFixture(50);window.startTop=N.scroll.scrollTop;window.anchor=firstVisible();measures={};
          N.select('folder','Folder001');await waitFixture(50);
        }''')
        first=p.evaluate('({measures,top:N.scroll.scrollTop,startTop,anchor,after:firstVisible(),count:C.fullResults.length})')
        check(label+'scrolled folder change skips per-row geometry',not first['measures'].get('getBoundingClientRect') and not first['measures'].get('getClientRects'),first)
        check(label+'scrolled folder change retains viewport and anchor',first['startTop']>0 and abs(first['top']-first['startTop'])<2 and first['anchor']['key']==first['after']['key'] and abs(first['anchor']['offset']-first['after']['offset'])<2,first)
        check(label+'folder change performs one search and one scope scan',first['measures'].get('search')==1 and first['measures'].get('navigation')==1 and first['count']==12,first)
        p.evaluate('''async()=>{measures={};for(let i=0;i<6;i++){N.select('tag','tag1');await waitFixture(30)}}''')
        tags=p.evaluate('({measures,count:C.fullResults.length,selected:[...C.filterState.tags],top:N.scroll.scrollTop})')
        check(label+'tag toggles reuse unchanged folder candidates and counts',not any(tags['measures'].get(k) for k in ['navigation','tag-counts','property-presence']),tags)
        check(label+'tag toggles skip per-row geometry',not any(tags['measures'].get(k) for k in ['getBoundingClientRect','getClientRects']),tags)
        check(label+'tag toggles still apply and clear the result filter',tags['selected']==[] and tags['count']==12 and tags['measures'].get('search')==6,tags)
        p.evaluate('''async()=>{measures={};for(const query of ['note','title','']){C.performSearch(query);await waitFixture(30)}}''')
        query=p.evaluate('({measures,count:C.fullResults.length})')
        check(label+'query changes reuse unchanged navigation scope',not any(query['measures'].get(k) for k in ['navigation','tag-counts','property-presence']) and query['count']==12,query)
        check(label+'query-only projection skips per-row geometry',not any(query['measures'].get(k) for k in ['getBoundingClientRect','getClientRects']),query)
        # A structural change still needs the old anchor path.
        p.evaluate('''async()=>{window.beforeBranch=firstVisible();measures={};N.sections.get('folder').content.querySelector('[data-picker-key="Folder000"] > .local-search-move-tree-toggle').click();await waitFixture(40)}''')
        branch=p.evaluate('({measures,before:beforeBranch,after:firstVisible(),expanded:N.expanded.has("folder:Folder000")})')
        check(label+'branch expansion retains necessary anchor restoration',branch['expanded'] and branch['measures'].get('getBoundingClientRect',0)>0 and branch['before']['key']==branch['after']['key'] and abs(branch['before']['offset']-branch['after']['offset'])<2,branch)
        check(label+'disclosure does not search or rescan unchanged scope',not branch['measures'].get('search') and not branch['measures'].get('navigation'),branch)
        p.evaluate('''async()=>{const f=H.store.get('Folder001/Child/note1.md');await H.app.fileManager.processFrontMatter(f,m=>{m.tags=['changed'];m.added='yes'});P._queueFileIndex(f);await P._flushIndexQueueNow();C.performSearch('');await waitFixture(60)}''')
        check(label+'index edits invalidate cached scope and property counts',p.evaluate("[...N.sections.get('properties').content.querySelectorAll('.local-search-nav-row')].some(r=>r.dataset.pickerKey==='added'&&r.querySelector('.local-search-move-current-badge')?.textContent==='1')"))
        p.evaluate('''async()=>{P.settings.excludedFolders=['Folder001'];N.refreshPreferences();C.performSearch('');await waitFixture(50)}''')
        check(label+'global exclusions invalidate navigation counts',p.evaluate("N.sections.get('tags').summary.firstChild.nodeValue==='0'"))
        p.evaluate('V.onClose()');ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
raise SystemExit(0 if all(r['passed'] for r in results) else 1)
