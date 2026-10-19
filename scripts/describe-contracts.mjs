import fs from 'node:fs';
import {parse} from 'acorn';
import * as walk from 'acorn-walk';
const source=fs.readFileSync('baseline/main.js','utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'script',locations:true});
const origins=JSON.parse(fs.readFileSync('reports/source-origins.json'));
const ownerFor=(start,end)=>origins.filter(r=>r.range[0]<=start&&r.range[1]>=end).sort((a,b)=>(a.range[1]-a.range[0])-(b.range[1]-b.range[0]))[0]?.file||null;
const commands=[],views=[],events=[],classes=[],globals=[];let publicApi=[],capabilities=[];
walk.simple(ast,{
 CallExpression(n){const c=n.callee;if(c.type!=='MemberExpression')return;const method=c.property.name;if(method==='addCommand'){const o=n.arguments[0];commands.push({line:n.loc.start.line,fields:Object.fromEntries((o?.properties||[]).filter(p=>p.value?.type==='Literal').map(p=>[p.key.name||p.key.value,p.value.value]))});}if(method==='registerView')views.push({line:n.loc.start.line,args:n.arguments.map(x=>source.slice(x.start,x.end))});if(['on','trigger'].includes(method)&&n.arguments[0]?.type==='Literal')events.push({line:n.loc.start.line,method,name:n.arguments[0].value});},
 AssignmentExpression(n){if(n.left?.type==='MemberExpression'&&n.left.property.name==='externalSearchApi'&&n.right.type==='CallExpression'){const obj=n.right.arguments[0];publicApi=(obj.properties||[]).map(p=>({name:p.key.name,definition:source.slice(p.value.start,p.value.end),line:p.loc.start.line}));}},
 VariableDeclarator(n){if(n.id?.name==='EXTERNAL_SEARCH_API_CAPABILITIES')capabilities=n.init.arguments[0].elements.map(x=>x.value);},
 ClassDeclaration(n){capture(n);},ClassExpression(n){capture(n);}
});
function capture(n){classes.push({name:n.id.name,extends: n.superClass?source.slice(n.superClass.start,n.superClass.end):null,methods:n.body.body.map(m=>{const calls=new Set(),state=new Set();walk.simple(m.value.body,{CallExpression(c){if(c.callee.type==='MemberExpression'&&c.callee.object.type==='ThisExpression')calls.add(c.callee.property.name);},MemberExpression(v){if(v.object.type==='ThisExpression')state.add(v.property.name||source.slice(v.property.start,v.property.end));}});return {name:m.key.name||m.key.value,kind:m.kind,static:m.static,signature:source.slice(m.start,m.value.body.start).trim(),line:m.loc.start.line,module:ownerFor(m.start,m.end),directThisCalls:[...calls].sort(),instanceReadsAndWrites:[...state].sort()};})});}
fs.writeFileSync('reports/public-contracts.json',JSON.stringify({publicApiVersion:18,pluginManifest:'not supplied: ID/name/version/minAppVersion/isDesktopOnly unknown',publicApi,capabilities,commands,views,events,classes},null,2));
console.log('Public contract inventory:',publicApi.length,'API keys;',commands.length,'commands;',classes.length,'classes');
