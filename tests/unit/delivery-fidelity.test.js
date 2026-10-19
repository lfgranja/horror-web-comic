import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIDELITY_THRESHOLDS, assertFidelity } from '../../scripts/delivery-fidelity.mjs';

test('FIDELITY_THRESHOLDS defined', () => {
  assert.ok(FIDELITY_THRESHOLDS);
});

test('assertFidelity does not throw on high ssim', () => {
  assert.doesNotThrow(() => assertFidelity({ ssim: 0.99, psnr: 40 }, { light: false }));
});
