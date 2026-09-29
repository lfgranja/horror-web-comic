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

// Advances one frame and samples rAF across the transition that actually runs.
// Returns the raw samples so the caller can derive fps, and the measured duration
// so it can be checked against the transition the manifest declares.
async function measureTransition(page) {
  return page.evaluate(async () => {
    const stage = document.querySelector('#frame-stage');
    const image = document.querySelector('#frame-image');
    const button = document.querySelector('#next-frame');
    const samples = [];
    let active = false;
    let armed = false;
    let durationMs = 0;
    let started = 0;
    let previous = 0;
    // Wait for the animation to be *live*, not merely for the transition to be
    // announced. Two documented facts make the difference:
    //
    //   - player.js:541-545 publishes `data-transition` three lines BEFORE it
    //     publishes `--transition-duration`, deliberately (see the T197 comment at
    //     player.js:533-540). Observing the attribute alone samples the
    //     previous frame's duration — for this fixture a `cut`/0ms frame, so the
    //     measurement came out as 0 on every engine.
    //   - player.css:373 binds the keyframes to
    //     `.frame-stage[data-transition='…']:not([data-image-loading='true'])`, so the
    //     animation only starts once handleImageLoad() reveals the image.
    //
    // Settling on the image being revealed as well is what makes this measure the
    // transition that actually runs.
    //
    // `armed` binds the measurement to the transition the click triggers. Without
    // it, a story whose FIRST frame is already animating would settle on that
    // frame's pre-existing state and then measure the click's transition against
    // it — reading `var(--transition-duration, 600ms)`'s fallback instead of the
    // declared value. The fixture hides this because its frame-01 is a `cut`, which
    // the guard above rejects; src/data/story.json's frame-01 is a fade/600ms and
    // trips it, reporting 600 where the manifest declares 700.
    const settle = () => {
      if (!armed || active) return;
      if (stage.dataset.transition === 'cut' || stage.dataset.imageLoading === 'true') return;
      active = true;
      durationMs = Number.parseFloat(getComputedStyle(image).animationDuration) * 1000;
      started = performance.now();
      previous = started;
    };
    const observer = new MutationObserver(settle);
    observer.observe(stage, { attributes: true, attributeFilter: ['data-transition', 'data-image-loading'] });
    armed = true;
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
}

function fpsOf(result) {
  const elapsed = result.samples.reduce((sum, value) => sum + value, 0);
  return result.samples.length * 1000 / Math.max(1, elapsed);
}

test('SC-018 measures at least 60 fps during an actual transition', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await waitForFrame(page, 'frame-01');
  const baseline = await measureRaf(page, 300);
  testInfo.annotations.push({ type: 'raf_baseline_fps', description: `Host baseline ${baseline.fps.toFixed(2)} fps` });

  const result = await measureTransition(page);
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
  const fps = fpsOf(result);
  testInfo.annotations.push({ type: 'transition_fps', description: `Measured ${fps.toFixed(2)} fps during transition` });
  expect(fps).toBeGreaterThanOrEqual(60);
});

// Evidence, not a gate. SC-018 above certifies a hard 60 fps number, and on CI
// that number is met by mobile-chromium, desktop-chromium and desktop-firefox but
// missed by both WebKit projects by roughly a factor of three, while those same
// WebKit hosts idle at ~62-65 fps. That leaves two explanations that this repo
// cannot currently tell apart:
//
//   1. the player's transition is genuinely expensive on WebKit, or
//   2. the fixture's frames are the problem. tests/fixtures/assets/frames/*.svg
//      are ~1 KB vector stand-ins, whereas src/data/story.json ships delivery
//      encoded rasters (assets/frames/generated/*.{avif,webp,jpg}) of the same
//      1200x800 geometry. first-frame.spec.js:63 already records this as T212 —
//      "the fixture's frames are ~1 KB SVGs, so the <2.5 s and <10 s headline
//      budgets were being verified against assets that never ship" — and migrated
//      SC-001/SC-019 to the production manifest for exactly that reason. This
//      spec never received the same migration.
//
// Measuring the identical transition on both stories in one run is what
// separates them, and it has to run in CI: the local development host cannot
// certify this gate (its idle rAF baseline drops to 12-22 fps on the desktop
// viewports, and it measures the SAME firefox+SVG combination at a 0.40
// transition/baseline ratio that CI certifies at 1.12).
//
// The threshold is deliberately NOT relaxed or moved here. Nothing below asserts
// a delivery number, because SC-018's delivery number is an open question for
// its owner and inventing one inside a measurement would settle it by accident.
// What is asserted is only that each arm produced a real measurement of a real,
// declared transition — the same failure class as the measurement race fixed in
// fps-transition-duration-race — so this cannot rot into a silent pass.
test('SC-018 records the fixture-versus-production transition comparison', async ({ page }, testInfo) => {
  const arms = [
    {
      label: 'fixture-svg',
      story: 'tests/fixtures/story.json',
      // frame-02 of the fixture declares fade/120ms.
      declaredDurationMs: 120,
    },
    {
      label: 'production-raster',
      story: 'src/data/story.json',
      // frame-02 of src/data/story.json declares dissolve/700ms. `dissolve` and
      // `fade` share the frame-fade keyframes (player.css:373-374), so the
      // measurement window is comparable across arms even though the type and
      // duration differ.
      declaredDurationMs: 700,
    },
  ];

  const measured = [];
  for (const arm of arms) {
    await page.setViewportSize({ width: 360, height: 800 });
    await openPlayer(page, arm.story, { pause: true });
    await waitForFrame(page, 'frame-01');
    const baseline = await measureRaf(page, 300);
    // Measurement capability, not a delivery budget — the same idea as
    // zz-ci-budgets.spec.js:81 ("a host produced no rAF samples, so it cannot
    // certify the frame budget, failing loudly instead of skipping"). A ratio is
    // only meaningful against a host that can actually render: measured on this
    // development host, the production-raster arm reported idle baselines of
    // 1.50, 8.28 and 12.63 fps, and a 1.50 fps baseline yields a ratio that is
    // pure noise while still passing every assertion below. This test's whole
    // value is that its number can be trusted, so an untrustworthy host has to
    // fail it rather than feed a bogus ratio into the decision this comparison
    // exists to inform.
    expect(
      baseline.fps,
      `${arm.label}: host idle baseline ${baseline.fps.toFixed(2)} fps is too low for a transition/baseline ratio to mean anything`,
    ).toBeGreaterThan(30);
    const result = await measureTransition(page);
    // Measurement validity, not performance: the transition must have been live
    // and must be the one the manifest declares.
    expect(result.active, `${arm.label}: no live transition was observed`).toBe(true);
    expect(
      result.durationMs,
      `${arm.label}: the measured transition must be the one ${arm.story} declares`,
    ).toBeCloseTo(arm.declaredDurationMs, 0);
    expect(result.samples.length, `${arm.label}: the transition produced too few frames to measure`).toBeGreaterThan(1);
    measured.push({ ...arm, baseline: baseline.fps, transition: fpsOf(result) });
  }

  const summary = measured
    .map((arm) => `${arm.label} baseline=${arm.baseline.toFixed(2)} transition=${arm.transition.toFixed(2)} ratio=${(arm.transition / arm.baseline).toFixed(3)}`)
    .join(' | ');
  // Written to stdout as well as to an annotation: the html reporter keeps
  // annotations inside the uploaded report archive, so an annotation alone leaves
  // these numbers invisible in the job log, which is where this comparison is
  // read. (That is the same gap that made the earlier
  // fps-transition-duration-race assessment reach for a number CI had captured
  // but nobody could find.)
  console.log(`SC-018-COMPARISON ${summary}`);
  testInfo.annotations.push({ type: 'transition_fps_comparison', description: summary });
});
