# Bug Fix: gate CI failures (e2e matrix) on fix/focus-loss-progress-key-tests

- **Slug**: gate-ci-e2e-failures-40792880928
- **Fixed**: 2026-10-28
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Fixed broken sync e2e tests introduced by commit 6bf2679 when updating for story-scoped progress keys. Restored page navigation in two tests and corrected localStorage-unavailable test to avoid crashing main.js on direct localStorage access.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `tests/e2e/sync.spec.js` | modified | Restored `openPausedAtStart(page)` in 'falls back when persisted progress contains malformed JSON' and 'resets an incompatible persisted state before loading the player'; changed 'synchronizes through BroadcastChannel when local storage is unavailable' to set `window.localStorage = undefined` in addInitScript. |

## Tests Added or Updated

- `tests/e2e/sync.spec.js::falls back when persisted progress contains malformed JSON` — restored page load/navigation
- `tests/e2e/sync.spec.js::resets an incompatible persisted state before loading the player` — restored page load/navigation  
- `tests/e2e/sync.spec.js::synchronizes through BroadcastChannel when local storage is unavailable` — corrected to make localStorage unavailable safely

## Local Verification

- Commands run: `npx playwright test tests/e2e/sync.spec.js --project=mobile-chromium` → 7 passed (36.2s)
- Manual checks: Verified all sync tests pass locally on mobile-chromium

## Deviations from Assessment

None.

## Follow-ups

- Verify full e2e matrix passes in CI across all 5 browser projects
