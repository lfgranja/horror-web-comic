# Implementation Plan: Esteira Automatizada de Auditoria WCAG 2.2 AAA com Axe-Core para Playwright

**Branch**: `004-wcag-aaa-audit-pipeline` | **Date**: 2026-10-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-wcag-aaa-audit-pipeline/spec.md`

---

## Summary

Implementar a esteira automatizada de auditoria WCAG 2.2 AAA integrando a biblioteca `@axe-core/playwright@4.13.0` aos testes E2E do projeto (`tests/e2e/accessibility.spec.js`), focada nos projetos `desktop-chromium` ($1280 \times 720$) e `mobile-chromium` ($360 \times 800$), estruturada em três histórias de usuário fundamentais:
- **US1 (P1) Contraste AAA & Tokens**: Auditoria dos 5 temas visuais (`cinema`, `noir`, `eldritch`, `industrial`, `shadow-props`) exigindo contraste reforçado de pelo menos 7:1 (`color-contrast-enhanced`, SC 1.4.6) e 4.5:1 para texto grande em repouso no Estado 1: Repouso e Matriz de Temas (`resting`).
- **US2 (P2) Estados Interativos & Alvos de Toque**: Integridade semântica e física dos alvos de toque ($\ge 44 \times 44\text{px}$, SC 2.5.5 AAA com predicado de elegibilidade em repouso, suporte a múltiplos containers com `querySelectorAll`, tolerância de subpixel `EPSILON = 0.05` e timeout de 500ms para estabilização de animações finitas) através dos Estados: Estado 2: Sequência Narrativa Dinâmica (`dynamic-traversal`, traversal de quadros e live region debounced), Estado 3: Interação, Foco e Overlays (`interactive-audio`, scan único Axe no modal `#blocked-overlay` com armadilha de foco SC 2.4.12, `#player.inert = true`, e validações determinísticas Playwright sobre `#resume-overlay` operando com modal shielding com `aria-modal="true"`, `#player.inert = true` e confinamento de foco em `#resume-button`) e Estado 4: Fim da Narrativa (`end-state`, `#end-overlay` estritamente não-modal sem `aria-modal` perante FR-033 / Princípio VI com supressão prioritária de `#resume-overlay`).
- **US3 (P3) CI Budgets & Governança**: Execução determinística sem retentativas (`retries: 0`, sem `mode: 'serial'`), onde a duração total $\le 10.0\text{s}$ (`SC-004`) no viewport desktop de $1280 \times 720$ é um orçamento de execução verificado via timeout de teste do Playwright e métrica de telemetria anexada em `metrics.durationMs` (sem asserções in-test de duração `expect(duration).toBeLessThan(...)` e sem a exigência de `--workers=1` em CI; cada estado executa em aproximadamente $0.8\text{s}$ a $1.8\text{s}$ em paralelo sob `fullyParallel: true`); validação contratual estrita de esquemas JSON Draft 2020-12 compilada nos testes unitários Node (`tests/unit/audit-report-schema.test.js`) via `import Ajv2020 from 'ajv/dist/2020.js'` contra `audit-report.schema.json` e `failure-telemetry.schema.json` (os testes E2E do Playwright em `test.afterAll` e seus helpers não compilam Ajv dentro do browser ou worker de teste, limitando-se a aferir limites de tamanho de payload $\le 50\text{ KB}$ JSON / $\le 10\text{ KB}$ Markdown e integridade estrutural básica); tetos de payload ($\le 50\text{ KB}$ JSON, $\le 10\text{ KB}$ MD) e fechamento de governança na Spec 001.

A suíte adota uma **Arquitetura Ortogonal Desacoplada estruturada em 4 blocos de teste modulares** executados sob `fullyParallel: true` com padrão *Fresh Fixture* e *Eager Milestone Attachment*: embora a jornada narrativa do quadrinho seja modelada conceitualmente como uma progressão de estados sequenciais (Repouso, Sequência Dinâmica, Interação/Overlays, Fim da Narrativa), os 4 blocos de teste E2E no Playwright são completamente ortogonais, independentes e executam com fixtures limpas sem qualquer acoplamento de ordem ou estado compartilhado, sustentados por **helpers modulares desacoplados** em `tests/e2e/helpers/` (`axe-helper.js`, `target-size-helper.js`, `audit-attachment-helper.js`) gerados via scaffolding/templates base (Mandato 0) antes da lógica manual. A conformidade contratual dos artefatos é atestada estritamente por testes unitários Node (`tests/unit/audit-report-schema.test.js`) com validação de esquema compilada via `import Ajv2020 from 'ajv/dist/2020.js'` (`ajv@8.20.0`) contra `contracts/audit-report.schema.json` e `contracts/failure-telemetry.schema.json` (os testes E2E do Playwright em `test.afterAll` e seus helpers não compilam Ajv no browser/worker, limitando-se a aferir limites de tamanho de payload $\le 50\text{ KB}$ JSON / $\le 10\text{ KB}$ Markdown e integridade estrutural básica) e **Property-Based Testing (PBT)** com `fast-check` em `tests/unit/` validando invariantes algébricas fundamentais: round-trip do parser ($\text{JSON.parse}(\text{JSON.stringify}(report)) \equiv report$), invariantes estruturais da AST/formatação de Markdown sob violações arbitrárias, limites geométricos de alvos de toque com epsilon subpixel ($0.05$), limites estritos de razão de contraste ($[1.0, 21.0]$) e monotonicidade de luminância relativa, além de tetos orçamentários de payload ($\le 50\text{ KB}$). A suíte preserva intactos os testes pré-existentes (`wcag-audit.spec.js`, `contrast.spec.js`, `theme-a11y.spec.js`, `theme-contrast.spec.js`, `reduced-motion.spec.js`).

---

## Phases

Dois esquemas de numeração de fases coexistem nesta feature:
- **Fases do fluxo spec-kit**:
  - Phase 0: Pesquisa e Decisões de Arquitetura (`research.md`) — Concluída.
  - Phase 1: Design, Modelos e Contratos (`data-model.md`, `contracts/`, `quickstart.md`, `checklists/`) — Concluída.
  - Phase 2: Tarefas e Execução (`tasks.md`) — Próximo passo (`/speckit-tasks`).
- **Fases de implementação (autoritativas em `tasks.md`, alinhadas às User Stories)**:
  - Phase 1: Setup & Dependências Pinadas (`package.json`, preflight: pinagem estrita de `fast-check@3.23.2`, verificando os já instalados `@axe-core/playwright@4.13.0` e `ajv@8.20.0`).
  - Phase 2: Mandato 0 (Scaffolding e Geração de Templates), Testes Unitários/PBT e Fundação dos Helpers Modulares em `tests/e2e/helpers/`:
    - Geração de templates estruturais de teste e helpers antes de qualquer lógica manual.
    - Testes unitários de validação de esquema de contrato compilados estritamente no Node via `import Ajv2020 from 'ajv/dist/2020.js'` contra `specs/004-wcag-aaa-audit-pipeline/contracts/audit-report.schema.json` e `contracts/failure-telemetry.schema.json` (Draft 2020-12) em `tests/unit/audit-report-schema.test.js` (os testes E2E do Playwright em `test.afterAll` e seus helpers não compilam Ajv no browser/worker, limitando-se a validar limites de tamanho $\le 50\text{ KB}$ JSON / $\le 10\text{ KB}$ Markdown e integridade estrutural básica).
    - Testes Property-Based Testing (PBT) com `fast-check` em RED phase mecânica (`T009b`) cobrindo as quatro invariantes algébricas formais:
      1. *Round-trip do Parser*: validação algébrica de idempotência de serialização ($\text{JSON.parse}(\text{JSON.stringify}(report)) \equiv report$) provando ausência de corrupção ou omissão estrutural sob relatórios arbitrários (`tests/unit/audit-attachment-helper.test.js`).
      2. *Invariantes Estruturais da AST Markdown*: garantia de que, sob qualquer lista arbitrária de violações ou incompletos gerada por fuzzing, a formatação Markdown preserva os cabeçalhos normativos requeridos (`# Relatório de Auditoria WCAG 2.2 AAA`, `## 1. Métricas de Conformidade Axe-Core`, `## 3. Detalhamento de Violações Confirmadas`) e tabelas sintaticamente válidas com delimitadores balanceados (`|---|`) (`tests/unit/audit-attachment-helper.test.js`).
      3. *Limites Geométricos de Alvos de Toque e Tolerância de Subpixel*: prova de que alvos com $\min(w, h) < 44.0 - \text{EPSILON}$ (onde $\text{EPSILON} = 0.05$, ou seja, $< 43.95\text{px}$) são estritamente rejeitados e alvos com $w \ge 43.95\text{px} \land h \ge 43.95\text{px}$ são aceitos como conformes com SC 2.5.5 AAA sob quaisquer coordenadas de tela $(x, y)$ e transformações (`tests/unit/target-size-invariants.test.js`).
      4. *Limites de Contraste e Monotonicidade de Luminância*: prova algébrica de que para quaisquer cores RGB arbitrárias em $[0, 255]^3$, a razão de contraste satisfaz estritamente os limites $[1.0, 21.0]$ com simetria ($CR(c_1, c_2) = CR(c_2, c_1)$) e a luminância relativa $L(R, G, B)$ é monotonicamente não-decrescente em relação a cada canal de cor ($R_1 \le R_2, G_1 \le G_2, B_1 \le B_2 \implies L_1 \le L_2$), garantindo estabilidade matemática para os limiares normativos $\ge 7:1$ e $\ge 4.5:1$ (`tests/unit/contrast-invariants.test.js`).
    - Implementação de `tests/e2e/helpers/axe-helper.js` (instanciação e parametrização do `AxeBuilder` com tags WCAG 2.2 AAA e ativação explícita de `color-contrast-enhanced` e `target-size` via `.options()`, assegurando que todas as 73 regras normativas permaneçam ativas sem desativações arbitrárias; padronização de que todos os utilitários matemáticos e fotométricos de contraste `calculateContrastRatio`, `relativeLuminance` e `meetsContrastEnhanced` são exportados exclusivamente a partir de `tests/e2e/helpers/axe-helper.js`, eliminando qualquer menção ou dependência de `contrast-helper.js`, para satisfazer os testes de invariantes em `tests/unit/contrast-invariants.test.js`).
    - Implementação de `tests/e2e/helpers/target-size-helper.js` (Two-Tiered Target Size Engine: Axe SC 2.5.8 AA $\ge 24\text{px}$ + laço determinístico Playwright SC 2.5.5 AAA $\ge 44 \times 44\text{px}$ com predicado de elegibilidade em repouso, suporte a múltiplos containers com `querySelectorAll`, tolerância de subpixel `EPSILON = 0.05`, timeout de 500ms para estabilização de animações finitas, e descarte de nós ocultos/inertes).
    - Implementação de `tests/e2e/helpers/audit-attachment-helper.js` (filtragem contratual $\le 50\text{ KB}$ JSON / $\le 10\text{ KB}$ Markdown, serialização limpa de relatórios sem compilação Ajv em runtime E2E, Eager Milestone Attachment e gancho de diagnóstico `test.afterEach`).
  - Phase 3: User Story 1 (US1 P1) - Garantia Contínua de Acessibilidade Visual e Contraste AAA (Tokens & Matriz de 5 Temas):
    - Estado 1: Repouso e Matriz de Temas (`resting`) nos 5 Temas Visuais (`cinema`, `noir`, `eldritch`, `industrial`, `shadow-props`) exigindo contraste reforçado $\ge 7:1$ (normal) e $\ge 4.5:1$ (grande), validação de landmarks e barra de controles (desktop $1280 \times 720$ e mobile $360 \times 800$), gerando evidências canônicas com Eager Milestone Attachment em bloco de teste ortogonal sob `fullyParallel: true`.
  - Phase 4: User Story 2 (US2 P2) - Integridade de Estados Interativos e Alvos de Toque (Estados 2..4, Overlays e Target Sizes):
    - Estado 2: Sequência Narrativa Dinâmica (`dynamic-traversal`) & Traversal dos Quadros 1..4 no tema padrão (`cinema`), validando deterministicamente `aria-valuenow`, correspondência de `alt` e sincronização de debounce da live region `#frame-description` em bloco de teste ortogonal e independente sob `fullyParallel: true`.
    - Estado 3: Interação, Foco e Overlays (`interactive-audio`) (scan único Axe no modal `#blocked-overlay` com armadilha de foco SC 2.4.12, `#player.inert = true`, e validações determinísticas Playwright direcionadas sobre `#resume-overlay` operando com modal shielding com `aria-modal="true"`, `#player.inert = true` e confinamento de foco em `#resume-button`, contrastando com `#end-overlay` que permanece estritamente não-modal sem `aria-modal`, em bloco de teste ortogonal e independente sob `fullyParallel: true`).
    - Estado 4: Fim da Narrativa (`end-state`) (`#end-overlay` estritamente não-modal sem `aria-modal` perante FR-033 / Princípio VI, foco inicial em `#replay`, foco desobstruído SC 2.4.12, supressão de `#resume-overlay` por precedência absoluta e retorno a `#player` em bloco de teste ortogonal e independente sob `fullyParallel: true`).
    - Avaliação de Alvos de Toque ($\ge 44 \times 44\text{px}$) via `evaluateTargetSizes` com suporte a múltiplos containers (`querySelectorAll`), tolerância `EPSILON = 0.05` e timeout de 500ms para animações.
    - Semântica de Overlays em `index.html` (S2): Documentar explicitamente `aria-labelledby` em todos os overlays: `#blocked-overlay` (`aria-labelledby="blocked-title"`), `#resume-overlay` (`aria-labelledby="resume-title"`), e `#end-overlay` (`aria-labelledby="end-title"`).
    - Runtime Shielding e Test Harness em `player.js` / `main.js` (S1): Expor `window.__cinematicPlayer` e implementar o método público de harness `pauseForFocusLoss()` para suportar os testes E2E do Estado 3 (`interactive-audio`) sobre `#resume-overlay`; blindagem em tempo de execução com `#player.inert = true`, `aria-modal="true"` e confinamento de foco em `#resume-button` em `audio.js` e `player.js`, com devolução de foco para `#player` e restauração de `inert = false` ao dispensar/retomar, contrastando com `#end-overlay` que permanece estritamente não-modal sem `aria-modal`, executadas após verificação mecânica de RED gate (`T020b`). O comentário legado em `player.js:465-468` será atualizado nesta Fase 4 para refletir formalmente a arquitetura de modal shielding da Spec 004 (onde `#resume-overlay` opera com modal shielding `aria-modal="true"` e `#player.inert = true` com foco confinado em `#resume-button`, contrastando com `#end-overlay` que permanece estritamente não-modal).
  - Phase 5: User Story 3 (US3 P3) - Blindagem Automatizada no Pipeline de CI & Governança:
    - Verificação de orçamento de execução $\le 10.0\text{s}$ no projeto `desktop-chromium`: o teto temporal é um orçamento de execução operacional verificado via timeout de teste do Playwright e métrica de telemetria anexada em `metrics.durationMs`, sem asserções in-test de duração (`expect(duration).toBeLessThan(...)`) e sem restrição de `--workers=1` em CI. Cada estado executa em aproximadamente $0.8\text{s}$ a $1.8\text{s}$ em paralelo sob `fullyParallel: true`.
    - Validação de contratos de esquema JSON Draft 2020-12 isolada estritamente nos testes unitários Node (`tests/unit/audit-report-schema.test.js`) com `import Ajv2020 from 'ajv/dist/2020.js'`; os testes E2E do Playwright (`test.afterAll`) e seus helpers apenas serializam e anexam os artefatos filtrados via `testInfo.attach()`, verificando tetos de payload ($\le 50\text{ KB}$ JSON / $\le 10\text{ KB}$ MD) e integridade estrutural básica sem instanciar ou compilar Ajv dentro do browser ou worker de teste.
    - Fechamento formal dos itens automatizados de governança na Spec 001 (T144, T159, T176).
  - Phase 6: Polish & Verification Gate (Mandato 4):
    - Validação de comandos não-interativos do `quickstart.md` e execução do portão completo de CI (`npm run ci`).

---

## Technical Context

**Language/Version**: JavaScript (ES2022, vanilla ES modules), Node.js $\ge 20.0.0$

**Primary Dependencies**:
- `@axe-core/playwright`: pinado exatamente em `4.13.0` nas `devDependencies` de `package.json` (FR-001; já pré-existente no projeto).
- `@playwright/test`: `1.64.0` (já existente).
- `ajv`: `8.20.0` e `ajv-formats`: `3.0.1` (já existentes em `devDependencies`; compilação estrita de esquemas JSON Draft 2020-12 com suporte a `$defs` e `prefixItems` executada exclusivamente nos testes unitários Node via `import Ajv2020 from 'ajv/dist/2020.js'` em `tests/unit/audit-report-schema.test.js`; os testes E2E do Playwright em `test.afterAll` e seus helpers não compilam Ajv no browser/worker, limitando-se a aferir limites de tamanho de payload $\le 50\text{ KB}$ JSON / $\le 10\text{ KB}$ Markdown e integridade estrutural básica).
- `fast-check`: pinado exatamente em `3.23.2` nas `devDependencies` de `package.json` para Property-Based Testing (PBT) de invariantes geométricas, limites de contraste e limites de payload.
- **Zero novas dependências de runtime**: a aplicação de produção em `dist/` permanece 100% estática (Princípio II).

**Storage & Evidence Artifacts**:
- Sem banco de dados.
- Relatórios de auditoria e evidências: gerados em memória e persistidos como anexos estruturados (`application/json` e `text/markdown`) no relatório HTML do Playwright (`playwright-report/` e `test-results/`) via `testInfo.attach()`.
- **Teto Orçamentário de Artefatos**: filtragem contratual rigorosa omitindo nós brutos de `passes` e `inapplicable`. Teto de $\le 50\text{ KB}$ por JSON e $\le 10\text{ KB}$ por Markdown, garantindo $< 500\text{ KB}$ no aggregate da suíte e prevenindo bloat no CI.

**Testing Strategy & Test Topology**:
- **Fundação de Helpers Modulares (Mandato 0)**: Antes da escrita manual dos testes de estado, scaffolding e extração de módulos reutilizáveis e testáveis em `tests/e2e/helpers/`:
  - `axe-helper.js`: Centraliza a instanciação e parametrização do `AxeBuilder` com tags WCAG 2.2 AAA (`color-contrast-enhanced`, etc.) via `.options()`, garantindo que todas as 73 regras normativas do conjunto WCAG permaneçam ativas sem desativações arbitrárias. Exporta exclusivamente todos os utilitários matemáticos e fotométricos de contraste (`calculateContrastRatio`, `relativeLuminance`, `meetsContrastEnhanced`), padronizando que nenhum módulo avulso `contrast-helper.js` seja utilizado e satisfazendo os testes de invariantes em `tests/unit/contrast-invariants.test.js`.
  - `target-size-helper.js`: Implementa o *Two-Tiered Target Size Engine* combinando Axe SC 2.5.8 AA ($\ge 24\text{px}$) com o laço Playwright determinístico para WCAG 2.2 AAA SC 2.5.5 ($\ge 44 \times 44\text{px}$) dotado de predicado de elegibilidade em repouso (descarte de elementos com `aria-hidden="true"`, `hidden`, `display: none` ou `pointer-events: none`), suporte a múltiplos containers via `querySelectorAll`, tolerância de subpixel `EPSILON = 0.05` contra artefatos de renderização/arredondamento, e aguardo de estabilização de animações finitas com timeout de segurança de `500ms`.
  - `audit-attachment-helper.js`: Executa a filtragem contratual do payload ($\le 50\text{ KB}$ JSON, $\le 10\text{ KB}$ Markdown) e a serialização limpa de relatórios sem invocar o compilador Ajv dentro do browser ou worker de teste, realizando o anexo antecipado (*Eager Milestone Attachment*) e o gancho de diagnóstico `test.afterEach` (*Diagnostic Trap*).
- **Novo Arquivo Dedicado de Suíte E2E**: `tests/e2e/accessibility.spec.js` (portão algorítmico Axe-Core AAA consumindo os helpers modulares).
- **Configuração de Execução e Ortogonalidade dos Blocos**: `test.describe.configure({ retries: 0 })` (sem `mode: 'serial'` para prevenir abortos em cascata e assegurar retenção de evidências em todos os 4 estados através do isolamento *Fresh Fixture*). Enquanto a jornada narrativa da obra é modelada conceitualmente como uma progressão de estados sequenciais (Repouso, Sequência Dinâmica, Interação/Overlays, Fim), os 4 blocos de teste E2E no Playwright são completamente ortogonais, independentes e executam sob `fullyParallel: true`, instanciando cada um sua própria fixture limpa sem qualquer acoplamento temporal ou de ordem de execução. O teto de duração de $\le 10.0\text{s}$ (`SC-004`) no projeto `desktop-chromium` é um orçamento de execução verificado via timeout de teste do Playwright e métrica de telemetria anexada em `metrics.durationMs`, sem asserções in-test de duração (`expect(duration).toBeLessThan(...)`) e sem exigir `--workers=1` em CI. Cada um dos 4 estados atômicos executa em aproximadamente $0.8\text{s}$ a $1.8\text{s}$ em paralelo (`fullyParallel: true`), permitindo que a suíte execute com alto throughput e sem flakiness temporal.
- **Projetos Alvo & Viewports**:
  - `desktop-chromium`: $1280 \times 720$ (alinhado a `playwright.config.js` para respeitar os limites de assets leves de 1280w sem gerar distorções de densidade na resolução natural).
  - `mobile-chromium`: $360 \times 800$ (referência de densidade tátil móvel).
- **Comportamento Especializado do Estado 3: Interação, Foco e Overlays (`interactive-audio`)**:
  - Execução de um único escaneamento Axe-Core abrangente sobre a página enquanto o diálogo modal `#blocked-overlay` está ativo (com armadilha de foco, `aria-modal="true"`, `aria-labelledby="blocked-title"` perante SC 2.4.12).
  - Sob a Spec 004, `#resume-overlay` opera com blindagem modal completa (*modal shielding*, com `aria-modal="true"` e `#player.inert = true`) e confinamento estrito de foco no `#resume-button`, contrastando diretamente com `#end-overlay` que permanece estritamente não-modal (sem `aria-modal`) para assegurar a operabilidade contínua da navegação conforme FR-033 / Princípio VI.
  - Validações determinísticas Playwright direcionadas sobre o `#resume-overlay` (visibilidade, foco, dimensões de alvo de toque $\ge 44\text{px}$, semântica modal com `aria-modal="true"`, `#player.inert = true`, confinamento de foco em `#resume-button` e rotulagem `aria-labelledby="resume-title"`), prevenindo colisões ou conflitos de foco decorrentes de scans duplicados concorrentes.
  - Suporte a Test Harness E2E (S1): `src/scripts/main.js` e `src/scripts/player.js` expõem `window.__cinematicPlayer` e implementam o método público `pauseForFocusLoss()`, permitindo invocar deterministicamente o estado de suspensão de foco em `page.evaluate(() => window.__cinematicPlayer.pauseForFocusLoss())` durante o teste do Estado 3 sem manipulações artificiais de eventos do sistema operacional.
  - Atualização do Comentário Legado: O comentário legado em `player.js:465-468` (que descrevia o overlay de retomada como não-modal) será formalmente atualizado na Fase 4 para documentar a arquitetura de modal shielding da Spec 004 (`aria-modal="true"` e `#player.inert = true` com foco confinado em `#resume-button`, contrastando com `#end-overlay` não-modal).
- **Semântica ARIA e Marcação dos Overlays (`index.html`) (S2)**:
  - `#blocked-overlay`: Diálogo modal (`role="dialog"`, `aria-modal="true"`) com rotulagem acessível explícita `aria-labelledby="blocked-title"` apontando para seu título `h2#blocked-title`.
  - `#resume-overlay`: Diálogo modal (`role="dialog"`, `aria-modal="true"`) com rotulagem acessível explícita `aria-labelledby="resume-title"` apontando para seu título `h2#resume-title`, operando sob modal shielding com `#player.inert = true` e confinamento de foco no `#resume-button`.
  - `#end-overlay`: Diálogo não-modal (`role="dialog"`, estritamente sem o atributo `aria-modal` perante FR-033 / Princípio VI) com rotulagem acessível explícita `aria-labelledby="end-title"` apontando para `h2#end-title`.
- **Validação de Esquemas e Property-Based Testing (PBT) em `tests/unit/`**:
  - `tests/unit/audit-report-schema.test.js` executado nativamente pelo Node (`node --test`): compilação e validação estrita dos contratos de esquema JSON Draft 2020-12 contra `contracts/audit-report.schema.json` e `contracts/failure-telemetry.schema.json` via `import Ajv2020 from 'ajv/dist/2020.js'` (Ajv 8.20.0 com `ajv-formats`). O compilador Ajv é invocado estritamente nesta camada unitária Node, garantindo que os testes E2E do Playwright (`test.afterAll`) e seus helpers não compilem Ajv dentro do browser ou worker de teste, limitando-se a serializar, anexar e validar limites de tamanho de payload ($\le 50\text{ KB}$ JSON, $\le 10\text{ KB}$ Markdown) e integridade estrutural básica.
  - Property-Based Testing com `fast-check` cobrindo as seguintes invariantes algébricas fundamentais:
    1. *Round-trip do Parser* (`tests/unit/audit-attachment-helper.test.js`): para qualquer relatório de auditoria válido gerado via `fc.record(...)`, prova a invariante algébrica de idempotência de serialização $\text{JSON.parse}(\text{JSON.stringify}(report)) \equiv report$, assegurando ausência de mutações, campos espúrios ou omissão de dados estruturais.
    2. *Invariantes Estruturais da AST Markdown* (`tests/unit/audit-attachment-helper.test.js`): para relatórios contendo números arbitrários de violações (0 a 100+) e nós afetados gerados por fuzzing, prova que a formatação Markdown gerada sempre preserva os cabeçalhos obrigatórios (`# Relatório de Auditoria WCAG 2.2 AAA`, `## 1. Métricas de Conformidade Axe-Core`, `## 3. Detalhamento de Violações Confirmadas`) e tabelas sintaticamente válidas com delimitadores balanceados (`|---|`), mantendo o tamanho sob o teto de $\le 10\text{ KB}$.
    3. *Limites Geométricos de Alvos de Toque e Tolerância de Subpixel* (`tests/unit/target-size-invariants.test.js`): geração de bounding boxes arbitrárias $(w, h, x, y)$ sob float provando que alvos com $\min(w, h) < 44.0 - \text{EPSILON}$ (com $\text{EPSILON} = 0.05$, ou seja, $< 43.95\text{px}$) são infalivelmente rejeitados e alvos com $w \ge 43.95\text{px} \land h \ge 43.95\text{px}$ são aceitos sob SC 2.5.5 AAA, demonstrando invariância estrita sob quaisquer coordenadas de translação $(x, y)$.
    4. *Limites de Razão de Contraste e Monotonicidade de Luminância* (`tests/unit/contrast-invariants.test.js`): para cores RGB arbitrárias em $[0, 255]^3$, prova os limites estritos $\forall c_1, c_2: 1.0 \le CR(c_1, c_2) \le 21.0$, a simetria $CR(c_1, c_2) = CR(c_2, c_1)$, a identidade $CR(c, c) = 1.0$, e a monotonicidade da luminância relativa ($\forall (R_1, G_1, B_1), (R_2, G_2, B_2): R_1 \le R_2 \land G_1 \le G_2 \land B_1 \le B_2 \implies L_1 \le L_2$ com codomínio estrito $L \in [0.0, 1.0]$), garantindo a estabilidade matemática dos limiares de $\ge 7:1$ e $\ge 4.5:1$.
    5. *Limites Orçamentários de Payload* (`tests/unit/audit-attachment-helper.test.js`): geração de relatórios com volumes arbitrários de nós/violações provando que o payload filtrado nunca excede o teto orçamentário de $\le 50\text{ KB}$ JSON.
- **Servidor Web Local**: Gerenciado exclusivamente por `scripts/serve-e2e.mjs` com suporte integral a HTTP Range (RFC 7233) para requisições de áudio.
- **Coexistência Modular**: Preservação integral e sem churn de:
  - `tests/e2e/wcag-audit.spec.js` (testes comportamentais de teclado físico, anéis de foco e safe areas móveis da Spec 001).
  - `tests/e2e/contrast.spec.js` (amostragem fotométrica por pixel rasterizado via Sharp, foco visível SC 2.4.7/2.4.13 e não-textual SC 1.4.11).
  - `tests/e2e/theme-a11y.spec.js` (ergonomia de `.sr-only` e `forced-colors: active`).
  - `tests/e2e/theme-contrast.spec.js` (contraste matemático de tokens de tema).
  - `tests/e2e/reduced-motion.spec.js` (`prefers-reduced-motion: reduce`).

**Target Platform**: Linux (CI `ubuntu-latest`), macOS e Windows (desenvolvimento). Execução focada nos projetos Chromium do Playwright.

**Performance Goals**:
- Duração total $\le 10.0\text{s}$ em passagem única (`retries: 0`) no projeto `desktop-chromium` a $1280 \times 720$ (SC-004): orçamento de execução operacional verificado via timeout de teste do Playwright e métrica de telemetria anexada em `metrics.durationMs` (sem asserções in-test de duração `expect(duration).toBeLessThan(...)` e sem exigência de `--workers=1` em CI).
- Throughput em execução paralela: cada estado executa em aproximadamente $0.8\text{s}$ a $1.8\text{s}$ em paralelo (`fullyParallel: true`), operando confortavelmente abaixo do teto global.
- Orçamentos de produção (`budget.json`) e tempos LCP/CLS congelados e inalterados.

**Constraints**:
- Pinagem estrita sem ranges semver (`package.json` sem `^` ou `~`, validado por `scripts/preflight.mjs`).
- Escopo documental completo (`page` sem restrição de `.include()`).
- Fail-fast para violações objetivas (`violations.length === 0`); warn-only com `console.table` para `incomplete`.
- Delimitação explícita do assertor algorítmico, mantendo aberto o escopo manual da Spec 001 com participantes humanos.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Justificativa |
| :--- | :---: | :--- |
| **I. Experiência Cinematográfica (NÃO NEGOCIÁVEL)** | ✅ PASS | O player, o controle de ritmo, as transições visuais e o formato cinematográfico permanecem 100% inalterados. A esteira audita a obra sem interferir na narrativa. |
| **II. Médium Definido (HTML, CSS, JS e Imagens)** | ✅ PASS | Nenhuma dependência é adicionada ao runtime de produção. A dependência `@axe-core/playwright@4.13.0` reside estritamente nas `devDependencies` para automação de testes. |
| **III. Mobile-First e Responsividade Universal** | ✅ PASS | A esteira audita explicitamente o projeto `mobile-chromium` no viewport 360×800 com densidade tátil, garantindo que nenhum alvo seja inferior a $44\text{px}$ e que a barra de controles se adapte perfeitamente. |
| **IV. Performance e Orçamento de Ativos (NÃO NEGOCIÁVEL)** | ✅ PASS | A esteira de testes não adiciona bytes ao bundle distribuível e executa em $\le 10\text{ segundos}$ no CI (`SC-004`), respeitando todos os orçamentos de CPU e tempo de pipeline. |
| **V. Qualidade Visual e Sonora** | ✅ PASS | A esteira audita os 5 temas visuais comprovando contraste $\ge 7:1$ para conforto visual sem halação, e verifica os estados de som ativo por padrão e diálogo de áudio bloqueado (`#blocked-overlay`). |
| **VI. Controle do Usuário e Acessibilidade** | ✅ PASS | É o núcleo da feature: fornece blindagem matemática contínua para WCAG 2.2 AAA (contraste reforçado 1.4.6, alvos táteis 2.5.5, semântica ARIA 4.1.2/1.3.1, foco desobstruído 2.4.12) sem excluir nenhum usuário de tecnologias assistivas. |

**Constitution Check Result**: ✅ ALL PASS — Conformidade plena com os 6 princípios da Constituição v2.1.0. Zero desvios ou exceções necessárias.

### Architectural Scoping Justification (Cross-Suite Matrix Preservation)

- **Justificativa Arquitetural para ARC-001 (Chromium Scoping)**:
  - A suíte de auditoria algorítmica Axe-Core e avaliação geométrica de alvos de toque (`tests/e2e/accessibility.spec.js`) restringe sua execução aos projetos `desktop-chromium` ($1280 \times 720$) e `mobile-chromium` ($360 \times 800$) através da guarda declarativa canônica **ARC-001** (`test.skip(({ project }) => !['desktop-chromium', 'mobile-chromium'].includes(project.name))`).
  - **Decisão Algorítmica de Escopo Sem Colisão Constitucional**: A delimitação ARC-001 é uma decisão estritamente algorítmica de escopo de teste para a esteira Axe-Core, evitando duplicações computacionais desnecessárias e prevenindo colisões terminológicas com emendas ou desvios constitucionais. Não há qualquer desvio aos Princípios III (Mobile-First e Responsividade Universal) ou VI (Controle do Usuário e Acessibilidade).
  - **Racional de Performance e Fidelidade de Renderização**: Em runners Linux com 2 vCPUs e em ambientes de CI, o motor WebKit opera sob WPE (software-rasterized, sem aceleração de GPU por hardware e suscetível a incompatibilidades de bibliotecas como ICU em distribuições Linux não-Debian), enquanto o Firefox e WebKit executam as mesmíssimas regras de tokens CSS gerando duplicação desnecessária de carga de CPU sem acréscimo de detecção de acessibilidade estrutural DOM/ARIA. A execução concentrada no Chromium fornece cálculo matemático e computado de CSS com 100% de fidelidade dentro do orçamento estrito de $\le 10\text{s}$ (`SC-004`).
  - **Preservação Integral da Matriz de Navegadores nas Suítes Legadas**: A restrição pontual de `accessibility.spec.js` NÃO degrada a cobertura multiplataforma exigida pela Constituição (Princípio III e VI). A matriz completa de 5 projetos Playwright (`desktop-chromium`, `desktop-firefox`, `desktop-webkit`, `mobile-chromium`, `mobile-webkit`) continua rigorosamente coberta e preservada pelas suítes funcionais e comportamentais pré-existentes:
    - `tests/e2e/wcag-audit.spec.js`: Valida navegação real por teclado, focus-trapping e safe-areas nos 5 projetos.
    - `tests/e2e/contrast.spec.js`: Valida contraste fotométrico rasterizado por amostragem de pixels com Sharp nos 5 projetos.
    - `tests/e2e/theme-a11y.spec.js` e `tests/e2e/theme-contrast.spec.js`: Asseguram adaptação de temas, contraste de tokens e alto contraste forçado (`forced-colors`) em toda a matriz.
    - `tests/e2e/reduced-motion.spec.js`: Assegura preferências de movimento reduzido em toda a matriz.

---

## Project Structure

### Documentation & Design Artifacts (this feature)

```text
specs/004-wcag-aaa-audit-pipeline/
├── spec.md                       # Especificação do Requisito com 14 Clarificações Aprovadas
├── plan.md                       # Este arquivo (Plano de Implementação)
├── research.md                   # Fase 0: Pesquisa, Evidências Científicas e Decisões Técnicas
├── data-model.md                 # Fase 1: Modelo de Dados, Entidades de Auditoria e Máquina de Estados
├── quickstart.md                 # Fase 1: Guia Executável de Validação Local e em CI
├── contracts/                    # Fase 1: Contratos Formais de Interface
│   ├── audit-report.schema.json  # Esquema JSON do Artefato Anexado via testInfo.attach()
│   ├── failure-telemetry.schema.json # Esquema JSON da Telemetria de Falha no Diagnostic Trap
│   └── test-suite-api.md         # Contrato da API CLI, Matriz de Projetos e Regras AxeBuilder
├── checklists/                   # Checklists de Qualidade de Requisitos
│   ├── requirements.md           # Checklist de Qualidade da Spec (16/16 Aprovado)
│   ├── audit-evidence.md         # Retenção de Evidências, Relatórios e Governança (25/25 Aprovado)
│   ├── ci-pipeline.md            # Integração em CI, Desempenho e Toolchain (25/25 Aprovado)
│   ├── dynamic-states.md         # Estados Dinâmicos, Overlays e Traversal (25/25 Aprovado)
│   └── wcag-aaa-rules.md         # Regras Normativas WCAG AAA e Portões (25/25 Aprovado)
└── tasks.md                      # Fase 2: Decomposição de Tarefas de Implementação (próximo passo)
```

### Source Code & Test Topology

```text
package.json                      # MODIFICADO: + devDependency "fast-check": "3.23.2" (nota: "@axe-core/playwright": "4.13.0" já pré-existente)
package-lock.json                 # MODIFICADO: Lockfile v3 sincronizado e validado

tests/
├── e2e/
│   ├── accessibility.spec.js     # NOVO: Portão dedicado do motor Axe-Core WCAG 2.2 AAA (5 temas, Two-Tiered alvos 44px, estados dinâmicos)
│   ├── helpers/                  # NOVO: Helpers modulares desacoplados (Mandato 0)
│   │   ├── axe-helper.js         # NOVO: Instanciação e calibração do AxeBuilder (tags AAA, regras estritas) e exportação exclusiva de utilitários matemáticos de contraste (calculateContrastRatio, relativeLuminance, meetsContrastEnhanced; sem contrast-helper.js)
│   │   ├── target-size-helper.js # NOVO: Two-Tiered Target Size Engine (SC 2.5.5 AAA >= 44x44px, predicado de repouso)
│   │   └── audit-attachment-helper.js # NOVO: Filtragem contratual (<= 50 KB JSON, <= 10 KB MD), Eager Attachment e Diagnostic Trap
│   ├── wcag-audit.spec.js        # INALTERADO: Teste comportamental de teclado real, foco e safe-area
│   ├── contrast.spec.js          # INALTERADO: Auditoria fotométrica rasterizada via Sharp
│   ├── theme-a11y.spec.js        # INALTERADO: Acessibilidade de componentes e forced-colors: active
│   ├── theme-contrast.spec.js    # INALTERADO: Contraste matemático de tokens de tema
│   └── reduced-motion.spec.js    # INALTERADO: Emulação de prefers-reduced-motion: reduce
├── fixtures/
│   └── audit/                    # NOVO: Fixtures válidas e inválidas de relatórios de auditoria
└── unit/
    ├── storage.test.js           # INALTERADO: Teste unitário de persistência
    ├── audit-report-schema.test.js # NOVO: Validação de esquema Draft 2020-12 compilada estritamente no Node com Ajv2020
    ├── target-size-invariants.test.js # NOVO: PBT de limites geométricos de alvos de toque e epsilon subpixel (0.05) com fast-check
    ├── contrast-invariants.test.js # NOVO: PBT de limites de contraste ([1.0, 21.0]) e monotonicidade de luminância com fast-check
    ├── axe-helper.test.js        # NOVO: Teste unitário para axe-helper (AxeBuilder factory)
    ├── target-size-helper.test.js # NOVO: Teste unitário para target-size-helper (avaliador de target size)
    └── audit-attachment-helper.test.js # NOVO: Teste unitário e PBT (parser round-trip, AST Markdown sob violações e tetos <= 50 KB / <= 10 KB) com fast-check
```

---

## Complexity Tracking

| Complexidade Adicionada | Justificativa (Princípio II — Médium Definido) |
| :--- | :--- |
| Dependências `devDependencies`: `fast-check@3.23.2` (+ devDependency) e `@axe-core/playwright@4.13.0` (já pré-existente) | Necessárias para auditoria automatizada WCAG 2.2 AAA com motor Axe-Core industrial e Property-Based Testing (PBT) de invariantes geométricas e tetos de bytes. Não afetam o runtime de produção em `dist/`. Pinned exato sem semver ranges. |
| Scaffolding e Helpers Modulares (`tests/e2e/helpers/`) | Desacopla a parametrização do Axe, o Two-Tiered Target Size Engine e a anexação contratual de evidências antes da escrita de testes de estado (Mandato 0), garantindo modularidade, facilidade de manutenção e testabilidade unitária. |
| Validação de Contrato com Ajv estrita em Testes Unitários e PBT | Compilação do esquema Draft 2020-12 isolada no Node (`tests/unit/audit-report-schema.test.js`) desonerando workers E2E (cujo `test.afterAll` e helpers apenas serializam, anexam e validam tetos $\le 50\text{ KB}$ JSON / $\le 10\text{ KB}$ MD e integridade estrutural básica sem compilação Ajv); testes PBT provam algebricamente o parser round-trip, estrutura da AST Markdown, limites de alvos táteis ($\ge 44\text{px}$, epsilon $0.05$), razão de contraste ($[1.0, 21.0]$) e tetos orçamentários ($\le 50\text{ KB}$). |
| Viewport Desktop em $1280 \times 720$ | Alinhamento rigoroso com `playwright.config.js` e com o teto de 1280w dos assets leves, evitando que slots de 1440vw acionem redimensionamento artificial ou quebrem asserções de largura natural de outras suítes. |
| Novo arquivo de teste `tests/e2e/accessibility.spec.js` | Isola o portão do motor Axe-Core, evitando inchar os testes existentes e viabilizando a execução em $\le 10\text{s}$ com foco nos projetos Chromium em paralelo sem retentativas, com duração validada por timeout e telemetria. |
| Two-Tiered Target Size Engine com Predicado Estrito | Necessário porque o motor do Axe-Core avalia apenas 24px (AA SC 2.5.8); a verificação programática Playwright com suporte a múltiplos containers (`querySelectorAll`), tolerância de subpixel `EPSILON = 0.05`, timeout de segurança de 500ms para estabilização de animações finitas e descarte de nós ocultos/inertes é indispensável para atestar 44px (AAA SC 2.5.5). |
| Arquitetura Dual de Overlays e Verificação do Estado 3 (`interactive-audio`) | Necessária para harmonizar a prevenção de obscurecimento de foco (WCAG 2.2 AAA SC 2.4.12) em diálogos modais com a garantia de operabilidade contínua da navegação ao término da história (FR-033 / Princípio VI). No Estado 3: Interação, Foco e Overlays (`interactive-audio`), realiza scan único Axe no modal `#blocked-overlay` e validações Playwright direcionadas no `#resume-overlay` (operando sob modal shielding `aria-modal="true"`, `#player.inert = true` e confinamento de foco no `#resume-button`, contrastando com `#end-overlay` que permanece estritamente não-modal sem `aria-modal`, disparado deterministicamente via harness `pauseForFocusLoss()` sob `window.__cinematicPlayer`). O comentário legado em `player.js:465-468` será atualizado na Fase 4 para refletir esta arquitetura de blindagem modal da Spec 004. |
| Anexação Antecipada e Diagnostic Trap | Garante que nenhuma evidência de teste seja perdida em abortos intermediários no CI, com teto de $\le 50\text{ KB}$ por JSON. |

---

*Fim do Plano de Implementação (Fase 1 Concluída).*