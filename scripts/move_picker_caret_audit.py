"""Move-folder input/portal parity and lifecycle. Chromium is not native iOS."""
import io,json,os
from pathlib import Path
from PIL import Image,ImageChops
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_MOVE_CARET_OUT','/workspace/move-picker-caret/after'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
rows=[];geometry={}
def check(name,passed,evidence=None):
    rows.append(dict(name=name,passed=bool(passed),evidence=evidence));print(('PASS ' if passed else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for platform in ['desktop','ios','android']:
      for dark in [False,True]:
       for entry in ['list','command','external']:
        mobile=platform!='desktop';label=f'{platform}-{dark}-{entry}'
        ctx,p=scope['boot'](b,mobile=mobile,dark=dark);errors=[]
        p.on('pageerror',lambda e:errors.append(str(e)))
        p.evaluate('''ios=>{
          document.head.insertAdjacentHTML('beforeend','<meta name="viewport" content="width=device-width,initial-scale=1">');
          if(ios)document.body.classList.add('is-ios');V.onResize();
          C.navigator.showResults(false);C.navigator.searchVisible=true;C.navigator.syncPage();
          window.openMove=entry=>{
            window.moving=H.app.vault.getFiles()[0];window.originalPath=moving.path;
            if(entry==='list')C.showMovePickerForFiles([moving],C.searchInput);
            else if(entry==='command')P._openCurrentFileOperation('move',moving);
            else window.external=P.openExternalFolderPicker({anchor:C.searchInput,onChoose:path=>{window.chosen=path}});
            window.panel=document.querySelector('.local-search-move-dropdown');window.owner=panel.parentElement;
          };
        }''',platform=='ios')
        p.wait_for_timeout(70)
        p.locator('.local-search-input:visible').tap() if mobile else p.locator('.local-search-input:visible').click()
        p.evaluate('''()=>{window.focusCalls=[];const f=HTMLElement.prototype.focus,bl=HTMLElement.prototype.blur;
          HTMLElement.prototype.focus=function(...a){focusCalls.push('focus');return f.apply(this,a)};
          HTMLElement.prototype.blur=function(...a){focusCalls.push('blur');return bl.apply(this,a)};}''')
        p.evaluate('entry=>openMove(entry)',entry);p.wait_for_timeout(80)
        state=p.evaluate('''()=>({display:getComputedStyle(owner).display,tabindex:panel.getAttribute('tabindex'),
          main:document.activeElement===C.searchInput,calls:focusCalls,rect:panel.getBoundingClientRect().toJSON()})''')
        geometry[label]=state['rect']
        check(label+' paint-free iOS picker host',state['display']=='contents' if platform=='ios' else state['display']!='contents',state)
        check(label+' mobile opening preserves current edit session',not mobile or (state['main'] and state['tabindex'] is None and not state['calls']),state)
        field=p.locator('.local-search-picker-search:visible');field.tap() if mobile else field.click()
        p.evaluate('window.keptInput=document.activeElement;focusCalls=[]')
        p.keyboard.insert_text('Folder001');p.wait_for_timeout(60)
        state=p.evaluate('''()=>{const e=keptInput,s=getComputedStyle(e),r=e.getBoundingClientRect();return {
          same:panel.querySelector('input')===e,active:document.activeElement===e,value:e.value,caret:s.caretColor,color:s.color,
          hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e,calls:focusCalls};}''')
        check(label+' shared input stays native and hittable',state['same'] and state['active'] and state['hit'] and state['value']=='Folder001' and state['caret']==state['color'] and not state['calls'],state)
        pictures=[]
        for _ in range(3):
          field.press('ArrowLeft');field.press('ArrowRight');pictures.append(field.screenshot(caret='initial',animations='disabled'))
        field.evaluate("e=>e.style.caretColor='transparent'")
        hidden=field.screenshot(caret='initial',animations='disabled');hidden2=field.screenshot(caret='initial',animations='disabled')
        base=Image.open(io.BytesIO(hidden)).convert('RGB')
        diffs=[ImageChops.difference(Image.open(io.BytesIO(v)).convert('RGB'),base).getbbox() for v in pictures]
        negative=ImageChops.difference(Image.open(io.BytesIO(hidden2)).convert('RGB'),base).getbbox()
        check(label+' actual caret pixels with transparent control',any(diffs) and negative is None,dict(differences=diffs,negative=negative))
        (OUT/(label+'-caret.png')).write_bytes(next((v for v,d in zip(pictures,diffs) if d),pictures[0]))
        field.evaluate("e=>e.style.removeProperty('caret-color')")
        state=p.evaluate('''async()=>{const e=keptInput;e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
          e.value='目录';e.setSelectionRange(2,2);e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
          e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));V.onResize();await waitFixture(40);
          return {same:panel.querySelector('input')===e,active:document.activeElement===e,start:e.selectionStart,end:e.selectionEnd,calls:focusCalls};}''')
        check(label+' composition and SearchView resize retain selection',state['same'] and state['active'] and state['start']==2 and state['end']==2 and not state['calls'],state)
        field.fill('Folder001')
        p.locator('.local-search-move-dropdown [data-picker-value="Folder001"] .local-search-move-tree-folder').click()
        p.wait_for_timeout(160)
        state=p.evaluate('''entry=>({closed:!panel.isConnected,
          moved:entry==='external'?chosen==='Folder001':H.app.vault.getFiles().some(f=>f.path==='Folder001/'+moving.name),
          overlayGone:entry==='list'||!owner.isConnected})''',entry)
        check(label+' folder selection still commits and cleans host',all(state.values()),state)
        # Dismissal must remain available after removing the iOS host paint box.
        p.evaluate('entry=>openMove(entry)',entry);p.wait_for_timeout(60)
        p.locator('.local-search-picker-search:visible').click();p.keyboard.press('Escape');p.wait_for_timeout(50)
        check(label+' Escape releases picker',p.evaluate('!panel.isConnected'))
        if entry!='list':
          p.evaluate('entry=>openMove(entry)',entry);p.wait_for_timeout(60)
          p.mouse.click(2,2);p.wait_for_timeout(50)
          check(label+' outside click releases picker',p.evaluate('!panel.isConnected'))
        p.evaluate('V.onClose();P.onunload()');p.wait_for_timeout(40)
        check(label+' no orphan overlays or browser errors',not errors and p.evaluate("!document.querySelector('.local-search-command-overlay')"),errors)
        ctx.close()
    b.close()
(OUT/'geometry.json').write_text(json.dumps(geometry,indent=2))
report=dict(passed=sum(r['passed'] for r in rows),failed=sum(not r['passed'] for r in rows),nativeIOSVerified=False,results=rows)
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(bool(report['failed']))
