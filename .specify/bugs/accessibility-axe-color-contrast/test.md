# Bug Test: accessibility Axe-Core color-contrast failures in CI

- **Slug**: accessibility-axe-color-contrast
- **Tested**: 2026-11-01
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Status**: pending-verification

## Test Plan

1. Run Axe-Core accessibility tests on affected projects:
```bash
npx playwright test tests/e2e/accessibility.spec.js --project=mobile-chromium --project=desktop-chromium
```
2. Also run contrast-specific tests:
```bash
npx playwright test tests/e2e/contrast.spec.js tests/e2e/zz-css-contrast.spec.js
```

## Expected Behavior
- No serious `color-contrast` or `color-contrast-enhanced` violations from Axe-Core
- Tests pass on all projects where they previously failed (mobile-chromium, desktop-chromium)

## Verification
- [x] accessibility.spec.js passes on mobile-chromium
- [ ] accessibility.spec.js passes on desktop-chromium (not verified in this session)
- [ ] No new contrast violations introduced
- [ ] Visual regression acceptable across all 5 themes

## Notes
Token adjustments made in `src/styles/tokens.css` for all themes. May need per-element adjustments if violations persist.
