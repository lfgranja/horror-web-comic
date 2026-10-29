# Context

CI is failing on focus-loss e2e tests. The failures show `TypeError: null is not an object (evaluating 'JSON.parse(localStorage.getItem('hwc.progress')).frameId')` because tests read from the legacy unscoped `hwc.progress` key, but storage now uses story-scoped keys (`hwc.progress:${storyId}`) when a storyId is set (fixtures/story.json has id "test-story", main.js calls `storage.setStoryId(story.id)`). The fix is to update the tests to read from the correct story-scoped key (or search for any hwc.progress* key).

# Approach

1. **Update `tests/e2e/focus-loss.spec.js` line ~30-36 (first test)**: Replace direct read of `localStorage.getItem('hwc.progress')` with logic that tries the legacy key first, then scans for any key starting with `hwc.progress` to find the story-scoped progress record. Extract `frameId` safely (null if not found).

2. **Update `tests/e2e/focus-loss.spec.js` line ~57-63 (second test)**: Apply the same fix to read from the correct progress key.

3. **Verify fix**: Run the focus-loss tests to confirm they pass. The tests should now correctly find the progress saved under `hwc.progress:test-story`.

# Critical files & anchors

- `tests/e2e/focus-loss.spec.js:30-36,57-63` - direct localStorage access to legacy key causing null reference
- `src/scripts/storage.js:98,437-461` - story-scoped key logic (`progressKey()`, `setStoryId()`, `saveProgress()`)
- `src/scripts/main.js:64` - calls `storage.setStoryId(story.id)`

# Verification

1. Run focus-loss tests: `npx playwright test tests/e2e/focus-loss.spec.js --reporter=list` from repo root. All 3 tests should pass across all projects (or at least not fail with the null reference error).
2. If needed, run just on chromium to debug faster: `npx playwright test tests/e2e/focus-loss.spec.js --project=mobile-chromium --reporter=list`

# Assumptions & contingencies

- Assumption: The fixture story's id is "test-story" so the key is `hwc.progress:test-story`. If the story structure changes, scanning for any key starting with `hwc.progress` is more robust than hardcoding the story id.
- Fallback: If no progress is found under any `hwc.progress*` key, the tests would fail - but looking at how the tests work, progress should be saved by the player before/during focus loss events (player calls `saveProgress()` on pause/focus loss).
