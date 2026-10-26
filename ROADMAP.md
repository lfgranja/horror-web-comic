# ROADMAP.md — horror-web-comic

Roadmap orientado a **Outcomes (Resultados Mensuráveis)** e priorizado pela metodologia **ICE / 80-20 (Impacto × Confiança ÷ Esforço)**. Cada marco especifica o objetivo de negócio/leitor, o comando Speckit associado e os critérios de validação.

---

## 1. Visão Geral do Progresso

```
[██████████████████████████████░░░░] 80% Conclusão Global
  - Escopo Técnico & Código:    99% [███████████████████████████████]
  - Verificação Automatizada:   96% [██████████████████████████████░]
  - Validação Humana / Física:  25% [████████░░░░░░░░░░░░░░░░░░░░░░]
```

- **O que já percorremos:** Todo o motor de execução (player cinematográfico, áudio multi-pista com ducking, 5 atmosferas dramáticas, pipeline de autoria local com sidecars SHA-256 e a esteira automatizada WCAG 2.2 AAA com Axe-Core) está **100% implementado, testado e integrado à branch `dev`**.
- **O que ainda falta:** Apenas a consolidação do commit de estabilização E2E (`deferred-behavior-coverage`), a revalidação do Lighthouse CI e a atestação final T045. Fora isso, restam unicamente as validações externas que dependem de humanos presenciais (estudos de usabilidade $n \ge 10$) e hardware físico de teste.

---

## 2. Fase 0 — Concluída e Integrada à `dev` (Não reabrir)

- [x] **Constituição do Projeto (v2.1.0)**: Princípios fundamentais inegociáveis ratificados.
- [x] **Idea Assessments (3/3 completados com veredito `go`)**:
  - `artcraft-horror-comic-reform` $\rightarrow$ Handoff executado para Spec 003.
  - `theme-switcher` $\rightarrow$ Handoff executado para Spec 002.
  - `wcag-aaa-audit-pipeline` $\rightarrow$ Handoff executado para Spec 004.
- [x] **Spec 001: Player Cinematográfico de Quadros**:
  - Máquina de estados completa (`idle`, `playing`, `paused`, `ended`), navegação por teclado e botões $\ge 44\text{px}$, áudio com ducking, persistência local e sync multi-aba via `BroadcastChannel`.
- [x] **Spec 002: Theme Switcher de 5 Atmosferas Dramáticas (26/26 tarefas)**:
  - Temas *Cinema*, *Noir*, *Eldritch*, *Industrial* e *Shadow-Props* com persistência, zero CLS e CSS comprimido $\le 15\text{ KB}$.
- [x] **Spec 003: Pipeline de Autoria Local ArtCraft (68/68 tarefas)**:
  - Sanitizador SVG fail-closed, sidecars de proveniência SHA-256, trailers de commit Git e portão de fidelidade SSIM $\ge 0.95$ / PSNR $\ge 30\text{ dB}$.
- [x] **Spec 004: Esteira Automatizada WCAG 2.2 AAA Axe-Core (63/63 tarefas)**:
  - Testes E2E nos 4 estados canônicos, validação de contraste $\ge 7:1$, alvos $\ge 44\text{ px}$, diálogo modal com blindagem `inert` e retenção de relatórios JSON/Markdown.
- [x] **Toolchain & Preflight (16/16 checks passando)**:
  - Host validado com Node 22, npm 10, Python 3.14, ffmpeg 8, ffprobe 8, tesseract 5.5, librsvg, lhci e inicialização headless dos 3 motores (Chromium, Firefox e WebKit).
- [x] **Bateria Unitária Estrita**: 224/224 testes unitários passando.
- [x] **Bugs Resolvidos (13/16)**: 11 verificados com fix e 2 com fechamento arquitetural comprovado.

---

## 3. Fase 1 — O Próximo Passo 80/20 (Máximo Ganho / Mínimo Esforço)

### 1.1 Comitar a Estabilização dos Testes E2E (`deferred-behavior-coverage`)
- **Outcome**: *Garantir que 100% da suíte E2E do Chromium passe deterministicamente no CI e localmente, eliminando falhas intermitentes de concorrência e falsos positivos de temporização.*
- **Comando Speckit**: `/speckit.bug.test` (slug `deferred-behavior-coverage`).
- **Ação**: O diagnóstico e o fix já foram verificados na árvore de trabalho (`working tree`) através de `test.describe.configure({ mode: 'serial' })` e correção de cálculo do dwell dinâmico. Falta apenas formalizar o commit das alterações nos 5 testes e na pasta do bug com os trailers requeridos.
- **Score ICE**:
  - *Impacto*: 9/10 (fecha a última falha automatizada do CI).
  - *Confiança*: 10/10 (solução comprovada em execução local).
  - *Facilidade*: 10/10 (código já escrito e testado).
  - **Score**: **900** $\rightarrow$ **Prioridade Absoluta**.

### 1.2 Revalidar a Auditoria Oficial do Lighthouse CI
- **Outcome**: *Certificar formalmente que a aplicação cumpre as metas de entrega constitucional: Performance $\ge 0.90$, Acessibilidade $\ge 0.95$, CLS $\le 0.10$ e LCP $\le 2500\text{ ms}$.*
- **Comando Speckit**: `npm run ci:lighthouse` (validação de gate).
- **Ação**: Executar o runner do Lighthouse com o Google Chrome do sistema e congelar o relatório em `lighthouserc.json`.
- **Score ICE**:
  - *Impacto*: 8/10 (critério 3 da Definição de Pronto).
  - *Confiança*: 9/10 (preflight e servidor estático já atendem).
  - *Facilidade*: 9/10 (comando único de auditoria).
  - **Score**: **648**.

### 1.3 Registrar a Atestação Final de Autoria (T045)
- **Outcome**: *Formalizar documentalmente o encerramento da Spec 003 e a conformidade dos 4 masters em `specs/003-artcraft-local-authoring/attestation.md`.*
- **Comando Speckit**: `/speckit.implement` (tarefa T045).
- **Ação**: Preencher o documento de atestação com os hashes SHA-256 e resultados dos gates de fidelidade.
- **Score ICE**:
  - *Impacto*: 7/10 (critério 7 da Definição de Pronto).
  - *Confiança*: 10/10 (dados já conhecidos e verificados).
  - *Facilidade*: 9/10 (documentação estruturada).
  - **Score**: **630**.

---

## 4. Fase 2 — Homologação da Matriz de Navegadores Completa

### 2.1 Executar a Matriz Playwright nos 5 Navegadores
- **Outcome**: *Certificar comportamento idêntico em Mobile Chromium, Mobile WebKit, Desktop Chromium, Desktop Firefox e Desktop WebKit.*
- **Comando**: `npx playwright test tests/e2e/ --project=mobile-chromium --project=desktop-chromium --project=desktop-firefox` (e os 2 projetos WebKit via CI Ubuntu ou runner com PulseAudio).
- **Ação**: Obter log completo de passagem em todos os projetos da matriz declarada (SC-005 / SC-022).

---

## 5. Fase 3 — Validações Não Automatizáveis (Dependentes de Humanos)

Estas etapas não bloqueiam o código nem o CI e devem ser conduzidas com participantes reais:

### 3.1 Estudo de Descoberta do Controle de Áudio (T171 / SC-002)
- **Outcome**: *Comprovar que $\ge 95\%$ dos leitores localizam e ativam o áudio em $\le 5$ segundos.*
- **Ação**: Recrutar $\ge 10$ participantes humanos, aplicar o roteiro de teste e registrar os resultados em `specs/001-cinematic-player/notes/usability-audio.md`.

### 3.2 Estudo de Compreensão Narrativa Sem Áudio (T172 / SC-004 / SC-013)
- **Outcome**: *Comprovar que $\ge 95\%$ dos leitores com som desligado compreendem integralmente o enredo através das audiodescrições e textos embutidos.*
- **Ação**: Aplicar o questionário narrativo com $\ge 10$ participantes e documentar em `specs/001-cinematic-player/notes/usability-a11y.md`.

### 3.3 Revisão Estética Subjetiva dos Masters de Arte (`frames-low-quality`)
- **Outcome**: *Homologar se a direção de arte dos 4 quadros autorais atinge a atmosfera de terror noir e o padrão visual pretendido.*
- **Ação**: Aprovação visual formal do stakeholder e fechamento do status de `partial` para `verified` no bug.

### 3.4 Certificação Física em Smartphone de Referência (SC-018 / T173)
- **Outcome**: *Demonstrar sustentação de 60 fps sob pressão térmica e limitação de hardware em um aparelho físico de 4 GB RAM.*
- **Ação**: Executar o player em dispositivo físico conectado via cabo e capturar a telemetria do compositor.

---

## 6. Recomendação Executiva 80/20

> **Ação Imediata Recomendada**:
> **Comitar a resolução do bug `deferred-behavior-coverage`** e rodar a validação do **Lighthouse CI** (`npm run ci:lighthouse`).

**Justificativa 80/20**:
Com as alterações já desenvolvidas e testadas no working tree, o commit do bug `deferred-behavior-coverage` leva a suíte técnica de software a **100% de aprovação verde determinística**. Esse passo requer **esforço mínimo** (apenas consolidar o trabalho já concluído) e entrega o **maior avanço possível no repositório**, deixando pendente exclusivamente o trabalho que necessita de pessoas físicas no mundo real.
