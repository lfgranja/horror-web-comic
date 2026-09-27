import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import * as esbuild from 'esbuild';
import { LIGHT_MAX_SIDE } from '../src/scripts/light-variants.js';

const STANDARD_MAX_SIDE = 2560;
const LIGHT_MAX_BYTES = 150 * 1024;
const STANDARD_MAX_BYTES = 300 * 1024;
const STANDARD_AUDIO_RANGE = Object.freeze({ min: 96000, max: 128000 });
const LIGHT_AUDIO_RANGE = Object.freeze({ min: 48000, max: 64000 });
const PUBLISHABLE_ROOTS = Object.freeze(['src', 'assets']);
const PUBLISHABLE_ROOT_FILES = Object.freeze(['index.html', 'favicon.svg', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml']);
const TEXT_EXTENSIONS = new Set([
  '.css', '.csv', '.gif', '.htm', '.html', '.js', '.json', '.mjs', '.svg', '.txt', '.webmanifest', '.xml'
]);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function mediaError(message, code = 'media-invalid') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isMissing(error) {
  return error?.code === 'ENOENT';
}

export async function scanDirectory(dir, root = process.cwd()) {
  const files = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (isMissing(error)) return files;
    throw error;
  }
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await scanDirectory(fullPath, root));
    } else if (entry.isFile()) {
      files.push(toPosix(path.relative(root, fullPath)));
    }
  }
  return files;
}

export function isTextResource(filePath, buffer) {
  const extension = path.extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(extension)) return true;
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  if (sample.includes(0)) return false;
  let controls = 0;
  for (const byte of sample) {
    if (byte < 9 || (byte > 13 && byte < 32)) controls += 1;
  }
  return sample.length === 0 || controls / sample.length < 0.02;
}

function stripComments(content) {
  return content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[\r\n])\s*\/\/[^\r\n]*/g, '$1');
}

function stripNamespaceIdentifiers(content) {
  return content.replace(
    /(\bxmlns(?::[A-Za-z_][\w.-]*)?\s*=\s*)(["'])(?:https?:)?\/\/[^"']+\2/gi,
    '$1""'
  );
}

function lineAndColumn(content, index) {
  const before = content.slice(0, index);
  const line = before.split('\n').length;
  const lastNewline = before.lastIndexOf('\n');
  return { line, column: index - lastNewline };
}

function trimReference(reference) {
  return reference.replace(/[),.;:!?]+$/g, '');
}

export function findLoadBearingReferences(content, filePath = '') {
  if (typeof content !== 'string') return [];
  const searchable = stripComments(stripNamespaceIdentifiers(content));
  const pattern = /(?<![\\/\w])(?:https?:)?\/\/[^\s"'`<>]+/gi;
  const findings = [];
  const seen = new Set();
  for (const match of searchable.matchAll(pattern)) {
    const reference = trimReference(match[0]);
    if (!reference || seen.has(reference)) continue;
    seen.add(reference);
    const position = lineAndColumn(searchable, match.index || 0);
    findings.push({ file: filePath, reference, ...position });
  }
  return findings;
}

export const findExternalReferences = findLoadBearingReferences;

export async function scanPublishableResources(root = process.cwd()) {
  const files = [];
  for (const file of PUBLISHABLE_ROOT_FILES) {
    try {
      await fs.access(path.join(root, file));
      files.push(file);
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }
  for (const directory of PUBLISHABLE_ROOTS) {
    files.push(...await scanDirectory(path.join(root, directory), root));
  }
  const findings = [];
  for (const file of [...new Set(files)].sort()) {
    const fullPath = path.join(root, file);
    const buffer = await fs.readFile(fullPath);
    if (!isTextResource(file, buffer)) continue;
    findings.push(...findLoadBearingReferences(buffer.toString('utf8'), file));
  }
  return findings;
}

export function isSafeLocalReference(reference) {
  if (typeof reference !== 'string' || reference.length === 0 || reference.trim() !== reference) return false;
  if (/\0|\\|[\r\n\t]/.test(reference)) return false;
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) return false;
  if (reference.startsWith('/') || /^[A-Za-z]:/.test(reference)) return false;
  if (reference.includes('?') || reference.includes('#')) return false;
  let decoded;
  try {
    decoded = decodeURIComponent(reference);
  } catch {
    return false;
  }
  if (decoded.includes('\\') || decoded.startsWith('/') || /^[A-Za-z]:/.test(decoded)) return false;
  const segments = decoded.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return false;
  return path.posix.normalize(decoded) === decoded;
}

export function assertSafeLocalReference(reference, field = 'reference') {
  if (!isSafeLocalReference(reference)) throw mediaError(`${field} must be a safe local file reference`, 'unsafe-reference');
}

export function resolveLocalReference(root, reference, field = 'reference') {
  assertSafeLocalReference(reference, field);
  const rootPath = path.resolve(root);
  const target = path.resolve(rootPath, reference);
  if (target !== rootPath && !target.startsWith(`${rootPath}${path.sep}`)) throw mediaError(`${field} escapes the project root`, 'unsafe-reference');
  return target;
}

function parseDescriptor(descriptor, field) {
  if (!descriptor) return {};
  const tokens = descriptor.trim().split(/\s+/);
  if (tokens.length !== 1) throw mediaError(`${field} has an invalid descriptor`, 'invalid-srcset');
  const token = tokens[0];
  if (/^\d+w$/.test(token)) {
    const width = Number(token.slice(0, -1));
    if (!Number.isSafeInteger(width) || width < 1) throw mediaError(`${field} has an invalid width descriptor`, 'invalid-srcset');
    return { width };
  }
  if (/^\d+(?:\.\d+)?x$/.test(token)) {
    const density = Number(token.slice(0, -1));
    if (!Number.isFinite(density) || density <= 0) throw mediaError(`${field} has an invalid density descriptor`, 'invalid-srcset');
    return { density };
  }
  if (/^\d+h$/.test(token)) {
    const height = Number(token.slice(0, -1));
    if (!Number.isSafeInteger(height) || height < 1) throw mediaError(`${field} has an invalid height descriptor`, 'invalid-srcset');
    return { height };
  }
  throw mediaError(`${field} has an invalid descriptor`, 'invalid-srcset');
}

export function parseSrcset(value, field = 'srcset', { requireWidthDescriptor = false } = {}) {
  if (typeof value !== 'string' || value.trim() === '') throw mediaError(`${field} must contain candidates`, 'invalid-srcset');
  const candidates = [];
  for (const rawCandidate of value.split(',')) {
    const candidate = rawCandidate.trim();
    if (!candidate) throw mediaError(`${field} contains an empty candidate`, 'invalid-srcset');
    const match = /^(\S+)(?:\s+([\s\S]+))?$/.exec(candidate);
    if (!match) throw mediaError(`${field} contains an invalid candidate`, 'invalid-srcset');
    const reference = match[1];
    assertSafeLocalReference(reference, field);
    const descriptor = match[2]?.trim() || null;
    candidates.push({ reference, descriptor, ...parseDescriptor(descriptor, field) });
  }
  if (candidates.length === 0) throw mediaError(`${field} must contain candidates`, 'invalid-srcset');
  if (requireWidthDescriptor && candidates.some((candidate) => candidate.width === undefined)) {
    throw mediaError(`${field} must declare a width descriptor for every candidate`, 'invalid-srcset');
  }
  return candidates;
}

export const parseSrcsetCandidates = parseSrcset;

export function validateSizes(value, field = 'sizes') {
  if (typeof value !== 'string' || value.trim() === '') throw mediaError(`${field} must not be empty`, 'invalid-sizes');
  if (/url\s*\(|["']?(?:https?:)?\/\//i.test(value)) throw mediaError(`${field} contains a load-bearing URL`, 'invalid-sizes');
  let depth = 0;
  let quote = null;
  for (const character of value) {
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(') depth += 1;
    else if (character === ')') depth -= 1;
    if (depth < 0) throw mediaError(`${field} has unbalanced parentheses`, 'invalid-sizes');
  }
  if (quote || depth !== 0) throw mediaError(`${field} has unbalanced syntax`, 'invalid-sizes');
  if (value.split(',').some((part) => part.trim() === '')) throw mediaError(`${field} contains an empty size`, 'invalid-sizes');
}

function normalizedFormat(value, compression) {
  const format = String(value || '').toLowerCase();
  if (format === 'jpg') return 'jpeg';
  if (format === 'jpeg') return 'jpeg';
  if (format === 'heif' && String(compression || '').toLowerCase() === 'av1') return 'avif';
  return format;
}

export function expectedImageFormat(fieldOrReference) {
  const value = String(fieldOrReference || '').toLowerCase();
  if (value === 'avif' || value.endsWith('.avif')) return 'avif';
  if (value === 'webp' || value.endsWith('.webp')) return 'webp';
  if (value === 'fallback' || value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'jpeg';
  return path.extname(value).slice(1).toLowerCase();
}

export function isLightReference(reference) {
  const normalized = String(reference || '').replaceAll('\\', '/');
  return path.posix.basename(normalized).includes('-light') || normalized.split('/').includes('light');
}

export function lightImageReference(reference) {
  if (isLightReference(reference)) return reference;
  const parsed = path.posix.parse(String(reference).replaceAll('\\', '/'));
  if (!parsed.ext) return reference;
  const widthMatch = parsed.name.match(/^(.*?)-(\d{3,})$/);
  if (widthMatch) {
    const width = Math.min(Number(widthMatch[2]), LIGHT_MAX_SIDE);
    return path.posix.join(parsed.dir, `${widthMatch[1]}-light-${width}${parsed.ext}`);
  }
  return path.posix.join(parsed.dir, `${parsed.name}-light${parsed.ext}`);
}

export function lightAudioReference(reference) {
  const value = String(reference || '');
  if (isLightReference(value)) return value;
  const extension = path.extname(value).toLowerCase();
  if (extension === '.aac' || extension === '.m4a' || extension === '.wav' || extension === '.opus') {
    return `${value.slice(0, -extension.length)}-light.opus`;
  }
  return `${value.slice(0, -extension.length)}-light${extension}`;
}

export async function validateImageAsset(reference, options = {}) {
  const root = options.root || process.cwd();
  const file = resolveLocalReference(root, reference, options.field || 'image reference');
  let metadata;
  try {
    metadata = await sharp(file).metadata();
  } catch (error) {
    throw mediaError(`${reference} is not a readable image: ${error.message}`, 'invalid-image');
  }
  const actualFormat = normalizedFormat(metadata.format, metadata.compression);
  const expectedFormat = normalizedFormat(options.expectedFormat || expectedImageFormat(reference));
  if (expectedFormat && actualFormat !== expectedFormat) {
    throw mediaError(`${reference} encodes ${actualFormat || 'an unknown format'}, not ${expectedFormat}`, 'invalid-image-format');
  }
  const maxSide = options.maxSide ?? (options.light ? LIGHT_MAX_SIDE : STANDARD_MAX_SIDE);
  const width = Number(metadata.width);
  const height = Number(metadata.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw mediaError(`${reference} has invalid dimensions`, 'invalid-image-dimensions');
  if (Math.max(width, height) > maxSide) throw mediaError(`${reference} exceeds the ${maxSide}px dimension limit`, 'invalid-image-dimensions');
  if (options.expectedWidth !== undefined && width !== options.expectedWidth) throw mediaError(`${reference} width ${width} does not match ${options.expectedWidth}`, 'invalid-image-geometry');
  if (options.expectedHeight !== undefined && height !== options.expectedHeight) throw mediaError(`${reference} height ${height} does not match ${options.expectedHeight}`, 'invalid-image-geometry');
  if (options.descriptorWidth !== undefined && width !== options.descriptorWidth) throw mediaError(`${reference} width ${width} does not match srcset descriptor ${options.descriptorWidth}w`, 'invalid-image-geometry');
  const maxBytes = options.maxBytes ?? (options.light ? LIGHT_MAX_BYTES : STANDARD_MAX_BYTES);
  if (maxBytes !== undefined) {
    const stats = await fs.stat(file);
    if (stats.size > maxBytes) throw mediaError(`${reference} exceeds the ${maxBytes}-byte budget`, 'image-budget-exceeded');
  }
  return { ...metadata, bytes: (await fs.stat(file)).size, width, height, format: actualFormat };
}

function numericBitrate(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return Number.NaN;
  if (typeof value === 'string' && value.trim() === '') return Number.NaN;
  return Number(value);
}

export function validateAudioBitrate(bitrate, variant = 'standard') {
  const range = variant === 'light' ? LIGHT_AUDIO_RANGE : STANDARD_AUDIO_RANGE;
  const value = numericBitrate(bitrate);
  if (!Number.isFinite(value)) throw mediaError(`${variant} audio bitrate must be finite`, 'invalid-audio-bitrate');
  if (value < range.min || value > range.max) throw mediaError(`${variant} audio bitrate ${value} is outside ${range.min}-${range.max} bps`, 'invalid-audio-bitrate');
  return value;
}

function expectedAudio(reference, options = {}) {
  const extension = path.extname(reference).toLowerCase();
  if (options.codec || options.format) return { codec: options.codec, format: options.format };
  if (extension === '.aac' || extension === '.m4a') return { codec: 'aac', format: 'aac' };
  if (extension === '.opus') return { codec: 'opus', format: 'ogg' };
  if (extension === '.wav') return { codec: 'pcm_s16le', format: 'wav' };
  return { codec: undefined, format: undefined };
}

export function validateAudio(reference, codecOrOptions, format, maxBitrate, options = {}) {
  if (codecOrOptions && typeof codecOrOptions === 'object') return validateAudioAsset(reference, codecOrOptions);
  const legacyVariant = Number(maxBitrate) === 64 ? 'light' : 'standard';
  return validateAudioAsset(reference, {
    root: options.root,
    variant: legacyVariant,
    codec: codecOrOptions,
    format
  });
}

export function validateAudioAsset(reference, options = {}) {
  const root = options.root || process.cwd();
  const file = resolveLocalReference(root, reference, options.field || 'audio reference');
  const expected = expectedAudio(reference, options);
  let probe;
  try {
    probe = JSON.parse(execFileSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'stream=codec_name,bit_rate:format=format_name,bit_rate',
      '-of', 'json',
      file
    ], { encoding: 'utf8' }));
  } catch (error) {
    throw mediaError(`${reference} could not be probed as audio: ${error.message}`, 'invalid-audio');
  }
  const stream = probe.streams?.[0] || {};
  const detectedFormat = String(probe.format?.format_name || '');
  if (expected.codec && stream.codec_name !== expected.codec) throw mediaError(`${reference} is ${stream.codec_name || 'unknown'}, not ${expected.codec}`, 'invalid-audio-format');
  if (expected.format && !detectedFormat.includes(expected.format)) throw mediaError(`${reference} is ${detectedFormat || 'an unknown format'}, not ${expected.format}`, 'invalid-audio-format');
  const bitrate = validateAudioBitrate(stream.bit_rate ?? probe.format?.bit_rate, options.variant || 'standard');
  return { codec: stream.codec_name, format: detectedFormat, bitrate };
}

function imageReferences(image) {
  const references = [];
  for (const field of ['avif', 'webp', 'fallback']) {
    if (typeof image?.[field] === 'string') references.push({ reference: image[field], field, format: field, variant: isLightReference(image[field]) ? 'light' : 'standard' });
  }
  for (const [field, format] of [['srcset', null], ['avifSrcset', 'avif'], ['webpSrcset', 'webp'], ['fallbackSrcset', 'fallback']]) {
    if (image?.[field] === undefined) continue;
    for (const candidate of parseSrcset(image[field], `image.${field}`, { requireWidthDescriptor: format !== null })) {
      references.push({ reference: candidate.reference, field, format, descriptorWidth: candidate.width, variant: isLightReference(candidate.reference) ? 'light' : 'standard' });
    }
  }
  return references;
}

function isBaseImageField(field) {
  return /\.(?:avif|webp|fallback|jpe?g)$/i.test(String(field || ''));
}

function lightGeometry(image) {
  const longestSide = Math.max(image.width, image.height);
  if (longestSide <= LIGHT_MAX_SIDE) return { width: image.width, height: image.height };
  const scale = LIGHT_MAX_SIDE / longestSide;
  return { width: Math.round(image.width * scale), height: Math.round(image.height * scale) };
}

async function validateImageReference(root, image, item) {
  const expectedFormat = item.format ? expectedImageFormat(item.format) : expectedImageFormat(item.reference);
  const light = item.variant === 'light';
  const options = {
    root,
    field: `image.${item.field}`,
    expectedFormat,
    light,
    maxSide: light ? LIGHT_MAX_SIDE : STANDARD_MAX_SIDE,
    maxBytes: light ? LIGHT_MAX_BYTES : STANDARD_MAX_BYTES
  };
  if (item.descriptorWidth !== undefined) options.descriptorWidth = item.descriptorWidth;
  if (!light && isBaseImageField(item.field)) {
    options.expectedWidth = image.width;
    options.expectedHeight = image.height;
  }
  const result = await validateImageAsset(item.reference, options);
  if (!light) {
    const lightReference = lightImageReference(item.reference);
    const lightOptions = {
      root,
      field: `image.${item.field}-light`,
      expectedFormat,
      light: true,
      maxSide: LIGHT_MAX_SIDE,
      maxBytes: LIGHT_MAX_BYTES
    };
    if (item.descriptorWidth !== undefined) lightOptions.expectedWidth = Math.min(item.descriptorWidth, LIGHT_MAX_SIDE);
    if (isBaseImageField(item.field)) {
      const geometry = lightGeometry(image);
      lightOptions.expectedWidth = geometry.width;
      lightOptions.expectedHeight = geometry.height;
    }
    await validateImageAsset(lightReference, lightOptions);
  }
  return { ...item, ...result };
}

export function collectManifestMediaReferences(story) {
  const references = [];
  for (const [sceneIndex, scene] of (story?.scenes || []).entries()) {
    if (scene.audio) references.push({ reference: scene.audio.src, field: `scenes[${sceneIndex}].audio.src`, variant: 'standard' });
    for (const [frameIndex, frame] of (scene.frames || []).entries()) {
      if (frame.audio) references.push({ reference: frame.audio.src, field: `scenes[${sceneIndex}].frames[${frameIndex}].audio.src`, variant: 'standard' });
      for (const item of imageReferences(frame.image)) references.push({ ...item, field: item.field.startsWith('image') ? `scenes[${sceneIndex}].frames[${frameIndex}].${item.field}` : `scenes[${sceneIndex}].frames[${frameIndex}].${item.field}` });
    }
  }
  return references;
}

export async function validateManifestMedia(story, options = {}) {
  const root = options.root || process.cwd();
  const validated = [];
  for (const [sceneIndex, scene] of (story?.scenes || []).entries()) {
    if (scene.audio) {
      const track = scene.audio;
      assertSafeLocalReference(track.src, `scenes[${sceneIndex}].audio.src`);
      validated.push({ ...(await validateAudioAsset(track.src, { root, variant: isLightReference(track.src) ? 'light' : 'standard', field: `scenes[${sceneIndex}].audio.src` })), reference: track.src });
      if (!isLightReference(track.src)) {
        const light = lightAudioReference(track.src);
        validated.push({ ...(await validateAudioAsset(light, { root, variant: 'light', field: `scenes[${sceneIndex}].audio-light` })), reference: light });
      }
    }
    for (const [frameIndex, frame] of (scene.frames || []).entries()) {
      if (frame.audio) {
        const track = frame.audio;
        assertSafeLocalReference(track.src, `scenes[${sceneIndex}].frames[${frameIndex}].audio.src`);
        validated.push({ ...(await validateAudioAsset(track.src, { root, variant: isLightReference(track.src) ? 'light' : 'standard', field: `scenes[${sceneIndex}].frames[${frameIndex}].audio.src` })), reference: track.src });
        if (!isLightReference(track.src)) {
          const light = lightAudioReference(track.src);
          validated.push({ ...(await validateAudioAsset(light, { root, variant: 'light', field: `scenes[${sceneIndex}].frames[${frameIndex}].audio-light` })), reference: light });
        }
      }
      if (frame.image?.sizes !== undefined) validateSizes(frame.image.sizes, `scenes[${sceneIndex}].frames[${frameIndex}].image.sizes`);
      for (const item of imageReferences(frame.image)) {
        const image = frame.image;
        const result = await validateImageReference(root, image, { ...item, field: `scenes[${sceneIndex}].frames[${frameIndex}].image.${item.field}` });
        validated.push({ ...result, field: `scenes[${sceneIndex}].frames[${frameIndex}].image.${item.field}` });
      }
    }
  }
  return validated;
}

export function collectPublishableAssetReferences(story) {
  const references = new Set();
  for (const item of collectManifestMediaReferences(story)) {
    references.add(item.reference);
    if (item.variant === 'light') continue;
    const extension = path.extname(item.reference).toLowerCase();
    const isAudio = ['.aac', '.m4a', '.opus', '.wav', '.mp3', '.ogg'].includes(extension);
    references.add(isAudio ? lightAudioReference(item.reference) : lightImageReference(item.reference));
  }
  return references;
}

export async function findUnreferencedAssets(story, root = process.cwd()) {
  const allowed = new Set([...collectPublishableAssetReferences(story)].map((reference) => toPosix(reference)));
  const present = await scanDirectory(path.join(root, 'assets'), root);
  return present.filter((file) => !allowed.has(file));
}

async function requiredFileSize(root, reference) {
  const file = resolveLocalReference(root, reference);
  try {
    const stats = await fs.stat(file);
    if (!stats.isFile()) throw mediaError(`${reference} is not a file`, 'missing-asset');
    return stats.size;
  } catch (error) {
    if (isMissing(error)) throw mediaError(`missing referenced asset: ${reference}`, 'missing-asset');
    throw error;
  }
}

async function getFileSizes(root, references) {
  const total = new Map();
  for (const reference of references) total.set(reference, await requiredFileSize(root, reference));
  let bytes = 0;
  for (const size of total.values()) bytes += size;
  return bytes;
}

async function computeTotalAssets(root, story) {
  const allowed = new Set([...collectPublishableAssetReferences(story)].map((reference) => toPosix(reference)));
  let total = 0;
  for (const file of await scanDirectory(path.join(root, 'assets'), root)) {
    if (!allowed.has(file)) continue;
    total += await requiredFileSize(root, file);
  }
  return total;
}

function budgetReferencesForFrame(frame) {
  const items = imageReferences(frame.image).filter((item) => item.variant !== 'light');
  const selected = [];
  for (const format of ['avif', 'webp', 'fallback']) {
    const candidates = items.filter((item) => item.format === format);
    if (candidates.length === 0) continue;
    candidates.sort((left, right) => (right.descriptorWidth || 0) - (left.descriptorWidth || 0));
    selected.push(candidates[0].reference);
  }
  return selected;
}

export async function validateDeliveryBudgets(story, budget, root = process.cwd()) {
  if (!budget) return { initialAssets: 0, maxFrameAssets: 0, totalAssets: 0 };
  const scenes = story.scenes || [];
  const initialScene = scenes[0];
  let initialReferences = [];
  if (initialScene) {
    if (initialScene.audio) initialReferences.push(initialScene.audio.src);
    for (const frame of initialScene.frames || []) {
      if (frame.audio) initialReferences.push(frame.audio.src);
      initialReferences.push(...budgetReferencesForFrame(frame));
    }
  }
  let maxFrameAssets = 0;
  for (const scene of scenes) {
    for (const frame of scene.frames || []) {
      const references = [...budgetReferencesForFrame(frame), ...(frame.audio ? [frame.audio.src] : [])];
      maxFrameAssets = Math.max(maxFrameAssets, await getFileSizes(root, references));
    }
  }
  const initialAssets = await getFileSizes(root, initialReferences);
  const totalAssets = await computeTotalAssets(root, story);
  if (initialAssets > budget.initialSceneBytes) throw mediaError(`initial scene budget exceeded: ${initialAssets} > ${budget.initialSceneBytes}`, 'asset-budget-exceeded');
  if (maxFrameAssets > budget.frameBytes) throw mediaError(`per-frame budget exceeded: ${maxFrameAssets} > ${budget.frameBytes}`, 'asset-budget-exceeded');
  if (totalAssets > budget.totalAssetsBytes) throw mediaError(`total asset budget exceeded: ${totalAssets} > ${budget.totalAssetsBytes}`, 'asset-budget-exceeded');
  return { initialAssets, maxFrameAssets, totalAssets };
}

async function readJson(file, label) {
  let content;
  try {
    content = await fs.readFile(file, 'utf8');
  } catch (error) {
    if (isMissing(error)) throw mediaError(`${label} not found or unreadable`, 'manifest-unavailable');
    throw error;
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    throw mediaError(`${label} is not valid JSON: ${error.message}`, 'manifest-malformed');
  }
}

async function loadBudget(root) {
  try {
    return JSON.parse(await fs.readFile(path.join(root, 'budget.json'), 'utf8'));
  } catch (error) {
    throw mediaError('budget.json not found or unreadable', 'configuration-invalid');
  }
}

async function copyPublishableFiles(root, story) {
  const dist = path.join(root, 'dist');
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(path.join(dist, 'src/data'), { recursive: true });
  await fs.copyFile(path.join(root, 'index.html'), path.join(dist, 'index.html'));
  await fs.cp(path.join(root, 'src/data'), path.join(dist, 'src/data'), { recursive: true });
  const allowed = new Set([...collectPublishableAssetReferences(story)].map((reference) => toPosix(reference)));
  const files = (await scanDirectory(path.join(root, 'assets'), root)).filter((file) => allowed.has(file));
  files.sort();
  for (const file of files) {
    const target = path.join(dist, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(root, file), target);
  }
  return dist;
}

async function buildBundles(root) {
  // T215: substituting a literal true makes esbuild drop every test-only
  // instrumentation branch at bundle time, so globalThis.__cinematicPlayer and
  // globalThis.__audioInstrument never reach the published bundle. Served from
  // source (dev server and Playwright) the identifier is undefined and the
  // instrumentation stays available, so the suites are unaffected.
  await esbuild.build({ entryPoints: [path.join(root, 'src/scripts/main.js')], bundle: true, format: 'esm', target: 'es2022', minify: true, legalComments: 'none', define: { 'globalThis.__CINEMATIC_PRODUCTION__': 'true' }, outdir: path.join(root, 'dist/src/scripts'), entryNames: '[name]-[hash]' });
  await esbuild.build({ entryPoints: [path.join(root, 'src/styles/tokens.css'), path.join(root, 'src/styles/base.css'), path.join(root, 'src/styles/player.css')], bundle: true, minify: true, outdir: path.join(root, 'dist/src/styles'), entryNames: '[name]-[hash]' });
}

async function writeIndex(root, dist) {
  const scriptDir = path.join(dist, 'src/scripts');
  const styleDir = path.join(dist, 'src/styles');
  const scriptFiles = (await fs.readdir(scriptDir)).filter((file) => file.endsWith('.js'));
  const styleFiles = (await fs.readdir(styleDir)).filter((file) => file.endsWith('.css'));
  if (scriptFiles.length !== 1) throw mediaError('production script bundle is missing or ambiguous', 'build-invalid');
  const scriptFile = scriptFiles[0];
  const scriptOutput = await fs.readFile(path.join(scriptDir, scriptFile));
  const compressedScriptSize = gzipSync(scriptOutput).byteLength;
  const cssBuffers = [];
  for (const file of styleFiles) cssBuffers.push(await fs.readFile(path.join(styleDir, file)));
  const totalCssSize = cssBuffers.reduce((total, buffer) => total + buffer.byteLength, 0);
  const compressedStyleSize = gzipSync(Buffer.concat(cssBuffers)).byteLength;
  const compressedCodeSize = compressedScriptSize + compressedStyleSize;
  const budget = await loadBudget(root);
  if (compressedScriptSize > budget.compressedScriptBytes) throw mediaError(`compressed script budget exceeded: ${compressedScriptSize} > ${budget.compressedScriptBytes}`, 'code-budget-exceeded');
  if (compressedStyleSize > budget.compressedStyleBytes) throw mediaError(`compressed style budget exceeded: ${compressedStyleSize} > ${budget.compressedStyleBytes}`, 'code-budget-exceeded');
  if (compressedCodeSize > budget.compressedCodeBytes) throw mediaError(`compressed code budget exceeded: ${compressedCodeSize} > ${budget.compressedCodeBytes}`, 'code-budget-exceeded');
  let indexContent = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  for (const file of styleFiles) {
    const baseName = file.replace(/-.*\.css$/, '.css');
    indexContent = indexContent.replaceAll(`src/styles/${path.basename(baseName, '.css')}.css`, `src/styles/${file}`);
  }
  indexContent = indexContent.replace('src/scripts/main.js', `src/scripts/${scriptFile}`);
  await fs.writeFile(path.join(dist, 'index.html'), indexContent);
  return { compressedScriptSize, compressedStyleSize, compressedCodeSize, totalCssSize };
}

export async function build(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const findings = await scanPublishableResources(root);
  if (findings.length > 0) {
    const details = findings.map((finding) => `${finding.file}: ${finding.reference}`).join('; ');
    throw mediaError(`external or protocol-relative reference found in publishable resources: ${details}`, 'external-origin');
  }
  const manifestPath = path.join(root, 'src/data/story.json');
  const manifest = await readJson(manifestPath, 'src/data/story.json');
  await validateManifestMedia(manifest, { root });
  const budget = await loadBudget(root);
  const assetSizes = await validateDeliveryBudgets(manifest, budget, root);
  const dist = await copyPublishableFiles(root, manifest);
  await buildBundles(root);
  const codeSizes = await writeIndex(root, dist);
  return { ...assetSizes, ...codeSizes };
}

function isMainModule() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isMainModule()) {
  build().then((result) => {
    console.log(`build complete: ${result.compressedScriptSize} compressed script bytes, ${result.compressedStyleSize} compressed style bytes, raw assets: initial=${result.initialAssets}, maxFrame=${result.maxFrameAssets}, total=${result.totalAssets}`);
  }).catch((error) => {
    console.error(error.message || 'build failed');
    process.exitCode = 1;
  });
}

export { fileURLToPath };
