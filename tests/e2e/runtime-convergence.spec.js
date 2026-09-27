import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test('does not preload the next frame when data saver is active', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true, effectiveType: '4g', rtt: 40 }
    });
    const NativeImage = window.Image;
    window.__preloadedImages = [];
    window.Image = class extends NativeImage {
      constructor(...args) {
        super(...args);
        window.__preloadedImages.push(this);
      }
    };
  });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  const sources = await page.evaluate(() => window.__preloadedImages.map((image) => image.src));
  expect(sources.some((source) => source.includes('frame-02'))).toBe(false);
});

test('keeps boundary navigation actions as no-ops', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.locator('#home').click();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await page.locator('#end').click();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'ended');
  await page.locator('#end').click();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'ended');
});

test('debounces the live-region description update', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.evaluate(() => window.__cinematicPlayer.moveTo(1, false));
  await page.waitForTimeout(100);
  const textAt100 = await page.locator('#frame-description').textContent();
  expect(textAt100).not.toContain('fotografia');
  await page.waitForTimeout(500);
  await expect(page.locator('#frame-description')).toContainText('fotografia');
});

test('coalesces opposing rapid navigation with the last input winning', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.evaluate(() => {
    const next = document.querySelector('#next-frame');
    const previous = document.querySelector('#previous-frame');
    next.click();
    previous.click();
  });

  await page.waitForTimeout(500);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
});

test('manual navigation cancels an in-flight transition and starts only the target transition', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.evaluate(() => {
    const player = window.__cinematicPlayer;
    player.frames[1].frame.transition = { type: 'zoom-in', durationMs: 1400, easing: 'linear' };
    player.frames[2].frame.transition = { type: 'zoom-out', durationMs: 1500, easing: 'linear' };
  });
  await page.locator('#next-frame').click();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await expect(page.locator('#frame-image')).toBeVisible();
  await page.waitForTimeout(150);
  await page.evaluate(() => { globalThis.__cancelledAnimation = document.querySelector('#frame-image').getAnimations()[0] ?? null; });
  expect(await page.evaluate(() => globalThis.__cancelledAnimation?.playState)).toBe('running');

  await page.locator('#next-frame').click();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-03');
  await expect(page.locator('#frame-image')).toBeVisible();
  await expect(page.locator('#frame-stage')).toHaveAttribute('data-transition', 'zoom-out');
  const animation = await page.evaluate(() => {
    const current = document.querySelector('#frame-image').getAnimations()[0] ?? null;
    return {
      name: current?.animationName ?? null,
      currentTime: current?.currentTime ?? null,
      cancelledStillActive: document.querySelector('#frame-image').getAnimations().includes(globalThis.__cancelledAnimation)
    };
  });
  expect(animation.name).toBe('frame-zoom-out');
  expect(animation.currentTime).toBeLessThan(500);
  expect(animation.cancelledStillActive).toBe(false);
});
