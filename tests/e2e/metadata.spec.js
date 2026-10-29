import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test('publishes title, description and Open Graph metadata', async ({ page }) => {
  await openPlayer(page);
  await expect(page).toHaveTitle(/A Casa que Respira/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
});
