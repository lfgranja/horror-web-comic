# Concept: Esteira Automatizada de Auditoria WCAG 2.2 AAA com Axe-Core para Playwright

- **Slug**: wcag-aaa-audit-pipeline
- **Created**: 2026-10-24
- **Recommended option**: Option A — Suíte E2E Focada em Chromium com Axe-Core (Abordagem 80/20)

## Options

### Option A — Suíte E2E Focada em Chromium com Axe-Core (Abordagem 80/20)
- **Sketch**: Adicionar `@axe-core/playwright@4.13.0` como dependência dev exata e introduzir uma especificação de teste E2E dedicada (`tests/e2e/accessibility.spec.js`) executada nos projetos `desktop-chromium` e `mobile-chromium`. O teste percorre os 5 temas visuais e os estados dinâmicos (repouso, dropdown de tema aberto, modal de autoplay bloqueado e overlay de fim de narrativa), configurado com as tags WCAG 2.2 AAA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `wcag2aaa`) e asserção rigorosa de zero violações.
- **Appetite**: `small` (1 a 2 dias).
- **Trade-offs**:
  - *Ganhos*: Entrega 100% da verificação matemática objetiva dos critérios WCAG 2.2 AAA (especialmente contraste de 7:1 via `color-contrast-enhanced` e alvos de toque $\ge 44 \times 44\text{px}$) em todos os 5 temas da aplicação; adiciona apenas ~5s a 10s no tempo total de teste; aproveita a estabilidade do Chromium para cálculo preciso de CSS computado sem divergências de renderização de fontes.
  - *Sacrifícios/Riscos*: Não executa o scanner nos navegadores WebKit e Firefox (embora os tokens de CSS sejam idênticos em todas as engines, peculiaridades específicas de fontes do sistema dessas plataformas não seriam auditadas em tempo real).
- **Rabbit holes**: Tentar auditar elementos enquanto transições de fade ainda estão ocorrendo no DOM (gerando leituras incorretas de opacidade); tentar aplicar asserts fora do contêiner `#player`.

---

### Option B — Matriz de Auditoria Completa nos 5 Navegadores com Pipeline Dedicado (`npm run test:a11y`)
- **Sketch**: Criar um script npm dedicado (`npm run test:a11y`) e configurar a execução do `@axe-core/playwright` em todos os 5 projetos da matriz (Desktop Chromium, Desktop Firefox, Desktop WebKit, Mobile Chromium, Mobile WebKit). Cada navegador carrega a história, cicla pelos 5 temas e valida os estados dinâmicos de forma exaustiva.
- **Appetite**: `medium` (1 semana).
- **Trade-offs**:
  - *Ganhos*: Máxima evidência formal multiplataforma, provando que nem Firefox nem WebKit divergem na interpretação do contraste de cores computadas.
  - *Sacrifícios/Riscos*: Multiplica o tempo de execução por 5 na esteira de CI; o WebKit Linux (WPE em software rasterizer) pode introduzir flutuações de tempo ou timeouts em execuções concorrentes com outros testes.
- **Rabbit holes**: Lidar com diferenças de métricas de renderização de fontes locais entre o WPE WebKit e o Chromium no Linux headless; aumento significativo do tempo de CI.

---

### Option C — Auditoria via Lighthouse CI Estendido com User Flows
- **Sketch**: Não introduzir o pacote `@axe-core/playwright`. Em vez disso, estender o `lighthouserc.json` existente e criar scripts Puppeteer/User Flows para instruir o Lighthouse CI a alternar os temas e coletar o relatório de acessibilidade embutido do Chrome.
- **Appetite**: `small` (1 a 2 dias).
- **Trade-offs**:
  - *Ganhos*: Nenhuma dependência nova em `package.json`; aproveita o runner `lhci autorun` já presente no projeto.
  - *Sacrifícios/Riscos*: O Lighthouse CLI não suporta a regra `color-contrast-enhanced` de nível AAA por padrão (avalia estritamente o nível AA de 4.5:1); não permite filtragem cirúrgica por tags WCAG 2.2; relatórios do LHCI são pesados e difíceis de integrar a asserções booleanas rápidas no terminal.
- **Rabbit holes**: Tentar reprogramar os presets internos do Lighthouse para forçar regras AAA que o motor padrão omite.

---

## Recommendation

Recomenda-se a **Option A (Suíte E2E Focada em Chromium com Axe-Core — Abordagem 80/20)**.

### Racional:
1. **Atendimento Direto às Metas Constitucionais**: É a única opção de baixo esforço que suporta nativamente a regra `color-contrast-enhanced` (7:1) e `target-size` (44×44px) nos 5 temas com filtragem exata de tags (`wcag2aaa`).
2. **Máximo Retorno com Menor Esforço (80/20)**: Reutiliza 100% da infraestrutura do Playwright existente em `tests/e2e/`, mantendo a suíte rápida, determinística e facilmente integrável aos portões `npm run test:e2e` e `npm run ci`.
3. **Isolamento de Risco**: Evita a sobrecarga desnecessária de rodar o mesmo cálculo puramente matemático de CSS em 5 engines distintas (Option B) e contorna as limitações de auditoria do Lighthouse (Option C).

---

## Out of Scope (para a opção recomendada)

- Execução da varredura de acessibilidade nos runners de Firefox e WebKit (a suíte foca nos projetos Chromium Desktop e Mobile).
- Validação qualitativa de redação ou inteligibilidade humana de `alt` text ou legendas descritivas (mantido sob os estudos humanos T171/T172).
- Redesenho de elementos visuais caso os tokens atuais já atinjam a razão de contraste $\ge 7:1$.

---

## Assumptions to Validate

1. Todos os 5 temas visuais definidos em `src/styles/tokens.css` atingem no mínimo 7:1 de contraste de texto normal sobre seus respectivos fundos escuros.
2. A inclusão de `@axe-core/playwright@4.13.0` em `devDependencies` passa limpa pelo portão `npm run preflight` (pins exatos no `package.json` e espelhamento no `package-lock.json`).
3. O seletor de tema (`#theme`) e os botões de navegação sustentam alvos mínimos $\ge 44 \times 44\text{px}$ sem gerar quebras de layout ou deslocamentos em telas de 320px.
