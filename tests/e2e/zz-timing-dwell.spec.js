import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

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

// Dwell = max(250, durationMs / speed), measured with the player's own
// lastMeasuredDwellMs (dwellStartedAt -> advance), which excludes image-load
// time. settleAt guarantees playback starts from frame-01 paused.
async function measureDwellFromFrame01(page, { durationMs, speed }) {
  await settleAt(page, 'frame-01');
  await page.evaluate((ms) => {
    globalThis.__cinematicPlayer.frames[0].frame.durationMs = ms;
  }, durationMs);
  await page.locator('#speed').selectOption(speed);
  await page.evaluate(() => globalThis.__cinematicPlayer.resume());
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  return page.evaluate(() => globalThis.__cinematicPlayer.lastMeasuredDwellMs);
}

test('dwell scales with speed within ten percent', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  // 800 ms authored: 0.5x -> 1600, 1x -> 800, 2x -> 400 (all above the floor).
  for (const [speed, expected] of [['0.5', 1600], ['1', 800], ['2', 400]]) {
    const measured = await measureDwellFromFrame01(page, { durationMs: 800, speed });
    expect(measured, `800ms at ${speed}x`).toBeGreaterThanOrEqual(expected * 0.9);
    expect(measured, `800ms at ${speed}x`).toBeLessThanOrEqual(expected * 1.1);
  }
});

test('dwell floor of 250 ms applies whenever duration divided by speed is smaller', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  // 500 ms at 2x -> 250 exactly; 300 ms at 2x -> 150 floored to 250.
  for (const durationMs of [500, 300]) {
    const measured = await measureDwellFromFrame01(page, { durationMs, speed: '2' });
    expect(measured, `floor for ${durationMs}ms at 2x`).toBeGreaterThanOrEqual(225);
    expect(measured, `floor for ${durationMs}ms at 2x`).toBeLessThanOrEqual(275);
  }
});
