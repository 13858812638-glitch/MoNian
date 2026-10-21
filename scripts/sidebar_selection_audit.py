"""Read/write ordering for desktop folder selection in a real mock SearchView."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('GLS_SELECTION_AUDIT_OUT', '/workspace/sidebar-tree-audit/selection'))
OUT.mkdir(parents=True, exist_ok=True)
scope = {'__file__': str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0], scope)
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    ctx, p = scope['boot'](browser, large=True)
    p.evaluate('''()=>{
      window.projectionReads=0;window.projecting=false;
      const n=C.navigator,project=n._renderProjection,scroll=Object.getOwnPropertyDescriptor(Element.prototype,'scrollTop');
      Object.defineProperty(n.scroll,'scrollTop',{configurable:true,
        get(){if(projecting)projectionReads++;return scroll.get.call(this)},
        set(value){scroll.set.call(this,value)}});
      n._renderProjection=function(...args){projecting=true;try{return project.apply(this,args)}finally{projecting=false}};
    }''')
    p.locator('[data-nav-section="folder"] [data-picker-key="Folder000"] > .local-search-move-tree-folder').click()
    p.wait_for_timeout(60)
    evidence = p.evaluate('''()=>({projectionReads,top:C.navigator.scroll.scrollTop,
      selected:[...C.filterState.folders],count:C.fullResults.length})''')
    evidence['checks'] = {
        'origin selection avoids scroll layout read after result writes': evidence['projectionReads'] == 0,
        'origin selection keeps scope and scroll': evidence['selected'] == ['Folder000'] and evidence['count'] == 12 and evidence['top'] == 0
    }
    scrolled = p.evaluate('''async()=>{
      const n=C.navigator;n.scroll.scrollTop=450;await waitFixture(40);
      const before=n.scroll.scrollTop;n.select('folder','Folder001');await waitFixture(50);
      return {before,after:n.scroll.scrollTop,selected:[...C.filterState.folders]};
    }''')
    evidence['scrolled'] = scrolled
    evidence['checks']['scrolled selection retains position'] = scrolled['before'] > 0 and abs(scrolled['before']-scrolled['after']) < 2 and scrolled['selected'] == ['Folder001']
    later = p.evaluate('''async()=>{
      const n=C.navigator;n.scroll.scrollTop=0;n.select('folder','Folder002');await waitFixture(40);
      n.scroll.scrollTop=650;await waitFixture(40);const before=n.scroll.scrollTop;
      n.renderRevision=-1;n._renderProjection();return {before,after:n.scroll.scrollTop};
    }''')
    evidence['checks']['origin snapshot cannot leak into later refresh'] = later['before'] > 0 and abs(later['before']-later['after']) < 2
    restored = p.evaluate('''async()=>{
      const n=C.navigator;n.scroll.scrollTop=0;n.select('folder','Folder003');
      n._restoreScrollTop=280;await waitFixture(50);return n.scroll.scrollTop;
    }''')
    evidence['checks']['explicit session scroll restoration takes priority'] = abs(restored-280) < 2
    guarded = p.evaluate('''async()=>{
      const n=C.navigator;n.scroll.scrollTop=0;n.customization.coordinator._committing=true;
      n.select('folder','Folder004');await waitFixture(40);
      n.scroll.scrollTop=350;await waitFixture(40);const before=n.scroll.scrollTop;
      n.customization.coordinator._committing=false;n.renderRevision=-1;n._renderProjection();
      return {before,after:n.scroll.scrollTop};
    }''')
    evidence['checks']['guarded projection expires unused snapshot'] = guarded['before'] > 0 and abs(guarded['before']-guarded['after']) < 2
    p.evaluate('V.onClose()');ctx.close();browser.close()
(OUT/'results.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
print(json.dumps(evidence,ensure_ascii=False),flush=True)
raise SystemExit(0 if all(evidence['checks'].values()) else 1)
