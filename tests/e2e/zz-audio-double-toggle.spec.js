import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

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
 * Pin the current frame's dwell long enough that automatic advance cannot
 * change scene mid-assertion. Without this the element captured at the start of
 * an evaluate can be the outgoing one by the time the waits finish, and the
 * assertion then measures a scene the player has legitimately left.
 */
async function freezeAdvance(page) {
  await page.evaluate(() => {
    const player = globalThis.__cinematicPlayer;
    for (const item of player.frames) item.frame.durationMs = 600000;
  });
}

test.describe('T198 — re-enable inside the stop ramp', () => {
  test('a toggle-off/on pair faster than STOP_DURATION still yields audible scene audio', async ({ page }) => {
    await openPlayer(page, STORY, { pause: false });
    // let the scene actually start
    await expect.poll(async () => (await readSceneAudio(page))?.volume ?? 0).toBeGreaterThan(0);
    await freezeAdvance(page);

    // Two clicks well inside the 90 ms ramp. Playwright cannot click faster than
    // this, so the in-page path is used to guarantee sub-ramp timing.
    const result = await page.evaluate(async () => {
      const player = globalThis.__cinematicPlayer;
      const audio = player.audio;
      const element = audio.sceneElements.get(audio.currentSceneIndex);
      audio.toggle();
      await new Promise((resolve) => setTimeout(resolve, 30));
      audio.toggle();
      await new Promise((resolve) => setTimeout(resolve, 400));
      const live = audio.sceneElements.get(audio.currentSceneIndex);
      return { paused: live.paused, volume: live.volume, enabled: audio.enabled };
    });

    expect(result.enabled, 'audio must be re-enabled').toBe(true);
    expect(result.paused, 'the scene element must be PLAYING, not paused at a non-zero volume').toBe(false);
    expect(result.volume, 'the scene element must be audible, not merely >= 0').toBeGreaterThan(0);
  });

  test('an element mid fade-out is not reported as playing', async ({ page }) => {
    await openPlayer(page, STORY, { pause: false });
    await expect.poll(async () => (await readSceneAudio(page))?.volume ?? 0).toBeGreaterThan(0);

    const reported = await page.evaluate(async () => {
      const audio = globalThis.__cinematicPlayer.audio;
      const element = audio.sceneElements.get(audio.currentSceneIndex);
      audio.stopAll(90, audio.lifecycleGeneration);
      // Sample inside the ramp: fade-out has begun but has not paused yet.
      await new Promise((resolve) => setTimeout(resolve, 20));
      const midRamp = {
        stillUnpaused: !element.paused,
        direction: element.dataset.fadeDirection,
        isPlaying: audio.isElementPlaying(element),
      };
      await new Promise((resolve) => setTimeout(resolve, 200));
      return midRamp;
    });

    expect(reported.stillUnpaused, 'the element is still unpaused mid-ramp — that is what caused the bug').toBe(true);
    expect(reported.direction).toBe('out');
    expect(reported.isPlaying, 'a fading-out element must not count as playing').toBe(false);
  });

  test('M pressed twice in quick succession keeps the scene audible', async ({ page }) => {
    await openPlayer(page, STORY, { pause: false });
    await expect.poll(async () => (await readSceneAudio(page))?.volume ?? 0).toBeGreaterThan(0);

    const result = await page.evaluate(async () => {
      const player = globalThis.__cinematicPlayer;
      const audio = player.audio;
      const element = audio.sceneElements.get(audio.currentSceneIndex);
      const key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      key('m');
      await new Promise((resolve) => setTimeout(resolve, 30));
      key('m');
      await new Promise((resolve) => setTimeout(resolve, 400));
      // read the element that is live NOW, not the one captured before the waits
      const live = audio.sceneElements.get(audio.currentSceneIndex);
      return { paused: live.paused, volume: live.volume, enabled: audio.enabled };
    });

    expect(result.enabled).toBe(true);
    expect(result.paused).toBe(false);
    expect(result.volume).toBeGreaterThan(0);
  });
});
