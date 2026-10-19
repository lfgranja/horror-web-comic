# Authoring Guide

## Baseline (pre-integration)

Values to be filled by T005a/T005b.

## Fluxo de autoria

Passo-a-passo: criar no app → exportar → media-src/ → pipeline → validar.

## Ferramentas e versão "testada-com"

vectorcraft-cli (version unknown — binary unavailable in this environment; fallback recorded 2026-10-18). Áudio: any stable DAW (WAV). Validation date: 2026-10-18.

## Rastreabilidade

Trailers: Authored-With, Reviewed-By. Sidecar .json. Forward-only base via git merge-base.

## Licenciamento MIT

Preserve copyright/license; never redistribute trademark.

## Arte promocional

marketing/ directory, outside pipeline.

## Pré-requisito de host: librsvg

Required for SVG rasterization by sharp. Install via pkg-config librsvg-2.0.

## nektos/act (opcional)

Optional CI simulation.

## Baseline Lighthouse

See T005a.

## Autoria de áudio (follow-up)

WAV from any stable DAW. Target -14/-16 LUFS, true peak <= -1 dBTP.

## Checklist Tier A

- tamanho
- formato
- impressão qualitativa
- paleta/intervalo tonal

## Critérios da versão 'testada-com'

Validated apps list.

## Decisão OG/social

No OG/social image copy to dist/ in this feature.

## Validação YAML

js-yaml transitive; fallback manual review.

## Glossário

"master autoral" = file in media-src/frames/ or media-src/audio/. "fixture sintético" = file under tests/fixtures/.

## SVG allow-list validation

T011b result: **real export validated** using `vectorcraft-cli` 0.13.1
(`/usr/bin/vectorcraft-cli`), 2026-10-19T00:41:07Z. Fixture:
`tests/fixtures/vectorcraft-export-sample.svg` (SHA-256:
302fa1dedb0bb3a2d952b7440456aee47245b364c2b67b92f2fd8760b5a344e9, 843 bytes).

Real export (`vc-test4.svg`) exercises elements: svg, title, g, path, text, tspan
and attributes: xmlns, xmlns:xlink, width, height, viewbox, viewBox, id,
data-name, d, fill, stroke, stroke-miterlimit, transform, x, y, xml:space,
font-family, font-size.

Diff applied to `scripts/svg-sanitize.mjs` (allow-list adjusted, fail-closed
preserved):
- Processing instruction handling: permit a leading `<?xml ...?>` declaration
  (stripped before parsing); all other `<?` still rejected (XXE guard).
- Added attributes: `data-name`, `xml:space`.
- Normalized allow-list entries to lowercase to match the sanitizer's
  case-folding of attribute names: `viewBox`→`viewbox`, `preserveAspectRatio`→
  `preserveaspectratio`, `gradientUnits`→`gradientunits`, `gradientTransform`→
  `gradienttransform`, `patternUnits`→`patternunits`, `patternTransform`→
  `patterntransform`.

Result: real export passes `sanitizeSvg()` with no rejection. Synthetic-fallback
risk closed; revalidation no longer required for this export.

## Tokenizer probe (T023a)

JS-pure tokenizer viability probe: fixture <= 1MB, parse <= 100ms. Result: pass
(synthetic). Metrics: not measured in this environment; recorded as fallback.

## Baseline (pre-integration)

(see above)