import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

const viewports = [
  { label: '320-portrait', width: 320, height: 568 },
  { label: '320-landscape', width: 568, height: 320 },
  { label: '360-portrait', width: 360, height: 800 },
  { label: '360-landscape', width: 800, height: 360 },
  { label: '768-portrait', width: 768, height: 1024 },
  { label: '768-landscape', width: 1024, height: 768 },
  { label: '1440-landscape', width: 1440, height: 900 },
  { label: '1440-portrait', width: 900, height: 1440 },
  { label: '2560-landscape', width: 2560, height: 1440 },
  { label: '2560-portrait', width: 1440, height: 2560 }
];

for (const viewport of viewports) {
  test(`responsive matrix ${viewport.label} preserves framing and controls`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openPlayer(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await expect(page.locator('#frame-image')).toHaveCSS('object-fit', 'contain');
    await expect(page.locator('#play-toggle')).toBeVisible();
    await expect(page.locator('#audio-toggle')).toBeVisible();
    await expect(page.locator('#previous-frame')).toBeVisible();
    await expect(page.locator('#next-frame')).toBeVisible();
  });
}

for (const rotation of [
  { from: { width: 360, height: 800 }, to: { width: 800, height: 360 } },
  { from: { width: 768, height: 1024 }, to: { width: 1024, height: 768 } }
]) {
  test(`orientation rotation ${rotation.from.width}x${rotation.from.height} preserves the current frame`, async ({ page }) => {
    await page.setViewportSize(rotation.from);
    await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
    const frame = await page.locator('#player').getAttribute('data-frame-id');
    await page.setViewportSize(rotation.to);
    await page.waitForTimeout(300);
    expect(await page.locator('#player').getAttribute('data-frame-id')).toBe(frame);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await expect(page.locator('#frame-image')).toHaveCSS('object-fit', 'contain');
  });
}

test('responsive matrix records browser coverage without fabricating mobile Safari evidence', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('#player')).toBeVisible();
  testInfo.annotations.push({
    type: 'responsive_matrix_coverage',
    description: 'Automated projects cover mobile-chromium, mobile-webkit, desktop-chromium, desktop-firefox, and desktop-webkit. Real-device mobile Safari remains host-dependent.'
  });
});
