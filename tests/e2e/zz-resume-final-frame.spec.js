import { test, expect } from '@playwright/test';
import { openApp, waitForPlayer, expectFrameId, selectors } from './helpers.js';

/**
 * Resuming onto the final frame ends the story and shows the overlay.
 *
 * The behaviour is correct and was verified by probe, but nothing asserted it.
 * A recovered test came within one missing storage key of being recorded as a
 * product defect — and the reader-facing question it raised ("does someone
 * returning to the last frame learn the story ended?") had no answer in the
 * suite either way.
 */
test.describe('resume onto the final frame', () => {
  test.beforeEach(async ({ page }) => {
    // The record has to be written before the player boots. Setting it after
    // boot loses a race with the already-running page's own saveProgress().
    await page.addInitScript(() => {
      localStorage.setItem('hwc.schemaVersion', '1');
      localStorage.setItem('hwc.progress', JSON.stringify({
        frameId: 'f-005',
        updatedAt: new Date().toISOString(),
        seq: 1,
        tabId: 't'
      }));
    });
    await openApp(page);
    await waitForPlayer(page);
  });

  test('lands on the last frame, reports ended, and shows the replay overlay', async ({ page }) => {
    await expectFrameId(page, 'f-005');
    await expect(page.locator(selectors.player)).toHaveAttribute('data-status', 'ended');
    await expect(page.locator(selectors.endOverlay)).toBeVisible();
  });
});
