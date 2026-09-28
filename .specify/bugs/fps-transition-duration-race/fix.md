# Bug Fix: the SC-018 fps test measured the transition before its duration was published

- **Slug**: fps-transition-duration-race
- **Fixed**: 2026-09-28
- **Assessment**: ./assessment.md
- **Status**: partial

## Summary

The measurement race is fixed: the test now settles when the animation is actually
live, and the duration it measures matches the transition the fixture declares. The
test still fails, but on the real SC-018 threshold — which is the newly visible
performance question the assessment predicted, not a residual regression.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `tests/perf/fps.spec.js` | modified | observer also waits for `data-image-loading`; regression guard added against the declared duration |

No production code was touched, per the decision recorded in the assessment.

## Diff Highlights

```js
// before — fired on the attribute write, three lines before --transition-duration
const observer = new MutationObserver(() => {
  if (!active && stage.dataset.transition !== 'cut') { ... }
});
observer.observe(stage, { attributes: true, attributeFilter: ['data-transition'] });

// after — fires when the animation is actually live
const settle = () => {
  if (active) return;
  if (stage.dataset.transition === 'cut' || stage.dataset.imageLoading === 'true') return;
  active = true;
  durationMs = Number.parseFloat(getComputedStyle(image).animationDuration) * 1000;
  started = performance.now();
  previous = started;
};
const observer = new MutationObserver(settle);
observer.observe(stage, { attributes: true, attributeFilter: ['data-transition', 'data-image-loading'] });
settle();
```

The guard added alongside it:

```js
expect(result.durationMs, 'the measured transition must be the one the fixture declares').toBeCloseTo(120, 0);
```

## Tests Added or Updated

- `tests/perf/fps.spec.js::SC-018 measures at least 60 fps during an actual transition`
  — corrected. The `toBeCloseTo(120, 0)` guard is the new regression protection: if
  `player.js:541-545` is ever reordered so the stale read returns, the test now fails
  with a *wrong number* rather than a bare zero, which is much harder to miss. This
  fixture's `cut`/0ms frame is what made the original bug produce a visible 0; a
  different fixture would have produced a plausible wrong value.
- `tests/perf/zz-ci-budgets.spec.js::existing perf specs assert hard thresholds with no
  silent passes` — re-run, still passes. `toBeGreaterThanOrEqual(60)` is retained and
  no `test.skip` / `|| true` / `test.fixme` was introduced.

## Local Verification

- `node --check tests/perf/fps.spec.js` → pass
- `npm run test:unit` → **122/122**
- `tests/perf/zz-ci-budgets.spec.js` → **6/6**
- `tests/perf/fps.spec.js:22` → the measurement is now correct and the test fails on
  the real threshold

### The measurement fix is confirmed

`expect(result.durationMs).toBeCloseTo(120, 0)` passes. Before the fix the value was `0`
on all five engines. So the race is genuinely resolved rather than papered over.

### What the corrected measurement now shows

| run | host baseline | during transition |
|---|---|---|
| 1 | 60.00 fps | 38.40 fps |
| 2 | 60.00 fps | 21.14 fps |
| 3 | 60.00 fps | 35.19 fps |
| 4 | 59.98 fps | 34.18 fps |

The idle baseline is a steady ~60 fps, so **this is not machine contention** — the host
renders at full rate when idle and loses roughly half the frame budget during the
transition. This is a real rendering cost, measured for the first time.

`expect(fps).toBeGreaterThanOrEqual(60)` therefore still fails, at 34–38 fps typically.

## Deviations from Assessment

None. The assessment predicted this exact outcome: *"Fixing this makes SC-018 actually
measurable for the first time. If it then fails on `fps >= 60`, that is newly visible
information about real rendering cost, not a regression, and it should be triaged on its
own rather than folded into this bug."*

The status is `partial` rather than `applied` only because the test still fails — the
remediation is complete and verified, but the gate is not green.

## Follow-ups

- **The SC-018 threshold is a delivery decision, not a test fix.** The measurement says
  the transition costs ~40% of the frame budget on this host. Options are to reduce the
  rendering cost, to re-examine whether 60 fps is the right threshold for a 360×800
  reference profile, or to compare against the host baseline instead of a flat 60 — the
  test already records `raf_baseline_fps` and nothing asserts against it. **None of
  these should be decided as part of this fix**, and the threshold was not loosened here.
- `zz-ci-budgets.spec.js:81` on `mobile-webkit` (a host that produced no rAF samples in
  300 ms) is out of scope by decision and still open.
- If the transition cost is to be reduced, the candidate levers are the keyframe
  properties in `player.css` (`frame-fade` at 373-375) and whether the animation should
  be gated on `will-change`/`transform`-only properties.
- This host is shared and loaded, but the 60 fps idle baseline rules that out as the
  explanation. A CI run remains the authoritative measurement.
