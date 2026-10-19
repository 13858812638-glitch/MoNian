// GLS P3: synthetic, pure-JS mounted-card refresh work; not an Obsidian/iOS FPS test.
import {performance} from 'node:perf_hooks';
import {prepareSubjects,loadSubject} from '../tests/harness.mjs';
import fs from 'node:fs';
prepareSubjects();
const applet=loadSubject('B');
const {SearchResultRendererController}=applet.subject;
const sizes=[2000,10000,30000];
const out={node:process.version,method:'SearchResultRendererController.refreshChangedRows',measurements:[]};
function median(values){const a=[...values].sort((x,y)=>x-y);return (a[(a.length-1)>>1]+a[a.length>>1])/2;}
try {
 for(const n of sizes){
   const fullResults=Array.from({length:n},(_,i)=>({path:`文件/${String(i).padStart(7,'0')}.md`,id:i}));
   const from=Math.floor(n/2)-16;
   let current=0;
   const shells=[];
   const elements=Array.from({length:32},(_,i)=>{
      const position=from+i;
      const shell={dataset:{virtualPosition:String(position)},replaceWith(replacement){current++;}};
      shells.push(shell);
      return {dataset:{path:fullResults[position].path},closest:()=>shell};
   });
   const core={
      fullResults,renderedResults:fullResults.slice(from,from+32),resultEls:[...elements],
      resultsContainer:{querySelectorAll:()=>elements,ownerDocument:{createDocumentFragment:()=>({})}},
      _resultGeneration:4,queryState:{active:false},sortField:'name',selection:{syncControls(){}},
   };
   const renderer=Object.create(SearchResultRendererController.prototype);
   renderer.owner=core;renderer._unobserveShell=()=>{};
   renderer._buildResultItem=(_idx,_frag,pos)=>({ _lsSwipeShell:{_lsResultBinding:{syncAllExpanded(){} }},__pos:pos });
   renderer.queueLazySnippetFill=()=>{};
   const change=new Set([fullResults[from+15].path]);
   // Warm up JS VM and inline caches; restore shape on every iteration.
   const times=[];
   for(let j=0;j<30;j++){
      core.renderedResults=fullResults.slice(from,from+32);
      core.resultEls=[...elements];
      const start=performance.now();
      renderer.refreshChangedRows(change);
      const dt=performance.now()-start;
      if(j>=5)times.push(dt);
   }
   if(current!==30)throw new Error(`Bad replaced count ${current}`);
   out.measurements.push({size:n,medianMs:+median(times).toFixed(4),minMs:+Math.min(...times).toFixed(4),maxMs:+Math.max(...times).toFixed(4),iterations:25,rowsMounted:32,pathsChanged:1});
 }
}finally{applet.dispose();}
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
