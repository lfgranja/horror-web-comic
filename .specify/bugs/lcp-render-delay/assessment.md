# Bug Assessment: The 843 ms render delay is mostly a simulation artefact, not main-thread work

- **Slug**: lcp-render-delay
- **Created**: 2026-09-29T23:35:49-04:00
- **Source**: pasted text
- **Verdict**: invalid
- **Severity**: low

## Report (verbatim or summarized)

Raised by the follow-up in `lighthouse-lcp-element-audit/fix.md`, verbatim:

> **The LCP phase breakdown now points at the next optimisation.** With the audits restored:
>
> | phase | share | timing |
> |---|---|---|
> | TTFB | 30% | 484 ms |
> | Load delay | 3% | 54 ms |
> | Load time | 14% | 231 ms |
> | **Render delay** | **52%** | **843 ms** |
>
> The network is no longer the constraint — load delay is 3%, which is what the static `<picture>`
> injection bought. Render delay now dominates, and it is a candidate for its own assessment.

**The premise does not hold.** Under real throttling the render delay is 221 ms, not 843 ms, and the
network phases are the ones Lantern was understating. The measurement is correct about the total
(1593 ms simulated vs 1515 ms real) and wrong about where the time goes, so optimising against it would
target the wrong phase.

## Symptom

Lighthouse's LCP phase breakdown attributes 52% of the LCP (843 ms) to render delay, implying the player
holds a decoded image for most of a second before painting it. Expected for a page that fetches a 3.6 KB
image: render delay on the order of a frame or two. Observed under real throttling: 221 ms — real, but
15% of the LCP, not 52%, and not the largest phase.

## Reproduction

1. `npm run build`
2. `npx lhci autorun` with the project's `lighthouserc.json` — read the phase table from
   `largest-contentful-paint-element`.
3. Re-run with `settings.throttlingMethod` changed to `devtools`, everything else identical.
4. Compare the two tables.

Step 3 was executed against `dist/` with the same mobile emulation (360×800, DSF 2) and the same 4×
CPU slowdown; both runs passed the gate.

| phase | `simulate` | `devtools` | delta |
|---|---|---|---|
| TTFB | 461 ms | 14 ms | −447 |
| Load delay | 0 ms | 651 ms | **+651** |
| Load time | 107 ms | 628 ms | **+520** |
| **Render delay** | **1025 ms** | **221 ms** | **−803** |
| LCP total | 1593 ms | 1515 ms | −78 |
| FCP | 1151 ms | 1445 ms | +294 |
| TBT | 167 ms | 244 ms | +77 |
| performance score | 0.98 | 0.93 | −0.05 |

## Suspected Code Paths

No application code is at fault, which is why the verdict is `invalid`. The paths below were examined
and cleared:

- `src/scripts/player.js:698-719` — `handleImageLoad()` flips `data-image-loading` to `false` and sets `visibility: visible`. Measured: the reveal happens **20 ms** after the image's `responseEnd`. Not the delay.
- `src/styles/player.css:373-376` — `.frame-stage:not([data-image-loading='true'])[data-transition='fade'] .frame-image` applies `animation: frame-fade 600ms … both`.
- `src/styles/player.css:403-406` — `@keyframes frame-fade { from { opacity: 0 } to { opacity: 1 } }`. This is the best candidate in the codebase: `fill-mode: both` plus `from { opacity: 0 }` means the image is invisible at the instant it is revealed, and Chrome ignores zero-opacity elements when picking the LCP. **Measured contribution: 70 ms** (LCP 4300 ms with `cut` vs 4404 ms with `fade`, same conditions). Real, small, and already the subject of a different design decision.
- `lighthouserc.json:17` — `throttlingMethod: "simulate"`. This is where the reported number comes from.

## Root Cause Hypothesis

Lantern, Lighthouse's simulation model, does not distribute cost across the LCP phases the way real
throttling does. It pushes latency into TTFB and load time far more than reality (TTFB 461 ms simulated
against 14 ms real) and pays for it by stretching the post-load segment, which Lighthouse reports as
render delay (1025 ms simulated against 221 ms real). The total is close — 1593 against 1515 — so the
model is calibrated on the aggregate and wrong on the split. Confidence: **high**, from a controlled A/B
that changes one setting and holds the CPU slowdown and emulation fixed.

## Proposed Remediation

There is no application fix to make here, so this assessment's output is a correction rather than a
patch. The preferred action is to stop reading the phase split as an optimisation target:

**Preferred** — record, in `lighthouserc.json`'s neighbourhood and in the delivery docs, that the
`simulate` profile yields a reliable **total** LCP and an unreliable **attribution**, and that phase-level
work should be decided from a `devtools`-throttled run instead. Nothing in the gate changes: the
`simulate` profile is the right choice for the asserted budget, because it is the one that models the
reference 4G connection SC-019 names.

**Alternatives**:
- *Optimise render delay anyway.* Rejected on measurement: the ceiling is 221 ms of a 1515 ms LCP, and
  the only lever in the codebase is the authored 600 ms fade, worth 70 ms, which is a narrative decision
  (Principle I) rather than a performance defect.
- *Switch the gate to `devtools`.* Rejected: it would weaken the assertion's meaning. `devtools`
  throttling scored performance 0.93 against 0.98 and cannot model a reference 4G connection the way
  Lantern does. The simulated total is the better budget; only its breakdown is not to be trusted.

**Files likely to change**:
- None required. If the correction is written down, it belongs in `docs/delivery.md` next to the existing
  LCP line, and in `lighthouserc.json` as a comment — `json` has none, so a sibling note is the honest
  option.

**Tests to add or update**:
- None. There is no defect to lock in; the existing `largest-contentful-paint-element` assertion is
  correct and its guard (added by `lighthouse-lcp-element-audit`) already keeps the audit from rotting.

## Risks & Considerations

- **The useful finding is that `simulate` misattributes cost, and it is not specific to render delay.**
  Anyone who has read a Lighthouse phase table from this configuration has been given a wrong answer about
  where the time goes. That is worth stating plainly wherever the number is cited.
- **The 221 ms of real render delay is not zero.** It is dominated by the fade, which the product wants
  (Principle I: transitions are the medium, not decoration). Reducing it would mean cutting or shortening
  an authored transition, which is a narrative decision and should not arrive disguised as a performance
  fix.
- **The two bugs interact.** `lighthouse-lcp-over-budget` optimised the network phases and was correct to
  — real load delay is 651 ms, the largest single phase. That fix reduced load delay from 562 ms of
  simulated waiting to 651 ms of real transfer, which is a genuine improvement, but the simulated number
  made it look like a 3% phase all along.
- A `devtools` run scores performance 0.93 against 0.98. If anyone proposes switching the profile to get
  better attribution, that 0.05 is the cost, and it is the cost of a worse budget.

## Open Questions

- [NEEDS CLARIFICATION: Does the Lantern model misattribute on the other engines this project targets, or
  is the split specific to Chromium's LCP implementation? The phase table was only measured in Chromium,
  because Lighthouse only runs in Chromium.]
- [NEEDS CLARIFICATION: If render delay is inflated by simulation, is any of the **other** phase numbers
  trustworthy for direction even if not for magnitude? Load delay and load time are understated here; it
  has not been checked whether they are understated proportionally.]
