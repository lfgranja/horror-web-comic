# Release — 005-korean-horror-mechanics

- **Slug:** 005-korean-horror-mechanics
- **Spec:** `specs/005-korean-horror-mechanics/spec.md`
- **Gate:** R7
- **Tipo:** estado de cadeia SDD
- **Data:** 2026-11-11
- **Status:** **BLOCKED** (R4 não aprovado)

## Validação (R4)

- `.specify/validations/005-korean-horror-mechanics/validate.md`: **BLOCKED / NOT APPROVED**.
- Bloqueio principal: **T047** aberta; CI `dev` **#42825569449** (2026-11-10) e **#43020030961** (merge #181) falharam — causa raiz principal: loop cross-tab de escrita sensorial/tema; correção committed em `fix/spec005-cross-tab-sync-loop` (PR #182, end overlay ffa3445 + loop 65b6c45 + CI pin ubuntu-24.04 220332e). Evidência WebKit/CI verde pendente.
- Baseline: `docs/governance/sdd-chain-baseline.json` registra `release_status=blocked`.

## Escopo / versão (SemVer)

- **Não declarado para release SDD** enquanto R4 estiver bloqueado. Sem tag/publicação por esta adoção.

## Changelog

- **Pendente** (aguardando R4 aprovado). Escopo implementado conforme tasks concluídas (sensory mode/advisory/dialog, catálogo/progresso, memory illusion, FX/CSS, storage particionado, testes) — consolidação formal de changelog/IDs na emissão do release após evidência verde.

## Rollback

- N/A para este registro. Mitigação imediata: manter correção sob validação CI; rollback de integração via git se necessário após merge futuro.

## Comunicação

- **Mantenedores:** tratar 005 como **bloqueada para release** até evidência CI verde (ESC-HWC-20261111-001). Não promover conformidade sem run verde citado.

## Próximo passo

1. Obter `npm run ci` verde (incl. `webkit-layout-gate`) em `dev`.
2. Aprovar R4 com evidência e emitir release R7 completo.
