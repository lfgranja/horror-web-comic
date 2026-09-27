import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test('exposes a coherent audio control and persists volume and speed', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() {
      return Promise.resolve();
    };
  });
  await openPlayer(page);
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'on');
  await page.locator('#volume').fill('35');
  await page.locator('#speed').selectOption('2');
  await page.locator('#audio-toggle').click();
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.locator('#volume')).toHaveValue('35');
  await expect(page.locator('#speed')).toHaveValue('2');
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#error-screen')).toBeHidden();
});

test('keeps the player usable when an audio source fails', async ({ page }) => {
  await page.route('**/assets/audio/*.wav', (route) => route.abort());
  await openPlayer(page);
  await expect(page.locator('#error-screen')).toBeHidden();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'on');
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#blocked-overlay')).toBeHidden();
  await expect(page.locator('#audio-status')).toHaveText('Som ligado');
});

test('does not classify a non-autoplay playback failure as blocked', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() {
      return Promise.reject(new DOMException('Unsupported media', 'NotSupportedError'));
    };
  });
  await openPlayer(page);
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'on');
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#blocked-overlay')).toBeHidden();
  await expect(page.locator('#audio-status')).toHaveText('Som ligado');
});

test('keeps the audio control visible without hover and reachable in one interaction', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.mouse.move(0, 0);
  const control = page.locator('#audio-toggle');
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await control.click();
  await expect(control).toHaveAttribute('aria-pressed', 'false');
});
