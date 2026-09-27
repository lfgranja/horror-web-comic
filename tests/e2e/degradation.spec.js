import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test('uses the light image variant and exposes degraded capability state', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true, effectiveType: '4g', rtt: 40, deviceMemory: 1, hardwareConcurrency: 1 }
    });
  });
  await openPlayer(page, 'src/data/story.json', { pause: true });
  await expect(page.locator('#player')).toHaveAttribute('data-degraded', 'true');
  await expect(page.locator('#frame-image')).toHaveAttribute('src', /-light\.jpg$/);
});
