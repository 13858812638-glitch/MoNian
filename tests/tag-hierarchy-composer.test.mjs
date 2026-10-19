import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareSubjects, loadSubject, plain } from './harness.mjs';
prepareSubjects();
const session = loadSubject('B');
const {
    composeHierarchicalTag,
    tagHierarchyDrillPath,
    tagHierarchyBreadcrumbs,
    findTagHierarchyNode,
    tagHierarchyVisibleRoots,
    buildTagTreeModel
} = session.subject;
test.after(()=>session.dispose());

for (const [name,raw,parent,expected] of [
    ['root one level','运动','','运动'],
    ['under existing parent','跑步','运动','运动/跑步'],
    ['under two levels','训练','运动/跑步','运动/跑步/训练'],
    ['original full path still works','运动/跑步/训练','','运动/跑步/训练'],
    ['original quick relative path works','跑步/训练','运动','运动/跑步/训练'],
    ['strip leading hashtag','#运动','', '运动'],
    ['preserve original display case','Weekly','项目/Work','项目/Work/Weekly'],
    ['empty candidate','  ','项目',''],
]) test(`composer: ${name}`,()=>{
    assert.equal(composeHierarchicalTag(raw,parent).path,expected);
});
for (const [name,raw,parent,contains] of [
    ['whitespace','分 组','上级','空格'],
    ['hash in segment','前#后','上级','#'],
    ['empty slash segment','A//B','','无效'],
    ['invalid parent segment','子项','A//B','无效'],
]) test(`composer rejects ${name}`,()=>{
    assert.match(composeHierarchicalTag(raw,parent).error,new RegExp(contains));
});
for (const [name,raw,parent,path] of [
    ['type trailing slash','运动/','','运动'],
    ['nested shortcut','跑步/','运动','运动/跑步'],
    ['paste entire hierarchy then slash','A/B/C/','','A/B/C'],
    ['not a shortcut','A/B','',''],
    ['reject repeated slash','A//','',''],
    ['reject invalid content','分 组/','',''],
    ['reject empty','/','',''],
]) test(`drill: ${name}`,()=>{
    assert.equal(tagHierarchyDrillPath(raw,parent),path);
});
test('breadcrumb chain can return directly to any ancestor',()=>{
    assert.deepEqual(plain(tagHierarchyBreadcrumbs('部门/运营/周报')),[
        {path:'',name:'全部标签'},
        {path:'部门',name:'部门'},
        {path:'部门/运营',name:'运营'},
        {path:'部门/运营/周报',name:'周报'}
    ]);
});
test('tree navigation reuses real hierarchy and original casing',()=>{
    const roots=buildTagTreeModel([{tags:['业务/Work/Weekly','业务/Work/Daily','生活/运动']}]);
    assert.equal(findTagHierarchyNode(roots,'业务/work')?.path,'业务/Work');
    assert.deepEqual(plain(tagHierarchyVisibleRoots(roots,'业务/Work').map(x=>x.name)),['Daily','Weekly']);
    assert.deepEqual(plain(tagHierarchyVisibleRoots(roots,'业务').map(x=>x.name)),['Work']);
    assert.deepEqual(plain(tagHierarchyVisibleRoots(roots,'未创建')),[]);
    assert.equal(findTagHierarchyNode(roots,'业务/Nope'),null);
});
test('a virtual parent can become a navigation path without writing a parent tag',()=>{
    const scoped='营销/活动';
    const roots=buildTagTreeModel([{tags:['运动']},{tags:[scoped]}]);
    assert.ok(findTagHierarchyNode(roots,scoped));
    const leaf=composeHierarchicalTag('黑五',scoped).path;
    assert.equal(leaf,'营销/活动/黑五');
    assert.deepEqual([leaf],['营销/活动/黑五']);
});
