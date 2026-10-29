import { test, expect } from '@playwright/test';
import { openPlayer, settlePaused, freezeAdvance, dismissBlockedOverlay, routeFrozenStory } from './helpers.js';

test.describe.configure({ mode: 'serial' });

test.beforeEach(() => {
  test.slow();
});

test('automatic advance followed by a real pause returns to the saved frame and resumes playing', async ({ page }) => {
  await routeFrozenStory(page);
  await openPlayer(page, 'tests/fixtures/story.json');
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await page.locator('#play-toggle').click();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');

  await page.reload();
  await dismissBlockedOverlay(page);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});

test('manual navigation returns across reload and a new page session, while explicit restart persists frame one', async ({ page, context }) => {
  await routeFrozenStory(page, undefined, { freezeAll: true });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.locator('#next-frame').click();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');

  await page.reload();
  await dismissBlockedOverlay(page);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');

  const returnSession = await context.newPage();
  await routeFrozenStory(returnSession, undefined, { freezeAll: true });
  await openPlayer(returnSession, 'tests/fixtures/story.json');
  await expect(returnSession.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');

  await returnSession.locator('#end').click();
  await expect(returnSession.locator('#end-overlay')).toBeVisible();
  await returnSession.locator('#replay').click();
  await expect(returnSession.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await expect(returnSession.locator('#player')).toHaveAttribute('data-status', 'playing');

  await returnSession.reload();
  await dismissBlockedOverlay(returnSession);
  await expect(returnSession.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await expect(returnSession.locator('#player')).toHaveAttribute('data-status', 'playing');
  await returnSession.close();
});

test('real UI remains functional and safely falls back when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      Object.defineProperty(window, 'localStorage', { configurable: true, value: undefined });
    } catch {}
  });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await expect(page.locator('#error-screen')).toBeHidden();
  await page.locator('#next-frame').click();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');

  await page.reload();
  await expect(page.locator('#error-screen')).toBeHidden();
  const blocked = page.locator('#blocked-overlay');
  if (await blocked.isVisible()) {
    await page.locator('#continue-silent').click();
    await expect(blocked).toBeHidden();
  }
  await settlePaused(page);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  await page.locator('#next-frame').click();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
});
