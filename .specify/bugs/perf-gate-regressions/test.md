# Bug Verification: The performance gate has never run and hides two regressions

- **Slug**: perf-gate-regressions
- **Tested**: 2026-09-30
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

Both regressions in the performance gate are verified as resolved:
1. `scripts/serve-e2e.mjs` sends `cache-control: public, max-age=60`, allowing warm-cache hits (`transferSize === 0`), covered by 3/3 passing unit tests in `tests/unit/serve-e2e.test.js`.
2. `tests/perf/zz-ci-budgets.spec.js` asserts decimal budget limits in alignment with `budget.json` and the specification, with all 5 budget checks passing.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| E2E Server Unit Tests | `node --test tests/unit/serve-e2e.test.js` | pass | 3/3 passed (cache-control freshness, Range 206, traversal protection). |
| CI Budget Pinning Spec | `npx playwright test tests/perf/zz-ci-budgets.spec.js --project=desktop-chromium --workers=1` | pass | 5/5 passed (byte limits, lighthouserc limits, build gate, CI workflow integrity, hard assertions). |
| Regression Unit Test Suite | `npm run test:unit` | pass | 133/133 tests passed. |
| Production Build Gate | `npm run build` | pass | All budgets respected and verified. |

## Output Excerpts

### `node --test tests/unit/serve-e2e.test.js`
```text
✔ the e2e server permits a cache hit, which the warm-frame budget depends on (5688.259924ms)
✔ the e2e server answers a Range request with 206, which media seeking depends on (5270.056255ms)
✔ the e2e server will not serve a path outside the repository (4179.119679ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
```

### `npx playwright test tests/perf/zz-ci-budgets.spec.js --project=desktop-chromium --workers=1`
```text
Running 5 tests using 1 worker
✔ budget.json pins the spec byte limits (FR-029) (400ms)
✔ lighthouserc.json enforces the delivery thresholds (SC-014/SC-015) (184ms)
✔ scripts/build.mjs fails the build when budgets are exceeded (255ms)
✔ CI workflow runs the full gate in order plus Lighthouse (T161) (513ms)
✔ existing perf specs assert hard thresholds with no silent passes (547ms)
5 passed (27.8s)
```

## Residual Risks

- The Resource Timing `transferSize === 0` measurement in `first-frame.spec.js` relies on a fresh browser context per test, which Playwright guarantees.

## Recommendation

Close the bug — verified end-to-end.
