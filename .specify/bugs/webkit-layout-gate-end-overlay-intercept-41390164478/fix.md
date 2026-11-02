# Bug Fix: webkit-layout-gate end-overlay intercepts navigation controls (run 41390164478)

- **Slug**: webkit-layout-gate-end-overlay-intercept-41390164478
- **Fixed**: 2026-11-02
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Tightened end overlay bottom extent to ensure it doesn't intercept navigation controls in WebKit at narrow viewports.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/styles/player.css` | modified | Adjusted end-overlay bottom calculation to be more conservative |

## Tests Added or Updated

- None (relies on existing `tests/e2e/zz-end-state-coverage.spec.js`)

## Local Verification

- Commands run: `node scripts/validate-manifest.mjs` → catalog and manifests valid

## Deviations from Assessment

None.

## Follow-ups

- Monitor webkit-layout-gate on CI
