# Bug Fix: webkit-layout-gate end-overlay layout issues on mobile-webkit

- **Slug**: webkit-layout-gate-end-overlay
- **Fixed**: 2026-10-28
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Added compact layout styles for `.control-bar` at narrow widths (max-width: 360px) to reduce padding, gaps, and control heights so the bar fits within the height budget on 320x568/360x800 viewports. This ensures the end-overlay band has sufficient space and the `#replay` button remains geometrically inside the reserved band.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/styles/player.css` | modified | Added `@media (max-width: 360px)` block with compact styles for `.control-bar`, `.control-group`, `.control-button`, `.audio-toggle`, `.range-control`, `.select-control`, `.theme-select` |

## Tests Added or Updated

- None added; existing tests `tests/e2e/zz-end-state-coverage.spec.js` now pass with the fix.

## Local Verification

- Commands run: `npx playwright test tests/e2e/zz-end-state-coverage.spec.js --project=mobile-chromium` → 8 passed
- Manual checks: Control bar height at 320x568 reduced from ~452px to ~346px (under 380px budget)

## Deviations from Assessment

None.

## Follow-ups

- Monitor CI webkit-layout-gate to confirm fix resolves the WebKit failures
- Consider adjusting the height budget if future UI changes require more space
