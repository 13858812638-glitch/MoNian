import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareSubjects, loadSubject, plain } from './harness.mjs';
prepareSubjects();

async function runWithVault(files, types, action) {
    const env = loadSubject('B', {files});
    const plugin = new env.subject.LocalSearchPlugin(env.host.app);
    env.host.app.metadataTypeManager.getPropertyInfo = key => types[key] ? {widget:types[key]} : null;
    try {
        await plugin.onload();
        await env.host.layoutReady();
        await plugin._flushIndexQueueNow();
        return await action({ plugin, env });
    } finally {
        await plugin._unloadHost();
        env.dispose();
    }
}

const properties = (env, path) => Object.fromEntries(Object.entries(plain(env.host.app.metadataCache.getFileCache(env.host.app.vault.getAbstractFileByPath(path)).frontmatter)).filter(([key]) => !key.startsWith("gls_")));

test('full write integration: A list value enters existing B text, preserves other A values', async () => {
    await runWithVault([
        {path:'a.md', properties:{A:['甲','乙'],B:'甲',untouched:'保留'}},
        {path:'b.md', properties:{A:['甲','丙'],untouched:'保留'}},
        {path:'c.md', properties:{A:['乙'],B:'丁',untouched:'保留'}}
    ], {A:'multitext',B:'text'}, async ({plugin,env}) => {
        const success=await plugin.moveVaultPropertyValueToKey('A','甲','B');
        assert.equal(success,true);
        assert.deepEqual(properties(env,'a.md'),{A:['乙'],B:'甲',untouched:'保留'});
        assert.deepEqual(properties(env,'b.md'),{A:['丙'],B:'甲',untouched:'保留'});
        assert.deepEqual(properties(env,'c.md'),{A:['乙'],B:'丁',untouched:'保留'});
    });
});

test('full write integration: A text moves into B list, never loses existing B elements', async () => {
    await runWithVault([
        {path:'a.md', properties:{A:'甲',B:['乙','丙']}},
        {path:'b.md', properties:{A:'甲',B:['甲','乙']}},
    ], {A:'text',B:'multitext'}, async ({plugin,env}) => {
        assert.equal(await plugin.moveVaultPropertyValueToKey('A','甲','B'),true);
        assert.deepEqual(properties(env,'a.md'),{B:['乙','丙','甲']});
        assert.deepEqual(properties(env,'b.md'),{B:['甲','乙']});
    });
});

test('full write integration: conflicting destination B text blocks *all* files before mutation', async () => {
    await runWithVault([
        {path:'a.md', properties:{A:'甲'}},
        {path:'b.md', properties:{A:'甲',B:'冲突'}}
    ], {A:'text',B:'text'}, async ({plugin,env}) => {
        env.host.clearTrace();
        await assert.rejects(()=>plugin.moveVaultPropertyValueToKey('A','甲','B'),/拒绝覆盖/);
        assert.deepEqual(properties(env,'a.md'),{A:'甲'});
        assert.deepEqual(properties(env,'b.md'),{A:'甲',B:'冲突'});
        const modifications=env.host.trace.filter(entry=>entry.type==='modify');
        assert.equal(modifications.length,0,'no document should be changed before global preflight');
    });
});
