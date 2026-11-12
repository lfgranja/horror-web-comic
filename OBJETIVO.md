# OBJETIVO.md — horror-web-comic

> **Atualizado em:** 2026-11-12.
> **Branches:** `dev` @ `222a775` (`origin/dev`). Correções em `fix/spec005-cross-tab-sync-loop` (PR #182, commits `ffa3445`, `65b6c45`, `220332e`, `2fd0be6`) e camada de adoção MDMV em `chore/governance-adoption` (PR #183). **CI `dev` atual: #43020030961 (failure)** — causa raiz identificada (loop cross-tab de escrita sensorial/tema) e corrigida em PR #182; validação completa pendente de merge autorizado + run `dev`.

## Visão

Player cinematográfico de quadros em HTML, CSS e JavaScript vanilla, **estático e sem backend**, que entrega narrativas em quadrinhos animadas com áudio, acessibilidade e desempenho, verificáveis por portões automatizados (preflight, validate, unit, build:images, build, e2e, perf, lighthouse), conforme manifesto/contratos do projeto.

## Objetivo final (definição de “pronto”)

O projeto está “pronto” quando, **simultaneamente**:

1. **`npm run ci` passa integralmente** em `ubuntu-latest` (cadeia/gates do workflow, incluindo matriz E2E, perf e etapas de conformidade aplicáveis) — **não comprovado em `dev` após o último fix**. Runs: `#42825569449` (2026-11-10, `webkit-layout-gate` falho @320x568); `#43020030961` (2026-11-11, matriz E2E 26 testes falhos — sync/theme/persistence em todos os motores). Causa raiz: loops cross-tab de escrita `hwc.sensoryMode`/`hwc.theme` (reprodução local a 100% CPU em duas abas; correção local-only + dedupe + remoção de write-back; testes unitários de regressão). Correção commitada (PR #182); verificação WebKit/Firefox/Chromium requer CI em runner compatível.
2. **Matriz de 5 projetos Playwright** (mobile/desktop-chromium, mobile/desktop-webkit, desktop-firefox) passando — **parcial**: em #43134037388 (`pull_request` body `ubuntu-24.04`, 2026-11-12): `webkit-layout-gate` **success**; `gate` E2E → **1349 passed / 1 failed** (falha única: `theme-switcher.spec.js` SC-005 em mobile-chromium, falso positivo do probe rAF; corrigido em `2fd0be6` — 6/6 runs locais verdes); `macos-webkit-compositor` passou no rerun 43140031261.
3. **Lighthouse**: performance ≥ 0,9, acessibilidade ≥ 0,95, CLS ≤ 0,1, LCP ≤ 2500 ms — bloqueado pela falha E2E na cadeia (gate não alcança perf/trailers/lighthouse) — **verificação pendente** pós-merge com run verde.
4. **WCAG 2.2 AAA** manual (teclado, leitores de tela reais, 200% reflow) — **pendente humano**; perna automatizada (axe-core, Spec 004) implementada.
5. **Estudos de usabilidade** (≥ 10 participantes) — **não executados** (dependem de participantes humanos).
6. **Gates de autoria/entrega** verdes para masters — **verde** (spec 003).
7. **Atestação final** registrada — **presente** (`specs/003-artcraft-local-authoring/attestation.md`).

## Quanto do caminho já percorremos

### Produto e base técnica (verificado 2026-11-12)

- Player estático vanilla (ES modules, sem backend/framework) com manifestos `src/data/story.json` ("A Casa que Respira") e `stories/o-alojamento.json`, catálogo `src/data/catalog.json`.
- `npm run validate` → **pass** (2026-11-12); `npm run report` → **COMPATIBLE**; `npm run build` → **pass**; `npm run build:images` → **pass**.
- `npm run test:unit` → **237/237** at fix branch (incluindo 3 testes de regressão cross-tab); **246/246** com a camada de governança (9 testes do SDD gate).
- E2E local (desktop-chromium), 2026-11-11/12: `tests/e2e/sync.spec.js` **7/7**, `tests/e2e/theme-persistence.spec.js` **4/4**, `tests/e2e/persistence-flow.spec.js` **6/6**, `tests/e2e/zz-end-state-coverage.spec.js` **passing** (incl. 320x568/360x800/1440x900), `tests/e2e/theme-switcher.spec.js` **5/5** (9/9 combined with persistence), `tests/e2e/sensory-*.spec.js` **8/8**.

### Fluxo Speckit (verificado 2026-11-12)

- **Constituição:** `.specify/memory/constitution.md` v2.1.0.
- **Specs:** `001-cinematic-player` **195/228**, 33 abertas; `002-theme-switcher` **26/26** (R4 **rebaixado** para CONDITIONAL/NOT APPROVED em 2026-11-12 porque seus próprios E2E estavam vermelhos — PR #183); `003-artcraft` **68/68** (+ attestations); `004-wcag-aaa-audit-pipeline` **63/63**; `005-korean-horror-mechanics` **55/56** — **T047** aberta até evidência verde de CI.
- **Bugs (`.specify/bugs/`, 31 diretórios):** **31/31** completos com `assessment.md` + `fix.md` + `test.md` após o registro dos dois casos WebKit 320x568 (2026-11-11, status `pending` → registrar verificação verde com a execução real).

## O que ainda falta

### Automatizável (bloqueadores técnicos imediatos)

1. **Merge autorizado de #182** (revisão humana + merge no `dev`) → **fechar T047** no run pós-merge.
2. **Merge autorizado de #183** (camada de governança MDMV: gate SDD R4/R7 endurecido, telemetria `--strict-redaction`, 025 como exceção explícita, CODEOWNERS completo, registros 002/005 honestos, registry de escalonamentos).
3. **End-to-end verde em `dev` com evidência** (todas as fases: preflight, validate, unit, build:images, build, E2E matriz, perf budgets, trailers, lighthouse). `webkit-layout-gate` e `macos-webkit-compositor` verdes em #182. `gate` E2E → 1349/1350 com a correção SC-005.
4. **Registro pós-fix**: atualizar `tasks.md` (T047), bugs WebKit 320x568 (resultado `verified`) com os runs que passarem; `ESC-HWC-20261111-001` (a fechar).

### Dependente de humanos (não automatizável)

1. **Usabilidade** (n ≥ 10) — áudio + compreensão sem áudio.
2. **WCAG 2.2 AAA manual** — teclado, AT reais, 200% reflow.
3. **Matriz e dispositivos reais** — WebKit/Safari físico.
4. **Certificação FPS em hardware real** — SC-018.
5. **Issue #78 e backlog** — 48 issues abertas (#31–#78); priorização humana/review.

## Fontes de verificação e pesquisa (alta confiabilidade)

- Repositório/comandos (2026-11-11/12): `git status`, `gh pr list`, `gh run view`, `npm run validate|report|build:images|build|test:unit`. Artefatos: `.specify/memory/constitution.md`, `specs/*/tasks.md`, `.specify/bugs/*`.
- **Acessibilidade:** [W3C WCAG 2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/); [WCAG 2.2 ISO/IEC 40500:2025](https://www.w3.org/WAI/news/2025-10-21/wcag22-iso/).
- **Performance:** [web.dev vitals](https://web.dev/articles/vitals) — LCP ≤ 2,5 s, CLS ≤ 0,1, INP ≤ 200 ms (p75).
- **Cross-browser:** [Playwright CI](https://playwright.dev/docs/ci); WebKit Bugzilla 326648 (hit-test fixo invisível); GitHub Actions runner images (`ubuntu-latest` migração 24.04→26.04, `runs-on` pinnings justificados no workflow).
