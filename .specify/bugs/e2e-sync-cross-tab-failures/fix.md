# Bug Fix: e2e-sync-cross-tab-failures

- **Slug**: e2e-sync-cross-tab-failures
- **Fixed**: 2026-11-01
- **Assessment**: ./assessment.md

## Changes Made
- `src/scripts/main.js`: Added subscription to `storage.onProgress()` after player/theme wiring to call `player.adoptProgress(record)` on remote progress updates. Wrapped in try/catch for safety.

## Code Changes
```js
storage.onProgress((record) => {
  try {
    if (player?.adoptProgress) {
      player.adoptProgress(record);
    }
  } catch {}
});
```

## Tests Added/Updated
None - fix is in app wiring. Existing unit tests for storage.onProgress() continue to pass.

## Verification
Ran `npx playwright test tests/e2e/sync.spec.js --project=mobile-chromium` - all 7 tests pass.
