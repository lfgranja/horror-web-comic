# Bug Fix: focus-loss tests fail because localStorage key changes with story-scoped progress

- **Slug**: focus-loss-progress-key-assessment
- **Fixed**: 2025-10-28
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Updated the focus-loss e2e tests to look for progress in story-scoped localStorage keys (e.g., `hwc.progress:test-story`) when the legacy unscoped key `hwc.progress` is not found. This matches the storage implementation that now uses per-story progress keys when a storyId is set.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `tests/e2e/focus-loss.spec.js` | modified | Updated both occurrences that read progress from localStorage to be backwards-compatible with story-scoped keys |

## Diff Highlights (optional)

Both affected tests now do:
```js
let progress = null;
try {
  progress = JSON.parse(localStorage.getItem('hwc.progress') || 'null');
} catch {}
if (!progress) {
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('hwc.progress')) {
      try {
        const candidate = JSON.parse(localStorage.getItem(key) || 'null');
        if (candidate && candidate.frameId) {
          progress = candidate;
          break;
        }
      } catch {}
    }
  }
}
frameId: progress?.frameId
```

## Tests Added or Updated

- `tests/e2e/focus-loss.spec.js` - Updated to handle story-scoped progress keys (3 tests affected)

## Local Verification

- Commands run: `npx playwright test tests/e2e/focus-loss.spec.js --project=mobile-chromium --reporter=list` → 3 passed (13.1s)
- Manual checks: Verified tests now correctly find progress saved under `hwc.progress:test-story` by the storage layer

## Deviations from Assessment

None - fix matches the proposed remediation exactly.

## Follow-ups

- Consider updating other tests that might read from the legacy `hwc.progress` key directly (grep for similar patterns)
- The fix is backwards-compatible so it will work with both old and new key formats
