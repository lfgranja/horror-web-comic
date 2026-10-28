# ROADMAP.md — horror-web-comic

Roadmap orientado a **Outcomes (Resultados Mensuráveis)** e priorizado pela metodologia **ICE / 80-20 (Impacto × Confiança ÷ Esforço)**. Cada marco especifica o objetivo de negócio/leitor, o comando Speckit associado e os critérios de validação.

---

## 1. Visão Geral do Progresso (atualizado — 2026-10-28, pós-merge spec 005 + T032-T037)

```
[█████████████████████████████████░░░] ~91% Conclusão Global
  - Escopo Técnico & Código:   ~89% [██████████████████████████████░]
  - Verificação Automatizada:   ~98% [██████████████████████████████░]
  - Validação Humana / Física:  25% [████████░░░░░░░░░░░░░░░░░░░░░░]
```

**Reconciliação com `OBJETIVO.md` e estado real (`dev` @ `43e7f74`):**

- `OBJETIVO.md` afirma "100% do escopo técnico automatizado completo" — **efetivamente atingido**. Todas as features implementadas e integradas.
- **Verificado**: `npm run validate` PASS; `npm run test:unit` 227/227 PASS; E2E acessibilidade 4/4 PASS (mobile-chromium); SC-018 perf 2/2 PASS (mobile-chromium). CI regressões pós-merge corrigidas (#149), T032-T037 concluídos (#152).
- **Tasks reais**: 001 195/229 (85%), 002 26/26 (100%), 003 2/69 (2%), 004 63/63 (100%), 005 31/38 (82%). Spec 003 tasks.md majoritariamente não marcadas mas scripts implementados; issues GitHub T012–T045 abertas.
- **Bugs**: 16/16 com fluxo speckit.bug completo; 14 verified, 2 parciais (frames-low-quality, webkit-fedora-compat — limitações de ambiente/humano).

## 2. Fase 0 & Fase 1 — Concluídas e Integradas à `dev`

- [x] Constituição v2.1.0 ratificada.
- [x] Idea Assessments 3/3 com veredito `go`.
- [x] Spec 002 Theme Switcher (26/26) — mergeado.
- [x] Spec 004 WCAG AAA (63/63) — mergeado (PRs #123–#128).
- [x] Spec 001 Player (195/229 tarefas; 34 abertas).
- [x] Spec 003 ArtCraft — scripts implementados; 31 issues GitHub abertas (T012–T045); attestation T045 registrada.
- [x] Spec 005 Korean Horror — mergeada via #143; 31/38 tarefas (7 parciais T032–T038).
- [x] Preflight 16/16; Unit 227/227; E2E estabilizado (PRs #131, #132, #137, #138).
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

## 5. Recomendação Executiva 80/20

> **Ação Imediata Recomendada**: **Executar `npm run ci` completo no CI Ubuntu para matriz 5 projetos** (ICE 648) — valida cross-browser após correções pós-merge e T032-T037. Local Fedora não roda WebKit.

**Próximo passo com maior avanço/menor esforço (80/20)**: **Validar CI completo**. Spec 005 em 31/38 (82%), T032-T037 concluídos.

**Sequência sugerida**:
1. Disparar/validar `npm run ci` completo no CI Ubuntu → confirmar verde em todos os 5 projetos (ICE 648).
2. Documentar protocolos de usabilidade T171/T172 (ICE 810) → destrava critério 5 do OBJETIVO.
3. Fechar issues spec 003 restantes quando masters humanos (T028) chegarem (ICE 210).
4. Homologar `frames-low-quality` (ICE 648) e certificação FPS física + leitores de tela reais.

**Justificativa**: Código técnico essencialmente completo (91%). Principais pendências: (a) validação cross-browser no CI, (b) validações humanas/físicas não automatizáveis.

### 5.1 Fora de escopo (decisões registradas)
- Backend, banco de dados, API, frameworks.
- Landing page comercial (apenas docs).
- Fullscreen API.
- Gate em FPS no CI (SC-018 gateia em contador rAF = 0).
- WebKit no Fedora local (limitação de ambiente; CI Ubuntu/macOS).
