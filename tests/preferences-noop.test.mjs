import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSubjects, loadSubject} from './harness.mjs';
prepareSubjects();
const runtime = loadSubject('B');
test.after(() => runtime.dispose());

function fixture() {
    const {LocalSearchPlugin, DEFAULT_SETTINGS} = runtime.subject;
    const plugin = Object.create(LocalSearchPlugin.prototype);
    plugin.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    const calls = {capture: 0, views: 0, pools: 0, sort: 0, save: 0};
    plugin._captureActiveResultViewAnchors = () => { calls.capture++; return new Map(); };
    plugin._refreshActiveResultViewCores = () => { calls.views++; };
    plugin._refreshFilterPoolCores = () => { calls.pools++; };
    plugin._refreshResultSortCores = () => { calls.sort++; };
    plugin.saveSettings = async () => { calls.save++; return true; };
    return {plugin, calls};
}

for (const [name, invoke] of [
    ['active view', p => p.setActiveResultView(p.settings.activeResultView)],
    ['view patch', p => p.updateActiveResultViewConfig({})],
    ['view reset already at defaults', p => p.resetActiveResultView()],
    ['filter pools', p => p.setFilterPools(p.settings.filterPools)],
    ['sort preferences', p => p.setResultSortPreferences({})]
]) test(`unchanged ${name} does not measure, project or persist`, async () => {
    const {plugin, calls} = fixture();
    const settings = JSON.stringify(plugin.settings);
    await invoke(plugin);
    assert.equal(JSON.stringify(plugin.settings), settings);
    assert.deepEqual(calls, {capture: 0, views: 0, pools: 0, sort: 0, save: 0});
});

test('changed view and config commit once; resetting changed config still works', async () => {
    const {plugin, calls} = fixture();
    await plugin.setActiveResultView('compact');
    assert.equal(plugin.settings.activeResultView, 'compact');
    await plugin.updateActiveResultViewConfig({snippetLines: 2});
    assert.equal(plugin.settings.resultViews.compact.snippetLines, 2);
    assert.equal(await plugin.resetActiveResultView(), undefined);
    assert.equal(plugin.settings.resultViews.compact.snippetLines, 0);
    assert.deepEqual(calls, {capture: 3, views: 3, pools: 0, sort: 0, save: 3});
});
