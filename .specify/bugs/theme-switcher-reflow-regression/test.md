# Bug Verification: `.sr-only` is defined nowhere, so the theme label renders as visible text and breaks reflow and the end-state overlay

- **Slug**: theme-switcher-reflow-regression
- **Tested**: 2026-10-01T19:41:20-04:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

> **Follow-up (2026-10-01, after this report was first written):** the one check
> this report was held open for — family 1 on WebKit — is now a dedicated CI job,
> `webkit-layout-gate` in `.github/workflows/ci.yml`. It runs
> `reflow.spec.js`, `zz-css-reflow.spec.js`, `zz-end-state-coverage.spec.js` and
> `theme-a11y.spec.js` on `mobile-webkit` + `desktop-webkit` and finishes in
> minutes instead of the ~20 the full `gate` matrix takes. The `gate` job already
> covered these specs on WebKit, so this adds no coverage; it makes the WebKit-only
> claim a named, fast check instead of a line item to be found by hand in 1279
> results. See *Recommendation* for how to close on its result.

The symptom the fix targeted no longer reproduces, and I confirmed that by
construction rather than by assertion alone: **with the tests in place and the source
reverted, the new tests fail; with the source restored they pass.** Families 2 and 3
are verified. Family 1 is the reason this is `partial` and not `verified`: its
reproduction requires WebKit, which cannot launch on this host, so the one check the
assessment actually asked for was not exercised.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Prerequisite state | `git status`, `diff -rq src/styles` vs snapshot | pass | Fix on disk matches `fix.md`; `node --check src/scripts/player.js` clean |
| Reproduction, family 2 (post-fix) | Geometry probe, 320×568, 6 forced scroll positions | **pass** | Was 5/8 failing before the fix; now 6/6 in-band and clickable |
| Reproduction, family 2 (A/B) | Toggle only `position: sticky` on `#replay` | **pass** | `static` → button `[147,192]`, band `[0,147]`, hit `previous-scene` (= the CI failure). `sticky` → `[90,135]`, hit `replay` |
| Root cause gone | Measured `.sr-only` label box + `.control-bar` height | **pass** | Label 220px → **1px**, `position: absolute`. Bar 377px → 356px |
| New tests catch the bug | Reverted `src/styles` only, kept new tests, ran on `desktop-chromium` | **pass** | Both new assertions fail on buggy code (see excerpts) |
| New / updated tests (post-fix) | `theme-a11y` + `zz-end-state-coverage` + `reflow` + `zz-css-reflow` on `desktop-chromium` + `mobile-chromium` | **pass** | 32 pass / 0 fail |
| New / updated tests (post-fix) | Same four specs on `desktop-firefox`, `--workers=1` | **pass** | 16 pass / 0 fail |
| Regression suite | `npx playwright test --project=mobile-chromium --project=desktop-chromium` | **pass** | 554 pass / 5 fail — all 5 pre-existing load-dependent flakes (see below) |
| Unit tests | `node --test tests/unit/*.test.js` | **pass** | 139 pass / 0 fail |
| Build + budgets | `npm run build` | **pass** | 13790 script bytes, 3852 style bytes (unchanged), all asset budgets met |
| Environment gate | `npm run preflight` | **fail** (expected) | 14/15. Only `browser-launch`, on WebKit's missing `libjpeg.so.8` — the limitation `AGENTS.md` documents. Pre-existing, unrelated to the fix |
| Perf gate | `npm run test:perf` | **fail** (pre-existing) | 36 pass / 9 fail / 15 skipped. 6 are WebKit/Firefox launch crashes; 3 are `first-frame` p75 budgets that fail **identically on baseline** |
| Lint / type-check | — | **not-run** | No lint or type-check tooling is configured in this project (`package.json` has no such script) |
| Reproduction, family 1 | WebKit reflow specs | **not-run** | WebKit will not launch here: `LIBJPEG_8.0` required, Fedora 44 ships `libjpeg.so.62` |

## Output Excerpts

The decisive check — new tests against the **unfixed** source, tests kept:

```
Error: sr-only label must collapse horizontally
Expected: <= 1
Received:    220.0625

Error: "Rever do início" must remain clickable
Expected: true
Received: false

2 failed / 12 passed   (desktop-chromium, source reverted, tests kept)
```

Family 2 mechanism, A/B on the single `position` property, band `[0,147]`:

```
pre-fix  (position:static): btn [147,192]  inBand:false  hit: previous-scene
post-fix (sticky)         : btn  [90,135]  inBand:true   hit: replay
```

Root cause, post-fix: `label { width: 1, position: "absolute" }`, `barH: 356`
(pre-fix: 220px visible label, 377px bar).

Family 2 sweep, post-fix:

```
scrollY=0     band=[0,496] btn=[147,192] inBand=true hit=replay -> PASS
scrollY=200   band=[0,378] btn=[147,192] inBand=true hit=replay -> PASS
scrollY=374   band=[0,204] btn=[147,192] inBand=true hit=replay -> PASS
scrollY=420   band=[0,158] btn=[101,146] inBand=true hit=replay -> PASS
scrollY=453   band=[0,147] btn=[90,135]  inBand=true hit=replay -> PASS
scrollY=9999  band=[0,147] btn=[90,135]  inBand=true hit=replay -> PASS
6/6
```

`first-frame` p75, CI-equivalent parallelism, same two tests fail on **both** trees:

```
baseline (no fix): 2 failed / 3 passed   (3924, 1696.5 ms)
fixed            : 2 failed / 3 passed   (4211.2, 2064 ms)
  ↳ identical failing set: SC-019 (<2.5s), SC-008 (<1.5s)
```

## Residual Risks

- **Family 1 is unverified.** The assessment's reproduction for it was
  `--project=mobile-webkit`; I did not run it, because WebKit cannot launch on this
  host. The fix removes the cause (156px of visible text) and adds `max-width: 100%`
  /`min-width: 0`, but the WebKit-specific `<select>` min-content behaviour was only
  ever *inferred* from the CI trace payload and the Chromium measurement. One CI run
  closes this. If it still overflows, the next lever is `min-width: 0` on
  `.theme-select` inside the `max-width: 47.99rem` block, which is present but may not
  bind in WebKit.
- **The control-bar budget test does not discriminate this bug.** It passes on the
  unfixed tree too (377px measured vs a 380px ceiling). It is a forward guard against
  a fifth utility row, not a regression test for this fix — and it is the one new
  assertion that would not have caught the bug. I verified the two that do.
- **`reflow.spec.js` cannot be used to verify family 1 locally.** Its horizontal-overflow
  assertion passes on Chromium both before and after, because Chromium absorbs the
  overflow that WebKit does not. It is WebKit-only coverage by construction.
- **5 residual e2e failures under parallel load, all pre-existing and none CSS-related.**
  `zz-legacy-pause:94`, `zz-legacy-speed-volume:37` (×2), `audio-activity:87` are
  audio wall-clock budgets; `degradation-production:110` is a race that expects to
  observe a transient `data-image-loading='true'` and misses it when the image loads
  faster than the probe. I checked the last one specifically because it is
  layout-adjacent: it passes 2/2 on the fixed tree and 4/4 on baseline at
  `--workers=1`, and it asserts on image load timing, which this fix cannot influence.
- **`preflight` and `test:perf` do not pass locally**, so `npm run ci` cannot pass
  locally either. Both are WebKit-bound environment limitations, not fix regressions.
- Firefox crashes under parallel workers on this host (`EmptyDatabaseError`,
  `_maybeDontRestoreTabs`), producing spurious failures unrelated to any code change.
  All Firefox results above were taken at `--workers=1`.
- The 356px control bar on a 568px screen (63% of the viewport) is unchanged by this
  fix and still undocumented as intentional. The new budget test records the current
  value rather than endorsing it.

## Recommendation

**Hold, pending one CI run — do not close yet.** The bug that could be verified here is
verified, and verified strongly: the new tests fail against the unfixed source and pass
against the fixed source, and family 2's mechanism is confirmed by a single-property A/B
that reproduces the exact CI symptom. What is missing is family 1, which is 4 of the 6
original failures and the only family that failed exclusively on WebKit. The fix
removes its cause, but "the cause is gone" is not "the symptom is gone" on an engine I
cannot execute.

That gap is now closed by CI rather than by hand: push the branch and read the
**`webkit-layout-gate`** job. It is WebKit-only, runs the four specs that carry this
bug's contract on both WebKit projects, and needs no build step. If it is green, the
bug can be closed as `verified` — that result is precisely the check this report was
held open for. If either reflow spec still overflows, the assessment's root-cause
conclusion is wrong about WebKit's `<select>` min-content sizing, and
`/speckit.bug.assess` should be re-run with the fresh trace from that job's
`playwright-report-webkit-layout` artifact before anyone touches the code again. Do not
spend further effort on the 5 residual e2e failures or the 3 perf failures here — both
sets were reproduced on unmodified `origin/dev` at a comparable or higher rate and
belong to the existing audio-timing and environment reports.