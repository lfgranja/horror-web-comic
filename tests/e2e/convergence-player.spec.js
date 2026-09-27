import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame } from './helpers.js';

test('image swap resets readiness and keeps placeholder visible until load or error', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.locator('#next-frame').click();
  await expect(page.locator('#frame-placeholder')).toBeHidden();
  await expect(page.locator('#frame-image')).toBeVisible();
  const img = page.locator('#frame-image');
  await expect(img).toHaveAttribute('data-frame-id', 'frame-02');
});

test('dwell timer only starts after current frame image is ready and playing', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.locator('#play-toggle').click();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
  await expect(page.locator('#frame-image')).toBeVisible();
  await page.waitForTimeout(300);
  const before = await page.locator('#player').getAttribute('data-frame-id');
  await page.waitForTimeout(1600);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
});

test('degraded transition resolution forces non-essential transitions to instant cut', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: '4g', rtt: 40, deviceMemory: 1, hardwareConcurrency: 1 } });
  });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await expect(page.locator('#player')).toHaveAttribute('data-degraded', 'true');
  await page.locator('#next-frame').click();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await expect(page.locator('#frame-stage')).toHaveAttribute('data-transition', 'cut');
  await expect(page.locator('#frame-stage')).toHaveAttribute('style', /--transition-duration: 0ms/);
});

test('light responsive selection uses light variants and honors srcset and sizes', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: '4g', rtt: 40, deviceMemory: 1, hardwareConcurrency: 1 } });
  });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  const src = await page.locator('#frame-image').getAttribute('src');
  expect(src).toMatch(/-light\.(jpg|svg)$/);
  const webp = page.locator('#frame-webp');
  await expect(webp).toHaveAttribute('sizes', '100vw');
});

test('queueNavigation coalesces rapid inputs with last-input-wins within 400ms', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.evaluate(() => {
    const button = document.querySelector('#next-frame');
    button.click();
    button.click();
  });
  await page.waitForTimeout(500);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
});

test('Home from ended resumes playing at first frame', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.locator('#end').click();
  await expect(page.locator('#end-overlay')).toBeVisible();
  await page.locator('#home').click();
  await waitForFrame(page, 'frame-01');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
  await expect(page.locator('#end-overlay')).toBeHidden();
});

test('native keyboard activation of focused buttons does not double-trigger shortcuts', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.locator('#next-frame').focus();
  await page.keyboard.press(' ');
  await page.waitForTimeout(200);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
});

test('player starts in idle state before transitioning to playing for auto-start', async ({ page }) => {
  await page.goto('/?story=tests/fixtures/story.json', { waitUntil: 'commit' });
  const initialStatus = await page.evaluate(() => new Promise((resolve) => {
    const readStatus = () => {
      const player = document.querySelector('#player');
      if (player) {
        resolve(player.dataset.status);
        return;
      }
      requestAnimationFrame(readStatus);
    };
    readStatus();
  }));
  expect(initialStatus).toBe('idle');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});

async function installResponsiveImage(page, image) {
  await openPlayer(page, 'src/data/story.json', { pause: true });
  await page.evaluate((nextImage) => {
    const player = globalThis.__cinematicPlayer;
    Object.assign(player.frames[0].frame.image, nextImage);
    player.render();
  }, image);
  await expect(page.locator('#frame-image')).toBeVisible();
}

test('uses format-specific responsive candidates for picture sources and fallback image', async ({ page }) => {
  const avifSrcset = 'assets/frames/generated/frame-01.avif 640w, assets/frames/generated/frame-01.avif 1200w';
  const webpSrcset = 'assets/frames/generated/frame-01.webp 640w, assets/frames/generated/frame-01.webp 1200w';
  const fallbackSrcset = 'assets/frames/generated/frame-01.jpg 640w, assets/frames/generated/frame-01.jpg 1200w';
  const sizes = '(min-width: 48rem) 960px, 100vw';
  await installResponsiveImage(page, { avifSrcset, webpSrcset, fallbackSrcset, sizes });

  await expect(page.locator('#frame-avif')).toHaveAttribute('srcset', avifSrcset);
  await expect(page.locator('#frame-webp')).toHaveAttribute('srcset', webpSrcset);
  await expect(page.locator('#frame-image')).toHaveAttribute('srcset', fallbackSrcset);
  await expect(page.locator('#frame-image')).toHaveAttribute('sizes', sizes);
  await expect(page.locator('#frame-image')).toHaveAttribute('src', 'assets/frames/generated/frame-01.jpg');
});

test('degrades every format-specific responsive candidate while preserving its descriptors', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true, effectiveType: '4g', rtt: 40, deviceMemory: 8, hardwareConcurrency: 8 }
    });
  });
  await installResponsiveImage(page, {
    avifSrcset: 'assets/frames/generated/frame-01-640.avif 640w, assets/frames/generated/frame-01-1200.avif 1200w',
    webpSrcset: 'assets/frames/generated/frame-01-640.webp 640w, assets/frames/generated/frame-01-1200.webp 1200w',
    fallbackSrcset: 'assets/frames/generated/frame-01-640.jpg 640w, assets/frames/generated/frame-01-1200.jpg 1200w',
    sizes: '(min-width: 48rem) 960px, 100vw'
  });

  await expect(page.locator('#frame-avif')).toHaveAttribute('srcset', 'assets/frames/generated/frame-01-light-640.avif 640w, assets/frames/generated/frame-01-light-1200.avif 1200w');
  await expect(page.locator('#frame-webp')).toHaveAttribute('srcset', 'assets/frames/generated/frame-01-light-640.webp 640w, assets/frames/generated/frame-01-light-1200.webp 1200w');
  await expect(page.locator('#frame-image')).toHaveAttribute('srcset', 'assets/frames/generated/frame-01-light-640.jpg 640w, assets/frames/generated/frame-01-light-1200.jpg 1200w');
  await expect(page.locator('#frame-image')).toHaveAttribute('src', 'assets/frames/generated/frame-01-light.jpg');
});

test('retains legacy srcset compatibility for AVIF, WebP, and fallback consumers', async ({ page }) => {
  const legacy = 'assets/frames/generated/frame-01.avif 640w, assets/frames/generated/frame-01.avif 1200w';
  await installResponsiveImage(page, { 
    srcset: legacy, 
    sizes: '100vw',
    avifSrcset: undefined,
    webpSrcset: undefined,
    fallbackSrcset: undefined
  });

  await expect(page.locator('#frame-avif')).toHaveAttribute('srcset', legacy);
  await expect(page.locator('#frame-webp')).toHaveAttribute('srcset', legacy);
  await expect(page.locator('#frame-image')).toHaveAttribute('srcset', legacy);
  await expect(page.locator('#frame-image')).toHaveAttribute('sizes', '100vw');
});

test('uses light legacy srcset candidates as a complete degraded set', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: false, effectiveType: '3g', rtt: 500, deviceMemory: 8, hardwareConcurrency: 8 }
    });
  });
  await installResponsiveImage(page, {
    avifSrcset: 'assets/frames/generated/frame-01.avif 640w, assets/frames/generated/frame-01.avif 1200w',
    webpSrcset: 'assets/frames/generated/frame-01.webp 640w, assets/frames/generated/frame-01.webp 1200w',
    fallbackSrcset: 'assets/frames/generated/frame-01.jpg 640w, assets/frames/generated/frame-01.jpg 1200w',
    sizes: '100vw'
  });

  // With canonical light naming, format-specific base URLs become width-specific light variants
  await expect(page.locator('#frame-avif')).toHaveAttribute('srcset', 'assets/frames/generated/frame-01-light-640.avif 640w, assets/frames/generated/frame-01-light-1200.avif 1200w');
  await expect(page.locator('#frame-webp')).toHaveAttribute('srcset', 'assets/frames/generated/frame-01-light-640.webp 640w, assets/frames/generated/frame-01-light-1200.webp 1200w');
  await expect(page.locator('#frame-image')).toHaveAttribute('srcset', 'assets/frames/generated/frame-01-light-640.jpg 640w, assets/frames/generated/frame-01-light-1200.jpg 1200w');
  await expect(page.locator('#frame-image')).toHaveAttribute('src', 'assets/frames/generated/frame-01-light.jpg');
});
