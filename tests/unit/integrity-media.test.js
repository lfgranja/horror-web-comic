import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { lightImageReference, validateAudioBitrate, validateImageAsset, validateManifestMedia } from '../../scripts/build.mjs';
import { collectManifestReferences, parseSrcset, validateManifestIntegrity } from '../../scripts/validate-manifest.mjs';

test('accepts finite audio bitrates at both range boundaries', () => {
  assert.doesNotThrow(() => validateAudioBitrate(96000, 'standard'));
  assert.doesNotThrow(() => validateAudioBitrate(128000, 'standard'));
  assert.doesNotThrow(() => validateAudioBitrate(48000, 'light'));
  assert.doesNotThrow(() => validateAudioBitrate(64000, 'light'));
});

test('rejects missing, non-finite, and out-of-range audio bitrates', () => {
  for (const bitrate of [undefined, Number.NaN, Number.POSITIVE_INFINITY, 95999, 128001, 47999, 64001]) {
    const variant = bitrate >= 48000 && bitrate <= 64000 ? 'light' : 'standard';
    assert.throws(() => validateAudioBitrate(bitrate, variant), /bitrate|finite|range/i);
  }
});

test('validates the encoded image format rather than trusting its path', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'integrity-image-'));
  const file = path.join(root, 'photo.jpg');
  await sharp({ create: { width: 12, height: 8, channels: 3, background: 'red' } }).jpeg().toFile(file);
  await assert.rejects(validateImageAsset('photo.jpg', { root, expectedFormat: 'avif' }), /format|AVIF/i);
  const metadata = await validateImageAsset('photo.jpg', { root, expectedFormat: 'jpeg', expectedWidth: 12, expectedHeight: 8 });
  assert.equal(metadata.format, 'jpeg');
  const avif = path.join(root, 'photo.avif');
  await sharp({ create: { width: 12, height: 8, channels: 3, background: 'blue' } }).avif().toFile(avif);
  const avifMetadata = await validateImageAsset('photo.avif', { root, expectedFormat: 'avif' });
  assert.equal(avifMetadata.format, 'avif');
  await fs.rm(root, { recursive: true, force: true });
});

test('validates image dimensions and light-file byte budgets', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'integrity-budget-'));
  const file = path.join(root, 'large.jpg');
  await sharp({ create: { width: 20, height: 10, channels: 3, background: 'blue' } }).jpeg().toFile(file);
  await assert.rejects(validateImageAsset('large.jpg', { root, expectedFormat: 'jpeg', maxSide: 19 }), /dimension|exceed|20/i);
  await assert.rejects(validateImageAsset('large.jpg', { root, expectedFormat: 'jpeg', light: true, maxBytes: 1 }), /budget|exceed|byte/i);
  await fs.rm(root, { recursive: true, force: true });
});

test('enforces a per-file budget for standard and light candidates', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'integrity-file-budget-'));
  const file = path.join(root, 'candidate.jpg');
  await sharp({ create: { width: 12, height: 8, channels: 3, background: 'red' } }).jpeg().toFile(file);
  await assert.rejects(validateImageAsset('candidate.jpg', { root, expectedFormat: 'jpeg', maxBytes: 1 }), /budget|exceed|byte/i);
  await assert.rejects(validateImageAsset('candidate.jpg', { root, expectedFormat: 'jpeg', light: true, maxBytes: 1 }), /budget|exceed|byte/i);
  await fs.rm(root, { recursive: true, force: true });
});

test('derives light names for width-specific image candidates', () => {
  assert.equal(lightImageReference('assets/frame-320.avif'), 'assets/frame-light-320.avif');
  assert.equal(lightImageReference('assets/frame.avif'), 'assets/frame-light.avif');
});

test('validates fallback srcset candidates as encoded JPEG files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'integrity-fallback-srcset-'));
  const avif = await sharp({ create: { width: 8, height: 6, channels: 3, background: 'red' } }).avif().toBuffer();
  const jpeg = await sharp({ create: { width: 8, height: 6, channels: 3, background: 'blue' } }).jpeg().toBuffer();
  for (const file of ['base.avif', 'base-light.avif', 'base.jpg', 'base-light.jpg', 'candidate.jpg', 'candidate-light.jpg']) await fs.writeFile(path.join(root, file), file.endsWith('.avif') ? avif : jpeg);
  const story = { scenes: [{ frames: [{ image: { avif: 'base.avif', fallback: 'base.jpg', fallbackSrcset: 'candidate.jpg 8w', width: 8, height: 6 } }] }] };
  await assert.doesNotReject(validateManifestMedia(story, { root }));
  await fs.rm(root, { recursive: true, force: true });
});

test('validates every responsive candidate and its declared geometry', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'integrity-srcset-'));
  const candidate = path.join(root, 'candidate.jpg');
  await sharp({ create: { width: 8, height: 6, channels: 3, background: 'green' } }).jpeg().toFile(candidate);
  await assert.rejects(validateImageAsset('candidate.jpg', { root, expectedFormat: 'jpeg', descriptorWidth: 9 }), /geometry|width|dimension|candidate/i);
  await fs.rm(root, { recursive: true, force: true });
});

test('collects and validates every format-specific manifest candidate', async () => {
  const manifest = { schemaVersion: 1, id: 'story', title: 'Story', scenes: [{ id: 'scene', title: 'Scene', frames: [{ id: 'frame', description: 'Description', alt: 'Alt', image: { avif: 'assets/frame.avif', fallback: 'assets/frame.jpg', avifSrcset: 'assets/frame-320.avif 320w, assets/frame-1280.avif 1280w', width: 8, height: 6 } }] }] };
  const references = collectManifestReferences(manifest);
  assert.ok(references.some((item) => item.reference === 'assets/frame-1280.avif'));
  assert.equal(parseSrcset('assets/frame-320.avif 320w, assets/frame-1280.avif 1280w').length, 2);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'integrity-manifest-'));
  await fs.mkdir(path.join(root, 'assets'), { recursive: true });
  await fs.writeFile(path.join(root, 'assets/frame.avif'), 'present');
  await fs.writeFile(path.join(root, 'assets/frame.jpg'), 'present');
  await assert.rejects(validateManifestIntegrity(manifest, { root }), /frame-1280\.avif|missing referenced asset/i);
  await fs.rm(root, { recursive: true, force: true });
});

test('format-specific srcset fields require width descriptors, the legacy field does not', () => {
  const withImage = (image) => ({ schemaVersion: 1, id: 'story', title: 'Story', scenes: [{ id: 'scene', title: 'Scene', frames: [{ id: 'frame', description: 'Description', alt: 'Alt', image: { avif: 'assets/frame.avif', fallback: 'assets/frame.jpg', width: 8, height: 6, ...image } }] }] });
  for (const field of ['avifSrcset', 'webpSrcset', 'fallbackSrcset']) {
    assert.throws(() => collectManifestReferences(withImage({ [field]: 'assets/frame.avif 1x' })), /width descriptor/i, `${field} must reject a density descriptor`);
    assert.doesNotThrow(() => collectManifestReferences(withImage({ [field]: 'assets/frame-320.avif 320w' })), `${field} must accept a width descriptor`);
  }
  assert.doesNotThrow(() => collectManifestReferences(withImage({ srcset: 'assets/frame.avif 1x' })), 'the legacy srcset field stays permissive');
});

test('rejects unsafe manifest references before filesystem access', () => {
  const manifest = { schemaVersion: 1, id: 'story', title: 'Story', scenes: [{ id: 'scene', title: 'Scene', frames: [{ id: 'frame', description: 'Description', alt: 'Alt', image: { avif: 'data:image/avif;base64,AAAA', fallback: 'assets/frame.jpg', width: 8, height: 6 } }] }] };
  assert.throws(() => collectManifestReferences(manifest), /safe|reference|data:/i);
});
