import test, {after, before} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {makeIndexCacheFixture,makeCacheStub} from './index-cache-fixture-data.mjs';
import {loadSubject} from './harness.mjs';

let host, Plugin;
before(()=>{host=loadSubject('B',{},true);Plugin=host.subject;});
after(()=>host?.dispose());
const hash=s=>createHash('sha256').update(s).digest('hex');
// These are hashes of index-cache.json strings produced by the ORIGINAL
// frozen v5.2 SHA256:59ecad0a... reference executable, on the same fixtures.
const FROZEN_HASHES = {
  "0:normal": "9532b1c164fc1250a53965a9bacf36ca98fcc7af6ed00ed50bf2409768d5ac83",
  "1:normal": "0436e703b198480d43dde0eebc80b3457e3e9fc4fd8e78219c22ea8833d23b64",
  "10:missing": "7a0a8f1e8bcfc8dc4169e810d3a8089563aaaa91d31f07a5c08093ca2703dd0a",
  "500:normal": "93a41b6c8db09c9567c5cd9dc65ba2ab333f090cfebb97eff8e29274979f9f22",
  "1000:normal": "ef8f51c893b06071523f81c5a0e00edfe93cf5f69e7b5099401fb9b0770a009f",
  "2000:large": "589224ff5152e8b6c89894f2fdb5ea64b3c6dc9f2dfd2dab784882ca7cadb389",
  "4096:normal": "25b6f2bf60de9b446bc0a84a66efcaf392c146489bcf57ae551a41d550775f63"
};

for (const [count,variant] of [[0,'normal'],[1,'normal'],[10,'missing'],[500,'normal'],[1000,'normal'],[2000,'large'],[4096,'normal']]) {
  test(`index-cache exact byte parity with frozen v5.2: ${count} ${variant}`,async()=>{
    const fixture=makeIndexCacheFixture(count,variant);
    const writes=[];
    const stub=makeCacheStub(fixture, async (path,json)=>{writes.push({path,json});});
    const result=await Plugin.prototype.saveIndexCache.call(stub);
    assert.equal(result,true);
    assert.equal(writes.length,1);
    const {path,json}=writes[0];
    assert.equal(path,'.obsidian/plugins/gls/index-cache.json');
    assert.equal(hash(json),FROZEN_HASHES[`${count}:${variant}`], 'Exact-byte JSON contract changed');
    const parsed=JSON.parse(json);
    assert.equal(parsed.meta.length,count);
    assert.equal(Object.keys(parsed.indexData.documents).length,fixture.docs.size);
    if(count) {
      assert.equal(parsed.meta[0].path,[...fixture.metas.keys()][0]);
      assert.equal(parsed.meta[0].file,undefined,'Obsidian file objects cannot leak to cache');
    }
    assert.equal(parsed.indexData.documents['__proto__'],'dangerous-key-is-data');
  });
}

test('newest save cancels older in-progress snapshot; only latest writes',async()=>{
  const fixture=makeIndexCacheFixture(10000,'large');
  const writes=[];
  const stub=makeCacheStub(fixture,async (path,json)=>{writes.push(json);});
  const old=Plugin.prototype.saveIndexCache.call(stub);
  const newer=Plugin.prototype.saveIndexCache.call(stub);
  assert.equal(await old,false);
  assert.equal(await newer,true);
  assert.equal(writes.length,1);
});

test('new debounce request invalidates in-progress serialization without a write',async()=>{
  const fixture=makeIndexCacheFixture(9000,'large');
  const writes=[];
  const stub=makeCacheStub(fixture,async (_path,json)=>writes.push(json));
  const old=Plugin.prototype.saveIndexCache.call(stub);
  Plugin.prototype.throttleSaveCache.call(stub);
  clearTimeout(stub._persistTimer);
  stub._persistTimer=null;
  assert.equal(await old,false);
  assert.equal(writes.length,0);
});

test('unload during slicing cancels without file writes or timers',async()=>{
  const fixture=makeIndexCacheFixture(9000,'large');
  const writes=[];
  const stub=makeCacheStub(fixture,async (_path,json)=>writes.push(json));
  const job=Plugin.prototype.saveIndexCache.call(stub);
  stub._unloaded=true;
  assert.equal(await job,false);
  assert.equal(writes.length,0);
});

test('old in-flight disk write completes before newest write',async()=>{
  const fixture=makeIndexCacheFixture(1);
  const writes=[];
  let release;
  let started;
  const startedPromise=new Promise(resolve=>started=resolve);
  const gate=new Promise(resolve=>release=resolve);
  const stub=makeCacheStub(fixture,async(_path,json)=>{
    writes.push(json);
    if(writes.length===1){started();await gate;}
  });
  const first=Plugin.prototype.saveIndexCache.call(stub);
  await startedPromise;
  fixture.metas.get([...fixture.metas.keys()][0]).snippet='changed';
  const second=Plugin.prototype.saveIndexCache.call(stub);
  assert.equal(writes.length,1);
  release();
  assert.equal(await first,true);
  assert.equal(await second,true);
  assert.equal(writes.length,2);
  assert.notEqual(writes[0],writes[1]);
  assert.equal(JSON.parse(writes.at(-1)).meta[0].snippet,'changed');
});

test('future indexData schema automatically falls back to native JSON stringify',async()=>{
  const fixture=makeIndexCacheFixture(2500,'normal');
  const stub=makeCacheStub(fixture,async(_path,json)=>{stub.last=json;});
  stub.bodyIndex.serialize=()=>({documents:Object.fromEntries(fixture.docs),newSchemaMarker:123});
  assert.equal(await Plugin.prototype.saveIndexCache.call(stub),true);
  const parsed=JSON.parse(stub.last);
  assert.equal(parsed.indexData.newSchemaMarker,123);
});

test('adapter failure does not poison serial write chain',async()=>{
  const fixture=makeIndexCacheFixture(1);
  let fail=true,writes=0;
  const stub=makeCacheStub(fixture,async()=>{writes++;if(fail)throw Error('write failed');});
  assert.equal(await Plugin.prototype.saveIndexCache.call(stub),false);
  fail=false;
  assert.equal(await Plugin.prototype.saveIndexCache.call(stub),true);
  assert.equal(writes,2);
});

test('old debounce callback waiting for index flush cannot race a newer request',async()=>{
  const originalSetTimeout=host.context.setTimeout;
  const originalClearTimeout=host.context.clearTimeout;
  const timerCallbacks=new Map();let serial=0;
  host.context.setTimeout=(fn,ms)=>{const id=++serial;timerCallbacks.set(id,{fn,ms});return id;};
  host.context.clearTimeout=id=>{timerCallbacks.delete(id);};
  try {
    const fixture=makeIndexCacheFixture(1);
    const writes=[];
    const stub=makeCacheStub(fixture,async (_path,json)=>writes.push(json));
    stub.saveIndexCache=()=>Plugin.prototype.saveIndexCache.call(stub);
    let releaseFlush;
    stub._indexFlushPromise=new Promise(resolve=>releaseFlush=resolve);
    Plugin.prototype.throttleSaveCache.call(stub);
    const oldId=stub._persistTimer;
    assert.equal(timerCallbacks.get(oldId).ms,2000);
    const oldCallback=timerCallbacks.get(oldId).fn();
    await Promise.resolve();
    Plugin.prototype.throttleSaveCache.call(stub);
    const newId=stub._persistTimer;
    assert.notEqual(oldId,newId);
    releaseFlush();
    await oldCallback;
    assert.equal(writes.length,0, 'Superseded timer must not write after pending flush');
    await timerCallbacks.get(newId).fn();
    await stub._persistWriteChain;
    assert.equal(writes.length,1, 'Newer debounce writes exactly once');
  } finally {
    host.context.setTimeout=originalSetTimeout;
    host.context.clearTimeout=originalClearTimeout;
  }
});
