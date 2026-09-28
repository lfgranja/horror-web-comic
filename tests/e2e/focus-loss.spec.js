import { test, expect } from '@playwright/test';
import { openPlayer, installAutoStartObserver } from './helpers.js';

async function hideTab(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

test('startup focus loss clears auto-start, pauses audio, saves progress, and requires overlay resume', async ({ page }) => {
  // Record the transient auto-start state from inside the page instead of
  // polling for it. The timer is truthy only inside a ~250 ms window, so a poll
  // from the test process loses the race whenever initialisation plus the first
  // poll exceeds it — reproducible on a loaded chromium, which is what made this
  // look like an engine difference.
  await installAutoStartObserver(page);
  await page.goto('/?story=tests/fixtures/story.json', { waitUntil: 'commit' });
  // Wait for the player instance, not for the `idle` status: the auto-start
  // window is only 250 ms wide and the status is not reliably observable.
  await page.waitForFunction(() => Boolean(globalThis.__cinematicPlayer));
  expect(
    await page.evaluate(() => window.__autoStartObservedMax),
    'the auto-start timer must have been armed inside the constructor'
  ).toBeGreaterThan(0);
  await hideTab(page);

  await expect(page.locator('#resume-overlay')).toBeVisible();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
  const state = await page.evaluate(() => ({
    autoStartTimer: globalThis.__cinematicPlayer.autoStartTimer,
    dwellTimer: globalThis.__cinematicPlayer.timer,
    audioPaused: globalThis.__cinematicPlayer.audio.paused,
    frameId: JSON.parse(localStorage.getItem('hwc.progress')).frameId
  }));
  expect(state).toEqual({ autoStartTimer: 0, dwellTimer: 0, audioPaused: true, frameId: 'frame-01' });
  await page.waitForTimeout(350);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await page.locator('#play-toggle').click({ force: true });
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
  await expect(page.locator('#resume-overlay')).toBeVisible();

  await page.locator('#resume-button').click();
  await expect(page.locator('#resume-overlay')).toBeHidden();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});

test('focus loss during pending navigation cancels the queued move and requires overlay resume', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.evaluate(() => {
    document.querySelector('#next-frame').click();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await expect(page.locator('#resume-overlay')).toBeVisible();
  const state = await page.evaluate(() => ({
    pendingNavigation: globalThis.__cinematicPlayer.pendingNavigation,
    dwellTimer: globalThis.__cinematicPlayer.timer,
    audioPaused: globalThis.__cinematicPlayer.audio.paused,
    frameId: JSON.parse(localStorage.getItem('hwc.progress')).frameId
  }));
  expect(state).toEqual({ pendingNavigation: null, dwellTimer: 0, audioPaused: true, frameId: 'frame-01' });
  await page.waitForTimeout(500);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');

  await page.locator('#resume-button').click();
  await expect(page.locator('#resume-overlay')).toBeHidden();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});

test('playing focus loss clears all playback timers and permits only explicit overlay resume', async ({ page }) => {
  await openPlayer(page);
  await hideTab(page);

  await expect(page.locator('#resume-overlay')).toBeVisible();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
  const state = await page.evaluate(() => ({
    autoStartTimer: globalThis.__cinematicPlayer.autoStartTimer,
    pendingNavigation: globalThis.__cinematicPlayer.pendingNavigation,
    dwellTimer: globalThis.__cinematicPlayer.timer,
    audioPaused: globalThis.__cinematicPlayer.audio.paused
  }));
  expect(state).toEqual({ autoStartTimer: 0, pendingNavigation: null, dwellTimer: 0, audioPaused: true });

  await page.locator('#resume-button').click();
  await expect(page.locator('#resume-overlay')).toBeHidden();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});
