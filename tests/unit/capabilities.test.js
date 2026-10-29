import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCapabilities } from '../../src/scripts/capabilities.js';

function withBrowserGlobals(navigatorValue, callback) {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const matchMediaDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: navigatorValue });
  Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
  try {
    return callback();
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
    if (matchMediaDescriptor) Object.defineProperty(globalThis, 'matchMedia', matchMediaDescriptor);
    else delete globalThis.matchMedia;
  }
}

test('detects low memory from navigator.deviceMemory', () => {
  withBrowserGlobals({ deviceMemory: 1, hardwareConcurrency: 8 }, () => {
    const capabilities = detectCapabilities();
    assert.equal(capabilities.deviceMemory, 1);
    assert.equal(capabilities.shouldDegrade, true);
  });
});

test('falls back to connection.deviceMemory when navigator does not expose it', () => {
  withBrowserGlobals({ connection: { deviceMemory: 2, hardwareConcurrency: 8 } }, () => {
    const capabilities = detectCapabilities();
    assert.equal(capabilities.deviceMemory, 2);
    assert.equal(capabilities.shouldDegrade, true);
  });
});
