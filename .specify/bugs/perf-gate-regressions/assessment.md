# Bug Assessment: The performance gate has never run and hides two regressions

- **Slug**: perf-gate-regressions
- **Created**: 2026-09-28
- **Source**: pasted text (CI `gate` output on PR #16, run 36430277253)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

`npm run test:perf` failed for the first time in the repository's history, on the run
where the e2e matrix went green for the first time:

```
1) [mobile-chromium] › tests/perf/first-frame.spec.js:114:3 › reference cold-cache
   frame arrival › SC-008 shows the warm production first frame within 1.5 seconds at p75
   Error: expect(received).toBe(expected)  Expected: true  Received: false

2) [mobile-chromium] › tests/perf/zz-ci-budgets.spec.js:23:3 › budget.json pins the
   spec byte limits (FR-029)
   Error: initial scene must stay <= 1.5 MB
   Expected: 1572864   Received: 1500000
```

## Symptom

The performance gate is entirely non-functional. Two independent failures block it: one
test cannot establish the warm-cache precondition it measures against, and the budget
pinning test contradicts the configuration it is supposed to guard. Neither is a flake —
both are deterministic.

## Reproduction

1. `git checkout dev` (`a136692`)
2. `npm ci && npx playwright install --with-deps chromium firefox webkit`
3. Provide a null audio sink (see `ci.yml`, step *Provide a null audio sink for headless
   browsers*) — firefox cannot play without one
4. `npm run build && npm run test:perf -- --project=mobile-chromium`
5. Observe both failures

**Note:** `test:perf` had never executed before this. In all 12 preceding `dev` runs it
was reported `skipped`, because the gate died earlier — first at `build:images`, then at
`Unit tests`, then at the e2e matrix. The regressions were sitting behind the defects
fixed earlier in the same session. Fixing the gate is what exposed them.

## Suspected Code Paths

### Defect 1 — the e2e server forbids caching, so the warm path can never exist

- `scripts/serve-e2e.mjs:110` — `'cache-control': 'no-store'` on every response.
  Introduced in PR #12, by this session.
- `tests/perf/first-frame.spec.js:124-126` — the failing assertions:
  ```js
  const warmCacheUsed = await page.evaluate(() => performance.getEntriesByType('resource')
    .some((entry) => entry.name.includes('/src/') && entry.transferSize === 0));
  expect(warmCacheUsed).toBe(true);              // ← FAILS HERE (line 125)
  expect(percentile75(samples)).toBeLessThan(1_500);
  ```
- `scripts/serve-e2e.mjs` sends **no `ETag` and no `Last-Modified`** — only
  `content-type`, `accept-ranges`, `cache-control`, `content-length` and `content-range`.
  So a revalidating policy could not produce a 304 either.

`transferSize === 0` in the Resource Timing API means the resource was served from the
cache with **no network request at all**. That requires a freshness lifetime
(`Cache-Control: max-age`). `no-store` forbids storing the response, so the condition is
permanently false. A `no-cache` policy would not help either: a 304 carries response
headers, so `transferSize` would be non-zero.

**This defect was introduced by this session**, in the Range server added by PR #12. The
`no-store` was a defensive choice to avoid stale files between runs; it silently removed
the capability the performance test measures.

### Defect 2 — the pinning test asserts binary units against a deliberately decimal config

- `tests/perf/zz-ci-budgets.spec.js:25-30` — six assertions, all in binary units
- `budget.json` — six values, all decimal
- `e7c8941` (PR #10) — changed `budget.json` to decimal; its commit message reads
  *"fix(budget): use the literal decimal limits from the specification"* and
  *"docs(delivery): state the decimal budgets"*
- `753b995` — wrote the pinning test, with binary values
- `specs/001-cinematic-player/spec.md:407` and `:515-516` — `≤30 MB, cena inicial
  ≤1,5 MB, por quadro ≤300 KB, código comprimido ≤65 KB`

Every one of the six diverges, and in the same direction:

| key | `budget.json` | test asserts | divergence |
|---|---|---|---|
| `initialSceneBytes` | 1 500 000 | 1 572 864 | test +4.9% |
| `frameBytes` | 300 000 | 307 200 | test +2.4% |
| `totalAssetsBytes` | 30 000 000 | 31 457 280 | test +4.9% |
| `compressedScriptBytes` | 50 000 | 51 200 | test +2.4% |
| `compressedStyleBytes` | 15 000 | 15 360 | test +2.4% |
| `compressedCodeBytes` | 65 000 | 66 560 | test +2.4% |

`budget.json` is the **correct** side of this: the spec writes MB and KB without
qualifying them, and SI reads those as decimal, which is the reading PR #10 adopted
deliberately and documented. The test is the stale artefact. **This regression came from
PR #10**, which this session merged; it was invisible only because `test:perf` had never
run.

The irony is worth recording: the pinning test's job is to catch silent budget changes,
and its values are *stricter* than the config it guards. It therefore cannot detect a
tightening, and it currently blocks a change that was intentional.

## Root Cause Hypothesis

**Two independent deterministic failures, both regressions, both previously unreachable.**

1. The e2e server added in PR #12 sets `no-store` and sends no validators, which makes
   a cache hit impossible. The SC-008 warm-frame test measures a warm frame, so its
   precondition can never hold. **Confidence: high** — the mechanism is direct and
   `transferSize === 0` has exactly one cause, the absence of a network request.
2. `budget.json` was deliberately converted from binary to decimal units in PR #10 and
   the pinning test was not updated, leaving six assertions contradicting the file they
   guard. **Confidence: high** — the numeric divergence is measured and the intent is
   documented in the commit that caused it.

## Proposed Remediation

**Preferred, defect 1 — give the server a freshness lifetime.** Replace `no-store` with
a short `max-age` (for example `public, max-age=60`) so a second request for the same
`/src/` URL is served from cache and reports `transferSize === 0`.

This is safe for correctness rather than a trade-off: Playwright creates a **fresh browser
context per test**, and the HTTP cache is scoped to the context, so nothing persists
across tests. Within a single test the cache is exactly what the performance
measurements intend to exercise. A locally edited file is still picked up, because the
next run starts with an empty cache.

**Alternatives for defect 1:**
- *Keep `no-store` for `index.html` and `story.json`, add `max-age` for `/src/`* — more
  precise, at the cost of a per-path branch in the server for no correctness gain.
- *Add `ETag` and switch to `no-cache`* — does **not** work: a 304 response still
  contributes header bytes, so `transferSize` is not `0`.

**Preferred, defect 2 — update the six assertions to the decimal values** already in
`budget.json`. The test exists to pin the config against silent change; it should pin
the config that the spec and `docs/delivery.md` actually state.

**Alternatives for defect 2:**
- *Assert against the spec text rather than literals* — more durable, since it would
  survive a future unit decision, but it needs the spec to state units unambiguously,
  which it currently does not.
- *Revert `budget.json` to binary* — contradicts a deliberate, documented decision.

**Files likely to change**:
- `scripts/serve-e2e.mjs` — the `cache-control` header
- `tests/perf/zz-ci-budgets.spec.js` — six numeric assertions

**Tests to add or update**:
- After defect 1, `first-frame.spec.js:125` becomes the regression guard: it fails again
  the moment the server stops permitting cache hits, which is the intended behaviour.
- Consider asserting the server's own headers in a unit test, so a `no-store` regression
  is caught without paying for a full performance run.
- `zz-ci-budgets.spec.js` needs no new test; it is itself the guard, once corrected.

## Risks & Considerations

- A `max-age` is a real behaviour change in the test server: a long-lived browser context
  opened by hand against port 8080 could serve a stale file for the duration. Nothing in
  the suite opens a long-lived context, but it is a sharp edge worth a comment in the file.
- Fixing defect 1 unblocks SC-008's measurement for the first time. The 1.5 s p75
  threshold has **never been certified**, so this fix may reveal a genuine performance
  problem underneath. That would be new information, not a new defect, and should not be
  conflated with this one.
- Defect 2 is six numbers, but changing them makes the pinning test agree with a
  *looser* config than it previously enforced. Anyone relying on the old binary numbers as
  a ceiling loses ~2.4–4.9% of headroom. `docs/delivery.md` was already updated by PR #10,
  so the documentation side is consistent.
- `test:perf` is declared non-skippable in the `AGENTS.md` gate order, so while either
  defect stands, the delivery gate cannot complete.

## Open Questions

- [NEEDS CLARIFICATION: should the spec state the budget units explicitly ("1 500 000
  bytes" or "1,5 MB (SI)")? As written, MB and KB are ambiguous between SI and binary,
  and PR #10 resolved that ambiguity in one direction without the spec saying so. That is
  the underlying cause of defect 2 and it will recur.]
- [NEEDS CLARIFICATION: is the warm-frame 1.5 s p75 threshold expected to hold on a
  GitHub-hosted runner, or was it calibrated against different hardware? It has never
  been measured, so there is no baseline to compare against.]
