# Release — 004-wcag-aaa-audit-pipeline

- **Slug:** 004-wcag-aaa-audit-pipeline
- **Spec:** `specs/004-wcag-aaa-audit-pipeline/spec.md`
- **Gate:** R7
- **Tipo:** retroativo (governança SDD)
- **Data:** 2026-11-11
- **Status:** **RELEASED (retroativo)**

## Validação (R4)

- `.specify/validations/004-wcag-aaa-audit-pipeline/validate.md` — **APPROVED** (retroativo, escopo automatizado, limites `[NV]`).

## Escopo / versão (SemVer)

- Esteira automatizada de auditoria de acessibilidade (subconjunto Axe/Playwright conforme spec) integrada ao repositório de testes/gates. Registro retroativo; versionamento/publicação seguem histórico em `dev`.

## Changelog (síntese rastreável)

- **FRs/tasks:** `specs/004-wcag-aaa-audit-pipeline/{spec,plan,tasks}.md` (T001–T055 concluídas): helpers axe, invariantes (contraste/alvos), cobertura de estados/temas/viewports, verificação dual-viewport e integração com suites de teste conforme escopo automatizado.
- **Evidência:** tarefas concluídas + artefatos presentes + regressão global `validate`/`test:unit` 234/234 (2026-11-11); 246/246 (2026-11-12, após fixes do gate/telemetria/storage). Execução E2E/Lighthouse isolada `[NV]` nesta rodada.

## Rollback

- Reverter commits da feature e ajustar suites/gates dependentes; `npm run test:unit`/`test:e2e` e CI permanecem como referência de integridade.

## Comunicação

- **Mantenedores:** pipeline e limites (automatizado vs AT/manual) documentados na spec; uso em CI/evolução de testes.
- **Usuários:** impacto indireto (qualidade/a11y verificada por automação no escopo suportado).

## Limitações

- Retroativo; escopo limitado a regras automatizadas suportadas; re-execução isolada `[NV]` nesta rodada.
