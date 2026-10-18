# Research: Adoção Local de Ferramentas ArtCraft para Autoria de Ativos

**Created**: 2026-10-17
**Status**: Complete — all NEEDS CLARIFICATION resolved by spec clarification sessions (batches 1–10). Batch 9–10 clarifications (SVG reference rule, light quality floor, srcset fillable widths, measurable/subjective success criteria) are backed by primary-source research in `research/clarifications/`.

---

## 1. Decision: SVG Sanitization Approach

**Decision**: Hybrid posture — reject-list floor **plus** an allow-list over the minimal SVG vocabulary that `vectorcraft` emits (fail-closed). Reject-list as minimum baseline: `<script>`, `on*` handlers, `foreignObject`, external `href`/`xlink:href`, CSS vectors (`url()`, `@import`, `image-set()`, `expression()`, `-moz-binding`, `behavior:`), all `data:` URIs in URL-valued attributes, SMIL animation elements mutating `href`/`xlink:href` (`animate`, `set`, `animateMotion`, `animateTransform`, `discard`), dangerous elements DOMPurify forbids (`iframe`, `object`, `embed`, `base`, `meta`, `link`, `form`, `template`, `noscript`, `style`, `handler`, `listener`), `xml:base`, `externalResourcesRequired`, processing instructions, XInclude, all DOCTYPE (XXE/billion-laughs), DoS caps (file size, element count, nesting depth). Prefer rejecting `<style>` element and `style` attribute entirely for authored masters. Internal `url(#…)` refs remain allowed. **DoS caps (measurable, batch 8)**: ver constante `SVG_DOS_CAPS` em `scripts/svg-sanitize.mjs` — violation → throw. A byte cap alone is insufficient (billion-laughs explodes from <1 KB).

**Rationale**: Sharp rasterizes SVG but is **not** a sanitizer — it protects the encoder, not the build host from SSRF/XXE. The reject-list is the floor; the allow-list is the fail-closed guarantee. Since vectorcraft emits a known minimal vocabulary, the allow-list is tractable. No new dependency: sanitization is implemented as a hand-rolled fail-closed tokenizer over the SVG text (a real parser/tokenizer is required; regex-only scanning is explicitly rejected due to mXSS/parser disagreement), applied before `sourceWidth()`/`encodeImage()`. librsvg/sharp remain rasterization backstops only.

**Alternatives considered**:
- *DOMPurify (npm)*: rejected — adds a dependency to `package.json` (violates "sem dependências novas"); DOMPurify targets HTML/DOM, not standalone SVG files.
- *svg-sanitizer (npm)*: rejected — same dependency concern.
- *librsvg hardening flags*: insufficient — librsvg does not sanitize; it rasterizes. Dangerous content still reaches the host.
- *Allow-list only* (no reject-list): rejected — too restrictive for photocraft PNG/JPG masters (gate applies only to SVG, but the *vocabulary* constraint is vectorcraft-specific; allow-list-only would need to be format-aware and adds complexity for no gain over hybrid).

**Placement**: `scripts/build-images.mjs`, before `sourceWidth()`/`encodeImage()` (build-images.mjs: sourceWidth L68, encodeImage L79, ensureImage L100). Sharp `failOn: 'error'` + `limitInputPixels` remain backstops.

---

## 2. Decision: Sidecar Schema and Naming

**Decision**: Extension-swap naming — sidecar path = master path with extension replaced by `.json` (e.g. `media-src/frames/frame-01.svg` → `media-src/frames/frame-01.json`). Schema (strict, reject unknown fields; fonte de autoridade: `contracts/sidecar.schema.json`):

```json
{
  "schemaVersion": "string (required)",
  "subject": {
    "name": "master basename (required)",
    "digest": { "sha256": "<64-hex-lowercase> (required)" }
  },
  "provenance": {
    "tool": "string (required)",
    "toolVersion": "string (required)",
    "timestamp": "ISO-8601 UTC (required)",
    "author": "string (required)"
  },
  "inputs": [{ "uri": "string (safe local reference)", "digest": { "sha256": "..." } }],
  "review": {
    "reviewer": "string (required within block)",
    "reviewedAt": "ISO-8601 UTC (required)",
    "oversight": "human_authored | human_assisted | human_reviewed (required)",
    "notes": "string (required)",
    "decision": "approve | reject (required)",
    "measuredSSIM": "number (optional)"
  }
}
```

Validation (fail-fast): parse must succeed; required fields present with correct types; `sha256` is 64 lowercase hex; timestamp parses as ISO-8601 UTC; recompute SHA-256 of master bytes and compare to `subject.digest.sha256` (mismatch → throw); `subject.name` must match master basename (stale → throw); each `inputs[].uri` must satisfy `isSafeLocalReference`; `review` block validated when present (absent allowed); reject unknown fields; **orphan sidecar** (no corresponding master in `media-src/`) → throw (`orphan-sidecar`; bidirectional referential integrity, symmetric with `findUnreferencedAssets === []`; ver FR-008/FR-013). No-op when sidecar absent.

**Rationale**: Stem-matches-master-stem is the simplest lookup; `discoverSources` already excludes by stem. Extension-swap is format-agnostic (one sidecar per master regardless of svg/png/jpg). Sidecar lives **only** in `media-src/` — a `.json` under `src/data/` would be published by `copyPublishableFiles`; under `assets/` it fails `findUnreferencedAssets`.

**Alternatives considered**:
- *Manifest fields*: rejected — schema v1 frozen (FR-003/FR-009).
- *Separate provenance directory* (e.g. `media-src/.sidecars/`): rejected — breaks the "same basename" invariant, harder lookup, and `discoverSources` would need to filter it out.
- *C2PA assertions*: rejected for build; the C2PA `humanOversightLevel` vocabulary (fully_autonomous/prompt_guided/human_validated, §18.28, AI-generated content only) was considered and then substituted by project-defined values (human_authored/human_assisted/human_reviewed) for human-authored masters, to avoid misreading AI-disclosure semantics; no full C2PA ceremony (SLSA Build L1-analogous at most).

---

## 3. Decision: Tier B Delivery-Fidelity Gate

**Decision**: ffmpeg native `ssim` + `psnr` filters (no `ms_ssim` — ffmpeg does not have it; no libvmaf; no new dependency). Reference = **lossless PNG of the master rendered at each delivery width** (variant at width W compared to master re-scaled to W, never to native-size master — SSIM is scale-dependent). Thresholds: **SSIM ≥ 0.95** (standard) / **≥ 0.90** (light, intentional degradation accepted); **PSNR ≥ 30 dB** floor (catastrophic failure). (Centralizados em `scripts/delivery-fidelity.mjs`; ver plano.) **Fail-fast for standard variants; warn-only for `-light-*`**. When byte budget forces quality down, report achieved SSIM/PSNR per frame. Tier D (synthetic fixtures) gets no perceptual gate. Tier C (SSIMULACRA 2/LPIPS) is offline maintainer aid, not CI gate.

**Rationale**: ffmpeg is already required by preflight; `ssim`/`psnr` filters are built-in. SSIM at delivery width is the correct comparison (the variant is a re-encode of the master at that width). PSNR ≥ 30 dB is a floor, not a target — it catches catastrophic encoder failure. Light variants are degraded by design (lower quality floor), so warn-only.

**Alternatives considered**:
- *libvmaf*: rejected — new dependency, and ffmpeg preflight does not guarantee libvmaf.
- *SSIMULACRA 2 / LPIPS*: rejected for CI — Python/Torch dependency; offline aid only.
- *Perceptual hash (pHash)*: rejected — less accurate than SSIM for delivery fidelity.
- *Comparison against native-size master*: incorrect — SSIM is scale-dependent; must compare per-width.

---

## 4. Decision: Tier A Human Review Gate

**Decision**: Two-part enforcement — (1) **sidecar `review` block** (optional in schema, validated when present, `reviewer` + `reviewedAt` + `oversight` + `notes` + `decision: approve` required); (2) **commit trailer** `Reviewed-By: <name>`. Both required for any master-integration commit touching `media-src/`, enforced **fail-closed in a new CI step** (`fetch-depth: 0`), **never** in `npm run ci` (preserves offline/tarball). Self-review acceptable (solo maintainer); second reviewer encouraged but not mandatory. `oversight` vocabulary is **project-defined for human-authored masters** (`human_authored`/`human_assisted`/`human_reviewed`); the C2PA 2.4 `humanOversightLevel` enum (`fully_autonomous`/`prompt_guided`/`human_validated`, §18.28) applies only to AI-generated content and was deliberately NOT reused, to avoid misreading AI-disclosure semantics. No SLSA/in-toto ceremony is introduced.

**Rationale**: The sidecar is effectively mandatory for commits touching `media-src/` but remains optional for isolated builds (offline/tarball). The CI step is the enforcement point. C2PA vocabulary reuse provides standard alignment without imposing AI-specific ceremony.

**Alternatives considered**:
- *Enforcement in `npm run ci`*: rejected — breaks offline/tarball/shallow-clone execution.
- *Separate PR template*: rejected — not enforceable, easy to bypass.
- *Blockchain/in-toto ceremony*: rejected — overkill for local authoring; SLSA Build L1-analogous is the alignment target.

---

## 5. Decision: Atomic Writes and Tier B Scratch Location

**Decision**: All generated variants (image/audio + Tier B reference PNG) written **atomically** — write to temp file in the **same directory** as target, then `rename()` (same filesystem → atomic, no `EXDEV`). Tier B reference PNG and all temp files live under **`build/`** (git-ignored root scratch directory), never in `assets/`, `dist/`, or `src/`. Temp files for atomic writes live in the same directory as the target (not `os.tmpdir()` — tmpfs may be a different filesystem).

**Rationale**: POSIX `rename()` is atomic only within the same filesystem. `os.tmpdir()` may be tmpfs. `assets/` must contain only manifest-referenced files (enforced by `findUnreferencedAssets === []` in `tests/unit/media-generation.test.js:194-198`, which runs before `build:images`). `dist/` is wiped at start of `copyPublishableFiles`. `build/` is git-ignored and not validated.

**Alternatives considered**:
- *Direct overwrite*: produces truncated files on interruption.
- *Temp in `os.tmpdir()`*: `EXDEV` on tmpfs → rename fails.
- *Temp in `assets/`*: breaks `findUnreferencedAssets` invariant.

---

## 6. Decision: ArtCraft Version Policy

**Decision**: Two-tier, docs-only. (1) **No minimum/recommended version enforced in CI or preflight** — ArtCraft is local-only; enforcing would couple CI to an uninstalled binary (violates FR-004/SC-005). (2) Document a **"tested-with" version** in `docs/authoring.md` (seeded from validated inventory, e.g. `vectorcraft 0.12.0`), updated when newer validated. Drift handled by **recording, not blocking**: trailer/CI script validates trailer *syntax* and *presence* on commits touching `media-src/`, accepts any newer version; when both trailer and sidecar present they must agree. Reproducibility protected by sidecar digest (bytes) + Tier B delivery-fidelity.

**Rationale**: SLSA does not cover local authoring steps; at most SLSA Build L1-analogous ("documented process"). Exact pinning reserved for byte-reproducible media outputs only.

**Alternatives considered**:
- *Pin ArtCraft version in preflight*: rejected — CI does not have the binary; would fail SC-005.
- *Block on version drift*: rejected — treats a signal as a blocker; discourages updates.

---

## 7. Decision: Audio Authoring Scope

**Decision**: Audio masters remain **WAV from any stable DAW**; authoring is tool-agnostic. ArtCraft `soundcraft` is **pre-alpha** (incomplete buffer selection/MIDI/interchange) and is **not** a production dependency for this feature; may be reconsidered once stable. Audio pipeline (ffmpeg → AAC/Opus) and bitrates unchanged. Loudness normalization and WCAG 1.2.1 transcripts are **recommended enhancements deferred to planning** — documented authoring target: **−14 to −16 LUFS integrated, true peak ≤ −1 dBTP**, normalized with ffmpeg `loudnorm` (two-pass) at authoring time. Pipeline does not add a hard LUFS gate (brittle on short clips); may measure and report (warn), hard-fails only on true-peak exceedance/clipping.

**Rationale**: EBU R128/ITU-R BS.1770 broadcast −23 LUFS inappropriate for web; streaming norms are −14/−16 (Spotify −14, Apple Music −16). WCAG 1.2.1 targets *information* conveyed by audio — ambient/background music and non-informational SFX do not require transcripts; compliance via WCAG 1.1.1 (short text alternative, already required) + WCAG 1.4.2 (audio control, already in AudioManager).

**Alternatives considered**:
- *Adopt soundcraft*: rejected — pre-alpha, incomplete.
- *Add LUFS gate in build*: rejected — brittle on short clips; hard-fail only on true-peak/clipping.

---

## 8. Decision: Promotional Art Location

**Decision**: Promotional art (designcraft) lives in top-level **`marketing/`** directory (alternatively `docs/marketing/`), **outside** both `assets/` (publishable runtime tree) and `media-src/frames|audio` (master input roots). Not picked up by `build:images`/`build`/`validate`; not manifest-referenced; not counted in `budget.json`. Authored/exported already-optimized (final delivery dimensions); not routed through sharp/esbuild; no AVIF/WebP/JPEG srcset or `-light-*` variant. Provenance via commit trailer (`Authored-With: designcraft-cli <version>`) + optional sidecar digest in `marketing/`. Licensing: MIT option; preserve copyright/license notice; never redistribute ArtCraft marks (nominative use only); verify bundled-asset licenses (`ASSETS.md`) before publishing.

**Rationale**: Keeps promotional art out of the runtime pipeline entirely. `build/` scratch and `assets/` are validated trees; `marketing/` is neither.

---

## 9. Decision: Generated Variant Cleanup

**Decision**: **No generator-side auto-cleaning**. `build:images` keeps its incremental `isFresh`/`ensureImage`/`ensureAudio` skips and the existing validation gate `findUnreferencedAssets === []` stays in force. If explicit cleanup is wanted, it must be a separate documented step (e.g. `npm run clean:assets`), not part of `build:images`.

**Rationale**: Preserves "output contract unchanged" (FR-003) and reproducibility. Manifest drift should surface as a hard error, not be silently erased.

---

## 10. Decision: Commit Trailer Enforcement Interval

**Decision**: **Forward-only** — commits touching `media-src/` from this feature's merge onward; pre-existing commits **grandfathered** (the only commit touching `media-src/` is a squash without trailers; shallow clone/rebase-merge destroy trailers). Sidecar digest: **fail-fast on mismatch, no-op when absent**.

**Rationale**: Backward enforcement is impossible (pre-existing commits lack trailers; shallow clones cannot see full history). Forward-only is the enforceable interval.

---

## 11. Decision: Canvas and Quality Floors

**Decision**: Authoring canvas for frames is **1200×800 px (3:2)** — the declared manifest geometry and the largest delivered width. Masters with larger side >1200 px are **rejected by the build** (fail-fast, error code `invalid-master-geometry`). The ≤2560 px limit (FR-002) remains the rigid ceiling for **any** master. Explicit quality floors: ver constante `QUALITY_FLOORS` em `scripts/build-images.mjs` (standard e light). `build-images.mjs` **throws naming the frame** instead of silently degrading.

**Rationale**: (a) manifest geometry is frozen and `validateImageAsset` already fails on base-file geometry divergence; (b) per-frame budget (~300 KB) does not accommodate detailed art above ~1200 px (simulated detailed art ≈ 952 KB at 1200 px, ≈ 4.3 MB at 2560 px); (c) pixels above the largest delivered width generate no delivery benefit but real encoder entropy and build time.

---

## 12. Decision: End State — All 4 Frames Authored

**Decision**: **All 4 frames** (frame-01…frame-04) authored in this feature; the mixed synthetic+authored state **must not** be published. SC-001 was the minimum, not the target; Constitution Principle V requires art "coherent in style, resolution, and palette". Tier A review includes documented **palette/tonal-range** verification per master (human documented review, not a new automated gate).

---

## Sources

- `.specify/assessments/artcraft-horror-comic-reform/` — intake, research, problem, concept, decision (verdict: go, Option B)
- `.specify/memory/constitution.md` — Principles I–VI (v2.0.0)
- `specs/003-artcraft-local-authoring/spec.md` — clarification batches 1–7 (all research-backed)
- `docs/delivery.md` — delivery standards, toolchain, budgets
- `docs/authoring-accessibility.md` — F20 staleness rule, alt/description/durationMs, WCAG 1.1.1/1.2.1/1.4.2
- `docs/image-quality-assessment.md` — author + maintainer second pair of eyes
- `budget.json` — hard limits (initial scene 1.5 MB, frame 300 KB, total 30 MB, compressed code 65 KB)
- `scripts/build-images.mjs` — `sourceWidth` (L68), `encodeImage` (L79), `ensureImage` (L100), `discoverSources` (L188), `buildImages` (L213)
- `scripts/build.mjs` — `isSafeLocalReference` (L134), `findUnreferencedAssets`, `copyPublishableFiles` (L652 dist wipe)
- `src/scripts/story-loader.js` — `isSafeLocalReference` (L39), `validateStory` (L161)
- `tests/unit/media-generation.test.js:194-198` — `findUnreferencedAssets === []` enforcement
- C2PA Specification 2.4 §18.28 — `c2pa.ai-disclosure` / `humanOversightLevel` (AI-generated content only)
- ffmpeg `ssim` / `psnr` / `loudnorm` filter docs
- `research/clarifications/` — batch 9–10 primary-source research (SVG reference rule; light quality floor; srcset unreachable widths; measurable vs subjective success criteria)
