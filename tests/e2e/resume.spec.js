import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame } from './helpers.js';

test('resumes a saved frame and does not persist paused state', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hwc.schemaVersion', '1');
    localStorage.setItem('hwc.audio', 'off');
    localStorage.setItem('hwc.volume', '0.4');
    localStorage.setItem('hwc.speed', '1');
    localStorage.setItem('hwc.progress', JSON.stringify({ frameId: 'frame-03', updatedAt: new Date().toISOString(), seq: 4, tabId: 'test-tab' }));
  });
  await openPlayer(page);
  await waitForFrame(page, 'frame-03');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
  await page.locator('#play-toggle').click();
  await page.reload();
  await waitForFrame(page, 'frame-03');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});
