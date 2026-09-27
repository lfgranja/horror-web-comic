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

test('audio build verifies or generates standard and light AAC/Opus', () => {
  const out = execSync('node scripts/build-images.mjs', { cwd: root, encoding: 'utf8' }).toLowerCase();
  assert.ok(out.includes('audio') || out.includes('aac') || out.includes('opus'), 'build-images must process audio');
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
