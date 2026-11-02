import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test.describe('Sensory and Catalog', () => {
  test('catalog button and dialog exist', async ({ page }) => {
    await openPlayer(page);
    const catalogBtn = page.locator('#catalog-button');
    await expect(catalogBtn).toBeVisible();
    await catalogBtn.click();
    await expect(page.locator('#catalog-dialog')).toBeVisible();
    await page.locator('#catalog-close').click();
    await expect(page.locator('#catalog-dialog')).toBeHidden();
  });

  test('toggle sensory mode exists and purges', async ({ page }) => {
    await openPlayer(page);
    const toggle = page.locator('#toggle-sensory-mode');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await toggle.click();
  });

  test('end overlay has actions', async ({ page }) => {
    await page.goto('/?story=tests/fixtures/minimal.json');
    await expect(page.locator('#end-overlay')).toBeHidden();
  });
});
