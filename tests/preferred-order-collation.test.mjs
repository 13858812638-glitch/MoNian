import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {prepareSubjects,loadSubject,plain} from './harness.mjs';
prepareSubjects();
const runtime=loadSubject('B');
const {sortByPreferredOrder}=runtime.subject;
test.after(()=>runtime.dispose());

test('preferred ordering keeps the exact numeric Chinese locale comparison, ties and stable inputs',()=>{
    const keys=['文档10','文档2','a','A','á','阿','啊','α','z','项目/2','项目/02','项目/10','','中文','中文',null,12];
    const items=keys.map((path,id)=>({path,id}));
    for(const preferred of [[],['文档10','A'],['中文','文档2','中文'],['不存在']]){
        const ranks=new Map([...new Set(preferred)].map((k,i)=>[k,i]));
        const expected=[...items].sort((a,b)=>{
            const ar=ranks.get(a.path)??Number.MAX_SAFE_INTEGER,br=ranks.get(b.path)??Number.MAX_SAFE_INTEGER;
            return ar-br||String(a.path).localeCompare(String(b.path),'zh-Hans-CN',{numeric:true});
        });
        assert.deepEqual(plain(sortByPreferredOrder(items,preferred,x=>x.path)),expected);
        assert.deepEqual(items.map(x=>x.id),keys.map((_,id)=>id));
    }
});

test('repeated preferred-order comparisons do not reconstruct locale comparison on every pair',()=>{
    runtime.context.sortUnderTest=sortByPreferredOrder;
    const calls=vm.runInContext(`(()=>{
      const original=String.prototype.localeCompare;let calls=0;
      String.prototype.localeCompare=function(...args){calls++;return original.apply(this,args)};
      try{for(let i=0;i<10;i++)sortUnderTest(Array.from({length:200},(_,j)=>({path:'项目'+(199-j)})),[],item=>item.path)}
      finally{String.prototype.localeCompare=original}
      return calls;
    })()`,runtime.context);
    assert.equal(calls,0);
});
