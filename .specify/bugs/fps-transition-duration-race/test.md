# Bug Verification: the SC-018 fps test measures the transition before its duration is published

- **Slug**: fps-transition-duration-race
- **Tested**: 2026-09-30
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The measurement race in `tests/perf/fps.spec.js` is resolved. The test now observes both `data-transition` and `data-image-loading`, sampling `animationDuration` only when the transition animation is actually live, and enforcing that zero animation frames are scheduled by the app during transitions (`APP_FRAME_BUDGET = 0`). All 7 performance budget and FPS specs pass.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| FPS Transition & CI Budget Specs | `npx playwright test tests/perf/fps.spec.js tests/perf/zz-ci-budgets.spec.js --project=desktop-chromium --workers=1` | pass | 7/7 passed. Duration correctly captured; `appFrames=0` verified on both SVG and raster arms. |
| Regression Unit Test Suite | `npm run test:unit` | pass | 133/133 tests passed. |
| Manifest Integrity Check | `npm run validate` | pass | Story manifest valid. |
| Negative Gate Verification | Verified via `zz-ci-budgets.spec.js` meta-tests | pass | Prevents regression to uncalibrated flat 60 fps floor or disabled budgets. |

## Output Excerpts

### `npx playwright test tests/perf/fps.spec.js tests/perf/zz-ci-budgets.spec.js --project=desktop-chromium --workers=1`
```text
Running 7 tests using 1 worker
SC-018 host idle 60.00 fps, transition 31.86 fps, ratio 0.531, app frames 0
✔ SC-018 runs transitions on the compositor, with no per-frame work from the app (9.7s)
SC-018-COMPARISON fixture-svg baseline=60.00 transition=29.67 ratio=0.495 appFrames=0 | production-raster baseline=50.54 transition=7.86 ratio=0.156 appFrames=0
✔ SC-018 records the fixture-versus-production transition comparison (17.1s)
✔ budget.json pins the spec byte limits (FR-029) (114ms)
✔ lighthouserc.json enforces the delivery thresholds (SC-014/SC-015) (232ms)
✔ scripts/build.mjs fails the build when budgets are exceeded (71ms)
✔ CI workflow runs the full gate in order plus Lighthouse (T161) (184ms)
✔ existing perf specs assert hard thresholds with no silent passes (186ms)
7 passed (50.3s)
```

## Residual Risks

- **Host-dependent framerate measurement**: Absolute framerates continue to depend on host load/rasterizer capabilities; the test enforces that app main-thread work remains 0 and prints host vs transition metrics for diagnostic visibility.
- **macOS CI job for hardware-composited WebKit**: Software WebKit in Linux environments is complemented by the dedicated `macos-webkit-compositor` CI job.

## Recommendation

Close the bug — verified end-to-end.
