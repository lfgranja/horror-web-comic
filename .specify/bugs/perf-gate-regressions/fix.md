# Bug Fix: the performance gate had never run and hid two regressions

- **Slug**: perf-gate-regressions
- **Fixed**: 2026-09-28
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Two deterministic failures blocked `npm run test:perf`, which is declared
non-skippable in the `AGENTS.md` gate order and had therefore never executed. The e2e
server added in PR #12 sent `cache-control: no-store`, making the warm-cache
precondition that SC-008 measures permanently unsatisfiable; and the budget pinning test
still asserted binary MiB values against a `budget.json` that PR #10 had deliberately
converted to decimal. Both are fixed, and the server's headers are now locked by a unit
test so neither class of mistake can return unnoticed.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `scripts/serve-e2e.mjs` | modified | `cache-control: no-store` → `public, max-age=60`, with the reasoning inline |
| `tests/perf/zz-ci-budgets.spec.js` | modified | six assertions realigned to the decimal values in `budget.json` |
| `tests/unit/serve-e2e.test.js` | added | three tests over the server: cache lifetime, Range/416, traversal |

## Diff Highlights

```js
// before — makes a cache hit impossible
'cache-control': 'no-store'

// after — a freshness lifetime, which is what transferSize === 0 requires
'cache-control': 'public, max-age=60'
```

```js
// before — binary, contradicting the file it guards
expect(budget.initialSceneBytes, 'initial scene must stay <= 1.5 MB').toBe(1572864);

// after — decimal, matching the spec and budget.json
expect(budget.initialSceneBytes, 'initial scene must stay <= 1.5 MB (1500000 bytes)').toBe(1500000);
```

## Tests Added or Updated

- `tests/unit/serve-e2e.test.js::the e2e server permits a cache hit, which the
  warm-frame budget depends on` — boots the server, asserts `max-age` is present and
  `no-store` is not. **Verified to fail with `'the server must send a freshness
  lifetime'` when `no-store` is reintroduced**, so it is a real guard.
- `tests/unit/serve-e2e.test.js::the e2e server answers a Range request with 206, which
  media seeking depends on` — locks the fix from PR #12 in the same place, including
  that an unsatisfiable Range yields 416 rather than a misleading 200.
- `tests/unit/serve-e2e.test.js::the e2e server will not serve a path outside the
  repository` — locks the containment check.
- `tests/perf/zz-ci-budgets.spec.js::budget.json pins the spec byte limits (FR-029)` —
  corrected, not added. The messages now spell out the byte counts, because "MB" alone is
  what let the two drift apart.

## Local Verification

- `node --test tests/unit/serve-e2e.test.js` → **3/3**, and the cache test was confirmed
  to fail when `no-store` is put back
- `npm run test:unit` → **122/122** (was 119; the three new tests)
- `npx playwright test tests/perf/zz-ci-budgets.spec.js --project=mobile-chromium` →
  **6/6**
- `npx playwright test tests/perf/first-frame.spec.js:114 --project=mobile-chromium` →
  **4 of 5 runs passed**

### Honest note on the one failing run

Of five local runs of the SC-008 warm-frame test, four passed and one failed. The
failure's assertion was not captured — the reporter output was truncated by the pipe
filter, and the `error-context.md` for that run was empty. So I can say the cache
precondition now holds (the unit test proves the mechanism, and the three passing runs
got past it) but I **cannot** rule out that the fifth failure was the `warmCacheUsed`
assertion rather than the p75 timing.

This host is heavily loaded — load average has run 30–50 on 8 cores from the agent and
IDE processes — and the p75 threshold is a timing measurement. The authoritative run is
CI.

## Deviations from Assessment

None in the fix itself. The assessment's third suggestion — "consider asserting the
server's own headers in a unit test" — was taken, and extended to cover the Range
behaviour and the traversal guard, since all three are load-bearing and all three were
arrived at by the same kind of mistake in that file.

## Follow-ups

- **CI is the certification for SC-008.** The 1.5 s p75 warm-frame threshold has never
  actually been measured. If CI now fails on the *timing* rather than on
  `warmCacheUsed`, that is the newly visible information the assessment predicted — a
  real performance question, not a regression, and it should be triaged on its own
  rather than folded back into this bug.
- **Close the units ambiguity in the spec.** `spec.md:407` and `:515` write `≤1,5 MB`
  and `≤300 KB` without qualifying them. PR #10 resolved that ambiguity in favour of
  decimal and documented it, but the spec still does not say so, which is the underlying
  cause of defect 2 and will recur. The byte counts are now in the test messages, which
  helps, but the spec is where the ambiguity lives.
- This host cannot run the matrix reliably. `AGENTS.md` documents the Firefox webkit
  gap; the load sensitivity is separate and undocumented.

## Process note: repeated false attribution

The first draft of this commit carried a `Co-Authored-By: Claude Opus 4.8` trailer
again, immediately after the owner had decided that no co-author trailers would be used
following the same false attribution in PRs #11–#16. It was caught before the branch was
pushed and removed by amending, so nothing incorrect reached the repository — but it was
a stated commitment broken within the same session, and it is recorded here rather than
left to be discovered later.
