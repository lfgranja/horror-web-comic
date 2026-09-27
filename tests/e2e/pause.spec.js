import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test('pauses both progression and audio state without restarting the scene', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
  });
  await openPlayer(page);
  await page.locator('#play-toggle').click();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'paused');
  await page.locator('#play-toggle').click();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'on');
});

test('pauses within 100ms and preserves the scene position', async ({ page }) => {
  await page.addInitScript(() => {
    window.__pauseTimes = [];
    const originalPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function pause() {
      window.__pauseTimes.push(performance.now());
      return originalPause.call(this);
    };
  });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  const initialFrame = await page.locator('#player').getAttribute('data-frame-id');
  await page.evaluate(() => window.__cinematicPlayer.resume());
  await page.waitForTimeout(1_100);
  const result = await page.evaluate(() => {
    const player = window.__cinematicPlayer;
    const scene = player.audio.sceneElements.get(0);
    scene.currentTime = Math.min(0.04, Math.max(0, scene.duration - 0.001));
    const before = scene.currentTime;
    const started = performance.now();
    player.pause();
    return {
      before,
      after: scene.currentTime,
      elapsed: performance.now() - started,
      pauseTimes: window.__pauseTimes
    };
  });
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
  expect(result.pauseTimes.length).toBeGreaterThan(0);
  expect(result.elapsed).toBeLessThanOrEqual(100);
  expect(Math.abs(result.after - result.before)).toBeLessThanOrEqual(0.03);
  await page.waitForTimeout(250);
  const pausedPosition = await page.evaluate(() => window.__cinematicPlayer.audio.sceneElements.get(0).currentTime);
  expect(Math.abs(pausedPosition - result.before)).toBeLessThanOrEqual(0.03);
  await page.evaluate(() => window.__cinematicPlayer.resume());
  await expect.poll(() => page.evaluate(() => window.__cinematicPlayer.audio.sceneElements.get(0).currentTime)).toBeGreaterThan(pausedPosition + 0.005);
  await page.waitForTimeout(700);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', initialFrame);
});
