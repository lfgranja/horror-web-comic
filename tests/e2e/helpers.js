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
