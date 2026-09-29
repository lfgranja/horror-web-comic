import { test, expect } from '@playwright/test';
import { openApp, waitForPlayer, expectFrameId, resetStorage, selectors } from './helpers.js';

/**
 * Clicking a navigation control pauses auto-advance.
 *
 * This is what made a recovered assertion read as a severe defect: it clicked
 * the play/pause toggle expecting to pause, but the click before it had already
 * paused, so the toggle RESUMED and the player advanced away while the test
 * believed pause had failed. Nothing in the pre-existing suite named the
 * behaviour, so the next person to write a test will make the same mistake.
 */
test.describe('navigation pauses auto-advance', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await resetStorage(page);
    await openApp(page);
    await waitForPlayer(page);
  });

  test('clicking a navigation control stops the automatic advance', async ({ page }) => {
    await expect(page.locator(selectors.player)).toHaveAttribute('data-status', 'playing');
    await page.locator(selectors.nextFrame).click();
    await expectFrameId(page, 'f-002');
    // The click above is the whole subject: it must have paused, not merely
    // navigated. The frame dwell is 2500ms, so waiting 3.5s would have advanced
    // several times had the player still been playing.
    await expect(page.locator(selectors.player)).toHaveAttribute('data-status', 'paused');
    await page.waitForTimeout(3500);
    await expectFrameId(page, 'f-002');
  });
});
