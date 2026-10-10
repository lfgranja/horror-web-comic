# Implementation Plan: Theme Switcher de 5 Atmosferas Dramáticas

**Branch**: `002-theme-switcher` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-theme-switcher/spec.md`

## Summary

Implementar a capacidade de comutação em tempo de execução entre 5 atmosferas estéticas (Minimalist Cinema [padrão], Graphic Novel Noir, Atmospheric Eldritch, Industrial Brutalist e Shadow-Props Base). A solução integra um seletor `<select id="theme">` na barra auxiliar de controles do player (`nav.control-bar .utility-controls`), estende `StorageManager` para salvar `hwc.theme` e sincronizar entre abas via `BroadcastChannel`, e incorpora as definições de variáveis CSS em `src/styles/tokens.css` sob o seletor `html[data-theme="..."]`. O design assegura zero Cumulative Layout Shift ($\text{CLS} = 0.00$), conformidade plena com WCAG 2.2 AAA e consumo estrito de apenas ~7.8 KB do teto orçamentário de 15 KB de CSS.

## Technical Context

**Language/Version**: HTML5, CSS3 nativo (CSS Custom Properties), JavaScript ES2022 (Vanilla ES Modules).

**Primary Dependencies**: Zero dependências em runtime. Ferramentas de desenvolvimento existentes: `esbuild` (minificação e cache-busting), `@playwright/test` (testes E2E e matriz de navegadores), `node:test` (testes unitários).

**Storage**: `localStorage` gerenciado por `StorageManager` com tolerância a falhas de cota/permissões e sincronização multi-aba via `BroadcastChannel('theme')`. Sem backend.

**Testing**: Suíte unitária (`node --test tests/unit/*.test.js`), testes E2E do Playwright (`tests/e2e/`), auditoria de acessibilidade (axe/Lighthouse) e verificação estrita de orçamentos (`scripts/build.mjs`).

**Target Platform**: Navegadores modernos (Chromium, Firefox, WebKit em desktop e mobile), desde viewports ultra-estreitos de 320px até 4K widescreen e *short landscape*.

**Performance Goals**:
- Tamanho compilado do bundle de estilos $\le 10.000\text{ bytes}$ em Gzip (orçamento constitucional: $\le 15.000\text{ bytes}$).
- Cumulative Layout Shift: $\text{CLS} = 0.00$ em todas as comutações de tema.
- Latência de aplicação visual: $< 16\text{ ms}$ (renderizado no próximo frame do navegador).
- Propagação entre abas: $< 100\text{ ms}$.

**Constraints**:
- Proibido qualquer framework de CSS-in-JS ou runtime externo (Princípio II).
- Alvos de toque estritamente $\ge 44 \times 44\text{ px}$ (WCAG 2.2 AAA).
- Todas as 5 paletas devem manter contraste $\ge 7:1$ para textos e controles essenciais.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação contra a constituição do projeto:

| Princípio | Avaliação | Evidência no plano |
|---|:---:|---|
| **I. Experiência Cinematográfica (NÃO NEGOCIÁVEL)** | **PASS** | A alternância de tema respeita o frame visual e não interrompe nem reinicia a reprodução do áudio ou a sequência de quadros. |
| **II. Médium Definido: HTML/CSS/JS/Imagens** | **PASS** | Construído exclusivamente com CSS Custom Properties nativas, HTML semântico e Vanilla ES Modules, sem dependências externas. |
| **III. Mobile-First e Responsividade Universal** | **PASS** | O controle acomoda-se fluidamente em 320px e short landscape; alvos $\ge 44\text{ px}$. |
| **IV. Performance e Orçamento de Ativos (NÃO NEGOCIÁVEL)** | **PASS** | Medições reais comprovam 7.797 bytes Gzip finais com os 5 temas embutidos (teto constitucional de 15.000 bytes com mais de 48% de folga). |
| **V. Qualidade Visual e Sonora** | **PASS** | Todas as 5 paletas foram calibradas artisticamente e testadas no laboratório com contrastes AAA (de 10.5:1 a 17.8:1). |
| **VI. Controle do Usuário e Acessibilidade** | **PASS** | Alívio comprovado de fadiga visual (fotofobia e astigmatismo); controle semântico com labels acessíveis para leitores de tela. |
| **Restrições Técnicas e Padrões de Entrega** | **PASS** | Mantém compatibilidade com `build.mjs` e matriz completa de navegadores (Chrome, Firefox, Safari/WebKit). |

Sem violações — `Complexity Tracking` permanece vazio.

## Project Structure

### Documentation (this feature)

```text
specs/002-theme-switcher/
├── spec.md              # Especificação de Requisitos da Feature
├── plan.md              # Este Plano de Implementação
├── research.md          # Decisões Técnicas e Medições Reais (Fase 0)
├── data-model.md        # Entidades e Mapeamento dos 5 Temas (Fase 1)
├── quickstart.md        # Guia de Validação e Testes Ponta a Ponta (Fase 1)
└── contracts/
    ├── theme-ui-contract.md       # Contrato de Marcação e Acessibilidade DOM
    └── theme-storage-contract.md  # Contrato de Persistência e Broadcast Multi-Aba
```

### Source Code Impact

```text
index.html                     # Adiciona o <select id="theme"> na barra de controles
src/
├── styles/
│   ├── tokens.css             # Incorpora as regras e variáveis dos 5 temas em html[data-theme="..."]
│   └── player.css             # Estilização compacta acessível de .theme-control / #theme
└── scripts/
    ├── storage.js             # Gerenciamento de 'hwc.theme' e BroadcastChannel('theme')
    ├── main.js                # Inicialização do tema salvo e ouvinte de evento change
    └── player.js              # Hook opcional de sincronização de interface
tests/
├── unit/
│   └── storage.test.js        # Testes de unidade para persistência e defaults de tema
└── e2e/
    └── theme-switcher.spec.js # Testes Playwright: troca visual, zero CLS e persistência
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|:---:|---|
| (nenhuma) | — | — |

## Post-Design Constitution Re-Check (Fase 1)

Após a formalização de `data-model.md`, `contracts/` e `quickstart.md`, todos os princípios da constituição permanecem com status **PASS**. A abordagem selecionada (Opção A) é a de menor complexidade ciclomática e menor footprint possível, mantendo 100% da integridade da esteira de CI e os orçamentos de entrega do projeto.
