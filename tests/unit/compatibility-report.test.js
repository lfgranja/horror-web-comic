import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCompatibilityReport, renderCompatibilityReport, parseArguments, main } from '../../scripts/compatibility-report.mjs';
import { readSchema } from '../../scripts/validate-manifest.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCHEMA = await readSchema(REPO_ROOT, 'specs/001-cinematic-player/contracts/story-manifest.schema.json');
const BUDGETS = JSON.parse(await fs.readFile(path.join(REPO_ROOT, 'budget.json'), 'utf8'));

function frame(id, overrides = {}) {
  return {
    id,
    image: {
      avif: 'assets/frames/f1.avif',
      webp: 'assets/frames/f1.webp',
      fallback: 'assets/frames/f1.jpg',
      avifSrcset: 'assets/frames/f1-320.avif 320w, assets/frames/f1-1280.avif 1280w',
      sizes: '100vw',
      width: 1280,
      height: 800,
      ...overrides.image
    },
    alt: 'A porta do vestíbulo fechada no escuro.',
    description: 'Uma porta de madeira com uma placa metálica no centro da moldura.',
    ...overrides
  };
}

function story(overrides = {}) {
  return {
    schemaVersion: 1,
    id: 'demo',
    title: 'Demo',
    defaultFrameDurationMs: 1500,
    defaultTransition: { type: 'fade', durationMs: 600, easing: 'ease-in-out' },
    scenes: [
      {
        id: 'scene-01',
        title: 'A entrada',
        frames: [frame('frame-01'), frame('frame-02', { image: { avif: 'assets/frames/f2.avif', webp: 'assets/frames/f2.webp', fallback: 'assets/frames/f2.jpg', avifSrcset: 'assets/frames/f2-320.avif 320w', sizes: '100vw', width: 1280, height: 800 } })]
      }
    ],
    ...overrides
  };
}

const IMAGE_FILES = ['assets/frames/f1.avif', 'assets/frames/f1.webp', 'assets/frames/f1.jpg', 'assets/frames/f1-320.avif', 'assets/frames/f1-1280.avif', 'assets/frames/f1-light.avif', 'assets/frames/f1-light-320.avif', 'assets/frames/f1-light-1280.avif', 'assets/frames/f1-light.webp', 'assets/frames/f1-light.jpg', 'assets/frames/f2.avif', 'assets/frames/f2.webp', 'assets/frames/f2.jpg', 'assets/frames/f2-320.avif', 'assets/frames/f2-light.avif', 'assets/frames/f2-light-320.avif', 'assets/frames/f2-light.webp', 'assets/frames/f2-light.jpg'];

async function createProject(manifest, { files = IMAGE_FILES, name = 'story.json' } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'compatibility-report-'));
  for (const file of files) {
    const target = path.join(root, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, Buffer.alloc(64));
  }
  await fs.writeFile(path.join(root, name), typeof manifest === 'string' ? manifest : JSON.stringify(manifest, null, 2));
  return { root, cleanup: () => fs.rm(root, { recursive: true, force: true }) };
}

function reportFor(project, { budgets = BUDGETS, ...options } = {}) {
  return buildCompatibilityReport({ manifestPath: 'story.json', root: project.root, schema: SCHEMA, budgets, ...options });
}

test('reports a compatible manifest with a structural summary', async (t) => {
  const project = await createProject(story());
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.equal(report.verdict, 'compatible');
  assert.equal(report.summary.scenes, 1);
  assert.equal(report.summary.frames, 2);
  assert.equal(report.summary.missingReferences, 0);
  assert.equal(report.checks.structure, 'pass');
  assert.equal(report.checks.references, 'pass');
  assert.equal(report.checks.assets, 'pass');
  assert.deepEqual(report.findings, []);
  assert.match(report.subject.fingerprint, /^mcr-[0-9a-f]{12}$/);
});

test('fingerprints identical input identically and different input differently', async (t) => {
  const first = await createProject(story());
  const second = await createProject(story());
  const other = await createProject(story({ title: 'Outro' }));
  t.after(() => Promise.all([first.cleanup(), second.cleanup(), other.cleanup()]));
  const a = await reportFor(first);
  const b = await reportFor(second);
  const c = await reportFor(other);
  assert.equal(a.subject.fingerprint, b.subject.fingerprint);
  assert.notEqual(a.subject.fingerprint, c.subject.fingerprint);
});

test('verdict is incompatible and the schemaVersion error is reported', async (t) => {
  const project = await createProject(story({ schemaVersion: 2 }));
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.equal(report.verdict, 'incompatible');
  assert.ok(report.findings.some((item) => item.severity === 'error' && item.field === '/schemaVersion'));
});

test('rejects a non-local reference as a portability error', async (t) => {
  const manifest = story();
  manifest.scenes[0].frames[0].image.fallback = 'https://cdn.example/frame.jpg';
  const project = await createProject(manifest);
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.equal(report.verdict, 'incompatible');
  assert.equal(report.checks.references, 'fail');
  assert.ok(report.findings.some((item) => item.category === 'portability' && item.severity === 'error'));
});

test('rejects a parent-directory reference as a portability error', async (t) => {
  const manifest = story();
  manifest.scenes[0].frames[0].image.fallback = '../secrets/frame.jpg';
  const project = await createProject(manifest);
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.equal(report.verdict, 'incompatible');
  assert.ok(report.findings.some((item) => item.category === 'portability'));
});

test('reports a missing asset and fails the asset check', async (t) => {
  const project = await createProject(story(), { files: IMAGE_FILES.filter((file) => file !== 'assets/frames/f2.jpg') });
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.equal(report.verdict, 'incompatible');
  assert.equal(report.checks.assets, 'fail');
  assert.equal(report.summary.missingReferences, 1);
  assert.ok(report.findings.some((item) => item.category === 'assets' && item.severity === 'error' && item.field === 'assets/frames/f2.jpg'));
});

test('skips the asset checks when they are disabled', async (t) => {
  const project = await createProject(story(), { files: [] });
  t.after(project.cleanup);
  const report = await reportFor(project, { checkAssets: false });
  assert.equal(report.verdict, 'compatible');
  assert.equal(report.checks.assets, 'skipped');
  assert.equal(report.checks.lightVariants, 'skipped');
  assert.equal(report.summary.declaredBytes, null);
});

test('warns when a light variant is not generated and stays compatible', async (t) => {
  const project = await createProject(story(), { files: IMAGE_FILES.filter((file) => !file.includes('-light')) });
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.equal(report.verdict, 'compatible');
  assert.equal(report.checks.lightVariants, 'advisory');
  assert.ok(report.lightVariants.missing.includes('assets/frames/f1-light.avif'));
  assert.ok(report.findings.some((item) => item.category === 'light-variants' && item.severity === 'warning'));
  assert.ok(report.findings.every((item) => item.severity !== 'error'));
});

test('warns when the light audio variant is missing', async (t) => {
  const manifest = story();
  manifest.scenes[0].audio = { id: 'scene-01-audio', src: 'assets/audio/scene-01.aac', loop: true, volume: 0.6 };
  const project = await createProject(manifest, { files: [...IMAGE_FILES, 'assets/audio/scene-01.aac'] });
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.equal(report.summary.audioTracks, 1);
  assert.ok(report.lightVariants.missing.includes('assets/audio/scene-01-light.opus'));
  assert.equal(report.verdict, 'compatible');
});

test('finds no light finding when every variant is generated', async (t) => {
  const project = await createProject(story());
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.deepEqual(report.lightVariants.missing, []);
  assert.equal(report.checks.lightVariants, 'pass');
  assert.ok(report.lightVariants.expected > 0);
});

test('flags declared bytes over the delivery budget as an error', async (t) => {
  const project = await createProject(story());
  t.after(project.cleanup);
  const report = await reportFor(project, { budgets: { initialSceneBytes: 10, frameBytes: 10, totalAssetsBytes: 10 } });
  assert.equal(report.verdict, 'incompatible');
  assert.equal(report.checks.budgets, 'fail');
  assert.equal(report.budgets.total.over, true);
  assert.equal(report.budgets.initialScene.over, true);
  assert.equal(report.budgets.maxFrame.over, true);
  assert.ok(report.findings.some((item) => item.category === 'budget' && item.severity === 'error'));
});

test('reports the heaviest frame and the initial scene separately', async (t) => {
  const project = await createProject(story());
  t.after(project.cleanup);
  const report = await reportFor(project, { budgets: { initialSceneBytes: 1_000_000, frameBytes: 1, totalAssetsBytes: 1_000_000 } });
  assert.equal(report.budgets.maxFrame.over, true);
  assert.equal(report.budgets.initialScene.over, false);
  assert.equal(report.budgets.total.over, false);
});

test('skips the budget comparison when disabled', async (t) => {
  const project = await createProject(story());
  t.after(project.cleanup);
  const report = await reportFor(project, { checkBudgets: false });
  assert.equal(report.checks.budgets, 'skipped');
  assert.equal(report.budgets, null);
});

test('warns when intrinsic dimensions are not declared', async (t) => {
  const manifest = story();
  delete manifest.scenes[0].frames[0].image.width;
  delete manifest.scenes[0].frames[0].image.height;
  const project = await createProject(manifest);
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.equal(report.checks.stability, 'advisory');
  assert.ok(report.findings.some((item) => item.category === 'stability' && item.field.endsWith('.image')));
});

test('warns when a srcset is declared without sizes', async (t) => {
  const manifest = story();
  delete manifest.scenes[0].frames[0].image.sizes;
  const project = await createProject(manifest);
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.ok(report.findings.some((item) => item.category === 'stability' && item.field.endsWith('.sizes')));
});

test('advisories do not make the manifest incompatible', async (t) => {
  const manifest = story();
  manifest.scenes[0].frames[0].alt = 'x';
  const project = await createProject(manifest);
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.equal(report.verdict, 'compatible');
  assert.ok(report.findings.some((item) => item.category === 'accessibility' && item.severity === 'advisory'));
});

test('lists what the report does not check', async (t) => {
  const project = await createProject(story());
  t.after(project.cleanup);
  const report = await reportFor(project);
  assert.ok(report.notChecked.length >= 5);
  assert.ok(report.notChecked.some((item) => item.includes('WCAG')));
  assert.ok(report.notChecked.some((item) => item.includes('Lighthouse')));
});

test('next steps call for the build when compatible and for the fixes when not', async (t) => {
  const project = await createProject(story());
  t.after(project.cleanup);
  const compatible = await reportFor(project);
  assert.ok(compatible.nextSteps.every((item) => !item.includes('Fix the')));
  const broken = await createProject(story({ schemaVersion: 9 }));
  t.after(broken.cleanup);
  const incompatible = await reportFor(broken);
  assert.ok(incompatible.nextSteps.some((item) => item.startsWith('Fix the')));
});

test('appends a contact call to action only when one is supplied', async (t) => {
  const project = await createProject(story());
  t.after(project.cleanup);
  const without = await reportFor(project);
  assert.ok(without.nextSteps.every((item) => !item.includes('@')));
  const with_ = await reportFor(project, { contact: 'hello@example.com' });
  assert.ok(with_.nextSteps.some((item) => item.includes('hello@example.com')));
});

test('reports malformed JSON and a missing manifest as report errors', async (t) => {
  const malformed = await createProject('{ not json', { files: [] });
  t.after(malformed.cleanup);
  await assert.rejects(() => reportFor(malformed), (error) => error.code === 'manifest-malformed');
  const missing = await createProject(story(), { files: [] });
  t.after(missing.cleanup);
  await assert.rejects(() => reportFor(missing, { manifestPath: 'absent.json' }), (error) => error.code === 'manifest-unavailable');
});

test('renders text with the verdict, findings ordered by severity and every check', async (t) => {
  const manifest = story({ schemaVersion: 3 });
  manifest.scenes[0].frames[0].image.fallback = 'https://cdn.example/x.jpg';
  const project = await createProject(manifest, { files: IMAGE_FILES.filter((file) => !file.includes('-light')) });
  t.after(project.cleanup);
  const report = await reportFor(project);
  const text = renderCompatibilityReport(report);
  assert.match(text, /INCOMPATIBLE/);
  assert.match(text, /\[ERROR\]/);
  assert.match(text, /\[WARN \]/);
  assert.ok(text.indexOf('[ERROR]') < text.indexOf('[WARN ]'));
  assert.match(text, /next steps/);
  assert.match(text, /not checked by this report/);
});

test('renders markdown with a findings table when there are findings', async (t) => {
  const project = await createProject(story(), { files: IMAGE_FILES.filter((file) => !file.includes('-light')) });
  t.after(project.cleanup);
  const report = await reportFor(project);
  const markdown = renderCompatibilityReport(report, { format: 'markdown' });
  assert.match(markdown, /^# Manifest compatibility report — COMPATIBLE/);
  assert.match(markdown, /## Summary/);
  assert.match(markdown, /\| Severity \| Category \| Field \| Detail \|/);
  assert.match(markdown, /- Lighthouse performance and accessibility scores/);
  assert.match(markdown, /\| warning \| light-variants \|/);
});

test('renders an empty findings table as an explicit none', async (t) => {
  const project = await createProject(story());
  t.after(project.cleanup);
  const report = await reportFor(project);
  const markdown = renderCompatibilityReport(report, { format: 'markdown' });
  assert.match(markdown, /## Findings\n\nNone\./);
});

test('renders json that round-trips the report', async (t) => {
  const project = await createProject(story());
  t.after(project.cleanup);
  const report = await reportFor(project);
  const parsed = JSON.parse(renderCompatibilityReport(report, { format: 'json' }));
  assert.equal(parsed.verdict, report.verdict);
  assert.equal(parsed.subject.fingerprint, report.subject.fingerprint);
});

test('parses the manifest path, the switches and the shorthands', () => {
  assert.equal(parseArguments(['other/story.json']).manifestPath, 'other/story.json');
  assert.equal(parseArguments([]).manifestPath, 'src/data/story.json');
  assert.equal(parseArguments(['--json']).format, 'json');
  assert.equal(parseArguments(['--markdown']).format, 'markdown');
  assert.equal(parseArguments(['--format', 'json']).format, 'json');
  assert.equal(parseArguments(['--root', '/tmp/x']).root, '/tmp/x');
  assert.equal(parseArguments(['--out', 'r.md']).out, 'r.md');
  assert.equal(parseArguments(['--contact', 'a@b.c']).contact, 'a@b.c');
  assert.equal(parseArguments(['--no-assets']).checkAssets, false);
  assert.equal(parseArguments(['--no-light']).checkLightVariants, false);
  assert.equal(parseArguments(['--no-budgets']).checkBudgets, false);
  assert.equal(parseArguments(['--help']).help, true);
  assert.throws(() => parseArguments(['--nope']), (error) => error.code === 'bad-argument');
  assert.throws(() => parseArguments(['a.json', 'b.json']), (error) => error.code === 'bad-argument');
  assert.throws(() => parseArguments(['--format', 'xml']), (error) => error.code === 'bad-argument');
});

test('main writes the report to stdout and signals incompatibility with exit code 1', async (t) => {
  const good = await createProject(story());
  const bad = await createProject(story({ schemaVersion: 4 }));
  t.after(() => Promise.all([good.cleanup(), bad.cleanup()]));
  const chunks = [];
  const out = { write: (value) => chunks.push(value) };
  const err = { write: (value) => chunks.push(value) };
  const options = { manifestPath: 'story.json', root: good.root, schema: SCHEMA, budgets: BUDGETS };
  assert.equal(await main(['story.json', '--root', good.root], { out, err }), 0);
  assert.match(chunks.join(''), /COMPATIBLE/);
  assert.equal(await main(['story.json', '--root', bad.root], { out, err }), 1);
  assert.ok(options.root);
});

test('main writes to a file when asked and prints usage for --help', async (t) => {
  const project = await createProject(story());
  t.after(project.cleanup);
  const target = path.join(project.root, 'report.md');
  const out = { write: () => {} };
  const code = await main(['story.json', '--root', project.root, '--markdown', '--out', target], { out, err: { write: () => {} } });
  assert.equal(code, 0);
  assert.match(await fs.readFile(target, 'utf8'), /# Manifest compatibility report/);
  let usage = '';
  assert.equal(await main(['--help'], { out: { write: (value) => { usage += value; } }, err: { write: () => {} } }), 0);
  assert.match(usage, /Usage: node scripts\/compatibility-report\.mjs/);
});

test('audits the committed story manifest as compatible', async () => {
  const report = await buildCompatibilityReport({ manifestPath: 'src/data/story.json', root: REPO_ROOT, schema: SCHEMA, budgets: BUDGETS });
  assert.equal(report.verdict, 'compatible');
  assert.equal(report.summary.missingReferences, 0);
  assert.deepEqual(report.lightVariants.missing, []);
  assert.ok(report.summary.declaredBytes > 0);
});

test('infers the project root from the conventional src/data layout', async () => {
  const report = await buildCompatibilityReport({ manifestPath: 'src/data/story.json', schema: SCHEMA, budgets: BUDGETS });
  assert.equal(report.subject.manifest, path.join('src', 'data', 'story.json'));
  assert.equal(report.verdict, 'compatible');
  assert.equal(report.summary.missingReferences, 0);
  assert.equal(report.subject.root, REPO_ROOT);
});

test('agrees byte for byte with the budget gate that npm run build enforces', async () => {
  const { validateDeliveryBudgets } = await import('../../scripts/build.mjs');
  const manifest = JSON.parse(await fs.readFile(path.join(REPO_ROOT, 'src/data/story.json'), 'utf8'));
  const gate = await validateDeliveryBudgets(manifest, BUDGETS, REPO_ROOT);
  const report = await buildCompatibilityReport({ manifestPath: 'src/data/story.json', root: REPO_ROOT, schema: SCHEMA, budgets: BUDGETS });
  assert.equal(report.budgets.initialScene.bytes, gate.initialAssets);
  assert.equal(report.budgets.maxFrame.bytes, gate.maxFrameAssets);
  assert.equal(report.budgets.total.bytes, gate.totalAssets);
});
