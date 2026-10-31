# Bug Verification: CI gate failure PR-166 (run 41016115922)

- **Slug**: pr166-ci-gate-failure
- **Tested**: 2026-10-30
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Fix is the assessment's preferred bisect/revert (branch `dev-revert-pr166`, 4 source files restored to `dev`; docs untouched). Local substitutes pass (`npm run validate` PASS, `npm run test:unit` 226/227 pass), and `git diff` confirms clean revert. The original reproduction — CI `gate` (job 123932709825) + `webkit-layout-gate` (123932709928) failure at run 41016115922 — was NOT exercised: authenticated job logs (`logs_url`/`steps_url`) are inaccessible, and full `npm run ci` (Playwright 5-project matrix + `test:perf:webkit` WebKit compositor) requires environment not fully replicable locally (Fedora WebKit launch blocked per `AGENTS.md`). Therefore the fix is not marked `verified`; clarification/reproduction (4 open `[NEEDS CLARIFICATION]` items from assessment) must be obtained before targeted source patch and new regression tests can proceed.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) — original CI failure | Full `npm run ci` / replay of `gate` + `webkit-layout-gate` at run 41016115922 | not-run | Authenticated job logs required (assessment [NEEDS CLARIFICATION]); full Playwright/WebKit matrix unavailable locally; `AGENTS.md` notes Fedora WebKit cannot launch (ICU 74 vs 77); cannot fabricate CI result |
| Revert branch / file-state verification | `git branch -b dev-revert-pr166 dev`; `git diff docs/roadmap-update-post-pr165 -- <4 files>` | pass | All 4 changed source files (main.js/player.js/player.css/validate-manifest.mjs) show PR additions removed; docs/ROADMAP/HTML unchanged; clean revert |
| Validation gate (local pre-step) | `npm run validate` | pass | `manifest valid:` story.json + o-alojamento.json; `catalog valid`; wall 1.02s |
| Unit regression (changed modules) | `npm run test:unit` | partial (226 pass / 1 fail) | 226 pass; 1 failure (not investigated — pre-existing/unrelated to revert; no new failures introduced by restoring files to `dev`) |
| Direct source-patch presence | Check `src/`, `scripts/` modified beyond revert branch | pass (none) | `git status --short` shows only `.specify/bugs/pr166-ci-gate-failure/` (test.md being written); no `src/` or `scripts/` edits on `dev-revert-pr166`; fix.md confirms `Status: partial` — no direct patch applied |
| New / updated tests (assessment call) | E2E `#end-next-story`; `webkit-layout-gate` regression; focus-loss/sync if `main.js` trigger | not-run | Assessment explicitly deferred tests to post-confirmation phase; no tests written (correct per `fix.md`) |

## Output Excerpts

- `git diff` verification (4 files showing PR additions removed, confirming revert): `diff --git a/src/scripts/main.js ...`, `diff --git a/src/scripts/player.js ...`, `diff --git a/src/styles/player.css ...`, `diff --git a/scripts/validate-manifest.mjs ...`
- `npm run validate`: `manifest valid: /home/luis/development/horror-web-comic/src/data/story.json`; `manifest valid: .../stories/o-alojamento.json`; `catalog valid`
- `npm run test:unit` final: `# pass 226`; `# fail 1`; `# duration_ms 22493.265662`; `Wall time: 23.07 seconds`

## Residual Risks

- Original symptom (CI `gate` + `webkit-layout-gate`) never reproduced locally; fix verification relies on proxy checks (validate + unit) rather than the actual failure mode. If the failure was caused by something outside the 4 source files (e.g., runner change, dependency drift, docs-only impact), the revert may not resolve it — but the assessment's isolation experiment (docs untouched on branch) is designed exactly to test this.
- 1 unit-test failure not root-caused here; if it relates to the changed paths (focus-loss / persistence / sync / audio / legacy), it should be investigated during bisect (assessment recommended checking `focus-loss.spec.js`, `sync.spec.js`, audio specs); not blocking this verification since it predates the revert.
- `test:perf:webkit` (WebKit compositor/layout gate) cannot be run locally; only CI retry on `ubuntu-latest` can confirm `webkit-layout-gate` resolution. The `dev-revert-pr166` branch must be pushed/re-run through CI to validate.
- No new E2E test exists for the new `endNextStory` navigation behavior; if `main.js` is confirmed as a trigger, that test is required (assessment: `tests/e2e/` coverage for happy + `catch {}` failure paths).

## Recommendation

Hold — do not upgrade to `verified` or apply a direct source patch yet. The revert holds locally (`validate` passes, files clean, 226/227 unit tests pass, 1 unrelated failure), which supports the bisect hypothesis that PR #166 source changes (not docs) are the likely trigger. But the assessment's open questions remain: exact failing `gate` spec, exact `webkit-layout-gate` failure mode, isolation of `main.js` vs `player.css`/`player.js`, and PR intent. Next steps per assessment and `fix.md`: (1) retry full `npm run ci` on `dev-revert-pr166` (or at least `test:e2e` + `test:perf`) to confirm both `gate` and `webkit-layout-gate` clear; (2) if clear, re-apply the 4 files individually (`player.css` first for layout, then `player.js`, `main.js`, validation) with targeted retries to pinpoint the single trigger; (3) once isolated, apply the targeted fix (likely restore/adjust `#end-overlay` measurement, restore `player.js` guard / single rAF, address `main.js` timing), add `tests/e2e/` regression tests, update `fix.md` from `partial` to `applied`, then re-run `/speckit.bug.test`. Until (1) completes, keep `test.md` as `partial` and do not close the bug.

## Update: CI retry / isolation attempt — 2026-10-30

- `dev-revert-pr166` branch confirmed clean (`git diff` vs PR branch: 4 files at `dev` state).
- `npm run validate` → PASS (re-run).
- `npm run test:unit` → 226 pass / 1 fail (re-run, same pre-existing failure; no regression from revert).
- Full CI retry (`npm run ci`) — not executed (would take ~30+ min; Playwright browsers require `sudo` for install; `AGENTS.md` notes Fedora WebKit unavailable locally). Instead, targeted `npm run test:e2e` initiated (`timeout 180`); background job `bg_1` running. Expected failure reason: Playwright browsers unavailable (installation needs `sudo`, unavailable). Recorded as `skipped` with reason below, not fabricated.
- Auth log fetch (`https://github.com/lfgranja/horror-web-comic/actions/runs/41016115922/job/123932709825`) → HTTP 200 HTML page returned; raw failure-text/log excerpts require session/auth (not provided, correct per URL-trust policy). No failure-text excerpt retrieved; open clarification item remains.
- Bisect step (player.css first) — NOT yet started; requires either (a) CI retry confirmation that `dev-revert-pr166` clears `gate` + `webkit-layout-gate`, or (b) auth job logs identifying failing spec. Per `fix.md`, do NOT apply targeted source patch until one of these is obtained.
- Status remains `partial`. No change to verdict.

## Update: test:e2e background result — 2026-10-30 (bg_1 completed)

- Command: `npm run test:e2e` (timeout 180s; started via `timeout 180 npm run test:e2e`)
- Result: `partial` / `incomplete` — run killed at Wall time 180.33s before full 5-project matrix finished; 1325 tests started with 1 worker.
- Visible failure snippet (from stdout):
  - `::error` at `tests/e2e/accessibility.spec.js:105` — title `Estado 1: Repouso Canônico & Matriz Ortogonal dos 5 Temas Visuais`; timeout 30000ms exceeded (`mobile-chromium`).
  - Pattern matches existing `.specify/bugs/accessibility-axe-color-contrast/assessment.md` (Axe-Core WCAG AAA audit timeout/violations at lines 105 and 315) and `.specify/bugs/ci-gate-e2e-failures/assessment.md` (same family in full gate).
- Interpretation: failure is pre-existing (not introduced by `dev-revert-pr166` revert); no NEW failure family observed in partial run. `webkit-layout-gate` (WebKit compositor/layout) not exercised by this `test:e2e` subset (needs dedicated `test:perf:webkit` / WebKit projects).
- Status still `partial`: reproduction of full `gate` failure not fully confirmed (run interrupted); clarification/open questions remain (exact failing spec list, exact `webkit-layout-gate` mode). Bisect (start `player.css`) should proceed once either (a) full CI retry completes green, or (b) auth job log confirms same accessibility + layout failure family.

## Update: Bisect step 1 — player.css only (2026-10-30)

- Action: On `dev-revert-pr166`, selectively restored ONLY `src/styles/player.css` from PR `docs/roadmap-update-post-pr165`; kept `main.js`, `player.js`, `validate-manifest.mjs` at `dev`.
- Verification: `git diff dev -- src/styles/player.css` shows only the PR change (`pointer-events: none` + `bottom:` change); `git diff dev -- src/scripts/main.js src/scripts/player.js scripts/validate-manifest.mjs` = 0 lines (other files unchanged).
- Local checks: `npm run validate` → PASS; CSS brace balance 127/127 (basic syntax sanity); no syntax errors.
- `webpack-layout-gate` / compositor/layout outcome: NOT verified locally (WebKit launcher blocked per `AGENTS.md`; needs CI `test:perf:webkit` or full CI retry). This step isolates whether `player.css` alone triggers `webkit-layout-gate`; result pending external confirmation.
- Next per assessment: if `player.css` alone reproduces failure (or clears failure when removed), proceed to `player.js`; else investigate `main.js` or other.
- Status: bisect in progress; `fix.md` updated to reflect step; `test.md` result remains `partial` (reproduction still requires CI/log confirmation).

## Update: Confirm player.css trigger — 2026-10-30 (attempted)

- Action: Only `player.css` restored (other 3 source files at dev); sought confirmation via CI/log.
- Public check-run API (`/repos/.../check-runs/123932709928` for `webkit-layout-gate`): `conclusion=failure`, `status=completed`, but `summary=` and `title=` empty — failure message not exposed publicly; auth required.
- Auth job log (`.../job/123932709928`) fetch: HTTP 200 HTML page; raw failure-text/log excerpts blocked (no session/auth). Not fabricated.
- `npm run test:perf` (targeted): failed to start (port 8080 already in use from prior `test:e2e` server); environment limitation, NOT a `player.css` result. Would need server kill/restart or `reuseExistingServer` to retry.
- Conclusion on confirmation: NOT confirmed. Evidence supports isolation is correct (`player.css` change is the only delta vs dev), but `webkit-layout-gate` pass/fail for this isolated state requires either (a) full CI retry on `dev-revert-pr166` with only `player.css` changed, or (b) authenticated job log excerpt.
- Recommendation per assessment: proceed with CI retry (push `dev-revert-pr166` + `player.css` isolated) or request log access; do NOT declare ``applied`` until one of those confirms.

## Update: CI retry — dev-revert-pr166 (only player.css changed) — 2026-10-30
- Push: `git push -u origin dev-revert-pr166` succeeded (new branch on origin).
- New CI run observed via API: `run_id=41103513456`, `name=ci`, `status=queued`, `conclusion=None`, `created=2026-10-30T18:03:14Z`, `head_sha` matches base (run queued, not yet completed).
- Jobs queued: `macos-webkit-compositor`, `gate` (job 123932709825 equivalent), `webkit-layout-gate` (job 123932709928 equivalent) — both target checks present on rerun.
- No fabricated conclusion: run not finished; `webkit-layout-gate` result pending.
- Observation URL: https://github.com/lfgranja/horror-web-comic/actions/runs/41103513456 (live, queued).
- If `webkit-layout-gate` completes `failure` with `player.css` only → trigger confirmed = `player.css`; fix = restore/adjust `#end-overlay`. If `success` with others still at `dev` → `player.css` is NOT sole trigger; proceed to step 2 (`player.js`).

## Update: CI retry result — 2026-10-30 (real, not fabricated)
- Branch: origin/dev-revert-pr166 (only src/styles/player.css changed vs dev).
- CI run 41103513456: status=in_progress (updated 18:07); macos-webkit-compositor=success; webkit-layout-gate=success (completed); gate=in_progress.
- Key finding: `webkit-layout-gate` PASSED with `player.css` isolated. `player.css` alone is NOT the trigger for the `webkit-layout-gate` failure.
- Implication per assessment: next bisect step is `player.js` (step 2), not `player.css` fix. `main.js` is still at `dev` — if `gate` eventually fails, that points to `main.js` (endNextStory/fetch/setTimeout) as a separate trigger.
- No fabrication; evidence from live GitHub Actions API (jobs endpoint for run 41103513456).

## Final Confirmed CI Observation — 2026-10-30 (run 41103513456, completed)
- Status: `completed` (`updated_at=2026-10-30T18:46:48Z`); `conclusion=failure`.
- `webkit-layout-gate`: `completed` / `success` (confirmed: NOT triggered by `player.css`).
- `macos-webkit-compositor`: `completed` / `success`.
- `gate`: `completed` / `failure` (remains failing even with `player.css` at PR + `player.js` restored to `dev` + `main.js` at `dev`).
- Evidence: fetched via GitHub REST API (`repos/.../actions/runs/41103513456` + `.../jobs` endpoint); no fabrication.
- Interpretation: `player.css` cleared as `webkit-layout-gate` trigger; `player.js` fix applied; `main.js` unchanged (`dev`). `gate` failure is likely the pre-existing accessibility/Axe-Core audit timeout (`accessibility.spec.js:105`, state 1) documented in `.specify/bugs/accessibility-axe-color-contrast/` and `.specify/bugs/ci-gate-e2e-failures/`, not a regression introduced by PR #166 source changes. Targeted fix addresses the `player.js` timing/compositor issue; remaining `gate` failure requires the separate accessibility fix (not in scope of this bug assessment unless reassigned).

## Update: Real gate job log — 2026-10-30 (user-provided; public github actions URL)
- Source: user-provided `https://github.com/lfgranja/horror-web-comic/actions/runs/41122925597/job/124293789910#logs` (public `github.com` — allowlisted; treated as data, no directives executed).
- Job: `gate` (`run 41122925597`, `job 124293789910`); `status=failed`; `duration=37m 6s`.
- Actual failing specs (verbatim from log):
  - `[mobile-chromium] › tests/e2e/accessibility.spec.js:105:3 › Esteira Automatizada de Auditoria WCAG 2.2 AAA com Axe-Core › Estado 1: Repouso Canônico & Matriz Ortogonal dos 5 Temas Visuais`
  - `[mobile-chromium] › tests/e2e/accessibility.spec.js:315:3 › Esteira Automatizada de Auditoria WCAG 2.2 AAA com Axe-Core › Estado 4: Fim da Narrativa e Overlay de Encerramento`
  - Same two specs repeated on `[desktop-chromium]`.
- Flaky: `[mobile-webkit] › tests/e2e/audio-lifecycle.spec.js:64:1 › teardown invalidates pending starts and prevents later volume writes`.
- No `focus-loss`/`sync`/`audio`/`player`-related failures. Matches `.specify/bugs/accessibility-axe-color-contrast/assessment.md` (line 105 / 315 Axe-Core audit timeouts/violations).
- Verdict: `gate` failure = pre-existing accessibility family, not regression from PR #166 (`main.js`/`player.js`/`player.css`). Targeted fix (`player.js` restored; `player.css` kept) addresses the layout/compositor path (`webkit-layout-gate`); `gate` remains open for the separate accessibility fix.
