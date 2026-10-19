import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSubjects,loadSubject} from './harness.mjs';

prepareSubjects();
const KEY='所属项目';
const file=(value,present=true)=>({properties:present?{[KEY]:value}:{}});
const count=(stats,value,S)=>stats.counts.get(S.propertyValueKey(value))||0;

test('property real counts do not absorb the previously selected project',()=>{
 const h=loadSubject('B');try{
  const S=h.subject;
  const candidates=[...Array.from({length:6},()=>file('人事')), ...Array.from({length:34},()=>file('卫康')),file('标准化流程·运营部'), ...Array.from({length:122},()=>file(undefined,false))];
  const stats=S.buildPropertyUsageStats(candidates,KEY,['标准化流程·运营部'],['拖']);
  assert.equal(candidates.length,163);
  assert.equal(count(stats,'人事',S),6);
  assert.equal(count(stats,'卫康',S),34);
  assert.equal(count(stats,'标准化流程·运营部',S),1);
  assert.equal(count(stats,'拖',S),0);
  assert.equal(stats.present,41);
  assert.equal(stats.projectedCounts.get(S.propertyValueKey('卫康')),35,'OR projection remains available separately');
  assert.equal(stats.projectedKeyCount,1,'projection metadata remains separate from raw key count');
 }finally{h.dispose();}
});

test('one YAML file with two values counts once per value, once under OR',()=>{
 const h=loadSubject('B');try{
  const S=h.subject;
  const candidates=[file(['卫康','Obsidian']),file('卫康'),file('Obsidian')];
  const stats=S.buildPropertyUsageStats(candidates,KEY,['卫康','Obsidian']);
  assert.equal(stats.present,3);
  assert.equal(count(stats,'卫康',S),2);
  assert.equal(count(stats,'Obsidian',S),2);
  assert.equal(stats.selectedMatchCount,3,'same YAML row deduplicated in OR matches');
  assert.equal(stats.projectedCounts.get(S.propertyValueKey('Obsidian')),3);
 }finally{h.dispose();}
});

test('missing vs empty YAML property are separate counted states',()=>{
 const h=loadSubject('B');try{
  const S=h.subject;
  const stats=S.buildPropertyUsageStats([file(undefined,false),file(null),file([]),file('卫康')],KEY,['卫康']);
  assert.equal(stats.present,3);
  assert.equal(count(stats,S.MISSING_PROPERTY_VALUE,S),1);
  assert.equal(count(stats,S.EMPTY_PROPERTY_VALUE,S),2);
  assert.equal(count(stats,'卫康',S),1);
 }finally{h.dispose();}
});

test('catalog-only value count remains zero under a different selected project',()=>{
 const h=loadSubject('B');try{
  const S=h.subject;
  const stats=S.buildPropertyUsageStats([file('卫康')],KEY,['卫康'],['卫康','拖']);
  assert.ok(stats.values.includes('拖'));
  assert.equal(count(stats,'拖',S),0);
  assert.equal(stats.projectedCounts.get(S.propertyValueKey('拖')),1);
 }finally{h.dispose();}
});
