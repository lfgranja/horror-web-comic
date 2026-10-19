# OBJETIVO.md — horror-web-comic

## Visão

Player cinematográfico de quadros em HTML/CSS/JS vanilla, **estático e sem backend**,
que entrega uma história em quadrinhos animada com áudio, acessível, performática
e verificável por portões automatizados (preflight, validate, unit, build:images,
build, e2e, perf, lighthouse).

## Objetivo final (definição de "pronto")

O projeto está "pronto" quando, **simultaneamente**:

1. `npm run ci` passa integralmente em `ubuntu-latest` (preflight → validate →
   test:unit → build:images → build → test:e2e → test:perf) — **já passa
   exceto 5 falhas E2E flaky e o host WebKit local**.
2. A matriz de 5 navegadores (mobile-chromium, mobile-webkit, desktop-chromium,
   desktop-firefox, desktop-webkit) executa e passa VS-1…VS-10 com evidência real
   de WebKit/Safari — **bloqueado por host (ICU 74) localmente; CI Ubuntu passa**.
3. Lighthouse: performance ≥ 0,9, a11y ≥ 0,95, CLS ≤ 0,1, LCP ≤ 2500 ms —
   **relatórios históricos presentes; revalidação periódica**.
4. WCAG 2.2 AAA auditado com fluxos reais de teclado/leitor de tela e 200% de
   reflow — **parcial (automatizado + manual pendente)**.
5. Estudos de usabilidade (≥ 10 participantes) para descoberta do controle de
   áudio (≥ 95% em ≤ 5 s) e compreensão sem áudio (≥ 95%) — **não executados
   (dependem de humanos)**.
6. Gates de autoria (svg-sanitize, sidecar, fidelity, atomic-write, ci-trailers)
   verdes para todos os masters — **verde (4/4 frames)**.
7. Atestação final (T045/attestation.md) registrada — **pendente**.

## Quanto do caminho já percorremos

- **Escopo técnico (código + build + testes automatizados): ~95%**
  - 3 features (001 player, 002 theme-switcher, 003 autoria local) implementadas.
  - 155/155 testes unitários passando.
  - Build de produção verde, budgets respeitados.
  - 4 masters re-autorados com sidecars válidos.
- **Verificação automatizada: ~90%**
  - Preflight 14/16 (2 falhas de host WebKit).
  - E2E Chromium 255/260 (5 falhas flaky documentadas).
  - Lighthouse histórico presente.
- **Validação humana/manual: ~20%**
  - Estudos de usabilidade: 0/2 executados.
  - WCAG AAA com leitor de tela: parcial.
  - Aesthetic review dos masters: pendente (bug frames-low-quality = partial).
- **Bugs: 9/13 verificados (69%), 4 parciais.**

### Estimativa global de conclusão

- **~85% do escopo técnico** (código, build, gates automatizados).
- **~60% do escopo total** incluindo validações humanas e certificação em
  dispositivo real.

## O que ainda falta

### Automatizável por agente (prioridade)
1. Fechar os 5 E2E falhando no Chromium (deferred-behavior-coverage parcial).
2. Desbloquear WebKit no host (instalar compat `libicu74`) para rodar a matriz
   localmente e obter evidência real de Safari.
3. Revalidar Lighthouse após mudanças (perf ≥ 0,9, a11y ≥ 0,95, CLS ≤ 0,1,
   LCP ≤ 2500).
4. Completar audit WCAG 2.2 AAA automatizado (axe/pa11y + checks de teclado).
5. Registrar atestação final (T045).

### Dependente de humanos (não automatizável)
6. Estudo de usabilidade: descoberta do controle de áudio (≥ 10 participantes).
7. Estudo de usabilidade: compreensão sem áudio (≥ 10 participantes).
8. Revisão estética dos 4 masters (bug frames-low-quality).
9. Certificação FPS em dispositivo de referência (360×800) — SC-018.

### Fora de escopo (decisões registradas)
- Backend, banco de dados, API, framework.
- Landing page comercial (apenas docs em `docs/monetization/`).
- Script opcional `clean:assets` (T005, omitido por design).
- Gate em FPS (SC-018 gateia em contador, não em FPS).
