# Validação de Entrega: 005-korean-horror-mechanics

- **Slug:** 005-korean-horror-mechanics
- **Spec:** `specs/005-korean-horror-mechanics/spec.md`
- **Plan:** `specs/005-korean-horror-mechanics/plan.md`
- **Tasks:** `specs/005-korean-horror-mechanics/tasks.md`
- **Gate:** R4
- **Tipo:** avaliação de estado atual (cadeia SDD com baseline explícita)
- **Data:** 2026-11-11
- **Resultado:** **BLOCKED / NOT APPROVED** — R4 **não** satisfeito

> **Baseline:** `docs/governance/sdd-chain-baseline.json` aceita `validate_status=blocked` e `release_status=blocked` para esta spec (sem aprovação falsa) até evidência WebKit/CI verde.

## Pré-requisitos

- `spec.md`, `plan.md`, `tasks.md`, `checklists/` presentes.
- Tasks: **1 aberta / 55 concluídas** (56 total). **T047** permanece aberta (gate de verificação `npm run ci`).

## Evidência disponível

| Fonte | Evidência | Status |
|---|---|---|
| `specs/005-korean-horror-mechanics/tasks.md` | 55/56 concluídas (Fases 1–6 e convergência registradas); T047 aberta com registro de falha CI | PARCIAL |
| Implementação (presente no repo/histórico) | Módulos/manifests/entradas/UI/efeitos/testes da spec integrados conforme fases registradas (ex.: sensory taxonomy/mode, catalog, memory illusion, FX/CSS, storage particionado, testes unit/E2E adicionados) | PRESENTE (conforme tasks/commits) |
| Estado atual do repo (2026-11-11, `dev@222a775`); contagem atualizada em 2026-11-12 (`dev@ffa3445` + fixes do ciclo) | `npm run -s validate` PASS; `npm run -s test:unit` **246/246** (2026-11-12) PASS | PASS (regressão global/local) |
| CI `dev` (evidência bloqueadora) | Run **#42825569449** (2026-11-10, merge #180) **failure**: `webkit-layout-gate` falhando em `tests/e2e/zz-end-state-coverage.spec.js:16` @320x568 (end overlay intercepta controles); `gate` failure na matriz E2E. Run **#43020030961** (#181) **failure**: matriz E2E com 26 testes falhando em todos os motores (`sync`, `theme-persistence`, `theme-switcher`, `persistence-flow`, `zz-end-state-coverage` WebKit/Firefox); `webkit-layout-gate` passou nesse run. Causa raiz identificada: loop cross-tab de escrita sensorial/tema (main.js re-persistia modo remoto; storage.js re-notificava e reescrevia tema) — reproduzido localmente a 100% CPU; correção committed em `fix/spec005-cross-tab-sync-loop` (PR #182, com fix do end overlay ffa3445 e pin ubuntu-24.04). | **FAIL → corrigida, aguardando run de CI verde em dev** |
| Worktree local | Correção para end-overlay/altura de barra existe como alteração pré-existente não commitada (`src/scripts/player.js`, `src/styles/player.css` + bug fix/test docs) — **sem evidência WebKit/CI verde** | NÃO VERIFICADO em CI |

## Bloqueios que impedem aprovação R4

- **T047 não satisfeita:** `npm run ci` verde em `dev` não comprovado. Falha reproduzida em CI (#42825569449, #43020030961); causa raiz corrigida (PR #182) — promoção depende de run verde.
- Correção pendente de validação em runner compatível/CI e de integração intencional (commit/PR) com evidência — ver `ESC-HWC-20261111-001`.

## Veredito

**NOT APPROVED (BLOCKED).** Não aprovar R4/release enquanto T047/CI verde não forem comprovados.

## Próximo passo

1. Validar correção no `webkit-layout-gate`/`npm run ci` (runner/CI compatível) e obter run verde em `dev`.
2. Com evidência verde: fechar T047, atualizar este `validate.md` para APPROVED (citando run/jobs) e então emitir R7.
