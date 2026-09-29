import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  openApp,
  waitForPlayer,
  expectFrameId,
  resetStorage,
  selectors,
  FRAME_IDS,
} from './helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/story-legacy.json'), 'utf8'),
);

test.describe('US4 accessibility semantics', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await resetStorage(page);
    await openApp(page);
    await waitForPlayer(page);
  });

  test('live region is polite and atomic before changes (FR-012)', async ({ page }) => {
    const live = page.locator(selectors.liveRegion);
    await expect(live).toHaveCount(1);
    await expect(live).toHaveAttribute('aria-live', 'polite');
    await expect(live).toHaveAttribute('aria-atomic', 'true');
  });

  test('live region announces detailed description on advance (FR-012, SC-004)', async ({ page }) => {
    await expectFrameId(page, 'f-001');
    const live = page.locator(selectors.liveRegion);
    await expect(live).toContainText(/doorway|Cracked|pale light/i, { timeout: 5000 });
    await page.locator(selectors.nextFrame).click();
    await expect(live).toContainText(/Footprints|ash|cellar/i, { timeout: 5000 });
  });

  test('current frame image has short non-empty alt (FR-008)', async ({ page }) => {
    const alt = await page
      .locator(selectors.currentFrame)
      .getAttribute('alt');
    expect(alt).toBeTruthy();
    expect(alt.trim().length).toBeGreaterThan(0);
    expect(alt.trim().length).toBeLessThan(200);
  });

  test('progress indicator exposes progressbar semantics (FR-034)', async ({ page }) => {
    const progress = page.locator(selectors.progress);
    await expect(progress).toHaveAttribute('role', 'progressbar');
    await expect(progress).toHaveAttribute('aria-valuenow');
    await expect(progress).toHaveAttribute('aria-valuemin', '1');
    await expect(progress).toHaveAttribute('aria-valuemax');
    const name =
      (await progress.getAttribute('aria-label')) ||
      (await progress.getAttribute('aria-labelledby'));
    expect(name).toBeTruthy();
  });

  test('audio toggle exposes aria-pressed (FR-014)', async ({ page }) => {
    const control = page.locator(selectors.audioToggle);
    await expect(control).toHaveAttribute('aria-pressed', /true|false/);
  });

  test('page declares lang (FR-012)', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('focus is not moved into live region', async ({ page }) => {
    await page.locator(selectors.nextFrame).click();
    const focusedInLive = await page.evaluate((sel) => {
      const live = document.querySelector(sel);
      return !!live && live.contains(document.activeElement);
    }, selectors.liveRegion);
    expect(focusedInLive).toBeFalsy();
  });
});

test.describe('US4 T053a every frame has description and alt', () => {
  test('fixture manifest frames all have non-empty description and alt', async () => {
    const frames = fixture.scenes.flatMap((s) => s.frames);
    expect(frames.length).toBeGreaterThanOrEqual(2);
    for (const frame of frames) {
      expect(frame.description, frame.id).toBeTruthy();
      expect(frame.description.trim().length, frame.id).toBeGreaterThan(0);
      expect(frame.alt, frame.id).toBeTruthy();
      expect(frame.alt.trim().length, frame.id).toBeGreaterThan(0);
    }
  });

  test('live region announces a description on each advance (SC-004 proxy)', async ({ page }) => {
    await openApp(page);
    await resetStorage(page);
    await openApp(page);
    await waitForPlayer(page);

    for (let i = 0; i < FRAME_IDS.length; i += 1) {
      await expectFrameId(page, FRAME_IDS[i]);
      const live = page.locator(selectors.liveRegion);
      await expect(live).toHaveText(/\S/, { timeout: 6000 });
      const text = (await live.innerText()).trim();
      expect(text.length, FRAME_IDS[i]).toBeGreaterThan(0);
      if (i < FRAME_IDS.length - 1) {
        await page.locator(selectors.nextFrame).click();
      }
    }
  });
});
