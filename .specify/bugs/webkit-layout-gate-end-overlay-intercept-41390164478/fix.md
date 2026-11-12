# Bug Fix: webkit-layout-gate end-overlay intercepts navigation controls (run 41390164478)

- **Slug**: webkit-layout-gate-end-overlay-intercept-41390164478
- **Updated**: 2026-11-12
- **Assessment**: ./assessment.md
- **Status**: applied (local fix/hardening; awaiting merge autorizado de PR #182 + run verde em `dev`)

## Summary

Hardened end-overlay containment above the control bar for narrow WebKit viewports and preserved replay/action reachability inside the overlay band (FR-033). Control-bar clearance is derived from `getBoundingClientRect()` and published eagerly on the shared `.app-shell` scope (`--control-bar-top`, clamped >= 0, and `--control-bar-height`) so the fixed overlay band stays clear of navigation controls. Measurement is refreshed on resize/orientation/scroll, on description/control-bar resize (`ResizeObserver`), and on first show with immediate publish plus double-`requestAnimationFrame` settle. End actions are pinned as a single sticky `.end-actions` group inside the scrollable card to keep `#replay` inside the painted band at 320x568.

Commits: `ffa3445` (sticky `.end-actions` + band anchor) e `220332e` (CI pin).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/scripts/player.js` | modified | `publishControlBarHeight()` publishes viewport-relative clearance to shared scope/root; `cacheDom()` observes description and control bar; `showEndOverlay()` performs eager + double-rAF settle on first show. |
| `src/styles/player.css` | modified | `#end-overlay` band anchored to `--control-bar-top`; card constrained/scrollable; `.end-actions` sticky group (not per-sibling), actions `pointer-events:auto`. |
| `.github/workflows/ci.yml` | modified | gate/webkit-layout-gate pinned to `ubuntu-24.04` |
| `tests/e2e/theme-switcher.spec.js` | modified | SC-005 probe attribution (total-own) |

## Tests Added or Updated

- None added. Relies on existing `tests/e2e/zz-end-state-coverage.spec.js` and layout-gate coverage set. `tests/e2e/theme-switcher.spec.js` corrected for the same probe-attribution family.

## Local Verification

- `node --check src/scripts/player.js` → ok
- `npm run -s validate` → manifests/catalog valid
- `npm run report` → COMPATIBLE, 0 findings, budgets ok
- `npm run -s test:unit` → 237/237 pass (3 novos testes de regressão cross-tab)
- `npm run build` → pass (17315 B script / 4271 B style compressed)
- Targeted E2E (Chromium/Firefox): 48/48 pass
- **CI PR #182:** `webkit-layout-gate` **success** (run 43134037388 / 43140031261); `gate` E2E → **1349 passed / 1 failed** (SC-005 flake; fixed em `2fd0be6`); `macos-webkit-compositor` passou em 43140031261. Run final após merge em `dev`: a confirmar.

## Deviations from Assessment

- Added replay/action reachability hardening (single sticky action group) and control-bar resize observation after local regression/robustness analysis, while preserving FR-033 non-interception.

## Follow-ups

- Merge autorizado de PR #182; marcar `Result: verified` no `test.md` com o run verde; fechar T047 (specs/005) e ESC-HWC-20261111-001.
