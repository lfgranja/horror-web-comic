import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame } from './helpers.js';

test('starts on the first frame and advances in narrative order', async ({ page }) => {
  await openPlayer(page);
  await waitForFrame(page, 'frame-01');
  await expect(page.locator('#frame-image')).toHaveAttribute('data-frame-id', 'frame-01');
  await waitForFrame(page, 'frame-02');
  await expect(page.locator('#progress')).toHaveAttribute('aria-valuenow', '2');
});

test('pausing stops automatic progression and resuming restarts the current frame', async ({ page }) => {
  await openPlayer(page);
  await page.locator('#play-toggle').click();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
  const before = await page.locator('#player').getAttribute('data-frame-id');
  await page.waitForTimeout(900);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', before);
  await page.locator('#play-toggle').click();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});

test('honors the author duration within the configured tolerance', async ({ page }) => {
  await openPlayer(page);
  await waitForFrame(page, 'frame-02');
  const measured = await page.evaluate(() => window.__cinematicPlayer.lastMeasuredDwellMs);
  expect(measured).toBeGreaterThanOrEqual(1350);
  expect(measured).toBeLessThanOrEqual(1650);
});

test('keeps the 1x author dwell within ten percent', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  // Settle on frame-01: openPlayer's pause click can land after auto-start
  // advanced, leaving the player paused on frame-02; the frame-02 wait below
  // would then pass instantly with a stale (or null) lastMeasuredDwellMs.
  await page.evaluate(() => {
    const player = globalThis.__cinematicPlayer;
    player.pause();
    if (player.pendingNavigation) {
      clearTimeout(player.pendingNavigation);
      player.pendingNavigation = null;
      player.pendingNavigationAction = null;
    }
    player.lastNavigation = 0;
    player.moveTo(0, false);
    player.lastNavigation = 0;
    player.lastMeasuredDwellMs = null;
  });
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await page.locator('#play-toggle').click();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
  await waitForFrame(page, 'frame-02');
  const measured = await page.evaluate(() => window.__cinematicPlayer.lastMeasuredDwellMs);
  expect(measured).toBeGreaterThanOrEqual(1350);
  expect(measured).toBeLessThanOrEqual(1650);
});
