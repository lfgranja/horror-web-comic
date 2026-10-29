import { test, expect } from '@playwright/test';

// Extended degradation coverage (FR-031 / SC-020 / FR-015 / SC-015 / default fallback).
//
// Determinism notes:
// - No control-bar clicks: the player is settled via `window.__cinematicPlayer`
//   (`pause()` / `moveTo(i, false)`) and the current frame is always read back
//   from `#player[data-frame-id]` instead of being assumed.
// - Each test uses a fresh browser context (Playwright default), so persisted
//   progress always starts at frame-01.

const FRAMES = ['frame-01', 'frame-02', 'frame-03', 'frame-04'];
const SCENES = [0, 0, 1, 1];
const LIGHT_URL = /-light(?:-\d+)?\.(?:avif|webp|jpg)$/;
const STANDARD_FRAME_REQUEST = /\/frame-0\d(?:-\d+)?\.(?:avif|webp|jpg)$/;

// FR-015 enumerates the slow profiles by name: `slow-2g`, `2g`, `3g`. The two
// profiles below pin `2g` and `slow-2g` with `rtt` deliberately kept below the
// 300 ms heuristic in capabilities.js, so the enumerated effective type is the
// ONLY thing that degrades the session. If a name were dropped from the
// detection list the profile would silently stop degrading and every test in
// this file would catch it. (`slow-network`/3g keeps its realistic 500 ms rtt
// and is therefore also covered by the heuristic, not by its name alone.)
const PROFILE_2G = {
  name: '2g',
  effectiveType: '2g',
  rtt: 150,
  connection: { saveData: false, effectiveType: '2g', rtt: 150, deviceMemory: 8, hardwareConcurrency: 8 }
};
const PROFILE_SLOW_2G = {
  name: 'slow-2g',
  effectiveType: 'slow-2g',
  rtt: 250,
  connection: { saveData: false, effectiveType: 'slow-2g', rtt: 250, deviceMemory: 8, hardwareConcurrency: 8 }
};
// The enumerated-by-name slow profiles, i.e. those whose degradation depends
// on the effective type and not on saveData or the rtt heuristic.
const SLOW_CONNECTION_PROFILES = [PROFILE_2G, PROFILE_SLOW_2G];

const PROFILES = [
  { name: 'save-data', connection: { saveData: true, effectiveType: '4g', rtt: 40, deviceMemory: 8, hardwareConcurrency: 8 } },
  { name: 'slow-network', connection: { saveData: false, effectiveType: '3g', rtt: 500, deviceMemory: 8, hardwareConcurrency: 8 } },
  PROFILE_2G,
  PROFILE_SLOW_2G
];

function candidateUrls(value) {
  return (value ?? '').split(',').map((candidate) => candidate.trim().split(/\s+/)[0]).filter(Boolean);
}

function candidateDescriptors(value) {
  return (value ?? '')
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[1])
    .filter(Boolean);
}

async function installSignals(page, connection) {
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

async function installBenignSignals(page) {
  await page.addInitScript(() => {
    // Absence of degradation signals: no NetworkInformation, ample memory/CPU.
    try {
      Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined });
    } catch { /* keep platform default */ }
    try {
      Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 8 });
    } catch { /* keep platform default */ }
    try {
      Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 8 });
    } catch { /* keep platform default */ }
    const NativeImage = window.Image;
    window.__preloadedImages = [];
    window.Image = class extends NativeImage {
      constructor(...args) {
        super(...args);
        window.__preloadedImages.push(this);
      }
    };
  });
}

// Open the player and settle it into a deterministic paused state without
// racing the `#play-toggle` click against auto-advance.
async function openSettled(page, story = 'src/data/story.json') {
  await page.goto(`/?story=${encodeURIComponent(story)}`);
  await expect(page.locator('#player')).toBeVisible();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', /.+/);
  await expect(page.locator('#frame-image')).toBeVisible();
  await page.evaluate(() => window.__cinematicPlayer.pause());
}

async function settleFrame(page, index) {
  await page.evaluate((i) => window.__cinematicPlayer.moveTo(i, false), index);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', FRAMES[index]);
  await expect(page.locator('#frame-image')).toBeVisible();
}

async function frameMediaState(page) {
  return page.evaluate(() => {
    const player = window.__cinematicPlayer;
    const image = document.querySelector('#frame-image');
    return {
      frameId: document.querySelector('#player').dataset.frameId,
      src: image.getAttribute('src') ?? '',
      avif: document.querySelector('#frame-avif').getAttribute('srcset') ?? '',
      webp: document.querySelector('#frame-webp').getAttribute('srcset') ?? '',
      fallback: image.getAttribute('srcset') ?? '',
      currentSrc: image.currentSrc,
      width: image.naturalWidth,
      height: image.naturalHeight,
      transition: document.querySelector('#frame-stage').dataset.transition,
      duration: document.querySelector('#frame-stage').style.getPropertyValue('--transition-duration'),
      degraded: document.querySelector('#player').dataset.degraded,
      preloaded: window.__preloadedImages.map((img) => img.src)
    };
  });
}

for (const profile of PROFILES) {
  test(`${profile.name} serves light candidates that all exist on disk within 150KB and 1280px`, async ({ page }) => {
    await installSignals(page, profile.connection);
    const requestedImages = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'image' && request.url().includes('/assets/frames/generated/')) {
        requestedImages.push(request.url());
      }
    });
    await openSettled(page);
    await expect(page.locator('#player')).toHaveAttribute('data-degraded', 'true');

    const seenUrls = new Set();
    for (let index = 0; index < FRAMES.length; index += 1) {
      await settleFrame(page, index);
      const state = await frameMediaState(page);
      expect(state.frameId).toBe(FRAMES[index]);

      // Every candidate in every format slot must carry the light marker,
      // and every width descriptor must be clamped to <= 1280w.
      for (const value of [state.src, state.avif, state.webp, state.fallback]) {
        for (const url of candidateUrls(value)) expect(url).toMatch(LIGHT_URL);
        for (const descriptor of candidateDescriptors(value)) {
          const width = /^(\d+)w$/.exec(descriptor);
          if (width) expect(Number(width[1])).toBeLessThanOrEqual(1280);
        }
      }
      expect(state.currentSrc).toMatch(LIGHT_URL);
      expect(state.width).toBeGreaterThan(0);
      expect(state.width).toBeLessThanOrEqual(1280);
      expect(state.height).toBeGreaterThan(0);
      expect(state.height).toBeLessThanOrEqual(1280);

      for (const value of [state.src, state.avif, state.webp, state.fallback]) {
        for (const url of candidateUrls(value)) {
          const absolute = new URL(url, page.url()).href;
          if (seenUrls.has(absolute)) continue;
          seenUrls.add(absolute);
          const response = await page.request.get(absolute);
          expect(response.ok()).toBe(true);
          expect((await response.body()).byteLength).toBeLessThanOrEqual(150 * 1024);
        }
      }
    }

    // Wire-level proof: light media was requested for every frame and no
    // standard (non-light) frame media was ever requested.
    for (const frameId of FRAMES) {
      expect(requestedImages.some((url) => new RegExp(`/${frameId}-light(?:-\\d+)?\\.`).test(url))).toBe(true);
    }
    expect(requestedImages.filter((url) => STANDARD_FRAME_REQUEST.test(url))).toEqual([]);
  });
}

for (const profile of PROFILES) {
  test(`${profile.name} collapses every non-cut transition to an instant cut without losing narrative`, async ({ page }) => {
    await installSignals(page, profile.connection);
    await openSettled(page);

    const narrative = [];
    for (let index = 0; index < FRAMES.length; index += 1) {
      await settleFrame(page, index);
      const entry = await page.evaluate(() => {
        const player = window.__cinematicPlayer;
        const item = player.frames[player.index];
        return {
          frameId: document.querySelector('#player').dataset.frameId,
          sceneIndex: item.sceneIndex,
          counter: document.querySelector('#frame-counter').textContent,
          alt: document.querySelector('#frame-image').alt,
          description: item.frame.description,
          transition: document.querySelector('#frame-stage').dataset.transition,
          duration: document.querySelector('#frame-stage').style.getPropertyValue('--transition-duration')
        };
      });
      narrative.push(entry);
      // FR-031: any transition other than cut/none becomes an instant cut.
      expect(entry.transition).toBe('cut');
      expect(entry.duration).toBe('0ms');
    }

    // Narrative integrity: order, scenes, counter, and text all preserved.
    expect(narrative.map((entry) => entry.frameId)).toEqual(FRAMES);
    expect(narrative.map((entry) => entry.sceneIndex)).toEqual(SCENES);
    expect(narrative.map((entry) => entry.counter)).toEqual(['1 / 4', '2 / 4', '3 / 4', '4 / 4']);
    for (const entry of narrative) {
      expect(entry.alt.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });
}

for (const profile of PROFILES) {
  test(`${profile.name} preloads no future frame image and restricts audio to the current scene`, async ({ page }) => {
    await installSignals(page, profile.connection);
    const requestedImages = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'image' && request.url().includes('/assets/frames/generated/')) {
        requestedImages.push(request.url());
      }
    });
    await openSettled(page);
    const startFrame = await page.locator('#player').getAttribute('data-frame-id');
    expect(startFrame).toBe('frame-01');

    // Dwell on the first frame: nothing for future frames may be fetched.
    await page.waitForTimeout(600);
    expect(requestedImages.filter((url) => /frame-0[234]/.test(url))).toEqual([]);

    const audioPolicy = () => page.evaluate(() => window.__cinematicPlayer.audio.allElements().map((element) => ({
      key: element.dataset.trackKey,
      preload: element.preload,
      // The resolved source is parked on the element until the first play attempt
      // arms it (see AudioManager.assignSource), so `element.src` would read ''
      // here and could no longer tell "light variant" apart from "not armed yet".
      src: element.dataset.trackSource
    })));

    // FR-031: every audio track is the light variant.
    for (const track of await audioPolicy()) expect(track.src).toContain('-light.');

    // FR-015 on scene 0: current scene audio may use metadata, everything
    // else must not preload.
    let policy = await audioPolicy();
    expect(policy.find((track) => track.key === 'scene-0').preload).toBe('metadata');
    expect(policy.find((track) => track.key === 'scene-1').preload).toBe('none');
    expect(policy.find((track) => track.key === 'frame-frame-03').preload).toBe('none');

    // Step through the remaining frames: each navigation loads only that
    // frame, never a future one, and `new Image()` preloading never fires.
    for (let index = 1; index < FRAMES.length; index += 1) {
      await settleFrame(page, index);
      const future = FRAMES.slice(index + 1);
      expect(requestedImages.filter((url) => future.some((id) => url.includes(`/${id}`)))).toEqual([]);
      const { preloaded } = await frameMediaState(page);
      expect(preloaded).toEqual([]);
    }

    // FR-015 on scene 1: preload policy follows the current scene.
    policy = await audioPolicy();
    expect(policy.find((track) => track.key === 'scene-1').preload).toBe('metadata');
    expect(policy.find((track) => track.key === 'scene-0').preload).toBe('none');
    expect(policy.find((track) => track.key === 'frame-frame-03').preload).toBe('metadata');
  });
}

for (const profile of SLOW_CONNECTION_PROFILES) {
  test(`FR-015 ${profile.name} degrades on the enumerated effective type alone`, async ({ page }) => {
    await installSignals(page, profile.connection);
    const requestedImages = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'image' && request.url().includes('/assets/frames/generated/')) {
        requestedImages.push(request.url());
      }
    });
    await openSettled(page);
    await expect(page.locator('#player')).toHaveAttribute('data-degraded', 'true');

    // Premise guard: nothing but `effectiveType` may degrade this session.
    const capabilities = await page.evaluate(() => {
      const caps = window.__cinematicPlayer.capabilities;
      return {
        rtt: caps.rtt,
        saveData: caps.saveData,
        slowConnection: caps.slowConnection,
        shouldDegrade: caps.shouldDegrade,
        imageVariant: caps.imageVariant,
        audioVariant: caps.audioVariant
      };
    });
    expect(capabilities.rtt).toBeLessThanOrEqual(300);
    expect(capabilities.saveData).toBe(false);
    // The enumerated name is what the policy must react to.
    expect(capabilities.slowConnection).toBe(true);
    expect(capabilities.shouldDegrade).toBe(true);
    expect(capabilities.imageVariant).toBe('light');
    expect(capabilities.audioVariant).toBe('light');

    // Preload restriction: render() invokes preloadNext() synchronously, so by
    // the time the frame is settled any speculative next-frame Image would
    // already have been constructed and requested.
    expect(await page.evaluate(() => window.__preloadedImages.map((image) => image.src))).toEqual([]);
    expect(requestedImages.filter((url) => /frame-0[234]/.test(url))).toEqual([]);

    // Audio: only the current scene may reach for metadata; the next scene and
    // the off-scene frame track must not preload.
    const policy = await page.evaluate(() => window.__cinematicPlayer.audio.allElements().map((element) => ({
      key: element.dataset.trackKey,
      preload: element.preload
    })));
    expect(policy.find((track) => track.key === 'scene-0').preload).toBe('metadata');
    expect(policy.find((track) => track.key === 'scene-1').preload).toBe('none');
    expect(policy.find((track) => track.key === 'frame-frame-03').preload).toBe('none');

    // Motion: frame-01 authors fade/600ms, which degradation must collapse to
    // an instant cut.
    await expect(page.locator('#frame-stage')).toHaveAttribute('data-transition', 'cut');
    await expect(page.locator('#frame-stage')).toHaveAttribute('style', /--transition-duration: 0ms/);
  });
}

for (const profile of PROFILES) {
  test(`${profile.name} keeps identical loaded stage geometry across every frame`, async ({ page }) => {
    await installSignals(page, profile.connection);
    await openSettled(page);

    const geometries = [];
    for (let index = 0; index < FRAMES.length; index += 1) {
      await settleFrame(page, index);
      geometries.push(await page.evaluate(() => {
        const rect = document.querySelector('#frame-stage').getBoundingClientRect();
        return { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height };
      }));
    }

    // On narrow viewports the in-flow description legitimately sizes the
    // stage per frame, so only the width (reserved by the full-bleed image
    // box) is asserted there; on desktop the whole box must be stable.
    const viewportWidth = (await page.viewportSize()?.width) ?? 1280;
    if (viewportWidth < 768) {
      for (const geometry of geometries.slice(1)) expect(geometry.width).toBe(geometries[0].width);
    } else {
      for (const geometry of geometries.slice(1)) expect(geometry).toEqual(geometries[0]);
    }
  });
}

test('absence of degradation signals falls back to standard media and authored motion', async ({ page }) => {
  await installBenignSignals(page);
  const requestedImages = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'image' && request.url().includes('/assets/frames/generated/')) {
      requestedImages.push(request.url());
    }
  });
  await openSettled(page);

  await expect(page.locator('#player')).toHaveAttribute('data-degraded', 'false');
  const state = await frameMediaState(page);
  expect(state.frameId).toBe('frame-01');
  // Standard (non-light) delivery in every slot.
  expect(state.src).toMatch(/frame-01\.jpg$/);
  for (const value of [state.avif, state.webp, state.fallback]) {
    expect(candidateUrls(value).length).toBeGreaterThan(0);
    for (const url of candidateUrls(value)) expect(url).not.toContain('-light');
  }
  expect(state.currentSrc).not.toContain('-light');
  // Authored motion is honored (frame-01 authors fade/600ms), not forced cut.
  expect(state.transition).toBe('fade');
  expect(state.duration).toBe('600ms');
  // Next-frame image preloading is active again.
  expect(state.preloaded.length).toBeGreaterThan(0);
  // Current and next scene audio preload fully.
  const policy = await page.evaluate(() => window.__cinematicPlayer.audio.allElements().map((element) => ({
    key: element.dataset.trackKey,
    preload: element.preload,
    src: element.dataset.trackSource
  })));
  expect(policy.find((track) => track.key === 'scene-0').preload).toBe('auto');
  expect(policy.find((track) => track.key === 'scene-1').preload).toBe('auto');
  expect(policy.find((track) => track.key === 'frame-frame-03').preload).toBe('auto');
  for (const track of policy) expect(track.src).not.toContain('-light.');
});
