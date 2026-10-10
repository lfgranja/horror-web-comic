# Feature Specification: Theme Switcher de 5 Atmosferas Dramáticas

**Feature Directory**: `specs/002-theme-switcher`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User assessment handoff from `.specify/assessments/theme-switcher`: "Theme Switcher no player cinematográfico contendo os 5 designs atuais (Graphic Novel Noir, Atmospheric Eldritch, Industrial Brutalist, Minimalist Cinema e Shadow-Props Base), com controle integrado na barra auxiliar de controles, persistência em localStorage e sincronização multi-aba via BroadcastChannel, mantendo os orçamentos de desempenho (CSS <= 15KB), estabilidade de layout (CLS = 0.00) e conformidade estrita WCAG 2.2 AAA."

---

## Clarifications

### Session 2026-09-30 (1ª rodada)

- Q: Qual deve ser o tema padrão para um novo visitante sem preferência prévia salva? → **A: `cinema` (Minimalist Cinema)**, pois foi o vencedor de ergonomia e imersão nos testes, garantindo foco imediato na arte visual da história sem distrações cromáticas.
- Q: Qual elemento e formato de controle deve ser utilizado na barra auxiliar do player? → **A: Um controle nativo `<select id="theme">`**, integrado dentro de `.utility-controls`, estilizado com os mesmos tokens de foco e alvos mínimos ($\ge 44 \times 44\text{ px}$) dos controles de velocidade e volume já existentes.
- Q: Como o controle deve ser anunciado para leitores de tela e tecnologias assistivas? → **A: Via rótulo acessível `aria-label="Atmosfera visual da narrativa"`**, acompanhado de `<label class="sr-only" for="theme">Atmosfera visual</label>`, garantindo conformidade WCAG 2.2 AAA.
- Q: Como o seletor de temas deve se comportar em viewports ultra-estreitos (320px) e em short landscape? → **A: Ele deve quebrar em fluxo flexível (`flex-wrap: wrap`) com largura mínima compacta**, sem gerar scroll horizontal e sem deslocar a altura da barra além da margem de reserva estática (`--description-reserve-lines`).
- Q: Como a preferência é sincronizada entre múltiplas abas abertas? → **A: Pelo canal do `StorageManager` via `BroadcastChannel('theme')` e pelo evento nativo `storage`**, atualizando instantaneamente o atributo `data-theme` na tag `<html>` de todas as abas abertas sem reiniciar a reprodução do áudio ou da história.

### Session 2026-09-30 (2ª rodada - Clarificação dos Checklists)

- Q: Resolução de concorrência simultânea entre abas? → **A: Semântica Last-Write-Wins (LWW) nativa do `localStorage` e `BroadcastChannel`**; a última mensagem recebida no loop de eventos dita o tema ativo em todas as abas.
- Q: Restauração via Back/Forward Cache (bfcache)? → **A: Listener no evento `pageshow` com `event.persisted === true` revalida `storage.load().theme`**, sincronizando o atributo `data-theme` e o `<select id="theme">` caso haja alteração externa durante a hibernação.
- Q: Posição de montagem DOM exata e `#fullscreen-toggle` inexistente? → **A: Posicionar `.theme-control` dentro de `nav.control-bar .utility-controls`**, imediatamente após `#speed` e antes de `#audio-toggle`. Não existe e nem será introduzido `#fullscreen-toggle` ou `.auxiliary-controls`.
- Q: Escopo de Fullscreen API com o Theme Switcher? → **A: Fora de escopo (Non-Goal)**. O player não utiliza Fullscreen API; se o usuário acionar o fullscreen do navegador (F11), a regra global `html[data-theme]` cobre naturalmente todo o viewport.
- Q: Anúncio de mudança de tema para leitores de tela? → **A: Confiar no comportamento acessível nativo do `<select>` na aba ativa**; sincronizações passivas remotas não disparam anúncios em live region para não interromper a audiodescrição em andamento.
- Q: Semântica do wrapper `.theme-control`? → **A: Puramente estrutural/estilístico (sem `role="group"` ou `aria-label` redundantes)**; acessibilidade concentrada no `<select id="theme">` e seu `<label for="theme">`.
- Q: Suporte a Modo de Alto Contraste (`forced-colors: active`)? → **A: As cores dos temas cedem precedência para as cores do sistema operacional (`forced-color-adjust: auto`)**, garantindo bordas e foco visíveis via `ButtonBorder` e `CanvasText`.
- Q: Declaração de `color-scheme: dark`? → **A: Mantido globalmente em `:root` e reforçado explicitamente na classe `.theme-select` em `player.css`** para blindar popovers nativos de todas as plataformas.
- Q: Rótulos das opções do `<select>`? → **A: Rótulos visuais curtos (`Cinema`, `Noir`, `Eldritch`, `Industrial`, `Shadow`)** para preservar responsividade em 320px sem overflow, com nomes descritivos completos fornecidos via atributo `aria-label` em cada `<option>`.
- Q: Rastreabilidade WCAG 2.2 AAA? → **A: Formalizada em tabela dedicada no `spec.md`**, correlacionando cada critério às regras funcionais.
- Q: Critérios objetivos para ergonomia e fotofobia? → **A: Métricas fotométricas objetivas**: luminância de fundo $L \le 0.02$, contraste entre $10.5:1$ e $17.8:1$, sem fundos brancos e sem pure `#000000` + pure `#ffffff` que cause halação.
- Q: Prevenção de CLS em Font Swaps / Fontes Externas? → **A: Uso exclusivo de pilhas de fontes de sistema locais (`system font stacks`)** sem qualquer download remoto ou assíncrono de `@font-face`. Fallback imediato e síncrono.
- Q: Estilização dos elementos `<option>` no dropdown nativo? → **A: Declarar `color-scheme: dark; background-color: var(--ink-900); color: var(--mist-100);` em `select, option`** para assegurar popup escuro e legível em todos os sistemas operacionais.
- Q: Variação de fontes e reserva da legenda? → **A: A tipografia do narrador (`.frame-description`) permanece dimensionalmente estável** dentro da reserva calculada de 13 linhas em 320px (`--description-reserve-lines: 13`).
- Q: Latência e medição em ambientes de software rasterizer (CI WebKit)? → **A: SC-005 verificado por execução JS síncrona $< 1\text{ ms}$ e zero frames agendados na thread principal (`appFrames === 0`)**, alinhado ao padrão arquitetural de SC-018 em `AGENTS.md`.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Personalizar a Atmosfera Visual do Quadrinho (Priority: P1)

Como um leitor imerso na narrativa de terror,  
Quero poder escolher e alternar entre 5 estéticas visuais distintas (Graphic Novel Noir, Atmospheric Eldritch, Industrial Brutalist, Minimalist Cinema e Shadow-Props Base) diretamente na barra de controles do player,  
Para que eu possa vivenciar a história com a atmosfera que melhor se adapta à minha sensibilidade estética, ao ambiente de iluminação e ao meu conforto visual.

**Why this priority**: É a funcionalidade central solicitada. Sem a capacidade de alternar o tema em tempo real de forma intuitiva, o leitor permanece confinado a uma única apresentação visual fixa.

**Independent Test**: Abrir o player cinematográfico em um navegador, acionar o seletor de atmosfera visual na barra auxiliar de navegação e verificar que o tema muda instantaneamente na tela sem reiniciar a narrativa, sem piscar e sem saltos visuais.

**Acceptance Scenarios**:
1. **Given** que o leitor acessa o player pela primeira vez, **When** a página termina de carregar, **Then** a atmosfera visual padrão ativa é o "Minimalist Cinema" (`html[data-theme="cinema"]`).
2. **Given** que o player está exibindo um quadro narrativo, **When** o leitor seleciona "Graphic Novel Noir" no controle de atmosfera, **Then** o invólucro do player, bordas, botões e tipografia adotam imediatamente o estilo brutalista editorial com calhas nítidas e papel oxidado.
3. **Given** que o player está executando com áudio ativo, **When** o leitor altera a atmosfera para "Atmospheric Eldritch", **Then** a interface adota os tons de penumbra, pergaminho e luz de vela sem interromper nem reiniciar a trilha sonora.
4. **Given** que o leitor seleciona "Industrial Brutalist", **When** o tema é aplicado, **Then** a interface passa a exibir a tipografia monospaçada técnica, monitor CRT âmbar e alertas sem cantos arredondados.
5. **Given** que o leitor seleciona "Shadow-Props Base", **When** o tema é aplicado, **Then** a interface adota a estrutura pura de tokens de transição sem perder a elegância da narrativa.
6. **Given** que o leitor alterna o tema enquanto a narrativa avança automaticamente, **When** a troca é efetuada, **Then** o Cumulative Layout Shift (CLS) medido permanece em 0.00, sem qualquer deslocamento da arte do quadro ou dos botões.

---

### User Story 2 - Persistência e Sincronização da Preferência de Leitura (Priority: P2)

Como um leitor frequente do web comic,  
Quero que minha escolha de atmosfera visual seja memorizada para visitas futuras e refletida automaticamente em todas as abas que eu estiver lendo,  
Para que eu não precise reconfigurar minha preferência estética a cada novo episódio ou recarregamento de página.

**Why this priority**: Elimina fricção cognitiva e garante continuidade da experiência do usuário, seguindo a mesma arquitetura de persistência de áudio, velocidade e progresso do projeto.

**Independent Test**: Selecionar um tema (ex.: "Atmospheric Eldritch"), recarregar a página e confirmar que a página já inicia no tema selecionado sem *Flash of Unstyled Content* (FOUC). Abrir uma segunda aba e verificar se a mudança de tema na primeira reflete na segunda em tempo real.

**Acceptance Scenarios**:
1. **Given** que o leitor selecionou o tema "Graphic Novel Noir", **When** ele recarrega a página ou retorna dias depois, **Then** a aplicação carrega diretamente com a estética "Graphic Novel Noir" memorizada.
2. **Given** que o leitor possui duas abas abertas da mesma história, **When** ele altera o tema na aba A para "Industrial Brutalist", **Then** a aba B atualiza sua atmosfera visual para "Industrial Brutalist" simultaneamente via canal de sincronização.
3. **Given** que o armazenamento local do navegador esteja bloqueado ou inacessível (ex.: modo anônimo restritivo ou quota cheia), **When** o leitor escolhe um tema, **Then** a interface alterna normalmente na sessão atual sem disparar exceções nem interromper a reprodução.

---

### User Story 3 - Acessibilidade Universal & Conforto Ocular (Priority: P3)

Como um leitor com baixa acuidade visual, fotofobia ou usando leitores de tela,  
Quero que o controle de tema e todas as 5 atmosferas obedeçam a regras rígidas de acessibilidade WCAG 2.2 Nível AAA,  
Para que eu possa navegar e desfrutar do terror visual sem barreiras físicas ou sensoriais.

**Why this priority**: O projeto possui mandato inegociável de acessibilidade universal (AAA), com contraste reforçado e alvos de toque adequados para todas as pessoas.

**Independent Test**: Auditar a barra de controles com ferramentas de acessibilidade automatizadas (Playwright axe-core / Lighthouse a11y) e verificar que todas as 5 paletas mantêm contraste $\ge 7:1$, que os alvos têm no mínimo 44px e que o leitor de tela anuncia corretamente o controle.

**Acceptance Scenarios**:
1. **Given** qualquer um dos 5 temas ativado, **When** inspecionado o contraste de cores entre texto e fundo nos controles e na descrição do quadro, **Then** a taxa de contraste atinge no mínimo 7:1 (nível AAA).
2. **Given** um dispositivo com tela sensível ao toque, **When** o leitor interage com o controle de tema, **Then** a área de toque efetiva é igual ou superior a $44 \times 44\text{ px}$.
3. **Given** um usuário navegando exclusivamente pelo teclado, **When** o foco atinge o seletor de tema, **Then** um anel de foco visível de alto contraste (`--focus`) é projetado sem ser cortado pelas bordas da barra.
4. **Given** um leitor utilizando zoom de texto de 200%, **When** o tema é alternado, **Then** o texto das opções do seletor e as legendas da narrativa se adaptam em reflow natural sem sobreposições nem truncamentos.

---

## Functional Requirements *(mandatory)*

- **FR-001**: O sistema deve fornecer um elemento interativo de seleção de atmosfera visual (`#theme`) posicionado no grupo de utilitários da barra de navegação (`nav.control-bar .utility-controls`), imediatamente após o controle `#speed` e antes do botão `#audio-toggle`.
- **FR-002**: O seletor de tema deve conter exatamente 5 opções válidas com rótulos visuais curtos e descrições acessíveis completas via `aria-label`:
  - `cinema` — Rótulo visual: "Cinema" | `aria-label="Cinema Minimalista (A24 / MUBI)"` [Padrão]
  - `noir` — Rótulo visual: "Noir" | `aria-label="Graphic Novel Noir (HQ Clássica)"`
  - `eldritch` — Rótulo visual: "Eldritch" | `aria-label="Atmospheric Eldritch (Gótico / Penumbra)"`
  - `industrial` — Rótulo visual: "Industrial" | `aria-label="Industrial Brutalist (Terminal / CRT)"`
  - `shadow-props` — Rótulo visual: "Shadow" | `aria-label="Shadow-Props Base (Tokens Puros)"`
- **FR-003**: Ao acionar uma opção, a aplicação deve alterar imediatamente o atributo `data-theme` no elemento raiz `<html>` (ex.: `html[data-theme="noir"]`).
- **FR-004**: O seletor de tema deve possuir um rótulo acessível via `<label class="sr-only" for="theme">Atmosfera visual da narrativa</label>` e atributo `aria-label="Atmosfera visual da narrativa"`. O wrapper `.theme-control` é puramente estrutural/estilístico sem semântica de grupo ou `aria-label` redundantes.
- **FR-005**: O tamanho do alvo de interação do controle de tema deve ter dimensões mínimas de $44 \times 44\text{ px}$ (`min-width: 2.8rem; min-height: 2.8rem;`).
- **FR-006**: O sistema deve persistir o identificador do tema ativo no armazenamento local do navegador através da chave `hwc.theme` gerenciada pelo `StorageManager`.
- **FR-007**: Ao inicializar a aplicação (`boot`), o `StorageManager` deve restaurar o tema persistido antes da primeira pintura ou durante o ciclo inicial de montagem para prevenir efeito de piscar (FOUC). Caso não haja valor salvo, deve aplicar o padrão `cinema`.
- **FR-008**: O `StorageManager` deve transmitir e escutar alterações do tema entre diferentes abas/janelas do mesmo navegador utilizando `BroadcastChannel('theme')` e ouvintes de evento `storage`, adotando a semântica Last-Write-Wins (LWW). Em restaurações via Back/Forward Cache (`pageshow` com `event.persisted === true`), o estado persistido é revalidado e o tema sincronizado.
- **FR-009**: Todos os 5 temas visuais devem ser incorporados em CSS puro através de regras declarativas sob o seletor `html[data-theme="..."]`, redefinindo estritamente variáveis de tokens (`--ink-*`, `--mist-*`, `--amber-*`, `--line`, `--radius-*`, `--font-*`). Utiliza-se exclusivamente pilhas de fontes do sistema locais (`system font stacks`), sem qualquer carregamento assíncrono de `@font-face`. Sob `@media (forced-colors: active)`, as cores dos temas cedem precedência para o sistema operacional (`forced-color-adjust: auto`). O seletor e suas `<option>` declaram explicitamente `color-scheme: dark; background-color: var(--ink-900); color: var(--mist-100);`.
- **FR-010**: O peso total do bundle de estilos compilado e minificado com os 5 temas embutidos não deve exceder o teto estrito de **15 KB** comprimidos em Gzip (`compressedStyleBytes <= 15000` em `budget.json`).
- **FR-011**: A troca de temas deve manter as variáveis de estabilidade de linha do narrador (`--description-reserve-lines: 13`) e calibração métrica da tipografia, assegurando $\text{CLS} = 0.00$ em todas as transições de tema sem estourar o bloco reservado em 320px.
- **FR-012**: Em condições de erro ou exceção no acesso ao armazenamento local (ex.: *QuotaExceededError* ou permissões restritas), a troca de tema deve continuar funcionando em memória volátil durante a sessão do leitor.
- **FR-013**: Em viewports estreitos de 320px ou em orientação *short landscape* (`@media (max-height: 30rem) and (orientation: landscape)`), o controle de tema deve acomodar-se sem provocar rolagem horizontal indesejada e sem comprimir a área útil do fotograma.

---

## Success Criteria *(mandatory)*

- **SC-001**: O bundle final de estilos (`dist/src/styles/*.css`) gerado pelo script de build em produção não deve exceder **10.000 bytes** comprimidos via Gzip (teto do projeto: 15.000 bytes), preservando no mínimo 33% de folga orçamentária.
- **SC-002**: A métrica Cumulative Layout Shift (CLS) registrada durante a alternância entre qualquer um dos 5 temas em tempo de execução deve ser exatamente **0.00** em testes automatizados do Playwright.
- **SC-003**: 100% dos textos legíveis e controles em todos os 5 temas devem atender ou superar a taxa de contraste mínima de **7:1** para texto regular contra o fundo escuro (WCAG 2.2 Nível AAA). As paletas devem atender aos critérios fotométricos de ergonomia: fundo com luminância relativa $L \le 0.02$, contraste entre $10.5:1$ e $17.8:1$, sem fundos brancos e sem extremos `#000000`/`#ffffff` puros que causem halação.
- **SC-004**: 100% dos alvos de toque interativos do seletor e controles adjacentes devem medir no mínimo **44 × 44 pixels** em todos os navegadores suportados.
- **SC-005**: A latência de aplicação visual da troca de tema após o clique/seleção do usuário deve ter tempo de execução JS síncrono $< 1\text{ ms}$ e não agendar nenhum frame de animação na aplicação (`appFrames === 0`), garantindo latência total inferior a **16 ms** em qualquer plataforma e determinismo em ambientes de software rasterizer.
- **SC-006**: A preferência de tema selecionada pelo usuário deve ser restaurada com 100% de sucesso após recarregamento total da página (F5 / hard reload) em todos os navegadores da matriz de testes (Chromium, Firefox, WebKit).
- **SC-007**: A sincronização multi-abas deve propagar a alteração de tema para abas passivas em menos de **100 ms** via `BroadcastChannel`.

---

## Key Entities & Data Models

### Entidade: ThemeOption
- `id`: String enumerada (`cinema` | `noir` | `eldritch` | `industrial` | `shadow-props`)
- `label`: String legível curta ("Cinema", "Noir", etc.)
- `description`: String descritiva para `aria-label` ("Cinema Minimalista (A24 / MUBI)", etc.)
- `isDefault`: Booleano (`true` para `cinema`)

### Projeção no Storage: PersistedThemeState
- Chave: `hwc.theme`
- Valor: String correspondente ao `id` do tema ativo
- Fallback: `'cinema'` quando a chave for nula, ausente ou inválida

---

## Assumptions & Dependencies

- **Sem Dependências Externas**: Nenhuma biblioteca adicional será instalada; utiliza-se exclusivamente as Custom Properties CSS nativas e a infraestrutura de Vanilla ES Modules já existente no projeto.
- **Estabilidade do Build**: O pipeline de empacotamento com `esbuild` já processa múltiplos arquivos CSS e gera os bundles minificados com hash para `dist/src/styles/`.
- **Compatibilidade dos Fotogramas**: Os fotogramas da narrativa (AVIF, WebP, JPEG) possuem iluminação e composição artística compatíveis com as 5 atmosferas escuras, não necessitando de filtros CSS destrutivos (como inversão de cor ou blur sobre a arte).

---

## Non-Goals *(fora de escopo)*

- **Fullscreen API**: A integração de tela cheia programática via API JavaScript está expressamente fora do escopo desta feature (o player não possui `#fullscreen-toggle`). O tema cobre todo o viewport nativamente caso o usuário ative fullscreen via sistema operacional (ex.: tecla F11).
- **Web Fonts Remotas**: Nenhuma fonte externa ou assíncrona será baixada ou embutida no pacote. Toda a tipografia é baseada em pilhas de fontes de sistema universais locais.
- **Anúncios em Live Region para Temas Passivos**: Sincronizações remotas via BroadcastChannel não anunciam áudio/live regions intrusivas para evitar quebras de imersão de leitores de tela durante a audiodescrição.

---

## Rastreabilidade de Acessibilidade (WCAG 2.2 AAA)

| Requisito / Critério | Critério WCAG 2.2 | Nível | Descrição do Atendimento |
|:---|:---|:---:|:---|
| **FR-009, SC-003** | **1.4.6 Contrast (Enhanced)** | **AAA** | Todos os temas mantêm contraste $\ge 7:1$ (calibrado entre $10.5:1$ e $17.8:1$) e luminância de fundo $L \le 0.02$. |
| **FR-005, SC-004** | **2.5.5 Target Size (Enhanced)** | **AAA** | O seletor `#theme` e invólucro possuem dimensões mínimas de $44 \times 44\text{ px}$. |
| **FR-004** | **4.1.2 Name, Role, Value** | **A** | Controle nativo `<select>` com `<label for="theme">` e `aria-label` descritivo em cada opção. |
| **FR-011, SC-002** | **1.4.10 Reflow / 1.4.4 Resize Text** | **AA** | Acomodação em viewports de 320px sem scroll horizontal e estabilidade vertical com $\text{CLS} = 0.00$. |
| **FR-009** | **Forced Colors Mode** | **Best Practice** | Suporte a `@media (forced-colors: active)` com `forced-color-adjust: auto` e bordas preservadas. |
