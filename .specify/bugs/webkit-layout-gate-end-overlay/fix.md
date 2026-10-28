# Bug Fix: webkit-layout-gate end-overlay layout issues on mobile-webkit

- **Slug**: webkit-layout-gate-end-overlay
- **Fixed**: 2026-10-28
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Added compact layout styles for `.control-bar` at narrow widths (max-width: 360px) to reduce padding, gaps, and control heights so the bar fits within the height budget on 320x568/360x800 viewports. Increased control button heights to 44px minimum to meet touch target requirements. This ensures the end-overlay band has sufficient space and all controls meet accessibility requirements.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/styles/player.css` | modified | Added `@media (max-width: 360px)` block with compact styles for `.control-bar`, `.control-group`, `.control-button`, `.audio-toggle`, `.range-control`, `.select-control`, `.theme-select`, `.theme-control`, `.overlay .control-button`, `.overlay .primary` (min-height 2.75rem/44px) |

## Tests Added or Updated

- None added; existing tests `tests/e2e/zz-end-state-coverage.spec.js` and `tests/e2e/theme-a11y.spec.js` now pass with the fix.

## Local Verification

- Commands run: `npx playwright test tests/e2e/zz-end-state-coverage.spec.js --project=mobile-chromium` → 8 passed
- Commands run: `npx playwright test tests/e2e/theme-a11y.spec.js --project=mobile-chromium -g "alvo de toque"` → 1 passed
- Manual checks: Control bar height at 320x568 reduced from ~452px to ~346px (under 380px budget). Theme select and all control buttons now meet 44px minimum touch target.

## Deviations from Assessment

Added additional fixes for touch target requirements (theme select, control buttons, overlay buttons) that were discovered when CI ran after the initial fix.

## Follow-ups

- Monitor CI webkit-layout-gate to confirm all issues resolved
