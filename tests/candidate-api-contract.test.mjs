import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareSubjects, loadSubject} from './harness.mjs';

// Keep frozen-parity diagnostics intact. The current candidate intentionally
// adds two cross-key writes and retires unused Navigator _propertyStats.
// Public contracts and every unrelated descriptor remain exact.
test('candidate preserves formal prototype contracts with reviewed cross-key additions and internal retirement',()=>{
  prepareSubjects();const live=loadSubject('B');
  try {
    const frozen=JSON.parse(fs.readFileSync('reports/formal-v52-api-snapshot.json','utf8'));
    const additions=['moveVaultPropertyValueToKey','_moveVaultPropertyValueToKey'];
    for(const [name,expected] of Object.entries(frozen.classes)){
      const actual=Object.getOwnPropertyNames(live.subject[name].prototype).map(key=>{
        const d=Object.getOwnPropertyDescriptor(live.subject[name].prototype,key),v=d.value;
        return {key,enumerable:d.enumerable,configurable:d.configurable,writable:d.writable??null,
          type:typeof v,name:v?.name??null,length:typeof v==='function'?v.length:null};
      });
      const extra=name==='LocalSearchPlugin'?actual.filter(x=>additions.includes(x.key)):[];
      assert.deepEqual(extra.map(x=>x.key),name==='LocalSearchPlugin'?additions:[]);
      const retired=name==='SearchNavigatorController'?'_propertyStats':null;
      if(retired)assert.equal(live.subject[name].prototype[retired],undefined);
      assert.deepEqual(actual.filter(x=>!extra.includes(x)),expected.filter(x=>x.key!==retired),name);
      for(const item of extra)assert.deepEqual(item,{key:item.key,enumerable:false,configurable:true,writable:true,
        type:'function',name:item.key,length:3});
    }
  } finally {live.dispose();}
});
