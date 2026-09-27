import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame } from './helpers.js';

test('changes speed only for dwell and retains the selected values', async ({ page }) => {
  await openPlayer(page);
  await page.locator('#speed').selectOption('2');
  await expect(page.locator('#speed')).toHaveValue('2');
  const started = Date.now();
  await waitForFrame(page, 'frame-02');
  const elapsed = Date.now() - started;
  expect(elapsed).toBeLessThan(1500);
  await page.locator('#volume').fill('80');
  await expect(page.locator('#volume-value')).toHaveText('80%');
  await page.reload();
  await expect(page.locator('#speed')).toHaveValue('2');
  await expect(page.locator('#volume')).toHaveValue('80');
});
