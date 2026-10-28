import { test, expect } from '@playwright/test';

test('sensory dialog and catalog controls exist', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sensory-dialog')).toBeAttached();
  await expect(page.locator('#sensory-mode-fx')).toBeAttached();
  await expect(page.locator('#sensory-mode-safe')).toBeAttached();
  await expect(page.locator('#catalog-button')).toBeAttached();
  await expect(page.locator('#toggle-sensory-mode')).toBeAttached();
});
