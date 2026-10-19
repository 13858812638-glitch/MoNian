import fs from 'node:fs';
import vm from 'node:vm';
import {build} from '../scripts/build.mjs';
const audit=JSON.parse(fs.readFileSync('reports/baseline-audit.json','utf8'));
export const originalNames=audit.inventory.slice(1).flatMap(x=>x.names);
export const classNames=audit.inventory.filter(x=>x.methods.length).map(x=>x.names[0]);
const index=JSON.parse(fs.readFileSync('reports/module-index.json','utf8'));
// Node's test runner executes independent test files concurrently. Never let a
// second worker read a partially rewritten shared subject bundle.
function writeGeneratedAtomic(destination, content) {
 const temporary = `${destination}.${process.pid}.tmp`;
 try {
  fs.writeFileSync(temporary, content);
  fs.renameSync(temporary, destination);
 } finally { if (fs.existsSync(temporary)) fs.rmSync(temporary); }
}
export function prepareSubjects(){
 fs.mkdirSync('tests/generated',{recursive:true});
 writeGeneratedAtomic('tests/subject-entry.js',index.map(x=>`export * from ${JSON.stringify('../'+x.file)};`).join('\n')+'\n');
 const temporary = `tests/generated/subject.${process.pid}.cjs`;
 try {
  build({entry:'tests/subject-entry.js',outfile:temporary,defaultExport:false});
  fs.renameSync(temporary,'tests/generated/subject.cjs');
 } finally { if (fs.existsSync(temporary)) fs.rmSync(temporary); }
 writeGeneratedAtomic('tests/generated/baseline-subject.cjs',fs.readFileSync('baseline/main.js','utf8')+'\nmodule.exports = {'+originalNames.map(n=>n==='LocalSearchPlugin'?'LocalSearchPlugin: module.exports':n).join(',')+'};\n');
}
export function loadSubject(which,config={},production=false){
 const warnings=[];const timers=new Set();
 const context=vm.createContext({console:{log(){},warn:(...a)=>warnings.push(a.map(String)),error:(...a)=>warnings.push(a.map(String))},setTimeout:(fn,ms,...args)=>{let id=setTimeout(()=>{timers.delete(id);fn(...args)},ms);timers.add(id);return id;},clearTimeout:id=>{timers.delete(id);clearTimeout(id);},setInterval,clearInterval,queueMicrotask,TextEncoder,TextDecoder,URL,performance,AbortController});
 vm.runInContext(`{ const OriginalDate = Date; globalThis.Date = class extends OriginalDate { constructor(...a) { super(...(a.length ? a : [1792000000000])); } static now() { return 1792000000000; } }; let seed=12345; Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296); }`,context);
 vm.runInContext(fs.readFileSync('tests/host.js','utf8'),context);
 const host=context.__makeHost(config);let hostCalls=0;
 context.require=name=>{if(name!=='obsidian')throw Error('Unexpected external '+name);hostCalls++;return host.obsidian;};context.module={exports:{}};context.exports=context.module.exports;
 const file=production?(which==='A'?'baseline/modular.3-main.js':'dist/main.js'):(which==='A'?'baseline/modular.3-subject.cjs':'tests/generated/subject.cjs');
 vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:10000});
 return {subject:context.module.exports,host,context,warnings,get hostRequireCalls(){return hostCalls;},dispose(){for(const t of timers)clearTimeout(t);timers.clear();}};
}
export function plain(value){return JSON.parse(JSON.stringify(value,(_k,v)=>typeof v==='bigint'?String(v):v));}
