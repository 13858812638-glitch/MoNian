/** One-time mechanical extraction from the frozen upload. NOT part of the normal build. */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {parse} from 'acorn';
import crypto from 'node:crypto';
const code=fs.readFileSync('baseline/main.js','utf8');
const audit=JSON.parse(fs.readFileSync('reports/baseline-audit.json','utf8'));
const deps=JSON.parse(fs.readFileSync('reports/symbol-dependencies.json','utf8'));
const inv=audit.inventory;
const mapping=new Map();
const own=(a,b,file)=>{for(let i=a;i<=b;i++)mapping.set(i,file);};
own(1,2,'core/view-types');own(3,3,'ui/components/indicator-label');own(4,4,'utils/text-collator');
own(5,10,'features/results/virtualization-config');own(11,11,'features/results/SparseHeightIndex');own(12,13,'integrations/public-contract');
own(14,24,'features/sort/sort-model');own(25,26,'core/session-values');own(27,41,'data/time/time-values');own(42,42,'data/index/index-version');
own(43,52,'data/properties/property-types');own(53,54,'utils/normalization');own(55,61,'utils/dom');own(62,67,'ui/components/input-controls');own(68,68,'utils/normalization');
own(69,74,'data/tags/tag-values');own(75,76,'utils/vault-paths');own(77,79,'features/folders/folder-colors');own(80,83,'features/folders/exclusions');
own(84,91,'features/results/view-config');own(92,92,'features/filters/pool-config');own(93,98,'ui/pickers/icon-catalog');own(99,106,'features/filters/pool-config');own(107,109,'features/results/view-config');
own(110,119,'features/navigator/toolbar-config');own(120,120,'core/default-settings');own(121,123,'data/formats/drawing-detection');own(124,131,'utils/markdown-text');
own(132,132,'services/IoPool');own(133,133,'data/index/BodyIndex');own(134,134,'features/search/QueryState');own(135,145,'features/filters/filter-state');
own(146,155,'data/formats/file-types');own(156,161,'data/formats/drawing-content');own(162,164,'data/formats/file-types');own(165,176,'utils/search-text');
own(177,177,'data/tags/tag-values');own(178,190,'data/properties/property-values');own(191,196,'features/create/create-model');own(197,198,'features/filters/pool-values');own(199,201,'ui/pickers/template-picker');
own(202,206,'features/filters/pool-values');own(207,207,'utils/preferred-order');own(208,216,'data/properties/property-values');
own(217,217,'ui/pickers/tree-row');own(218,221,'utils/preferred-order');own(222,222,'interactions/PointerSortCoordinator');own(223,227,'data/folders/folder-tree');
own(228,230,'ui/pickers/picker-shell');own(231,235,'interactions/scroll-anchor');own(236,236,'ui/pickers/tree-row');own(237,241,'ui/components/view-composer');
own(242,242,'ui/pickers/folder-picker');own(243,244,'ui/dialogs/dialog-surface');own(245,245,'ui/pickers/tree-row');own(246,249,'data/tags/tag-tree');
own(250,250,'utils/tree-match');own(251,256,'data/properties/property-catalog');own(257,258,'data/properties/raw-mutations');own(259,259,'ui/components/property-state');
own(260,260,'features/filters/FilterEngine');own(261,261,'features/search/ResultRanker');own(262,264,'services/BatchMetadataService');
own(265,266,'ui/pickers/picker-header');own(267,268,'ui/pickers/header-modes');own(269,271,'ui/pickers/selection-mode');own(272,272,'ui/pickers/selection-strip');own(273,273,'ui/pickers/tree-row');
own(274,274,'ui/pickers/icon-picker');own(275,276,'ui/dialogs/submission');own(277,277,'ui/overlays/geometry');own(278,278,'ui/pickers/count-rail');own(279,281,'ui/dialogs/dialog-session');
own(282,282,'ui/pickers/sort-mode');own(283,284,'core/picker-cleanup');own(285,292,'interactions/swipe-back');own(293,294,'ui/pickers/picker-shell');own(295,295,'ui/overlays/geometry');own(296,298,'ui/overlays/popup-order');
const classPaths={
 SearchDropdownController:'ui/overlays/SearchDropdownController',BatchMetadataController:'features/batch/BatchMetadataController',SearchFacetController:'features/facets/SearchFacetController',SearchSortController:'features/sort/SearchSortController',SearchResultControlsController:'features/result-controls/SearchResultControlsController',SwipeActionCoordinator:'interactions/SwipeActionCoordinator',SearchResultRendererController:'features/results/SearchResultRendererController',SearchCreateController:'features/create/SearchCreateController',SearchSelectionController:'features/selection/SearchSelectionController',SharedSearchStateCoordinator:'core/SharedSearchStateCoordinator',NavigatorCustomization:'features/navigator/NavigatorCustomization',SearchNavigatorController:'features/navigator/SearchNavigatorController',SearchCore:'core/SearchCore',MobileFrameController:'ui/mobile/mobile-frame',SearchWorkspaceCapabilities:'integrations/SearchWorkspaceCapabilities',SearchView:'ui/views/SearchView',SearchWindowSession:'ui/hosts/SearchWindowSession',SearchModalHost:'ui/hosts/modal-host',SearchFloatingHost:'ui/hosts/floating-host',LocalSearchOverlayHost:'ui/overlays/LocalSearchOverlayHost',LocalSearchSettingTab:'ui/settings/LocalSearchSettingTab',FileOperationService:'services/FileOperationService',OperationOverlayController:'ui/overlays/OperationOverlayController',LocalSearchPlugin:'core/LocalSearchPlugin',SortFeedback:'interactions/sort-feedback'};
for(const x of inv)if(classPaths[x.names[0]])mapping.set(x.i,classPaths[x.names[0]]);
own(304,307,'interactions/SwipeActionCoordinator');own(311,311,'features/selection/SearchSelectionController');own(314,314,'core/ui-reference-keys');own(315,319,'features/navigator/customization-model');own(323,325,'ui/mobile/mobile-frame');
mapping.set(324,'ui/mobile/mobile-frame');own(328,328,'ui/hosts/modal-chrome');own(333,334,'ui/settings/setting-row');own(339,340,'interactions/hover-hints');
// Split mixed large classes by existing responsibilities. Bodies and parameters remain byte-for-byte.
const splitSpecs={
 LocalSearchPlugin:{base:'features/plugin', groups:[
 ['tree-maintenance','setPickerSiblingOrder','deleteVaultTagTreePrefix'],
 ['property-maintenance','_withPropertyCatalogMutation','_renameVaultPropertyValue'],
 ['file-command-actions','_commandSearchSelectionCore','_openCurrentFileOperation'],
 ['workspace-entry','_enforceWorkspaceSingleton','_activateWorkspaceView'],
 ['search-history','recoverSearchSession','deleteSearchQuery'],
 ['recent-history-state','_normalizeRecentOpened','_remapRecentOpenedHistory'],
 ['path-lifecycle','_replacePathPrefix','_handleFileRename'],
 ['notifications','_throttleSaveActivity','_refreshPickerOrderConsumers'],
 ['project-catalog','_publishIndexChanges','patchExternalProperties'],
 ['index-queue','_queueFileIndex','_flushIndexQueue'],
 ['time-cache','_readFileProperties','_flushContentTimeCacheSave'],
 ['metadata-directory','_pluginDirectory','changeMetadataDirectory'],
 ['markdown-write-tracking','_markdownTimeFromFile','_timeRecordValid'],
 ['non-markdown-metadata','_nonMarkdownPropertyRecord','_deleteNonMarkdownTimes'],
 ['external-properties','registerVirtualProperties','moveExternalFiles'],
 ['recent-history-storage','markOpenedFromExternal','saveRecentOpenedHistory'],
 ['content-cache','_writablePluginDirectory','throttleSaveCache'],
 ['file-index','_updateSingleFile','fullRebuildMetaCache'],
 ['view-preferences','_captureActiveResultViewAnchors','cycleActiveResultView'],
 ['external-search','_normalizeExternalSearchRequest','toggleSearchModal'],
 ['settings-storage','_normalizeSettingsInPlace','saveSettings'],
 ['index-storage','_clearResidentSearchResults','loadIndexCache']
 ],keep:['constructor','onload','onunload']},
 SearchCore:{base:'core/search',groups:[
 ['shell','popupSurfaceHost','_buildWorkspaceLayout'],
 ['result-menu-events','_getResultFileMenuContext','_bindResultEvents'],
 ['input-and-filters','_initializeResultState','_onFilterChanged'],
 ['file-actions','_findCurrentResult','deleteFiles'],
 ['session','_captureCurrentModalSession','_persistCurrentModalView'],
 ['search-and-ranking','_shouldCloseAfterFileOpen','performSearch'],
 ['open-selection','_resolveResultElement','clearSelected']
 ],keep:['constructor','_clearUiRefs','destroy','close']},
 SearchFacetController:{base:'features/facets',groups:[
 ['sidebar-maintenance','sidebarMaintenanceModes','runSidebarMaintenance'],['picker-model','_syncHeaderCount','_buildPropertyTreeModel'],
 ['tag-picker','openTimePicker','openTagPicker'],['property-picker','openPropertyPicker','renderPinnedPropertyFilters'],
 ['type-picker','openAttachmentTypePicker','syncFilterButtons'],['folder-colors','_resultFolderDefaultColor','_openFolderColorEditor'],
 ['folder-picker','_showManagedFolderDropdown','updateFolderButton']
 ],keep:['constructor','destroy']},
 BatchMetadataController:{base:'features/batch',groups:[
 ['mutation-flow','editablePaths','_activateBatchPickerSearch'],['tag-editor','_renderTagPicker','_renderTagPicker'],['property-editor','_renderPropertyPicker','open']
 ],keep:['constructor','_destroyed','destroy']},
 SearchResultControlsController:{base:'features/result-controls',groups:[
 ['toolbar','ownsAnchor','activeViewConfig'],['filter-pool-editor','filterPools','_toggleFilterPoolValue'],
 ['view-composer','refreshFilterPoolHeader','sync'],['search-history','openHistoryDropdown','_applyHistoryQuery']
 ],keep:['constructor','destroy']},
 SearchResultRendererController:{base:'features/results',groups:[
 ['viewport-geometry','getScrollTop','_handleViewportResize'],['viewport-anchors','captureViewportAnchor','restoreViewportAnchor'],
 ['virtual-window','renderInitialPage','refreshChangedRows'],['page-and-snippets','renderCurrentView','renderPage'],
 ['filter-channels','_renderFilterPoolHeader','_syncFilterToolbarEntries'],['card-metadata','_appendHighlightedTitle','_appendMetaFields'],
 ['result-card','_buildResultItem','navigateResults']
 ],keep:['constructor','destroy']},
 SearchCreateController:{base:'features/create',groups:[
 ['draft-and-metadata','captureDraft','remapTemplatePaths'],['input-mode','_refreshCreatePreview','submitCreateView'],
 ['preview','renderQuickCreatePreview','_effectiveCreateFilterState'],['payload','_sanitizeTitle','_createMetadataSnapshot'],['create-file','createNewNote','createNewNote']
 ],keep:['constructor','destroy']},
};
const hostNames=new Set(inv[0].names);
const symbolOwner=new Map();for(const x of inv)if(x.i)for(const name of x.names)symbolOwner.set(name,mapping.get(x.i));
for(const x of inv)if(x.i&&!mapping.get(x.i))throw Error('Unmapped '+x.i+' '+x.names);
let modules=new Map();const parts=[];
function add(file,p){if(!modules.has(file))modules.set(file,[]);modules.get(file).push(p);parts.push({...p,file});}
const checksum=s=>crypto.createHash('sha256').update(s).digest('hex');
for(const x of inv){
 if(!x.i)continue;
 const name=x.names[0],file=mapping.get(x.i),spec=splitSpecs[name];
 const prevEnd=x.i?inv[x.i-1].end:0;let prefix=code.slice(prevEnd,x.start);
 const usedDeps=new Set(x.names.flatMap(n=>deps[n]?.deps||[])); for(const n of x.names)usedDeps.delete(n);
 if(!spec){add(file,{id:name,names:x.names,deps:[...usedDeps],text:prefix+'export '+code.slice(x.start,x.end),original:code.slice(x.start,x.end),range:[x.start,x.end],lineRange:x.lines,kind:'declaration'});continue;}
 const ast=parse(code.slice(x.start,x.end),{ecmaVersion:'latest'});const classNode=x.actualType==='ClassExpression'?ast.body[0].expression.right:ast.body[0];
 const methodMap=new Map(x.methods.map(m=>[m.name,m]));const assignment=new Map();
 for(const [group,first,last] of spec.groups){
  const a=x.methods.findIndex(m=>m.name===first),b=x.methods.findIndex(m=>m.name===last);if(a<0||b<a)throw Error(`${name} range ${group}`);
  for(const m of x.methods.slice(a,b+1)){if(assignment.has(m.name))throw Error('Duplicate '+m.name);assignment.set(m.name,group);}
 }
 for(const m of x.methods){if(!assignment.has(m.name)&&!spec.keep.includes(m.name))throw Error(`Unassigned method ${name}.${m.name}`);}
 const kept=x.methods.filter(m=>spec.keep.includes(m.name));
 let shellDeps=new Set(kept.flatMap(m=>deps[name].methods.find(q=>q.name===m.name)?.deps||[]));
 // Base class reference occurs outside the methods.
 if(classNode.superClass?.name)shellDeps.add(classNode.superClass.name);shellDeps.delete(name);
 let classText=prefix+`export class ${name}`+(classNode.superClass?` extends ${classNode.superClass.name}`:'')+' {\n';
 for(const m of kept){
  const idx=x.methods.indexOf(m),lastEnd=idx?x.methods[idx-1].end:x.start+classNode.body.start+1;
  const before=code.slice(lastEnd,m.start);
  classText+=before+code.slice(m.start,m.end)+'\n';
  parts.push({file,id:`${name}.${m.name}`,kind:'method',original:code.slice(m.start,m.end),range:[m.start,m.end],lineRange:m.lines});
 }classText+='}\n';
 const groups=[]; const extraImports=[];
 for(const [group] of spec.groups){
  const members=x.methods.filter(m=>assignment.get(m.name)===group);if(!members.length)continue;
  const groupPath=spec.base+'/'+group+'-methods',groupName=name+'_'+group.replace(/-/g,'_')+'_methods';groups.push(groupName);
  const refs=new Set(members.flatMap(m=>deps[name].methods.find(q=>q.name===m.name)?.deps||[]));
  if(refs.has(name))throw Error('Self class import cycle: '+name+' '+group);
  let body='// Instance method owner. `this` is the unchanged '+name+' instance. No additional state store.\nexport const '+groupName+' = {\n';
  for(const m of members){if(m.superUsed||m.static||m.name.startsWith('#'))throw Error('Unsafe extraction '+name+'.'+m.name);
   const idx=x.methods.indexOf(m),lastEnd=idx?x.methods[idx-1].end:x.start+classNode.body.start+1;
   body+=code.slice(lastEnd,m.start)+code.slice(m.start,m.end)+',\n';
   parts.push({file:groupPath,id:`${name}.${m.name}`,kind:'method',original:code.slice(m.start,m.end),range:[m.start,m.end],lineRange:m.lines});
  }body+='};\n';add(groupPath,{id:groupName,names:[groupName],deps:[...refs],text:body,kind:'composition-group'});
  symbolOwner.set(groupName,groupPath);shellDeps.add(groupName);
 }
 shellDeps.add('composeClassMethods');
 // Restore baseline own-property ordering as well as descriptor flags.
 classText+=`\ncomposeClassMethods(${name}, [${groups.join(', ')}], ${JSON.stringify(x.methods.filter(m=>m.name!=='constructor').map(m=>m.name))});\n`;
 add(file,{id:name,names:[name],deps:[...shellDeps],text:classText,kind:'class-shell',lineRange:x.lines});
}
symbolOwner.set('composeClassMethods','core/compose-class-methods');
add('core/compose-class-methods',{id:'composeClassMethods',names:['composeClassMethods'],deps:[],kind:'engineering',text:`/** Bind single-owner method groups without delegation wrappers or new instance state.
 * Preserve the original prototype chain, method identity, length, names, getters,
 * non-enumerability and original own-key order. Reject duplicate/missing methods.
 * Methods using super/private fields MUST stay in the native class declaration.
 */
export function composeClassMethods(Target, groups, order) {
    const proto = Target.prototype;
    const descriptors = Object.getOwnPropertyDescriptors(proto);
    delete descriptors.constructor;
    for (const group of groups) {
        for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(group))) {
            if (Object.prototype.hasOwnProperty.call(descriptors, key)) throw new Error('Duplicate method: ' + Target.name + '.' + key);
            descriptors[key] = { ...descriptor, enumerable: false };
        }
    }
    if (new Set(order).size !== order.length || order.length !== Object.keys(descriptors).length)
        throw new Error('Invalid composition order: ' + Target.name);
    for (const key of Object.keys(descriptors)) {
        if (Object.prototype.hasOwnProperty.call(proto, key)) delete proto[key];
    }
    for (const key of order) {
        if (!Object.prototype.hasOwnProperty.call(descriptors, key)) throw new Error('Missing method: ' + Target.name + '.' + key);
        Object.defineProperty(proto, key, descriptors[key]);
    }
    return Target;
}
`});
function graph(){const g={};for(const [f,units]of modules){g[f]=[...new Set(units.flatMap(p=>p.deps).filter(n=>!hostNames.has(n)).map(n=>{let o=symbolOwner.get(n);if(!o)throw Error('Missing owner '+n+' in '+f);return o;}).filter(o=>o!==f))];}return g;}
function scc(g){let seq=0,idx=new Map,low=new Map,stack=[],active=new Set,out=[];function visit(v){idx.set(v,seq);low.set(v,seq++);stack.push(v);active.add(v);for(const w of g[v]){if(!idx.has(w)){visit(w);low.set(v,Math.min(low.get(v),low.get(w)));}else if(active.has(w))low.set(v,Math.min(low.get(v),idx.get(w)));}if(low.get(v)===idx.get(v)){let group=[],w;do{w=stack.pop();active.delete(w);group.push(w);}while(w!==v);if(group.length>1)out.push(group);}}for(const v of Object.keys(g))if(!idx.has(v))visit(v);return out;}
const merges=[];
for(let loop=0;loop<10;loop++){
 const cycles=scc(graph());if(!cycles.length)break;
 for(const cycle of cycles){
  // Function-level graph is acyclic; these SCCs are only coarse-group dependencies.
  // Colocate coupled normalization/row primitive groups instead of adding runtime indirection.
  const dest=cycle.includes('features/filters/pool-config')?'features/filters/pool-model':cycle.includes('ui/pickers/tree-row')?'ui/pickers/tree-primitives':cycle.slice().sort()[0];
  let all=[];for(const f of cycle){all.push(...modules.get(f));modules.delete(f);for(const p of parts)if(p.file===f)p.file=dest;}
  modules.set(dest,all);for(const [sym,owner]of symbolOwner)if(cycle.includes(owner))symbolOwner.set(sym,dest);merges.push({cycle,dest});
 }
}
if(scc(graph()).length)throw Error('Unresolved cycles');
fs.rmSync('src',{recursive:true,force:true});fs.mkdirSync('src',{recursive:true});
let index=[],checkLog=[];
for(const [file,units]of [...modules].sort((a,b)=>a[0].localeCompare(b[0]))){
 const refs=[...new Set(units.flatMap(p=>p.deps))].filter(n=>!units.some(p=>p.names.includes(n)));
 const imports=new Map();for(const name of refs){let target=hostNames.has(name)?'obsidian':symbolOwner.get(name);if(target===file)continue;
  if(target!=='obsidian'){target=path.posix.relative(path.posix.dirname(file),target+'.js');if(!target.startsWith('.'))target='./'+target;}
  if(!imports.has(target))imports.set(target,[]);imports.get(target).push(name);
 }
 const text='// Engineering extraction from frozen GLS Navigator 2026-10-15.7.\n// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.\n'+[...imports].sort().map(([p,names])=>`import { ${names.sort().join(', ')} } from ${JSON.stringify(p)};`).join('\n')+'\n'+units.map(p=>p.text).join('\n')+'\n';
 const out='src/'+file+'.js';fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,text);
 parse(text,{ecmaVersion:'latest',sourceType:'module'});
 const compiled=ts.transpileModule(text,{fileName:out,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.CommonJS}});
 if(compiled.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Compile failure '+file);
 checkLog.push({file:out,syntax:'PASS',moduleCompile:'PASS'});
 index.push({file:out,exports:units.flatMap(p=>p.names),dependencies:[...imports.keys()],lines:text.split('\n').length-1,bytes:Buffer.byteLength(text),origins:parts.filter(p=>p.file===file&&p.range).map(p=>({id:p.id,kind:p.kind,lineRange:p.lineRange,sha256:checksum(p.original)}))});
}
fs.writeFileSync('src/main.js','// Composition root: lifecycle remains in core/LocalSearchPlugin.js.\nexport { LocalSearchPlugin as default } from "./core/LocalSearchPlugin.js";\n');
fs.mkdirSync('src/styles',{recursive:true});fs.copyFileSync('baseline/styles.css','src/styles/styles.css');
const origin=parts.filter(p=>p.range).map(({original,...p})=>({...p,file:'src/'+p.file+'.js',sha256:checksum(original)}));
fs.writeFileSync('reports/module-index.json',JSON.stringify(index,null,2));
fs.writeFileSync('reports/source-origins.json',JSON.stringify(origin,null,2));
fs.writeFileSync('reports/module-graph.json',JSON.stringify(graph(),null,2));
fs.writeFileSync('reports/extraction-checks.json',JSON.stringify(checkLog,null,2));
fs.writeFileSync('reports/grouping-decisions.json',JSON.stringify(merges,null,2));
fs.writeFileSync('scripts/extraction-spec.json',JSON.stringify({mapping:[...mapping],splitSpecs},null,2));
console.log('Source JS modules:',modules.size+1,'groups merged:',merges,'Original trace records:',origin.length);
console.log('Largest modules:',index.sort((a,b)=>b.lines-a.lines).slice(0,12).map(x=>x.file+' '+x.lines).join('\n'));
