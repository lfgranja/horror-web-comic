# ROADMAP.md — horror-web-comic

Roadmap orientado a **Outcomes (Resultados Mensuráveis)** e priorizado pela metodologia **ICE / 80-20 (Impacto × Confiança ÷ Esforço)**. Cada marco especifica o objetivo de negócio/leitor, o comando Speckit associado e os critérios de validação.

> **Atualizado em:** 2026-11-12.
> **Branch defaults:** `dev` (`origin/dev` @ `222a775`).
> **Verificado em 2026-11-11/12:** `npm run validate` PASS; `npm run report` COMPATIBLE (0 findings); `npm run build:images` PASS; `npm run build` PASS; `npm run test:unit` **237/237** (branch de fix) / **246/246** (com a camada de governança).
> **PRs abertos:** #182 (fix(ci): loops cross-tab + pin Ubuntu, aguardando merge autorizado — WebKit layout evidence OK) e #183 (governança MDMV, gate SDD/telemetria/drift/registry, aguardando merge autorizado).
> **Bugs:** **31/31** completos (`assessment.md` + `fix.md` + `test.md`).

## 1. Estado atual do projeto (evidência)

| Área | Estado | Evidência |
|---|---|---|
| Produto / runtime | vanilla, estático, sem backend | `index.html`/`alojamento.html`, `src/scripts/*` |
| Especificações | 001 **195/228**, 002 **26/26** (R4 **rebaixado** 2026-11-12), 003 **68/68**, 004 **63/63**, 005 **55/56** (T047 aberta) | `specs/*/tasks.md` |
| CI em `dev` | **vermelho** em #42825569449/#43020030961 (2026-11-10/11; matriz E2E 25–26 falhas). Causa raiz (loops cross-tab `hwc.sensoryMode`/`hwc.theme`) corrigida em PR #182 | `gh run view …`; `src/scripts/storage.js`, `src/scripts/main.js` |
| PR #182 (fix) | `webkit-layout-gate` **success**; `gate` E2E **1349/1350** (única falha SC-005 fixed em `2fd0be6`); `macos-webkit-compositor` **success** em rerun | run 43134037388 / 43140031261 |
| Governança MDMV (PR #183) | Gate SDD R4/R7 endurecido (+9 testes); telemetria `--strict-redaction`; 025 exceção explícita; CODEOWNERS completo; registros honestos (002) | PR #183 |
| Matriz E2E | mobile/desktop-chromium, mobile/desktop-webkit, desktop-firefox | `playwright.config.js` |

## 2. O que está planejado

### A. Engenharia de produto (Specs 001-005)

| Lacuna | Observação | Dono |
|---|---|---|
| **Spec 001** (195/228) | 33 tarefas abertas: usabilidade n≥10, WCAG AAA manual/AT real, matriz browser/orientação/dispositivo, SC-018 com aparelho real, registros | Humano + evidência automatizada parcial |
| **Spec 005 T047** | Verificar `npm run ci` verde integralmente (pós-merge de #182/#183) | Automação (CI) |
| **Spec 005 validate** | Promoção de R4 condicionada após CI verde; R7 ao final | Humano (release) |
| **Spec 002 validate** | Promoção de R4 somente após evidência E2E verde sustentada (rebaixada 2026-11-12) | Automação (CI + review humano) |
| **Spec 004 / a11y** | Cobertura automatizada atual (axe-core) cobre subconjunto; complementar com AT manual | Humano |

### B. Qualidade de entrega e CI

| Lacuna | Observação | Referências |
|---|---|---|
| **Runner WebKit** | Fedora local bloqueado por ABI libjpeg (pré-existente); WebKit gilt através de CI (Linux WPE + macos-15) | `AGENTS.md`, `docs/delivery.md` |
| **Lighthouse** | Não concluído sob a cadeia falha atual; depende de E2E verde | `.lighthouserc.json` |
| **Governança MDMV** | Camada adotada (PRs #182/#183); **enforcement** (required checks) **não configurado** (decisão/admin) — ver ESC-HWC-20261111-004 | `docs/governance/satellite-adoption-checklist.md` |
| **policy 025** | Não adotada (exceção explícita auditável no satellite-manifest) | `docs/governance/satellite-manifest.json` |

### C. Qualidade humana e backlog

| Lacuna | Observação |
|---|---|
| **Revisão estética de masters** | Pendente no contexto de qualidade visual (`frames-low-quality`) |
| **Assessment `artcraft-horror-comic-reform`** | `needs-clarification`; promoção a SDD bloqueada até clarificação/decisão |
| **48 issues abertas (#31–#78)** | Backlog a priorizar; não assumir resolução sem evidência/merge |

## 3. Próximos passos priorizados (ICE / 80-20)

| Prioridade | Iniciativa (outcome) | Critério mensurável | Tipo |
|---:|---|---|---|
| 1 | **Merge autorizado de #182** (ou equivalente) e **CI verde em `dev`** | `gate` (E2E matriz + perf + trailers + lighthouse) **success** em run em `dev`; `webkit-layout-gate` e `macos-webkit-compositor` mantém-se verdes | Humano (review/merge) + CI |
| 2 | **Fechar Spec 005 T047** e marcar `[x]` com run verde; fechar ESC-HWC-20261111-001 | T047 concluída com referência ao run CI verde | Automação (após #1) |
| 3 | **Merge autorizado de #183** (camada MDMV) | SDD gate/policy-drift/telemetry-ingest verdes em PR; docs de governança no `dev` | Humano (review/merge) + CI |
| 4 | **Fechar convergência de registros (002/005/test.md)** com o run verde | `validate.md`/`release.md` 002 re-graduado se sustentado; SC-018 não regressado em macos | Automação (após #1/#3) |
| 5 | **Completar evidência automatizável da spec 001** (registros/avisos/testes/auditorias automatizadas); delega o resto a humanos | Processos com evidência no próprio fluxo | Automação parcial |
| 6 | **Triagem do backlog 48 issues** | Triagem inicial categorizada (blocantes/técnicos/humanos) com critérios | Humano + automação |

**Foco 80/20:** o desbloqueio de maior alavancagem agora é **#1 → #2 → #3**, pois reabilita sinal de regressão confiável e propicia fechamento da Spec 005; as demais lacunas permanecem dependentes de evidência humana/dispositivo/matriz.
