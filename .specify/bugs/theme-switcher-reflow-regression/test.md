# Bug Verification: `.sr-only` is defined nowhere, so the theme label renders as visible text and breaks reflow and the end-state overlay

- **Slug**: theme-switcher-reflow-regression
- **Tested**: 2026-10-02T04:05:00-04:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified
- **Closed on**: CI run `36960245399` (`push`, head `8bc5b5f`) and `36960249790` (`pull_request` #29) — all three jobs success

This supersedes an earlier `partial` report on this slug, written before the
WebKit check could be run. That report's own Recommendation named the exact
condition for closing — *"If it is green, the bug can be closed as `verified`"* —
and that condition is now met. Nothing in it was contradicted: every local check
below was re-run and reproduces identically, and the WebKit result it lacked has
been supplied by the `webkit-layout-gate` job.

## Summary

All three failure families are resolved, including the WebKit-only one that
previously could not be exercised locally. The root cause — a `<label class="sr-only">`
with no rule in any stylesheet, rendering as 156px of visible text — is gone, the
end card's action is now pinned inside the overlay band by construction, and CI is
green on all three jobs with **1295 e2e tests passing and zero failing**, against 6,
8 and 10 failures on the last three runs of this same branch.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| **Family 1, WebKit** (the check previously impossible) | CI `webkit-layout-gate`, run 36960245399 | **pass** | **32 passed (37.0s)**, job 104s, on `mobile-webkit` + `desktop-webkit` |
| **Family 1 + 2 + 3, full matrix** | CI `gate` → e2e matrix, run 36960245399 | **pass** | **1295 passed / 0 failed** / 2 flaky / 3 skipped (21.8m) |
| Reproduction, family 2 (post-fix) | Geometry probe, 320×568, 6 forced scroll positions | **pass** | 6/6 in-band and clickable (was 5/8 failing pre-fix) |
| Reproduction, family 2 (A/B) | Toggle only `position: sticky` on `#replay` | **pass** | `static` → `[147,192]` in band `[0,147]`, hit `previous-scene` (= the CI failure); `sticky` → `[90,135]`, hit `replay` |
| Root cause gone | Measured `.sr-only` label box + bar height | **pass** | Label 220px → **1px**, `position: absolute`; bar 377px → 356px |
| New / updated tests (post-fix) | 4 specs on `mobile-chromium` + `desktop-chromium` | **pass** | 32 passed |
| New / updated tests (post-fix) | Same 4 specs on `desktop-firefox`, `--workers=1` | **pass** | 16 passed |
| New tests catch the bug | Reverted `src/styles` only, kept tests, ran on `desktop-chromium` | **pass** | Both new assertions fail on buggy code — see excerpts |
| Regression suite | CI `gate`: preflight → validate → unit → build:images → build → e2e → perf → Lighthouse | **pass** | Every step success, including perf budgets and the Lighthouse delivery gate |
| Regression suite (local) | `node --test tests/unit/*.test.js` | **pass** | 139 pass / 0 fail |
| Build + budgets | `npm run build` | **pass** | 13790 script / 3852 style bytes, all asset budgets met |
| Environment gate | `npm run preflight` | **fail** (expected) | 14/15 — only `browser-launch`, WebKit's `libjpeg.so.8` on Fedora 44. Pre-existing, environment-only. **Passes on `ubuntu-latest` in CI** |
| Lint / type-check | — | **not-run** | No lint or type-check tooling configured in this project |

## Output Excerpts

The previously-unexercisable check, now green:

```
webkit-layout-gate │ WebKit layout gate — 320px/200% reflow, end-state overlay, theme a11y
                  │   32 passed (37.0s)
webkit-layout-gate │ completed/success in 104s
```

Full branch history for comparison — same branch, same workflow:

```
before  36820174616    6 failed   1279 passed
before  36815634698   10 failed   1277 passed
after   36960245399    0 failed   1295 passed   (+ perf budgets + Lighthouse success)
        grep -c "failed" over the entire run log: 0
```

New tests against the **unfixed** source, tests kept — proof they are real regression
tests rather than assertions that merely pass:

```
Error: sr-only label must collapse horizontally
Expected: <= 1
Received:    220.0625

Error: "Rever do início" must remain clickable
Expected: true
Received: false
2 failed / 12 passed
```

Family 2 mechanism, A/B on the single `position` property at the band that failed in CI:

```
pre-fix  (position:static): band [0,147]  btn [147,192]  inBand:false  hit: previous-scene
post-fix (sticky)         : band [0,147]  btn  [90,135]  inBand:true   hit: replay
```

## Residual Risks

- **The 2 flaky results in the CI matrix are wall-clock tests that passed on retry,
  and neither is a reflow or overlay assertion.** `[desktop-firefox]
  audio-timing.spec.js:72` is the audio-timing flake already tracked in
  `../e2e-audio-timing-flakes/`, and it fails on unmodified `origin/dev` too (run
  36730357221). `[mobile-webkit] theme-switcher.spec.js:78` is the SC-005
  measurement test, which asserts `syncDuration < 50ms` and `visualLatency < 250ms`
  and whose own comments state the tolerance exists for "multi-worker headless"
  load; it is not one of the four specs this fix touches. Neither is evidence
  against this fix, and neither is closed by it.
- **The control-bar budget test does not discriminate this bug.** It passes against
  the *unfixed* tree too (377px measured against a 380px ceiling). It is a forward
  guard against a fifth utility row, not a regression test for this fix. The two
  assertions that do discriminate — `theme-a11y` geometry and the in-band `#replay`
  check — were verified above against reverted source.
- **`reflow.spec.js` cannot verify family 1 locally.** Its horizontal-overflow
  assertion passes on Chromium both before and after the fix, because Chromium
  absorbs an overflow that WebKit does not. Family 1 coverage is WebKit-only by
  construction, which is exactly why `webkit-layout-gate` now exists.
- **The 356px control bar on a 568px viewport (63% of the screen) is unchanged by
  this fix.** The budget test records the current value rather than endorsing it;
  whether four stacked utility rows is the intended mobile design remains an open
  design question, not a bug.
- **Local `npm run ci` cannot pass on this host** — `preflight`'s `browser-launch`
  and the WebKit perf projects both require WebKit. Both pass on `ubuntu-latest`;
  this is a Fedora limitation, documented in `AGENTS.md`, and not a property of the
  fix.

## Recommendation

**Close the bug — verified end-to-end.** The root cause is gone, the two failure
modes it produced are closed by construction rather than by a tuned threshold, the
new tests are proven to fail against the unfixed source, and the branch that had
five consecutive red runs is now green on all three CI jobs with 1295 e2e tests
passing and zero failing. The one gap this report was previously held open for —
family 1, WebKit-only — has been closed by `webkit-layout-gate`, and that job stays
in the workflow as a permanent fast signal for this class of defect. Nothing here
should reopen the assessment. The follow-ups recorded in `fix.md` (the 63% control
bar as a design question, and Firefox's parallel-worker crashes on this host)
remain open as their own work, not as blockers on this bug.