import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const preflightPath = path.join(root, 'scripts/preflight.mjs');
const manifestPath = path.join(root, 'package.json');
const lockfilePath = path.join(root, 'package-lock.json');

const HOST = {
  node: '22.23.1',
  npm: '12.1.0',
  python3: 'Python 3.14.7',
  ffmpeg: { version: '8.1.2', encoders: ['aac', 'libopus', 'libvpx-vp9'] },
  ffprobe: { version: '8.1.2' },
  browsers: {
    chromium: '/ms-playwright/chromium-1243/chrome-linux/chrome',
    firefox: '/ms-playwright/firefox-1543/firefox/firefox',
    webkit: '/ms-playwright/webkit-2359/pw_run.sh'
  },
  browserLaunch: {
    chromium: { ok: true, version: '143.0.7632.6' },
    firefox: { ok: true, version: '148.0' },
    webkit: { ok: true, version: '26.0' }
  },
  chrome: '/opt/google/chrome/chrome',
  lhci: '/workspace/node_modules/.bin/lhci'
};

const MANIFEST = {
  name: 'horror-web-comic',
  version: '0.1.0',
  private: true,
  engines: { node: '>=20.0.0' },
  scripts: {
    preflight: 'node scripts/preflight.mjs',
    'test:unit': 'node --test tests/unit/*.test.js',
    'test:e2e': 'playwright test tests/e2e',
    'test:perf': 'playwright test tests/perf',
    'build:images': 'node scripts/build-images.mjs',
    build: 'npm run validate && node scripts/build.mjs',
    lhci: 'lhci autorun',
    ci: 'npm run preflight && npm run test:unit && npm run build:images && npm run build && npm run test:e2e && npm run test:perf'
  },
  devDependencies: {
    '@lhci/cli': '0.14.0',
    '@playwright/test': '1.63.0',
    esbuild: '0.24.2',
    sharp: '0.33.5'
  }
};

const LOCKFILE = {
  name: 'horror-web-comic',
  version: '0.1.0',
  lockfileVersion: 3,
  packages: {
    '': {
      name: 'horror-web-comic',
      version: '0.1.0',
      devDependencies: { ...MANIFEST.devDependencies }
    },
    'node_modules/@lhci/cli': { version: '0.14.0' },
    'node_modules/@playwright/test': { version: '1.63.0' },
    'node_modules/esbuild': { version: '0.24.2' },
    'node_modules/sharp': { version: '0.33.5' }
  }
};

async function loadPreflight() {
  assert.ok(fs.existsSync(preflightPath), 'scripts/preflight.mjs must exist');
  return import(preflightPath);
}

function hostContext(overrides = {}) {
  return {
    ...HOST,
    ...overrides,
    browsers: { ...HOST.browsers, ...(overrides.browsers || {}) },
    ffmpeg: 'ffmpeg' in overrides ? overrides.ffmpeg : HOST.ffmpeg,
    ffprobe: 'ffprobe' in overrides ? overrides.ffprobe : HOST.ffprobe
  };
}

function projectFixture(overrides = {}) {
  return {
    manifest: { ...MANIFEST, ...(overrides.manifest || {}) },
    installed: 'installed' in overrides ? overrides.installed : { ...MANIFEST.devDependencies },
    lockfile: 'lockfile' in overrides ? overrides.lockfile : LOCKFILE
  };
}

function check(report, id) {
  const result = report.results.find((entry) => entry.id === id);
  assert.ok(result, `preflight must report a check for ${id}`);
  return result;
}

test('preflight exposes the check surface consumed by the npm scripts', async () => {
  const preflight = await loadPreflight();
  for (const name of ['CHECK_IDS', 'REQUIREMENTS', 'evaluatePreflight', 'formatReport', 'buildContext', 'buildProject', 'main']) {
    assert.ok(name in preflight, `preflight must export ${name}`);
  }
  assert.ok(Array.isArray(preflight.CHECK_IDS) && preflight.CHECK_IDS.length > 0);
  assert.equal(new Set(preflight.CHECK_IDS).size, preflight.CHECK_IDS.length, 'check ids must be unique');
});

test('a host that satisfies every prerequisite passes every check in a fixed order', async () => {
  const preflight = await loadPreflight();
  const report = preflight.evaluatePreflight(hostContext(), projectFixture());
  assert.equal(report.ok, true, preflight.formatReport(report));
  assert.deepEqual(report.results.map((entry) => entry.id), preflight.CHECK_IDS);
  for (const result of report.results) {
    assert.equal(result.ok, true, `${result.id}: ${result.message}`);
    assert.ok(result.remedy, `${result.id} must document a remedy for future failures`);
    assert.ok(result.usedBy.length > 0, `${result.id} must name the npm scripts that depend on it`);
  }
});

test('preflight evaluates deterministically', async () => {
  const preflight = await loadPreflight();
  const first = preflight.evaluatePreflight(hostContext({ node: '18.20.0' }), projectFixture());
  const second = preflight.evaluatePreflight(hostContext({ node: '18.20.0' }), projectFixture());
  assert.equal(preflight.formatReport(first), preflight.formatReport(second));
  assert.equal(first.ok, false);
});

test('node below the declared floor is rejected with the required floor', async () => {
  const preflight = await loadPreflight();
  const report = preflight.evaluatePreflight(hostContext({ node: '18.20.0' }), projectFixture());
  const result = check(report, 'node');
  assert.equal(result.ok, false);
  assert.equal(result.found, '18.20.0');
  assert.match(result.expected, /20/);
  assert.match(result.message, /node/i);
  assert.equal(preflight.evaluatePreflight(hostContext({ node: '20.0.0' }), projectFixture()).results.find((entry) => entry.id === 'node').ok, true);
});

test('node and npm must be present on the host', async () => {
  const preflight = await loadPreflight();
  for (const [id, context] of [['node', { node: null }], ['npm', { npm: null }]]) {
    const result = check(preflight.evaluatePreflight(hostContext(context), projectFixture()), id);
    assert.equal(result.ok, false, `${id} must fail when missing`);
    assert.equal(result.found, null);
    assert.match(result.message, /not found/i);
  }
});

test('npm below the declared floor is rejected', async () => {
  const preflight = await loadPreflight();
  const report = preflight.evaluatePreflight(hostContext({ npm: '9.9.0' }), projectFixture());
  const result = check(report, 'npm');
  assert.equal(result.ok, false);
  assert.equal(result.found, '9.9.0');
  assert.equal(check(preflight.evaluatePreflight(hostContext({ npm: '10.0.0' }), projectFixture()), 'npm').ok, true);
});

test('python must be version 3 at or above the declared floor', async () => {
  const preflight = await loadPreflight();
  const result = check(preflight.evaluatePreflight(hostContext({ python3: 'Python 3.9.2' }), projectFixture()), 'python3');
  assert.equal(result.ok, false);
  assert.equal(result.found, 'Python 3.9.2');
  assert.ok(check(preflight.evaluatePreflight(hostContext({ python3: null }), projectFixture()), 'python3').ok === false);
  assert.equal(check(preflight.evaluatePreflight(hostContext(), projectFixture()), 'python3').ok, true);
});

test('ffmpeg must expose the audio encoders used by the media build', async () => {
  const preflight = await loadPreflight();
  const report = preflight.evaluatePreflight(hostContext({ ffmpeg: { version: '8.1.2', encoders: ['aac'] } }), projectFixture());
  const result = check(report, 'ffmpeg');
  assert.equal(result.ok, false);
  assert.match(result.message, /libopus/);
  assert.match(result.remedy, /ffmpeg/);
  assert.equal(check(preflight.evaluatePreflight(hostContext({ ffmpeg: null }), projectFixture()), 'ffmpeg').ok, false);
  assert.equal(check(preflight.evaluatePreflight(hostContext({ ffmpeg: { version: '4.4.4', encoders: ['aac', 'libopus'] } }), projectFixture()), 'ffmpeg').ok, false);
  assert.equal(check(report, 'ffmpeg').usedBy.includes('build:images'), true);
});

test('ffprobe must be available for the audio probe', async () => {
  const preflight = await loadPreflight();
  assert.equal(check(preflight.evaluatePreflight(hostContext({ ffprobe: null }), projectFixture()), 'ffprobe').ok, false);
  const result = check(preflight.evaluatePreflight(hostContext({ ffprobe: { version: '3.4.2' } }), projectFixture()), 'ffprobe');
  assert.equal(result.ok, false);
  assert.equal(check(preflight.evaluatePreflight(hostContext(), projectFixture()), 'ffprobe').ok, true);
});

test('every Playwright browser used by the test matrix must have an executable', async () => {
  const preflight = await loadPreflight();
  const report = preflight.evaluatePreflight(hostContext({ browsers: { webkit: null } }), projectFixture());
  const result = check(report, 'playwright-browsers');
  assert.equal(result.ok, false);
  assert.match(result.message, /webkit/);
  assert.match(result.remedy, /playwright install/);
  assert.equal(check(preflight.evaluatePreflight(hostContext(), projectFixture()), 'playwright-browsers').ok, true);
  assert.deepEqual(preflight.REQUIREMENTS.browsers, ['chromium', 'firefox', 'webkit']);
});

test('chrome is required for the lighthouse gate and lhci must be resolvable', async () => {
  const preflight = await loadPreflight();
  const chrome = check(preflight.evaluatePreflight(hostContext({ chrome: null }), projectFixture()), 'chrome');
  assert.equal(chrome.ok, false);
  assert.equal(chrome.usedBy.includes('lhci'), true);
  assert.match(chrome.remedy, /CHROME_PATH|chrome/i);
  const lhci = check(preflight.evaluatePreflight(hostContext({ lhci: null }), projectFixture()), 'lhci');
  assert.equal(lhci.ok, false);
  assert.match(lhci.remedy, /npm ci|npm install/);
  assert.equal(check(preflight.evaluatePreflight(hostContext(), projectFixture()), 'chrome').ok, true);
});

test('dependency ranges must be pinned to exact versions', async () => {
  const preflight = await loadPreflight();
  for (const range of ['^1.2.3', '~1.2.3', '>=1.2.3', '1.x', '*', 'latest', 'npm:esbuild@1.2.3']) {
    const manifest = { devDependencies: { esbuild: range, sharp: '0.33.5' } };
    const result = check(preflight.evaluatePreflight(hostContext(), projectFixture({ manifest })), 'pinned-dependencies');
    assert.equal(result.ok, false, `${range} must be rejected`);
    assert.match(result.message, new RegExp(range.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(result.remedy, /exact/);
  }
  const result = check(preflight.evaluatePreflight(hostContext(), projectFixture()), 'pinned-dependencies');
  assert.equal(result.ok, true);
});

test('installed tool versions must match the pins', async () => {
  const preflight = await loadPreflight();
  const report = preflight.evaluatePreflight(hostContext(), projectFixture({ installed: { ...MANIFEST.devDependencies, esbuild: null, sharp: '0.34.2' } }));
  const result = check(report, 'pinned-dependencies');
  assert.equal(result.ok, true);
  const installed = check(report, 'installed-versions');
  assert.equal(installed.ok, false);
  assert.match(installed.message, /esbuild/);
  assert.match(installed.message, /sharp/);
  assert.match(installed.message, /0\.34\.2/);
  assert.match(installed.remedy, /npm ci/);
  assert.equal(check(preflight.evaluatePreflight(hostContext(), projectFixture()), 'installed-versions').ok, true);
});

test('package-lock.json must exist and mirror the pinned manifest', async () => {
  const preflight = await loadPreflight();
  const missing = check(preflight.evaluatePreflight(hostContext(), projectFixture({ lockfile: null })), 'lockfile');
  assert.equal(missing.ok, false);
  assert.match(missing.remedy, /package-lock\.json/);
  const stale = { ...LOCKFILE, packages: { ...LOCKFILE.packages, '': { name: 'horror-web-comic', version: '0.1.0', devDependencies: { ...MANIFEST.devDependencies, esbuild: '0.25.5' } } } };
  const drifted = check(preflight.evaluatePreflight(hostContext(), projectFixture({ lockfile: stale })), 'lockfile');
  assert.equal(drifted.ok, false);
  assert.match(drifted.message, /esbuild/);
  assert.equal(check(preflight.evaluatePreflight(hostContext(), projectFixture()), 'lockfile').ok, true);
});

test('package.json must declare the same node floor as preflight enforces', async () => {
  const preflight = await loadPreflight();
  const missing = check(preflight.evaluatePreflight(hostContext(), projectFixture({ manifest: { engines: undefined } })), 'engines');
  assert.equal(missing.ok, false);
  assert.match(missing.message, /engines/);
  const tooLow = check(preflight.evaluatePreflight(hostContext(), projectFixture({ manifest: { engines: { node: '>=18.0.0' } } })), 'engines');
  assert.equal(tooLow.ok, false);
  assert.equal(check(preflight.evaluatePreflight(hostContext(), projectFixture()), 'engines').ok, true);
});

test('npm ci must run preflight, unit, media, build and the browser suites without hiding failures', async () => {
  const preflight = await loadPreflight();
  const required = ['preflight', 'test:unit', 'build:images', 'build', 'test:e2e', 'test:perf'];
  const steps = required.map((name) => `npm run ${name}`);
  const chained = steps.join(' && ');
  const result = check(preflight.evaluatePreflight(hostContext(), projectFixture({ manifest: { scripts: { ...MANIFEST.scripts, ci: 'npm run test:unit || true' } } })), 'scripts');
  assert.equal(result.ok, false);
  assert.match(result.message, /preflight/);
  for (const name of required) {
    const without = steps.filter((step) => step !== `npm run ${name}`).join(' && ');
    const missing = check(preflight.evaluatePreflight(hostContext(), projectFixture({ manifest: { scripts: { ...MANIFEST.scripts, ci: without } } })), 'scripts');
    assert.equal(missing.ok, false, `ci must require ${name}`);
    assert.match(missing.message, new RegExp(name));
  }
  const reference = check(preflight.evaluatePreflight(hostContext(), projectFixture({ manifest: { scripts: { ...MANIFEST.scripts, ci: `${chained} || exit 0` } } })), 'scripts');
  assert.equal(reference.ok, false, 'ci must not swallow failures');
  assert.match(reference.message, /exit 0/);
  assert.equal(check(preflight.evaluatePreflight(hostContext(), projectFixture()), 'scripts').ok, true);
});

test('browser executables must actually launch, not merely exist on disk', async () => {
  const preflight = await loadPreflight();
  const broken = hostContext({
    browserLaunch: {
      chromium: { ok: true, version: '143.0.7632.6' },
      firefox: { ok: false, error: 'Host system is missing dependencies to run browsers. sudo apt-get install libicu74 libjpeg-turbo8' },
      webkit: { ok: false, error: 'Host system is missing dependencies to run browsers. sudo apt-get install libicu74 libjpeg-turbo8' }
    }
  });
  const result = check(preflight.evaluatePreflight(broken, projectFixture()), 'browser-launch');
  assert.equal(result.ok, false);
  assert.match(result.message, /webkit/);
  assert.match(result.message, /libicu74/);
  assert.match(result.remedy, /install-deps/);
  assert.equal(result.usedBy.includes('test:e2e'), true);
  const unprobed = hostContext({ browserLaunch: { chromium: { ok: true, version: '143.0.7632.6' } } });
  const missing = check(preflight.evaluatePreflight(unprobed, projectFixture()), 'browser-launch');
  assert.equal(missing.ok, false);
  assert.match(missing.message, /firefox/);
  assert.match(missing.message, /webkit/);
  assert.equal(check(preflight.evaluatePreflight(hostContext(), projectFixture()), 'browser-launch').ok, true);
});

test('the repository manifest, installed toolchain and lockfile satisfy every project check', async () => {
  const preflight = await loadPreflight();
  assert.ok(fs.existsSync(lockfilePath), 'package-lock.json must be committed');
  const report = preflight.evaluatePreflight(hostContext(), preflight.buildProject({ root }));
  assert.equal(report.ok, true, preflight.formatReport(report));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.scripts.preflight, 'node scripts/preflight.mjs');
  for (const name of ['@lhci/cli', '@playwright/test', 'ajv', 'ajv-formats', 'esbuild', 'sharp']) {
    assert.match(manifest.devDependencies[name], /^\d+\.\d+\.\d+$/, `${name} must be pinned to an exact version`);
  }
});

test('main reports success and returns zero for a satisfied host', async () => {
  const preflight = await loadPreflight();
  const lines = [];
  const code = preflight.main({ context: hostContext(), project: projectFixture(), out: (text) => lines.push(text) });
  assert.equal(code, 0);
  assert.match(lines.join(''), /preflight/);
  for (const id of preflight.CHECK_IDS) assert.match(lines.join(''), new RegExp(id));
});

test('main reports every missing prerequisite with a remedy and returns non-zero', async () => {
  const preflight = await loadPreflight();
  const lines = [];
  const code = preflight.main({
    context: hostContext({ node: null, python3: null, ffmpeg: null, ffprobe: null, chrome: null, lhci: null, browsers: { chromium: null, firefox: null, webkit: null }, browserLaunch: {} }),
    project: projectFixture({ lockfile: null }),
    out: (text) => lines.push(text)
  });
  const output = lines.join('');
  assert.equal(code, 1);
  for (const id of ['node', 'python3', 'ffmpeg', 'ffprobe', 'playwright-browsers', 'browser-launch', 'chrome', 'lhci', 'lockfile']) {
    assert.match(output, new RegExp(id));
  }
  assert.match(output, /fix:/);
  assert.match(output, /failed/i);
});
