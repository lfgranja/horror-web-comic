import { test, expect } from '@playwright/test';

test('handles autoplay refusal with silent continuation and gesture unlock', async ({ page }) => {
  await page.addInitScript(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    let attempts = 0;
    HTMLMediaElement.prototype.play = function play() {
      attempts += 1;
      if (attempts === 1) {
        const error = new DOMException('blocked', 'NotAllowedError');
        return Promise.reject(error);
      }
      return originalPlay.call(this);
    };
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#player')).toBeVisible();
  await expect(page.locator('#frame-image')).toBeVisible();
  await expect(page.locator('#blocked-overlay')).toBeVisible();
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-disabled', 'true');
  // FR-014: blocked means the browser refuses playback, so the control must not
  // advertise itself as on. It used to be derived from the stored preference, which
  // reported "pressed" while the blocked overlay was up and the control was disabled.
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#continue-silent').click();
  await expect(page.locator('#blocked-overlay')).toBeHidden();
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'off');
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#audio-status')).toHaveText('Som desligado');
  await page.locator('#audio-toggle').click();
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'on');
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'true');
});

test('unlocks blocked audio from a document keydown without pausing playback', async ({ page }) => {
  await page.addInitScript(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    let attempts = 0;
    HTMLMediaElement.prototype.play = function play() {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      return originalPlay.call(this);
    };
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#blocked-overlay')).toBeVisible();
  await expect(page.locator('#continue-silent')).toBeFocused();
  await page.locator('html').dispatchEvent('keydown', { key: 'Enter' });
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'on');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
  await expect(page.locator('#blocked-overlay')).toBeHidden();
});

test('coordinates a player shortcut with blocked audio unlock', async ({ page }) => {
  await page.addInitScript(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    let attempts = 0;
    HTMLMediaElement.prototype.play = function play() {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      return originalPlay.call(this);
    };
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#blocked-overlay')).toBeVisible();
  await page.locator('#player').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'on');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});

test('does not override a persisted off preference with a qualified gesture', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hwc.schemaVersion', '1');
    localStorage.setItem('hwc.audio', 'off');
  });
  await page.goto('/?story=tests%2Ffixtures%2Fstory.json');
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'off');
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#blocked-overlay')).toBeHidden();
  await page.locator('#player').dispatchEvent('pointerup');
  await page.locator('#player').dispatchEvent('keydown', { key: 'Enter' });
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'off');
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'false');
});

/**
 * The control has two representations of its own condition: `aria-pressed` and
 * `data-audio-state`. They drifted once already — aria-pressed came from the stored
 * preference while data-audio-state came from the effective state, so a blocked
 * session reported "on". Both are now derived from the same value, so this pins the
 * invariant that keeps them from drifting again, across every state the control can
 * occupy.
 */
test('aria-pressed and data-audio-state never disagree', async ({ page }) => {
  await page.addInitScript(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    let attempts = 0;
    HTMLMediaElement.prototype.play = function play() {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      return originalPlay.call(this);
    };
  });
  await page.goto('/?story=tests%2Ffixtures/story.json');
  await expect(page.locator('#player')).toBeVisible();
  await expect(page.locator('#blocked-overlay')).toBeVisible();

  const coherence = async (label) => {
    const observed = await page.evaluate(() => {
      const root = document.querySelector('#player');
      const toggle = document.querySelector('#audio-toggle');
      const audioState = root.dataset.audioState;
      const pressed = toggle.getAttribute('aria-pressed');
      return { audioState, pressed };
    });
    const expected = String(observed.audioState === 'on' || observed.audioState === 'paused');
    expect(observed.pressed, `aria-pressed must track the state while ${label} (state=${observed.audioState})`).toBe(expected);
  };

  await coherence('blocked');
  await page.locator('#continue-silent').click();
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'off');
  await coherence('off');
  await page.locator('#audio-toggle').click();
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'on');
  await coherence('on');
  await page.locator('#play-toggle').click();
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'paused');
  await coherence('paused');
});
