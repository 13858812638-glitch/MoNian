"""Check standalone Picker stacking, modal attachment and unrelated dialogs."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_MOVE_HOST_OUT','/workspace/move-picker-caret/hosts'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
rows=[]
def check(name,passed,evidence=None):
    rows.append(dict(name=name,passed=bool(passed),evidence=evidence));print(('PASS ' if passed else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx,p=scope['boot'](b,mobile=True)
 p.evaluate('''()=>{document.head.insertAdjacentHTML('beforeend','<meta name="viewport" content="width=device-width,initial-scale=1">');
   document.body.classList.add('is-ios');V.onResize();
   window.a=P.openExternalFolderPicker({onChoose:()=>{}});window.first=document.querySelector('.local-search-command-overlay');
   window.b=P.openExternalFolderPicker({onChoose:()=>{}});window.second=[...document.querySelectorAll('.local-search-command-overlay')].at(-1);
   second.querySelector('.local-search-dropdown').style.setProperty('--ui-mobile-safe-top','160px');}''')
 p.wait_for_timeout(80)
 state=p.evaluate('''()=>{const target=document.elementFromPoint(60,90);return {inTop:second.contains(target),
   backdrop:target.classList.contains('local-search-overlay-picker-backdrop'),first:first.isConnected,second:second.isConnected};}''')
 check('new overlay backdrop covers older picker',state['inTop'] and state['backdrop'] and state['first'] and state['second'],state)
 p.mouse.click(60,90);p.wait_for_timeout(40)
 check('outside click closes top overlay only',p.evaluate('a.active&&!b.active&&first.isConnected&&!second.isConnected'))
 p.locator('.local-search-command-overlay .local-search-picker-search').tap();p.keyboard.press('Escape')
 check('underlying picker remains dismissible',p.evaluate('!a.active&&!first.isConnected'))
 p.evaluate("window.op=P._openCurrentFileOperation('delete',H.app.vault.getFiles()[0])")
 check('delete dialog keeps original host layout',p.evaluate("getComputedStyle(op.overlayEl).display==='flex'&&!op.overlayEl.querySelector('.local-search-overlay-picker-backdrop')"))
 p.evaluate('op.close()')
 p.evaluate('''()=>{window.modal=document.body.createDiv({cls:'modal-container'});const inner=modal.createDiv({cls:'modal'});
   inner.style.transform='translateY(4px)';window.anchor=inner.createEl('input');anchor.focus();
   window.h=P.openExternalFolderPicker({anchor,onChoose:()=>{}});
   window.overlay=document.querySelector('.local-search-command-overlay');}''')
 check('native modal owns picker outside transformed inner shell',p.evaluate("overlay.parentElement===modal&&getComputedStyle(overlay).display==='contents'&&document.activeElement===anchor"))
 p.locator('.local-search-command-overlay .local-search-overlay-close').tap();p.wait_for_timeout(40)
 check('close button releases modal picker',p.evaluate('!h.active&&!overlay.isConnected'))
 p.evaluate('modal.remove();V.onClose();P.onunload()');ctx.close();b.close()
before=json.loads(Path('/workspace/move-picker-caret/before/geometry.json').read_text())
after=json.loads(Path('/workspace/move-picker-caret/after/geometry.json').read_text())
for name,rect in before.items():check(name+' position and size unchanged',rect==after[name],dict(before=rect,after=after[name]))
report=dict(passed=sum(r['passed'] for r in rows),failed=sum(not r['passed'] for r in rows),results=rows)
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));raise SystemExit(bool(report['failed']))
