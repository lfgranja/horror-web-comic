# ROADMAP.md — horror-web-comic

Roadmap orientado a **Outcomes (Resultados Mensuráveis)** e priorizado pela metodologia **ICE / 80-20 (Impacto × Confiança ÷ Esforço)**. Cada marco especifica o objetivo de negócio/leitor, o comando Speckit associado e os critérios de validação.

---

## 1. Visão Geral do Progresso (atualizado — 2026-11-02T04:40:00Z)

```
[██████████████████████████████████] ~98% Conclusão Global
  - Escopo Técnico & Código:   ~100% [████████████████████████████████]
  - Verificação Automatizada:   ~99%  [███████████████████████████████░]
  - Validação Humana / Física:  25%   [████████░░░░░░░░░░░░░░░░░░░░░░]
```

**Reconciliação com `OBJETIVO.md` e estado real (branch `dev`):**

- **Branch**: `dev` @ `05ec365` "fix(styles): improve end overlay coverage and pointer events on narrow viewports" — working tree limpo
- **Preflight**: 16/16 ✅ | **Unit tests**: 227/227 ✅ | **Validate**: OK
- **PRs abertos**: #179 `fix/webkit-end-overlay-coverage` (correção WebKit end-overlay) — aberto
- **Tasks reais (contagem verificada em tasks.md):**
  - 001-cinematic-player: **195/228** (85.5%) — código majoritariamente implementado, dívida de rastreabilidade
  - 002-theme-switcher: **26/26** (100%)
  - 003-artcraft-local-authoring: **68/68** (100%) — atestação T045 registrada em `specs/003-artcraft-local-authoring/attestation.md`
  - 004-wcag-aaa-audit-pipeline: **63/63** (100%)
  - 005-korean-horror-mechanics: **46/56** (82.1%) — **apenas T047 pendente** no fluxo principal + 9 tarefas de convergência adicionadas (T048-T056); convergência aplicada
- **Specs convergidos**: 001-004 completos no fluxo SDD. **005 em convergência** (T047 pendente de verificação CI).
- **Bugs**: 30 diretórios em `.specify/bugs/` (incluindo `webkit-layout-gate-end-overlay-run-41387605113` com assessment+fix). Maioria com fluxo completo.
- **Assessments**: 3/3 completos — `theme-switcher` = go, `wcag-aaa-audit-pipeline` = go, `artcraft-horror-comic-reform` = **needs-clarification** (bloqueado intencionalmente).

### Fontes primárias consultadas (2026-11-02)
- **WCAG 2.2**: W3C Recommendation, adotado como **ISO/IEC 40500:2025**. Nível AAA inclui Focus Not Obscured Enhanced (2.4.12), Focus Appearance (2.4.13), Accessible Authentication Enhanced (3.3.9). Axe-Core cobre regras normativas; validação com leitores de tela reais (NVDA/VoiceOver/TalkBack) permanece pendente.
- **Core Web Vitals**: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms. Projeto atende com folga.
- **Playwright**: matriz 5 projetos estável; correção aplicada para WebKit end-overlay coverage.
- **spec-kit**: `/speckit.converge` aplicado em spec 005 com gaps endereçados (diálogo antes do schedule, badge completo, overlay end actions, validação de descriptors, fallback keys, testes).

---

## 2. Fase 0 & Fase 1 — Concluídas e Integradas à `dev`

- [x] Constituição v2.1.0 ratificada (`.specify/memory/constitution.md`).
- [x] Idea Assessments 3/3 completos — verdicts: `theme-switcher` = go, `wcag-aaa-audit-pipeline` = go, `artcraft-horror-comic-reform` = **needs-clarification** (não promovido a spec).
- [x] Spec 002 Theme Switcher (26/26) — mergeado.
- [x] Spec 004 WCAG AAA (63/63) — mergeado.
- [x] Spec 001 Player (195/228 tarefas; 33 abertas por rastreabilidade).
- [x] Spec 003 ArtCraft — scripts implementados; tasks.md 68/68 marcadas; attestation T045 registrada.
- [x] Spec 005 Korean Horror Mechanics — **46/56 tarefas (82.1%)** com convergência aplicada; apenas **T047** pendente (verificação final `npm run ci`).
- [x] **Preflight 16/16** ✅ (verificado)
- [x] **Unit tests 227/227** ✅ (verificado)
- [x] Lighthouse CI aprovado anteriormente (Perf 0.96–0.98, A11y 1.00, CLS 0.00, LCP 1.5–1.8s).
- [x] **PRs merged to dev**: #176 (docs/AGENTS/ROADMAP), #177 (spec005 validation/storage/tasks), #178 (spec005 UI/sensory/catalog/tests)

---

## 3. Fase 2 — Validação Automatizada e Hardening

### 3.1 Toolchain sincronizado (CONCLUÍDO) — ICE 900
- [x] **Comando**: `npm ci` — já sincronizado (preflight 16/16, unit 227/227)
- **Critério**: `npm run preflight` passa 16/16; `npm run test:unit` 227/227. ✅

### 3.2 Fechar spec 005 — T047 (CONVERGÊNCIA) — ICE 500
- **Ação**: Verificar `npm run ci` completo; marcar T047 como concluída após verificação verde. Convergência já aplicada (T048-T056 adicionados e implementados).
- **Critério**: 56/56 tarefas marcadas; convergência validada.
- **Status**: **PENDENTE** (apenas T047)

### 3.3 Revalidar CI completo (Ubuntu matriz 5 projetos) — ICE 648
- **Ação**: Após correção WebKit (#179), rodar/validar `npm run ci` completo em ambiente CI.
- **Critério**: `npm run ci` passa integralmente em ubuntu-latest (gate + webkit-layout-gate + macos-webkit-compositor).
- **Status**: PENDENTE (aguardando merge de #179 e validação CI)

### 3.4 Correção WebKit end-overlay — ICE 420
- **PR**: #179 `fix/webkit-end-overlay-coverage` aberto (pointer events em links, padding ajustado para viewports estreitos)
- **Status**: EM REVISÃO/MERGE PENDENTE

---

## 4. Fase 3 — Validações Não Automatizáveis (Humanos / Dispositivo Real)

### 4.1 Protocolos operacionais de usabilidade (T171/T172) — ICE 280
- **Status**: PENDENTE

### 4.2 Homologação estética dos masters (`frames-low-quality`) — ICE 336
- **Status**: PENDENTE

### 4.3 Certificação FPS física (SC-018) — ICE 147
- **Status**: PENDENTE

### 4.4 Leitores de tela reais (NVDA/VoiceOver/TalkBack) — ICE 168
- **Status**: PENDENTE

---

## 5. Recomendação Executiva 80/20 (atualizado 2026-11-02T04:40:00Z)

> **Estado atual**: Toolchain sincronizado ✅. Preflight 16/16 ✅. Unit tests 227/227 ✅. PRs #176,#177,#178 mergeados. **PR #179 aberto** corrigindo WebKit end-overlay. Specs 001-004 convergidas. **Spec 005 em convergência** com T047 pendente. Escopo técnico ~100%. Foco: **mergear #179 e validar `npm run ci` para fechar T047**.

**Próximo passo com maior avanço/menor esforço (80/20):**

**OPÇÃO A - Máximo ROI agora:** Mergear PR #179 e rodar/verificar `npm run ci` (completar T047)
- **Impacto**: Altíssimo (fecha último item de convergência da spec 005, limpa tracking)
- **Esforço**: Baixo (merge + verificação CI)
- **Razão**: Único item automatizável remanescente antes de validações puramente humanas/físicas.

**Sequência sugerida (ICE decrescente):**
1. **Mergear #179** e revalidar CI completo Ubuntu (`npm run ci`) — ICE ~648
2. **Fechar T047** via `/speckit.converge`/marcações — ICE ~500
3. **Validações humanas/físicas** (usabilidade, leitores de tela, FPS físico, revisão estética) — ICE 147-336 (não automatizáveis por agente)

**Justificativa:** Após T047 e gates verdes, restarão apenas validações que exigem participantes humanos ou dispositivos físicos reais.

**Estado Speckit (resumo):**
- Constitution: v2.1.0 ✅
- Assessments: 3/3 completos (2 go, 1 needs-clarification - `artcraft-horror-comic-reform` bloqueado)
- Specs: 001 195/228 (85.5% rastreabilidade), 002 26/26 (100%), 003 68/68 (100%), 004 63/63 (100%), 005 **46/56 (82.1%)** com convergência aplicada
- Bugs: 30 total — maioria com fluxo completo (`assessment.md` + `fix.md` + `test.md`)

### 5.1 Fora de escopo (decisões registradas)
- Backend, banco de dados, API, frameworks.
- Landing page comercial (apenas docs em `docs/monetization/`).
- Fullscreen API.
- Gate em FPS no CI (SC-018 gateia em contador rAF = 0).
- WebKit no Fedora local (limitação de ambiente; CI Ubuntu/macOS).

### 5.2 Atualização de dependências recomendada
- Playwright manter versão fixada no lockfile.
- Lighthouse/Axe manter pins atuais; thresholds alinhados com Core Web Vitals 2026 (LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms).
- AVIF (~94% suporte global) e Opus (suporte amplo) confirmados; manter estratégia de fallback via `<picture>`/`<audio>`.
