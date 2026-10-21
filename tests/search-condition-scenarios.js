/* Maintenance acceptance oracles: baseline defects are measured, not asserted as desired behavior. */
window.auditFresh=async function(){
 if(window.C) C.destroy();
 const host=document.querySelector('#host');host.replaceChildren();host.className='';
 window.C=new S.SearchCore(H.app,P,host,{hostKind:'sidebar',sharedSearchState:false,persistModalSession:false,allowCreate:true,closeAfterFileOpen:false});
 await C.init(); await C.performSearch(''); C.navigator.showResults(false); await waitFixture(60);
};
window.auditState=()=>({query:C.queryState.raw,input:C.searchInput.value,filter:C.filterState.toSnapshot(),searchFilter:C.createFlow.searchResultFilterState().toSnapshot(),derived:C.createFlow.isDerivedCreateView(),explicit:C.createFlow.isCreateMode(),results:C.fullResults.map(x=>x.path),railHidden:C.propertyFilterRow.hidden,clearHidden:C.clearFiltersBtn.hidden,chips:C.activeFilterWrap.textContent,chipCount:C.activeFilterWrap.childElementCount,channels:C.resultChannelHost.textContent,channelsHidden:C.resultChannelHost.hidden,page:C.navigator.page,layout:C.navigator.layout,counts:Object.fromEntries([...C.navigator.sections].map(([k,v])=>[k,Number(v.summary.firstChild?.textContent)])),generation:C._resultGeneration,cacheRevision:C.navigator._cacheRevision,searchTimer:!!C.searchTimer});
window.auditQuery=async text=>{C.searchInput.value=text; await C.performSearch(text); await waitFixture(65);};
window.auditFacet=async(kind,value,key='')=>{C._applyFacetSelection(kind,value,{key});C._onFilterChanged();await waitFixture(65);};
window.auditErase=async()=>{C.containerEl.querySelector('[data-ls-input-action="clear-input"]').click();await waitFixture(90);};
window.auditReturn=async mode=>{
 if(mode==='back'&&C.navigator.layout==='mobile')C.navigator.back();
 else C.navigator.tools.get(mode==='collapse'?'collapse':'filters').button.click();
 await waitFixture(100);
};
window.auditCases={
 'pure-title-query-no-condition-rail':async()=>{await auditQuery('周报');return{pass:C.propertyFilterRow.hidden&&C.clearFiltersBtn.hidden&&C.fullResults.length===1,evidence:auditState()};},
 'zero-query-default-create-no-phantom-condition':async()=>{await auditQuery('不存在的词甲');return{pass:C.createFlow.isDerivedCreateView()&&C.propertyFilterRow.hidden,evidence:auditState()};},
 'mixed-title-body-switch-still-works':async()=>{await auditQuery('鞋垫');const buttons=[...C.resultChannelHost.querySelectorAll('button')];const before=C.renderedResults.map(x=>x.path);buttons[1]?.click();const after=C.renderedResults.map(x=>x.path);return{pass:buttons.length===2&&C.bodyExpanded&&before.join()!==after.join()&&C.clearFiltersBtn.hidden,evidence:{...auditState(),before,after}};},
 'draft-folder-eraser-restores-empty-search-state':async()=>{await auditQuery('不存在的词甲');await auditFacet('folder','资料');const draft=auditState();await auditErase();return{pass:!C.createFlow.isCreateView()&&!C.filterState.active&&C.propertyFilterRow.hidden&&C.activeFilterWrap.childElementCount===0&&C.fullResults.length===6,evidence:{draft,after:auditState()}};},
 'draft-tags-eraser-discards-draft-only-chip':async()=>{await auditQuery('不存在的词甲');await auditFacet('tag','运动');await auditErase();return{pass:!C.filterState.active&&C.activeFilterWrap.childElementCount===0&&C.propertyFilterRow.hidden,evidence:auditState()};},
 'draft-property-eraser-discards-draft-only-chip':async()=>{await auditQuery('不存在的词甲');await auditFacet('property','卫康','所属项目');await auditErase();return{pass:!C.filterState.active&&C.activeFilterWrap.childElementCount===0&&C.propertyFilterRow.hidden,evidence:auditState()};},
 'draft-eraser-restores-original-real-filter':async()=>{await auditFacet('folder','项目');await auditQuery('不存在的词甲');await auditFacet('folder','资料');await auditErase();return{pass:C.filterState.folders.has('项目')&&!C.filterState.folders.has('资料')&&C.activeFilterWrap.textContent.includes('项目')&&!C.activeFilterWrap.textContent.includes('资料')&&C.fullResults.length===2,evidence:auditState()};},
 'draft-new-query-restores-chip-projection':async()=>{await auditQuery('不存在的词甲');await auditFacet('folder','资料');await auditQuery('周报');return{pass:!C.createFlow.isCreateView()&&!C.filterState.active&&C.activeFilterWrap.childElementCount===0&&C.fullResults[0]?.path==='项目/周报.md',evidence:auditState()};},
 'real-filter-clear-remains-functional':async()=>{await auditFacet('folder','资料');C.clearFiltersBtn.click();await waitFixture(90);return{pass:!C.filterState.active&&C.fullResults.length===6&&C.propertyFilterRow.hidden,evidence:auditState()};},
 'toolbar-return-clears-query-and-refreshes-counts':async()=>{await auditQuery('不存在的词甲');await auditReturn('filters');return{pass:C.queryState.raw===''&&C.searchInput.value===''&&C.fullResults.length===6&&C.navigator.sections.get('folder').summary.firstChild?.textContent==='6'&&C.navigator.sections.get('tags').summary.firstChild?.textContent==='6'&&C.propertyFilterRow.hidden,evidence:auditState()};},
 'toolbar-return-keeps-real-filter-not-draft':async()=>{await auditFacet('folder','项目');await auditQuery('不存在的词甲');await auditFacet('folder','资料');await auditReturn('filters');return{pass:C.queryState.raw===''&&C.filterState.folders.has('项目')&&C.activeFilterWrap.textContent.includes('项目')&&!C.activeFilterWrap.textContent.includes('资料')&&C.fullResults.length===2&&C.navigator.sections.get('tags').summary.firstChild?.textContent==='2',evidence:auditState()};},
 'back-route-uses-the-same-query-reset':async()=>{await auditQuery('周报');await auditReturn('back');return{pass:C.queryState.raw===''&&C.navigator.page==='filters'&&C.fullResults.length===6,evidence:auditState()};},
 'collapse-preserves-desktop-search-and-resets-mobile-page':async()=>{await auditQuery('周报');await auditReturn('collapse');const mobile=C.navigator.layout==='mobile';return{pass:mobile?C.queryState.raw===''&&C.navigator.page==='filters'&&C.fullResults.length===6:C.queryState.raw==='周报'&&C.searchInput.value==='周报'&&C.fullResults.length===1,evidence:auditState()};},
 'pending-debounce-cannot-revive-returned-query':async()=>{await auditQuery('周报');C.searchInput.value='鞋垫';C.searchInput.dispatchEvent(new InputEvent('input',{bubbles:true}));await auditReturn('filters');await waitFixture(200);return{pass:C.queryState.raw===''&&C.searchInput.value===''&&!C.searchTimer&&C.fullResults.length===6,evidence:auditState()};},
 'pending-new-word-then-facet-uses-live-input':async()=>{await auditQuery('周报');C.searchInput.value='鞋垫';C.searchInput.dispatchEvent(new InputEvent('input',{bubbles:true}));C._applyFacetSelection('folder','资料');C._onFilterChanged();await waitFixture(240);return{pass:C.queryState.raw==='鞋垫'&&C.searchInput.value==='鞋垫'&&!C.createFlow.isCreateView()&&C.fullResults.length===2,evidence:auditState()};},
 'clear-uses-committed-query-even-if-dom-already-empty':async()=>{await auditQuery('周报');C.searchInput.value='';const cleared=C._clearSearchContext();await waitFixture(90);return{pass:cleared&&C.queryState.raw===''&&C.fullResults.length===6,evidence:{cleared,...auditState()}};},
 'composition-facet-does-not-submit-partial-word':async()=>{C.searchInput.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));C.searchInput.value='鞋';C.searchInput.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));await auditFacet('folder','资料');const deferred=C.queryState.raw==='';C.searchInput.value='鞋垫';C.searchInput.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));await waitFixture(230);return{pass:deferred&&C.queryState.raw==='鞋垫'&&C.fullResults.length===2,evidence:{deferred,...auditState()}};},
 'explicit-create-back-is-single-level':async()=>{await auditFacet('folder','资料');C.createFlow.enterCreateMode();await waitFixture(60);if(C.navigator.layout==='mobile')C.navigator.back();else C.createFlow.toggleInputMode({focusInput:false});await waitFixture(100);return{pass:!C.createFlow.isCreateMode()&&C.navigator.page==='results'&&C.filterState.folders.has('资料'),evidence:auditState()};},
 'repeated-draft-enter-exit-no-ghost-chips':async()=>{const input=C.searchInput;for(let i=0;i<5;i++){await auditQuery('不存在的词'+i);await auditFacet('folder','资料');await auditErase();}return{pass:C.searchInput===input&&C.activeFilterWrap.childElementCount===0&&!C.createFlow.isCreateView()&&C.fullResults.length===6,evidence:auditState()};},
 'unload-cancels-pending-search-and-projection':async()=>{C.searchInput.value='鞋垫';C.searchInput.dispatchEvent(new InputEvent('input',{bubbles:true}));const old=C;old.destroy();await waitFixture(220);return{pass:old._destroyed&&old.searchTimer===null&&old.navigator===null&&!P.activeSearchCores.has(old),evidence:{destroyed:old._destroyed,timer:old.searchTimer,registered:P.activeSearchCores.has(old)}};}
};
window.auditOpenPicker=async function(kind){
 // Desktop navigation stays visible alongside results. Anchor to its actual
 // section control, not the mobile-only Return button hidden in the top rail.
 const section=kind.endsWith('folder')?'folder':kind.endsWith('tags')?'tags':'properties';
 const anchor=C.navigator.layout==='mobile'?C.navigator.tools.get('filters').button:C.navigator.sections.get(section).manage;
 if(kind.startsWith('create-'))await auditQuery('不存在的词甲');
 if(kind.endsWith('folder'))C.facets.showFolderDropdown({anchor});
 else if(kind.endsWith('tags'))C.facets.openTagPicker({anchor});
 else if(kind==='property-value')C.facets.openPropertyPicker('所属项目',anchor,{mode:'quick-value'});
 else C.facets.openPropertyPicker('',anchor);
 await waitFixture(160);
};
// Listener accounting covers global document/window listeners created after the
// fixture has loaded; DOM-owned listeners are intentionally not treated as leaks.
window.auditCases['picker-cycle-global-listener-release']=async()=>{
 const proto=EventTarget.prototype,add=proto.addEventListener,remove=proto.removeEventListener;
 const records=[];const globalTarget=t=>t===window||t===document||t===window.visualViewport;
 const capture=o=>typeof o==='boolean'?o:!!o?.capture;
 proto.addEventListener=function(t,f,o){if(globalTarget(this)&&!records.some(x=>x.target===this&&x.type===t&&x.fn===f&&x.capture===capture(o)))records.push({target:this,type:t,fn:f,capture:capture(o)});return add.call(this,t,f,o);};
 proto.removeEventListener=function(t,f,o){const i=records.findIndex(x=>x.target===this&&x.type===t&&x.fn===f&&x.capture===capture(o));if(i>=0)records.splice(i,1);return remove.call(this,t,f,o);};
 try{
  for(let i=0;i<5;i++){C.facets.showFolderDropdown({anchor:C.searchInput});await waitFixture(40);C.dropdown.close(false);await waitFixture(40);}
  C.destroy();await waitFixture(100);
  return{pass:records.length===0,evidence:{remainingGlobalListeners:records.map(x=>({type:x.type,capture:x.capture,target:x.target===window?'window':x.target===document?'document':'visualViewport'}))}};
 }finally{proto.addEventListener=add;proto.removeEventListener=remove;}
};
window.auditCases['already-filter-page-return-clears-dormant-query']=async()=>{
 C.navigator.setPage('filters');await waitFixture(50);await auditQuery('周报');
 C.navigator.tools.get('filters').button.click();await waitFixture(100);
 return{pass:C.queryState.raw===''&&C.searchInput.value===''&&C.fullResults.length===6&&C.navigator.page==='filters',evidence:auditState()};
};
