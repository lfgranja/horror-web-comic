# Clarification: Provenance-Sidecar Placement — `media-src/` only, or also `marketing/`?

**Feature**: `specs/003-artcraft-local-authoring` (FR-008 sidecar / FR-013(e) enforcement split)
**Created**: 2026-10-17
**Status**: Research-backed clarification. Resolves the contradiction between `spec.md:45` and `spec.md:173` (FR-008).

---

## 1. Direct Answer

**The rule should be stated per *asset root*, not as a single global directory: a sidecar lives *next to the asset it describes* (extension-swap, same basename, same directory) and *outside the publishable tree* — never inside `src/`, `assets/`, or `dist/`.**

Under that rule, `marketing/` **is** a legal sidecar location: it is asset-adjacent and it is outside the publishable tree. `media-src/` is not privileged by the sidecar *pattern*; it is privileged only because it is the one root where a **verifier currently runs**. So the two questions the spec conflates must be answered separately:

| Question | Answer |
|---|---|
| **Placement** (where may a sidecar live?) | Next to its asset, in any declared asset root, outside the publishable tree → `media-src/**` **and** `marketing/**` are both legal. |
| **Verification** (which sidecars are checked?) | Only those under a root the verifier scans. Today that is `media-src/frames\|audio` only. |

**Recommendation: generalize FR-008's placement rule to "asset-adjacent, outside the publishable tree", and either (a) extend the existing sidecar verifier to a second declared provenance root `marketing/`, or (b) if that scope expansion is rejected, forbid `marketing/` sidecars outright and delete the `marketing/` clause from `spec.md:45`.** What is **not** acceptable is the status quo — advertising a `marketing/` sidecar that no gate ever reads (Option C below), because the project's own batch-6 research already rejected exactly that posture ("attestations without enforcement are theater"). See §4 for the recommended option.

**Why the literal FR-008 wording is over-restrictive:** its own stated rationale is *"nunca `src/`/`assets/`"* — keep sidecars out of the publishable tree so they cannot ship. `marketing/` satisfies that rationale: it is **not** in `PUBLISHABLE_ROOTS` (`['src', 'assets']`, `scripts/build.mjs:16`), **not** in `PUBLISHABLE_ROOT_FILES`, **not** copied by `copyPublishableFiles` (`scripts/build.mjs:650-665`), and **not** scanned by `findUnreferencedAssets` (`scripts/build.mjs:479-483`). A `marketing/*.json` cannot leak into `dist/`. The phrase *"apenas em `media-src/`"* is therefore a stronger claim than its justification supports; the invariant it wants is "asset-adjacent and outside the publishable tree".

---

## 2. The Contradiction, Precisely

- **`spec.md:173` (FR-008, authoritative functional requirement):** *"Colocação apenas em `media-src/` (nunca `src/`/`assets/`) — enforcement de colocação independente do nome."*
- **`spec.md:45` (batch-2 "Promotional art location & handling" clarification):** *"Provenance via commit trailer (`Authored-With: designcraft-cli <version>`) + optional sidecar digest in `marketing/` (never `assets/`), per FR-008."*

Both cite FR-008, and they disagree: FR-008 says "only `media-src/`", line 45 says "also `marketing/`". Line 45 also explicitly says the sidecar is *"per FR-008"*, so it is not asserting an independent rule — it is mis-citing FR-008. One of the two must change.

This is not a cosmetic wording issue. FR-013(e) defines the enforcement surface as commits touching `media-src/`, and FR-008 defines the orphan gate over `media-src/`. A `marketing/` sidecar that line 45 invites would therefore be **invisible to every gate**: not digest-checked, not orphan-checked, and (unlike a stray `.json` in `src/`) not even caught by the publishable-tree checks — because `marketing/` is scanned by nothing.

---

## 3. What Artifact/Provenance Practice Recommends for Out-of-Band Assets

Two families of practice exist. The project already uses the first.

### 3.1 Asset-adjacent sidecars (the dominant convention) — placement follows the asset, not the pipeline

The prevailing convention for machine-readable metadata about a non-embeddable or not-to-be-modified asset is **a companion file with the same basename in the same directory**. The location is derived from the asset, and the convention is **root-agnostic** — it does not care whether the asset is a build input or an out-of-band promotional file.

- **C2PA / Content Credentials (the provenance standard this feature already cites).** The manifest store may be embedded in the asset **or** stored *"in a **sidecar file**, which is a file with the same file name as the asset but with a `.c2pa` extension"*; the SDK looks in the same directory as the asset. The C2PA specification's **External Manifests** section formalizes the non-embedded storage case. Sidecar storage exists precisely because some assets **cannot** carry embedded metadata — the same reason `marketing/` promotional art (already exported, possibly not re-encodable) would need one. C2PA does not restrict sidecars to "build inputs"; it binds them to the asset by hash wherever the asset lives. — <https://opensource.contentauthenticity.org/docs/manifest/understanding-manifest/> · <https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html> (External Manifests)
- **XMP sidecars (Adobe / ISO 16684-1).** The `.xmp` sidecar carries metadata for formats that must not be modified (RAW), *"next to the photo — same name, `.xmp` extension"*. Again root-agnostic and asset-adjacent. — Adobe XMP sidecar convention (ISO 16684-1); e.g. <https://support.captureone.com/hc/en-us/articles/360002544898>
- **REUSE Specification 3.3 (FSFE, for licence/copyright provenance).** For *Uncommentable Files*, the information *"MUST be in an adjacent text file of the same name with the additional extension `.license` (example: `cat.jpg.license`)"* — i.e. **same basename, same directory**, for exactly the assets that cannot hold the metadata inline. This is the closest structural analogue to the project's extension-swap rule. — <https://reuse.software/spec-3.3/>
- **OAIS / PREMIS (preservation metadata).** Preservation Description Information is grouped into **Reference, Provenance, Context, and Fixity** categories — fixity being the checksum/signature that proves the object *"has not been altered in an undocumented manner"*. PREMIS attaches this to the **Object** entity; the metadata is object-centric and travels with the object, independent of whether the object is an input to some downstream process. — <https://www.dpworkshop.org/dpm-eng/foundation/metadata/index.html> · PREMIS Data Dictionary <https://www.loc.gov/standards/premis/v2/premis-dd-2-0.pdf>

**Takeaway:** in every one of these, "where does the metadata go?" is answered by "next to the asset", never by "only where the build runs". A project rule that says "sidecars exist only in the build-input root" is *narrower than every comparable standard*.

### 3.2 Separately-stored attestations bound by digest — and the enforcement precondition

The supply-chain family (which FR-008's "SLSA Build L1-analogous" framing borrows from) stores provenance **separately** from the artifact and binds it by digest:

- **SLSA Provenance.** The artifact is identified by `subject` (with `digest.sha256`), and provenance is an in-toto attestation **about** that artifact; SLSA models the artifact and its provenance as distinct objects and does **not** mandate co-location. — <https://slsa.dev/spec/v1.2/build-provenance>
- **SLSA Verifying Artifacts.** Provenance that is *produced* but never *verified* provides no guarantee — the consumer **MUST** verify it downstream. — <https://slsa.dev/spec/v1.2/verifying-artifacts>
- **W3C PROV-DM.** A **Bundle** is *"a named set of provenance descriptions, and is itself an entity, so allowing provenance of provenance to be expressed"* — provenance may be grouped and stored independently of the described entity. — <https://www.w3.org/TR/prov-dm/>

**Takeaway:** neither family requires a sidecar to sit in the build pipeline. What both require is that the provenance be **verifiable by someone**. A sidecar that no tool ever reads is not provenance; it is documentation that *looks* like provenance.

### 3.3 The "theater" precondition (already accepted by this spec)

The spec's own batch-6 clarification rejects unenforced provenance: *"Generating attestations without enforcing them is theater"* (Arbure). — <https://arbure.com/slsa-provenance-hard-gate.html>

Applied here: **if `marketing/` sidecars are allowed, a verifier must cover `marketing/`; otherwise do not allow them.** This is the decisive constraint that turns the placement question into a coverage question.

---

## 4. Options with Tradeoffs

All three options fix the contradiction; they differ in what they cost and what they preserve.

### Option A — `media-src/` only (FR-008 literal)

Delete the `marketing/` sidecar clause from `spec.md:45`; promotional-art provenance is carried by the commit trailer (`Authored-With: designcraft-cli <version>`) alone.

| Dimension | Assessment |
|---|---|
| **Gate coverage** | Clean. Every sidecar the spec admits is covered by `scripts/sidecar.mjs` via `build-images.mjs`. No unverified artifact class is created. |
| **Orphan detection** | Clean. The bidirectional sidecar↔master integrity gate (FR-008, batch 8) has exactly one root. |
| **Tooling scope** | Zero change. `build.mjs` still never touches `media-src/`; `build-images.mjs` still reads only `media-src/frames\|audio`; `marketing/` stays untouched by every script. |
| **Consistency** | Lowest. Diverges from C2PA/XMP/REUSE, which would put the metadata next to the promotional art. Loses the byte digest for the one asset class most likely to be redistributed externally (social/OG/press). |
| **Cost** | One-line spec edit. |

### Option B — asset-adjacent, multi-root, **verified** (recommended)

Generalize FR-008's placement rule to "asset-adjacent, outside the publishable tree" and enumerate the legal provenance roots (`media-src/`, `marketing/`). Add a **cheap** verifier for `marketing/` — parse JSON + schema + recompute `sha256` + orphan check (sidecar ↔ promotional asset). It needs **no** encoding, sanitization, Tier B, or budget logic, because `marketing/` art is never rasterized, encoded, or published. Best home is the fail-closed CI step (`scripts/ci-trailers.mjs`, FR-013(e)), which already reads git history rather than the media pipeline — so `build-images.mjs` keeps its scope and the offline/tarball build is unaffected. The CI step's trigger set widens from "commits touching `media-src/`" to "commits touching `media-src/` **or** `marketing/`".

| Dimension | Assessment |
|---|---|
| **Gate coverage** | Full and symmetric. Both roots have a digest + orphan verifier; no write-only sidecar class. Satisfies the "theater" precondition. |
| **Orphan detection** | Symmetric: a `marketing/` sidecar with no matching asset is a CI failure, mirroring the existing `media-src/` rule and `findUnreferencedAssets === []`. |
| **Tooling scope** | Modest, contained expansion. One shared validator (same `scripts/sidecar.mjs` schema logic) invoked over a second root from the CI step; the media pipeline is untouched. |
| **Consistency** | Highest. One placement rule ("next to the asset, outside the publishable tree"), one naming convention (extension-swap, already root-agnostic in FR-008), one schema, applied uniformly. Matches C2PA/XMP/REUSE/PREMIS. |
| **Cost** | ~a shared validator call + a root list + a CI trigger glob. Marketing art gains a hash-bound provenance record, which matters because it is the most externally-distributed asset. |

### Option C — asset-adjacent, multi-root, **unverified** (`spec.md:45` as written)

Leave FR-008 as "only `media-src/`" and leave line 45 inviting a `marketing/` sidecar that no gate reads.

| Dimension | Assessment |
|---|---|
| **Gate coverage** | None for `marketing/`. Digest and orphan are never checked. |
| **Orphan detection** | None for `marketing/`; a stale sidecar survives silently. |
| **Tooling scope** | Zero — which is the problem, not the benefit. |
| **Consistency** | Contradicts FR-008 and the project's own "no theater" principle. |
| **Cost** | None now; a provenance artifact that can silently drift and that readers will assume is verified. **Not recommended.** |

---

## 5. Recommendation

**Adopt Option B.** Concretely:

1. **Restate FR-008's placement rule as a property, not a directory:** *"a sidecar is honored only when it is asset-adjacent (extension-swap, same basename, same directory as its subject) and located in a declared provenance root; it is never valid under `src/`, `assets/`, or `dist/`."*
2. **Enumerate the declared provenance roots** as `media-src/frames`, `media-src/audio`, and `marketing/`. Placement enforcement remains name-independent, as FR-008 already requires.
3. **Extend the verifier to `marketing/`** with the digest + orphan checks only (no encoding/sanitization/Tier-B), invoked from the fail-closed CI step (`scripts/ci-trailers.mjs`), and widen that step's trigger set to commits touching `marketing/`. Keep `build-images.mjs` scoped to `media-src/`.
4. **Update `spec.md:45`** so its "per FR-008" reference resolves to the generalized rule rather than to "only `media-src/`".

**If the feature must freeze scope** (FR-003 "output contract unchanged" + the Non-Goals), the defensible fallback is **Option A** — but it must be an explicit choice, and the `marketing/` sidecar clause in `spec.md:45` must then be **deleted** (promotional-art provenance = commit trailer only). **Option C is rejected** on the project's own stated grounds.

**Decision tie-breaker:** the only real question is whether a byte digest bound to the promotional art is worth a ~one-function verifier. Practice says yes (that art is the most likely to leave the repo and the least likely to be re-derivable); scope discipline says maybe not. Either way, the current wording cannot stand, because it promises a `marketing/` sidecar while no gate can see one.

---

## 6. Open Questions (for planning)

1. **CI trigger for `marketing/`.** Should commits touching `marketing/` also require `Authored-With`/`Reviewed-By` trailers, or only a verifiable sidecar when one is present? (Trailer enforcement is currently keyed to `media-src/`.) Recommendation: require the sidecar only *when present* (digest + orphan, fail-fast), and treat trailers as recommended-not-required for `marketing/`, to avoid coupling promotional-art commits to the master-integration ceremony.
2. **Single validator, two roots.** Ensure `scripts/sidecar.mjs` is the single source of the schema/validation logic and is called once per declared root, rather than forking a marketing-specific validator (mirrors the `light-variants.js` "one definition of the convention" principle).
3. **`marketing/` and `findUnreferencedAssets`.** `marketing/` is not scanned by the publishable-tree gates, so no change is needed there — but the generalized rule should be documented alongside the `media-src/`/`assets/` separation so a future contributor does not "helpfully" add `marketing/` to `PUBLISHABLE_ROOTS`.
4. **Promotional-art subdirectories.** If `marketing/` grows subdirectories (e.g. `marketing/social/`, `marketing/press/`), does the declared-root rule apply recursively? Recommendation: yes — recurse, because the placement invariant ("asset-adjacent, outside the publishable tree") is recursive by nature.
5. **OG/social image that must ship in `dist/`.** `spec.md:45` already flags this: if a promotional image ever ships, it needs an explicit documented copy step in `build.mjs` (not via `assets/`). If that happens, the asset moves out of "out-of-band" and into the publishable tree — at which point its sidecar placement must be revisited (it is no longer asset-adjacent-and-outside-the-tree). Out of scope for this feature, but note the interaction.

---

## Sources

**Provenance / content-authenticity standards:**
- C2PA / Content Authenticity Initiative, "Understanding manifests" — manifest store embedded **or** sidecar (`foo.c2pa`, same name, same directory); external/remote manifests — https://opensource.contentauthenticity.org/docs/manifest/understanding-manifest/
- C2PA Technical Specification v2.4, "External Manifests" — https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html
- W3C, PROV-DM (The PROV Data Model) — `prov:Bundle` = "a named set of provenance descriptions, and is itself an entity" — https://www.w3.org/TR/prov-dm/
- W3C, PROV-O: The PROV Ontology — https://www.w3.org/TR/prov-o/

**Supply-chain provenance (separate storage, digest binding, verification):**
- SLSA v1.2, "Build: Provenance" — artifact identified by `subject.digest`; provenance is a distinct attestation — https://slsa.dev/spec/v1.2/build-provenance
- SLSA v1.2, "Verifying Artifacts" — provenance **MUST** be verified downstream — https://slsa.dev/spec/v1.2/verifying-artifacts
- Arbure, "SLSA Was On, and It Still Shipped Malware" — "Generating attestations without enforcing them is theater" — https://arbure.com/slsa-provenance-hard-gate.html

**Preservation metadata (object-centric fixity + provenance):**
- Digital Preservation Management (Cornell), "Preservation Metadata" — OAIS PDI: Reference, Provenance, Context, **Fixity** — https://www.dpworkshop.org/dpm-eng/foundation/metadata/index.html
- PREMIS Data Dictionary for Preservation Metadata v2 — Object/Event/Agent; fixity check — https://www.loc.gov/standards/premis/v2/premis-dd-2-0.pdf
- PREMIS activity home — https://www.loc.gov/standards/premis/

**Adjacent-sidecar conventions for non-embeddable assets:**
- REUSE Specification 3.3 (FSFE) — adjacent `<file>.license` for Uncommentable Files — https://reuse.software/spec-3.3/
- XMP sidecar convention (Adobe / ISO 16684-1) — same basename, `.xmp`, next to the asset — e.g. https://support.captureone.com/hc/en-us/articles/360002544898
- Wikipedia, "Sidecar file" — definition (metadata a format cannot carry) — https://en.wikipedia.org/wiki/Sidecar_file

**Project sources:**
- `specs/003-artcraft-local-authoring/spec.md:45` — batch-2 "Promotional art location & handling" (invites a `marketing/` sidecar, "per FR-008")
- `specs/003-artcraft-local-authoring/spec.md:173` — FR-008 ("Colocação apenas em `media-src/`")
- `specs/003-artcraft-local-authoring/spec.md:174` — FR-013(e) (CI step scope: commits touching `media-src/`; orphan sidecar → fail)
- `specs/003-artcraft-local-authoring/spec.md:80` — batch 8 (bidirectional sidecar↔master referential integrity)
- `specs/003-artcraft-local-authoring/spec.md:71` — batch 6 ("attestations without enforcement are theater")
- `scripts/build.mjs:16` — `PUBLISHABLE_ROOTS = ['src', 'assets']`
- `scripts/build.mjs:479-483` — `findUnreferencedAssets` (scans `assets/` only)
- `scripts/build.mjs:650-665` — `copyPublishableFiles` (copies `index.html`, `src/data/**`, manifest-referenced `assets/**`; never `marketing/`)
- `scripts/build-images.mjs:177` — `SOURCE_ROOTS = { frames: 'media-src/frames', audio: 'media-src/audio' }`
- `scripts/build-images.mjs:188-202` — `discoverSources` (reads only `media-src/frames|audio`)
- git `012c7a7` "fix(media): separate the master source tree from the publishable tree (#11)" — the separation rationale FR-008's `media-src/` clause inherits
