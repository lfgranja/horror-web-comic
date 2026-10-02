# Concept: Theme Switcher para os 5 Design Systems no Horror Web Comic

- **Slug**: theme-switcher
- **Created**: 2026-09-30T20:05:00-04:00
- **Recommended option**: Opção A — Seletor Integrado na Barra Auxiliar do Player (Minimalist Control)

## Options

### Opção A — Seletor Integrado na Barra Auxiliar do Player (Minimalist Control)
- **Sketch**: O player ganha um controle discreto e elegante na seção auxiliar de navegação (`nav.control-bar .auxiliary-controls`), adjacente aos controles de velocidade e volume. Pode assumir a forma de um botão cíclico com ícone temático e tooltip indicativo ou um `<select id="theme">` nativo estilizado. Ao ser acionado, o atributo `data-theme` na tag `<html>` é comutado instantaneamente sem recarregar a página, aplicando o dicionário de variáveis CSS correspondente ao tema escolhido (Graphic Novel Noir, Atmospheric Eldritch, Industrial Brutalist, Minimalist Cinema ou Shadow-Props Base). A escolha é salva em `localStorage` e refletida imediatamente em abas irmãs.
- **Appetite**: `small` (1 a 2 dias).
- **Trade-offs**: 
  - *Ganhos:* Zero impacto na estabilidade de layout (CLS = 0.00), zero runtime extra, overhead de CSS inferior a 2 KB comprimidos (respeitando folgadamente o teto de 15 KB), e conformidade natural com as diretrizes de acessibilidade (WCAG 2.2 AAA com alvos $\ge 44\text{ px}$).
  - *Sacrifícios:* Não permite pré-visualizações ricas ou miniaturas visuais antes da escolha (a alternância é imediata no próprio leitor).
- **Rabbit holes**: Tentar renderizar miniaturas gráficas complexas ou menus flutuantes dinâmicos de alta especificidade que quebrem em viewports ultra-estreitos de 320px ou no modo *short landscape*.

---

### Opção B — Modal / Drawer de Configurações Atmosféricas (Immersive Theme Modal)
- **Sketch**: Um botão de "Atmosfera / Ajustes Visuais" abre uma camada acessível de sobreposição (*dialog / drawer*) contendo cards descritivos para cada um dos 5 temas, acompanhados de breves amostras visuais de contraste e tipografia. O leitor escolhe seu tema favorito antes ou durante a leitura com uma experiência rica de galeria visual.
- **Appetite**: `medium` (4 a 6 dias).
- **Trade-offs**: 
  - *Ganhos:* Excelente para apresentar o contexto artístico e histórico de cada estética (ex.: explicar a inspiração de *Sin City* vs. *Alien*).
  - *Sacrifícios:* Aumenta a complexidade de armadilha de foco acessível (*focus trap*), risco de colisão com os modais de retomada de áudio existentes, e adiciona mais HTML/CSS, consumindo mais do orçamento de entrega.
- **Rabbit holes**: Gerenciar o estado de pausa do player durante o modal, sincronização de áudio em background e garantir que o modal não cause layout shift ou quebra em telas de toque menores que 360px.

---

### Opção C — Apenas Ferramenta de Laboratório / Feature Flag (Developer & Testing Only)
- **Sketch**: Os 5 temas permanecem acessíveis apenas através do arquivo de teste de laboratório (`design-systems-lab.html`) ou via parâmetro na URL (`?theme=noir`), sem expor nenhum controle ou botão na barra do leitor final em produção.
- **Appetite**: `small` (já implementado no protótipo).
- **Trade-offs**: 
  - *Ganhos:* Risco zero de poluição visual na interface de produção; nenhum byte adicional de HTML na barra de controles pública.
  - *Sacrifícios:* Desperdiça o ganho de acessibilidade real para leitores com fotofobia ou cansaço visual, que não terão como alternar a paleta facilmente; perde o valor de replay e engajamento do público.
- **Rabbit holes**: Suportar parâmetros de URL em produção que conflitem com a política estrita de manifests isolados do projeto (onde query params são restritos a ambientes de teste).

---

## Recommendation

**Opção A — Seletor Integrado na Barra Auxiliar do Player (Minimalist Control).**

*Justificativa Estratégica:*  
1. **Harmonia Total com a Arquitetura do Player:** Segue o mesmo padrão consolidado pelo seletor de velocidade (`#speed`) e volume (`#volume`), operando como um elemento de controle nativo, leve e sem dependências.
2. **Eficiência Orçamentária Radical:** Adiciona menos de 10 linhas de HTML e consome apenas ~1.8 KB adicionais de CSS, mantendo o bundle compilado em ~7.8 KB (muito abaixo do teto de 15.000 bytes).
3. **Acessibilidade Universal:** Facilmente operável via teclado, screen readers (`aria-label`) e toque móvel ($\ge 44\text{ px}$), entregando a autonomia visual desejada sem interrupções da narrativa.

---

## Out of Scope (para a Opção Recomendada)

- Customizações de cores granulares e livres pelo usuário (sem *custom color pickers*).
- Modificação das imagens e assets dos fotogramas da história (as artes originais são preservadas).
- Modais invasivos ou drawers com preview pesado de imagens antes da seleção.
- Inclusão de frameworks JS de gerenciamento de estado externos.

---

## Assumptions to Validate

1. O controle nativo (dropdown ou botão cíclico) na barra auxiliar de controles acomoda-se sem quebra de linha indesejada em viewports de **320px** e em **short landscape** (`max-height: 30rem`).
2. A extensão do `StorageManager` para persistir `hwc.theme` mantém a retrocompatibilidade com o schema existente (`hwc.schemaVersion: 1`).
3. O tema padrão para usuários sem preferência prévia salva será o **Minimalist Cinema** (ou **Shadow-Props Base**), garantindo a melhor experiência de leitura no primeiro carregamento.
