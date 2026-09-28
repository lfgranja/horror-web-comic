import { test, expect } from '@playwright/test';
import { openPlayer, freezeAdvance } from './helpers.js';

/**
 * TEMPORARY CI DIAGNOSTIC — delete after reading the result.
 *
 * Replicates pause.spec.js:17 exactly and reports WHY the scene element fails to
 * resume. It cannot be reproduced on the local host, whose Playwright engines
 * appear more permissive than the CI runners, so this runs in CI on purpose.
 */
const STORY = 'tests/fixtures/story.json';

test('diagnostic: why does the scene element not resume', async ({ page, browserName }) => {
  await page.addInitScript(() => {
    window.__playLog = [];
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function patched(...args) {
      const entry = { key: this.dataset?.trackKey ?? null, volumeBefore: this.volume, readyState: this.readyState };
      let result;
      try {
        result = original.apply(this, args);
      } catch (error) {
        entry.outcome = 'threw';
        entry.errorName = error?.name ?? String(error);
        window.__playLog.push(entry);
        throw error;
      }
      return Promise.resolve(result).then(
        (v) => { entry.outcome = 'resolved'; entry.pausedAfter = this.paused; window.__playLog.push(entry); return v; },
        (e) => { entry.outcome = 'rejected'; entry.errorName = e?.name ?? String(e); window.__playLog.push(entry); throw e; }
      );
    };
  });

  await openPlayer(page, STORY, { pause: true });
  await freezeAdvance(page);
  const initialFrame = await page.locator('#player').getAttribute('data-frame-id');

  const beforeResume = await page.evaluate(() => {
    const p = globalThis.__cinematicPlayer;
    const a = p.audio;
    return {
      audioState: document.querySelector('#player')?.dataset?.audioState ?? null,
      enabled: a.enabled, paused: a.paused, hasStarted: a.hasStarted,
      awaitingUnlock: a.awaitingUnlock, sessionBlocked: a.sessionBlocked,
      silentContinuation: a.silentContinuation,
      currentSceneIndex: a.currentSceneIndex, currentFrameId: a.currentFrameId,
      failedTracks: [...a.failed],
      blockedOverlayHidden: document.querySelector('#blocked-overlay')?.hidden ?? null,
      scenePaused: a.sceneElements.get(0)?.paused ?? null,
      sceneVolume: a.sceneElements.get(0)?.volume ?? null
    };
  });

  await page.evaluate(() => globalThis.__cinematicPlayer.resume());
  await page.waitForTimeout(1100);

  const paused = await page.evaluate(() => {
    const p = globalThis.__cinematicPlayer;
    const a = p.audio;
    const scene = a.sceneElements.get(0);
    const before = scene.currentTime;
    scene.currentTime = Math.min(0.04, Math.max(0, scene.duration - 0.001));
    const t0 = performance.now();
    p.pause();
    return { before, after: scene.currentTime, elapsed: performance.now() - t0 };
  });

  await page.waitForTimeout(250);
  const pausedPosition = await page.evaluate(() => globalThis.__cinematicPlayer.audio.sceneElements.get(0).currentTime);
  await page.evaluate(() => globalThis.__cinematicPlayer.resume());

  const samples = [];
  for (let i = 0; i < 12; i += 1) {
    await page.waitForTimeout(250);
    samples.push(await page.evaluate(() => {
      const a = globalThis.__cinematicPlayer.audio;
      const s = a.sceneElements.get(a.currentSceneIndex);
      return { t: s?.currentTime ?? null, paused: s?.paused ?? null, vol: s?.volume ?? null, key: s?.dataset?.trackKey ?? null };
    }));
  }

  const afterResume = await page.evaluate(() => {
    const a = globalThis.__cinematicPlayer.audio;
    return {
      audioState: document.querySelector('#player')?.dataset?.audioState ?? null,
      enabled: a.enabled, paused: a.paused, hasStarted: a.hasStarted,
      awaitingUnlock: a.awaitingUnlock, sessionBlocked: a.sessionBlocked,
      silentContinuation: a.silentContinuation,
      currentSceneIndex: a.currentSceneIndex, currentFrameId: a.currentFrameId,
      failedTracks: [...a.failed],
      blockedOverlayHidden: document.querySelector('#blocked-overlay')?.hidden ?? null,
      scene0Paused: a.sceneElements.get(0)?.paused ?? null,
      scene0Volume: a.sceneElements.get(0)?.volume ?? null,
      scene0ReadyState: a.sceneElements.get(0)?.readyState ?? null
    };
  });

  const playLog = await page.evaluate(() => window.__playLog);
  const advanced = samples.some((s) => typeof s.t === 'number' && s.t > pausedPosition + 0.005);

  console.log(`\n##### DIAG ${browserName} initialFrame=${initialFrame} advanced=${advanced} #####`);
  console.log(JSON.stringify({ beforeResume, paused, pausedPosition, afterResume, samples, playLog }, null, 2));
  console.log(`##### END ${browserName} #####\n`);

  expect(true).toBe(true);
});
