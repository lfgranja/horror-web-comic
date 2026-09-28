import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame } from '../e2e/helpers.js';

async function measureRaf(page, durationMs) {
  return page.evaluate((duration) => new Promise((resolve) => {
    let frames = 0;
    let first = 0;
    let last = 0;
    const tick = (now) => {
      if (!first) first = now;
      else {
        frames += 1;
        last = now;
      }
      if (now - first < duration) requestAnimationFrame(tick);
      else resolve({ frames, elapsed: Math.max(1, last - first), fps: frames * 1000 / Math.max(1, last - first) });
    };
    requestAnimationFrame(tick);
  }), durationMs);
}

test('SC-018 measures at least 60 fps during an actual transition', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await waitForFrame(page, 'frame-01');
  const baseline = await measureRaf(page, 300);
  testInfo.annotations.push({ type: 'raf_baseline_fps', description: `Host baseline ${baseline.fps.toFixed(2)} fps` });

  const result = await page.evaluate(async () => {
    const stage = document.querySelector('#frame-stage');
    const image = document.querySelector('#frame-image');
    const button = document.querySelector('#next-frame');
    const samples = [];
    let active = false;
    let durationMs = 0;
    let started = 0;
    let previous = 0;
    // Wait for the animation to be *live*, not merely for the transition to be
    // announced. Two documented facts make the difference:
    //
    //   - player.js:541-545 publishes `data-transition` three lines BEFORE it
    //     publishes `--transition-duration`, deliberately (see the T197 comment at
    //     player.js:533-540). Observing the attribute alone therefore samples the
    //     previous frame's duration — for this fixture a `cut`/0ms frame, so the
    //     measurement came out as 0 on every engine.
    //   - player.css:373 binds the keyframes to
    //     `.frame-stage[data-transition='…']:not([data-image-loading='true'])`, so the
    //     animation only starts once handleImageLoad() reveals the image.
    //
    // Settling on the image being revealed as well is what makes this measure the
    // transition that actually runs.
    const settle = () => {
      if (active) return;
      if (stage.dataset.transition === 'cut' || stage.dataset.imageLoading === 'true') return;
      active = true;
      durationMs = Number.parseFloat(getComputedStyle(image).animationDuration) * 1000;
      started = performance.now();
      previous = started;
    };
    const observer = new MutationObserver(settle);
    observer.observe(stage, { attributes: true, attributeFilter: ['data-transition', 'data-image-loading'] });
    settle();
    button.click();
    await new Promise((resolve) => {
      const collect = (now) => {
        if (active) {
          if (previous) samples.push(now - previous);
          previous = now;
        }
        if (!active || now - started < durationMs) requestAnimationFrame(collect);
        else resolve();
      };
      requestAnimationFrame(collect);
    });
    observer.disconnect();
    return { active, durationMs, samples };
  });
  expect(result.active).toBe(true);
  expect(result.durationMs).toBeGreaterThan(0);
  // The resolved transition for the frame this test enters — frame-02 in
  // tests/fixtures/story.json — is fade/120ms. Asserting the measured value against
  // it, rather than only against zero, means a future reordering of
  // player.js:541-545 that re-introduces the stale read fails here with a wrong
  // number instead of silently degrading the measurement again. This fixture's
  // `cut` frame is what made the old bug produce a bare 0; a different fixture would
  // have produced a plausible-looking wrong value, which is harder to notice.
  expect(result.durationMs, 'the measured transition must be the one the fixture declares').toBeCloseTo(120, 0);
  expect(result.samples.length).toBeGreaterThan(1);
  const elapsed = result.samples.reduce((sum, value) => sum + value, 0);
  const fps = result.samples.length * 1000 / Math.max(1, elapsed);
  testInfo.annotations.push({ type: 'transition_fps', description: `Measured ${fps.toFixed(2)} fps during transition` });
  expect(fps).toBeGreaterThanOrEqual(60);
});
