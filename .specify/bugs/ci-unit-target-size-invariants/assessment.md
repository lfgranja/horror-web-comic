# Bug Assessment: CI unit tests fail on TargetSize Invariants (PBT)

- **Slug**: ci-unit-target-size-invariants
- **Created**: 2025-11-01
- **Source**: https://github.com/lfgranja/horror-web-comic/actions/runs/41342550789/job/124955442273
- **Verdict**: likely valid, needs reproduction
- **Severity**: medium

## Report (verbatim or summarized)

CI gate failed with unit test failures: 225 pass, 1 fail, 1 skipped out of 227 tests. Failure reported for "TargetSize Invariants (PBT): smallestTarget area invariant".

## Symptom

One property-based unit test fails in CI causing gate to fail. Locally all target-size invariant tests pass.

## Suspected Code Paths

- `tests/unit/target-size-invariants.test.js:93` - smallestTarget area invariant test
- `tests/e2e/helpers/target-size-helper.js` - smallestTarget computation (rounds to 0.1)

## Root Cause Hypothesis

Medium confidence. Property-based test may find counterexample in CI where rounding of smallestTarget dimensions makes its area larger than some control's actual area beyond the tolerance.

## Proposed Remediation

**Preferred**: Make test more robust - compute smallest area from actual control with minimum area rather than from rounded smallestTarget dimensions, or increase tolerance/store actual values.

**Files likely to change**:
- `tests/unit/target-size-invariants.test.js`
- `tests/e2e/helpers/target-size-helper.js`

## Risks & Considerations

- Flaky/property-based test environment-dependent
- Local tests pass suggesting CI-specific issue

## Open Questions

- [NEEDS CLARIFICATION: Actual failure message from CI logs]
