import test from 'node:test';
import assert from 'node:assert/strict';
import { StorageManager } from '../../src/scripts/storage.js';

test('uses safe defaults when browser storage is unavailable', () => {
  const storage = new StorageManager(null);
  assert.deepEqual(storage.load(), {
    audioEnabled: true,
    volume: 0.6,
    speed: 1,
    lastFrameId: null,
    progress: null,
    schemaVersion: 1
  });
  storage.setAudio(false);
  storage.setVolume(0.25);
  storage.setSpeed(2);
  const record = storage.saveProgress('frame-02');
  assert.equal(storage.load().lastFrameId, 'frame-02');
  assert.equal(record.seq, 1);
  assert.equal(storage.load().volume, 0.25);
  assert.equal(storage.load().speed, 2);
  assert.equal(storage.load().audioEnabled, false);
});

test('discards an incompatible persisted schema version', () => {
  const values = new Map([['hwc.schemaVersion', '99'], ['hwc.audio', 'off']]);
  const fakeStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  const storage = new StorageManager(fakeStorage);
  assert.equal(storage.load().audioEnabled, true);
  assert.equal(values.get('hwc.schemaVersion'), '1');
  assert.equal(values.has('hwc.audio'), false);
});

test('falls back when storage operations throw', () => {
  const fakeStorage = {
    getItem: () => '1',
    setItem: () => { throw new Error('quota'); },
    removeItem: () => { throw new Error('restricted'); }
  };
  let storage;
  assert.doesNotThrow(() => { storage = new StorageManager(fakeStorage); });
  assert.doesNotThrow(() => storage.setAudio(false));
  assert.equal(storage.load().audioEnabled, false);
});

test('creates a progress channel without local storage', () => {
  const OriginalChannel = globalThis.BroadcastChannel;
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  class TestChannel {
    addEventListener() {}
    postMessage() {}
    close() {}
  }
  Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: TestChannel });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  try {
    const storage = new StorageManager(null);
    assert.ok(storage.channel);
    storage.dispose();
  } finally {
    if (OriginalChannel) Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: OriginalChannel });
    else delete globalThis.BroadcastChannel;
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', { configurable: true, value: windowDescriptor });
    else delete globalThis.window;
  }
});

test('ignores progress records with invalid timestamps', () => {
  const values = new Map([
    ['hwc.schemaVersion', '1'],
    ['hwc.progress', JSON.stringify({ frameId: 'frame-02', updatedAt: 'not-a-date', seq: 1, tabId: 'tab-a' })]
  ]);
  const storage = new StorageManager({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  });

  assert.equal(storage.load().lastFrameId, null);
  assert.equal(storage.load().progress, null);
  assert.doesNotThrow(() => storage.receiveProgress({ frameId: 'frame-03', updatedAt: 'also-not-a-date', seq: 2, tabId: 'tab-a' }));
  assert.equal(storage.load().progress, null);
});

test('orders progress by updatedAt, sequence, and tab identifier', async () => {
  const values = new Map([
    ['hwc.schemaVersion', '1'],
    ['hwc.progress', JSON.stringify({ frameId: 'frame-01', updatedAt: '2026-09-23T12:00:00.000Z', seq: 2, tabId: 'b' })]
  ]);
  const storage = new StorageManager({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  });
  const observed = [];
  storage.onProgress((record) => observed.push(record.frameId));

  storage.receiveProgress({ frameId: 'older', updatedAt: '2026-09-23T11:59:59.999Z', seq: 99, tabId: 'z' });
  storage.receiveProgress({ frameId: 'lower-seq', updatedAt: '2026-09-23T12:00:00.000Z', seq: 1, tabId: 'z' });
  storage.receiveProgress({ frameId: 'higher-seq', updatedAt: '2026-09-23T12:00:00.000Z', seq: 3, tabId: 'c' });
  storage.receiveProgress({ frameId: 'lower-tab', updatedAt: '2026-09-23T12:00:00.000Z', seq: 3, tabId: 'a' });
  storage.receiveProgress({ frameId: 'higher-tab', updatedAt: '2026-09-23T12:00:00.000Z', seq: 3, tabId: 'd' });

  assert.equal(storage.load().lastFrameId, 'higher-tab');
  assert.deepEqual(observed, ['higher-seq', 'higher-tab']);
  const { compareProgress } = await import('../../src/scripts/storage.js');
  assert.equal(typeof compareProgress, 'function');
  assert.equal(compareProgress(
    { frameId: 'a', updatedAt: '2026-09-23T12:00:00.000Z', seq: 1, tabId: 'a' },
    { frameId: 'b', updatedAt: '2026-09-23T12:00:00.000Z', seq: 1, tabId: 'b' }
  ), -1);
});

test('keeps progress synchronization working without local storage', () => {
  const originalChannel = globalThis.BroadcastChannel;
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const channels = new Set();
  class TestChannel {
    constructor(name) {
      this.name = name;
      this.listeners = new Set();
      channels.add(this);
    }
    addEventListener(type, listener) {
      if (type === 'message') this.listeners.add(listener);
    }
    postMessage(data) {
      for (const channel of channels) {
        if (channel === this || channel.closed) continue;
        for (const listener of channel.listeners) listener({ data });
      }
    }
    close() {
      this.closed = true;
      channels.delete(this);
    }
  }
  Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: TestChannel });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  try {
    const first = new StorageManager(null);
    const second = new StorageManager(null);
    const received = [];
    second.onProgress((record) => received.push(record.frameId));
    first.saveProgress('frame-02');
    assert.equal(second.load().lastFrameId, 'frame-02');
    assert.deepEqual(received, ['frame-02']);
    second.dispose();
    assert.doesNotThrow(() => first.saveProgress('frame-03'));
    assert.equal(second.load().lastFrameId, 'frame-02');
    first.dispose();
  } finally {
    if (originalChannel) Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: originalChannel });
    else delete globalThis.BroadcastChannel;
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else delete globalThis.window;
  }
});

test('adopts progress through storage events when BroadcastChannel is unavailable', () => {
  const originalChannel = globalThis.BroadcastChannel;
  const originalAddEventListener = globalThis.addEventListener;
  const originalRemoveEventListener = globalThis.removeEventListener;
  const listeners = new Set();
  let removed = 0;
  Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: undefined });
  Object.defineProperty(globalThis, 'addEventListener', {
    configurable: true,
    value: (type, listener) => {
      if (type === 'storage') listeners.add(listener);
    }
  });
  Object.defineProperty(globalThis, 'removeEventListener', {
    configurable: true,
    value: (type, listener) => {
      if (type === 'storage' && listeners.delete(listener)) removed += 1;
    }
  });
  try {
    const values = new Map([
      ['hwc.schemaVersion', '1'],
      ['hwc.progress', JSON.stringify({ frameId: 'frame-01', updatedAt: '2026-09-23T12:00:00.000Z', seq: 1, tabId: 'a' })]
    ]);
    const storage = new StorageManager({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key)
    });
    const received = [];
    storage.onProgress((record) => received.push(record.frameId));
    const incoming = { frameId: 'frame-02', updatedAt: '2026-09-23T12:00:01.000Z', seq: 1, tabId: 'b' };
    values.set('hwc.progress', JSON.stringify(incoming));
    for (const listener of listeners) listener({ key: 'hwc.progress', newValue: JSON.stringify(incoming) });
    assert.equal(storage.load().lastFrameId, 'frame-02');
    assert.deepEqual(received, ['frame-02']);
    storage.dispose();
    assert.equal(removed, 1);
  } finally {
    if (originalChannel) Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: originalChannel });
    else delete globalThis.BroadcastChannel;
    if (originalAddEventListener) Object.defineProperty(globalThis, 'addEventListener', { configurable: true, value: originalAddEventListener });
    else delete globalThis.addEventListener;
    if (originalRemoveEventListener) Object.defineProperty(globalThis, 'removeEventListener', { configurable: true, value: originalRemoveEventListener });
    else delete globalThis.removeEventListener;
  }
});

test('resets defaults when incompatible storage cannot be removed', () => {
  const values = new Map([
    ['hwc.schemaVersion', '99'],
    ['hwc.audio', 'off'],
    ['hwc.volume', '0.1'],
    ['hwc.speed', '2'],
    ['hwc.progress', JSON.stringify({ frameId: 'frame-04', updatedAt: '2026-09-23T12:00:00.000Z', seq: 4, tabId: 'old' })]
  ]);
  const storage = new StorageManager({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: () => {}
  });
  assert.deepEqual(storage.load(), {
    audioEnabled: true,
    volume: 0.6,
    speed: 1,
    lastFrameId: null,
    progress: null,
    schemaVersion: 1
  });
});

test('disposes channels and storage listeners exactly once', () => {
  const originalChannel = globalThis.BroadcastChannel;
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalAddEventListener = globalThis.addEventListener;
  const originalRemoveEventListener = globalThis.removeEventListener;
  let closed = 0;
  let removed = 0;
  class TestChannel {
    addEventListener() {}
    postMessage() {}
    close() { closed += 1; }
  }
  Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: TestChannel });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'addEventListener', { configurable: true, value: () => {} });
  Object.defineProperty(globalThis, 'removeEventListener', { configurable: true, value: () => { removed += 1; } });
  try {
    const values = new Map([['hwc.schemaVersion', '1']]);
    const storage = new StorageManager({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key)
    });
    storage.dispose();
    storage.dispose();
    assert.equal(closed, 1);
  assert.equal(removed, 1);
  } finally {
    if (originalChannel) Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: originalChannel });
    else delete globalThis.BroadcastChannel;
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else delete globalThis.window;
    if (originalAddEventListener) Object.defineProperty(globalThis, 'addEventListener', { configurable: true, value: originalAddEventListener });
    else delete globalThis.addEventListener;
    if (originalRemoveEventListener) Object.defineProperty(globalThis, 'removeEventListener', { configurable: true, value: originalRemoveEventListener });
    else delete globalThis.removeEventListener;
  }
});

test('assigns a strictly increasing sequence to local progress writes', () => {
  const storage = new StorageManager(null);
  const records = ['frame-01', 'frame-02', 'frame-03'].map((frameId) => storage.saveProgress(frameId));
  assert.deepEqual(records.map((record) => record.seq), [1, 2, 3]);
  assert.equal(new Set(records.map((record) => record.tabId)).size, 1);
});

test('keeps all storage fallbacks silent when every operation throws', () => {
  const storage = new StorageManager({
    getItem: () => { throw new Error('restricted'); },
    setItem: () => { throw new Error('quota'); },
    removeItem: () => { throw new Error('restricted'); }
  });
  assert.doesNotThrow(() => {
    storage.setAudio(false);
    storage.setVolume(0.25);
    storage.setSpeed(2);
    storage.saveProgress('frame-02');
    storage.load();
    storage.dispose();
  });
  assert.equal(storage.load().lastFrameId, 'frame-02');
});

test('rejects stale storage events after adopting newer progress', () => {
  const values = new Map([
    ['hwc.schemaVersion', '1'],
    ['hwc.progress', JSON.stringify({ frameId: 'frame-01', updatedAt: '2026-09-23T12:00:00.000Z', seq: 1, tabId: 'tab-a' })]
  ]);
  const storage = new StorageManager({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  });
  storage.receiveProgress({ frameId: 'frame-03', updatedAt: '2026-09-23T12:00:02.000Z', seq: 2, tabId: 'tab-b' });
  const stale = { frameId: 'frame-02', updatedAt: '2026-09-23T12:00:01.000Z', seq: 99, tabId: 'tab-z' };
  values.set('hwc.progress', JSON.stringify(stale));
  storage.handleStorage({ key: 'hwc.progress', newValue: JSON.stringify(stale) });
  assert.equal(storage.load().lastFrameId, 'frame-03');
});

test('closes the channel when listener removal throws', () => {
  const originalChannel = globalThis.BroadcastChannel;
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let closed = 0;
  class TestChannel {
    addEventListener() {}
    removeEventListener() { throw new Error('already detached'); }
    close() { closed += 1; }
  }
  Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: TestChannel });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  try {
    const storage = new StorageManager(null);
    assert.doesNotThrow(() => storage.dispose());
    assert.equal(closed, 1);
  } finally {
    if (originalChannel) Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: originalChannel });
    else delete globalThis.BroadcastChannel;
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else delete globalThis.window;
  }
});


