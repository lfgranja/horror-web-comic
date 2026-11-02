# ROADMAP.md — horror-web-comic

Roadmap orientado a **Outcomes (Resultados Mensuráveis)** e priorizado pela metodologia **ICE / 80-20 (Impacto × Confiança ÷ Esforço)**. Cada marco especifica o objetivo de negócio/leitor, o comando Speckit associado e os critérios de validação.

---

## 1. Visão Geral do Progresso (atualizado — 2026-11-01T21:45:00Z)

```
[██████████████████████████████████] ~97-98% Conclusão Global
  - Escopo Técnico & Código:   ~100% [████████████████████████████████]
  - Verificação Automatizada:   ~99%  [███████████████████████████████░]
  - Validação Humana / Física:  25%   [████████░░░░░░░░░░░░░░░░░░░░░░]
```

**Reconciliação com `OBJETIVO.md` e estado real (branch `dev`):**

- **Branch**: `dev` @ `ac29c3c` "docs(spec-005): mark convergence tasks complete" — working tree limpo
- **Preflight**: 16/16 ✅ | **Unit tests**: 227/227 ✅ | **Validate**: OK
- **Tasks reais (contagem verificada em tasks.md):**
  - 001-cinematic-player: **195/228** (85.5%) — código majoritariamente implementado, dívida de rastreabilidade
  - 002-theme-switcher: **26/26** (100%)
  - 003-artcraft-local-authoring: **68/68** (100%) — atestação T045 registrada em `specs/003-artcraft-local-authoring/attestation.md`
  - 004-wcag-aaa-audit-pipeline: **63/63** (100%)
  - 005-korean-horror-mechanics: **46/47** (97.9%) — **apenas T047 pendente** ("Verify full `npm run ci` passes with all spec 005 features")
- **Specs convergidos**: 001-004 completos no fluxo SDD. **005 quase convergido** (falta apenas gate de verificação final T047).
- **Bugs**: 29 diretórios em `.specify/bugs/`. **Todos com fluxo completo** (`assessment.md` + `fix.md` + `test.md`).
- **Assessments**: 3/3 completos — `theme-switcher` = go, `wcag-aaa-audit-pipeline` = go, `artcraft-horror-comic-reform` = **needs-clarification** (bloqueado intencionalmente).

### Fontes primárias consultadas (2026-11-01)
- **WCAG 2.2**: W3C Recommendation, adotado como **ISO/IEC 40500:2025**. Nível AAA inclui Focus Not Obscured Enhanced (2.4.12), Focus Appearance (2.4.13), Accessible Authentication Enhanced (3.3.9). Axe-Core cobre regras normativas; validação com leitores de tela reais (NVDA/VoiceOver/TalkBack) permanece pendente.
- **Core Web Vitals**: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms. Projeto atende com folga (LCP 1.5–1.8s).
- **Playwright**: matriz 5 projetos estável.
- **spec-kit**: `/speckit.converge` cruza código vs artefatos e recupera trabalho residual para fechamento confiável.

---

## 2. Fase 0 & Fase 1 — Concluídas e Integradas à `dev`

- [x] Constituição v2.1.0 ratificada (`.specify/memory/constitution.md`).
- [x] Idea Assessments 3/3 completos — verdicts: `theme-switcher` = go, `wcag-aaa-audit-pipeline` = go, `artcraft-horror-comic-reform` = **needs-clarification** (não promovido a spec).
- [x] Spec 002 Theme Switcher (26/26) — mergeado.
- [x] Spec 004 WCAG AAA (63/63) — mergeado.
- [x] Spec 001 Player (195/228 tarefas; 33 abertas por rastreabilidade).
- [x] Spec 003 ArtCraft — scripts implementados; tasks.md 68/68 marcadas; attestation T045 registrada.
- [x] Spec 005 Korean Horror Mechanics — **46/47 tarefas (97.9%)**; apenas T047 pendente.
- [x] **Preflight 16/16** ✅ (verificado 2026-11-01)
- [x] **Unit tests 227/227** ✅ (verificado 2026-11-01)
- [x] Lighthouse CI aprovado anteriormente (Perf 0.96–0.98, A11y 1.00, CLS 0.00, LCP 1.5–1.8s).

---

## 3. Fase 2 — Validação Automatizada e Hardening

### 3.1 Toolchain sincronizado (CONCLUÍDO) — ICE 900
- [x] **Comando**: `npm ci` — já sincronizado (preflight 16/16, unit 227/227)
- **Critério**: `npm run preflight` passa 16/16; `npm run test:unit` 227/227. ✅

### 3.2 Fechar spec 005 — T047 (CONVERGÊNCIA) — ICE 500
- **Ação**: Executar `/speckit.converge` para `specs/005-korean-horror-mechanics/` ou verificar diretamente `npm run ci`. Marcar T047 como concluída após verificação verde.
- **Critério**: 47/47 tarefas marcadas; convergência validada contra código/artefatos.
- **Status**: **PENDENTE** (46/47)

### 3.3 Revalidar CI completo (Ubuntu matriz 5 projetos) — ICE 648
- **Ação**: Após T047, rodar `npm run ci` completo (ou validar no CI). Fedora não roda WebKit localmente.
- **Critério**: `npm run ci` passa integralmente em ubuntu-latest (gate + webkit-layout-gate + macos-webkit-compositor).
- **Status**: PENDENTE

### 3.4 Monitorar bugs residuais — ICE 300
- **Alvo**: Bugs recentes já com fluxo completo; tratar apenas se reaparecerem em CI pós-convergência.
- **Ação**: Usar `/speckit.bug.assess`/`/speckit.bug.fix`/`/speckit.bug.test` se necessário.
- **Status**: MAJORITARIAMENTE CONCLUÍDO

---

## 4. Fase 3 — Validações Não Automatizáveis (Humanos / Dispositivo Real)

### 4.1 Protocolos operacionais de usabilidade (T171/T172) — ICE 280
- **Ação**: Criar roteiro + formulário para ≥ 10 participantes (descoberta controle áudio ≤5s, compreensão sem áudio ≥95%).
- **Critério**: Protocolos documentados e prontos para execução.
- **Status**: PENDENTE

### 4.2 Homologação estética dos masters (`frames-low-quality`) — ICE 336
- **Ação**: Revisão visual dos 4 masters autorais.
- **Critério**: Homologação registrada.
- **Status**: PENDENTE

### 4.3 Certificação FPS física (SC-018) — ICE 147
- **Ação**: Testar em smartphone físico de referência (360×800), contador rAF = 0 frames.
- **Critério**: Evidência registrada.
- **Status**: PENDENTE

### 4.4 Leitores de tela reais (NVDA/VoiceOver/TalkBack) — ICE 168
- **Ação**: Validação manual WCAG 2.2 AAA.
- **Critério**: Evidência registrada.
- **Status**: PENDENTE

---

## 5. Recomendação Executiva 80/20 (atualizado 2026-11-01T21:45:00Z)

> **Estado atual**: Toolchain sincronizado ✅. Preflight 16/16 ✅. Unit tests 227/227 ✅. **Todos os bugs com fluxo completo** (29/29). Specs 001-004 convergidas. **Spec 005 a 97.9% (apenas T047 pendente)**. Escopo técnico ~100% implementado. Foco: **fechar convergência da spec 005 via `/speckit.converge` + revalidar `npm run ci`**.

**Próximo passo com maior avanço/menor esforço (80/20):**

**OPÇÃO A - Máximo ROI agora:** Fechar T047 via `/speckit.converge` para `specs/005-korean-horror-mechanics/`
- **Impacto**: Altíssimo (fecha última spec aberta, limpa tracking Speckit)
- **Esforço**: Baixo-Médio (verificação `npm run ci`; se falhar, corrigir via fluxo bug `/speckit.bug.assess/fix/test`)
- **Razão**: Único item automatizável remanescente antes de validações puramente humanas/físicas.

**Sequência sugerida (ICE decrescente):**
1. **Fechar spec 005 (T047)** via `/speckit.converge` — ICE ~500
2. **Revalidar CI completo Ubuntu** (`npm run ci`) — ICE ~648
3. **Validações humanas/físicas** (usabilidade, leitores de tela, FPS físico, revisão estética) — ICE 147-336 (não automatizáveis por agente)

**Justificativa:** Após fechar T047, restarão apenas validações que exigem participantes humanos ou dispositivos físicos reais. Tudo o mais (código, build, testes automatizados, gates) estará completo e convergido.

**Estado Speckit (resumo):**
- Constitution: v2.1.0 ✅
- Assessments: 3/3 completos (2 go, 1 needs-clarification - `artcraft-horror-comic-reform` bloqueado)
- Specs: 001 195/228 (85.5% rastreabilidade), 002 26/26 (100%), 003 68/68 (100%), 004 63/63 (100%), 005 **46/47 (97.9%)**
- Bugs: 29 total — **100% com fluxo completo** (`assessment.md` + `fix.md` + `test.md`)

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
