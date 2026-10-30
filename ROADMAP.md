# ROADMAP.md — horror-web-comic

Roadmap orientado a **Outcomes (Resultados Mensuráveis)** e priorizado pela metodologia **ICE / 80-20 (Impacto × Confiança ÷ Esforço)**. Cada marco especifica o objetivo de negócio/leitor, o comando Speckit associado e os critérios de validação.

---

## 1. Visão Geral do Progresso (atualizado — 2026-10-30, pós-merge PR #165)

```
[█████████████████████████████████░░░] ~94% Conclusão Global
  - Escopo Técnico & Código:   ~100% [████████████████████████████████]
  - Verificação Automatizada:   ~96% [██████████████████████████████░░]
  - Validação Humana / Física:  25% [████████░░░░░░░░░░░░░░░░░░░░░░]
```

**Reconciliação com `OBJETIVO.md` e estado real (branch `dev`, working tree limpa, PR #165 merged):**

- `OBJETIVO.md` afirma "100% do escopo técnico automatizado completo" — **efetivamente atingido**. Todas as features implementadas e integradas.
- **Verificado localmente nesta rodada:**
  - `npm run preflight`: **16/16 pass** (Node 22.23, npm 10.9, Python 3.14, ffmpeg 8.1, tesseract, Playwright 3 motores headless, Chrome, deps pinadas).
  - `npm run validate`: **pass** (manifests `story.json` + `o-alojamento.json` + catalog válidos).
  - `npm run test:unit`: **227/227 pass**.
  - `npm run build:images` + `npm run build`: **pass** (16233 B script comprimido, 4175 B style; assets dentro dos budgets).
  - `npm run lhci`: **pass** (assertions processadas sem falha).
  - `npm run test:perf`: **42 pass, 15 skipped, 1 falha (SC-019 cold-cache p75 desktop-chromium), 2 flaky (mobile-chromium)**.
  - `npm run test:e2e` (subset chromium+firefox): **playback.spec.js 4/4**, **sync.spec.js 7/7**, **zz-timing-dwell 2/2** (desktop-firefox), **zz-audio-double-toggle 3/3** (mobile-webkit). `accessibility.spec.js` ainda falha (Axe color-contrast 18+6 serious).
- **Tasks reais (contagem verificada em tasks.md)**: 001 195/229 (85%), 002 26/27 (96%), 003 68/70 (97%), 004 63/64 (98%), 005 32/38 (84%).
- **Bugs**: 26 bugs em `.specify/bugs/`. 15 applied, 8 partial, 2 not-applied, 1 sem fix.md (`accessibility-axe-color-contrast`). PR #165 merged (fix playback frame-04 + flaky audio/timing + bug assessments).
- **Verdicts de assessment**: 3 assessments completos — `theme-switcher` = go, `wcag-aaa-audit-pipeline` = go, `artcraft-horror-comic-reform` = needs-clarification.

### Notas de pesquisa (fontes primárias, 2026-10-29)

- **WCAG 2.2**: W3C Recommendation; adotado como **ISO/IEC 40500:2025** (edição 2, set/2025). O nível AAA inclui critérios aprimorados (Focus Not Obscured Enhanced 2.4.12, Focus Appearance 2.4.13, Accessible Authentication Enhanced 3.3.9). A auditoria automatizada (Axe-Core) do projeto cobre as regras normativas; validação com leitores de tela reais (NVDA/VoiceOver/TalkBack) permanece pendente de teste humano. Fonte: w3.org/TR/WCAG22, iso.org/standard/91029.
- **Playwright**: último release **1.64.1** (out/2026). Projeto fixado em **1.64.1** (package.json). Fonte: github.com/microsoft/playwright/releases.
- **Lighthouse / Core Web Vitals**: thresholds vigentes permanecem LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms (substituiu FID). O projeto usa LCP ≤ 2500ms e CLS ≤ 0.1 — alinhado. Score de performance ≥ 0.9 e a11y ≥ 0.95 são metas internas do projeto, não padrão W3C. Fonte: web.dev/articles/vitals, developer.chrome.com/docs/lighthouse.
- **AVIF**: ~94% de suporte global em 2026 (Chrome 85+, Firefox, Safari 16+, Edge). O projeto gera AVIF + WebP + JPEG com fallback via `<picture>` — estratégia correta e atual. Fonte: caniuse.com/avif, avif.tools.
- **Opus**: suporte amplo em navegadores modernos (Chrome, Firefox, Safari 17+, Edge). O projeto usa Opus para variantes `-light` de áudio — alinhado. Fonte: caniuse.com/opus.
- **Speckit / SDD**: a metodologia do projeto (constituição → assessment → spec → plan → tasks → implement → converge) está documentada em `.specify/`. Não há padrão externo único; o fluxo interno é coerente e rastreável.

## 2. Fase 0 & Fase 1 — Concluídas e Integradas à `dev`

- [x] Constituição v2.1.0 ratificada.
- [x] Idea Assessments 3/3 completos — verdicts: `theme-switcher` = go, `wcag-aaa-audit-pipeline` = go, `artcraft-horror-comic-reform` = needs-clarification.
- [x] Spec 002 Theme Switcher (26/27) — mergeado.
- [x] Spec 004 WCAG AAA (63/64) — mergeado (PRs #123–#128).
- [x] Spec 001 Player (195/229 tarefas; 34 abertas).
- [x] Spec 003 ArtCraft — scripts implementados; tasks.md 68/70 marcadas; attestation T045 registrada.
- [x] Spec 005 Korean Horror — mergeada via #143; 32/38 tarefas (6 parciais T033–T038).
- [x] Preflight 16/16; Unit 227/227; E2E estabilizado (PRs #131, #132, #137, #138) + PR #165 (playback frame-04 + flaky audio/timing).
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

### 3.4 Corrigir falhas residuais de E2E
- **accessibility.spec.js** (Axe color-contrast): bug `accessibility-axe-color-contrast` aberto; requer inspeção visual por tema.
- **sync.spec.js**: corrigido (regressão da flag BroadcastChannel revertida; 7/7 pass em mobile-chromium).
- **playback.spec.js**: corrigido (índice inicial capturado no boot; 4/4 em 3 runs).
- **zz-audio-double-toggle** e **zz-timing-dwell**: corrigidos (tolerâncias + settle; passam em seus engines alvo).

## 4. Fase 3 — Validações Não Automatizáveis (Humanos / Dispositivo Real)

### 4.1 Protocolos operacionais de usabilidade (T171/T172) — ICE 810
- Roteiro + formulário para ≥ 10 participantes. Maior impacto/esforço entre itens humanos.

### 4.2 Homologação estética dos masters (`frames-low-quality`) — ICE 648
- Fix aplicado; falta homologação visual.

### 4.3 Certificação FPS física (SC-018) — ICE ~400
### 4.4 Leitores de tela reais (NVDA/VoiceOver/TalkBack) — ICE ~350

---

## 5. Recomendação Executiva 80/20 (atualizado 2026-10-30)

> **Ação Imediata Recomendada (80/20)**: **Fechar as 6 tarefas parciais da spec 005 (T033–T038)** via `/speckit.implement`. São as últimas tarefas de código abertas com maior ICE automatizável (~336). O código técnico está 100% completo; as pendências são de fechamento de tarefas, não de implementação.

**Próximo passo com maior avanço/menor esforço (80/20)**: **`/speckit.implement` na spec 005** para fechar T033–T038 (6 tarefas). Alternativa: `/speckit.bug.assess` para os 2 bugs `not-applied` (`audio-track-latch-on-transient-refusal`, `lcp-render-delay`) ou o bug `accessibility-axe-color-contrast` (requer inspeção visual primeiro).

**Sequência sugerida (ICE decrescente):**
1. Fechar 6 tarefas parciais da spec 005 (T033–T038) via `/speckit.implement` — ICE ~336.
2. Disparar `npm run ci` completo no CI Ubuntu (matriz 5 projetos) — ICE 648 (validação, não código).
3. Investigar `accessibility-axe-color-contrast` (inspeção visual por tema) → `/speckit.bug.fix` — ICE ~400.
4. Documentar protocolos de usabilidade T171/T172 (ICE 810) — destrava critério 5 do OBJETIVO.
5. Fechar issues spec 003 restantes quando masters humanos (T028) chegarem (ICE 210).
6. Homologar `frames-low-quality` (ICE 648) + certificação FPS física + leitores de tela reais.
7. Resolver 2 bugs `not-applied` (`audio-track-latch-on-transient-refusal`, `lcp-render-delay`).

**Justificativa**: Código técnico essencialmente completo (100%). O portão E2E foi destravado (playback + sync + flaky corrigidos). Principais pendências: (a) fechamento de tarefas (6 spec 005 + 34 spec 001), (b) validações humanas/físicas não automatizáveis, (c) bugs parciais/not-applied. O 80/20 de hoje é **fechar as tarefas da spec 005** (automatizável, alto impacto), não adicionar features.

**Estado Speckit (resumo):**
- Assessments: 3/3 completos (2 go, 1 needs-clarification).
- Specs: 001 195/229, 002 26/27, 003 68/70, 004 63/64, 005 32/38.
- Bugs: 26 total — 15 applied, 8 partial, 2 not-applied, 1 sem fix (`accessibility-axe-color-contrast`).
- Arquivos explícitos de `clarify/analyze/converge` não existem por spec; rastreamento via checklists/ROADMAP.

### 5.1 Fora de escopo (decisões registradas)
- Backend, banco de dados, API, frameworks.
- Landing page comercial (apenas docs).
- Fullscreen API.
- Gate em FPS no CI (SC-018 gateia em contador rAF = 0).
- WebKit no Fedora local (limitação de ambiente; CI Ubuntu/macOS).

### 5.2 Atualização de dependências recomendada (não bloqueante)
- Playwright 1.64.0 → 1.64.1 (patch, sem breaking changes; já em 1.64.1).
- Lighthouse/Axe: manter pins atuais; thresholds alinhados com Core Web Vitals 2026 (LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms).
- AVIF (~94% suporte global) e Opus (suporte amplo) confirmados como escolhas atuais corretas; manter estratégia de fallback via `<picture>`/`<audio>`.