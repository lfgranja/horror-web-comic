# Idea Intake: Esteira Automatizada de Auditoria WCAG 2.2 AAA com Axe-Core para Playwright

- **Slug**: wcag-aaa-audit-pipeline
- **Created**: 2026-10-24
- **Source**: pasted text
- **Type**: compliance

## Idea (as captured)

> "Iniciando o intake da esteira automatizada de auditoria WCAG 2.2 AAA com Axe-Core para Playwright)
> 
> #### Por que este é o nosso 80/20 (maior avanço com menor esforço)?
> 
> 1. Maior Salto de Qualidade e Conformidade Constitucional:
> O Princípio VI da constituição estabelece conformidade com WCAG 2.2 AAA. Uma esteira automatizada com @axe-core/playwright varre de forma matemática e contínua os critérios técnicos mais rigorosos:
>  • Contraste reforçado de 7:1 (color-contrast-enhanced) nos 5 temas da história.
>  • Áreas mínimas de toque de 44 × 44px (target-size).
>  • Integridade de atributos ARIA e live regions.
> Isso automatiza e valida de uma só vez as pendências das tarefas T144, T159 e T176, eliminando a necessidade de inspeções visuais manuais para esses critérios técnicos.
> 2. Menor Esforço Técnico:
> Toda a infraestrutura de navegadores e orquestração do Playwright já está pronta em tests/e2e/. A implementação exige apenas uma dependência de desenvolvimento (@axe-core/playwright) e um spec de teste dedicado."

## Restated

Integrar `@axe-core/playwright` à infraestrutura existente de testes E2E do projeto para auditar e assegurar de forma automatizada e contínua os critérios técnicos mensuráveis de acessibilidade WCAG 2.2 AAA (contraste reforçado de 7:1, áreas de toque mínimas de 44×44px e integridade de roles/atributos ARIA) em todos os 5 temas visuais da aplicação.

## Origin & Context

- **Raised by**: Mantenedor / Desenvolvedor do projeto via fluxo de planejamento do Spec-Kit
- **Trigger**: Conclusão da convergência da Spec 001 e necessidade de cumprir de forma automatizada e auditável o Princípio VI da Constituição (`.specify/memory/constitution.md`) em conformidade com WCAG 2.2 AAA, acelerando a resolução das tarefas técnicas T144, T159 e T176.

## First-Glance Unknowns

- [NEEDS CLARIFICATION: Qual versão exata do `@axe-core/playwright` deve ser pinada no `package.json` para manter compatibilidade com Playwright 1.64.0 e a política de dependências exatas do projeto?]
- [NEEDS CLARIFICATION: A esteira deve bloquear o build em CI imediatamente para todas as violações AAA, ou ter um estágio de calibração para exceções documentadas de tokens visuais?]
- [NEEDS CLARIFICATION: Como orquestrar as transições e estados interativos (diálogo de desbloqueio de áudio, dropdown aberto, overlay de fim de narrativa) para que o `AxeBuilder` analise os DOMs renderizados de cada estado?]
- [NEEDS CLARIFICATION: A execução dos testes de acessibilidade fará parte de `npm run test:e2e` ou existirá um script dedicado `npm run test:a11y` integrado ao `npm run ci`?]
- [NEEDS CLARIFICATION: Qual é o impacto esperado no tempo total de execução da matriz de CI?]
