# Release — 002-theme-switcher

- **Slug:** 002-theme-switcher
- **Spec:** `specs/002-theme-switcher/spec.md`
- **Gate:** R7
- **Tipo:** retroativo (governança SDD) — suspenso
- **Data:** 2026-11-12
- **Status:** **NOT READY** (retroativo suspenso — R4 não sustentado)

## Validação (R4)

- `.specify/validations/002-theme-switcher/validate.md` — **CONDITIONAL / NOT APPROVED** (limites `[NV]`; E2E `theme-persistence`/`theme-switcher` vermelho em #42825569449 e #43020030961; correção de loop cross-tab em PR #182 aguardando evidência verde).

## Escopo / versão (SemVer)

- Feature de UI integrada ao produto (theme switcher, 5 atmosferas, persistência/sincronização conforme spec). Registro retroativo; versionamento/publicação do produto seguem o repositório e histórico em `dev` (sem tag criada nesta adoção).

## Changelog (síntese rastreável)

- **FRs/tasks:** implementação conforme `specs/002-theme-switcher/{spec,plan,tasks}.md` (T001–T026 concluídas): controle de atmosfera, temas/tokens, persistência/sincronização, conformidade de layout/a11y prevista na spec, integrado ao player.
- **Evidência:** tarefas concluídas + presença de implementação + regressão global `validate`/`test:unit` (234/234 em 2026-11-11; 246/246 em 2026-11-12). E2E/perf/lighthouse específicos por feature **não sustentaram** o veredito retroativo — ver validate.md; correção em PR #182 pendente de run verde.

## Estado autoritativo

R7 **não** está autorizado nesta revisão. A remissão de histórico anterior ("RELEASED retroativo") não é sustentada por evidência E2E; rebaixamento deliberado para evitar aprovação falsa.

## Rollback

- Reverter commits da feature no histórico git e reconstruir (`npm run build`); estado de preferência de tema em storage do cliente é tolerante a ausência do controle (fallback de tema/default conforme produto).

## Comunicação

- **Mantenedores:** contratos em spec/plan/tasks/checklists; mudanças afetam UI/estilos/storage de tema.
- **Usuários:** nova capacidade de seleção/persistência de atmosfera visual (quando presente na build entregue).

## Limitações

- Retroativo; sem re-execução isolada completa de E2E/perf/Lighthouse nesta validação `[NV]`.
