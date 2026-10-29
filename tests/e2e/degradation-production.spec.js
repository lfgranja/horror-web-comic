import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

const productionFrames = ['frame-01', 'frame-02', 'frame-03', 'frame-04'];
const degradationProfiles = [
  {
    name: 'save-data',
    connection: { saveData: true, effectiveType: '4g', rtt: 40, deviceMemory: 8, hardwareConcurrency: 8 }
  },
  {
    name: 'slow-network',
    connection: { saveData: false, effectiveType: '3g', rtt: 500, deviceMemory: 8, hardwareConcurrency: 8 }
  }
];

function candidateUrls(value) {
  return value.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]).filter(Boolean);
}

async function installDegradationSignals(page, connection) {
  await page.addInitScript((profile) => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: profile });
    const NativeImage = window.Image;
    window.__preloadedImages = [];
    window.Image = class extends NativeImage {
      constructor(...args) {
        super(...args);
        window.__preloadedImages.push(this);
      }
    };
  }, connection);
}

async function documentGeometry(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('#frame-stage').getBoundingClientRect();
    const controls = document.querySelector('.control-bar').getBoundingClientRect();
    return {
      stage: { x: stage.x, y: stage.y + scrollY, width: stage.width, height: stage.height },
      controls: { x: controls.x, y: controls.y + scrollY, width: controls.width, height: controls.height }
    };
  });
}

for (const profile of degradationProfiles) {
  test(`${profile.name} serves only bounded light media across every production frame`, async ({ page }) => {
    await installDegradationSignals(page, profile.connection);
    const requestedImages = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'image' && request.url().includes('/assets/frames/generated/')) requestedImages.push(request.url());
    });
    await openPlayer(page, 'src/data/story.json', { pause: true });
    await expect(page.locator('#player')).toHaveAttribute('data-degraded', 'true');

    for (const frameId of productionFrames) {
      if (frameId !== 'frame-01') {
        await page.locator('#next-frame').click();
        await expect(page.locator('#player')).toHaveAttribute('data-frame-id', frameId);
      }
      await expect(page.locator('#frame-image')).toBeVisible();
      await expect(page.locator('#frame-stage')).toHaveAttribute('data-transition', 'cut');
      await expect(page.locator('#frame-stage')).toHaveAttribute('style', /--transition-duration: 0ms/);

      const state = await page.evaluate(() => {
        const player = window.__cinematicPlayer;
        const image = document.querySelector('#frame-image');
        const avif = document.querySelector('#frame-avif').getAttribute('srcset') ?? '';
        const webp = document.querySelector('#frame-webp').getAttribute('srcset') ?? '';
        const fallback = image.getAttribute('srcset') ?? '';
        const values = [image.getAttribute('src') ?? '', avif, webp, fallback];
        const currentScene = player.frames[player.index].sceneIndex;
        return {
          values,
          currentSrc: image.currentSrc,
          width: image.naturalWidth,
          height: image.naturalHeight,
          audioSources: player.audio.allElements().map((element) => element.dataset.trackSource),
          audioPreloads: player.audio.allElements().map((element) => ({ key: element.dataset.trackKey, preload: element.preload })),
          currentScene,
          preloadedImageSources: window.__preloadedImages.map((preload) => preload.src)
        };
      });

      for (const value of state.values) {
        for (const url of candidateUrls(value)) expect(url).toMatch(/-light(?:-\d+)?\.(?:avif|webp|jpg)$/);
      }
      expect(state.currentSrc).toMatch(/-light(?:-\d+)?\.(?:avif|webp|jpg)$/);
      expect(state.width).toBeGreaterThan(0);
      expect(state.width).toBeLessThanOrEqual(1280);
      expect(state.height).toBeLessThanOrEqual(1280);
      expect(state.audioSources.length).toBeGreaterThan(0);
      expect(state.audioSources.every((source) => source.includes('-light.'))).toBe(true);
      expect(state.preloadedImageSources).toEqual([]);
      expect(requestedImages.some((url) => new RegExp(`/${frameId}-light(?:-\\d+)?\.`).test(url))).toBe(true);
      expect(requestedImages.some((url) => new RegExp(`/${frameId}(?:-\\d+)?\\.(?:avif|webp|jpg)$`).test(url))).toBe(false);

      const response = await page.request.get(state.currentSrc);
      expect(response.ok()).toBe(true);
      expect((await response.body()).byteLength).toBeLessThanOrEqual(150 * 1024);

      for (const track of state.audioPreloads) {
        const sceneNumber = track.key.startsWith('scene-') ? Number(track.key.slice('scene-'.length)) : null;
        if (sceneNumber !== null && sceneNumber !== state.currentScene) expect(track.preload).toBe('none');
      }
    }
  });
}

for (const profile of degradationProfiles) {
  test(`${profile.name} keeps reserved stage geometry and CLS below 0.1 while every image loads`, async ({ page }) => {
    await installDegradationSignals(page, profile.connection);
    await page.addInitScript(() => {
      globalThis.__layoutShifts = [];
      new PerformanceObserver((list) => {
        globalThis.__layoutShifts.push(...list.getEntries());
      }).observe({ type: 'layout-shift', buffered: true });
    });
    let delayedImages = 0;
    await page.route('**/assets/frames/generated/frame-*', async (route) => {
      delayedImages += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.continue();
    });

    await openPlayer(page, 'src/data/story.json', { pause: true });
    const initialGeometry = await documentGeometry(page);

    for (const frameId of productionFrames.slice(1)) {
      // FR-015/SC-008: the reserved placeholder and the accessible loading state
      // must stay observable while the frame image is in flight, and the stage
      // geometry must not move while that happens.
      //
      // The placeholder is asserted from INSIDE the page rather than by polling
      // from the test: navigation is coalesced (400ms) so `render()` runs in a
      // later task than the click, and a 250ms route delay means the image can
      // win the race against an external poll. Observing the mutation from
      // inside the page records the real pre-load state and the geometry at
      // that instant, so the assertion is deterministic and still non-probative.
      await page.evaluate((expected) => {
        globalThis.__frameProbe = { seen: null };
        const stage = document.querySelector('#frame-stage');
        const placeholder = document.querySelector('#frame-placeholder');
        const player = document.querySelector('#player');
        const sample = () => {
          const stageRect = document.querySelector('#frame-stage').getBoundingClientRect();
          const controlsRect = document.querySelector('.control-bar').getBoundingClientRect();
          return {
            frameId: player.dataset.frameId,
            imageLoading: stage.dataset.imageLoading,
            busy: stage.getAttribute('aria-busy'),
            placeholderVisible: !placeholder.hidden && placeholder.getAttribute('aria-hidden') === 'false',
            // Same shape as documentGeometry(), so the in-load sample can be
            // compared against the initial geometry directly.
            stage: {
              x: stageRect.x,
              y: stageRect.y + scrollY,
              width: stageRect.width,
              height: stageRect.height
            },
            controls: {
              x: controlsRect.x,
              y: controlsRect.y + scrollY,
              width: controlsRect.width,
              height: controlsRect.height
            }
          };
        };
        const observer = new MutationObserver(() => {
          if (player.dataset.frameId !== expected) return;
          if (stage.dataset.imageLoading !== 'true' || placeholder.hidden) return;
          globalThis.__frameProbe.seen = sample();
          observer.disconnect();
        });
        observer.observe(stage, { attributes: true, attributeFilter: ['data-image-loading'] });
        observer.observe(placeholder, { attributes: true, attributeFilter: ['hidden'] });
        document.querySelector('#next-frame').click();
      }, frameId);

      await expect(page.locator('#player')).toHaveAttribute('data-frame-id', frameId);
      // The in-page probe above already observed the placeholder while the image
      // was in flight. Polling `#frame-placeholder` from here would race the
      // 250ms route delay and flake once the image wins, so the probe is the
      // single source of truth for the pre-load state.
      const probe = await page.evaluate(() => globalThis.__frameProbe.seen);
      expect(probe, `no in-flight loading state observed for ${frameId}`).not.toBeNull();
      expect(probe.frameId).toBe(frameId);
      expect(probe.imageLoading).toBe('true');
      expect(probe.busy).toBe('true');
      expect(probe.placeholderVisible).toBe(true);
      // The stage and control bar must already be at their final geometry while
      // the image is still loading, otherwise the load itself shifts the
      // controls (SC-015). Sampled inside the page, in the same task that
      // observed the loading state, so it cannot race the image.
      expect(probe.stage, `stage moved during load of ${frameId}`).toEqual(initialGeometry.stage);
      expect(probe.controls, `controls moved during load of ${frameId}`).toEqual(initialGeometry.controls);

      await expect(page.locator('#frame-image')).toBeVisible();
      expect(await documentGeometry(page)).toEqual(initialGeometry);
    }

    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const cls = await page.evaluate(() => globalThis.__layoutShifts.reduce((total, entry) => total + entry.value, 0));
    console.log('MEASURED CLS:', profile.name, cls);
    expect(delayedImages).toBeGreaterThanOrEqual(productionFrames.length);
    expect(cls).toBeLessThan(0.1);
  });
}
