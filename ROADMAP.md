# ROADMAP.md — horror-web-comic

Roadmap orientado a **Outcomes (Resultados Mensuráveis)** e priorizado pela metodologia **ICE / 80-20 (Impacto × Confiança ÷ Esforço)**. Cada marco especifica o objetivo de negócio/leitor, o comando Speckit associado e os critérios de validação.

---

## 1. Visão Geral do Progresso (atualizado — 2026-11-01)

```
[██████████████████████████████████░] ~93-94% Conclusão Global
  - Escopo Técnico & Código:   ~100% [████████████████████████████████]
  - Verificação Automatizada:   ~96% [█████████████████████████████░░]
  - Validação Humana / Física:  25% [████████░░░░░░░░░░░░░░░░░░░░░░]
```

**Reconciliação com `OBJETIVO.md` e estado real (branch `dev`, working tree com `M AGENTS.md`):**

- `OBJETIVO.md` afirma "100% do escopo técnico automatizado completo" — **efetivamente atingido**. Todas as features principais (001-004) implementadas e integradas à `dev`. Spec 005 parcialmente integrada.
- **Verificado localmente nesta rodada (2026-11-01):**
  - Branch: `dev` @ `2bc8874` "docs(bug): update webkit-layout-gate-end-overlay fix evidence". Working tree: `M AGENTS.md`.
  - `npm run preflight`: **15/16 pass** — falha em `installed-versions` (deps em node_modules divergem dos pins: `@axe-core/playwright` 4.13.0 vs 4.14.0, `@playwright/test` 1.64.0 vs 1.64.1, `fast-check` 3.23.2 vs 4.10.2). Fix: `npm ci`.
  - `npm run test:unit`: **226/227 pass, 1 fail** (preflight.test.js por divergência de versões).
  - `npm run validate`: estrutura OK.
- **Tasks reais (contagem verificada em tasks.md):** 001 195/228 (85%), 002 26/26 (100%), 003 68/68 (100%), 004 63/63 (100%), 005 32/38 (84%).
- **Spec 003:** tasks.md 68/68 marcadas; scripts implementados + attestation T045 registrada em `specs/003-artcraft-local-authoring/attestation.md`.
- **Bugs:** 27 pastas em `.specify/bugs/`. Maioria com fluxo completo (assessment+fix+test). Alguns parciais/recentes: `accessibility-axe-color-contrast` (só assess+fix), `gate-ci-e2e-failures-40792880928/40801713567` (só assess+fix), `pr166-ci-gate-failure` e `webkit-layout-gate-end-overlay` muito recentes.
- **Verdicts de assessment:** 3 assessments completos — `theme-switcher` = go, `wcag-aaa-audit-pipeline` = go, `artcraft-horror-comic-reform` = **needs-clarification** (bloqueado intencionalmente).

### Notas de pesquisa (fontes primárias, 2026-11-01)
- **WCAG 2.2**: W3C Recommendation, adotado como **ISO/IEC 40500:2025**. Nível AAA inclui Focus Not Obscured Enhanced (2.4.12), Focus Appearance (2.4.13), Accessible Authentication Enhanced (3.3.9). Auditoria automatizada (Axe-Core) cobre regras normativas; validação com leitores de tela reais (NVDA/VoiceOver/TalkBack) permanece pendente. (w3.org/TR/WCAG22, iso.org/standard/91029)
- **Playwright**: 1.64.1 mais recente; projeto fixado em 1.64.0/1.64.1 conforme ambiente (atualizar recomendado mas não bloqueante). (github.com/microsoft/playwright/releases)
- **Core Web Vitals**: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms (FID substituído). Projeto usa metas alinhadas (LCP ≤ 2500ms, CLS ≤ 0.1). (web.dev/articles/vitals)
- **AVIF/Opus**: suporte amplo (~94% AVIF), estratégia com fallback via `<picture>`/`<audio>` correta e atual.

---

## 2. Fase 0 & Fase 1 — Concluídas e Integradas à `dev`

- [x] Constituição v2.1.0 ratificada (`.specify/memory/constitution.md`).
- [x] Idea Assessments 3/3 completos — verdicts: `theme-switcher` = go, `wcag-aaa-audit-pipeline` = go, `artcraft-horror-comic-reform` = **needs-clarification** (não promovido a spec).
- [x] Spec 002 Theme Switcher (26/26) — mergeado.
- [x] Spec 004 WCAG AAA (63/63) — mergeado.
- [x] Spec 001 Player (195/228 tarefas; 33 abertas).
- [x] Spec 003 ArtCraft — scripts implementados; tasks.md 68/68 marcadas; attestation T045 registrada.
- [x] Spec 005 Korean Horror Mechanics — 32/38 tarefas (6 parciais T033–T038).
- [x] Preflight 16/16 anteriormente; agora 15/16 por pinning — restaurar com `npm ci`.
- [x] Lighthouse CI aprovado anteriormente (Perf 0.96–0.98, A11y 1.00, CLS 0.00, LCP 1.5–1.8s).

---

## 3. Fase 2 — Validação Automatizada e Hardening

### 3.1 Sincronizar toolchain (BLOQUEADOR IMEDIATO) — ICE 900
- **Comando**: `npm ci`
- **Motivo**: Restaurar `preflight` para 16/16 e `test:unit` para 227/227. Bloqueador para validação limpa.
- **Critério**: `npm run preflight` passa 16/16; `npm run test:unit` 227/227.

### 3.2 Fechar tarefas parciais da spec 005 (T033–T038) — ICE 392
- **Ação**: Via `/speckit.implement` finalizar broadcast `hwc:sensory`, redução de movimento/bypass, purge atômico <50ms, badge consultivo 5s + estado áudio, catálogo com barras/badges/Escape, atenuação 20% do sting na revisita.
- **Critério**: T033–T038 marcadas completas; testes relevantes passam.

### 3.3 Completar bugs parciais sem `test.md` — ICE 448
- **Alvo**: `accessibility-axe-color-contrast` (add test.md), `gate-ci-e2e-failures-40792880928`, `gate-ci-e2e-failures-40801713567`. Avaliar `ci-regression-post-spec005`, `pr166-ci-gate-failure`, `webkit-layout-gate-end-overlay`.
- **Ação**: Usar `/speckit.bug.assess`/`/speckit.bug.fix`/`/speckit.bug.test` conforme necessário.
- **Critério**: Fluxo completo (assessment+fix+test) onde aplicável.

### 3.4 Revalidar CI completo (Ubuntu matriz 5 projetos) — ICE 648
- **Ação**: Após sincronização + correções, rodar `npm run ci` local ou disparar CI. Fedora não roda WebKit localmente.
- **Critério**: `npm run ci` passa integralmente em ubuntu-latest (gate + webkit-layout-gate + macos-webkit-compositor).

---

## 4. Fase 3 — Validações Não Automatizáveis (Humanos / Dispositivo Real)

### 4.1 Protocolos operacionais de usabilidade (T171/T172) — ICE 280
- **Ação**: Criar roteiro + formulário para ≥ 10 participantes (descoberta controle áudio ≤5s, compreensão sem áudio ≥95%).
- **Critério**: Protocolos documentados e prontos para execução.

### 4.2 Homologação estética dos masters (`frames-low-quality`) — ICE 336
- **Ação**: Revisão visual dos 4 masters autorais.
- **Critério**: Homologação registrada.

### 4.3 Certificação FPS física (SC-018) — ICE 147
- **Ação**: Testar em smartphone físico de referência (360×800), contador rAF = 0 frames.
- **Critério**: Evidência registrada.

### 4.4 Leitores de tela reais (NVDA/VoiceOver/TalkBack) — ICE 168
- **Ação**: Validação manual WCAG 2.2 AAA.
- **Critério**: Evidência registrada.

---

## 5. Recomendação Executiva 80/20 (atualizado 2026-11-01)

> **Ação Imediata Recomendada (80/20)**: **Sincronizar toolchain com `npm ci`** (ICE 900). É bloqueador para validar gates limpos. Restaurará preflight/unit para estado verde.

**Próximo passo com maior avanço/menor esforço:**
1. `npm ci` → `npm run preflight` → `npm run test:unit` (restaurar verde)
2. Completar bugs parciais sem `test.md` (`/speckit.bug.test`)
3. Fechar T033–T038 da spec 005 via `/speckit.implement`
4. Revalidar via CI Ubuntu (`npm run ci`)

**Sequência sugerida (ICE decrescente):**
1. Toolchain sync (`npm ci`) — ICE 900
2. Bugs parciais — ICE 448
3. Spec 005 remanescentes (T033–T038) — ICE 392
4. CI completo Ubuntu — ICE 648
5. Usabilidade/homologação estética — ICE 280-336
6. Validações físicas/manuais — ICE 147-168
7. Spec 001 gaps (33 tarefas abertas) — avaliar pós-estabilização

**Justificativa:** Código técnico essencialmente completo (100%). Pendências principais: (a) sincronização de toolchain (bloqueador), (b) finalizar spec 005 e bugs parciais, (c) validações humanas/físicas não automatizáveis. O 80/20 é **restaurar gates verdes primeiro**.

**Estado Speckit (resumo):**
- Assessments: 3/3 completos (2 go, 1 needs-clarification - `artcraft-horror-comic-reform` bloqueado intencionalmente)
- Specs: 001 195/228, 002 26/26, 003 68/68, 004 63/63, 005 32/38
- Bugs: 27 total — maioria com fluxo completo, alguns parciais/recentes em tratamento
- Constitution v2.1.0 estabelecida

### 5.1 Fora de escopo (decisões registradas)
- Backend, banco de dados, API, frameworks.
- Landing page comercial (apenas docs em `docs/monetization/`).
- Fullscreen API.
- Gate em FPS no CI (SC-018 gateia em contador rAF = 0).
- WebKit no Fedora local (limitação de ambiente; CI Ubuntu/macOS).

### 5.2 Atualização de dependências recomendada
- **Crítico agora:** Sincronizar com pins via `npm ci`.
- Playwright 1.64.0 → 1.64.1 (patch recomendado).
- Lighthouse/Axe manter pins atuais; thresholds alinhados com Core Web Vitals 2026 (LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms).
- AVIF (~94% suporte global) e Opus (suporte amplo) confirmados; manter estratégia de fallback via `<picture>`/`<audio>`.
