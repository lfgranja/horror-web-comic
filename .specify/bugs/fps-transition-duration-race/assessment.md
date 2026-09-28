# Bug Assessment: the SC-018 fps test measures the transition before its duration is published

- **Slug**: fps-transition-duration-race
- **Created**: 2026-09-28
- **Source**: pasted text (CI `gate` output on PR #17, run 36436121024)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

`npm run test:perf` failed on all five browser projects:

```
1) [mobile-chromium] › tests/perf/fps.spec.js:22:1 › SC-018 measures at least 60 fps
   during an actual transition
   Error: expect(received).toBe(expected)   Expected: > 0   Received: 0
   > 63 |     expect(result.durationMs).toBeGreaterThan(0);
```

The same test also failed on `desktop-chromium`, `desktop-firefox`, `desktop-webkit`
and `mobile-webkit`. It has never run before: `test:perf` is non-skippable in the
`AGENTS.md` gate order and had been blocked at every earlier step.

## Symptom

The test measures the duration of a real frame transition in order to compute frames per
second over it. It measures zero, so the fps figure it derives is meaningless. The
transition itself is fine — the test reads the duration at the wrong moment.

## Reproduction

1. `git checkout dev` (`845d083`)
2. `npm ci && npx playwright install --with-deps chromium firefox webkit`
3. Provide a null audio sink (see `ci.yml`)
4. `npm run build && npm run test:perf -- --project=mobile-chromium`
5. Observe `expected: > 0, received: 0` at `tests/perf/fps.spec.js:63`

Deterministic: it failed on all five projects.

## Suspected Code Paths

- `tests/perf/fps.spec.js:38-45` — the `MutationObserver` that drives the measurement:
  ```js
  const observer = new MutationObserver(() => {
    if (!active && stage.dataset.transition !== 'cut') {
      active = true;
      durationMs = Number.parseFloat(getComputedStyle(image).animationDuration) * 1000;
      ...
    }
  });
  observer.observe(stage, { attributes: true, attributeFilter: ['data-transition'] });
  ```
- `src/scripts/player.js:541-545` — the publish order the test races:
  ```js
  541:  this.root.dataset.transition = transition.type;
  542:  this.stage.dataset.transition = transition.type;   // ← the observer fires here
  543:  this.stage.dataset.imageError = 'false';
  544:  this.stage.style.setProperty('--transition-duration', `${transition.durationMs}ms`);  // ← 3 lines later
  545:  this.stage.style.setProperty('--transition-easing', transition.easing);
  ```
- `src/scripts/player.js:533-540` — the comment documenting that the early publish is
  deliberate, and why
- `src/styles/player.css:373-375` — the animation is bound to a custom property:
  ```css
  .frame-stage:not([data-image-loading='true'])[data-transition='fade'] .frame-image {
    animation: frame-fade var(--transition-duration, 600ms) var(--transition-easing, ease-in-out) both;
  }
  ```
- `tests/fixtures/story.json` — frame-01 is `{ "type": "cut", "durationMs": 0 }` and
  frame-02 is `{ "type": "fade", "durationMs": 120 }`

## Root Cause Hypothesis

**The test reads `--transition-duration` in the three-line window before the player sets
it, and that window is documented as intentional.** Confidence: **high** — the sequence
is short, fully quoted above, and reproduces deterministically on every engine.

The measured sequence:

1. The player renders **frame-01**, whose transition is `cut` / **0 ms**, and sets
   `--transition-duration: 0ms` on the stage.
2. The test clicks `#next-frame`. The player resolves **frame-02**'s transition —
   `fade` / **120 ms** — and writes `data-transition="fade"` at `player.js:542`.
3. That write is what the observer is watching, so the callback runs **there and then**.
4. The callback calls `getComputedStyle(image).animationDuration`. The CSS resolves
   `var(--transition-duration, 600ms)`, and the custom property still holds **0 ms** from
   step 1, because `player.js:544` has not run yet. `parseFloat("0s")` → `0`.
5. `player.js:544` then sets the correct `120ms`, too late for this measurement.

So the observer is sampling a genuine intermediate state, not a broken value. And that
state is by design: `player.js:533-540` explains that the resolved transition type is
published early and stays observable while the frame loads, that T197 is enforced in CSS
instead, and that the keyframes are bound to
`.frame-stage[data-transition='…']:not([data-image-loading='true'])` so the animation
only starts when `handleImageLoad()` reveals the image. Binding the animation to the
attribute write would have run a 600–700 ms fade against a `visibility: hidden` element.

The test is therefore measuring before the thing it wants to measure exists. The product
is behaving as documented.

## Proposed Remediation

**Fix the test, not the product** (the owner's decision, and the right one: the publish
order is a documented T197 behaviour, not an accident).

The test wants the duration of the animation that actually runs. That animation starts
when `data-image-loading` flips to `false`, not when `data-transition` is written. So
the measurement should key on the moment the animation is live — observe
`data-image-loading` as well, and read `animationDuration` on the first sample where the
image is no longer loading. Reading the custom property after it settles is the
simpler equivalent, and either way the test stops depending on the two writes being
adjacent.

A regression guard is worth adding while the file is open: assert that the measured
duration is non-zero *and* that it matches the resolved transition for the frame that was
entered, so a future reordering of `player.js:541-545` fails loudly instead of silently
degrading the measurement again.

**Alternatives:**
- *Reorder `player.js:544` to run before `:541`* — makes an attribute observer see a
  consistent state. It would not break T197, because the animation is gated on
  `data-image-loading` and not on the attribute write. But it changes product code to
  satisfy a test, and it would not have fixed this test anyway: the animation is still
  not running while the image loads, so the measurement window is still wrong.
- *Read `--transition-duration` from the inline style directly* — works, but reaches past
  the public observable (computed `animation-duration`) into an implementation detail,
  and still samples before `player.js:544` runs unless the test also waits.

**Files likely to change**:
- `tests/perf/fps.spec.js`

**No production change is warranted.** `src/scripts/player.js` and
`src/styles/player.css` should be left alone.

**Tests to add or update**:
- `tests/perf/fps.spec.js::SC-018 measures at least 60 fps during an actual transition`
  — corrected, and it becomes the guard once it measures the real duration
- `tests/perf/zz-ci-budgets.spec.js::existing perf specs assert hard thresholds with no
  silent passes` (`:102`) — check it still holds after the change

## Risks & Considerations

- **The 60 fps threshold has still never been certified.** Fixing this makes SC-018
  actually measurable for the first time. If it then fails on `fps >= 60`, that is
  newly visible information about real rendering cost, not a regression, and it should
  be triaged on its own rather than folded into this bug.
- The fixture's `cut` frame is what makes the stale value `0`. A different fixture
  would produce a wrong-but-plausible number instead of a zero, which is harder to
  notice. The regression guard above is what protects against that.
- The second perf failure in the same run, `zz-ci-budgets.spec.js:81` on
  `mobile-webkit`, is **out of scope by decision** and is not addressed here. It is a
  different test with a different symptom: a host that produced no rAF samples in
  300 ms, which the test reports loudly by design.
- Do not treat the fps number as a baseline until this has run green once on CI
  hardware. Nothing has ever been measured on the reference runner.

## Open Questions

- [NEEDS CLARIFICATION: is SC-018's 60 fps threshold calibrated against GitHub-hosted
  runners, which are shared and throttled? It has never been measured there, so there
  is no baseline, and a first measurement may fail for reasons unrelated to the player.]
- [NEEDS CLARIFICATION: `measureRaf` at `fps.spec.js:4-20` reports a `raf_baseline_fps`
  annotation, but nothing asserts against it. Should the transition figure be compared
  to the host baseline instead of a flat 60, so a slow host is distinguishable from a
  slow transition?]
