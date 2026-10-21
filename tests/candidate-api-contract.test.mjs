import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareSubjects, loadSubject} from './harness.mjs';

// Keep frozen-parity diagnostics intact. The current candidate intentionally
// adds the two cross-key write methods, covered by real-write tests elsewhere.
test('candidate preserves formal prototype contracts with only reviewed cross-key additions',()=>{
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
      assert.deepEqual(actual.filter(x=>!extra.includes(x)),expected,name);
      for(const item of extra)assert.deepEqual(item,{key:item.key,enumerable:false,configurable:true,writable:true,
        type:'function',name:item.key,length:3});
    }
  } finally {live.dispose();}
});
