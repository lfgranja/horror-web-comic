# Bug Assessment: focus-loss tests fail because localStorage key changes with story-scoped progress

- **Slug**: focus-loss-progress-key-assessment
- **Created**: 2025-10-28
- **Source**: https://github.com/lfgranja/horror-web-comic/actions/runs/40714854265/job/122909645811
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

CI job "gate" failed at step "End-to-end browser matrix" on the focus-loss tests. The failures show:
```
Error: page.evaluate: TypeError: null is not an object (evaluating 'JSON.parse(localStorage.getItem('hwc.progress')).frameId')
```
This occurs in `tests/e2e/focus-loss.spec.js` lines ~40 and ~57 where tests read from `JSON.parse(localStorage.getItem('hwc.progress')).frameId` without null checking and expecting the key to exist.

## Symptom

The focus-loss e2e tests expect progress to be stored under the legacy key `hwc.progress`. But the storage implementation now uses story-scoped keys (`hwc.progress:${storyId}`) when a storyId is set. The tests open the player with fixtures/story.json which has `id: "test-story"`, so main.js will call `storage.setStoryId('test-story')` and progress will be saved under `hwc.progress:test-story`. The tests are reading from the old unscoped key and get null.

## Reproduction

1. Open player with `tests/fixtures/story.json` (story.id = 'test-story')
2. In main.js: `storage.setStoryId(story.id)` is called
3. Player calls `storage.saveProgress()` which uses `this.progressKey()` returning `hwc.progress:test-story`
4. Test tries to read from `localStorage.getItem('hwc.progress')` directly - returns null
5. Test does `JSON.parse(null).frameId` → throws TypeError

## Suspected Code Paths

- `src/scripts/storage.js:98` - `this.progressKey()` returns story-scoped key when storyId is set
- `src/scripts/storage.js:437-441` - `setStoryId()` sets storyId and reloads progress
- `src/scripts/storage.js:443-461` - `saveProgress()` writes to `this.progressKey()`
- `src/scripts/main.js:64` - calls `storage.setStoryId(story.id)`
- `tests/e2e/focus-loss.spec.js:40,57` - read directly from `hwc.progress` without story scoping

## Root Cause Hypothesis

**High confidence.** The codebase migrated to story-scoped progress keys (to support multiple stories), but the focus-loss tests were not updated to use the correct key. The tests need to either look up the key based on the story, or read via the storage API, or construct the key the same way as the app.

Looking up how other tests handle this - for example persistence tests might use the storage API or construct the key differently. Let us look up other tests.

## Proposed Remediation

**Preferred**: Update the focus-loss tests to read progress from the correct story-scoped key. For the fixture story with id "test-story", the key is `hwc.progress:test-story`. Or more robustly, read from `localStorage` for any key starting with `hwc.progress` or construct based on story id from the story loaded in the page.

Alternatively, the tests can do:
```js
const progress = await page.evaluate(() => {
  // Try story-scoped key first
  const storyId = document.querySelector('#player')?.dataset?.storyId || 'test-story';
  const key = storyId ? `hwc.progress:${storyId}` : 'hwc.progress';
  return JSON.parse(localStorage.getItem(key) || localStorage.getItem('hwc.progress'));
});
```

But better to look up what the actual story id is. Or just try both keys.

Also need to look up if the player/main sets any data attributes with storyId. Or look up how the story is identified.

Another approach - in the fixture, story.id is "test-story". The tests load via `/?story=tests/fixtures/story.json` and main.js loads it; the story object has id from the JSON. So in the page context, we need to know the story id.

Alternatively, modify the tests to be more robust:
```js
frameId: (() => {
  // try story-scoped first
  for (let i=0; i<localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('hwc.progress')) {
      const p = JSON.parse(localStorage.getItem(k));
      if (p && p.frameId) return p.frameId;
    }
  }
  return null;
})()
```

But the tests expect specific values. Let us look up the actual fixture again - story.id is "test-story", so key would be `hwc.progress:test-story`. The initial frame is frame-01. That matches.

**Files likely to change**:
- `tests/e2e/focus-loss.spec.js` (3 occurrences at lines ~40, ~57)

**Tests to add or update**:
- Update the tests to read from the correct progress key

## Risks & Considerations

- Tests might need to be compatible with both old and new key formats for backward compatibility
- Need to ensure the fix is correct for all browsers
- The fix should be minimal and not change test intent

## Open Questions

- None - root cause is clear from codebase inspection
