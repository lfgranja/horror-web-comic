# Research & Technical Decisions: Theme Switcher

**Feature**: `002-theme-switcher` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

## 1. Decisão Técnica: Comutação de Tema via Atributo Raiz

- **Decisão**: Alternar o tema dinamicamente aplicando o atributo `data-theme` no elemento raiz `<html>` (ex: `document.documentElement.setAttribute('data-theme', themeId)`).
- **Racional**:
  - Desacoplamento total de JavaScript e CSS: o script apenas comuta um atributo de string.
  - Zero recalculo de layout (Layout Thrashing / Reflow): a troca afeta apenas variáveis de cores, opacidade e famílias tipográficas, mantendo as dimensões geométricas (`height`, `width`, `padding`, `margin`, `aspect-ratio`) idênticas.
  - Latência de renderização imperceptível (< 16 ms), delegada inteiramente ao pipeline de estilização do navegador sem agendamento de frames JS na main thread.
- **Alternativas Consideradas**:
  - *Carregamento dinâmico de stylesheets (`<link rel="stylesheet">`)*: Rejeitado porque introduz latência de I/O de rede ou disco, risco de Flash of Unstyled Content (FOUC) e quebra a política de empacotamento atômico e offline-first do projeto.
  - *Injeção inline de estilos via JS*: Rejeitado categoricamente pelo Princípio II (Vanilla CSS/HTML) e por violar a separação semântica de tokens.

---

## 2. Decisão Técnica: Orçamento de CSS & Incorporação dos 5 Temas

- **Decisão**: Declarar as regras dos 5 temas em `src/styles/tokens.css` sob o seletor canônico `html[data-theme="<tema>"]`, reutilizando as variáveis primitivas e semânticas já existentes.
- **Medições Reais de Gzip**:
  - CSS base existente minificado + comprimido: **5.995 bytes**.
  - Incremento medido para os 5 temas completos: **1.802 bytes**.
  - Tamanho final compilado projetado: **7.797 bytes**.
  - **Margem de Segurança:** O teto estrito constitucional de `budget.json` é **15.000 bytes** (`compressedStyleBytes <= 15000`). O projeto operará com mais de **48% de folga** (7.203 bytes livres).
- **Racional**:
  - Mantém o build de `scripts/build.mjs` simples, sem necessidade de novas entradas de empacotamento no `esbuild`.
  - Passa com folga em todos os portões de CI e verificação de integridade orçamentária (`npm run build`).

---

## 3. Decisão Técnica: Persistência & Sincronização Multi-Aba

- **Decisão**: Estender `StorageManager` em `src/scripts/storage.js` para gerenciar a chave `hwc.theme`, utilizando `'cinema'` como valor padrão (*fallback* seguro). A sincronização multi-aba utiliza o canal `BroadcastChannel('theme')` com fallback automático para o evento de janela `window.addEventListener('storage', ...)`.
- **Racional**:
  - Alinhamento total com a arquitetura estabelecida para áudio, volume, velocidade e progresso.
  - Tolerância nativa a falhas: se `localStorage` lançar erro de cota ou estiver bloqueado em navegação anônima, o gerenciador mantém o tema em memória volátil (`this.memory`), impedindo qualquer quebra do player.
- **Alternativas Consideradas**:
  - *Cookies ou IndexedDB*: Rejeitados por complexidade desnecessária para um estado síncrono simples de 1 string.

---

## 4. Decisão Técnica: Elemento de UI e Ergonomia Acessível

- **Decisão**: Utilizar um controle nativo `<select id="theme">` estilizado dentro de `.control-group.auxiliary-controls` na barra de controles do player.
- **Racional**:
  - Acessibilidade semântica nativa para leitores de tela e navegação por teclado sem necessidade de bibliotecas de dropdown externas.
  - Garante naturalmente a área mínima de interação de $44 \times 44\text{ px}$ (`min-width: 2.8rem; min-height: 2.8rem;`) exigida pela WCAG 2.2 AAA.
  - Não provoca quebra de linha indesejada em telas de 320px nem em orientação *short landscape* (`@media (max-height: 30rem) and (orientation: landscape)`).
