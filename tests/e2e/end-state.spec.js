import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame, clearCoalescing } from './helpers.js';

test('shows an accessible end overlay and replays from the beginning', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.locator('#end').click();
  await expect(page.locator('#end-overlay')).toBeVisible();
  await expect(page.locator('#end-overlay')).toContainText('fim da narrativa');
  await page.locator('#replay').click();
  await expect(page.locator('#end-overlay')).toBeHidden();
  await waitForFrame(page, 'frame-01');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});

test('manual navigation leaves the ended state when position changes', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await clearCoalescing(page);
  await page.locator('#end').click();
  // FR-003 coalesces rapid inputs (last one wins, 400 ms window), so the ended
  // state must be established before the leaving action is issued.
  await expect(page.locator('#end-overlay')).toBeVisible();
  await clearCoalescing(page);
  await page.locator('#home').click();
  await expect(page.locator('#end-overlay')).toBeHidden();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});
