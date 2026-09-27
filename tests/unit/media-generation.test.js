import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const storyPath = path.join(root, 'src/data/story.json');
const audioDirectory = path.join(root, 'assets/audio');
const buildImagesPath = path.join(root, 'scripts/build-images.mjs');
const schemaPath = path.join(root, 'specs/001-cinematic-player/contracts/story-manifest.schema.json');

function story() {
  return JSON.parse(fs.readFileSync(storyPath, 'utf8'));
}

function productionFrames() {
  return story().scenes.flatMap((scene) => scene.frames);
}

function parseSrcset(value) {
  assert.equal(typeof value, 'string');
  return value.split(',').map((candidate) => {
    const tokens = candidate.trim().split(/\s+/);
    assert.ok(tokens.length === 2, `invalid srcset candidate: ${candidate}`);
    assert.match(tokens[1], /^\d+w$/, `srcset descriptor must be a width: ${candidate}`);
    return { url: tokens[0], width: Number(tokens[1].slice(0, -1)) };
  });
}

function probeAudio(file) {
  return JSON.parse(execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=codec_name,codec_type,bit_rate,duration:format=format_name,duration,bit_rate',
    '-of', 'json',
    file
  ], { encoding: 'utf8' }));
}

function runBuild(cwd) {
  try {
    execFileSync(process.execPath, [buildImagesPath], { cwd, encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, output: '' };
  } catch (error) {
    return { code: error.status || 1, output: `${error.stdout || ''}${error.stderr || ''}` };
  }
}

test('published frame metadata declares format-specific width candidates and sizes', () => {
  for (const frame of productionFrames()) {
    for (const field of ['avifSrcset', 'webpSrcset', 'fallbackSrcset']) {
      assert.ok(frame.image[field], `${frame.id} is missing ${field}`);
      const candidates = parseSrcset(frame.image[field]);
      assert.ok(candidates.length >= 2, `${frame.id} ${field} needs multiple widths`);
      assert.deepEqual(candidates.map((candidate) => candidate.width), [...new Set(candidates.map((candidate) => candidate.width))].sort((a, b) => a - b));
    }
    assert.ok(frame.image.sizes, `${frame.id} is missing sizes`);
  }
});

test('every published responsive candidate is a real, correctly sized and correctly encoded image', async () => {
  for (const frame of productionFrames()) {
    for (const [field, expectedFormat] of [['avifSrcset', 'avif'], ['webpSrcset', 'webp'], ['fallbackSrcset', 'jpeg']]) {
      for (const candidate of parseSrcset(frame.image[field])) {
        const file = path.join(root, candidate.url);
        assert.ok(fs.existsSync(file), `missing ${candidate.url}`);
        assert.equal(path.extname(file).toLowerCase(), expectedFormat === 'jpeg' ? '.jpg' : `.${expectedFormat}`);
        const metadata = await sharp(file).metadata();
        if (expectedFormat === 'avif') {
          assert.equal(metadata.format, 'heif', `${file} has the wrong encoded format`);
          assert.equal(metadata.compression, 'av1', `${file} is not AV1-in-AVIF`);
        } else {
          assert.equal(metadata.format, expectedFormat === 'jpeg' ? 'jpeg' : expectedFormat, `${file} has the wrong encoded format`);
        }
        assert.equal(metadata.width, candidate.width, `${file} does not match its width descriptor`);
        assert.ok(Math.max(metadata.width, metadata.height) <= (candidate.url.includes('-light') ? 1280 : 2560), `${file} exceeds its image cap`);
        const bytes = fs.statSync(file).size;
        assert.ok(bytes <= (candidate.url.includes('-light') ? 150 * 1024 : 300 * 1024), `${file} exceeds its byte cap`);
        const lightWidth = Math.min(candidate.width, 1280);
        const lightUrl = candidate.url.replace(/-(\d+)\.(avif|webp|jpg)$/, `-light-${lightWidth}.$2`);
        const lightFile = path.join(root, lightUrl);
        assert.ok(fs.existsSync(lightFile), `missing ${lightUrl}`);
        const lightMetadata = await sharp(lightFile).metadata();
        if (expectedFormat === 'avif') {
          assert.equal(lightMetadata.format, 'heif', `${lightFile} has the wrong encoded format`);
          assert.equal(lightMetadata.compression, 'av1', `${lightFile} is not AV1-in-AVIF`);
        } else {
          assert.equal(lightMetadata.format, expectedFormat === 'jpeg' ? 'jpeg' : expectedFormat, `${lightFile} has the wrong encoded format`);
        }
        assert.ok(Math.max(lightMetadata.width, lightMetadata.height) <= 1280, `${lightFile} exceeds 1280px`);
        assert.ok(fs.statSync(lightFile).size <= 150 * 1024, `${lightFile} exceeds 150KB`);
      }
    }
  }
});

test('standard and light audio have finite in-range bitrates and usable duration', () => {
  const tracks = story().scenes.flatMap((scene) => [scene.audio, ...scene.frames.map((frame) => frame.audio)].filter(Boolean));
  assert.ok(tracks.length > 0, 'manifest declares no audio tracks');
  for (const track of tracks) {
    assert.match(track.src, /\.aac$/, `standard track must be AAC: ${track.src}`);
    for (const [file, codec, format, minimum, maximum] of [
      [track.src, 'aac', 'aac', 96000, 128000],
      [track.src.replace(/\.aac$/, '-light.opus'), 'opus', 'ogg', 48000, 64000]
    ]) {
      const asset = path.join(root, file);
      assert.ok(fs.existsSync(asset), `missing ${file}`);
      const probe = probeAudio(asset);
      const stream = probe.streams?.find((entry) => entry.codec_type === 'audio');
      assert.equal(stream?.codec_name, codec);
      assert.match(probe.format?.format_name || '', new RegExp(format));
      const bitrate = Number(stream?.bit_rate || probe.format?.bit_rate);
      assert.ok(Number.isFinite(bitrate), `${file} has no measurable bitrate`);
      assert.ok(bitrate >= minimum && bitrate <= maximum, `${file} bitrate ${bitrate} is outside the required range`);
      assert.ok(Number(probe.format.duration) >= 1, `${file} is too short`);
    }
  }
});

test('the publishable asset tree carries no noncompliant placeholders', () => {
  const published = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else published.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  walk(audioDirectory);
  assert.ok(published.length > 0);
  for (const file of published) {
    assert.doesNotMatch(file, /\.wav$/i, `uncompressed WAV must not be published: ${file}`);
    const probe = probeAudio(path.join(root, file));
    const stream = probe.streams?.find((entry) => entry.codec_type === 'audio');
    const isLight = file.includes('-light');
    assert.equal(stream?.codec_name, isLight ? 'opus' : 'aac', `${file} uses the wrong delivery codec`);
    const bitrate = Number(stream?.bit_rate || probe.format?.bit_rate);
    const [minimum, maximum] = isLight ? [48000, 64000] : [96000, 128000];
    assert.ok(bitrate >= minimum && bitrate <= maximum, `${file} bitrate ${bitrate} is outside ${minimum}-${maximum}`);
  }
});

test('schema accepts legacy image metadata and validates the new responsive fields', () => {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const legacy = {
    schemaVersion: 1,
    id: 'legacy',
    title: 'Legacy',
    scenes: [{ id: 'scene', title: 'Scene', frames: [{ id: 'frame', image: { avif: 'frame.avif', fallback: 'frame.jpg', width: 10, height: 10 }, alt: 'Frame', description: 'Description' }] }]
  };
  assert.equal(validate(legacy), true, JSON.stringify(validate.errors));
  const responsive = structuredClone(legacy);
  responsive.scenes[0].frames[0].image.avifSrcset = 'frame-320.avif 320w, frame-640.avif 640w';
  responsive.scenes[0].frames[0].image.webpSrcset = 'frame-320.webp 320w, frame-640.webp 640w';
  responsive.scenes[0].frames[0].image.fallbackSrcset = 'frame-320.jpg 320w, frame-640.jpg 640w';
  responsive.scenes[0].frames[0].image.sizes = '100vw';
  assert.equal(validate(responsive), true, JSON.stringify(validate.errors));
  responsive.scenes[0].frames[0].image.avifSrcset = 'frame.jpg 1x';
  assert.equal(validate(responsive), false);
});

test('the build refuses to publish assets the manifest never references', async () => {
  const { collectPublishableAssetReferences, findUnreferencedAssets } = await import('../../scripts/build.mjs');
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'media-generation-'));
  try {
    fs.mkdirSync(path.join(temporaryRoot, 'assets/frames/generated'), { recursive: true });
    fs.writeFileSync(path.join(temporaryRoot, 'assets/frames/frame.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 20, b: 30 } } }).png().toFile(path.join(temporaryRoot, 'assets/frames/generated/stray.png'));
    const manifest = {
      schemaVersion: 1,
      id: 'x',
      title: 'X',
      scenes: [{ id: 's', title: 'S', frames: [{ id: 'f', alt: 'a', description: 'd', image: { avif: 'assets/frames/frame.svg', fallback: 'assets/frames/frame.svg', width: 10, height: 10 } }] }]
    };
    const allowed = [...collectPublishableAssetReferences(manifest)];
    assert.ok(allowed.includes('assets/frames/frame.svg'), 'a referenced asset must be publishable');
    assert.ok(!allowed.includes('assets/frames/generated/stray.png'), 'an unreferenced asset must not be publishable');
    const unreferenced = await findUnreferencedAssets(manifest, temporaryRoot);
    assert.deepEqual(unreferenced, ['assets/frames/generated/stray.png']);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('the build counts only manifest-referenced assets against the total budget', async () => {
  const { findUnreferencedAssets } = await import('../../scripts/build.mjs');
  const unreferenced = await findUnreferencedAssets(story(), root);
  assert.deepEqual(unreferenced, [], `unreferenced assets present in the publishable tree: ${unreferenced.join(', ')}`);
});

test('image build rejects a mislabeled stale AVIF publication', async () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'media-generation-'));
  try {
    fs.mkdirSync(path.join(temporaryRoot, 'assets/frames'), { recursive: true });
    fs.mkdirSync(path.join(temporaryRoot, 'assets/audio'), { recursive: true });
    const source = path.join(temporaryRoot, 'assets/frames/frame.svg');
    fs.writeFileSync(source, '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    const jpeg = await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } } }).jpeg().toBuffer();
    const mislabeled = path.join(temporaryRoot, 'assets/frames/generated/frame.avif');
    fs.mkdirSync(path.dirname(mislabeled), { recursive: true });
    fs.writeFileSync(mislabeled, jpeg);
    const future = new Date(Date.now() + 10000);
    fs.utimesSync(source, new Date(Date.now() - 20000), new Date(Date.now() - 20000));
    fs.utimesSync(mislabeled, future, future);
    const result = runBuild(temporaryRoot);
    assert.notEqual(result.code, 0, 'a JPEG mislabeled as AVIF must fail the build');
    assert.match(result.output, /avif|format/i);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
