# Bug Assessment: gate full CI failures

- **Slug**: gate-full-ci-failures
- **Created**: 2026-10-28
- **Source**: https://github.com/lfgranja/horror-web-comic/actions/runs/40714854265/job/122909645811
- **Verdict**: likely valid, needs reproduction
- **Severity**: high

## Report (verbatim or summarized)

CI run 40714854265, gate job failed with 55 failed tests, 1252 passed, 15 skipped, 3 flaky. webkit-layout-gate passed. Failures span:
- focus-loss.spec.js (startup focus loss, focus loss during pending navigation)
- persistence-flow.spec.js (storage unavailable fallback)
- sync.spec.js (BroadcastChannel unavailable, concurrent progress resolution)
- zz-legacy-* tests (end state, reduced motion, resume)
- zz-resume-final-frame.spec.js
- audio-lifecycle, audio-timing, zz-audio-double-toggle (flaky)

## Symptom

Full CI gate fails due to multiple test failures across different test suites. The webkit-layout-gate specific issues were fixed, but other tests are failing.

## Reproduction

1. Run `npm run ci` locally or check CI gate job
2. Observe 55 failures across focus-loss, persistence, sync, legacy tests

## Suspected Code Paths

- `src/scripts/main.js` - focus loss handling, auto-start logic
- `src/scripts/player.js` - navigation, resume, end state
- `src/scripts/storage.js` - persistence, BroadcastChannel, fallbacks
- `src/scripts/audio.js` - audio lifecycle
- Tests may be affected by our recent changes (control bar CSS changes affecting layout/measurements)

## Root Cause Hypothesis

**Confidence: medium.** The control bar CSS changes we made (compact styles at narrow widths) might affect layout measurements or focus behavior in some tests. Also the theme-a11y and other tests might be affected. Or these could be pre-existing flaky tests.

## Proposed Remediation

**Preferred**: Investigate failures systematically - start with focus-loss and persistence tests as they might be related to our changes or environment issues.

**Files likely to change**:
- May need to adjust CSS if it affects measurements
- May need to fix test expectations if they were affected by layout changes

**Tests to add or update**:
- None initially; need to understand failures first

## Risks & Considerations

- 55 failures is significant but many might be flaky or environment-related
- Some failures might be due to our CSS changes affecting layout

## Open Questions

- [NEEDS CLARIFICATION: Are these failures related to our recent CSS changes?]
- [NEEDS CLARIFICATION: Are these pre-existing or caused by our changes?]

---

## Updated Assessment — 2026-10-29 (post-CI run 40932788962)

- **CI evidence**: run `40932788962` (ubuntu-latest, gate job) concluded **success** — webkit-layout-gate + macos-webkit-compositor also green. The original 55 failures from run `40714854265` are resolved at CI level.
- **Local evidence (2026-10-29, this host)**:
  - `npm run preflight`: 16/16 pass.
  - `npm run validate`: pass.
  - `npm run test:unit`: 227/227 pass.
  - `npm run build:images` + `npm run build`: pass (16233 B script, 4175 B style).
  - `npm run lhci`: pass.
  - `npm run test:perf`: 42 pass, 15 skipped, 1 fail (SC-019 cold-cache p75 desktop-chromium), 2 flaky (mobile-chromium).
  - `npm run test:e2e`: did **not** complete (300s timeout). Observed failures: `playback.spec.js` and `playback-matrix.spec.js` on `mobile-chromium` expect `frame-01` but receive `frame-04` because progress is persisted in localStorage between runs (`openPlayer` does not clear storage).
- **Verdict (updated)**: **likely valid, needs reproduction** — CI gate is green, but local E2E still fails due to storage persistence between runs; root cause narrowed to test isolation (storage not reset), not a product defect per se.
- **Severity (updated)**: **medium** (downgraded from high): CI no longer blocked; remaining failure is local/test-isolation. Blast radius limited to E2E reproducibility.

### Refined Root Cause Hypothesis
**Confidence: high.** The 55 historical failures were resolved in CI (run 40932788962 green). The current local failure is a **test-isolation defect**: `playback.spec.js` / `playback-matrix.spec.js` assume a fresh storage state but the player persists `frameIndex`/`ended` under `hwc.progress:<storyId>` in localStorage, so a prior run leaves `frame-04` and the next run reads it instead of starting at `frame-01`. Not a product regression.

### Refined Remediation
**Preferred**: In the E2E helper (`tests/e2e/helpers.js` → `openPlayer`), clear the story-scoped progress key (`hwc.progress:<storyId>`) and any `hwc.sensoryMode`/theme keys before navigation, or use a fresh browser context per test. This restores determinism without weakening assertions.

**Files likely to change**:
- `tests/e2e/helpers.js` (openPlayer cleanup)
- Possibly `src/scripts/storage.js` (expose a test-only reset hook behind `__CINEMATIC_PRODUCTION__` guard, consistent with main.js T215 pattern)

**Tests to add or update**:
- Assert `openPlayer` starts at `frame-01` after a previous run left progress (regression guard).
- Re-run full E2E matrix locally on chromium+firefox (webkit unavailable on Fedora) to confirm green.

### Risks & Considerations
- Clearing storage must be scoped to the story id to avoid wiping unrelated progress in multi-story catalogs.
- If the fix touches `storage.js`, keep the production bundle free of test-only hooks (gate behind `__CINEMATIC_PRODUCTION__`).
- Perf flake (SC-019) and 2 mobile-chromium flakes remain separate concerns (perf-gate-regressions / e2e-flake-* bugs).

### Open Questions
- [NEEDS CLARIFICATION: Should reset happen in `openPlayer` (helper) or via a dedicated test fixture?]
- [NEEDS CLARIFICATION: Is there a CI artifact (trace) for the local 300s timeout to confirm no additional failure?]

i: Rewriting assessment.md with clean merged structure