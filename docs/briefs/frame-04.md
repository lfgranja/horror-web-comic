# Authoring Brief — Frame 04: "A CHUVA NÃO PARA"

**Feature:** 003-artcraft-local-authoring
**Task:** T028 (external human deliverable)
**Status:** Pending human authoring
**Version:** 1.0 — 2026-10-19
**Owner:** Sole maintainer (self-review acceptable per Constitution V)

---

## 1. Narrative Role

Frame 04 is the **closing image / coda**: the horror does not resolve; it
continues. The rain "never stops" — the situation is ongoing, inescapable, and
the viewer is left with the sense that the house (and whatever is in it) will
outlast them. This frame should feel like an **ending that is not an ending**:
a lingering, unresolved final shot.

It is the last frame of the sequence, so it carries the emotional residue the
viewer takes away. It should be quieter than frame 03 but more unsettling —
not a climax, but a **descent into acceptance**.

## 2. Visual Concept

A window (or a view through a window) with rain streaking down the glass. Beyond
the glass: the same house from frame 01, now fully dark, or a different part
of it. The rain is the subject — heavy, relentless, slightly distorted by the
glass. A single light (or no light) in the house beyond. The title is integrated
as condensation on the glass, or as a final caption that fades in.

The key device: **the viewer is inside, looking out** — the inverse of frame
01 (outside looking in). This bookends the sequence. The rain on the glass
creates a barrier the viewer cannot cross; they are trapped inside with whatever
is there.

Mood reference: the "rain on the window" ending — melancholy, inescapable,
quietly terrifying. Think of the final shot of a slow-burn horror film: no
monster, just weather and a house that will not let you leave.

### Art Direction (Professional Craft — Alan Moore / Eddie Campbell register)

Adopt the **Eddie Campbell "From Hell" register**: scratchy pen-and-ink,
grayscale watercolor, ambiguity, psychogeography. The horror lives in the
*barrier* (the glass) and the *weather*.

- **Rain as texture, not decoration**: 28+ streaks at varied opacity (0.3-0.55)
  and slight horizontal drift (x2 = x1 ± 8). Mix thick (1.5px) and thin (1px)
  strokes. Rain should feel relentless and slightly chaotic, not uniform.
- **Grayscale watercolor washes**: the glass layer is a semi-transparent
  gradient (#1e293b → #0f172a, opacity 0.55-0.75), not a flat fill.
- **Stark black strokes**: the house beyond the glass should be nearly black
  (#020617, #0a0a0a) — a silhouette, not a detailed drawing. The single
  faint light (#fbbf24, opacity 0.18) is the only warm accent.
- **Scratchy, liberated penmanship**: the title should feel like condensation
  — thin, faded, barely legible (opacity 0.65). Use a sans-serif at 34px.
- **Negative space is the horror**: the dark house beyond the glass is where
  the viewer's fear lives. Do not illuminate it.
- **Bookend with frame 01**: this frame inverts frame 01 (interior view, rain
  instead of dusk sky). The house silhouette should echo frame 01's composition.
- **Vignette**: darken the edges to intensify the trapped, claustrophobic feel.

## 3. Technical Specifications

| Parameter | Value |
|-----------|-------|
| Canvas | 1200 × 800 px (3:2) |
| Maximum master dimension | ≤ 2560 px on either axis |
| Format | SVG preferred; PNG or JPG acceptable |
| Color mode | RGB, 8-bit sRGB |
| File name | `media-src/frames/frame-04.<ext>` |
| Sidecar | `media-src/frames/frame-04.json` |

### If SVG
- Rain streaks can be vector paths; for many streaks, consider a pattern or
  a raster master instead (performance budget: per-frame ≤ 300 000 B).
- Must pass `scripts/svg-sanitize.mjs` allow-list.

### If raster
- Rain detail benefits from PNG (lossless) or high-quality JPEG.
- Watch the total asset budget (≤ 30 000 000 B across all frames).

## 4. Composition & Layout

- **Foreground:** the window glass with rain streaks — this is the surface the
  viewer is pressed against.
- **Midground:** the window frame/sill; perhaps a hand or a curtain edge.
- **Background:** the house beyond the glass, fully dark, or a different wing
  of it; a single light (or none).
- **Negative space:** the rain-covered glass itself — a textured, semi-opaque
  layer.
- **Focal point:** the rain streaks (texture) competing with the dark house
  beyond (shape).
- **Reading order:** rain → glass → house → darkness beyond.
- **Bookend:** this frame should visually rhyme with frame 01 (house exterior)
  but inverted (interior view, rain instead of dusk sky).

## 5. Color Palette & Tonal Range

| Role | Suggested hex | Notes |
|------|---------------|-------|
| Rain streaks | `#94a3b8` / `#cbd5e1` | cool, translucent, low opacity |
| Glass (wet) | `#1e293b` / `#0f172a` | dark, reflective |
| Window frame | `#3f3f46` / `#52525b` | neutral, structural |
| House beyond | `#0f172a` / `#020617` | darker than frame-01's house |
| Single light (optional) | `#fbbf24` (small, dim) | if present, very faint |
| Condensation/title | `#e5e7eb` (faded) | barely legible |

**Tonal range requirement:** **mid-to-low key with a wet, reflective surface.**
The frame should feel damp and cold. High contrast between rain streaks and
the dark glass; the house beyond should be nearly black. Avoid warm tones
except the single faint light (if used).

**Palette verification (Tier A):** document the rain opacity range and the
luminance of the house beyond the glass.

## 6. Typography / Lettering

- Title text: **"A CHUVA NÃO PARA"**.
- Placement: as condensation on the glass, or as a final caption that fades in
  at the bottom. Should feel like a statement of fact, not a title.
- Font: thin, slightly blurred (as if seen through wet glass); the smallest
  and most subdued of the four frames.
- Color: `#cbd5e1` at reduced opacity (0.6–0.8), or `#94a3b8`.
- `font-size` ≈ 34 px equivalent at 1200 px canvas.
- Word count (4) → `minMs = 500 + (4/150)·60000 + 1000 = 500 + 1600 + 1000 = 3100`,
  clamped → 3100 ms. Set `durationMs` per F20.
- `alt` ≤ 125 chars, not reproducing lettering.

## 7. Sidecar Requirements (schema v1.0)

Same structure as frame-01. Key fields:

- `subject.name`: `"frame-04.svg"` (or `.png`/`.jpg`)
- `subject.digest.sha256`: SHA-256 of master bytes.
- `provenance`: tool, version, timestamp, author.
- `review.oversight`: `"human_authored"`.
- `review.notes`: document canvas size, format, qualitative impression, rain
  opacity range, and house-beyond luminance.
- `review.decision`: `"approve"`.

## 8. Tier A Checklist (per master)

- [ ] Exact dimensions 1200 × 800.
- [ ] Rain reads as relentless and wet (texture/opacity verified).
- [ ] House beyond the glass is nearly black but not crushed (`#020617` min).
- [ ] `review.notes` documents size, format, qualitative impression, palette/
      tonal-range (rain opacity + house luminance).
- [ ] `review.decision: "approve"`.
- [ ] Safe-local-reference rule respected.
- [ ] SVG passes `scripts/svg-sanitize.mjs` if applicable.
- [ ] `story.json` updated per F20.
- [ ] Per-frame budget respected (rain texture must not exceed 300 000 B
      after AVIF+WebP+JPEG generation).

## 9. Deliverables

1. `media-src/frames/frame-04.<ext>`
2. `media-src/frames/frame-04.json`
3. Commit with `Authored-With` / `Reviewed-By` trailers.
4. `src/data/story.json` updated (alt, description, durationMs).
5. Evidence in `docs/authoring.md` and `attestation.md`.

## 10. Acceptance Criteria

Same as frame-01: validate passes, build:images processes frame-04, build passes
budgets, test:unit passes, CI trailer gate passes, no Lighthouse regression.

## 11. References

- Spec: `specs/003-artcraft-local-authoring/spec.md`
- Sidecar schema: `contracts/sidecar.schema.json`
- Constitution: `.specify/memory/constitution.md` (I, IV, V, VI)
- Story metadata rule F20: `docs/authoring-accessibility.md`
- Sanitizer allow-list: `scripts/svg-sanitize.mjs`
