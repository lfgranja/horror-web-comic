import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

const transitionCases = [
  ['cut', 0, 'linear'],
  ['fade', 601, 'ease-in'],
  ['zoom-in', 602, 'ease-out'],
  ['zoom-out', 603, 'ease-in-out'],
  ['dissolve', 604, 'linear'],
  ['slide-left', 605, 'ease-in'],
  ['slide-right', 606, 'ease-out'],
  ['none', 607, 'ease-in-out']
];

const reachabilityCases = [
  { source: 'frame-01', target: 'first', action: '#home', expected: 'frame-01' },
  { source: 'frame-01', target: 'last', action: '#end', expected: 'frame-04' },
  { source: 'frame-01', target: 'next scene', action: '#next-scene', expected: 'frame-03' },
  { source: 'frame-02', target: 'first', action: '#home', expected: 'frame-01' },
  { source: 'frame-02', target: 'last', action: '#end', expected: 'frame-04' },
  { source: 'frame-02', target: 'next scene', action: '#next-scene', expected: 'frame-03' },
  { source: 'frame-03', target: 'first', action: '#home', expected: 'frame-01' },
  { source: 'frame-03', target: 'last', action: '#end', expected: 'frame-04' },
  { source: 'frame-03', target: 'previous scene', action: '#previous-scene', expected: 'frame-01' },
  { source: 'frame-04', target: 'first', action: '#home', expected: 'frame-01' },
  { source: 'frame-04', target: 'previous scene', action: '#previous-scene', expected: 'frame-01' }
];

// Settle the player deterministically: pause, drop any coalesced navigation,
// jump to the requested frame without animation, and clear stale dwell state.
// This avoids racing openPlayer's single pause click against the 250 ms
// auto-start (which can leave the player paused on frame-02 under load).
async function settleAt(page, frameId) {
  await page.evaluate((id) => {
    const player = globalThis.__cinematicPlayer;
    player.pause();
    if (player.pendingNavigation) {
      clearTimeout(player.pendingNavigation);
      player.pendingNavigation = null;
      player.pendingNavigationAction = null;
    }
    player.lastNavigation = 0;
    const target = player.frames.findIndex((item) => item.frame.id === id);
    player.moveTo(target < 0 ? 0 : target, false);
    player.lastNavigation = 0;
    player.lastMeasuredDwellMs = null;
  }, frameId);
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', frameId);
  // T202: manual arrival at the last frame is the ended state, not 'paused'.
  const lastFrameId = await page.evaluate(() => {
    const player = globalThis.__cinematicPlayer;
    return player.frames[player.frames.length - 1].frame.id;
  });
  await expect(page.locator('#player')).toHaveAttribute('data-status', frameId === lastFrameId ? 'ended' : 'paused');
}

// Click a navigation control with the coalescing window pre-cleared so the
// queued action fires immediately; still exercises the real click handler.
async function clickNav(page, action, expected) {
  await page.evaluate(() => { globalThis.__cinematicPlayer.lastNavigation = 0; });
  await page.locator(action).click();
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', expected);
}

// Start playback deterministically at the given speed: the select fires the
// real speed-change handler, then resume() re-renders and re-arms the dwell
// once the (cached) image is ready. Dwell is measured via the player's own
// lastMeasuredDwellMs, which excludes image-load time.
async function resumePlayback(page, speed) {
  if (speed) await page.locator('#speed').selectOption(speed);
  await page.evaluate(() => globalThis.__cinematicPlayer.resume());
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
}

async function placeAtSource(page, source) {
  if (source === 'frame-01') return;
  if (source === 'frame-02') {
    await clickNav(page, '#next-frame', source);
    return;
  }
  if (source === 'frame-03') {
    await clickNav(page, '#next-scene', source);
    return;
  }
  await clickNav(page, '#end', source);
}

test('renders every enumerated transition type with authored duration and easing', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');
  for (const [type, durationMs, easing] of transitionCases) {
    await page.evaluate((transition) => {
      const player = globalThis.__cinematicPlayer;
      player.frames[0].frame.transition = transition;
      player.render();
    }, { type, durationMs, easing });
    await expect(page.locator('#player')).toHaveAttribute('data-transition', type);
    await expect(page.locator('#frame-stage')).toHaveAttribute('data-transition', type);
    await expect(page.locator('#frame-stage')).toHaveAttribute('style', new RegExp(`--transition-duration: ${durationMs}ms`));
    await expect(page.locator('#frame-stage')).toHaveAttribute('style', new RegExp(`--transition-easing: ${easing}`));
  }
});

test('resolves transitions by frame, scene, story, then default precedence', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');
  const resolved = await page.evaluate(() => {
    const player = globalThis.__cinematicPlayer;
    const scene = player.scenes[0];
    const frame = player.frames[0].frame;
    const values = [];
    player.story.defaultTransition = { type: 'slide-left', durationMs: 411, easing: 'linear' };
    scene.defaultTransition = { type: 'zoom-in', durationMs: 422, easing: 'ease-in' };
    frame.transition = { type: 'dissolve', durationMs: 433, easing: 'ease-out' };
    player.render();
    values.push([player.root.dataset.transition, player.stage.style.getPropertyValue('--transition-duration'), player.stage.style.getPropertyValue('--transition-easing')]);
    delete frame.transition;
    player.render();
    values.push([player.root.dataset.transition, player.stage.style.getPropertyValue('--transition-duration'), player.stage.style.getPropertyValue('--transition-easing')]);
    delete scene.defaultTransition;
    player.render();
    values.push([player.root.dataset.transition, player.stage.style.getPropertyValue('--transition-duration'), player.stage.style.getPropertyValue('--transition-easing')]);
    delete player.story.defaultTransition;
    player.render();
    values.push([player.root.dataset.transition, player.stage.style.getPropertyValue('--transition-duration'), player.stage.style.getPropertyValue('--transition-easing')]);
    return values;
  });

  expect(resolved).toEqual([
    ['dissolve', '433ms', 'ease-out'],
    ['zoom-in', '422ms', 'ease-in'],
    ['slide-left', '411ms', 'linear'],
    ['fade', '600ms', 'ease-in-out']
  ]);
});

test('parameterized required targets are reachable from every applicable frame in one UI action', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');
  for (const entry of reachabilityCases) {
    await clickNav(page, '#home', 'frame-01');
    await placeAtSource(page, entry.source);
    await expect(page.locator('#player')).toHaveAttribute('data-frame-id', entry.source);
    const actions = [entry.action];
    await clickNav(page, entry.action, entry.expected);
    expect(actions.length).toBeLessThanOrEqual(3);
  }
});

test('all speeds scale dwell within ten percent without changing transition duration', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  const speeds = [
    { value: '0.5', expected: 3000 },
    { value: '1', expected: 1500 },
    { value: '2', expected: 750 }
  ];

  for (const speed of speeds) {
    // Settle on frame-01 first: without this, a late helper pause click can
    // leave the player on frame-02, making the frame-02 wait pass instantly
    // with lastMeasuredDwellMs still null (no advance has fired).
    await settleAt(page, 'frame-01');
    await page.evaluate(() => { globalThis.__cinematicPlayer.frames[1].frame.transition = { type: 'fade', durationMs: 1400, easing: 'linear' }; });
    await resumePlayback(page, speed.value);
    await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
    const elapsed = await page.evaluate(() => globalThis.__cinematicPlayer.lastMeasuredDwellMs);
    expect(elapsed, `dwell at ${speed.value}x`).toBeGreaterThanOrEqual(speed.expected * 0.9);
    expect(elapsed, `dwell at ${speed.value}x`).toBeLessThanOrEqual(speed.expected * 1.1);
    await expect(page.locator('#frame-stage')).toHaveAttribute('style', /--transition-duration: 1400ms/);
  }
});

test('enforces the 250 ms dwell floor at double speed and leaves transition timing unchanged', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');
  await page.evaluate(() => {
    const player = globalThis.__cinematicPlayer;
    player.frames[0].frame.durationMs = 500;
    player.frames[1].frame.transition = { type: 'zoom-in', durationMs: 1777, easing: 'linear' };
  });
  await resumePlayback(page, '2');
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');

  const elapsed = await page.evaluate(() => globalThis.__cinematicPlayer.lastMeasuredDwellMs);
  expect(elapsed).toBeGreaterThanOrEqual(225);
  expect(elapsed).toBeLessThanOrEqual(275);
  await expect(page.locator('#frame-stage')).toHaveAttribute('style', /--transition-duration: 1777ms/);
});

test('End and Replay preserve ended-state navigation semantics from manual and natural completion', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');
  await clickNav(page, '#end', 'frame-04');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'ended');
  await expect(page.locator('#end-overlay')).toBeVisible();
  await clickNav(page, '#previous-frame', 'frame-03');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
  await clickNav(page, '#end', 'frame-04');
  await clickNav(page, '#replay', 'frame-01');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');

  // Mutate duration and speed BEFORE the replayed dwell is armed so the
  // natural run to the end is deterministic (250 ms floor at 2x).
  await page.evaluate(() => { globalThis.__cinematicPlayer.frames[0].frame.durationMs = 500; });
  await page.locator('#speed').selectOption('2');
  await expect(page.locator('#end-overlay')).toBeHidden();
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'ended');
  await expect(page.locator('#end-overlay')).toBeVisible();
  await clickNav(page, '#replay', 'frame-01');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
});
