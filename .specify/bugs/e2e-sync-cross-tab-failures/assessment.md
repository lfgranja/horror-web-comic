# Bug Assessment: e2e-sync-cross-tab-failures

- **Slug**: e2e-sync-cross-tab-failures
- **Assessed**: 2026-11-01
- **Severity**: high
- **Status**: assessed

## Symptom
All 4 tests in `tests/e2e/sync.spec.js` fail across all 5 Playwright projects. The second tab never adopts progress updates from the first tab - `#player` stays at `data-frame-id=frame-01` instead of updating.

## Reproduction
1. Run `npx playwright test tests/e2e/sync.spec.js` across projects
2. Tests fail: "adopts the newest reading position in another tab", "synchronizes through BroadcastChannel when local storage is unavailable", "uses storage events when BroadcastChannel is unavailable", "resolves concurrent progress by updatedAt, sequence, and tab identifier"
3. Second tab's `#player` does not get updated `data-frame-id` (stays at frame-01)

## Root Cause
Missing wiring between StorageManager progress events and CinematicPlayer. StorageManager correctly emits progress updates via `onProgress()` (tested in unit tests), and CinematicPlayer has `adoptProgress(record)` method to apply remote updates, but nothing subscribes to storage progress events in the app code (main.js). The player never adopts cross-tab progress changes.

## Affected Areas
- `src/scripts/main.js` - missing subscription
- `src/scripts/storage.js` - working correctly (emits events)
- `src/scripts/player.js` - has `adoptProgress()` but unused

## Proposed Fix
Subscribe to `storage.onProgress()` in main.js and call `player.adoptProgress(record)` when remote progress updates arrive.
