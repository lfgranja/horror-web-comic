# Bug Test: webkit-layout-gate end-overlay layout issues on mobile-webkit

- **Slug**: webkit-layout-gate-end-overlay
- **Tested**: 2026-11-01T20:00:00Z
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

Fixed control bar layout at narrow widths (reduced padding/gaps/min-heights in player.css). All webkit layout gate tests pass including end-state coverage and control bar height budget.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npx playwright test tests/e2e/zz-end-state-coverage.spec.js --project=mobile-webkit` | pass | 8/8 passed |
| Layout gate suite | `npx playwright test tests/e2e/reflow.spec.js tests/e2e/zz-css-reflow.spec.js tests/e2e/zz-end-state-coverage.spec.js tests/e2e/theme-a11y.spec.js --project=mobile-webkit --project=desktop-webkit` | pass | 32/32 passed |
| New / updated tests | N/A | skipped | Existing tests sufficient |
| Regression suite | N/A | skipped | Focused on layout gate |

## Output Excerpts

```
Running 8 tests using 1 worker
········
  8 passed (1.0m)

Running 32 tests using 1 worker
················
  32 passed (2.5m)
```

## Residual Risks

- None identified. Fix addresses root cause (control bar too tall at narrow widths starving end-overlay band).

## Recommendation

Close the bug — verified end-to-end on WebKit layout gate.
