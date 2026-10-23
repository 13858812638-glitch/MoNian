// Static inventory, not a proof of runtime alias identity or a list of defects.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import * as walk from 'acorn-walk';
const root=process.cwd();
const files=fs.readdirSync('src',{recursive:true}).filter(p=>p.endsWith('.js')).sort().map(p=>'src/'+p);
const resources=new Set(['addEventListener','removeEventListener','registerDomEvent','registerEvent','on','off','offref','subscribe','unsubscribe','setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame','queueMicrotask','observe','disconnect','register','unregister']);
const report={baselineCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'All production JS ASTs; lexical owners only. Aliases, DOM lifetime, dynamic dispatch and necessity require manual/runtime review.',files:[]};
for(const file of files){
 const source=fs.readFileSync(file,'utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true});
 const text=n=>n?source.slice(n.start,n.end):'';
 const owner=anc=>{
  const enclosing=anc.filter(n=>['ClassDeclaration','MethodDefinition','FunctionDeclaration'].includes(n.type)||(n.type==='Property'&&n.method));
  return enclosing.map(n=>text(n.key)||n.id?.name||'<anonymous>').join('.')||'<module/callback>';
 };
 const item={file,sha256:crypto.createHash('sha256').update(source).digest('hex'),lines:source.split('\n').length,imports:[],resources:[],stateWrites:[],updateCalls:[],visualWrites:[],adjacentIdenticalCalls:[]};
 walk.ancestor(ast,{
  ImportDeclaration(n){item.imports.push(n.source.value)},
  CallExpression(n,anc){
   const callee=text(n.callee),name=n.callee.property?.name||n.callee.name||'';
   const entry={line:n.loc.start.line,owner:owner(anc),target:callee,args:n.arguments.map(a=>text(a).slice(0,180))};
   if(resources.has(name))item.resources.push(entry);
   if(/(?:sync|render|refresh|notify|publish|consume|schedule|performSearch|invalidate)/i.test(name))item.updateCalls.push(entry);
   if(/(?:style\.|classList\.|setAttribute|setSearchAttribute|setDomProperty|setText|empty|replaceChildren)/.test(callee))item.visualWrites.push(entry);
   if(['add','delete','clear','set','push','splice'].includes(name)&&/^(?:this|core|owner|plugin|nav|state|filter|draft)\./.test(callee))item.stateWrites.push({...entry,operation:'collection'});
  },
  AssignmentExpression(n,anc){const target=text(n.left);if(n.left.type==='MemberExpression')item.stateWrites.push({line:n.loc.start.line,owner:owner(anc),target,operation:n.operator,value:text(n.right).slice(0,180)})},
  UpdateExpression(n,anc){item.stateWrites.push({line:n.loc.start.line,owner:owner(anc),target:text(n.argument),operation:n.operator})},
  NewExpression(n,anc){if(/Observer$/.test(text(n.callee)))item.resources.push({line:n.loc.start.line,owner:owner(anc),target:'new '+text(n.callee)})},
  BlockStatement(n){for(let i=1;i<n.body.length;i++){const a=n.body[i-1],b=n.body[i];if(a.type==='ExpressionStatement'&&b.type==='ExpressionStatement'&&a.expression.type==='CallExpression'&&text(a)===text(b))item.adjacentIdenticalCalls.push({line:a.loc.start.line,code:text(a)})}}
 });
 report.files.push(item);
}
report.summary={modules:files.length,...Object.fromEntries(['resources','stateWrites','updateCalls','visualWrites','adjacentIdenticalCalls'].map(k=>[k,report.files.reduce((n,f)=>n+f[k].length,0)]))};
const dest=process.env.GLS_OWNER_INVENTORY||'/workspace/ownership-audit/inventory.json';fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary,null,2));
