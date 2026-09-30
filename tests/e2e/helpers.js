import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';

export async function openPlayer(page, story = 'tests/fixtures/story.json', { pause = false, dismissBlocked = true } = {}) {
  await page.goto(`/?story=${encodeURIComponent(story)}`);
  await expect(page.locator('#player')).toBeVisible();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', /.+/);
  await expect(page.locator('#frame-image')).toBeVisible();

  // The blocked overlay is a modal dialog. While it is up it intercepts clicks
  // aimed at the control bar, so a `force: true` click silently lands on the
  // overlay instead of the button and the requested action never happens.
  // Resolve it BEFORE any control interaction, for both the pause and the
  // playing path.
  if (dismissBlocked && !(await page.evaluate(() => !!window.__audioInstrument))) {
    const blocked = page.locator('#blocked-overlay');
    if (await blocked.isVisible()) {
      await page.locator('#continue-silent').click({ force: true });
      await expect(blocked).toBeHidden();
      // "continuar sem som" turns audio off for the session. FR-004 makes
      // active audio the product default, so restore it here: callers must
      // observe the default state, not the helper's workaround.
      const toggle = page.locator('#audio-toggle');
      if ((await toggle.getAttribute('aria-pressed')) === 'false') {
        await toggle.click({ force: true });
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      }
    }
  }

  if (pause) {
    await settlePaused(page);
    return;
  }
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
}

/**
 * Put the player into a deterministic paused state on a known frame.
 *
 * A single click on #play-toggle races the 250 ms auto-start: if the click
 * lands after the auto-start already advanced, the player ends up paused on a
 * later frame than the caller expects. Driving the player through its own API
 * removes the race entirely.
 */
export async function settlePaused(page, frameIndex = 0) {
  await page.waitForFunction(() => !!window.__cinematicPlayer);
  await page.evaluate((index) => {
    const player = window.__cinematicPlayer;
    player.pause();
    if (player.index !== index) player.moveTo(index, false);
  }, frameIndex);
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', /.+/);
  // The live region is written through a 500 ms debounce; wait for it so
  // callers can read a settled description.
  await expect(page.locator('#frame-description')).not.toBeEmpty({ timeout: 5000 });
}

/** Clear any in-flight coalescing window so the next control press acts alone. */
export async function clearCoalescing(page) {
  await page.evaluate(() => {
    const player = window.__cinematicPlayer;
    if (typeof player.flushPendingNavigation === 'function') player.flushPendingNavigation();
  });
}

export function currentFrame(page) {
  return page.locator('#frame-image');
}

export function frameId(page) {
  return page.locator('#player').getAttribute('data-frame-id');
}

export async function waitForFrame(page, id) {
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', id);
}

/**
 * Pin every frame's dwell so automatic advance cannot change the scene or frame
 * mid-assertion.
 *
 * A test that captures a media element, then waits, then asserts on it is racing
 * the auto-advance timer: on a loaded runner the story can legitimately cross a
 * frame (or scene) boundary during the wait, and the assertion then measures an
 * element the player has already left. That failure is engine- and
 * load-dependent and has nothing to do with the behaviour under test, which is
 * why it must be removed rather than retried.
 */
export async function freezeAdvance(page) {
  await page.evaluate(() => {
    const player = globalThis.__cinematicPlayer;
    for (const item of player.frames) item.frame.durationMs = 600000;
  });
}

/**
 * Record whether the auto-start timer was ever armed, instead of polling for it.
 *
 * `autoStartTimer` is truthy only inside a ~250 ms window opened in the
 * constructor. A test that polls for it from the test process loses that race
 * whenever page initialisation plus the first poll exceeds the window, which is
 * exactly what happens on a slow or loaded engine. Sampling from inside the page
 * — installed before any page script runs — observes the transient state
 * regardless of how slow the test process is.
 *
 * After calling this, read `window.__autoStartObservedMax`: it is > 0 when the
 * timer was armed, and 0 when it never was.
 */
export async function installAutoStartObserver(page) {
  await page.addInitScript(() => {
    window.__autoStartObservedMax = 0;
    const sample = () => {
      const armed = globalThis.__cinematicPlayer?.autoStartTimer ?? 0;
      if (armed > window.__autoStartObservedMax) window.__autoStartObservedMax = armed;
    };
    const timer = setInterval(sample, 4);
    setTimeout(() => clearInterval(timer), 10000);
  });
}

/*
 * ── Legacy-fixture harness ────────────────────────────────────────────────
 *
 * Recovered from three branches that were written against the original
 * f-001…f-005 fixture and never merged. That fixture still exists as
 * tests/fixtures/story-legacy.json, with its 19 assets under legacy-assets/,
 * because the recovered assertions are about the player's semantics — live
 * region, keyboard, focus, progressbar — and are written against that
 * manifest's text. Rewriting them onto the Portuguese production story would
 * have changed what they assert.
 *
 * These names plus FRAME_IDS and `selectors` are the contract those branches
 * imported. They are thin wrappers over the current helpers rather than a
 * second way to drive the player, so a spec written against either API
 * exercises the same code path.
 */

/** The recovered fixture's frame ids, in narrative order. */
export const FRAME_IDS = ['f-001', 'f-002', 'f-003', 'f-004', 'f-005'];

export const LEGACY_STORY = 'tests/fixtures/story-legacy.json';

/** Stable hooks for the shell, so a spec never hard-codes a selector twice. */
export const selectors = Object.freeze({
  player: '#player',
  stage: '#frame-stage',
  currentFrame: '#frame-image',
  liveRegion: '#frame-description',
  progress: '#progress',
  audioToggle: '#audio-toggle',
  audioStatus: '#audio-status',
  speed: '#speed',
  volume: '#volume',
  goStart: '#home',
  goEnd: '#end',
  prevScene: '#previous-scene',
  nextScene: '#next-scene',
  prevFrame: '#previous-frame',
  nextFrame: '#next-frame',
  playPause: '#play-toggle',
  autoplayOverlay: '#blocked-overlay',
  continueWithoutSound: '#continue-silent',
  endOverlay: '#end-overlay',
  replayFromStart: '#replay',
  errorScreen: '#error-screen'
});

/** Navigate without asserting anything about the resulting state. */
export async function openApp(page, story = LEGACY_STORY) {
  await page.goto(`/?story=${encodeURIComponent(story)}`);
}

/** Assert the shell is up and a frame is actually decoded and visible. */
export async function waitForPlayer(page) {
  await expect(page.locator(selectors.player)).toBeVisible();
  await expect(page.locator(selectors.player)).toHaveAttribute('data-frame-id', /.+/);
  await expect(page.locator(selectors.currentFrame)).toBeVisible();
}

/**
 * Clear persisted preferences and reload, so a spec starts from the product
 * default rather than whatever a previous test left in localStorage.
 */
export async function resetStorage(page) {
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      // A browser with storage disabled is exercised by persistence-flow.spec.js;
      // it must not fail every other spec before they can run.
    }
  });
  await page.reload();
}

/** Assert the player is showing exactly this frame. */
export async function expectFrameId(page, id) {
  await expect(page.locator(selectors.player)).toHaveAttribute('data-frame-id', id);
}

/**
 * The legacy fixture's authored dwell per frame, which is what the recovered
 * timing assertions compare against. Read from the manifest rather than
 * restated, so editing the fixture cannot silently invalidate the tolerance.
 */
export const EFFECTIVE_DURATION_MS = Object.freeze(
  Object.fromEntries(
    JSON.parse(readFileSync(new URL('../fixtures/story-legacy.json', import.meta.url), 'utf8'))
      .scenes.flatMap((scene) => scene.frames)
      .map((frame) => [frame.id, frame.durationMs])
  )
);

/** Every hwc.* key the session has persisted, so a spec can assert on absence too. */
export async function getHwcKeys(page) {
  return page.evaluate(() => {
    const keys = {};
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      keys[key] = window.localStorage.getItem(key);
    }
    return keys;
  });
}

/**
 * How long the player actually dwells on a frame, measured end to end: from
 * the moment it arrives at `id` to the moment it leaves. Both edges are read
 * from the DOM attribute the player publishes, not from a test-side clock.
 */
export async function installFrameWatcher(page) {
  // Must be installed before navigation. Both dwell edges are stamped from inside
  // the page by a MutationObserver, so neither carries the test process's polling
  // interval or the round trip of a page.evaluate() around it. Measuring the
  // edges from the test side instead made every dwell read late by an unknown
  // amount — which is exactly what the recovered ±10% assertions were tripping over.
  await page.addInitScript(() => {
    window.__frameMarks = [];
    window.__playingAt = null;
    let lastId = null;
    let lastStatus = null;
    const record = () => {
      const player = document.querySelector('#player');
      if (!player) return;
      const id = player.dataset.frameId;
      if (id && id !== lastId) {
        lastId = id;
        window.__frameMarks.push({ id, at: performance.now() });
      }
      // The first frame is painted while the player is still idle; the dwell
      // does not begin until the 250ms auto-start timer flips it to playing
      // (player.js:86). Timing that frame from its attribute write charges the
      // idle gap to it: 1000ms authored measured as 1252ms.
      const status = player.dataset.status;
      if (status === 'playing' && status !== lastStatus && window.__playingAt === null) {
        window.__playingAt = performance.now();
      }
      lastStatus = status;
    };
    // document, not documentElement: an init script runs before the parser has
    // created <html>, and observing a null root throws, which silently kills
    // every later measurement in the spec.
    new MutationObserver(record).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-frame-id', 'data-status']
    });
  });
}

/** How long the player dwells on `id`, measured between two in-page stamps. */
export async function measureDwellMs(page, id, timeout = 8000) {
  // Wait for BOTH edges, not just the arrival: the player may not have left the
  // frame yet when the caller asks, and reading the marks synchronously would
  // report an unbounded dwell rather than a pending one.
  await page.waitForFunction(
    (target) => {
      const marks = window.__frameMarks || [];
      const enter = marks.findIndex((mark) => mark.id === target);
      return enter >= 0 && marks.slice(enter + 1).some((mark) => mark.id !== target);
    },
    id,
    { timeout }
  );
  return page.evaluate((target) => {
    const marks = window.__frameMarks || [];
    const enter = marks.findIndex((mark) => mark.id === target);
    if (enter < 0) return null;
    // The first frame is painted before playback starts: the player arms a 250 ms
    // auto-start timer (player.js:86) and only then begins the dwell. Timing it
    // from the attribute write charges that dead time to the frame — 1000 ms
    // authored measured as 1256 ms, and 500 ms at 2x measured as 776 ms. Start
    // the first frame's clock when the player actually starts playing.
    // typeof, not !== null: an uninitialised value is undefined, and
    // Math.max(at, undefined) is NaN, which the tolerance then reports as a
    // failed measurement rather than an unavailable one.
    const from = enter === 0 && typeof window.__playingAt === 'number'
      ? Math.max(marks[enter].at, window.__playingAt)
      : marks[enter].at;
    for (let index = enter + 1; index < marks.length; index += 1) {
      if (marks[index].id !== target) return marks[index].at - from;
    }
    return null;
  }, id);
}

/** Assert a measured dwell sits within ±tolerance of the authored duration. */
export function expectDwellWithinTolerance(actual, expected, tolerance = 0.1) {
  const floor = expected * (1 - tolerance);
  const ceiling = expected * (1 + tolerance);
  expect(actual, `dwell ${Math.round(actual)}ms should be within ${tolerance * 100}% of ${expected}ms`)
    .toBeGreaterThan(floor);
  expect(actual, `dwell ${Math.round(actual)}ms should be within ${tolerance * 100}% of ${expected}ms`)
    .toBeLessThan(ceiling);
}
