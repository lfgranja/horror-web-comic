import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

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
  // T202: settling onto the LAST frame by manual navigation now reaches the
  // ended state (US1/AC4) rather than sitting on it 'paused' with no sign the
  // story is over. Everywhere else a manual move still pauses.
  const lastFrameId = await page.evaluate(() => {
    const player = globalThis.__cinematicPlayer;
    return player.frames[player.frames.length - 1].frame.id;
  });
  await expect(page.locator('#player')).toHaveAttribute('data-status', frameId === lastFrameId ? 'ended' : 'paused');
}

test('rapid navigation inside the 400 ms window keeps only the last input', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');
  // Queue two divergent navigations in the same tick (well inside the
  // 400 ms coalescing window): scene+1 would land on frame-03, frame+1 on
  // frame-02. If both actions ran, the second would move from frame-03 to
  // frame-04; last-input-wins must land on frame-02 with a single moveTo.
  await page.evaluate(() => {
    const player = globalThis.__cinematicPlayer;
    player.lastNavigation = 0;
    player.moveToCalls = 0;
    const orig = player.moveTo.bind(player);
    player.moveTo = (...args) => { player.moveToCalls += 1; return orig(...args); };
    player.navigateScene(1);
    player.navigate(1);
  });
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
  const calls = await page.evaluate(() => globalThis.__cinematicPlayer.moveToCalls);
  expect(calls).toBe(1);
  // No navigation left pending and no transition left in flight.
  const state = await page.evaluate(() => ({
    pending: globalThis.__cinematicPlayer.pendingNavigation,
    transitionTimer: globalThis.__cinematicPlayer.transitionTimer,
    transition: globalThis.__cinematicPlayer.stage.dataset.transition
  }));
  expect(state.pending).toBeNull();
  expect(state.transitionTimer).toBe(0);
  expect(state.transition).toBe('fade');
  // The player still navigates normally afterwards.
  await page.evaluate(() => {
    const player = globalThis.__cinematicPlayer;
    player.lastNavigation = 0;
    player.goHome();
    player.flushPendingNavigation();
  });
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-01');
});

test('in-flight transition is cancelled on new navigation', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');
  const state = await page.evaluate(() => {
    const player = globalThis.__cinematicPlayer;
    player.lastNavigation = 0;
    // Render a long non-cut transition, then navigate away immediately:
    // moveTo must cancel the transition timer and reflect the new frame.
    player.frames[0].frame.transition = { type: 'dissolve', durationMs: 5000, easing: 'linear' };
    player.render();
    const renderedType = player.stage.dataset.transition;
    player.navigate(1);
    player.flushPendingNavigation();
    return {
      renderedType,
      timer: player.transitionTimer,
      stageType: player.stage.dataset.transition,
      frameId: player.frames[player.index].frame.id
    };
  });
  expect(state.renderedType).toBe('dissolve');
  expect(state.frameId).toBe('frame-02');
  expect(state.timer).toBe(0);
  expect(state.stageType).toBe('fade');
  await expect(page.locator('#player')).toHaveAttribute('data-frame-id', 'frame-02');
});

test('first frame, last frame and adjacent scene starts are reachable within three actions', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  // Each entry lists queued player actions; one flush per action keeps the
  // run deterministic without wall-clock sleeps. Count must stay <= 3.
  const cases = [
    { from: 'frame-01', actions: ['home'], to: 'frame-01' },
    { from: 'frame-01', actions: ['end'], to: 'frame-04' },
    { from: 'frame-01', actions: ['scene+1'], to: 'frame-03' },
    { from: 'frame-01', actions: ['frame+1', 'frame+1', 'frame+1'], to: 'frame-04' },
    { from: 'frame-02', actions: ['home'], to: 'frame-01' },
    { from: 'frame-02', actions: ['end'], to: 'frame-04' },
    { from: 'frame-02', actions: ['scene+1'], to: 'frame-03' },
    { from: 'frame-02', actions: ['frame+1', 'frame+1'], to: 'frame-04' },
    { from: 'frame-03', actions: ['home'], to: 'frame-01' },
    { from: 'frame-03', actions: ['end'], to: 'frame-04' },
    { from: 'frame-03', actions: ['scene-1'], to: 'frame-01' },
    { from: 'frame-03', actions: ['frame+1'], to: 'frame-04' },
    { from: 'frame-04', actions: ['home'], to: 'frame-01' },
    { from: 'frame-04', actions: ['scene-1'], to: 'frame-01' },
    { from: 'frame-04', actions: ['end'], to: 'frame-04' },
    { from: 'frame-04', actions: ['frame-1'], to: 'frame-03' }
  ];
  for (const entry of cases) {
    await settleAt(page, entry.from);
    const result = await page.evaluate((actions) => {
      const player = globalThis.__cinematicPlayer;
      let count = 0;
      for (const action of actions) {
        player.lastNavigation = 0;
        if (action === 'home') player.goHome();
        else if (action === 'end') player.goEnd();
        else if (action === 'scene+1') player.navigateScene(1);
        else if (action === 'scene-1') player.navigateScene(-1);
        else if (action === 'frame+1') player.navigate(1);
        else if (action === 'frame-1') player.navigate(-1);
        player.flushPendingNavigation();
        count += 1;
      }
      return { frameId: player.frames[player.index].frame.id, count };
    }, entry.actions);
    expect(result.count, `${entry.from} action count`).toBeLessThanOrEqual(3);
    expect(result, `${entry.from} -> ${entry.to}`).toEqual({ frameId: entry.to, count: result.count });
  }
});
