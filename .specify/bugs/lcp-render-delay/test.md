# Bug Verification: The 843 ms render delay is mostly a simulation artefact, not main-thread work

- **Slug**: lcp-render-delay
- **Tested**: 2026-09-30
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The verification confirmed that no code changes were necessary (verdict: invalid). The reported render delay was an attribution artifact of Lighthouse's `simulate` throttling model, while under real `devtools` throttling the render delay is only 221 ms (dominated by the intentional 600 ms narrative fade transition). All budget and performance gates pass as expected.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Controlled Throttling Comparison | Lighthouse `simulate` vs `devtools` comparison (recorded in `assessment.md`) | pass | Confirms total LCP is preserved (1593 vs 1515 ms) while simulated render delay attribution was inflated. |
| CI Budget & Lighthouse Constraints | `npx playwright test tests/perf/zz-ci-budgets.spec.js --project=desktop-chromium --workers=1` | pass | 5/5 tests pass, verifying that `lighthouserc.json` and delivery budgets remain enforced. |
| Story Manifest Validation | `npm run validate` | pass | Valid narrative structure in `src/data/story.json`. |

## Output Excerpts

### `npx playwright test tests/perf/zz-ci-budgets.spec.js --project=desktop-chromium --workers=1`
```text
Running 5 tests using 1 worker
✔ budget.json pins the spec byte limits (FR-029) (297ms)
✔ lighthouserc.json enforces the delivery thresholds (SC-014/SC-015) (510ms)
✔ scripts/build.mjs fails the build when budgets are exceeded (113ms)
✔ CI workflow runs the full gate in order plus Lighthouse (T161) (300ms)
✔ existing perf specs assert hard thresholds with no silent passes (395ms)
5 passed (24.8s)
```

## Residual Risks

- Sub-phase breakdowns in synthetic Lighthouse runs should not be used as isolated optimization targets without correlating against real DevTools performance traces.

## Recommendation

Close the bug — verified invalid/simulation artifact.
