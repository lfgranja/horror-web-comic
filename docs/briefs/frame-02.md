# Authoring Brief — Frame 02: "ELA AINDA ESTÁ EM CASA"

**Feature:** 003-artcraft-local-authoring
**Task:** T028 (external human deliverable)
**Status:** Pending human authoring
**Version:** 1.0 — 2026-10-19
**Owner:** Sole maintainer (self-review acceptable per Constitution V)

---

## 1. Narrative Role

Frame 02 is the **first escalation**: the viewer is now *inside* the house. The
previous frame's promise ("the house is awake") is answered — someone (or
something) is still there. This frame must shift the emotion from anticipation
to **unease / intrusion**. The viewer should feel they are being watched.

Duration on screen: medium-short; the copy is shorter than frame 01, so
`durationMs` will be closer to the 500 ms floor side but still above it per F20.

## 2. Visual Concept

An interior shot: a dim hallway or living room, lit only by moonlight through a
curtain and the faint glow of a television or a lamp that has been left on.
A figure is partially visible — not a full person, but a silhouette, a hand on
a doorframe, or a shadow that is *wrong* (too tall, too still, or in a place a
person could not stand). The composition should make the viewer search the frame
for the figure; it should not be the first thing noticed.

Key motif: **presence without identity**. No face, no full body. The horror is
that the house is occupied by something the viewer cannot fully see.

### Art Direction (Professional Craft — Alan Moore / Eddie Campbell register)

Adopt the **Eddie Campbell "From Hell" register**: ambiguity of faces, confusion
of identity, scratchy pen-and-ink, grayscale watercolor. The horror lives in
what is *barely* seen.

- **Ambiguity over explicitness**: the figure must be discoverable only on
  second look — a luminance difference of 1-2 stops, not a hard edge. Use
  fill-opacity 0.4-0.9 on near-black shapes.
- **Scratchy, liberated penmanship**: furniture and doorframe lines should feel
  hand-drawn with varied stroke width; avoid CAD-clean rectangles.
- **Grayscale watercolor washes**: walls and floor are layered semi-transparent
  gradients, not flat fills. Moonlight and lamp glow are the only bright areas.
- **Psychogeography**: the interior should feel like a real, inhabited, decaying
  space — dust motes, worn furniture, imperfect alignment.
- **Negative space is the horror**: large dark areas (unlit parts of the room)
  are where the viewer's imagination works. Do not fill them.
- **Title as whisper**: thin, receding, low opacity (0.7). It should feel like
  an internal voice, not a headline.
- **Vignette**: darken the edges to trap the viewer inside.

Mood reference: the "something in the background" trope — the figure should be
discoverable on second look, rewarding attentive viewers and creating dread on
replay.

## 3. Technical Specifications

| Parameter | Value |
|-----------|-------|
| Canvas | 1200 × 800 px (3:2) |
| Maximum master dimension | ≤ 2560 px on either axis |
| Format | SVG preferred; PNG or JPG acceptable |
| Color mode | RGB, 8-bit sRGB |
| File name | `media-src/frames/frame-02.<ext>` |
| Sidecar | `media-src/frames/frame-02.json` |

### If SVG
- Must pass `scripts/svg-sanitize.mjs` allow-list (validated against real
  vectorcraft export).
- Prefer vector shapes; if a photographic texture is essential, embed as a
  referenced (safe, local) asset or flatten to a raster master instead.

### If raster
- High-quality JPEG (q ≥ 90) or PNG; preserve deep shadows (do not crush
  blacks to `#000000`).

## 4. Composition & Layout

- **Interior perspective:** one-point or two-point, eye level or slightly low.
- **Foreground:** a piece of furniture or a doorframe that frames the view;
  the "wrong" shadow falls across it.
- **Midground:** the room interior, partially lit; the figure/silhouette.
- **Background:** moonlit window with curtain; the light source.
- **Negative space:** large dark areas (the unlit parts of the room) — these
  are where the viewer's imagination works. Do not fill them.
- **Focal point:** the window (cool moonlight) competing with the warm lamp;
  the figure is secondary but discovered.
- **Reading order:** window → lamp → furniture → *then* the figure in the
  corner/doorframe.

## 5. Color Palette & Tonal Range

| Role | Suggested hex | Notes |
|------|---------------|-------|
| Moonlight (window) | `#94a3b8` → `#cbd5e1` | cool, desaturated |
| Lamp glow | `#fbbf24` / `#f59e0b` | warm, small pool |
| Walls | `#1e293b` / `#0f172a` | dark, cool |
| Floor | `#0f172a` / `#020617` | near-black |
| Furniture | `#334155` / `#1e293b` | recedes |
| Figure/silhouette | `#020617` / `#0a0a0a` | darker than surroundings, "wrong" |
| Curtain | `#475569` | translucent, backlit |

**Tonal range requirement:** **very low-key**. Most of the frame should sit
between `#0f172a` and `#334155`; the two light sources (moonlight, lamp) are
the only bright areas. The figure should be *barely* distinguishable from the
background — use a luminance difference of only 1–2 stops, not a hard edge.

**Palette verification (Tier A):** document the luminance histogram shape
(heavy left skew) and the two accent luminances.

## 6. Typography / Lettering

- Title text: **"ELA AINDA ESTÁ EM CASA"**.
- Placement: as a subtitle-like caption at the bottom, or carved into the
  wall/doorframe. Should feel like a whisper, not a headline.
- Font: thin, slightly distorted sans-serif or handwritten; lower visual
  weight than frame 01.
- Color: `#94a3b8` (cool, receding) rather than white.
- `font-size` ≈ 36 px equivalent at 1200 px canvas.
- Count words (5) → `minMs = 500 + (5/150)·60000 + 1000 = 500 + 2000 + 1000 = 3500`,
  clamped within `[500, 30000]` → 3500 ms. Set `durationMs` accordingly in
  `story.json` unless the minimum changes >10%.
- `alt` ≤ 125 chars, not reproducing lettering.

## 7. Sidecar Requirements (schema v1.0)

Same structure as frame-01. Key fields:

- `subject.name`: `"frame-02.svg"` (or `.png`/`.jpg`)
- `subject.digest.sha256`: SHA-256 of master bytes.
- `provenance.tool` / `toolVersion`: the tool actually used (vectorcraft-cli
  0.13.1 if SVG).
- `review.oversight`: `"human_authored"`.
- `review.notes`: document canvas size, format, qualitative impression, and
  **the luminance histogram / figure discoverability** (this frame's specific
  verification).
- `review.decision`: `"approve"`.

## 8. Tier A Checklist (per master)

- [ ] Exact dimensions 1200 × 800.
- [ ] Low-key tonal range verified (heavy shadow, two accent lights).
- [ ] Figure is discoverable but not dominant (second-look test passes with
      at least one independent reviewer, or self-review documented).
- [ ] `review.notes` documents size, format, qualitative impression, palette/
      tonal-range verification.
- [ ] `review.decision: "approve"`.
- [ ] Safe-local-reference rule respected (no external URLs / `../`).
- [ ] SVG passes `scripts/svg-sanitize.mjs` if applicable.
- [ ] `story.json` updated per F20.

## 9. Deliverables

1. `media-src/frames/frame-02.<ext>`
2. `media-src/frames/frame-02.json`
3. Commit with `Authored-With` / `Reviewed-By` trailers.
4. `src/data/story.json` updated (alt, description, durationMs).
5. Evidence in `docs/authoring.md` and `attestation.md`.

## 10. Acceptance Criteria

Same as frame-01: validate passes, build:images processes frame-02, build passes
budgets, test:unit passes, CI trailer gate passes, no Lighthouse regression.

## 11. References

- Spec: `specs/003-artcraft-local-authoring/spec.md`
- Sidecar schema: `contracts/sidecar.schema.json`
- Constitution: `.specify/memory/constitution.md` (I, IV, V, VI)
- Story metadata rule F20: `docs/authoring-accessibility.md`
