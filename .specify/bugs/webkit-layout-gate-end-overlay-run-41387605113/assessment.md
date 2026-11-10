# Bug Assessment: webkit-layout-gate end-overlay layout issues (run 41387605113)

- **Slug**: webkit-layout-gate-end-overlay-run-41387605113
- **Created**: 2026-11-02
- **Source**: https://github.com/lfgranja/horror-web-comic/actions/runs/41387605113/job/125091806325 (pasted failure)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

webkit-layout-gate failed in 2m 16s on run 41387605113. Failures:
- `[mobile-webkit] › tests/e2e/zz-end-state-coverage.spec.js:16:3 › zz end overlay never covers the navigation controls at 320x568`
- `[desktop-webkit] › tests/e2e/zz-end-state-coverage.spec.js:16:3 › zz end overlay never covers the navigation controls at 320x568`
30 passed (1.4m). Traces/artifacts attached.

## Symptom

On narrow WebKit viewports (320x568), end overlay does not properly cover/navigation controls remain exposed or overlay band containment fails. Test expects end overlay to cover navigation controls.

## Reproduction

1. Run `tests/e2e/zz-end-state-coverage.spec.js` on mobile-webkit/desktop-webkit at 320x568
2. Navigate to end state
3. Check that end overlay covers navigation controls per test expectations

## Suspected Code Paths

- `tests/e2e/zz-end-state-coverage.spec.js` — asserts overlay covers nav controls
- `src/styles/player.css` — end overlay positioning/band calculation, control bar layout
- `src/scripts/player.js` — `publishControlBarHeight()`, showEndOverlay
- `index.html`, `alojamento.html` — control bar structure

## Root Cause Hypothesis

**Confidence: high.** Control bar wraps at narrow widths causing tall bar; end overlay band calculation/covering logic fails in WebKit. Similar to existing `webkit-layout-gate-end-overlay` issue.

## Proposed Remediation

**Preferred**: Adjust end overlay styles to ensure full coverage of navigation controls at narrow viewports in WebKit (ensure overlay z-index/positioning covers control bar area). Also consider compact control bar layout if needed.

**Files likely to change**:
- `src/styles/player.css`

**Tests to add or update**:
- Existing `tests/e2e/zz-end-state-coverage.spec.js` should pass

## Risks & Considerations

- WebKit-specific rendering differences
- Must not regress other browsers

## Open Questions

- [NEEDS CLARIFICATION: Exact CSS selector/coverage issue from trace]

## Next Suggested Step

`/speckit.bug.fix slug=webkit-layout-gate-end-overlay-run-41387605113`
