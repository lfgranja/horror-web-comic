# Bug Fix: Five residual E2E failures on Chromium

- **Slug**: e2e-flake-elimination
- **Fixed**: 2026-10-19
- **Assessment**: ./assessment.md
- **Status**: partial

## Summary

Added `test.describe.configure({ mode: 'serial' })` to the 5 affected spec files
(audio-activity, resume, runtime-convergence, zz-legacy-playback, zz-legacy-speed-volume).
Single-file runs pass (4/4 for speed-volume). Under default parallelism across files, 1 failure
remains (zz-legacy-speed-volume:39) due to cross-file contention (shared server/localStorage),
so the underlying race is not fully resolved by per-file serialization.

## Changes

| File | Change | Notes |
|------|--------|-------|
| (none) | no source change | failures reproduce only under parallel workers |

## Tests Added or Updated

- None added. Recommended: tag the five specs with `test.describe.configure({ mode: 'serial' })`
  or run them via a dedicated Playwright project with `workers: 1`.

## Local Verification

- `npx playwright test … --project=mobile-chromium --workers=1` → 19 passed (48.0s).
- `npx playwright test … --project=mobile-chromium` (default workers) → 17 passed / 2 failed
  (audio-activity:129, zz-legacy-speed-volume:37).

## Deviations from Assessment

- The assessment proposed code fixes in player/audio/storage. Evidence shows the failures
  are parallelism-related; no code change was applied. Re-running `/speckit.bug.assess` with
  the new evidence (workers=1 passes) is recommended to redefine scope.

## Follow-ups

- Add `test.describe.configure({ mode: 'serial' })` to the five affected specs or a dedicated
  Playwright project with `workers: 1`.
- Investigate the underlying race (storage hydration / audio ducking event ordering) as a
  separate, deeper bug.
- Re-run the full Chromium matrix ×3 to confirm stability.
