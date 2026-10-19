# Clarification: light quality floor — fail fast or warn?

**Feature**: `specs/003-artcraft-local-authoring`
**Question**: When a deliberately-degraded `-light-*` variant still exceeds its byte budget *at the light quality floor*, should `build:images` **fail fast** (throw, naming the frame) or **only warn**? And how does that interact with the principle that forbids "silent degradation"?

**Status**: answered (research-backed). Recommendation: **fail fast for the quality floor, standard *and* light**. Correct the one line in `data-model.md` that says otherwise.

---

## 0. What is actually inconsistent in the repo

Two different gates are being conflated in the documents. They have the same *word* ("light … warn-only") but not the same *object*:

| Gate | What it measures | Standard | Light | Where stated |
|:---|:---|:---|:---|:---|
| **Quality floor** (encoder parameter) | the lowest encoder quality the byte-budget ladder may descend to | throw | **throw** | `spec.md` FR-012, clarification batch 5, `research.md` §11 |
| **Tier B delivery fidelity** (perceptual proxy) | SSIM/PSNR of the encoded variant vs. a lossless PNG reference | throw | **warn-only** | `spec.md` FR-007, clarification batch 5, `research.md` §3, `data-model.md` §TierBGate |

`data-model.md` gets Tier B right and then, in the *constraints* table, copies "warn-only" onto the **light quality floor**:

- `specs/003-artcraft-local-authoring/data-model.md:193` — `Quality floor (light) | AVIF ≥20 / WebP ≥30 / JPEG ≥30 | warn-only`
- `specs/003-artcraft-local-authoring/data-model.md:192` — `Quality floor (standard) | … | encodeImage throw naming frame`
- `specs/003-artcraft-local-authoring/data-model.md:194` — `Tier B SSIM | … | fail-fast / warn-only` (correct: that is Tier B)

Every other artifact already says *throw* for both floors: `spec.md` FR-012 ("deve **lançar erro**, nomeando o frame, quando o orçamento ainda não é atendido no piso: standard …; **light** — AVIF ≥ 20, WebP ≥ 30, JPEG ≥ 30"), the batch-5 clarification (`spec.md:61`, "**throw nomeando o frame** em vez de degradar silenciosamente"), `research.md` §11 ("`build-images.mjs` **throws naming the frame** instead of silently degrading"), and the pre-existing `docs/image-quality-assessment.md` §5.2 ("**Fail-fast:** any variant below threshold fails `build:images`"). **The data-model line is the outlier, and it is the one that is wrong.**

In the code, the two hard constraints already live in `scripts/build-images.mjs`:

- `encodeImage` (lines 79–98) walks a quality ladder and, if no rung fits, `throw`s `"…exceeds <budget> bytes"`.
- `validateImage` (lines 50–66) independently `throw`s on `stats.size > maxBytes` (`MAX_LIGHT_BYTES = 150_000`, line 11; `MAX_STANDARD_BYTES = 300_000`, line 12).

So the *byte budget* is already hard. The feature adds a *quality floor* that truncates the ladder. The question is what happens when the truncated ladder still cannot meet the hard byte budget.

---

## 1. Direct answer

**Fail fast — throw, naming the frame, for the light floor exactly as for the standard floor.** A warning is not a decision; it is the appearance of one. In this pipeline the two constraints are (a) a hard byte budget already enforced downstream and (b) a hard policy floor on how far the encoder may degrade quality to meet it. When they cannot both be satisfied, there is no valid artifact to emit, and the only non-silent outcome is a non-zero exit that forces a human to pick which constraint yields — simplify the art, amend the budget, or amend the floor.

"Degraded by design" does **not** mean "may be degraded further without notice." It means the degradation was **declared in advance and bounded**. The light floor *is* that declared bound. Crossing it is not the accepted degradation; it is an *undeclared* one — precisely the "silent degradation" the principle forbids.

---

## 2. What the primary sources say

### 2.1 Fail-fast is the build-pipeline norm: any unmet constraint is a failed build

- **Martin Fowler, *Continuous Integration*, §"Make the Build Self-Testing"** — "any test failing is enough to fail the build, **99.9% green is still red**." ([martinfowler.com/articles/continuousIntegration.html#MakeTheBuildSelf-testing](https://martinfowler.com/articles/continuousIntegration.html#MakeTheBuildSelf-testing)). The repo already cites this as its fail-fast warrant (`spec.md:207`); it applies with equal force to a media gate that cannot meet policy. Fowler's companion practice is *"Fix Broken Builds Immediately"* — a build that is allowed to stay "almost green" has no owner.
- **Bazel, "Evaluation model"** — a build runs as loading → **analysis** → execution; "If a file is missing or if a command fails to generate one output, **the build fails**." ([bazel.build/extending/concepts#evaluation-model](https://bazel.build/extending/concepts#evaluation-model)). The relevant part is not the phase name but the rule: when the requested output cannot be produced *as specified*, Bazel aborts rather than shipping something adjacent to it. Here the "specification" is (floor ∧ budget); if no encoder rung satisfies both, the output cannot be produced as specified.
- **CNCF TAG Security, *Software Supply Chain Best Practices v2*** — policy-as-code exists to *enforce*, not to advise: "Leveraging policy-as-code solutions allows for the automation of these enforcements, ensuring that **every step and element of the supply chain adheres** to established security standards," and developers are told to "**Ensure that tests are automatically run before deployment**" ([SSCBPv2.md §Policy enforcement / §Protecting the Build](https://github.com/cncf/tag-security/blob/main/community/working-groups/supply-chain-security/supply-chain-security-paper-v2/SSCBPv2.md)). A quality floor that only logs is policy that is not enforced.

### 2.2 Degradation policy: designed, bounded, *visible* — and fail when even the degraded path is impossible

Google's SRE book is the canonical treatment of "serve a degraded response" and it draws exactly the line this question turns on:

- **Ch. 21, *Handling Overload*** — serving degraded responses is an option, but it is bounded: "under extreme overload, the service might not even be able to compute and serve degraded responses. At this point it may have no immediate option but to **serve errors**." ([sre.google/sre-book/handling-overload](https://sre.google/sre-book/handling-overload/)). Translation for this pipeline: the light variant is the degraded response; when even the degraded response cannot be produced *within policy*, you do not quietly ship something worse — you fail.
- **Ch. 22, *Addressing Cascading Failures*, §"Load Shedding and Graceful Degradation"** — degraded modes must be *monitored and actionable*, not logged: "**Monitor and alert when too many servers enter these modes.**" and "**the code path you never use is the code path that (often) doesn't work.**" The same chapter's prevention list says to "**fail early and cheaply**," and on deadlines: "If your RPC layer supports a **fail-fast** option, use it." ([sre.google/sre-book/addressing-cascading-failures](https://sre.google/sre-book/addressing-cascading-failures/)). A `console.warn` in a CI log that nobody reads is the opposite of "monitor and alert": it is a degraded mode that is never surfaced.
- **Google SRE Workbook, Ch. 5, *Alerting on SLOs*** — an alert is only meaningful if it is *actionable* and *timely*; the chapter's whole method is about distinguishing events that deserve a human from noise ([sre.google/workbook/alerting-on-slos](https://sre.google/workbook/alerting-on-slos/)). A floor excursion is by definition an event that needs a human decision, so it belongs on the "page" side, not the "log" side.

### 2.3 "Fail-safe defaults" (fail-closed), 1975

Saltzer & Schroeder's classic design principle is the general form of the argument:

> **Fail-safe defaults:** Base access decisions on permission rather than exclusion. … "a design or implementation mistake in a mechanism that explicitly **excludes** access tends to fail by **allowing** access, **a failure which may go unnoticed in normal use**."
> — Saltzer & Schroeder, *The Protection of Information in Computer Systems*, §I.A.3(b) ([web.mit.edu/Saltzer/www/publications/protection/Basic.html](https://web.mit.edu/Saltzer/www/publications/protection/Basic.html))

The mapping is direct. A *soft* light floor is a mechanism that "explicitly excludes" below-floor quality in principle but, on failure, *allows* it — and, as the authors say, that failure "may go unnoticed in normal use." A *hard* floor fails by refusing, which "will be quickly detected." The repo's own convention — `findUnreferencedAssets === []` fails the build on stray outputs, `orphan-sidecar` throws, the SVG gate fails closed (`spec.md` batch 1/2/8) — is fail-safe-defaults applied consistently. The light floor should not be the one exception.

### 2.4 Why the pipeline cannot decide "it's still fine" on its own

The temptation behind warn-only is: *"it's a light variant, so slightly worse is fine."* The perceptual-quality literature says the pipeline is not entitled to that judgement:

- **ITU-T P.910** (in force 07/26) is the standard for *Subjective* quality assessment — i.e. the ground truth is human opinion, gathered with a controlled protocol ([itu.int/rec/T-REC-P.910](https://www.itu.int/rec/T-REC-P.910)). **ITU-T P.800.2** governs how that opinion (MOS) may be *reported and interpreted*, and exists precisely because MOS values are not freely comparable ([itu.int/rec/T-REC-P.800.2](https://www.itu.int/rec/T-REC-P.800.2)). Subjective assessment is the reference; automated metrics are proxies.
- **Wang, Bovik, Sheikh & Simoncelli (2004), SSIM**, *IEEE TIP* 13(4):600–612, DOI [10.1109/TIP.2003.819861](https://doi.org/10.1109/TIP.2003.819861), and **Wang & Bovik (2009), "Mean squared error: Love it or leave it?"**, *IEEE Signal Processing Magazine* 26(1):98–117, DOI [10.1109/MSP.2008.930649](https://doi.org/10.1109/MSP.2008.930649), establish both that PSNR/MSE correlate poorly with perceived quality and that SSIM is itself an *approximation*, not a guarantee. The repo's own `docs/image-quality-assessment.md` §4 tabulates this (PSNR-Y SRCC ≈ 0.64, SSIM ≈ 0.76 on TID2013).

The practical consequence: an encoder **quality parameter** (AVIF Q20 …) is a *knob*, not a quality measurement. It cannot tell you whether a below-floor light variant is "still acceptable." That judgement is exactly what Tier A (human review) and Tier B (a *proxy* gate) are for. A warn-only floor pretends the build can make that call; it cannot. Therefore the build must **stop at the declared bound and escalate**.

---

## 3. Recommendation

**Adopt fail-fast for the quality floor at both tiers, and keep warn-only only for the Tier B perceptual proxy on light variants.**

1. **Quality floor → `throw` (fail-fast), naming the frame.** Implement by truncating the `encodeImage` ladder at the floor (`scripts/build-images.mjs:79-98`) and throwing when no rung ≤ budget remains. Message should name the frame, format, width, the smallest quality tried, the best achieved byte size, and the budget. Error code family: keep it distinguishable from the geometry error (`invalid-master-geometry`), e.g. `quality-floor-exceeded`.
2. **Correct `data-model.md:193`** from `warn-only` to `encodeImage throw naming frame`. This is a one-line documentation fix; it makes the data model agree with FR-012, the batch-5 clarification, `research.md` §11, and `docs/image-quality-assessment.md` §5.2. No design change.
3. **Keep Tier B light at warn-only** (`data-model.md:194`), and label it explicitly as a *proxy*, not a contract. This is the defensible reading of "degradation accepted by design": the *contract* (floor ∧ bytes) is enforced hard; the *proxy* (SSIM/PSNR) is advisory on the variant whose threshold is already relaxed by design (≥0.90). Disentangling the two rows in `data-model.md` removes the apparent contradiction.
4. **Keep warn-only where it is genuinely advisory**: the deferred LUFS measurement (`spec.md` batch 4) and the compatibility report — measurements that inform, and do not guard a published artifact.

### Rationale (why not warn-only)

- **The byte budget is already hard.** `validateImage` throws on `> MAX_LIGHT_BYTES`. A "soft floor" therefore means, operationally, *"the byte budget always wins and quality is best-effort."* That is the silent-degradation hole the floor was introduced to close — and it would close it everywhere *except* the light ladder, which is the ladder that currently descends to Q10 (`scripts/build-images.mjs:82`).
- **Warn-only contradicts FR-011, not just FR-012.** FR-011 already commits `build:images` to fail fast on "estouro de orçamento" (budget overrun). A light variant that cannot meet its budget within policy *is* a budget overrun. Warn-only would create a second, quieter rule for the same condition.
- **The light variant is published, not throwaway.** It ships under `assets/`, is counted in the total-asset budget (`budget.json`), and is served to `saveData`/degraded clients. It has no weaker claim to the contract than the standard variant.
- **The failure is the product.** When floor ∧ budget is unsatisfiable, the *frame's art is too complex for its budget* — an authoring fact the maintainer must see. Fail-fast converts it into a decision; warn-only converts it into a slowly-accumulating log line. Per Saltzer & Schroeder, the failure that "may go unnoticed in normal use" is the dangerous one.
- **The alternative is coherent, but it is not this design.** If light were genuinely best-effort, the *byte* budget would have to be soft too, and the variant would be an opportunistic extra — but that collides with Constitution Principle IV ("Orçamento de Ativos (NÃO NEGOCIÁVEL)") and with FR-011. Mixing a hard byte budget with a soft quality floor is the incoherent option; it should not be adopted by accident.

### How to make the failure actionable (so it is not *just* a red build)

Per SRE "monitor and alert," a hard failure is only useful if it points at the fix. The thrown message should state the three legitimate remedies: (a) simplify the frame's art, (b) amend `budget.json` (documented, reviewable), or (c) amend the floor (documented policy change). That keeps the human in the loop instead of either the encoder or the CI log deciding silently.

---

## 4. Why "warn-only" is not implementable as written

Taken literally, `data-model.md:193` is not even self-consistent with the code: if the light floor is soft, the ladder keeps descending *below* the floor until it either meets `MAX_LIGHT_BYTES` or exhausts and throws on bytes. So the "warn" would be emitted on the way down, and the build would still succeed *only when the byte budget was met below the floor* — i.e. the warning fires precisely on the artifacts that violate the policy, and never blocks them. In other words:

> a warn-only light floor does not weaken the quality rule a little; it removes it, and leaves only the byte rule.

The current light ladder makes this concrete — `encodeImage` tries `[lightQuality, 50, 40, 30, 20, 10]` for AVIF (`scripts/build-images.mjs:81-83`), i.e. it will happily go to Q10 to hit 150 KB. Truncating at the floor (Q20) is the entire point of the feature; making the truncation advisory leaves the Q10 escape hatch open.

---

## 5. Open questions

1. **Is the light byte budget (`MAX_LIGHT_BYTES = 150_000`) the real binding constraint?** If authored art routinely needs sub-Q20 light AVIF to fit 150 KB, the honest fix is to revisit the *byte* budget (documented), not to soften the floor. Needs measurement on the four authored frames.
2. **Interaction with the per-frame 300 KB sum.** Light variants are excluded from the per-frame value but counted in the 30 MB total (`spec.md` SC-002). Confirm the fail-fast path reports both the per-variant and the per-frame condition distinctly.
3. **Determinism / headroom.** sharp and ffmpeg output is not byte-stable across versions (noted in `scripts/build-images.mjs:184-187`). A frame that meets the budget *exactly* at the floor could flip to a failure on a toolchain bump. Consider requiring a small safety margin, or documenting that a bump may re-open the failure.
4. **Tier B light: keep warn-only, or promote to fail?** Recommend keeping warn-only (it is a proxy; §2.4), but this deserves an explicit line in the spec rather than an inherited default.
5. **Error-message contract.** FR-012 says "naming the frame." Should the throw also carry format, width, smallest quality tried, best achieved bytes, and the suggested remedies (simplify / amend budget / amend floor)? (Recommended.)
6. **The light AVIF ladder order looks suspect.** For light AVIF it starts at `lightQuality = 35` and then *ascends* to 50 before descending (`scripts/build-images.mjs:18, 82`) — an ordering that can produce *larger* files. Implementing the floor is a natural moment to fix the ladder ordering and re-baseline.

---

## Sources

**Primary (external)**
- Fowler, M. *Continuous Integration*, §"Make the Build Self-Testing" and §"Fix Broken Builds Immediately". <https://martinfowler.com/articles/continuousIntegration.html#MakeTheBuildSelf-testing> (quote: "99.9% green is still red").
- Bazel. *Extension Overview → Evaluation model*. <https://bazel.build/extending/concepts#evaluation-model> (quote: "If a file is missing or if a command fails to generate one output, the build fails.").
- Google. *Site Reliability Engineering*, Ch. 21 "Handling Overload". <https://sre.google/sre-book/handling-overload/> (degraded responses are bounded; when the degraded response is impossible, serve errors).
- Google. *Site Reliability Engineering*, Ch. 22 "Addressing Cascading Failures", §"Load Shedding and Graceful Degradation". <https://sre.google/sre-book/addressing-cascading-failures/> (quotes: "Monitor and alert when too many servers enter these modes."; "the code path you never use is the code path that (often) doesn't work."; "fail early and cheaply"; "If your RPC layer supports a fail-fast option, use it.").
- Google. *The Site Reliability Workbook*, Ch. 5 "Alerting on SLOs". <https://sre.google/workbook/alerting-on-slos/>.
- Saltzer, J. H.; Schroeder, M. D. (1975). *The Protection of Information in Computer Systems*, §I.A.3(b) "Fail-safe defaults". <https://web.mit.edu/Saltzer/www/publications/protection/Basic.html>.
- CNCF TAG Security. *Software Supply Chain Best Practices v2* (SSCBPv2.md), §"Policy enforcement", §"Protecting the Build". <https://github.com/cncf/tag-security/blob/main/community/working-groups/supply-chain-security/supply-chain-security-paper-v2/SSCBPv2.md>.
- ITU-T. Recommendation **P.910** (07/26), *Subjective video quality assessment methods for multimedia applications*. <https://www.itu.int/rec/T-REC-P.910>.
- ITU-T. Recommendation **P.800.2** (07/16), *Mean opinion score interpretation and reporting*. <https://www.itu.int/rec/T-REC-P.800.2>.
- Wang, Z.; Bovik, A. C.; Sheikh, H. R.; Simoncelli, E. P. (2004). "Image quality assessment: from error visibility to structural similarity." *IEEE TIP* 13(4):600–612. DOI [10.1109/TIP.2003.819861](https://doi.org/10.1109/TIP.2003.819861).
- Wang, Z.; Bovik, A. C. (2009). "Mean squared error: Love it or leave it? A new look at Signal Fidelity Measures." *IEEE Signal Processing Magazine* 26(1):98–117. DOI [10.1109/MSP.2008.930649](https://doi.org/10.1109/MSP.2008.930649).
- SLSA. *Specification v1.0 / v1.2 — Producing artifacts* (build process consistency). <https://slsa.dev/spec/v1.0/requirements>.

**Primary (repo)**
- `specs/003-artcraft-local-authoring/spec.md` — FR-011 (fail-fast on budget overrun), FR-012 (quality floor, both tiers, "lançar erro, nomeando o frame"), FR-007 (Tier B), clarification batches 1 and 5.
- `specs/003-artcraft-local-authoring/research.md` — §3 (Tier B), §11 (canvas and quality floors: "throws naming the frame instead of silently degrading").
- `specs/003-artcraft-local-authoring/data-model.md` — line 193 (the outlier, to be corrected), lines 192/194 (correct neighbours).
- `docs/image-quality-assessment.md` — §4 (metric correlation table), §5.2 ("Fail-fast: any variant below threshold fails `build:images`").
- `scripts/build-images.mjs` — `MAX_LIGHT_BYTES`/`MAX_STANDARD_BYTES` (11–12), `IMAGE_FORMATS` (17–21), `validateImage` (50–66), `encodeImage` ladder (79–98).
- `budget.json` — `frameBytes: 300000`, `totalAssetsBytes: 30000000`.
- `.specify/memory/constitution.md` — Principle IV (Performance e Orçamento de Ativos, NÃO NEGOCIÁVEL), Principle V (Qualidade Visual e Sonora).
