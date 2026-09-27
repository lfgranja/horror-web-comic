import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

const LAST = 'frame-04';

test.describe('T202 — manual arrival at the last frame reaches the ended state', () => {
  test('pressing next onto the final frame shows the end state and overlay', async ({ page }) => {
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    await page.locator('#next-frame').click();
    await expect(page.locator('#frame-image')).toHaveAttribute('data-frame-id', 'frame-02');
    await page.locator('#next-frame').click();
    await expect(page.locator('#frame-image')).toHaveAttribute('data-frame-id', 'frame-03');
    await page.locator('#next-frame').click();
    await expect(page.locator('#frame-image')).toHaveAttribute('data-frame-id', LAST);

    // The point of T202: reaching the last frame MANUALLY must tell the visitor
    // the narrative is over, exactly as natural completion does (US1/AC4).
    await expect(page.locator('#player')).toHaveAttribute('data-status', 'ended');
    await expect(page.locator('#end-overlay')).toBeVisible();
    await expect(page.locator('#replay')).toBeVisible();
  });

  test('the End control is still a no-op when already on the last frame', async ({ page }) => {
    // FR-003's "no-op at the limit" is about the *control*, not the state. T202
    // must not have turned End into something that re-fires or resets.
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    await page.locator('#end').click();
    await expect(page.locator('#frame-image')).toHaveAttribute('data-frame-id', LAST);
    await expect(page.locator('#player')).toHaveAttribute('data-status', 'ended');

    await page.locator('#end').click();
    await expect(page.locator('#frame-image')).toHaveAttribute('data-frame-id', LAST);
    await expect(page.locator('#player')).toHaveAttribute('data-status', 'ended');
  });

  test('leaving the last frame backwards drops the ended state', async ({ page }) => {
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    await page.locator('#end').click();
    await expect(page.locator('#player')).toHaveAttribute('data-status', 'ended');
    await page.locator('#previous-frame').click();
    await expect(page.locator('#frame-image')).toHaveAttribute('data-frame-id', 'frame-03');
    await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
    await expect(page.locator('#end-overlay')).toBeHidden();
  });

  test('reaching the last frame by stepping is symmetric with a scene jump', async ({ page }) => {
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    await page.locator('#next-scene').click();
    await expect(page.locator('#frame-image')).toHaveAttribute('data-frame-id', 'frame-03');
    await page.locator('#next-frame').click();
    await expect(page.locator('#player')).toHaveAttribute('data-status', 'ended');
    await expect(page.locator('#end-overlay')).toBeVisible();
  });
});
