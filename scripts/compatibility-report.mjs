import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { isSafeLocalReference } from '../src/scripts/story-loader.js';
import { lightAudioSource, lightUrl } from '../src/scripts/light-variants.js';
import { parseSrcset, readSchema } from './validate-manifest.mjs';

export const TOOL_NAME = 'manifest-compatibility-report';
export const TOOL_VERSION = 1;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_PATH = 'specs/001-cinematic-player/contracts/story-manifest.schema.json';
const BUDGET_PATH = 'budget.json';
const AUDIO_EXTENSIONS = /\.(?:aac|opus|wav|mp3|m4a|flac)$/i;
const SRC_SET_FORMATS = new Map([
  ['srcset', null],
  ['avifSrcset', 'avif'],
  ['webpSrcset', 'webp'],
  ['fallbackSrcset', 'fallback']
]);

const NOT_CHECKED = [
  'browser support across the 5-project matrix (Chromium, Firefox and WebKit, desktop and mobile)',
  'Lighthouse performance and accessibility scores, and the layout stability and largest contentful paint budgets',
  'frame rate and transition smoothness during playback',
  'first-frame arrival time on a real device and on a throttled reference connection',
  'audio autoplay policy behaviour and the audio-off comprehension path',
  'media codec, bitrate and intrinsic dimension validity, which require ffprobe and sharp',
  'WCAG conformance, which a manifest cannot prove and which only an audit of the rendered experience can attest'
];

class ReportError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ReportError';
    this.code = code;
  }
}

function finding(severity, category, field, message) {
  return { severity, category, field, message };
}

function isLightReference(reference) {
  return /-light(?:\.|-)/i.test(reference);
}

function formatFromExtension(reference) {
  const match = /\.([^./?#]+)(?:[?#].*)?$/.exec(reference);
  return match ? match[1].toLowerCase() : null;
}

function classifyFormat(field, declaredFormat, reference) {
  if (declaredFormat) return declaredFormat;
  const extension = formatFromExtension(reference);
  if (extension === 'avif' || extension === 'webp' || extension === 'jpg' || extension === 'jpeg' || extension === 'png') return 'fallback';
  if (AUDIO_EXTENSIONS.test(reference)) return 'audio';
  return 'fallback';
}

function acceptReference(reference, field, kind, findings) {
  if (!isSafeLocalReference(reference)) {
    findings.push(finding('error', 'portability', field, `${kind} reference is not a safe local file reference: ${reference}`));
    return null;
  }
  return reference;
}

function collectImageReferences(image, fieldPrefix, findings) {
  const references = [];
  const push = (reference, field, declaredFormat) => {
    if (typeof reference !== 'string' || reference.trim() === '') return;
    const safe = acceptReference(reference, field, 'image', findings);
    if (!safe) return;
    references.push({ reference: safe, field, format: classifyFormat(field, declaredFormat, safe), descriptorWidth: undefined, isLight: isLightReference(safe), kind: 'image' });
  };

  for (const field of ['avif', 'webp', 'fallback']) push(image?.[field], `${fieldPrefix}.${field}`, field);
  for (const [field, declaredFormat] of SRC_SET_FORMATS) {
    const value = image?.[field];
    if (typeof value !== 'string' || value.trim() === '') continue;
    let candidates;
    try {
      candidates = parseSrcset(value, `${fieldPrefix}.${field}`);
    } catch (error) {
      findings.push(finding('error', 'portability', `${fieldPrefix}.${field}`, error.message));
      continue;
    }
    for (const candidate of candidates) {
      const safe = acceptReference(candidate.reference, `${fieldPrefix}.${field}`, 'image', findings);
      if (!safe) continue;
      references.push({ reference: safe, field: `${fieldPrefix}.${field}`, format: declaredFormat || classifyFormat(field, null, safe), descriptorWidth: candidate.width, isLight: isLightReference(safe), kind: 'image' });
    }
  }
  return references;
}

function collectAudioReferences(track, field, findings) {
  if (track?.src === undefined) return [];
  if (typeof track.src !== 'string' || trimToEmpty(track.src) === '') {
    findings.push(finding('error', 'structure', field, 'audio.src must be a non-empty string'));
    return [];
  }
  const safe = acceptReference(track.src, field, 'audio', findings);
  if (!safe) return [];
  return [{ reference: safe, field, format: 'audio', descriptorWidth: undefined, isLight: isLightReference(safe), kind: 'audio' }];
}

function trimToEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function footprintReferences(references) {
  const selected = [];
  for (const format of ['avif', 'webp', 'fallback', 'audio']) {
    const candidates = references.filter((item) => item.format === format && !item.isLight);
    if (candidates.length === 0) continue;
    candidates.sort((left, right) => (right.descriptorWidth || 0) - (left.descriptorWidth || 0));
    selected.push(candidates[0].reference);
  }
  return selected;
}

async function fileSize(root, reference) {
  try {
    const stats = await fs.stat(path.resolve(root, reference));
    return stats.isFile() ? stats.size : null;
  } catch {
    return null;
  }
}

async function sumSizes(root, references) {
  let total = 0;
  for (const reference of new Set(references)) total += (await fileSize(root, reference)) || 0;
  return total;
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return 'not measurable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function checkFrameMetadata(frame, fieldPrefix, findings, advisory) {
  const image = frame?.image || {};
  const alt = typeof frame?.alt === 'string' ? frame.alt : '';
  const description = typeof frame?.description === 'string' ? frame.description : '';
  const hasSrcset = ['srcset', 'avifSrcset', 'webpSrcset', 'fallbackSrcset'].some((field) => typeof image[field] === 'string' && image[field].trim() !== '');
  const hasDimensions = Number.isInteger(image.width) && Number.isInteger(image.height);
  if (alt.trim() === '' || description.trim() === '') advisory.framesWithoutText += 1;
  if (!hasDimensions) findings.push(finding('warning', 'stability', `${fieldPrefix}.image`, 'intrinsic width and height are not declared, so the frame cannot reserve its layout space and is exposed to layout shift'));
  if (hasSrcset && trimToEmpty(image.sizes) === '') findings.push(finding('warning', 'stability', `${fieldPrefix}.image.sizes`, 'a srcset is declared without sizes, so the browser cannot choose the intended candidate'));
  if (alt.trim() !== '' && alt.length < 8) findings.push(finding('advisory', 'accessibility', `${fieldPrefix}.alt`, 'alt text is shorter than 8 characters and is unlikely to describe the frame on its own'));
  if (alt.length > 200) findings.push(finding('advisory', 'accessibility', `${fieldPrefix}.alt`, 'alt text is longer than 200 characters, which is burdensome for a screen reader'));
  if (description.length > 800) findings.push(finding('advisory', 'accessibility', `${fieldPrefix}.description`, 'description is longer than 800 characters and is unlikely to be read in full'));
  return hasDimensions;
}

function structuralFindings(manifest) {
  const findings = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { findings, shape: null, frames: 0, scenes: 0 };
  }
  const scenes = Array.isArray(manifest.scenes) ? manifest.scenes : [];
  let frames = 0;
  for (const [sceneIndex, scene] of scenes.entries()) {
    const prefix = `scenes[${sceneIndex}]`;
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
      findings.push(finding('error', 'structure', prefix, 'scene is not an object'));
      continue;
    }
    for (const field of ['id', 'title']) {
      if (trimToEmpty(scene[field]) === '') findings.push(finding('error', 'structure', `${prefix}.${field}`, 'is required and must be a non-empty string'));
    }
    const sceneFrames = Array.isArray(scene.frames) ? scene.frames : [];
    if (sceneFrames.length === 0) findings.push(finding('error', 'structure', `${prefix}.frames`, 'a scene must declare at least one frame'));
    frames += sceneFrames.length;
  }
  return { findings, shape: { scenes: scenes.length, frames }, frames, scenes: scenes.length };
}

function schemaFindings(manifest, schema) {
  const findings = [];
  if (!schema) {
    findings.push(finding('warning', 'schema', '/', 'no schema was available, so the structural check ran alone'));
    return findings;
  }
  try {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    if (validate(manifest)) return findings;
    for (const error of validate.errors || []) {
      const field = error.instancePath || '/';
      const category = field === '/schemaVersion' ? 'structure' : 'schema';
      findings.push(finding('error', category, field, `${error.message || 'is invalid'}${error.params?.allowedValue !== undefined ? ` (allowed ${JSON.stringify(error.params.allowedValue)})` : ''}`));
    }
  } catch (error) {
    findings.push(finding('warning', 'schema', '/', `the schema could not be compiled: ${error.message}`));
  }
  return findings;
}

function nextSteps(report, contact) {
  const errors = report.findings.filter((item) => item.severity === 'error').length;
  const warnings = report.findings.filter((item) => item.severity === 'warning').length;
  const steps = [];
  if (errors > 0) {
    steps.push(`Fix the ${errors} error${errors === 1 ? '' : 's'} above: a manifest with errors is rejected by npm run validate and by npm run build.`);
    steps.push('Re-run this report until the verdict is compatible, then run the delivery gate.');
  } else {
    steps.push('The manifest is compatible with this schema and passes every static check in this report.');
  }
  if (warnings > 0) steps.push(`Review the ${warnings} warning${warnings === 1 ? '' : 's'}: each one describes a path that this player can reach at runtime and that no static build step repairs for you.`);
  steps.push('Run npm run build, then the browser, Lighthouse and frame-rate suites, to certify the result.');
  if (contact) steps.push(`Send this report to ${contact} to discuss the remaining gates.`);
  return steps;
}

function inferRoot(manifestPath) {
  const directory = path.dirname(manifestPath);
  if (path.basename(directory) === 'data' && path.basename(path.dirname(directory)) === 'src') return path.resolve(path.dirname(directory), '..');
  return directory;
}

export async function buildCompatibilityReport(options = {}) {
  const manifestPath = options.manifestPath || 'src/data/story.json';
  const resolvedManifestPath = options.root
    ? path.resolve(options.root, manifestPath)
    : path.resolve(process.cwd(), manifestPath);
  const root = path.resolve(options.root || inferRoot(resolvedManifestPath));
  const checkAssets = options.checkAssets !== false;
  const checkLightVariants = options.checkLightVariants !== false;
  const checkBudgets = options.checkBudgets !== false;

  let source;
  try {
    source = await fs.readFile(resolvedManifestPath, 'utf8');
  } catch (error) {
    throw new ReportError(`manifest not found or unreadable: ${manifestPath}`, 'manifest-unavailable');
  }
  let manifest;
  try {
    manifest = JSON.parse(source);
  } catch (error) {
    throw new ReportError(`manifest is not valid JSON: ${error.message}`, 'manifest-malformed');
  }

  const findings = [];
  const schema = options.schema === null ? null : options.schema || await readSchema(REPO_ROOT, SCHEMA_PATH);
  const budgets = options.budgets === null ? null : options.budgets || await readJson(REPO_ROOT, BUDGET_PATH);

  const structure = structuralFindings(manifest);
  findings.push(...structure.findings);
  findings.push(...await schemaFindings(manifest, schema));

  const references = [];
  const audioTracks = [];
  const scenes = Array.isArray(manifest?.scenes) ? manifest.scenes : [];
  const frameFootprints = [];
  const sceneFootprints = [];
  const metadata = { framesWithoutText: 0 };
  for (const [sceneIndex, scene] of scenes.entries()) {
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) continue;
    const sceneAudio = collectAudioReferences(scene.audio, `scenes[${sceneIndex}].audio`, findings);
    audioTracks.push(...sceneAudio);
    references.push(...sceneAudio);
    const sceneFrames = Array.isArray(scene.frames) ? scene.frames : [];
    const sceneFootprint = [...sceneAudio.map((item) => item.reference)];
    for (const [frameIndex, frame] of sceneFrames.entries()) {
      const prefix = `scenes[${sceneIndex}].frames[${frameIndex}]`;
      if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
        findings.push(finding('error', 'structure', prefix, 'frame is not an object'));
        continue;
      }
      const frameAudio = collectAudioReferences(frame.audio, `${prefix}.audio`, findings);
      audioTracks.push(...frameAudio);
      references.push(...frameAudio);
      const imageReferences = collectImageReferences(frame.image, `${prefix}.image`, findings);
      references.push(...imageReferences);
      const footprint = [...footprintReferences(imageReferences), ...frameAudio.map((item) => item.reference)];
      frameFootprints.push(footprint);
      sceneFootprint.push(...footprint);
      checkFrameMetadata(frame, prefix, findings, metadata);
    }
    sceneFootprints.push(sceneFootprint);
  }
  if (metadata.framesWithoutText > 0) findings.push(finding('error', 'accessibility', 'scenes', `${metadata.framesWithoutText} frame(s) declare no alt text or no description, so the story is not comprehensible without the image`));

  const uniqueReferences = [...new Set(references.map((item) => item.reference))];
  const missingReferences = [];
  if (checkAssets) {
    for (const reference of uniqueReferences) {
      const size = await fileSize(root, reference);
      if (size === null) missingReferences.push(reference);
    }
    for (const reference of missingReferences) findings.push(finding('error', 'assets', reference, 'declared asset is missing relative to the manifest directory'));
  }

  const lightVariants = { expected: 0, present: 0, missing: [], presentFiles: [] };
  if (checkLightVariants && checkAssets) {
    for (const item of references) {
      if (item.isLight) continue;
      const expected = item.kind === 'audio' ? lightAudioSource(item.reference) : lightUrl(item.reference);
      if (!expected || expected === item.reference) continue;
      lightVariants.expected += 1;
      if (await fileSize(root, expected) !== null) {
        lightVariants.present += 1;
        lightVariants.presentFiles.push(expected);
      } else if (!lightVariants.missing.includes(expected)) {
        lightVariants.missing.push(expected);
        findings.push(finding('warning', 'light-variants', expected, 'light variant is not generated, so the reduced-data path requests a file the player cannot load'));
      }
    }
  }

  const budgetedReferences = [...new Set([...uniqueReferences, ...lightVariants.presentFiles])];
  const declaredBytes = checkAssets ? await sumSizes(root, uniqueReferences) : null;
  const totalBytes = checkAssets ? await sumSizes(root, budgetedReferences) : null;
  const frameSizes = await Promise.all(frameFootprints.map(async (footprint) => sumSizes(root, footprint)));
  const budgetReport = checkBudgets && budgets
    ? {
        initialScene: { bytes: await sumSizes(root, sceneFootprints[0] || []), limit: budgets.initialSceneBytes, label: 'initial scene' },
        maxFrame: { bytes: Math.max(0, ...frameSizes), limit: budgets.frameBytes, label: 'heaviest frame' },
        total: { bytes: totalBytes, limit: budgets.totalAssetsBytes, label: 'publishable total' }
      }
    : null;
  if (budgetReport) {
    for (const key of ['initialScene', 'maxFrame', 'total']) {
      const entry = budgetReport[key];
      entry.over = entry.limit !== undefined && entry.bytes > entry.limit;
      if (entry.over) findings.push(finding('error', 'budget', entry.label, `declared ${formatBytes(entry.bytes)} exceeds the ${formatBytes(entry.limit)} budget and would fail npm run build`));
    }
  }

  const errors = findings.filter((item) => item.severity === 'error').length;
  const report = {
    tool: { name: TOOL_NAME, version: TOOL_VERSION, schema: SCHEMA_PATH, budgets: BUDGET_PATH },
    subject: {
      manifest: path.relative(root, resolvedManifestPath) || path.basename(resolvedManifestPath),
      root,
      title: typeof manifest?.title === 'string' ? manifest.title : null,
      schemaVersion: manifest?.schemaVersion ?? null,
      fingerprint: `mcr-${createHash('sha256').update(source).digest('hex').slice(0, 12)}`
    },
    verdict: errors > 0 ? 'incompatible' : 'compatible',
    summary: {
      scenes: structure.scenes,
      frames: structure.frames,
      audioTracks: audioTracks.length,
      declaredReferences: references.length,
      uniqueReferences: uniqueReferences.length,
      missingReferences: missingReferences.length,
      declaredBytes,
      publishableBytes: totalBytes
    },
    checks: {
      structure: structure.findings.some((item) => item.severity === 'error') ? 'fail' : 'pass',
      schema: findings.some((item) => item.category === 'schema' && item.severity === 'error') || findings.some((item) => item.category === 'structure' && item.field === '/schemaVersion') ? 'fail' : 'pass',
      references: findings.some((item) => item.category === 'portability') ? 'fail' : 'pass',
      assets: checkAssets ? (missingReferences.length > 0 ? 'fail' : 'pass') : 'skipped',
      lightVariants: checkLightVariants && checkAssets ? (lightVariants.missing.length > 0 ? 'advisory' : 'pass') : 'skipped',
      budgets: budgetReport ? (budgetReport.initialScene.over || budgetReport.maxFrame.over || budgetReport.total.over ? 'fail' : 'pass') : 'skipped',
      accessibility: findings.some((item) => item.category === 'accessibility' && item.severity === 'error') ? 'fail' : 'pass',
      stability: findings.some((item) => item.category === 'stability') ? 'advisory' : 'pass'
    },
    budgets: budgetReport,
    lightVariants,
    findings,
    notChecked: NOT_CHECKED,
    nextSteps: []
  };
  report.nextSteps = nextSteps(report, options.contact);
  return report;
}

async function readJson(root, reference) {
  try {
    return JSON.parse(await fs.readFile(path.resolve(root, reference), 'utf8'));
  } catch {
    return null;
  }
}

const SEVERITY_ORDER = { error: 0, warning: 1, advisory: 2 };
const SEVERITY_LABEL = { error: 'ERROR', warning: 'WARN ', advisory: 'INFO ' };

function sortedFindings(findings) {
  return [...findings].sort((left, right) => (SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]) || left.category.localeCompare(right.category) || left.field.localeCompare(right.field));
}

function budgetLines(report) {
  if (!report.budgets) return [];
  const lines = [];
  for (const key of ['initialScene', 'maxFrame', 'total']) {
    const entry = report.budgets[key];
    if (!entry) continue;
    lines.push(`  ${entry.label.padEnd(15)} ${formatBytes(entry.bytes).padStart(11)}  limit ${formatBytes(entry.limit).padStart(11)}  ${entry.over ? 'OVER' : 'ok'}`);
  }
  return lines;
}

export function renderCompatibilityReport(report, options = {}) {
  const format = options.format || 'text';
  if (format === 'json') return `${JSON.stringify(report, null, 2)}\n`;
  const findings = sortedFindings(report.findings);
  const headline = report.verdict === 'compatible' ? 'COMPATIBLE' : 'INCOMPATIBLE';
  if (format === 'markdown') {
    const lines = [
      `# Manifest compatibility report — ${headline}`,
      '',
      `- Manifest: \`${report.subject.manifest}\``,
      `- Title: ${report.subject.title || '(none)'}`,
      `- Schema version: ${report.subject.schemaVersion}`,
      `- Fingerprint: \`${report.subject.fingerprint}\``,
      '',
      '## Summary',
      '',
      `- Scenes: ${report.summary.scenes}`,
      `- Frames: ${report.summary.frames}`,
      `- Audio tracks: ${report.summary.audioTracks}`,
      `- Declared references: ${report.summary.declaredReferences} (${report.summary.uniqueReferences} unique)`,
      `- Missing assets: ${report.summary.missingReferences}`,
      `- Declared asset bytes: ${formatBytes(report.summary.declaredBytes)}`,
      `- Publishable asset bytes: ${formatBytes(report.summary.publishableBytes)}`,
      ''
    ];
    if (report.budgets) {
      lines.push('## Delivery budget', '', '| Measure | Declared | Limit | Status |', '| --- | --- | --- | --- |');
      for (const key of ['initialScene', 'maxFrame', 'total']) {
        const entry = report.budgets[key];
        if (!entry) continue;
        lines.push(`| ${entry.label} | ${formatBytes(entry.bytes)} | ${formatBytes(entry.limit)} | ${entry.over ? 'over' : 'ok'} |`);
      }
      lines.push('');
    }
    if (findings.length > 0) {
      lines.push('## Findings', '', '| Severity | Category | Field | Detail |', '| --- | --- | --- | --- |');
      for (const item of findings) lines.push(`| ${item.severity} | ${item.category} | \`${item.field}\` | ${item.message} |`);
      lines.push('');
    } else {
      lines.push('## Findings', '', 'None.', '');
    }
    lines.push('## Checks', '');
    for (const [name, status] of Object.entries(report.checks)) lines.push(`- ${name}: ${status}`);
    lines.push('', '## Not checked by this report', '');
    for (const item of report.notChecked) lines.push(`- ${item}`);
    lines.push('', '## Next steps', '');
    for (const item of report.nextSteps) lines.push(`1. ${item}`);
    lines.push('');
    return lines.join('\n');
  }

  const lines = [
    `${TOOL_NAME} v${TOOL_VERSION} — ${headline}`,
    '',
    `manifest   ${report.subject.manifest}`,
    `title      ${report.subject.title || '(none)'}`,
    `schema     ${report.subject.schemaVersion}`,
    `fingerprint ${report.subject.fingerprint}`,
    '',
    'summary',
    `  scenes               ${report.summary.scenes}`,
    `  frames               ${report.summary.frames}`,
    `  audio tracks         ${report.summary.audioTracks}`,
    `  references           ${report.summary.declaredReferences} declared / ${report.summary.uniqueReferences} unique`,
    `  missing assets       ${report.summary.missingReferences}`,
    `  declared asset bytes ${formatBytes(report.summary.declaredBytes)}`,
    `  publishable bytes    ${formatBytes(report.summary.publishableBytes)}`
  ];

  if (report.budgets) lines.push('delivery budget', ...budgetLines(report), '');
  lines.push('findings');
  if (findings.length === 0) lines.push('  none');
  for (const item of findings) lines.push(`  [${SEVERITY_LABEL[item.severity]}] ${item.category} · ${item.field}\n    ${item.message}`);
  lines.push('', 'checks');
  for (const [name, status] of Object.entries(report.checks)) lines.push(`  ${name.padEnd(14)} ${status}`);
  lines.push('', 'not checked by this report');
  for (const item of report.notChecked) lines.push(`  - ${item}`);
  lines.push('', 'next steps');
  report.nextSteps.forEach((item, index) => lines.push(`  ${index + 1}. ${item}`));
  lines.push('');
  return lines.join('\n');
}

const USAGE = `Usage: node scripts/compatibility-report.mjs [<manifest>] [options]

Audits a narrative manifest against this distribution's schema, without running the
build, a browser or media encoding. Exit code is 0 when compatible, 1 when not.

  <manifest>          path to story.json (default: src/data/story.json)
  --root <dir>        project root that asset references resolve against
                      (default: the parent of src/ when the manifest sits in
                      src/data, otherwise the manifest's own directory)
  --format <fmt>      text (default), markdown or json
  --json              shorthand for --format json
  --markdown          shorthand for --format markdown
  --out <file>        write the report to a file instead of stdout
  --no-assets         skip the asset existence and size checks
  --no-light          skip the light variant checks
  --no-budgets        skip the delivery budget comparison
  --contact <text>    append a call to action to the next steps
  --help              show this message
`;

export function parseArguments(argv) {
  const options = { manifestPath: 'src/data/story.json', format: 'text', checkAssets: true, checkLightVariants: true, checkBudgets: true, out: null, contact: null, help: false };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--json') options.format = 'json';
    else if (argument === '--markdown') options.format = 'markdown';
    else if (argument === '--no-assets') options.checkAssets = false;
    else if (argument === '--no-light') options.checkLightVariants = false;
    else if (argument === '--no-budgets') options.checkBudgets = false;
    else if (argument === '--root') options.root = argv[++index];
    else if (argument === '--format') options.format = argv[++index];
    else if (argument === '--out') options.out = argv[++index];
    else if (argument === '--contact') options.contact = argv[++index];
    else if (argument.startsWith('--')) throw new ReportError(`unknown option: ${argument}`, 'bad-argument');
    else positional.push(argument);
  }
  if (positional.length > 1) throw new ReportError('expected at most one manifest path', 'bad-argument');
  if (positional.length === 1) options.manifestPath = positional[0];
  if (!['text', 'markdown', 'json'].includes(options.format)) throw new ReportError(`unsupported format: ${options.format}`, 'bad-argument');
  return options;
}

function isMainModule() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

export async function main(argv = process.argv.slice(2), streams = { out: process.stdout, err: process.stderr }) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    streams.err.write(`${error.message}\n${USAGE}`);
    return 2;
  }
  if (options.help) {
    streams.out.write(USAGE);
    return 0;
  }
  let report;
  try {
    report = await buildCompatibilityReport(options);
  } catch (error) {
    streams.err.write(`${error.message}\n`);
    return 1;
  }
  const rendered = renderCompatibilityReport(report, { format: options.format });
  if (options.out) {
    await fs.writeFile(path.resolve(options.out), rendered, 'utf8');
    streams.out.write(`report written to ${options.out} (${report.verdict}, ${report.fingerprint})\n`);
  } else {
    streams.out.write(rendered);
  }
  return report.verdict === 'compatible' ? 0 : 1;
}

if (isMainModule()) {
  main().then((code) => {
    process.exitCode = code;
  });
}
