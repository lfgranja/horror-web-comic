# Problem Definition: Esteira Automatizada de Auditoria WCAG 2.2 AAA com Axe-Core para Playwright

- **Slug**: wcag-aaa-audit-pipeline
- **Created**: 2026-10-24
- **Inputs used**: intake.md | research.md

## Problem Statement

O projeto estabelece conformidade estrita com a norma **WCAG 2.2 AAA** em sua Constituição (Princípio VI), porém atualmente não dispõe de nenhum mecanismo automatizado no pipeline de CI/E2E capaz de auditar propriedades computadas de layout e renderização (como contraste reforçado de 7:1, áreas mínimas de toque de $44 \times 44\text{px}$ e semântica ARIA dinâmica) nos 5 temas visuais da aplicação. Como consequência, a garantia de acessibilidade depende de inspeções manuais demoradas e propensas a falhas (tarefas T144, T159 e T176), deixando temas secundários e estados interativos vulneráveis a regressões silenciosas que prejudicam a legibilidade para leitores com baixa visão, fotofobia ou deficiências motoras.

## Affected Users & Stakeholders

- **Users**: 
  - Leitores com fotofobia, baixa visão, astigmatismo ou daltonismo que necessitam de contraste estrito ($\ge 7:1$) e ausência de halação para consumir a narrativa confortavelmente.
  - Usuários que navegam exclusivamente por teclado ou utilizam tecnologias assistivas (leitores de tela) que dependem de foco visível, live regions íntegras e alvos táteis mínimos ($\ge 44 \times 44\text{px}$).
- **Stakeholders**:
  - Mantenedor do projeto / Desenvolvedor: Necessita de um portão de qualidade determinístico e automatizado em CI para blindar o código contra regressões visuais e eliminar o esforço de inspeções manuais repetitivas a cada alteração de CSS ou tokens.

## Goals

- Automatizar a verificação contínua dos critérios programaticamente mensuráveis da norma WCAG 2.2 nível AAA em tempo de execução via Playwright.
- Cobrir 100% dos 5 temas visuais (`cinema`, `noir`, `eldritch`, `industrial`, `shadow-props`) em estados de repouso e estados interativos (diálogo de autoplay bloqueado, controles com foco/dropdown aberto e tela final de narrativa).
- Fornecer relatórios determinísticos de violação (com nós do DOM afetados e razões de contraste calculadas) que falhem o CI em caso de regressão objetiva.
- Eliminar a necessidade de auditorias manuais para os critérios técnicos das tarefas T144, T159 e T176 da Spec 001.

## Non-Goals

- Avaliar critérios subjetivos, cognitivos ou de compreensão humana (ex.: qualidade literária do `alt` ou compreensão narrativa sem áudio), os quais continuam sob escopo exclusivo dos estudos empíricos com participantes humanos (Fase 3 do roadmap / T171 e T172).
- Auditar elementos nativos do navegador ou do sistema operacional (como a barra de menus do OS ou menus de contexto nativos).
- Redesenhar a identidade estética dos temas caso não haja violação técnica comprovada da WCAG 2.2 AAA.

## Success Metrics

- **Zero violações impeditivas de WCAG 2.2 AAA** no motor `axe-core` em todos os 5 temas visuais e estados interativos mapeados (baseline: cobertura automatizada de CSS computado inexistente).
- **100% dos temas cobertos por teste contínuo** em cada execução de `npm run test:e2e` ou script dedicado (baseline: 0% automatizado, apenas Lighthouse no tema padrão).
- **Tempo de execução da suíte de acessibilidade $\le 15\text{ segundos}$** no CI, sem degradação do tempo de entrega (baseline: N/A).

## Cost of Inaction

Se este problema não for resolvido, qualquer refatoração em `tokens.css` ou `player.css` corre o risco de introduzir regressões sutis de contraste ou redução de áreas de clique que passem despercebidas para a equipe, violando o Princípio VI da Constituição. Além disso, as tarefas técnicas T144, T159 e T176 da Spec 001 permanecerão como um passivo documental aberto ou dependerão de dispendiosas verificações manuais a cada ciclo de lançamento.

## Open Questions

- [NEEDS CLARIFICATION: A esteira de acessibilidade deve rodar em todos os navegadores da matriz (Chromium, Firefox, WebKit) ou concentrar-se nos viewports desktop/mobile em Chromium para maximizar a velocidade do pipeline, visto que as regras de CSS de tokens são homogêneas?]
- [NEEDS CLARIFICATION: Como lidar com eventuais diagnósticos 'incomplete' do axe-core resultantes de imagens de fundo ou gradientes sutis: devem ser tratados como avisos (warnings) ou bloqueios estritos?]
