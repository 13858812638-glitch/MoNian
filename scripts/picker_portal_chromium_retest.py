"""Verify the permanent E condition and popup behavior; not an iPhone renderer."""
import json, os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
os.chdir(root)
subprocess.run(['node', '--input-type=module', '-e',
    "import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"], check=True)
rows = []
def check(name, passed, evidence):
    rows.append(dict(case=name, passed=bool(passed), evidence=evidence))
    print(name, 'PASS' if passed else 'FAIL', flush=True)

with sync_playwright() as pw:
    base = Path(os.environ.get('WEBKIT_BUNDLE_DIR', str(Path(pw.webkit.executable_path).parent/'minibrowser-wpe')))
    deps = Path(os.environ.get('WEBKIT_DEPS_LIBRARY_PATH', str(root.parents[1]/'browser-tools/webkit-deps/root/usr/lib/x86_64-linux-gnu')))
    options = {}
    if (base/'bin/MiniBrowser').exists() and deps.exists():
        options = dict(executable_path=str(base/'bin/MiniBrowser'), env=dict(os.environ,
            WEBKIT_EXEC_PATH=str(base/'bin'), WEBKIT_INJECTED_BUNDLE_PATH=str(base/'lib'),
            WEBKIT_INSPECTOR_RESOURCES_PATH=str(base/'share'), WEBKIT_FORCE_COMPLEX_TEXT='1',
            LD_LIBRARY_PATH=':'.join(map(str, [deps, base/'lib', base/'sys/lib']))))
    for engine in ['chromium']:
        browser = (pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'), args=['--no-sandbox'])
            if engine == 'chromium' else pw.webkit.launch(**options))
        for platform, host_kind in [('ios','sidebar'), ('ios','modal'),
                                    ('android','sidebar'), ('desktop','sidebar')]:
            mobile = platform != 'desktop'
            label = f'{engine}-{platform}-{host_kind}'
            ctx = browser.new_context(viewport=dict(width=430 if mobile else 1280, height=932),
                is_mobile=mobile, has_touch=mobile)
            p = ctx.new_page(); p.set_default_timeout(5000); errors = []
            p.on('pageerror', lambda error: errors.append(str(error)))
            classes = 'theme-dark ' + ('is-mobile is-'+platform if mobile else '')
            p.set_content('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">'
                f'<body class="{classes}"><div id="host"></div></body>')
            for file in ['tests/browser-fixture.css', 'src/styles/styles.css']:
                p.add_style_tag(content=(root/file).read_text())
            for file in ['host.js', 'browser-scenarios.js', 'focus-scenarios.js']:
                p.add_script_tag(content=(root/'tests'/file).read_text())
            p.evaluate('(mobile)=>{installFocusProbe();bootFixture(mobile)}', mobile)
            p.evaluate('(ios)=>H.obsidian.Platform.isIosApp=ios', platform == 'ios')
            p.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
            p.evaluate('()=>startFixture()')
            p.add_script_tag(content=(root/'tests/search-condition-scenarios.js').read_text())
            if host_kind == 'modal':
                p.evaluate('''()=>{window.testModal=new H.obsidian.Modal(H.app);testModal.open();
                    testModal.containerEl.style.zIndex='1000';testModal.modalEl.style.cssText='position:relative;z-index:1';
                    testModal.contentEl.append(document.querySelector('#host'));}''')
            p.evaluate('()=>auditFresh()')
            state = p.evaluate('''()=>({commands:P._commands.map(c=>c.id),
                emptyDisplay:getComputedStyle(C.popupSurfaceHost()).display,
                donor:(()=>{const e=document.body.createDiv({cls:'dida-bridge-content ui-popup-portal'});
                    e.createDiv({cls:'local-search-dropdown'});const display=getComputedStyle(e).display;e.remove();return display;})()})''')
            check(label+'-normal-startup-and-scope', len(state['commands']) == 7
                and 'picker-caret-visual-probe' not in state['commands']
                and state['emptyDisplay'] == 'block' and state['donor'] == 'block', state)
            p.evaluate('''()=>{window.mainNode=C.searchInput;
                window.mainStyles=(()=>{const s=getComputedStyle(mainNode);return [s.fontSize,s.height,s.caretColor,s.display];})();}''')
            kinds = ['folder','tags','property','property-value'] if platform == 'ios' else ['tags']
            for kind in kinds:
                p.evaluate('(kind)=>auditOpenPicker(kind)', kind)
                state = p.evaluate('''()=>{const panel=C.dropdown.panel, portal=C._popupHost, input=panel.querySelector('input');
                    const box=()=>{const r=panel.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
                    const after=box();portal.style.setProperty('display','block','important');const before=box();
                    portal.style.removeProperty('display');
                    const r=input.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
                    window.originalInput=input;window.originalPanel=panel;window.originalPortal=portal;programmaticFocus=[];
                    const s=getComputedStyle(mainNode);
                    return {display:getComputedStyle(portal).display,rect:box(),before,after,hit:hit===input,
                        pointer:getComputedStyle(input).pointerEvents,position:getComputedStyle(panel).position,
                        mainSame:C.searchInput===mainNode,mainBefore:mainStyles,mainAfter:[s.fontSize,s.height,s.caretColor,s.display],
                        modalParent:portal.parentElement===document.querySelector('.modal-container')};}''')
                check(label+'-'+kind+'-portal-and-geometry', state['display'] == ('contents' if platform == 'ios' else 'block')
                    and state['before'] == state['after'] == state['rect'] and state['hit']
                    and state['pointer'] == 'auto' and state['position'] == 'fixed'
                    and state['mainSame'] and state['mainBefore'] == state['mainAfter']
                    and state['modalParent'] == (host_kind == 'modal'), state)
                field = p.locator('.local-search-picker-search:visible')
                field.tap() if mobile else field.click()
                p.keyboard.insert_text('E测试')
                state = p.evaluate('''()=>({same:originalPanel.querySelector('input')===originalInput,
                    focused:document.activeElement===originalInput,value:originalInput.value,
                    selection:[originalInput.selectionStart,originalInput.selectionEnd],calls:programmaticFocus,
                    phase:originalPanel.getAttribute('data-ls-caret-probe')})''')
                check(label+'-'+kind+'-native-input', state['same'] and state['focused'] and state['value'] == 'E测试'
                    and state['selection'] == [3,3] and not state['calls'] and state['phase'] is None, state)
            if platform == 'ios':
                state = p.evaluate('''async()=>{const panel=C.dropdown.panel;
                    S.openSearchRenameDialog(C,{initialValue:'保留',onSubmit:()=>{throw Error('must not submit');}});
                    await waitFixture(50);const dialog=panel.querySelector('.local-search-dialog-surface');
                    const e=dialog.querySelector('input'),r=e.getBoundingClientRect();
                    const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;
                    const nested=C._confirmSession.host===panel;C._confirmSession.finish(false);
                    return {hit,nested,same:C.dropdown.panel===panel,display:getComputedStyle(C._popupHost).display};}''')
                check(label+'-picker-owned-dialog', state['hit'] and state['nested'] and state['same']
                    and state['display'] == 'contents', state)
                # Programmatic coexistence retains the old portal context. This
                # is not the UI path for a standalone confirmation: the original
                # z=41 confirmation is already behind a z=10090 open Picker.
                state = p.evaluate('''async()=>{void C._confirmAction({title:'确认测试'});await waitFixture(50);
                    const dialog=C._confirmSession.host.querySelector(':scope > .local-search-dialog-surface');
                    const display=getComputedStyle(C._popupHost).display,direct=dialog.parentElement===C._popupHost;
                    C._confirmSession.finish(false);
                    return {direct,display,restored:getComputedStyle(C._popupHost).display};}''')
                check(label+'-independent-dialog-retains-legacy-context', state['direct'] and state['display'] == 'block'
                    and state['restored'] == 'contents', state)
                p.evaluate('''()=>{window.parentPanel=C.dropdown.panel;window.parentInput=parentPanel.querySelector('input');
                    C.dropdown.openChild(parentPanel.querySelector('button'),'子 Picker');}''')
                p.wait_for_timeout(100)
                state = p.evaluate('''()=>{const child=C.dropdown.panel,r=child.getBoundingClientRect();
                    const hit=child.contains(document.elementFromPoint(r.x+20,r.y+20));programmaticFocus=[];
                    const target=child.querySelector('.local-search-folder-dropdown-heading')||child;
                    const gesture=(el,dx,dy)=>{const r=el.getBoundingClientRect();
                        for(const [type,x,y] of [['pointerdown',15,15],['pointermove',15+dx,15+dy],['pointerup',15+dx,15+dy]])
                        el.dispatchEvent(new PointerEvent(type,{pointerId:13,pointerType:'touch',isPrimary:true,button:0,
                            buttons:type==='pointerup'?0:1,clientX:r.x+x,clientY:r.y+y,bubbles:true,cancelable:true}));};
                    window.testGesture=gesture;gesture(target,95,2);
                    child.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
                    return {hit,returned:C.dropdown.panel===parentPanel,input:parentPanel.querySelector('input')===parentInput,
                        samePortal:C._popupHost===originalPortal,display:getComputedStyle(C._popupHost).display,calls:programmaticFocus};}''')
                check(label+'-child-swipe-return', state['hit'] and state['returned'] and state['input']
                    and state['samePortal'] and state['display'] == 'contents' and not state['calls'], state)
                state = p.evaluate('''()=>{testGesture(parentInput,95,2);testGesture(parentPanel,5,90);
                    return {same:C.dropdown.panel===parentPanel};}''')
                check(label+'-native-input-and-vertical-gesture', state['same'], state)
            p.mouse.click(2,930)
            p.wait_for_timeout(80)
            state = p.evaluate('()=>({closed:!C.dropdown.panel,removed:!originalPortal.isConnected,hostCleared:!C._popupHost})')
            check(label+'-outside-close', state['closed'] and (not mobile or (state['removed'] and state['hostCleared'])), state)
            if platform == 'ios':
                state = p.evaluate('''async()=>{void C._confirmAction({title:'确认测试'});await waitFixture(50);
                    const dialog=C._confirmSession.host.querySelector(':scope > .local-search-dialog-surface');
                    const e=dialog.querySelector('button'),r=e.getBoundingClientRect();
                    const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;
                    return {hit,display:getComputedStyle(C._popupHost).display};}''')
                check(label+'-standalone-dialog-visible', state['hit'] and state['display'] == 'block', state)
                p.locator('.local-search-dialog-surface button', has_text='取消').click()
                check(label+'-standalone-dialog-cancel', p.evaluate('()=>!C._confirmSession'), {})
            p.evaluate('()=>auditOpenPicker("tags")')
            state = p.evaluate('()=>({fresh:C._popupHost!==originalPortal,display:getComputedStyle(C._popupHost).display})')
            check(label+'-reopen', state['fresh'] == mobile and state['display'] == ('contents' if platform == 'ios' else 'block'), state)
            p.evaluate('()=>{C.destroy();P._unloadHost()}')
            check(label+'-no-browser-errors', not errors, errors)
            ctx.close()
        browser.close()
report = dict(nativeIOSBuildValidated=False, deviceEvidence='User confirmed phase E on iPhone; permanent build not yet device-tested',
    host='mock Obsidian', passed=sum(r['passed'] for r in rows), failed=sum(not r['passed'] for r in rows), results=rows)
target = Path(os.environ.get('PORTAL_AUDIT_REPORT', 'reports/picker-portal.json'))
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
raise SystemExit(bool(report['failed']))
