import { test, expect } from '@playwright/test';

async function openWithClock(page) {
  await page.addInitScript(() => {
    window.__audioClock = 0;
    window.__audioFrames = [];
    Object.defineProperty(performance, 'now', {
      configurable: true,
      value: () => window.__audioClock
    });
    window.requestAnimationFrame = (callback) => {
      window.__audioFrames.push(callback);
      return window.__audioFrames.length;
    };
    window.cancelAnimationFrame = () => {};
    HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#player')).toBeVisible();
  await expect(page.locator('#frame-image')).toBeVisible();
  await page.waitForTimeout(50);
}

async function runAudioFrames(page, now) {
  await page.evaluate((value) => {
    window.__audioClock = value;
    const callbacks = window.__audioFrames.splice(0);
    for (const callback of callbacks) callback(value);
  }, now);
}

test('clamps fade progress to the inclusive range before every volume write', async ({ page }) => {
  await openWithClock(page);
  await page.evaluate(() => {
    window.__audioFrames.length = 0;
  });
  const result = await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    const element = audio.frameElements.get('frame-03');
    let volume = element.volume;
    const writes = [];
    Object.defineProperty(element, 'volume', {
      configurable: true,
      get: () => volume,
      set: (value) => {
        writes.push(value);
        volume = value;
      }
    });
    audio.fadeIn(element, 0.5, 100);
    const run = (value) => {
      window.__audioClock = value;
      const callbacks = window.__audioFrames.splice(0);
      for (const callback of callbacks) callback(value);
    };
    run(-25);
    run(125);
    const fadeInWrites = writes.splice(0);
    volume = 0.5;
    window.__audioClock = 0;
    audio.fadeOut(element, 100);
    run(-25);
    run(125);
    return { fadeInWrites, fadeOutWrites: writes };
  });
  expect(result.fadeInWrites[0]).toBe(0);
  expect(result.fadeInWrites.at(-1)).toBeCloseTo(0.5, 5);
  expect(result.fadeOutWrites[0]).toBeCloseTo(0.5, 5);
  expect(result.fadeOutWrites.at(-1)).toBe(0);
});

test('stops within 100ms, resumes the same time, and reaches target by 300ms', async ({ page }) => {
  await openWithClock(page);
  await page.evaluate(() => {
    window.__audioFrames.length = 0;
  });
  await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    const scene = audio.sceneElements.get(0);
    let currentTime = 4.25;
    Object.defineProperty(scene, 'currentTime', {
      configurable: true,
      get: () => currentTime,
      set: (value) => { currentTime = value; }
    });
    audio.setPaused(true);
  });
  await runAudioFrames(page, 0);
  await runAudioFrames(page, 90);
  const stopped = await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    const scene = audio.sceneElements.get(0);
    return { paused: scene.paused, currentTime: scene.currentTime, volume: scene.volume };
  });
  expect(stopped.paused).toBeTruthy();
  expect(stopped.currentTime).toBeCloseTo(4.25, 3);
  expect(stopped.volume).toBe(0);
  await page.evaluate(() => {
    window.__audioClock = 0;
    window.__cinematicPlayer.audio.setPaused(false);
  });
  await page.evaluate(() => new Promise((resolve) => queueMicrotask(resolve)));
  await runAudioFrames(page, 90);
  const beforeFade = await page.evaluate(() => window.__cinematicPlayer.audio.sceneElements.get(0).volume);
  await runAudioFrames(page, 390);
  const resumed = await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    const scene = audio.sceneElements.get(0);
    return { currentTime: scene.currentTime, volume: scene.volume, managerPaused: audio.paused };
  });
  expect(beforeFade).toBeLessThan(resumed.volume);
  expect(resumed.currentTime).toBeCloseTo(4.25, 3);
  expect(resumed.volume).toBeCloseTo(audioTarget(0.6, 0.6), 3);
  expect(resumed.managerPaused).toBeFalsy();

  function audioTarget(userVolume, trackVolume) {
    return userVolume * trackVolume;
  }
});

test('uses a bounded scene crossfade and preserves silence for a missing scene track', async ({ page }) => {
  await openWithClock(page);
  await page.evaluate(() => {
    window.__audioFrames.length = 0;
    const audio = window.__cinematicPlayer.audio;
    const nextScene = audio.sceneElements.get(1);
    audio.sceneElements.delete(1);
    audio.setScene(1);
    audio.sceneElements.set(1, nextScene);
  });
  await runAudioFrames(page, 0);
  await runAudioFrames(page, 300);
  const during = await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    const previous = audio.sceneElements.get(0);
    return { previousVolume: previous.volume, previousPaused: previous.paused };
  });
  await runAudioFrames(page, 500);
  const after = await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    const previous = audio.sceneElements.get(0);
    return { previousVolume: previous.volume, previousPaused: previous.paused, state: audio.state() };
  });
  expect(during.previousVolume).toBeGreaterThanOrEqual(0);
  expect(during.previousVolume).toBeLessThan(0.36);
  expect(after.previousVolume).toBe(0);
  expect(after.previousPaused).toBeTruthy();
  expect(after.state).not.toBe('blocked');
});
