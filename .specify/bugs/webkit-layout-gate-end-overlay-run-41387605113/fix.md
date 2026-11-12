# Bug Fix: webkit-layout-gate end-overlay layout issues (run 41387605113)

- **Slug**: webkit-layout-gate-end-overlay-run-41387605113
- **Updated**: 2026-11-12
- **Assessment**: ./assessment.md
- **Status**: applied (local fix/hardening; awaiting merge autorizado de PR #182 + run verde em `dev`)

## Summary

Hardened end-overlay band/layout for narrow WebKit viewports so navigation controls remain operable and overlay actions remain reachable (FR-033). Control-bar clearance (`--control-bar-top` clamped >= 0, `--control-bar-height`) is published eagerly on the shared `.app-shell` scope from `getBoundingClientRect()`, refreshed on resize/orientation/scroll and description/control-bar `ResizeObserver` changes, and settled on first show with immediate publish plus double-`requestAnimationFrame`. The overlay band is anchored above the bar, the card stays a bounded scroll container, and `.end-actions` is a single sticky group to keep replay inside the painted band at 320x568.

Commits: `ffa3445` (sticky `.end-actions` + band anchor) e `220332e` (CI pin).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/scripts/player.js` | modified | Eager/shared-scope clearance publish, control-bar+description resize observation, first-show double-rAF settle. |
| `src/styles/player.css` | modified | Band bounded above control bar via `--control-bar-top`; scrollable constrained card; sticky `.end-actions` group; actions `pointer-events:auto`; misleading trailing comment removed. |
| `.github/workflows/ci.yml` | modified | gate/webkit-layout-gate pinned to `ubuntu-24.04` |
| `tests/e2e/theme-switcher.spec.js` | modified | SC-005 probe attribution (total-own) |

## Tests Added or Updated

- None added. Relies on existing `tests/e2e/zz-end-state-coverage.spec.js` and related layout specs. `tests/e2e/theme-switcher.spec.js` corrected for the same probe-attribution family.

## Local Verification

- `node --check src/scripts/player.js` → ok
- `npm run -s validate` → pass
- `npm run report` → COMPATIBLE, 0 findings
- `npm run test:unit` → 237/237 pass (3 novos testes de regressão cross-tab)
- `npm run build` → pass (17315 B script / 4271 B style compressed)
- Targeted E2E (Chromium/Firefox): 48/48 pass
- **CI PR #182:** `webkit-layout-gate` **success**; `gate` E2E → **1349 passed / 1 failed** (SC-005 flake; fixed em `2fd0be6`); `macos-webkit-compositor` passou em 43140031261. Run final após merge em `dev`: a confirmar.

## Deviations from Assessment

- Included control-bar observation, non-negative top clamp, and single sticky action-group correction to preserve replay clickability/reachability within the band while maintaining non-interception.

## Follow-ups

- Merge autorizado de PR #182; marcar `Result: verified` no `test.md` com o run verde; fechar T047 (specs/005) e ESC-HWC-20261111-001.
