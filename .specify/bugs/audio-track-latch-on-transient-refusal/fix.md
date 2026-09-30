# Bug Fix: A non-permission play() refusal permanently disables the audio track

- **Slug**: audio-track-latch-on-transient-refusal
- **Fixed**: 2026-09-30
- **Assessment**: ./assessment.md
- **Status**: not-applied

## Summary

No code modifications were applied. Investigation and prior session experiments (tested under commit `7563e9f` and reverted in `4666c7e`) demonstrated that replacing the 2-way failure classification with a 3-way transient route broke existing invariant tests (`zz-autoplay-real.spec.js:126` and `zz-audio-double-toggle.spec.js:80`). As recorded in `e2e-load-races/fix.md:78-81`, the existing latching behavior for media playback errors is retained as intentional fail-safe behavior, avoiding unmanaged retry loops and ensuring predictable degradation.

## Changes

| File | Change | Notes |
|------|--------|-------|
| *(none)* | not-applied | Retained 2-way failure handling per product decision and test contract stability. |

## Local Verification

- `npm run validate` → **PASS**
- `npm run test:unit` → **133/133 PASS**
- Verification of audio tests (`tests/e2e/autoplay.spec.js` and `tests/unit/delivery.test.js`) confirmed consistent audio lifecycle state transitions.

## Deviations from Assessment

The assessment proposed introducing a 3-way classification in `handlePlayFailure`. This was evaluated and refuted by prior diagnostic runs where non-latching routes created stranded element states and test regressions. The 2-way classification (`NotAllowedError` → `markBlocked()` / everything else → `failed.add(key)`) is preserved.

## Follow-ups

- Surface `element.error.code` in diagnostic logs when troubleshooting runner-specific media errors (e.g. missing physical audio sink in headless environments).
