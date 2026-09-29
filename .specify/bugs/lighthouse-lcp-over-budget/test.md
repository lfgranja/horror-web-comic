# Bug Verification: Lighthouse LCP gate fails at 2.87 s against a 2.5 s budget on the mobile 4G profile

- **Slug**: lighthouse-lcp-over-budget
- **Tested**: 2026-09-29T13:40:00-04:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The assessment's reproduction was actually exercised end to end — `npm run build` followed by
`npm run ci:lighthouse`, the exact step that exited 1 with `Assertion failed` — and it now exits
**0**. Six Lighthouse runs (two full invocations of the 3-run gate) produced LCP
**1568 / 1708 / 1584 / 1637 / 1574 / 1593 ms** against the 2500 ms budget, worst case 1708 ms with
792 ms of headroom, while the other three assertions held (performance ≥ 0.92, accessibility 1.0,
CLS 0). The causal claim in the fix is independently confirmed from the network record: the first
frame is now requested in the same initial batch as the CSS and the bundle, not after the manifest
resolves. No regressions attributable to the fix; the 8 e2e failures are pre-existing local
flakiness, demonstrated with symmetric sampling against HEAD.

The bug under verification is the LCP gate failure, and it is resolved. The fix's own `partial`
status refers to the *second* remediation lever (audio preload), which fix.md already measured,
refuted and reverted — it is not part of the symptom being cleared here, and it is carried below
as a residual risk.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npm run build && npm run ci:lighthouse` | **pass** | Exit 0. Was exit 1 with `expected: <=2500 / found: 2861.86…`. Run twice; both green. |
| LCP assertion margin | Lighthouse `largest-contentful-paint`, 6 runs | **pass** | Worst 1708 ms vs 2500 ms budget (792 ms headroom); before: 2861.9 / 2863.9 / 2866.0. |
| Other Lighthouse assertions | same reports | **pass** | performance 0.92–0.99 (≥ 0.9), accessibility 1.0 (≥ 0.95), CLS 0 (≤ 0.1). |
| Causal claim (network order) | `network-requests` audit | **pass** | `frame-01-960.avif` at **60.0 ms**, same batch as css×3 (57.3/58.0/58.7) and `main.js` (61.7); `story.json` at **175.0 ms**, after. The 4-deep chain is gone. |
| New unit tests | `node --test tests/unit/first-frame-preload.test.js` | **pass** | 7/7. |
| New perf test | `npx playwright test tests/perf/first-frame.spec.js -g 'initial batch' --project=desktop-chromium --project=mobile-chromium --project=desktop-firefox` | **pass** | 2 passed, 1 skipped — the skip is the file's pre-existing `test.skip(browserName !== 'chromium')` at `tests/perf/first-frame.spec.js:53`, inherited by the new test. |
| Regression: unit | `npm run test:unit` | **pass** | 129/129 (122 pre-existing + 7 new). |
| Regression: perf | `npx playwright test tests/perf --project=desktop-chromium --project=mobile-chromium --project=desktop-firefox` | **pass** | 31 passed, 5 skipped, **0 failed**. SC-019 passed here (it fails only under full-suite CPU contention — see Residual Risks). |
| Regression: e2e | `npx playwright test tests/e2e --project=desktop-chromium` | **pass** (flaky, not caused by fix) | 161 passed / 8 failed. All 8 attributed to pre-existing local flakiness — evidence below. |
| Lint / type-check | — | **not-run** | No `lint`, `typecheck` or `tsc` script exists in `package.json`; the project is plain ES modules with no type-check step. `npm run preflight` is the closest configured gate and was not required by this validation. |

## Output Excerpts

Reproduction, post-fix:

```
Checking assertions against 1 URL(s), 3 total run(s)
All results processed!
LHCI EXIT CODE: 0
```

LCP across two independent gate invocations (reports filtered to those newer than the run start):

```
1568ms  1708ms  1584ms  1637ms  1574ms  1593ms
LCP max: 1708 ms  |  orcamento: 2500 ms  |  margem: 792 ms
perf 0.99  a11y 1  CLS 0     (per run)
```

Network ordering, last run — image now leads the batch:

```
   2.9 ms  /
  57.3 ms  tokens-BHGJTCTD.css
  58.0 ms  base-ADZFQEE4.css
  58.7 ms  player-2P5E3ZOY.css
  60.0 ms  frame-01-960.avif      <-- was 187.6 ms, after story.json at 121.4 ms
  61.7 ms  main-PATMSF4W.js
 175.0 ms  story.json
```

New unit tests:

```
ok 1 - the first-frame picture is derived from the manifest, never hand-written
ok 2 - injection populates every <picture> slot so the preload scanner can fetch the frame
ok 3 - injection is idempotent, so a rebuild cannot compound the markup
ok 4 - injection preserves the intrinsic size, which is what keeps CLS at zero
ok 5 - injection escapes the alt text rather than trusting the manifest
ok 6 - a shell that lost an anchor fails loudly instead of silently regressing LCP
ok 7 - the built shell carries the same first frame the manifest declares
# tests 7 / # pass 7 / # fail 0
```

### Attributing the 8 e2e failures

Three independent lines of evidence, none of which can be explained by this change:

1. **The failure set is unstable.** Across four full e2e runs in this session the failing specs
   were different each time — HEAD produced `audio-activity:3`, `audio-activity:87`, `autoplay:3`,
   `resume:4`, `zz-degraded-coverage:225`; the fix produced `audio-activity:87/129`,
   `audio-timing:72`, `persistence-flow:40`, `playback-matrix:173/190`, `playback:4`,
   `runtime-convergence:35/59`, `zz-normal-cls:40`, `zz-timing-dwell:37/47`. Only
   `audio-activity:87` recurs across all runs.
2. **7 of the 8 pass when re-run in isolation** with the audio sink configured
   (`pactl set-default-sink`, the mitigation `AGENTS.md` documents for the missing-audio-output
   gotcha): 19 passed / 1 failed.
3. **The one persistent failure is flakier on HEAD than with the fix.** `zz-timing-dwell.spec.js:47`
   ("dwell floor of 250 ms…", tolerance band 250–275 ms) sampled 6× in isolation each way:
   **with the fix 4 passed / 2 failed; HEAD 3 passed / 3 failed.** Failures show `Received: 275.4`
   and `Received: 331.4` — a test with 0.4 ms of headroom at its tightest.

**Structural impossibility:** the change lives entirely inside `scripts/build.mjs`, invoked only by
`npm run build`. The e2e suite's server is `scripts/serve-e2e.mjs`, which serves repo-root files
verbatim and contains zero references to `build.mjs` (`grep -c 'build.mjs'` → `0`). `index.html`
and everything under `src/` are byte-identical to HEAD (`git diff --stat HEAD -- index.html src/`
is empty). The dwell test itself loads `tests/fixtures/story.json` via `openPlayer` — never `dist/`.

## Residual Risks

- **The LCP element attribution is still inferred, not observed.** The
  `largest-contentful-paint-element` audit continues to fail in the new reports with the same
  gatherer error (`Required TraceElements gatherer encountered an error: Dependency "RootCauses"
  failed…`), and `prioritize-lcp-image`, `lcp-lay-loaded`, `render-blocking-resources` and
  `lcp-breakdown-insight` all still return `score: null`. The fix landed on a strong causal chain
  (the metric moved 1210 ms, FCP did not move, and the network record shows exactly the predicted
  reordering), but Lighthouse never named the element it scored. Fixing that gatherer would upgrade
  this from well-evidenced inference to direct observation.
- **The 347 KB of audio remains on the critical path.** `preload='metadata'` and `'auto'` were
  measured transferring identical bytes, so the refuted lever is genuinely unavailable — but the
  bytes are real, and at 1.44 Mbit/s they cost real time. The fix's 792 ms of headroom absorbs
  them today; that margin is not guaranteed to hold on slower hardware. This needs its own
  assessment (see Follow-ups in fix.md).
- **WebKit is untested locally.** `AGENTS.md` records that Fedora hosts cannot run Playwright's
  WebKit (ICU mismatch), so the new perf test ran on Chromium only, and the branch's macOS job is
  the authority for both WebKit projects. The change is engine-agnostic markup that relies on
  standard preload-scanner `<picture>` discovery, but that has not been confirmed on WebKit here.
- **The branch's CI has not run yet.** Everything above is local. The `gate` job on
  `ubuntu-latest` is the authoritative verdict, and the branch is 8 commits ahead of `dev` with no
  PR open.
- **Static-first-frame markup cannot be capability-conditioned.** A `saveData` or
  slow-connection visitor fetches the standard first frame once before JS may swap to a light
  variant — bounded and small (320w AVIF 1310 B vs 1200w 3919 B), accepted deliberately in fix.md.
- **Local e2e flakiness is environmental, not benign.** `audio-activity:87` failed in every run
  this session on both HEAD and the fix. It is not caused by this change, but it is also not
  verified as healthy on this machine — CI remains the only trustworthy signal for the audio specs.

## Recommendation

Close the bug — verified end to end. The assessment's reproduction was exercised directly rather
than inferred, the Lighthouse gate now exits 0 with 792 ms of margin across six runs, the causal
mechanism was confirmed independently in the network record, and every regression check either
passed or produced failures that were demonstrated — with symmetric sampling — to be pre-existing.
Two follow-ups should be tracked rather than block this: fix the `TraceElements` gatherer so the
LCP element can be observed instead of inferred, and assess the 347 KB of audio contention as its
own bug, since the lever proposed here was measured not to work. Confirm on CI before merging.
