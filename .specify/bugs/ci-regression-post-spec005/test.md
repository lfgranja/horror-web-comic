# Bug Verification: CI regression after spec 005 merge

- **Slug**: ci-regression-post-spec005
- **Tested**: 2026-10-28
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

All previously failing tests now pass. The E2E accessibility suite (4/4) passes including States 1-4, confirming focus management on #continue-silent is restored and the blocked overlay flow is dismissed correctly in automated runs. SC-018 perf tests (2/2) pass, confirming transitions are measurable with no per-frame app work.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) E2E accessibility | `npx playwright test tests/e2e/accessibility.spec.js --project=mobile-chromium` | pass | 4/4 passed (Estados 1-4); #continue-silent focus restored |
| Reproduction (post-fix) SC-018 perf | `npx playwright test tests/perf/fps.spec.js --project=mobile-chromium -g "SC-018"` | pass | 2/2 passed; transitions measurable, no per-frame app work |
| Unit tests | `npm run test:unit` | pass | 227/227 passed (from earlier) |
| Manifest validation | `npm run validate` | pass | story.json, stories/o-alojamento.json, catalog.json valid |
| New/updated tests | (none added) | not-run | Existing tests sufficient |

## Output Excerpts

```
Accessibility: 4 passed (31.9s)
SC-018 perf: 2 passed (15.1s)
```

## Residual Risks

- WebKit on Fedora remains an environment limitation (CI uses ubuntu/macOS).
- Full `npm run ci` across all 5 projects should be run in CI to confirm no cross-browser regressions.

## Recommendation

Close the bug — verified end-to-end on the affected paths (E2E accessibility + SC-018 perf on mobile-chromium). Root causes (missing player.schedule(), missing #audio-toggle, overlays inside #player blocking focus, blocking sensory dialog in automated runs, safe-accessible disabling animations) are addressed. Full CI run across all 5 projects recommended to confirm cross-browser stability.
