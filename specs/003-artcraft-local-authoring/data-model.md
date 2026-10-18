# Data Model: Adoção Local de Ferramentas ArtCraft para Autoria de Ativos

**Created**: 2026-10-17
**Source**: `spec.md` — Key Entities & Data Models, FR-002/FR-007/FR-008/FR-012/FR-013

This feature introduces **no runtime schema changes** (manifest schema v1 is frozen). The entities below describe the **authoring-time** data: the masters produced by ArtCraft, the provenance sidecars that track them, and the build-time gates that validate them. All new data lives in `media-src/` (sidecars) and `build/` (Tier B scratch, git-ignored) — never in `assets/` or `src/`.

---

## Entity: AuthoredMaster

A master file in `media-src/frames/` or `media-src/audio/` produced by an ArtCraft app (or any valid tool). The **format and constraints** determine validity — not an allowlist of apps.

| Field | Type | Constraints | Source |
|:---|:---|:---|:---|
| `path` | string | Under `media-src/frames/` or `media-src/audio/` | filesystem |
| `format` | enum | `svg` \| `png` \| `jpg` (frames); `wav` (audio) | `path` extension |
| `tool` | string (optional) | Free-form tool name (e.g. `vectorcraft-cli 0.12.0`); absent when provenance unknown | sidecar / commit trailer |
| `toolVersion` | string | e.g. `0.12.0` | sidecar / commit trailer |
| `dimensions` | object | `{ width, height }` (frames, px); duration (audio, seconds) | `sourceWidth()` / `probeAudio()` |
| `budgetCompliant` | boolean | ≤ 2560 px larger side (any master); ≤ 1200 px larger side (authoring target); ≤ 300 000 B per-frame (sum of largest AVIF+WebP+JPEG); ≤ 30 000 000 B total | `budget.json` |

### Validation Rules

- **Geometry**: **Authored masters**: larger side > 1200 px → `invalid-master-geometry` throw (fail-fast). **Rigid pipeline ceiling for any master (including fixtures/test masters)**: larger side > 2560 px → `invalid-master-geometry` throw (FR-002). The 2560 px ceiling is therefore the guard for fixture/test masters, while authored masters already fail-fast at 1200 px. No upscaling (`withoutEnlargement: true`).
- **Format**: frames accept `svg|png|jpg`; audio accepts `wav`. No other formats.
- **SVG content**: must pass sanitization gate (reject-list floor + allow-list over vectorcraft vocabulary) before rasterization. Internal `url(#…)` allowed. **DoS caps (measurable)**: ver constante `SVG_DOS_CAPS` em `scripts/svg-sanitize.mjs` — violation → throw.
- **References**: manifest/sidecar references use `isSafeLocalReference` (a file-path rule; it rejects `#`). SVG URL attributes (`href`, `xlink:href`, `url(...)`) have a **separate** rule: allow fragment-only `#…`; reject absolute, protocol-relative, relative-path, and `data:`.
- **Audio**: WAV, any stable DAW. `soundcraft` (pre-alpha) is **not** a production dependency.

### State Transitions

```text
[authored in ArtCraft app]
        │
        ▼
[exported to media-src/frames|audio/]  ──►  (optional) sidecar .json written
        │
        ▼
[build-images.mjs gates]
        ├─ (a) SVG sanitization  ──► PASS → continue | FAIL → throw (fail-fast)
        ├─ (b) sidecar digest    ──► PASS → continue | MISMATCH → throw | ABSENT → no-op
        └─ (c) Tier B fidelity   ──► standard: <0.95 SSIM → throw | light: <0.90 → warn
        │
        ▼
[sharp/ffmpeg re-encode] ──► AVIF/WebP/JPEG + srcset (frames) | AAC/Opus (audio)
        │
        ▼
[assets/] ──► published via build.mjs (only manifest-referenced files)
```

---

## Entity: ProvenanceSidecar (optional, in `media-src/`, extension-swap naming)

JSON sidecar tracking the provenance of a master. Path = master path with extension replaced by `.json` (e.g. `media-src/frames/frame-01.svg` → `media-src/frames/frame-01.json`). One sidecar per master, regardless of format.

| Field | Type | Required | Constraints |
|:---|:---|:---:|:---|
| `schemaVersion` | string | ✅ | — (fonte de autoridade: `contracts/sidecar.schema.json`) |
| `subject.name` | string | ✅ | Must equal master basename (stale → throw) |
| `subject.digest.sha256` | string | ✅ | 64 lowercase hex; must match SHA-256 of master bytes (recomputed) |
| `provenance.tool` | string | ✅ | e.g. `vectorcraft-cli` |
| `provenance.toolVersion` | string | ✅ | e.g. `0.12.0` |
| `provenance.timestamp` | string | ✅ | ISO-8601 UTC |
| `provenance.author` | string | ✅ | — |
| `inputs[].uri` | string | optional | Must satisfy `isSafeLocalReference` (no external/absolute/traversal) |
| `inputs[].digest.sha256` | string | optional | 64 lowercase hex |
| `review.reviewer` | string | within block | Required when `review` present |
| `review.reviewedAt` | string | within block | ISO-8601 UTC |
| `review.oversight` | enum | within block | `fully_autonomous` \| `prompt_guided` \| `human_validated` (project-defined; reuses C2PA 2.4 §18.28 enum values) |
| `review.notes` | string | within block | Side-by-side: size, format, qualitative impression |
| `review.decision` | enum | within block | `approve` \| `reject` |
| `review.measuredSSIM` | number | optional | Tier B fidelity measurement (SSIM value; PSNR reported separately when available) |

### Validation Rules (fail-fast)

- Invalid JSON → throw.
- Required fields present with correct types.
- `sha256` = 64 lowercase hex.
- Timestamp parses as ISO-8601 UTC.
- Recompute SHA-256 of master bytes and compare to `subject.digest.sha256` → mismatch → throw.
- `subject.name` must equal master basename → stale → throw.
- Each `inputs[].uri` must satisfy `isSafeLocalReference` → violation → throw.
- `review` block validated when present (types/enum/ISO-8601); absent allowed.
- **Reject unknown fields** (strict).
- **Orphan sidecar** (sidecar without a corresponding master in `media-src/`) → throw (`orphan-sidecar`); referential integrity is **bidirectional** (sidecar↔master), symmetric with `findUnreferencedAssets === []` (ver FR-008/FR-013).
- **No-op when sidecar absent** (build remains functional without it; enforcement is in CI).

### State Transitions

```text
[master exported to media-src/]
        │
        ▼
[sidecar .json written]  ──►  schemaVersion + subject + provenance (+ optional inputs, review)
        │
        ▼
[build-images.mjs: digest verification]
        ├─ ABSENT → no-op (build continues)
        ├─ PRESENT + digest match → continue
        ├─ PRESENT + digest mismatch → throw (fail-fast)
        └─ ORPHAN (sidecar with no master) → throw (fail-fast)
        │
        ▼
[CI step: fetch-depth 0, forward-only]
        ├─ master-integration commit touching media-src/
        │     ├─ sidecar present + review.decision=approve + Authored-With + Reviewed-By → PASS
        │     ├─ orphan sidecar (no master) → FAIL
        │     └─ any missing → FAIL (fail-closed)
        └─ pre-existing commits → grandfathered
```

---

## Entity: AuthoringWorkflow

The ordered, documented process for producing a master. Lives in `docs/authoring.md` (to be created) and `docs/authoring-accessibility.md` (existing).

| Step | Action | Tool | Output |
|:---|:---|:---|:---|
| 1 | Create/edit artwork | vectorcraft (SVG/PNG), photocraft (PNG/JPG), designcraft (promo, `marketing/`) | master file |
| 2 | Export to accepted format | app CLI headless/GUI | `media-src/frames/frame-XX.svg` (1200×800) |
| 3 | Place in `media-src/` | filesystem | master at final path |
| 4 | (Optional) Write sidecar | author | `.json` sidecar with digest |
| 5 | Run pipeline | `npm run validate && npm run build:images && npm run build` | variants in `assets/` |
| 6 | Validate | `npm run report` | no budget/ref violations |
| 7 | Commit | git | trailers `Authored-With` + `Reviewed-By` |

### Traceability

- **Primary**: commit trailers (`Authored-With: vectorcraft-cli 0.12.0`, `Reviewed-By: <name>`).
- **Secondary**: sidecar JSON in `media-src/` (optional in build, enforced in CI).
- **Manifest fields**: prohibited (schema v1 frozen).

---

## Entity: TierAReview (human, documented)

Human visual review recorded per master. Stored in sidecar `review` block + commit trailer `Reviewed-By`.

| Field | Type | Constraints |
|:---|:---|:---|
| `reviewer` | string | Name (self-review acceptable for solo maintainer) |
| `reviewedAt` | ISO-8601 UTC | — |
| `oversight` | enum | `fully_autonomous` \| `prompt_guided` \| `human_validated` |
| `notes` | string | Side-by-side: size, format, qualitative impression + palette/tonal-range verification |
| `decision` | enum | `approve` \| `reject` |
| `measuredSSIM` | number (optional) | Tier B fidelity measurement (SSIM value; PSNR reported separately when available) |

---

## Entity: TierBGate (automated, CI)

Automated delivery-fidelity check comparing each generated variant to a lossless PNG reference of the master at each delivery width.

| Field | Type | Constraints |
|:---|:---|:---|
| `reference` | PNG (lossless) | Master re-scaled to delivery width; stored in `build/` (git-ignored) |
| `ssim` | number | ≥ 0.95 (standard) / ≥ 0.90 (light) — centralizado em `scripts/delivery-fidelity.mjs` |
| `psnr` | number | ≥ 30 dB (floor) |
| `behavior` | enum | fail-fast (standard) / warn-only (light) |
| `scratchLocation` | directory | `build/` (git-ignored root scratch) |

---

## Relationships

```text
AuthoredMaster 1 ──── 0..1 ProvenanceSidecar
    │                         │
    │                         └── 0..1 TierAReview (review block)
    │
    └── (re-encoded by sharp/ffmpeg) ──► GeneratedVariant (in assets/)
                                              │
                                              └── compared against ──► TierBReference (in build/)

AuthoringWorkflow 1 ──── produces ────► AuthoredMaster
AuthoringWorkflow 1 ──── requires ────► TierAReview (for master-integration commits)
```

---

## Constraints (non-negotiable)

| Constraint | Value | Enforced by |
|:---|:---|:---|
| Canvas (authoring target) | 1200×800 px (3:2) | `invalid-master-geometry` throw |
| Rigid ceiling (any master) | ≤ 2560 px larger side | `invalid-master-geometry` throw |
| Per-frame budget | ≤ 300 000 B (sum of largest AVIF+WebP+JPEG) | `build.mjs` budget check |
| Total assets | ≤ 30 000 000 B | `build.mjs` budget check |
| Quality floor (standard) | AVIF ≥30 / WebP ≥45 / JPEG ≥45 | `encodeImage` throw naming frame |
| Quality floor (light) | AVIF ≥20 / WebP ≥30 / JPEG ≥30 | `encodeImage` throw naming frame |
| Tier B SSIM | ≥ 0.95 standard / ≥ 0.90 light | fail-fast / warn-only |
| Tier B PSNR | ≥ 30 dB | fail-fast (standard) |
| New dependencies | none | `package.json` unchanged |
| SVG DoS caps | file ≤ 1 MB · elements ≤ 10 000 · depth ≤ 100 · attrs/element ≤ 256 | sanitization gate throw |
| Orphan sidecar | forbidden (sidecar without master) | digest-gate throw (`orphan-sidecar`) |
| ArtCraft binaries in repo/CI | none | `git ls-files` + preflight |
| Schema v1 manifest | frozen | no manifest field changes |
