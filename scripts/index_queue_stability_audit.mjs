/** Deterministic production index retry/failure/lifecycle regression. */
import fs from 'node:fs';
import {loadSubject} from '../tests/harness.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const cases=[];
function claim(name,passed,evidence){cases.push({case:name,pass:Boolean(passed),evidence});console.log((passed?'PASS ':'FAIL ')+name);if(!passed)throw new Error(name+' '+JSON.stringify(evidence));}
const pathA='项目/错误文件.md',pathB='项目/正常文件.md';
async function setup(){
 const host=loadSubject('B',{files:[{path:pathA,content:'# A 旧内容\n'},{path:pathB,content:'# B 旧内容\n'}]},true);
 const plugin=new host.subject(host.host.app);await plugin.onload();await host.host.layoutReady();await plugin._flushIndexQueueNow();
 return {host,plugin,files:host.host.store};
}
async function cleanup({host,plugin}){await plugin._unloadHost();host.dispose();}
function change(file,content){file.content=content;file.stat.mtime+=999;file.stat.size=content.length;}
async function transientAndBatch(){const h=await setup(),{plugin:p,files}=h;
 try {
  const originalRead=p.getFileFullContent;
  change(files.get(pathA),'# A 新内容\n');change(files.get(pathB),'# B 新内容\n');
  let fail=true;
  p.getFileFullContent=async(file,...args)=>{
   if(file.path===pathA && fail) throw Error('simulate NAS read failure');
   return originalRead.call(p,file,...args);
  };
  p._queueFileIndex(pathA);p._queueFileIndex(pathB);
  await p._flushIndexQueueNow();
  claim('one failure does not abort another indexed file',p.fileMetaCache.get(pathB)?.mtime===files.get(pathB).stat.mtime && p.fileMetaCache.get(pathA)?.mtime!==files.get(pathA).stat.mtime,{readyB:p.fileMetaCache.get(pathB)?.mtime,waitingA:p.fileMetaCache.get(pathA)?.mtime});
  claim('transient file enters bounded retry queue',Boolean(p._indexRetryTimer)&&p._indexRetryAttempts.get(pathA)===1,{timer:!!p._indexRetryTimer,attempts:p._indexRetryAttempts.get(pathA)});
  fail=false;await sleep(410);
  claim('subsequent retry picks up changed content',p.fileMetaCache.get(pathA)?.mtime===files.get(pathA).stat.mtime && !p._indexRetryTimer && !p._indexRetryPending.size,{live:files.get(pathA).stat.mtime,indexed:p.fileMetaCache.get(pathA)?.mtime});
 } finally{await cleanup(h)}
}
async function deletedWhileWaiting(){const h=await setup(),{plugin:p,files}=h;
 try {
  p.getFileFullContent=async()=>{throw Error('simulate transient failure')};
  p._queueFileIndex(pathA);await p._flushIndexQueueNow();
  await h.host.host.app.vault.delete(files.get(pathA));
  await sleep(420);
  claim('deletion during retry evicts old record',!p.fileMetaCache.has(pathA)&&!p._indexRetryAttempts.has(pathA),{indexed:p.fileMetaCache.has(pathA),attempts:p._indexRetryAttempts.get(pathA)});
 }finally{await cleanup(h)}
}
async function boundedFailures(){const h=await setup(),{plugin:p}=h;
 try {
  let reads=0;p.getFileFullContent=async()=>{reads++;throw Error('permanent NAS outage')};
  p._queueFileIndex(pathA);await p._flushIndexQueueNow();
  // 4 retries: 250 + 500 + 1000 + 2000 ms.
  await sleep(4230);
  const attempts=p._indexRetryAttempts.get(pathA);
  claim('permanent failure stops after finite attempts',attempts===5 && reads<=5 && !p._indexRetryPending.size && !p._indexRetryTimer,{attempts,reads,timer:!!p._indexRetryTimer});
 }finally{await cleanup(h)}
}
async function unloadCancels(){const h=await setup(),{plugin:p}=h;
 let finished=false;
 try {
  p.getFileFullContent=async()=>{throw Error('read failure')};
  p._queueFileIndex(pathA);await p._flushIndexQueueNow();
  claim('scheduled retries present before unload',!!p._indexRetryTimer,{timer:!!p._indexRetryTimer});
  await cleanup(h);finished=true;
  claim('unload cancels retry and clears state',!p._indexRetryTimer&&!p._indexRetryPending.size&&!p._indexRetryAttempts.size,{timer:p._indexRetryTimer,pending:p._indexRetryPending.size});
 }finally{if(!finished)await cleanup(h)}
}
try{await transientAndBatch();await deletedWhileWaiting();await boundedFailures();await unloadCancels();}
catch(error){console.error(error);process.exitCode=1}
const report={scope:'Production-dist fixture, not real NAS or native Obsidian',passed:cases.filter(x=>x.pass).length,failed:cases.filter(x=>!x.pass).length,rows:cases};fs.writeFileSync('reports/index-queue-stability.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed},null,2));
