import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test('automatic advance followed by a real pause returns to the saved frame and resumes playing', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json');
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await page.locator('#play-toggle').click();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');

  await page.reload();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});

test('manual navigation returns across reload and a new page session, while explicit restart persists frame one', async ({ page, context }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.locator('#next-frame').click();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');

  await page.reload();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');

  const returnSession = await context.newPage();
  await openPlayer(returnSession, 'tests/fixtures/story.json', { pause: true });
  await expect(returnSession.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');

  await returnSession.locator('#end').click();
  await expect(returnSession.locator('#end-overlay')).toBeVisible();
  await returnSession.locator('#replay').click();
  await expect(returnSession.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await expect(returnSession.locator('#player')).toHaveAttribute('data-status', 'playing');

  await returnSession.reload();
  await expect(returnSession.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await expect(returnSession.locator('#player')).toHaveAttribute('data-status', 'playing');
  await returnSession.close();
});

test('real UI remains functional and safely falls back when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem']) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value() {
          throw new DOMException('storage unavailable', 'SecurityError');
        }
      });
    }
  });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await expect(page.locator('#error-screen')).toBeHidden();
  await page.locator('#next-frame').click();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');

  await page.reload();
  await expect(page.locator('#error-screen')).toBeHidden();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await page.locator('#next-frame').click();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
});
