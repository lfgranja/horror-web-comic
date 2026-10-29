import { test, expect } from '@playwright/test';

for (const [story, expected] of [
  ['tests/fixtures/missing.json', /não está disponível|conteúdo/i],
  ['tests/fixtures/malformed.json', /corrompido|JSON|conteúdo/i],
  ['tests/fixtures/incompatible.json', /incompatível|conteúdo/i]
]) {
  test(`fails closed for ${story}`, async ({ page }) => {
    const response = await page.goto(`/?story=${encodeURIComponent(story)}`);
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator('#error-screen')).toBeVisible();
    await expect(page.locator('#error-screen')).toContainText(expected);
    await expect(page.locator('body')).not.toBeEmpty();
  });
}
