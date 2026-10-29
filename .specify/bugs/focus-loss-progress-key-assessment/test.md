# Bug Verification: focus-loss tests fail because localStorage key changes with story-scoped progress

- **Slug**: focus-loss-progress-key-assessment
- **Tested**: 2025-10-28
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The fix resolves the issue. Focus-loss tests now correctly read from story-scoped localStorage keys (`hwc.progress:<storyId>`) with fallback to legacy keys. All 3 focus-loss tests pass locally on mobile-chromium.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Ran focus-loss tests | pass | Tests that previously failed now pass |
| New / updated tests | `npx playwright test tests/e2e/focus-loss.spec.js --project=mobile-chromium --reporter=list` | pass | All 3 tests passed (44.4s) |

## Output Excerpts

```
✓  1 [mobile-chromium] › tests/e2e/focus-loss.spec.js:112:1 › playing focus loss clears all playback timers and permits only explicit overlay resume (18.4s)
✓  2 [mobile-chromium] › tests/e2e/focus-loss.spec.js:68:1 › focus loss during pending navigation cancels the queued move and requires overlay resume (26.0s)
✓  3 [mobile-chromium] › tests/e2e/focus-loss.spec.js:11:1 › startup focus loss clears auto-start, pauses audio, saves progress, and requires overlay resume (25.8s)

3 passed (44.4s)
```

## Residual Risks

- Fix is defensive with backwards compatibility for legacy keys.
- CI may still have other failures unrelated to this specific issue.

## Recommendation

Close the bug — verified end-to-end. All focus-loss tests pass with the fix applied.
