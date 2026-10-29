# Bug Assessment: Lighthouse cannot identify the LCP element — the TraceElements gatherer throws

- **Slug**: lighthouse-lcp-element-audit
- **Created**: 2026-09-29T08:52:49-04:00
- **Source**: follow-up raised by `./lighthouse-lcp-over-budget/test.md` (Residual Risks)
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

Raised during verification of `lighthouse-lcp-over-budget`. The fix for that bug landed on a
strong causal chain, but Lighthouse never reported *which* element it scored. Verbatim from
`.lighthouseci/127_0_0_1-_-2026_09_29_12_22_05.report.json`:

```json
"largest-contentful-paint-element": {
  "score": null,
  "scoreDisplayMode": "error",
  "errorMessage": "Required TraceElements gatherer encountered an error: Dependency \"RootCauses\" failed with exception: Cannot read properties of undefined (reading 'frame_sequence')"
}
```

Four audits return `score: null` in the same reports: `largest-contentful-paint-element`,
`prioritize-lcp-image`, `lcp-lazy-loaded`, `render-blocking-resources`. A phase-level breakdown
(`lcp-breakdown-insight`) is absent entirely.

## Symptom

The Lighthouse CI gate scores Largest Contentful Paint but cannot name the element responsible,
and the four audits that would explain *why* the number is what it is never run. Expected: an
identified LCP element plus its TTFB / load-delay / load-duration / render-delay split. Observed:
a gatherer error and four silent `null` scores.

## Reproduction

1. `npm run build`
2. `npm run ci:lighthouse`
3. Read `audits['largest-contentful-paint-element']` in any report under `.lighthouseci/`.

Reproduces on every run, locally and in CI. Local run confirms:
`largest-contentful-paint-element score: None | error: Required TraceElements gatherer…`, with
`prioritize-lcp-image`, `lcp-lazy-loaded` and `render-blocking-resources` all `None`.

## Suspected Code Paths

- `lighthouserc.json:3-26` — the `ci.collect` block. No setting here controls TraceElements, so
  the failure is in the bundled Lighthouse version rather than in this repo's configuration.
- `package.json` — `lhci` runs `lhci autorun`. The Lighthouse version is transitive (via
  `@lhci/cli`), not pinned directly in this manifest. `package.json` pins all direct deps exactly
  (`preflight` fails on drift), but the Lighthouse/`@lhci/cli` version that actually contains
  `TraceElements`/`RootCauses` needs to be read out of `package-lock.json`.
- `package-lock.json` — authoritative source for the installed Lighthouse version. [NEEDS CLARIFICATION: exact version not yet read; the next step is to identify whether
  `TraceElements`/`RootCauses` is present, and whether the `frame_sequence` dereference is a known
  upstream defect or a genuine incompatibility with the Chromium build that `chrome-launcher`
  discovers on `ubuntu-latest`.]

## Root Cause Hypothesis

An upstream defect in the installed Lighthouse's `TraceElements` gatherer (or a mismatch between
it and the Chrome version in CI), reached through `dependencies: ['RootCauses']` where
`RootCauses` resolves to a record without `frame_sequence`. Confidence: **medium** — the stack
shape is clear from the message, but the owning code is inside `node_modules/lighthouse`, not this
repository, so this assessment can identify the symptom and its blast radius but not author the
fix. It may be fixed by upgrading, by pinning, or by reporting upstream.

## Proposed Remediation

**Preferred**: identify the installed Lighthouse version from `package-lock.json`, then check its
changelog/known issues for `TraceElements`/`RootCauses`/`frame_sequence`. If a fix exists in a
newer release, bump the direct pin and re-run the gate; if the defect is upstream and unfixed,
decide between pinning to the last good version and filing an upstream issue.

**Alternatives**:
- Accept the audits as unavailable and compensate by asserting the LCP element another way — e.g.
  via `performance.getEntriesByType('largest-contentful-paint')` driven from a Playwright spec,
  which would give element attribution without depending on the broken gatherer.
- Narrow the claim: stop treating the LCP number as element-verified in documentation, so nothing
  downstream relies on an audit that does not run.

**Files likely to change**:
- `package.json` / `package-lock.json` — only if the remedy is a version change.
- `lighthouserc.json` — probably not; nothing there selects TraceElements.

**Tests to add or update**:
- A guard asserting `largest-contentful-paint-element` is not in an error state after a local
  `npm run ci:lighthouse`, so the gatherer cannot silently rot again once fixed.

## Risks & Considerations

- Upgrading Lighthouse transitively moves every other audit's thresholds and scoring curve, which
  can flip unrelated assertions in the gate (performance score, TBT, CLS) without any change to
  this application's code. Pin deliberately and re-read the whole assertion set after.
- `-google-chrome` / Chrome version drift on `ubuntu-latest` can be the actual trigger; if so the
  fix belongs in the CI image or the pinned Chrome, not in Lighthouse.
- This is diagnostic-only: it did not cause the LCP gate failure and does not block the merge of
  `lighthouse-lcp-over-budget`.

## Open Questions

- [NEEDS CLARIFICATION: Which Lighthouse version is installed via `@lhci/cli` in
  `package-lock.json`, and is `TraceElements` a known defect there?]
- [NEEDS CLARIFICATION: Does the same error occur on the CI Chrome build, or only locally? The CI
  artifacts in `.lighthouseci/` are the place to check.]
