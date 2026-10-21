import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSubjects,loadSubject} from './harness.mjs';
if (!process.env.GLS_TEST_EXISTING_SUBJECT) prepareSubjects();
const runtime=loadSubject('B');
const {SharedSearchStateCoordinator,FilterState}=runtime.subject;
test.after(()=>runtime.dispose());

function setup() {
    const plugin = {settings:{}, _throttleSaveActivity(){}};
    const shared = new SharedSearchStateCoordinator(plugin);
    const core = desktopSidebar => ({sharedSearchState:true,navigator:{desktopSidebar},
        queryState:{raw:'',set(value){this.raw=value}},filterState:new FilterState(),
        searchInput:{value:''},sortField:'created',sortDirection:'desc',_browseSortField:'created',
        bodyExpanded:false,scrollReads:0,resultRenderer:{isNativeScrolling(){this.reads++;return false},reads:0},
        _notifyStateChange(){}});
    return {shared, sidebar:core(true), tab:core(false)};
}

test('desktop sidebar publishes an already applied folder without reading result layout; peers still follow',async()=>{
    const {shared,sidebar,tab}=setup();shared.attach(sidebar);shared.attach(tab);
    sidebar.resultRenderer.reads=0;
    sidebar.filterState.folder='Projects';shared.publish(sidebar);await Promise.resolve();
    assert.equal(sidebar.resultRenderer.reads,0);
    assert.deepEqual([...tab.filterState.folders],['Projects']);
    assert.equal(shared.members.get(sidebar).applied,shared.revision);
});

test('stale sidebar merges its folder with another host query and waits for its open picker',async()=>{
    const {shared,sidebar,tab}=setup();shared.attach(sidebar);shared.attach(tab);
    sidebar.dropdown={isOpen:true};
    tab.queryState.set('new query');tab.searchInput.value='new query';shared.publish(tab);await Promise.resolve();
    sidebar.filterState.folder='Projects';shared.publish(sidebar);await Promise.resolve();
    assert.equal(sidebar.queryState.raw,'');
    assert.ok(shared.members.get(sidebar).applied<shared.revision);
    sidebar.dropdown.isOpen=false;shared.consume(sidebar);
    assert.equal(sidebar.queryState.raw,'new query');
    assert.deepEqual([...sidebar.filterState.folders],['Projects']);
});
