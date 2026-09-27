import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { validateStory, isSafeLocalReference } from '../src/scripts/story-loader.js';

const DEFAULT_SCHEMA_PATH = 'specs/001-cinematic-player/contracts/story-manifest.schema.json';

class ManifestError extends Error {
  constructor(message, code = 'manifest-invalid') {
    super(message);
    this.name = 'ManifestError';
    this.code = code;
  }
}

function isMissing(error) {
  return error?.code === 'ENOENT';
}

function assertSafeManifestReference(reference, field = 'manifest reference') {
  if (!isSafeLocalReference(reference)) throw new ManifestError(`${field} must be a safe local file reference`, 'unsafe-reference');
  return reference;
}

function resolveManifestPath(root, reference, field = 'manifest reference') {
  assertSafeManifestReference(reference, field);
  const rootPath = path.resolve(root);
  const target = path.resolve(rootPath, reference);
  if (target !== rootPath && !target.startsWith(`${rootPath}${path.sep}`)) throw new ManifestError(`${field} escapes the project root`, 'unsafe-reference');
  return target;
}

function parseCandidateDescriptor(descriptor, field) {
  if (!descriptor) return {};
  const tokens = descriptor.trim().split(/\s+/);
  if (tokens.length !== 1) throw new ManifestError(`${field} has an invalid descriptor`, 'invalid-srcset');
  if (/^\d+w$/.test(tokens[0])) {
    const width = Number(tokens[0].slice(0, -1));
    if (!Number.isSafeInteger(width) || width < 1) throw new ManifestError(`${field} has an invalid width descriptor`, 'invalid-srcset');
    return { width };
  }
  if (/^\d+(?:\.\d+)?x$/.test(tokens[0])) {
    const density = Number(tokens[0].slice(0, -1));
    if (!Number.isFinite(density) || density <= 0) throw new ManifestError(`${field} has an invalid density descriptor`, 'invalid-srcset');
    return { density };
  }
  if (/^\d+h$/.test(tokens[0])) {
    const height = Number(tokens[0].slice(0, -1));
    if (!Number.isSafeInteger(height) || height < 1) throw new ManifestError(`${field} has an invalid height descriptor`, 'invalid-srcset');
    return { height };
  }
  throw new ManifestError(`${field} has an invalid descriptor`, 'invalid-srcset');
}

export function parseSrcset(value, field = 'srcset', { requireWidthDescriptor = false } = {}) {
  if (typeof value !== 'string' || value.trim() === '') throw new ManifestError(`${field} must contain candidates`, 'invalid-srcset');
  const candidates = [];
  for (const raw of value.split(',')) {
    const candidate = raw.trim();
    if (!candidate) throw new ManifestError(`${field} contains an empty candidate`, 'invalid-srcset');
    const match = /^(\S+)(?:\s+([\s\S]+))?$/.exec(candidate);
    if (!match) throw new ManifestError(`${field} contains an invalid candidate`, 'invalid-srcset');
    const reference = assertSafeManifestReference(match[1], field);
    candidates.push({ reference, descriptor: match[2]?.trim() || null, ...parseCandidateDescriptor(match[2], field) });
  }
  if (requireWidthDescriptor && candidates.some((candidate) => candidate.width === undefined)) {
    throw new ManifestError(`${field} must declare a width descriptor for every candidate`, 'invalid-srcset');
  }
  return candidates;
}

export function collectManifestReferences(manifest) {
  const references = [];
  for (const [sceneIndex, scene] of (manifest?.scenes || []).entries()) {
    if (scene.audio) references.push({ reference: assertSafeManifestReference(scene.audio.src, `scenes[${sceneIndex}].audio.src`), field: `scenes[${sceneIndex}].audio.src` });
    for (const [frameIndex, frame] of (scene.frames || []).entries()) {
      if (frame.audio) references.push({ reference: assertSafeManifestReference(frame.audio.src, `scenes[${sceneIndex}].frames[${frameIndex}].audio.src`), field: `scenes[${sceneIndex}].frames[${frameIndex}].audio.src` });
      const image = frame.image || {};
      for (const field of ['avif', 'webp', 'fallback']) {
        if (image[field] !== undefined) references.push({ reference: assertSafeManifestReference(image[field], `scenes[${sceneIndex}].frames[${frameIndex}].image.${field}`), field: `scenes[${sceneIndex}].frames[${frameIndex}].image.${field}` });
      }
      for (const [field, requiresWidth] of [['srcset', false], ['avifSrcset', true], ['webpSrcset', true], ['fallbackSrcset', true]]) {
        if (image[field] === undefined) continue;
        for (const candidate of parseSrcset(image[field], `scenes[${sceneIndex}].frames[${frameIndex}].image.${field}`, { requireWidthDescriptor: requiresWidth })) {
          references.push({ reference: candidate.reference, field: `scenes[${sceneIndex}].frames[${frameIndex}].image.${field}`, descriptorWidth: candidate.width });
        }
      }
    }
  }
  return references;
}

function formatSchemaErrors(errors = []) {
  return errors.map((error) => `${error.instancePath || '/'} ${error.message || 'is invalid'}`).join('; ');
}

function isSchemaVersionError(errors = [], manifest) {
  return manifest?.schemaVersion !== 1 || errors.some((error) => error.keyword === 'const' && error.instancePath === '/schemaVersion');
}

export function validateSchema(manifest, schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (validate(manifest)) return manifest;
  const errors = validate.errors || [];
  if (isSchemaVersionError(errors, manifest)) throw new ManifestError('unsupported schemaVersion', 'manifest-incompatible');
  throw new ManifestError(`manifest schema validation failed: ${formatSchemaErrors(errors)}`, 'manifest-invalid');
}

export function validateManifestStructure(manifest) {
  try {
    return validateStory(manifest);
  } catch (error) {
    if (error?.code) throw new ManifestError(error.message, error.code);
    throw new ManifestError(error?.message || 'manifest validation failed', 'manifest-invalid');
  }
}

async function assertFileReference(root, reference, field) {
  const file = resolveManifestPath(root, reference, field);
  let stats;
  try {
    stats = await fs.stat(file);
  } catch (error) {
    if (isMissing(error)) throw new ManifestError(`missing referenced asset: ${reference}`, 'missing-asset');
    throw error;
  }
  if (!stats.isFile()) throw new ManifestError(`referenced asset is not a file: ${reference}`, 'missing-asset');
  try {
    const realRoot = await fs.realpath(root);
    const realFile = await fs.realpath(file);
    if (realFile !== realRoot && !realFile.startsWith(`${realRoot}${path.sep}`)) throw new ManifestError(`referenced asset escapes the project root: ${reference}`, 'unsafe-reference');
  } catch (error) {
    if (error instanceof ManifestError) throw error;
    throw new ManifestError(`unable to verify referenced asset: ${reference}`, 'missing-asset');
  }
  return file;
}

export async function validateManifestIntegrity(manifest, options = {}) {
  const root = path.resolve(options.root || process.cwd());
  validateManifestStructure(manifest);
  const references = collectManifestReferences(manifest);
  if (options.checkFiles !== false) {
    for (const item of references) await assertFileReference(root, item.reference, item.field);
  } else {
    for (const item of references) resolveManifestPath(root, item.reference, item.field);
  }
  return references;
}

async function readJsonFile(file, label, missingCode) {
  let content;
  try {
    content = await fs.readFile(file, 'utf8');
  } catch (error) {
    if (isMissing(error)) throw new ManifestError(`${label} not found or unreadable`, missingCode);
    throw error;
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new ManifestError(`${label} is not valid JSON: ${error.message}`, 'manifest-malformed');
  }
}

export async function readSchema(root = process.cwd(), schemaPath = DEFAULT_SCHEMA_PATH) {
  return readJsonFile(resolveManifestPath(root, schemaPath, 'schema path'), 'story manifest schema', 'schema-unavailable');
}

export async function loadManifest(manifestPath = 'src/data/story.json', options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const resolvedManifestPath = resolveManifestPath(root, manifestPath, 'manifest path');
  const manifest = await readJsonFile(resolvedManifestPath, 'manifest', 'manifest-unavailable');
  const schema = options.schema || await readSchema(root, options.schemaPath || DEFAULT_SCHEMA_PATH);
  validateManifestStructure(manifest);
  validateSchema(manifest, schema);
  const references = await validateManifestIntegrity(manifest, { root, checkFiles: options.checkFiles });
  return { manifest, references, path: resolvedManifestPath };
}

export async function validateManifest(manifestOrPath, options = {}) {
  if (typeof manifestOrPath === 'string') return loadManifest(manifestOrPath, options);
  const root = path.resolve(options.root || process.cwd());
  const schema = options.schema || await readSchema(root, options.schemaPath || DEFAULT_SCHEMA_PATH);
  validateManifestStructure(manifestOrPath);
  validateSchema(manifestOrPath, schema);
  const references = await validateManifestIntegrity(manifestOrPath, { root, checkFiles: options.checkFiles });
  return { manifest: manifestOrPath, references };
}

function isMainModule() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

async function main() {
  const requestedManifest = process.argv[2] || 'src/data/story.json';
  const root = process.cwd();
  const result = await loadManifest(requestedManifest, { root });
  console.log(`manifest valid: ${result.path}`);
}

if (isMainModule()) {
  main().catch((error) => {
    const message = error?.code === 'manifest-unavailable' ? 'manifest is unavailable' : error?.code === 'manifest-malformed' ? 'manifest is malformed JSON' : error?.code === 'manifest-incompatible' ? 'manifest schemaVersion is incompatible' : error?.message || 'manifest validation failed';
    console.error(message);
    process.exitCode = 1;
  });
}

export { ManifestError, assertSafeManifestReference, resolveManifestPath };
