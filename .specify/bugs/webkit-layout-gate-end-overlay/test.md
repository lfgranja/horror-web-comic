# Bug Test: webkit-layout-gate end-overlay layout issues on mobile-webkit

- **Slug**: webkit-layout-gate-end-overlay
- **Tested**: 2026-11-01
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Status**: pending-verification

## Test Plan
```bash
npx playwright test tests/e2e/zz-end-state-coverage.spec.js --project=mobile-webkit
npx playwright test tests/e2e/theme-a11y.spec.js --project=mobile-webkit
```

## Expected Behavior
- Control bar fits within height budget at 320x568/360x800
- End overlay has sufficient space, touch targets meet 44px minimum
- WebKit layout gate passes

## Verification
- [ ] zz-end-state-coverage.spec.js passes on mobile-webkit
- [ ] theme-a11y.spec.js passes on mobile-webkit
- [ ] No layout overflow issues
