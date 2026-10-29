import { test, expect } from '@playwright/test';

test('activates blocked audio from a click gesture', async ({ page }) => {
  await page.addInitScript(() => {
    let attempts = 0;
    HTMLMediaElement.prototype.play = function play() {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      return Promise.resolve();
    };
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#blocked-overlay')).toBeVisible();
  await page.locator('#player').dispatchEvent('click');
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'on');
});

test('unlocks precreated elements without leaving non-current tracks playing', async ({ page }) => {
  await page.addInitScript(() => {
    window.__audioGesture = { played: [], paused: [] };
    HTMLMediaElement.prototype.play = function play() {
      window.__audioGesture.played.push(this.dataset.trackKey || this.src);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function pause() {
      window.__audioGesture.paused.push(this.dataset.trackKey || this.src);
    };
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.__audioGesture.played.length = 0;
    window.__audioGesture.paused.length = 0;
    const audio = window.__cinematicPlayer.audio;
    audio.awaitingUnlock = true;
    audio.sessionBlocked = true;
    document.querySelector('#player').dispatchEvent(new Event('pointerup'));
  });
  await page.waitForTimeout(150);
  const result = await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    const currentScene = audio.currentSceneIndex;
    const currentFrame = audio.currentFrameId;
    const sceneKeys = Array.from(audio.sceneElements.values()).map((element) => element.dataset.trackKey);
    const frameKeys = Array.from(audio.frameElements.values()).map((element) => element.dataset.trackKey);
    const nonCurrent = [
      ...sceneKeys.filter((key) => Number(key.replace('scene-', '')) !== currentScene),
      ...frameKeys.filter((key) => key !== `frame-${currentFrame}`)
    ];
    return {
      played: window.__audioGesture.played,
      paused: window.__audioGesture.paused,
      nonCurrent
    };
  });
  expect(result.played.length).toBeGreaterThan(0);
  expect(result.paused).toEqual(expect.arrayContaining(result.nonCurrent));
});

test('focuses the blocked dialog on the silent action and accepts a document-level key', async ({ page }) => {
  await page.addInitScript(() => {
    let attempts = 0;
    HTMLMediaElement.prototype.play = function play() {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      return Promise.resolve();
    };
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#blocked-overlay')).toBeVisible();
  await expect(page.locator('#continue-silent')).toBeFocused();
  await page.locator('html').dispatchEvent('keydown', { key: 'Escape' });
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'blocked');
  await page.locator('html').dispatchEvent('keydown', { key: 'Enter' });
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'on');
});
