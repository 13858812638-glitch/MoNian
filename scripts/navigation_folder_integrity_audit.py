"""Focused Chromium verification of frozen-GLS folder navigation/appearance.
This simulates a Vault and iOS layout; does not prove native iPhone WebKit.
"""
from pathlib import Path
import json, shutil, os
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
os.chdir(root)
records=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 for mobile in (True,False):
  for theme in ('light','dark'):
   label=('mobile' if mobile else 'desktop')+'-'+theme
   ctx=browser.new_context(viewport={'width':390 if mobile else 1150,'height':844},is_mobile=mobile,has_touch=mobile,locale='zh-CN')
   page=ctx.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile is-phone ' if mobile else '')+'theme-'+theme+'"><div id="host"></div></body></html>')
    for p in ('tests/browser-fixture.css','src/styles/styles.css'):
     page.add_style_tag(content=(root/p).read_text())
    page.add_script_tag(content=(root/'tests/host.js').read_text())
    page.evaluate('''mobile=>{
      window.H=__makeHost({mobile,files:[
        {path:'90-附件/图片.png'},{path:'90-附件/说明.md'},
        {path:'90-附件/GLS-元数据/recent-opened-x.json'},
        {path:'90-附件/GLS-元数据/file-times-x.json'},
        {path:'90-附件/用户目录/资料.pdf'},
        {path:'01-笔记/笔记.md'}
      ],settings:{metadataDirectory:'90-附件/GLS-元数据',excludedFolders:[],resultExcludedFolders:['90-附件/用户目录']}});
      window.module={exports:{}};window.require=n=>H.obsidian;
    }''',mobile)
    page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
    page.evaluate('''async()=>{
        window.S=module.exports;window.P=new S.LocalSearchPlugin(H.app);
        await P.onload();await H.layoutReady();await P._flushIndexQueueNow();
        window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),{hostKind:'sidebar',allowCreate:true,persistModalSession:false,closeAfterFileOpen:false});
        if(!await C.init())throw Error('SearchCore failed');
        C.navigator.collapsed.delete('folder');
        C.navigator.collapsed.add('tags');C.navigator.collapsed.add('properties');
        C.navigator.renderRevision=-1; C.navigator.sync();await new Promise(r=>setTimeout(r,300));
    }''')
    result=page.evaluate('''async()=>{
        const nav=C.navigator;
        const rowFor=name=>[...nav.scroll.querySelectorAll('.local-search-nav-section[data-nav-section="folder"] .local-search-nav-row')].find(r=>r.querySelector('.local-search-move-tree-name')?.textContent===name);
        const folder=rowFor('90-附件');if(!folder)throw Error('No parent folder row');
        const count=folder.querySelector(':scope > .local-search-move-current-badge');
        if(count?.textContent!=='2 · 5')throw Error('Bad direct/recursive count '+count?.textContent);
        const cStyle=getComputedStyle(count),mute=getComputedStyle(nav.scroll).getPropertyValue('--ls-muted').trim();
        if(cStyle.color!==mute){
            const probe=document.createElement('span');probe.style.color='var(--ls-muted)';nav.scroll.append(probe);
            const want=getComputedStyle(probe).color;probe.remove();
            if(cStyle.color!==want)throw Error('Count color not muted: '+cStyle.color+' vs '+want);
        }
        const icon=()=>folder.querySelector('.local-search-move-tree-folder-icon')?.getAttribute('data-test-icon');
        if(icon()!=='folder-closed')throw Error('Collapsed glyph '+icon());
        const chevron=folder.querySelector(':scope > .local-search-move-tree-toggle');
        if(!chevron||chevron.disabled)throw Error('Missing metadata child disclosure');
        chevron.click();await new Promise(r=>setTimeout(r,260));
        if(icon()!=='folder-open')throw Error('Expanded glyph '+icon());
        const metadata=rowFor('GLS-元数据');if(!metadata)throw Error('Metadata child hidden');
        if(metadata.querySelector(':scope > .local-search-move-current-badge')?.textContent!=='2')throw Error('Metadata physical count missing');
        if(!P.isPathExcluded('90-附件/GLS-元数据/recent-opened-x.json'))throw Error('Metadata protection missing');
        if(P.fileMetaCache.has('90-附件/GLS-元数据/recent-opened-x.json'))throw Error('Metadata indexed');
        const excluded=['90-附件/用户目录/资料.pdf'];
        if(excluded.some(path=>C.fullResults.some(x=>x.path===path)))throw Error('Result exclusion bypassed');
        if(!rowFor('用户目录'))throw Error('Result-only excluded directory hidden from nav');
        const section=nav.scroll.querySelector('.local-search-nav-section[data-nav-section="folder"]');
        const el=document.createElement('div');el.className='local-search-nav-section';
        el.style.height='40px';section.after(el);
        const dividerStyle=getComputedStyle(el,'::before');
        const dividerContent=dividerStyle.content;
        const dividerLeft=dividerStyle.left;
        const manual=document.createElement('div');manual.className='local-search-move-tree-row local-search-nav-separator';
        manual.style.setProperty('--ls-move-depth','0');el.after(manual);
        const mb=getComputedStyle(manual,'::before');
        const beforeData={section:dividerContent,left:dividerLeft,manual:mb.content,manualLine:mb.borderTopStyle};
        if(!dividerContent.includes('""')&&!dividerContent.includes("''"))throw Error('Section line missing');
        if(!mb.content.includes('""')&&!mb.content.includes("''"))throw Error('Manual separator line missing');
        nav.scroll.classList.add('is-sort-mode');
        const hidden=getComputedStyle(manual,'::before').content==='none';
        nav.scroll.classList.remove('is-sort-mode');
        manual.remove();el.remove();
        if(!hidden)throw Error('Manual line duplicated in sorting mode');
        // A user-wide exclusion is NOT the same as the result-only exclusion:
        // it must evict the indexed file and hide that branch, then restore both.
        await P.setExcludedFolders(['90-附件/用户目录']);
        await new Promise(r=>setTimeout(r,240));
        if(rowFor('用户目录'))throw Error('Globally excluded folder still shown');
        if(P.fileMetaCache.has('90-附件/用户目录/资料.pdf'))throw Error('Global index exclusion ineffective');
        await P.setExcludedFolders([]);
        await new Promise(r=>setTimeout(r,280));
        if(!rowFor('用户目录'))throw Error('Globally restored folder still hidden');
        if(!P.fileMetaCache.has('90-附件/用户目录/资料.pdf'))throw Error('Global exclusion restore did not re-index');
        C.destroy();await P._unloadHost();
        return {folderCount:count.textContent,metadataVisible:true,protected:true,iconInitially:'folder-closed',iconExpanded:'folder-open',divider:beforeData};
    }''')
    if errors:raise RuntimeError('; '.join(errors))
    records.append(dict(config=label,status='pass',result=result));print(label,'PASS',flush=True)
   except Exception as e:
    records.append(dict(config=label,status='fail',message=str(e),errors=errors));print(label,'FAIL',str(e)[:500],flush=True)
   finally:ctx.close()
 browser.close()
(root/'reports'/'navigation-folder-integrity-chromium.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
if any(x['status']=='fail' for x in records):raise SystemExit(1)
