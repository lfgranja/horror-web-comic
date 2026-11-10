import { test, expect } from '@playwright/test';

test('memory illusion latch persists after revisit on alojamento', async ({ page }) => {
  await page.goto('/alojamento.html');
  await page.waitForFunction(() => !!window.__cinematicPlayer);
  await page.evaluate(() => { const p = window.__cinematicPlayer; p.pause(); if (p.index !== 0) p.moveTo(0, false); });
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await page.evaluate(() => { window.__cinematicPlayer.navigate(1); });
  await page.waitForTimeout(500);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  // latch: description should reflect memoryIllusion
  const desc = await page.locator('#frame-description').textContent();
  expect(desc).toContain('corredor');
  // revisit: go back then forward
  await page.evaluate(() => { const p = window.__cinematicPlayer; p.moveTo(0, false); });
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await page.evaluate(() => { window.__cinematicPlayer.navigate(1); });
  await page.waitForTimeout(500);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
});

test('atomic purge on sensory toggle keeps current frame', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__cinematicPlayer);
  await page.evaluate(() => { const p = window.__cinematicPlayer; p.pause(); if (p.index !== 0) p.moveTo(0, false); });
  const before = await page.locator('#player').getAttribute('data-frame-id');
  await page.locator('#toggle-sensory-mode').click({ force: true });
  await page.waitForTimeout(50);
  const after = await page.locator('#player').getAttribute('data-frame-id');
  expect(after).toBe(before);
});

test('reduced motion forces safe mode', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#sensory-dialog')).toBeAttached();
});
