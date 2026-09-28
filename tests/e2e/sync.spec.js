import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame } from './helpers.js';

async function openPausedPlayer(page) {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  const player = page.locator('#player');
  if (await player.getAttribute('data-status') !== 'paused') await page.locator('#play-toggle').click({ force: true });
  await expect(player).toHaveAttribute('data-status', 'paused');
}

async function openPausedAtStart(page) {
  await openPausedPlayer(page);
  const player = page.locator('#player');
  if (await player.getAttribute('data-frame-id') !== 'frame-01') {
    await page.locator('#home').click();
    await expect(player).toHaveAttribute('data-frame-id', 'frame-01');
  }
  if (await player.getAttribute('data-status') !== 'paused') await page.locator('#play-toggle').click({ force: true });
  await expect(player).toHaveAttribute('data-status', 'paused');
}

test('adopts the newest reading position in another tab', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:8080' });
  const first = await context.newPage();
  const second = await context.newPage();
  await openPausedAtStart(first);
  await openPausedAtStart(second);
  await first.locator('#next-frame').click();
  await waitForFrame(first, 'frame-02');
  await expect(second.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await context.close();
});

test('ignores malformed persisted progress and starts from defaults', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hwc.schemaVersion', '1');
    localStorage.setItem('hwc.progress', JSON.stringify({
      frameId: 'frame-04',
      updatedAt: 'not-a-date',
      seq: 9,
      tabId: 'persisted-tab'
    }));
  });
  await openPausedPlayer(page);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
});

test('synchronizes through BroadcastChannel when local storage is unavailable', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:8080' });
  const first = await context.newPage();
  const second = await context.newPage();
  for (const page of [first, second]) {
    await page.addInitScript(() => {
      for (const method of ['getItem', 'setItem', 'removeItem']) {
        Object.defineProperty(Storage.prototype, method, {
          configurable: true,
          value() { throw new DOMException('storage unavailable', 'SecurityError'); }
        });
      }
    });
  }
  await openPausedAtStart(first);
  await openPausedAtStart(second);
  await first.locator('#next-frame').click();
  await waitForFrame(first, 'frame-02');
  await expect(second.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await context.close();
});

test('uses storage events when BroadcastChannel is unavailable', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:8080' });
  const first = await context.newPage();
  const second = await context.newPage();
  for (const page of [first, second]) {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'BroadcastChannel', { configurable: true, value: undefined });
    });
  }
  await openPausedAtStart(first);
  await openPausedAtStart(second);
  await first.locator('#next-frame').click();
  await waitForFrame(first, 'frame-02');
  await expect(second.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await context.close();
});

test('falls back when persisted progress contains malformed JSON', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hwc.schemaVersion', '1');
    localStorage.setItem('hwc.progress', '{not-json');
  });
  await openPausedAtStart(page);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
});

test('resets an incompatible persisted state before loading the player', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hwc.schemaVersion', '99');
    localStorage.setItem('hwc.audio', 'off');
    localStorage.setItem('hwc.progress', JSON.stringify({
      frameId: 'frame-04',
      updatedAt: '2026-09-23T12:00:00.000Z',
      seq: 4,
      tabId: 'old-tab'
    }));
  });
  await openPausedAtStart(page);
  // The requirement is that the incompatible state is DISCARDED and the defaults
  // applied — not that the key stays absent. The default for audio is on (FR-004),
  // so the seeded 'off' must not survive, and the app is entitled to persist that
  // default. Asserting the key was null raced that write: on a slower engine the
  // reset-then-persist sequence had not finished, and the test read the persisted
  // 'on' instead. Only webkit was slow enough to lose it, which made it look like an
  // engine difference.
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
  expect(await page.evaluate(() => localStorage.getItem('hwc.schemaVersion'))).toBe('1');
  expect(await page.evaluate(() => localStorage.getItem('hwc.audio')), 'the persisted off preference must be discarded').not.toBe('off');
  await expect(page.locator('#player')).not.toHaveAttribute('data-audio-state', 'off');
});

test('resolves concurrent progress by updatedAt, sequence, and tab identifier', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:8080' });
  const first = await context.newPage();
  const second = await context.newPage();
  for (const page of [first, second]) {
    await page.addInitScript(() => {
      localStorage.setItem('hwc.schemaVersion', '1');
      localStorage.removeItem('hwc.progress');
      Object.defineProperty(window, 'BroadcastChannel', { configurable: true, value: undefined });
    });
  }
  await openPausedAtStart(first);
  await openPausedAtStart(second);
  const writeProgress = (record) => first.evaluate((value) => {
    localStorage.setItem('hwc.progress', JSON.stringify(value));
  }, record);
  const updatedAt = '2099-01-01T00:00:00.000Z';
  await writeProgress({ frameId: 'frame-02', updatedAt, seq: 4, tabId: 'tab-a' });
  await expect(second.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await writeProgress({ frameId: 'frame-03', updatedAt: '2098-12-31T23:59:59.999Z', seq: 99, tabId: 'tab-z' });
  await expect(second.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await writeProgress({ frameId: 'frame-03', updatedAt, seq: 5, tabId: 'tab-b' });
  await expect(second.locator('#player')).toHaveAttribute('data-frame-id', 'frame-03');
  await writeProgress({ frameId: 'frame-04', updatedAt, seq: 5, tabId: 'tab-a' });
  await expect(second.locator('#player')).toHaveAttribute('data-frame-id', 'frame-03');
  await writeProgress({ frameId: 'frame-04', updatedAt, seq: 5, tabId: 'tab-c' });
  await expect(second.locator('#player')).toHaveAttribute('data-frame-id', 'frame-04');
  await context.close();
});
