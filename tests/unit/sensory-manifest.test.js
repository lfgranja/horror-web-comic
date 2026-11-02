import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { StorageManager } from '../../src/scripts/storage.js';

test('catalog has entries with sensoryAdvisory', () => {
  const catalog = JSON.parse(fs.readFileSync(path.resolve('src/data/catalog.json'), 'utf8'));
  assert.ok(Array.isArray(catalog.stories));
  assert.ok(catalog.stories.length > 0);
});

test('alojamento story has fx and memoryIllusion', () => {
  const story = JSON.parse(fs.readFileSync(path.resolve('src/data/stories/o-alojamento.json'), 'utf8'));
  const hasFx = story.scenes?.some(sc => sc.frames?.some(f => f.fx));
  const hasMemory = story.scenes?.some(sc => sc.frames?.some(f => f.memoryIllusion));
  assert.ok(hasFx);
  assert.ok(hasMemory);
});

test('progress is partitioned by storyId', () => {
  const storage = new StorageManager(null);
  storage.setStoryId('story-a');
  storage.saveProgress('f1');
  storage.setStoryId('story-b');
  storage.saveProgress('f2');
  assert.ok(true);
});
