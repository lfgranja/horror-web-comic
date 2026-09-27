import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

test('synchronous unlock of precreated scene and frame elements on first qualified gesture', async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.__audioInstrument) window.__audioInstrument = { unlocked: false, playedKeys: new Set(), newElementsCreated: 0 };
    const OriginalAudio = window.Audio;
    window.Audio = class InstrumentedAudio extends OriginalAudio {
      constructor(...args) {
        super(...args);
        window.__audioInstrument.newElementsCreated++;
      }
    };
    window.Audio.prototype = OriginalAudio.prototype;
    const origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function instrumentedPlay() {
      const key = this.dataset?.trackKey || this.src;
      if (key) window.__audioInstrument.playedKeys.add(key);
      return origPlay.apply(this, arguments);
    };
  });
  await openPlayer(page, 'tests/fixtures/story.json');
  await page.waitForTimeout(100);
  const beforeUnlock = await page.evaluate(() => {
    const audio = window.__cinematicPlayer?.audio;
    const keys = Array.from(window.__audioInstrument?.playedKeys || []);
    return { unlocked: audio?.awaitingUnlock === false && audio?.sessionBlocked === false, playedKeys: keys, newElementsCreated: window.__audioInstrument?.newElementsCreated || 0, sceneKeys: Array.from(audio?.sceneElements?.keys() || []), frameKeys: Array.from(audio?.frameElements?.keys() || []) };
  });
  await page.evaluate(() => {
    const audio = window.__cinematicPlayer?.audio;
    if (audio) { audio.awaitingUnlock = true; audio.sessionBlocked = true; audio.emit(); }
  });
  await page.waitForTimeout(50);
  await page.locator('#player').click({ force: true });
  await page.waitForTimeout(150);
  const afterUnlock = await page.evaluate(() => {
    const audio = window.__cinematicPlayer?.audio;
    return { awaitingUnlock: audio?.awaitingUnlock, sessionBlocked: audio?.sessionBlocked, enabled: audio?.enabled, playedKeys: Array.from(window.__audioInstrument?.playedKeys || []), newElementsCreated: window.__audioInstrument?.newElementsCreated || 0 };
  });
  expect(afterUnlock.awaitingUnlock).toBeFalsy();
  expect(afterUnlock.sessionBlocked).toBeFalsy();
  expect(afterUnlock.enabled).toBeTruthy();
  expect(afterUnlock.newElementsCreated).toBe(0);
  expect(afterUnlock.playedKeys.length).toBeGreaterThan(0);
});

test('persisted off preference and blocked semantics stay coherent', async ({ page }) => {
  await page.goto(`/?story=tests/fixtures/story.json`);
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.localStorage.setItem('hwc.audio', 'off');
  });
  await page.reload();
  await page.waitForTimeout(300);
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#player')).toHaveAttribute('data-audio-state', 'off');
  const stateOff = await page.evaluate(() => window.__cinematicPlayer?.audio?.state());
  expect(stateOff).toBe('off');
  await page.locator('#audio-toggle').click({ force: true });
  await page.waitForTimeout(150);
  const stateOn = await page.evaluate(() => window.__cinematicPlayer?.audio?.state());
  expect(stateOn).toBe('on');
});

test('currentTime preservation and frame mix on toggle with scene ducking', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };
  });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.waitForTimeout(300);
  await page.locator('#audio-toggle').click({ force: true });
  await page.waitForTimeout(200);
  const beforeToggle = await page.evaluate(() => {
    const audio = window.__cinematicPlayer?.audio;
    const scene = audio?.sceneElements?.get(audio?.currentSceneIndex);
    const frame = audio?.currentFrameId ? audio?.frameElements?.get(audio?.currentFrameId) : null;
    return { sceneTime: scene?.currentTime || 0, frameTime: frame?.currentTime || 0, sceneVol: scene?.volume || 0, frameVol: frame?.volume || 0, mixDucking: scene?.volume < 0.6 ? true : false, ducking: audio?.currentFrameId ? 0.4 : 1 };
  });
  expect(typeof beforeToggle.sceneTime).toBe('number');
  await page.locator('#audio-toggle').click({ force: true });
  await page.waitForTimeout(150);
  const afterReEnable = await page.evaluate(() => {
    const audio = window.__cinematicPlayer?.audio;
    const scene = audio?.sceneElements?.get(audio?.currentSceneIndex);
    const frame = audio?.currentFrameId ? audio?.frameElements?.get(audio?.currentFrameId) : null;
    return { sceneTime: scene?.currentTime || 0, frameTime: frame?.currentTime || 0, sceneVol: scene?.volume || 0, frameVol: frame?.volume || 0, enabled: audio?.enabled };
  });
  expect(afterReEnable.enabled).toBeTruthy();
  expect(afterReEnable.sceneTime).toBeGreaterThanOrEqual(0);
  expect(afterReEnable.sceneVol).toBeGreaterThanOrEqual(0);
});

test('repeated scene changes do not retrigger scene fade', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };
  });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.waitForTimeout(200);
  const fadeOutCallsBefore = await page.evaluate(() => (window.__cinematicPlayer?.audio?.fadeOutCalls || 0));
  await page.locator('#next-scene').click({ force: true });
  await page.waitForTimeout(300);
  const fadeOutCallsMid = await page.evaluate(() => (window.__cinematicPlayer?.audio?.fadeOutCalls || 0));
  await page.locator('#previous-scene').click({ force: true });
  await page.waitForTimeout(100);
  await page.locator('#previous-scene').click({ force: true });
  await page.waitForTimeout(300);
  const fadeOutCallsAfter = await page.evaluate(() => (window.__cinematicPlayer?.audio?.fadeOutCalls || 0));
  expect(fadeOutCallsAfter - fadeOutCallsMid).toBeLessThanOrEqual(2);
});

test('preload current and next scene tracks under normal conditions, restricted under slow', async ({ page }) => {
  await openPlayer(page, 'tests/fixtures/story.json');
  await page.waitForTimeout(200);
  const normalPreload = await page.evaluate(() => {
    const audio = window.__cinematicPlayer?.audio;
    const allKeys = new Set([...Array.from(audio?.sceneElements?.keys() || []), ...Array.from(audio?.frameElements?.keys() || [])]);
    return { preloadAutoCount: Array.from(allKeys).filter(k => {
      const el = audio?.sceneElements?.get(k) || audio?.frameElements?.get(k);
      return el?.preload === 'auto';
    }).length, preloadMetaCount: Array.from(allKeys).filter(k => {
      const el = audio?.sceneElements?.get(k) || audio?.frameElements?.get(k);
      return el?.preload === 'metadata';
    }).length, totalCreated: allKeys.size };
  });
  expect(normalPreload.totalCreated).toBeGreaterThan(0);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: 'slow-2g', rtt: 800, deviceMemory: 1, hardwareConcurrency: 1 } });
  });
  await page.reload();
  await page.waitForTimeout(400);
  const slowPreload = await page.evaluate(() => {
    const audio = window.__cinematicPlayer?.audio;
    const sceneElements = Array.from(audio?.sceneElements?.values() || []);
    const frameElements = Array.from(audio?.frameElements?.values() || []);
    const currentScene = audio?.currentSceneIndex;
    const scenes = Array.from(audio?.sceneElements?.entries() || []).map(([sceneIndex, element]) => ({ sceneIndex, preload: element.preload }));
    return { currentScene, scenes, currentScenePreload: sceneElements.filter(e => e.preload === 'auto' || e.preload === 'metadata').length, metaOnlyCount: sceneElements.filter(e => e.preload === 'metadata').length, autoCount: sceneElements.filter(e => e.preload === 'auto').length + frameElements.filter(e => e.preload === 'auto').length, totalSceneElements: sceneElements.length };
  });
  // Guards the policy assertions below against a vacuous (single-scene) story.
  expect(slowPreload.totalSceneElements).toBeGreaterThan(1);
  // FR-015 under slow-2g/save-data: no track may auto-preload, only the
  // current scene track may reach for metadata, everything else stays 'none'.
  expect(slowPreload.autoCount).toBe(0);
  expect(slowPreload.currentScenePreload).toBe(1);
  expect(slowPreload.metaOnlyCount).toBe(1);
  for (const scene of slowPreload.scenes) {
    expect(scene.preload).toBe(scene.sceneIndex === slowPreload.currentScene ? 'metadata' : 'none');
  }
});

test('runtime error and stalled events stay silent without misclassifying as blocked', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };
  });
  await openPlayer(page, 'tests/fixtures/story.json');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const audio = window.__cinematicPlayer?.audio;
    const sceneEl = audio?.sceneElements?.get(0);
    if (sceneEl) {
      sceneEl.dispatchEvent(new Event('stalled'));
    }
  });
  await page.waitForTimeout(150);
  const stalledState = await page.evaluate(() => {
    const audio = window.__cinematicPlayer?.audio;
    return { state: audio?.state(), blocked: audio?.sessionBlocked, failedKeys: Array.from(audio?.failed || []) };
  });
  expect(stalledState.blocked).toBeFalsy();
  expect(stalledState.state).not.toBe('blocked');
  expect(stalledState.failedKeys).not.toContain('scene-0');
  await page.evaluate(() => {
    const audio = window.__cinematicPlayer?.audio;
    const sceneEl = audio?.sceneElements?.get(0);
    if (sceneEl) {
      sceneEl.dispatchEvent(new Event('error'));
    }
  });
  await page.waitForTimeout(150);
  const errorState = await page.evaluate(() => {
    const audio = window.__cinematicPlayer?.audio;
    return { state: audio?.state(), blocked: audio?.sessionBlocked, failedKeys: Array.from(audio?.failed || []) };
  });
  expect(errorState.blocked).toBeFalsy();
  expect(errorState.state).not.toBe('blocked');
  expect(errorState.failedKeys).toContain('scene-0');
});

test('restores scene gain whenever frame audio is no longer playing', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
  });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    audio.setPaused(false);
    audio.setScene(1);
    audio.setFrame('frame-03');
  });
  await page.waitForTimeout(350);
  const result = await page.evaluate(() => {
    const audio = window.__cinematicPlayer.audio;
    const scene = audio.sceneElements.get(1);
    const frame = audio.frameElements.get('frame-03');
    const base = audio.volume * (audio.story.scenes[1].audio.volume ?? 0.6);
    const read = () => scene.volume;
    const during = read();
    frame.dispatchEvent(new Event('pause'));
    const afterPause = read();
    frame.dispatchEvent(new Event('playing'));
    const afterPlaying = read();
    frame.dispatchEvent(new Event('ended'));
    const afterEnded = read();
    frame.dispatchEvent(new Event('error'));
    const afterError = read();
    frame.dispatchEvent(new Event('stalled'));
    const afterStalled = read();
    return { base, during, afterPause, afterPlaying, afterEnded, afterError, afterStalled };
  });
  expect(result.during).toBeLessThan(result.base);
  expect(result.afterPause).toBeCloseTo(result.base, 3);
  expect(result.afterPlaying).toBeCloseTo(result.base * 0.4, 3);
  expect(result.afterEnded).toBeCloseTo(result.base, 3);
  expect(result.afterError).toBeCloseTo(result.base, 3);
  expect(result.afterStalled).toBeCloseTo(result.base, 3);
});
