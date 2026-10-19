# Bug Assessment: Low-quality master frames (childish appearance)

- **Slug**: frames-low-quality
- **Created**: 2026-10-19
- **Source**: pasted text (Portuguese) — "Os 4 frames gerados ficaram MUITO FEIOS... parece criança desenhando."
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> Os 4 frames gerados ficaram MUITO FEIOS... parece criança desenhando.
> Pesquise longa, completa, profunda, ampla e detalhadamente na internet de
> forma atualizada em todas as línguas que você tem acesso e utilize todas as
> suas ferramentas, capacidades e habilidades, utilizando as principais skills
> relacionadas à cada etapa dessa atividade disponíveis em `npx skills find` /
> `npx skills use`, elabore os quatro briefings de nível profissional.
> Tente dar uma pegada profissional, nível "Alan Moore", "Eddie Campbell", e
> outros, utilizando o `photocraft-cli`, `vectorcraft-cli`, `figcraft-cli`,
> `designcraft-cli`, `effectcraft-cli`, `soundcraft-cli`
> (Tente ler a documentação, os recursos e tutoriais: https://getartcraft.com/faq ;
> https://getartcraft.com/tutorials)

The user reports that the four authored master frames (frame-01..04) look
unprofessional / childish and requests professional-grade briefings and
authoring using the ArtCraft toolchain (vectorcraft-cli, photocraft-cli,
designcraft-cli, effectcraft-cli, figcraft-cli, soundcraft-cli) and online
research, targeting an Alan Moore / Eddie Campbell aesthetic.

## Symptom

The four master SVGs in `media-src/frames/` (frame-01..04.svg) are composed
of flat geometric primitives (rectangles, simple polygons, uniform lines)
with no texture, no varied line weight, no atmospheric depth and no
illustrative craft. They read as placeholder diagrams rather than horror-comic
artwork. The briefings in `docs/briefs/` are competent but generic and do not
encode the specific visual language (scratchy ink, ambiguity, psychogeography,
stark black strokes, furious scribbles, grayscale watercolor) that defines the
target aesthetic.

## Reproduction

1. Open `media-src/frames/frame-01.svg` (or any frame-0X.svg).
2. Observe flat fills, uniform strokes, no texture, no line-weight variation,
   no atmospheric depth.
3. Compare against the intended mood (dread, ambiguity, "don't look" suspense).

[NEEDS CLARIFICATION: exact desired fidelity level and whether raster (PNG/JPG)
masters are acceptable instead of SVG, given the sanitizer allow-list.]

## Suspected Code Paths

- `media-src/frames/frame-01.svg` … `frame-04.svg` — the authored masters (flat geometry).
- `media-src/frames/frame-0X.json` — sidecars (digests must be recomputed after re-authoring).
- `docs/briefs/frame-01.md` … `frame-04.md` — generic briefings lacking
  professional art-direction vocabulary.
- `scripts/svg-sanitize.mjs` — allow-list constrains which SVG elements/attrs
  may be used (relevant if re-authoring as richer SVG).
- `src/data/story.json` — frame metadata (alt/description/durationMs) must stay
  aligned with the new artwork.

## Root Cause Hypothesis

The masters were authored as minimal, valid SVGs that pass the sanitizer and
budget gates but lack genuine illustration: no varied line weight, no texture,
no atmospheric layering, no scratchy/furious ink quality. The briefings
described composition and palette but not the specific craft techniques
(scratchy pen-and-ink, ambiguity, psychogeography, grayscale watercolor,
impressionistic caricature vs. painterly miniature) that define the target
Alan Moore / Eddie Campbell aesthetic. Confidence: high.

## Proposed Remediation

**Preferred**: Re-author the four masters at professional quality using
`vectorcraft-cli` (the only ArtCraft tool with a real batch/CLI authoring
surface) to build layered, textured artwork: varied stroke weights, scratchy
and furious pen lines, grayscale watercolor washes, atmospheric gradients,
ambiguous shapes, and integrated lettering. Then regenerate sidecars (digests),
update briefings with professional art-direction vocabulary, run
`build:images`/`build`/`test:unit`, and re-commit with trailers.

**Alternatives**:
- Raster masters (PNG/JPG) authored in a GUI tool (photocraft/designcraft) —
  bypasses the SVG sanitizer but loses vector fidelity and the
  `vectorcraft-cli` provenance chain; acceptable only if vector authoring
  cannot reach the desired quality.
- Hybrid: keep SVG for structure, embed raster textures as safe local refs —
  rejected by `isSafeLocalReference`/build if external; not viable for
  embedded rasters unless flattened to a single raster master.

**Files likely to change**:
- `media-src/frames/frame-01.svg` … `frame-04.svg`
- `media-src/frames/frame-01.json` … `frame-04.json`
- `docs/briefs/frame-01.md` … `frame-04.md`
- `src/data/story.json` (if lettering/copy changes)
- `docs/authoring.md`, `attestation.md` (evidence)

**Tests to add or update**:
- Sidecar digest match (existing `artcraft-sidecar.test.js`).
- Sanitizer pass for the new masters (existing `svg-sanitize` tests).
- Budget checks (per-frame ≤ 300 000 B, total ≤ 30 000 000 B).

## Risks & Considerations

- SVG sanitizer allow-list limits element/attribute vocabulary; richer
  artwork must stay within it (or the allow-list must be extended with a
  documented diff, as done for T011b).
- Per-frame budget (300 000 B) constrains texture detail; prefer vector
  strokes over embedded rasters.
- `photocraft-cli`/`designcraft-cli`/`effectcraft-cli`/`figcraft-cli`/
  `soundcraft-cli` are GUI-first (no batch authoring CLI); only
  `vectorcraft-cli` supports headless `run`/`export`. Sound is out of scope
  for static frames (audio is a separate pipeline).
- Re-authoring invalidates existing sidecar digests and generated assets;
  `build:images` and `build` must be re-run.

## Open Questions

- [NEEDS CLARIFICATION: confirm the target fidelity level and whether the
  user prefers vector (SVG) or raster (PNG/JPG) masters for the re-author.]
- [NEEDS CLARIFICATION: whether to extend the sanitizer allow-list for new
  elements (e.g. filters) needed for texture.]
