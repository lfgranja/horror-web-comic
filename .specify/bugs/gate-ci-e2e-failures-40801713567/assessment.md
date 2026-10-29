# Bug Assessment: gate CI failures (e2e matrix) after sync test fixes

- **Slug**: gate-ci-e2e-failures-40801713567
- **Created**: 2026-10-29
- **Source**: https://github.com/lfgranja/horror-web-comic/actions/runs/40801713540, https://github.com/lfgranja/horror-web-comic/actions/runs/40801713567
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

CI runs on commit dcde90a (which includes sync test fixes from PR #162) still fail at step "End-to-end browser matrix". The gate job fails. Failing tests identified from CI Playwright report artifacts:

1. `persistence-flow.spec.js` - "real UI remains functional and safely falls back when browser storage is unavailable" - player hidden, error screen shown (same root cause as sync tests: Storage.prototype methods throw, crashing main.js direct localStorage access)
2. `zz-legacy-resume.spec.js` - 3 tests failing - "Received: undefined" when reading `keys['hwc.progress']` (storage now uses story-scoped keys `hwc.progress:fixture-story`)
3. `zz-legacy-end-state.spec.js` - "auto-advance to final frame shows overlay without End key" - seeded progress under unscoped key ignored
4. `zz-resume-final-frame.spec.js` - "lands on the last frame, reports ended, and shows the replay overlay" - seeded progress under unscoped key ignored
5. `resume.spec.js` - uses unscoped `hwc.progress` but production story uses `hwc.progress:main-story`
6. `audio-timing.spec.js` - "stops within 100ms, resumes the same time, and reaches target by 300ms" - volume not reaching 0 (timing/flaky)
7. `theme-switcher.spec.js` - SC-005 latency measurement 287ms vs <250ms (timing/flaky)
8. `zz-legacy-reduced-motion.spec.js` - "no long CSS animation runs during advance under reduced motion" - 1 animated element found (likely flaky/environmental)

## Symptom

After fixing sync e2e tests for story-scoped progress keys, additional e2e tests still fail because they (a) override Storage.prototype methods to throw (crashing main.js) or (b) seed/read progress under unscoped `hwc.progress` key instead of story-scoped `hwc.progress:<storyId>`.

## Reproduction

1. Run CI on branch fix/focus-loss-progress-key-tests at commit dcde90a
2. Step "End-to-end browser matrix" fails
3. Download Playwright report artifact from run 40801713567
4. Inspect error-context.md files for failing tests

## Suspected Code Paths

- `tests/e2e/persistence-flow.spec.js:52` - overrides Storage.prototype methods to throw
- `tests/e2e/zz-legacy-resume.spec.js` - uses `keys['hwc.progress']` and seeds `hwc.progress`
- `tests/e2e/zz-legacy-end-state.spec.js:57` - seeds `hwc.progress`
- `tests/e2e/zz-resume-final-frame.spec.js:19` - seeds `hwc.progress`
- `tests/e2e/resume.spec.js:12` - seeds `hwc.progress` (production story id is "main-story")

## Root Cause Hypothesis

**High confidence.** The same two root causes as the previous bug assessment:
1. Storage.prototype method override to throw crashes main.js which accesses localStorage directly outside try/catch (affects persistence-flow.spec.js)
2. Tests seed/read progress under unscoped `hwc.progress` key but storage uses `hwc.progress:<storyId>` (affects zz-legacy-*, zz-resume-final-frame, resume.spec.js)

The audio-timing, theme-switcher, and reduced-motion failures appear to be pre-existing flaky/timing tests not related to the story-scoped key changes.

## Proposed Remediation

**Preferred**: Fix the remaining tests affected by story-scoped progress keys and localStorage unavailability.

**Files likely to change**:
- `tests/e2e/persistence-flow.spec.js` - change Storage.prototype override to set window.localStorage = undefined
- `tests/e2e/zz-legacy-resume.spec.js` - update `hwc.progress` to `hwc.progress:fixture-story`
- `tests/e2e/zz-legacy-end-state.spec.js` - update `hwc.progress` to `hwc.progress:fixture-story`
- `tests/e2e/zz-resume-final-frame.spec.js` - update `hwc.progress` to `hwc.progress:fixture-story`
- `tests/e2e/resume.spec.js` - update `hwc.progress` to `hwc.progress:main-story`

**Tests to add or update**:
- Fixed tests to use story-scoped progress keys and handle unavailable localStorage safely

## Risks & Considerations

- The audio-timing, theme-switcher, and reduced-motion failures may be pre-existing flaky tests unrelated to these changes
- Full CI verification needed across all 5 browser projects

## Open Questions

- [NEEDS CLARIFICATION: Are the audio-timing, theme-switcher, and reduced-motion failures pre-existing flakiness or regressions?]

## Next Suggested Step

`/speckit.bug.fix slug=gate-ci-e2e-failures-40801713567`
