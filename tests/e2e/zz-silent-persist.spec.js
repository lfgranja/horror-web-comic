import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

const STORY = 'tests/fixtures/story.json';

/**
 * T211 — "continuar sem som" is a persisted audio preference, not a
 * session-only dismissal. It used to set `enabled = false` without writing
 * anything, so `hwc.audio` stayed absent, the documented default
 * `audioEnabled: true` applied on the next visit, and the player re-attempted
 * autoplay and re-showed the blocked overlay on every return (FR-007).
 */

test.describe('T211 — "continuar sem som" persists across visits', () => {
  test('choosing silence writes hwc.audio and survives a reload', async ({ page }) => {
    await openPlayer(page, STORY, { pause: false });

    // Reach the blocked state the way a real visitor would, with a refusing play().
    await page.evaluate(() => {
      HTMLMediaElement.prototype.play = () => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
    });
    await page.evaluate(() => globalThis.__cinematicPlayer.audio.markBlocked());
    await expect(page.locator('#blocked-overlay')).toBeVisible();

    await page.locator('#continue-silent').click();
    await expect(page.locator('#blocked-overlay')).toBeHidden();

    const stored = await page.evaluate(() => localStorage.getItem('hwc.audio'));
    expect(stored, 'the silent choice must be persisted (FR-007, storage-contract)').toBe('off');

    await page.reload();
    await page.waitForSelector('#player', { state: 'attached' });
    await page.waitForTimeout(1200);

    const after = await page.evaluate(() => ({
      stored: localStorage.getItem('hwc.audio'),
      overlayHidden: document.querySelector('#blocked-overlay')?.hidden ?? null,
      enabled: globalThis.__cinematicPlayer?.audio?.enabled ?? null,
    }));
    expect(after.stored).toBe('off');
    expect(after.overlayHidden, 'the overlay must NOT reappear on the next visit').toBe(true);
    expect(after.enabled, 'audio stays off until the user switches it back on').toBe(false);
  });

  test('the always-visible control can still re-enable audio after the silent choice', async ({ page }) => {
    await openPlayer(page, STORY, { pause: false });
    await page.evaluate(() => {
      HTMLMediaElement.prototype.play = () => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
    });
    await page.evaluate(() => globalThis.__cinematicPlayer.audio.markBlocked());
    await page.locator('#continue-silent').click();
    await expect(page.locator('#blocked-overlay')).toBeHidden();

    await page.locator('#audio-toggle').click();
    const after = await page.evaluate(() => ({
      stored: localStorage.getItem('hwc.audio'),
      enabled: globalThis.__cinematicPlayer?.audio?.enabled ?? null,
    }));
    expect(after.enabled, 're-enabling from the control must work (FR-005)').toBe(true);
    expect(after.stored).toBe('on');
    // The preference is now 'on' and persists, but play() is stubbed to refuse
    // every attempt, so the engine re-blocks immediately and the effective state is
    // 'blocked'. aria-pressed follows the effective state (FR-014), so it must be
    // false here. This previously asserted 'true' because aria-pressed was derived
    // from the stored preference, which is the drift this branch fixes.
    await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'blocked');
    await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'false');
  });
});
