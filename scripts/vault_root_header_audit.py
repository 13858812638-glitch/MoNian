"""Narrow UI contract for the GLS top folder group. Chromium fixture only; not iOS WebKit."""
import os,json,shutil,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
os.chdir(root)
reports=root/'reports/current/vault-root-heading'
reports.mkdir(parents=True,exist_ok=True)
rows=[]
with sync_playwright() as pw:
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    browser=pw.chromium.launch(headless=True,executable_path=exe if exe else None,args=['--no-sandbox'])
    for mobile in [False, True]:
      for dark in [False,True]:
        label=('mobile' if mobile else 'desktop')+('-dark' if dark else '-light')
        ctx=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,locale='zh-CN')
        page=ctx.new_page();errors=[]
        page.on('pageerror', lambda e:errors.append(str(e)))
        try:
            page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'"><div id="host"></div></body></html>')
            for f in ['tests/browser-fixture.css','src/styles/styles.css']:
                page.add_style_tag(content=(root/f).read_text())
            for f in ['tests/host.js','tests/browser-scenarios.js']:
                page.add_script_tag(content=(root/f).read_text())
            page.evaluate('m=>bootFixture(m)',mobile)
            page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
            page.evaluate('''async()=>{
                await startFixture();
                C.destroy();
                H.app.vault.getName=()=> 'Wisdom_手机端';
                window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),{hostKind:'sidebar',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false});
                if(!await C.init())throw Error('initialization failed');
                await C.performSearch(''); await waitFixture(180);
            }''')
            checks=page.evaluate('''async()=>{
                const out=[];
                const ck=(condition,name,details={})=>{out.push({name,ok:!!condition,details});if(!condition)throw Error(name+': '+JSON.stringify(details));};
                const nav=C.navigator;
                const header=()=>document.querySelector('.local-search-nav-section[data-nav-section="folder"] .local-search-nav-section-heading');
                const t=h=>h?.querySelector('.local-search-nav-section-toggle .local-search-move-tree-name')?.textContent;
                const icon=h=>h?.querySelector('.local-search-move-tree-folder-icon')?.getAttribute('data-test-icon');
                const expanded=h=>h?.querySelector('.local-search-nav-section-toggle')?.getAttribute('aria-expanded')==='true';
                let h=header();
                ck(Boolean(h),'folder-heading-exists');
                ck(t(h)==='Wisdom_手机端','vault-caption',{text:t(h)});
                ck(icon(h)===(expanded(h)?'open-vault':'vault'),'stateful-vault-icon',{icon:icon(h),expanded:expanded(h)});
                const firstElement=h;
                const prior=expanded(h);
                nav.collapsed[prior?'add':'delete']('folder');nav.renderRevision=-1;nav.sync();await waitFixture(140);
                h=header();
                ck(h===firstElement,'stable-heading-dom');
                ck(expanded(h)===!prior,'fold-state-flips',{expanded:expanded(h)});
                ck(icon(h)===(prior?'vault':'open-vault'),'vault-icon-flips',{icon:icon(h)});
                ck(t(h)==='Wisdom_手机端','fold-preserves-vault-name');
                H.app.vault.getName=()=> '新仓库名';nav.refreshPreferences();await waitFixture(140);
                h=header();
                ck(t(h)==='新仓库名','vault-rename-updates-cached-heading',{text:t(h)});
                const headingButton=h.querySelector('.local-search-nav-section-toggle');
                const a11y=headingButton?.getAttribute('aria-label') || document.getElementById(headingButton?.getAttribute('aria-labelledby'))?.textContent;
                ck(a11y?.includes('新仓库名'),'vault-rename-updates-a11y',{aria:a11y,title:t(h)});
                ck(h.dataset.navId===JSON.stringify(['group','folder','']),'folder-group-id-unchanged');
                ck(document.querySelector('.local-search-nav-section[data-nav-section="tags"] .local-search-nav-section-toggle .local-search-move-tree-name')?.textContent==='标签','tags-heading-unmodified');
                ck(document.querySelector('.local-search-nav-section[data-nav-section="properties"] .local-search-nav-section-toggle .local-search-move-tree-name')?.textContent==='属性','properties-heading-unmodified');
                C.destroy();await P._unloadHost();return out;
            }''')
            rows.append({'configuration':label,'passed':len(checks),'checks':checks,'errors':errors})
            print(label,len(checks),'PASS',flush=True)
        except Exception as e:
            rows.append({'configuration':label,'error':str(e),'pageErrors':errors})
            print(label,'FAIL',str(e)[:400],flush=True)
        finally:
            ctx.close()
    browser.close()
(reports/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print('TOTAL',sum(x.get('passed',0) for x in rows),'FAILURES',sum(bool(x.get('error') or x.get('pageErrors')) for x in rows))
sys.exit(1 if any(x.get('error') or x.get('pageErrors') for x in rows) else 0)
