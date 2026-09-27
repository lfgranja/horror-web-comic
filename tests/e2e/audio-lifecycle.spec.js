import { test, expect } from '@playwright/test';

async function openWithDeferredAudio(page) {
  await page.addInitScript(() => {
    window.__deferredAudio = [];
    HTMLMediaElement.prototype.play = function play() {
      return new Promise((resolve) => {
        window.__deferredAudio.push({ element: this, key: this.dataset.trackKey, resolve });
      });
    };
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#player')).toBeVisible();
  await expect(page.locator('#frame-image')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__deferredAudio.length)).toBeGreaterThan(0);
}

test('mute invalidates a pending scene play before its await resumes', async ({ page }) => {
  await openWithDeferredAudio(page);
  await page.evaluate(() => window.__cinematicPlayer.audio.toggle());
  await page.evaluate(() => {
    for (const pending of window.__deferredAudio) pending.resolve();
  });
  await page.waitForTimeout(350);
  const result = await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    const scene = audio.sceneElements.get(0);
    return { enabled: audio.enabled, volume: scene.volume, paused: scene.paused, state: audio.state() };
  });
  expect(result.enabled).toBeFalsy();
  expect(result.state).toBe('off');
  expect(result.paused).toBeTruthy();
  expect(result.volume).toBe(0);
});

test('pause and navigation invalidate pending scene and frame starts', async ({ page }) => {
  await openWithDeferredAudio(page);
  await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    audio.setScene(1);
    // Pause through the player: that is the FR-013 contract, and it also
    // disarms the pending auto-start so nothing re-enables audio afterwards.
    window.__cinematicPlayer.pause();
  });
  await page.evaluate(() => {
    for (const pending of window.__deferredAudio) pending.resolve();
  });
  await page.waitForTimeout(350);
  const result = await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    return {
      paused: audio.paused,
      scenes: [...audio.sceneElements.values()].map((element) => ({ volume: element.volume, paused: element.paused })),
      frames: [...audio.frameElements.values()].map((element) => ({ volume: element.volume, paused: element.paused }))
    };
  });
  expect(result.paused).toBeTruthy();
  expect(result.scenes.every((element) => element.paused)).toBeTruthy();
  expect(result.frames.every((element) => element.paused)).toBeTruthy();
  expect(result.scenes.every((element) => element.volume === 0)).toBeTruthy();
  expect(result.frames.every((element) => element.volume === 0)).toBeTruthy();
});

test('teardown invalidates pending starts and prevents later volume writes', async ({ page }) => {
  await openWithDeferredAudio(page);
  // Capture the volume as it stands with a start still pending. T199 means that
  // value is the non-zero autoplay probe volume, not 0: asserting against a
  // literal 0 would only have passed by coincidence, and would have said nothing
  // about whether a write happened AFTER teardown. What matters is that the
  // deferred play resolving later leaves the value untouched.
  const before = await page.evaluate(() => window.__cinematicPlayer.audio.sceneElements.get(0).volume);
  await page.evaluate(() => window.__cinematicPlayer.audio.destroy());
  await page.evaluate(() => {
    for (const pending of window.__deferredAudio) pending.resolve();
  });
  await page.waitForTimeout(350);
  const result = await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    const scene = audio.sceneElements.get(0);
    return { destroyed: audio.destroyed, volume: scene.volume, paused: scene.paused };
  });
  expect(result.destroyed).toBeTruthy();
  expect(result.paused).toBeTruthy();
  expect(result.volume, 'no volume write may land after teardown').toBe(before);
});

test('does not duplicate the current scene start through repeated initialization', async ({ page }) => {
  await page.addInitScript(() => {
    window.__audioPlayCalls = [];
    HTMLMediaElement.prototype.play = function play() {
      window.__audioPlayCalls.push(this.dataset.trackKey);
      return Promise.resolve();
    };
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#player')).toBeVisible();
  await page.waitForTimeout(350);
  const result = await page.evaluate(async () => {
    const audio = window.__cinematicPlayer.audio;
    window.__audioPlayCalls.length = 0;
    await Promise.all([audio.start(), audio.start()]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    return window.__audioPlayCalls.filter((key) => key === 'scene-0').length;
  });
  expect(result).toBeLessThanOrEqual(1);
});
