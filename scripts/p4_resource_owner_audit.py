"""Read-only inventory of timer/listener/observer owner sites, not a runtime leak proof."""
import json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
src=list((ROOT/'src').rglob('*.js'))
patterns={
 'domListenerAdds':r'\.addEventListener\(',
 'domListenerRemoves':r'\.removeEventListener\(',
 'timeoutScheduled':r'\bsetTimeout\(',
 'timeoutCanceled':r'\bclearTimeout\(',
 'frameScheduled':r'\brequestAnimationFrame\(',
 'frameCanceled':r'\bcancelAnimationFrame\(',
 'pickerCleanupRegistration':r'\bregisterPickerCleanup\(',
 'pickerCleanupDisposal':r'\bdisposePickerCleanup\(',
 'observerDisconnects':r'\.disconnect\('
}
counts={name:sum(len(re.findall(p,f.read_text())) for f in src) for name,p in patterns.items()}
checks={
 'pickerPanelCleanup':('src/ui/overlays/SearchDropdownController.js',['disposePickerCleanup(panel)','_listenersCleanup?.()','_resizeObserver?.disconnect()']),
 'pluginUnload':('src/core/LocalSearchPlugin.js',['onunload()','this._indexRetryAttempts.clear()','this._timeHistorySubscribers.clear()']),
 'resultRendererRelease':('src/features/results/SearchResultRendererController.js',['destroy()','_rowResizeObserver?.disconnect()','_viewportResizeObserver?.disconnect()','_viewportInputCleanup?.()']),
 'navigatorRelease':('src/features/navigator/SearchNavigatorController.js',['destroy()','this.observer?.disconnect()','this.customization?.destroy()']),
 'windowSessionRelease':('src/ui/hosts/SearchWindowSession.js',['onClose()','this._swipeBackCleanup?.()','core?.destroy()']),
 'pickerAutoLocateFrameRelease':('src/ui/pickers/picker-shell.js',['createPickerAutoLocateScheduler(panel, list)','cancelAnimationFrame(frame)','registerPickerCleanup(panel, () => {']),
 'pickerAutoLocateFolder':('src/ui/pickers/folder-picker.js',['createPickerAutoLocateScheduler(panel, list)','queueAutoLocate(() => {']),
 'pickerAutoLocateTag':('src/features/facets/tag-picker-methods.js',['createPickerAutoLocateScheduler(panel, list)','queueAutoLocate(() => {']),
 'pickerAutoLocateProperty':('src/features/facets/property-picker-methods.js',['createPickerAutoLocateScheduler(panel, list)','queueAutoLocate(() => {'])
}
results={name:all(token in (ROOT/f).read_text() for token in tokens) for name,(f,tokens) in checks.items()}
data={'moduleCount':len(src),'counts':counts,'contractHints':results,'allStaticContractHintsPresent':all(results.values()),'note':'Counts include listeners on ephemeral DOM; add/remove counts alone do not establish leaks. These contract hints are static evidence, not an exhaustive proof of runtime teardown.'}
out=ROOT/'reports/p4-resource-owner-inventory.json'
out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(data,ensure_ascii=False,indent=2))
if not all(results.values()):raise SystemExit(1)
