import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { firstFramePicture, injectFirstFramePicture } from '../../scripts/build.mjs';
import { resolveImageSources } from '../../src/scripts/light-variants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/data/story.json'), 'utf8'));
const shell = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function attributeOf(html, pattern, name) {
  const tag = pattern.exec(html)?.[0];
  assert.ok(tag, `no element matched ${pattern}`);
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

test('the first-frame picture is derived from the manifest, never hand-written', () => {
  const frame = manifest.scenes[0].frames[0];
  const sources = resolveImageSources(frame.image).standard;
  const picture = firstFramePicture(manifest);
  assert.equal(picture.id, frame.id);
  assert.equal(picture.alt, frame.alt);
  assert.equal(picture.sizes, frame.image.sizes);
  assert.equal(picture.width, frame.image.width);
  assert.equal(picture.height, frame.image.height);
  assert.equal(picture.src, frame.image.fallback);
  assert.equal(picture.avifSrcset, sources.avif);
  assert.equal(picture.webpSrcset, sources.webp);
  assert.equal(picture.fallbackSrcset, sources.fallback);
});

test('injection populates every <picture> slot so the preload scanner can fetch the frame', () => {
  const injected = injectFirstFramePicture(shell, manifest);
  const picture = firstFramePicture(manifest);
  assert.equal(attributeOf(injected, /<source\b[^>]*\bid="frame-avif"[^>]*>/i, 'srcset'), picture.avifSrcset);
  assert.equal(attributeOf(injected, /<source\b[^>]*\bid="frame-webp"[^>]*>/i, 'srcset'), picture.webpSrcset);
  assert.equal(attributeOf(injected, /<img\b[^>]*\bid="frame-image"[^>]*>/i, 'srcset'), picture.fallbackSrcset);
  for (const sizes of ['frame-avif', 'frame-webp', 'frame-image']) {
    const pattern = sizes === 'frame-image' ? /<img\b[^>]*\bid="frame-image"[^>]*>/i : new RegExp(`<source\\b[^>]*\\bid="${sizes}"[^>]*>`, 'i');
    assert.equal(attributeOf(injected, pattern, 'sizes'), '100vw', `${sizes} must carry sizes`);
  }
});

test('injection is idempotent, so a rebuild cannot compound the markup', () => {
  const once = injectFirstFramePicture(shell, manifest);
  assert.equal(injectFirstFramePicture(once, manifest), once);
});

test('injection preserves the intrinsic size, which is what keeps CLS at zero', () => {
  const injected = injectFirstFramePicture(shell, manifest);
  const frame = manifest.scenes[0].frames[0];
  assert.equal(attributeOf(injected, /<img\b[^>]*\bid="frame-image"[^>]*>/i, 'width'), String(frame.image.width));
  assert.equal(attributeOf(injected, /<img\b[^>]*\bid="frame-image"[^>]*>/i, 'height'), String(frame.image.height));
});

test('injection escapes the alt text rather than trusting the manifest', () => {
  const injected = injectFirstFramePicture(shell, {
    ...manifest,
    scenes: [{ ...manifest.scenes[0], frames: [{ ...manifest.scenes[0].frames[0], alt: 'a "quoted" <angle> & ampersand' }] }]
  });
  const alt = attributeOf(injected, /<img\b[^>]*\bid="frame-image"[^>]*>/i, 'alt');
  assert.equal(alt, 'a &quot;quoted&quot; &lt;angle&gt; &amp; ampersand');
});

test('a shell that lost an anchor fails loudly instead of silently regressing LCP', () => {
  assert.throws(() => injectFirstFramePicture('<picture><img id="frame-image"></picture>', manifest), /frame-avif/);
  assert.throws(() => injectFirstFramePicture('<picture><source id="frame-avif"></picture>', manifest), /frame-webp/);
  assert.throws(() => injectFirstFramePicture('<picture><source id="frame-avif"><source id="frame-webp"></picture>', manifest), /frame-image/);
  assert.throws(() => injectFirstFramePicture(shell, { scenes: [] }), /no first frame/);
});

test('the built shell carries the same first frame the manifest declares', { skip: !fs.existsSync(path.join(root, 'dist/index.html')) ? 'dist/ not built' : false }, () => {
  const built = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const picture = firstFramePicture(manifest);
  assert.equal(attributeOf(built, /<source\b[^>]*\bid="frame-avif"[^>]*>/i, 'srcset'), picture.avifSrcset);
  assert.equal(attributeOf(built, /<source\b[^>]*\bid="frame-webp"[^>]*>/i, 'srcset'), picture.webpSrcset);
  assert.equal(attributeOf(built, /<img\b[^>]*\bid="frame-image"[^>]*>/i, 'srcset'), picture.fallbackSrcset);
  assert.equal(attributeOf(built, /<img\b[^>]*\bid="frame-image"[^>]*>/i, 'src'), picture.src);
});
