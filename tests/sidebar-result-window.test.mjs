import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prepareSubjects, loadSubject } from './harness.mjs';
let applet, methods;
before(() => { prepareSubjects(); applet=loadSubject('B'); methods=applet.subject.SearchResultRendererController.prototype; });
after(() => applet?.dispose());
function renderer(desktopSidebar, height=900, estimate=100) {
    const r=Object.create(methods);
    r.owner={navigator:{desktopSidebar},resultsContainer:{clientHeight:height}};
    r._heightIndex={estimate};
    return r;
}
test('desktop sidebar mounts visible results with half a viewport of buffer on either side', () => {
    const r=renderer(true);
    assert.equal(r._windowSize(1000),20);
    assert.equal(r._windowSize(7),7);
    for (const [first,last] of [[0,8],[100,108],[991,999],[400,480]]) {
        const range=r._windowRangeForViewport(first,last,1000);
        assert.ok(range.start<=first && range.end>last);
    }
});
test('all hosts share mount size, tall and hidden viewports stay covered', () => {
    assert.equal(renderer(false)._windowSize(1000),20);
    assert.equal(renderer(false,0)._windowSize(1000),24);
    for (const sidebar of [true,false]) {
        const r=renderer(sidebar,10000,44);
        assert.ok(r._windowSize(1000)>=Math.ceil(10000/44)+1);
        assert.equal(r._windowSize(0),0);
    }
});
