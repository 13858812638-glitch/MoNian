from pathlib import Path
p=Path(__file__).parent/'mobile_sidebar_stability_audit.py'
s=p.read_text()
s=s.replace("p.evaluate('''()=>{setTestKeyboard(0);document.querySelector('#foreign-edit').remove();C.navigator.searchVisible=true;C.navigator.syncPage()}''');p.wait_for_timeout(90)\n        input_node", "p.evaluate('''()=>{setTestKeyboard(0);document.querySelector('#foreign-edit').remove();C.navigator.searchVisible=true;C.navigator.syncPage()}''');p.wait_for_timeout(90)\n        dock_before_keyboard=sample()\n        input_node")
old="""row(name,'own-keyboard-visible-command-dock',input_node and st['rootKeyboard'] and st['toolbarRect']['bottom']<=bottom+2,dict(viewportBottom=bottom,after=st))"""
new="""dock_info=p.evaluate(\"\"\"()=>({frameMounted:!!V.capabilities?.mobileFrame,frameClass:C.containerEl.classList.contains('ui-mobile-frame'),inset:C.containerEl.style.getPropertyValue('--ui-mobile-keyboard-inset'),margin:getComputedStyle(C.navigator.mobileToolbar).marginBottom})\"\"\")
        row(name,'own-keyboard-native-sidebar-does-not-follow',input_node and not st['rootKeyboard'] and not dock_info['frameMounted'] and not dock_info['frameClass'] and not dock_info['inset'] and dock_info['margin']=='0px' and abs(st['toolbarRect']['bottom']-dock_before_keyboard['toolbarRect']['bottom'])<=1.1,dict(viewportBottom=bottom,before=dock_before_keyboard['toolbarRect']['bottom'],after=st['toolbarRect']['bottom'],details=dock_info))"""
assert old in s
s=s.replace(old,new)
s=s.replace("row(name,'keyboard-hide-cleans-lock-and-inset',not unfocus['rootKeyboard'] and\n            not p.evaluate('''()=>C.containerEl.style.getPropertyValue('--ui-mobile-keyboard-inset')'''),unfocus)", "row(name,'keyboard-hide-cleans-lock-and-inset',not unfocus['rootKeyboard'] and\n            not p.evaluate('''()=>C.containerEl.style.getPropertyValue('--ui-mobile-keyboard-inset')'''),unfocus)\n        row(name,'keyboard-dismiss-does-not-reflow-command-dock',abs(unfocus['toolbarRect']['bottom']-dock_before_keyboard['toolbarRect']['bottom'])<=1.1,dict(before=dock_before_keyboard['toolbarRect']['bottom'],after=unfocus['toolbarRect']['bottom']))")
p.write_text(s)
print('Prepared diagnostic tests: bottom rail must not be keyboard-owned')
