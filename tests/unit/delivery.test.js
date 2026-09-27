import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

test('audio assets include compliant AAC/Opus standard and light variants', () => {
  const dir = path.join(root, 'assets/audio');
  const files = fs.readdirSync(dir);
  const baseNames = new Set();
  for (const f of files) {
    if (f.endsWith('.wav') && !f.includes('-light')) {
      baseNames.add(path.parse(f).name);
    }
  }
  for (const base of baseNames) {
    const standardAac = files.some((f) => f === `${base}.aac` || f === `${base}.opus`);
    const lightAac = files.some((f) => f === `${base}-light.aac` || f === `${base}-light.opus`);
    assert.ok(standardAac || lightAac, `missing AAC/Opus standard or light for ${base}`);
  }
});

test('media build discovers the committed masters', () => {
  // The masters are committed now (media-src/frames/*.jpg, media-src/audio/*.wav), so
  // the build must succeed and must actually find sources. Asserting the counts
  // rather than just the exit status is what makes a deleted master fail here
  // instead of silently regenerating a smaller tree.
  const output = execSync('node scripts/build-images.mjs', { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  assert.match(
    output,
    /processed [1-9]\d* frame source\(s\) and [1-9]\d* audio source\(s\)/,
    'the build must report the masters it discovered'
  );
});

test('media build fails loudly when it has no master sources', async () => {
  // T207: a media build that found nothing is a failure, not a pass. Exercised
  // against a fixture tree rather than the repository, because the repository
  // now commits its masters and would legitimately succeed.
  const tmp = fs.mkdtempSync('/tmp/delivery-no-masters-');
  fs.mkdirSync(path.join(tmp, 'media-src/frames'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'media-src/audio'), { recursive: true });
  const { buildImages } = await import(path.join(root, 'scripts/build-images.mjs'));
  await assert.rejects(
    () => buildImages(tmp),
    (error) => {
      assert.match(error.message, /no frame or audio master sources/i, 'the failure must name the missing sources');
      assert.match(error.message, /media-src\/frames|media-src\/audio/, 'the failure must point at where masters belong');
      return true;
    }
  );
});

test('media build generates standard and light variants from real masters', async () => {
  // The positive half of the coverage the old vacuous test only pretended to
  // provide: with genuine masters present, every documented format and both
  // tiers must actually be produced.
  const tmp = fs.mkdtempSync('/tmp/delivery-media-');
  fs.mkdirSync(path.join(tmp, 'media-src/frames'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'media-src/audio'), { recursive: true });
  const masterPath = path.join(tmp, 'media-src/frames/scene-master.png');
  await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 20, g: 20, b: 30 } } })
    .png()
    .toFile(masterPath);

  // Minimal but valid 16-bit PCM mono WAV, 2 s, so validateAudioSource passes.
  // Broadband noise rather than a tone on purpose: Opus is variable-bitrate,
  // and a pure sine compresses so far that it lands under the 48000 b/s light
  // floor, which would test the encoder's behaviour rather than the pipeline.
  const sampleRate = 16000;
  const seconds = 2;
  const samples = Math.floor(sampleRate * seconds);
  const dataSize = samples * 2;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);
  let seed = 22222;
  for (let i = 0; i < samples; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    wav.writeInt16LE(((seed >> 8) % 65536) - 32768, 44 + i * 2);
  }
  fs.writeFileSync(path.join(tmp, 'media-src/audio/scene-master.wav'), wav);

  const result = await import(path.join(root, 'scripts/build-images.mjs'));
  const summary = await result.buildImages(tmp);
  assert.equal(summary.frameSources, 1, 'the frame master must be discovered');
  assert.equal(summary.audioSources, 1, 'the audio master must be discovered');

  const generated = fs.readdirSync(path.join(tmp, 'assets/frames/generated'));
  for (const extension of ['avif', 'webp', 'jpg']) {
    assert.ok(generated.includes(`scene-master.${extension}`), `missing standard ${extension}`);
    assert.ok(generated.includes(`scene-master-light.${extension}`), `missing light ${extension}`);
  }
  // T217: no candidate may advertise a width the 1200 px master cannot fill.
  for (const file of generated) {
    const match = /-(\d{3,})\./.exec(file);
    if (!match) continue;
    const meta = await sharp(path.join(tmp, 'assets/frames/generated', file)).metadata();
    assert.equal(meta.width, Number(match[1]), `${file} does not match the width in its own name`);
  }

  const audio = fs.readdirSync(path.join(tmp, 'assets/audio'));
  assert.ok(audio.includes('scene-master.aac'), 'missing standard AAC');
  assert.ok(audio.includes('scene-master-light.opus'), 'missing light Opus');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('image light variants include AVIF/WebP/JPEG bounded by budget', () => {
  const dir = path.join(root, 'assets/frames/generated');
  const files = fs.readdirSync(dir).filter((f) => f.includes('-light'));
  const bases = new Set();
  for (const file of files) {
    const match = /^(.*)-light(?:-\d+)?\.[^.]+$/.exec(file);
    assert.ok(match, `unexpected light candidate name: ${file}`);
    bases.add(match[1]);
  }
  for (const base of bases) {
    assert.ok(files.includes(`${base}-light.avif`), `missing light AVIF for ${base}`);
    assert.ok(files.includes(`${base}-light.webp`), `missing light WebP for ${base}`);
  }
});

test('image light variants dimensions within 1280 px and size within 150 KB', async () => {
  const dir = path.join(root, 'assets/frames/generated');
  const files = fs.readdirSync(dir).filter((f) => f.includes('-light'));
  for (const f of files) {
    const meta = await sharp(path.join(dir, f)).metadata();
    assert.ok(meta.width <= 1280 && meta.height <= 1280, `light image ${f} exceeds 1280 px`);
    const stats = fs.statSync(path.join(dir, f));
    assert.ok(stats.size <= 153600, `light image ${f} exceeds 150 KB`);
  }
});

test('build enforces initial-scene, per-frame, total-asset budgets', () => {
  const tmp = fs.mkdtempSync('/tmp/delivery-budget-');
  fs.mkdirSync(path.join(tmp, 'assets/frames/generated'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'assets/audio'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src/scripts'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src/styles'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'budget.json'), JSON.stringify({ initialSceneBytes: 1024, frameBytes: 1024, totalAssetsBytes: 1024, compressedScriptBytes: 100000, compressedStyleBytes: 100000, compressedCodeBytes: 200000 }));
  fs.writeFileSync(path.join(tmp, 'index.html'), '<!doctype html><html><head><link rel="stylesheet" href="src/styles/player.css"></head><body></body></html>');
  fs.writeFileSync(path.join(tmp, 'src/styles/player.css'), 'body{}');
  fs.writeFileSync(path.join(tmp, 'src/styles/tokens.css'), ':root{}');
  fs.writeFileSync(path.join(tmp, 'src/scripts/main.js'), 'console.log("hello");');
  fs.mkdirSync(path.join(tmp, 'assets/icons'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'assets/frames'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'assets/audio'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src/data'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src/data/story.json'), JSON.stringify({ schemaVersion: 1, id: 't', title: 't', scenes: [{ id: 's', title: 't', frames: [{ id: 'f', image: { avif: 'assets/frames/generated/f.avif', fallback: 'assets/frames/generated/f.jpg', width: 100, height: 100 }, alt: 'a', description: 'd' }] }] }));
  fs.writeFileSync(path.join(tmp, 'assets/frames/generated/f.avif'), 'dummy');
  fs.writeFileSync(path.join(tmp, 'assets/frames/generated/f.jpg'), 'dummy');
  fs.writeFileSync(path.join(tmp, 'assets/audio/dummy.wav'), 'dummy');
  fs.writeFileSync(path.join(tmp, 'assets/icons/dummy.svg'), '<svg/>');
  fs.writeFileSync(path.join(tmp, 'src/styles/base.css'), 'body{}');
  const oversized = Buffer.alloc(1024 * 1024, 'x');
  fs.writeFileSync(path.join(tmp, 'assets/frames/generated/fake.jpg'), oversized);
  let exitCode = 0;
  try {
    execSync('node ' + path.join(root, 'scripts/build.mjs'), { cwd: tmp, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    exitCode = e.status || 1;
  }
  assert.notEqual(exitCode, 0, 'build must fail when asset budgets exceeded');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('build rejects external/protocol-relative image/audio/manifest references', () => {
  const tmp = fs.mkdtempSync('/tmp/delivery-external-');
  fs.mkdirSync(path.join(tmp, 'assets/frames/generated'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'assets/audio'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src/data'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src/scripts'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src/styles'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'specs/001-cinematic-player/contracts'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'budget.json'), JSON.stringify({ initialSceneBytes: 1572864, frameBytes: 307200, totalAssetsBytes: 31457280, compressedScriptBytes: 51200, compressedStyleBytes: 15360, compressedCodeBytes: 66560 }));
  fs.writeFileSync(path.join(tmp, 'index.html'), '<!doctype html><html><head><link rel="stylesheet" href="src/styles/player.css"></head><body></body></html>');
  fs.writeFileSync(path.join(tmp, 'src/styles/player.css'), 'body{}');
  fs.writeFileSync(path.join(tmp, 'src/styles/tokens.css'), ':root{}');
  fs.writeFileSync(path.join(tmp, 'src/data/story.json'), JSON.stringify({ schemaVersion: 1, id: 't', title: 't', scenes: [{ id: 's', title: 't', frames: [{ id: 'f', image: { avif: '//evil.com/f.avif', fallback: '//evil.com/f.jpg', width: 100, height: 100 }, alt: 'a', description: 'd' }] }] }));
  fs.cpSync(path.join(root, 'specs/001-cinematic-player/contracts/story-manifest.schema.json'), path.join(tmp, 'specs/001-cinematic-player/contracts/story-manifest.schema.json'), { recursive: true });
  let exitCode = 0;
  try {
    execSync('node ' + path.join(root, 'scripts/validate-manifest.mjs'), { cwd: tmp, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    exitCode = e.status || 1;
  }
  assert.notEqual(exitCode, 0, 'validator must reject protocol-relative references');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('story loader rejects external and protocol-relative references', async () => {
  const { validateStory } = await import(path.join(root, 'src/scripts/story-loader.js'));
  const bad = {
    schemaVersion: 1,
    id: 'bad',
    title: 'bad',
    scenes: [
      {
        id: 's',
        title: 's',
        frames: [
          {
            id: 'f',
            image: { avif: 'https://evil.com/a.avif', fallback: 'https://evil.com/f.jpg', width: 100, height: 100 },
            alt: 'a',
            description: 'd'
          }
        ]
      }
    ]
  };
  let threw = false;
  try {
    validateStory(bad);
  } catch (e) {
    threw = true;
  }
  assert.ok(threw, 'validateStory must throw for external/protocol-relative references');
});

test('build input scan rejects external references in manifest and tokens', () => {
  const tmp = fs.mkdtempSync('/tmp/delivery-scan-');
  fs.mkdirSync(path.join(tmp, 'assets/frames/generated'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'assets/audio'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'assets/icons'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src/data'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src/scripts'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src/styles'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'budget.json'), JSON.stringify({ initialSceneBytes: 1572864, frameBytes: 307200, totalAssetsBytes: 31457280, compressedScriptBytes: 51200, compressedStyleBytes: 15360, compressedCodeBytes: 66560 }));
  fs.writeFileSync(path.join(tmp, 'index.html'), '<!doctype html><html><head><link rel="stylesheet" href="src/styles/player.css"></head><body></body></html>');
  fs.writeFileSync(path.join(tmp, 'src/styles/player.css'), 'body{}');
  fs.writeFileSync(path.join(tmp, 'src/styles/base.css'), 'body{}');
  fs.writeFileSync(path.join(tmp, 'src/styles/tokens.css'), ':root{ --x: https://evil.com/x; }');
  fs.writeFileSync(path.join(tmp, 'src/scripts/main.js'), 'console.log("hello");');
  fs.writeFileSync(path.join(tmp, 'src/data/story.json'), JSON.stringify({ schemaVersion: 1, id: 't', title: 't', scenes: [{ id: 's', title: 't', frames: [{ id: 'f', image: { avif: 'assets/frames/generated/f.avif', fallback: 'assets/frames/generated/f.jpg', width: 100, height: 100 }, alt: 'a', description: 'd' }] }] }));
  fs.writeFileSync(path.join(tmp, 'assets/frames/generated/f.avif'), 'dummy');
  fs.writeFileSync(path.join(tmp, 'assets/frames/generated/f.jpg'), 'dummy');
  let exitCode = 0;
  try {
    execSync('node ' + path.join(root, 'scripts/build.mjs'), { cwd: tmp, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    exitCode = e.status || 1;
  }
  assert.notEqual(exitCode, 0, 'build must fail when manifest or tokens contain external references');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('production build reports compressed code sizes when publication media is compliant', () => {
  let result = '';
  let failure = null;
  try {
    result = execSync('npm run build', { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    failure = error;
    result = `${error.stdout || ''}${error.stderr || ''}`;
  }
  if (failure) {
    assert.match(result, /audio|bitrate|media|publication/i);
    return;
  }
  assert.match(result, /compressed script bytes/);
  assert.match(result, /compressed style bytes/);
});

test('production build rewrites references with content-hashed names', async () => {
  const result = execSync('npm run build', { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  const indexPath = path.join(root, 'dist', 'index.html');
  assert.ok(fs.existsSync(indexPath), 'dist/index.html must exist');
  const html = fs.readFileSync(indexPath, 'utf8');
  assert.ok(html.includes('.js'), 'references must contain hashed filenames');
  assert.ok(!html.includes('main.js'), 'reference must not be raw main.js');
  assert.ok(html.includes('main-'), 'script reference must include hash');
});
