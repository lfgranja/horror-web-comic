import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame } from './helpers.js';

test('exposes detailed descriptions, short alt text and progress semantics', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json');
  await page.evaluate(() => window.__cinematicPlayer?.moveTo(0, false));
  const image = page.locator('#frame-image');
  await expect(image).toHaveAttribute('alt', /.+/);
  await expect(page.locator('#frame-description')).toHaveText(/porta|corredor|escada|janela/);
  await expect(page.locator('#frame-description')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#frame-description')).toHaveAttribute('aria-atomic', 'true');
  await expect(page.locator('#progress')).toHaveAttribute('role', 'progressbar');
  await expect(page.locator('#progress')).toHaveAttribute('aria-valuemin', '1');
  await expect(page.locator('#progress')).toHaveAttribute('aria-valuemax', '4');
  await expect(page.locator('#audio-status')).toHaveAttribute('role', 'status');
  await page.locator('#next-frame').evaluate((button) => button.click());
  await waitForFrame(page, 'frame-02');
  await expect(page.locator('#frame-description')).toContainText('fotografia');
});

test('keeps every fixture frame non-empty and describes embedded lettering', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  const frames = await page.evaluate(async () => {
    const response = await fetch('tests/fixtures/story.json');
    return response.json();
  });
  const fixtureFrames = frames.scenes.flatMap((scene) => scene.frames);
  for (const frame of fixtureFrames) {
    expect(frame.alt.trim()).not.toBe('');
    expect(frame.description.trim()).not.toBe('');
  }
  for (const [index, frame] of fixtureFrames.entries()) {
    if (index > 0) await page.evaluate((frameIndex) => window.__cinematicPlayer.moveTo(frameIndex, false), index);
    await expect(page.locator('#frame-description')).toHaveText(frame.description);
  }
  const story = await page.evaluate(async () => {
    const response = await fetch('tests/fixtures/story.json');
    return response.json();
  });
  const descriptions = story.scenes.flatMap((scene) => scene.frames.map((frame) => frame.description));
  expect(descriptions.some((description) => description.includes('Volte quando a casa acordar'))).toBe(true);
  expect(descriptions.some((description) => description.includes('Não olhe para trás'))).toBe(true);
});
