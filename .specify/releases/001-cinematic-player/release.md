# Release — 001-cinematic-player

- **Slug:** 001-cinematic-player
- **Spec:** `specs/001-cinematic-player/spec.md`
- **Gate:** R7
- **Tipo:** estado de cadeia SDD
- **Data:** 2026-11-11
- **Status:** **NOT READY / PENDING** (R4 não aprovado integralmente)

## Validação (R4)

- `.specify/validations/001-cinematic-player/validate.md`: **CONDITIONAL / NOT APPROVED (parcial)**. Bloqueios: evidências manuais/usabilidade n≥10, auditoria WCAG AAA com AT real, matriz browser/orientação/dispositivo certificada (incl. WebKit/Safari reais), FPS referência SC-018 em contexto certificável, e demais itens abertos (33) em `tasks.md`.
- Baseline: `docs/governance/sdd-chain-baseline.json` registra `release_status=not_ready`.

## Escopo / versão (SemVer)

- **Não declarado para release SDD** enquanto R4 integral estiver pendente. Registro de governança apenas; não implica publicação/tag.

## Changelog

- **Pendente de consolidação de release** (aguardando R4 aprovado e fechamento de evidências). Implementação incremental existe no produto; changelog formal de release da spec será emitido quando aplicável.

## Rollback

- N/A para este registro (sem release SDD aprovado). Rollback de mudanças de produto segue histórico git/PRs e gates de CI.

## Comunicação

- **Mantenedores:** tratar 001 como **parcial/condicionada**; consultar `validate.md`, `tasks.md` e escalonamentos `ESC-HWC-20261111-002/003` antes de declarar conformidade integral.

## Próximo passo

1. Produzir/registrar evidências pendentes e fechar tasks aplicáveis.
2. Atualizar `validate.md` para APPROVED (quando suportado) e então emitir release R7 com changelog/versão/rollback/comunicação completos.
