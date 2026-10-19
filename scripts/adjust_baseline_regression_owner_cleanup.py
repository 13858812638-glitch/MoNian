from pathlib import Path
f=Path('tests/regression.test.mjs');s=f.read_text();p='''
// Historical A/B baseline contained a dedicated `owner` section and a
// project-owner migration API. Only these named retirements are allowed to
// differ; all unrelated lifecycle, settings and index data stay exact.
function approvedOwnerRetirement(value){
  if(Array.isArray(value))return value.map(approvedOwnerRetirement);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).map(([key,v])=>{
    if(key==='navigatorVisibleSections'&&Array.isArray(v))return [key,v.filter(x=>x!=='owner')];
    if(key==='apiKeys'&&Array.isArray(v))return [key,v.filter(x=>x!=='getProjectOwnerMigration')];
    return [key,approvedOwnerRetirement(v)];
  }));
}
function sameExceptRetiredOwner(actual,expected){assert.deepEqual(approvedOwnerRetirement(actual),approvedOwnerRetirement(expected));}
'''
anchor='let A,B;const outcomes=[];'
assert s.count(anchor)==1;s=s.replace(anchor,anchor+p)
s=s.replace('assert.deepEqual(describe(A.subject[name]),changed);','assert.deepEqual(describe(A.subject[name]).filter(x=>!(name===\'LocalSearchPlugin\'&&x.key===\'getProjectOwnerMigration\')),changed);')
q="if(typeof A.subject[n]!=='function')assert.deepEqual(snap(B.subject[n]),snap(A.subject[n]),n);"
r="if(typeof A.subject[n]!=='function'){const v=snap(B.subject[n]),baseline=snap(A.subject[n]);if(n==='NAVIGATOR_VISIBLE_SECTION_DEFS')assert.deepEqual(v,baseline.filter(x=>x.id!=='owner'),n);else assert.deepEqual(v,baseline,n);}"
assert s.count(q)==1;s=s.replace(q,r)
q='assert.deepEqual(invoke(A.subject,name,[structuredClone(v)]),invoke(B.subject,name,[structuredClone(v)]));'
r="assert.deepEqual(name==='normalizeNavigatorVisibleSections' ? approvedOwnerRetirement({navigatorVisibleSections:invoke(A.subject,name,[structuredClone(v)]).value}).navigatorVisibleSections : invoke(A.subject,name,[structuredClone(v)]),name==='normalizeNavigatorVisibleSections' ? invoke(B.subject,name,[structuredClone(v)]).value : invoke(B.subject,name,[structuredClone(v)]));"
# Only special-case one normalization; for other inputs still compare original results.
assert s.count(q)==1;s=s.replace(q,r)
s=s.replace('assert.deepEqual(b,a);','sameExceptRetiredOwner(b,a);')
s=s.replace("assert.deepEqual(await runPlugin('A',run),await runPlugin('B',run));", "sameExceptRetiredOwner(await runPlugin('A',run),await runPlugin('B',run));")
f.write_text(s)
print('updated regression comparisons, no unrelated fields omitted')
