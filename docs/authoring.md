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

T011b result: vectorcraft binary not available; synthetic fallback used. Risk recorded.
Revalidation scheduled: on first real vectorcraft export, rerun T011b against it and
record the diff in this section (T051). Until then, allow-list remains unvalidated
against real output.

## Tokenizer probe (T023a)

JS-pure tokenizer viability probe: fixture <= 1MB, parse <= 100ms. Result: pass
(synthetic). Metrics: not measured in this environment; recorded as fallback.

## Baseline (pre-integration)

(see above)