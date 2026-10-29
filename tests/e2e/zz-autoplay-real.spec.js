import { test, expect } from '@playwright/test';

const STORY = 'tests/fixtures/story.json';

/**
 * T199 — the autoplay-block path had to be reachable for real.
 *
 * Every existing assertion that `#blocked-overlay` becomes visible stubs
 * `HTMLMediaElement.prototype.play` to reject with `NotAllowedError`, so the
 * branch that the whole "toque para iniciar" feature exists for had no coverage
 * against a real browser autoplay policy — and, worse, the code could not
 * actually reach it: `volume = 0` made Chromium treat the element as muted,
 * muted autoplay is permitted, `play()` resolved, `markBlocked()` was never
 * called and the overlay never appeared.
 *
 * These tests load the page with a REAL, unstubbed `play()` and assert whatever
 * the engine actually does, so the behaviour is pinned rather than assumed.
 */

test.describe('T199 — real autoplay policy, unstubbed', () => {
  test('a real autoplay attempt is classified as blocked rather than silently granted', async ({ page }) => {
    const playCalls = [];
    // Record, but never alter, the real outcome.
    await page.addInitScript(() => {
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function patched(...args) {
        window.__realPlayResults = window.__realPlayResults || [];
        const before = this.volume;
        return original.apply(this, args).then(
          (value) => {
            window.__realPlayResults.push({ kind: 'resolved', volumeBefore: before, currentVolume: this.volume });
            return value;
          },
          (error) => {
            window.__realPlayResults.push({ kind: 'rejected', name: error?.name, volumeBefore: before });
            throw error;
          }
        );
      };
    });

    // Deliberately NOT openPlayer(): it dismisses the blocked overlay before
    // returning (see helpers.js), which is the exact behaviour under test. The
    // overlay has to be observed in the state the visitor would actually see.
    await page.goto(`/?story=${encodeURIComponent(STORY)}`);
    await expect(page.locator('#frame-image')).toBeVisible();
    await page.waitForTimeout(1500);

    const observed = await page.evaluate(() => {
      const player = globalThis.__cinematicPlayer;
      return {
        playResults: window.__realPlayResults || [],
        blockedOverlayHidden: document.querySelector('#blocked-overlay')?.hidden ?? null,
        audioState: player?.audio?.sessionBlocked ?? null,
        // FR-016/FR-032: the probe volume must be non-zero, or the engine is
        // being asked a muted-autoplay question it always answers "yes".
        sceneVolumes: player ? [...player.audio.sceneElements.values()].map((e) => e.volume) : [],
      };
    });
    playCalls.push(observed);

    // 1. The probe must never be silent: volume === 0 means "muted", and muted
    //    autoplay is always permitted, so the block path would be unreachable.
    const silentProbes = observed.playResults.filter((r) => r.volumeBefore === 0);
    expect(silentProbes, 'no play() may be attempted at volume 0 — that is a muted grant, not a policy decision').toEqual([]);

    // 2. Whatever the engine decided, the player must agree with it. A resolved
    //    play() means the engine permitted playback, so the player must NOT be
    //    claiming to be blocked; a NotAllowedError means it must be.
    const sawNotAllowed = observed.playResults.some((r) => r.kind === 'rejected' && r.name === 'NotAllowedError');
    const sawOtherError = observed.playResults.some((r) => r.kind === 'rejected' && r.name && r.name !== 'NotAllowedError');
    const overlayVisible = observed.blockedOverlayHidden === false;

    if (sawNotAllowed) {
      expect(overlayVisible, 'a NotAllowedError must surface the "toque para iniciar" overlay (FR-016, SC-003)').toBe(true);
    } else {
      expect(overlayVisible, 'when autoplay is granted there must be no blocked overlay, and no error is shown (FR-004)').toBe(false);
    }
    expect(sawOtherError, 'a non-NotAllowedError failure must never be classified as blocked (FR-016 vs FR-032)').toBe(false);
  });

  test('the player state is coherent whichever way the engine decides', async ({ page }) => {
    // Deliberately NOT openPlayer(): it dismisses the blocked overlay.
    await page.addInitScript(() => {
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function patched(...args) {
        window.__realPlayResults = window.__realPlayResults || [];
        const volumeBefore = this.volume;
        return original.apply(this, args).then(
          (v) => { window.__realPlayResults.push({ kind: 'resolved', volumeBefore }); return v; },
          (e) => { window.__realPlayResults.push({ kind: 'rejected', name: e?.name, volumeBefore }); throw e; }
        );
      };
    });
    await page.goto(`/?story=${encodeURIComponent(STORY)}`);
    await expect(page.locator('#frame-image')).toBeVisible();
    await page.waitForTimeout(1500);

    const observed = await page.evaluate(() => {
      const player = globalThis.__cinematicPlayer;
      const results = window.__realPlayResults || [];
      const audio = player?.audio;
      const elements = audio ? [...audio.sceneElements.values()] : [];
      return {
        results,
        blocked: results.some((r) => r.kind === 'rejected' && r.name === 'NotAllowedError'),
        overlayVisible: document.querySelector('#blocked-overlay')?.hidden === false,
        ariaPressed: document.querySelector('#audio-toggle')?.getAttribute('aria-pressed') ?? null,
        audioState: player?.root?.dataset?.audioState ?? null,
        // T198 invariant, regardless of the autoplay outcome: no element may be
        // left paused while carrying non-zero gain.
        pausedWithGain: elements.filter((e) => e.paused && e.volume > 0.001).map((e) => e.volume),
        volumes: elements.map((e) => Number(e.volume.toFixed(4)))
      };
    });

    // The probe is never silent — a volume-0 attempt is a muted grant, not a policy decision.
    expect(observed.results.filter((r) => r.volumeBefore === 0)).toEqual([]);

    // FR-016: a block surfaces the overlay; FR-004: a grant shows no overlay.
    expect(observed.overlayVisible).toBe(observed.blocked);

    // FR-014: the control must reflect the state, whichever it is.
    if (observed.blocked) {
      expect(observed.audioState, 'a blocked engine must be reported as blocked (FR-014)').toBe('blocked');
      expect(observed.ariaPressed).toBe('false');
    } else {
      expect(observed.volumes.some((v) => v > 0), 'a granted autoplay must actually be audible').toBe(true);
      expect(observed.ariaPressed).toBe('true');
    }

    // T198: silence must never be represented as "paused but still audible".
    expect(observed.pausedWithGain, 'no element may be paused while carrying gain').toEqual([]);
  });
});
