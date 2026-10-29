import test from 'node:test';
import assert from 'node:assert/strict';
import { SENSORY_DESCRIPTORS, isValidDescriptor, normalizeDescriptors } from '../../src/scripts/sensory-taxonomy.js';

test('sensory taxonomy exports controlled descriptors', () => {
  assert.deepEqual(SENSORY_DESCRIPTORS, ['flashing-lights', 'sudden-audio', 'psychological-distress', 'body-horror']);
});

test('isValidDescriptor accepts only controlled values', () => {
  assert.equal(isValidDescriptor('flashing-lights'), true);
  assert.equal(isValidDescriptor('unknown'), false);
});

test('normalizeDescriptors deduplicates and filters', () => {
  assert.deepEqual(normalizeDescriptors(['sudden-audio', 'sudden-audio', 'nope']), ['sudden-audio']);
});
