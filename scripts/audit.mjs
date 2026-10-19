import fs from 'node:fs';
import {parse} from 'acorn';
import * as walk from 'acorn-walk';
import crypto from 'node:crypto';
const code=fs.readFileSync('baseline/main.js','utf8');
const ast=parse(code,{ecmaVersion:'latest',sourceType:'script',locations:true,ranges:true});
const inventory=[];
for(let i=0;i<ast.body.length;i++){
 const n=ast.body[i]; let names=[];let actual=n;
 if(n.type==='VariableDeclaration') names=n.declarations.flatMap(d=>d.id.type==='Identifier'?[d.id.name]:d.id.properties.map(p=>p.value.name));
 else if(n.id) names=[n.id.name];
 else if(n.type==='ExpressionStatement'&&n.expression.type==='AssignmentExpression'&&n.expression.right.type==='ClassExpression'){actual=n.expression.right;names=[actual.id.name];}
 const methods=actual.type.startsWith('Class')?actual.body.body.map(m=>({name:m.key?.name??m.key?.value,kind:m.kind,static:m.static,lines:[m.loc.start.line,m.loc.end.line],bytes:m.end-m.start,superUsed:code.slice(m.start,m.end).includes('super.'),start:m.start,end:m.end})):[];
 inventory.push({i,names,type:n.type,actualType:actual.type,lines:[n.loc.start.line,n.loc.end.line],bytes:n.end-n.start,start:n.start,end:n.end,methods});
}
const counts={},requires=[],globals=[],events=[],commands=[],hostRefs=[];
walk.full(ast,n=>{counts[n.type]=(counts[n.type]||0)+1;
 if(n.type==='CallExpression'&&n.callee.name==='require') requires.push({line:n.loc.start.line,value:code.slice(n.start,n.end)});
 if(n.type==='MemberExpression'&&['globalThis','window'].includes(n.object.name)) globals.push({line:n.loc.start.line,value:code.slice(n.start,n.end)});
 if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'){
   const p=n.callee.property.name;
   if(['on','trigger','off','dispatchEvent','addCommand','registerView','registerEvent','registerDomEvent','register','addEventListener','removeEventListener','setInterval','setTimeout'].includes(p)) hostRefs.push({line:n.loc.start.line,kind:p,source:code.slice(n.start,Math.min(n.end,n.start+220))});
 }
});
const result={files:['main.js','styles.css'].map(name=>{let b=fs.readFileSync('baseline/'+name);return {name,bytes:b.length,lines:b.toString().split('\n').length-1,sha256:crypto.createHash('sha256').update(b).digest('hex')}}),manifest:null,build:'2026-10-15.7',inventory,counts,requires,globals,hostRefs};
fs.writeFileSync('reports/baseline-audit.json',JSON.stringify(result,null,2));
console.log('TOP LEVEL',inventory.length,'CLASSES',inventory.filter(x=>x.methods.length).length,'FUNCTIONS',inventory.filter(x=>x.type==='FunctionDeclaration').length,'TOTAL METHODS',inventory.reduce((a,x)=>a+x.methods.length,0));
console.log('REQUIRES',JSON.stringify(requires));
for(const x of inventory)console.log(x.i,`${x.lines[0]}-${x.lines[1]}`,x.names.join(','),x.type,x.methods.length?`${x.methods.length} methods`:'');
fs.writeFileSync('reports/class-methods.txt',inventory.filter(x=>x.methods.length).map(x=>`${x.names[0]} (${x.lines.join('-')})\n`+x.methods.map(m=>`  ${m.lines.join('-')} ${m.name}${m.superUsed?' [SUPER]':''}`).join('\n')).join('\n\n'));
