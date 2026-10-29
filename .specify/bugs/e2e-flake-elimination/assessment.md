# Bug Assessment: Five residual E2E failures on Chromium (audio-activity, resume, runtime-convergence, zz-legacy-playback, zz-legacy-speed-volume)

- **Slug**: e2e-flake-elimination
- **Created**: 2026-10-19
- **Source**: pasted text (local run: `npx playwright test tests/e2e --project=mobile-chromium` → 255 passed / 5 failed)
- **Verdict**: likely valid, needs reproduction
- **Severity**: high

## Report (verbatim or summarized)

Local E2E run on mobile-chromium (after deps bump to playwright 1.64.0) reported 5 failures:

1. `tests/e2e/audio-activity.spec.js:87` — "a playing frame track reaches its own gain while the scene ducks to 40%"
2. `tests/e2e/resume.spec.js:4` — "resumes a saved frame and does not persist paused state" — `#player` hidden (idle), openPlayer failed at helpers.js:6.
3. `tests/e2e/runtime-convergence.spec.js:35` — "debounces the live-region description update" — description contained "fotografia" at 100ms (expected not to).
4. `tests/e2e/zz-legacy-playback.spec.js:48` — "progress indicator reflects current position".
5. `tests/e2e/zz-legacy-speed-volume.spec.js:37` — "speed 2x persists and halves dwell with 250ms floor".

Consistent with prior partial bugs `e2e-load-races` and `deferred-behavior-coverage` (load races / audio timing / dwell measurement).

## Symptom

Five E2E tests fail intermittently or consistently on Chromium, blocking a fully green
`test:e2e` gate. Symptoms: audio ducking gain not reached, player stuck in idle on resume,
live-region description not debounced, progress indicator stale, speed/dwell timing off.

## Reproduction

1. `npm run build && npm run build:images`
2. `npx playwright test tests/e2e --project=mobile-chromium`
3. Observe 5 failures listed above.

[NEEDS CLARIFICATION: whether each failure is deterministic or flaky — rerun ×3 needed.]

## Suspected Code Paths

- `src/scripts/audio.js` — ducking gain logic, scene/frame track volumes.
- `src/scripts/player.js` — resume/persist paused state, live-region debounce, progress indicator.
- `src/scripts/storage.js` — BroadcastChannel/storage progress sync.
- `tests/e2e/helpers.js:6` — `openPlayer` waits for `#player` visible; failure suggests player
  never left idle (storage race or autoplay policy).
- `tests/e2e/zz-legacy-speed-volume.spec.js:37` — dwell measurement vs 250ms floor.

## Root Cause Hypothesis

Likely a mix of (a) load races on initial render/storage hydration (resume idle), (b) audio
ducking event ordering (playing/pause/ended), and (c) dwell timing tolerance (250ms floor +
speed scaling). Confidence: medium. Needs per-test isolation and repeated runs.

## Proposed Remediation

**Preferred**: Triage each failing test individually:
- resume: ensure storage hydration completes before asserting playing; add retry/wait.
- audio-activity: verify event dispatch ordering and gain calculation.
- runtime-convergence: adjust debounce window / assertion timing.
- zz-legacy-playback: progress indicator update on advance.
- zz-legacy-speed-volume: dwell measurement tolerance.

**Alternatives**: quarantine flaky tests behind a retry policy (not preferred; masks real bugs).

**Files likely to change**:
- `src/scripts/player.js`, `src/scripts/audio.js`, `src/scripts/storage.js`
- `tests/e2e/{audio-activity,resume,runtime-convergence,zz-legacy-playback,zz-legacy-speed-volume}.spec.js`

**Tests to add or update**:
- Repeated-run stability (×3) for each fixed test.
- Deterministic reproduction via `--workers=1`.

## Risks & Considerations

- Some failures may be timing-related and only appear under parallelism.
- Changing dwell tolerance could mask real regressions; keep SC-010 (±10%) strict.
- Do not weaken assertions to make tests pass.

## Open Questions

- [NEEDS CLARIFICATION: are all 5 failures deterministic or flaky?]
- [NEEDS CLARIFICATION: does `--workers=1` reproduce them?]
