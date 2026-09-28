import { test, expect } from '@playwright/test';
import { openPlayer, freezeAdvance } from './helpers.js';

/**
 * TEMPORARY CI DIAGNOSTIC — delete after reading the result.
 *
 * Prior round established: after resume, webkit/firefox keep currentTime pinned
 * and scene-0 is already in AudioManager.failed, while play() only ever RESOLVED.
 * A play() rejection cannot therefore be the latch source.
 *
 * Reading the code, audio.js:102 registers an `error` listener on every media
 * element that calls handleMediaFailure -> failed.add (audio.js:707-709), a
 * second latch site that no play()-level probe can see. The leading hypothesis is
 * that the seek at pause.spec.js:33 fails: the test server is
 * `python3 -m http.server`, which does not implement HTTP Range, and seeking a
 * media element needs Range. Chromium tolerates non-seekable media; Firefox and
 * WebKit raise a media error.
 *
 * This records the element event timeline, MediaError details, and the seekable
 * ranges, so the error code identifies the cause directly.
 */
const STORY = 'tests/fixtures/story.json';

const EVENTS = [
  'loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
  'play', 'playing', 'pause', 'seeking', 'seeked', 'waiting', 'stalled',
  'suspend', 'abort', 'emptied', 'error', 'ratechange'
];

test('diagnostic: media element event timeline around the seek', async ({ page, browserName }) => {
  await openPlayer(page, STORY, { pause: true });
  await freezeAdvance(page);

  // Attach to the live scene element before the seek. Covers every plausible
  // source of a media error rather than guessing one.
  await page.evaluate((names) => {
    const a = globalThis.__cinematicPlayer.audio;
    const el = a.sceneElements.get(a.currentSceneIndex);
    window.__events = [];
    window.__errors = [];
    for (const name of names) {
      el.addEventListener(name, () => {
        window.__events.push({
          name,
          at: Math.round(performance.now()),
          readyState: el.readyState,
          networkState: el.networkState,
          paused: el.paused,
          currentTime: el.currentTime,
          duration: el.duration,
          error: el.error ? { code: el.error.code, message: el.error.message } : null
        });
      });
    }
    el.addEventListener('error', () => {
      window.__errors.push({
        at: Math.round(performance.now()),
        code: el.error?.code ?? null,
        message: el.error?.message ?? null,
        currentSrc: el.currentSrc,
        networkState: el.networkState,
        readyState: el.readyState
      });
    });
  }, EVENTS);

  const preSeek = await page.evaluate(() => {
    const a = globalThis.__cinematicPlayer.audio;
    const el = a.sceneElements.get(a.currentSceneIndex);
    const ranges = [];
    try { for (let i = 0; i < el.seekable.length; i += 1) ranges.push([el.seekable.start(i), el.seekable.end(i)]); } catch { /* not seekable */ }
    const buffered = [];
    try { for (let i = 0; i < el.buffered.length; i += 1) buffered.push([el.buffered.start(i), el.buffered.end(i)]); } catch { /* none */ }
    return {
      src: el.currentSrc, duration: el.duration, readyState: el.readyState,
      networkState: el.networkState, paused: el.paused, volume: el.volume,
      seekable: ranges, buffered, failed: [...a.failed]
    };
  });

  const seek = await page.evaluate(() => {
    const a = globalThis.__cinematicPlayer.audio;
    const el = a.sceneElements.get(a.currentSceneIndex);
    const before = el.currentTime;
    let threw = null;
    try { el.currentTime = Math.min(0.04, Math.max(0, el.duration - 0.001)); } catch (e) { threw = String(e?.name ?? e); }
    return { before, requested: Math.min(0.04, Math.max(0, el.duration - 0.001)), after: el.currentTime, threw };
  });

  await page.waitForTimeout(1200);
  const postSeek = await page.evaluate(() => {
    const a = globalThis.__cinematicPlayer.audio;
    const el = a.sceneElements.get(a.currentSceneIndex);
    return {
      readyState: el.readyState, networkState: el.networkState, paused: el.paused,
      currentTime: el.currentTime, volume: el.volume,
      error: el.error ? { code: el.error.code, message: el.error.message } : null,
      failed: [...a.failed]
    };
  });

  // Now the resume under test.
  await page.evaluate(() => globalThis.__cinematicPlayer.resume());
  await page.waitForTimeout(1500);
  const afterResume = await page.evaluate(() => {
    const a = globalThis.__cinematicPlayer.audio;
    const el = a.sceneElements.get(a.currentSceneIndex);
    return {
      readyState: el.readyState, paused: el.paused, currentTime: el.currentTime,
      volume: el.volume, failed: [...a.failed],
      enabled: a.enabled, awaitingUnlock: a.awaitingUnlock, silentContinuation: a.silentContinuation
    };
  });

  const events = await page.evaluate(() => window.__events);
  const errors = await page.evaluate(() => window.__errors);

  console.log(`\n##### TL ${browserName} #####`);
  console.log(JSON.stringify({ preSeek, seek, postSeek, afterResume, errors, events }, null, 2));
  console.log(`##### END ${browserName} #####\n`);

  expect(true).toBe(true);
});
