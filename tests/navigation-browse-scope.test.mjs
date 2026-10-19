import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {prepareSubjects, loadSubject} from './harness.mjs';
let subject, applet;
before(()=>{prepareSubjects();applet=loadSubject('B');subject=applet.subject;});
after(()=>applet?.dispose());

const items = [
 {path:'卫康/周报.md', tags:['工作'], properties:{笔记类型:'周报', 负责人:'佳佳'}},
 {path:'卫康/方案.md', tags:['方案'], properties:{笔记类型:'方案', 负责人:'壮壮'}},
 {path:'卫康/流程.md', tags:['工作','流程'], properties:{笔记类型:'SOP', 负责人:'佳佳'}},
 {path:'鞋垫/周报.md', tags:['工作'], properties:{笔记类型:'周报', 负责人:'张填'}},
 {path:'鞋垫/方案.md', tags:['方案'], properties:{笔记类型:'方案', 负责人:'张填'}},
 {path:'根笔记.md', tags:[], properties:{笔记类型:'灵感'}}
];
function makeCore() {
 const filterState = new subject.FilterState();
 const searchInput={value:''};
 const core={
   plugin:{ fileMetaCache:new Map(items.map(x=>[x.path,x])), _searchMeta: meta=>meta },
   filterState, searchInput, searchTimer:null,
   queryState:{raw:'',normalized:'',active:false},
   _prepareResultVisibility:()=>({folders:[],attachments:[]}),
   _isResultMetaVisible:()=>true,
   _onFilterChanged(){this._filterUpdates=(this._filterUpdates||0)+1},
   performSearch(value){this.queryState.raw=value; this.queryState.active=!!value;},
   _normalizeTagSelection:newSet=>newSet,
   _navigationCandidates(...args){return subject.SearchCore.prototype._navigationCandidates.apply(this,args)},
   _selectBrowseFolder(...args){return subject.SearchCore.prototype._selectBrowseFolder.apply(this,args)},
   _applyFacetSelection(...args){return subject.SearchCore.prototype._applyFacetSelection.apply(this,args)},
   _applyFacetSelectionToState(...args){return subject.SearchCore.prototype._applyFacetSelectionToState.apply(this,args)}
 };
 return core;
}
test('navigation catalog ignores search and precision refinements, folder is its only scope',()=>{
 const core=makeCore();
 core.filterState.folder='卫康';
 core.filterState.tags.add('不存在');
 core.filterState.properties.set('笔记类型',new Set(['周报']));
 core.filterState.fileTypes.add('canvas');
 core.filterState.dateRange={field:'created',from:'2026-10-01',to:'2026-10-04'};
 core.searchInput.value='毫无命中'; core.queryState.raw='毫无命中';
 const result=core._navigationCandidates();
 assert.equal(result.all.length,6);
 assert.deepEqual(Array.from(result.scope,x=>x.path),['卫康/周报.md','卫康/方案.md','卫康/流程.md']);
 assert.deepEqual(new Set(result.scope.flatMap(x=>x.properties.笔记类型)),new Set([...['周报','方案','SOP'].flat()]));
 assert.equal(subject.FilterEngine.matches(result.scope[0],core.filterState),false);
});
test('switching folder replaces browse scope, drops temporary refinements and query',()=>{
 const core=makeCore();
 core.filterState.folder='卫康';
 core.filterState.tags.add('工作');
 core.filterState.properties.set('笔记类型',new Set(['周报']));
 core.filterState.fileTypes.add('canvas');
 core.filterState.dateRange={field:'created',from:'2026-10-01',to:''};
 core.searchInput.value='旧关键字';
 core._selectBrowseFolder('鞋垫');
 assert.equal(core.filterState.folder,'鞋垫');
 assert.equal(core.filterState.tags.size,0);
 assert.equal(core.filterState.properties.size,0);
 assert.equal(core.filterState.fileTypes.size,0);
 assert.equal(core.filterState.dateRange,null);
 assert.equal(core.searchInput.value,'');
 assert.equal(core._navigationCandidates().scope.length,2);
 core._selectBrowseFolder('鞋垫');
 assert.equal(core.filterState.folders.size,0,'clicking same folder enters all-files scope');
 assert.equal(core._navigationCandidates().scope.length,6);
});
test('single selection replaces or clears its own facet while other property keys remain',()=>{
 const core=makeCore();
 core._applyFacetSelection('property','周报',{key:'笔记类型',mode:'replace'});
 core._applyFacetSelection('property','佳佳',{key:'负责人',mode:'replace'});
 core._applyFacetSelection('property','方案',{key:'笔记类型',mode:'replace'});
 assert.deepEqual([...core.filterState.properties.get('笔记类型')],['方案']);
 assert.deepEqual([...core.filterState.properties.get('负责人')],['佳佳']);
 core._applyFacetSelection('property','方案',{key:'笔记类型',mode:'remove'});
 assert.equal(core.filterState.properties.has('笔记类型'),false);
 assert.equal(core.filterState.properties.has('负责人'),true);
});
test('explicit tag multi-select is OR, while property keys remain AND',()=>{
 const core=makeCore();
 const draft=core.filterState.clone();
 draft.tags=new Set(['工作','方案']);
 assert.equal(subject.commitFacetSelectionState(core.filterState,draft,'tag'),true);
 assert.equal(core.filterState.tagMatchMode,'any');
 assert.equal(subject.FilterEngine.matchesTags(items[0],core.filterState.tags,core.filterState.tagMatchMode),true);
 assert.equal(subject.FilterEngine.matchesTags(items[1],core.filterState.tags,core.filterState.tagMatchMode),true);
 assert.equal(subject.FilterEngine.matchesTags(items[5],core.filterState.tags,core.filterState.tagMatchMode),false);
 core.filterState.properties.set('笔记类型',new Set(['周报','方案']));
 core.filterState.properties.set('负责人',new Set(['佳佳']));
 assert.equal(subject.FilterEngine.matches(items[0],core.filterState),true);
 assert.equal(subject.FilterEngine.matches(items[1],core.filterState),false);
});
test('folder multi-selection also resets temporary tags/properties/time without changing folder OR',()=>{
 const core=makeCore();
 core.filterState.tags.add('工作');
 core.filterState.properties.set('笔记类型',new Set(['周报']));
 const draft=core.filterState.clone();
 draft.folders=new Set(['卫康','鞋垫']);
 assert.equal(subject.commitFacetSelectionState(core.filterState,draft,'folder'),true);
 assert.deepEqual(Array.from(core.filterState.folders),['卫康','鞋垫']);
 assert.equal(core.filterState.tags.size,0);
 assert.equal(core.filterState.properties.size,0);
 assert.equal(core._navigationCandidates().scope.length,5);
});
