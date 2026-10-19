import fs from 'node:fs';
import ts from 'typescript';
const path='baseline/main.js';
const program=ts.createProgram([path],{allowJs:true,checkJs:true,noEmit:true,target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.CommonJS});
const checker=program.getTypeChecker(), file=program.getSourceFile(path);
const audit=JSON.parse(fs.readFileSync('reports/baseline-audit.json','utf8'));
const symMap=new Map(), nameNode=new Map();
for(const st of file.statements){
 if(ts.isVariableStatement(st)) for(const decl of st.declarationList.declarations){
  function bind(n){ if(ts.isIdentifier(n)){ const s=checker.getSymbolAtLocation(n);symMap.set(s,n.text);nameNode.set(n.text,decl);} else if(ts.isObjectBindingPattern(n)||ts.isArrayBindingPattern(n)) for(const x of n.elements) if(x.name) bind(x.name); } bind(decl.name);
 } else if((ts.isFunctionDeclaration(st)||ts.isClassDeclaration(st))&&st.name){symMap.set(checker.getSymbolAtLocation(st.name),st.name.text);nameNode.set(st.name.text,st);}
 else if(ts.isExpressionStatement(st)&&ts.isBinaryExpression(st.expression)&&ts.isClassExpression(st.expression.right))nameNode.set(st.expression.right.name.text,st.expression.right);
}
const result={};
for(const [name,node] of nameNode){
 const refs=new Set();let writes=[],thisReads=new Set(),thisCalls=new Set(),globalCalls=new Set();
 function visit(n){
  if(ts.isIdentifier(n)){const symbol=checker.getSymbolAtLocation(n); const dep=symMap.get(symbol);if(dep&&dep!==name)refs.add(dep);}
  if(ts.isCallExpression(n)){if(ts.isPropertyAccessExpression(n.expression)&&n.expression.expression.kind===ts.SyntaxKind.ThisKeyword) thisCalls.add(n.expression.name.text);else if(ts.isIdentifier(n.expression))globalCalls.add(n.expression.text);}
  if(ts.isPropertyAccessExpression(n)&&n.expression.kind===ts.SyntaxKind.ThisKeyword)thisReads.add(n.name.text);
  if(ts.isBinaryExpression(n)&&[ts.SyntaxKind.EqualsToken,ts.SyntaxKind.PlusEqualsToken,ts.SyntaxKind.MinusEqualsToken].includes(n.operatorToken.kind))if(ts.isPropertyAccessExpression(n.left)&&n.left.expression.kind===ts.SyntaxKind.ThisKeyword) writes.push(n.left.name.text);
  ts.forEachChild(n,visit);
 }visit(node);
 let methods=[];if(ts.isClassLike(node))for(const m of node.members){const deps=new Set();ts.forEachChild(m,function rec(n){if(ts.isIdentifier(n)){let d=symMap.get(checker.getSymbolAtLocation(n));if(d)deps.add(d);}ts.forEachChild(n,rec)});methods.push({name:m.name?.getText(file)||'constructor',deps:[...deps].sort()});}
 result[name]={deps:[...refs].sort(),writes:[...new Set(writes)].sort(),thisReads:[...thisReads].sort(),thisCalls:[...thisCalls].sort(),globalCalls:[...globalCalls].sort(),methods};
}
fs.writeFileSync('reports/symbol-dependencies.json',JSON.stringify(result,null,2));
const diagnostics=program.getSemanticDiagnostics(file).filter(d=>[2304,2552,18004].includes(d.code)).map(d=>({code:d.code,line:file.getLineAndCharacterOfPosition(d.start).line+1,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));
fs.writeFileSync('reports/baseline-unresolved.json',JSON.stringify(diagnostics,null,2));
console.log('Resolved top-level symbols:',Object.keys(result).length,'Baseline unresolved names:',diagnostics.length);
console.log(diagnostics);
console.log('Plugin references',result.LocalSearchPlugin.deps.join(', '));
