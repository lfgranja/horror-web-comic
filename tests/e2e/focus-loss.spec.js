import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

async function hideTab(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

test('startup focus loss clears auto-start, pauses audio, saves progress, and requires overlay resume', async ({ page }) => {
  await page.goto('/?story=tests/fixtures/story.json', { waitUntil: 'commit' });
  // Wait for the player instance, not for the `idle` status: the auto-start
  // window is only 250 ms wide, and on a slower engine (WebKit) the first poll
  // can land after it has already closed, so `status === 'idle'` is never
  // observed. The auto-start timer is armed inside the constructor, so once the
  // instance exists the pending auto-start is guaranteed to be observable.
  await page.waitForFunction(() => globalThis.__cinematicPlayer?.autoStartTimer > 0);
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
