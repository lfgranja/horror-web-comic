# Authoring Brief — Frame 03: "NÃO OLHE PARA TRÁS"

**Feature:** 003-artcraft-local-authoring
**Task:** T028 (external human deliverable)
**Status:** Pending human authoring
**Version:** 1.0 — 2026-10-19
**Owner:** Sole maintainer (self-review acceptable per Constitution V)

---

## 1. Narrative Role

Frame 03 is the **escalation to confrontation**: the viewer is given a direct
instruction — *do not look back* — which implies that something is behind them
(or behind the character). This frame must create **suspense through
composition**, not through explicit imagery. The horror is in the *geometry*: a
doorway, a staircase, a vanishing point that something could emerge from.

It is the most psychologically intense frame of the four; the copy is short
and imperative, so `durationMs` will be near the floor.

## 2. Visual Concept

A view from inside a room looking toward an open doorway or the foot of a
staircase. The foreground is the room the viewer occupies; the background is
the space beyond the door/stairs, which is darker and deeper than it should be.
A single vertical element (a doorframe, a banister, a pillar) divides the
frame. There may be a faint suggestion of a shape at the far end — a figure,
a shadow, a pair of eyes — but it must remain ambiguous: it could be a coat on
a hook, a trick of light, or something else. The viewer cannot be sure.

The title is integrated as a warning — perhaps scratched into the doorframe,
or as a caption that feels like an internal voice rather than a label.

Mood reference: the "don't look" trope; the dread of the unseen behind you.
Composition should make the viewer want to turn around (meta-dread).

## 3. Technical Specifications

| Parameter | Value |
|-----------|-------|
| Canvas | 1200 × 800 px (3:2) |
| Maximum master dimension | ≤ 2560 px on either axis |
| Format | SVG preferred; PNG or JPG acceptable |
| Color mode | RGB, 8-bit sRGB |
| File name | `media-src/frames/frame-03.<ext>` |
| Sidecar | `media-src/frames/frame-03.json` |

### If SVG
- Must pass `scripts/svg-sanitize.mjs` allow-list.
- Linear gradients are acceptable for the depth effect (validated in the
  allow-list: `linearGradient`, `radialGradient`, `stop`, `gradientUnits`,
  `gradientTransform`).

### If raster
- Preserve deep perspective; avoid JPEG compression artifacts in gradients
  (use q ≥ 92 or PNG).

## 4. Composition & Layout

- **One-point perspective:** the doorway/staircase recedes to a vanishing
  point at the center or slightly off-center (rule of thirds on the horizontal).
- **Foreground:** the room threshold — a floor line, a rug edge, a doorframe
  jamb. This is where the viewer "stands."
- **Midground:** the doorway or first few stairs; the dividing vertical
  element.
- **Background:** the deeper space — darker, possibly with a faint ambiguous
  shape at the far end.
- **Negative space:** the dark interior beyond the door; the viewer fills it
  with fear.
- **Focal point:** the vanishing point / the ambiguous shape (or its absence).
- **Reading order:** threshold → doorway → depth → *the shape that may or may
  not be there*.

## 5. Color Palette & Tonal Range

| Role | Suggested hex | Notes |
|------|---------------|-------|
| Near space (foreground) | `#1e293b` / `#334155` | slightly warmer, closer |
| Doorway/stairs | `#0f172a` / `#1e1b4b` | cooler, receding |
| Deep background | `#020617` / `#0a0a0a` | near-black, unknowable |
| Accent (ambiguous shape) | `#475569` / `#64748b` | barely visible, cool gray |
| Doorframe/banister | `#3f3f46` / `#52525b` | neutral, structural |
| Optional warm (lamp) | `#fbbf24` (small) | if a light exists beyond the door |

**Tonal range requirement:** **extreme low-key with a single depth gradient.**
The frame should read as a tunnel: lighter near the viewer, darker at the far
end. The ambiguous shape (if present) must be at most 1 stop brighter than its
surroundings — subtle enough to be missed on first viewing.

**Palette verification (Tier A):** document the depth gradient and the
luminance of the ambiguous element.

## 6. Typography / Lettering

- Title text: **"NÃO OLHE PARA TRÁS"**.
- Placement: scratched into the doorframe, or as an internal-voice caption at
  the bottom. Should feel like a warning the viewer is giving themselves.
- Font: distressed, hand-scratched or thin monospaced; small and intimate.
- Color: `#cbd5e1` (cool, fading) or `#94a3b8`.
- `font-size` ≈ 32 px equivalent at 1200 px canvas.
- Word count (4) → `minMs = 500 + (4/150)·60000 + 1000 = 500 + 1600 + 1000 = 3100`,
  clamped → 3100 ms. Set `durationMs` per F20.
- `alt` ≤ 125 chars, not reproducing lettering.

## 7. Sidecar Requirements (schema v1.0)

Same structure as frame-01. Key fields:

- `subject.name`: `"frame-03.svg"` (or `.png`/`.jpg`)
- `subject.digest.sha256`: SHA-256 of master bytes.
- `provenance`: tool, version, timestamp, author.
- `review.oversight`: `"human_authored"`.
- `review.notes`: document canvas size, format, qualitative impression, depth
  gradient, and ambiguous-element luminance.
- `review.decision`: `"approve"`.

## 8. Tier A Checklist (per master)

- [ ] Exact dimensions 1200 × 800.
- [ ] Depth gradient reads as a tunnel (near light → far dark).
- [ ] Ambiguous element is subtle (≤ 1 stop above surroundings) and
      discoverable on second look.
- [ ] `review.notes` documents size, format, qualitative impression,
      palette/tonal-range (depth gradient + ambiguous luminance).
- [ ] `review.decision: "approve"`.
- [ ] Safe-local-reference rule respected.
- [ ] SVG passes `scripts/svg-sanitize.mjs` if applicable.
- [ ] `story.json` updated per F20.

## 9. Deliverables

1. `media-src/frames/frame-03.<ext>`
2. `media-src/frames/frame-03.json`
3. Commit with `Authored-With` / `Reviewed-By` trailers.
4. `src/data/story.json` updated (alt, description, durationMs).
5. Evidence in `docs/authoring.md` and `attestation.md`.

## 10. Acceptance Criteria

Same as frame-01: validate passes, build:images processes frame-03, build passes
budgets, test:unit passes, CI trailer gate passes, no Lighthouse regression.

## 11. References

- Spec: `specs/003-artcraft-local-authoring/spec.md`
- Sidecar schema: `contracts/sidecar.schema.json`
- Constitution: `.specify/memory/constitution.md` (I, IV, V, VI)
- Story metadata rule F20: `docs/authoring-accessibility.md`
