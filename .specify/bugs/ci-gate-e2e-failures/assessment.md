# Bug Assessment: ci gate e2e failures (CI run 40983459997)

- **Slug**: ci-gate-e2e-failures
- **Created**: 2026-10-29
- **Source**: https://github.com/lfgranja/horror-web-comic/actions/runs/40983459997/job/123828802588 (allowlisted host: github.com)
- **Verdict**: likely valid, needs reproduction
- **Severity**: high

## Report (verbatim or summarized)

CI gate job (run 40983459997) failed: 9 failed, 2 flaky, 15 skipped, 1299 passed (34.5m). Failures:
- `accessibility.spec.js:105` (Estado 1: Repouso Canônico & Matriz Ortogonal) — mobile-chromium, desktop-chromium
- `accessibility.spec.js:315` (Estado 4: Fim da Narrativa e Overlay de Encerramento) — mobile-chromium, desktop-chromium
- `sync.spec.js:49` (synchronizes through BroadcastChannel when local storage is unavailable) — all 5 projects
Flaky: `zz-audio-double-toggle.spec.js:103` (mobile-webkit), `zz-timing-dwell.spec.js:47` (desktop-firefox).

## Symptom

CI gate fails with 9 E2E failures. Three distinct failure families: (1) Axe-Core WCAG AAA audit timeouts/violations in accessibility spec on Chromium projects; (2) BroadcastChannel sync test failing on ALL 5 projects; (3) two pre-existing flaky tests. The sync failure is a regression introduced by our recent hardening (flag `__HWC_DISABLE_PROGRESS_CHANNEL__` in `openPlayer`), which disabled the progress BroadcastChannel in every test, including sync.spec.js which specifically tests BroadcastChannel sync when localStorage is unavailable.

## Reproduction

1. Run `npm run ci` on ubuntu-latest (CI gate job).
2. Observe 9 failures as listed above.
3. Local reproduction of sync failure: `npx playwright test tests/e2e/sync.spec.js --project=mobile-chromium` (expects channel sync, but channel is disabled by flag).

## Suspected Code Paths

- `tests/e2e/helpers.js:13` (`openPlayer`) — sets `__HWC_DISABLE_PROGRESS_CHANNEL__ = true` in init script → disables progress BroadcastChannel in all tests.
- `src/scripts/storage.js:149-153` (`createChannel`) — returns null when flag is set.
- `tests/e2e/sync.spec.js:49` — tests BroadcastChannel sync with localStorage unavailable; depends on channel being enabled.
- `tests/e2e/accessibility.spec.js:105,315` — Axe-Core audit; color-contrast violations/timeouts (pre-existing, environmental — see `.specify/bugs/theme-switcher-reflow-regression` and `frames-low-quality`).
- `tests/e2e/zz-audio-double-toggle.spec.js:103`, `tests/e2e/zz-timing-dwell.spec.js:47` — pre-existing flaky (timing).

## Root Cause Hypothesis

**Confidence: high** for sync (regression from our flag). **Confidence: medium** for accessibility (Axe-Core color-contrast violations/timeouts, possibly environment/load; pre-existing per roadmap). **Confidence: low** for the two flaky (timing, pre-existing).

The sync failure is a direct regression: `openPlayer` sets `__HWC_DISABLE_PROGRESS_CHANNEL__ = true` for every test, including `sync.spec.js` which requires the channel. Reverting the flag + storage change restores sync. The accessibility and flaky failures are pre-existing and not caused by this PR (they appear in prior runs too).

## Proposed Remediation

**Preferred**: Revert the BroadcastChannel-disable hardening (`src/scripts/storage.js` `createChannel` flag check and `tests/e2e/helpers.js` flag) — it was an experiment that didn't fix the original issue and broke sync. Keep the working fix: `initialIndex` capture + deterministic test assertion + `workers: 1`.

**Alternatives**:
- Keep the flag but scope it: only disable the channel in tests that don't need sync (not feasible generically).
- Make `sync.spec.js` opt out of the flag via a separate init script (fragile).

**Files likely to change**:
- `src/scripts/storage.js` (revert createChannel flag check)
- `tests/e2e/helpers.js` (revert flag in openPlayer)
- `.specify/bugs/...` tracking

**Tests to add or update**:
- Re-run `sync.spec.js` (all 5 projects) to confirm green after revert.
- Re-run `accessibility.spec.js` to check Axe-Core state.

## Risks & Considerations

- Reverting the flag restores BroadcastChannel in all tests (original behavior).
- The accessibility failures may be environmental (CI load) or real a11y regressions; needs separate investigation.
- The two flaky tests are pre-existing and tracked separately.

## Open Questions

- [NEEDS CLARIFICATION: Are the accessibility.spec.js failures new regressions or pre-existing flakiness under CI load?]
- [NEEDS CLARIFICATION: Should the flaky tests (zz-audio-double-toggle, zz-timing-dwell) be retried or fixed separately?]