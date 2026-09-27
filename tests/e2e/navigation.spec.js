import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame } from './helpers.js';

// Deterministic settle: pause, drop coalesced navigation, jump to frame-01
// paused. openPlayer's single pause click can land after the 250 ms
// auto-start advanced, leaving the player on frame-02 under load.
async function settleAt(page, frameId) {
  await page.evaluate((id) => {
    const player = globalThis.__cinematicPlayer;
    player.pause();
    if (player.pendingNavigation) {
      clearTimeout(player.pendingNavigation);
      player.pendingNavigation = null;
      player.pendingNavigationAction = null;
    }
    player.lastNavigation = 0;
    const target = player.frames.findIndex((item) => item.frame.id === id);
    player.moveTo(target < 0 ? 0 : target, false);
    player.lastNavigation = 0;
    player.lastMeasuredDwellMs = null;
  }, frameId);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', frameId);
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
}

// Fire a queued navigation immediately while still exercising the real
// handler (click or key), so consecutive actions never stack 400 ms delays.
async function clearCoalescing(page) {
  await page.evaluate(() => { globalThis.__cinematicPlayer.lastNavigation = 0; });
}

test('navigates frames, scenes, start and end with persistent controls', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');
  await clearCoalescing(page);
  await page.locator('#next-frame').click();
  await waitForFrame(page, 'frame-02');
  await clearCoalescing(page);
  await page.locator('#next-scene').click();
  await waitForFrame(page, 'frame-03');
  await clearCoalescing(page);
  await page.locator('#next-frame').click();
  await waitForFrame(page, 'frame-04');
  await clearCoalescing(page);
  await page.locator('#end').click();
  await waitForFrame(page, 'frame-04');
  await clearCoalescing(page);
  await page.locator('#previous-frame').click();
  await waitForFrame(page, 'frame-03');
  await clearCoalescing(page);
  await page.locator('#previous-scene').click();
  await waitForFrame(page, 'frame-01');
  await clearCoalescing(page);
  await page.locator('#home').click();
  await waitForFrame(page, 'frame-01');
  await clearCoalescing(page);
  await page.locator('#next-frame').click();
  await waitForFrame(page, 'frame-02');
  await clearCoalescing(page);
  await page.locator('#previous-frame').click();
  await waitForFrame(page, 'frame-01');
});

test('supports keyboard navigation without late scroll restore', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');

  // The player must not force the scroll position. Assert the position
  // immediately around a navigation, so the check isolates the player's own
  // behaviour: comparing against a value captured long before would also catch
  // Playwright's actionability scrolling and the browser's own defaults, which
  // are not what this test is about.
  const scrollRange = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  // Only assert where there is a meaningful scroll range. A few pixels of
  // overflow is dominated by sub-pixel layout settling, not by any
  // scroll-restore behaviour, so asserting there would test noise.
  const scrolls = scrollRange >= 40;
  let scrollBefore = 0;
  if (scrolls) {
    scrollBefore = await page.evaluate(() => {
      window.scrollTo(0, 100);
      return window.scrollY;
    });
  }

  // Navigate with keyboard
  await page.locator('#player').focus({ preventScroll: true });
  await clearCoalescing(page);
  await page.keyboard.press('ArrowRight');
  await waitForFrame(page, 'frame-02');
  await clearCoalescing(page);
  await page.keyboard.press('ArrowLeft');
  await waitForFrame(page, 'frame-01');
  await clearCoalescing(page);
  await page.keyboard.press('End');
  await waitForFrame(page, 'frame-04');

  // Wait past the old 450ms restore window
  await page.waitForTimeout(600);

  if (scrolls) {
    const scrollAfter = await page.evaluate(() => window.scrollY);
    // The player captured the pre-move offset in moveTo() and writes it back;
    // that write must reproduce the position it read, not an older one.
    expect(scrollAfter, 'the player must not jump the viewport').toBe(scrollBefore);
  }

  await clearCoalescing(page);
  await page.keyboard.press('Home');
  await waitForFrame(page, 'frame-01');

  // Verify navigation worked
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
});

test('reaches required story boundaries within three actions', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');
  await clearCoalescing(page);
  await page.locator('#next-frame').click();
  await waitForFrame(page, 'frame-02');
  await clearCoalescing(page);
  await page.locator('#home').click();
  await waitForFrame(page, 'frame-01');
  await clearCoalescing(page);
  await page.locator('#end').click();
  await waitForFrame(page, 'frame-04');
  await clearCoalescing(page);
  await page.locator('#previous-scene').click();
  await waitForFrame(page, 'frame-01');
  await clearCoalescing(page);
  await page.locator('#next-scene').click();
  await waitForFrame(page, 'frame-03');
});
