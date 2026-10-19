/** Deterministic animation-frame ownership comparison. No time/FPS claims. */
import fs from 'node:fs';
import { prepareSubjects, loadSubject } from '../tests/harness.mjs';
prepareSubjects();
const subject=loadSubject('B');
const runs=[];
function probe({count,closeBeforeFrame,optimized}) {
  let id=0, requested=0, canceled=0, invoked=0, reveals=0;
  const tasks=new Map();
  const win={requestAnimationFrame(fn){const key=++id;tasks.set(key,fn);requested++;return key;},
    cancelAnimationFrame(key){if(tasks.delete(key)) canceled++;}};
  const panel={isConnected:true,ownerDocument:{defaultView:win}},list={isConnected:true};
  const enqueue=optimized?subject.subject.createPickerAutoLocateScheduler(panel,list):
    fn=>win.requestAnimationFrame(()=>{if(panel.isConnected&&list.isConnected)fn();});
  for(let i=0;i<count;i++) enqueue(()=>reveals++);
  if(closeBeforeFrame){panel.isConnected=false;if(optimized)subject.subject.disposePickerCleanup(panel);}
  const frames=[...tasks.values()];tasks.clear();for(const frame of frames){invoked++;frame();}
  if(optimized&&!closeBeforeFrame) subject.subject.disposePickerCleanup(panel);
  return {count,optimized,closeBeforeFrame,requested,canceled,invoked,reveals,pending:tasks.size};
}
for(const count of [1,10,100,400])for(const closeBeforeFrame of [false,true]){
  const baseline=probe({count,closeBeforeFrame,optimized:false});
  const candidate=probe({count,closeBeforeFrame,optimized:true});
  runs.push({count,closeBeforeFrame,baseline,candidate});
}
subject.dispose();
const output={method:'synthetic rAF callback count, old direct scheduling pattern vs actual P4 scheduler',runs,notMeasured:'FPS, wall-clock latency, iOS keyboard, real vault load'};
fs.writeFileSync('reports/p4-auto-locate-benchmark.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(runs.slice(-2),null,2));
