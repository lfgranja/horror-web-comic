import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

export const REQUIREMENTS = Object.freeze({
  node: '20.0.0',
  npm: '10.0.0',
  python3: '3.10.0',
  ffmpeg: '5.0.0',
  ffprobe: '5.0.0',
  tesseract: '4.0.0',
  audioEncoders: Object.freeze(['aac', 'libopus']),
  browsers: Object.freeze(['chromium', 'firefox', 'webkit']),
  lighthouse: '0.14.0'
});

export const CHECK_IDS = Object.freeze([
  'node',
  'npm',
  'python3',
  'ffmpeg',
  'ffprobe',
  'tesseract',
  'playwright-browsers',
  'browser-launch',
  'chrome',
  'lhci',
  'pinned-dependencies',
  'installed-versions',
  'lockfile',
  'engines',
  'scripts'
]);

const USED_BY = Object.freeze({
  node: ['preflight', 'ci', 'validate', 'test:unit', 'build', 'test'],
  npm: ['preflight', 'ci', 'lhci', 'playwright install'],
  python3: ['serve', 'playwright.config.js webServer'],
  // T153 residual, closed 2026-09-27: tests/unit/delivery.test.js shells out to
  // `node scripts/build-images.mjs` and tests/unit/media-generation.test.js invokes
  // ffprobe directly, so npm run test:unit needs both executables too. The map
  // previously attributed them only to build:images/build/ci, which under-reported
  // the real dependency even though the probes themselves were unconditional.
  ffmpeg: ['build:images', 'test:unit', 'ci'],
  ffprobe: ['build:images', 'build', 'test:unit', 'ci'],
  // T219: the published-raster content audit OCRs the shipped frames and fails
  // rather than skipping, so a missing tesseract must be caught here first.
  tesseract: ['test:e2e', 'ci'],
  'playwright-browsers': ['test', 'test:e2e', 'test:perf', 'ci'],
  'browser-launch': ['test', 'test:e2e', 'test:perf', 'ci'],
  chrome: ['lhci', 'ci:lighthouse'],
  lhci: ['lhci', 'ci:lighthouse'],
  'pinned-dependencies': ['npm ci', 'ci'],
  'installed-versions': ['npm ci', 'ci'],
  lockfile: ['npm ci', 'ci'],
  engines: ['npm ci', 'ci'],
  scripts: ['ci']
});

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const FLOOR_PATTERN = />=\s*(\d+(?:\.\d+)*)/;
const CI_REQUIRED_STEPS = Object.freeze(['preflight', 'test:unit', 'build:images', 'build', 'test:e2e', 'test:perf']);
const CI_FORBIDDEN = Object.freeze([
  { pattern: /\|\|\s*true/, label: '|| true' },
  { pattern: /\|\|\s*:/, label: '|| :' },
  { pattern: /\|\|\s*echo/, label: '|| echo' },
  { pattern: /;\s*true/, label: '; true' },
  { pattern: /\bexit\s+0\b/, label: 'exit 0' },
  { pattern: /--pass-with-no-tests/, label: '--pass-with-no-tests' },
  { pattern: /--force\b/, label: '--force' },
  { pattern: /&\s*$/, label: 'trailing &' }
]);

const REMEDIES = Object.freeze({
  node: 'install Node.js 20 or newer from https://nodejs.org (nvm install 20) and re-run npm run preflight',
  npm: 'install npm 10 or newer with `npm install -g npm@latest` and re-run npm run preflight',
  python3: 'install Python 3.10 or newer (Debian/Ubuntu: sudo apt-get install -y python3; macOS: brew install python3); it serves the static site for npm run serve and the Playwright webServer',
  ffmpeg: 'install ffmpeg 5 or newer built with the aac and libopus encoders (Debian/Ubuntu: sudo apt-get install -y ffmpeg; macOS: brew install ffmpeg), then run npm run build:images',
  tesseract: 'install tesseract 4 or newer (Debian/Ubuntu: sudo apt-get install -y tesseract-ocr; macOS: brew install tesseract); the published-raster content audit in tests/e2e OCRs the shipped frames and FAILS rather than skipping, so SC-013 cannot be certified without it',
  ffprobe: 'install ffprobe 5 or newer (Debian/Ubuntu: sudo apt-get install -y ffmpeg; macOS: brew install ffmpeg); npm run build:images and npm run build probe every published track with it',
  browsers: 'download the browser executables the matrix needs with `npx playwright install chromium firefox webkit` (add --with-deps on Debian/Ubuntu) and re-run npm run preflight',
  launch: 'install the shared libraries the browsers need with `sudo npx playwright install-deps` on Debian/Ubuntu (or re-run `npx playwright install --with-deps chromium firefox webkit`), then re-run npm run preflight; a downloaded browser that cannot launch fails every test in the matrix',
  chrome: 'point CHROME_PATH at a Chrome or Chromium executable, or install Google Chrome, so `npm run lhci` can drive the Lighthouse audit',
  lhci: 'install the declared toolchain with `npm ci` so node_modules/.bin/lhci exists, then re-run npm run preflight',
  pinned: 'replace every range in package.json with the exact version currently installed, then run `npm install --package-lock-only` and commit the regenerated package-lock.json',
  installed: 'sync the toolchain with the committed pins using `npm ci` and re-run npm run preflight',
  lockfile: 'generate the reproducible install manifest with `npm install --package-lock-only` and commit package-lock.json so `npm ci` is deterministic',
  engines: 'declare `engines.node` in package.json as ">=20.0.0" so the host floor matches the floor this script enforces',
  scripts: 'wire npm run ci to chain npm run preflight, test:unit, build:images, build, test:e2e and test:perf with && only, so no browser or reference gate is skipped or swallowed'
});

function entry({ id, ok, found = null, expected, message, remedy }) {
  return { id, ok, required: true, found, expected, message, remedy, usedBy: [...USED_BY[id]] };
}

export function parseVersion(value) {
  if (typeof value !== 'string') return null;
  const match = /(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)];
}

export function compareVersions(actual, minimum) {
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] !== minimum[index]) return actual[index] < minimum[index] ? -1 : 1;
  }
  return 0;
}

function versionEntry({ id, label, found, minimum }) {
  const expected = `${label} >=${minimum}`;
  if (found == null) {
    return entry({ id, ok: false, found: null, expected, message: `${label} was not found on this host`, remedy: REMEDIES[id] });
  }
  const parsed = parseVersion(found);
  if (!parsed) {
    return entry({ id, ok: false, found, expected, message: `${label} reported an unreadable version: ${found}`, remedy: REMEDIES[id] });
  }
  const ok = compareVersions(parsed, parseVersion(minimum)) >= 0;
  const display = found.includes(label) ? found : `${label} ${found}`;
  return entry({
    id,
    ok,
    found,
    expected,
    message: ok ? `${display} satisfies ${expected}` : `${display} is older than the required ${minimum}`,
    remedy: REMEDIES[id]
  });
}

function ffmpegEntry(context) {
  const expected = `ffmpeg >=${REQUIREMENTS.ffmpeg} with encoders ${REQUIREMENTS.audioEncoders.join(', ')}`;
  const found = context.ffmpeg;
  if (!found) return entry({ id: 'ffmpeg', ok: false, found: null, expected, message: 'ffmpeg was not found on this host', remedy: REMEDIES.ffmpeg });
  const version = versionEntry({ id: 'ffmpeg', label: 'ffmpeg', found: found.version, minimum: REQUIREMENTS.ffmpeg });
  if (!version.ok) return version;
  const encoders = Array.isArray(found.encoders) ? found.encoders : [];
  const missing = REQUIREMENTS.audioEncoders.filter((encoder) => !encoders.includes(encoder));
  if (missing.length > 0) {
    return entry({
      id: 'ffmpeg',
      ok: false,
      found: `${found.version} [${encoders.join(', ') || 'no encoders'}]`,
      expected,
      message: `ffmpeg ${found.version} is missing the encoders the media build needs: ${missing.join(', ')}`,
      remedy: REMEDIES.ffmpeg
    });
  }
  return entry({
    id: 'ffmpeg',
    ok: true,
    found: `${found.version} [${encoders.filter((encoder) => REQUIREMENTS.audioEncoders.includes(encoder)).join(', ')}]`,
    expected,
    message: `ffmpeg ${found.version} satisfies ${expected}`,
    remedy: REMEDIES.ffmpeg
  });
}

function browsersEntry(context) {
  const expected = `executable for ${REQUIREMENTS.browsers.join(', ')}`;
  const installed = context.browsers && typeof context.browsers === 'object' ? context.browsers : {};
  const present = REQUIREMENTS.browsers.filter((name) => typeof installed[name] === 'string' && installed[name].length > 0);
  const missing = REQUIREMENTS.browsers.filter((name) => !present.includes(name));
  if (missing.length === 0) {
    return entry({ id: 'playwright-browsers', ok: true, found: REQUIREMENTS.browsers.join(', '), expected, message: `Playwright browser executables are present for ${REQUIREMENTS.browsers.join(', ')}`, remedy: REMEDIES.browsers });
  }
  return entry({
    id: 'playwright-browsers',
    ok: false,
    found: present.length > 0 ? present.join(', ') : null,
    expected,
    message: `no Playwright browser executable was found for ${missing.join(', ')}; the test matrix cannot start without ${expected}`,
    remedy: REMEDIES.browsers
  });
}

function browserLaunchEntry(context) {
  const expected = `a headless launch of ${REQUIREMENTS.browsers.join(', ')}`;
  const records = context.browserLaunch && typeof context.browserLaunch === 'object' ? context.browserLaunch : {};
  const unprobed = REQUIREMENTS.browsers.filter((name) => !records[name] || typeof records[name] !== 'object');
  if (unprobed.length > 0) {
    return entry({
      id: 'browser-launch',
      ok: false,
      found: null,
      expected,
      message: `no launch probe was recorded for ${unprobed.join(', ')}, so it is unknown whether those browsers can start on this host`,
      remedy: REMEDIES.launch
    });
  }
  const broken = REQUIREMENTS.browsers.filter((name) => records[name].ok !== true);
  if (broken.length > 0) {
    const details = broken.map((name) => `${name}: ${normalizeError(records[name].error)}`);
    return entry({
      id: 'browser-launch',
      ok: false,
      found: broken.join(', '),
      expected,
      message: `${broken.length} of ${REQUIREMENTS.browsers.length} browsers downloaded successfully but cannot launch: ${details.join(' | ')}`,
      remedy: REMEDIES.launch
    });
  }
  const versions = REQUIREMENTS.browsers.map((name) => `${name} ${records[name].version || 'unknown'}`);
  return entry({ id: 'browser-launch', ok: true, found: versions.join(', '), expected, message: `every configured browser launches headless: ${versions.join(', ')}`, remedy: REMEDIES.launch });
}

function normalizeError(value) {
  if (typeof value !== 'string' || value.trim() === '') return 'no diagnostic reported';
  const lines = [];
  for (const raw of value.split('\n')) {
    const line = raw.replace(/[╔╗╚╝║═╠╣╦╩╬]/g, ' ').replace(/[\s]+/g, ' ').trim();
    if (line === '' || /^browserType\.launch:?$/.test(line)) continue;
    lines.push(line);
  }
  const kept = lines.length > 0 ? lines : [value.replace(/\s+/g, ' ').trim()];
  return kept.slice(0, 6).join(' | ');
}

function binaryEntry({ id, found, expected, foundLabel, command }) {
  if (typeof found !== 'string' || found.length === 0) {
    return entry({ id, ok: false, found: null, expected, message: `${foundLabel} was not found on this host; ${command} cannot run`, remedy: REMEDIES[id] });
  }
  return entry({ id, ok: true, found, expected, message: `${foundLabel} resolved at ${found}`, remedy: REMEDIES[id] });
}

function declaredDependencies(manifest) {
  const groups = manifest && typeof manifest === 'object' ? manifest : {};
  const declared = new Map();
  for (const group of ['dependencies', 'devDependencies']) {
    const values = groups[group] && typeof groups[group] === 'object' ? groups[group] : {};
    for (const [name, range] of Object.entries(values)) declared.set(name, { name, range, group });
  }
  return [...declared.values()].sort((left, right) => (left.name < right.name ? -1 : 1));
}

function pinnedEntry(project) {
  const expected = 'exact versions such as 1.2.3 for every dependency and devDependency';
  const declared = declaredDependencies(project.manifest);
  if (declared.length === 0) {
    return entry({ id: 'pinned-dependencies', ok: false, found: null, expected, message: 'package.json declares no dependencies, so the build toolchain is not reproducible', remedy: REMEDIES.pinned });
  }
  const offenders = declared.filter((item) => typeof item.range !== 'string' || !EXACT_VERSION.test(item.range));
  if (offenders.length === 0) {
    return entry({ id: 'pinned-dependencies', ok: true, found: `${declared.length} pinned`, expected, message: `package.json pins all ${declared.length} declared dependencies to exact versions`, remedy: REMEDIES.pinned });
  }
  const list = offenders.map((item) => `${item.name}@${item.range}`).join(', ');
  return entry({ id: 'pinned-dependencies', ok: false, found: list, expected, message: `package.json must pin exact versions, but these ranges are not exact: ${list}`, remedy: REMEDIES.pinned });
}

function installedEntry(project) {
  const expected = 'node_modules matching the exact versions pinned in package.json';
  const declared = declaredDependencies(project.manifest);
  const installed = project.installed && typeof project.installed === 'object' ? project.installed : null;
  if (installed === null) {
    return entry({ id: 'installed-versions', ok: false, found: null, expected, message: 'node_modules could not be inspected, so the installed toolchain is unknown', remedy: REMEDIES.installed });
  }
  const missing = [];
  const drifted = [];
  for (const item of declared) {
    const version = installed[item.name];
    if (typeof version !== 'string' || version.length === 0) missing.push(item.name);
    else if (version !== item.range) drifted.push(`${item.name} pinned ${item.range} but ${version} is installed`);
  }
  if (missing.length === 0 && drifted.length === 0) {
    return entry({ id: 'installed-versions', ok: true, found: `${declared.length} matching`, expected, message: `all ${declared.length} pinned dependencies are installed at the pinned versions`, remedy: REMEDIES.installed });
  }
  const parts = [];
  if (missing.length > 0) parts.push(`missing from node_modules: ${missing.join(', ')}`);
  if (drifted.length > 0) parts.push(drifted.join(', '));
  return entry({ id: 'installed-versions', ok: false, found: parts.join('; '), expected, message: `the installed toolchain does not match the pins: ${parts.join('; ')}`, remedy: REMEDIES.installed });
}

function lockfileEntry(project) {
  const expected = 'a package-lock.json whose root package mirrors the pins in package.json';
  const lockfile = project.lockfile;
  if (!lockfile || typeof lockfile !== 'object' || !lockfile.packages || typeof lockfile.packages !== 'object') {
    return entry({ id: 'lockfile', ok: false, found: null, expected, message: 'package-lock.json is missing or unreadable, so `npm ci` cannot reproduce this toolchain', remedy: REMEDIES.lockfile });
  }
  const problems = [];
  if (lockfile.name !== project.manifest.name) problems.push(`package-lock.json records name ${lockfile.name} but package.json declares ${project.manifest.name}`);
  if (lockfile.version !== project.manifest.version) problems.push(`package-lock.json records version ${lockfile.version} but package.json declares ${project.manifest.version}`);
  const root = lockfile.packages[''] || {};
  for (const item of declaredDependencies(project.manifest)) {
    const recorded = (root[item.group] || {})[item.name];
    if (recorded === undefined) problems.push(`${item.name}@${item.range} is absent from the package-lock.json root package`);
    else if (recorded !== item.range) problems.push(`${item.name}@${item.range} is pinned but package-lock.json records ${recorded}`);
    const entryVersion = (lockfile.packages[`node_modules/${item.name}`] || {}).version;
    if (entryVersion !== item.range) problems.push(`${item.name}@${item.range} is pinned but package-lock.json resolves node_modules/${item.name} to ${entryVersion === undefined ? 'nothing' : entryVersion}`);
  }
  if (problems.length === 0) {
    return entry({ id: 'lockfile', ok: true, found: `lockfileVersion ${lockfile.lockfileVersion}`, expected, message: `package-lock.json (lockfileVersion ${lockfile.lockfileVersion}) mirrors every pin in package.json`, remedy: REMEDIES.lockfile });
  }
  return entry({ id: 'lockfile', ok: false, found: problems.join('; '), expected, message: `package-lock.json is out of sync with package.json: ${problems.join('; ')}`, remedy: REMEDIES.lockfile });
}

function enginesEntry(project) {
  const expected = `engines.node >=${REQUIREMENTS.node}`;
  const engines = project.manifest && typeof project.manifest.engines === 'object' && project.manifest.engines !== null ? project.manifest.engines : null;
  const declared = engines ? engines.node : null;
  if (typeof declared !== 'string' || declared.trim() === '') {
    return entry({ id: 'engines', ok: false, found: null, expected, message: 'package.json declares no engines.node, so the supported Node range is not declared next to the pins', remedy: REMEDIES.engines });
  }
  const floor = FLOOR_PATTERN.exec(declared);
  const parsed = floor ? parseVersion(floor[1]) : null;
  const ok = parsed !== null && compareVersions(parsed, parseVersion(REQUIREMENTS.node)) >= 0;
  return entry({
    id: 'engines',
    ok,
    found: declared,
    expected,
    message: ok ? `package.json engines.node "${declared}" covers the required ${expected}` : `package.json engines.node "${declared}" is narrower than the required ${expected}`,
    remedy: REMEDIES.engines
  });
}

function scriptsEntry(project) {
  const expected = `scripts.ci chaining ${CI_REQUIRED_STEPS.map((name) => `npm run ${name}`).join(' && ')}`;
  const scripts = project.manifest && typeof project.manifest.scripts === 'object' && project.manifest.scripts !== null ? project.manifest.scripts : {};
  const problems = [];
  const preflight = String(scripts.preflight || '');
  if (!/scripts\/preflight\.mjs/.test(preflight)) problems.push(`scripts.preflight must run node scripts/preflight.mjs, found ${preflight ? `"${preflight}"` : 'no preflight script'}`);
  const ci = String(scripts.ci || '');
  const referenced = [...ci.matchAll(/npm run ([\w:.-]+)/g)].map((match) => match[1]);
  if (ci.trim() === '') problems.push('scripts.ci is missing');
  for (const name of CI_REQUIRED_STEPS) {
    if (!referenced.includes(name)) problems.push(`scripts.ci must run npm run ${name}`);
  }
  if (!referenced.includes('test') && !(referenced.includes('test:e2e') && referenced.includes('test:perf'))) {
    problems.push('scripts.ci must run the Playwright browser suites so host-dependent browser gates are not hidden');
  }
  for (const name of referenced) {
    if (!scripts[name]) problems.push(`scripts.ci runs npm run ${name} but scripts.${name} is not defined`);
  }
  for (const forbidden of CI_FORBIDDEN) {
    if (forbidden.pattern.test(ci)) problems.push(`scripts.ci must not contain "${forbidden.label}" because it hides a failing gate`);
  }
  if (problems.length === 0) {
    return entry({ id: 'scripts', ok: true, found: `${referenced.length} chained steps`, expected, message: `scripts.ci chains ${referenced.map((name) => `npm run ${name}`).join(' && ')}`, remedy: REMEDIES.scripts });
  }
  return entry({ id: 'scripts', ok: false, found: `${problems.length} problem(s)`, expected, message: problems.join('; '), remedy: REMEDIES.scripts });
}

export function evaluatePreflight(context, project) {
  const host = context && typeof context === 'object' ? context : {};
  const target = project && typeof project === 'object' ? project : { manifest: {}, installed: null, lockfile: null };
  const results = [
    versionEntry({ id: 'node', label: 'Node.js', found: host.node, minimum: REQUIREMENTS.node }),
    versionEntry({ id: 'npm', label: 'npm', found: host.npm, minimum: REQUIREMENTS.npm }),
    versionEntry({ id: 'python3', label: 'Python', found: host.python3, minimum: REQUIREMENTS.python3 }),
    ffmpegEntry(host),
    versionEntry({ id: 'ffprobe', label: 'ffprobe', found: host.ffprobe ? host.ffprobe.version : null, minimum: REQUIREMENTS.ffprobe }),
    versionEntry({ id: 'tesseract', label: 'tesseract', found: host.tesseract ? host.tesseract.version : null, minimum: REQUIREMENTS.tesseract }),
    browsersEntry(host),
    browserLaunchEntry(host),
    binaryEntry({ id: 'chrome', found: host.chrome, expected: 'a Chrome or Chromium executable for the Lighthouse audit', foundLabel: 'Chrome', command: 'npm run lhci' }),
    binaryEntry({ id: 'lhci', found: host.lhci, expected: 'a resolvable lhci executable from the pinned toolchain', foundLabel: 'Lighthouse CI (lhci)', command: 'npm run lhci' }),
    pinnedEntry(target),
    installedEntry(target),
    lockfileEntry(target),
    enginesEntry(target),
    scriptsEntry(target)
  ];
  const ordered = CHECK_IDS.map((id) => results.find((result) => result.id === id)).filter(Boolean);
  const failed = ordered.filter((result) => !result.ok);
  return {
    title: `${target.manifest && target.manifest.name ? target.manifest.name : 'project'} build environment`,
    ok: failed.length === 0,
    total: ordered.length,
    passed: ordered.length - failed.length,
    failed,
    results: ordered
  };
}

export function formatReport(report) {
  const idWidth = report.results.reduce((width, result) => Math.max(width, result.id.length), 0);
  const lines = [`preflight: ${report.title}`];
  for (const result of report.results) {
    const status = result.ok ? 'pass' : 'FAIL';
    lines.push(`  [${status}] ${result.id.padEnd(idWidth)}  ${result.message} (used by: ${result.usedBy.join(', ')})`);
    if (!result.ok) lines.push(`          fix: ${result.remedy}`);
  }
  lines.push(report.ok
    ? `preflight: ${report.passed} of ${report.total} checks passed`
    : `preflight: FAILED, ${report.failed.length} of ${report.total} checks failed`);
  return lines.join('\n');
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function which(name, environment = process.env) {
  if (name.includes('/') || name.includes(path.sep)) return fs.existsSync(name) ? path.resolve(name) : null;
  const directories = String(environment.PATH || '').split(path.delimiter).filter(Boolean);
  const extensions = process.platform === 'win32' ? String(environment.PATHEXT || '.EXE;.CMD;.BAT').split(';') : [''];
  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = path.join(directory, `${name}${extension}`);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch {
        continue;
      }
    }
  }
  return null;
}

function probeFfmpeg() {
  const banner = run('ffmpeg', ['-version']);
  if (banner === null) return null;
  const listing = run('ffmpeg', ['-hide_banner', '-encoders']);
  const encoders = listing === null ? [] : [...listing.matchAll(/^\s*[A-Z.]{6}\s+(\S+)/gm)].map((match) => match[1]);
  const version = /ffmpeg version (\S+)/.exec(banner);
  return { version: version ? version[1] : null, encoders };
}

function probeFfprobe() {
  const banner = run('ffprobe', ['-version']);
  if (banner === null) return null;
  const version = /ffprobe version (\S+)/.exec(banner);
  return { version: version ? version[1] : null };
}

function probeTesseract() {
  const banner = run('tesseract', ['--version']);
  if (banner === null) return null;
  const version = /tesseract (\S+)/.exec(banner);
  return { version: version ? version[1] : null };
}

async function probeBrowsers() {
  const browsers = {};
  const launches = {};
  for (const name of REQUIREMENTS.browsers) {
    browsers[name] = null;
    launches[name] = null;
  }
  let playwright;
  try {
    playwright = await import('@playwright/test');
  } catch {
    return { browsers, launches };
  }
  for (const name of REQUIREMENTS.browsers) {
    const browser = playwright[name];
    if (!browser || typeof browser.executablePath !== 'function') continue;
    let executable = null;
    try {
      const candidate = browser.executablePath();
      if (typeof candidate === 'string' && candidate.length > 0 && fs.existsSync(candidate)) executable = candidate;
    } catch {
      executable = null;
    }
    if (executable === null) continue;
    browsers[name] = executable;
    launches[name] = await probeLaunch(browser);
  }
  return { browsers, launches };
}

async function probeLaunch(browserType) {
  let browser = null;
  try {
    browser = await browserType.launch({ timeout: 30_000 });
    return { ok: true, version: browser.version() };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error) };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function probeChrome(environment = process.env) {
  const candidates = [environment.CHROME_PATH, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser', 'chrome'];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || candidate.trim() === '') continue;
    const resolved = which(candidate, environment);
    if (resolved) return resolved;
  }
  return null;
}

export async function buildContext(options = {}) {
  const root = options.root || projectRoot;
  const binDirectory = path.join(root, 'node_modules', '.bin');
  const lhci = ['lhci', 'lhci.cmd'].map((name) => path.join(binDirectory, name)).find((candidate) => fs.existsSync(candidate)) || null;
  const { browsers, launches } = await probeBrowsers();
  return {
    node: process.versions.node || null,
    npm: run('npm', ['--version']),
    python3: run('python3', ['--version']),
    ffmpeg: probeFfmpeg(),
    ffprobe: probeFfprobe(),
    tesseract: probeTesseract(),
    browsers,
    browserLaunch: launches,
    chrome: probeChrome(options.environment || process.env),
    lhci
  };
}

export function buildProject(options = {}) {
  const root = options.root || projectRoot;
  const manifest = readJson(path.join(root, 'package.json')) || {};
  const installed = {};
  for (const item of declaredDependencies(manifest)) {
    const pkg = readJson(path.join(root, 'node_modules', ...item.name.split('/'), 'package.json'));
    installed[item.name] = pkg && typeof pkg.version === 'string' ? pkg.version : null;
  }
  return { root, manifest, installed, lockfile: readJson(path.join(root, 'package-lock.json')) };
}

export function main(options = {}) {
  const context = options.context || {};
  const project = options.project || buildProject({ root: options.root || projectRoot });
  const report = evaluatePreflight(context, project);
  const text = formatReport(report);
  const write = typeof options.out === 'function' ? options.out : (chunk) => process.stdout.write(chunk);
  write(`${text}\n`);
  return report.ok ? 0 : 1;
}

const invokedDirectly = Boolean(process.argv[1]) && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const context = await buildContext();
  process.exitCode = main({ context, project: buildProject({ root: process.cwd() }) });
}
