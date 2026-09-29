import { test, expect } from '@playwright/test';
import {
  openApp,
  waitForPlayer,
  expectFrameId,
  resetStorage,
  selectors,
} from './helpers.js';

test.describe('US1 end-of-story overlay', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await resetStorage(page);
    await openApp(page);
    await waitForPlayer(page);
  });

  test('end overlay appears with accessible replay control', async ({ page }) => {
    await page.locator(selectors.goEnd).click();
    await expectFrameId(page, 'f-005');
    const overlay = page.locator(selectors.endOverlay);
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveAttribute('role', /dialog|alertdialog|region/);
    await expect(page.locator(selectors.replayFromStart)).toBeVisible();
    await expect(page.locator(selectors.replayFromStart)).toHaveAccessibleName(/rever|in[ií]cio/i);
  });

  test('Rever do início restarts at first frame', async ({ page }) => {
    await page.locator(selectors.goEnd).click();
    await expectFrameId(page, 'f-005');
    await page.locator(selectors.replayFromStart).click();
    await expectFrameId(page, 'f-001');
    await expect(page.locator(selectors.endOverlay)).toBeHidden();
  });

  test('navigation controls remain available in ended state and leave ended', async ({ page }) => {
    await page.locator(selectors.goEnd).click();
    await expectFrameId(page, 'f-005');
    await expect(page.locator(selectors.endOverlay)).toBeVisible();

    await expect(page.locator(selectors.prevFrame)).toBeEnabled();
    await page.locator(selectors.prevFrame).click();
    await expectFrameId(page, 'f-004');
    await expect(page.locator(selectors.endOverlay)).toBeHidden();
  });

  test('auto-advance to final frame shows overlay without End key', async ({ page }) => {
    // Written through addInitScript, not page.evaluate: the page loaded by
    // beforeEach is still running between the write and the navigation below,
    // and its own saveProgress() overwrites hwc.progress with wherever it had
    // reached. The stamp matters too — ensureVersion() wipes every key when
    // hwc.schemaVersion does not match (storage.js:164), so a hand-written
    // progress record without it is discarded on boot.
    await page.addInitScript(() => {
      localStorage.setItem('hwc.schemaVersion', '1');
      localStorage.setItem(
        'hwc.progress',
        JSON.stringify({
          frameId: 'f-005',
          updatedAt: new Date().toISOString(),
          seq: 1,
          tabId: 'test',
        }),
      );
    });
    await openApp(page);
    await waitForPlayer(page);
    await expectFrameId(page, 'f-005');
    await expect(page.locator(selectors.endOverlay)).toBeVisible({ timeout: 15_000 });
  });
});
