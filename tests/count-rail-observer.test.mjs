import test from 'node:test';
import assert from 'node:assert/strict';
import { observePickerCountRail } from '../src/ui/pickers/count-rail.js';

function surface() {
    let deliver, disconnected = false, reads = 0, writes = 0;
    const style = new Map();
    const list = { isConnected: true, width: 200, client: 185,
        get offsetWidth() { reads++; return this.width; },
        get clientWidth() { reads++; return this.client; } };
    const panel = { isConnected: true, ownerDocument: { defaultView: {
        ResizeObserver: class {
            constructor(callback) { deliver = callback; }
            observe(target) { assert.equal(target, list); }
            disconnect() { disconnected = true; }
        },
        requestAnimationFrame() { assert.fail('Initial measurement belongs to ResizeObserver'); }
    } }, style: {
        getPropertyValue(key) { return style.get(key) || ''; },
        setProperty(key, value) { writes++; style.set(key, value); }
    } };
    const dispose = observePickerCountRail(panel, list, '--reserve');
    return {panel, list, deliver: () => deliver(), dispose,
        snapshot: () => ({reads, writes, disconnected, value: style.get('--reserve')})};
}

test('count rail waits for connected layout and follows real scrollbar changes', () => {
    const s = surface();
    s.panel.isConnected = false; s.deliver();
    assert.equal(s.snapshot().reads, 0);
    s.panel.isConnected = true; s.deliver();
    assert.equal(s.snapshot().value, '15px');
    s.list.client = 200; s.deliver();
    assert.equal(s.snapshot().value, '0px');
    s.list.client = 188; s.deliver();
    assert.equal(s.snapshot().value, '12px');
    s.dispose();
});

test('height-only resize does not rewrite the same reserve or cache stale style', () => {
    const s = surface(); s.deliver(); s.deliver();
    assert.equal(s.snapshot().writes, 1);
    s.panel.style.setProperty('--reserve', '99px'); s.deliver();
    assert.equal(s.snapshot().value, '15px');
    assert.equal(s.snapshot().writes, 3);
    s.dispose();
});

test('late observer delivery after cleanup cannot read layout or write DOM', () => {
    const s = surface(); s.deliver(); s.dispose();
    const before = s.snapshot(); s.deliver(); s.dispose();
    assert.deepEqual(s.snapshot(), before);
    assert.equal(before.disconnected, true);
});
