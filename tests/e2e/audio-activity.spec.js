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

/**
 * T145 — the frame-audio MIX leg was the one of the eight deterministic
 * audio-timing requirements with no assertion anywhere in the suite. Every
 * other leg (≤100 ms stop, ≤300 ms re-enable fade, preserved currentTime,
 * ≤500 ms crossfade or silence, scene ducking, blocked activation, exact
 * pause/resume) is covered elsewhere; this closes the gap.
 *
 * FR-006 / US2/AC3: when a frame declares its own audio it must SUM to the
 * scene — the frame element reaching its own target gain WHILE the scene is
 * ducked to 40%. The suite previously collected a frame volume and never
 * asserted on it.
 *
 * These two drive playback deterministically instead of relying on real
 * autoplay. Headless engines differ on whether an un-gestured play() is
 * granted, and a test that sometimes passes because the browser allowed audio
 * is not a test. The AudioManager decides the mix from `getActiveFrameElement()`,
 * which keys off `activeFrameKeys` and the media `playing` event — so the frame
 * is registered the way a real play() would register it, and the gains are read
 * back off the live elements. The two pre-existing tests in this file use the
 * same technique for the ducking direction.
 */
test('a playing frame track reaches its own gain while the scene ducks to 40%', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
  });
  await page.goto('/?story=tests%2Ffixtures/story.json');
  await expect(page.locator('#player')).toBeVisible();

  const result = await page.evaluate(async () => {
    const audio = window.__cinematicPlayer.audio;
    audio.setPaused(false);
    audio.setScene(1);
    audio.setFrame('frame-03');
    // Past the 300 ms frame crossfade.
    await new Promise((resolve) => setTimeout(resolve, 700));
    const scene = audio.sceneElements.get(1);
    const frame = audio.frameElements.get('frame-03');
    // Register the frame as actually playing, then let applyMix recompute.
    frame.dispatchEvent(new Event('playing'));
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      sceneVolume: scene.volume,
      frameVolume: frame.volume,
      frameIsActive: audio.getActiveFrameElement() === frame,
      // audio.volume is the 0.6 user multiplier; the manifest gives the scene
      // 0.6 and frame-03 0.8. These are already-scaled targets — applying
      // audio.volume to them again would double-count the multiplier.
      sceneTarget: audio.volume * 0.6,
      frameTarget: audio.volume * 0.8
    };
  });

  expect(result.frameIsActive, 'the frame track must register as active for the mix to exist').toBe(true);
  expect(
    result.frameVolume,
    `frame track must reach its own target ${result.frameTarget.toFixed(4)}, got ${result.frameVolume}`
  ).toBeCloseTo(result.frameTarget, 2);
  expect(
    result.sceneVolume,
    `scene must be ducked to 40% while the frame plays (${(result.sceneTarget * 0.4).toFixed(4)}), got ${result.sceneVolume}`
  ).toBeCloseTo(result.sceneTarget * 0.4, 2);
});

test('the frame mix is released and the scene returns to full gain when the frame stops', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
  });
  await page.goto('/?story=tests%2Ffixtures/story.json');
  await expect(page.locator('#player')).toBeVisible();

  const result = await page.evaluate(async () => {
    const audio = window.__cinematicPlayer.audio;
    audio.setPaused(false);
    audio.setScene(1);
    audio.setFrame('frame-03');
    await new Promise((resolve) => setTimeout(resolve, 700));
    const scene = audio.sceneElements.get(1);
    const frame = audio.frameElements.get('frame-03');
    const sceneTarget = audio.volume * 0.6;
    frame.dispatchEvent(new Event('playing'));
    await new Promise((resolve) => setTimeout(resolve, 400));
    const ducked = scene.volume;
    frame.dispatchEvent(new Event('pause'));
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { ducked, restored: scene.volume, sceneTarget, frameStillActive: audio.getActiveFrameElement() !== null };
  });

  expect(result.ducked, 'the scene was ducked while the frame played').toBeLessThan(result.sceneTarget);
  expect(result.frameStillActive, 'the frame is no longer active once it stops').toBe(false);
  expect(result.restored, 'scene gain must be restored once the frame stops').toBeCloseTo(result.sceneTarget, 2);
});
