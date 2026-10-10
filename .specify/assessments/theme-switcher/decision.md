# Decision: Theme Switcher para os 5 Design Systems no Horror Web Comic

- **Slug**: theme-switcher
- **Decided**: 2026-09-30T20:14:00-04:00
- **Verdict**: go
- **Artifacts reviewed**: intake.md, research.md, problem.md, concept.md

## Scorecard

| Criterion | Rating | Justification |
|---|---|---|
| Problem validity | strong | Desconforto/fadiga visual em leitores com fotofobia ou astigmatismo é um problema real; 5 estéticas já foram validadas no laboratório e trazem ganho de replay value. |
| Evidence strength | strong | Medições reais de Gzip no repositório comprovam que os 5 temas cabem folgadamente no teto de 15 KB (7.797 bytes totais vs. 15.000 bytes limite). |
| Value vs. inaction | strong | Fazer nada mantém leitores reféns de uma única estética e ignora todo o trabalho de design já pronto e homologado. |
| Feasibility / appetite | strong | A Opção A (Seletor minimalista na barra auxiliar) tem apetite `small` (1-2 dias), segue os padrões existentes de volume/speed e tem risco de implementação mínimo. |
| Strategic fit | strong | 100% alinhado à constituição do projeto (Vanilla ES Modules, CSS puro, WCAG 2.2 AAA, SC-018 compositing, zero CLS). |
| Risk posture | strong | Riscos de quebra em telas de 320px mitigados pelo posicionamento no grupo auxiliar (`.auxiliary-controls`); risco de CLS mitigado por tokens estáticos. |

## Verdict & Rationale

**Veredito: GO.**
A proposta foi formalmente aprovada pelo stakeholder para a **Opção A — Seletor Integrado na Barra Auxiliar do Player (Minimalist Control)**. As evidências técnicas demonstram viabilidade orçamentária impecável (mais de 7.200 bytes de margem livre em CSS Gzip), impacto zero em layout shifts, conformidade plena com WCAG 2.2 AAA e alto valor agregado de acessibilidade e imersão narrativa. A ideia está madura e pronta para ser convertida em especificação formal no Spec-Driven Development (`/speckit-specify`).

## Handoff to `/speckit-specify`

- **Problem**: Leitores do web comic de terror possuem sensibilidades visuais e preferências de imersão distintas e necessitam de uma forma fluida de alternar entre 5 atmosferas dramáticas pré-validadas sem distorções de arte, sem ruídos na interface e sem layout shift.
- **Chosen approach**: Opção A — Seletor integrado na barra auxiliar de controles do player (`nav.control-bar .auxiliary-controls`), operando nativamente com acessibilidade completa, alternando o atributo `data-theme` no `<html>`, persistindo em `localStorage` e sincronizando entre abas via `BroadcastChannel`.
- **In scope**:
  - Incorporação dos tokens/regras dos 5 temas em `tokens.css` ou folha modular compilada pelo `esbuild`.
  - Controle de alternância na barra auxiliar do player (`index.html` e `main.js`).
  - Extensão do `StorageManager` (`storage.js`) para persistir `hwc.theme`.
  - Testes unitários para persistência/sincronização e testes E2E/A11y cobrindo a alternância e a estabilidade visual (CLS).
- **Out of scope**:
  - Paletas arbitrárias de cores ou color pickers personalizados pelo usuário.
  - Modificação ou filtro destrutivo nas imagens dos fotogramas da narrativa.
  - Modais ou drawers pesados de preview visual.
- **Success metrics**:
  - Tamanho final do CSS compilado $\le 8.5\text{ KB}$ em Gzip (limite constitucional: 15 KB).
  - CLS = 0.00 durante qualquer alternância de tema.
  - Alvos de toque $\ge 44 \times 44\text{ px}$ e contraste $\ge 7:1$ em todos os 5 temas (WCAG 2.2 AAA).
- **Carried-forward open questions**:
  1. *Tema padrão inicial:* `cinema` (Minimalist Cinema) como padrão de primeira visita, respeitando o foco cinematográfico original.
  2. *Tipo de controle:* `<select id="theme">` nativo estilizado ou botão cíclico rápido com menu popover semântico acessível.
