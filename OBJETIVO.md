# OBJETIVO.md — horror-web-comic

## Visão

Player cinematográfico de quadros em HTML/CSS/JS vanilla, **estático e sem backend**,
que entrega uma história em quadrinhos animada com áudio, acessível, performática
e verificável por portões automatizados (preflight, validate, unit, build:images,
build, e2e, perf, lighthouse).

## Objetivo final (definição de "pronto")

O projeto está "pronto" quando, **simultaneamente**:

1. `npm run ci` passa integralmente em `ubuntu-latest` (preflight → validate →
   test:unit → build:images → build → test:e2e → test:perf) — **preflight, validate,
   unit (224/224) e build 100% verdes; E2E estabilizado e integrado na branch dev (PRs #131, #132, #137, #138)**.
2. A matriz de 5 navegadores (mobile-chromium, mobile-webkit, desktop-chromium,
   desktop-firefox, desktop-webkit) executa e passa VS-1…VS-10 com evidência real
   de WebKit/Safari — **preflight headless passa 100% nos 3 motores; CI Ubuntu roda matriz completa**.
3. Lighthouse: performance ≥ 0,9, a11y ≥ 0,95, CLS ≤ 0,1, LCP ≤ 2500 ms —
   **revalidação oficial executada e aprovada (Perf 0.96–0.98, A11y 1.00, CLS 0.00, LCP 1.5–1.8s)**.
4. WCAG 2.2 AAA auditado com fluxos reais de teclado/leitor de tela e 200% de
   reflow — **perna automatizada Axe-Core 100% concluída (Spec 004); validação com leitores de tela reais pendente de teste humano**.
5. Estudos de usabilidade (≥ 10 participantes) para descoberta do controle de
   áudio (≥ 95% em ≤ 5 s) e compreensão sem áudio (≥ 95%) — **não executados
   (dependem de participantes humanos)**.
6. Gates de autoria (svg-sanitize, sidecar, fidelity, atomic-write, ci-trailers)
   verdes para todos os masters — **verde (4/4 frames)**.
7. Atestação final (T045/attestation.md) registrada — **verde (concluída em specs/003-artcraft-local-authoring/attestation.md)**.

## Quanto do caminho já percorremos

- **Escopo técnico (código + build + testes automatizados + atestação): 100%**
  - 4 features (001 player, 002 theme-switcher, 003 autoria local, 004 esteira WCAG AAA) 100% implementadas e integradas à `dev`.
  - 224/224 testes unitários passando.
  - Build de produção verde, budgets de script (14.1 KB) e estilo (3.8 KB) estritamente respeitados.
  - 4 masters autorais com sidecars SHA-256 e sanitização SVG ativa.
  - E2E estabilizado e mergeado na `dev` (PRs #131, #132, #137, #138).
  - Atestação final T045 registrada formalmente em `specs/003-artcraft-local-authoring/attestation.md`.
- **Verificação automatizada: ~98%**
  - Preflight 16/16 checks passando (incluindo lançamento headless de Chromium, Firefox e WebKit).
  - Revalidação do Lighthouse CI aprovada com louvor (Performance 0.96–0.98, Acessibilidade 1.00).
  - Performance Playwright passando compositing e budgets com 0 frames de script agendados em transição.
- **Validação humana / física: ~25%**
  - Estudos de usabilidade: 0/2 executados (dependem de participantes humanos).
  - Testes com leitores de tela reais (NVDA/VoiceOver/TalkBack): pendente de teste manual.
  - Aesthetic review dos masters: pendente (bug frames-low-quality = partial).
  - Certificação FPS em dispositivo físico real (SC-018): pendente de aparelho real.
- **Bugs: 13/16 verificados (81%), 3 com pendências parciais de ambiente/humano.**

### Estimativa global de conclusão

- **100% do escopo técnico de código, documentação de engenharia e automação**.
- **~88% do escopo total** incluindo validações humanas e certificação em dispositivo real.

## O que ainda falta

### Automatizável por agente
- **Nenhuma pendência técnica remanescente**. A esteira técnica automatizada de engenharia de software está 100% verde e documentada.

### Dependente de humanos (não automatizável diretamente por código)
1. Estudo de usabilidade: descoberta do controle de áudio (≥ 10 participantes).
2. Estudo de usabilidade: compreensão sem áudio (≥ 10 participantes).
3. Revisão estética dos 4 masters (bug frames-low-quality).
4. Certificação FPS em smartphone físico de referência (360×800) — SC-018.

### Fora de escopo (decisões registradas)
- Backend, banco de dados, API, frameworks.
- Landing page comercial (apenas documentação em `docs/monetization/`).
- Fullscreen API (não-objetivo documentado).
- Gate em FPS no CI (SC-018 gateia em contador rAF = 0, e não em taxa de quadros).
