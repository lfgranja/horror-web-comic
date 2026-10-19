# Research Clarification: Measurable + Subjective Success Criteria

**Created**: 2026-10-17
**Status**: Complete
**Question**: How should a feature specification's success criteria be written when a quality gate combines an objective automated metric with a subjective human-review component? Is it acceptable for a criterion to require "fidelity measured by ffmpeg's `ssim`/`psnr` filters" and "all release gates pass via `npm run ci`", or should the criterion state the outcome and leave the tooling to the plan?

**Context**: `specs/003-artcraft-local-authoring` SC-007 mixes an automated gate (SSIM ≥ 0.95 standard / ≥ 0.90 light; PSNR ≥ 30 dB via ffmpeg `ssim`/`psnr`) with a subjective human gate (Tier A: stakeholder visual review + side-by-side notes). The requirements checklist marks "Success criteria are measurable" and "Success criteria are technology-agnostic" as satisfied, while its own Notes say SC-007 is only partially satisfied. This research resolves that conflict.

---

## 1. Direct answer

**Split each criterion into outcome and mechanism.** The standards are consistent: a success criterion must state a *verifiable outcome* — ISO/IEC/IEEE 29148:2018 characteristics **verifiable**, **unambiguous**, **singular** (Clause 5.2.5); IEEE 830-1998 **verifiability**; INVEST **Testable**; SMART **Measurable** — and it must be **implementation-free**: "The requirement states what is required, not how the requirement should be met… The objective is to be implementation-independent" [ISO/IEC/IEEE 29148, Clause 5.2.5 note; 29148-2011 PDF, nirmm.com mirror].

Applying that to SC-007's two contested phrases:

1. **"fidelity measured by ffmpeg's `ssim`/`psnr` filters"** — the **metric and threshold** (SSIM ≥ 0.95 standard / ≥ 0.90 light; PSNR ≥ 30 dB) belong in the criterion: without a defined metric and numeric threshold, "fidelity" is not verifiable and the criterion fails 29148's verifiability and INVEST's testability. The **tool** (ffmpeg's filters) is a measurement mechanism — a HOW — and belongs in the plan. Caveat: if the thresholds were calibrated against a specific implementation's output (ffmpeg's SSIM differs slightly from other implementations), the plan must record that calibration; the criterion itself stays tool-free.

2. **"all release gates pass via `npm run ci`"** — the **outcome** ("the full release gate suite passes with no regressions") belongs in the criterion; the **runner** (`npm run ci`) is project tooling — a HOW — and belongs in the plan. Naming the command also breaks if the script is renamed or the suite is invoked differently (e.g., split per CI job).

**Verdict**: the criterion should state the outcome with its measurable threshold and the subjective protocol's pass condition; the tooling (ffmpeg, `npm run ci`) goes to the plan. The checklist's "technology-agnostic" item is correct as written, and its Notes field is right that SC-007 only partially satisfies it: SC-007 is measurable but not technology-agnostic as written.

---

## 2. Practices from primary / standards / scientific sources

### 2.1 Requirements quality characteristics (what makes a criterion "good")

- **ISO/IEC/IEEE 29148:2018** (which replaces IEEE 830-1998) defines quality characteristics for individual requirements (Clause 5.2.5): *necessary, appropriate, unambiguous, complete, singular, feasible, verifiable, correct, conforming*; and for requirement sets (Clause 5.2.6): *complete, consistent, feasible, comprehensible, able to be validated* [iteh.ai preview of the standard; Extuitive, "The application of ISO 29148 to requirements in NZ", quoting 5.2.5/5.2.6].
  - **Verifiable** is the characteristic that forces a criterion to have a checkable pass condition. **Singular** is the characteristic SC-007 most risks violating: it bundles Tier A (human), Tier B (automated), the fail-fast/warn-only policy, and the Tier D exclusion into one statement.
- **29148 draws the WHAT/HOW line explicitly**: "The requirement states what is required, not how the requirement should be met… The objective is to be implementation-independent"; it further distinguishes system requirements (what the system shall do) from process requirements (how to construct the system) [29148-2011 PDF, nirmm.com mirror; construct retained in 2018].
- **IEEE 830-1998** (predecessor) lists eight SRS quality characteristics: correctness, unambiguity, completeness, consistency, ranking for importance/stability, verifiability, modifiability, traceability — and warns that an unverifiable requirement makes correctness "a matter of opinion, not objective analysis" [IEEE Std 830-1998 PDF; JAMA Software summary].
- **INVEST** (Bill Wake, 2003): a user story must be **Testable** — "writing a story implies you understand it well enough to write a test for it"; acceptance criteria "should focus on observable business outcomes rather than implementation detail" [Agile Alliance glossary; Wikipedia, INVEST (mnemonic)].
- **SMART** (Wake, 2003, for tasks): Specific, **Measurable**, Achievable, Relevant, Time-boxed [Agile Alliance glossary].

### 2.2 Making the objective component measurable

- A full-reference metric with a defined reference and a numeric threshold is the textbook-verifiable criterion: the pass condition is a computation, not a judgment. SSIM is a defined, published metric (Wang, Bovik, Sheikh & Simoncelli, 2004, *IEEE Transactions on Image Processing* 13(4):600–612, DOI 10.1109/TIP.2003.819861); ffmpeg implements it as the built-in `ssim` filter, with `psnr` alongside it [ffmpeg filters documentation, §ssim / §psnr].
- The repo's own research already establishes the correct comparison geometry (variant at width W vs. master re-rendered at W, because SSIM is scale-dependent) and the correct role of PSNR (floor / regression detector, not a quality claim — Huynh-Thu & Ghanbari, 2008, *Electronics Letters* 44(13):800) [`docs/image-quality-assessment.md` §3].

### 2.3 Making the subjective component rigorous (and honest about its limits)

- **ITU-T P.800.2 (2016)** is the authoritative statement on the limits of subjective scores: "it is not meaningful to directly compare MOS values produced from separate experiments, unless those experiments were explicitly designed to be compared, and even then the data should be statistically analysed to ensure that such a comparison is valid" [P.800.2 PDF, ITU]. P.800.1 adds that comparing MOS across application scenarios "is considered invalid" [P.800.1].
- **Streijl, Winkler & Hands (2016)** document the mechanism — range-equalization bias: "viewers in different labs had quite differing opinions about the absolute quality range of the sequences; for example, a clip with an average rating of 30 in one lab might score 60 in another" [Multimedia Systems 22(2):213–227].
- **ITU-T P.910** standardizes the protocol when subjective assessment *is* done: 4–40 subjects, "at least 15 observers", non-experts not involved in picture-quality work, defined scales (ACR: 5 Excellent … 1 Bad; DCR: 5 Imperceptible … 1 Very annoying), controlled or at least reported environment [P.910 (04/2008) §7.1/§7.3; P.910 (10/2023): ≥15 after rejection for SAMVIQ].
- **Implication for a small team**: a 1–2 person stakeholder review cannot support a statistical quality claim. P.910 permits fewer subjects only for *pilot studies*, which "must be clearly labelled as being pilot studies". The defensible criterion is therefore a **documented protocol with a binary recorded decision** — who reviewed, when, against what reference, what was recorded, approve/reject — not a numeric score to be compared across sessions. This is exactly the shape of the repo's Tier A (sidecar `review` block with `reviewer`, `reviewedAt`, `notes`, `decision: approve`), and it aligns with P.800.2's minimum reporting requirements.

### 2.4 The two components answer different questions

- The repo's own analysis separates **master quality** (subjective — there is no reference for "good art") from **delivery fidelity** (objective — the master is the reference) [`docs/image-quality-assessment.md` §1]. A combined criterion is legitimate only if each component's pass condition is separately defined and checkable; otherwise the criterion is not *singular* (29148) and not cleanly verifiable.

---

## 3. Recommendation

Rewrite SC-007 as outcome-level criteria with measurable thresholds and a defined subjective pass condition, and move all tooling to the plan / FRs. Proposed shape:

- **SC-007 (Tier A — human gate)**: "Every integrated master has a documented side-by-side visual review — reviewer identity, date, reference compared (previous master or synthetic fixture), and qualitative notes covering size, format, palette/tonal range — recorded in the repository, with a recorded `approve` decision. The review is a screening gate, not a statistical quality claim (labelled as a pilot/triage review per ITU-T P.910)."
- **SC-008 (Tier B — automated gate)**: "Every generated standard variant achieves SSIM ≥ 0.95 (light variants ≥ 0.90, warn-only) and PSNR ≥ 30 dB against the lossless master rendered at the same delivery width; achieved values are reported per frame when the byte budget forces the encoder down the quality ladder. Synthetic fixtures are excluded from the perceptual gate."
- **Move to FR/plan**: measurement via ffmpeg's built-in `ssim`/`psnr` filters (no new dependency; ffmpeg already a preflight requirement); reference construction; enforcement point (`scripts/build-images.mjs`); the release-gate suite and its runner (`npm run ci`).

**Rationale**:

1. **Verifiability is preserved** — each criterion has a checkable pass condition (29148 "verifiable"; INVEST "Testable").
2. **Technology-agnosticism is restored** — no tool or command names in criteria (29148 "implementation-free"); the plan remains free to swap the measurement library or the CI command without touching the spec.
3. **The subjective component is honest** — a documented protocol with a binary decision, explicitly not a cross-session-comparable score (P.800.2; Streijl et al. 2016; P.910 pilot labeling).
4. **Singularity** — one outcome per criterion (29148 "singular").
5. **The checklist conflict resolves** — "Success criteria are measurable" ✓ (numeric thresholds + recorded decision); "technology-agnostic" ✓ after the rewrite. The Notes field's "partially satisfied" was accurate for the current SC-007.

**Practical caveat**: if the SSIM/PSNR thresholds were calibrated on ffmpeg's specific filter output, record in the plan ("thresholds calibrated against ffmpeg `ssim`") and treat a future tool change as a plan-level change requiring re-validation — the criterion itself stays tool-free.

---

## 4. Open questions

1. **Calibration dependency**: were the 0.95 / 0.90 / 30 dB thresholds calibrated on ffmpeg's `ssim`/`psnr` output? If yes, should the plan state the calibration explicitly, or is the threshold stable enough across SSIM implementations to ignore?
2. **Tier A labeling**: should the criterion explicitly call the stakeholder review a "pilot/triage review (per ITU-T P.910 pilot-study provisions)" to prevent it being read as a statistical quality claim?
3. **Release-gate naming**: is `npm run ci` stable enough as a project contract that naming it in SC-003/SC-007 is harmless pragmatism, or should all SCs be rewritten outcome-only? (SC-003 has the same pattern.)
4. **PSNR floor value**: is 30 dB the right catastrophic-failure floor for this pipeline, or should it be re-derived from a baseline measurement of the current encoder settings?
5. **Singularity vs. traceability**: if Tier A and Tier B are split into separate SCs, how should the plan keep them traceable to the single FR-007 gate?

---

## Sources

- ISO/IEC/IEEE 29148:2018, *Systems and software engineering — Life cycle processes — Requirements engineering*, Clause 5.2.5/5.2.6 (requirement characteristics) — https://cdn.standards.iteh.ai/sist-preview/720895/62bb2ea1ef8b4f33a80d984f826267c1/ISO-IEC-IEEE-29148-2018.pdf (preview); characteristics quoted in http://www.extuitive.co.uk/papers/iso29148NzRequirements.pdf
- ISO/IEC/IEEE 29148:2011 (same construct; "what, not how" / implementation-independent) — https://nirmt.com/storage/uploads/E-BOOK_BE-INDUSTRIAL-AND-SAFETY/29148-2011%20-%20ISOIECIEEE%20International%20Standard%20-%20Systems%20and%20software%20engineering%20--%20Life%20cycle%20processes%20--Requirements.pdf
- IEEE Std 830-1998, *Recommended Practice for Software Requirements Specifications* (eight quality characteristics; verifiability) — https://seng.cankaya.edu.tr/wp-content/uploads/sites/53/2024/09/IEEE-SRS-830-1998.pdf
- ITU-T P.800.2 (2016), *Mean opinion score interpretation and reporting* (non-comparability of MOS across experiments) — https://www.itu.int/rec/dologin_pub.asp?lang=e&id=T-REC-P.800.2-201607-I%21%21PDF-E&type=items
- ITU-T P.800.1 (2016), *Mean opinion score (MOS) terminology* (cross-scenario comparison invalid) — https://www.itu.int/epublications/en/publication/itu-t-p-800-1-2016-07-mean-opinion-score-mos-terminology
- ITU-T P.910 (04/2008), *Subjective video quality assessment methods for multimedia applications* (§7.1 ACR scale; §7.3 Viewers: 4–40 subjects, ≥15, non-expert) — https://www.itu.int/rec/dologin_pub.asp?lang=e&id=T-REC-P.910-200804-S%21%21PDF-E&type=items
- ITU-T P.910 (10/2023) (≥15 subjects after rejection for SAMVIQ) — https://www.itu.int/epublications/zh/publication/itu-t-p-910-2023-10-subjective-video-quality-assessment-methods-for-multimedia-applications/en
- Streijl, R. C.; Winkler, S.; Hands, D. S. (2016). "Mean opinion score (MOS) revisited: Methods and applications, limitations and alternatives." *Multimedia Systems* 22(2), 213–227 — https://stefan.winklerbros.net/Publications/mmsj2016.pdf
- Wake, B. (2003). "INVEST in Good Stories, and SMART Tasks." xp123.com; summarized in Agile Alliance glossary — https://agilealliance.org/glossary/invest
- Wikipedia, "INVEST (mnemonic)" (acceptance criteria → observable business outcomes) — https://en.wikipedia.org/wiki/INVEST_(mnemonic)
- FFmpeg filters documentation, `ssim` / `psnr` — https://ffmpeg.org/ffmpeg-filters.html#ssim ; https://ffmpeg.org/ffmpeg-filters.html#psnr
- Wang, Z.; Bovik, A. C.; Sheikh, H. R.; Simoncelli, E. P. (2004). "Image quality assessment: from error visibility to structural similarity." *IEEE TIP* 13(4):600–612. DOI 10.1109/TIP.2003.819861 (cited via `docs/image-quality-assessment.md` §3)
- Huynh-Thu, Q. & Ghanbari, M. (2008). "Scope of validity of PSNR in image/video quality assessment." *Electronics Letters* 44(13):800 (cited via `docs/image-quality-assessment.md` §3)
