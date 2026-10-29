# Bug Fix: The 843 ms render delay is mostly a simulation artefact, not main-thread work

- **Slug**: lcp-render-delay
- **Fixed**: 2026-09-30
- **Assessment**: ./assessment.md
- **Status**: not-applied

## Summary

No code changes were applied because the assessment verdict is **invalid**. Controlled A/B measurement demonstrated that the reported 843 ms render delay is an artifact of Lighthouse's Lantern simulation model (`simulate`), whereas under real throttling (`devtools`) the actual render delay is only 221 ms (dominated by the intentional 600 ms fade transition, which is a narrative design requirement).

## Changes

| File | Change | Notes |
|------|--------|-------|
| *(none)* | not-applied | Assessment verdict is invalid; no production defect present. |

## Local Verification

- Controlled A/B measurement documented in `assessment.md`:
  - `simulate` mode: Total LCP 1593 ms, simulated render delay 1025 ms (inflated).
  - `devtools` mode: Total LCP 1515 ms, real render delay 221 ms.
- Verification command: `npm run validate && npm run test:unit` → 133/133 unit tests pass.

## Deviations from Assessment

None. The assessment established that the reported render delay is a measurement modeling artifact rather than a code defect and recommended applying no code modifications.

## Follow-ups

- Maintain `throttlingMethod: "simulate"` for Lighthouse budget gating (which accurately tracks the aggregate LCP budget against the 2.5s threshold).
- When investigating sub-phase attributions in future performance audits, evaluate them against a `devtools`-throttled trace rather than the simulated phase breakdown.
