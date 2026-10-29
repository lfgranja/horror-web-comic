import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame } from './helpers.js';

test('operates by touch-sized controls and keyboard shortcuts', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  const controls = page.locator('#player .control-button');
  for (let i = 0; i < await controls.count(); i += 1) {
    const box = await controls.nth(i).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.locator('#player').focus();
  await page.keyboard.press('ArrowRight');
  await waitForFrame(page, 'frame-02');
  await page.keyboard.press('Space');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
  await page.keyboard.press('k');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
  await page.keyboard.press('Space');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
  await page.keyboard.press('m');
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'false');
});
