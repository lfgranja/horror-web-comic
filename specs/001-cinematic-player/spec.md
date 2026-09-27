# Feature Specification: Player Cinematográfico de Quadros

**Feature Branch**: `001-cinematic-player`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "player cinematográfico de quadros com áudio opcional e desativável"

## Clarifications

### Session 2026-09-23

- Q: Como a narrativa deve avançar de um quadro para o outro durante a exibição? → A: Híbrido: avança automaticamente por padrão, com pausar/avançar/voltar; o autor pode definir ritmos (velocidades) maiores ou menores por quadro ou por história.
- Q: Ao avançar ou voltar manualmente, qual é a unidade de navegação — cada quadro ou cada cena? → A: Controles principais quadro a quadro, com avanço/retroceder rápido por cena e opção de voltar ao início.
- Q: A posição de leitura (quadro atual) deve ser lembrada entre visitas, ou apenas durante a sessão atual? → A: Persistir entre visitas: retoma no quadro onde parou, com opção de reiniciar do início.
- Q: Quando um usuário que já havia ligado o áudio retorna, o áudio deve tentar tocar automaticamente ou permanecer silencioso até uma nova interação? → A: O áudio inicia ativo por padrão (não silencioso), respeitando as políticas de reprodução automática do navegador.
- Q: Que nível de descrição acessível cada quadro deve ter? → A: Descrição narrativa detalhada por quadro, equivalente à experiência visual, para leitores de tela.

### Session 2026-09-23 (revisão de checklists)

- Q: Como a narrativa começa? → A: A experiência inicia automaticamente ao carregar (auto-start visual); um overlay "toque para iniciar" aparece somente quando o navegador bloqueia o áudio, para servir de gesto qualificado.
- Q: Como o avanço automático se comporta sob movimento reduzido? → A: Continua avançando, porém com cortes instantâneos, sem qualquer animação além de um quadro estático.
- Q: Qual a precisão da retomada? → A: Nível de quadro: o quadro corrente reinicia do zero; o áudio da cena retoma de onde parou.
- Q: Como ritmos do autor e a meta SC-001 se relacionam? → A: Suporta-se ritmo por quadro, cena e história; a precedência é velocidade escolhida pelo usuário > ritmo do autor > padrão de SC-001.
- Q: Existe controle de velocidade pelo usuário? → A: Sim: 0,5x / 1x / 2x, persistido entre visitas.
- Q: Como alcançar o fim da narrativa em poucas ações? → A: Adiciona-se "ir ao fim" (`End`), mantendo SC-011 (≤3 ações).
- Q: O que acontece ao perder o foco da aba? → A: A reprodução pausa; ao voltar, um overlay de retomada exige ação explícita para continuar.
- Q: Como o autoplay bloqueado é tratado? → A: Qualquer gesto qualificado do usuário ativa o áudio; o controle exibe um terceiro estado "bloqueado" até a ativação.
- Q: Como o áudio transiciona entre cenas? → A: Crossfade curto no limite da cena; silêncio quando a cena seguinte não possui trilha.
- Q: Como áudio de quadro e de cena coexistem? → A: Somam/sobrepõem-se (mix): a trilha da cena permanece em loop e a do quadro é somada, com a cena atenuada (ducking) enquanto o áudio do quadro toca.
- Q: Haverá controle de volume? → A: Sim: um controle de volume persistido, além do ligar/desligar.
- Q: Como tratar metas de 100% quando o armazenamento não existe? → A: SC-007 e SC-012 ganham cláusula de exceção para armazenamento indisponível/evictado.
- Q: Qual o alvo de acessibilidade? → A: WCAG 2.2 nível AAA: alvos de toque ≥44 px, contraste reforçado, alt curto mais descrição longa por quadro.
- Q: O modelo de conteúdo cobre transições e áudio por quadro? → A: Sim: `transition` (tipo, duração e easing configuráveis) e `audio` opcional por quadro.
- Q: Como múltiplas abas se comportam? → A: O progresso é sincronizado entre abas via evento `storage`.
- Q: Os orçamentos constitucionais serão quantificados na spec? → A: Sim: peso de ativos, JS/CSS, CLS, formatos, metadados e matriz de navegadores passam a ser requisitos com números concretos.

### Session 2026-09-23 (2ª revisão de checklists)

- Q: O `alt` curto por quadro é obrigatório no manifesto? → A: Sim, obrigatório no schema e no data-model (FR-012).
- Q: Como FR-031 degrada em baixo desempenho/economia de dados? → A: Sinais detectados por capacidade do navegador (economia de dados, memória e núcleos, quando suportados); serve-se a variante mais leve (≤150 KB/quadro) e desativam-se transições não essenciais (SC-020).
- Q: Como fica a rastreabilidade WCAG? → A: 2.2.2→FR-013/FR-005; 2.5.5/1.4.6→FR-010/SC-017; 1.2.1→FR-008/FR-012.
- Q: Ao religar o áudio, corte ou fade? → A: Fade-in ≤300 ms; parada ≤100 ms (FR-006).
- Q: Informação percebida só por áudio deve constar na descrição? → A: Sim; a descrição cobre pistas sonoras relevantes (FR-012/SC-013).
- Q: Qual o padrão de compressão de imagem? → A: Documentado no plano (AVIF ≈50, WebP ≈75, JPEG ≈80); FR-028 referencia o padrão.
- Q: Fonte única para metas de carregamento e fluidez? → A: SC-019 (primeiro quadro frio <2,5 s p75) e SC-018 (≥60 fps); plano alinhado.
- Q: Como se comporta o estado final (`ended`)? → A: Overlay acessível "fim da narrativa" com "Rever do início"; navegação permanece ativa e sai do estado final (FR-033).
- Q: Qual o alcance de SC-011 "início de qualquer cena"? → A: Cena anterior/seguinte + primeiro/último quadro em ≤3 ações.
- Q: Detalhes técnicos no spec? → A: Linguagem neutra no spec; nomes/unidades exatos em plan/data-model/contracts; números mensuráveis mantidos.
- Q: Ambiguidades de tempo? → A: Ritmo padrão de 1.500 ms por quadro; velocidade divide só a permanência; coalescência em janela de 400 ms.
- Q: Como verificar SC percentuais sem rastreadores? → A: Protocolo de teste (≥10 participantes; 100% das sessões de teste).

### Session 2026-09-23 (3ª revisão de checklists)

- Q: Qual a origem de medição de SC-001? → A: Do navigation start até a exibição do segundo quadro.
- Q: Como detectar bloqueio de autoplay sem confundir com falha de arquivo? → A: Somente a recusa de permissão de reprodução; falhas de carregamento seguem FR-032.
- Q: Como expor o terceiro estado de áudio a leitores de tela? → A: `aria-pressed` + `aria-disabled` + região `role="status"`, com rótulo fixo.
- Q: Ao desligar o áudio, corte ou fade? → A: Corte imediato com micro-rampa anti-clique (≤100 ms); fade-in ≤300 ms ao religar.
- Q: Pré-carga de áudio? → A: Trilhas da cena corrente e da seguinte; sob economia de dados, áudio ativo em variante de menor taxa (~48–64 kbps).
- Q: Fonte canônica do estado persistido? → A: Storage contract; `PersistedState` é projeção em memória.
- Q: Desempate multi-aba? → A: `(updatedAt, seq, tabId)`, com `BroadcastChannel` e fallback `storage`.
- Q: Ritmo/transição padrão ausentes? → A: 1.500 ms por quadro; transição `fade` 600 ms; piso de permanência efetiva de 250 ms.
- Q: Qual FR possui o indicador de progresso? → A: FR-034.
- Q: Rastreabilidade WCAG? → A: FR-011→2.2.2(A)/2.3.3(AAA); FR-012→3.1.1/3.1.2; FR-014→4.1.3.
- Q: FR-026/027/028 sem critério de aceite? → A: SC-021..023.
- Q: FR-031(c) sem alvo de resolução? → A: Maior lado ≤1280 px; áudio a 96 kbps.

### Session 2026-09-23 (4ª revisão de checklists)

- Q: Quando o navegador bloqueia o áudio e o overlay "toque para iniciar" aparece, o visitante pode continuar em silêncio? → A: Sim; o overlay oferece a ação explícita "continuar sem som" (que não ativa o áudio); qualquer outro gesto qualificado ativa o áudio.
- Q: Ao reabrir o navegador após pausar, a narrativa retoma avançando ou permanece pausada? → A: Retoma avançando automaticamente no quadro salvo; o estado de pausa não é persistido.
- Q: O que fazer com estado persistido de `schemaVersion` desconhecido/incompatível? → A: Descartar o estado salvo e aplicar os padrões (volta ao início; áudio/volume/velocidade padrão), sem bloquear a experiência.
- Q: Ao pausar a narrativa, o áudio da cena também pausa? → A: Sim; a pausa interrompe avanço e áudio, e a retomada continua o áudio da posição em que parou.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assistir à história como um filme (Priority: P1)

Um visitante abre a web comic e acompanha a narrativa de terror como se estivesse
assistindo a um filme: os quadros surgem em sequência, com ritmo e transições
controlados, conduzindo a tensão cena a cena. O visitante pode avançar e voltar
entre quadros/cenas quando quiser.

**Why this priority**: É a proposta central do produto. Sem uma experiência de
exibição cinematográfica, não existe o "filme em quadrinhos" — apenas uma galeria
de imagens. Todas as demais histórias pressupõem esta.

**Independent Test**: Abrir a comic em um navegador e verificar que os quadros
aparecem em ordem narrativa com transições perceptíveis, e que é possível ir ao
próximo e ao anterior — entregando valor mesmo sem áudio ou recursos avançados.

**Acceptance Scenarios**:

1. **Given** que a comic foi carregada, **When** a experiência inicia, **Then** o
   primeiro quadro é exibido e a narrativa avança automaticamente para os quadros
   seguintes no ritmo definido pelo autor.
2. **Given** que um quadro está em exibição, **When** o visitante avança, **Then**
   o próximo quadro surge com transição cinematográfica, respeitando a ordem
   narrativa.
3. **Given** que um quadro está em exibição, **When** o visitante volta, **Then**
   o quadro anterior é exibido sem quebrar a imersão.
4. **Given** que a sequência terminou, **When** o último quadro é exibido,
   **Then** o visitante percebe o fim da narrativa e pode rever a sequência.
5. **Given** que a narrativa avança automaticamente, **When** o visitante pausa,
   **Then** o avanço automático para e ele pode retomá-lo quando quiser.
6. **Given** que o autor definiu um ritmo mais lento para um quadro de suspense,
   **When** esse quadro é exibido, **Then** ele permanece em cena por mais tempo
   que os quadros de ritmo normal.
7. **Given** que um quadro está em exibição, **When** o visitante usa o salto por
   cena, **Then** avança ou retrocede para o início da cena seguinte/anterior.
8. **Given** que o visitante está em qualquer ponto da narrativa, **When** ele
   aciona "voltar ao início", **Then** retorna ao primeiro quadro.

---

### User Story 2 - Controlar o áudio facilmente (Priority: P2)

Um visitante percebe que a experiência tem áudio, que começa ativo por padrão
para intensificar a atmosfera de terror. Com um único controle sempre visível,
ele desliga o som imediatamente quando quiser. A escolha é lembrada em visitas
futuras.

**Why this priority**: O áudio é um recurso de primeira classe para a atmosfera e
deve ser facilmente desativável para respeitar o usuário e as políticas de
reprodução automática dos navegadores.

**Independent Test**: Carregar a comic e confirmar que o áudio inicia ativo por
padrão, que existe um controle claro de ligar/desligar, que o som para
imediatamente ao desligar e que a preferência persiste ao recarregar.

**Acceptance Scenarios**:

1. **Given** que é a primeira visita do usuário, **When** a comic é carregada,
   **Then** o áudio da cena é reproduzido por padrão, salvo quando o navegador
   bloqueia a reprodução automática.
2. **Given** que o áudio está desligado, **When** o usuário aciona o controle de
   áudio, **Then** o áudio da cena passa a tocar de forma coerente com o quadro.
3. **Given** que o áudio está ligado, **When** o usuário aciona o controle
   novamente, **Then** o áudio é interrompido imediatamente, sem reiniciar a cena.
4. **Given** que o usuário escolheu ligar (ou desligar) o áudio, **When** ele
   retorna em uma nova visita, **Then** a preferência é respeitada.
5. **Given** que o navegador bloqueia reprodução automática, **When** a comic
   carrega, **Then** a experiência continua normalmente em silêncio, sem erros.

---

### User Story 3 - Assistir confortavelmente em qualquer dispositivo (Priority: P3)

Um visitante assiste à comic tanto no smartphone (retrato ou paisagem) quanto no
navegador do computador, com a mesma integridade narrativa: enquadramento
correto, sem cortes, sem rolagem horizontal, com controles acessíveis por toque
e por teclado.

**Why this priority**: Grande parte do público consome no celular; a experiência
não pode degradar no dispositivo mais comum nem depender de mouse/hover.

**Independent Test**: Abrir a comic em um smartphone e em um desktop, alternar a
orientação e confirmar que a narrativa permanece íntegra e navegável por toque e
teclado.

**Acceptance Scenarios**:

1. **Given** um smartphone em retrato, **When** a comic é exibida, **Then** os
   quadros ocupam a tela sem cortes ou rolagem horizontal.
2. **Given** um smartphone, **When** o usuário gira para paisagem, **Then** o
   enquadramento se ajusta e a narrativa continua.
3. **Given** um desktop, **When** o usuário usa o teclado, **Then** consegue
   avançar e voltar entre quadros.
4. **Given** um smartphone, **When** o usuário toca na tela/controles, **Then**
   consegue avançar e voltar entre quadros.

---

### User Story 4 - Assistir com conforto e acessibilidade (Priority: P4)

Um visitante sensível a movimento, que usa leitor de tela ou que não pode ouvir
consegue acompanhar a história: a experiência respeita a preferência de movimento
reduzido, oferece descrição narrativa dos quadros e permite pausar e retomar.

**Why this priority**: Terror imersivo não pode excluir pessoas com necessidades
de acessibilidade; requisito explícito da constituição do projeto.

**Independent Test**: Ativar a preferência de movimento reduzido e usar um leitor de
tela; confirmar que transições são reduzidas, que há descrição textual dos
quadros e que é possível pausar/retomar (quadro reiniciando do zero, áudio da
cena continuando da posição em que parou).

**Acceptance Scenarios**:

1. **Given** que o usuário configurou movimento reduzido, **When** a comic é
   exibida, **Then** animações/transições são reduzidas ou removidas.
2. **Given** um usuário de leitor de tela, **When** ele navega pelos quadros,
   **Then** cada quadro possui descrição narrativa acessível.
3. **Given** que a narrativa está em andamento, **When** o usuário pausa,
   **Then** a progressão e o áudio param; **Then** a retomada reinicia o
   quadro corrente do zero e continua o áudio da cena da posição em que parou
   (FR-013).

---

### Edge Cases

- O navegador bloqueia reprodução automática de áudio: a experiência permanece
  silenciosa e funcional, sem mensagens de erro; um overlay "toque para iniciar"
  aparece, oferecendo "continuar sem som" (que não ativa o áudio) além de
  qualquer gesto qualificado que ativa o som; o controle passa a exibir o
  estado "bloqueado" até a ativação.
- O usuário alterna o áudio no meio de uma cena: a transição de som é imediata
  (≤100 ms) e não reinicia nem interrompe o quadro atual; ao religar, a trilha
  retoma da posição em que estava.
- O usuário alterna o áudio durante uma transição entre cenas: o crossfade de
  cena e o ligar/desligar são aplicados sem reiniciar o quadro.
- Conexão lenta ou economia de dados ativa: os quadros carregam de forma
  progressiva, com placeholder e layout reservado, mantendo o layout estável e
  sem quadros quebrados; sob economia de dados, serve-se a variante mais leve
  (≤150 KB/quadro) e desativam-se as transições não essenciais (qualquer tipo
  distinto de `cut`/`none` — FR-031).
- Uma imagem falha ao carregar: exibe-se um placeholder com a descrição
  acessível e a navegação continua, sem bloquear a narrativa.
- O manifesto está ausente, malformado ou com `schemaVersion` incompatível: a
  experiência falha de forma controlada, exibindo uma tela de erro amigável (sem
  página em branco).
- O usuário fecha e reabre o navegador: a preferência de áudio, o volume, a
  velocidade e a posição de leitura são preservadas, retomando no mesmo quadro e
  voltando a avançar automaticamente (o estado de pausa não é persistido), salvo
  quando ele opta por reiniciar do início; se o armazenamento estiver
  indisponível, a experiência funciona com padrões em memória.
- O estado persistido tem `schemaVersion` desconhecido/incompatível: ele é
  descartado e os padrões são aplicados (volta ao início; áudio, volume e
  velocidade padrão), sem bloquear a narrativa.
- A aba/janela perde o foco: a reprodução e o áudio pausam; ao voltar, um overlay
  de retomada exige ação explícita.
- Múltiplas abas abertas: a posição de leitura é sincronizada entre as abas do
  navegador, adotando-se a última posição gravada.
- O usuário chega ao fim da sequência: um overlay acessível "fim da narrativa"
  indica o estado final e oferece "Rever do início"; os controles de navegação
  permanecem disponíveis e, ao serem acionados, deixam o estado final.
- O usuário desativa o áudio permanentemente e navega por toda a narrativa sem
  perda de compreensão.
- O autor não define um ritmo específico para um quadro: aplica-se o ritmo da
  cena e, na ausência deste, o ritmo padrão da história.
- A narrativa tem um único quadro, ou uma única cena, ou uma cena com muitos
  quadros: o player trata os limites (próximo no último, anterior no primeiro,
  "ir ao fim" imediato) sem erro.
- O usuário aplica velocidade 2x a um quadro de ritmo lento: a duração efetiva é
  dividida pela velocidade, respeitando o mínimo técnico de exibição.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A experiência DEVE apresentar os quadros em uma ordem narrativa
  definida.
- **FR-002**: A experiência DEVE transicionar entre quadros de forma
  cinematográfica, conforme a intenção narrativa, com tipos enumerados (`cut`,
  `fade`, `zoom-in`, `zoom-out`, `dissolve`, `slide-left`, `slide-right`, `none`),
  duração configurável (0–2000 ms, padrão 600 ms) e easing configurável (`linear`,
  `ease-in`, `ease-out`, `ease-in-out`, padrão `ease-in-out`), definidos por
  quadro, sobrepondo cena, sobrepondo história.
- **FR-003**: O usuário DEVE poder avançar e voltar quadro a quadro (controle
  principal), saltar rapidamente por cena (avançar/retroceder), ir ao início
  (`Home`) e ir ao fim (`End`) da narrativa. Qualquer navegação manual DEVE
  pausar o avanço automático; em limites (primeiro/último quadro, primeira/última
  cena) a ação correspondente é no-op; durante uma transição, a navegação cancela
  a transição e reposiciona; entradas repetidas em rápida sucessão são
  coalescidas em uma janela de 400 ms (a última prevalece).
  > **Nota de implementação (T201, 2026-09-27).** A coalescência é
  > *leading-edge*: a primeira entrada de uma sequência executa imediatamente,
  > sem atraso, e as entradas subsequentes que caem dentro dos 400 ms seguintes
  > substituem apenas a navegação ainda pendente. A entrada nunca aguarda a
  > janela para ser executada. A razão é a latência percebida: um debounce
  > estrito atrasaria **toda** navegação manual em 400 ms, e o FR-013 exige que
  > a resposta ao controle seja imediata. A consequência deliberada é que dois
  > toques separados por menos de 400 ms **executam os dois**, o que corresponde
  > ao comportamento esperado de toque duplo em leitores de quadrinhos. O
  > requisito "a última prevalece" aplica-se às entradas que ainda estão
  > pendentes dentro da janela, não à primeira entrada da sequência.
- **FR-004**: O áudio DEVE iniciar ativo por padrão, incluindo na primeira visita,
  respeitando as políticas de reprodução automática do navegador; a experiência
  visual inicia automaticamente e, se o áudio for bloqueado, um overlay "toque
  para iniciar" é exibido.
- **FR-005**: O usuário DEVE ter um controle único e sempre acessível para
  ligar/desligar o áudio, além de um controle de volume (FR-020).
- **FR-006**: Ao ligar o áudio, a trilha/ambiente correspondente à cena DEVE
  tocar de forma coerente; ao desligar, o áudio DEVE cessar de imediato (corte
  com micro-rampa anti-clique), com conclusão em no máximo 100 ms.
  Ao religar no meio de uma cena, a trilha DEVE retomar da posição em que estava,
  com fade-in de no máximo 300 ms.
  No limite entre cenas, DEVE haver crossfade curto (≤500 ms); se a cena seguinte
  não possuir trilha, o áudio DEVE ser silenciado. Quando um quadro possui áudio
  próprio, ele DEVE somar-se ao da cena (mix), atenuando a cena enquanto o áudio
  do quadro toca.
  > **Nota de implementação (T203, 2026-09-27).** O crossfade de ≤500 ms vale
  > para o **avanço automático** entre cenas. Na navegação **manual** (salto de
  > cena, `Home`, `End`, "Rever do início") o áudio é cortado em ≤100 ms, sem
  > crossfade, porque FR-003 exige que a navegação manual pause o avanço e
  > FR-013/T119 exigem que a parada conclua em ≤100 ms: um crossfade de 500 ms
  > emitiria áudio depois de o usuário ter pausado. O corte é o comportamento
  > exigido nesses casos, não uma degradação.
- **FR-007**: A preferência de áudio, o volume e a velocidade DEVEM ser lembrados
  entre visitas.
  > **Nota de implementação (T211, 2026-09-27).** A ação "continuar sem som" do
  > overlay de áudio bloqueado grava a **mesma** chave `hwc.audio = "off"` que o
  > controle dedicado grava, e portanto também é lembrada entre visitas: enquanto
  > o usuário não religar pelo controle, as visitas seguintes não repetem a
  > tentativa de reprodução automática nem reexibem o overlay. A ativação por
  > gesto (FR-016) continua valendo **apenas dentro da sessão corrente**, ou seja,
  > quando o áudio não foi desligado explicitamente.
- **FR-008**: A narrativa DEVE ser totalmente compreensível sem áudio
  (medição em SC-004; cobertura de conteúdo via FR-012/SC-013).
- **FR-009**: A experiência DEVE se adaptar a diferentes tamanhos de tela e
  orientações, sem cortes de enquadramento nem rolagem horizontal, exibindo a
  imagem integral, sem corte, e respeitando as áreas seguras da tela (notch).
- **FR-010**: A navegação DEVE funcionar tanto por toque quanto por teclado, com
  foco visível em todos os controles, alvos de toque ≥44×44 px e sem depender
  exclusivamente de hover.
- **FR-011**: A experiência DEVE respeitar a preferência de movimento reduzido do
  usuário: o avanço automático continua, mas todas as transições viram corte
  instantâneo e nenhuma animação, de qualquer origem, além de um quadro
  estático é executada.
- **FR-012**: Cada quadro DEVE oferecer uma descrição narrativa detalhada,
  equivalente à experiência visual, para usuários de leitores de tela, além de um
  alt curto; a descrição DEVE cobrir personagens, cenário, ação, atmosfera e as
  pistas sonoras relevantes à narrativa (ex.: sons que só existem no áudio), e
  reproduzir literalmente o texto embutido (diálogo/lettering). O idioma da página
  e das descrições DEVE ser declarado de forma legível por tecnologias assistivas.
- **FR-013**: O usuário DEVE poder pausar e retomar a narrativa do ponto onde
  parou; pausar DEVE interromper o avanço automático e também o áudio da cena.
  A retomada é a nível de quadro: o quadro corrente reinicia do zero, enquanto o
  áudio da cena retoma da posição em que estava. Perder o foco da aba DEVE
  pausar reprodução e áudio; ao voltar, DEVE exibir-se um overlay de retomada
  que exige ação explícita para continuar.
- **FR-014**: A experiência DEVE indicar de forma visível e acessível o estado do
  áudio: ligado, desligado ou bloqueado (quando a preferência é ligada mas o
  navegador impede a reprodução).
- **FR-015**: Os quadros DEVEM carregar de forma progressiva, com placeholder e
  proporção reservada, mantendo o layout estável (sem deslocamento perceptível;
  estabilidade de layout <0,1) durante o carregamento; o quadro corrente, o
  próximo e as trilhas da cena corrente e da cena seguinte DEVEM
  ser pré-carregados; em conexões lentas (`saveData` ativo, `effectiveType` de
  `slow-2g`/`2g`/`3g` ou `rtt` > 300 ms quando exposto por
  `navigator.connection`), o pré-carregamento restringe-se ao quadro corrente e
  às trilhas da cena corrente. Quando a API de conexão não está disponível,
  aplica-se apenas a regra de `saveData`.
  Se a imagem de um quadro falhar em runtime, DEVE exibir-se um placeholder
  com a descrição acessível do quadro e a navegação DEVE continuar, sem
  bloquear a narrativa.
- **FR-016**: A experiência DEVE funcionar corretamente quando a reprodução
  automática de áudio é bloqueada pelo navegador: detectar o bloqueio pela recusa
  de permissão de reprodução (sem confundi-lo com falha de carregamento de
  arquivo, tratada em FR-032), permanecer silenciosa sem erro, exibir o overlay e
  ativar o áudio em qualquer gesto qualificado do usuário (toque, clique ou
  tecla), passando o controle
  ao estado ligado. O overlay DEVE oferecer uma ação explícita de "continuar sem
  som" que NÃO ativa o áudio e permite seguir a leitura; qualquer outro gesto
  qualificado ativa o áudio. A ativação por gesto vale para a sessão, cobrindo
  quadros e cenas seguintes; se a preferência persistida for "desligado", o gesto
  não a sobrepõe e o áudio só liga pelo controle dedicado.
  > **Nota de implementação (T205, 2026-09-27).** "Gesto qualificado" exclui duas
  > classes de evento de teclado, de forma deliberada: a tecla `Escape` e
  > qualquer `keydown` cujo alvo seja um `input`, `select`, `textarea` ou
  > `contenteditable`. A razão é que ativar áudio como efeito colateral de uma
  > tecla de escape ou de digitação em um campo de formulário é um efeito
  > inesperado para o usuário, e o requisito de áudio tem um controle dedicado
  > e sempre visível (FR-005). O requisito passa a ser "qualquer gesto
  > qualificado **exceto** `Escape` e teclas dirigidas a campos de formulário",
  > refletido também em `contracts/player-ui-contract.md`.
- **FR-017**: A narrativa DEVE iniciar automaticamente e avançar automaticamente
  por padrão, no ritmo definido para cada quadro, cena ou história; a velocidade
  escolhida pelo usuário tem precedência sobre o ritmo do autor, que tem
  precedência sobre o padrão de 1.500 ms por quadro, aplicado quando nenhum nível
  define ritmo.
- **FR-018**: O autor DEVE poder definir ritmos (velocidades) maiores ou menores
  por quadro, cena ou história, dentro de limites de 500–30.000 ms (precedência
  de resolução conforme FR-017).
- **FR-019**: A posição de leitura DEVE ser preservada entre visitas, retomando
  no quadro onde o usuário parou, com uma opção explícita de reiniciar do início;
  o progresso DEVE ser gravado tanto na pausa/navegação manual quanto no avanço
  automático, e sincronizado entre abas do navegador. O estado de pausa NÃO é
  persistido: ao retornar, a narrativa retoma no quadro salvo e volta a avançar
  automaticamente (respeitando o bloqueio de reprodução automática do áudio).
- **FR-020**: O usuário DEVE dispor de um controle de volume persistido (0–100%),
  iniciando no volume base definido pelo autor (padrão 0,6).
- **FR-021**: O usuário DEVE poder escolher a velocidade de exibição (0,5x, 1x,
  2x), persistida entre visitas; a velocidade divide apenas a duração de
  permanência do quadro, mantendo inalterada a duração das transições e nunca
  resultando em permanência efetiva inferior a 250 ms.
- **FR-023**: Se o manifesto de conteúdo estiver ausente, malformado ou falhar na
  validação de schema, a experiência DEVE falhar de forma controlada (fail-closed),
  exibindo uma tela de erro amigável, sem página em branco.
- **FR-024**: Um manifesto com `schemaVersion` desconhecido/incompatível DEVE ser
  rejeitado de forma controlada (fail-closed, FR-023). O estado persistido no
  navegador com `schemaVersion` desconhecido/incompatível DEVE ser descartado e
  substituído pelos padrões, sem bloquear a experiência.
- **FR-025**: A integridade referencial do manifesto (unicidade de `Frame.id` e
  existência dos arquivos de imagem/áudio) DEVE ser verificada por um validador de
  build/CI, já que a validação de formato do manifesto não a garante.
- **FR-026**: A página DEVE conter metadados de título, descrição e Open Graph.
- **FR-027**: A matriz de navegadores suportados (últimas versões de Chrome,
  Firefox, Safari desktop e Chrome/Safari móveis) DEVE ser declarada e testada.
- **FR-028**: Os formatos de imagem e de áudio, a resolução máxima e o padrão de
  compressão DEVEM seguir o padrão de entrega documentado do projeto e ser
  otimizados para o orçamento de FR-029.
- **FR-029**: O projeto DEVE respeitar orçamentos de entrega: total de ativos
  ≤30 MB, cena inicial ≤1,5 MB, por quadro ≤300 KB, código comprimido ≤65 KB
  (≤50 KB de script e ≤15 KB de estilo), primeiro quadro em <2,5 s (p75, 4G de
  referência, cache frio — SC-019) e estabilidade de layout <0,1.
- **FR-030**: O progresso de leitura DEVE ser sincronizado entre abas do
  navegador, adotando-se a escrita mais recente segundo uma ordenação
  determinística (momento da gravação + contador monotônico por aba), de modo que
  gravações quase simultâneas tenham desempate estável.
- **FR-031**: Em dispositivos de baixo desempenho ou com economia de dados, a
  experiência DEVE degradar de forma controlada, mantendo a integridade narrativa
  e a operabilidade. Os sinais DEVEM ser detectados por capacidade disponível no
  navegador (economia de dados, memória do dispositivo e número de núcleos,
  quando suportados) e, na ausência deles, aplica-se o comportamento padrão. A
  degradação DEVE: (a) servir a variante de imagem mais leve, com cada quadro
  ≤150 KB; (b) desativar transições não essenciais — considera-se não essencial
  qualquer tipo distinto de `cut` e `none` (`fade`, `zoom-in`, `zoom-out`,
  `dissolve`, `slide-left`, `slide-right`) —, usando corte instantâneo;
  (c) servir imagens com maior lado ≤1280 px; e (d) servir o áudio em variante
  de menor taxa (~48–64 kbps), mantendo o áudio ativo.
- **FR-032**: Se um arquivo de áudio falhar em runtime, a experiência DEVE
  permanecer silenciosa e funcional, sem erro visível, mantendo o estado do
  controle coerente.
- **FR-033**: Ao atingir o fim da narrativa, a experiência DEVE indicar o estado
  final de forma visível e acessível (overlay "fim da narrativa") e oferecer a
  ação "Rever do início"; os controles de navegação DEVEM permanecer disponíveis
  e, ao serem acionados de forma que alterem a posição, deixam o estado final
  reposicionando a narrativa; "Rever do início" e "ir ao início" retomam a
  reprodução.
- **FR-034**: A experiência DEVE exibir um indicador de progresso visível,
  informativo (não interativo) e acessível, mostrando a posição atual na
  narrativa.
- **FR-035**: A página NÃO DEVE carregar recursos externos de terceiros
  (rastreadores, fontes/CDNs remotas, scripts de terceiros); a verificação de
  origens externas DEVE falhar o build quando detectada (Restrições Técnicas
  da constituição).

### Key Entities *(include if feature involves data)*

- **Quadro (Frame)**: unidade narrativa da comic; possui posição na sequência,
  imagem, descrição narrativa detalhada (equivalente à experiência visual) com alt
  curto, ritmo/duração de exibição definido pelo autor (opcional), transição
  cinematográfica (opcional) e, opcionalmente, áudio associado (somado ao da cena).
- **Sequência (Sequence)**: conjunto ordenado de quadros que forma a narrativa
  linear, com ritmo padrão e transição padrão definidos pelo autor e
  sobrescrevíveis por cena e por quadro.
- **Cena (Scene)**: agrupamento narrativo de quadros com ritmo/atmosfera
  próprios, possível trilha/ambiente e transição padrão própria.
- **Transição (Transition)**: efeito cinematográfico entre quadros/cenas; possui
  tipo, duração (ms) e easing — enumerados e limitados em FR-002.
- **Faixa de Áudio (AudioTrack)**: trilha/ambiente com fonte, repetição e volume
  base, associada a uma cena ou a um quadro.
- **Estado do Player (Player State)**: posição atual na sequência, situação de
  reprodução (ocioso/em andamento/pausado/finalizado), quadro corrente, velocidade
  e progresso preservado entre visitas.
- **Preferência de Áudio (Audio Preference)**: escolha do usuário entre ligado e
  desligado, além de volume e velocidade, preservada entre visitas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um visitante de primeira viagem chega ao segundo quadro em menos de
  10 segundos, medidos do início do carregamento da página (navigation start) até
  a exibição do segundo quadro, com velocidade 1x e ritmo padrão de 1.500 ms por
  quadro, em um smartphone de médio porte (referência: ~4 GB de RAM, tela
  360×800, CPU de entrada).
- **SC-002**: Em teste moderado com ao menos 10 participantes, ≥95% encontram e
  acionam o controle de áudio em até 5 segundos de uso. Parte automatizada: o
  controle é visível sem hover e alcançável em ≤1 interação a partir de
  qualquer quadro (asserção E2E); parte com participantes: protocolo ≥10
  (T032a).
- **SC-003**: O áudio inicia ativo por padrão em 100% das sessões de teste; quando o
  navegador bloqueia a reprodução automática, a experiência permanece silenciosa,
  exibe o overlay e permite ativação por qualquer gesto qualificado.
- **SC-004**: 100% da narrativa é compreensível sem qualquer áudio; em teste com
  ao menos 10 participantes, ≥95% respondem corretamente a perguntas sobre a
  narrativa com o áudio desligado. Parte automatizada: descrições não vazias em
  100% dos quadros (T053a); parte com participantes: protocolo ≥10 (T053b).
- **SC-005**: A experiência é utilizável, sem rolagem horizontal nem cortes de
  enquadramento (imagem integral), em telas de 320 px a 2560 px de largura, em
  retrato e paisagem. Entende-se "mesma integridade narrativa" como: a mesma
  sequência ordenada de quadros, sem corte de enquadramento, sem rolagem
  horizontal e com todos os controles alcançáveis.
- **SC-006**: Usuários com movimento reduzido não experimentam animação
  automática além de um quadro estático; o avanço automático continua com cortes
  instantâneos.
- **SC-007**: 100% das sessões de teste de retorno preservam a preferência de áudio,
  volume e velocidade do usuário, exceto quando o armazenamento local estiver
  indisponível ou tiver sido evictado (modo privado, restrições do navegador), caso
  em que se aplicam os padrões em memória.
- **SC-008**: Nenhum quadro leva mais de 3 segundos para aparecer em uma conexão
  4G típica (referência: ~9 Mbps de download e ~170 ms de RTT). Em visitas com
  cache aquecido, o primeiro quadro aparece em <1,5 s (p75).
- **SC-009**: 100% das sessões pausadas interrompem o avanço automático e o áudio
  da cena em no máximo 100 ms e retomam do mesmo ponto, com o áudio continuando da
  posição em que parou.
- **SC-010**: Quadros com ritmo definido permanecem em cena proporcionalmente ao
  ritmo configurado (tolerância de ±10% da duração efetiva), descontada a
  velocidade escolhida pelo usuário.
- **SC-011**: O usuário alcança o primeiro quadro, o último quadro ou o início da
  cena anterior/seguinte em no máximo 3 ações a partir de qualquer ponto da
  narrativa, onde uma ação é um único toque, clique ou pressionar de tecla.
- **SC-012**: 100% das sessões de teste de retorno retomam no mesmo quadro onde o usuário
  parou, salvo quando ele escolhe reiniciar do início ou quando o armazenamento
  local estiver indisponível/evictado.
- **SC-013**: 100% dos quadros possuem descrição narrativa detalhada (personagens,
  cenário, ação, atmosfera e pistas sonoras relevantes, com texto embutido
  reproduzido) que permite compreender a história sem ver a imagem e sem ouvir o
  áudio, além de alt curto.
- **SC-014**: O conteúdo é entregue dentro dos orçamentos: cena inicial ≤1,5 MB,
  cada quadro ≤300 KB, total de ativos ≤30 MB e código comprimido ≤65 KB
  (≤50 KB script + ≤15 KB estilo); verificados no build/CI.
- **SC-015**: Estabilidade de layout <0,1 em todas as páginas e transições (sem
  deslocamento perceptível do conteúdo).
- **SC-016**: 100% dos manifestos publicados passam na validação de schema e na
  verificação de integridade referencial (IDs únicos e arquivos existentes) no
  build/CI.
- **SC-017**: A experiência é operável e legível no nível WCAG 2.2 AAA: alvos de
  toque ≥44×44 px, contraste WCAG 1.4.6 (≥7:1 texto normal; ≥4,5:1 texto grande)
  e foco visível em todos os controles.
- **SC-018**: As transições mantêm ≥60 fps no dispositivo de referência de SC-001
  (e viram corte instantâneo sob movimento reduzido).
- **SC-019**: Em conexão 4G de referência e cache frio, o primeiro quadro aparece
  em <2,5 s (p75).
- **SC-020**: Com economia de dados ativa, cada quadro é servido com ≤150 KB e
  toda transição de tipo distinto de `cut`/`none` vira corte instantâneo,
  mantendo a integridade narrativa.
- **SC-021**: 100% das páginas publicadas contêm metadados de título, descrição e
  Open Graph.
- **SC-022**: 100% dos navegadores da matriz declarada (FR-027) passam nos
  cenários de validação VS-1 a VS-10.
- **SC-023**: 100% dos quadros publicados usam os formatos e o padrão de
  compressão de entrega documentados (FR-028).

## Assumptions

- A narrativa é linear e única (sem ramificações ou escolhas do usuário).
- O conteúdo (imagens dos quadros, descrições e trilhas/ambientes) é fornecido ou
  produzido separadamente; esta feature cobre a experiência do player.
- A entrega é uma experiência web estática, conforme a constituição do projeto.
- O áudio é por cena/ambiente (não narração palavra a palavra).
- O ritmo de exibição (por quadro, cena e história) e as transições são definidos
  pelo autor do conteúdo.
- Os navegadores-alvo são as versões recentes de Chrome, Firefox, Safari e
  navegadores móveis equivalentes (matriz declarada e testada — FR-027).
- Parte do público acessa por redes móveis lentas e dispositivos de baixo
  desempenho; as referências são 4G ~9 Mbps/~170 ms e smartphone de médio porte
  (~4 GB RAM).
- Imagens e áudio seguem o padrão de entrega documentado do projeto (formatos
  modernos com fallback, resolução máxima definida e compressão padronizada).
- O tom é de terror/horror; a atmosfera é conduzida por ritmo, enquadramento,
  transições e som.

## Rastreabilidade de Acessibilidade (WCAG 2.2)

| FR | Critério WCAG 2.2 | Nível |
|----|-------------------|-------|
| FR-008, FR-012 | 1.1.1 Non-text Content (alt curto + descrição longa) | A |
| FR-008, FR-012 | 1.2.1 Audio-only and Video-only (Prerecorded) — alternativa textual | A |
| FR-010 | 2.1.1 Keyboard / 2.4.7 Focus Visible / 2.5.8 Target Size (Minimum) | A/AA |
| FR-013, FR-005 | 2.2.2 Pause, Stop, Hide (avanço automático) | A |
| FR-005, FR-006, FR-020 | 1.4.2 Audio Control | A |
| FR-011 | 2.2.2 Pause, Stop, Hide (conteúdo auto-iniciado) | A |
| FR-011 | 2.3.3 Animation from Interactions (transições do avanço manual) | AAA |
| FR-012 | 3.1.1 Language of Page / 3.1.2 Language of Parts | A/AA |
| FR-009 | 1.4.4 Resize Text / 1.4.10 Reflow | AA |
| FR-012, FR-014 | 4.1.2 Name, Role, Value | A |
| FR-014 | 4.1.3 Status Messages (estado do áudio/anúncios) | AA |
| FR-010, SC-017 | 2.5.5 Target Size (Enhanced) / 1.4.6 Contrast (Enhanced) | AAA |

> O nível-alvo declarado é AAA (FR-010, SC-017); onde o critério é A/AA, o
> atendimento é obrigatório e cumulativo.

## Matriz de Rastreabilidade (US → FR → SC)

| História | Requisitos funcionais | Success criteria |
|----------|-----------------------|------------------|
| US1 — Assistir como filme | FR-001, FR-002, FR-003, FR-013, FR-017, FR-018, FR-033, FR-034 | SC-001, SC-005, SC-009, SC-010, SC-011 |
| US2 — Controlar o áudio | FR-004, FR-005, FR-006, FR-007, FR-014, FR-016, FR-020, FR-021, FR-032 | SC-002, SC-003, SC-007 |
| US3 — Qualquer dispositivo | FR-009, FR-010, FR-026, FR-027, FR-028, FR-029, FR-031 | SC-005, SC-014, SC-015, SC-017, SC-019, SC-020, SC-021, SC-022, SC-023 |
| US4 — Acessibilidade | FR-005, FR-008, FR-011, FR-012, FR-013, FR-014, FR-034 | SC-004, SC-006, SC-013, SC-017 |
| Transversal | FR-015, FR-019, FR-023, FR-024, FR-025, FR-030, FR-035 | SC-008, SC-012, SC-016, SC-018 |
