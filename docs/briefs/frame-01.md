# Authoring Brief — Frame 01: "VOLTE QUANDO A CASA ACORDAR"

**Feature:** 003-artcraft-local-authoring
**Task:** T028 (external human deliverable)
**Status:** Pending human authoring
**Version:** 1.0 — 2026-10-19
**Owner:** Sole maintainer (self-review acceptable per Constitution V)

---

## 1. Narrative Role

Frame 01 is the **opening establishing shot** of the cinematic sequence. It sets the
atmosphere, anchors the viewer in the story world, and introduces the central motif
(a house that is "awake"). It must read instantly as a place the viewer recognizes
but does not trust. Duration on screen: long (the `durationMs` should reflect the
copy length per rule F20: `minMs = 500 + (words/150)·60000 + 1000`, clamped
`[500, 30000]`).

Key emotional beat: **anticipation / dread of return**. The viewer should feel that
something in the house is waiting.

## 2. Visual Concept

A frontal, slightly low-angle view of a modest two-story house at dusk. The house
is dark inside except for a single warm light in an upstairs window — the "awake"
eye. A front door is slightly ajar; no figure is visible, but the composition
implies one could be standing just inside. A cracked garden path leads from the
foreground to the door. The sky is a bruised gradient (deep indigo → slate) with
a faint, sickly yellow at the horizon. A dead tree silhouette on the left; a
crooked fence on the right. The title lettering is integrated into the scene as
part of the environment (painted on the door or as a title card at the bottom),
not pasted on top.

Mood reference: classic haunted-house establishing shot, but restrained — no
gore, no jump-scare imagery. The horror lives in the **absence** and the
**light**.

## 3. Technical Specifications

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Canvas | 1200 × 800 px (3:2) | FR-012 / constitution IV; fixed master geometry |
| Maximum master dimension | ≤ 2560 px on either axis | FR-012 ceiling; build rejects `invalid-master-geometry` above this |
| Format | SVG preferred; PNG or JPG acceptable | FR-001; SVG is the only format that survives the sanitize gate and keeps vector fidelity |
| Color mode | RGB | Web delivery; CMYK masters are not accepted |
| Bit depth | 8-bit per channel (sRGB) | Consistent with delivery pipeline |
| File name | `media-src/frames/frame-01.<ext>` | `ext ∈ {svg, png, jpg}` |
| Sidecar | `media-src/frames/frame-01.json` | Extension-swap; required for master-integration commits |
| Master must not be upscaled | native authored resolution only | Tier A checklist |
| No external references | all assets embedded / inline | `isSafeLocalReference` + build validation |

### If SVG (recommended)
- Run through `scripts/svg-sanitize.mjs` allow-list (validated against real
  vectorcraft export, SHA 302fa1… on 2026-10-19).
- Only allow-listed elements/attributes; `url(#…)` references permitted;
  external/`data:` references rejected.
- Do not embed raster images; keep paths vector.
- Keep text as `<text>` (not outlined) so it stays editable and accessible;
  outline only if the font cannot be embedded.

### If raster (PNG/JPG)
- Lossless-ish quality (PNG) or high-quality JPEG (q ≥ 90).
- No transparency artifacts; flatten on a solid background if needed.
- Embedded color profile: sRGB.

## 4. Composition & Layout

- **Rule of thirds:** house centered on the vertical center line, slightly
  below the horizontal center (ground plane at ~60% height).
- **Foreground:** cracked path (leading lines toward the door), low vegetation,
  a fence post or two.
- **Midground:** the house facade, door ajar, single lit upstairs window.
- **Background:** sky gradient, dead tree (left), fence (right), distant
  silhouette.
- **Negative space:** sky occupies the upper ~35%; do not clutter it.
- **Focal point:** the lit window (warm #f59e0b / #fbbf24 against cool sky).
- **Reading order:** eye enters at the lit window → door → path → foreground.

## 5. Color Palette & Tonal Range

| Role | Suggested hex | Notes |
|------|---------------|-------|
| Sky (top) | `#1e1b4b` → `#312e81` | deep indigo, bruised |
| Sky (horizon) | `#475569` → `#94a3b8` | slate, sickly |
| House body | `#1f2937` / `#111827` | near-black, cool |
| Roof | `#0f172a` | darker than body |
| Warm window | `#f59e0b` / `#fbbf24` | the only warm accent; high contrast |
| Door (ajar) | `#3f3f46` | darker than facade, implies depth |
| Path | `#374151` / `#4b5563` | cracked, desaturated |
| Dead tree | `#0a0a0a` | silhouette, no detail |
| Fence | `#1f2937` | same as body, recedes |

**Tonal range requirement:** strong contrast between the single warm accent and
the cool, low-key surroundings. Overall key: **low-key (dark)**. Avoid pure
black `#000000` except for the tree silhouette; prefer `#0a0a0a`–`#111827`.

**Palette verification (Tier A):** document the dominant hues and the
min/max luminance in `review.notes`.

## 6. Typography / Lettering

- Title text: **"VOLTE QUANDO A CASA ACORDAR"** (Portuguese).
- Placement: integrated into the scene — painted on the door, or a subtle
  title card at the bottom margin. Not a floating overlay.
- Font: condensed sans-serif or hand-painted serif; must be legible at
  1200 px wide. Suggested: a worn, slightly distorted display face.
- Color: `#e5e7eb` (off-white) or the warm accent `#fbbf24` if on the door.
- `font-size` ≥ 42 px equivalent at 1200 px canvas.
- The `description` field in `story.json` must reproduce **all** visible
  lettering verbatim (rule F20). Plan the copy now: count words and compute
  `minMs = 500 + (words/150)·60000 + 1000`, clamped `[500, 30000]`.
- `alt` ≠ `description`; `alt` ≤ 125 chars, describing the image for screen
  readers without reproducing lettering.

## 7. Sidecar Requirements (schema v1.0)

Create `media-src/frames/frame-01.json` with:

```json
{
  "schemaVersion": "1.0",
  "subject": {
    "name": "frame-01.svg",
    "digest": { "sha256": "<sha256 of master bytes>" }
  },
  "provenance": {
    "tool": "vectorcraft-cli",
    "toolVersion": "0.13.1",
    "timestamp": "<ISO-8601 UTC>",
    "author": "<author name>"
  },
  "review": {
    "reviewer": "<reviewer name>",
    "reviewedAt": "<ISO-8601 UTC>",
    "oversight": "human_authored",
    "notes": "<size, format, qualitative impression, palette/tonal-range verification>",
    "decision": "approve"
  }
}
```

- `subject.name` must equal the master basename (extension included).
- `subject.digest.sha256` must be the lowercase hex SHA-256 of the master
  file bytes. Recompute after any edit; the build fails on mismatch.
- `review.decision` MUST be `"approve"` for master-integration commits.
- `review.notes` must document, at minimum: canvas size, format, qualitative
  impression, and palette/tonal-range verification (Tier A).
- `inputs` array is optional; include if the frame was composited from
  referenced assets (each with `uri` + `digest`).

## 8. Tier A Checklist (per master)

- [ ] Exact dimensions 1200 × 800, no upscaling beyond the master.
- [ ] Format is SVG (preferred) or PNG/JPG with quality ≥ 90.
- [ ] `review.notes` documents: size, format, qualitative impression,
      palette/tonal-range verification.
- [ ] `review.decision: "approve"`.
- [ ] No external URLs or `../` paths in the master (safe-local-reference rule).
- [ ] If SVG: passes `scripts/svg-sanitize.mjs` allow-list (run
      `node -e "require('./scripts/svg-sanitize.mjs').sanitizeSvg(fs.readFileSync(...))"`).
- [ ] Lettering reproduced verbatim in `story.json` `description`; `alt` ≠
      `description` and ≤ 125 chars; `durationMs` recomputed per F20.

## 9. Deliverables

1. `media-src/frames/frame-01.<ext>` — the master.
2. `media-src/frames/frame-01.json` — the sidecar (schema v1.0, `decision: approve`).
3. A commit touching `media-src/` with trailers:
   - `Authored-With: vectorcraft-cli <version>` (or the tool actually used)
   - `Reviewed-By: <name>`
4. Updated `src/data/story.json` entry for frame 01 (alt, description, durationMs
   per F20) in the same change.
5. Evidence recorded in `docs/authoring.md` and `attestation.md` (T045).

## 10. Acceptance Criteria

- `npm run validate` passes (manifest + asset refs).
- `npm run build:images` processes frame-01 without error.
- `npm run build` passes budgets (per-frame ≤ 300 000 B sum of largest
  AVIF+WebP+JPEG; total ≤ 30 000 000 B).
- `npm run test:unit` passes (including sidecar digest match and orphan checks).
- CI trailer gate (`scripts/ci-trailers.mjs`) passes on the commit.
- Lighthouse (SC-006) not regressed: perf ≥ 0.9, a11y ≥ 0.95, CLS < 0.1,
  LCP ≤ 2500 ms.

## 11. References

- Spec: `specs/003-artcraft-local-authoring/spec.md` (FR-001, FR-007, FR-008,
  FR-009, FR-012, FR-014; SC-001, SC-003, SC-006, SC-007a/b)
- Plan: `specs/003-artcraft-local-authoring/plan.md`
- Sidecar schema: `specs/003-artcraft-local-authoring/contracts/sidecar.schema.json`
- Constitution: `.specify/memory/constitution.md` (I, IV, V, VI)
- Sanitizer allow-list: `scripts/svg-sanitize.mjs` (validated against real
  vectorcraft export 2026-10-19)
- Story metadata rule F20: `docs/authoring-accessibility.md` (T038a)
