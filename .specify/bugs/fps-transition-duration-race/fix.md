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

## CI measurement (PR #18, run 36473448205) — the deliverable of this PR

The measurement race is fixed and the duration now reads 120 ms, matching the fixture,
on every engine. What the corrected measurement shows is **per-engine**, and it inverts
the reading:

| engine | SC-018 outcome on CI |
|---|---|
| `mobile-chromium` | **pass** (≥ 60 fps) |
| `desktop-chromium` | **pass** (≥ 60 fps) |
| `desktop-firefox` | **pass** (≥ 60 fps) |
| `mobile-webkit` | fail — 14.0, 10.1, 1.0, 1.0 fps |
| `desktop-webkit` | fail — 10.1, 9.9, 9.1 fps |

**Three of five engines pass.** The player does reach 60 fps during a transition; this is
not a budget that is universally too tight, and not a universal rendering cost. It is
WebKit-specific, at roughly a fifth of the frame budget.

The same run also failed `zz-ci-budgets.spec.js:81` — "a host that produced no rAF
samples in 300 ms" — on `desktop-webkit` only. That is the second WebKit-only
performance signal in the same gate, and it points the same way. That test was
previously observed failing on `mobile-webkit`, so it appears to be WebKit-specific and
somewhat unstable rather than deterministic.

### The number this PR could not capture

`measureRaf` records a `raf_baseline_fps` annotation and the corrected test records
`transition_fps`, but **neither surfaces in the CI annotations or the job log** — only
the failure messages do. So the CI baseline is unavailable, and that gap is exactly what
matters here: if WebKit's *idle* baseline is also ~10–14 fps, then WebKit cannot render
at 60 in this environment at all and the transition figure is not a property of the
player. If WebKit's baseline is ~60 and only the transition drops, the cost is real and
engine-specific.

Making that comparison automatic — asserting the transition against the host baseline
the test already measures, rather than against a flat 60 — would answer it on every run
instead of leaving it to be reconstructed from failure messages.

---

# Round 2 — 2026-09-28: the open question is answered, and the fixture hypothesis is refuted

The section above is the record of PR #18 and is left unedited. This round ran against
`dev` at `d083b33` and answers the question that section left open. **It does not make
`dev` green, and it is recorded here rather than folded into the PR #18 narrative because
the finding is about a different root cause than the one this bug described.**

## The baseline was captured; the conclusion was wrong

`fix.md:144` above states the baseline is unavailable because it does not surface in the job
log. The first half is right and the second half is wrong in a way that mattered: the number
was in the uploaded `playwright-report` artifact the whole time, and this round read it out
of the embedded report zip in run `36476299144`:

| engine | host idle baseline | transition | ratio |
|---|---|---|---|
| `mobile-chromium` | 60.01 | 67.42 | 1.12 |
| `desktop-chromium` | 60.01 | 65.74 | 1.10 |
| `desktop-firefox` | 60.28 | 67.24 | 1.12 |
| `mobile-webkit` | 35.26 / 63.33 / 64.52 | 14.29 / 10.20 / — | 0.40 / 0.16 |
| `desktop-webkit` | 64.94 / 62.71 / 62.09 | 22.73 / 22.73 / 22.39 | 0.35 / 0.36 / 0.36 |

**WebKit's idle baseline is ~62–65 fps.** It renders at full rate when idle, so the open
question resolves against the "the host is simply slow" reading: the transition cost is real
and engine-specific, at roughly a third of the frame budget.

It also disposes of the remediation proposed in the section above. Asserting the transition
against the host baseline would **not** turn the gate green — WebKit fails at 0.35× its own
baseline just as it fails a flat 60. That proposal would have bought a better error message
and a red gate. It was not adopted.

## The fixture hypothesis, tested and refuted

The most promising explanation for a WebKit-only cost was the media itself. `fps.spec.js`
drives `tests/fixtures/story.json`, whose frames are ~1 KB vector SVGs, while
`src/data/story.json` ships delivery-encoded rasters (`assets/frames/generated/*.{avif,webp,jpg}`)
of the identical 1200×800 geometry. If WebKit re-rasterizes a live SVG per frame and caches a
decoded raster, the fixture would be measuring something the product never ships. That is
already a documented concern in this repo: `first-frame.spec.js:63` records it as **T212** —
"the fixture's frames are ~1 KB SVGs, so the <2.5 s and <10 s headline budgets were being
verified against assets that never ship" — and migrated SC-001/SC-019 to the production
manifest for exactly that reason. `fps.spec.js` never received the same migration.

Measured directly on this host, 5 reps per cell, same geometry, format the only variable:

| engine (360×800) | baseline | SVG | PNG raster |
|---|---|---|---|
| chromium | 60.0 | **67.8** | **41.2** |
| firefox | 59.9 | **24.1** | **15.6** |

**The raster is not faster than the SVG — it is slower in both engines.** The re-rasterization
theory is not supported. A `will-change` on `.frame-image` was *not* applied: it would have
degraded the real product's transitions to satisfy a number measured on a test double, on the
strength of a hypothesis that the measurement refutes.

## This host cannot certify this gate

The probe is also what settled whether the numbers above mean anything locally. They do not:

- Idle rAF baselines collapse to **12–22 fps** on the desktop viewports, where an idle loop
  should hold 60.
- Directly contradicting CI: local `firefox` + SVG measures a **0.40** transition/baseline
  ratio, while CI certifies the same engine on the same fixture at **1.12**, both from a
  ~60 fps baseline. Same engine, same fixture, same baseline, three times the cost per frame.
- The production-raster arm reported idle baselines of **1.50, 8.28 and 12.63 fps** across
  runs, and once timed out at the 30 s test limit inside the 300 ms baseline sampler.

`AGENTS.md` already records that WebKit cannot launch on this host (ICU 74 vs 77). This round
adds the harsher fact: **this host cannot certify the performance gate at all**, so SC-018's
real question is only answerable in CI, which has no raster comparison arm.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `tests/perf/fps.spec.js` | modified | extracted `measureTransition`/`fpsOf`; added the comparison arm; added a host-capability guard. Threshold untouched. |

No production change. `src/scripts/player.js` and `src/styles/player.css` are untouched, as
the assessment required.

## Tests Added or Updated

- `tests/perf/fps.spec.js::SC-018 measures at least 60 fps during an actual transition` —
  **behaviour unchanged.** The diff touches no assertion in it; the only changes are the
  extraction of the `page.evaluate` body into `measureTransition` and of the fps arithmetic
  into `fpsOf`, so the two tests measure identically. `toBeGreaterThanOrEqual(60)`,
  `toBeCloseTo(120, 0)` and the `raf_baseline_fps` / `transition_fps` annotation types are all
  preserved verbatim, which keeps this run's numbers comparable with PR #18's.
- `tests/perf/fps.spec.js::SC-018 records the fixture-versus-production transition
  comparison` — **added.** Measures the same transition on both stories in one run and emits
  one `SC-018-COMPARISON` line to stdout plus a `transition_fps_comparison` annotation. It
  asserts **measurement validity only** — that each arm saw a live transition, that it was the
  one the manifest declares, and that the host can render well enough for a ratio to mean
  anything. It asserts **no delivery number**, because SC-018's delivery number is an open
  question for its owner and inventing one inside a measurement would settle it by accident.
- `tests/perf/zz-ci-budgets.spec.js::existing perf specs assert hard thresholds with no
  silent passes` — re-run, still passes (6/6). This is the guard that greps `fps.spec.js` for
  the literal `toBeGreaterThanOrEqual(60)` and for `test.fixme` / `|| true` / `exit 0` /
  `--pass-with-no-tests` / `test.skip`; the new test introduces none of them.

## A second measurement race, found by the new assertion

Writing the comparison arm immediately exposed a defect in the shared measurement that the
fixture had been hiding. `settle()` was called once before the click, and its only guard was
`stage.dataset.transition === 'cut'`. That is a proxy for "no transition is in flight", and it
holds only while the first frame happens to be a cut. The fixture's frame-01 *is* a cut, so
`settle()` correctly waited for the click. **Production frame-01 is a `fade`/600 ms**, so
`settle()` fired immediately on the already-settled first frame and then measured the click's
transition against it, reading the CSS fallback `var(--transition-duration, 600ms)` where the
manifest declares 700 ms.

Fixed by arming the observer only across the click (`armed`), so the measurement is
unambiguously about the transition the click triggers regardless of the first frame's type.
The `toBeCloseTo(declaredDurationMs, 0)` assertion is what caught it — a test that only
asserted "a transition was observed" would have reported a confidently wrong number.

This is the same class as the original bug in this slug: measuring before the thing being
measured exists. It survived in the PR #18 fix because the fixture's cut frame satisfied the
guard by coincidence.

## Local Verification

| Command | Result |
|---|---|
| `node --check tests/perf/fps.spec.js` | pass |
| masked-string / threshold-literal check against `zz-ci-budgets.spec.js` | pass — no masks, `toBeGreaterThanOrEqual(60)` intact |
| `npm run test:unit` | **122/122** |
| `npx playwright test tests/perf/zz-ci-budgets.spec.js --project=mobile-chromium` | **6/6** |
| `npx playwright test tests/perf --project={mobile,desktop}-chromium --project=desktop-firefox` | 27 passed, 4 skipped, **5 failed** |

The 5 local failures, and why none of them is a regression:

- `fps.spec.js` SC-018 on all three projects — the host limitation above. CI certifies both
  chromium projects and firefox at ≥60 on this same code.
- `fps.spec.js` comparison on `desktop-chromium` — the host-capability guard, firing exactly
  as designed (`host idle baseline 9.48 fps is too low for a transition/baseline ratio to
  mean anything`).
- `first-frame.spec.js:76` SC-019 on `mobile-chromium` — host-related, and in a file this
  round does not touch. `first-frame.spec.js` does not read `fps.spec.js`, so no shared state
  exists between them; this is an argument from isolation, not a measurement on the original
  code.

`zz-ci-budgets.spec.js:81` also failed once under multi-worker load and passed in isolation on
the unmodified tree — the instability already recorded in the section above, not a change.

**The comparison test has never been observed green on a capable host.** It passed twice
before the capability guard was added, which is what proves the measurement path, the 700 ms
production duration and the stdout logging all work; the guard then correctly began rejecting
this host. Its green run has to come from CI.

## Deviations from Assessment

The assessment scoped this slug to one file and one defect — fix the measurement race, change
nothing else — and `fix.md` from PR #18 explicitly deferred the 60 fps question. This round
went past that boundary, deliberately and with the owner's decision at each step:

1. **Scope expanded from remediation to evidence-gathering.** The assessment's
   "Risks & Considerations" says a post-fix failure on `fps >= 60` "should be triaged on its
   own rather than folded into this bug." This round did not fold it in — it stopped at
   measurement, changed no threshold, and left the delivery decision open.
2. **The proposed baseline-relative assertion was rejected**, on the artifact data above. It
   would not have turned the gate green.
3. **A `will-change` CSS fix was considered and dropped** after the probe refuted the
   mechanism that motivated it.
4. `first-frame.spec.js:63` (T212) is cited as the project's own prior decision on this class
   of defect, and is the strongest argument for eventually migrating SC-018 to the production
   manifest. It is not yet actioned — that migration is a delivery decision, and one CI run of
   the comparison arm is what should inform it.

## Follow-ups

- **One CI run settles the open question.** Read the `SC-018-COMPARISON` line from
  `mobile-webkit` and `desktop-webkit`. If the raster arm reaches ≥60 while the SVG arm stays
  near 22, the fixture is the cause and SC-018 should be migrated to the production manifest
  under T212. If both stay near 22, the cost is the player's and belongs in
  `src/styles/player.css`. Nothing else needs to be guessed.
- **The 60 fps threshold is still uncertified for shared CI runners** — the assessment's first
  `[NEEDS CLARIFICATION]`, still open, and still a delivery decision. `zz-ci-budgets.spec.js:108`
  pins the literal `toBeGreaterThanOrEqual(60)` and must be updated in the same change if the
  threshold ever moves.
- `zz-ci-budgets.spec.js:81` on WebKit remains open and unaddressed, as the assessment decided.
- Once the comparison has run in CI, decide whether the arm stays permanently. It is
  diagnostic; if it stays, it is the only perf spec that measures two delivery paths, and that
  is worth keeping in mind when it next fails on a loaded runner.

## The CI result (run 36502253771, branch `fix/sc-018-comparison`)

The follow-up above promised that one CI run would decide this. It ran, and it decided
against the fixture hypothesis. `transition/baseline` per project and per arm:

| project | fixture-svg (vector) | production-raster | verdict |
|---|---|---|---|
| `mobile-chromium` | 65.31 / 60.00 = **1.09** | 60.65 / 60.01 = **1.01** | healthy |
| `desktop-chromium` | 65.41 / 60.02 = **1.09** | 60.69 / 60.00 = **1.01** | healthy |
| `desktop-firefox` | 66.63 / 59.97 = **1.11** | 60.80 / 63.16 = **0.96** | healthy |
| `mobile-webkit` | 11.49 / 62.91 = **0.18** | 18.01 / 64.72 = **0.28** | both arms collapse |
| `desktop-webkit` | 29.85 / 36.42 = **0.82** | 39.66 / 60.90 = **0.65** | both arms collapse |

**The fixture is not the cause.** Chromium and Firefox hold ~1.0 on *both* arms, while both
WebKit projects collapse on *both*. Migrating SC-018 to the production manifest under T212
would therefore still leave the WebKit gate red — the media format is not what is being
measured.

The format does make a difference, and it is the opposite direction from the local probe:
on WebKit the delivery raster is the *faster* of the two (18.01 vs 11.49 on mobile, 39.66 vs
29.85 on desktop), so the ~1 KB SVG carries some real cost. It is not enough to explain the
gate, and the two measurements disagree on which format is cheaper — the local host was too
contended to rank them, and the direction is not load-bearing for the conclusion either way.

**So the cost is in the player's transition path, not the media, and the next change belongs
in `src/styles/player.css`.** That is now a supported hypothesis rather than the guess it was
when it was first raised, and it is a new defect with a new root cause, so it belongs in its
own assessment rather than in this slug.

Two caveats on these numbers, so the next reader does not over-trust a single cell:

- `desktop-webkit`'s fixture-svg baseline read 36.42 where that project otherwise idles near
  62, so its 0.82 is a suspect cell. The conclusion does not rest on it: the raster arm in the
  same project drew a healthy 60.90 baseline and still only reached 39.66.
- `mobile-webkit` reported two different idle baselines inside one run — 26.06 in the SC-018
  test and 62.91 in the comparison arm, same project, same fixture. WebKit baseline readings
  on these runners are unstable enough that any single reading should be treated as a range.

The comparison test itself passed on all five projects, and its host-capability guard did not
trip in CI — the runners hold a meaningful idle baseline, which is precisely what this host
could not do and why the local attempt was uninformative. The three perf failures in the run
are unchanged and pre-existing: SC-018 on `mobile-webkit` and `desktop-webkit`, plus
`zz-ci-budgets.spec.js:81` on `mobile-webkit`.

## Round 3 — SC-018 asserted against the host's own idle rate

### The spec already scoped this requirement to a device CI does not have

`specs/001-cinematic-player/spec.md:526` reads:

> **SC-018**: As transições mantêm ≥60 fps **no dispositivo de referência de SC-001**

and `spec.md:467` defines that device:

> **SC-001**: ...em um smartphone de médio porte (referência: **~4 GB de RAM, tela
> 360×800, CPU de entrada**)

So the requirement was never "≥60 fps on whatever machine runs the suite". It was
≥60 fps on a 4 GB entry-level phone. A shared GitHub runner is not that, and headless
WebKit — a software rasterizer with no GPU — is the furthest possible thing from it.
The gate was asserting a number on a machine the requirement does not name, and had
been red for a reason that was about the harness rather than about the player.

### What changed

`SC018_MIN_RATIO = 0.9` replaces the flat 60. The assertion is now that the
transition sustains ≥90% of the rate that **the same host** sustains when idle — which
is the host-independent form of "a 120 ms fade must not cost the compositor most of
the frame budget". A `SC018_MIN_HOST_FPS = 30` precondition rejects a host too slow to
certify a ratio at all, the same reasoning as `zz-ci-budgets.spec.js:81`.

Measured ratios (run 36502253771) put the floor in context:

| project | ratio | vs 0.9 |
|---|---|---|
| `mobile-chromium` | 1.088 | +21% |
| `desktop-chromium` | 1.090 | +21% |
| `desktop-firefox` | 1.111 | +23% |
| `desktop-webkit` | 0.820 | fails |
| `mobile-webkit` | 0.183 | fails |

### This does not turn `dev` green, and could not

No defensible ratio both admits WebKit's 0.183 and means anything. A 120 ms fade running
at a sixth of the host's own frame rate is not smooth; certifying it needs a floor around
0.15, which is how a delivery guarantee is eroded into a rubber stamp. **WebKit failing
here is the correct result of a correctly-specified gate.** The WebKit transition cost
is real, engine-specific, and unfixed — it now fails for the right reason instead of
failing as a mysterious 14 fps against an arbitrary 60.

The research behind that choice, and its sources:

- `firejune/spine-html/CLAUDE.md` — *"Headless WebKit is a software rasterizer. Never
  cite its timings as Safari performance evidence — measured up to 28× off real Safari,
  in both directions. Headless is for visual regression only."* and *"Never assert
  absolute milliseconds in tests; assert the deterministic counters instead."* The same
  file records an unrelated Linux-WebKit rasterizer defect whose mechanism *"is not
  identified, and it reproduces on the CI runner only"*, and the principle *"a per-texel
  precision number read off one platform is a platform's number, whatever it is derived
  from"* — which is exactly the defect the flat 60 was.
- Playwright's own docs state: *"While running WebKit on Linux CI is usually the most
  affordable option, for the closest-to-Safari experience you should run WebKit on mac."*
- Ecosystem precedent for gates that do not survive headless WebKit: `jborgese/benefit-finder`
  asserts `fps >= 15` (*"Headless browsers don't have GPU acceleration"*) and a per-engine
  jank bound (`browserName === 'webkit' ? 16 : 10`); `ironyh/VueSIP`'s test named
  *"should maintain 60 FPS during animations"* asserts `> 30` and skips WebKit and CI;
  `TortoiseWolfe/SpokeToWork`, `objectstack-ai/objectui` and `lgtm-hq/turbo-themes` all use
  documented per-engine guards. **No project found keeps a 60 fps headless-WebKit gate,
  because none passes.**

What was explicitly **not** done, and why:

- **No `will-change` on `.frame-image`.** No measurement exists of layer promotion in a
  *software* compositor, and the one WebKit engine statement on the case attributes the
  opacity win to the GPU (*"the effect is done by the GPU"*, bug 264966). There is also
  no evidence the cost is in the player's CSS at all: the CI comparison above shows both
  delivery paths collapsing, and `frame-fade` already animates only `opacity`, which is
  compositable.
- **No per-engine threshold and no WebKit skip.** Both would make `dev` green by weakening
  the guarantee rather than by meeting it, and both are the owner's call, not a test
  change. The ecosystem has both patterns documented; neither is applied here.

### The guard moved with the threshold, and was proven to catch a violation

`zz-ci-budgets.spec.js:108` pinned the literal `toBeGreaterThanOrEqual(60)`, so it had to
change in the same commit or the meta-test would have failed. It now pins the *named*
assertion, the *value* of the floor, and the host precondition — and asserts the flat 60
has **not** returned alongside the ratio:

```js
expect(fps.includes('toBeGreaterThanOrEqual(SC018_MIN_RATIO)'), '...').toBe(true);
expect(fps.includes('const SC018_MIN_RATIO = 0.9'), '...retuning it is a delivery decision').toBe(true);
expect(fps.includes('toBeGreaterThan(SC018_MIN_HOST_FPS)'), '...').toBe(true);
expect(fps.includes('toBeGreaterThanOrEqual(60)'), '...must not return...').toBe(false);
```

Proven non-vacuous: loosening the floor to `0.15` turns this guard red with
*"SC-018 baseline ratio floor must stay pinned; retuning it is a delivery decision"*.
It was restored to `0.9` and the guard re-run green. A guard that has only ever passed
proves nothing.

### Local Verification

| Command | Result |
|---|---|
| `node --check` on both specs | pass |
| `npm run test:unit` | **122/122** |
| `tests/perf/zz-ci-budgets.spec.js --project=mobile-chromium` | **6/6** |
| guard loosened to 0.15, meta-test re-run | **fails as designed**, then restored |
| `tests/perf/fps.spec.js` SC-018 on 3 local projects | 3 failed — see below |

The three local SC-018 failures are the host, not the change, and this run quantifies why
better than any argument could: `desktop-chromium` measures **0.224** here against **1.090**
in CI, and `desktop-firefox` **0.408** against **1.111** — the same engines, the same
fixture, the same assertion, a 5× disagreement between this host and a CI runner.

The failure text is the other half of the value:

```
the transition ran at 0.224x the host's idle 60.02 fps — a 120ms fade must not cost
the compositor most of the frame budget
```

which replaces `Expected: >= 60 / Received: 14.2857`, a number that said nothing about
which host produced it or what it meant.

### The delivery gap this leaves open

The literal **"≥60 fps on the SC-001 reference device" is now explicitly UNVERIFIED by
this suite.** It needs a real 4 GB entry-level phone, which this repository has no means
to reach. The options are the four the research surfaced — a documented per-engine
threshold, a documented WebKit skip, a macOS runner for real WebKit signal, or a
real-device benchmark — and all four weaken or relocate a guarantee, so all four belong to
the owner. What this change removes is the false impression that the suite already covers
it.

## Round 4 — the WebKit cost was the measuring instrument, not the player

The spec said the transition must hold ≥60 fps on a ~4 GB entry-level phone. Nothing in CI
is that device, so this round built the closest available substrate and measured the same
thing on it.

### What the measurement says

The identical assertion — transition fps ÷ the same host's idle fps, over the same
fixture's 120 ms fade — on the two substrates:

| substrate | WebKit ratio |
|---|---|
| `ubuntu-latest`, Playwright WebKit (WPE, no GPU) | **0.171 – 0.403** |
| `macos-15`, Playwright WebKit (Core Animation → Metal) | **0.800 – 1.128** |

Per project on macOS, both delivery paths:

| project / arm | baseline | transition | ratio |
|---|---|---|---|
| `mobile-webkit` fixture-svg | 59.41 | 66.67 | **1.122** |
| `mobile-webkit` production-raster | 60.13 | 58.99 | **0.981** |
| `desktop-webkit` fixture-svg | 60.00 | 67.67 | **1.128** |
| `desktop-webkit` production-raster | 59.60 | 61.17 | **1.026** |

**WebKit sustains the host's full frame rate on a real compositor. There is no WebKit
performance defect in this player.** The 0.17 was the Linux WPE build software-compositing
every frame of a composited animation, and nothing about the player changed between the
two rows.

That closes the question this slug opened, and it closes it against both hypotheses that
were raised along the way:

- **Not the fixture.** The production raster arm is at 0.98–1.03 on the same substrate,
  and both arms collapse identically on Linux. Round 2 already refuted the re-rasterization
  theory on its own; this confirms it from the other direction.
- **Not `player.css`.** No `will-change`, no keyframe change, no `contain` was ever
  applied, and the transition runs at 1.13 on a hardware compositor. There was nothing to
  fix in the CSS. Had the earlier `will-change` guess gone in on the strength of the
  SVG theory, it would have shipped a change to the product's real animation path to
  satisfy a software rasterizer's limitation.

The research that pointed here was right and is now measured rather than cited:
`firejune/spine-html`'s "headless WebKit is a software rasterizer, measured up to 28× off
real Safari" is exactly the ratio gap between the two rows above.

### The macOS job could not start, and the reason matters

The first run of `macos-webkit-compositor` on `macos-14` measured nothing. All four tests
died during page setup:

```
Protocol error (Page.overrideSetting): Unknown setting: PushAPIEnabled
```

Not a flaky test and not a threshold question. `playwright-core/browsers.json` pins webkit's
revision to **2251** for `mac14` and `mac14-arm64` against a default of **2359**, and the
Playwright client has sent `Page.overrideSetting(PushAPIEnabled)` at page initialisation
since 1.62.0. WebKit 2251 does not implement that setting, and `macos-14` is arm64, so it
takes the stale pin. The job now runs on `macos-15`, which takes 2359.

`zz-ci-budgets.spec.js` asserts `runs-on: macos-14` is **absent**, with that reason in the
failure message. Reverting the label reads like a harmless cleanup and would turn the
measurement into a job that fails for an unrelated reason.

### The job proves its own substrate

It reads `WEBGL_debug_renderer_info` and fails when the renderer matches a software path.
This matters because a macOS job that silently degraded would report the same 0.17 it was
added to disprove and then look like confirmation. The probe did not fail on any of the
four runs — the only error was a ratio — so no run was certified on a software renderer.

One gap, and it is the same one this slug already fixed once: the renderer string is an
annotation, so it reaches the report archive but not the job log, and the archive only
uploads on failure. The literal renderer is therefore not readable from a green run. It
should be on stdout next to `SC-018-COMPARISON` for the same reason that one is.

### What is now decided, and what is still open

Decided and certified per commit: the transition costs the compositor essentially nothing
(≥0.9 of the host's own idle rate) on Chromium, Firefox, and — on a hardware compositor —
WebKit.

Still open, and now with the evidence that bears on it: **the Linux WebKit projects will
keep failing SC-018 at ~0.2–0.4 forever, and that failure is now measured to be a property
of the WPE software rasterizer rather than of this player.** The same assertion passes on
the same WebKit at 1.13. That is the evidence the ecosystem's documented per-engine
threshold pattern normally lacks — `jborgese/benefit-finder` relaxes WebKit because of its
"different rendering pipeline" without measuring that pipeline; this repo can now point at
the number. It is still the owner's decision, and it is still a weakening of the guarantee
as stated on Linux, so it was not applied here.

Also still open, unchanged: `zz-ci-budgets.spec.js:81` on `mobile-webkit`, which fails
intermittently with "no rAF samples in 300ms"; and the literal "≥60 fps on the reference
device", which the spec now records as periodic real-device certification rather than a
per-commit gate.

### Local Verification (round 4)

| Command | Result |
|---|---|
| `node --check` both specs; `lighthouserc.json` + `package.json` parse | pass |
| `npm run preflight` | 14/15 — the one failure is this host's Fedora/ICU webkit launch, documented in AGENTS.md and unrelated |
| `npm run test:unit` | **122/122** |
| `tests/perf/zz-ci-budgets.spec.js` | **6/6** |
| guard negative tests | Lighthouse profile → red; runner `ubuntu-latest` → red; runner `macos-14` → red. All restored. |
| `tests/perf/fps.spec.js` local | fails on the unfit host with the intended self-explaining message |
| CI `36513728294` | `macos-webkit-compositor` **success**; Linux `gate` fails only on the known WebKit ratio and the known `zz-ci-budgets:81` flake |

