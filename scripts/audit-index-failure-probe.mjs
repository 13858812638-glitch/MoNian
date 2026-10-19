import {loadSubject} from '../tests/harness.mjs';
const path='项目/追踪.md';
const h=loadSubject('B',{files:[{path,content:'# 旧内容\nA',properties:{所属项目:'卫康'}}]},true);
const p=new h.subject(h.host.app);
try {
  await p.onload(); await h.host.layoutReady(); await p._flushIndexQueueNow();
  const f=h.host.store.get(path);
  const old=p.fileMetaCache.get(path);
  if(!old)throw Error('No initial meta');
  f.content='# 已变更内容\nB';f.stat.mtime+=10000;f.stat.size=f.content.length;
  const originalRead=p.getFileFullContent;
  p.getFileFullContent=async()=>{throw Error('模拟一次 NAS/IO 读取失败')};
  p._queueFileIndex(path); await p._flushIndexQueueNow();
  const before={pending:p._indexQueue.size,oldMtime:old.mtime,liveMtime:f.stat.mtime,metaMtime:p.fileMetaCache.get(path)?.mtime,hasScheduledRetry:!!p._indexRetryTimer};
  p.getFileFullContent=originalRead;
  await new Promise(r=>setTimeout(r,550));
  const after={pending:p._indexQueue.size,oldMtime:old.mtime,liveMtime:f.stat.mtime,metaMtime:p.fileMetaCache.get(path)?.mtime,hasScheduledRetry:!!p._indexRetryTimer};
  const result={before,after,stale:after.liveMtime!==after.metaMtime,logs:h.warnings};
  console.log(JSON.stringify(result,null,2));
  if(result.stale || before.hasScheduledRetry !== true || after.hasScheduledRetry)throw Error('Failed index was not recovered after transient read error');
  await p._unloadHost();
}finally{h.dispose()}
