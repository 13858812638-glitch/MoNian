import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareSubjects,loadSubject} from './harness.mjs';

test('P4 test harness: atomic subject writes use per-process temporary files and rename',()=>{
 const source=fs.readFileSync('tests/harness.mjs','utf8');
 assert.match(source,/subject\.\$\{process\.pid\}\.cjs/);
 assert.match(source,/fs\.renameSync\(temporary,'tests\/generated\/subject\.cjs'\)/);
 assert.match(source,/writeGeneratedAtomic\('tests\/subject-entry\.js'/);
 assert.match(source,/writeGeneratedAtomic\('tests\/generated\/baseline-subject\.cjs'/);
});

test('P4 test harness: a newly built subject remains readable as a full module',()=>{
 prepareSubjects();
 const src=fs.readFileSync('tests/generated/subject.cjs','utf8');
 assert.ok(src.endsWith('})(require);\n'));
 const subject=loadSubject('B');
 assert.equal(typeof subject.subject.createPickerAutoLocateScheduler,'function');
 subject.dispose();
});
