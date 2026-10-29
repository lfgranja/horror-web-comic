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
