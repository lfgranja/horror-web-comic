import { test, expect } from '@playwright/test';

test('tracks actual frame playback rather than frame selection for scene ducking', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#player')).toBeVisible();
  await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    audio.setPaused(false);
    audio.setScene(1);
    audio.setFrame('frame-03');
  });
  await page.waitForTimeout(350);
  const result = await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    const scene = audio.sceneElements.get(1);
    const frame = audio.frameElements.get('frame-03');
    const base = audio.volume * 0.6;
    const values = {};
    frame.dispatchEvent(new Event('playing'));
    values.selectedBeforeEvent = scene.volume;
    frame.dispatchEvent(new Event('pause'));
    values.pause = scene.volume;
    frame.dispatchEvent(new Event('playing'));
    values.playing = scene.volume;
    frame.dispatchEvent(new Event('ended'));
    values.ended = scene.volume;
    frame.dispatchEvent(new Event('error'));
    values.error = scene.volume;
    frame.dispatchEvent(new Event('stalled'));
    values.stalled = scene.volume;
    return { base, values };
  });
  expect(result.values.selectedBeforeEvent).toBeLessThan(result.base);
  expect(result.values.pause).toBeCloseTo(result.base, 3);
  expect(result.values.playing).toBeCloseTo(result.base * 0.4, 3);
  expect(result.values.ended).toBeCloseTo(result.base, 3);
  expect(result.values.error).toBeCloseTo(result.base, 3);
  expect(result.values.stalled).toBeCloseTo(result.base, 3);
});

test('a frame that is selected but not playing leaves the scene at full gain', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#player')).toBeVisible();
  const result = await page.evaluate(async () => {
    const audio = window.__cinematicPlayer.audio;
    audio.setPaused(false);
    audio.setScene(1);
    audio.setFrame('frame-03');
    await new Promise((resolve) => setTimeout(resolve, 20));
    const frame = audio.frameElements.get('frame-03');
    const scene = audio.sceneElements.get(1);
    frame.pause();
    frame.dispatchEvent(new Event('pause'));
    return { volume: scene.volume, base: audio.volume * 0.6, playing: !frame.paused };
  });
  expect(result.playing).toBeFalsy();
  expect(result.volume).toBeCloseTo(result.base, 3);
});
