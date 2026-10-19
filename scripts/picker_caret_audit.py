"""Picker repair contract in a mock host. Native iPhone caret painting is unverified."""
import io, json, os, subprocess, sys
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
os.chdir(root)
baseline = os.environ.get('PICKER_AUDIT_BASELINE') == '1'
out = root / ('reports/picker-caret-baseline' if baseline else 'reports/picker-caret')
out.mkdir(parents=True, exist_ok=True)
if not baseline:
    subprocess.run(['node', '--input-type=module', '-e',
        "import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"], check=True)
rows = []

def check(name, passed, evidence):
    rows.append(dict(case=name, passed=bool(passed), evidence=evidence))
    print(name, 'PASS' if passed else 'FAIL', flush=True)

with sync_playwright() as driver:
    browser = driver.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),
        headless=True, args=['--no-sandbox'])
    version = browser.version
    for mobile in [True, False]:
      for dark in [False, True]:
        label = ('mobile' if mobile else 'desktop') + ('-dark' if dark else '-light')
        ctx = browser.new_context(viewport=dict(width=430 if mobile else 1280, height=932),
            is_mobile=mobile, has_touch=mobile, device_scale_factor=1)
        p = ctx.new_page(); errors = []
        p.on('pageerror', lambda error: errors.append(str(error)))
        p.set_content('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">'
            '<body class="' + ('is-mobile is-ios ' if mobile else '') + ('theme-dark' if dark else 'theme-light')
            + '"><div id="host"></div></body>')
        for name in ['tests/browser-fixture.css', 'tests/reference/upload-styles.css' if baseline else 'src/styles/styles.css']:
            p.add_style_tag(content=(root / name).read_text())
        for name in ['tests/host.js', 'tests/browser-scenarios.js', 'tests/focus-scenarios.js']:
            p.add_script_tag(content=(root / name).read_text())
        p.evaluate('(mobile)=>{installFocusProbe();bootFixture(mobile)}', mobile)
        p.add_script_tag(content=(root / ('tests/reference/upload-subject.cjs' if baseline else 'tests/generated/subject.cjs')).read_text())
        p.evaluate('()=>startFixture()')
        p.add_script_tag(content=(root / 'tests/search-condition-scenarios.js').read_text())
        p.evaluate('()=>auditFresh()')
        # A native text input is :focus-visible even after touch. Opening from
        # that anchor must not make the mobile dialog another focus target.
        main = p.locator('.local-search-input:visible')
        main.tap() if mobile else main.click()
        p.evaluate('''()=>{programmaticFocus=[];
            C.facets.showFolderDropdown({anchor:C.searchInput});}''')
        p.wait_for_timeout(180)
        state = p.evaluate('''()=>({tabindex:C.dropdown.panel.getAttribute('tabindex'),
            panelFocused:document.activeElement===C.dropdown.panel,
            calls:programmaticFocus})''')
        check(label+'-dialog-focus', (state['tabindex'] is None and not state['panelFocused']
            and not state['calls']) if mobile else (state['tabindex']=='-1' and state['panelFocused']), state)
        field = p.locator('.local-search-picker-search:visible')
        field.tap() if mobile else field.click()
        p.evaluate('''()=>{window.originalPickerInput=C.dropdown.panel.querySelector('input');
            window.originalPortal=C._popupHost;programmaticFocus=[];}''')
        # CDP mobile touch editing uses the text insertion path. Chromium 153
        # dispatches physical keydown without beforeinput in this mobile fixture;
        # desktop exercises ordinary key typing separately.
        if mobile:
            p.keyboard.insert_text('docs')
        else:
            field.press_sequentially('docs', delay=15)
        p.wait_for_timeout(100)
        state=p.evaluate('''()=>{const e=C.dropdown.panel.querySelector('input'),s=getComputedStyle(e);
            return {same:e===originalPickerInput,focused:document.activeElement===e,
            value:e.value,selection:[e.selectionStart,e.selectionEnd],caret:s.caretColor,
            color:s.color,touch:s.touchAction,font:s.fontSize,
            rowFont:getComputedStyle(C.dropdown.panel).getPropertyValue('--ls-picker-row-font-size').trim(),
            calls:programmaticFocus};}''')
        check(label+'-native-editing-stable',state['same'] and state['focused'] and state['value']=='docs'
            and state['selection']==[4,4] and not state['calls'] and state['caret']==state['color'],state)
        check(label+'-feishu-input-contract',state['touch']=='manipulation'
            and state['font']==state['rowFont'], state)
        # Real Chromium caret pixels, paired with a transparent-caret negative
        # control. Screenshots explicitly retain the caret; no screenshot/hide default.
        pictures=[]
        for attempt in range(3):
            field.press('ArrowLeft');field.press('ArrowRight')
            pictures.append(field.screenshot(caret='initial', animations='disabled'))
        p.evaluate("originalPickerInput.style.caretColor='transparent'")
        hidden=field.screenshot(caret='initial',animations='disabled')
        hidden_again=field.screenshot(caret='initial',animations='disabled')
        base=Image.open(io.BytesIO(hidden)).convert('RGB')
        differences=[ImageChops.difference(Image.open(io.BytesIO(v)).convert('RGB'),base).getbbox() for v in pictures]
        negative=ImageChops.difference(Image.open(io.BytesIO(hidden_again)).convert('RGB'),base).getbbox()
        check(label+'-caret-pixels-with-negative-control',any(differences) and negative is None,
            dict(visibleDifferences=differences,transparentDifference=negative,nativeIOS=False))
        (out/(label+'-caret.png')).write_bytes(next((v for v,d in zip(pictures,differences) if d),pictures[0]))
        (out/(label+'-transparent-control.png')).write_bytes(hidden)
        p.evaluate("originalPickerInput.style.removeProperty('caret-color')")
        # Composition updates list contents without replacing the native input.
        state=p.evaluate('''()=>{const e=originalPickerInput;
            e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));
            e.value='目录';e.setSelectionRange(2,2);
            e.dispatchEvent(new InputEvent('input',{bubbles:true,data:'目录',inputType:'insertCompositionText',isComposing:true}));
            e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'目录'}));
            e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'目录'}));
            return {same:C.dropdown.panel.querySelector('input')===e,focused:document.activeElement===e,
                value:e.value,selection:[e.selectionStart,e.selectionEnd]};}''')
        check(label+'-composition-keeps-input',state['same'] and state['focused']
            and state['value']=='目录' and state['selection']==[2,2],state)
        # Nested close retains the parent, including its native input DOM;
        # the root close releases only the now-empty mobile portal.
        p.evaluate('''()=>{window.parentPanel=C.dropdown.panel;
            C.dropdown.openChild(parentPanel.querySelector('button'),'child');}''')
        p.wait_for_timeout(100)
        p.evaluate('()=>{programmaticFocus=[];C.dropdown.close(false)}')
        state=p.evaluate('''()=>({same:C.dropdown.panel===parentPanel,
            input:parentPanel.querySelector('input')===originalPickerInput,
            portal:C._popupHost===originalPortal,connected:originalPortal.isConnected,
            calls:programmaticFocus})''')
        check(label+'-child-return',state['same'] and state['input'] and state['portal'] and state['connected']
            and (not state['calls'] if mobile else True),state)
        p.evaluate('()=>C.dropdown.close(false,{returnToParent:false})')
        closed=p.evaluate('()=>({connected:originalPortal.isConnected,hostCleared:C._popupHost===null})')
        check(label+'-root-portal-release', (not closed['connected'] and closed['hostCleared'])
            if mobile else closed['connected'],closed)
        p.evaluate('()=>auditOpenPicker("tags")')
        reopened=p.evaluate('()=>({fresh:C._popupHost!==originalPortal,connected:C._popupHost.isConnected})')
        check(label+'-reopen',reopened['connected'] and reopened['fresh']==mobile,reopened)
        p.evaluate('()=>{C.destroy();P.onunload()}')
        check(label+'-no-browser-errors',not errors,errors)
        ctx.close()
    browser.close()
report=dict(engine='Chromium '+version,host='mock Obsidian',baseline=baseline,nativeIOSValidated=False,
    passed=sum(r['passed'] for r in rows),failed=sum(not r['passed'] for r in rows),results=rows)
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(bool(report['failed']))
