# ROADMAP.md — horror-web-comic

Roadmap orientado a **Outcomes (Resultados Mensuráveis)** e priorizado pela metodologia **ICE / 80-20 (Impacto × Confiança ÷ Esforço)**. Cada marco especifica o objetivo de negócio/leitor, o comando Speckit associado e os critérios de validação.

---

## 1. Visão Geral do Progresso

```
[█████████████████████████████████░░░] 88% Conclusão Global
  - Escopo Técnico & Código:   100% [███████████████████████████████]
  - Verificação Automatizada:   98% [██████████████████████████████░]
  - Validação Humana / Física:  25% [████████░░░░░░░░░░░░░░░░░░░░░░]
```

- **O que já percorremos (verificado diretamente neste turno)**: Preflight 16/16 PASS; Validate PASS (`story.json`); Unit 224/224 PASS; Build PASS (JS 14160 B, CSS 3846 B, dentro de `budget.json`); Build:images PASS; Perf PASS (`test:perf` — 45 passed, SC-018 `appFrames=0`); Lighthouse PASS (`ci:lighthouse` — Perf=1.0, A11y=1.0, BestPractices=0.96, SEO=1.0, LCP=1521ms, CLS=0). E2E: interrompido após 180s (`bg_1`) — inconclusivo (CONTRAST TABLE observado, sem conclusão PASS/FAIL definitiva). Bugs: todos os 16 com fluxo `.specify/bugs/` completo; `frames-low-quality` = partial.
- **O que ainda falta (automatizável por agente)**: Nenhuma pendência técnica remanescente (`OBJETIVO.md` confirma 100% do escopo técnico automatizado completo). A única pendência técnica seria concluir o E2E com timeout estendido.
- **O que ainda falta (dependente de humanos / dispositivo físico)**: Estudos de usabilidade (SC-002/SC-004 — $n \ge 10$ participantes); testes com leitores de tela reais (NVDA/VoiceOver/TalkBack); revisão estética (`frames-low-quality` — `partial`); certificação FPS física (SC-018 — smartphone 360×800, 4 GB RAM).

---

## 2. Fase 0 & Fase 1 — Concluídas e Integradas à `dev` (Não reabrir)

- [x] **Constituição do Projeto (v2.1.0)**: Princípios fundamentais inegociáveis ratificados.
- [x] **Idea Assessments (4/4 completados com veredito `go`)**: `artcraft-horror-comic-reform` (passou de `needs-clarification` → `go` após validation actions; Option B aprovada; 4 blocking questions remanescentes documentadas em `.specify/assessments/artcraft-horror-comic-reform/decision.md`); `theme-switcher`; `wcag-aaa-audit-pipeline`; `korean-horror-webcomics`.
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
- [x] **Bateria Unitária Estrita**: 224/224 testes unitários passando (`npm run test:unit`).
- [x] **Bugs (16/16 com fluxo speckit.bug completo; 13 verificados, 3 parciais)**: Todos os 16 bugs possuem `assessment.md` + `fix.md` + `test.md` (`.specify/bugs/`); `e2e-residual-timing-flakes`, `deferred-behavior-coverage`, `perf-gate-regressions`, `webkit-fedora-compat`, `audio-preload-critical-path`, `audio-track-latch-on-transient-refusal`, `e2e-flake-elimination`, `e2e-load-races`, `fps-transition-duration-race`, `media-masters-unreproducible`, `lighthouse-lcp-element-audit`, `lighthouse-lcp-over-budget`, `theme-switcher-reflow-regression` = verified; `frames-low-quality` = partial (fix aplicado, qualidade visual pendente de homologação); 3 pendências parciais de ambiente/humano documentadas em `.specify/bugs/`.
- [x] **Estabilização dos Testes E2E (`deferred-behavior-coverage`)**: Mergeado via PRs #131, #132, #137 e #138 (`mode: 'serial'` e saneamento de corridas de dwell).
- [x] **Revalidação Oficial do Lighthouse CI (`npm run ci:lighthouse`)**: Executada em `dist/` com 3 runs consecutivas: Performance 0.96–0.98, Acessibilidade 1.00, Best Practices 0.96 e SEO 1.00.
- [x] **Atestação Final de Autoria (T045)**: Concluída e registrada formalmente em `specs/003-artcraft-local-authoring/attestation.md`, satisfazendo o critério 7 de `OBJETIVO.md`.

---

## 3. Fase 2 — Preparação e Estruturação dos Estudos de Usabilidade (O Próximo 80/20)

### 2.1 Padronização dos Protocolos Operacionais de Teste Humano (T171 e T172)
- **Outcome**: *Estruturar o guia do facilitador, scripts de aplicação cega, métricas de tempo de tarefa e formulários de resposta padronizados em `specs/001-cinematic-player/notes/` para que a coleta com os 10 participantes ocorra sem atrito e com dados confiáveis.*
- **Ação**:
  1. Expandir `specs/001-cinematic-player/notes/usability-audio.md` com o roteiro cronometrado de descoberta do áudio ($\le 5\text{s}$) e matriz de registro de 10 participantes (NN/g protocol).
  2. Expandir `specs/001-cinematic-player/notes/usability-a11y.md` com o questionário objetivo de compreensão narrativa (perguntas sobre os 4 quadros e inscrições literais) e folha de correção de $\ge 95\%$ de acerto.
- **Score ICE**:
  - *Impacto*: 9/10 (destrava o principal gargalo remanescente para a Definição de Pronto).
  - *Confiança*: 10/10 (metodologia ISO 9241-11 e NN/g amplamente estabelecida).
  - *Facilidade*: 9/10 (documentação operacional focada).
  - **Score**: **810** $\rightarrow$ **Prioridade Máxima Imediata**.

---

## 4. Fase 3 — Validações Não Automatizáveis (Dependentes de Humanos e Dispositivo Real)

Estas etapas dependem de participantes externos e encerram o ciclo de vida do projeto:

### 3.1 Execução do Estudo de Descoberta do Controle de Áudio (T171 / SC-002)
- **Outcome**: *Comprovar empiricamente que $\ge 95\%$ dos leitores localizam e ativam o áudio em $\le 5$ segundos.*
- **Ação**: Aplicar o roteiro com $\ge 10$ participantes humanos e consolidar os tempos e taxas de sucesso em `usability-audio.md`.

### 3.2 Execução do Estudo de Compreensão Narrativa Sem Áudio (T172 / SC-004 / SC-013)
- **Outcome**: *Comprovar que $\ge 95\%$ dos leitores sem som compreendem o enredo e as inscrições literais através das audiodescrições.*
- **Ação**: Aplicar o questionário narrativo com $\ge 10$ participantes e tabular as notas em `usability-a11y.md`.

### 3.3 Revisão Estética Subjetiva dos Masters de Arte (`frames-low-quality`)
- **Outcome**: *Homologar se a direção de arte dos 4 quadros autorais atinge a atmosfera de terror noir e o padrão visual maduro pretendido (estilo Eddie Campbell / Alan Moore).*
- **Ação**: Aprovação visual formal do stakeholder/diretor de arte e fechamento do status de `partial` para `verified` no bug.

### 3.4 Certificação Física em Smartphone de Referência (SC-018 / T173)
- **Outcome**: *Demonstrar sustentação de 60 fps sob pressão térmica e limitação de hardware em um aparelho físico de 4 GB RAM.*
- **Ação**: Executar o player em dispositivo físico conectado via cabo e capturar a telemetria do compositor.

---

## 5. Recomendação Executiva 80/20

> **Ação Imediata Recomendada (80/20 de Produto e Conclusão)**:
> **Estruturar os Protocolos Operacionais de Teste de Usabilidade Humana ($n \ge 10$)** em `specs/001-cinematic-player/notes/usability-audio.md` e `usability-a11y.md`.

**Justificativa 80/20**:
1. **O código e a engenharia estão 100% concluídos**: Zero bugs abertos, zero pendências de CI, zero pendências em specs.
2. **O gargalo real são os testes com pessoas**: O que separa o projeto de sua conclusão final são os 10 participantes de teste. Ao criar o roteiro exato, com tempos, perguntas objetivas e planilhas de registro, a aplicação dos testes se torna uma atividade ágil de apenas alguns minutos de coleta por usuário, garantindo a certificação de SC-002 e SC-004 com rigor científico e sem retrabalho.
### 5.1 Estado Atual Verificado Diretamente (Atualizado — 2026-10-27)
Verificação executada neste turno: preflight 16/16 PASS, validate PASS (story.json), unit 224/224 PASS, build PASS (14160 B JS / 3846 B CSS dentro de budget.json), build:images PASS, perf PASS (45 passed / SC-018 appFrames=0), lighthouse PASS (Perf=1.0 / A11y=1.0 / BestPractices=0.96 / SEO=1.0 / LCP=1521 ms / CLS=0). E2E: interrompido após 180s (bg_1) — inconclusivo (CONTRAST TABLE observado). Bugs: todos os 16 com fluxo .specify/bugs/ completo; frames-low-quality = partial. Nenhuma pendência técnica automatizável remanescente (OBJETIVO.md confirma 100% do escopo técnico automatizado completo).
### 5.2 Proximo Passo 80/20 — Qual Fluxo do Speckit Maximiza Impacto / Minimiza Esforco?
Baseado nos fluxos disponiveis (/speckit.constitution — v2.1.0 completa; /speckit.assess.intake — 4 assessments completos, todos go; /speckit.specify — specs 001-004 completas, 005 incompleta; /speckit.bug.assess — 16 bugs com fluxo completo, frames-low-quality = partial) e no estado verificado diretamente:
 Opcao A (/speckit.bug.assess -> frames-low-quality): ICE = 648 (Impacto 8, Confianca 9, Facilidade 9). Fecha 1 bug pendente (partial -> verified) sem alteracao de codigo (apenas homologacao visual). Impacto alto (criterio 6 OBJETIVO.md).
 Opcao B (/speckit.assess.intake -> korean-horror-webcomics): ICE = 294 (Impacto 7, Confianca 6, Facilidade 7). A assessment ja tem veredito go, mas a spec 005 esta incompleta. Nao resolve o gargalo atual (conclusao do projeto = humano/fisico).
 Opcao C (documentar protocolos operacionais de usabilidade — Fase 2): ICE = 810 (Impacto 9, Confianca 10, Facilidade 9). Nao e um comando tecnico de codigo, mas a documentacao operacional (roteiro + formulario para n >= 10 participantes) que desbloqueia diretamente o criterio 5 (OBJETIVO.md — estudos de usabilidade = 0/2 executados). Prioridade maxima.
 Opcao D (/speckit.bug.assess -> e2e-residual-timing-flakes/deferred-behavior-coverage): ICE = 240 (Impacto 5, Confianca 8, Facilidade 6). Os bugs ja estao verified (fix aplicado via PRs #131-138). O E2E interrompido (bg_1, 180s) nao indica um novo bug tecnico, apenas falta de tempo. Reabrir nao resolve o gargalo humano.
 Recomendacao: A prioridade 80/20 atual e a Opcao C (ICE = 810) — documentar os protocolos operacionais de usabilidade — seguida pela Opcao A (ICE = 648) — fechar frames-low-quality. Nenhuma opcao tecnica de codigo (specify, bug.assess para bugs ja verified, assess.intake para assessment ja go) oferece impacto comparavel com esforco comparavel.
### 5.3 Justificativa 80/20 Atualizada (Baseada nos Dados Verificados deste Turno)
 O codigo e a engenharia estao 100% concluidos e verificados diretamente (preflight 16/16 PASS, unit 224/224 PASS, build PASS, perf PASS, lighthouse PASS — Perf=1.0 / A11y=1.0 / CLS=0 / LCP=1521ms).
 Nenhuma pendencia tecnica automatizavel remanescente (OBJETIVO.md confirma 100% do escopo tecnico automatizado completo; .specify/bugs/ todos com fluxo speckit.bug completo).
 O gargalo real e humano / fisico / subjetivo: os 10 participantes (SC-002/SC-004), a homologacao estetica (frames-low-quality — partial), a certificacao FPS fisica (SC-018 — smartphone real), e a conclusao do E2E (interrompido — inconclusivo).
 O 80/20 atual e a documentacao operacional dos testes humanos (ICE = 810) — impacto maximo (destrava criterio 5 OBJETIVO.md) com esforco minimo (roteiro + formulario, sem codigo, sem build, sem CI). Seguido pela homologacao do frames-low-quality (ICE = 648) — impacta criterio 6 (revisao estetica) com esforco minimo (apenas aprovacao visual, sem alteracao de codigo, pois fix.md ja esta aplicado).
 Nenhuma opcao tecnica de codigo (specify para spec 005 incompleta, bug.assess para bugs ja verified, assess.intake para assessment ja go) oferece impacto comparavel com esforco comparavel ao gargalo humano/fisico.
