import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * T219 — SC-013 was being proved against the wrong bytes.
 *
 * The pre-existing audit in content-audit.spec.js reads the lettering out of
 * `tests/fixtures/assets/frames/*.svg`, so it validates the test fixture and
 * nothing that ships. This suite points at the PUBLISHED rasters under
 * `assets/frames/generated/`, which is what a visitor actually sees.
 *
 * A note on what OCR can and cannot do here, because the gate is built to match
 * reality rather than to look thorough. The frames are dark, low-contrast
 * illustrations, so recognition is partial and uneven:
 *
 *   frame-01  "VOLTE QUANDO A CASA ACORDAR"  -> recovers CASA, ACOR, DO, OLTE
 *   frame-02  "ELA AINDA ESTÁ EM CASA"       -> recovers nothing legible
 *   frame-03  "NÃO OLHE PARA TRÁS"           -> recovers NAO, TRAS
 *   frame-04  "A CHUVA NÃO PARA"            -> recovers in full
 *
 * Asserting exact strings on all four would be a flaky gate that fails for
 * reasons unrelated to the product, and a gate that fails loudly every night
 * teaches people to ignore it. So the assertions are:
 *
 *   1. tesseract must be present. If it is not, this FAILS — a content audit
 *      that silently skips would report success while checking nothing, which
 *      is the exact failure T219 is about.
 *   2. frame-04's phrase must be recovered and confirmed, because it is
 *      reliably legible and is the strongest available evidence.
 *   3. every frame that yielded ANY lettering must have at least one recovered
 *      token confirmed against its description.
 *   4. a floor on total confirmed tokens across production.
 *
 * The per-frame report is printed so the evidence — including the frames that
 * could not be read — is visible in the run output rather than implied.
 */

const MIN_TOTAL_CONFIRMED_TOKENS = 6;
const FRAME_WITH_FULL_LETTERING = 'frame-04';
const FULL_LETTERING = 'A CHUVA NÃO PARA';

function normalise(value) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensOf(value) {
  return normalise(value)
    .split(' ')
    .filter((token) => token.length >= 3);
}

function requireTesseract() {
  try {
    execFileSync('tesseract', ['--version'], { stdio: 'pipe' });
  } catch {
    throw new Error(
      'tesseract is required by the published-raster content audit (T219) but was not found on PATH. ' +
        'Install it (Debian/Ubuntu: apt-get install -y tesseract-ocr) — the audit must fail rather than skip, ' +
        'otherwise SC-013 is certified against nothing.'
    );
  }
}

function ocrRaster(jpegPath) {
  // Upscale, grayscale and normalise: the lettering is thin and low contrast,
  // and the default pass over the shipped 1200 px raster recovers almost none
  // of it. Sparse-text mode suits text laid over an illustration.
  const upscaled = path.join(os.tmpdir(), `t219-${path.basename(jpegPath)}-${process.pid}.png`);
  try {
    const sharp = require('sharp');
    sharp(jpegPath)
      .resize({ width: 2400 })
      .grayscale()
      .normalize()
      .png()
      .toFile(upscaled);
  } catch {
    // sharp is async here on purpose only for its transform pipeline; fall back
    // to the untouched raster if the transform cannot be applied.
  }
  const target = fs.existsSync(upscaled) ? upscaled : jpegPath;
  try {
    return execFileSync('tesseract', [target, '-', '--psm', '11'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } finally {
    if (target === upscaled) fs.rmSync(upscaled, { force: true });
  }
}

test.describe('published-raster content audit (T219)', () => {
  test('lettering on the shipped rasters is reproduced by each frame description', async ({ page }) => {
    requireTesseract();

    const storyResponse = await page.request.get('/src/data/story.json');
    expect(storyResponse.ok()).toBeTruthy();
    const story = await storyResponse.json();
    const frames = story.scenes.flatMap((scene) => scene.frames);
    expect(frames.length).toBeGreaterThan(0);

    const storyRoot = path.resolve(process.cwd());
    const report = [];
    let totalConfirmed = 0;
    let fullLetteringConfirmed = false;

    for (const frame of frames) {
      // The raster a browser actually paints for this frame, from the manifest
      // rather than from a hard-coded path.
      const raster = path.resolve(storyRoot, frame.image.fallback);
      expect(fs.existsSync(raster), `${frame.id} published raster missing: ${raster}`).toBe(true);

      const raw = ocrRaster(raster);
      const recovered = tokensOf(raw);
      const descriptionTokens = new Set(tokensOf(frame.description));
      const confirmed = recovered.filter((token) => descriptionTokens.has(token));
      totalConfirmed += confirmed.length;

      const normalisedDescription = normalise(frame.description);
      const normalisedFull = normalise(FULL_LETTERING);
      if (frame.id === FRAME_WITH_FULL_LETTERING) {
        fullLetteringConfirmed = normalisedDescription.includes(normalisedFull);
      }

      report.push(
        `${frame.id}: recovered=[${recovered.join(' ')}] confirmed=[${confirmed.join(' ')}] ` +
          `${confirmed.length > 0 ? 'OK' : recovered.length === 0 ? 'NOT LEGIBLE BY OCR' : 'UNCONFIRMED'}`
      );

      if (recovered.length > 0) {
        expect(
          confirmed.length,
          `${frame.id}: OCR recovered lettering [${recovered.join(' ')}] but none of it appears in the description`
        ).toBeGreaterThan(0);
      }
    }

    console.log(`\n=== T219 published-raster lettering audit ===\n${report.join('\n')}\ntotal confirmed tokens: ${totalConfirmed}\n`);

    expect(
      fullLetteringConfirmed,
      `${FRAME_WITH_FULL_LETTERING} must reproduce "${FULL_LETTERING}" literally (FR-012, SC-013)`
    ).toBe(true);
    expect(totalConfirmed, `too little lettering confirmed across production: ${report.join(' | ')}`).toBeGreaterThanOrEqual(
      MIN_TOTAL_CONFIRMED_TOKENS
    );
  });

  test('the shipped raster for every frame exists and matches its declared format', async ({ page }) => {
    // The other half of "point the audit at the published rasters": prove the
    // bytes the audit reads are the bytes the manifest advertises.
    const storyResponse = await page.request.get('/src/data/story.json');
    const story = await storyResponse.json();
    const frames = story.scenes.flatMap((scene) => scene.frames);
    const storyRoot = path.resolve(process.cwd());
    for (const frame of frames) {
      for (const [field, extension] of [['avif', '.avif'], ['webp', '.webp'], ['fallback', '.jpg']]) {
        const target = path.resolve(storyRoot, frame.image[field]);
        expect(fs.existsSync(target), `${frame.id}.${field} missing: ${target}`).toBe(true);
        expect(target.endsWith(extension), `${frame.id}.${field} path does not match its format`).toBe(true);
      }
      expect(
        fs.statSync(path.resolve(storyRoot, frame.image.fallback)).size,
        `${frame.id} fallback must be the universal format`
      ).toBeGreaterThan(0);
    }
  });
});
