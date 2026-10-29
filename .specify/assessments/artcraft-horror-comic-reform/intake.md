# Idea Intake: Reformular o horror web comic com a suite ArtCraft

- **Slug**: artcraft-horror-comic-reform
- **Created**: 2026-10-17T05:20:07Z
- **Source**: https://github.com/orgs/storytold/repositories (allowlisted host; URL Trust Policy branch: allowlisted)
- **Type**: improvement

## Idea (as captured)

> "Reformular todo o horror web comic com a utilização dos recursos pela suite de aplicativos ArtCraft (https://github.com/orgs/storytold/repositories), todos já instalados localmente e com CLI para todos."
>
> Fetched source (sanitized URL: https://github.com/orgs/storytold/repositories): página pública da organização `storytold` ("ArtCraft") listando 66 repositórios públicos, entre eles os aplicativos da suíte (craft-launcher, designcraft, photocraft, pdfcraft, figcraft, filmcraft, vectorcraft, effectcraft, lightcraft, cadcraft, gridcraft, soundcraft, deckcraft, wordcraft, artcraft, animcraft, etc.), além de bibliotecas (craft-libs, craft-ai-integrations, craft-fonts) e serviços (artcraft-services). O usuário afirma que todos esses aplicativos já estão instalados localmente e possuem CLI para todos.

## Restated

Proposta de reformular a totalidade do horror web comic (conteúdo, assets e/ou pipeline de produção) aproveitando os recursos da suíte de aplicativos ArtCraft (organização `storytold`), cujos binários e CLIs o usuário declara já instalados localmente. O escopo exato (quais apps, quais artefatos, em que etapa do pipeline) não está especificado na ideia original.

## Origin & Context

- **Raised by**: Usuário / Stakeholder do projeto (mesmo padrão das intakes anteriores do repositório)
- **Trigger**: Disponibilidade local da suíte ArtCraft (binários + CLIs) e a percepção de que seus recursos podem substituir ou enriquecer o pipeline atual de geração de frames/áudio/assets do comic.

## First-Glance Unknowns

- [NEEDS CLARIFICATION: Quais aplicativos da suíte ArtCraft seriam usados (designcraft, vectorcraft, photocraft, filmcraft, effectcraft, soundcraft, lightcraft, pdfcraft, wordcraft, deckcraft, cadcraft, gridcraft, artcraft, animcraft, figcraft) e para quais artefatos (frames SVG/PNG, áudio, tipografia, layout, composição, exportação)?]
- [NEEDS CLARIFICATION: A reformulação atinge apenas os assets em `media-src/`/`assets/` e o manifesto `src/data/story.json`, ou também o player (`src/scripts/*`) e o pipeline de build (`scripts/build*.mjs`)?]
- [NEEDS CLARIFICATION: Haverá migração/geração automatizada via CLIs (headless) integrada ao `npm run build:images`/`build`, ou uso manual dos apps como ferramentas de autoria?]
- [NEEDS CLARIFICATION: Como a adoção afeta os orçamentos rígidos de `budget.json` (initialSceneBytes, perFrameBytes, totalAssetsBytes, compressedCodeBytes, compressedStyleBytes) e os formatos de entrega (AVIF/WebP/fallback + srcset)?]
- [NEEDS CLARIFICATION: O resultado deve manter compatibilidade com o schema v1 do manifesto e os testes E2E/Perf existentes, ou está prevista uma mudança de contrato?]
- [NEEDS CLARIFICATION: Quais licenças/termos da suíte (Apache 2.0) e dos assets gerados se aplicam à redistribuição no repositório publicado?]
- [NEEDS CLARIFICATION: Há restrições de plataforma/CI (os binários ArtCraft são GUI+CLI multiplataforma; o CI roda ubuntu-latest) para execução headless nos runners?]
