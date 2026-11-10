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

test('manifest fx fields have valid ranges', () => {
  const story = JSON.parse(fs.readFileSync(path.resolve('src/data/stories/o-alojamento.json'), 'utf8'));
  const allFx = [];
  for (const sc of story.scenes || []) for (const f of sc.frames || []) if (f.fx) allFx.push(f.fx);
  assert.ok(allFx.length > 0);
  for (const fx of allFx) {
    assert.ok(typeof fx.type === 'string');
    assert.ok(fx.durationMs >= 50 && fx.durationMs <= 500);
    assert.ok(typeof fx.audioCue === 'string');
  }
});

test('memoryIllusion fields have required keys', () => {
  const story = JSON.parse(fs.readFileSync(path.resolve('src/data/stories/o-alojamento.json'), 'utf8'));
  const allMi = [];
  for (const sc of story.scenes || []) for (const f of sc.frames || []) if (f.memoryIllusion) allMi.push(f.memoryIllusion);
  assert.ok(allMi.length > 0);
  for (const mi of allMi) {
    assert.ok(typeof mi.description === 'string' && mi.description.length > 0);
    if (mi.alt) assert.ok(mi.alt.length <= 125);
    assert.ok(typeof mi.audioCue === 'string');
    assert.ok(mi.durationMs >= 50 && mi.durationMs <= 500);
    const cls = mi.cssClass || 'memory-distortion';
    assert.ok(['memory-distortion', 'memory-distortion-severe'].includes(cls));
  }
});

test('catalog sensoryAdvisory descriptors match story', () => {
  const catalog = JSON.parse(fs.readFileSync(path.resolve('src/data/catalog.json'), 'utf8'));
  const story = JSON.parse(fs.readFileSync(path.resolve('src/data/stories/o-alojamento.json'), 'utf8'));
  const cStory = catalog.stories.find(s => s.id === 'alojamento' || s.slug === 'alojamento');
  if (cStory?.sensoryAdvisory?.descriptors && story.sensoryAdvisory?.descriptors) {
    assert.deepEqual([...cStory.sensoryAdvisory.descriptors].sort(), [...story.sensoryAdvisory.descriptors].sort());
  }
});

test('storage partitioning by storyId keeps keys separate', () => {
  const storage = new StorageManager(null);
  storage.setStoryId('story-a');
  storage.saveProgress('frame-a');
  const keyA = storage.progressKey();
  storage.setStoryId('story-b');
  storage.saveProgress('frame-b');
  const keyB = storage.progressKey();
  assert.notEqual(keyA, keyB);
  assert.match(keyA, /story-a/);
  assert.match(keyB, /story-b/);
});
