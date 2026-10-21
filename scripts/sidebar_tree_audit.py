"""DOM movement and sorting cost, through a real SearchView in a mock host."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_TREE_AUDIT_OUT','/workspace/sidebar-tree-audit/current'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for large in [False,True]:
        ctx,p=scope['boot'](browser,large=large)
        p.evaluate("document.querySelector('#host').style.width='714px';V.onResize()")
        p.wait_for_timeout(80)
        p.evaluate('''()=>{
          window.moves=[];window.comparisons=0;window.retained=new WeakSet();
          const insert=Node.prototype.insertBefore,compare=String.prototype.localeCompare;
          Node.prototype.insertBefore=function(node,before){
            if(this===C.navigator.sections.get('folder').content&&node.parentElement===this&&retained.has(node))
              moves.push(node.dataset.pickerKey);
            return insert.call(this,node,before);
          };
          String.prototype.localeCompare=function(...args){comparisons++;return compare.apply(this,args)};
        }''')
        toggle=p.locator('[data-nav-section="folder"] .local-search-nav-row[data-picker-key="Folder000"] > .local-search-move-tree-toggle')
        toggle.click();p.wait_for_timeout(40)
        p.evaluate("moves=[];comparisons=0;retained=new WeakSet([...C.navigator.sections.get('folder').content.children])")
        toggle.click();p.wait_for_timeout(40)
        evidence=p.evaluate('''()=>({moves,comparisons,
          managementButtons:[...C.navigator.scroll.querySelectorAll('.local-search-nav-manage')].filter(x=>x.getClientRects().length).length,
          selected:[...C.filterState.folders],expanded:C.navigator.expanded.has('folder:Folder000')})''')
        evidence['large']=large
        evidence['checks']={
          'collapse keeps retained siblings in place':not evidence['moves'],
          'collapse reuses locale comparator':evidence['comparisons']==0,
          'group ellipsis removed':evidence['managementButtons']==0,
          'disclosure does not change folder filter':not evidence['selected'] and not evidence['expanded']}
        # The new reconciliation must retain actual order, keyboard targets,
        # and the capped tree's final "show all" row after repeated disclosure.
        toggle.press('Enter');p.wait_for_timeout(40)
        expanded=p.evaluate('''()=>{
          const ref=C.navigator.sections.get('folder');
          return {keys:[...ref.content.children].map(r=>r.dataset.pickerKey),
            focused:document.activeElement===ref.content.querySelector('[data-picker-key="Folder000"] > .local-search-move-tree-toggle')};
        }''')
        toggle.press('Enter');p.wait_for_timeout(40)
        collapsed=p.evaluate("[...C.navigator.sections.get('folder').content.children].map(r=>r.dataset.pickerKey)")
        expected=['根目录']+[f'Folder{i:03}' for i in range(70 if large else 6)]
        # Root is a fixed virtual entry; its label follows the existing host.
        expected[0]=collapsed[0]
        if large:expected.append('显示全部…')
        evidence['checks']['collapse restores complete visible ordering']=collapsed==expected
        evidence['checks']['keyboard expands child immediately after parent']=expanded['keys'][1:4]==['Folder000','Folder000/Child','Folder001'] and expanded['focused']

        # Exercise the replacement entry point with real right-clicks.
        evidence['menus']={}
        for section in ['folder','tags','properties']:
            heading=p.locator(f'[data-nav-section="{section}"] > .local-search-nav-section-heading > .local-search-nav-section-toggle')
            heading.click(button='right')
            p.locator('[data-nav-action="manage-group"]').click()
            p.wait_for_timeout(40)
            menu=p.evaluate('''()=>{
              const panel=C.dropdown.panel,r=panel.getBoundingClientRect(),h=C.containerEl.getBoundingClientRect();
              return {inside:r.left>=h.left-1&&r.right<=h.right+1&&r.top>=h.top-1&&r.bottom<=h.bottom+1,
                visible:r.width>0&&r.height>0,tracked:C.navigator.pickerFlow?.panel===panel,
                title:panel.querySelector('.local-search-picker-title')?.textContent||panel.textContent.slice(0,80)};
            }''')
            evidence['menus'][section]=menu
            evidence['checks'][section+' management opens from context menu']=menu['inside'] and menu['visible'] and menu['tracked']
            p.keyboard.press('Escape');p.wait_for_timeout(40)
        p.evaluate("C.navigator.scroll.scrollTop=0;C.navigator.customization.setSortMode(true,'group')")
        evidence['checks']['group sort grips do not overlap counts']=p.evaluate('''()=>[...C.navigator.sections.values()].every(ref=>{
          const a=ref.summary.getBoundingClientRect(),grip=ref.heading.querySelector('.local-search-nav-sort-grip'),b=grip.getBoundingClientRect();
          return b.width>0&&a.right<=b.left;
        })''')
        p.evaluate("C.navigator.customization.setSortMode(true,'folder')")
        grip=p.locator('[data-nav-section="folder"] [data-picker-key="Folder001"] > .local-search-nav-sort-grip')
        grip.press('Alt+ArrowUp');p.wait_for_timeout(100)
        reordered=p.evaluate("[...C.navigator.sections.get('folder').content.children].map(r=>r.dataset.pickerKey)")
        evidence['checks']['keyboard reorder updates retained rows']=reordered[1:3]==['Folder001','Folder000']
        p.evaluate('''async()=>{
          const n=C.navigator,c=n.customization;
          const row=n.sections.get('folder').content.querySelector('[data-picker-key="Folder000"]');
          await c.addSeparator(c.rows.get(row),'before');await waitFixture(50);c.setSortMode(false);
        }''')
        toggle.click();p.wait_for_timeout(40);toggle.click();p.wait_for_timeout(40)
        evidence['checks']['separator stays before its target on collapse']=p.evaluate('''()=>{
          const ref=C.navigator.sections.get('folder'),row=ref.content.querySelector('[data-picker-key="Folder000"]');
          return row.previousElementSibling.classList.contains('local-search-nav-separator')
            &&row.previousElementSibling.previousElementSibling.dataset.pickerKey==='Folder001'
            &&!ref.content.querySelector('[data-picker-key="Folder000/Child"]');
        }''')
        results.append(evidence)
        p.screenshot(path=str(OUT/('large.png' if large else 'small.png')))
        ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
for r in results:print(json.dumps(r,ensure_ascii=False),flush=True)
raise SystemExit(0 if all(all(r['checks'].values()) for r in results) else 1)
