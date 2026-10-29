# ROADMAP.md — horror-web-comic

Roadmap orientado a **Outcomes (Resultados Mensuráveis)** e priorizado pela metodologia **ICE / 80-20 (Impacto × Confiança ÷ Esforço)**. Cada marco especifica o objetivo de negócio/leitor, o comando Speckit associado e os critérios de validação.

---

## 1. Visão Geral do Progresso (atualizado — 2026-10-29, pós-verificação local completa)

```
[█████████████████████████████████░░░] ~93% Conclusão Global
  - Escopo Técnico & Código:   ~100% [████████████████████████████████]
  - Verificação Automatizada:   ~98% [██████████████████████████████░]
  - Validação Humana / Física:  25% [████████░░░░░░░░░░░░░░░░░░░░░░]
```

**Reconciliação com `OBJETIVO.md` e estado real (branch `fix/focus-loss-progress-key-tests`, working tree limpa):**

- `OBJETIVO.md` afirma "100% do escopo técnico automatizado completo" — **efetivamente atingido**. Todas as features implementadas e integradas.
- **Verificado localmente nesta rodada (2026-10-29):**
  - `npm run preflight`: **16/16 pass** (Node 22.23, npm 10.9, Python 3.14, ffmpeg 8.1, tesseract, Playwright 3 motores headless, Chrome, deps pinadas).
  - `npm run validate`: **pass** (manifests `story.json` + `o-alojamento.json` + catalog válidos).
  - `npm run test:unit`: **227/227 pass** (34.6s).
  - `npm run build:images` + `npm run build`: **pass** (16233 bytes script comprimido, 4175 style; assets dentro dos budgets).
  - `npm run lhci`: **pass** (assertions processadas sem falha).
  - `npm run test:perf`: **42 pass, 15 skipped, 1 falha (SC-019 cold-cache p75 desktop-chromium), 2 flaky (mobile-chromium)**.
  - `npm run test:e2e`: **não concluiu** (timeout 300s); falhas observadas em `mobile-chromium`: `playback.spec.js` e `playback-matrix.spec.js` esperam `frame-01` mas recebem `frame-04` (progresso persistido em localStorage entre runs).
- **Tasks reais (contagem verificada em tasks.md)**: 001 195/228 (85%), 002 26/26 (100%), 003 68/68 (100%), 004 63/63 (100%), 005 32/38 (84%).
- **Spec 003**: tasks.md agora 68/68 marcadas (ROADMAP anterior dizia 2/69 — desatualizado; scripts implementados + attestation T045 registrada).
- **Bugs**: 21 bugs no `.specify/bugs/`. 20 com fluxo completo (18 assess+fix+test + `gate-full-ci-failures` agora verified via CI run 40932788962, conclusion success) + 2 com fix aplicado sem teste (`gate-ci-e2e-failures-40792880928`, `gate-ci-e2e-failures-40801713567`). `npm run ci` completo passou em ubuntu-latest (gate + webkit-layout-gate + macos-webkit-compositor).
- **Verdicts de assessment**: 3 assessments completos — `theme-switcher` = go, `wcag-aaa-audit-pipeline` = go, `artcraft-horror-comic-reform` = needs-clarification.
## 2. Fase 0 & Fase 1 — Concluídas e Integradas à `dev`

- [x] Constituição v2.1.0 ratificada.
- [x] Idea Assessments 3/3 completos — verdicts: `theme-switcher` = go, `wcag-aaa-audit-pipeline` = go, `artcraft-horror-comic-reform` = needs-clarification.
- [x] Spec 002 Theme Switcher (26/26) — mergeado.
- [x] Spec 004 WCAG AAA (63/63) — mergeado (PRs #123–#128).
- [x] Spec 001 Player (195/228 tarefas; 33 abertas).
- [x] Spec 003 ArtCraft — scripts implementados; tasks.md 68/68 marcadas; attestation T045 registrada.
- [x] Spec 005 Korean Horror — mergeada via #143; 32/38 tarefas (6 parciais T033–T038).
- [x] Preflight 16/16; Unit 227/227; E2E estabilizado (PRs #131, #132, #137, #138) — mas run local 2026-10-29 não concluiu (timeout + storage persistido).
- [x] Lighthouse CI última execução: Perf 0.96–0.98, A11y 1.00, CLS 0.00, LCP 1.5–1.8s.

---

## 3. Fase 2 — Validação Automatizada Pós-Merge

### 3.1 Revalidação completa do pipeline pós-merge spec 005 (T038)
- **Ação**: Executar `npm run ci` completo em CI Ubuntu para matriz completa (5 projetos). Local Fedora não roda WebKit.
- **ICE**: Impacto 9 × Confiança 9 × Facilidade 8 = **648** → Prioridade.

### 3.2 Fechar tarefas parciais da spec 005 (T032–T037) — [x] CONCLUÍDO
- **Outcome**: BroadcastChannel `hwc:sensory`, redução de movimento / bypass recorrente, purge atômico <50ms, badge consultivo 5s + estado áudio, catálogo com barras/badges/Escape, atenuação 20% do sting na revisita. PR #152 merged.
- **ICE**: 7 × 8 × 6 = **336**.

### 3.3 Fechar issues abertas da spec 003 (T012–T045)
- Bloqueado por entregável humano T028 (masters autorais SVG/PNG otimizados).
- **ICE**: 6 × 7 × 5 = **210**. Scripts já implementados (svg-sanitize, sidecar, delivery-fidelity, atomic-write, ci-trailers). Faltam masters + fechamento de issues.
## 4. Fase 3 — Validações Não Automatizáveis (Humanos / Dispositivo Real)

### 4.1 Protocolos operacionais de usabilidade (T171/T172) — ICE 810
- Roteiro + formulário para ≥ 10 participantes. Maior impacto/esforço entre itens humanos.

### 4.2 Homologação estética dos masters (`frames-low-quality`) — ICE 648
- Fix aplicado; falta homologação visual.

### 4.3 Certificação FPS física (SC-018) — ICE ~400
### 4.4 Leitores de tela reais (NVDA/VoiceOver/TalkBack) — ICE ~350

---

## 5. Recomendação Executiva 80/20 (atualizado 2026-10-29)

> **Ação Imediata Recomendada (80/20)**: **Corrigir o E2E local antes de qualquer nova feature** — o run de 2026-10-29 mostra `playback.spec.js` e `playback-matrix.spec.js` falhando em `mobile-chromium` por progresso persistido em localStorage (`frame-04` em vez de `frame-01`). Causa provável: `openPlayer` não limpa storage entre runs. Fix de baixo esforço, alto impacto (destrava o portão E2E que hoje não conclui). ICE sugerido: Impacto 8 × Confiança 9 × Facilidade 9 = **648**.

**Próximo passo com maior avanço/menor esforço (80/20)**: **`/speckit.bug.assess` + `/speckit.bug.fix` para o bug `gate-full-ci-failures`** (único bug sem fix; verdict `likely valid, needs reproduction`). É o único item que bloqueia o critério 1 do OBJETIVO (`npm run ci` integral em ubuntu-latest). Alternativa de menor atrito: rodar `/speckit.converge` na spec 001 para detectar gaps (33 tarefas abertas) antes de implementar — mas converge não modifica código, apenas apenda tarefas; o ganho real vem do implement subsequente.

**Sequência sugerida (ICE decrescente):**
1. Bug fix `gate-full-ci-failures` (reproduzir as 55 falhas, aplicar fix, rodar `npm run test:e2e` completo) — ICE ~648.
2. Corrigir storage persistido no E2E (openPlayer limpar localStorage / story-scoped key) — ICE ~648.
3. Fechar 6 tarefas parciais da spec 005 (T033–T038) via `/speckit.implement` — ICE ~336.
4. Disparar `npm run ci` completo no CI Ubuntu (matriz 5 projetos) — ICE 648 (validação, não código).
5. Documentar protocolos de usabilidade T171/T172 (ICE 810) — destrava critério 5 do OBJETIVO.
6. Fechar issues spec 003 restantes quando masters humanos (T028) chegarem (ICE 210).
7. Homologar `frames-low-quality` (ICE 648) + certificação FPS física + leitores de tela reais.

**Justificativa**: Código técnico essencialmente completo (100%). Principais pendências: (a) E2E não verde localmente (storage persistido + 1 bug sem fix), (b) validações humanas/físicas não automatizáveis. O 80/20 de hoje é **fechar o portão E2E** (fix de storage + bug gate-full-ci-failures), não adicionar features.

**Estado Speckit (resumo):**
- Assessments: 3/3 completos (2 go, 1 needs-clarification).
- Specs: 001 195/228, 002 26/26, 003 68/68, 004 63/63, 005 32/38.
- Bugs: 21 total — 18 fluxo completo, 2 fix aplicado sem teste, 1 apenas assess (`gate-full-ci-failures`).
- Arquivos explícitos de `clarify/analyze/converge` não existem por spec; rastreamento via checklists/ROADMAP.

### 5.1 Fora de escopo (decisões registradas)
- Backend, banco de dados, API, frameworks.
- Landing page comercial (apenas docs).
- Fullscreen API.
- Gate em FPS no CI (SC-018 gateia em contador rAF = 0).
- WebKit no Fedora local (limitação de ambiente; CI Ubuntu/macOS).
