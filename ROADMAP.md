# ROADMAP.md — horror-web-comic

Roadmap orientado a **Outcomes (Resultados Mensuráveis)** e priorizado pela metodologia **ICE / 80-20 (Impacto × Confiança ÷ Esforço)**. Cada marco especifica o objetivo de negócio/leitor, o comando Speckit associado e os critérios de validação.

---

## 1. Visão Geral do Progresso (atualizado — 2026-10-28, pós-merge spec 005)

```
[████████████████████████████████░░░░] ~80% Conclusão Global
  - Escopo Técnico & Código:   ~85% [████████████████████████████░░░]
  - Verificação Automatizada:   ~90% [█████████████████████████████░░]
  - Validação Humana / Física:  25% [████████░░░░░░░░░░░░░░░░░░░░░░]
```

**Reconciliação com `OBJETIVO.md` e estado real (`dev` @ `b815273`):**

- `OBJETIVO.md` afirma "100% do escopo técnico automatizado completo", mas isso **não se sustenta** após o merge da spec 005 (7 tarefas parciais/abertas: T032–T038) e com a spec 003 tendo 31 issues GitHub abertas (T012–T045), apesar de `tasks.md` marcar 68/69 como concluídas.
- **Verificado diretamente nesta sessão**: `npm run validate` PASS (2 manifestos + catalog); `npm run test:unit` 227/227 PASS. **Não verificado pós-merge**: `build`, `build:images`, `test:e2e`, `test:perf`, `lhci`.
- **Bugs**: 16/16 com fluxo speckit.bug completo; 13 verified, 3 parciais.

---

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

## 3. Fase 2 — Validação Automatizada Pós-Merge (Próximo 80/20 imediato)

### 3.1 Revalidação completa do pipeline pós-merge spec 005 (T038)
- **Outcome**: Confirmar que o merge não quebrou build, imagens, E2E, perf, Lighthouse.
- **Ação**: `npm run ci` completo (CI Ubuntu para WebKit).
- **ICE**: Impacto 9 × Confiança 9 × Facilidade 9 = **729** → Prioridade Máxima Imediata.

### 3.2 Fechar tarefas parciais da spec 005 (T032–T037)
- **ICE**: 7 × 8 × 6 = **336**.

### 3.3 Fechar issues abertas da spec 003 (T012–T045)
- Bloqueado por entregável humano T028 (masters autorais).
- **ICE**: 6 × 7 × 5 = **210**.

---

## 4. Fase 3 — Validações Não Automatizáveis (Humanos / Dispositivo Real)

### 4.1 Protocolos operacionais de usabilidade (T171/T172) — ICE 810
- Roteiro + formulário para ≥ 10 participantes. Maior impacto/esforço entre itens humanos.

### 4.2 Homologação estética dos masters (`frames-low-quality`) — ICE 648
- Fix aplicado; falta homologação visual.

### 4.3 Certificação FPS física (SC-018) — ICE ~400
### 4.4 Leitores de tela reais (NVDA/VoiceOver/TalkBack) — ICE ~350

---

## 5. Recomendação Executiva 80/20

> **Ação Imediata Recomendada**: **Executar `npm run ci` completo no `dev` pós-merge spec 005** (ICE 729) — fecha a maior incerteza atual (build/E2E/perf/Lighthouse não revalidados) com esforço mínimo.

**Sequência sugerida**:
1. `npm run ci` → confirmar verde.
2. Fechar T032–T037 (spec 005) → spec 005 100%.
3. Fechar issues spec 003 restantes (depende de masters humanos T028).
4. Documentar protocolos de usabilidade (ICE 810).
5. Homologar `frames-low-quality` (ICE 648).
6. Certificação física FPS + leitores de tela.

**Justificativa**: código substancialmente completo (~85% técnico), mas verificação pós-merge não executada — maior lacuna de confiança com menor esforço. Gargalo humano permanece, mas é de menor urgência que confirmar o estado atual.

### 5.1 Fora de escopo (decisões registradas)
- Backend, banco de dados, API, frameworks.
- Landing page comercial (apenas docs).
- Fullscreen API.
- Gate em FPS no CI (SC-018 gateia em contador rAF = 0).
- WebKit no Fedora local (limitação de ambiente).
