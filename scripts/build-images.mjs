import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { LIGHT_MAX_SIDE } from '../src/scripts/light-variants.js';

export const MAX_STANDARD_SIDE = 2560;
export const MAX_LIGHT_SIDE = LIGHT_MAX_SIDE;
export const MAX_LIGHT_BYTES = 150_000;
export const MAX_STANDARD_BYTES = 300_000;
export const MIN_AUDIO_DURATION_SECONDS = 1;
export const STANDARD_WIDTHS = [320, 640, 960, 1200, 1920, 2560];
export const LIGHT_WIDTHS = [320, 640, 960, 1200, 1280];

const IMAGE_FORMATS = {
  avif: { extension: 'avif', quality: 50, lightQuality: 35 },
  webp: { extension: 'webp', quality: 75, lightQuality: 60 },
  jpeg: { extension: 'jpg', quality: 80, lightQuality: 65 }
};

const AUDIO_VARIANTS = {
  standard: { codec: 'aac', encoder: 'aac', format: 'aac', bitrate: 112000, minimumBitrate: 96000, maximumBitrate: 128000 },
  light: { codec: 'opus', encoder: 'libopus', format: 'ogg', bitrate: 52000, minimumBitrate: 48000, maximumBitrate: 64000 }
};

async function isFresh(input, output) {
  try {
    const [inputStats, outputStats] = await Promise.all([fs.stat(input), fs.stat(output)]);
    return outputStats.size > 0 && outputStats.mtimeMs >= inputStats.mtimeMs;
  } catch {
    return false;
  }
}

function imageFormat(file) {
  const extension = path.extname(file).toLowerCase();
  if (extension === '.avif') return 'avif';
  if (extension === '.webp') return 'webp';
  if (extension === '.jpg' || extension === '.jpeg') return 'jpeg';
  return null;
}

function matchesImageFormat(metadata, expected) {
  if (expected === 'avif') return metadata.format === 'heif' && metadata.compression === 'av1' || metadata.format === 'avif';
  return metadata.format === expected;
}

export async function validateImage(file, isLight = false, expectedFormat = imageFormat(file), maxBytes = isLight ? MAX_LIGHT_BYTES : MAX_STANDARD_BYTES) {
  let metadata;
  try {
    metadata = await sharp(file, { failOn: 'error' }).metadata();
  } catch {
    throw new Error(`${file} is not a readable ${expectedFormat || 'image'}`);
  }
  if (!expectedFormat || !matchesImageFormat(metadata, expectedFormat)) {
    throw new Error(`${file} is not ${expectedFormat || 'a supported'} image`);
  }
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height)) throw new Error(`${file} has no valid dimensions`);
  const maxSide = isLight ? MAX_LIGHT_SIDE : MAX_STANDARD_SIDE;
  if (Math.max(metadata.width, metadata.height) > maxSide) throw new Error(`${file} exceeds ${maxSide}px`);
  const stats = await fs.stat(file);
  if (stats.size > maxBytes) throw new Error(`${file} exceeds ${maxBytes} bytes`);
  return { format: expectedFormat, width: metadata.width, height: metadata.height, bytes: stats.size };
}

async function sourceWidth(input) {
  const metadata = await sharp(input, { failOn: 'error' }).metadata();
  if (!Number.isInteger(metadata.width) || metadata.width < 1) throw new Error(`${input} has no usable width`);
  return Math.min(metadata.width, MAX_STANDARD_SIDE);
}

function candidateName(stem, width, format, isLight) {
  const extension = IMAGE_FORMATS[format].extension;
  return `${stem}${isLight ? '-light' : ''}-${width}.${extension}`;
}

async function encodeImage(input, output, width, format, isLight) {
  const settings = IMAGE_FORMATS[format];
  const qualities = isLight
    ? [settings.lightQuality, 50, 40, 30, 20, 10]
    : [settings.quality, 45, 40, 35, 30, 25];
  for (const quality of qualities) {
    const pipeline = sharp(input, { failOn: 'error' })
      .rotate()
      // T217: never enlarge past the master. Upscaling a 1200 px master into
      // the 1920/2560 candidates published pixels carrying no extra detail.
      .resize({ width, fit: 'inside', withoutEnlargement: true });
    if (format === 'avif') await pipeline.avif({ quality, effort: isLight ? 3 : 4 }).toFile(output);
    else if (format === 'webp') await pipeline.webp({ quality }).toFile(output);
    else await pipeline.jpeg({ quality }).toFile(output);
    const stats = await fs.stat(output);
    if (stats.size <= (isLight ? MAX_LIGHT_BYTES : MAX_STANDARD_BYTES)) return;
  }
  await fs.rm(output, { force: true });
  throw new Error(`${output} exceeds ${isLight ? MAX_LIGHT_BYTES : MAX_STANDARD_BYTES} bytes`);
}

async function ensureImage(input, output, width, format, isLight) {
  let valid = false;
  let formatMismatch = false;
  if (await fs.stat(output).then(() => true).catch(() => false)) {
    try {
      const metadata = await validateImage(output, isLight, format);
      valid = metadata.width === width;
    } catch (err) {
      valid = false;
      // Invalid format, budget, or geometry -> must NOT silently re-encode
      formatMismatch = true;
    }
  }
  if (formatMismatch) throw new Error(`Output ${output} failed validation and must not be overwritten`);
  if (!valid || !(await isFresh(input, output))) await encodeImage(input, output, width, format, isLight);
  await validateImage(output, isLight, format);
}

function probeAudio(file) {
  return JSON.parse(execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=codec_name,codec_type,bit_rate,duration:format=format_name,duration,bit_rate',
    '-of', 'json',
    file
  ], { encoding: 'utf8' }));
}

function measuredBitrate(probe, stream) {
  return Number(stream?.bit_rate || probe.format?.bit_rate);
}

export function validateAudio(file, codec, format, minimumBitrate, maximumBitrate, minimumDuration = MIN_AUDIO_DURATION_SECONDS) {
  const probe = probeAudio(file);
  const stream = (probe.streams || []).find((entry) => entry.codec_type === 'audio');
  if (!stream || stream.codec_name !== codec) throw new Error(`${file} is not ${codec}`);
  const formats = String(probe.format?.format_name || '').split(',');
  if (!formats.includes(format)) throw new Error(`${file} is not ${format}`);
  const bitrate = measuredBitrate(probe, stream);
  if (!Number.isFinite(bitrate)) throw new Error(`${file} has no measurable bitrate`);
  if (bitrate < minimumBitrate || bitrate > maximumBitrate) throw new Error(`${file} bitrate ${bitrate} is outside ${minimumBitrate}-${maximumBitrate} bits/s`);
  const duration = Number(probe.format?.duration || stream.duration);
  if (!Number.isFinite(duration) || duration < minimumDuration) throw new Error(`${file} duration ${duration} is below ${minimumDuration}s`);
  return { bitrate, duration, codec, format };
}

function validateAudioSource(file) {
  const probe = probeAudio(file);
  const duration = Number(probe.format?.duration);
  if (!Number.isFinite(duration) || duration < MIN_AUDIO_DURATION_SECONDS) throw new Error(`${file} must be at least ${MIN_AUDIO_DURATION_SECONDS}s`);
  return { duration };
}

function encodeAudio(input, output, variant) {
  execFileSync('ffmpeg', [
    '-y',
    '-i', input,
    '-ar', '48000',
    '-b:a', `${variant.bitrate / 1000}k`,
    '-codec:a', variant.encoder,
    output
  ], { stdio: 'pipe' });
}

async function ensureAudio(input, output, variant) {
  if (await fs.stat(output).then(() => true).catch(() => false)) {
    validateAudio(output, variant.codec, variant.format, variant.minimumBitrate, variant.maximumBitrate);
  }
  if (!(await isFresh(input, output))) encodeAudio(input, output, variant);
  validateAudio(output, variant.codec, variant.format, variant.minimumBitrate, variant.maximumBitrate);
}

// Masters are read from media-src/ and every derived file is written under
// assets/. The two trees are kept apart on purpose: assets/ is the publishable
// tree, and the build refuses to ship anything there that the manifest does not
// reference or that is not a delivery-encoded file. Putting masters in assets/
// would fail that contract even though the media build needs them, so the source
// tree lives outside it and never ships.
export const SOURCE_ROOTS = Object.freeze({ frames: 'media-src/frames', audio: 'media-src/audio' });

/**
 * Discover the committed master sources without encoding anything.
 *
 * Split out of buildImages so a test can assert that the committed masters are
 * discoverable without running the encoders. Encoding writes into assets/, and a
 * test that regenerated those files in place would race any other test reading
 * the same byte totals — and the output is not byte-stable across ffmpeg/sharp
 * versions, so the totals would depend on the runner.
 */
export async function discoverSources(root = process.cwd()) {
  const frameDirectory = path.join(root, SOURCE_ROOTS.frames);
  const audioDirectory = path.join(root, SOURCE_ROOTS.audio);
  const frameFiles = (await readdirOrEmpty(frameDirectory, true))
    .filter((entry) => entry.isFile() && !entry.name.includes('-light') && /\.(?:svg|png|jpe?g)$/i.test(entry.name))
    .map((entry) => entry.name);
  const audioFiles = (await readdirOrEmpty(audioDirectory, false))
    .filter((file) => file.endsWith('.wav') && !file.includes('-light'));
  return {
    frameSources: frameFiles.length,
    audioSources: audioFiles.length,
    frameFiles,
    audioFiles
  };
}

async function readdirOrEmpty(directory, withFileTypes) {
  try {
    return await fs.readdir(directory, withFileTypes ? { withFileTypes: true } : undefined);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

export async function buildImages(root = process.cwd()) {
  const frameSourceDirectory = path.join(root, SOURCE_ROOTS.frames);
  const generatedDirectory = path.join(root, 'assets/frames/generated');
  await fs.mkdir(frameSourceDirectory, { recursive: true });
  await fs.mkdir(generatedDirectory, { recursive: true });
  for (const file of await fs.readdir(generatedDirectory)) {
    if (file.includes('-light-light.')) await fs.rm(path.join(generatedDirectory, file), { force: true });
  }
  const { frameFiles: files } = await discoverSources(root);
  for (const file of files) {
    const input = path.join(frameSourceDirectory, file);
    const stem = path.parse(file).name;
    const intrinsicWidth = await sourceWidth(input);
    for (const [format, settings] of Object.entries(IMAGE_FORMATS)) {
      const baseOutput = path.join(generatedDirectory, `${stem}.${settings.extension}`);
      await ensureImage(input, baseOutput, intrinsicWidth, format, false);
      const lightBaseOutput = path.join(generatedDirectory, `${stem}-light.${settings.extension}`);
      await ensureImage(input, lightBaseOutput, Math.min(intrinsicWidth, MAX_LIGHT_SIDE), format, true);
    }
    for (const width of STANDARD_WIDTHS) {
      // T217: only emit candidates the master can genuinely fill. A width above
      // the master would either be upscaled or written under a name that lies
      // about its geometry.
      if (width > intrinsicWidth) continue;
      for (const [format, settings] of Object.entries(IMAGE_FORMATS)) {
        const output = path.join(generatedDirectory, candidateName(stem, width, format, false));
        await ensureImage(input, output, width, format, false);
      }
    }
    for (const width of LIGHT_WIDTHS) {
      if (width > intrinsicWidth) continue;
      for (const [format, settings] of Object.entries(IMAGE_FORMATS)) {
        const output = path.join(generatedDirectory, candidateName(stem, width, format, true));
        await ensureImage(input, output, width, format, true);
      }
    }
  }
  const audioSourceDirectory = path.join(root, SOURCE_ROOTS.audio);
  const audioPublishDirectory = path.join(root, 'assets/audio');
  await fs.mkdir(audioSourceDirectory, { recursive: true });
  await fs.mkdir(audioPublishDirectory, { recursive: true });
  const { audioFiles } = await discoverSources(root);
  for (const file of audioFiles) {
    const input = path.join(audioSourceDirectory, file);
    const stem = path.parse(file).name;
    validateAudioSource(input);
    await ensureAudio(input, path.join(audioPublishDirectory, `${stem}.aac`), AUDIO_VARIANTS.standard);
    await ensureAudio(input, path.join(audioPublishDirectory, `${stem}-light.opus`), AUDIO_VARIANTS.light);
  }
  const result = { frameSources: files.length, audioSources: audioFiles.length };
  // T207: a media build that found nothing is a failure, not a pass. Without
  // this the step exits 0 having generated nothing, so the published variants
  // under assets/frames/generated and assets/audio are unreproducible and the
  // CI step proves nothing at all. Commit the frame and audio masters (the
  // source artwork in media-src/frames/*.svg|png|jpe?g and audio masters in
  // media-src/audio/*.wav) to make the pipeline reproducible.
  if (files.length === 0 && audioFiles.length === 0) {
    throw new Error(
      'buildImages found no frame or audio master sources: expected image masters in ' +
      'media-src/frames/*.svg|png|jpe?g and audio masters in media-src/audio/*.wav. ' +
      'Refusing to report success while the published variants are unreproducible.'
    );
  }
  return result;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = await buildImages();
  console.log(`processed ${result.frameSources} frame source(s) and ${result.audioSources} audio source(s) with responsive AVIF/WebP/JPEG and AAC/Opus variants`);
}
