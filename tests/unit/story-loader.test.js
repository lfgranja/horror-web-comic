import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStory } from '../../src/scripts/story-loader.js';

function validStory() {
  return {
    schemaVersion: 1,
    id: 'story',
    title: 'Story',
    scenes: [{
      id: 'scene',
      title: 'Scene',
      frames: [{
        id: 'frame',
        image: { avif: 'frame.avif', fallback: 'frame.jpg', width: 10, height: 10 },
        alt: 'Frame',
        description: 'Description'
      }]
    }]
  };
}

test('rejects properties outside the manifest schema', () => {
  const story = validStory();
  story.unexpected = true;
  assert.throws(() => validateStory(story), /unexpected|manifest/i);
});

test('rejects nested properties outside the manifest schema', () => {
  const story = validStory();
  story.scenes[0].frames[0].image.unexpected = true;
  assert.throws(() => validateStory(story), /unexpected|image/i);
});

test('accepts format-specific responsive candidate fields', () => {
  const story = validStory();
  story.scenes[0].frames[0].image.avifSrcset = 'frame.avif 640w, frame@2x.avif 1280w';
  story.scenes[0].frames[0].image.webpSrcset = 'frame.webp 640w, frame@2x.webp 1280w';
  story.scenes[0].frames[0].image.fallbackSrcset = 'frame.jpg 640w, frame@2x.jpg 1280w';
  story.scenes[0].frames[0].image.sizes = '(max-width: 600px) 100vw, 50vw';
  assert.doesNotThrow(() => validateStory(story));
});

test('rejects unsafe primary references', () => {
  for (const reference of ['data:image/avif;base64,AAAA', 'data%3Aimage%2Favif%3Bbase64%2CAAAA']) {
    const story = validStory();
    story.scenes[0].frames[0].image.avif = reference;
    assert.throws(() => validateStory(story), (error) => error.code === 'manifest-invalid' && /safe|reference|data:/i.test(error.message));
  }
});

test('validates every format-specific srcset candidate', () => {
  const story = validStory();
  story.scenes[0].frames[0].image.fallbackSrcset = 'frame.jpg 640w, https://evil.example/frame.jpg 1280w';
  assert.throws(() => validateStory(story), (error) => /external|reference/i.test(error.message) && !/not allowed/i.test(error.message));
});

test('classifies incompatible schema versions separately', () => {
  const story = validStory();
  story.schemaVersion = 99;
  assert.throws(() => validateStory(story), (error) => error.code === 'manifest-incompatible');
});

test('classifies malformed and unavailable responses with controlled codes', async () => {
  const { loadStory } = await import('../../src/scripts/story-loader.js');
  await assert.rejects(
    loadStory('story.json', async () => ({ ok: true, json: async () => { throw new SyntaxError('Unexpected token'); } })),
    (error) => error.code === 'manifest-malformed' && /valid JSON/i.test(error.message)
  );
  await assert.rejects(
    loadStory('story.json', async () => ({ ok: false, status: 404 })),
    (error) => error.code === 'manifest-unavailable' && /404/.test(error.message)
  );
});
