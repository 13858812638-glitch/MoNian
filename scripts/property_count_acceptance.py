"""GLS ordinary property Picker: stable real usage counts; frozen-vs-candidate regression.
Run `python3 scripts/property_count_acceptance.py [--subject baseline|current] [--profile mobile|desktop]`.
Chromium mock host. Not an iPhone/WebKit test.
"""
from pathlib import Path
import argparse, json, sys, traceback, hashlib
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'reports/current/property-count'
OUT.mkdir(parents=True,exist_ok=True)
formal_reference=ROOT/'tests/reference/property-count-formal-subject.cjs'
parser=argparse.ArgumentParser()
parser.add_argument('--subject',choices=('baseline','current'),default='current')
parser.add_argument('--profile',choices=('mobile','desktop'),default='mobile')
args=parser.parse_args()
subject=(formal_reference if args.subject=='baseline' else ROOT/'tests/generated/subject.cjs')

PROJECT_COUNTS=[('人事',6),('卫康',34),('Obsidian',13),('标准化流程·运营部',1),('公司制度',4),('obsidian插件开发',1),('图片资源来源与产出',4),('拖',0)]
files=[]
for group,num in PROJECT_COUNTS:
    # One real file has two YAML project values; each value gets one count,
    # but the same file must never be counted twice in a combined result.
    for n in range(num - (1 if group=='Obsidian' else 0)):
        value=['卫康','Obsidian'] if group=='卫康' and n==0 else group
        files.append({'path':f'资料/{group}-{n:03}.md','content':f'# {group} {n}', 'properties':{'所属项目':value}})
for n in range(163-len(files)):
    files.append({'path':f'其他/无项目-{n:03}.md','content':'# 未归项目', 'properties':{'备注':'待分类'}})
assert len(files)==163
cases=[]
def record(name,actual,expected):
    ok=actual==expected
    cases.append({'name':name,'pass':ok,'actual':actual,'expected':expected})
    print(('PASS' if ok else 'FAIL'),name,'observed',actual,'expected',expected,flush=True)
    return ok

with sync_playwright() as p:
    mobile=args.profile=='mobile'
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},locale='zh-CN',timezone_id='Asia/Shanghai',is_mobile=mobile,has_touch=mobile)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="'+('is-mobile' if mobile else '')+' theme-light"><div id="host"></div></body></html>')
        for path in ['tests/browser-fixture.css','src/styles/styles.css']:
            page.add_style_tag(content=(ROOT/path).read_text())
        page.add_script_tag(content=(ROOT/'tests/host.js').read_text())
        page.evaluate('([files,mobile])=>{window.H=__makeHost({files,mobile});window.module={exports:{}};window.require=name=>H.obsidian}',[files,mobile])
        page.add_script_tag(content=subject.read_text())
        # Work with the real Plugin and SearchCore classes, not a recreated count function.
        page.evaluate('''async()=>{
            window.S=module.exports;
            window.P=new S.LocalSearchPlugin(H.app);
            await P.onload(); await H.layoutReady(); await P._flushIndexQueueNow();
            await P.addPropertyCatalogValues([{key:'所属项目',propertyType:'multitext',addValues:['拖']}]);
            window.C=new S.SearchCore(H.app,P,document.querySelector('#host'),{hostKind:'sidebar',persistModalSession:false,allowCreate:true,closeAfterFileOpen:false});
            await C.init(); await C.performSearch('');
        }''')
        page.wait_for_timeout(170)
        def open_picker(quick=False):
            page.evaluate('''quick=>{C.dropdown.close(false);C.facets.openPropertyPicker('所属项目',C.propertyFilterBtn,quick?{mode:'quick-value'}:{});}''',quick)
            page.wait_for_timeout(65)
        def counts():
            return page.evaluate('''()=>{
              const rows=[...document.querySelectorAll('.local-search-property-dropdown .local-search-property-tree-value-row')];
              return Object.fromEntries(rows.filter(row=>row.dataset.pickerKey?.startsWith('所属项目：'))
                .map(row=>[row.dataset.pickerKey.slice('所属项目：'.length),Number(row.querySelector('.local-search-property-count')?.textContent)]));
            }''')
        def meta():
            return page.evaluate('''()=>({
              n:C.fullResults.length,
              header:C.dropdown.panel?.querySelector('.local-search-picker-title-count')?.firstChild?.textContent,
              headerAria:(()=>{const el=C.dropdown.panel?.querySelector('.local-search-picker-title-count');return el?.getAttribute('aria-label')||el?.ownerDocument?.getElementById(el?.getAttribute('aria-labelledby'))?.textContent})(),
              keyCount:[...document.querySelectorAll('.local-search-property-tree-key-row')].find(r=>r.dataset.propertyKey==='所属项目')?.querySelector('.local-search-property-count')?.textContent,
              selected: [...(C.filterState.properties.get('所属项目')||[])],
              selectedRows:[...document.querySelectorAll('.local-search-property-tree-value-row.is-selected')].map(r=>r.dataset.pickerKey)
            })''')
        def click(value):
            page.locator('.local-search-property-tree-value-row[data-picker-key="所属项目：'+value+'"] > button.local-search-move-tree-folder').click()
            page.wait_for_timeout(180)
        expected={k:v for k,v in PROJECT_COUNTS}
        # Project count is independent of previously selected same-key value.
        open_picker()
        record('initial-project-value-counts',counts(),expected)
        record('initial-key-present-count',meta()['keyCount'],'62')
        record('header-scope-total',meta()['header'],'163')
        click('标准化流程·运营部')
        record('ordinary-click-replaces-to-one',meta()['n'],1)
        record('single-selection-persisted',meta()['selected'],['标准化流程·运营部'])
        open_picker()
        record('reopened-selected-value-counts',counts(),expected)
        record('reopened-property-key-present-count',meta()['keyCount'],'62')
        record('reopened-selection-highlight',meta()['selectedRows'],['所属项目：标准化流程·运营部'])
        record('reopened-header-scope-total',meta()['header'],'163')
        record('header-describes-scope',meta()['headerAria'],'当前文件范围总数 163')
        # Quick shortcut must display the same numbers even when the selected value is different.
        open_picker(quick=True)
        record('quick-entry-same-counts',counts(),expected)
        record('quick-entry-selected-highlight',meta()['selectedRows'],['所属项目：标准化流程·运营部'])
        click('卫康')
        record('ordinary-replace-actual-34-results',meta()['n'],34)
        record('ordinary-replace-only-one-value',meta()['selected'],['卫康'])
        open_picker(quick=True)
        record('quick-reopened-stable-counts',counts(),expected)
        click('卫康')
        record('same-value-toggle-clears-filter',meta()['n'],163)
        record('same-value-toggle-no-selected-value',meta()['selected'],[])
        open_picker(quick=True)
        record('clear-restores-stable-counts',counts(),expected)
        record('zero-file-catalog-value-visible',counts().get('拖'),0)
        # Explicit multi-select still uses OR when committed; displayed counts stay true usage.
        click('标准化流程·运营部')
        open_picker()
        page.locator('.local-search-property-dropdown .local-search-picker-title-selection-actions button').click()
        page.wait_for_timeout(80)
        record('draft-mode-stable-counts',counts(),expected)
        click('卫康')
        record('draft-keeps-normal-counts',counts(),expected)
        page.locator('.local-search-property-dropdown .local-search-picker-footer button.local-search-action-primary').click()
        page.wait_for_timeout(180)
        record('explicit-multiselect-or-results',meta()['n'],35)
        record('explicit-multiselect-stores-two-values',sorted(meta()['selected']),sorted(['卫康','标准化流程·运营部']))
        open_picker(quick=True)
        record('multiselect-reopen-stable-counts',counts(),expected)
        # Actual scope intentionally follows only folders, not property selection.
        record('multiselect-header-universe-still-163',meta()['header'],'163')
        # Two-valued file tests OR de-duplication in the *real* search result.
        page.evaluate('C.dropdown.close(false); C.filterState.properties.clear(); C._onFilterChanged()')
        page.wait_for_timeout(100)
        open_picker()
        page.locator('.local-search-property-dropdown .local-search-picker-title-selection-actions button').click()
        click('卫康'); click('Obsidian')
        page.locator('.local-search-property-dropdown .local-search-picker-footer button.local-search-action-primary').click()
        page.wait_for_timeout(100)
        record('multi-valued-YAML-OR-deduplicates-file',meta()['n'],46)
        open_picker()
        record('multi-valued-YAML-raw-counts',counts(),expected)
        record('multi-valued-YAML-key-present',meta()['keyCount'],'62')
        # Scope follows the selected folder, not a selected project value.
        page.evaluate('C.dropdown.close(false); C.filterState.properties.clear(); C._applyFacetSelection("folder","资料"); C._onFilterChanged()')
        page.wait_for_timeout(150)
        open_picker()
        record('folder-scope-header-total',meta()['header'],'62')
        record('folder-scope-property-key-count',meta()['keyCount'],'62')
        record('folder-scope-project-raw-counts',counts(),{k:v for k,v in expected.items() if k!='拖'})
        nav_counts=page.evaluate('''()=>{const stats=C.navigator._propertyStats('所属项目',C._navigationCandidates().scope,C.filterState);return Object.fromEntries(['卫康','Obsidian','标准化流程·运营部','拖'].map(key=>[key,stats.counts.get(S.propertyValueKey(key))||0]));}''')
        record('navigator-and-picker-counts-match',nav_counts,{'卫康':34,'Obsidian':13,'标准化流程·运营部':1,'拖':0})
        page.evaluate('C.dropdown.close(false); C.destroy(); P.onunload()')
    except Exception as error:
        cases.append({'name':'uncaught-test-exception','pass':False,'error':str(error),'trace':traceback.format_exc()})
        print('ERROR',traceback.format_exc(),flush=True)
    finally:
        context.close(); browser.close()
result={'subject':args.subject,'profile':args.profile,'engine':'Chromium','host':'mock Obsidian','subject_sha256':hashlib.sha256(subject.read_bytes()).hexdigest(),'pass':sum(r['pass'] for r in cases),'fail':sum(not r['pass'] for r in cases),'cases':cases,'page_errors':errors,'limitations':['Not native iOS Obsidian/WebKit','163-file synthetic dataset; not user vault']}
path=OUT/f'{args.subject}-{args.profile}.json';path.write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('SUMMARY',result['pass'],result['fail'],'pageerrors',len(errors), '->',path,flush=True)
sys.exit(bool(result['fail'] or errors))
