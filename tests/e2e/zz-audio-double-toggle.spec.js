import { test, expect } from '@playwright/test';
import { openPlayer, freezeAdvance } from './helpers.js';

const STORY = 'tests/fixtures/story.json';

/**
 * T198 — re-enabling audio inside the 90 ms stop ramp used to leave a paused
 * element at non-zero volume with nothing left to restart it, so the scene
 * stayed silent until the next scene boundary, pause/resume or reload.
 *
 * The defect lived in `isElementPlaying()` reporting an element that is mid
 * fade-out as "playing" (fade-out only pauses at the END of the ramp), which
 * made `playCurrentScene()` take its early return: markPlaying + applyMix, with
 * no `play()` and no `fadeIn()`.
 *
 * Reachable with a double-tap on the toggle or two fast `M` presses — so the
 * tests below toggle faster than STOP_DURATION (90 ms).
 */

async function readSceneAudio(page) {
  return page.evaluate(() => {
    const audio = globalThis.__cinematicPlayer?.audio;
    const element = audio?.sceneElements?.get(audio.currentSceneIndex);
    if (!element) return null;
    return { paused: element.paused, volume: element.volume, ended: element.ended, currentTime: element.currentTime };
  });
}

/**
 * `freezeAdvance` now lives in helpers.js: pinning the frame dwell is needed by
 * every test that captures a media element, waits, then asserts on it, so it is
 * shared rather than re-declared per spec.
 */

test.describe('T198 — re-enable inside the stop ramp', () => {
  test.describe.configure({ mode: 'serial' });

  test('a toggle-off/on pair faster than STOP_DURATION still yields audible scene audio', async ({ page }) => {
    await openPlayer(page, STORY, { pause: false });
    // let the scene actually start
    await expect.poll(async () => (await readSceneAudio(page))?.volume ?? 0).toBeGreaterThan(0);
    await freezeAdvance(page);

    // Two clicks well inside the 90 ms ramp. Playwright cannot click faster than
    // this, so the in-page path is used to guarantee sub-ramp timing.
    await page.evaluate(async () => {
      const player = globalThis.__cinematicPlayer;
      const audio = player.audio;
      audio.toggle();
      await new Promise((resolve) => setTimeout(resolve, 30));
      audio.toggle();
    });

    await expect.poll(async () => {
      const live = await readSceneAudio(page);
      const enabled = await page.evaluate(() => globalThis.__cinematicPlayer.audio.enabled);
      return { paused: live?.paused, audible: (live?.volume ?? 0) > 0, enabled };
    }).toEqual({
      paused: false,
      audible: true,
      enabled: true,
    });
  });

  test('an element mid fade-out is not reported as playing', async ({ page }) => {
    await openPlayer(page, STORY, { pause: false });
    await freezeAdvance(page);

    // Ensure audio is actively playing before testing mid-ramp fade behavior
    await page.evaluate(async () => {
      const audio = globalThis.__cinematicPlayer.audio;
      if (!audio.enabled) audio.toggle();
      const element = audio.sceneElements.get(audio.currentSceneIndex);
      if (element && element.paused) {
        await element.play().catch(() => {});
      }
    });
    await expect.poll(async () => {
      const a = await readSceneAudio(page);
      return a && !a.paused;
    }, { message: 'scene audio playing before fade test' }).toBe(true);

    const reported = await page.evaluate(async () => {
      const audio = globalThis.__cinematicPlayer.audio;
      const element = audio.sceneElements.get(audio.currentSceneIndex);
      audio.stopAll(300, audio.lifecycleGeneration);
      // Sample inside the ramp: fade-out has begun but has not paused yet.
      await new Promise((resolve) => setTimeout(resolve, 30));
      const midRamp = {
        stillUnpaused: !element.paused,
        direction: element.dataset.fadeDirection,
        isPlaying: audio.isElementPlaying(element),
      };
      await new Promise((resolve) => setTimeout(resolve, 350));
      return midRamp;
    });

    expect(reported.stillUnpaused, 'the element is still unpaused mid-ramp — that is what caused the bug').toBe(true);
    expect(reported.direction).toBe('out');
    expect(reported.isPlaying, 'a fading-out element must not count as playing').toBe(false);
  });

  test('M pressed twice in quick succession keeps the scene audible', async ({ page }) => {
    await openPlayer(page, STORY, { pause: false });
    await expect.poll(async () => (await readSceneAudio(page))?.volume ?? 0).toBeGreaterThan(0);
    await freezeAdvance(page);

    await page.evaluate(async () => {
      const key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      key('m');
      await new Promise((resolve) => setTimeout(resolve, 30));
      key('m');
    });

    // Let the stop ramp settle before asserting, so the outcome is stable
    // under CI load.
    await page.waitForTimeout(120);

    await expect.poll(async () => {
      const live = await readSceneAudio(page);
      const enabled = await page.evaluate(() => globalThis.__cinematicPlayer.audio.enabled);
      return { paused: live?.paused, audible: (live?.volume ?? 0) > 0, enabled };
    }).toEqual({
      paused: false,
      audible: true,
      enabled: true,
    });
  });
});
