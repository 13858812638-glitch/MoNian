import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepareSubjects, loadSubject } from './harness.mjs';

let applet, createScheduler, dispose;
before(() => {
  prepareSubjects();
  applet = loadSubject('B');
  createScheduler = applet.subject.createPickerAutoLocateScheduler;
  dispose = applet.subject.disposePickerCleanup;
});
after(() => applet?.dispose());

function fixture({ idStart=1 } = {}) {
  let seq=idStart, scheduled=0, canceled=0, ran=0;
  const queue = new Map();
  const win={
    requestAnimationFrame(callback){const id=seq++;queue.set(id,callback);scheduled++;return id;},
    cancelAnimationFrame(id){if(queue.delete(id))canceled++;}
  };
  const panel={ownerDocument:{defaultView:win},isConnected:true,_lsCleanup:null};
  const list={isConnected:true};
  const schedule=createScheduler(panel,list);
  function flush(){const jobs=[...queue.values()];queue.clear();for(const fn of jobs){ran++;fn();}}
  return {panel,list,schedule,flush,
    get pending(){return queue.size;},get scheduled(){return scheduled;},get canceled(){return canceled;},get ran(){return ran;}
  };
}

test('P4: 400 Picker projections produce exactly one last-frame reveal',()=>{
  const x=fixture();let last=-1;for(let i=0;i<400;i++)x.schedule(()=>{last=i;});
  assert.equal(x.scheduled,400);assert.equal(x.canceled,399);assert.equal(x.pending,1);
  x.flush();assert.equal(last,399);assert.equal(x.ran,1);assert.equal(x.pending,0);
  dispose(x.panel);
});

test('P4: successful frame settles and a later projection can schedule anew',()=>{
  const x=fixture();let count=0;x.schedule(()=>count++);x.flush();x.schedule(()=>count++);
  x.flush();assert.equal(count,2);assert.equal(x.canceled,0);dispose(x.panel);
});

test('P4: last frame is cancelled on panel disposal; no late UI work',()=>{
  const x=fixture();let count=0;for(let i=0;i<100;i++)x.schedule(()=>count++);
  dispose(x.panel);assert.equal(x.pending,0);x.flush();assert.equal(count,0);
  assert.equal(x.canceled,100);assert.equal(x.ran,0);
});

test('P4: cleanup remains idempotent and post-close requeue is rejected',()=>{
  const x=fixture();x.schedule(()=>{throw Error('must not execute');});
  dispose(x.panel);dispose(x.panel);x.schedule(()=>{throw Error('must not enqueue');});
  assert.equal(x.pending,0);assert.equal(x.scheduled,1);
});

test('P4: detached panels or lists do not run pending work',()=>{
  const x=fixture();let count=0;x.schedule(()=>count++);x.panel.isConnected=false;
  x.flush();assert.equal(count,0);x.panel.isConnected=true;
  x.schedule(()=>count++);x.list.isConnected=false;x.flush();assert.equal(count,0);
  dispose(x.panel);
});

test('P4: detached panel or list refuses to arm a new frame',()=>{
  const x=fixture();x.panel.isConnected=false;x.schedule(()=>{});assert.equal(x.pending,0);
  x.panel.isConnected=true;x.list.isConnected=false;x.schedule(()=>{});assert.equal(x.pending,0);
  dispose(x.panel);
});

test('P4: malformed callbacks cannot create work',()=>{
  const x=fixture();for(const value of [null,undefined,1,{},'callback'])x.schedule(value);
  assert.equal(x.scheduled,0);assert.equal(x.pending,0);dispose(x.panel);
});

test('P4: requestAnimationFrame id zero can still be cancelled correctly',()=>{
  const x=fixture({idStart:0});x.schedule(()=>{});x.schedule(()=>{});
  assert.equal(x.pending,1);assert.equal(x.canceled,1);dispose(x.panel);
  assert.equal(x.pending,0);assert.equal(x.canceled,2);
});

test('P4: sibling Picker Surfaces have independent frame owners',()=>{
  const a=fixture(),b=fixture();let aCount=0,bCount=0;
  a.schedule(()=>aCount++);b.schedule(()=>bCount++);
  dispose(a.panel);a.flush();b.flush();assert.equal(aCount,0);assert.equal(bCount,1);
  dispose(b.panel);
});

test('P4: nested picker cleanup chain continues to release other resources',()=>{
  const x=fixture();let released=0;
  const prior=x.panel._lsCleanup;
  x.panel._lsCleanup=()=>{prior();released++;};
  x.schedule(()=>{});dispose(x.panel);assert.equal(released,1);assert.equal(x.pending,0);
});

test('P4: scheduler never calls native focus, blur or scroll directly',()=>{
  const x=fixture();let count=0;
  x.panel.focus=()=>{throw Error('must not force focus');};
  x.list.scrollTo=()=>{throw Error('must not force scroll');};
  x.schedule(()=>count++);x.flush();assert.equal(count,1);dispose(x.panel);
});

test('P4: all three tree Picker call sites use the shared cancelable owner',()=>{
  for(const file of ['src/ui/pickers/folder-picker.js',
    'src/features/facets/tag-picker-methods.js',
    'src/features/facets/property-picker-methods.js']){
    const body=fs.readFileSync(file,'utf8');
    assert.match(body,/createPickerAutoLocateScheduler\(panel, list\)/,file);
    assert.match(body,/queueAutoLocate\(\(\) => \{/,file);
    assert.doesNotMatch(body,/requestAnimationFrame\s*\(/,file);
  }
});
