import { test, expect } from '@playwright/test';

test('shows the accessible frame description when an image fails and keeps navigation usable', async ({ page }) => {
  await page.route('**/tests/fixtures/assets/frames/frame-01.svg', (route) => route.abort());
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await expect(page.locator('#frame-placeholder')).toBeVisible();
  await expect(page.locator('#frame-placeholder')).toContainText('porta');
  await page.locator('#next-frame').click({ force: true });
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
});
