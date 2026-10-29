# Bug Fix: Lighthouse audits died on Chrome's frame reporter rename

- **Slug**: lighthouse-lcp-element-audit
- **Fixed**: 2026-09-29T20:40:00-04:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The four audits that depend on Lighthouse's `TraceElements` gatherer were dying silently because
Chrome renamed `chrome_frame_reporter` to `frame_reporter` and the installed trace engine read the
old name without a guard. Bumping `@lhci/cli` 0.14.0 → 0.15.1 brings the Lighthouse that handles both
names, and all four audits run again — which upgrades the LCP element attribution in this repository
from inference to observation.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `package.json` | modified | `@lhci/cli` 0.14.0 → 0.15.1, still pinned exactly per `AGENTS.md`. |
| `package-lock.json` | modified | Regenerated; brings `lighthouse` 12.6.1 and `@paulirish/trace_engine` 0.0.53. |
| `tests/unit/lhci-trace-elements.test.js` | added | 3 tests: the dependency graph guard the assessment asked for. |

No file under `src/`, no test spec, and no Lighthouse assertion threshold was touched.

## Diff Highlights

The whole fix is a version, because the defect lives in transitive code the project does not own:

```
node_modules/@paulirish/trace_engine/models/trace/handlers/ScreenshotsHandler.js

0.0.23 (installed before)                    0.0.53 (installed now)
──────────────────────────────────────        ──────────────────────────────────────
const frameSequenceId =                      const args = evt.args.data.beginEvent.args;
  evt.args.data.beginEvent.args                const frameReporter =
    .chrome_frame_reporter                      'frame_reporter' in args
    .frame_sequence;                            ? args.frame_reporter
                                                : args.chrome_frame_reporter;
                                              const frameSequenceId =
                                                frameReporter.frame_sequence;
```

With `chrome_frame_reporter` absent, the old line read `.frame_sequence` off `undefined` — the exact
error Lighthouse surfaced — inside `RootCauses`, which is a declared dependency of `TraceElements`,
which every one of the four broken audits in turn depends on.

## Tests Added or Updated

- `lhci-trace-elements.test.js::the installed trace engine reads both frame reporter names` — asserts the guard is present in the installed package, so the failure mode cannot return through a transitive change alone.
- `::@lhci/cli resolves to a Lighthouse that carries the fix` — asserts the pin is exact and at least 0.15.0, the first release whose Lighthouse carries trace_engine 0.0.52+. Verified it fails when the pin is set back to 0.14.0.
- `::a Lighthouse report, when one is present, names the LCP element` — reads the three most recent `.lighthouseci` reports and asserts the audit has no `errorMessage` and a non-null `score`; returns early when no local run has produced reports.

## Local Verification

| Command | Result |
|---|---|
| `npm run ci:lighthouse` | **exit 0** — `All results processed!` |
| `largest-contentful-paint-element` | `score: 1`, **no `errorMessage`** (was `score: null` + gatherer error) |
| `prioritize-lcp-image` | `1` (was `null`) |
| `lcp-lazy-loaded` | `1` (was `null`) |
| `render-blocking-resources` | `0` — now **runs** (was `null`); a real score, not a missing one |
| `npm run preflight` | 14/15 — `pinned-dependencies`, `installed-versions` and `lockfile` pass. The one failure is `browser-launch` for webkit, the Fedora ICU problem `AGENTS.md` documents as unfixable on this host. |
| `npm run test:unit` | **133/133** (130 + 3 new) |
| Downgrade simulation (`@lhci/cli` → 0.14.0) | guard fails as intended, then restored |

The assessment's risk about a Lighthouse upgrade moving every other audit's scoring curve was checked
rather than assumed. All four gate assertions still hold on the new version:

```
performance  0.98   (>= 0.9)
accessibility 1.00  (>= 0.95)
CLS          0      (<= 0.1)
LCP          1612 ms (<= 2500)
```

## Deviations from Assessment

**The root cause is more specific than the assessment stated, and it rules out one of its options.**
The assessment proposed "identify the installed Lighthouse version, then check its changelog"; it left
open whether this was an upstream defect in Lighthouse, a Chrome mismatch, or a version to pin back.
It is the second, and it is a producer/consumer skew: a Chrome **event rename**, not a Lighthouse bug
in the usual sense. The `frame_reporter` fallback first appears in trace_engine 0.0.52 — verified
absent in 0.0.32, 0.0.39, 0.0.44 and 0.0.50, present in 0.0.52 and 0.0.57 — so the fix could not be
reached by waiting for a Lighthouse patch to a 12.1.x line. Bumping `@lhci/cli` is not a preference
between the assessment's alternatives; it is the only path that carries the guard.

**`lighthouserc.json` was not changed**, as the assessment predicted. Nothing in it selects
`TraceElements`, and the fix belongs in the dependency graph.

**The assessment's open question about the CI Chrome build is now settled differently than asked.**
It asked whether the same error occurs on CI or only locally. It occurs in both — the CI reports
carried the identical gatherer error — and it was the same root cause in both, not a local
artefact.

## Follow-ups

- **The LCP element is now observed, so the previous assessment's caveat is discharged.**
  `section#player > div#frame-stage > picture#frame-picture > img#frame-image` is the element
  Lighthouse scored — the same element the fix reasoned its way to, now measured rather than inferred.
  `lighthouse-lcp-over-budget`'s `test.md` lists the inferred attribution as a residual risk; that
  record is a historical document and was not edited, but the risk it names is now closed.
- **The phase breakdown points at the next optimisation.** With the audits restored:

  | phase | share | timing |
  |---|---|---|
  | TTFB | 30% | 484 ms |
  | Load delay | 3% | 54 ms |
  | Load time | 14% | 231 ms |
  | **Render delay** | **52%** | **843 ms** |

  The network is no longer the constraint — load delay is 3%, which is what the static `<picture>`
  injection bought. Render delay now dominates, and it is a candidate for its own assessment: the
  600 ms authored fade and 4× CPU slowdown are both plausible contributors, and neither has been
  measured in isolation.
- `render-blocking-resources` now scores 0. That was invisible while the audit errored, and it is a
  real finding: the three render-blocking stylesheet links in `<head>` are candidates for inlining or
  preloading. Not addressed here — it changes delivery, and this bug was about the audit tooling.
- Run the gate on CI. Everything above is local; `ubuntu-latest` ships its own Chrome and must be
  confirmed to emit the same event shape.
