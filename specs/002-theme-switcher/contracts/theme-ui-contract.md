# UI Contract: Theme Switcher

**Feature**: `002-theme-switcher` | **Date**: 2026-09-30 | **Spec**: [spec.md](../spec.md)

Contrato de interface do usuário, comportamento visual, árvore DOM e padrões de acessibilidade.

---

## 1. Estrutura de Marcação (HTML)

O controle deve ser inserido em `index.html` dentro de `nav.control-bar .utility-controls`, posicionado imediatamente após o seletor de velocidade (`#speed`) e antes do botão de alternância de áudio (`#audio-toggle`):

```html
<div class="theme-control">
  <label class="sr-only" for="theme">Atmosfera visual da narrativa</label>
  <select id="theme" class="theme-select" aria-label="Atmosfera visual da narrativa">
    <option value="cinema" aria-label="Cinema Minimalista (A24 / MUBI)" selected>Cinema</option>
    <option value="noir" aria-label="Graphic Novel Noir (HQ Clássica)">Noir</option>
    <option value="eldritch" aria-label="Atmospheric Eldritch (Gótico / Penumbra)">Eldritch</option>
    <option value="industrial" aria-label="Industrial Brutalist (Terminal / CRT)">Industrial</option>
    <option value="shadow-props" aria-label="Shadow-Props Base (Tokens Puros)">Shadow</option>
  </select>
</div>
```

---

## 2. Requisitos de Estilo e Acessibilidade (WCAG 2.2 AAA)

1. **Alvo de Toque e Dimensões Mínimas**:
   - `min-width: 2.8rem; min-height: 2.8rem;` (atende ao requisito inegociável de $\ge 44 \times 44\text{ px}$).
2. **Foco Visível e Wrapper**:
   - `:focus-visible` com anel de foco de alto contraste (`outline: 3px solid var(--focus); outline-offset: 3px;`).
   - O wrapper `.theme-control` é puramente estrutural/estilístico (sem atributos `role="group"` ou `aria-label` redundantes).
3. **Estilização Nativa e Popups em Todas as Plataformas**:
   - `.theme-select` e seus elementos `option` declaram explicitamente `color-scheme: dark; background-color: var(--ink-900); color: var(--mist-100);` para blindar o popup nativo de SOs contra contrastes incorretos.
   - Suporte a `@media (forced-colors: active)` com `forced-color-adjust: auto` e bordas preservadas (`border: 1px solid ButtonBorder`).
4. **Comportamento em Telas Estreitas (320px) e Zero Layout Shift**:
   - Os rótulos visuais curtos das opções (`Cinema`, `Noir`, etc.) impedem que o `<select>` estoure a barra de utilitários em viewports móveis de 320px, enquanto `aria-label` fornece a descrição completa para leitores de tela.
   - O elemento pai `.utility-controls` utiliza `flex-wrap: wrap`, permitindo acomodação sem barra de rolagem horizontal.
   - Utilização estrita de **system font stacks** locais (sem downloads assíncronos ou `@font-face` remotos), garantindo resolução síncrona sem FOUT.
5. **Reserva Estática & CLS**:
   - A comutação de tema **não altera** a altura calculada da barra de controles (`--control-bar-top`), e a tipografia do narrador permanece dimensionalmente invariante dentro de `--description-reserve-lines: 13`, mantendo o Cumulative Layout Shift estritamente em **0.00**.

---

## 3. Comportamento Operacional & Eventos

- **Evento `change`**:
  1. Captura `event.target.value`.
  2. Valida contra o conjunto de temas permitidos.
  3. Atualiza imediatamente o atributo: `document.documentElement.setAttribute('data-theme', themeId)`.
  4. Invoca `storage.setTheme(themeId)`.
- **Sincronização em Tempo Real**:
  - Quando notificado pelo `StorageManager` (via `BroadcastChannel` ou evento `storage`), o seletor atualiza sua propriedade `.value` para coincidir com o novo tema, sem disparar um novo evento em cascata.
