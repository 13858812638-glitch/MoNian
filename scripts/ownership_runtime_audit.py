"""Audit call ownership and retained UI identity. Observations, not latency scores."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(os.environ.get('GLS_OWNER_OUT','/workspace/ownership-audit/runtime'));OUT.mkdir(parents=True,exist_ok=True)
scope={'__file__':str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0],scope)
install='''()=>{
 const defs=[['core',C,['_notifyStateChange','_recomputeCurrentResults','performSearch','_syncResultStateRow','_syncSearchHeaderControls','_refreshCurrentResultsAfterMutation']],
 ['nav',C.navigator,['sync','_syncMobileTools','_renderProjection','refreshPreferences','syncPage','setPage','_scopeTitle','resize']],
 ['facets',C.facets,['syncFilterButtons','renderPinnedPropertyFilters','syncTypeButtons']],
 ['controls',C.resultControls,['sync','syncInputActions','refreshFilterPoolHeader']],
 ['renderer',C.resultRenderer,['renderPage','refreshResultChannels','_renderStateChannels','_syncWindowToViewport']],
 ['sort',C.sorting,['sync','normalize','applyField']],['selection',C.selection,['syncControls','updateStats']],
 ['shared',P.sharedSearchState,['_capture','_normalize','publish','consume','schedule','_remember']],
 ['plugin',P,['_refreshFolderStateCores','_publishIndexChanges','_flushIndexQueue','saveSettings']]];
 const restores=[],stack=[];let active=null;
 for(const [prefix,obj,names] of defs)for(const name of names){if(typeof obj?.[name]!=='function')continue;const old=obj[name];
 obj[name]=function(...args){const key=prefix+'.'+name;if(active){active.calls[key]=(active.calls[key]||0)+1;if(key==='renderer.renderPage')active.renderStates.push({mainHidden:C.navigator.main.hidden,page:C.navigator.page,generation:C._resultGeneration});
 const edge=(stack.at(-1)||'<event>')+' -> '+key;active.edges[edge]=(active.edges[edge]||0)+1;}stack.push(key);
 try{return old.apply(this,args)}finally{stack.pop()}};restores.push(()=>obj[name]=old)}
 const mo=new MutationObserver(records=>{if(active)active.records.push(...records)});
 window.audit={start(name){active={name,calls:{},edges:{},records:[],renderStates:[]};mo.observe(C.containerEl,{subtree:true,childList:true,attributes:true,characterData:true,attributeOldValue:true})},
 async end(){await waitFixture(100);active.records.push(...mo.takeRecords());mo.disconnect();
 const a=active;active=null;const writes={};for(const r of a.records){const key=r.type+':'+(r.attributeName||'')+':'+r.target.nodeName;writes[key]=(writes[key]||0)+1}
 return {name:a.name,calls:a.calls,edges:a.edges,mutations:a.records.length,writes,renderStates:a.renderStates};},destroy(){mo.disconnect();for(const r of restores)r()}};
}'''
reports=[]
# This is a baseline defect reproduction, not an acceptance test that blesses these counts.
# Re-evaluate these assertions when the implementation changes.
def verify_observations(report):
 phases={p['name']:p for p in report['phases']}
 checks={
  'folder_sync_enters_more_than_once':phases['folder-switch']['calls'].get('nav.sync',0)>1,
  'disclosure_sync_enters_twice':phases['child-disclosure']['calls'].get('nav.sync')==2,
  'same_sort_invalidates_navigation_without_search':phases['same-sort']['calls'].get('nav.refreshPreferences')==1 and phases['same-sort']['calls'].get('core.performSearch',0)==0,
  'exclude_only_recomputes_twice':phases['exclude-only']['calls'].get('core._recomputeCurrentResults')==2,
  'channel_keyboard_loses_button_focus':not phases['channel-keyboard-switch']['identity']['oldConnected'] and not phases['channel-keyboard-switch']['identity']['focusInsideChannels'],
  'retry_acknowledges_before_dom_recovery':report['sharedFailure']['retryRenders']==0 and report['sharedFailure']['immediateOldRows'] and report['sharedFailure']['afterRetry']['applied']==report['sharedFailure']['afterRetry']['revision'],
 }
 if report['mobile']:
  states=phases['folder-switch']['renderStates']
  checks['mobile_same_generation_renders_hidden_then_visible']=len(states)==2 and states[0]['mainHidden'] and not states[1]['mainHidden'] and states[0]['generation']==states[1]['generation']
 report['baselineReproductionChecks']=checks
 assert all(checks.values()),checks

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mobile in [False,True]:
  ctx,p=scope['boot'](browser,mobile=mobile);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.evaluate(install)
  rows=[]
  def phase(name,code):
   p.evaluate('n=>audit.start(n)',name);p.evaluate(code);x=p.evaluate('audit.end()');rows.append(x);return x
  phase('folder-switch',"C.navigator.select('folder','Folder001')")
  if mobile:p.evaluate("C.navigator.setPage('filters',false)");p.wait_for_timeout(100)
  p.evaluate("()=>{const n=C.navigator;n.collapsed.delete('folder');n.renderRevision=-1;n.sync()}");p.wait_for_timeout(150)
  phase('child-disclosure',"[...C.navigator.sections.get('folder').rows.values()].find(x=>x._navOptions?.hasChildren).toggle.click()")
  phase('group-disclosure',"C.navigator.sections.get('folder').chevron.click()")
  phase('same-page',"C.navigator.setPage(C.navigator.page,false)")
  p.evaluate("C.sorting.applyField('created')");p.wait_for_timeout(150)
  phase('same-sort',"C.sorting.applyField('created')")
  phase('noop-notify',"C._notifyStateChange()")
  phase('exclude-only',"P.setExcludedFolders(['Folder005'])")
  p.evaluate("P.setExcludedFolders([])");p.wait_for_timeout(200)
  p.evaluate('''async()=>{C.filterState.clear();await H.app.vault.create('Folder000/needle.md','plain');await H.app.vault.create('Folder001/body-match.md','needle');await P._flushIndexQueueNow();C.searchInput.value='needle';C.performSearch('needle');C.navigator.setPage('results',false);await waitFixture(200)}''')
  channels=p.evaluate('''()=>({best:C.bestResultCount,body:C.bodyResultCount,count:C.resultChannelHost.querySelectorAll('button').length})''')
  assert channels['count']==2,channels
  p.evaluate("window.channelButton=C.resultChannelHost.querySelectorAll('button')[1];channelButton.focus();audit.start('channel-keyboard-switch')")
  p.locator('.local-search-result-channel').nth(1).press('Enter')
  x=p.evaluate('audit.end()');x['identity']=p.evaluate('''()=>({oldConnected:channelButton.isConnected,focusedOld:document.activeElement===channelButton,focusInsideChannels:C.resultChannelHost.contains(document.activeElement),bodyExpanded:C.bodyExpanded,activeTag:document.activeElement.tagName})''');rows.append(x)
  # A single failing build is injected at the normal result-builder boundary.
  shared=p.evaluate('''async()=>{
   audit.destroy();C.filterState.clear();C.searchInput.value='';C.performSearch('');await waitFixture(100);
   const v=new S.SearchView({app:H.app},P,S.TAB_VIEW_TYPE);document.body.append(v.containerEl);v.containerEl.style.height='800px';v.contentEl.style.height='100%';await v.onOpen();await waitFixture(100);
   const other=v.core,co=P.sharedSearchState,m=co.members.get(other),old=other.resultRenderer._buildResultItem;
   const beforeRows=other.resultEls.map(el=>el.dataset.path||el.textContent);
   // Publish the model via the normal source host while the peer is legitimately blocked.
   Object.defineProperty(other.selection,'busy',{configurable:true,value:true});
   C.searchInput.value='needle';C.performSearch('needle');await Promise.resolve();delete other.selection.busy;
   let throws=0;other.resultRenderer._buildResultItem=function(){throws++;throw new Error('AUDIT intentional builder failure')};
   let error='';try{co.consume(other)}catch(e){error=e.message}finally{other.resultRenderer._buildResultItem=old}
   const afterFailure={query:other.queryState.raw,applied:m.applied,revision:co.revision,rowsPreserved:JSON.stringify(beforeRows)===JSON.stringify(other.resultEls.map(el=>el.dataset.path||el.textContent))};
   const captureAfterFailure=co._capture(other),target=co.state;let retryRenders=0;const render=other.resultRenderer.renderPage;other.resultRenderer.renderPage=function(...args){retryRenders++;return render.apply(this,args)};const retried=co.consume(other);const immediateOldRows=JSON.stringify(beforeRows)===JSON.stringify(other.resultEls.map(el=>el.dataset.path||el.textContent));await waitFixture(50);
   const afterRetry={query:other.queryState.raw,applied:m.applied,revision:co.revision,oldRowsStillVisible:JSON.stringify(beforeRows)===JSON.stringify(other.resultEls.map(el=>el.dataset.path||el.textContent)),modelCount:other.fullResults.length,domCount:other.resultEls.length};
   await v.onClose();v.containerEl.remove();return {throws,error,afterFailure,retried,afterRetry,immediateOldRows,retryRenders,captureAfterFailure,target};
  }''')
  p.evaluate('V.onClose()');p.wait_for_timeout(50);reports.append({'mobile':mobile,'phases':rows,'channels':channels,'sharedFailure':shared,'pageErrors':errors});ctx.close()
 browser.close()
for report in reports: verify_observations(report)
assert all(not r['pageErrors'] for r in reports), reports
(OUT/'results.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')
for r in reports:print(json.dumps({'mobile':r['mobile'],'calls':{x['name']:x['calls'] for x in r['phases']},'channelIdentity':r['phases'][-1]['identity'],'sharedFailure':r['sharedFailure'],'pageErrors':r['pageErrors']},ensure_ascii=False))
