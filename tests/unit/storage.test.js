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
    theme: 'cinema',
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
    theme: 'cinema',
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
    assert.equal(closed, 2);
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
    assert.equal(closed, 2);
  } finally {
    if (originalChannel) Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: originalChannel });
    else delete globalThis.BroadcastChannel;
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else delete globalThis.window;
  }
});



test('a valid progress record is discarded when it carries no schema version stamp', () => {
  // ensureVersion() wipes every key when hwc.schemaVersion does not match, so a
  // hand-written progress record without the stamp never reaches the player.
  // This is the behaviour that made a recovered test look like a product defect:
  // the payload parsed fine and the player still started on the first frame.
  const values = new Map([
    ['hwc.progress', JSON.stringify({
      frameId: 'f-005',
      updatedAt: new Date().toISOString(),
      seq: 1,
      tabId: 't'
    })]
  ]);
  const fakeStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  };
  const storage = new StorageManager(fakeStorage, globalThis);
  assert.equal(storage.load().lastFrameId, null, 'unstamped progress must not survive boot');

  // The same record, stamped, is honoured — the stamp is the whole difference.
  values.set('hwc.schemaVersion', '1');
  values.set('hwc.progress', JSON.stringify({
    frameId: 'f-005',
    updatedAt: new Date().toISOString(),
    seq: 1,
    tabId: 't'
  }));
  const stamped = new StorageManager(fakeStorage, globalThis);
  assert.equal(stamped.load().lastFrameId, 'f-005');
});

test('storage.load().theme defaults to cinema for null, undefined, or missing key', () => {
  const storage = new StorageManager(null);
  assert.equal(storage.load().theme, 'cinema');
});

test('storage.load().theme strictly validates and falls back to cinema for invalid themes', () => {
  const values = new Map([
    ['hwc.schemaVersion', '1'],
    ['hwc.theme', 'invalid-theme']
  ]);
  const storage = new StorageManager({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  });
  assert.equal(storage.load().theme, 'cinema');

  values.set('hwc.theme', 'noir');
  assert.equal(storage.load().theme, 'noir');

  values.set('hwc.theme', 'dark');
  assert.equal(storage.load().theme, 'cinema');
});

test('setTheme persists hwc.theme and supports all allowed themes', () => {
  const values = new Map([['hwc.schemaVersion', '1']]);
  const storage = new StorageManager({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  });

  const validThemes = ['cinema', 'noir', 'eldritch', 'industrial', 'shadow-props'];
  for (const theme of validThemes) {
    storage.setTheme(theme);
    assert.equal(values.get('hwc.theme'), theme);
    assert.equal(storage.load().theme, theme);
  }
});

test('setTheme falls back silently to memory on QuotaExceededError or SecurityError', () => {
  const storage = new StorageManager({
    getItem: () => '1',
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => { throw new Error('SecurityError'); }
  });
  assert.doesNotThrow(() => storage.setTheme('eldritch'));
  assert.equal(storage.load().theme, 'eldritch');
});

test('setTheme emits BroadcastChannel("theme") message and onTheme receives it', () => {
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
        if (channel === this || channel.closed || channel.name !== this.name) continue;
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
    second.onTheme((themeId) => received.push(themeId));

    first.setTheme('industrial');
    assert.equal(second.load().theme, 'industrial');
    assert.deepEqual(received, ['industrial']);

    first.dispose();
    second.dispose();
  } finally {
    if (originalChannel) Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: originalChannel });
    else delete globalThis.BroadcastChannel;
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else delete globalThis.window;
  }
});

test('onTheme receives changes via storage event when BroadcastChannel is unavailable', () => {
  const originalChannel = globalThis.BroadcastChannel;
  const originalAddEventListener = globalThis.addEventListener;
  const originalRemoveEventListener = globalThis.removeEventListener;
  const listeners = new Set();

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
      if (type === 'storage') listeners.delete(listener);
    }
  });

  try {
    const values = new Map([
      ['hwc.schemaVersion', '1'],
      ['hwc.theme', 'cinema']
    ]);
    const storage = new StorageManager({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key)
    });
    const received = [];
    storage.onTheme((theme) => received.push(theme));

    values.set('hwc.theme', 'shadow-props');
    for (const listener of listeners) {
      listener({ key: 'hwc.theme', newValue: 'shadow-props' });
    }
    assert.equal(storage.load().theme, 'shadow-props');
    assert.deepEqual(received, ['shadow-props']);
    storage.dispose();
  } finally {
    if (originalChannel) Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: originalChannel });
    else delete globalThis.BroadcastChannel;
    if (originalAddEventListener) Object.defineProperty(globalThis, 'addEventListener', { configurable: true, value: originalAddEventListener });
    else delete globalThis.addEventListener;
    if (originalRemoveEventListener) Object.defineProperty(globalThis, 'removeEventListener', { configurable: true, value: originalRemoveEventListener });
    else delete globalThis.removeEventListener;
  }
});

