# Bug Verification: Lighthouse audits died on Chrome's frame reporter rename

- **Slug**: lighthouse-lcp-element-audit
- **Tested**: 2026-09-29T21:30:00-04:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The assessment's reproduction was run end to end and no longer reproduces: `largest-contentful-paint-element`
and the three audits that share its gatherer now return real scores with no `errorMessage`, and the LCP element
is observed rather than inferred. The fix holds, the four gate assertions are unmoved by the version bump, and
nothing in the application changed — but comparing 39 reports from the old Lighthouse against 6 from the new
one surfaced a side effect the fix report did not mention, recorded under Residual Risks.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npm run build` then `npm run ci:lighthouse`, then read the audits (the assessment's steps 1–3) | **pass** | Exit 0, `All results processed!`. Fresh reports only, isolated by timestamp. |
| Symptom no longer reproduces | same run, `audits['largest-contentful-paint-element']` and the three dependents | **pass** | `largest-contentful-paint-element` score 1, no `errorMessage`; `prioritize-lcp-image` 1; `lcp-lazy-loaded` 1; `render-blocking-resources` 0. Consistent across all 3 fresh reports. |
| New / updated tests | `node --test tests/unit/lhci-trace-elements.test.js` | **pass** | 3/3. |
| Regression suite | `npm run test:unit` | **pass** | 133/133 (130 pre-existing + 3 new). |
| Regression: dependency integrity | `npm run preflight` | **pass** (14/15) | `pinned-dependencies`, `installed-versions`, `lockfile`, `engines` and `scripts` all pass. The single failure is `browser-launch` for webkit — the Fedora ICU problem `AGENTS.md` documents as unfixable on this host, unrelated to the change. |
| Regression: gate assertions | the 4 `lighthouserc.json` assertions on a fresh report | **pass** | performance 0.98 (≥ 0.9), accessibility 1.00 (≥ 0.95), CLS 0 (≤ 0.1), LCP 1593 ms (≤ 2500). |
| Regression: application untouched | `git diff --stat HEAD -- src/ index.html scripts/ tests/e2e/ tests/perf/` | **pass** | Empty. The commit touches only `package.json`, `package-lock.json` and the new test. |
| Regression: build output | `npm run build` | **pass** | `13178` compressed script bytes, `3192` compressed style bytes, assets unchanged — identical to the pre-fix baseline. |
| Guard actually guards | set the pin back to `0.14.0`, re-run the new test | **pass** | Test 2 fails with `@lhci/cli 0.14.0 predates 0.15.0`, then the pin was restored. |
| Lint / type-check | — | **not-run** | No `lint`, `typecheck` or `tsc` script exists in `package.json`; the project is plain ES modules with no type-check step. |

## Output Excerpts

Reproduction, fresh run only:

```
  AUDITS QUE O ASSESSMENT LISTOU COMO QUEBRADOS:
    largest-contentful-paint-element [(1, False)]
    prioritize-lcp-image             [(1, False)]
    lcp-lazy-loaded                  [(1, False)]
    render-blocking-resources        [(0, False)]

  ELEMENTO DO LCP (observado):
    section#player > div#frame-stage > picture#frame-picture > img#frame-image

  AS 4 ASSERCOES DO GATE:
    performance 0.98 (>= 0.9) | accessibility 1.00 (>= 0.95) | CLS 0 (<= 0.1) | LCP 1593 ms (<= 2500)
```

Version comparison, 39 reports from 12.1.0 against 6 from 12.6.1 — the assessment's risk that a Lighthouse
upgrade moves the scoring curve:

```
  audit                     12.1.0     12.6.1
  largest-contentful-paint     1593       1593
  first-contentful-paint      1168       1151
  total-blocking-time          127        167
  speed-index                 1385       1385
  interactive                 1593       1593
  total-byte-weight         392915     392915

  performance 0.98 -> 0.98 | accessibility 1 -> 1 | best-practices 0.96 -> 0.96 | seo 1 -> 1
```

The four audits that used to be broken are gone from the null-score list; the eight that appeared are all
`notApplicable`, which is a legitimate state rather than a failure:

```
  cache-insight: score=None displayMode=notApplicable err=-
  image-delivery-insight: score=None displayMode=notApplicable err=-
  largest-contentful-paint-element: score=1 displayMode=informative err=-
  render-blocking-resources: score=0 displayMode=metricSavings err=-
```

Guard behaviour on a simulated downgrade:

```
  not ok 2 - @lhci/cli resolves to a Lighthouse that carries the fix
    error: '@lhci/cli 0.14.0 predates 0.15.0, the first release whose Lighthouse carries the trace_engine fix'
```

## Residual Risks

- **The version bump introduces eight audits that do not run, which the fix report did not mention.**
  Comparing the null-score sets directly: 12.1.0 had 60, and it included the four broken ones. 12.6.1 has
  64, and the four broken ones are gone — but eight new ones appear (`cache-insight`,
  `duplicated-javascript-insight`, `font-display-insight`, `image-delivery-insight`,
  `interaction-to-next-paint-insight`, `legacy-javascript-insight`, `modern-http-insight`,
  `third-parties-insight`). They are all `scoreDisplayMode: notApplicable`, so they are not errors and
  Lighthouse judged them inapplicable to this page. Still, the net count of non-scored audits went up, and
  the "insights" diagnostic family is uniformly unavailable here. Anyone reading a future report should
  read `scoreDisplayMode` rather than treating a null score as a failure.
- **`score: null` was never the right symptom to have cited.** The original failure was
  `scoreDisplayMode: "error"` with an `errorMessage`; null is also the normal state for inapplicable and
  not-applicable-to-this-page audits. The fix and assessment both describe the symptom as "score null",
  which is imprecise. The new test asserts on `errorMessage` and `score === null` together, which is
  right; the prose should not be read as claiming null alone meant broken.
- **`render-blocking-resources` now scores 0.** This was invisible while the audit errored. It is a real
  finding — `index.html:12-14` has three render-blocking stylesheet links in `<head>` — and it is
  plausibly not an artefact of the version change, since three blocking stylesheets in `<head>` are
  render-blocking by definition. It is not addressed by this fix and has not been measured under the new
  Lighthouse; the `metricSavings` display mode suggests Lighthouse can now quantify it.
- **Everything above is local.** The authoritative check is the `gate` job on `ubuntu-latest`, which ships
  its own Chrome. If that Chrome emits an event shape the new trace engine also mishandles, the failure
  mode returns and the new unit test would not catch it — the test pins the dependency graph, not the
  trace. The branch `fix/lhci-trace-elements` is unpushed.
- **The LCP phase breakdown now points at the next problem.** Render delay is 52% (843 ms) against a load
  delay of 3% (54 ms), so the network is no longer the constraint. That is a new finding this bug
  surfaced, not a residual of it.

## Recommendation

Close the bug — verified end to end. The assessment's reproduction was exercised directly, not inferred;
the four audits it named are restored with no error state; the gate's four assertions are unmoved by the
version bump, measured against 39 prior reports rather than assumed; the application and its build output
are byte-identical; and the new guard provably fails on a downgrade. Before merging, run the gate on CI —
that is the only remaining check, since the unit test pins the dependency graph rather than the trace.
Worth carrying into the follow-up: the phase breakdown redirects the next LCP work to render delay, and
`render-blocking-resources` scoring 0 is a newly visible finding about the three stylesheet links in
`<head>`.
