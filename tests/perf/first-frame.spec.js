import { test, expect } from '@playwright/test';

const storyUrl = '/?story=tests/fixtures/story.json';
const productionStoryUrl = '/?story=src/data/story.json';

async function configureReferenceNetwork(page) {
  if (page.context().browser()?.browserType().name() !== 'chromium') return;
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.clearBrowserCache');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 170,
    downloadThroughput: (9 * 1024 * 1024) / 8,
    uploadThroughput: (2 * 1024 * 1024) / 8
  });
}

async function measureVisibleFrame(page, frameId, url = storyUrl) {
  await page.goto(url, { waitUntil: 'commit' });
  await page.waitForFunction((id) => {
    const image = document.querySelector('#frame-image');
    const player = document.querySelector('#player');
    return player?.dataset.frameId === id && image && !image.hidden && image.complete && image.naturalWidth > 0;
  }, frameId);
  return page.evaluate(() => performance.now());
}

async function measureVisibleFrames(page, frameIds) {
  await page.goto(productionStoryUrl, { waitUntil: 'commit' });
  const samples = [];
  for (const frameId of frameIds) {
    await page.waitForFunction((id) => {
      const image = document.querySelector('#frame-image');
      const player = document.querySelector('#player');
      return player?.dataset.frameId === id && image && !image.hidden && image.complete && image.naturalWidth > 0;
    }, frameId);
    samples.push(await page.evaluate(() => {
      const image = document.querySelector('#frame-image');
      const resource = performance.getEntriesByType('resource').findLast((entry) => entry.name === image.currentSrc);
      if (!resource) throw new Error(`Missing resource timing for ${image.currentSrc}`);
      return performance.now() - resource.startTime;
    }));
  }
  return samples;
}

function percentile75(values) {
  return [...values].sort((left, right) => left - right)[Math.ceil(values.length * 0.75) - 1];
}

test.describe('reference cold-cache frame arrival', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'The declared network profile is measured in Chromium.');
  test.setTimeout(120_000);

  test('SC-001 reaches the second visible frame within 10 seconds at p75', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const samples = [];
    try {
      for (let index = 0; index < 3; index += 1) {
        const page = await context.newPage();
        await configureReferenceNetwork(page);
        // T212: measured against src/data/story.json, not the fixture. The
        // fixture's frames are ~1 KB SVGs, so the <2.5 s and <10 s headline
        // budgets were being verified against assets that never ship.
        samples.push(await measureVisibleFrame(page, 'frame-02', productionStoryUrl));
        await page.close();
      }
    } finally {
      await context.close();
    }
    const p75 = percentile75(samples);
    expect(p75).toBeLessThan(10_000);
  });

  test('SC-019 shows the first visible frame within 2.5 seconds at p75', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const samples = [];
    try {
      for (let index = 0; index < 3; index += 1) {
        const page = await context.newPage();
        await configureReferenceNetwork(page);
        // T212: see above — the cold first-frame gate must measure production bytes.
        samples.push(await measureVisibleFrame(page, 'frame-01', productionStoryUrl));
        await page.close();
      }
    } finally {
      await context.close();
    }
    const p75 = percentile75(samples);
    expect(p75).toBeLessThan(2_500);
  });

  test('SC-008 shows every production frame within 3 seconds on cold 4G at p75', async ({ browser }) => {
    const frameIds = ['frame-01', 'frame-02', 'frame-03', 'frame-04'];
    const samples = Object.fromEntries(frameIds.map((frameId) => [frameId, []]));
    for (let index = 0; index < 3; index += 1) {
      const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
      try {
        const page = await context.newPage();
        await configureReferenceNetwork(page);
        const measurements = await measureVisibleFrames(page, frameIds);
        frameIds.forEach((frameId, frameIndex) => samples[frameId].push(measurements[frameIndex]));
        await page.close();
      } finally {
        await context.close();
      }
    }
    for (const frameId of frameIds) {
      expect(percentile75(samples[frameId])).toBeLessThan(3_000);
    }
  });

  test('SC-008 shows the warm production first frame within 1.5 seconds at p75', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    try {
      const page = await context.newPage();
      await configureReferenceNetwork(page);
      await measureVisibleFrame(page, 'frame-01', productionStoryUrl);
      const samples = [];
      for (let index = 0; index < 3; index += 1) {
        samples.push(await measureVisibleFrame(page, 'frame-01', productionStoryUrl));
      }
      const warmCacheUsed = await page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('/src/') && entry.transferSize === 0));
      expect(warmCacheUsed).toBe(true);
      expect(percentile75(samples)).toBeLessThan(1_500);
    } finally {
      await context.close();
    }
  });

  /**
   * The wall-clock gates above cannot say WHY a budget is missed, only that it
   * is. This pins the structural cause instead: the LCP image used to sit three
   * serialized round trips deep — document, then the bundle, then
   * `await loadStory()`, then `this.image.src` — because index.html shipped an
   * empty <picture> that only JavaScript could fill. Under the Lighthouse
   * mobile profile (562.5 ms simulated request latency) four dependent round
   * trips cost ~2.25 s before a 3.6 KB image began transferring, and LCP
   * measured 2.87 s against a 2.5 s budget.
   *
   * scripts/build.mjs now writes the first frame into the static shell, so the
   * preload scanner fetches it during the initial parse, in the same batch as
   * the CSS and the bundle. That ordering is the fix; the numbers are a
   * consequence. Asserting it here means a future shell edit that empties the
   * <picture> again fails on the cause rather than three months later on LCP.
   *
   * Runs against dist/ because that is the only build with the injection — the
   * dev and e2e servers serve index.html verbatim.
   */
  test('the first frame image is requested in the initial batch, not after the manifest resolves', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    try {
      const page = await context.newPage();
      await configureReferenceNetwork(page);
      await page.goto('/dist/', { waitUntil: 'commit' });
      // Wait for the manifest to have RESOLVED, not merely started: a resource
      // timing entry only exists once the response has landed, and the whole
      // point of the comparison is where the image started relative to that.
      await expect(page.locator('#player')).toHaveAttribute('data-frame-id', /frame-01/);
      const timeline = await page.evaluate(() => {
        const startedAt = (name) => performance.getEntriesByType('resource').find((entry) => entry.name.includes(name))?.startTime ?? null;
        return { image: startedAt('frame-01'), manifest: startedAt('story.json') };
      });
      expect(timeline.image).not.toBeNull();
      expect(timeline.manifest).not.toBeNull();
      // The image must not be waiting on the manifest it used to be derived from.
      expect(timeline.image).toBeLessThan(timeline.manifest);
    } finally {
      await context.close();
    }
  });
});
