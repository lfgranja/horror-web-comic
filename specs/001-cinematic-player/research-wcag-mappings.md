# Pesquisa: mapeamentos WCAG 2.2 (fontes primárias W3C)

**Data**: 2026-09-23 · **Método**: fetch direto do REC WCAG 2.2 (12 Dec 2024) e dos docs
Understanding correspondentes. Nenhum mapeamento foi derivado de fontes secundárias.

## Q1 — Animação automática (auto-avanço >5s) → **2.2.2 Pause, Stop, Hide (A)**, não 2.3.3

- Normativo 2.2.2: "For **moving**, blinking, scrolling, or **auto-updating** information …
  For any moving, blinking or scrolling information that (1) **starts automatically**
  (2) **lasts more than five seconds** and (3) is **presented in parallel with other
  content**, there is a mechanism to pause, stop, or hide it…."
  Exceção: "part of an activity where it is essential" (a leitura da narrativa é atividade
  essencial). Fonte: <https://www.w3.org/TR/WCAG22/#pause-stop-hide> (Level A).
- Guia Understanding 2.3.3, explícito: *"'Animation from interactions' applies when a
  **user's interaction initiates** non-essential animation. In contrast, **2.2.2 … applies
  when the web page initiates animation 'automatically'** that is not in response to an
  intentional user activation. There may be situations where a particular animation may
  fail **both** success criteria."
  Fonte: <https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html>.
- **Veredicto**: o avanço automático do player é iniciado pela página, não por interação →
  2.2.2 aplica-se diretamente. 2.3.3 não cobre isso. Possibilidade de duplo alvo: se o
  avançar manual (interação) disparar *motion animation* (transição animada) e ela não
  puder ser desativada, também falha 2.3.3.
- **Correção ao spec.md (linha ~456)**: `FR-011 | 2.3.3 Animation from Interactions | AAA`
  é mapeamento errado de FR em si; o correto é **FR-013/FR-005 (auto-avanço, timer) →
  2.2.2 (A)**. Para 2.3.3 (AAA) subsiste apenas como exigência sobre animações
  acionadas por interação (ver Q5). Nota: a *conformidade AAA* de 2.3.3 em si está correta.

## Q2 — Declaração de idioma (FR-012) → **3.1.1 (A)** + **3.1.2 (AA)**

- 3.1.1 Language of Page **(Level A)**: "The default human language of each web page can
  be programmatically determined." — cobre `lang` no `<html>`.
- 3.1.2 Language of Parts **(Level AA)**: "The human language of each passage or phrase …
  can be programmatically determined" (exceções: nomes próprios, termos técnicos,
  vernáculo). Aplica a partes em idioma divergente do documento.
- **Veredicto**: FR-012 (`lang` da página e das descrições) deve mapear para **3.1.1 (A)
  e 3.1.2 (AA)**; hoje o spec não mapeia nenhum dos dois. Descrição em idioma ≠ idioma
  da página → `lang` na região/regiões correspondentes (3.1.2).
- Fontes: <https://www.w3.org/TR/WCAG22/#language-of-page>,
  <https://www.w3.org/TR/WCAG22/#language-of-parts>.

## Q3 — Live region anunciando descrição de quadro → 4.1.2 essencial; 4.1.3 **só se for status**

- 4.1.3 Status Messages **(Level AA, WCAG 2.2, nova em 2.2)**: aplica-se a mudança de
  conteúdo que (a) fornece informação sobre "success or results of an action, waiting
  state, progress of a process, or existence of errors" e (b) **não é change of context**.
- Análise: descrições de quadros são **conteúdo narrativo principal**, não status;
  4.1.3 não exige que *todo* conteúdo de live region seja anunciado. Se a região existir
  antes e anunciar sem mudar foco (não é change of context), 4.1.2 Name, Role, Value (A)
  continua sendo a exigência central (exposição programática correta). Para mensagens de
  estado do player (ex.: "quadro 5 de 20", "buffering"), `role="status"` satisfaz
  **4.1.3 (AA)** — mapear 4.1.3 só às mensagens de estado, não às descrições.
  ARIA22/ARIA19 são as técnicas suficientes.
- Fontes: <https://www.w3.org/TR/WCAG22/#status-messages>,
  <https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html>.

## Q4 — Níveis confirmados via REC WCAG 2.2

| SC | Título | Nível |
|----|--------|-------|
| 2.5.5 Target Size (Enhanced) | ≥44×44 CSS px | **AAA** ✔ |
| 1.4.6 Contrast (Enhanced) | ≥7:1 | **AAA** ✔ |
| 2.5.8 Target Size (Minimum) | ≥24×24 CSS px | **AA** (nova em 2.2) ✔ |
| 2.4.7 Focus Visible | indicador visível | **AA** ✔ |
| 2.2.2 Pause, Stop, Hide | — | A ✔ |
| 2.3.3 Animation from Interactions | — | AAA ✔ |
| 3.1.1 Language of Page | — | A ✔ |
| 3.1.2 Language of Parts | — | AA ✔ |
| 4.1.3 Status Messages | — | AA ✔ |

Fonte única (todos os níveis normativos): <https://www.w3.org/TR/WCAG22/> (REC 2024-12-12).

## Q5 — `prefers-reduced-motion` e 2.3.3 (FR-011)

- 2.3.3 (AAA) permanece aplicável a **motion animation acionada por interação**: ex.
  transição ("cross-fade") ao avançar manualmente com teclado/toque deve poder ser
  desativada. Técnicas suficientes listadas no Understanding: **C39** e **SCR40**
  (CSS `prefers-reduced-motion`) e Gx. O próprio Understanding traz como exemplo
  "Transitions that support the reduce motion preference" — page-flipping animation
  desligada pela preference — exatamente o caso FR-011.
- FR-011 cobre **duas** exigências distintas: (1) modo auto-avanço sob motion reduzido →
  não é 2.3.3, é **2.2.2 (A)** para o mecanismo de controle (pausa/stop) + escolha de
  produção (cortes instantâneos,SCR/GCSS pré-req de 1.3.3/2.2.2); (2) transições de
  avanço manual devem poder ser desativadas → **2.3.3 (AAA)**.

## Resumo das correções ao spec.md

1. **Tabela (linha ~456)**: remover `FR-011 → 2.3.3 AAA` como mapeamento do auto-avanço.
   Adicionar:
   - `FR-013, FR-005 → 2.2.2 Pause, Stop, Hide (A)` (já existe) + alinhar FR-011 ao
     2.2.2 do mecanismo de pausa do auto-avanço;
   - `FR-011 (transições de interação) → 2.3.3 Animation from Interactions (AAA)`;
   - `FR-012 → 3.1.1 Language of Page (A) / 3.1.2 Language of Parts (AA)`;
   - `FR-012, FR-014 → 4.1.2 (A)` manter; **mensagens de estado do player →
     4.1.3 Status Messages (AA)**.
2. Atualizar o Q/A da linha 44 do spec.md ("2.3.3→FR-011") para "2.2.2→FR-013/FR-005 …
   3.1.1/3.1.2→FR-012; 4.1.3→FR-014 (status)".
