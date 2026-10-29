import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

// Deterministic settle helper (see playback-matrix.spec.js): pause, drop any
// coalesced navigation, jump to the requested frame paused.
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
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
}

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

test('every enumerated transition type resolves with authored duration and easing', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');
  for (const [type, durationMs, easing] of transitionCases) {
    const resolved = await page.evaluate((transition) => {
      const player = globalThis.__cinematicPlayer;
      player.frames[0].frame.transition = transition;
      player.render();
      return [
        player.root.dataset.transition,
        player.stage.dataset.transition,
        player.stage.style.getPropertyValue('--transition-duration'),
        player.stage.style.getPropertyValue('--transition-easing')
      ];
    }, { type, durationMs, easing });
    // Assert on the player's own resolved state, not on wall-clock timing.
    expect(resolved).toEqual([type, type, `${durationMs}ms`, easing]);
  }
});

test('transition resolution follows frame, scene, story, then default precedence', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await settleAt(page, 'frame-01');
  const resolved = await page.evaluate(() => {
    const player = globalThis.__cinematicPlayer;
    const scene = player.scenes[0];
    const frame = player.frames[0].frame;
    const values = [];
    const snapshot = () => [
      player.root.dataset.transition,
      player.stage.style.getPropertyValue('--transition-duration'),
      player.stage.style.getPropertyValue('--transition-easing')
    ];
    player.story.defaultTransition = { type: 'slide-left', durationMs: 411, easing: 'linear' };
    scene.defaultTransition = { type: 'zoom-in', durationMs: 422, easing: 'ease-in' };
    frame.transition = { type: 'dissolve', durationMs: 433, easing: 'ease-out' };
    player.render();
    values.push(snapshot());
    delete frame.transition;
    player.render();
    values.push(snapshot());
    delete scene.defaultTransition;
    player.render();
    values.push(snapshot());
    delete player.story.defaultTransition;
    player.render();
    values.push(snapshot());
    return values;
  });
  expect(resolved).toEqual([
    ['dissolve', '433ms', 'ease-out'],
    ['zoom-in', '422ms', 'ease-in'],
    ['slide-left', '411ms', 'linear'],
    ['fade', '600ms', 'ease-in-out']
  ]);
});

test('transition duration and easing are unchanged across all three speeds', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  // Frame-02 authors its own transition (fade/120ms); speed must not affect it.
  await settleAt(page, 'frame-02');
  for (const speed of ['0.5', '1', '2']) {
    await page.locator('#speed').selectOption(speed);
    const resolved = await page.evaluate(() => {
      const player = globalThis.__cinematicPlayer;
      player.render();
      return [
        player.root.dataset.transition,
        player.stage.style.getPropertyValue('--transition-duration'),
        player.stage.style.getPropertyValue('--transition-easing'),
        Number(player.speed.value)
      ];
    });
    expect(resolved, `transition at ${speed}x`).toEqual(['fade', '120ms', 'ease-in-out', Number(speed)]);
  }
});
