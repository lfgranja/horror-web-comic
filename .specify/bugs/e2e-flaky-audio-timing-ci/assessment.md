# Bug Assessment: e2e flaky audio double-toggle and timing dwell

- **Slug**: e2e-flaky-audio-timing-ci
- **Created**: 2026-10-29
- **Source**: CI run 40983459997 (github.com, allowlisted) — 2 flaky: zz-audio-double-toggle (mobile-webkit), zz-timing-dwell (desktop-firefox)
- **Verdict**: likely valid, needs reproduction
- **Severity**: medium

## Report (verbatim or summarized)

CI gate (run 40983459997): 2 flaky tests:
- `[mobile-webkit] › tests/e2e/zz-audio-double-toggle.spec.js:103:3 › T198 — re-enable inside the stop ramp › M pressed twice in quick succession keeps the scene audible`
- `[desktop-firefox] › tests/e2e/zz-timing-dwell.spec.js:47:1 › dwell floor of 250 ms applies whenever duration divided by speed is smaller`

## Symptom

Two E2E tests are flaky in CI: (1) audio double-toggle on mobile-webkit (T198 stop ramp) — pressing M twice quickly should keep the scene audible but intermittently fails; (2) timing dwell floor on desktop-firefox — the 250ms floor when duration/speed is small intermittently fails. Both are timing-sensitive and engine-specific.

## Reproduction

1. Run full CI gate on ubuntu-latest.
2. Observe flaky failures in `zz-audio-double-toggle` (mobile-webkit) and `zz-timing-dwell` (desktop-firefox).

## Suspected Code Paths

- `src/scripts/audio.js` — `AudioManager`: fade ramps, generation tokens, `isElementPlaying()`, stop ramp (40ms), `setPaused`/`unlock` lifecycle.
- `src/scripts/player.js` — `schedule()` (timer-based auto-advance), `dwellDurationMs`, `lastMeasuredDwellMs`.
- `tests/e2e/zz-audio-double-toggle.spec.js:103` — double-toggle inside stop ramp.
- `tests/e2e/zz-timing-dwell.spec.js:47` — dwell floor assertion.
- `tests/e2e/helpers.js` — `measureDwellMs`, `installFrameWatcher` (MutationObserver-based dwell measurement).

## Root Cause Hypothesis

**Confidence: medium.** Both tests are timing-sensitive and engine-specific (WebKit audio ramp, Firefox timer resolution). The audio double-toggle test depends on the 40ms stop ramp completing/not completing between two M presses; under CI load, the ramp timing varies. The dwell-floor test depends on `setTimeout` resolution and frame measurement; Firefox's timer granularity may cause the 250ms floor to be missed. These are pre-existing flaky patterns (see `e2e-audio-timing-flakes`, `e2e-flake-elimination`, `e2e-load-races` bugs).

## Proposed Remediation

**Preferred**: Increase tolerance / use deterministic scheduling:
- For audio double-toggle: use `freezeAdvance` or `routeFrozenStory` to pin dwells; assert on audio state rather than timing.
- For dwell floor: use `installFrameWatcher`/`measureDwellMs` with a wider tolerance; or skip engine-specific timing assertions in CI.

**Alternatives**:
- Mark both as `test.fixme` on the specific engine with a tracking issue.
- Retry in CI (already retries 2x) but investigate root cause.

**Files likely to change**:
- `tests/e2e/zz-audio-double-toggle.spec.js`
- `tests/e2e/zz-timing-dwell.spec.js`
- `src/scripts/audio.js` (if audio ramp needs hardening)

**Tests to add or update**:
- Deterministic audio state assertions (not timing).
- Dwell floor test with engine-aware tolerance.

## Risks & Considerations

- Flaky tests erode CI trust; should be fixed or quarantined, not ignored.
- Audio ramp timing is product-relevant (T198 stop ramp); changes must not break the audible-on-double-toggle behavior.
- Firefox timer resolution is a known environmental factor.

## Open Questions

- [NEEDS CLARIFICATION: Is the audio double-toggle failure a product race (stop ramp not completing) or a test timing issue?]
- [NEEDS CLARIFICATION: Is the dwell floor failure due to Firefox timer granularity or a real scheduling bug?]