/** Compare frozen P1 and P1+P2 bundles. Run from either Source directory.
 * Synthetic in-memory vault, no Obsidian/UI/NAS I/O. Metrics are wall time for
 * SearchCore._recomputeCurrentResults(), not FPS or actual UI response time.
 */
import {performance} from 'node:perf_hooks';
import {loadSubject} from '../tests/harness.mjs';

const host=loadSubject('B');
const {SearchCore,FilterState}=host.subject;
const sizes=[2000,10000,30000];
function makeMeta(i,n){
  const name=`材料${String((i*157)%n).padStart(6,'0')}-${String(i).padStart(6,'0')}`;
  return {path:`部门${i%17}/${name}.md`,name,nameLower:name.toLowerCase(),extension:'md',tags:['#工作'],properties:{},
    ctime:1750000000000+(i*137%12379)*1000, fileModifiedAt:1751000000000+(i*71%11321)*1000,
    contentModifiedAt:1751500000000+(i*31%10567)*1000, textCount:1,body:'文本内容'};
}
function setup(size,sort){
  const core=Object.create(SearchCore.prototype);
  const cache=new Map();for(let i=0;i<size;i++){const m=makeMeta(i,size);cache.set(m.path,m);}
  core.queryState={raw:'',normalized:'',active:false,intent:'',units:[]};
  core.sortField=sort;core.sortDirection='asc';core.filterState=new FilterState();
  core._prepareResultVisibility=()=>({});core._isResultMetaVisible=()=>true;
  core.plugin={fileMetaCache:cache,bodyIndex:{get:()=>''},_searchMeta:x=>x,settings:{keepSearchResultsInMemory:false,recentOpened:[]}};
  core.createFlow=null;core._resultGeneration=0;core.loadedPaths=new Set();
  core.resultRenderer={_snippetInFlight:new Map()};
  core.selection={selectedPaths:new Set()};
  core.resultControls={sync(){}};core.navigator=null;core.bodyExpanded=false;
  const initial=core._rankCandidates(cache.values(),core.queryState,core.filterState);
  core.fullResults=initial.best;core.bestResultCount=initial.bestCount;core.bodyResultCount=initial.bodyCount;
  core._resultGeneration=1;
  const keys=[...cache.keys()];return {core,cache,keys};
}
function median(nums){const a=[...nums].sort((a,b)=>a-b);return a[Math.floor(a.length/2)];}
const output=[];
for(const sort of ['name','created']) {
  for(const size of sizes) {
    const {core,cache,keys}=setup(size,sort);
    const elapsed=[];
    for(let i=0;i<13;i++) {
      const key=keys[(71+i*991)%keys.length],meta=cache.get(key);
      // Force one affected row to move in time-based mode; name mode is a
      // metadata-only update whose sort key remains identical.
      cache.set(key, {...meta,textCount:i+1,ctime:sort==='created'?1750000000000+ (i%2 ? 999999999 : -999999999) : meta.ctime});
      const st=performance.now();
      core._recomputeCurrentResults({changedPaths:new Set([key])});
      const ms=performance.now()-st;
      if(i>=3)elapsed.push(ms);
    }
    const orderedPaths=core.fullResults.map(row=>row.path);
    output.push({sort,size,iterations:elapsed.length,medianMs:+median(elapsed).toFixed(3),
      p95Ms:+[...elapsed].sort((a,b)=>a-b)[Math.floor(elapsed.length*0.95)].toFixed(3),
      rows:orderedPaths.length,first:orderedPaths[0],last:orderedPaths.at(-1)});
  }
}
console.log(JSON.stringify({version:process.env.GLS_RANKING_VERSION||'unknown',node:process.version,
  process:process.platform,config:{warmup:3,samples:10,sorts:['name','created']},results:output},null,2));
host.dispose();
