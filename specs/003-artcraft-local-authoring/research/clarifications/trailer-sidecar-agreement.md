# Research: Trailer ↔ Sidecar Agreement Semantics

**Context:** FR-008 / spec.md:46 — "quando trailer e sidecar coexistem, devem concordar"
(when both a commit trailer `Authored-With: vectorcraft-cli 0.12.0` and a provenance
sidecar `provenance.tool` = `vectorcraft-cli`, `provenance.toolVersion` = `0.12.0` are
present, they must agree). This document defines what "agree" means.

---

## 1. Direct Answer / Recommendation

**Tool identity:** Compare as **exact, case-sensitive string equality** after
minimal syntactic normalization (strip leading/trailing whitespace, collapse internal
whitespace runs to a single space). No aliasing, no case-folding, no Unicode
normalization beyond NFC.

**Version:** Compare as **exact string equality** after minimal syntactic
normalization (strip leading/trailing whitespace, strip a single leading `v` prefix,
collapse internal whitespace). Do **not** apply SemVer precedence, version ranges,
or "any newer version" semantics. The version is an opaque label identifying the
exact tool release that produced the artifact.

**When they disagree:** Reject the commit. A mismatch between trailer and sidecar
indicates tampering, tooling bug, or misconfiguration — the same class of failure
the agreement requirement exists to catch.

---

## 2. Key Findings with Citations

### 2.1 SLSA Build Provenance (v1.2)

- **Builder identity** is a `TypeURI` (e.g. `https://github.com/slsa-framework/slsa-github-generator`).
  The spec states: *"This is intended to be the sole determiner of the SLSA Build
  level"* ([SLSA v1.2 Build Provenance](https://slsa.dev/spec/v1.2/build-provenance)).
- **Builder version** is a `map (string→string)` of component names to versions:
  *"Map of names of components of the build platform to their version."*
  The spec explicitly scopes this to debugging/incident response, not verification.
- **Verification guidance** ([SLSA v1.2 Verifying Artifacts](https://slsa.dev/spec/v1.2/verifying-artifacts)):
  *"Consumers MUST accept only specific signer-builder pairs."* The `builder.id` is
  the trust anchor; the `version` map is informational.
- **No normalization or comparison semantics** are prescribed for version values.
  They are treated as opaque strings.
- **No aliasing** is mentioned — builder identity is a single URI, not a set of
  aliases.

### 2.2 in-toto Attestation Framework (v1)

- **Predicate identity** is a `predicateType` URI that *"includes the major version
  number and will always change whenever there is a backwards incompatible change"*
  ([in-toto Attestation Spec](https://github.com/in-toto/attestation/blob/main/spec/v1/README.md)).
- **TypeURIs** are case-sensitive URIs. No normalization is prescribed.
- **Monotonic principle** governs extension fields: *"A policy is considered
  monotonic if ignoring an attestation, or a field within an attestation, will never
  turn a DENY decision into an ALLOW."* This means a mismatch should always be a
  DENY, never silently ignored.
- **No tool-name aliasing** or version-comparison semantics are defined.

### 2.3 SPDX (v2.3 / v3.0)

- **SPDX v2.3** uses `creator` (Tool: `name-version`) and `createdUsing`:
  *"If the SPDX document was created using a software tool, indicate the name and
  version for that tool"* ([SPDX v2.3 Document Creation](https://spdx.github.io/spdx-spec/v2.3/document-creation-information/)).
- **SPDX v3.0** replaces with `createdBy` and `createdUsing` properties, but still
  treats tool name and version as opaque strings.
- **No normalization, aliasing, or version-range semantics** are specified.
  The spec says *"indicate the name and version"* — a statement of fact, not a
  comparison rule.

### 2.4 C2PA Content Credentials (v2.4)

- **Claim generator info** has a required `name` field and optional `version` field:
  *"Each object shall contain at least the name field and may optionally contain a
  version field"* ([C2PA 2.4 Spec](https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html)).
- **Trust model** is based on **signer identity** (the credential used to sign the
  claim), not on tool name matching. The spec explicitly states: *"C2PA
  specifications SHOULD NOT provide value judgments about whether a given set of
  provenance data is 'good' or 'bad,' merely whether the assertions included within
  can be validated as associated with the underlying asset, correctly formed, and
  free from tampering."*
- **`specVersion`** (the C2PA spec version used) is a declaration by the claim
  generator, not a comparison target. Validators check compatibility, not equality.
- **No tool-name normalization or version-range comparison** is prescribed.

### 2.5 W3C PROV-O

- **`wasAssociatedWith`** associates an `Activity` with an `Agent`. Agents are
  identified by URIs, not by name strings ([W3C PROV-O](https://www.w3.org/TR/prov-o/)).
- **No version comparison semantics** for agents. The ontology allows `prov:hadRole`
  and other qualifiers but does not define version agreement.

### 2.6 Semantic Versioning (SemVer 2.0.0)

- **SemVer** defines version **precedence** for ordering, not **equality** for
  identity ([SemVer 2.0.0](https://semver.org/)). The spec says: *"Once a versioned
  package has been released, the contents of that version MUST NOT be modified."*
- **No "compatible version" concept** exists in SemVer itself. Compatibility ranges
  (e.g. `^1.2.3`) are a packaging-ecosystem convention (npm, Cargo), not a SemVer
  rule. Using ranges for provenance agreement would introduce ecosystem-specific
  ambiguity.

### 2.7 Git Trailer Conventions

- Git trailers (e.g. `Co-Authored-By:`, `Signed-By:`) are **key-value pairs** with
  no prescribed normalization or comparison semantics. The git format-patch
  documentation treats them as opaque text.
- Research on AI co-authorship trailers ([Detecting AI Coding Agents in Open Source,
  arXiv:2606.24429](https://arxiv.org/html/2606.24429v1)) shows that trailer-based
  attribution is already fragile; strict exact matching is the norm in practice.

---

## 3. Options with Tradeoffs

### Option A: Exact string equality (after minimal syntactic normalization)

| Aspect | Detail |
|--------|--------|
| **Tool name** | `vectorcraft-cli` ≡ `vectorcraft-cli` only. Case-sensitive. No aliasing. |
| **Version** | `0.12.0` ≡ `0.12.0` only. Strip leading `v` and surrounding whitespace. |
| **Pros** | Unambiguous, auditable, matches the "tamper-evident" goal. No false negatives from cosmetic differences (whitespace). |
| **Cons** | Fragile to cosmetic changes (e.g. `VectorCraft-CLI` ≠ `vectorcraft-cli`). |
| **Standards alignment** | Matches SLSA (opaque TypeURI), C2PA (opaque name), in-toto (opaque predicateType). |

### Option B: Normalized comparison (case-fold, Unicode NFC, whitespace collapse)

| Aspect | Detail |
|--------|--------|
| **Tool name** | `VectorCraft-CLI` ≡ `vectorcraft-cli` after case-folding + NFC. |
| **Version** | `v0.12.0` ≡ `0.12.0` ≡ `0.12.0 ` after stripping `v` + whitespace. |
| **Pros** | More forgiving of cosmetic variation. Reduces false negatives from unrelated formatting changes. |
| **Cons** | Case-folding can merge genuinely different tools (e.g. `Git` vs `git` could be different products). Unicode normalization is non-obvious and can surprise users. |
| **Standards alignment** | No standard prescribes this. SLSA TypeURIs are case-sensitive URIs (case-folding would be wrong for URIs). |

### Option C: Tool-name aliasing (configurable equivalence classes)

| Aspect | Detail |
|--------|--------|
| **Tool name** | `vc-cli` ≡ `vectorcraft-cli` via a configured alias table. |
| **Pros** | Handles known tool renames and abbreviations. |
| **Cons** | Introduces a trusted configuration surface that itself must be secured. Aliases can be stale or wrong. No standard supports this. |
| **Standards alignment** | None. All standards treat tool identity as a single opaque string/URI. |

### Option D: SemVer range / "any newer version"

| Aspect | Detail |
|--------|--------|
| **Version** | `0.12.1` ≡ `0.12.0` (same major). `1.0.0` ≢ `0.12.0` (different major). |
| **Pros** | Allows patch/minor updates without invalidating provenance. |
| **Cons** | Fundamentally breaks the security model: the trailer/sidecar is supposed to identify *what produced the artifact*, not *what could have produced it*. A newer version may have different behavior, different bugs, different security properties. SemVer precedence is not defined for non-numeric or non-SemVer version strings. |
| **Standards alignment** | None. SLSA, C2PA, in-toto, SPDX all treat version as an opaque label. |

---

## 4. Recommendation

**Adopt Option A (exact string equality after minimal syntactic normalization).**

Specifically:

1. **Tool name:** Compare as case-sensitive, exact string equality. Strip
   leading/trailing whitespace and collapse internal whitespace runs to a single
   space. Do **not** case-fold, do **not** apply Unicode normalization, do **not**
   alias.

2. **Version:** Compare as exact string equality. Strip leading/trailing
   whitespace and a single leading `v` prefix (to handle `v0.12.0` vs `0.12.0`).
   Do **not** apply SemVer precedence, version ranges, or "newer than" logic.

3. **Disagreement handling:** Reject the commit with a clear error message
   indicating which values mismatched. Do not warn-and-continue.

**Rationale:**

- All major provenance standards (SLSA, in-toto, SPDX, C2PA, W3C PROV) treat tool
  identity and version as **opaque identifiers**, not as values to be semantically
  compared. The agreement requirement is a **tamper-evidence check**, not a
  **compatibility check**.
- Version ranges (Option D) would weaken the guarantee: if `0.12.0` and `0.13.0`
  produce different artifacts, accepting them as "agreeing" defeats the purpose of
  recording the version.
- Aliasing (Option C) introduces a mutable trusted configuration surface that is
  itself a supply-chain risk.
- Normalization beyond whitespace (Option B) can merge genuinely different tools
  and is not prescribed by any standard.

---

## 5. Implementation Notes

```python
def normalize_tool_name(name: str) -> str:
    """Strip surrounding whitespace and collapse internal whitespace runs."""
    return " ".join(name.split())

def normalize_version(version: str) -> str:
    """Strip whitespace and a single leading 'v' prefix."""
    v = version.strip()
    if v.startswith("v") and len(v) > 1 and v[1].isdigit():
        v = v[1:]
    return v

def trailer_sidecar_agree(
    trailer_tool: str, trailer_version: str,
    sidecar_tool: str, sidecar_version: str
) -> bool:
    return (
        normalize_tool_name(trailer_tool) == normalize_tool_name(sidecar_tool)
        and normalize_version(trailer_version) == normalize_version(sidecar_version)
    )
```

---

## 6. References

| Standard / Source | URL |
|-------------------|-----|
| SLSA v1.2 Build Provenance | https://slsa.dev/spec/v1.2/build-provenance |
| SLSA v1.2 Verifying Artifacts | https://slsa.dev/spec/v1.2/verifying-artifacts |
| in-toto Attestation Spec v1 | https://github.com/in-toto/attestation/blob/main/spec/v1/README.md |
| SPDX v2.3 Document Creation | https://spdx.github.io/spdx-spec/v2.3/document-creation-information/ |
| C2PA 2.4 Technical Specification | https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html |
| W3C PROV-O | https://www.w3.org/TR/prov-o/ |
| SemVer 2.0.0 | https://semver.org/ |
| in-toto: Providing farm-to-table guarantees (USENIX Sec 2019) | https://www.usenix.org/system/files/sec19-torres-arias.pdf |
| Detecting AI Coding Agents in Open Source (arXiv:2606.24429) | https://arxiv.org/html/2606.24429v1 |

---

*Research date: 2026-10-17. Standards consulted: SLSA v1.2, in-toto v1, SPDX v2.3/v3.0, C2PA v2.4, W3C PROV-O, SemVer 2.0.0.*
