import test from 'node:test';
import assert from 'node:assert/strict';
import { LIGHT_MAX_SIDE, lightAudioSource, lightUrl, lightSrcset, resolveImageSources } from '../../src/scripts/light-variants.js';

test('light cap is the single shared value used by the player, build and image pipeline', () => {
  assert.equal(LIGHT_MAX_SIDE, 1280);
});

test('derives the light variant of a base asset by inserting the marker before the extension', () => {
  assert.equal(lightUrl('frame-01.avif'), 'frame-01-light.avif');
  assert.equal(lightUrl('a/b/c.png'), 'a/b/c-light.png');
});

test('derives the light variant of a width-suffixed asset and caps the width', () => {
  assert.equal(lightUrl('frame-01-1200.avif'), 'frame-01-light-1200.avif');
  assert.equal(lightUrl('frame-01-1920.webp'), `frame-01-light-${LIGHT_MAX_SIDE}.webp`);
  assert.equal(lightUrl('frame-01-2560.jpg'), `frame-01-light-${LIGHT_MAX_SIDE}.jpg`);
});

test('leaves an asset that is already a light variant untouched', () => {
  assert.equal(lightUrl('frame-01-light.avif'), 'frame-01-light.avif');
  assert.equal(lightUrl('frame-01-light-320.avif'), 'frame-01-light-320.avif');
  assert.equal(lightUrl('frame-01-light-1280.avif'), 'frame-01-light-1280.avif');
});

test('tolerates empty and absent references', () => {
  assert.equal(lightUrl(null), null);
  assert.equal(lightUrl(''), '');
  assert.equal(lightSrcset(''), '');
  assert.equal(lightSrcset(undefined), undefined);
});

test('caps every width descriptor of a srcset and keeps the descriptors', () => {
  assert.equal(lightSrcset('a-320.avif 320w, a-640.avif 640w, a-1920.avif 1920w'), `a-light-320.avif 320w, a-light-640.avif 640w, a-light-${LIGHT_MAX_SIDE}.avif ${LIGHT_MAX_SIDE}w`);
});

test('drops duplicate light candidates', () => {
  assert.equal(lightSrcset('a-1920.avif 1920w, a-2560.avif 2560w'), `a-light-${LIGHT_MAX_SIDE}.avif ${LIGHT_MAX_SIDE}w`);
});

test('prefers the declared srcset over the base reference for each format', () => {
  const sources = resolveImageSources({ avif: 'x.avif', avifSrcset: 'a-320.avif 320w, a-1920.avif 1920w', fallback: 'x.jpg' });
  assert.equal(sources.standard.avif, 'a-320.avif 320w, a-1920.avif 1920w');
  assert.equal(sources.light.avif, `a-light-320.avif 320w, a-light-${LIGHT_MAX_SIDE}.avif ${LIGHT_MAX_SIDE}w`);
  assert.equal(sources.standard.webp, '');
});

test('uses the base reference only for avif and webp, and keeps the format in the fallback path', () => {
  const sources = resolveImageSources({ avif: 'frame.avif', webp: 'frame.webp', fallback: 'frame.jpg' });
  assert.equal(sources.standard.avif, 'frame.avif');
  assert.equal(sources.light.avif, 'frame-light.avif');
  assert.equal(sources.standard.webp, 'frame.webp');
  assert.equal(sources.light.webp, 'frame-light.webp');
  assert.equal(sources.standard.fallback, '');
});

test('switches the light audio variant to opus and leaves an existing light track untouched', () => {
  assert.equal(lightAudioSource('scene-01.aac'), 'scene-01-light.opus');
  assert.equal(lightAudioSource('scene-01.wav'), 'scene-01-light.wav');
  assert.equal(lightAudioSource('scene-01-light.opus'), 'scene-01-light.opus');
  assert.equal(lightAudioSource('scene-01.opus'), 'scene-01-light.opus');
  assert.equal(lightAudioSource(null), null);
  assert.equal(lightAudioSource('scene-01.mp3'), 'scene-01.mp3');
});
