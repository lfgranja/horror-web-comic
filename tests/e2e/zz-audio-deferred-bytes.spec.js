import { test, expect } from '@playwright/test';

/**
 * `audio-preload-critical-path` — the critical path must not carry audio the
 * session cannot play.
 *
 * The original attempt to fix this narrowed `preload` and measured a no-op:
 * `metadata` and `auto` transferred the identical 346,452 B across three AAC
 * tracks, because assigning the source to `new Audio(...)` starts the fetch at
 * construction and `preload` only ever tunes a fetch that has already begun. A
 * request-count assertion cannot see that, so these tests read bytes:
 * `encodedBodySize` from the Resource Timing API.
 *
 * The production manifest is used on purpose. The fixtures ship two WAV tracks of
 * a different size, which would let the bound below pass or fail for a reason
 * that has nothing to do with the behaviour under test.
 */

const STORY = 'src/data/story.json';
const AUDIO_PATTERN = '/assets/audio/';
/** One scene bed is 115,484 B; the three-track critical path measured 346,452 B. */
const SINGLE_TRACK_BYTES = 120_000;
const THREE_TRACK_BYTES = 350_000;

/** Force the blocked-autoplay path deterministically, the way `autoplay.spec.js` does. */
async function stubBlockedAutoplay(page) {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() {
      return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    };
  });
}

/** Grant autoplay deterministically, so the *unblocked* path can be observed too. */
async function stubGrantedAutoplay(page) {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() {
      return Promise.resolve();
    };
  });
}

async function audioBytes(page) {
  return page.evaluate((pattern) => {
    const entries = performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.includes(pattern));
    return {
      files: entries.map((entry) => entry.name.split('/').pop()).sort(),
      total: entries.reduce((sum, entry) => sum + (entry.encodedBodySize || 0), 0)
    };
  }, AUDIO_PATTERN);
}

async function elementState(page) {
  return page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    return audio.allElements().map((element) => ({
      key: element.dataset.trackKey,
      parked: element.dataset.trackSource,
      armed: element.src
    }));
  });
}

test.describe('audio-preload-critical-path', () => {
  test('a blocked session pays for at most the track it is looking at', async ({ page }) => {
    await stubBlockedAutoplay(page);
    await page.goto(`/?story=${encodeURIComponent(STORY)}`);
    await expect(page.locator('#blocked-overlay')).toBeVisible();
    await expect(page.locator('#audio-status')).toHaveText('Som bloqueado pelo navegador');

    const { files, total } = await audioBytes(page);

    // The byte assertion, not the request count: before the fix this session
    // transferred scene-01.aac, scene-02.aac and frame-03.aac in full — 346,452 B —
    // with `preload` set to 'auto', 'auto' and 'auto' respectively, and the
    // identical 346,452 B with `preload` set to 'metadata'. Only the scene bed the
    // reader is actually on survives the deferral: assigning its source is what
    // the blocked `play()` needs in order to be a decision about a real track
    // (a source-less element rejects with NotSupportedError, which would be
    // latched as a broken file rather than a blocked session).
    expect(
      total,
      `blocked session transferred ${total} B of audio; the whole point is that it is materially below ${THREE_TRACK_BYTES} B`
    ).toBeLessThan(SINGLE_TRACK_BYTES * 2);

    // The same fact stated per-file, so a regression names the track that came back.
    expect(files.filter((file) => file === 'scene-02.aac' || file === 'frame-03.aac')).toEqual([]);
  });

  test('no off-screen element is armed while the session is blocked', async ({ page }) => {
    await stubBlockedAutoplay(page);
    await page.goto(`/?story=${encodeURIComponent(STORY)}`);
    await expect(page.locator('#blocked-overlay')).toBeVisible();

    const elements = await elementState(page);

    // Every track still knows where it lives — the light-variant convention is
    // applied at construction and survives the deferral — while nothing that is
    // not on screen has been handed to the media stack.
    expect(elements.length).toBeGreaterThan(0);
    for (const element of elements) {
      expect(element.parked, `${element.key} must keep its resolved source`).toBeTruthy();
    }
    const armed = elements.filter((element) => element.armed).map((element) => element.key);
    expect(armed.filter((key) => key !== 'scene-0')).toEqual([]);
  });

  test('a granted session still fetches the next scene before the reader reaches it', async ({ page }) => {
    await stubGrantedAutoplay(page);
    await page.goto(`/?story=${encodeURIComponent(STORY)}`);
    await expect(page.locator('#frame-image')).toBeVisible();
    await expect(page.locator('#audio-status')).toHaveText('Som ligado');

    const elements = await elementState(page);
    // Deferring the source must not be a trade of the majority path for the
    // blocked one: once a play() has actually been granted, every track the
    // preload policy does not exclude is armed, so navigating to the next scene
    // does not pay for its first frame of audio.
    const armed = elements.filter((element) => element.armed).map((element) => element.key).sort();
    expect(armed).toEqual(['frame-frame-03', 'scene-0', 'scene-1']);

    await expect
      .poll(async () => (await audioBytes(page)).total, { timeout: 10_000 })
      .toBeGreaterThan(THREE_TRACK_BYTES * 0.5);
  });

  test('a silent continuation arms nothing that was not already on screen', async ({ page }) => {
    await stubBlockedAutoplay(page);
    await page.goto(`/?story=${encodeURIComponent(STORY)}`);
    await expect(page.locator('#blocked-overlay')).toBeVisible();
    await page.locator('#continue-silent').click();
    await expect(page.locator('#blocked-overlay')).toBeHidden();
    await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'off');

    const { files } = await audioBytes(page);
    expect(files.filter((file) => file === 'scene-02.aac' || file === 'frame-03.aac')).toEqual([]);
  });
});
