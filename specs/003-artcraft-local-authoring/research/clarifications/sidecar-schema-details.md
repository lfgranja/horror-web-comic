# Clarifications: Sidecar Schema Details

**Created**: 2026-10-17
**Source**: Research into JSON Schema 2020-12 `required` semantics, C2PA 2.4 §18.28 `humanOversightLevel`, and provenance standards.

---

## (a) `inputs[].uri` and `inputs[].digest` — required vs. optional

### Direct answer

**The schema is correct; `data-model.md` lines 67–68 are wrong.**

The `inputs` array as a whole is optional (it is absent from the root `required` list at `sidecar.schema.json:8`). But when an `inputs[]` item is present, **both `uri` and `digest` are required** — enforced by `"required": ["uri", "digest"]` at `sidecar.schema.json:68`.

### Key findings

1. **JSON Schema 2020-12 `required` semantics** are unambiguous: "An object instance is valid against this keyword if every item in the array is the name of a property in the instance." ([JSON Schema Validation §6.5.3](https://json-schema.org/draft/2020-12/json-schema-validation#section-6.5.3)). The `required` keyword mandates presence, independent of `properties`.

2. **The schema is the authoritative source.** `data-model.md:60` explicitly states: "fonte de autoridade: `contracts/sidecar.schema.json`". The data model's "Required" column on lines 67–68 contradicts the authoritative schema.

3. **The pattern is consistent with the rest of the schema.** `subject.name` and `subject.digest.sha256` are also required within their objects (`sidecar.schema.json:17,26`). The `inputs[]` items follow the same pattern: the array is optional, but items are strict.

### Options

| Option | Description | Tradeoffs |
|:---|:---|:---|
| **A (recommended)** | Fix `data-model.md` lines 67–68 to mark `uri` and `digest` as **required** (within item). Keep schema unchanged. | Aligns docs with authoritative schema. No code change. |
| B | Change schema to make `uri`/`digest` optional within items. | Weakens integrity: an input with a URI but no digest (or vice versa) is useless for provenance. Inconsistent with the strict-rest-of-schema pattern. |

### Recommendation

**Option A.** Update `data-model.md:67-68` to mark both fields as "required (within item)". The schema is correct as-is.

---

## (b) Sidecar naming collision — two masters sharing a stem

### Direct answer

**The spec should explicitly forbid two masters with the same stem (different extensions) in the same directory.** This is a fail-fast error, symmetric with the existing orphan-sidecar rule.

### Key findings

1. **Extension-swap is unambiguous only when stems are unique.** `frame-01.svg` → `frame-01.json` and `frame-01.png` → `frame-01.json` produce the same sidecar path. The `subject.name` field (`sidecar.schema.json:21`) must equal the master basename — but two masters with the same stem would require two different `subject.name` values pointing to the same sidecar file, which is contradictory.

2. **The spec already implies unique stems.** `data-model.md:56` says "One sidecar per master, regardless of format" — this is only coherent if each stem maps to at most one master. The orphan-sidecar rule (`data-model.md:87`) already enforces bidirectional referential integrity (sidecar ↔ master); a stem collision is the inverse ambiguity (two masters → one sidecar).

3. **Precedent in the codebase.** The project's `findUnreferencedAssets === []` invariant (`build.mjs`) and the `isSafeLocalReference` rule both fail-fast on ambiguity. A stem collision should follow the same pattern.

### Options

| Option | Description | Tradeoffs |
|:---|:---|:---|
| **A (recommended)** | **Fail-fast on stem collision** — if two masters in the same directory share a stem (e.g. `frame-01.svg` + `frame-01.png`), `build-images.mjs` throws `invalid-master-stem-collision`. | Simple, unambiguous, consistent with project's fail-fast philosophy. Forces authors to choose one format per frame. |
| B | Change naming to double-extension (`frame-01.svg.json`, `frame-01.png.json`). | Breaks the "extension-swap" convention; `discoverSources` exclusion logic becomes more complex; `subject.name` still needs disambiguation. |
| C | Allow multiple masters per stem; sidecar references one via `subject.name`. | Ambiguous: which master does the sidecar describe? Digest verification becomes non-deterministic. Violates "one sidecar per master". |

### Recommendation

**Option A.** Add an explicit rule to `data-model.md` and the spec: two masters with the same stem in the same directory is a fail-fast error (`invalid-master-stem-collision`). This is the only option that preserves the "one sidecar per master" invariant without ambiguity.

---

## (c) `review.oversight` reusing C2PA `humanOversightLevel` for human-authored content

### Direct answer

**Reusing C2PA's `humanOversightLevel` enum values for human-authored (non-AI) content is semantically inappropriate.** The project should define its own oversight vocabulary.

### Key findings

1. **C2PA 2.4 §18.28 defines `humanOversightLevel` exclusively for AI-generated content.** The C2PA specification introduces the `c2pa.ai-disclosure` assertion with `humanOversightLevel` values `fully_autonomous`, `prompt_guided`, `human_validated` — but these are explicitly scoped to AI disclosure. ([C2PA Specification 2.4 §18.28](https://c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_ai_disclosure))

2. **The C2PA values have AI-specific semantics that contradict human-authored content:**
   - `fully_autonomous` — "Pure AI generation, no human review" ([C2PA 2.4 §18.28.2 table](https://c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_ai_disclosure))
   - `prompt_guided` — "AI generation guided by human prompts — moderate human involvement"
   - `human_validated` — "AI edits applied and reviewed/approved by a human editor prior to release"

   For a human-authored master with no AI involvement, `fully_autonomous` means the *opposite* of what the project intends (it asserts "no human review"), and `prompt_guided`/`human_validated` both imply AI generation.

3. **C2PA's own spec distinguishes AI from non-AI content.** The `digitalSourceType` field in §18.28.2 has a value `trainedAlgorithmicMedia` (AI) vs. "not applicable" (no trained model invoked). The oversight enum is only meaningful for the AI case.

4. **The project already acknowledges this tension.** `data-model.md:71` says the vocabulary is "project-defined; reuses C2PA 2.4 §18.28 enum values". But "project-defined" and "reuses C2PA enum values" are contradictory — if the values are C2PA's, they carry C2PA's semantics.

5. **Provenance standards recommend controlled vocabularies appropriate to the domain.** The [C2PA Guidance for AI/ML](https://c2pa.org/specifications/specifications/2.4/ai-ml/ai_ml.html) and the [C2PA Explainer](https://c2pa.org/specifications/specifications/2.2/explainer/Explainer.html) both emphasize that provenance data should be meaningful and not misleading. Using AI-specific enum values for non-AI content is misleading.

### Options

| Option | Description | Tradeoffs |
|:---|:---|:---|
| **A (recommended)** | **Define a project-specific oversight vocabulary** for human-authored content, e.g. `human_authored`, `human_assisted`, `human_reviewed`. Document that these are independent of C2PA. | Semantically correct. Clear to future readers. Loses "C2PA alignment" — but the project isn't using C2PA assertions anyway. |
| B | Keep C2PA enum values but add a explicit note that they are reinterpreted for human-authored content (e.g., `human_validated` means "human reviewed and approved" not "AI edits reviewed"). | Preserves C2PA value alignment. But the reinterpretation is confusing and contradicts C2PA's own definitions. Future C2PA validators would misread the values. |
| C | Remove `oversight` entirely; rely on `decision: approve/reject` + `reviewer` + `notes`. | Simplest. Loses the "degree of human involvement" signal, but that signal is meaningless for purely human-authored content. |

### Recommendation

**Option A.** Define a project-specific oversight vocabulary that is meaningful for human-authored content. The current reuse of C2PA's AI-specific enum values is semantically incorrect and could mislead future consumers of the provenance data. If C2PA alignment is desired later, the project can add a `c2pa.ai-disclosure` assertion with the correct `humanOversightLevel` value (`not applicable` / omit) — but that is out of scope for this feature.

---

## (d) Should the normative FR state explicitly that no C2PA assertion is introduced?

### Direct answer

**Yes.** The normative FR-008 should explicitly state: "No C2PA assertion, claim, or manifest is introduced."

### Key findings

1. **The spec already discusses C2PA in clarifications** (batch 6, `spec.md:70`): "C2PA 2.4 defines levels of human oversight ... but only for AI-generated content ... the `review.oversight` block remains project-defined for human-authored masters and intentionally reuses the enum values of C2PA." But this is in a clarification note, not in the normative FR.

2. **FR-008 currently says** (`spec.md:173`): "sidecar JSON opcional em `media-src/` ... nenhum campo no manifesto (schema v1 congelado)". It does not mention C2PA at all.

3. **Explicit negation prevents future confusion.** Without an explicit statement, a future contributor might assume C2PA is in scope and attempt to add C2PA assertions. The project's own clarification (batch 6) had to correct a previous misstatement about C2PA — this shows the confusion is real.

4. **Precedent in the spec.** FR-004 already explicitly states "Nenhum binário da suíte ArtCraft deve ser adicionado ao repositório" — explicit negation is the project's pattern for scope boundaries.

### Options

| Option | Description | Tradeoffs |
|:---|:---|:---|
| **A (recommended)** | Add to FR-008: "No C2PA assertion, claim, or manifest is introduced. The `review.oversight` vocabulary is project-defined and independent of C2PA." | Clear scope boundary. Prevents future confusion. No code change. |
| B | Leave as-is; rely on clarification notes. | Clarifications are non-normative. Future readers may miss the distinction. |

### Recommendation

**Option A.** Add an explicit negation to FR-008. This is a one-line addition that prevents a class of future scope confusion.

---

## Summary

| Question | Recommendation | Action needed |
|:---|:---|:---|
| (a) `inputs[].uri`/`digest` required? | Schema is correct; fix `data-model.md:67-68` | Doc fix only |
| (b) Stem collision | Fail-fast on same-stem masters | Add rule to `data-model.md` + spec |
| (c) C2PA enum reuse | Define project-specific oversight vocabulary | Schema + spec change |
| (d) Explicit no-C2PA statement | Add to FR-008 | Spec change (one line) |

---

## References

- JSON Schema Validation §6.5.3 `required`: https://json-schema.org/draft/2020-12/json-schema-validation#section-6.5.3
- JSON Schema Core §4.3.1 (keywords): https://json-schema.org/draft/2020-12/json-schema-core#section-4.3.1
- C2PA Specification 2.4 §18.28 AI Disclosure: https://c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_ai_disclosure
- C2PA Specification 2.4 §18.28.2 (digitalSourceType / humanOversightLevel table): https://c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html#_ai_disclosure
- C2PA Guidance for AI/ML: https://c2pa.org/specifications/specifications/2.4/ai-ml/ai_ml.html
- C2PA Explainer: https://c2pa.org/specifications/specifications/2.2/explainer/Explainer.html
- Project spec: `specs/003-artcraft-local-authoring/spec.md`
- Project data model: `specs/003-artcraft-local-authoring/data-model.md`
- Project schema: `specs/003-artcraft-local-authoring/contracts/sidecar.schema.json`
