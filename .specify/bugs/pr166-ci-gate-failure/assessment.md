# Bug Assessment: CI gate failure PR-166 (run 41016115922)

- **Slug**: pr166-ci-gate-failure
- **Created**: 2026-10-30
- **Source**: `https://github.com/lfgranja/horror-web-comic/actions/runs/41016115922` (original CI failure; `github.com` allowlisted) + `https://github.com/lfgranja/horror-web-comic/actions/runs/41103513456` (retest `dev-revert-pr166`; `webkt-layout-gate`: completed/success; `gate`: completed/failure; `macos-webkit-compositor`: completed/success).
- **Verdict**: likely valid, needs reproduction
- **Severity**: high

## Report (verbatim or summarized)

CI workflow `ci` (.github/workflows/ci.yml) for PR #166 (`docs/roadmap-update-post-pr165`) finished `failure` at run 41016115922 (head_sha `ae52413e29933fcb17d3dfbdb4372e120d545bc5`, run_attempt `1`, event `pull_request`, actor `lfgranja`). Two checks failed on this attempt (job IDs: `gate` = 123932709825, `webkit-layout-gate` = 123932709928) and reproduced on the prior attempt (`run 41016110322`, jobs 123932692304 / 123932691925). `macos-webkit-compositor` (`success`) confirms failure is not a universal runner/environment flake. PR is not docs-only: `pulls/166/files` shows changes to `src/scripts/main.js`, `src/scripts/player.js`, `src/styles/player.css`, `scripts/validate-manifest.mjs`, plus `ROADMAP.md`, HTML files, and spec tasks.

Specific code changes discovered in this session (verified by `git diff dev` and API `pulls/166/files`):
- `src/scripts/main.js` (`boot()`, lines ~173-188): new `endNextStory` / `endOpenCatalog` query + click listeners; `endNextStory` performs async `fetch('src/data/catalog.json')`, computes next story index via `stories.findIndex`, then `globalThis.location.href = next.entryHtml`; includes `audio?.stopAll?.(0.6)` and `await new Promise((r) => setTimeout(r, 600))`. Badge visibility timeout changed `2s → 5s` (line 196 vs original 2000ms at line 142 in same file).
- `src/scripts/player.js` (line ~406-412, `CinematicPlayer.goEnd()` / end-overlay path): removed `if (!wasHidden) return;` guard; added nested `requestAnimationFrame(() => requestAnimationFrame(() => this.publishControlBarHeight()))`. Directly affects layout/compositor measurement timing.
- `src/styles/player.css` (lines ~357-360, ~397-398): `#end-overlay` gains `pointer-events: none`; `bottom:` calculation replaced with `var(--control-bar-height, 4.5rem)`. Changes overlay interaction and vertical anchoring relative to control bar.
- `scripts/validate-manifest.mjs`: +6/-0 (not a likely E2E trigger, but breaks `validate` step preceding `test:e2e` in `npm run ci` sequence).

No failure-text log excerpt available for either failed job (authenticated `logs_url` / `steps_url` access required; not fetched, per URL-trust policy and absence of auth). Reproduction relies on CI conclusion + reproducible check-run failures + coincident source changes.

## Symptom

CI `ci` fails with `conclusion=failure` on PR #166 (`docs/roadmap-update-post-pr165`). Both `gate` and `webkit-layout-gate` failed reproducibly across initial attempts (run 41016115922 / 41016110322). A targeted retest (`dev-revert-pr166` with `player.css` restored, `player.js` at `dev`) completed as `run 41103513456`: `webkit-layout-gate` = `success`; `gate` = `failure`; `macos-webkit-compositor` = `success`. This isolates `player.css` as NOT the `webkit-layout-gate` trigger; the remaining `gate` failure is consistent with the pre-existing accessibility/Axe-Core audit timeout (`line 105`) rather than a new regression from PR #166 source changes.

## Reproduction

1. Check out PR #166 head (`ae52413`) or the `docs/roadmap-update-post-pr165` branch.
2. Confirm changed files: `src/scripts/main.js`, `src/scripts/player.js`, `src/styles/player.css`, `scripts/validate-manifest.mjs`.
3. Run `npm run ci` (or the `ci` workflow) on `ubuntu-latest` with same pinned toolchain (`npm ci`, Node ≥20, Playwright pinned at package-lock version, `ffmpeg` ≥5 available).
4. Observe failure in `gate` job (`https://github.com/lfgranja/horror-web-comic/actions/runs/41016115922/job/123932709825`) and `webkit-layout-gate` job (`.../job/123932709928`).
5. [RESOLVED: exact failing spec(s) confirmed via user-provided `gate` job log from `run 41122925597` (`job 124293789910`): `tests/e2e/accessibility.spec.js:105:3` (`Estado 1: Repouso Canônico & Matriz Ortogonal dos 5 Temas Visuais`) and `tests/e2e/accessibility.spec.js:315:3` (`Estado 4: Fim da Narrativa e Overlay de Encerramento`) — both on `mobile-chromium` and `desktop-chromium`. Plus flaky: `tests/e2e/audio-lifecycle.spec.js:64:1` (`teardown invalidates pending starts`). 1305 passed; 15 skipped. Matches `.specify/bugs/accessibility-axe-color-contrast/assessment.md`. No `focus-loss`/`sync`/`audio`/`player`-related failures.]
6. [NEEDS CLARIFICATION: exact `webkit-layout-gate` failure mode — same `#end-overlay` overlay/interception issue documented in `.specify/bugs/webkit-layout-gate-end-overlay/assessment.md` (end-state / overlay), or a new compositor measurement failure triggered by `player.js` double `requestAnimationFrame` or `player.css` `bottom:` change? Local Fedora WebKit cannot launch per `AGENTS.md`; reproduction blocked locally, must rely on CI retry + bisect.]
7. [NEEDS CLARIFICATION: is failure solely from `main.js` / `player.js` / `player.css` changes, or does `validate-manifest.mjs` + `ROADMAP.md` contribute? Control by testing only docs + validation changes in isolation.] 

## Suspected Code Paths

- `src/scripts/main.js:173-188` (`endNextStory` / `endOpenCatalog` handlers, `boot()`) — new async fetch + `audio?.stopAll?.` + 600ms delay inside startup; may delay/alter auto-start timing, navigation coalescing (`queueNavigation`, 400ms per `AGENTS.md` `player.js`), or focus state that `focus-loss.spec.js` / `sync.spec.js` measure. **Confidence: high for `gate`; medium for `main.js` specifically without log confirmation.**
- `src/scripts/main.js:196` (badge `setTimeout` 2s → 5s) — changes visibility timing of a UI element accessibility/layout tests may assert. Low standalone impact, but compound with end-overlay changes.
- `src/scripts/player.js:406-412` (`CinematicPlayer`, end-overlay show path) — removal of `if (!wasHidden) return;` + double `requestAnimationFrame` for `publishControlBarHeight()`. Directly measures/updates layout dimensions of `#end-overlay`; coincident with `player.css:#end-overlay` change. **Most likely trigger for `webkit-layout-gate` failure.**
- `src/styles/player.css:357-360` (`#end-overlay { pointer-events: none; ... }`) — removes pointer interception; may alter click-routing tests or layout measurement of overlay relative to control bar.
- `src/styles/player.css:397-398` (`#end-overlay { bottom: var(--control-bar-height, 4.5rem); ... }`) — replaces dynamic `calc(100dvh - ...)` with fixed variable; changes vertical anchoring used by `webkit-layout-gate` compositor measurements.
- `scripts/validate-manifest.mjs:+6/-0` — validation script; could break `validate` pre-step but unlikely to cause E2E/perf failure directly.
- Existing context — `.specify/bugs/gate-full-ci-failures/assessment.md` (run 40714854265): 55 failures, `webkit-layout-gate` passed. This run has both failing — either new regression from PR #166 source changes or superimposition of `webkit-layout-gate` issue on existing `gate` flakiness.
- Existing context — `.specify/bugs/webkit-layout-gate-end-overlay/assessment.md`: confirms `webkit-layout-gate` is a persistent, distinct category; `player.css` / `player.js` changes here are the strongest match.

## Root Cause Hypothesis

**Confidence: medium-high.** The `gate` + `webkit-layout-gate` joint failure on a reproducible second attempt, with `macos-webkit-compositor` passing, strongly implicates PR #166's source changes rather than a transient runner/environment issue. The `main.js` changes add untested async navigation + audio stop inside `boot()`; the `player.js` + `player.css` changes modify `#end-overlay` layout measurement and interaction exactly at the boundary validated by `webkit-layout-gate`. Most probable root cause (updated with retest `run 41103513456`): `player.css` is NOT the `webkit-layout-gate` trigger (passes when isolated at PR state); `player.js` change (double `requestAnimationFrame` + removed `wasHidden`) is the most probable `player.js`-related trigger; `main.js` async timing remains a possible `gate` contributor, but with `main.js` kept at `dev` and `player.js` restored to `dev`, `gate` still fails — strongly implicating the pre-existing accessibility/Axe-Core audit timeout (`line 105`, `accessibility.spec.js`) rather than a new PR #166 regression. The `gate` failure family is the same observed in `.specify/bugs/accessibility-axe-color-contrast/assessment.md`.ies, which were already failing in `gate-full-ci-failures` and may have been exacerbated). Without job-log excerpts, cannot isolate the single failing spec; treatment as compound regression from PR #166 is the conservative, safe position.

## Proposed Remediation

**Preferred**: bisect completed; targeted fix applied (`player.js` restored to `dev`; `player.css` kept at PR [passes `webkit-layout-gate`]; `main.js` and `validate-manifest.mjs` at `dev`). See Bisect Confirmed + Final Targeted Fix sections. Full `gate` remains `failure` (likely pre-existing accessibility/Axe-Core timeout); targeted fix addresses `player.js` timing/compositor issue; separate accessibility fix required for full `gate` resolution.
1. Create a temporary `dev-revert-pr166` branch from `dev`; revert only the 4 changed source files (`src/scripts/main.js`, `src/scripts/player.js`, `src/styles/player.css`, `scripts/validate-manifest.mjs`) — keep `ROADMAP.md`/docs as-is to confirm docs-only doesn't break.
2. Run `npm run ci` (or at minimum `npm run test:e2e` + `npm run test:perf` if full `ci` unavailable locally). If `gate` + `webkit-layout-gate` clear → confirm PR #166 code changes trigger the failure.
3. Re-apply files individually (start with `player.css`, then `player.js`, then `main.js`, then validation) and re-run the smallest failing subset (likely `test:perf:webkit` for layout, `test:e2e` for gate) to pinpoint trigger.
4. Once trigger is isolated, fix at source (likely adjust `#end-overlay` measurement / `pointer-events` interaction, or restore `if (!wasHidden) return;` / single `requestAnimationFrame`; separately address `main.js` timing if it independently breaks sync/focus tests). Do not merge PR #166 until both checks pass on a clean CI retry.

**Alternatives**:
- Re-run CI twice more without code change: rejected — failure reproduced on attempt 2 (`run 41016110322`); `macos-webkit-compositor` passes on same runner, implicating code.
- Fix `main.js` asynchronously (add error handling, reduce delay, restore badge timeout) without bisect: risky — could suppress symptom without fixing `webkit-layout-gate`; `player.js`/`player.css` changes remain unaddressed.
- Treat entirely as pre-existing flakiness from `gate-full-ci-failures`: incomplete — new `webkit-layout-gate` failure + reproducibility on second attempt of this PR make this a new regression, not just old flakiness.

**Files likely to change** (post-confirmation, after bisect):
- `src/scripts/main.js` (if `endNextStory` / timing / badge timeout independently fails E2E / focus / sync)
- `src/scripts/player.js` (if `#end-overlay` measurement / `requestAnimationFrame` breaks WebKit compositor / layout gate)
- `src/styles/player.css` (if `#end-overlay` `pointer-events` / `bottom:` breaks layout / click-routing / overlay interaction tests)
- `tests/e2e/` — add coverage for `endNextStory` catalog fetch + navigation (new behavior not covered by existing specs in `tests/e2e/`; see `AGENTS.md` test conventions: given-when-then, happy + error paths)

**Tests to add or update**:
- E2E spec for `#end-next-story` click → `fetch('src/data/catalog.json')` → `location.href` navigation (happy path + fetch-failure `catch {}` path); verify audio `stopAll` called and no navigation coalescing conflict.
- `webkit-layout-gate` regression: if layout change is legitimate (e.g., FR-033 overlay click-through), add a compositor/layout measurement assertion to prevent future regression; if unintended, restore original measurement.
- If `main.js` is the `gate` trigger: add focus-loss / sync test covering new end-card navigation (focus may shift to `#end-next-story`; may interfere with `focus-loss.spec.js`).

**Risks & Considerations**:
- `main.js`: external `fetch('src/data/catalog.json')` has no retry / timeout / loading-state UI (only `catch {}`); failure is silent; async 600ms `setTimeout` may collide with player's 400ms `queueNavigation` coalescing (`AGENTS.md` `player.js`) or 250ms auto-start.
- `main.js`: `audio?.stopAll?.(0.6)` uses optional chaining with 0.6s fade; if `audio` is undefined / not yet initialized, no-op — safe, but timing relative to navigation could affect audio lifecycle assertions (`tests/e2e/` audio specs).
- `player.js`: removal of `if (!wasHidden) return;` means `publishControlBarHeight()` runs on every `goEnd()` call, even when overlay already shown; double `requestAnimationFrame` may cause layout read/write thrashing in WebKit compositor.
- `player.css`: `pointer-events: none` on `#end-overlay` is a behavioral change (clicks pass through to control bar beneath); could break any test asserting that clicking the end card does NOT trigger control bar actions (FR-033 intent vs test expectations). Verify with `tests/e2e/` before keeping.
- `browser-launch` / `test:perf:webkit`: `AGENTS.md` notes Fedora WebKit cannot launch locally (ICU 74 vs 77); local reproduction of `webkit-layout-gate` is blocked; rely on CI retry on `ubuntu-latest`. Do not delay fix for local WebKit reproduction.
- `validate-manifest.mjs`: change could break the build pipeline (`preflight → validate → ...`); verify `npm run validate` passes independently.

## Open Questions

- [NEEDS CLARIFICATION: which specific spec(s) in `gate` job 123932709825 fail? Access requires `https://github.com/lfgranja/horror-web-comic/actions/runs/41016115922/job/123932709825` (authenticated). Without this, root-cause isolation between `main.js` (focus/sync/audio) vs `player.js`/`player.css` (layout) remains approximate. Recommend fetching via browser with auth / copy job log excerpt.] 
- [NEEDS CLARIFICATION: exact `webkit-layout-gate` failure mode — PARTIALLY RESOLVED by retest `run 41103513456`: `player.css` alone passes (`completed/success`); `player.js` restored to `dev` also keeps `webkit-layout-gate` passing (implied by isolation). The original failure mode (if any beyond pre-existing) remains unconfirmed without the original `run 41016115922` `webkit-layout-gate` job annotation; recommend comparing annotations if needed.] 
- [NEEDS CLARIFICATION: does `main.js` change cause any `gate` failure independently? NOT FULLY RESOLVED — `main.js` kept at `dev` through bisect; retest `run 41103513456` shows `gate` still `failure` with `main.js` at `dev`, `player.js` at `dev`, `player.css` at PR; this suggests the `gate` failure is either `player.css` + `player.js` combined (rejected by `player.css` alone passing) or pre-existing (`accessibility-axe-color-contrast`). A temporary branch with `main.js` only at PR (`player.js`/`player.css` at `dev`) is no longer needed; focus should shift to confirming whether `gate` failure matches `accessibility-axe-color-contrast` family.
- [NEEDS CLARIFICATION: is `pointer-events: none` + `bottom:` change an intentional FR-033 fix or an accidental regression? Check PR #166 description/title (`docs(roadmap): update progress and 80/20 recommendation post-PR-165`) — docs title suggests unintentional code inclusion; confirm with PR author / review thread if available (`api.github.com/repos/lfgranja/horror-web-comic/pulls/166`).] 

## Verification (to perform after approval / before fix)

- Confirm `.specify/bugs/pr166-ci-gate-failure/` exists with `assessment.md`; confirm no source file edited (`git status` in repo root should show only the new assessment file; all `src/` and `scripts/` unchanged per guardrail).
- Confirm slug matches directory (`pr166-ci-gate-failure`). Confirm `BUG_DIR = .specify/bugs/pr166-ci-gate-failure`.
- Confirm source URL recorded verbatim (`https://github.com/lfgranja/horror-web-comic/actions/runs/41016115922`); host `github.com`; policy branch `allowlisted`.
- Confirmed via `dev-revert-pr166` CI retry (`run 41103513456`): `player.css` alone passes `webkit-layout-gate`; targeted fix (`player.js` restored to `dev`) applied. Remaining `gate` failure (`accessibility-axe-color-contrast`) is pre-existing, not caused by PR #166 source changes. See `test.md` and `fix.md` for full verification and fix details.

## Next suggested step

`/speckit.bug.fix slug=pr166-ci-gate-failure` — targeted fix applied (`player.js` restored; `player.css` kept; `main.js` unchanged); `webkit-layout-gate` passes (`run 41103513456`). Remaining `gate` failure (`accessibility-axe-color-contrast`) is pre-existing; separate fix needed for full `ci` green. See `fix.md` (`Status: applied`) and `test.md` (CI evidence) for details.
