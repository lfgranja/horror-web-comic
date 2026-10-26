# Decision: Esteira Automatizada de Auditoria WCAG 2.2 AAA com Axe-Core para Playwright

- **Slug**: wcag-aaa-audit-pipeline
- **Decided**: 2026-10-24T17:36:00-04:00
- **Verdict**: go
- **Artifacts reviewed**: intake.md | research.md | problem.md | concept.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | strong | O Princípio VI da Constituição exige conformidade estrita com WCAG 2.2 AAA; atualmente não há checagem de CSS computado/layout para os 5 temas, deixando tarefas T144, T159 e T176 dependentes de inspeções manuais vulneráveis a regressões silenciosas. |
| Evidence strength | strong | Pesquisa empírica profunda no registro npm confirmou `@axe-core/playwright@4.13.0` como compatível com Node >=20 e Playwright 1.64.0; comportamento de `color-contrast-enhanced` (7:1) e `target-size` (44px) comprovado via documentação oficial W3C/Deque. |
| Value vs. inaction | strong | Automatizar a auditoria nos 5 temas economiza horas de inspeção manual repetitiva, protege leitores com fotofobia/baixa visão e encerra tarefas técnicas abertas da Spec 001 com evidência objetiva. |
| Feasibility / appetite fit | strong | A Opção A tem apetite `small` (1-2 dias) e risco técnico mínimo, aproveitando 100% da infraestrutura do Playwright já em execução no projeto. |
| Strategic fit | strong | Alinhamento total com a Constituição (Princípio VI inegociável), sem impacto no bundle de produção (dependência estrita de dev/teste) e preservando a arquitetura Vanilla ES Modules. |
| Risk posture | strong | Riscos de falsos positivos mitigados por espera ativa de estabilização do DOM e isolamento com `.include('#player')`; risco de quebra de engine Node 20 neutralizado pela fixação na versão 4.13.0. |

## Verdict & Rationale

O veredito é **go**. A proposta resolve uma carência constitucional real do projeto (Princípio VI) através de uma abordagem 80/20 de alto impacto e baixo esforço (Opção A). Todas as premissas técnicas foram empiricamente validadas: a versão exata do pacote foi selecionada sem violar o piso do Node 20, as tags normativas para contraste 7:1 foram mapeadas e a estratégia contra falsos positivos está delimitada. O scorecard obteve avaliação `strong` em todos os 6 critérios. Aprovado formalmente para o ciclo de especificação técnica via `/speckit.specify`.

## If go — Handoff to `/speckit-specify`

- **Problem**: Falta de auditoria contínua e automatizada de propriedades de CSS computado (contraste reforçado de 7:1, áreas de toque de $44 \times 44\text{px}$ e semântica ARIA) para os 5 temas e estados interativos, exigindo verificações manuais das tarefas T144, T159 e T176.
- **Chosen approach**: Option A — Suíte E2E Focada em Chromium com Axe-Core (`@axe-core/playwright@4.13.0` com tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `wcag2aaa`, varrendo os 5 temas e 4 estados dinâmicos em `desktop-chromium` e `mobile-chromium`).
- **In scope / out of scope**:
  - *In scope*: Adição pinada de `@axe-core/playwright@4.13.0` em devDependencies do `package.json`; criação do spec `tests/e2e/accessibility.spec.js`; ciclo completo pelos 5 temas visuais; teste dos estados interativos (repouso, dropdown de temas aberto, modal de autoplay bloqueado, overlay de fim de narrativa); asserção estrita de zero violações impeditivas em CI.
  - *Out of scope*: Execução redundante em WebKit/Firefox para cálculos matematicamente idênticos de tokens de cor; avaliações de redação subjetiva de `alt` text (mantidas nos estudos de usabilidade T171/T172); alterações na paleta de cores a menos que uma falha real de 7:1 seja detectada.
- **Success metrics**: Zero violações bloqueantes de WCAG 2.2 AAA em todos os temas e estados dinâmicos; 100% dos 5 temas auditados automaticamente a cada execução de CI; tempo adicional de teste $\le 10\text{s}$.
- **Carried-forward open questions**:
  - Validação empírica de eventuais diagnósticos `incomplete` do axe-core em viewports ultra-estreitos (320px) para determinar se devem ser tratados como avisos no log ou bloqueios.
