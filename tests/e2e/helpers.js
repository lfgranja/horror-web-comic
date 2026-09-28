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
