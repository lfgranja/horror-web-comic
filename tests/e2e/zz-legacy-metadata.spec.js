import { test, expect } from '@playwright/test';
import { openApp, waitForPlayer, resetStorage } from './helpers.js';

test.describe('US3 page metadata', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await resetStorage(page);
    await openApp(page);
    await waitForPlayer(page);
  });

  test('non-empty <title> (FR-026, SC-021)', async ({ page }) => {
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  test('meta description present and non-empty (FR-026, SC-021)', async ({ page }) => {
    const content = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(content).toBeTruthy();
    expect(content.trim().length).toBeGreaterThan(0);
  });

  test('Open Graph tags present (FR-026, SC-021)', async ({ page }) => {
    for (const prop of ['og:title', 'og:description', 'og:type']) {
      const content = await page.locator(`meta[property="${prop}"]`).getAttribute('content');
      expect(content, prop).toBeTruthy();
      expect(content.trim().length, prop).toBeGreaterThan(0);
    }
  });
});
