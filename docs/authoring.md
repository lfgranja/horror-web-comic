# Authoring Guide

## Baseline (pre-integration)

Values to be filled by T005a/T005b.

## Fluxo de autoria

Passo-a-passo: criar no app → exportar → media-src/ → pipeline → validar.

## Ferramentas e versão "testada-com"

vectorcraft (version TBD). Áudio: any stable DAW (WAV).

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

T011b result: vectorcraft binary not available; synthetic fallback used. Risk recorded.

## Baseline (pre-integration)

(see above)