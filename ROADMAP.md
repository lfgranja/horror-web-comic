# ROADMAP.md — horror-web-comic

Roadmap ordenado por **impacto/esforço (80/20)**. Cada item referencia o
comando Speckit sugerido e o ganho esperado.

## Fase 0 — Concluída (não reabrir)

- [x] Constituição v2.1.0
- [x] Assessments: theme-switcher, artcraft-horror-comic-reform (5 artefatos cada)
- [x] Specs 001/002/003 + plans + tasks + contracts
- [x] Implementação do player, theme-switcher e gates de autoria
- [x] 155/155 testes unitários
- [x] Build de produção verde + budgets
- [x] 4 masters re-autorados com sidecars válidos
- [x] 9/13 bugs verificados

## Fase 1 — Maior ganho / menor esforço (80/20)  ← PRÓXIMA

### 1.1 Desbloquear WebKit no host (bug.assess → bug.fix)
- **Comando:** `/speckit.bug.assess` (slug sugerido: `webkit-fedora-compat`)
- **Ação:** instalar compat `libicu74` (pacote Fedora ou extrair libs do .deb
  Ubuntu 24.04 em `~/.local/lib/playwright-compat/icu/`), exportar
  `LD_LIBRARY_PATH`, re-rodar `npm run preflight`.
- **Ganho:** fecha 2 falhas de preflight, desbloqueia mobile-webkit +
  desktop-webkit, permite evidência real de Safari (SC-005/SC-022).
- **Esforço:** baixo (1 pacote + env).
- **Referência:** CybLow/playwright-fedora; issue microsoft/playwright#14736.

### 1.2 Fechar os 5 E2E falhando no Chromium (bug.assess → bug.fix)
- **Comando:** `/speckit.bug.assess` (estender slug `deferred-behavior-coverage`)
- **Ação:** corrigir audio-activity, resume, runtime-convergence,
  zz-legacy-playback, zz-legacy-speed-volume (races de carga/áudio).
- **Ganho:** CI `test:e2e` 100% verde no Chromium; remove flakiness.
- **Esforço:** médio.

## Fase 2 — Verificação e qualidade (médio esforço)

### 2.1 Revalidar Lighthouse
- **Comando:** `/speckit.specify` (tarefa de verificação, não feature)
- **Ação:** `npm run ci:lighthouse`; confirmar perf ≥ 0,9, a11y ≥ 0,95,
  CLS ≤ 0,1, LCP ≤ 2500.
- **Ganho:** fecha T044a/T052.
- **Esforço:** baixo (requer Chrome).

### 2.2 Audit WCAG 2.2 AAA automatizado
- **Comando:** `/speckit.assess.intake` (slug sugerido: `wcag-aaa-audit-pipeline`)
- **Ação:** integrar axe-core/pa11y no CI + checks de teclado/foco/contraste;
  documentar itens que exigem leitor de tela real.
- **Ganho:** fecha T144/T159/T176 parcialmente.
- **Esforço:** médio.

### 2.3 Rodar matriz completa em CI (Ubuntu)
- **Comando:** `/speckit.bug.test` (slug `e2e-load-races`)
- **Ação:** executar `npm run ci` no runner Ubuntu com PulseAudio null sink;
  anexar relatório Playwright.
- **Ganho:** evidência real de WebKit/Safari (SC-022).
- **Esforço:** baixo (já configurado em ci.yml).

## Fase 3 — Dependente de humanos (não automatizável por agente)

### 3.1 Estudos de usabilidade (T171, T172)
- **Comando:** `/speckit.assess.intake` (slug: `usability-studies-execution`)
- **Ação:** recrutar ≥ 10 participantes; executar protocolos de descoberta de
  controle de áudio e compreensão sem áudio; registrar em
  `specs/001-cinematic-player/notes/`.
- **Ganho:** fecha SC-002/SC-004.
- **Esforço:** alto (humano).

### 3.2 Revisão estética dos masters (bug frames-low-quality)
- **Comando:** `/speckit.bug.test` (slug `frames-low-quality`)
- **Ação:** revisão visual humana dos 4 SVGs; decidir se atende alvo
  Alan Moore / Eddie Campbell.
- **Ganho:** fecha bug partial → verified.
- **Esforço:** baixo (humano, subjetivo).

### 3.3 Certificação FPS em dispositivo real (SC-018)
- **Comando:** `/speckit.assess.intake` (slug: `fps-real-device-certification`)
- **Ação:** provisionar perfil 360×800; rodar trace; remediar < 60 fps.
- **Ganho:** fecha T124/T140/T157/T173.
- **Esforço:** médio (requer dispositivo/emulação).

## Fase 4 — Encerramento

### 4.1 Atestação final
- **Comando:** `/speckit.implement` (T045)
- **Ação:** registrar relatório determinístico em
  `specs/003-artcraft-local-authoring/attestation.md`.
- **Ganho:** fecha objetivo "pronto".
- **Esforço:** baixo.

## Recomendação 80/20 (próximo passo único)

> **`/speckit.bug.assess` para o slug `webkit-fedora-compat`** (instalar compat
> `libicu74` e validar preflight).

**Por quê:** é o item com a **maior razão impacto/esforço** — um único pacote
de sistema desbloqueia 2 projetos do Playwright (mobile-webkit, desktop-webkit),
fecha 2 falhas de preflight e destrava a evidência real de Safari (SC-005/SC-022),
sem alterar código. Em seguida, estender `deferred-behavior-coverage` para os
5 E2E falhando (Fase 1.2).

Itens de maior impacto mas **não automatizáveis** (estudos de usabilidade,
revisão estética) devem ser agendados com humanos em paralelo, pois não bloqueiam
os portões automatizados.
