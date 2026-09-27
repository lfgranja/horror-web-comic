const TRANSITION_TYPES = new Set(['cut', 'fade', 'zoom-in', 'zoom-out', 'dissolve', 'slide-left', 'slide-right', 'none']);
const EASINGS = new Set(['linear', 'ease-in', 'ease-out', 'ease-in-out']);
const STORY_KEYS = new Set(['schemaVersion', 'id', 'title', 'defaultFrameDurationMs', 'defaultTransition', 'scenes']);
const SCENE_KEYS = new Set(['id', 'title', 'defaultFrameDurationMs', 'defaultTransition', 'audio', 'frames']);
const FRAME_KEYS = new Set(['id', 'description', 'alt', 'durationMs', 'transition', 'audio', 'image']);
const TRANSITION_KEYS = new Set(['type', 'durationMs', 'easing']);
const IMAGE_KEYS = new Set(['avif', 'webp', 'fallback', 'srcset', 'avifSrcset', 'webpSrcset', 'fallbackSrcset', 'sizes', 'width', 'height']);
const AUDIO_KEYS = new Set(['id', 'src', 'loop', 'volume']);

function fail(message, code = 'manifest-invalid') {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function assertKeys(value, allowed, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${field} is invalid`);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${field}.${key} is not allowed`);
  }
}

function text(value, field) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${field} must be a non-empty string`);
}

function duration(value, field, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) fail(`${field} is outside the allowed range`);
}

function transition(value, field) {
  if (value === undefined) return;
  assertKeys(value, TRANSITION_KEYS, field);
  if (!value || typeof value !== 'object' || !TRANSITION_TYPES.has(value.type)) fail(`${field}.type is invalid`);
  if (value.durationMs !== undefined) duration(value.durationMs, `${field}.durationMs`, 0, 2000);
  if (value.easing !== undefined && !EASINGS.has(value.easing)) fail(`${field}.easing is invalid`);
}

export function isSafeLocalReference(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) return false;
  if (/[\u0000\\]/.test(value) || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return false;
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value) || value.includes('?') || value.includes('#')) return false;
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }
  if (decoded.startsWith('/') || /^[A-Za-z]:/.test(decoded) || decoded.includes('\\')) return false;
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(decoded)) return false;
  const segments = decoded.split('/');
  return segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..') && decoded.split('/').join('/') === decoded;
}

export function validateReference(value, field = 'reference') {
  if (!isSafeLocalReference(value)) fail(`${field} must be a safe local file reference`);
  return value;
}

function descriptor(value, field) {
  if (!value) return {};
  const tokens = value.trim().split(/\s+/);
  if (tokens.length !== 1) fail(`${field} has an invalid descriptor`);
  if (/^\d+w$/.test(tokens[0])) {
    const width = Number(tokens[0].slice(0, -1));
    if (!Number.isSafeInteger(width) || width < 1) fail(`${field} has an invalid width descriptor`);
    return { width };
  }
  if (/^\d+(?:\.\d+)?x$/.test(tokens[0])) {
    const density = Number(tokens[0].slice(0, -1));
    if (!Number.isFinite(density) || density <= 0) fail(`${field} has an invalid density descriptor`);
    return { density };
  }
  if (/^\d+h$/.test(tokens[0])) {
    const height = Number(tokens[0].slice(0, -1));
    if (!Number.isSafeInteger(height) || height < 1) fail(`${field} has an invalid height descriptor`);
    return { height };
  }
  fail(`${field} has an invalid descriptor`);
}

export function parseSrcset(value, field = 'srcset', { requireWidthDescriptor = false } = {}) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${field} must contain candidates`);
  const candidates = [];
  for (const raw of value.split(',')) {
    const candidate = raw.trim();
    if (!candidate) fail(`${field} contains an empty candidate`);
    const match = /^(\S+)(?:\s+([\s\S]+))?$/.exec(candidate);
    if (!match) fail(`${field} contains an invalid candidate`);
    const reference = validateReference(match[1], field);
    candidates.push({ reference, descriptor: match[2]?.trim() || null, ...descriptor(match[2], field) });
  }
  if (requireWidthDescriptor && candidates.some((candidate) => candidate.width === undefined)) {
    fail(`${field} must declare a width descriptor for every candidate`);
  }
  return candidates;
}

export const parseSrcsetCandidates = parseSrcset;

export function validateSrcset(value, field = 'srcset', options) {
  return parseSrcset(value, field, options);
}

export function validateSizes(value, field = 'sizes') {
  if (typeof value !== 'string' || value.trim() === '') fail(`${field} must not be empty`);
  if (/url\s*\(|["']?(?:https?:)?\/\//i.test(value)) fail(`${field} contains a load-bearing URL`);
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
    if (depth < 0) fail(`${field} has unbalanced parentheses`);
  }
  if (quote || depth !== 0) fail(`${field} has unbalanced syntax`);
  if (value.split(',').some((part) => part.trim() === '')) fail(`${field} contains an empty size`);
  return value;
}

function image(value, field) {
  if (!value || typeof value !== 'object') fail(`${field} is required`);
  assertKeys(value, IMAGE_KEYS, field);
  text(value.avif, `${field}.avif`);
  validateReference(value.avif, `${field}.avif`);
  text(value.fallback, `${field}.fallback`);
  validateReference(value.fallback, `${field}.fallback`);
  if (value.webp !== undefined) {
    text(value.webp, `${field}.webp`);
    validateReference(value.webp, `${field}.webp`);
  }
  for (const [key, requiresWidth] of [['srcset', false], ['avifSrcset', true], ['webpSrcset', true], ['fallbackSrcset', true]]) {
    if (value[key] !== undefined) {
      text(value[key], `${field}.${key}`);
      validateSrcset(value[key], `${field}.${key}`, { requireWidthDescriptor: requiresWidth });
    }
  }
  if (value.sizes !== undefined) {
    text(value.sizes, `${field}.sizes`);
    validateSizes(value.sizes, `${field}.sizes`);
  }
  duration(value.width, `${field}.width`, 1, Number.MAX_SAFE_INTEGER);
  duration(value.height, `${field}.height`, 1, Number.MAX_SAFE_INTEGER);
}

function audio(value, field) {
  if (value === undefined) return;
  if (!value || typeof value !== 'object') fail(`${field} is required`);
  assertKeys(value, AUDIO_KEYS, field);
  text(value.id, `${field}.id`);
  text(value.src, `${field}.src`);
  validateReference(value.src, `${field}.src`);
  if (value.loop !== undefined && typeof value.loop !== 'boolean') fail(`${field}.loop is invalid`);
  if (value.volume !== undefined && (typeof value.volume !== 'number' || !Number.isFinite(value.volume) || value.volume < 0 || value.volume > 1)) fail(`${field}.volume is invalid`);
}

export function validateStory(story) {
  if (!story || typeof story !== 'object' || Array.isArray(story)) fail('manifest must be an object');
  assertKeys(story, STORY_KEYS, 'manifest');
  if (story.schemaVersion !== 1) fail('unsupported schemaVersion', 'manifest-incompatible');
  text(story.id, 'id');
  text(story.title, 'title');
  if (story.defaultFrameDurationMs !== undefined) duration(story.defaultFrameDurationMs, 'defaultFrameDurationMs', 500, 30000);
  transition(story.defaultTransition, 'defaultTransition');
  if (!Array.isArray(story.scenes) || story.scenes.length < 1) fail('scenes must contain at least one scene');
  const frameIds = new Set();
  const sceneIds = new Set();
  for (const [sceneIndex, scene] of story.scenes.entries()) {
    const prefix = `scenes[${sceneIndex}]`;
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) fail(`${prefix} is invalid`);
    assertKeys(scene, SCENE_KEYS, prefix);
    text(scene.id, `${prefix}.id`);
    text(scene.title, `${prefix}.title`);
    if (sceneIds.has(scene.id)) fail(`${prefix}.id is duplicated`);
    sceneIds.add(scene.id);
    if (scene.defaultFrameDurationMs !== undefined) duration(scene.defaultFrameDurationMs, `${prefix}.defaultFrameDurationMs`, 500, 30000);
    transition(scene.defaultTransition, `${prefix}.defaultTransition`);
    audio(scene.audio, `${prefix}.audio`);
    if (!Array.isArray(scene.frames) || scene.frames.length < 1) fail(`${prefix}.frames must contain at least one frame`);
    for (const [frameIndex, frame] of scene.frames.entries()) {
      const framePrefix = `${prefix}.frames[${frameIndex}]`;
      if (!frame || typeof frame !== 'object' || Array.isArray(frame)) fail(`${framePrefix} is invalid`);
      assertKeys(frame, FRAME_KEYS, framePrefix);
      text(frame.id, `${framePrefix}.id`);
      if (frameIds.has(frame.id)) fail(`${framePrefix}.id is duplicated`);
      frameIds.add(frame.id);
      text(frame.alt, `${framePrefix}.alt`);
      text(frame.description, `${framePrefix}.description`);
      if (frame.durationMs !== undefined) duration(frame.durationMs, `${framePrefix}.durationMs`, 500, 30000);
      transition(frame.transition, `${framePrefix}.transition`);
      image(frame.image, `${framePrefix}.image`);
      audio(frame.audio, `${framePrefix}.audio`);
    }
  }
  return story;
}

export async function loadStory(url, fetcher = globalThis.fetch) {
  validateReference(url, 'manifest url');
  let response;
  try {
    response = await fetcher(url, { cache: 'no-store' });
  } catch (error) {
    const wrapped = new Error(`manifest request failed: ${error?.message || 'request failed'}`);
    wrapped.code = 'manifest-unavailable';
    throw wrapped;
  }
  if (!response?.ok) {
    const error = new Error(`manifest request returned ${response?.status ?? 'an unavailable response'}`);
    error.code = 'manifest-unavailable';
    throw error;
  }
  let story;
  try {
    story = await response.json();
  } catch (error) {
    const wrapped = new Error(`manifest is not valid JSON: ${error?.message || 'invalid JSON'}`);
    wrapped.code = 'manifest-malformed';
    throw wrapped;
  }
  return validateStory(story);
}
